import { useEffect, useState } from 'react'
import { fetchGeometry, getCachedGeometry } from '../lib/geometryCache.js'

export function useTrackGeometry(trackId) {
  const [geometry, setGeometry] = useState(trackId ? getCachedGeometry(trackId) : null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!trackId) {
      setGeometry(null)
      return
    }

    const cached = getCachedGeometry(trackId)
    if (cached) {
      setGeometry(cached)
      return
    }

    let cancelled = false
    setGeometry(null)
    setError(null)

    fetchGeometry(trackId)
      .then((data) => {
        if (!cancelled) setGeometry(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })

    return () => {
      cancelled = true
    }
  }, [trackId])

  return { geometry, error }
}
