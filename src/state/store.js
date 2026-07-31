import { create } from 'zustand'
import { paletteForHour, currentHour } from '../lib/palette'

/* ------------------------------------------------------------------ */
/* Per-frame values live outside React. Nothing here re-renders.       */
/* ------------------------------------------------------------------ */

export const frame = {
  /** Smoothed scroll progress through the hall, 0..1. */
  t: 0,
  /** Where scroll actually is, before easing. */
  target: 0,
  /** Signed scroll velocity — drives easing and depth of field. */
  vel: 0,
  /** Pointer, normalised -1..1, for the subtle camera orbit. */
  mx: 0,
  my: 0,
  /** Index into panelPlacement of the panel currently nearest the camera. */
  focus: -1,
  /** How strongly that panel is focused, 0..1. */
  focusAmount: 0,
  /** Which panel the pointer is over. */
  hover: -1,
  /** 0 = walking the hall, 1 = dollied into an open panel. */
  dolly: 0,
  /** Camera world position, mirrored out for the UI. */
  camZ: 0,
}

export const SCROLL_SCREENS = 11

/* ------------------------------------------------------------------ */
/* React-facing state                                                  */
/* ------------------------------------------------------------------ */

const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')

/**
 * Three tiers. `low` is the simplified mobile mode: no reflections, no real
 * glass, no depth of field. Re-run after mount — at module-evaluation time the
 * viewport may not have been laid out yet.
 */
export function detectQuality() {
  const forced = params.get('quality')
  if (forced === 'high' || forced === 'mid' || forced === 'low') return forced
  if (typeof window === 'undefined') return 'mid'
  const width = document.documentElement.clientWidth || window.innerWidth || 1200
  const cores = navigator.hardwareConcurrency || 4
  const mem = navigator.deviceMemory || 4
  if (width < 820) return 'low'
  if (cores <= 4 || mem <= 4 || width < 1100) return 'mid'
  return 'high'
}

export const useStore = create((set, get) => ({
  /* loading */
  ready: false,
  progress: 0,
  entered: false,
  setProgress: (p) => set({ progress: Math.max(get().progress, p) }),
  setReady: () => set({ ready: true }),
  enter: () => set({ entered: true }),

  /* daylight */
  hour: currentHour(),
  palette: paletteForHour(currentHour()),
  autoTime: !params.has('hour') && !params.has('phase'),
  setHour: (hour, manual = false) =>
    set({ hour, palette: paletteForHour(hour), ...(manual ? { autoTime: false } : null) }),

  /* navigation */
  section: 'home',
  setSection: (section) => (get().section === section ? null : set({ section })),

  /* work */
  filter: 'All',
  setFilter: (filter) => set({ filter }),
  open: null, // project id of the open case study
  openProject: (id) => set({ open: id }),
  closeProject: () => set({ open: null }),

  /* quality + preferences */
  quality: detectQuality(),
  setQuality: (quality) => set({ quality }),
  sound: false,
  toggleSound: () => set({ sound: !get().sound }),
  captions: true,
}))

/* Handy for the console and for automated checks. */
if (typeof window !== 'undefined') window.__studio = { frame, useStore }
