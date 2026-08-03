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
function Frameloop({ onError }) {
  const advance = useThree((s) => s.advance)

  useEffect(() => {
    if (DRIVE) return
    let raf = 0
    let alive = true
    let beat = 0
    let failures = 0

    const tick = (t) => {
      if (!alive) return
      // Queue the next frame FIRST, so a throw inside advance() cannot break
      // the chain and strand the scene.
      raf = requestAnimationFrame(tick)
      beat++
      window.__frames = beat
      try {
        // R3F's manual clock uses seconds; RAF timestamps are milliseconds.
        advance(t / 1000)
        failures = 0
      } catch (error) {
        failures++
        if (failures === 1) console.error('A 3D frame failed.', error)
        if (failures >= 3) {
          alive = false
          cancelAnimationFrame(raf)
          onError?.(error)
        }
      }
    }

    const restart = () => {
      if (!alive || document.hidden) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    window.addEventListener('studio:resume', restart)
    window.addEventListener('focus', restart)
    window.addEventListener('pageshow', restart)
    document.addEventListener('visibilitychange', restart)

    let seen = -1
    const watchdog = setInterval(() => {
      if (document.hidden) return
      if (beat === seen) restart()
      seen = beat
    }, 1500)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      clearInterval(watchdog)
      window.removeEventListener('studio:resume', restart)
      window.removeEventListener('focus', restart)
      window.removeEventListener('pageshow', restart)
      document.removeEventListener('visibilitychange', restart)
    }
  }, [advance, onError])

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

const pause = () =>
  new Promise((resolve) => {
    // requestIdleCallback is ideal, but Safari does not provide it. A short
    // timer still yields the main thread so input, paint and the render loop
    // can run between uploads.
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 120 })
    } else {
      setTimeout(resolve, 16)
    }
  })

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function sceneTextures(scene) {
  const seen = new Set()
  const textures = []
  scene.traverse((object) => {
    const materials = Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : []

    for (const material of materials) {
      for (const slot of TEXTURE_SLOTS) {
        const texture = material[slot]
        if (texture?.isTexture && !seen.has(texture.uuid)) {
          seen.add(texture.uuid)
          textures.push(texture)
        }
      }
    }
  })
  return textures
}

/**
 * Warm optional GPU resources without ever holding the entrance hostage.
 *
 * The old version called initTexture() for every large canvas texture in one
 * uninterrupted loop while the loader sat at 88%. On integrated graphics that
 * can monopolise the main thread for many seconds, so even the six-second
 * watchdog cannot fire. Uploading a few resources only when the browser is idle
 * keeps the room responsive and lets slower devices enter immediately.
 */
async function warmUp(gl, scene, camera, quality, cancelled) {
  await pause()
  if (cancelled()) return

  // Shader compilation is useful, but it is a background optimisation, not a
  // requirement. Never wait indefinitely for a driver to report completion.
  if (quality === 'high' && typeof gl.compileAsync === 'function') {
    try {
      await Promise.race([gl.compileAsync(scene, camera), timeout(1800)])
    } catch {
      /* A shader that will not precompile can still compile on first use. */
    }
  }

  const textures = sceneTextures(scene)
  const limit = quality === 'high' ? textures.length : quality === 'mid' ? 10 : 0

  for (let i = 0; i < limit; i++) {
    if (cancelled()) return
    try {
      gl.initTexture(textures[i])
    } catch {
      /* A texture that will not preload is not worth failing the session for. */
    }
    await pause()
  }
}

/** Reports the first real frames so the loader can retire honestly. */
function Ready() {
  const frames = useRef(0)
  const started = useRef(false)
  const cancelled = useRef(false)
  const timer = useRef(0)
  const setProgress = useStore((s) => s.setProgress)
  const setReady = useStore((s) => s.setReady)
  const quality = useStore((s) => s.quality)
  const gl = useThree((s) => s.gl)
  const advance = useThree((s) => s.advance)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    // Development hooks. advance() in frameloop="never" expects seconds,
    // whereas requestAnimationFrame/performance.now() report milliseconds.
    window.__probe = { camera, scene, gl }
    window.__drive = (n = 1, dt = 1 / 60) => {
      const start = performance.now() / 1000
      for (let i = 0; i < n; i++) advance(start + i * dt)
      return n
    }

    return () => {
      cancelled.current = true
      clearTimeout(timer.current)
      delete window.__probe
      delete window.__drive
    }
  }, [advance, gl, camera, scene])

  useFrame(() => {
    frames.current++
    if (frames.current <= 3) {
      setProgress(70 + frames.current * 5)
      return
    }
    if (started.current) return
    started.current = true

    // Four actual frames are enough to prove the room is alive. Let the visitor
    // in now; texture/shader warming continues gently in the background.
    setProgress(100)
    setReady()
    timer.current = window.setTimeout(() => {
      void warmUp(gl, scene, camera, quality, () => cancelled.current)
    }, 250)
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
 * Reports the frame rate. Deliberately changes NOTHING.
 *
 * This used to adapt quality while running, and it caused more damage than the
 * slowness it was chasing. Lowering the tier re-rendered the scene mid-scroll
 * and rebuilt the whole effect pipeline. Lowering the pixel ratio was worse
 * still: `gl.setPixelRatio` resizes the renderer's drawing buffer WITHOUT
 * telling the post-processing composer, whose render targets stay at the old
 * size — so the scene is drawn into one size and presented at another, and the
 * image tiles into repeated copies of itself. Both effects landed a few seconds
 * into scrolling, which is exactly when a visitor is least able to explain what
 * they just saw.
 *
 * Cost is decided once, up front, from the GPU. After that the renderer is left
 * alone, so what you see is what the machine actually does — which also makes
 * any remaining report of slowness mean something.
 */
function FpsMeter() {
  const acc = useRef({ elapsed: 0, frames: 0 })

  useFrame((_, delta) => {
    // Hand-stepped frames say nothing about real performance.
    if (DRIVE) return
    // A delta over a second means the tab was backgrounded, not a frame rate.
    if (!Number.isFinite(delta) || delta > 1) return
    const a = acc.current
    a.elapsed += delta
    a.frames++
    if (a.elapsed < 1) return
    window.__fps = Math.round(a.frames / a.elapsed)
    a.elapsed = 0
    a.frames = 0
  })

  return null
}

export default function Scene({ onError }) {
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

      <Rig />
      <Effects palette={palette} quality={quality} />
      <Frameloop onError={onError} />
      <FpsMeter />
      <Ready />
    </>
  )
}
