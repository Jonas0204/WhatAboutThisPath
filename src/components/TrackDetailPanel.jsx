import ElevationProfile from './ElevationProfile.jsx'
import WeatherForecast from './WeatherForecast.jsx'
import DirectionsToTrailhead from './DirectionsToTrailhead.jsx'
import { formatDistance, formatElevation } from '../lib/units.js'
import { buildGpx, downloadGpx } from '../lib/gpxExport.js'

export default function TrackDetailPanel({ track, geometry, units, originPosition, theme, onClose }) {
  if (!track) {
    return (
      <div className="track-detail track-detail--empty">
        <p>Select a track to see details.</p>
      </div>
    )
  }

  const handleDownloadGpx = () => {
    if (!geometry) return
    downloadGpx(`${track.id}.gpx`, buildGpx([{ name: track.title, geometry }]))
  }

  return (
    <div className="track-detail">
      {/* Sticky, so the way out stays reachable however far down you've scrolled —
          and so the mobile sheet's `peek` state still shows what's open. */}
      <div className="track-detail__header">
        <div className="track-detail__heading">
          <h2>{track.title}</h2>
          {track.region && <p className="track-detail__region">{track.region}</p>}
        </div>
        <button className="track-detail__close" onClick={onClose} aria-label="Close track details">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <p className="track-detail__description">{track.description}</p>

      <button className="track-detail__gpx-download" onClick={handleDownloadGpx} disabled={!geometry}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M12 4v12m0 0l-4.5-4.5M12 16l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 20h16" strokeLinecap="round" />
        </svg>
        {geometry ? 'Download GPX' : 'Loading track…'}
      </button>

      <dl className="track-detail__stats">
        <div>
          <dt>Distance</dt>
          <dd>{formatDistance(track.distanceKm, units)}</dd>
        </div>
        <div>
          <dt>Ascent / Descent</dt>
          <dd>
            {formatElevation(track.ascentM, units)} / {formatElevation(track.descentM, units)}
          </dd>
        </div>
        <div>
          <dt>Estimated duration</dt>
          <dd>
            {track.durationHours.toFixed(1)} h{track.isEstimatedDuration ? ' (estimated)' : ''}
          </dd>
        </div>
        {track.difficulty && (
          <div>
            <dt>Difficulty</dt>
            <dd>{track.difficulty}</dd>
          </div>
        )}
      </dl>

      <ElevationProfile geometry={geometry} units={units} theme={theme} />
      <DirectionsToTrailhead track={track} originPosition={originPosition} units={units} />
      <WeatherForecast track={track} units={units} />
    </div>
  )
}
