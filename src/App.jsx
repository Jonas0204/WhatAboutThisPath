import { useCallback, useMemo, useRef, useState } from 'react'
import { useTracks } from './hooks/useTracks.js'
import { useTrackGeometry } from './hooks/useTrackGeometry.js'
import { useAllTrackGeometries } from './hooks/useAllTrackGeometries.js'
import { usePois } from './hooks/usePois.js'
import { useGeolocation } from './hooks/useGeolocation.js'
import { useSettings } from './hooks/useSettings.js'
import { useOnlineStatus } from './hooks/useOnlineStatus.js'
import { useOfflineDownload } from './hooks/useOfflineDownload.js'
import { withDistanceFromUser } from './lib/distanceFromUser.js'
import MapView from './components/MapView.jsx'
import TrackSidebar from './components/TrackSidebar.jsx'
import TrackDetailPanel from './components/TrackDetailPanel.jsx'
import GeolocationBanner from './components/GeolocationBanner.jsx'
import LocationPickerBanner from './components/LocationPickerBanner.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
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
        <span className="app-topbar__title">Faroe Islands Hiking Tracks</span>
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
      {tracksWithDistance && (
        <DevProfiler id="TrackSidebar">
          <TrackSidebar
            tracks={tracksWithDistance}
            selectedId={selectedId}
            onSelect={setSelectedId}
            units={settings.units}
            visibleBounds={visibleBounds}
          />
        </DevProfiler>
      )}
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
            onSelect={setSelectedId}
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
      <TrackDetailPanel
        track={selectedTrack}
        geometry={geometry}
        units={settings.units}
        originPosition={effectivePosition}
      />
    </div>
  )
}

export default App
