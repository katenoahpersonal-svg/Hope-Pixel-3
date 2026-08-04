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

/** Reports the first real frames so the loader can retire honestly. */
function Ready() {
  const frames = useRef(0)
  const setProgress = useStore((s) => s.setProgress)
  const setReady = useStore((s) => s.setReady)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    // Small console hook for troubleshooting without changing the render loop.
    window.__probe = { camera, scene, gl }
    return () => {
      delete window.__probe
    }
  }, [gl, camera, scene])

  useFrame(() => {
    frames.current++
    window.__frames = (window.__frames || 0) + 1
    if (frames.current <= 3) {
      setProgress(70 + frames.current * 5)
      return
    }
    if (frames.current === 4) {
      // Enter as soon as four real frames have rendered. Do not force-upload
      // every texture afterward: those uploads were landing during the first
      // scroll and making the room appear to freeze.
      setProgress(100)
      setReady()
    }
  })

  return null
}

/** Report the real frame rate without changing quality mid-session. */
function FpsMeter() {
  const acc = useRef({ elapsed: 0, frames: 0 })

  useFrame((_, delta) => {
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

      <Rig />
      <Effects palette={palette} quality={quality} />
      <FpsMeter />
      <Ready />
    </>
  )
}
