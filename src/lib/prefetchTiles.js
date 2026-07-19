// Prefetches map tiles for the whole Faroe archipelago by panning the live map
// through a grid of camera stops and waiting for each view to finish loading —
// this piggybacks on the CacheFirst service-worker route already registered for
// api.maptiler.com (vite.config.js), so no separate tile-pyramid/z-x-y math is
// needed: whatever the map actually requests for each stop gets cached exactly
// like normal browsing would.
function waitForIdle(map, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      map.off('idle', finish)
      resolve()
    }
    map.once('idle', finish)
    setTimeout(finish, timeoutMs)
  })
}

function buildStopsForZoom(map, bbox, zoom) {
  // Move the camera to read the *actual* visible span at this container size/zoom
  // (via map.getBounds()) rather than hand-rolling Mercator math.
  map.jumpTo({ center: [bbox.minLon, bbox.maxLat], zoom })
  const bounds = map.getBounds()
  const lonSpan = (bounds.getEast() - bounds.getWest()) * 0.85 || 1
  const latSpan = (bounds.getNorth() - bounds.getSouth()) * 0.85 || 1

  const stops = []
  for (let lat = bbox.maxLat; lat > bbox.minLat - latSpan; lat -= latSpan) {
    for (let lon = bbox.minLon; lon < bbox.maxLon + lonSpan; lon += lonSpan) {
      stops.push({ center: [lon, lat], zoom })
    }
  }
  return stops
}

export async function prefetchArchipelago(
  map,
  { bbox, zooms, onProgress, shouldCancel, stopTimeoutMs = 8000 },
) {
  const allStops = zooms.flatMap((zoom) => buildStopsForZoom(map, bbox, zoom))
  let done = 0

  for (const stop of allStops) {
    if (shouldCancel?.()) return { cancelled: true, done, total: allStops.length }
    map.jumpTo(stop)
    await waitForIdle(map, stopTimeoutMs)
    done += 1
    onProgress?.({ done, total: allStops.length })
  }

  return { cancelled: false, done, total: allStops.length }
}
