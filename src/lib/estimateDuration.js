// Naismith's Rule with Langmuir descent correction:
// base 1h per 5km, +1h per 600m ascent, adjustment for steep descent.
export function estimateDurationHours({ distanceKm, ascentM, descentM }) {
  let hours = distanceKm / 5 + ascentM / 600

  const descentSlope = descentM / (distanceKm * 1000 || 1)
  if (descentSlope > 0.12) {
    hours += descentM / 1000 // steep descent slows you down
  } else if (descentM > 0) {
    hours -= descentM / 1500 // gentle descent is faster than flat
  }

  return Math.max(hours, 0.25)
}
