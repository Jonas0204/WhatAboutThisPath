import { useCallback, useSyncExternalStore } from 'react'

// The mobile layout isn't only a CSS concern: the bottom sheet needs a state
// machine, and the map's fitBounds padding has to reserve the space the sheet
// covers. Both need the breakpoint in JS, matched to the one in style.css.
export const MOBILE_QUERY = '(max-width: 900px)'

export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
