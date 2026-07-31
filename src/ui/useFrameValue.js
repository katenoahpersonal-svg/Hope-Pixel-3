import { useEffect, useState, useRef } from 'react'

/**
 * Read a value that changes every frame (camera depth, focused panel) into
 * React state, but only re-render when it actually changes.
 *
 * Polls on animation frames and on a slow interval as well — a background or
 * hidden tab stops issuing frames, and the interface should still be correct
 * when it comes back.
 */
export default function useFrameValue(read, initial = null) {
  const [value, setValue] = useState(initial)
  const last = useRef(initial)
  const fn = useRef(read)
  fn.current = read

  useEffect(() => {
    let raf = 0
    let alive = true

    const poll = () => {
      const next = fn.current()
      if (next !== last.current) {
        last.current = next
        setValue(next)
      }
    }
    const loop = () => {
      if (!alive) return
      poll()
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    const timer = setInterval(poll, 200)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      clearInterval(timer)
    }
  }, [])

  return value
}
