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
    if (frames.current <= 6) setProgress(70 + frames.current * 5)
    if (frames.current === 6) setReady()
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
      <Ready />
    </>
  )
}
