import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { boundsFromGeoJSON } from '../lib/geo.js'
import { prefetchArchipelago } from '../lib/prefetchTiles.js'
import {
  FAROE_CENTER,
  FAROE_ZOOM,
  FAROE_BBOX,
  styleUrl,
  trailheadsGeoJSON,
  allTracksGeoJSON,
  poisGeoJSON,
  greenifyStyle,
  setupCustomLayers,
} from '../lib/mapStyle.js'

const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] }
// The outdoor/contours/terrain-rgb sources in this style cap out at maxzoom 14
// (confirmed against their TileJSON), but z14 alone dominates total tile count
// (each deeper zoom roughly quadruples density) — measured at ~4,600+ stops
// (~50-60min) whenever it's included, regardless of which other levels join it.
// Capping at 12 keeps the run to a few minutes; zooming in past 12 while offline
// in areas you haven't separately browsed will show blank tiles until online again.
const PREFETCH_ZOOMS = [8, 10, 12]

function googleMapsDestinationUrl({ lat, lon, query }) {
  const destination = query ? encodeURIComponent(query) : `${lat},${lon}`
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
}

// Dev-only call counter so a Playwright/console check can confirm a given map
// source isn't being re-written on every geolocation tick (see README's
// "performance" section) — Profiler measures React's render cost, not this kind
// of effect-triggered GPU work, so this is a separate, more direct signal.
function countSetData(key) {
  if (!import.meta.env.DEV) return
  window.__mapSetDataCounts ??= {}
  window.__mapSetDataCounts[key] = (window.__mapSetDataCounts[key] ?? 0) + 1
}

function MapView(
  {
    tracks,
    selectedId,
    selectedGeometry,
    allGeometries,
    showAllTracks,
    pois,
    showPois,
    userPosition,
    isPositionOverride,
    theme,
    onSelect,
    onBoundsChange,
    isPickingLocation,
    onPickLocation,
  },
  ref,
) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const userMarkerRef = useRef(null)
  const poiPopupRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  const onBoundsChangeRef = useRef(onBoundsChange)
  const onPickLocationRef = useRef(onPickLocation)
  const isPickingLocationRef = useRef(isPickingLocation)
  const [isReady, setIsReady] = useState(false)
  const themeRef = useRef(theme)
  const cancelPrefetchRef = useRef(false)
  const suppressBoundsRef = useRef(false)

  // Keep "latest value" refs in sync after each commit (not during render —
  // mutating a ref while rendering is a React rule violation even though the
  // ref itself isn't used for rendering) so the map's imperative event handlers
  // (registered once) always see the current callback/flag without re-binding.
  useEffect(() => {
    onSelectRef.current = onSelect
    onBoundsChangeRef.current = onBoundsChange
    onPickLocationRef.current = onPickLocation
    isPickingLocationRef.current = isPickingLocation
  })

  useImperativeHandle(ref, () => ({
    async downloadOfflineMap(onProgress) {
      const map = mapRef.current
      if (!map) return { cancelled: true, done: 0, total: 0 }

      const previousCenter = map.getCenter()
      const previousZoom = map.getZoom()
      cancelPrefetchRef.current = false
      suppressBoundsRef.current = true

      const result = await prefetchArchipelago(map, {
        bbox: FAROE_BBOX,
        zooms: PREFETCH_ZOOMS,
        onProgress,
        shouldCancel: () => cancelPrefetchRef.current,
      })

      map.jumpTo({ center: previousCenter, zoom: previousZoom })
      suppressBoundsRef.current = false
      onBoundsChangeRef.current?.(map.getBounds())
      return result
    },
    cancelDownload() {
      cancelPrefetchRef.current = true
    },
  }))

  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl(theme) ?? 'https://demotiles.maplibre.org/style.json',
      center: FAROE_CENTER,
      zoom: FAROE_ZOOM,
      pitch: 0,
      maxPitch: 0,
      dragRotate: false,
      touchPitch: false,
      antialias: true,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    const onStyleReady = () => {
      greenifyStyle(map, theme)
      setupCustomLayers(map)

      map.on('click', 'trailheads-dot', (e) => {
        const id = e.features?.[0]?.properties?.id
        if (id) onSelectRef.current(id)
      })
      map.on('click', 'trailheads-halo', (e) => {
        const id = e.features?.[0]?.properties?.id
        if (id) onSelectRef.current(id)
      })
      map.on('mouseenter', 'trailheads-dot', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'trailheads-dot', () => {
        map.getCanvas().style.cursor = ''
      })

      map.on('click', 'pois-dot', (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const [lon, lat] = feature.geometry.coordinates
        const mapsUrl = googleMapsDestinationUrl({
          lat,
          lon,
          query: feature.properties?.mapsQuery,
        })
        const popupContent = document.createElement('div')
        const title = document.createElement('strong')
        title.textContent = feature.properties.name
        popupContent.appendChild(title)
        popupContent.appendChild(document.createElement('br'))
        const link = document.createElement('a')
        link.href = mapsUrl
        link.target = '_blank'
        link.rel = 'noreferrer'
        link.textContent = '🧭 In Google Maps navigieren'
        popupContent.appendChild(link)
        poiPopupRef.current?.remove()
        poiPopupRef.current = new maplibregl.Popup({ closeButton: true, offset: 8 })
          .setLngLat(feature.geometry.coordinates)
          .setDOMContent(popupContent)
          .addTo(map)
      })
      map.on('mouseenter', 'pois-dot', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'pois-dot', () => {
        map.getCanvas().style.cursor = ''
      })

      map.on('moveend', () => {
        if (suppressBoundsRef.current) return
        onBoundsChangeRef.current?.(map.getBounds())
      })

      map.on('click', (e) => {
        if (!isPickingLocationRef.current) return
        onPickLocationRef.current?.({ lat: e.lngLat.lat, lon: e.lngLat.lng })
      })

      onBoundsChangeRef.current?.(map.getBounds())
      setIsReady(true)
    }

    map.on('load', onStyleReady)

    mapRef.current = map
    return () => {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      poiPopupRef.current?.remove()
      poiPopupRef.current = null
      map.remove()
      mapRef.current = null
      setIsReady(false)
    }
    // Intentionally mount once: only reads `theme` for the *initial* style URL.
    // Subsequent theme changes are handled by the separate setStyle() effect
    // below — including `theme` here would recreate the whole map on every
    // toggle instead of just swapping its style.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Swap the base style when the theme changes (skip the very first render,
  // handled by map construction above).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (themeRef.current === theme) return
    themeRef.current = theme

    setIsReady(false)
    map.setStyle(styleUrl(theme) ?? 'https://demotiles.maplibre.org/style.json')
    map.once('style.load', () => {
      greenifyStyle(map, theme)
      setupCustomLayers(map)
      setIsReady(true)
    })
  }, [theme])

  // `tracks` is expected to be a stable (id/title/startPoint) list that only changes
  // when the track catalog itself loads — callers should NOT pass a copy that's
  // re-derived on every geolocation tick, or these map layers will thrash needlessly.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady || !tracks) return
    const source = map.getSource('trailheads')
    if (source) {
      source.setData(trailheadsGeoJSON(tracks))
      countSetData('trailheads')
    }
  }, [isReady, tracks])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady) return
    if (!map.getLayer('trailheads-dot')) return
    map.setPaintProperty('trailheads-dot', 'circle-color', [
      'case',
      ['==', ['get', 'id'], selectedId ?? ''],
      '#e0574c',
      '#2f7d4f',
    ])
  }, [isReady, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady) return
    const source = map.getSource('pois')
    if (!source) return
    source.setData(showPois ? poisGeoJSON(pois) : EMPTY_COLLECTION)
    if (!showPois) poiPopupRef.current?.remove()
  }, [isReady, pois, showPois])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady) return
    const source = map.getSource('all-tracks')
    if (!source) return
    source.setData(
      showAllTracks ? allTracksGeoJSON(tracks ?? [], allGeometries, selectedId) : EMPTY_COLLECTION,
    )
    countSetData('all-tracks')
  }, [isReady, tracks, allGeometries, showAllTracks, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady) return
    const source = map.getSource('selected-track')
    if (!source) return

    const data = selectedGeometry ?? EMPTY_COLLECTION
    source.setData(data)
    countSetData('selected-track')

    if (selectedGeometry) {
      const bounds = boundsFromGeoJSON(selectedGeometry)
      if (bounds) map.fitBounds(bounds, { padding: 80, duration: 500 })
    }
  }, [isReady, selectedGeometry])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady) return
    map.getCanvas().style.cursor = isPickingLocation ? 'crosshair' : ''
  }, [isReady, isPickingLocation])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isReady) return

    if (!userPosition) {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      return
    }

    const { latitude, longitude } = userPosition.coords
    const markerClass = isPositionOverride
      ? 'user-location-marker user-location-marker--override'
      : 'user-location-marker'
    if (!userMarkerRef.current) {
      const el = document.createElement('div')
      el.className = markerClass
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([longitude, latitude])
        .addTo(map)
    } else {
      userMarkerRef.current.setLngLat([longitude, latitude])
      userMarkerRef.current.getElement().className = markerClass
    }
  }, [isReady, userPosition, isPositionOverride])

  return <div ref={containerRef} className="map-view" />
}

export default forwardRef(MapView)
