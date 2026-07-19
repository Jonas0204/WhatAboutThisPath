import ElevationProfile from './ElevationProfile.jsx'
import WeatherForecast from './WeatherForecast.jsx'
import DirectionsToTrailhead from './DirectionsToTrailhead.jsx'
import { formatDistance, formatElevation } from '../lib/units.js'

export default function TrackDetailPanel({ track, geometry, units, originPosition }) {
  if (!track) {
    return (
      <div className="track-detail track-detail--empty">
        <p>Select a track to see details.</p>
      </div>
    )
  }

  return (
    <div className="track-detail">
      <h2>{track.title}</h2>
      {track.region && <p className="track-detail__region">{track.region}</p>}
      <p className="track-detail__description">{track.description}</p>

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

      <ElevationProfile geometry={geometry} units={units} />
      <DirectionsToTrailhead track={track} originPosition={originPosition} units={units} />
      <WeatherForecast track={track} units={units} />
    </div>
  )
}
