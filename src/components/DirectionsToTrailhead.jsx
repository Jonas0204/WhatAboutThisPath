import { formatShortDistance } from '../lib/units.js'

function googleMapsDirectionsUrl(origin, destination) {
  const originParam = `${origin.lat},${origin.lon}`
  const destinationParam = `${destination.lat},${destination.lon}`
  return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}&travelmode=driving`
}

// We deliberately don't estimate a driving time ourselves — Faroese roads wind
// through fjords and single-lane sub-sea tunnels, so straight-line distance would
// be a misleading basis for a time estimate. Google Maps already knows the real
// road network, so we just hand it the two points and let it answer that question.
export default function DirectionsToTrailhead({ track, originPosition, units }) {
  if (!originPosition || !track?.startPoint) return null

  const origin = { lat: originPosition.coords.latitude, lon: originPosition.coords.longitude }
  const url = googleMapsDirectionsUrl(origin, track.startPoint)

  return (
    <div className="directions">
      <h3 className="directions__title">Getting to the trailhead</h3>
      {track.distanceFromUserKm != null && (
        <p className="directions__straight-line">
          {formatShortDistance(track.distanceFromUserKm, units)} away in a straight line
        </p>
      )}
      <a className="directions__link" href={url} target="_blank" rel="noreferrer">
        🚗 Directions &amp; drive time in Google Maps
      </a>
    </div>
  )
}
