// Single source of truth for the colors that can't come from CSS.
//
// Most of the app is styled by the custom properties in src/style.css. Two
// places can't read those: MapLibre paint/layout properties and the Recharts
// elevation profile are both configured from JS. Rather than sprinkling hex
// literals through mapStyle.js and ElevationProfile.jsx, every such color gets
// a named role here, per theme — so "the accent" is one decision, not five.
//
// Some of these roles have a --token counterpart in style.css (the accent, the
// trail green, the lodging amber). Those pairs have to move together — the table
// in docs/theming.md lists which ones they are.

const light = {
  // Trails and their start markers.
  trail: '#2f7d4f',
  trailHalo: '#ffffff',
  // The selected hike, and every "this is the active thing" accent.
  accent: '#e0574c',
  // Waypoints from the imported GPX files.
  poi: '#7c5cf6',
  poiRing: '#ffffff',
  // Where you sleep (see the "kind": "lodging" POIs in public/data/poi.json).
  lodging: '#f0a020',
  lodgingRing: '#ffffff',
  lodgingGlyph: '#ffffff',
  // Start/end vertices of the selected track.
  vertex: '#1c6fd6',
  // Map labels the app draws itself (trailhead + POI names).
  label: '#12212b',
  labelHalo: '#ffffff',
  // Elevation profile.
  chartLine: '#e0574c',
  chartFill: 'rgba(224, 87, 76, 0.22)',
  chartAxis: '#66787e',
  chartGrid: '#dfe6e8',
  // Recharts paints its tooltip with inline styles, so it needs its own surface.
  tooltipBg: '#ffffff',
  tooltipBorder: '#e3e8ef',
  tooltipText: '#101828',
  tooltipMuted: '#667085',
  tooltipShadow: '0 6px 18px -6px rgba(16, 24, 40, 0.28)',
}

// The dark map style is genuinely dark, so the mid-tone greens and reds that
// read well on the light basemap turn muddy on it — these are lifted, not just
// reused.
const dark = {
  trail: '#4dbb7c',
  trailHalo: '#0d1519',
  accent: '#ef7268',
  poi: '#a78bfa',
  poiRing: '#0d1519',
  lodging: '#f5b03e',
  lodgingRing: '#0d1519',
  lodgingGlyph: '#1a1206',
  vertex: '#6aa8f0',
  label: '#e6eef0',
  labelHalo: 'rgba(8, 14, 18, 0.9)',
  chartLine: '#ef7268',
  chartFill: 'rgba(239, 114, 104, 0.2)',
  chartAxis: '#8298a0',
  chartGrid: '#22323b',
  tooltipBg: '#1c222c',
  tooltipBorder: '#3a4453',
  tooltipText: '#e7eaf0',
  tooltipMuted: '#8b95a7',
  tooltipShadow: '0 8px 22px -8px rgba(0, 0, 0, 0.7)',
}

export const themes = { light, dark }

export function palette(theme) {
  return theme === 'dark' ? dark : light
}
