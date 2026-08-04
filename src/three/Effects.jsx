import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'
import { focus } from './focus'
import { frame } from '../state/store'
import { safeDt, finite } from '../lib/math'

/**
 * DIMENSION FIVE, continued. Depth of field follows the focal point the
 * gallery publishes: the panel you are standing at is razor sharp, the rest of
 * the room falls away. Scrolling hard widens the bokeh — motion you feel
 * rather than see.
 */
function RendererSettings({ palette }) {
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
  }, [gl])

  useEffect(() => {
    gl.toneMappingExposure = palette.exposure
  }, [gl, palette.exposure])

  return null
}

function HighEffects({ palette }) {
  const dof = useRef()
  const bloom = useRef()
  /**
   * Depth of field is a `high` luxury only.
   *
   * It renders the blur at half resolution and composites it over everything,
   * so on hardware that cannot afford it the result is not "tasteful bokeh" —
   * it is a scene that looks permanently out of focus while also running
   * slower. Sharp at 30fps beats soft at 30fps.
   */

  useEffect(() => {
    // Point the lens at the live focal point; the gallery mutates it in place.
    if (dof.current) dof.current.target = focus.point
    if (typeof window !== 'undefined') window.__fx = { dof, bloom }
  }, [])

  useFrame((_, delta) => {
    const dt = safeDt(delta)
    const speed = Math.min(1, Math.abs(finite(frame.vel)) * 34)

    if (dof.current?.cocMaterial) {
      const coc = dof.current.cocMaterial
      // A tight focal range when locked to a panel, generous while walking.
      const range = 1.6 + (1 - focus.lock) * 4.5 + speed * 2.4
      if ('worldFocusRange' in coc) {
        coc.worldFocusRange = THREE.MathUtils.damp(coc.worldFocusRange || range, range, 5, dt)
      }
      // Kept modest: the ceiling cove is a long bright strip, and a wide bokeh
      // kernel smears it into rectangles across the whole room.
      const scale = 0.75 + (1 - focus.lock) * 0.55 + speed * 1.1 + frame.dolly * 0.35
      dof.current.bokehScale = THREE.MathUtils.damp(dof.current.bokehScale, scale, 5, dt)
    }

    if (bloom.current) {
      bloom.current.intensity = THREE.MathUtils.damp(bloom.current.intensity, palette.bloom, 2, dt)
    }
  })

  return (
    <EffectComposer
      multisampling={2}
      enableNormalPass={false}
    >
      {/* `{cond && <Effect/>}` — never a Fragment. EffectComposer reads its
          children as effects, and React.Children.toArray drops false but keeps
          a Fragment, which breaks the composer when the tier changes. */}
      <DepthOfField
        ref={dof}
        target={focus.point}
        worldFocusRange={2.4}
        bokehScale={1}
        resolutionScale={0.65}
      />
      <Bloom
        ref={bloom}
        intensity={palette.bloom}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.22}
        mipmapBlur
        radius={0.55}
      />
      <Vignette offset={0.28} darkness={palette.dark ? 0.62 : 0.4} eskil={false} />
    </EffectComposer>
  )
}


/**
 * Post-processing is reserved for discrete-GPU/high quality sessions. On the
 * mid tier the full-screen composer, bloom pyramid and MSAA render targets
 * were the largest source of Windows/Chrome WebGL stalls. The room's glow is
 * now built into the architecture, so the gallery remains luminous without a
 * second full-screen render pipeline.
 */
export default function Effects({ palette, quality }) {
  return (
    <>
      <RendererSettings palette={palette} />
      {quality === 'high' && <HighEffects palette={palette} />}
    </>
  )
}
