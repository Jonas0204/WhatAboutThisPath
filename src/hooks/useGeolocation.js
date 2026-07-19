import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_UPDATE_INTERVAL_MS = 3000
const MIN_UPDATE_DISTANCE_M = 8

function haversineMeters(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function useGeolocation() {
  const [permissionState, setPermissionState] = useState('prompt')
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const watchIdRef = useRef(null)
  const lastAcceptedRef = useRef(null)

  useEffect(() => {
    if (!navigator.permissions?.query) return

    let cancelled = false
    navigator.permissions.query({ name: 'geolocation' }).then((status) => {
      if (cancelled) return
      setPermissionState(status.state)
      status.onchange = () => setPermissionState(status.state)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError(new Error('Geolocation is not supported by this browser.'))
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPermissionState('granted')
        setError(null)

        // GPS updates can fire multiple times a second; a stationary or slow-moving
        // hiker doesn't need a re-render/map-marker-move that often. Only accept an
        // update if enough time passed or the position actually moved meaningfully.
        const last = lastAcceptedRef.current
        if (last) {
          const elapsed = pos.timestamp - last.timestamp
          const moved = haversineMeters(last.coords, pos.coords)
          if (elapsed < MIN_UPDATE_INTERVAL_MS && moved < MIN_UPDATE_DISTANCE_M) return
        }

        lastAcceptedRef.current = pos
        setPosition(pos)
      },
      (err) => {
        setError(err)
        if (err.code === err.PERMISSION_DENIED) setPermissionState('denied')
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    )
  }, [])

  const requestPermission = useCallback(() => {
    startWatching()
  }, [startWatching])

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return { position, error, permissionState, requestPermission }
}
