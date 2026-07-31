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
const STEP_DOWN = { high: 'mid', mid: 'low', low: null }

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
    a.elapsed = 0
    a.frames = 0
    a.slow = fps < 45 ? a.slow + 1 : 0
    if (a.slow < 2) return
    a.slow = 0

    const { quality, setQuality } = useStore.getState()
    const next = STEP_DOWN[quality]
    if (!next) return

    console.info(`[studio] ${Math.round(fps)}fps — stepping quality ${quality} → ${next}`)
    setQuality(next)
    gl.setPixelRatio(Math.min(gl.getPixelRatio(), next === 'mid' ? 1.35 : 1))
    if (next !== 'high') gl.shadowMap.enabled = false
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
      <PerfGuard />
      <Ready />
    </>
  )
}
