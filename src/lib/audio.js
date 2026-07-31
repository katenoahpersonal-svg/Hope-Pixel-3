/**
 * DIMENSION FOUR — SOUND.
 * Entirely synthesised: no audio files, no download, and nothing plays until
 * the visitor asks for it. Room tone is a filtered noise bed under two quiet
 * drones; opening a panel makes a soft materialised click.
 */

let ctx = null
let bed = null
let master = null
let enabled = false

function ensure() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)
  return ctx
}

/** Six seconds of looping brown noise — the sound of a large quiet room. */
function makeBed() {
  if (!ctx || bed) return
  const len = ctx.sampleRate * 6
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.2
  }
  // Cross-fade the seam so the loop does not tick.
  const fade = ctx.sampleRate * 0.4
  for (let i = 0; i < fade; i++) {
    const k = i / fade
    data[i] = data[i] * k + data[len - fade + i] * (1 - k)
  }

  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 520
  lp.Q.value = 0.4

  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.5

  // Slow breathing so the bed never sits perfectly still.
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.06
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.16
  lfo.connect(lfoGain).connect(noiseGain.gain)
  lfo.start()

  src.connect(lp).connect(noiseGain).connect(master)
  src.start()

  // Two drones a fifth apart, barely there.
  ;[55, 82.5].forEach((f, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = f
    const g = ctx.createGain()
    g.gain.value = i === 0 ? 0.05 : 0.028
    osc.connect(g).connect(master)
    osc.start()
  })

  bed = { src, master }
}

export function setEnabled(on) {
  const c = ensure()
  if (!c) return false
  if (c.state === 'suspended') c.resume()
  enabled = on
  if (on) makeBed()
  const now = c.currentTime
  master.gain.cancelScheduledValues(now)
  master.gain.setValueAtTime(master.gain.value, now)
  master.gain.linearRampToValueAtTime(on ? 0.16 : 0, now + (on ? 2.4 : 0.9))
  return true
}

export function isEnabled() {
  return enabled
}

/** A panel settling into place. */
export function click() {
  if (!enabled || !ctx) return
  const now = ctx.currentTime

  // the thunk
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(320, now)
  osc.frequency.exponentialRampToValueAtTime(96, now + 0.16)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(0.34, now + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)
  osc.connect(g).connect(master)
  osc.start(now)
  osc.stop(now + 0.45)

  // the air around it
  const len = Math.floor(ctx.sampleRate * 0.18)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  const noise = ctx.createBufferSource()
  noise.buffer = buf
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2400
  bp.Q.value = 1.1
  const ng = ctx.createGain()
  ng.gain.value = 0.16
  noise.connect(bp).connect(ng).connect(master)
  noise.start(now)
}

/** A quieter tick for interface moves. */
export function tick() {
  if (!enabled || !ctx) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = 880
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(0.06, now + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13)
  osc.connect(g).connect(master)
  osc.start(now)
  osc.stop(now + 0.16)
}
