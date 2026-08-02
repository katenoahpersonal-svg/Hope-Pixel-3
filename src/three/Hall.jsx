import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { MeshReflectorMaterial } from '@react-three/drei'
import { hallAt, Z_START, Z_FAR } from '../data/content'
import { grainMap } from '../lib/textures'

/**
 * DIMENSION ONE — SPACE.
 * The gallery is not a set of boxes; it is one continuous volume generated
 * from the hall profile. Widen the profile and a room opens, shift its centre
 * and the hall bends. Floor, walls and ceiling are each a single mesh.
 */

const FROM = Z_START + 8
const TO = Z_FAR
/** Fine enough that the flares into the wider rooms have no visible facets. */
const STEP = 0.5

function sampleSpine() {
  const pts = []
  for (let z = FROM; z >= TO; z -= STEP) pts.push({ z, ...hallAt(z) })
  return pts
}

/** Build one quad strip from paired edge points, with baked AO in vertex colours. */
function strip(edgeA, edgeB, normalFor, uvFor, aoFor) {
  const n = edgeA.length
  const position = new Float32Array(n * 2 * 3)
  const normal = new Float32Array(n * 2 * 3)
  const uv = new Float32Array(n * 2 * 2)
  const color = new Float32Array(n * 2 * 3)
  const index = []

  for (let i = 0; i < n; i++) {
    for (let s = 0; s < 2; s++) {
      const p = s === 0 ? edgeA[i] : edgeB[i]
      const vi = (i * 2 + s) * 3
      position[vi] = p[0]
      position[vi + 1] = p[1]
      position[vi + 2] = p[2]
      const nrm = normalFor(i, s)
      normal[vi] = nrm[0]
      normal[vi + 1] = nrm[1]
      normal[vi + 2] = nrm[2]
      const ao = aoFor(i, s)
      color[vi] = color[vi + 1] = color[vi + 2] = ao
      const t = uvFor(i, s)
      uv[(i * 2 + s) * 2] = t[0]
      uv[(i * 2 + s) * 2 + 1] = t[1]
    }
    if (i < n - 1) {
      const a = i * 2
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(position, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.BufferAttribute(color, 3))
  g.setIndex(index)
  g.computeBoundingSphere()
  return g
}

function buildGeometry() {
  const spine = sampleSpine()
  const n = spine.length

  // Running distance along the hall, so textures do not stretch on the bends.
  const run = [0]
  for (let i = 1; i < n; i++) {
    const a = spine[i - 1]
    const b = spine[i]
    run.push(run[i - 1] + Math.hypot(b.z - a.z, b.cx - a.cx))
  }

  const leftX = spine.map((s) => s.cx - s.hw)
  const rightX = spine.map((s) => s.cx + s.hw)

  /**
   * Wall normals follow the bend rather than assuming a straight corridor —
   * but are then forced to face the centre line.
   *
   * Deriving them purely from the tangent is only right while the tangent
   * points the way you assumed. Anywhere that flips, the normal points out
   * through the back of the wall, and the surface goes completely black no
   * matter how much light is in the room. Checking against the centre keeps the
   * bend-accurate normal and removes the whole failure mode.
   */
  const wallNormal = (i, sign) => {
    const a = spine[Math.max(0, i - 1)]
    const b = spine[Math.min(n - 1, i + 1)]
    const xs = sign < 0 ? leftX : rightX
    const xa = xs[Math.max(0, i - 1)]
    const xb = xs[Math.min(n - 1, i + 1)]
    const t = new THREE.Vector3(xb - xa, 0, b.z - a.z).normalize()
    const up = new THREE.Vector3(0, 1, 0)
    const nrm = new THREE.Vector3().crossVectors(t, up)
    // Point it inward: from this wall toward the hall's centre line.
    if (nrm.x * (spine[i].cx - xs[i]) < 0) nrm.negate()
    return [nrm.x, nrm.y, nrm.z]
  }

  const TEX = 3.2 // world units per texture tile

  // ---- walls -------------------------------------------------------------
  const wall = (sign) => {
    const xs = sign < 0 ? leftX : rightX
    const bottom = spine.map((s, i) => [xs[i], 0, s.z])
    const top = spine.map((s, i) => [xs[i], s.h, s.z])
    return strip(
      bottom,
      top,
      (i) => wallNormal(i, sign),
      (i, s) => [run[i] / TEX, (s === 0 ? 0 : spine[i].h) / TEX],
      (i, s) => {
        const h = spine[i].h
        const y = s === 0 ? 0 : h
        // dark where the wall meets floor and ceiling
        const floorAO = 1 - 0.4 * Math.exp(-y / 0.9)
        const ceilAO = 1 - 0.2 * Math.exp(-(h - y) / 1.1)
        // narrow stretches feel a little closer and darker
        const tight = 1 - 0.1 * Math.max(0, (9 - spine[i].hw) / 9)
        return floorAO * ceilAO * tight
      }
    )
  }

  // ---- floor -------------------------------------------------------------
  const floor = strip(
    spine.map((s, i) => [leftX[i], 0, s.z]),
    spine.map((s, i) => [rightX[i], 0, s.z]),
    () => [0, 1, 0],
    (i, s) => [run[i] / TEX, (s === 0 ? 0 : spine[i].hw * 2) / TEX],
    () => 1
  )

  // A separate AO decal strip sits just above the floor so the reflective
  // material underneath stays clean.
  const floorAO = strip(
    spine.map((s, i) => [leftX[i], 0.002, s.z]),
    spine.map((s, i) => [rightX[i], 0.002, s.z]),
    () => [0, 1, 0],
    (i, s) => [run[i] / TEX, s],
    () => 1
  )

  // ---- ceiling -----------------------------------------------------------
  const ceiling = strip(
    spine.map((s, i) => [leftX[i], s.h, s.z]),
    spine.map((s, i) => [rightX[i], s.h, s.z]),
    () => [0, -1, 0],
    (i, s) => [run[i] / TEX, (s === 0 ? 0 : spine[i].hw * 2) / TEX],
    (i, s) => 0.78 - 0.06 * (1 - s)
  )

  // ---- the cove: a light slot down the centre of the ceiling --------------
  const cove = strip(
    spine.map((s) => [s.cx - 0.7, s.h - 0.06, s.z]),
    spine.map((s) => [s.cx + 0.7, s.h - 0.06, s.z]),
    () => [0, -1, 0],
    (i, s) => [run[i] / 6, s],
    () => 1
  )

  // ---- end caps ----------------------------------------------------------
  const capGeo = (idx, dir) => {
    const s = spine[idx]
    const g = new THREE.PlaneGeometry(s.hw * 2, s.h)
    g.translate(0, s.h / 2, 0)
    g.rotateY(dir > 0 ? 0 : Math.PI)
    g.translate(s.cx, 0, s.z)
    return g
  }

  return {
    left: wall(-1),
    right: wall(1),
    floor,
    floorAO,
    ceiling,
    cove,
    capBack: capGeo(0, -1),
    capFar: capGeo(spine.length - 1, 1),
    spine,
  }
}

export default function Hall({ palette, quality }) {
  const geo = useMemo(buildGeometry, [])
  const grain = useMemo(() => grainMap(512, 0.2, 2), [])
  const floorGrain = useMemo(() => grainMap(512, 0.12, 3), [])
  const coveRef = useRef()

  // Down a 150-metre hall every pixel of the cove converges on the vanishing
  // point, so the strip itself is kept below full white.
  const coveColor = useMemo(
    () => new THREE.Color(palette.cove).multiplyScalar(palette.dark ? 0.85 : 0.5),
    [palette.cove, palette.dark]
  )


  const wallColor = palette.wall
  const floorColor = palette.floor
  const reflective = quality === 'high'

  return (
    <group>
      {/* walls */}
      <mesh geometry={geo.left} receiveShadow>
        <meshStandardMaterial
          color={wallColor}
          vertexColors
          roughness={0.94}
          metalness={0}
          roughnessMap={grain}
          side={THREE.DoubleSide}
          envMapIntensity={0.5}
        />
      </mesh>
      <mesh geometry={geo.right} receiveShadow>
        <meshStandardMaterial
          color={wallColor}
          vertexColors
          roughness={0.94}
          metalness={0}
          roughnessMap={grain}
          side={THREE.DoubleSide}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* floor */}
      <mesh geometry={geo.floor} receiveShadow>
        {reflective ? (
          <MeshReflectorMaterial
            color={floorColor}
            resolution={256}
            mixBlur={1.5}
            mixStrength={1.4}
            blur={[260, 90]}
            depthScale={1.2}
            minDepthThreshold={0.3}
            maxDepthThreshold={1.4}
            mirror={0.28}
            roughness={0.68}
            metalness={0.14}
            roughnessMap={floorGrain}
          />
        ) : (
          <meshStandardMaterial
            color={floorColor}
            vertexColors
            roughness={0.5}
            metalness={0.14}
            roughnessMap={floorGrain}
            envMapIntensity={0.85}
          />
        )}
      </mesh>

      {/* a soft wash of grime the reflective floor cannot bake in for itself */}
      <mesh geometry={geo.floorAO} renderOrder={1} raycast={() => null}>
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={reflective ? 0.1 : 0.07}
          depthWrite={false}
          alphaMap={grain}
        />
      </mesh>

      {/* ceiling */}
      <mesh geometry={geo.ceiling}>
        <meshStandardMaterial
          color={wallColor}
          vertexColors
          roughness={0.98}
          metalness={0}
          side={THREE.DoubleSide}
          envMapIntensity={0.3}
        />
      </mesh>

      {/* the light slot — this is what bloom picks up */}
      <mesh geometry={geo.cove} ref={coveRef}>
        <meshBasicMaterial color={coveColor} side={THREE.DoubleSide} />
      </mesh>

      {/* end caps so the hall reads as an interior, not a tunnel */}
      <mesh geometry={geo.capBack}>
        <meshStandardMaterial color={wallColor} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* The wall you face on arrival in the side gallery. */}
      <mesh geometry={geo.capFar}>
        <meshStandardMaterial color={wallColor} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
