import { useCallback, useState } from 'react'

export function useOfflineDownload(mapViewRef) {
  const [status, setStatus] = useState({ running: false, done: 0, total: 0 })

  const start = useCallback(() => {
    if (!mapViewRef.current) return
    setStatus({ running: true, done: 0, total: 0 })

    mapViewRef.current
      .downloadOfflineMap((progress) => setStatus({ running: true, ...progress }))
      .then((result) => setStatus({ running: false, done: result.done, total: result.total }))
  }, [mapViewRef])

  const cancel = useCallback(() => {
    mapViewRef.current?.cancelDownload()
  }, [mapViewRef])

  return { status, start, cancel }
}
