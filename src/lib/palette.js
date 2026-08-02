import { Color } from 'three'

/**
 * DIMENSION TWO — TIME.
 *
 * The studio is warm brick and lamplight throughout, always after hours. The
 * clock still moves through it — four anchors blended continuously, so 4:40pm
 * is genuinely between two of them — but the room never goes bright or cold.
 * What changes is the temperature and how much light is in the air.
 *
 * `accentInk` is the accent used inside canvas artwork and is deliberately
 * IDENTICAL in every phase. Those textures are memoised on it, and a value that
 * drifted with the clock would silently redraw every panel in the building once
 * a minute.
 */
const ACCENT_INK = '#a8562a'
/** Lettering applied to the walls, and its accent. Also phase-invariant. */
const SIGN_INK = '#efdcc6'
const SIGN_ACCENT = '#f0a866'

export const PHASES = [
  {
    id: 'embers',
    label: 'Embers',
    hour: 2,
    bg: '#0b0705',
    fog: '#0c0806',
    fogNear: 13,
    fogFar: 62,
    sun: '#a06a42',
    sunIntensity: 0.32,
    sunElevation: 0.55,
    sky: '#3a2418',
    ground: '#080504',
    ambient: 0.26,
    env: 0.3,
    cove: '#ffcf9a',
    coveIntensity: 1.9,
    wall: '#2e1a12',
    floor: '#150c08',
    accent: '#e0955c',
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
    bg: '#130c07',
    fog: '#140d08',
    fogNear: 16,
    fogFar: 74,
    sun: '#c07a45',
    sunIntensity: 0.65,
    sunElevation: 0.3,
    sky: '#4d2f1d',
    ground: '#0c0806',
    ambient: 0.32,
    env: 0.36,
    cove: '#ffd9ab',
    coveIntensity: 1.6,
    wall: '#3d2418',
    floor: '#1c1109',
    accent: '#eda468',
    accentInk: ACCENT_INK,
    signInk: SIGN_INK,
    signAccent: SIGN_ACCENT,
    exposure: 1.0,
    bloom: 0.36,
  },
  {
    id: 'goldenhour',
    label: 'Golden hour',
    hour: 13,
    bg: '#1a1009',
    fog: '#1b110a',
    fogNear: 19,
    fogFar: 86,
    sun: '#ffa860',
    sunIntensity: 0.95,
    sunElevation: 0.72,
    sky: '#6a421f',
    ground: '#120b07',
    ambient: 0.4,
    env: 0.44,
    cove: '#ffe0b8',
    coveIntensity: 1.35,
    wall: '#523020',
    floor: '#26150d',
    accent: '#f2ac6c',
    accentInk: ACCENT_INK,
    signInk: SIGN_INK,
    signAccent: SIGN_ACCENT,
    exposure: 0.94,
    bloom: 0.27,
  },
  {
    id: 'duskrose',
    label: 'Dusk rose',
    hour: 19.5,
    bg: '#150a09',
    fog: '#160b0a',
    fogNear: 15,
    fogFar: 70,
    sun: '#e0705a',
    sunIntensity: 0.82,
    sunElevation: 0.18,
    sky: '#5c2c26',
    ground: '#0f0706',
    ambient: 0.32,
    env: 0.37,
    cove: '#ffcdb0',
    coveIntensity: 1.75,
    wall: '#4a2622',
    floor: '#200f0e',
    accent: '#ef9a7c',
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
