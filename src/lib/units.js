export function formatDistance(km, units) {
  if (units === 'imperial') return `${(km * 0.621371).toFixed(1)} mi`
  return `${km.toFixed(1)} km`
}

export function formatElevation(m, units) {
  if (units === 'imperial') return `${Math.round(m * 3.28084)} ft`
  return `${Math.round(m)} m`
}

export function formatShortDistance(km, units) {
  if (units === 'imperial') {
    const feet = km * 3280.84
    return feet < 1000 ? `${Math.round(feet)} ft` : `${(km * 0.621371).toFixed(1)} mi`
  }
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}
