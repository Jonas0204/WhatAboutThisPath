const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY

export const FAROE_CENTER = [-6.9, 62.0]
export const FAROE_ZOOM = 8.3

// Covers all 18 islands with a little margin — used for the "download offline map" prefetch.
export const FAROE_BBOX = { minLat: 61.35, maxLat: 62.4, minLon: -7.7, maxLon: -6.2 }

export function styleUrl(theme) {
  if (!MAPTILER_KEY) return null
  const styleName = theme === 'dark' ? 'outdoor-v2-dark' : 'outdoor-v2'
  return `https://api.maptiler.com/maps/${styleName}/style.json?key=${MAPTILER_KEY}`
}

export function trailheadsGeoJSON(tracks) {
  return {
    type: 'FeatureCollection',
    features: tracks
      .filter((t) => t.startPoint)
      .map((t) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [t.startPoint.lon, t.startPoint.lat] },
        properties: { id: t.id, title: t.title },
      })),
  }
}

export function poisGeoJSON(pois) {
  return {
    type: 'FeatureCollection',
    features: (pois ?? []).map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { id: p.id, name: p.name },
    })),
  }
}

export function allTracksGeoJSON(tracks, geometries, excludeId) {
  const features = []
  for (const t of tracks) {
    if (t.id === excludeId) continue
    const geo = geometries?.[t.id]
    if (!geo) continue
    for (const feature of geo.features) {
      if (feature.geometry?.type === 'LineString') features.push(feature)
    }
  }
  return { type: 'FeatureCollection', features }
}

// Faroe Islands are treeless — the stock style leans gray/brown at overview zooms.
// Nudge the palette greener and soften the hillshade so it reads more like grassy moorland.
export function greenifyStyle(map, theme) {
  const isDark = theme === 'dark'

  if (map.getLayer('Background')) {
    map.setPaintProperty(
      'Background',
      'background-color',
      isDark
        ? [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            'hsl(100, 25%, 20%)',
            10,
            'hsl(100, 22%, 19%)',
            14,
            'hsl(100, 20%, 20%)',
          ]
        : [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            'hsl(96, 45%, 88%)',
            10,
            'hsl(100, 40%, 87%)',
            14,
            'hsl(100, 35%, 89%)',
          ],
    )
  }
  if (map.getLayer('Hillshade')) {
    map.setPaintProperty(
      'Hillshade',
      'hillshade-accent-color',
      isDark ? 'hsl(100, 22%, 16%)' : 'hsl(100, 30%, 80%)',
    )
    map.setPaintProperty(
      'Hillshade',
      'hillshade-highlight-color',
      isDark ? 'hsl(90, 12%, 32%)' : 'hsl(90, 20%, 72%)',
    )
  }
  if (map.getLayer('Grass fill')) {
    map.setPaintProperty('Grass fill', 'fill-opacity', isDark ? 0.4 : 0.55)
  }

  // The coastline is just the edge of the "Water fill" polygon (no separate outline
  // layer exists in this style) — the jaggedness at low zooms is inherent to the
  // tileset's simplification, not something paint properties can fully fix. Setting
  // the outline to match the fill color (instead of leaving it unset) gives a
  // slightly softer edge; antialias:true on the canvas is the other real lever.
  if (map.getLayer('Water fill')) {
    map.setPaintProperty('Water fill', 'fill-antialias', true)
    const fillColor = map.getPaintProperty('Water fill', 'fill-color')
    if (fillColor) map.setPaintProperty('Water fill', 'fill-outline-color', fillColor)
  }
}

export function setupCustomLayers(map) {
  if (!map.getSource('trailheads')) {
    map.addSource('trailheads', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  if (!map.getLayer('trailheads-halo')) {
    map.addLayer({
      id: 'trailheads-halo',
      type: 'circle',
      source: 'trailheads',
      paint: { 'circle-radius': 9, 'circle-color': '#ffffff', 'circle-opacity': 0.85 },
    })
  }
  if (!map.getLayer('trailheads-dot')) {
    map.addLayer({
      id: 'trailheads-dot',
      type: 'circle',
      source: 'trailheads',
      paint: { 'circle-radius': 5, 'circle-color': '#2f7d4f' },
    })
  }
  if (!map.getLayer('trailheads-label')) {
    map.addLayer({
      id: 'trailheads-label',
      type: 'symbol',
      source: 'trailheads',
      layout: {
        'text-field': ['get', 'title'],
        'text-size': 11,
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-optional': true,
      },
      paint: {
        'text-color': '#1f2937',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.4,
      },
    })
  }

  if (!map.getSource('pois')) {
    map.addSource('pois', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  if (!map.getLayer('pois-dot')) {
    map.addLayer({
      id: 'pois-dot',
      type: 'circle',
      source: 'pois',
      minzoom: 10, // 211 points would clutter the whole-archipelago overview
      paint: {
        'circle-radius': 4,
        'circle-color': '#8b5cf6',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
      },
    })
  }

  if (!map.getSource('all-tracks')) {
    map.addSource('all-tracks', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  if (!map.getLayer('all-tracks-line')) {
    map.addLayer(
      {
        id: 'all-tracks-line',
        type: 'line',
        source: 'all-tracks',
        paint: { 'line-color': '#2f7d4f', 'line-width': 2, 'line-opacity': 0.65 },
      },
      'trailheads-halo',
    )
  }

  if (!map.getSource('selected-track')) {
    map.addSource('selected-track', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  if (!map.getLayer('selected-track-line')) {
    map.addLayer({
      id: 'selected-track-line',
      type: 'line',
      source: 'selected-track',
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: { 'line-color': '#e0574c', 'line-width': 4 },
    })
  }
  if (!map.getLayer('selected-track-points')) {
    map.addLayer({
      id: 'selected-track-points',
      type: 'circle',
      source: 'selected-track',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 5,
        'circle-color': '#1c6fd6',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 1,
      },
    })
  }
}
