import { useEffect, useState } from 'react'
import { fetchGeometry, getCachedGeometry } from '../lib/geometryCache.js'

export function useTrackGeometry(trackId) {
  // Reset geometry/error synchronously during render when trackId changes,
  // rather than in an effect — React's recommended pattern for "adjusting
  // state when a prop changes" (avoids an extra commit with stale data).
  const [renderedId, setRenderedId] = useState(trackId)
  const [geometry, setGeometry] = useState(() => (trackId ? getCachedGeometry(trackId) : null))
  const [error, setError] = useState(null)

  if (trackId !== renderedId) {
    setRenderedId(trackId)
    setGeometry(trackId ? getCachedGeometry(trackId) : null)
    setError(null)
  }

  useEffect(() => {
    if (!trackId || getCachedGeometry(trackId)) return

    let cancelled = false

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
