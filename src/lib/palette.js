import { Color } from 'three'

/**
 * DIMENSION TWO — TIME.
 * Daylight in the studio tracks the visitor's local clock. Four anchors,
 * blended continuously, so 4:40pm is genuinely between midday and dusk.
 */

export const PHASES = [
  {
    id: 'morning',
    label: 'Morning',
    hour: 8,
    bg: '#e7e3db',
    fog: '#e9e5dd',
    fogNear: 26,
    fogFar: 96,
    sun: '#ffe0bd',
    sunIntensity: 1.35,
    sunElevation: 0.34,
    sky: '#cfdcea',
    ground: '#d6cabb',
    ambient: 0.34,
    env: 0.42,
    cove: '#fff2e2',
    coveIntensity: 1.1,
    wall: '#ded8cd',
    floor: '#b8b1a5',
    accent: '#b9793f',
    exposure: 0.82,
    bloom: 0.16,
  },
  {
    id: 'midday',
    label: 'Midday',
    hour: 13,
    bg: '#eeebe4',
    fog: '#f0ede6',
    fogNear: 30,
    fogFar: 110,
    sun: '#fff8ec',
    sunIntensity: 1.7,
    sunElevation: 0.78,
    sky: '#dde8f1',
    ground: '#ded5c8',
    ambient: 0.42,
    env: 0.5,
    cove: '#ffffff',
    coveIntensity: 0.95,
    wall: '#e6e1d8',
    floor: '#c3bcaf',
    accent: '#b9793f',
    exposure: 0.78,
    bloom: 0.13,
  },
  {
    id: 'golden',
    label: 'Golden hour',
    hour: 18.5,
    bg: '#e3d2bd',
    fog: '#e6d5c0',
    fogNear: 22,
    fogFar: 88,
    sun: '#ffb173',
    sunIntensity: 1.6,
    sunElevation: 0.16,
    sky: '#e9cfae',
    ground: '#c4a483',
    ambient: 0.28,
    env: 0.36,
    cove: '#ffe6c6',
    coveIntensity: 1.35,
    wall: '#ddcdb9',
    floor: '#ab9a86',
    accent: '#b9793f',
    exposure: 0.86,
    bloom: 0.24,
  },
  {
    id: 'night',
    label: 'After hours',
    hour: 23.5,
    bg: '#15171d',
    fog: '#12141a',
    fogNear: 16,
    fogFar: 74,
    sun: '#9fb2d6',
    sunIntensity: 0.45,
    sunElevation: 0.5,
    sky: '#2b3448',
    ground: '#14161c',
    ambient: 0.16,
    env: 0.2,
    cove: '#ffd9a8',
    coveIntensity: 1.9,
    wall: '#33333a',
    floor: '#1d1e24',
    accent: '#d59653',
    exposure: 1.0,
    bloom: 0.4,
  },
]

const NUMERIC = ['fogNear', 'fogFar', 'sunIntensity', 'sunElevation', 'ambient', 'env', 'coveIntensity', 'exposure', 'bloom']
const COLORS = ['bg', 'fog', 'sun', 'sky', 'ground', 'cove', 'wall', 'floor', 'accent']

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
