const cache = new Map()
const inflight = new Map()

export function getCachedGeometry(id) {
  return cache.get(id) ?? null
}

export function fetchGeometry(id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id))
  if (inflight.has(id)) return inflight.get(id)

  const promise = fetch(`${import.meta.env.BASE_URL}data/tracks/${id}.geojson`)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${id}.geojson: ${res.status}`)
      return res.json()
    })
    .then((data) => {
      cache.set(id, data)
      inflight.delete(id)
      return data
    })
    .catch((err) => {
      inflight.delete(id)
      throw err
    })

  inflight.set(id, promise)
  return promise
}
