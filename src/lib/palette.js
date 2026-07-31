import { Color } from 'three'

/**
 * DIMENSION TWO — TIME.
 *
 * The studio is always after hours: deep midnight blues and violets. The clock
 * still moves through it — four anchors blended continuously, so 4:40pm is
 * genuinely between two of them — but the room never goes bright. What changes
 * is the temperature and how much light is in the air.
 *
 * `accentInk` is the accent used inside canvas artwork and is deliberately
 * IDENTICAL in every phase. Those textures are memoised on it, and a value that
 * drifted with the clock would silently redraw every panel in the building once
 * a minute.
 */
const ACCENT_INK = '#5b4bc4'
/** Lettering applied to the walls, and its accent. Also phase-invariant. */
const SIGN_INK = '#d3d0ea'
const SIGN_ACCENT = '#a794ff'

export const PHASES = [
  {
    id: 'smallhours',
    label: 'Small hours',
    hour: 2,
    bg: '#06070f',
    fog: '#070810',
    fogNear: 13,
    fogFar: 62,
    sun: '#5d6ea8',
    sunIntensity: 0.28,
    sunElevation: 0.55,
    sky: '#171d3a',
    ground: '#050610',
    ambient: 0.15,
    env: 0.21,
    cove: '#c8d4ff',
    coveIntensity: 1.9,
    wall: '#171540',
    floor: '#0a0a1c',
    accent: '#9d8cff',
    accentInk: ACCENT_INK,
    signInk: SIGN_INK,
    signAccent: SIGN_ACCENT,
    exposure: 1.06,
    bloom: 0.46,
  },
  {
    id: 'firstlight',
    label: 'First light',
    hour: 7,
    bg: '#0c0f21',
    fog: '#0d1024',
    fogNear: 16,
    fogFar: 74,
    sun: '#8a7ed0',
    sunIntensity: 0.6,
    sunElevation: 0.3,
    sky: '#28305c',
    ground: '#090b18',
    ambient: 0.21,
    env: 0.27,
    cove: '#d6d4ff',
    coveIntensity: 1.6,
    wall: '#231f52',
    floor: '#12112a',
    accent: '#a897ff',
    accentInk: ACCENT_INK,
    signInk: SIGN_INK,
    signAccent: SIGN_ACCENT,
    exposure: 1.0,
    bloom: 0.36,
  },
  {
    id: 'bluehour',
    label: 'Blue hour',
    hour: 13,
    bg: '#101529',
    fog: '#11162c',
    fogNear: 19,
    fogFar: 86,
    sun: '#9fb0e8',
    sunIntensity: 0.9,
    sunElevation: 0.72,
    sky: '#33406f',
    ground: '#0d1020',
    ambient: 0.29,
    env: 0.35,
    cove: '#e4ecff',
    coveIntensity: 1.35,
    wall: '#2a2560',
    floor: '#171634',
    accent: '#9c8dff',
    accentInk: ACCENT_INK,
    signInk: SIGN_INK,
    signAccent: SIGN_ACCENT,
    exposure: 0.94,
    bloom: 0.27,
  },
  {
    id: 'violet',
    label: 'Violet hour',
    hour: 19.5,
    bg: '#0d0819',
    fog: '#0e091b',
    fogNear: 15,
    fogFar: 70,
    sun: '#a866d8',
    sunIntensity: 0.78,
    sunElevation: 0.18,
    sky: '#3a2260',
    ground: '#0a0614',
    ambient: 0.2,
    env: 0.29,
    cove: '#eed6ff',
    coveIntensity: 1.75,
    wall: '#2c1a52',
    floor: '#150e2c',
    accent: '#b58bff',
    accentInk: ACCENT_INK,
    signInk: SIGN_INK,
    signAccent: SIGN_ACCENT,
    exposure: 1.02,
    bloom: 0.42,
  },
]

const NUMERIC = ['fogNear', 'fogFar', 'sunIntensity', 'sunElevation', 'ambient', 'env', 'coveIntensity', 'exposure', 'bloom']
const COLORS = ['bg', 'fog', 'sun', 'sky', 'ground', 'cove', 'wall', 'floor', 'accent', 'accentInk', 'signInk', 'signAccent']

/** Shortest-path blend around the 24h clock. */
function neighbours(hour) {
  const n = PHASES.length
  for (let i = 0; i < n; i++) {
    const a = PHASES[i]
    const b = PHASES[(i + 1) % n]
    let span = b.hour - a.hour
    if (span <= 0) span += 24
    let d = hour - a.hour
    if (d < 0) d += 24
    if (d <= span) return { a, b, t: span === 0 ? 0 : d / span }
  }
  return { a: PHASES[0], b: PHASES[1], t: 0 }
}

const smooth = (t) => t * t * (3 - 2 * t)

/** Build the blended palette for a given decimal hour (0–24). */
export function paletteForHour(hour) {
  const { a, b, t } = neighbours(((hour % 24) + 24) % 24)
  const k = smooth(t)
  const out = { id: k < 0.5 ? a.id : b.id, label: k < 0.5 ? a.label : b.label, mix: k, from: a.id, to: b.id }
  for (const key of NUMERIC) out[key] = a[key] + (b[key] - a[key]) * k
  for (const key of COLORS) out[key] = '#' + new Color(a[key]).lerp(new Color(b[key]), k).getHexString()
  // How dark the room is overall — used to decide UI contrast.
  out.dark = new Color(out.bg).getHSL({ h: 0, s: 0, l: 0 }).l < 0.4
  return out
}

/** Current local hour as a decimal, or a forced value via ?hour= / ?phase=. */
export function currentHour(search = window.location.search) {
  const params = new URLSearchParams(search)
  const forcedHour = params.get('hour')
  if (forcedHour !== null && forcedHour !== '') {
    const h = parseFloat(forcedHour)
    if (Number.isFinite(h)) return ((h % 24) + 24) % 24
  }
  const phase = params.get('phase')
  if (phase) {
    const found = PHASES.find((p) => p.id === phase.toLowerCase())
    if (found) return found.hour
  }
  const now = new Date()
  return now.getHours() + now.getMinutes() / 60
}

export function formatHour(hour) {
  const h = Math.floor(hour) % 24
  const m = Math.floor((hour % 1) * 60)
  const ampm = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`
}
