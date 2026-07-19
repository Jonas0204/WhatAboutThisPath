const STORAGE_PREFIX = 'faroe-weather:'
const TTL_MS = 30 * 60 * 1000

const memoryCache = new Map()

// Keyed per-coordinate (rounded to ~1.1km) rather than globally, since Faroese
// weather genuinely differs from one side of an island to the other — each
// track's own trailhead gets its own forecast, not one shared "island weather".
export function keyFor(lat, lon) {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`
}

export function readCache(key) {
  const fromMemory = memoryCache.get(key)
  if (fromMemory && Date.now() - fromMemory.storedAt < TTL_MS) return fromMemory.data

  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    const { data, storedAt } = JSON.parse(raw)
    if (Date.now() - storedAt >= TTL_MS) return null
    memoryCache.set(key, { data, storedAt })
    return data
  } catch {
    return null
  }
}

export function writeCache(key, data) {
  const entry = { data, storedAt: Date.now() }
  memoryCache.set(key, entry)
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // localStorage can throw when full/disabled — in-memory cache still works for this session.
  }
}
