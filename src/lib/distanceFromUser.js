import { distance as turfDistance, point } from '@turf/turf'

export function withDistanceFromUser(tracks, userPosition) {
  if (!userPosition) return tracks.map((t) => ({ ...t, distanceFromUserKm: null }))

  const userPoint = point([userPosition.coords.longitude, userPosition.coords.latitude])

  return tracks.map((t) => {
    if (!t.startPoint) return { ...t, distanceFromUserKm: null }
    const trailheadPoint = point([t.startPoint.lon, t.startPoint.lat])
    const distanceFromUserKm = turfDistance(userPoint, trailheadPoint, { units: 'kilometers' })
    return { ...t, distanceFromUserKm }
  })
}
