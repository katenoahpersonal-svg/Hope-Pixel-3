import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import {
  labelTexture,
  documentTexture,
  contactTexture,
  sharedBrushedMetal,
} from '../lib/textures'
import { identity, about, resume, studioWork, hallAt, CHAPTER_Z, CONTACT_Z } from '../data/content'
import { safeDt } from '../lib/math'

const { damp } = THREE.MathUtils

/** A point on the left (-1) or right (1) wall at depth z. */
function wallSpot(z, side, inset = 0.04) {
  const { cx, hw } = hallAt(z)
  return {
    position: [cx + side * (hw - inset), 0, z],
    rotation: [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0],
  }
}

/* ------------------------------------------------------- wall lettering */

function WallLabel({ text, sub, z, side, y, width = 4.05, palette }) {
  const tex = useMemo(
    () => labelTexture(text, { sub, ink: palette.signInk, accent: palette.signAccent }),
    [text, sub, palette.signInk, palette.signAccent]
  )
  const spot = useMemo(() => wallSpot(z, side, 0.045), [z, side])
  // Keep room names inside the visitor's natural field of view. The previous
  // near-ceiling placement made long labels look clipped at normal zoom.
  const labelY = y ?? Math.min(hallAt(z).h - 1.35, 4.15)
  const inwardX = spot.position[0] - side * 0.012

  return (
    <group position={[inwardX, labelY, spot.position[2]]} rotation={spot.rotation}>
      {/* A second, additive copy gives the lettering a soft halo even on the
          performance tier where full-screen bloom is intentionally disabled. */}
      <mesh position={[0, 0, 0.003]} scale={1.055} raycast={() => null} renderOrder={2}>
        <planeGeometry args={[width, width / 4]} />
        <meshBasicMaterial
          map={tex}
          color={palette.cove}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.008]} raycast={() => null} renderOrder={3}>
        <planeGeometry args={[width, width / 4]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive="#ffffff"
          emissiveIntensity={0.72}
          transparent
          roughness={0.76}
          metalness={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

const ROOM_LABELS = [
  { text: 'Main Gallery', sub: 'Selected work', z: -4 },
  { text: 'Studio Tour', sub: 'About', z: -61 },
  { text: 'The Alcove', sub: 'Expertise', z: -82 },
  { text: 'Records', sub: 'Résumé', z: -98 },
  { text: 'The Quiet Room', sub: 'Contact', z: -108 },
  { text: 'Studio Work', sub: 'Side gallery', z: -130 },
]

/* ------------------------------------------------------------- résumé */

function ResumeSheet({ palette, onDownload }) {
  const [hover, setHover] = useState(false)
  const inner = useRef()
  const mat = useRef()
  const tex = useMemo(() => documentTexture(resume, identity, palette.accentInk), [palette.accentInk])
  const metal = sharedBrushedMetal()
  const spot = useMemo(() => wallSpot(-99, 1, 0.1), [])

  useFrame((_, delta) => {
    const dt = safeDt(delta)
    if (!inner.current) return
    const k = hover ? 1 : 0
    inner.current.position.z = damp(inner.current.position.z, k * 0.11, 8, dt)
    inner.current.scale.setScalar(damp(inner.current.scale.x, 1 + k * 0.02, 8, dt))
    if (mat.current) mat.current.emissiveIntensity = damp(mat.current.emissiveIntensity, 0.16 + k * 0.4, 6, dt)
  })

  const W = 1.98
  const H = 2.56

  return (
    <group position={[spot.position[0], 1.28 + H / 2, spot.position[2]]} rotation={spot.rotation}>
      <group ref={inner}>
        <RoundedBox args={[W + 0.13, H + 0.13, 0.07]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color="#b6b1a8" metalness={0.92} roughness={0.3} roughnessMap={metal} envMapIntensity={1.4} />
        </RoundedBox>
        <mesh
          position={[0, 0, 0.042]}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHover(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHover(false)
            document.body.style.cursor = ''
          }}
          onClick={(e) => {
            e.stopPropagation()
            onDownload()
          }}
        >
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial
            ref={mat}
            map={tex}
            emissiveMap={tex}
            emissive="#ffffff"
            emissiveIntensity={0.18}
            roughness={0.72}
            metalness={0}
          />
        </mesh>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------ contact */

/**
 * The closing statement, on a free-standing slab you walk toward rather than a
 * side wall you would pass without turning your head.
 */
function ContactPlate({ palette }) {
  const mat = useRef()
  const tex = useMemo(() => contactTexture(identity, palette.accentInk), [palette.accentInk])
  const { cx } = hallAt(CONTACT_Z)
  // Ahead and to the left as you come in, now that nothing turns your head for
  // you — far enough off the line that you still walk past it, not into it.
  const x = cx - 4.2

  useFrame((state) => {
    if (!mat.current) return
    // A slow breath, so the last room is never quite still.
    mat.current.emissiveIntensity = 0.26 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05
  })

  const W = 4.4
  const H = 2.75

  return (
    <group position={[x, 0, CONTACT_Z]} rotation={[0, 0.26, 0]}>
      {/* the slab */}
      <mesh position={[0, H / 2 + 0.45, -0.09]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.9, H + 1.5, 0.18]} />
        <meshStandardMaterial color={palette.wall} roughness={0.92} metalness={0} envMapIntensity={0.6} />
      </mesh>
      <mesh position={[0, H / 2 + 0.45, 0.005]} raycast={() => null}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial
          ref={mat}
          map={tex}
          emissiveMap={tex}
          emissive="#ffffff"
          emissiveIntensity={0.26}
          roughness={0.7}
          metalness={0}
        />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------- assembled */

export default function Signage({ palette, onDownload }) {
  return (
    <group>
      {/* Every room names itself on both walls, high enough to stay clear of
          the work. The opening no longer repeats the giant name on a wall. */}
      {ROOM_LABELS.flatMap((label) =>
        [-1, 1].map((side) => (
          <WallLabel key={`${label.text}-${side}`} {...label} side={side} palette={palette} />
        ))
      )}
      <EndWall palette={palette} />

      {/* chapter markers along the studio tour */}
      {about.chapters.map((c, i) => (
        <ChapterMarker key={c.id} chapter={c} z={CHAPTER_Z[i]} side={i % 2 === 0 ? -1 : 1} index={i} palette={palette} />
      ))}

      <ResumeSheet palette={palette} onDownload={onDownload} />
      <ContactPlate palette={palette} />
    </group>
  )
}

/** The statement wall you face at the very end of the side gallery. */
function EndWall({ palette }) {
  const tex = useMemo(
    () =>
      labelTexture('Studio Work', {
        sub: studioWork.pieces.length + ' pieces · personal',
        ink: palette.signInk,
        accent: palette.signAccent,
        align: 'center',
      }),
    [palette.signInk, palette.signAccent]
  )
  const { cx } = hallAt(-147)
  return (
    <group position={[cx, 4.05, -147.38]}>
      <mesh position={[0, 0, 0.004]} scale={1.05} raycast={() => null} renderOrder={2}>
        <planeGeometry args={[4.9, 1.225]} />
        <meshBasicMaterial
          map={tex}
          color={palette.cove}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.01]} raycast={() => null} renderOrder={3}>
        <planeGeometry args={[4.9, 1.225]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive="#ffffff"
          emissiveIntensity={0.76}
          transparent
          roughness={0.82}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/**
 * A chapter of the story, on a slim standing marker angled toward whoever is
 * walking in. Hung flat on the side wall it would slide past unread.
 */
function ChapterMarker({ chapter, z, side, index, palette }) {
  const tex = useMemo(
    () =>
      labelTexture(chapter.heading, {
        sub: `Chapter 0${index + 1}`,
        ink: palette.signInk,
        accent: palette.signAccent,
      }),
    [chapter.heading, index, palette.signInk, palette.signAccent]
  )
  const { cx } = hallAt(z)
  const W = 3.2
  const H = 2.5

  return (
    <group position={[cx + side * 3.5, 0, z]} rotation={[0, -side * 0.42, 0]}>
      <mesh position={[0, H / 2 + 0.5, -0.06]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.5, H + 1, 0.12]} />
        <meshStandardMaterial color={palette.wall} roughness={0.93} metalness={0} envMapIntensity={0.6} />
      </mesh>
      <mesh position={[0, H * 0.72, 0.005]} raycast={() => null}>
        <planeGeometry args={[W, W / 4]} />
        <meshStandardMaterial map={tex} transparent roughness={0.85} depthWrite={false} />
      </mesh>
      {/* an accent rule under the heading */}
      <mesh position={[0, H * 0.45, 0.006]} raycast={() => null}>
        <planeGeometry args={[W * 0.9, 0.02]} />
        <meshStandardMaterial color={palette.accent} roughness={0.6} />
      </mesh>
    </group>
  )
}
