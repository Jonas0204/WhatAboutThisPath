import { useMemo, useState } from 'react'
import TrackListItem from './TrackListItem.jsx'
import { fetchGeometry } from '../lib/geometryCache.js'
import { buildGpx, downloadGpx } from '../lib/gpxExport.js'

function isWithinBounds(track, visibleBounds) {
  if (!visibleBounds || !track.startPoint) return true
  return visibleBounds.contains([track.startPoint.lon, track.startPoint.lat])
}

export default function TrackSidebar({ tracks, selectedId, onSelect, units, visibleBounds }) {
  const [query, setQuery] = useState('')
  const [downloadingAll, setDownloadingAll] = useState(false)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    const matches = tracks.filter(
      (t) => `${t.title} ${t.region ?? ''}`.toLowerCase().includes(q) && isWithinBounds(t, visibleBounds),
    )
    return [...matches].sort((a, b) => {
      if (a.distanceFromUserKm == null && b.distanceFromUserKm == null) return 0
      if (a.distanceFromUserKm == null) return 1
      if (b.distanceFromUserKm == null) return -1
      return a.distanceFromUserKm - b.distanceFromUserKm
    })
  }, [tracks, query, visibleBounds])

  const handleDownloadAll = async () => {
    setDownloadingAll(true)
    try {
      const entries = await Promise.all(
        filtered.map((t) => fetchGeometry(t.id).then((geometry) => ({ name: t.title, geometry }))),
      )
      downloadGpx('faroe-islands-tracks.gpx', buildGpx(entries))
    } finally {
      setDownloadingAll(false)
    }
  }

  return (
    <aside className="track-sidebar">
      <div className="track-sidebar__search-wrap">
        <input
          className="track-sidebar__search"
          type="search"
          placeholder="Search tracks or region…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="track-sidebar__download-all"
          onClick={handleDownloadAll}
          disabled={downloadingAll || filtered.length === 0}
        >
          {downloadingAll ? 'Preparing…' : `Download all ${filtered.length} as GPX`}
        </button>
      </div>
      {filtered.length === 0 ? (
        <p className="track-sidebar__empty">No tracks in this view — zoom or pan out to see more.</p>
      ) : (
        <ul className="track-sidebar__list">
          {filtered.map((track) => (
            <TrackListItem
              key={track.id}
              track={track}
              selected={track.id === selectedId}
              onSelect={onSelect}
              units={units}
            />
          ))}
        </ul>
      )}
    </aside>
  )
}
