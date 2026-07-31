import Lenis from 'lenis'
import gsap from 'gsap'
import { frame, SCROLL_SCREENS } from '../state/store'

let lenis = null
let locked = false

export function maxScroll() {
  return Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
}

export function initScroll() {
  if (lenis) return lenis

  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.4,
    wheelMultiplier: 0.9,
  })

  // One ticker for the page. R3F runs its own loop for the scene.
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  return lenis
}

/**
 * Where the visitor has actually scrolled to, 0..1 — sampled, not listened for.
 *
 * This reads Lenis's TARGET rather than its animated position on purpose. The
 * camera does its own frame-rate-correct easing, so taking Lenis's smoothed
 * value too would stack two lags on top of each other; when frames get scarce
 * both slow down together and the whole thing feels stuck. One layer of easing,
 * fed by the raw scroll position, stays responsive at any frame rate.
 */
export function scrollProgress() {
  const y = lenis ? lenis.targetScroll : window.scrollY
  const t = y / maxScroll()
  return Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0
}

export function scrollHeightPx() {
  return `${SCROLL_SCREENS * 100}vh`
}

/** Jump (or glide) to a progress value 0..1. */
export function scrollToT(t, { immediate = false, duration = 1.9 } = {}) {
  const y = Math.max(0, Math.min(1, t)) * maxScroll()
  if (!lenis) {
    window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' })
    return
  }
  lenis.scrollTo(y, { immediate, duration, easing: (x) => 1 - Math.pow(1 - x, 4), force: true })
}

/** Freeze the page while a case study is open, with or without smooth scroll. */
export function lockScroll(on) {
  if (locked === on) return
  locked = on
  if (lenis) on ? lenis.stop() : lenis.start()
  else document.body.style.overflow = on ? 'hidden' : ''
}

export function isLocked() {
  return locked
}

/** Test hook: set progress directly when there is no RAF to rely on. */
if (typeof window !== 'undefined') {
  window.__seek = (t) => {
    const at = Math.max(0, Math.min(1, t))
    if (lenis) lenis.scrollTo(at * maxScroll(), { immediate: true, force: true })
    else window.scrollTo(0, at * maxScroll())
    // Assert after the scroll, not before: Lenis emits synchronously and would
    // otherwise overwrite this with a stale position when no rAF is running to
    // finish its animation.
    frame.target = at
    frame.t = at
  }
}
