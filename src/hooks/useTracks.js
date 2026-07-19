import { useEffect, useState } from 'react'
import { mergeTrackData } from '../lib/mergeTrackData.js'
import trackMeta from '../data/trackMeta.json'

export function useTracks() {
  const [tracks, setTracks] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetch(`${import.meta.env.BASE_URL}data/tracks-index.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load tracks-index.json: ${res.status}`)
        return res.json()
      })
      .then((index) => {
        if (cancelled) return
        setTracks(mergeTrackData(index, trackMeta))
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { tracks, error }
}
