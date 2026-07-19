import { useEffect, useState } from 'react'
import { fetchGeometry } from '../lib/geometryCache.js'

export function useAllTrackGeometries(tracks, enabled) {
  const active = enabled && !!tracks

  // Reset synchronously during render when this flips off, rather than in an
  // effect — React's recommended pattern for "adjusting state when a prop changes".
  const [wasActive, setWasActive] = useState(active)
  const [geometries, setGeometries] = useState(null)

  if (active !== wasActive) {
    setWasActive(active)
    if (!active) setGeometries(null)
  }

  useEffect(() => {
    if (!active) return

    let cancelled = false
    Promise.all(tracks.map((t) => fetchGeometry(t.id).then((data) => [t.id, data]))).then((entries) => {
      if (!cancelled) setGeometries(Object.fromEntries(entries))
    })

    return () => {
      cancelled = true
    }
  }, [tracks, active])

  return geometries
}
