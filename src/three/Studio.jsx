import Stage from './Stage'
import Scene from './Scene'
import { useStore } from '../state/store'

const drive = new URLSearchParams(window.location.search).has('drive')

/**
 * The whole 3D gallery behind one lazy import, so a visitor on the flat layout
 * — reduced motion, or no WebGL — never downloads three.js at all.
 */
export default function Studio({ onCreated }) {
  const quality = useStore((s) => s.quality)

  return (
    <Stage
      // This scene is fill-rate bound, so pixel count is the single biggest
      // lever there is. 1.5 on a 1280-wide window is already 2.6 megapixels.
      dpr={[1, quality === 'high' ? 1.5 : quality === 'mid' ? 1.25 : 1]}
      shadows={quality === 'high'}
      frameloop={drive ? 'never' : 'always'}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
      }}
      camera={{ fov: 48, near: 0.1, far: 220, position: [0, 1.62, 14] }}
      onCreated={onCreated}
    >
      <Scene />
    </Stage>
  )
}
