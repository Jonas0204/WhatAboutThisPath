import { memo } from 'react'
import { formatDistance, formatShortDistance } from '../lib/units.js'

// `track` keeps a stable reference across searches (TrackSidebar's filter/sort never
// clones track objects), so a plain shallow-prop memo skips re-render for the other
// 26 cards while typing in the search box. A geolocation tick still recreates every
// track object (distance changed), so all cards re-render then — that's expected and
// cheap (27 small text nodes); the real cost this app avoids is map/GPU work, handled
// upstream by keeping MapView on a distance-free, rarely-changing track list.
function TrackListItem({ track, selected, onSelect, units }) {
  return (
    <li>
      <button className={`track-card${selected ? ' is-selected' : ''}`} onClick={() => onSelect(track.id)}>
        <div className="track-card__row">
          <span className="track-card__title">{track.title}</span>
          {track.difficulty && (
            <span className="track-card__badge" data-difficulty={track.difficulty}>
              {track.difficulty}
            </span>
          )}
        </div>
        <div className="track-card__meta">
          <span className="track-card__chip">{formatDistance(track.distanceKm, units)}</span>
          <span className="track-card__chip">{track.durationHours.toFixed(1)} h</span>
          {track.region && <span className="track-card__chip">{track.region}</span>}
        </div>
        {track.distanceFromUserKm != null && (
          <div className="track-card__distance">
            {formatShortDistance(track.distanceFromUserKm, units)} from you
          </div>
        )}
      </button>
    </li>
  )
}

export default memo(TrackListItem)
