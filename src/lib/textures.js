import { CanvasTexture, RepeatWrapping, SRGBColorSpace, LinearFilter, LinearMipmapLinearFilter } from 'three'

/**
 * Every surface and every artwork in the studio is drawn here, into a 2D
 * canvas, and uploaded as a texture. No image files, no CDN, no HDRI download —
 * which is why the whole gallery loads instantly and works offline.
 */

/* --------------------------------------------------------------- utils */

const canvas = (w, h) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** Deterministic PRNG so a given seed always draws the same composition. */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function roundRect(ctx, x, y, w, h, r = 6) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Letter-spaced text, drawn glyph by glyph so it works in every browser. */
function tracked(ctx, text, x, y, spacing = 0, align = 'left') {
  const chars = [...text]
  const width = chars.reduce((w, c) => w + ctx.measureText(c).width + spacing, -spacing)
  let cx = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x
  for (const c of chars) {
    ctx.fillText(c, cx, y)
    cx += ctx.measureText(c).width + spacing
  }
  return width
}

const DISPLAY = "'Instrument Serif', Georgia, 'Times New Roman', serif"
const TEXT = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif"

/** Greedy wrap that shrinks the size until the text fits `maxLines`. */
function wrapFit(ctx, text, maxWidth, size, maxLines, font = DISPLAY) {
  let s = size
  for (let attempt = 0; attempt < 14; attempt++) {
    ctx.font = `${s}px ${font}`
    const words = text.split(' ')
    const lines = []
    let line = ''
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line)
        line = w
      } else line = test
    }
    lines.push(line)
    if (lines.length <= maxLines) return { lines, size: s }
    s -= Math.max(2, Math.round(s * 0.06))
  }
  ctx.font = `${s}px ${font}`
  return { lines: [text], size: s }
}

function finish(c, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const tex = new CanvasTexture(c)
  if (srgb) tex.colorSpace = SRGBColorSpace
  if (repeat) {
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(repeat[0], repeat[1])
  }
  tex.anisotropy = aniso
  tex.minFilter = LinearMipmapLinearFilter
  tex.magFilter = LinearFilter
  tex.needsUpdate = true
  return tex
}

/* ------------------------------------------------------- surface maps */

/** Fine architectural grain. Used as a roughness/bump variation map. */
export function grainMap(size = 512, contrast = 0.16, cell = 2) {
  const c = canvas(size, size)
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(size, size)
  const r = rng(9137)
  const base = 128
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const v = base + (r() - 0.5) * 255 * contrast
      for (let dy = 0; dy < cell; dy++) {
        for (let dx = 0; dx < cell; dx++) {
          const i = ((y + dy) * size + (x + dx)) * 4
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v
          img.data[i + 3] = 255
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0)
  // A couple of broad mottles so it does not read as uniform TV static.
  ctx.globalAlpha = 0.35
  ctx.filter = 'blur(14px)'
  for (let i = 0; i < 26; i++) {
    const x = r() * size
    const y = r() * size
    const rad = 40 + r() * 120
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    const tone = r() > 0.5 ? 255 : 0
    g.addColorStop(0, `rgba(${tone},${tone},${tone},0.16)`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
  ctx.filter = 'none'
  ctx.globalAlpha = 1
  return finish(c, { srgb: false, repeat: [1, 1], aniso: 4 })
}

/** Anisotropic streaks — brushed aluminium for the panel frames. */
export function brushedMetalMap(size = 512) {
  const c = canvas(size, size)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#8a8a8a'
  ctx.fillRect(0, 0, size, size)
  const r = rng(4421)
  for (let i = 0; i < 2600; i++) {
    const y = r() * size
    const len = 40 + r() * size
    const x = r() * size
    const a = 0.02 + r() * 0.07
    ctx.strokeStyle = r() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`
    ctx.lineWidth = 0.5 + r() * 1.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + len, y + (r() - 0.5) * 1.2)
    ctx.stroke()
  }
  return finish(c, { srgb: false, repeat: [1, 1], aniso: 8 })
}

/** Soft elliptical darkening used as a fake contact shadow under objects. */
export function shadowBlob(size = 256) {
  const c = canvas(size, size)
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(0,0,0,0.55)')
  g.addColorStop(0.45, 'rgba(0,0,0,0.26)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return finish(c, { srgb: false })
}

/** A soft vertical falloff — the glow spilling out of the ceiling cove. */
export function coveGradient(size = 128) {
  const c = canvas(8, size)
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, size)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 8, size)
  return finish(c, { srgb: false })
}

/**
 * A shaft of light: a soft cone spreading downward from the cove, with no hard
 * edge anywhere — a visible rectangle floating in the air reads as a mistake.
 */
export function shaftGradient(w = 256, h = 512) {
  const c = canvas(w, h)
  const ctx = c.getContext('2d')

  // the spreading shape, blurred so it has no silhouette
  ctx.filter = 'blur(26px)'
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(w * 0.44, h * 0.06)
  ctx.lineTo(w * 0.56, h * 0.06)
  ctx.lineTo(w * 0.94, h)
  ctx.lineTo(w * 0.06, h)
  ctx.closePath()
  ctx.fill()
  ctx.filter = 'none'

  // fade it out toward the floor and away from the source
  ctx.globalCompositeOperation = 'destination-in'
  const vertical = ctx.createLinearGradient(0, 0, 0, h)
  vertical.addColorStop(0, 'rgba(0,0,0,0)')
  vertical.addColorStop(0.12, 'rgba(0,0,0,1)')
  vertical.addColorStop(0.45, 'rgba(0,0,0,0.42)')
  vertical.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = vertical
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'

  return finish(c, { srgb: false })
}

/* -------------------------------------------------------- wall lettering */

/** Vinyl lettering applied to a wall — transparent, dark, tracked out. */
export function labelTexture(text, { sub = '', width = 1024, height = 256, ink = '#3a352e', accent = '#b9793f', align = 'left' } = {}) {
  const c = canvas(width, height)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, width, height)
  const x = align === 'center' ? width / 2 : 12
  ctx.fillStyle = ink
  ctx.font = `500 76px ${TEXT}`
  ctx.textBaseline = 'alphabetic'
  tracked(ctx, text.toUpperCase(), x, sub ? 96 : 140, 10, align)
  if (sub) {
    ctx.fillStyle = accent
    ctx.font = `400 40px ${TEXT}`
    tracked(ctx, sub.toUpperCase(), x, 168, 6, align)
  }
  return finish(c)
}

/* ------------------------------------------------------------ hero type */

export function heroTypeTexture({ first, last, role, accent = '#b9793f', ink = '#221f1b' } = {}) {
  const W = 2048
  const H = 1024
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, W, H)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = ink
  ctx.font = `300px ${DISPLAY}`
  const fw = ctx.measureText(first).width
  const lw = ctx.measureText(last).width
  const maxw = Math.max(fw, lw)
  const left = (W - maxw) / 2

  ctx.fillText(first, left, 380)
  ctx.fillText(last, left, 660)

  // Accent rule between the words, the width of the longest one.
  ctx.strokeStyle = accent
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(left, 424)
  ctx.lineTo(left + maxw, 424)
  ctx.stroke()

  ctx.fillStyle = '#6b645a'
  ctx.font = `400 44px ${TEXT}`
  tracked(ctx, role.toUpperCase(), W / 2, 780, 8, 'center')

  return finish(c)
}

/* --------------------------------------------------------- panel artwork */

const PAPER = '#f4f1ea'
const INK = '#1d1b17'
const MUTED = '#8d8579'
const HAIR = '#d9d3c8'

function panelBase(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H)
  g.addColorStop(0, '#f8f6f1')
  g.addColorStop(1, '#eeeae1')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

/* Each of these draws the artwork for one project inside {x,y,w,h}. */
const ART = {
  /** A category page collapsing thirty near-identical tiles into one doorway. */
  grid(ctx, r, accent) {
    const { x, y, w, h } = r
    const cols = 3
    const rows = 3
    const gap = 22
    const cw = (w - gap * (cols - 1)) / cols
    const ch = (h - gap * (rows - 1)) / rows
    for (let i = 0; i < cols * rows; i++) {
      const col = i % cols
      const row = (i / cols) | 0
      const cx = x + col * (cw + gap)
      const cy = y + row * (ch + gap)
      const hero = i === 4
      ctx.globalAlpha = hero ? 1 : 0.24
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, cx, cy, cw, ch, 8)
      ctx.fill()
      ctx.strokeStyle = hero ? accent : HAIR
      ctx.lineWidth = hero ? 3 : 1.5
      ctx.stroke()
      // product image block
      ctx.fillStyle = hero ? accent : '#ddd8ce'
      ctx.globalAlpha = hero ? 0.14 : 0.24
      roundRect(ctx, cx + 16, cy + 16, cw - 32, ch * 0.52, 5)
      ctx.fill()
      ctx.globalAlpha = hero ? 1 : 0.24
      // title + price lines
      ctx.fillStyle = hero ? INK : MUTED
      ctx.fillRect(cx + 16, cy + ch * 0.52 + 34, cw - 32, hero ? 7 : 5)
      ctx.fillRect(cx + 16, cy + ch * 0.52 + 54, (cw - 32) * 0.55, 5)
      if (hero) {
        ctx.fillStyle = accent
        roundRect(ctx, cx + 16, cy + ch - 46, cw - 32, 30, 4)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = accent
    ctx.font = `400 34px ${TEXT}`
    tracked(ctx, '30 TILES  →  1 DOORWAY', x, y + h + 46, 4)
  },

  /** Campaign sends stacked, with a lifecycle flow beneath. */
  stack(ctx, r, accent) {
    const { x, y, w, h } = r
    const cardW = w * 0.62
    const cardH = h * 0.62
    for (let i = 3; i >= 0; i--) {
      const off = i * 26
      const s = 1 - i * 0.045
      const cw = cardW * s
      const cx = x + off
      const cy = y + off * 0.55
      ctx.globalAlpha = i === 0 ? 1 : 0.2
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, cx, cy, cw, cardH * s, 8)
      ctx.fill()
      ctx.strokeStyle = HAIR
      ctx.lineWidth = 1.5
      ctx.stroke()
      if (i === 0) {
        ctx.fillStyle = accent
        ctx.fillRect(cx, cy, cw, 10)
        ctx.fillStyle = INK
        ctx.fillRect(cx + 26, cy + 52, cw * 0.62, 9)
        ctx.fillStyle = MUTED
        for (let l = 0; l < 4; l++) ctx.fillRect(cx + 26, cy + 92 + l * 22, cw * (0.78 - l * 0.11), 5)
        ctx.fillStyle = accent
        roundRect(ctx, cx + 26, cy + cardH * s - 74, 168, 40, 4)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    // lifecycle flow
    const fy = y + h - 44
    const stops = ['SIGN UP', 'WELCOME', 'PURCHASE', 'WIN BACK']
    const step = w / stops.length
    ctx.strokeStyle = HAIR
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + 8, fy)
    ctx.lineTo(x + w - 8, fy)
    ctx.stroke()
    stops.forEach((s, i) => {
      const px = x + 8 + i * step + 10
      ctx.fillStyle = i === 0 ? accent : '#ffffff'
      ctx.beginPath()
      ctx.arc(px, fy, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = i === 0 ? accent : MUTED
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = MUTED
      ctx.font = `400 20px ${TEXT}`
      tracked(ctx, s, px, fy + 40, 2, 'center')
    })
  },

  /** Prospecting into retargeting into the offer. */
  flow(ctx, r, accent) {
    const { x, y, w, h } = r
    const cx = x + w / 2
    const bands = [
      { t: 0.0, wTop: 0.94, wBot: 0.68, label: 'PROSPECTING' },
      { t: 0.34, wTop: 0.68, wBot: 0.42, label: 'RETARGETING' },
      { t: 0.68, wTop: 0.42, wBot: 0.2, label: 'CONVERT' },
    ]
    const bh = h * 0.3
    bands.forEach((b, i) => {
      const top = y + b.t * h
      ctx.beginPath()
      ctx.moveTo(cx - (w * b.wTop) / 2, top)
      ctx.lineTo(cx + (w * b.wTop) / 2, top)
      ctx.lineTo(cx + (w * b.wBot) / 2, top + bh)
      ctx.lineTo(cx - (w * b.wBot) / 2, top + bh)
      ctx.closePath()
      ctx.fillStyle = i === 2 ? accent : '#ffffff'
      ctx.globalAlpha = i === 2 ? 1 : 0.9
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = i === 2 ? accent : HAIR
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = i === 2 ? '#fff' : MUTED
      ctx.font = `400 22px ${TEXT}`
      tracked(ctx, b.label, cx, top + bh / 2 + 8, 4, 'center')
    })
    // impressions raining in
    const r2 = rng(77)
    ctx.fillStyle = MUTED
    for (let i = 0; i < 42; i++) {
      const px = x + r2() * w
      const py = y - 6 - r2() * 40
      ctx.globalAlpha = 0.15 + r2() * 0.4
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  },

  /** An open catalog spread with crop marks. */
  spread(ctx, r, accent) {
    const { x, y, w, h } = r
    const pw = (w - 10) / 2
    for (let p = 0; p < 2; p++) {
      const px = x + p * (pw + 10)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(px, y, pw, h)
      ctx.strokeStyle = HAIR
      ctx.lineWidth = 1.5
      ctx.strokeRect(px, y, pw, h)
      // gutter shading
      const g = ctx.createLinearGradient(p === 0 ? px + pw - 40 : px, 0, p === 0 ? px + pw : px + 40, 0)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(0,0,0,0.09)')
      ctx.fillStyle = g
      ctx.fillRect(p === 0 ? px + pw - 40 : px, y, 40, h)

      const m = 26
      if (p === 0) {
        ctx.fillStyle = accent
        ctx.fillRect(px + m, y + m, pw - m * 2, 8)
        ctx.fillStyle = INK
        ctx.fillRect(px + m, y + m + 30, (pw - m * 2) * 0.7, 14)
      }
      // product cells
      const cols = 2
      const rows = 3
      const gx = 14
      const cw = (pw - m * 2 - gx) / cols
      const chh = (h - m * 2 - 80 - gx * 2) / rows
      for (let i = 0; i < cols * rows; i++) {
        const c0 = i % cols
        const r0 = (i / cols) | 0
        const bx = px + m + c0 * (cw + gx)
        const by = y + m + 80 + r0 * (chh + gx)
        ctx.fillStyle = '#eeeae1'
        ctx.fillRect(bx, by, cw, chh * 0.6)
        ctx.fillStyle = MUTED
        for (let l = 0; l < 3; l++) ctx.fillRect(bx, by + chh * 0.6 + 12 + l * 12, cw * (0.9 - l * 0.22), 4)
      }
    }
    // crop marks
    ctx.strokeStyle = MUTED
    ctx.lineWidth = 1.5
    const cm = 18
    ;[[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]].forEach(([px, py, sx, sy]) => {
      ctx.beginPath()
      ctx.moveTo(px + sx * 6, py)
      ctx.lineTo(px + sx * cm, py)
      ctx.moveTo(px, py + sy * 6)
      ctx.lineTo(px, py + sy * cm)
      ctx.stroke()
    })
  },

  /** OBS scene tiles: preview row, program, audio. */
  scenes(ctx, r, accent) {
    const { x, y, w, h } = r
    const progH = h * 0.58
    ctx.fillStyle = '#15161a'
    roundRect(ctx, x, y, w, progH, 8)
    ctx.fill()
    // a simple staged composition inside the program monitor
    ctx.save()
    roundRect(ctx, x, y, w, progH, 8)
    ctx.clip()
    const g = ctx.createRadialGradient(x + w * 0.62, y + progH * 0.42, 10, x + w * 0.62, y + progH * 0.42, w * 0.5)
    g.addColorStop(0, 'rgba(255,220,170,0.5)')
    g.addColorStop(1, 'rgba(255,220,170,0)')
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, progH)
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(x + w * 0.5, y + progH * 0.3, w * 0.26, progH * 0.7)
    // lower third
    ctx.fillStyle = accent
    ctx.fillRect(x + 30, y + progH - 92, 8, 54)
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.fillRect(x + 50, y + progH - 86, 210, 12)
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillRect(x + 50, y + progH - 64, 140, 8)
    ctx.restore()
    // LIVE chip
    ctx.fillStyle = '#d0342c'
    roundRect(ctx, x + w - 118, y + 22, 92, 34, 4)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = `500 22px ${TEXT}`
    tracked(ctx, 'LIVE', x + w - 72, y + 46, 3, 'center')

    // scene strip
    const sy = y + progH + 22
    const sh = h * 0.2
    const n = 4
    const gap = 14
    const sw = (w - gap * (n - 1)) / n
    for (let i = 0; i < n; i++) {
      const sx = x + i * (sw + gap)
      ctx.fillStyle = '#ffffff'
      roundRect(ctx, sx, sy, sw, sh, 6)
      ctx.fill()
      ctx.strokeStyle = i === 0 ? accent : HAIR
      ctx.lineWidth = i === 0 ? 3 : 1.5
      ctx.stroke()
      ctx.fillStyle = '#e6e2d9'
      ctx.fillRect(sx + 10, sy + 10, sw - 20, sh - 34)
      ctx.fillStyle = MUTED
      ctx.fillRect(sx + 10, sh + sy - 16, sw * 0.5, 5)
    }
    // audio meter
    const ay = y + h - 26
    const r2 = rng(31)
    for (let i = 0; i < 64; i++) {
      const bx = x + i * (w / 64)
      const amp = Math.abs(Math.sin(i * 0.42)) * (0.35 + r2() * 0.65)
      const bh = 6 + amp * 34
      ctx.fillStyle = i / 64 > 0.86 ? accent : MUTED
      ctx.fillRect(bx, ay - bh / 2, w / 64 - 4, bh)
    }
  },

  /** Identity construction: monogram, grid, palette, type. */
  mark(ctx, r, accent) {
    const { x, y, w, h } = r
    const boxW = w * 0.52
    const boxH = h * 0.66
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, y, boxW, boxH)
    ctx.strokeStyle = HAIR
    ctx.lineWidth = 1.5
    ctx.strokeRect(x, y, boxW, boxH)
    // construction guides
    ctx.strokeStyle = 'rgba(185,121,63,0.28)'
    ctx.lineWidth = 1
    for (let i = 1; i < 6; i++) {
      ctx.beginPath()
      ctx.moveTo(x + (boxW / 6) * i, y)
      ctx.lineTo(x + (boxW / 6) * i, y + boxH)
      ctx.moveTo(x, y + (boxH / 6) * i)
      ctx.lineTo(x + boxW, y + (boxH / 6) * i)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(x + boxW / 2, y + boxH / 2, Math.min(boxW, boxH) * 0.34, 0, Math.PI * 2)
    ctx.stroke()
    // monogram
    ctx.fillStyle = INK
    ctx.font = `${Math.round(boxH * 0.46)}px ${DISPLAY}`
    tracked(ctx, 'KN', x + boxW / 2, y + boxH / 2 + boxH * 0.16, 2, 'center')

    // palette swatches
    const sw = w - boxW - 30
    const sx = x + boxW + 30
    const swatches = [accent, '#3f4a44', '#c9c2b4', '#1d1b17']
    swatches.forEach((col, i) => {
      ctx.fillStyle = col
      roundRect(ctx, sx, y + i * ((boxH - 24) / 4 + 8), sw, (boxH - 24) / 4, 4)
      ctx.fill()
    })

    // type specimen
    const ty = y + boxH + 46
    ctx.fillStyle = INK
    ctx.font = `62px ${DISPLAY}`
    ctx.fillText('Aa', x, ty + 20)
    ctx.font = `500 54px ${TEXT}`
    ctx.fillText('Aa', x + 110, ty + 18)
    ctx.strokeStyle = HAIR
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x + 220, ty - 26)
    ctx.lineTo(x + 220, ty + 30)
    ctx.stroke()
    ctx.fillStyle = MUTED
    ctx.font = `400 22px ${TEXT}`
    tracked(ctx, 'ONE SYSTEM  ·  EVERY CHANNEL', x + 250, ty + 8, 3)
  },

  /** Mobile-first wireframes resolving into a designed screen. */
  wires(ctx, r, accent) {
    const { x, y, w, h } = r
    // desktop frame
    const dw = w * 0.72
    const dh = h * 0.74
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, x, y, dw, dh, 8)
    ctx.fill()
    ctx.strokeStyle = HAIR
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#efece5'
    ctx.fillRect(x, y, dw, 34)
    ctx.fillStyle = MUTED
    ;[0, 1, 2].forEach((i) => {
      ctx.beginPath()
      ctx.arc(x + 22 + i * 20, y + 17, 5, 0, Math.PI * 2)
      ctx.fill()
    })
    const m = 28
    ctx.fillStyle = '#e9e5dc'
    ctx.fillRect(x + m, y + 34 + m, dw - m * 2, dh * 0.34)
    ctx.fillStyle = INK
    ctx.fillRect(x + m, y + 34 + m + dh * 0.34 + 26, (dw - m * 2) * 0.55, 12)
    ctx.fillStyle = MUTED
    ctx.fillRect(x + m, y + 34 + m + dh * 0.34 + 52, (dw - m * 2) * 0.8, 6)
    ctx.fillRect(x + m, y + 34 + m + dh * 0.34 + 70, (dw - m * 2) * 0.68, 6)
    ctx.fillStyle = accent
    roundRect(ctx, x + m, y + dh - 74, 170, 42, 5)
    ctx.fill()

    // phone frame, overlapping
    const pw = w * 0.26
    const ph = h * 0.78
    const px = x + w - pw
    const py = y + h - ph
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, px, py, pw, ph, 20)
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#e9e5dc'
    ctx.fillRect(px + 14, py + 40, pw - 28, ph * 0.3)
    ctx.fillStyle = INK
    ctx.fillRect(px + 14, py + 40 + ph * 0.3 + 18, (pw - 28) * 0.7, 9)
    ctx.fillStyle = MUTED
    for (let i = 0; i < 3; i++) ctx.fillRect(px + 14, py + 40 + ph * 0.3 + 42 + i * 14, (pw - 28) * (0.9 - i * 0.2), 5)
    ctx.fillStyle = accent
    roundRect(ctx, px + 14, py + ph - 62, pw - 28, 36, 5)
    ctx.fill()
  },

  /** Parent-child variation families, one recovered from suppression. */
  nodes(ctx, r, accent) {
    const { x, y, w, h } = r
    const cx = x + w / 2
    const top = y + 30
    // parent
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, cx - 130, top, 260, 74, 8)
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.font = `500 26px ${TEXT}`
    tracked(ctx, 'PARENT ASIN', cx, top + 46, 3, 'center')

    const childY = top + 210
    const n = 4
    const gap = 26
    const cwd = (w - gap * (n - 1)) / n
    for (let i = 0; i < n; i++) {
      const bx = x + i * (cwd + gap)
      const flagged = i === 2
      ctx.strokeStyle = flagged ? accent : HAIR
      ctx.lineWidth = flagged ? 3 : 2
      ctx.beginPath()
      ctx.moveTo(cx, top + 74)
      ctx.lineTo(cx, top + 130)
      ctx.moveTo(cx, top + 130)
      ctx.lineTo(bx + cwd / 2, top + 130)
      ctx.lineTo(bx + cwd / 2, childY)
      ctx.stroke()

      ctx.fillStyle = '#ffffff'
      roundRect(ctx, bx, childY, cwd, 96, 8)
      ctx.fill()
      ctx.strokeStyle = flagged ? accent : HAIR
      ctx.lineWidth = flagged ? 3 : 1.5
      ctx.stroke()
      ctx.fillStyle = flagged ? accent : '#ddd8ce'
      ctx.fillRect(bx + 16, childY + 20, cwd - 32, 10)
      ctx.fillStyle = MUTED
      ctx.fillRect(bx + 16, childY + 44, (cwd - 32) * 0.7, 6)
      ctx.fillRect(bx + 16, childY + 60, (cwd - 32) * 0.45, 6)
    }

    // status chips
    const sy = y + h - 34
    const chips = [
      { t: 'SUPPRESSED', bg: '#e7dfd4', fg: MUTED },
      { t: 'LIVE IN SEARCH', bg: accent, fg: '#fff' },
    ]
    let cxx = x
    ctx.font = `500 24px ${TEXT}`
    chips.forEach((c, i) => {
      const tw = [...c.t].reduce((a, ch) => a + ctx.measureText(ch).width + 3, 40)
      ctx.fillStyle = c.bg
      roundRect(ctx, cxx, sy - 30, tw, 44, 22)
      ctx.fill()
      ctx.fillStyle = c.fg
      tracked(ctx, c.t, cxx + 20, sy, 3)
      if (i === 0) {
        ctx.strokeStyle = MUTED
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(cxx + tw + 14, sy - 8)
        ctx.lineTo(cxx + tw + 46, sy - 8)
        ctx.lineTo(cxx + tw + 36, sy - 16)
        ctx.moveTo(cxx + tw + 46, sy - 8)
        ctx.lineTo(cxx + tw + 36, sy)
        ctx.stroke()
      }
      cxx += tw + 62
    })
  },
}

/**
 * A flagship project panel: header, generated artwork, title block.
 * Drawn once at 1024×1280 and reused for the life of the page.
 */
export function panelArtTexture(project, accent = '#b9793f') {
  const W = 1024
  const H = 1280
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  panelBase(ctx, W, H)

  const M = 84
  ctx.textBaseline = 'alphabetic'

  // header
  ctx.fillStyle = accent
  ctx.font = `132px ${DISPLAY}`
  ctx.fillText(project.num, M, 196)

  ctx.fillStyle = MUTED
  ctx.font = `500 26px ${TEXT}`
  tracked(ctx, project.category.toUpperCase(), W - M, 150, 5, 'right')

  ctx.strokeStyle = HAIR
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(M, 236)
  ctx.lineTo(W - M, 236)
  ctx.stroke()

  // artwork
  const rect = { x: M, y: 300, w: W - M * 2, h: 560 }
  const draw = ART[project.art?.kind] || ART.grid
  ctx.save()
  draw(ctx, rect, accent)
  ctx.restore()

  // title block
  ctx.fillStyle = accent
  ctx.font = `500 25px ${TEXT}`
  tracked(ctx, (project.kicker || '').toUpperCase(), M, 984, 5)

  ctx.fillStyle = INK
  const { lines, size } = wrapFit(ctx, project.title, W - M * 2, 82, 2)
  lines.forEach((line, i) => {
    ctx.font = `${size}px ${DISPLAY}`
    ctx.fillText(line, M, 1064 + i * (size * 1.06))
  })

  ctx.strokeStyle = HAIR
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(M, 1188)
  ctx.lineTo(W - M, 1188)
  ctx.stroke()

  ctx.fillStyle = MUTED
  ctx.font = `400 24px ${TEXT}`
  tracked(ctx, project.timeline.toUpperCase(), M, 1232, 3)
  ctx.font = `400 24px ${TEXT}`
  tracked(ctx, 'OPEN CASE STUDY', W - M, 1232, 3, 'right')

  return finish(c)
}

/** Soft painterly plates for the side gallery. */
export function paintTexture(piece, accent = '#b9793f') {
  const W = 768
  const H = 960
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const r = rng(piece.art?.seed ?? 1)

  ctx.fillStyle = '#efe9de'
  ctx.fillRect(0, 0, W, H)

  const tones = ['#c8b49a', '#9aa79a', accent, '#7f6a58', '#dfd3bd', '#5c6b74']
  ctx.globalCompositeOperation = 'multiply'
  for (let i = 0; i < 22; i++) {
    ctx.globalAlpha = 0.1 + r() * 0.22
    ctx.fillStyle = tones[(r() * tones.length) | 0]
    ctx.beginPath()
    const cx = r() * W
    const cy = r() * H
    const rad = 60 + r() * 260
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.32) {
      const rr = rad * (0.68 + r() * 0.5)
      const px = cx + Math.cos(a) * rr
      const py = cy + Math.sin(a) * rr * 0.86
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1

  // canvas tooth
  const img = ctx.getImageData(0, 0, W, H)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 16
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)

  // deckled edge
  ctx.strokeStyle = 'rgba(0,0,0,0.09)'
  ctx.lineWidth = 10
  ctx.strokeRect(5, 5, W - 10, H - 10)

  return finish(c)
}

/** The engraved plate beside a piece of studio work. */
export function plateTexture(title, meta, ink = '#33302a') {
  const c = canvas(512, 160)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, 512, 160)
  ctx.fillStyle = ink
  ctx.font = `44px ${DISPLAY}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(title, 0, 56)
  ctx.fillStyle = '#8d8579'
  ctx.font = `400 24px ${TEXT}`
  tracked(ctx, meta.toUpperCase(), 0, 100, 3)
  return finish(c)
}

/** A résumé sheet, hanging on the wall of the records room. */
export function documentTexture(resume, identity, accent = '#b9793f') {
  const W = 900
  const H = 1164 // roughly US Letter
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fbfaf7'
  ctx.fillRect(0, 0, W, H)
  const M = 70
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = INK
  ctx.font = `62px ${DISPLAY}`
  ctx.fillText(identity.name, M, M + 56)

  ctx.fillStyle = accent
  ctx.font = `400 19px ${TEXT}`
  tracked(ctx, 'ECOMMERCE · UI/UX · INTEGRATED MARKETING', M, M + 92, 2.4)

  ctx.strokeStyle = HAIR
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(M, M + 118)
  ctx.lineTo(W - M, M + 118)
  ctx.stroke()

  let y = M + 168
  const section = (label) => {
    ctx.fillStyle = accent
    ctx.font = `500 18px ${TEXT}`
    tracked(ctx, label.toUpperCase(), M, y, 3)
    y += 30
  }
  const rule = () => {
    ctx.strokeStyle = HAIR
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(M, y)
    ctx.lineTo(W - M, y)
    ctx.stroke()
    y += 26
  }
  const lines = (n, widths) => {
    ctx.fillStyle = '#b7b0a4'
    for (let i = 0; i < n; i++) {
      ctx.fillRect(M, y, (W - M * 2) * widths[i % widths.length], 5)
      y += 15
    }
    y += 12
  }

  section('Summary')
  lines(4, [1, 0.97, 0.99, 0.62])
  rule()

  section('Experience')
  for (const job of resume.experience) {
    ctx.fillStyle = INK
    ctx.font = `28px ${DISPLAY}`
    ctx.fillText(job.title, M, y + 16)
    y += 36
    ctx.fillStyle = MUTED
    ctx.font = `400 17px ${TEXT}`
    ctx.fillText(`${job.org} — ${job.meta}`, M, y)
    y += 20
    lines(3, [0.98, 0.93, 0.7])
  }
  rule()

  section('Education')
  ctx.fillStyle = INK
  ctx.font = `26px ${DISPLAY}`
  ctx.fillText(resume.education[0].title, M, y + 14)
  y += 34
  ctx.fillStyle = MUTED
  ctx.font = `400 17px ${TEXT}`
  ctx.fillText(`${resume.education[0].org} — ${resume.education[0].meta}`, M, y)

  // a download cue at the foot of the sheet
  ctx.fillStyle = accent
  roundRect(ctx, M, H - 118, 300, 54, 6)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = `500 20px ${TEXT}`
  tracked(ctx, 'DOWNLOAD PDF', M + 34, H - 84, 3)

  return finish(c)
}

/** The plate in the quiet room at the end. */
export function contactTexture(identity, accent = '#b9793f') {
  const W = 1024
  const H = 640
  const c = canvas(W, H)
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#faf8f4')
  g.addColorStop(1, '#efeade')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = accent
  ctx.font = `400 24px ${TEXT}`
  tracked(ctx, 'THE QUIET ROOM', 72, 96, 6)

  ctx.fillStyle = INK
  ctx.font = `96px ${DISPLAY}`
  ctx.fillText('Let’s talk.', 72, 220)

  ctx.strokeStyle = HAIR
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(72, 268)
  ctx.lineTo(W - 72, 268)
  ctx.stroke()

  ctx.fillStyle = '#4a453d'
  ctx.font = `36px ${DISPLAY}`
  ctx.fillText(identity.email, 72, 340)

  ctx.fillStyle = MUTED
  ctx.font = `400 22px ${TEXT}`
  tracked(ctx, identity.linkedin.label.toUpperCase(), 72, 400, 3)
  tracked(ctx, identity.studio.label.toUpperCase(), 72, 440, 3)
  tracked(ctx, identity.location.toUpperCase(), 72, 480, 3)

  ctx.fillStyle = accent
  ctx.font = `400 22px ${TEXT}`
  tracked(ctx, identity.availability.toUpperCase(), 72, 552, 3)

  return finish(c)
}

/** A pedestal's engraved face: the discipline and what it covers. */
export function pedestalTexture(item, accent = '#b9793f') {
  const c = canvas(512, 512)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, 512, 512)
  ctx.fillStyle = accent
  ctx.font = `400 22px ${TEXT}`
  ctx.textBaseline = 'alphabetic'
  tracked(ctx, 'EXPERTISE', 0, 40, 5)
  ctx.fillStyle = '#2a2721'
  const { lines, size } = wrapFit(ctx, item.title, 500, 72, 2)
  lines.forEach((l, i) => {
    ctx.font = `${size}px ${DISPLAY}`
    ctx.fillText(l, 0, 120 + i * size * 1.05)
  })
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, 250)
  ctx.lineTo(500, 250)
  ctx.stroke()
  ctx.fillStyle = '#6f685c'
  ctx.font = `400 24px ${TEXT}`
  const words = wrapFit(ctx, item.blurb, 500, 26, 5, TEXT)
  words.lines.forEach((l, i) => {
    ctx.font = `400 ${words.size}px ${TEXT}`
    ctx.fillText(l, 0, 296 + i * words.size * 1.45)
  })
  return finish(c)
}
