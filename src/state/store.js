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
 * Integrated graphics. A laptop can report eight cores and 16GB and still be
 * drawing through an Intel iGPU sharing system memory — and this scene is
 * entirely fill-rate bound, so cores and RAM say nothing useful about it. Ask
 * the driver instead.
 */
const INTEGRATED =
  /(intel|hd graphics|uhd|iris|mesa|llvmpipe|swiftshader|microsoft basic|radeon\(tm\) graphics|vega \d|adreno|mali|powervr)/i

let gpuTier = null
function detectGpu() {
  if (gpuTier) return gpuTier
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return (gpuTier = 'none')
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    gpuTier = INTEGRATED.test(name) ? 'integrated' : 'discrete'
  } catch {
    gpuTier = 'unknown'
  }
  return gpuTier
}

/**
 * Three tiers. `high` adds the reflective floor, which costs a whole extra
 * render of the scene every frame — it is reserved for hardware that can
 * clearly afford it. Re-run after mount: at module-evaluation time the viewport
 * may not have been laid out yet.
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
  // Integrated graphics tops out at mid, however healthy the CPU looks.
  if (detectGpu() !== 'discrete') return 'mid'
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
