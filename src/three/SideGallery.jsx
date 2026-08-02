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
    if (mat.current) mat.current.emissiveIntensity = damp(mat.current.emissiveIntensity, 0.14 + k * 0.2, 6, dt)
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
            emissiveIntensity={0.14}
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
      {/* No picture light. Three of them meant three more lights evaluated on
          every pixel of the whole building, and the canvases carry themselves
          on emissive plus the room lamp. */}
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
      {/* One lamp for the whole room. Slow decay so it actually reaches the
          side walls — a tight falloff left them black between the pictures. */}
      <pointLight
        position={[cx, h - 1.6, zMid]}
        color={WARM}
        intensity={42}
        distance={34}
        decay={0.8}
      />
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
