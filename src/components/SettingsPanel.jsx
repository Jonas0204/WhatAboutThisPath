import { useEffect, useRef, useState } from 'react'
import { PRESET_LOCATIONS } from '../lib/presetLocations.js'

export default function SettingsPanel({ settings, update, offlineDownload, locationPicker }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  // A popover that only closes via its own button is a trap on touch devices —
  // dismiss it the way every other menu on the platform does.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      // One Escape dismisses one thing. App also clears the selected track on
      // Escape; marking the event handled stops it doing that behind this panel.
      e.preventDefault()
    }

    document.addEventListener('pointerdown', onPointerDown)
    // Capture, so this runs before App's document-level handler regardless of
    // which mounted first.
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  const handlePresetChange = (e) => {
    const preset = PRESET_LOCATIONS.find((p) => p.id === e.target.value)
    if (preset) update({ locationOverride: { lat: preset.lat, lon: preset.lon, label: preset.label } })
  }

  const handleStartPicking = () => {
    locationPicker.start()
    setOpen(false)
  }

  return (
    <div className="settings" ref={rootRef}>
      <button
        className="settings__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        aria-expanded={open}
        title="Settings"
      >
        ⚙
      </button>

      {open && (
        <div className="settings__panel">
          <div className="settings__row">
            <span>Theme</span>
            <div className="settings__segmented">
              {['system', 'light', 'dark'].map((option) => (
                <button
                  key={option}
                  className={settings.theme === option ? 'is-active' : ''}
                  onClick={() => update({ theme: option })}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <label className="settings__row settings__row--toggle">
            <span>Show all tracks on map</span>
            <input
              type="checkbox"
              checked={settings.showAllTracks}
              onChange={(e) => update({ showAllTracks: e.target.checked })}
            />
          </label>

          <label className="settings__row settings__row--toggle">
            <span>Show points of interest</span>
            <input
              type="checkbox"
              checked={settings.showPois}
              onChange={(e) => update({ showPois: e.target.checked })}
            />
          </label>

          <div className="settings__row">
            <span>Units</span>
            <div className="settings__segmented">
              {['metric', 'imperial'].map((option) => (
                <button
                  key={option}
                  className={settings.units === option ? 'is-active' : ''}
                  onClick={() => update({ units: option })}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="settings__row settings__row--column">
            <span>Offline map</span>
            {offlineDownload.status.running ? (
              <div className="settings__download">
                <div className="settings__progress-track">
                  <div
                    className="settings__progress-fill"
                    style={{
                      width: offlineDownload.status.total
                        ? `${(100 * offlineDownload.status.done) / offlineDownload.status.total}%`
                        : '4%',
                    }}
                  />
                </div>
                <div className="settings__download-row">
                  <span>
                    {offlineDownload.status.done}/{offlineDownload.status.total || '…'} areas
                  </span>
                  <button onClick={offlineDownload.cancel}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="settings__download-start" onClick={offlineDownload.start}>
                Download whole islands for offline use
              </button>
            )}
            {!offlineDownload.status.running && offlineDownload.status.total > 0 && (
              <span className="settings__tip">
                Cached {offlineDownload.status.done}/{offlineDownload.status.total} map areas.
              </span>
            )}
          </div>

          <div className="settings__row settings__row--column">
            <span>Your location</span>
            {settings.locationOverride ? (
              <div className="settings__override">
                <span className="settings__override-label">📍 {settings.locationOverride.label}</span>
                <button onClick={() => update({ locationOverride: null })}>Use real GPS</button>
              </div>
            ) : (
              <div className="settings__override">
                <select defaultValue="" onChange={handlePresetChange}>
                  <option value="" disabled>
                    Pick a place…
                  </option>
                  {PRESET_LOCATIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button onClick={handleStartPicking}>Pick on map</button>
              </div>
            )}
            <span className="settings__tip">
              Override this if your real GPS location (e.g. abroad) shouldn&apos;t be used for
              distance/directions to a hike.
            </span>
          </div>

          <p className="settings__tip">
            Tracks and forecasts you&apos;ve opened are also cached automatically for offline use.
          </p>
        </div>
      )}
    </div>
  )
}
