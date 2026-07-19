import { useEffect, useState } from 'react'
import { keyFor, readCache, writeCache } from '../lib/weatherCache.js'

export function useWeather(startPoint) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!startPoint) {
      setData(null)
      return
    }

    const key = keyFor(startPoint.lat, startPoint.lon)
    const cached = readCache(key)
    if (cached) {
      setData(cached)
      return
    }

    let cancelled = false
    setData(null)
    setError(null)

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${startPoint.lat}&longitude=${startPoint.lon}` +
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
  }, [startPoint?.lat, startPoint?.lon])

  return { data, error }
}
