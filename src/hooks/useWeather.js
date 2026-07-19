import { useEffect, useState } from 'react'
import { keyFor, readCache, writeCache } from '../lib/weatherCache.js'

export function useWeather(startPoint) {
  const lat = startPoint?.lat
  const lon = startPoint?.lon
  const key = lat != null && lon != null ? keyFor(lat, lon) : null

  // Reset/re-seed from cache synchronously during render when the key changes,
  // rather than in an effect — React's recommended pattern for "adjusting
  // state when a prop changes" (also avoids a synchronous setState inside the
  // effect body, which the cache lookup itself would otherwise be).
  const [renderedKey, setRenderedKey] = useState(key)
  const [data, setData] = useState(() => (key ? readCache(key) : null))
  const [error, setError] = useState(null)

  if (key !== renderedKey) {
    setRenderedKey(key)
    setData(key ? readCache(key) : null)
    setError(null)
  }

  useEffect(() => {
    if (!key || readCache(key)) return // nothing to fetch — already served from cache above

    let cancelled = false

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset` +
      `&wind_speed_unit=kmh&timezone=auto&forecast_days=6`

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Weather request failed: ${res.status}`)
        return res.json()
      })
      .then((json) => {
        writeCache(key, json)
        if (!cancelled) setData(json)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })

    return () => {
      cancelled = true
    }
  }, [key, lat, lon])

  return { data, error }
}
