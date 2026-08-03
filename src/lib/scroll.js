import { frame, SCROLL_SCREENS } from '../state/store'

/**
 * Scroll plumbing.
 *
 * There is no smooth-scroll library here on purpose. Every visible element is
 * `position: fixed`, so the only thing the page scroll drives is the camera —
 * and the camera already eases toward its target with a frame-rate-correct
 * damp. Layering a scroll-smoothing library on top of that bought nothing
 * visually, added a second lag that compounded when frames got scarce, and made
 * the scene depend on that library's internal idea of where the page was. When
 * that internal value disagreed with the real one, the scrollbar moved and the
 * camera did not.
 *
 * The document's own scroll position is the single source of truth.
 */

let locked = false
let lockedAt = 0

export function maxScroll() {
  return Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
}

export function scrollY() {
  return window.scrollY ?? document.documentElement.scrollTop ?? 0
}

/** Where the visitor has scrolled to, 0..1. Sampled every frame by the rig. */
export function scrollProgress() {
  const t = scrollY() / maxScroll()
  return Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0
}

export function initScroll() {
  // Nothing to start. Kept as the one place that would set scroll up if it ever
  // needs to again.
  frame.target = scrollProgress()
  frame.t = frame.target
  return null
}

export function scrollHeightPx() {
  return `${SCROLL_SCREENS * 100}vh`
}

let travel = 0

/** Stop any nav journey in progress. Any real input from the visitor wins. */
export function cancelTravel() {
  if (travel) {
    cancelAnimationFrame(travel)
    travel = 0
  }
}

/**
 * Glide (or jump) to a progress value 0..1.
 *
 * Hand-animated rather than `behavior: 'smooth'`. The browser's smooth scroll
 * cannot be interrupted — travelling the length of the building from the side
 * gallery back to the entrance is thousands of pixels, and for the whole of
 * that flight the visitor's own scrolling is ignored. That is indistinguishable
 * from the page having frozen. This version has a fixed, short duration however
 * far it is going, and any wheel or touch cancels it outright.
 */
export function scrollToT(t, { immediate = false, duration = 1100 } = {}) {
  cancelTravel()
  const to = Math.max(0, Math.min(1, t)) * maxScroll()
  if (immediate) {
    window.scrollTo({ top: to, behavior: 'auto' })
    return
  }

  const from = scrollY()
  const distance = to - from
  if (Math.abs(distance) < 2) return
  const start = performance.now()
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

  const step = (now) => {
    const k = Math.min(1, (now - start) / duration)
    window.scrollTo({ top: from + distance * ease(k), behavior: 'auto' })
    travel = k < 1 ? requestAnimationFrame(step) : 0
  }
  travel = requestAnimationFrame(step)
}

/**
 * Hold the camera still while a case study is open.
 *
 * Deliberately does NOT touch `overflow` or pin the body: nothing on this page
 * scrolls visibly, so hiding the scrollbar would only reflow every fixed
 * element sideways by its width. Instead the rig stops sampling scroll while
 * locked, and the position is restored on release so closing a study puts you
 * back exactly where you were standing.
 */
export function lockScroll(on) {
  if (locked === on) return
  locked = on
  if (on) lockedAt = scrollY()
  else window.scrollTo({ top: lockedAt, behavior: 'auto' })
}

export function isLocked() {
  return locked
}

/** Test hook: set progress directly. */
if (typeof window !== 'undefined') {
  window.__seek = (t) => {
    const at = Math.max(0, Math.min(1, t))
    window.scrollTo({ top: at * maxScroll(), behavior: 'auto' })
    frame.target = at
    frame.t = at
  }
}
