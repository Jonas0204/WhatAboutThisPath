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

// DAV guideline estimate:
// 4 km/h pace, +400 m ascent per hour, +600 m descent per hour.
export function estimateDavDurationHours({ distanceKm, ascentM, descentM }) {
  const hours = distanceKm / 4 + ascentM / 400 + descentM / 600
  return Math.max(hours, 0.25)
}

// DAV / DIN 33466 net walking-time estimate:
// horizontal 4 km/h, ascent 300 hm/h, descent 500 hm/h,
// then: larger component + half of the smaller component.
export function estimateDavNetDurationHours({ distanceKm, ascentM, descentM }) {
  const horizontalHours = distanceKm / 4
  const verticalHours = ascentM / 300 + descentM / 500
  const hours = Math.max(horizontalHours, verticalHours) + Math.min(horizontalHours, verticalHours) / 2
  return Math.max(hours, 0.25)
}
