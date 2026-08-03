import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { pedestalTexture, sharedBrushedMetal, sharedShadowBlob } from '../lib/textures'
import { expertise, hallAt } from '../data/content'
import { safeDt } from '../lib/math'

/**
 * The alcove. Six disciplines, each rendered as the material it feels like:
 * brushed metal for ecommerce, a sheet of glass for web, stone for marketing,
 * a stack of paper for production, a bar of light for live media, oak for
 * strategy.
 */

const { damp } = THREE.MathUtils

/** Three down each side of the alcove, close enough to the path to walk between. */
const SPOTS = [
  { z: -80.5, side: -1 },
  { z: -80.5, side: 1 },
  { z: -84.5, side: -1 },
  { z: -84.5, side: 1 },
  { z: -88.5, side: -1 },
  { z: -88.5, side: 1 },
]
/** Close enough to the walkway to be in front of you as you approach. */
const OFFSET = 3.1

function Specimen({ kind, metal, hover }) {
  const ref = useRef()
  useFrame((state, delta) => {
    const dt = safeDt(delta)
    if (!ref.current) return
    ref.current.rotation.y += dt * (0.18 + hover * 0.5)
    ref.current.position.y = damp(ref.current.position.y, hover * 0.09, 6, dt)
    if (kind === 'light') {
      const m = ref.current.children[0]?.material
      if (m) m.emissiveIntensity = 1.6 + Math.sin(state.clock.elapsedTime * 1.2) * 0.25 + hover * 1.4
    }
  })

  return (
    <group ref={ref}>
      {kind === 'metal' && (
        <mesh castShadow>
          <boxGeometry args={[0.52, 0.3, 0.52]} />
          <meshStandardMaterial color="#cfc9bf" metalness={1} roughness={0.2} roughnessMap={metal} envMapIntensity={2} />
        </mesh>
      )}

      {kind === 'glass' && (
        <mesh castShadow rotation={[0, 0, 0.06]}>
          <boxGeometry args={[0.44, 0.6, 0.055]} />
          {/* No `transmission` here either — see the note in Panel.jsx. */}
          <meshPhysicalMaterial
            color="#dfe4ff"
            transparent
            opacity={0.34}
            roughness={0.02}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.02}
            envMapIntensity={3}
          />
        </mesh>
      )}

      {kind === 'stone' && (
        <mesh castShadow>
          <icosahedronGeometry args={[0.29, 1]} />
          <meshStandardMaterial color="#a9a296" roughness={0.95} metalness={0} flatShading />
        </mesh>
      )}

      {kind === 'paper' && (
        <group>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[0, -0.09 + i * 0.045, 0]} rotation={[0, (i - 2) * 0.06, 0]} castShadow>
              <boxGeometry args={[0.52, 0.012, 0.38]} />
              <meshStandardMaterial color="#f4f1e9" roughness={0.86} metalness={0} />
            </mesh>
          ))}
        </group>
      )}

      {kind === 'light' && (
        <mesh castShadow>
          <torusGeometry args={[0.22, 0.045, 20, 60]} />
          <meshStandardMaterial
            color="#fff4e2"
            emissive="#ffcf95"
            emissiveIntensity={1.6}
            roughness={0.4}
            toneMapped={false}
          />
        </mesh>
      )}

      {kind === 'wood' && (
        <mesh castShadow rotation={[0.12, 0.4, 0]}>
          <boxGeometry args={[0.5, 0.34, 0.3]} />
          <meshStandardMaterial color="#8a6440" roughness={0.68} metalness={0} />
        </mesh>
      )}
    </group>
  )
}

function Pedestal({ item, spot, palette }) {
  const [hovered, setHovered] = useState(false)
  const hv = useRef(0)
  const glow = useRef()
  const metal = sharedBrushedMetal()
  const blob = sharedShadowBlob()
  const plate = useMemo(() => pedestalTexture(item, palette.accentInk), [item, palette.accentInk])

  const { cx } = hallAt(spot.z)
  const x = cx + spot.side * OFFSET
  // Turned to face the walkway, slightly toward the approach.
  const rotY = spot.side < 0 ? Math.PI / 2 - 0.38 : -Math.PI / 2 + 0.38

  useFrame((_, delta) => {
    const dt = safeDt(delta)
    hv.current = damp(hv.current, hovered ? 1 : 0, 8, dt)
    if (glow.current) glow.current.material.opacity = 0.1 + hv.current * 0.22
  })

  const H = 1.02

  return (
    <group position={[x, 0, spot.z]} rotation={[0, rotY, 0]}>
      {/* plinth */}
      <RoundedBox
        args={[0.84, H, 0.84]}
        radius={0.015}
        smoothness={3}
        position={[0, H / 2, 0]}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        {/* Pale stone even after hours — a dark plinth would swallow the
            engraved face, and lit stone against midnight is the whole point. */}
        <meshStandardMaterial color={palette.dark ? '#d8d4e8' : '#e0dad0'} roughness={0.88} metalness={0.02} envMapIntensity={0.7} />
      </RoundedBox>

      {/* cap */}
      <mesh position={[0, H + 0.02, 0]} receiveShadow>
        <boxGeometry args={[0.92, 0.04, 0.92]} />
        <meshStandardMaterial color="#b9b3a8" metalness={0.7} roughness={0.35} roughnessMap={metal} envMapIntensity={1.2} />
      </mesh>

      {/* the specimen */}
      <group position={[0, H + 0.32, 0]}>
        <Specimen kind={item.material} metal={metal} hover={hovered ? 1 : 0} />
      </group>

      {/* engraved face — sized to be read from the walkway, not just seen */}
      <mesh position={[0, H * 0.52, 0.426]} raycast={() => null}>
        <planeGeometry args={[0.78, 0.78]} />
        <meshStandardMaterial map={plate} transparent roughness={0.9} depthWrite={false} />
      </mesh>

      {/* pool of light */}
      <mesh ref={glow} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial
          map={blob}
          color={palette.cove}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          polygonOffset
          polygonOffsetFactor={-4}
          polygonOffsetUnits={-4}
        />
      </mesh>
    </group>
  )
}

export default function Pedestals({ palette }) {
  return (
    <group>
      {expertise.map((item, i) => (
        <Pedestal key={item.id} item={item} spot={SPOTS[i]} palette={palette} />
      ))}
    </group>
  )
}
