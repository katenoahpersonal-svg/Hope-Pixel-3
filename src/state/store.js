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
  /** Pointer, normalised -1..1, for the subtle camera parallax. */
  mx: 0,
  my: 0,
  /** Where the visitor has turned their head, in radians. Drag to look. */
  dragYaw: 0,
  dragPitch: 0,
  /** True while the pointer is held down on the room. */
  dragging: false,
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
 * Three tiers. `high` adds the reflective floor, which costs a whole extra
 * render of the scene every frame. It is opt-in through `?quality=high`; the
 * normal desktop path deliberately favors reliability. Re-run after mount:
 * at module-evaluation time the viewport may not have been laid out yet.
 */
export function detectQuality() {
  const forced = params.get('quality')
  if (forced === 'high' || forced === 'mid' || forced === 'low') return forced
  if (typeof window === 'undefined') return 'mid'

  const width = document.documentElement.clientWidth || window.innerWidth || 1200
  const cores = navigator.hardwareConcurrency || 4
  const mem = navigator.deviceMemory || 4

  if (width < 820 || cores <= 2 || mem <= 2) return 'low'

  // Stability is the default. Even discrete GPUs can be routed through an
  // integrated compositor in Chrome, and the reflective floor + bloom path is
  // where the remaining long-frame stalls lived. High quality is still
  // available deliberately with ?quality=high, but normal visitors get the
  // architectural-glow mid tier on every desktop.
  return 'mid'
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
