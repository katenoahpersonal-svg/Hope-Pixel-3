import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { panelLayout } from './Gallery'
import { sharedShaftGradient } from '../lib/textures'
import { hallAt } from '../data/content'

/**
 * Light is the whole aesthetic here. Three layers:
 *   1. an environment built from lightformers — soft area light and the
 *      reflections the glass and metal need,
 *   2. a sun through the entrance windows whose colour and angle track the
 *      visitor's clock,
 *   3. two gallery spots that rove to whichever panels you are nearest.
 */

const sunDir = new THREE.Vector3()
const tmp = new THREE.Vector3()

/**
 * Daylight falling through the entrance slots. Billboarded so the shaft reads
 * as air from any angle — a cone or a fixed plane shows its own silhouette,
 * which looks like geometry instead of light.
 */
function Windows({ palette }) {
  const grad = sharedShaftGradient()
  const slots = [8, 12.5, 17]
  const strength = THREE.MathUtils.clamp(palette.sunIntensity / 2.7, 0.12, 1)
  return (
    <group>
      {slots.map((z) => {
        const { cx, hw } = hallAt(z)
        return (
          <group key={z}>
            {/* the glazed slot itself */}
            <mesh position={[cx - hw + 0.06, 3.1, z]} rotation={[0, Math.PI / 2, 0]} raycast={() => null}>
              <planeGeometry args={[1.15, 4.4]} />
              <meshBasicMaterial color={palette.sun} toneMapped={false} />
            </mesh>
            {/* daylight falling out of it */}
            <mesh
              position={[cx - hw + 1.5, 2.4, z]}
              rotation={[0, Math.PI / 2, -0.34]}
              renderOrder={2}
              raycast={() => null}
            >
              <planeGeometry args={[1.5, 5.6]} />
              <meshBasicMaterial
                color={palette.sun}
                alphaMap={grad}
                transparent
                opacity={0.075 * strength}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** Three lamps riding along inside the ceiling slot, so the cove actually lights. */
const COVE_OFFSETS = [5, -8, -21]

export default function Lighting({ palette, quality }) {
  const camera = useThree((s) => s.camera)
  const sun = useRef()
  const spotA = useRef()
  const spotB = useRef()
  const targetA = useRef()
  const targetB = useRef()
  const coves = useRef([])
  const panels = useMemo(() => {
    const l = panelLayout()
    return [l.hero, ...l.wall]
  }, [])

  const shadows = quality === 'high'

  useEffect(() => {
    if (spotA.current && targetA.current) spotA.current.target = targetA.current
    if (spotB.current && targetB.current) spotB.current.target = targetB.current
  }, [])

  useFrame(() => {
    const z = camera.position.z

    // Cove lamps travel with the visitor, hugging the ceiling slot.
    COVE_OFFSETS.forEach((off, i) => {
      const lamp = coves.current[i]
      if (!lamp) return
      const at = z + off
      const { cx, h } = hallAt(at)
      lamp.position.set(cx, h - 0.5, at)
    })

    // The sun rides along with the visitor so its shadow map stays tight.
    if (sun.current) {
      const el = palette.sunElevation
      sunDir.set(-0.62, 0.35 + el * 1.5, 0.42).normalize().multiplyScalar(40)
      sun.current.position.set(camera.position.x + sunDir.x, sunDir.y, z + sunDir.z)
      sun.current.target.position.set(camera.position.x, 0.6, z - 3)
      sun.current.target.updateMatrixWorld()
    }

    // Two gallery spots follow the two nearest panels. Scanned for the best two
    // rather than mapped and sorted — this runs every frame, and building nine
    // objects plus an array plus a sort each time is pure garbage collection.
    let bestP = null
    let bestD = Infinity
    let secondP = null
    let secondD = Infinity
    for (const p of panels) {
      const d = camera.position.distanceTo(p.centre)
      if (d < bestD) {
        secondP = bestP
        secondD = bestD
        bestP = p
        bestD = d
      } else if (d < secondD) {
        secondP = p
        secondD = d
      }
    }

    const assign = (light, target, panel, d) => {
      if (!light.current || !target.current) return
      if (!panel || d > 16) {
        light.current.intensity = 0
        return
      }
      const c = panel.centre
      const n = tmp.set(Math.sin(panel.rotation[1]), 0, Math.cos(panel.rotation[1]))
      light.current.position.set(c.x + n.x * 1.9, c.y + 2.35, c.z + n.z * 1.9)
      target.current.position.copy(c)
      target.current.updateMatrixWorld()
      const falloff = THREE.MathUtils.clamp(1 - (d - 4) / 12, 0.12, 1)
      light.current.intensity = 15 * falloff
    }

    assign(spotA, targetA, bestP, bestD)
    assign(spotB, targetB, secondP, secondD)
  })

  return (
    <>
      {/* reflections + soft fill, baked once per daylight phase */}
      <Environment
        resolution={256}
        frames={1}
        environmentIntensity={palette.env}
        // Re-bakes only when the nearest phase actually changes. Keying on the
        // blend amount re-rendered the cube map several times per transition,
        // and each bake is six scene renders.
        key={palette.id}
      >
        <color attach="background" args={[palette.dark ? '#0d0e12' : '#8c877d']} />
        {/* the ceiling cove, the dominant source */}
        <Lightformer form="rect" intensity={palette.coveIntensity * 1.6} color={palette.cove} scale={[14, 2, 1]} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} />
        {/* daylight side */}
        <Lightformer form="rect" intensity={palette.sunIntensity * 0.7} color={palette.sun} scale={[6, 8, 1]} position={[-9, 3, 2]} rotation={[0, Math.PI / 2, 0]} />
        {/* bounce off the opposite wall */}
        <Lightformer form="rect" intensity={0.7} color={palette.wall} scale={[10, 8, 1]} position={[9, 3, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={0.4} color={palette.floor} scale={[14, 14, 1]} position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      </Environment>

      <hemisphereLight args={[palette.sky, palette.ground, palette.ambient]} />

      {COVE_OFFSETS.map((off, i) => (
        <pointLight
          key={off}
          ref={(el) => (coves.current[i] = el)}
          color={palette.cove}
          intensity={palette.coveIntensity * (i === 0 ? 30 : 24)}
          distance={36}
          decay={1.4}
        />
      ))}

      <directionalLight
        ref={sun}
        color={palette.sun}
        intensity={palette.sunIntensity}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.04}
        // Wide enough that the frustum edge always sits beyond what the fog
        // still shows — a tighter box leaves hard dark slabs down the hall.
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={110}
      />

      <spotLight
        ref={spotA}
        color={palette.cove}
        intensity={0}
        angle={0.66}
        penumbra={0.92}
        distance={12}
        decay={1.6}
      />
      <object3D ref={targetA} />
      <spotLight ref={spotB} color={palette.cove} intensity={0} angle={0.7} penumbra={0.95} distance={12} decay={1.7} />
      <object3D ref={targetB} />

      <Windows palette={palette} />
    </>
  )
}
