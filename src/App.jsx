import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTracks } from './hooks/useTracks.js'
import { useTrackGeometry } from './hooks/useTrackGeometry.js'
import { useAllTrackGeometries } from './hooks/useAllTrackGeometries.js'
import { usePois } from './hooks/usePois.js'
import { useGeolocation } from './hooks/useGeolocation.js'
import { useSettings } from './hooks/useSettings.js'
import { useOnlineStatus } from './hooks/useOnlineStatus.js'
import { useOfflineDownload } from './hooks/useOfflineDownload.js'
import { MOBILE_QUERY, useMediaQuery } from './hooks/useMediaQuery.js'
import { withDistanceFromUser } from './lib/distanceFromUser.js'
import { SHEET_SNAP } from './lib/sheetSnap.js'
import MapView from './components/MapView.jsx'
import TrackSidebar from './components/TrackSidebar.jsx'
import TrackDetailPanel from './components/TrackDetailPanel.jsx'
import GeolocationBanner from './components/GeolocationBanner.jsx'
import LocationPickerBanner from './components/LocationPickerBanner.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import BottomSheet from './components/BottomSheet.jsx'
import DevProfiler from './components/DevProfiler.jsx'
import './style.css'

function App() {
  const { tracks, error: tracksError } = useTracks()
  const { pois } = usePois()
  const [selectedId, setSelectedId] = useState(null)
  const { geometry } = useTrackGeometry(selectedId)
  const { position: realPosition, error: geoError, permissionState, requestPermission } = useGeolocation()
  const { settings, resolvedTheme, update } = useSettings()
  const isOnline = useOnlineStatus()
  const mapViewRef = useRef(null)
  const offlineDownload = useOfflineDownload(mapViewRef)
  const [visibleBounds, setVisibleBounds] = useState(null)
  const [isPickingLocation, setIsPickingLocation] = useState(false)
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const [sheetState, setSheetState] = useState('half')

  const isPositionOverride = !!settings.locationOverride
  // A manual override (e.g. because your real GPS fix is in a different country
  // than the hikes you're planning) fully replaces the real position everywhere:
  // sidebar distances/sorting, the map marker, and the Google Maps directions link.
  const effectivePosition = useMemo(() => {
    if (settings.locationOverride) {
      const { lat, lon } = settings.locationOverride
      // `timestamp` isn't read anywhere for an override position (only real GPS
      // fixes use it, to throttle updates in useGeolocation.js) — a static value
      // keeps this memo pure instead of calling Date.now() during render.
      return { coords: { latitude: lat, longitude: lon, accuracy: 0 }, timestamp: 0 }
    }
    return realPosition
  }, [settings.locationOverride, realPosition])

  const tracksWithDistance = useMemo(
    () => (tracks ? withDistanceFromUser(tracks, effectivePosition) : null),
    [tracks, effectivePosition],
  )

  // MapView and the "show all tracks" fetch only ever read id/title/startPoint, never
  // distance — pass the raw, rarely-changing `tracks` list to them so a geolocation
  // tick (which only changes distanceFromUserKm) doesn't thrash map layers/refetches.
  const allGeometries = useAllTrackGeometries(tracks, settings.showAllTracks)

  const selectedTrack = tracksWithDistance?.find((t) => t.id === selectedId) ?? null

  const handleBoundsChange = useCallback((bounds) => setVisibleBounds(bounds), [])

  // Selecting is a toggle: tapping the open track again (in the list or on its
  // trailhead) clears it, which is the fastest way back to an unobstructed map.
  const handleSelect = useCallback((id) => {
    setSelectedId((current) => (current === id ? null : id))
    setSheetState('half')
  }, [])
  const clearSelection = useCallback(() => {
    setSelectedId(null)
    setSheetState('half')
  }, [])

  // Escape is the other way out, and the one keyboard users will reach for.
  // Anything layered above the map — currently the settings popover — handles
  // Escape first and marks it, so one press only dismisses one thing.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setSelectedId(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // On mobile the sheet covers the bottom of the map, so a track fitted with
  // even padding would land behind it. Selecting always opens the sheet at
  // `half`, so that's the height to reserve.
  const fitPadding = useMemo(() => {
    if (!isMobile) return 80
    return {
      top: 56,
      left: 24,
      right: 24,
      bottom: Math.round(window.innerHeight * SHEET_SNAP.half) + 16,
    }
  }, [isMobile])

  const startPickingLocation = useCallback(() => setIsPickingLocation(true), [])
  const cancelPickingLocation = useCallback(() => setIsPickingLocation(false), [])
  const handlePickLocation = useCallback(
    ({ lat, lon }) => {
      update({ locationOverride: { lat, lon, label: 'Custom location' } })
      setIsPickingLocation(false)
    },
    [update],
  )
  const locationPicker = {
    isPicking: isPickingLocation,
    start: startPickingLocation,
    cancel: cancelPickingLocation,
  }

  return (
    <div className="app-layout">
      <header className="app-topbar">
        <div className="app-topbar__brand">
          <span className="app-topbar__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 19h20L14.5 6l-4 6.5L8 9z" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="app-topbar__titles">
            <span className="app-topbar__title">Faroe Islands Hiking Tracks</span>
            <span className="app-topbar__subtitle">Plan · Navigate · Offline</span>
          </span>
        </div>
        <div className="app-topbar__right">
          {!isOnline && <span className="offline-badge">Offline</span>}
          <SettingsPanel
            settings={settings}
            update={update}
            offlineDownload={offlineDownload}
            locationPicker={locationPicker}
          />
        </div>
      </header>
      {/* On desktop this is `display: contents` and these two keep their own grid
          columns; on mobile they become one draggable sheet over a full-height map. */}
      <BottomSheet
        enabled={isMobile}
        state={sheetState}
        onStateChange={setSheetState}
        view={selectedTrack ? 'detail' : 'list'}
      >
        {tracksWithDistance && (
          <DevProfiler id="TrackSidebar">
            <TrackSidebar
              tracks={tracksWithDistance}
              selectedId={selectedId}
              onSelect={handleSelect}
              units={settings.units}
              visibleBounds={visibleBounds}
            />
          </DevProfiler>
        )}
        <TrackDetailPanel
          track={selectedTrack}
          geometry={geometry}
          units={settings.units}
          originPosition={effectivePosition}
          theme={resolvedTheme}
          onClose={clearSelection}
        />
      </BottomSheet>
      <div className="app-layout__main">
        <DevProfiler id="MapView">
          <MapView
            ref={mapViewRef}
            tracks={tracks ?? []}
            selectedId={selectedId}
            selectedGeometry={geometry}
            allGeometries={allGeometries}
            showAllTracks={settings.showAllTracks}
            pois={pois}
            showPois={settings.showPois}
            userPosition={effectivePosition}
            isPositionOverride={isPositionOverride}
            theme={resolvedTheme}
            fitPadding={fitPadding}
            onSelect={handleSelect}
            onBoundsChange={handleBoundsChange}
            isPickingLocation={isPickingLocation}
            onPickLocation={handlePickLocation}
          />
        </DevProfiler>
        {isPickingLocation ? (
          <LocationPickerBanner onCancel={cancelPickingLocation} />
        ) : (
          !isPositionOverride && (
            <GeolocationBanner
              permissionState={permissionState}
              error={geoError}
              onRequest={requestPermission}
            />
          )
        )}
        {tracksError && <p className="app-error">Failed to load tracks: {tracksError.message}</p>}
      </div>
    </div>
  )
}

export default App
