import { length as turfLength } from '@turf/turf'

function lineStringFeatures(geojson) {
  return geojson.features.filter((f) => f.geometry?.type === 'LineString')
}

const ELEVATION_SMOOTHING_WINDOW = 10

function smoothElevations(values, radius = ELEVATION_SMOOTHING_WINDOW) {
  if (values.length <= 2 || radius <= 0) return values
  const smoothed = []
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - radius)
    const end = Math.min(values.length, i + radius + 1)
    let sum = 0
    for (let j = start; j < end; j++) sum += values[j]
    smoothed.push(sum / (end - start))
  }
  return smoothed
}

export function computeDistanceKm(geojson) {
  const lines = lineStringFeatures(geojson)
  return lines.reduce((sum, f) => sum + turfLength(f, { units: 'kilometers' }), 0)
}

export function computeElevation(geojson) {
  const lines = lineStringFeatures(geojson)
  let ascentM = 0
  let descentM = 0
  let minEle = Infinity
  let maxEle = -Infinity

  for (const line of lines) {
    const coords = line.geometry.coordinates
    const elevations = []
    for (let i = 0; i < coords.length; i++) {
      const ele = coords[i][2]
      if (typeof ele !== 'number') continue
      elevations.push(ele)
      if (ele < minEle) minEle = ele
      if (ele > maxEle) maxEle = ele
    }

    const smoothed = smoothElevations(elevations)
    for (let i = 1; i < smoothed.length; i++) {
      const delta = smoothed[i] - smoothed[i - 1]
      if (delta > 0) ascentM += delta
      else descentM += -delta
    }
  }

  if (minEle === Infinity) {
    minEle = null
    maxEle = null
  }

  return { ascentM, descentM, minEle, maxEle }
}

export function computeBounds(geojson) {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLon = Infinity
  let maxLon = -Infinity

  for (const feature of geojson.features) {
    const geom = feature.geometry
    if (!geom) continue
    const coordArrays =
      geom.type === 'LineString' ? [geom.coordinates] : geom.type === 'Point' ? [[geom.coordinates]] : []
    for (const coords of coordArrays) {
      for (const [lon, lat] of coords) {
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
      }
    }
  }

  if (minLat === Infinity) return null
  return { minLat, maxLat, minLon, maxLon }
}

export function computeStartPoint(geojson) {
  const line = lineStringFeatures(geojson)[0]
  if (!line || line.geometry.coordinates.length === 0) return null
  const [lon, lat] = line.geometry.coordinates[0]
  return { lat, lon }
}

export function computeTrackStats(geojson) {
  const distanceKm = computeDistanceKm(geojson)
  const { ascentM, descentM, minEle, maxEle } = computeElevation(geojson)
  const bounds = computeBounds(geojson)
  const startPoint = computeStartPoint(geojson)
  const waypointCount = geojson.features.filter((f) => f.geometry?.type === 'Point').length

  return { distanceKm, ascentM, descentM, minEle, maxEle, bounds, startPoint, waypointCount }
}
