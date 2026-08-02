import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import Hall from './Hall'
import Gallery from './Gallery'
import Signage from './Signage'
import Pedestals from './Pedestals'
import SideGallery from './SideGallery'
import Lighting from './Lighting'
import Effects from './Effects'
import Rig from './Rig'
import { useStore } from '../state/store'
import { downloadResume } from '../lib/download'

/**
 * Everything below this point is mounted exactly once and driven by the store,
 * never by props from the DOM tree above it — re-rendering a hand-mounted
 * react-three-fiber root tears the scene down and rebuilds it.
 */

const DRIVE = new URLSearchParams(window.location.search).has('drive')

/**
 * Our own render loop, rather than react-three-fiber's.
 *
 * The scene lives on a hand-made root (see Stage.jsx), and whether R3F starts
 * its internal animation loop for one of those was an implementation detail we
 * were quietly relying on. If it does not start, the canvas paints one frame
 * and freezes: the page still scrolls, the camera never moves, and nothing
 * reacts — which is indistinguishable from the site hanging.
 *
 * Driving `advance()` from a loop we own settles the question, and makes the
 * shipped build take the exact code path that ?drive has been exercising all
 * along. The watchdog restarts it if it ever stops, so a lost WebGL context or
 * a throw inside a frame callback cannot end the session.
 */
function Frameloop() {
  const advance = useThree((s) => s.advance)

  useEffect(() => {
    if (DRIVE) return
    let raf = 0
    let alive = true
    let beat = 0

    const tick = (t) => {
      if (!alive) return
      // Queue the next frame FIRST, so a throw inside advance() cannot break
      // the chain and strand the scene.
      raf = requestAnimationFrame(tick)
      beat++
      window.__frames = beat
      advance(t)
    }
    raf = requestAnimationFrame(tick)

    let seen = -1
    const watchdog = setInterval(() => {
      if (document.hidden) return
      if (beat === seen) {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(tick)
      }
      seen = beat
    }, 2000)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      clearInterval(watchdog)
    }
  }, [advance])

  return null
}

const TEXTURE_SLOTS = [
  'map',
  'emissiveMap',
  'alphaMap',
  'roughnessMap',
  'metalnessMap',
  'normalMap',
  'aoMap',
]

/**
 * Push every texture and every shader onto the GPU before the loader retires.
 *
 * Otherwise each one is uploaded the first time its object enters the view —
 * a 1024×1280 canvas texture plus mipmaps, or a fresh shader program, in the
 * middle of a frame. That is a 100ms stall, and walking the hall hits a fresh
 * one every few metres, which is exactly what "getting stuck" feels like.
 */
async function warmUp(gl, scene, camera) {
  const seen = new Set()
  scene.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    for (const m of mats) {
      for (const slot of TEXTURE_SLOTS) {
        const tex = m[slot]
        if (tex?.isTexture && !seen.has(tex.uuid)) {
          seen.add(tex.uuid)
          try {
            gl.initTexture(tex)
          } catch {
            /* a texture that will not preload is not worth failing the load for */
          }
        }
      }
    }
  })
  try {
    if (gl.compileAsync) await gl.compileAsync(scene, camera)
    else gl.compile(scene, camera)
  } catch {
    /* ditto for shader precompilation */
  }
  return seen.size
}

/** Reports the first real frames so the loader can retire honestly. */
function Ready() {
  const frames = useRef(0)
  const warmed = useRef(false)
  const setProgress = useStore((s) => s.setProgress)
  const setReady = useStore((s) => s.setReady)
  const gl = useThree((s) => s.gl)
  const advance = useThree((s) => s.advance)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    // Development hooks. __drive steps the frameloop by hand, which is the only
    // way to get a frame out of a tab that receives no animation frames (a
    // backgrounded preview pane); __probe is for poking at the scene from a
    // console.
    window.__probe = { camera, scene, gl }
    window.__drive = (n = 1, dt = 1 / 60) => {
      for (let i = 0; i < n; i++) advance(performance.now() + i * dt * 1000)
      return n
    }
  }, [advance, gl, camera, scene])

  useFrame(() => {
    frames.current++
    if (frames.current <= 3) {
      setProgress(70 + frames.current * 5)
      return
    }
    // One frame has been drawn, so the scene graph is complete — warm it, then
    // let the loader go.
    if (warmed.current) return
    warmed.current = true
    setProgress(88)
    warmUp(gl, scene, camera).then(() => {
      setProgress(100)
      setReady()
    })
  })

  return null
}

/**
 * Watches the real frame rate and steps the quality tier down if the machine
 * cannot hold it. Only ever downward — stepping back up trades a stutter for an
 * oscillation, which reads worse than simply running at the lower tier.
 */
/**
 * Resolution steps it walks down through. Pixel ratio only — deliberately.
 *
 * This used to lower the quality TIER, which re-rendered the whole scene: the
 * floor swapped material, the effect composer rebuilt its pass chain, shaders
 * recompiled. Doing that mid-scroll on a struggling machine produces exactly
 * the stutter-then-garbage it was supposed to prevent. Resolution is the
 * biggest lever anyway and costs nothing to change.
 */
/**
 * Never below 1. Dropping under native resolution upscales a soft image across
 * the entire screen, so the site stops looking slow and starts looking broken —
 * a blurry 30fps reads far worse than a crisp one.
 */
const DPR_STEPS = [1.25, 1]

function PerfGuard() {
  const gl = useThree((s) => s.gl)
  const frameloop = useThree((s) => s.frameloop)
  const acc = useRef({ elapsed: 0, frames: 0, slow: 0, warmup: 0 })

  useFrame((_, delta) => {
    // Hand-stepped frames say nothing about real performance.
    if (frameloop === 'never') return
    // A delta over a second means the tab was backgrounded or the machine
    // stalled on something outside our control — not a frame rate.
    if (!Number.isFinite(delta) || delta > 1) return
    const a = acc.current

    // Ignore the first couple of seconds: shaders are still compiling and every
    // frame in that window is slow no matter what the hardware is.
    if (a.warmup < 2.5) {
      a.warmup += delta
      return
    }

    a.elapsed += delta
    a.frames++
    if (a.elapsed < 1) return

    const fps = a.frames / a.elapsed
    window.__fps = Math.round(fps)
    a.elapsed = 0
    a.frames = 0
    a.slow = fps < 45 ? a.slow + 1 : 0
    if (a.slow < 2) return
    a.slow = 0

    const current = gl.getPixelRatio()
    const next = DPR_STEPS.find((step) => step < current - 0.01)
    if (next === undefined) return

    console.info(`[studio] ${Math.round(fps)}fps — dropping resolution ${current.toFixed(2)} → ${next}`)
    gl.setPixelRatio(next)
    if (gl.shadowMap.enabled) {
      gl.shadowMap.enabled = false
      gl.shadowMap.needsUpdate = true
    }
  })

  return null
}

export default function Scene() {
  const palette = useStore((s) => s.palette)
  const quality = useStore((s) => s.quality)

  return (
    <>
      <color attach="background" args={[palette.bg]} />
      <fog attach="fog" args={[palette.fog, palette.fogNear, palette.fogFar]} />

      <Lighting palette={palette} quality={quality} />
      <Hall palette={palette} quality={quality} />
      <Gallery palette={palette} quality={quality} />
      <Signage palette={palette} onDownload={downloadResume} />
      <Pedestals palette={palette} />
      <SideGallery palette={palette} />

      <Rig quality={quality} />
      <Effects palette={palette} quality={quality} />
      <Frameloop />
      <PerfGuard />
      <Ready />
    </>
  )
}
