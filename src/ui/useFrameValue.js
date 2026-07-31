import { useEffect, useState, useRef } from 'react'

/**
 * Read a value that changes every frame (camera depth, focused panel) into
 * React state, but only re-render when it actually changes.
 *
 * Pass `active: false` when the thing reading it is off screen. Every live
 * instance costs an animation frame callback plus a re-render each time its
 * value moves, and a hidden overlay re-rendering on every metre of travel is
 * pure waste — the visitor cannot see it.
 *
 * Polls on animation frames, with a slow interval as a backstop: a backgrounded
 * tab issues no frames at all, and the interface should still be correct when
 * it comes back.
 */
export default function useFrameValue(read, initial = null, active = true) {
  const [value, setValue] = useState(initial)
  const last = useRef(initial)
  const fn = useRef(read)
  fn.current = read

  useEffect(() => {
    if (!active) return
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

    poll()
    raf = requestAnimationFrame(loop)
    const timer = setInterval(poll, 250)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      clearInterval(timer)
    }
  }, [active])

  return value
}
