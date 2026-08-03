import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import {
  heroTypeTexture,
  labelTexture,
  documentTexture,
  contactTexture,
  sharedBrushedMetal,
} from '../lib/textures'
import { identity, about, resume, studioWork, hallAt, CHAPTER_Z, CONTACT_Z } from '../data/content'
import { frame } from '../state/store'
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

/* --------------------------------------------------------- hero type */

function HeroType({ palette }) {
  const ref = useRef()
  const tex = useMemo(
    () =>
      heroTypeTexture({
        first: identity.first,
        last: identity.last,
        accent: palette.signAccent,
        ink: palette.signInk,
      }),
    [palette.signAccent, palette.signInk]
  )

  useFrame((state, delta) => {
    const dt = safeDt(delta)
    if (!ref.current) return
    // Narrow windows get smaller, centred type — at seven metres wide it would
    // otherwise run off both sides of a phone. No pointer parallax: the room
    // holds still now, and the title with it.
    const portrait = state.size.width < state.size.height
    ref.current.scale.setScalar(damp(ref.current.scale.x, portrait ? 0.62 : 1, 4, dt))
    ref.current.position.x = damp(ref.current.position.x, portrait ? 0 : -2.1, 3, dt)
  })

  return (
    // Set left of the walkway and lifted, so the corridor keeps its vanishing
    // point and you can see straight down the hall past the title.
    <group ref={ref} position={[-2.1, 4.15, 3]}>
      <mesh raycast={() => null}>
        <planeGeometry args={[7.2, 2.67]} />
        <meshStandardMaterial
          map={tex}
          transparent
          roughness={0.55}
          metalness={0.05}
          emissiveMap={tex}
          emissive="#ffffff"
          emissiveIntensity={palette.dark ? 0.5 : 0.12}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------- wall lettering */

function WallLabel({ text, sub, z, side, y = 3.5, width = 4.6, palette }) {
  const tex = useMemo(
    () => labelTexture(text, { sub, ink: palette.signInk, accent: palette.signAccent }),
    [text, sub, palette.signInk, palette.signAccent]
  )
  const spot = useMemo(() => wallSpot(z, side, 0.05), [z, side])
  return (
    <mesh position={[spot.position[0], y, spot.position[2]]} rotation={spot.rotation} raycast={() => null}>
      <planeGeometry args={[width, width / 4]} />
      <meshStandardMaterial map={tex} transparent roughness={0.8} metalness={0} depthWrite={false} />
    </mesh>
  )
}

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
      <HeroType palette={palette} />

      <WallLabel text="Main Gallery" sub="Selected work" z={-4} side={-1} palette={palette} />
      <WallLabel text="Studio Tour" sub="About" z={-58} side={1} palette={palette} />
      <WallLabel text="The Alcove" sub="Expertise" z={-77} side={-1} y={4.2} width={5.2} palette={palette} />
      <WallLabel text="Records" sub="Résumé" z={-95} side={1} palette={palette} />
      <WallLabel text="The Quiet Room" sub="Contact" z={-103} side={-1} palette={palette} />
      <WallLabel text="Studio Work" sub="Side gallery" z={-124} side={1} palette={palette} />
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
    <mesh position={[cx, 2.7, -147.4]} raycast={() => null}>
      <planeGeometry args={[5, 1.25]} />
      <meshStandardMaterial map={tex} transparent roughness={0.85} depthWrite={false} />
    </mesh>
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
