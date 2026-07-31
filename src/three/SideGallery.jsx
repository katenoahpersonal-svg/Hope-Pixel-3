import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { paintTexture, plateTexture, shadowBlob } from '../lib/textures'
import { studioWork, hallAt } from '../data/content'
import { safeDt } from '../lib/math'

/** The side wing: personal work, hung quietly and lit softly. */

const { damp } = THREE.MathUtils
const SPOTS = [
  { z: -128.5, side: -1 },
  { z: -130.5, side: 1 },
  { z: -134.5, side: -1 },
  { z: -136.5, side: 1 },
]

function Piece({ piece, spot, palette }) {
  const [hovered, setHovered] = useState(false)
  const inner = useRef()
  const mat = useRef()
  const art = useMemo(() => paintTexture(piece, palette.accentInk), [piece, palette.accentInk])
  const plate = useMemo(() => plateTexture(piece.title, piece.meta, palette.dark ? '#ccd0ea' : '#33302a'), [piece, palette.dark])
  const blob = useMemo(() => shadowBlob(256), [])

  const { cx, hw } = hallAt(spot.z)
  const x = cx + spot.side * (hw - 0.06)
  const rotY = spot.side < 0 ? Math.PI / 2 : -Math.PI / 2

  useFrame((_, delta) => {
    const dt = safeDt(delta)
    if (!inner.current) return
    const k = hovered ? 1 : 0
    inner.current.position.z = damp(inner.current.position.z, k * 0.06, 8, dt)
    if (mat.current) mat.current.emissiveIntensity = damp(mat.current.emissiveIntensity, 0.1 + k * 0.3, 6, dt)
  })

  const W = 1.32
  const H = 1.65

  return (
    <group position={[x, 0, spot.z]} rotation={[0, rotY, 0]}>
      <group ref={inner} position={[0, 2.05, 0]}>
        {/* a plain hardwood float frame */}
        <mesh position={[0, 0, -0.02]} castShadow>
          <boxGeometry args={[W + 0.1, H + 0.1, 0.05]} />
          <meshStandardMaterial color={palette.dark ? '#2c2648' : '#cdc3b4'} roughness={0.72} metalness={0.05} />
        </mesh>
        <mesh
          position={[0, 0, 0.012]}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
        >
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial
            ref={mat}
            map={art}
            emissiveMap={art}
            emissive="#ffffff"
            emissiveIntensity={0.1}
            roughness={0.86}
            metalness={0}
          />
        </mesh>
      </group>

      {/* engraved plate */}
      <mesh position={[0, 1.02, 0.01]} raycast={() => null}>
        <planeGeometry args={[0.92, 0.2875]} />
        <meshStandardMaterial map={plate} transparent roughness={0.9} depthWrite={false} />
      </mesh>

      {/* wash of light down the wall */}
      <mesh position={[0, 2.0, 0.02]} raycast={() => null}>
        <planeGeometry args={[2.6, 3.4]} />
        <meshBasicMaterial
          map={blob}
          color={palette.cove}
          transparent
          opacity={0.11}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

export default function SideGallery({ palette }) {
  return (
    <group>
      {studioWork.pieces.map((piece, i) => (
        <Piece key={piece.id} piece={piece} spot={SPOTS[i]} palette={palette} />
      ))}
    </group>
  )
}
