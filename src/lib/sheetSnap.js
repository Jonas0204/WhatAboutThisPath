// Fractions of the viewport the mobile bottom sheet snaps to. style.css mirrors
// these as dvh values on [data-state]; a drag interpolates between them in
// pixels, and App.jsx reserves `half` as map padding so fitBounds doesn't centre
// a track behind the sheet.
export const SHEET_SNAP = { peek: 0.1, half: 0.52, full: 0.88 }

const STATES = ['peek', 'half', 'full']

export function snapHeights(viewportHeight = window.innerHeight) {
  return {
    peek: viewportHeight * SHEET_SNAP.peek,
    half: viewportHeight * SHEET_SNAP.half,
    full: viewportHeight * SHEET_SNAP.full,
  }
}

export function nearestState(height, viewportHeight) {
  const heights = snapHeights(viewportHeight)
  return STATES.reduce((best, state) =>
    Math.abs(heights[state] - height) < Math.abs(heights[best] - height) ? state : best,
  )
}
