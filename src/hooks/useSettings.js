import { useEffect, useState } from 'react'

const STORAGE_KEY = 'faroe-hiking-settings'
const DARK_QUERY = '(prefers-color-scheme: dark)'

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

// The page background per theme, so the mobile browser chrome and the PWA splash
// match the app instead of flashing the manifest's single color. Keep in sync
// with --page-bg in src/style.css (docs/theming.md).
const THEME_COLOR = { light: '#eef1f6', dark: '#0b0e14' }

export function useSettings() {
  const [settings, setSettings] = useState(load)
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => window.matchMedia(DARK_QUERY).matches)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  // "System" has to keep meaning system: without this listener the app only
  // picked up the OS setting on the first render, so flipping macOS/Windows to
  // dark left the app light until a reload.
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY)
    const onChange = (e) => setSystemPrefersDark(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme = settings.theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : settings.theme

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[resolvedTheme])
  }, [resolvedTheme])

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }))

  return { settings, resolvedTheme, update }
}
