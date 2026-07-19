import { Profiler } from 'react'

const isDev = import.meta.env.DEV

function record(id, phase, actualDuration) {
  window.__profilerLog ??= []
  window.__profilerLog.push({ id, phase, actualDuration, at: performance.now() })
}

// Wraps a subtree with React's Profiler in dev builds only (Profiler has real
// overhead, so it must not ship to production). Used to inspect render counts/costs
// for specific subtrees (e.g. TrackSidebar, MapView) via window.__profilerLog —
// see the "performance" section in README.md for how to read it.
export default function DevProfiler({ id, children }) {
  if (!isDev) return children
  return (
    <Profiler id={id} onRender={record}>
      {children}
    </Profiler>
  )
}
