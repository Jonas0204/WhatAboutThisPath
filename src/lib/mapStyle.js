import { palette } from './theme.js'

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

// The imported GPX waypoints are named "#«12» Havnar kirkja" — the numbering is an
// artifact of the source file's ordering, not something worth putting on the map.
function poiDisplayName(name) {
  return String(name ?? '')
    .replace(/^#?«\d+»\s*/, '')
    .replace(/^\{\d+\}\s*/, '')
    .trim()
}

export function poisGeoJSON(pois) {
  return {
    type: 'FeatureCollection',
    features: (pois ?? []).map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: {
        id: p.id,
        name: poiDisplayName(p.name),
        kind: p.kind ?? 'poi',
        address: p.address ?? null,
        mapsQuery: p.mapsQuery ?? null,
        url: p.url ?? null,
      },
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

const LODGING_PIN = 'poi-lodging-pin'

// Drawn on a canvas instead of shipped as a sprite/PNG so it stays part of the
// offline bundle (no extra request) and can be re-added verbatim after a
// setStyle() theme swap, which wipes the style's images along with its layers.
function lodgingPinImage(colors, pixelRatio = 2) {
  const canvas = document.createElement('canvas')
  canvas.width = 30 * pixelRatio
  canvas.height = 40 * pixelRatio
  const ctx = canvas.getContext('2d')
  ctx.scale(pixelRatio, pixelRatio)

  const pin = new Path2D(
    'M15 38.5C15 38.5 26.5 24.4 26.5 15A11.5 11.5 0 1 0 3.5 15C3.5 24.4 15 38.5 15 38.5Z',
  )
  ctx.save()
  ctx.shadowColor = 'rgba(15, 23, 42, 0.45)'
  ctx.shadowBlur = 3
  ctx.shadowOffsetY = 1
  ctx.fillStyle = colors.lodging
  ctx.fill(pin)
  ctx.restore()
  ctx.lineWidth = 1.6
  ctx.strokeStyle = colors.lodgingRing
  ctx.stroke(pin)

  // Little house glyph — roof, walls, and a door cut out of the same path.
  ctx.fillStyle = colors.lodgingGlyph
  ctx.fill(new Path2D('M15 7.8L22.3 14.4H20.4V20.9H16.8V16.7H13.2V20.9H9.6V14.4H7.7Z'))

  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

export function setupCustomLayers(map, theme) {
  // Every color below comes from src/lib/theme.js — see docs/theming.md.
  const c = palette(theme)

  if (!map.hasImage(LODGING_PIN)) {
    map.addImage(LODGING_PIN, lodgingPinImage(c, 2), { pixelRatio: 2 })
  }

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
      paint: { 'circle-radius': 9, 'circle-color': c.trailHalo, 'circle-opacity': 0.85 },
    })
  }
  if (!map.getLayer('trailheads-dot')) {
    map.addLayer({
      id: 'trailheads-dot',
      type: 'circle',
      source: 'trailheads',
      paint: { 'circle-radius': 5, 'circle-color': c.trail },
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
        'text-color': c.label,
        'text-halo-color': c.labelHalo,
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
      minzoom: 9.5, // 200+ points would clutter the whole-archipelago overview
      filter: ['!=', ['get', 'kind'], 'lodging'],
      paint: {
        // A 4px dot is hard to hit on a touchscreen and easy to lose against the
        // hillshade — grow it with zoom and give it a proper contrast ring.
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9.5, 4.5, 12, 6.5, 15, 9],
        'circle-color': c.poi,
        'circle-stroke-color': c.poiRing,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 9.5, 1.5, 14, 2.5],
      },
    })
  }
  if (!map.getLayer('pois-label')) {
    map.addLayer({
      id: 'pois-label',
      type: 'symbol',
      source: 'pois',
      minzoom: 13,
      filter: ['!=', ['get', 'kind'], 'lodging'],
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-offset': [0, 0.9],
        'text-anchor': 'top',
        'text-max-width': 9,
        'text-optional': true,
      },
      paint: {
        'text-color': c.label,
        'text-halo-color': c.labelHalo,
        'text-halo-width': 1.4,
      },
    })
  }
  // Where you sleep is worth finding at any zoom, so this one keeps its own
  // always-visible pin instead of joining the dots that fade out below z9.5.
  if (!map.getLayer('pois-lodging')) {
    map.addLayer({
      id: 'pois-lodging',
      type: 'symbol',
      source: 'pois',
      filter: ['==', ['get', 'kind'], 'lodging'],
      layout: {
        'icon-image': LODGING_PIN,
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-size': ['interpolate', ['linear'], ['zoom'], 7, 0.6, 11, 0.85, 14, 1],
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-offset': [0, 0.6],
        'text-anchor': 'top',
        'text-max-width': 9,
        'text-optional': true,
      },
      paint: {
        'text-color': c.label,
        'text-halo-color': c.labelHalo,
        'text-halo-width': 1.6,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 10.5, 0, 11.5, 1],
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
        paint: { 'line-color': c.trail, 'line-width': 2, 'line-opacity': 0.65 },
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
      paint: { 'line-color': c.accent, 'line-width': 4 },
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
        'circle-color': c.vertex,
        'circle-stroke-color': c.trailHalo,
        'circle-stroke-width': 1,
      },
    })
  }
}
