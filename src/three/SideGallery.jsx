import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { paintTexture, plateTexture, sharedShadowBlob } from '../lib/textures'
import { studioWork, hallAt, Z_END, Z_FAR } from '../data/content'
import { safeDt } from '../lib/math'

/**
 * The side gallery — where the walk ends.
 *
 * Three canvases hung large: one facing you as you arrive, one on each side
 * wall so you have to turn your head to find them. Lit warm from a skylight
 * rather than the cold blue cove that runs the rest of the building, because
 * this is the personal work and it should not feel like the showroom.
 */

const { damp } = THREE.MathUtils

/** Where the visitor comes to rest, and the wall they face — both from content.js. */
const ARRIVE_Z = Z_END
const ROOM_END = Z_FAR

const WARM = '#ffcf9a'

function placement(wall) {
  const z = wall === 'end' ? ROOM_END + 0.14 : ARRIVE_Z - 3
  const { cx, hw } = hallAt(z)
  if (wall === 'end') return { position: [cx, 0, z], rotY: 0, w: 2.7, h: 3.38 }
  const side = wall === 'left' ? -1 : 1
  return {
    position: [cx + side * (hw - 0.07), 0, z],
    rotY: side < 0 ? Math.PI / 2 : -Math.PI / 2,
    w: 2.1,
    h: 2.63,
  }
}

function Piece({ piece, palette }) {
  const [hovered, setHovered] = useState(false)
  const inner = useRef()
  const mat = useRef()
  const art = useMemo(() => paintTexture(piece, palette.accentInk), [piece, palette.accentInk])
  const plate = useMemo(
    () => plateTexture(piece.title, piece.meta, palette.dark ? '#e6d9c6' : '#33302a'),
    [piece, palette.dark]
  )
  const blob = sharedShadowBlob()
  const { position, rotY, w, h } = useMemo(() => placement(piece.wall), [piece.wall])

  const mid = 1.05 + h / 2

  useFrame((_, delta) => {
    const dt = safeDt(delta)
    if (!inner.current) return
    const k = hovered ? 1 : 0
    inner.current.position.z = damp(inner.current.position.z, k * 0.07, 8, dt)
    // Barely any self-illumination: the picture light does the work, otherwise
    // a pale canvas under a warm spot blows straight out to white.
    if (mat.current) mat.current.emissiveIntensity = damp(mat.current.emissiveIntensity, 0.03 + k * 0.16, 6, dt)
  })

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <group ref={inner} position={[0, mid, 0]}>
        {/* a deep float frame, so the canvas sits proud of the wall */}
        <mesh position={[0, 0, -0.05]} castShadow>
          <boxGeometry args={[w + 0.14, h + 0.14, 0.1]} />
          <meshStandardMaterial color={palette.dark ? '#3a2f26' : '#cdc3b4'} roughness={0.7} metalness={0.04} />
        </mesh>
        <mesh
          position={[0, 0, 0.012]}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
            document.body.style.cursor = 'zoom-in'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = ''
          }}
        >
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial
            ref={mat}
            map={art}
            emissiveMap={art}
            emissive="#ffffff"
            emissiveIntensity={0.03}
            roughness={0.88}
            metalness={0}
          />
        </mesh>
      </group>

      {/* engraved plate, at reading height beside the work */}
      <mesh position={[0, 0.86, 0.02]} raycast={() => null}>
        <planeGeometry args={[1.1, 0.344]} />
        <meshStandardMaterial map={plate} transparent roughness={0.9} depthWrite={false} />
      </mesh>

      {/* the wash this piece throws back onto its wall */}
      <mesh position={[0, mid, 0.03]} raycast={() => null}>
        <planeGeometry args={[w * 2.1, h * 1.7]} />
        <meshBasicMaterial
          map={blob}
          color={WARM}
          transparent
          opacity={0.13}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* its own picture light */}
      {/* Set back and opened up, so it grazes the whole canvas instead of
          burning a hot spot into the top of it.

          The target is a CHILD of the light, offset back to the canvas centre.
          A spotlight's default target is an orphan Object3D whose matrixWorld
          never updates, and `target-position` here would be read in the group's
          local space while the light already sits inside that group — so the
          beam ended up aimed into nowhere and the wall stayed unlit. */}
      <spotLight
        position={[0, mid + 1.7, 2.4]}
        color={WARM}
        intensity={9}
        angle={0.8}
        penumbra={0.95}
        distance={11}
        decay={1.25}
      >
        <object3D attach="target" position={[0, -1.7, -2.4]} />
      </spotLight>
    </group>
  )
}

/**
 * Daylight from above. The cove stops before this room (see Hall.jsx) so the
 * skylight is the only source, which is what makes the space read warm.
 */
function Skylight() {
  const { cx, h } = hallAt(ARRIVE_Z)
  const zMid = (ARRIVE_Z + ROOM_END) / 2
  const length = Math.abs(ARRIVE_Z - ROOM_END) + 6

  return (
    <group>
      <mesh position={[cx, h - 0.04, zMid]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[3.1, length]} />
        <meshBasicMaterial color="#f6dcb8" side={THREE.DoubleSide} />
      </mesh>
      {/* Slow falloff so the daylight actually reaches the side walls — a tight
          decay left the room dark between the pictures. */}
      {[-0.32, 0.06, 0.42].map((f) => (
        <pointLight
          key={f}
          position={[cx, h - 1.2, zMid + f * length]}
          color={WARM}
          intensity={30}
          distance={24}
          decay={1.05}
        />
      ))}
      {/* Broad, slow-decaying fill at head height. Without it the side walls
          fall to black between the pictures and the room reads as spotlights in
          the dark rather than as daylight. */}
      <pointLight position={[cx, 2.7, zMid]} color={WARM} intensity={24} distance={30} decay={0.85} />
    </group>
  )
}

export default function SideGallery({ palette }) {
  return (
    <group>
      <Skylight />
      {studioWork.pieces.map((piece) => (
        <Piece key={piece.id} piece={piece} palette={palette} />
      ))}
    </group>
  )
}
