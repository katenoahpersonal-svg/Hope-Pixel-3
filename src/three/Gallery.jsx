import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import Panel, { LIFT } from './Panel'
import { focus } from './focus'
import { frame, useStore } from '../state/store'
import { projects, panelPlacement, featured, hallAt } from '../data/content'
import { safeDt, finite } from '../lib/math'

const byId = (id) => projects.find((p) => p.id === id)
const tmp = new THREE.Vector3()

/** Where every panel ends up in world space, derived from the hall profile. */
export function panelLayout() {
  const wall = panelPlacement.map((p, i) => {
    const { cx, hw } = hallAt(p.z)
    const x = cx + p.side * (hw - 0.09)
    const project = byId(p.id)
    return {
      key: `w${i}`,
      index: i,
      project,
      side: p.side,
      scale: p.scale,
      position: [x, 0, p.z],
      rotation: [0, p.side < 0 ? Math.PI / 2 : -Math.PI / 2, 0],
      centre: new THREE.Vector3(x, LIFT + 3.45 * p.scale * 0.5, p.z),
    }
  })

  // The entrance panel sits after the wall panels in the focus index so that
  // -1 can keep meaning "nothing is focused".
  const hero = {
    key: 'featured',
    index: panelPlacement.length,
    project: byId(featured.id),
    side: 1,
    scale: featured.scale,
    position: [featured.x, 0, featured.z],
    rotation: [0, featured.rotY, 0],
    centre: new THREE.Vector3(featured.x, LIFT + 3.45 * featured.scale * 0.5, featured.z),
  }

  return { wall, hero }
}

export default function Gallery({ palette, quality }) {
  const camera = useThree((s) => s.camera)
  const filter = useStore((s) => s.filter)
  const openProject = useStore((s) => s.openProject)
  const layout = useMemo(panelLayout, [])
  const all = useMemo(() => [layout.hero, ...layout.wall], [layout])
  /** Which panel currently holds focus — the incumbent, for the hysteresis below. */
  const held = useRef(-1)

  const dimmedIds = useMemo(() => {
    if (filter === 'All') return new Set()
    return new Set(projects.filter((p) => !p.tags.includes(filter)).map((p) => p.id))
  }, [filter])

  useFrame((_, delta) => {
    const dt = safeDt(delta)
    // Which panel is the visitor closest to? That one owns the focal plane.
    // No allocation in here — it runs every frame.
    let nearest = null
    let bestD = Infinity
    let heldPanel = null
    let heldD = Infinity
    for (const p of all) {
      if (dimmedIds.has(p.project.id)) continue
      const d = camera.position.distanceTo(p.centre)
      if (p.index === held.current) {
        heldPanel = p
        heldD = d
      }
      if (d < bestD) {
        bestD = d
        nearest = p
      }
    }

    /**
     * Hysteresis, and it is not optional.
     *
     * Panels alternate walls, and the camera leans toward whichever is nearest.
     * Halfway between two of them the distances are all but identical, so the
     * winner flipped every frame — and because leaning left puts you closer to
     * the panel on the right, the lean fed the flip. A perfect oscillator: the
     * room shook sixty times a second. A challenger now has to be clearly
     * closer before it takes over.
     */
    if (heldPanel && heldD < 11 && bestD > heldD - 1.4) {
      nearest = heldPanel
      bestD = heldD
    }

    const best = nearest ? nearest.index : -1
    const near = nearest && bestD < 11
    held.current = near ? best : -1
    frame.focus = near ? best : -1
    const amount = near ? THREE.MathUtils.clamp(1 - (bestD - 3) / 7, 0, 1) : 0
    frame.focusAmount = THREE.MathUtils.damp(finite(frame.focusAmount), amount, 5, dt)

    // Ease the focal point rather than snapping it between panels.
    if (near) {
      tmp.copy(nearest.centre)
    } else {
      // Nothing close: focus a comfortable distance down the hall.
      camera.getWorldDirection(tmp).multiplyScalar(13).add(camera.position)
    }
    focus.point.lerp(tmp, 1 - Math.exp(-4.5 * dt))
    focus.distance = camera.position.distanceTo(focus.point)
    focus.lock = frame.focusAmount
  })

  return (
    <group>
      {all.map((p) => (
        <Panel
          key={p.key}
          index={p.index}
          project={p.project}
          position={p.position}
          rotation={p.rotation}
          scale={p.scale}
          quality={quality}
          palette={palette}
          dimmed={dimmedIds.has(p.project.id)}
          onOpen={openProject}
        />
      ))}
    </group>
  )
}
