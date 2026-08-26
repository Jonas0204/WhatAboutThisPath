import { useCallback, useRef } from 'react'
import { nearestState, snapHeights } from '../lib/sheetSnap.js'

/**
 * On desktop this is `display: contents` — the sidebar and detail panel keep
 * their own grid areas and nothing here applies. On mobile the same two children
 * become one draggable sheet over a full-height map, because a phone can't show
 * a list, a map and a detail pane at once without all three being useless.
 */
export default function BottomSheet({ enabled, state, onStateChange, view, children }) {
  const sheetRef = useRef(null)
  const dragRef = useRef(null)
  const draggedRef = useRef(false)

  const handlePointerDown = useCallback((e) => {
    const sheet = sheetRef.current
    if (!sheet) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    // The snap transition would fight the per-frame heights written below.
    sheet.style.transition = 'none'
    dragRef.current = { startY: e.clientY, startHeight: sheet.getBoundingClientRect().height }
    draggedRef.current = false
  }, [])

  const handlePointerMove = useCallback((e) => {
    const drag = dragRef.current
    const sheet = sheetRef.current
    if (!drag || !sheet) return
    const dy = drag.startY - e.clientY
    if (Math.abs(dy) > 4) draggedRef.current = true
    const heights = snapHeights()
    sheet.style.height = `${Math.min(heights.full, Math.max(heights.peek, drag.startHeight + dy))}px`
  }, [])

  const handlePointerUp = useCallback(
    (e) => {
      const drag = dragRef.current
      const sheet = sheetRef.current
      dragRef.current = null
      if (!drag || !sheet) return
      e.currentTarget.releasePointerCapture?.(e.pointerId)
      const settled = sheet.getBoundingClientRect().height
      sheet.style.removeProperty('height')
      sheet.style.removeProperty('transition')
      if (draggedRef.current) onStateChange(nearestState(settled))
    },
    [onStateChange],
  )

  // Fires for a tap and for keyboard activation, but also after a drag — hence
  // the flag. A tap is the quick "get out of the way" / "come back" toggle.
  const handleClick = useCallback(() => {
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    onStateChange(state === 'peek' ? 'half' : 'peek')
  }, [state, onStateChange])

  // The grip is rendered in both modes (CSS hides it on desktop) so crossing the
  // breakpoint only swaps a class — a conditional child would shift the indexes
  // React matches on and remount the whole list and detail panel on every resize.
  return (
    <div
      className={`app-sheet${enabled ? ' app-sheet--mobile' : ''}`}
      data-state={state}
      data-view={view}
      ref={sheetRef}
    >
      <button
        className="app-sheet__grip"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        aria-label={state === 'peek' ? 'Expand panel' : 'Collapse panel'}
        aria-expanded={state !== 'peek'}
      >
        <span className="app-sheet__grip-bar" aria-hidden="true" />
      </button>
      {children}
    </div>
  )
}
