import { useEffect, useState } from 'react'
import { fetchGeometry } from '../lib/geometryCache.js'

export function useAllTrackGeometries(tracks, enabled) {
  const [geometries, setGeometries] = useState(null)

  useEffect(() => {
    if (!enabled || !tracks) {
      setGeometries(null)
      return
    }

    let cancelled = false
    Promise.all(tracks.map((t) => fetchGeometry(t.id).then((data) => [t.id, data]))).then(
      (entries) => {
        if (!cancelled) setGeometries(Object.fromEntries(entries))
      },
    )

    return () => {
      cancelled = true
    }
  }, [tracks, enabled])

  return geometries
}
