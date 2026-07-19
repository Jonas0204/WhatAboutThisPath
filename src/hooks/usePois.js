import { useEffect, useState } from 'react'

export function usePois() {
  const [pois, setPois] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetch(`${import.meta.env.BASE_URL}data/poi.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load poi.json: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setPois(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { pois, error }
}
