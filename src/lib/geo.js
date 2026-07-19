import maplibregl from 'maplibre-gl'

export function boundsFromGeoJSON(geojson) {
  const bounds = new maplibregl.LngLatBounds()
  let has = false

  for (const feature of geojson.features) {
    const coords =
      feature.geometry?.type === 'LineString'
        ? feature.geometry.coordinates
        : feature.geometry?.type === 'Point'
          ? [feature.geometry.coordinates]
          : []
    for (const [lon, lat] of coords) {
      bounds.extend([lon, lat])
      has = true
    }
  }

  return has ? bounds : null
}
