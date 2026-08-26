function escapeXml(str) {
  return String(str).replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c],
  )
}

function trackPointsXml(coordinates, times) {
  return coordinates
    .map(([lon, lat, ele], i) => {
      const eleTag = typeof ele === 'number' ? `<ele>${ele}</ele>` : ''
      const time = times?.[i]
      const timeTag = time ? `<time>${escapeXml(time)}</time>` : ''
      return `<trkpt lat="${lat}" lon="${lon}">${eleTag}${timeTag}</trkpt>`
    })
    .join('')
}

function waypointsXml(features) {
  return features
    .filter((f) => f.geometry?.type === 'Point')
    .map((f) => {
      const [lon, lat, ele] = f.geometry.coordinates
      const eleTag = typeof ele === 'number' ? `<ele>${ele}</ele>` : ''
      const name = f.properties?.name
      const nameTag = name ? `<name>${escapeXml(name)}</name>` : ''
      return `<wpt lat="${lat}" lon="${lon}">${eleTag}${nameTag}</wpt>`
    })
    .join('')
}

function trackXml(geometry, name) {
  const segments = geometry.features
    .filter((f) => f.geometry?.type === 'LineString')
    .map((line) => {
      const times = line.properties?.coordinateProperties?.times
      return `<trkseg>${trackPointsXml(line.geometry.coordinates, times)}</trkseg>`
    })
    .join('')
  return `<trk><name>${escapeXml(name)}</name>${segments}</trk>`
}

// Builds one GPX 1.1 document from one or more tracks — each entry keeps its own
// <trk> (and waypoints), so a "group" download is just several tracks in one file,
// same as the multi-hike GPX files this app's own data already ships.
export function buildGpx(entries) {
  const waypoints = entries.map((e) => waypointsXml(e.geometry.features ?? [])).join('')
  const tracks = entries.map((e) => trackXml(e.geometry, e.name)).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="WhatAboutThisPath" xmlns="http://www.topografix.com/GPX/1/1">${waypoints}${tracks}</gpx>`
}

export function downloadGpx(filename, xml) {
  const blob = new Blob([xml], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
