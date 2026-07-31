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
export default function Effects({ palette, quality }) {
  const dof = useRef()
  const bloom = useRef()
  const gl = useThree((s) => s.gl)
  const enableDof = quality !== 'low'

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
  }, [gl])

  useEffect(() => {
    gl.toneMappingExposure = palette.exposure
  }, [gl, palette.exposure])

  useEffect(() => {
    // Point the lens at the live focal point; the gallery mutates it in place.
    if (dof.current) dof.current.target = focus.point
    if (typeof window !== 'undefined') window.__fx = { dof, bloom }
  }, [enableDof])

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
      multisampling={quality === 'high' ? 4 : quality === 'mid' ? 2 : 0}
      enableNormalPass={false}
    >
      {enableDof ? (
        <DepthOfField
          ref={dof}
          target={focus.point}
          worldFocusRange={2.4}
          bokehScale={1}
          resolutionScale={quality === 'high' ? 1 : 0.6}
        />
      ) : (
        <></>
      )}
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
