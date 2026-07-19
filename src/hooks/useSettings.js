import { useEffect, useState } from 'react'

const STORAGE_KEY = 'faroe-hiking-settings'

const defaults = {
  theme: 'system', // 'light' | 'dark' | 'system'
  showAllTracks: false,
  showPois: false,
  units: 'metric', // 'metric' | 'imperial'
  locationOverride: null, // { lat, lon, label } | null — null means "use real GPS"
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults
  } catch {
    return defaults
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const resolvedTheme =
    settings.theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : settings.theme

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
  }, [resolvedTheme])

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }))

  return { settings, resolvedTheme, update }
}
