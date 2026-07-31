import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { identity } from '../data/content'

/** The gallery assembling itself. Progress is real work, not a fake timer. */
export default function Loader() {
  const progress = useStore((s) => s.progress)
  const ready = useStore((s) => s.ready)
  const [gone, setGone] = useState(false)
  const [shown, setShown] = useState(0)

  /**
   * Ease the number so it never jumps or stalls visibly — then STOP.
   *
   * An asymptotic ease never exactly reaches its target, so a naive loop here
   * re-renders this component every frame for the life of the page, long after
   * the loader is hidden, stealing frames from the gallery. Bail out once it is
   * close enough to read the same, and never run at all once we are done.
   */
  useEffect(() => {
    if (gone) return
    let raf = 0
    let alive = true
    const step = () => {
      if (!alive) return
      let settled = false
      setShown((v) => {
        const next = v + (progress - v) * 0.12
        if (Math.abs(progress - next) < 0.1) {
          settled = true
          return progress
        }
        return next
      })
      if (settled) return
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [progress, gone])

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setGone(true), 900)
    return () => clearTimeout(t)
  }, [ready])

  const pct = Math.min(100, Math.round(ready ? Math.max(shown, 99.4) : shown))

  return (
    <div className="loader" data-done={ready} aria-hidden={ready} role="status">
      <div className="loader__inner">
        <div className="loader__title">
          <span>Entering the studio</span>
          <span>{String(pct).padStart(3, ' ')}%</span>
        </div>
        <div className="loader__bar">
          <div className="loader__fill" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <div className="loader__name">{identity.name}</div>
        <p className="loader__hint">{gone ? '' : 'Design · Ecommerce · Marketing · Creative Production'}</p>
      </div>
    </div>
  )
}
