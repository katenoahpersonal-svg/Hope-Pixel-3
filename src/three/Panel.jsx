import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { panelArtTexture, brushedMetalMap, shadowBlob } from '../lib/textures'
import { frame, useStore } from '../state/store'
import { safeDt } from '../lib/math'

/**
 * DIMENSION THREE — INTERACTION.
 * A project is a physical object: brushed aluminium frame, a lit face, and a
 * sheet of real glass in front of it. Approaching focuses it, the pointer tilts
 * it toward you and drags a highlight across the glass, and a click opens it.
 */

const BASE_W = 2.75
const BASE_H = 3.45
/** How far the frame is mounted off the floor. */
export const LIFT = 0.55
const { damp } = THREE.MathUtils

export default function Panel({
  project,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  quality,
  palette,
  onOpen,
  index,
  dimmed = false,
}) {
  const group = useRef()
  const inner = useRef()
  const artMat = useRef()
  const glare = useRef()
  const pool = useRef()
  const scrim = useRef()
  const [hovered, setHovered] = useState(false)
  const tilt = useRef({ x: 0, y: 0, gx: 0, gy: 0 })
  const state = useRef({ focus: 0, hover: 0, dim: 0 })

  const camera = useThree((s) => s.camera)
  const open = useStore((s) => s.open)

  const art = useMemo(() => panelArtTexture(project, palette.accentInk), [project, palette.accentInk])
  const metal = useMemo(() => brushedMetalMap(512), [])
  const blob = useMemo(() => shadowBlob(256), [])

  const w = BASE_W * scale
  const h = BASE_H * scale
  const mid = LIFT + h * 0.5
  const worldPos = useMemo(() => new THREE.Vector3(position[0], position[1] + mid, position[2]), [position, mid])

  const glass = quality === 'high'
  const isOpen = open === project.id

  useFrame((_, delta) => {
    const dt = safeDt(delta)
    const g = group.current
    if (!g) return
    const d = camera.position.distanceTo(worldPos)

    // Focus falls off with distance — this is what the depth of field tracks.
    const raw = THREE.MathUtils.clamp(1 - (d - 3.2) / 7.5, 0, 1)
    const focus = raw * raw * (3 - 2 * raw)
    state.current.focus = damp(state.current.focus, focus, 6, dt)
    state.current.hover = damp(state.current.hover, (hovered || isOpen) && !dimmed ? 1 : 0, 9, dt)
    state.current.dim = damp(state.current.dim, dimmed ? 1 : 0, 5, dt)

    const f = state.current.focus * (1 - state.current.dim * 0.85)
    const hv = state.current.hover

    if (scrim.current) {
      scrim.current.material.opacity = state.current.dim * 0.66
      scrim.current.visible = state.current.dim > 0.01
    }

    // Lift and lean toward the visitor.
    const t = tilt.current
    inner.current.rotation.x = damp(inner.current.rotation.x, t.x * hv, 8, dt)
    inner.current.rotation.y = damp(inner.current.rotation.y, t.y * hv, 8, dt)
    inner.current.position.z = damp(inner.current.position.z, 0.03 + hv * 0.16 + f * 0.04, 8, dt)
    inner.current.position.y = damp(inner.current.position.y, mid + hv * 0.07, 8, dt)
    const s = 1 + hv * 0.022
    inner.current.scale.setScalar(damp(inner.current.scale.x, s, 8, dt))

    // The face is a lit display: brighter as you approach, brightest on hover.
    if (artMat.current) {
      artMat.current.emissiveIntensity = damp(artMat.current.emissiveIntensity, 0.22 + f * 0.5 + hv * 0.42, 6, dt)
    }

    // Light catching the glass, dragged by the pointer.
    if (glare.current) {
      glare.current.material.opacity = damp(glare.current.material.opacity, hv * 0.16, 8, dt)
      glare.current.position.x = damp(glare.current.position.x, t.gx * w * 0.42, 6, dt)
      glare.current.position.y = damp(glare.current.position.y, t.gy * h * 0.42, 6, dt)
    }

    // Pool of light the panel throws on the floor.
    if (pool.current) {
      pool.current.material.opacity = damp(pool.current.material.opacity, 0.1 + f * 0.22 + hv * 0.12, 6, dt)
    }
  })

  const onMove = (e) => {
    if (!e.uv || dimmed) return
    tilt.current.x = (e.uv.y - 0.5) * 0.16
    tilt.current.y = (e.uv.x - 0.5) * 0.2
    tilt.current.gx = e.uv.x - 0.5
    tilt.current.gy = e.uv.y - 0.5
  }

  const enter = (e) => {
    e.stopPropagation()
    if (dimmed) return
    setHovered(true)
    frame.hover = index
    document.body.style.cursor = 'pointer'
  }

  const leave = () => {
    setHovered(false)
    if (frame.hover === index) frame.hover = -1
    tilt.current = { x: 0, y: 0, gx: 0, gy: 0 }
    document.body.style.cursor = ''
  }

  return (
    <group ref={group} position={position} rotation={rotation}>
      {/* mounts holding the panel off the wall */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * w * 0.3, mid, -0.11]}>
          <boxGeometry args={[0.05, h * 0.92, 0.16]} />
          <meshStandardMaterial color="#9a958d" metalness={0.9} roughness={0.42} roughnessMap={metal} />
        </mesh>
      ))}

      <group ref={inner} position={[0, mid, 0.03]}>
        {/* frame */}
        <RoundedBox args={[w + 0.16, h + 0.16, 0.12]} radius={0.028} smoothness={4} castShadow>
          <meshStandardMaterial
            color="#b9b4ab"
            metalness={0.94}
            roughness={0.28}
            roughnessMap={metal}
            envMapIntensity={1.5}
          />
        </RoundedBox>

        {/* dark recess behind the face */}
        <mesh position={[0, 0, 0.055]}>
          <planeGeometry args={[w + 0.06, h + 0.06]} />
          <meshStandardMaterial color="#161513" roughness={0.9} metalness={0.1} />
        </mesh>

        {/* the work itself */}
        <mesh
          position={[0, 0, 0.066]}
          onPointerOver={enter}
          onPointerOut={leave}
          onPointerMove={onMove}
          onClick={(e) => {
            e.stopPropagation()
            if (!dimmed) onOpen(project.id)
          }}
        >
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial
            ref={artMat}
            map={art}
            emissiveMap={art}
            emissive="#ffffff"
            emissiveIntensity={0.24}
            roughness={0.62}
            metalness={0}
            toneMapped
          />
        </mesh>

        {/* Glass — reflection and clearcoat rather than `transmission`, which
            makes three re-render the entire scene into a buffer every frame.
            In a dark room the reflections are what read as glass anyway. */}
        <mesh position={[0, 0, 0.078]} raycast={() => null}>
          <planeGeometry args={[w + 0.02, h + 0.02]} />
          <meshPhysicalMaterial
            transparent
            opacity={glass ? 0.2 : 0.13}
            roughness={0.03}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.02}
            specularIntensity={1}
            envMapIntensity={glass ? 2.6 : 1.8}
            color="#ffffff"
            depthWrite={false}
          />
        </mesh>

        {/* filtered out — the panel recedes rather than vanishing */}
        <mesh ref={scrim} position={[0, 0, 0.082]} visible={false} raycast={() => null}>
          <planeGeometry args={[w + 0.02, h + 0.02]} />
          <meshBasicMaterial color={palette.wall} transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* the highlight sliding across the glass */}
        <mesh ref={glare} position={[0, 0, 0.084]} raycast={() => null}>
          <planeGeometry args={[w * 0.55, h * 0.75]} />
          <meshBasicMaterial
            map={blob}
            color={palette.cove}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* light the panel casts down onto the floor */}
      <mesh ref={pool} position={[0, 0.012, 0.55]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[w * 1.5, 2.1]} />
        <meshBasicMaterial
          map={blob}
          color={palette.cove}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
