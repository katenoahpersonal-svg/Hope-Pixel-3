import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { panelLayout } from './Gallery'
import { frame, useStore } from '../state/store'
import { hallAt, tToZ, sections } from '../data/content'
import { safeDt, finite } from '../lib/math'
import { scrollProgress, isLocked } from '../lib/scroll'

/**
 * The visitor's body in the space.
 *
 * Scroll walks it straight down the hall at eye level. Dragging turns the head,
 * and holds where you leave it. Opening a case study dollies it in. That is the
 * whole of it — a walkthrough, not a camera on rails with opinions.
 */

const EYE = 1.62
const { damp, clamp } = THREE.MathUtils

/* Scratch vectors — this runs every frame and must not allocate. */
const normal = new THREE.Vector3()
const viewPos = new THREE.Vector3()

/**
 * Three.js fov is vertical, so a tall phone screen would otherwise show a very
 * narrow slice of the room. Hold the HORIZONTAL angle steady instead and let
 * the vertical one follow the shape of the window.
 */
const H_FOV = THREE.MathUtils.degToRad(66)
function fovForAspect(aspect) {
  const v = 2 * Math.atan(Math.tan(H_FOV / 2) / Math.max(aspect, 0.3))
  return clamp(THREE.MathUtils.radToDeg(v), 40, 72)
}

/** The deepest room whose threshold the visitor has passed. */
function sectionForZ(z) {
  for (let i = sections.length - 1; i >= 0; i--) if (z <= sections[i].enter) return sections[i].id
  return sections[0].id
}

export default function Rig() {
  const camera = useThree((s) => s.camera)
  const layout = useMemo(panelLayout, [])
  const open = useStore((s) => s.open)
  const setSection = useStore((s) => s.setSection)

  const look = useRef(new THREE.Vector3(0, EYE, -10))
  const pos = useRef(new THREE.Vector3(0, EYE, 14))
  const yaw = useRef(0)
  const pitch = useRef(0)
  const lastSection = useRef('')

  const openPanel = useMemo(() => {
    if (!open) return null
    // Prefer the wall copy; the entrance panel is only a teaser for the same work.
    return layout.wall.find((p) => p.project.id === open) || (layout.hero.project.id === open ? layout.hero : null)
  }, [open, layout])

  useFrame((state, delta) => {
    const dt = safeDt(delta)

    const aspect = state.size.width / Math.max(1, state.size.height)
    const wantFov = fovForAspect(aspect)
    if (Math.abs(camera.fov - wantFov) > 0.05) {
      camera.fov = wantFov
      camera.updateProjectionMatrix()
    }

    // --- scroll easing that reacts to how fast you are scrolling -----------
    frame.t = finite(frame.t)
    frame.dragYaw = finite(frame.dragYaw)
    frame.dragPitch = finite(frame.dragPitch)
    frame.focusAmount = finite(frame.focusAmount)

    // Sample the document's scroll position every frame rather than waiting for
    // events — events fire on their own schedule (and not at all in a
    // background tab), and the camera should always know where the page really
    // is. While a case study is open the position is held instead.
    const target = isLocked() ? frame.target : scrollProgress()
    frame.vel = target - frame.target
    frame.target = target

    const speed = Math.abs(frame.vel) * 60
    const lambda = 3.4 + Math.min(7, speed * 26)
    frame.t = clamp(damp(frame.t, target, lambda, dt), 0, 1)

    const z = tToZ(frame.t)
    const { cx } = hallAt(z)
    frame.camZ = z

    /* --- the walk --------------------------------------------------------
     *
     * Dead straight down the centre line, eyes level, facing the way you are
     * going. Nothing here reacts to what is on the walls.
     *
     * There used to be a bob, a sideways lean toward whichever panel was
     * nearest, a mouse parallax and scripted head-turns in the alcove and the
     * quiet room. Individually each was subtle; together they meant the room
     * was never still and never quite went where you pointed it. Walking is
     * walking — looking is the drag, and only the drag.
     */
    pos.current.set(cx, EYE, z)

    const aheadZ = z - 9
    look.current.set(hallAt(aheadZ).cx, EYE, aheadZ)

    // --- dollying into an open case study -----------------------------------
    const wantDolly = open && openPanel ? 1 : 0
    frame.dolly = damp(frame.dolly, wantDolly, wantDolly ? 3.4 : 4.6, dt)

    if (openPanel && frame.dolly > 0.001) {
      const rot = openPanel.rotation[1]
      // Stand off to one side so the case study panel does not cover the work.
      viewPos
        .copy(openPanel.centre)
        .addScaledVector(normal.set(Math.sin(rot), 0, Math.cos(rot)), 3.1)
      viewPos.y -= 0.35
      const k = frame.dolly * frame.dolly * (3 - 2 * frame.dolly)
      pos.current.lerp(viewPos, k)
      look.current.lerp(openPanel.centre, k)
    }

    // If the camera ever picked up a non-finite component it can never ease
    // back on its own — snap it home instead of leaving a blank screen.
    if (!Number.isFinite(camera.position.x + camera.position.y + camera.position.z)) {
      camera.position.copy(pos.current)
    }
    // Set, not eased. The scroll itself is already damped, so a second easing
    // here only made the camera lag the centre line — drifting more than a
    // metre off it through the bend and then sliding back, which is precisely
    // the swimming feeling we are removing.
    camera.position.copy(pos.current)
    camera.lookAt(look.current)

    /* --- turning your head -------------------------------------------------
     *
     * The drag, and nothing else. Where you leave it is where it stays: no
     * spring back to centre, and no drift from where the mouse happens to be
     * hovering. Move the mouse without holding it and the room does not budge.
     */
    yaw.current = damp(yaw.current, frame.dragYaw, 11, dt)
    pitch.current = damp(pitch.current, frame.dragPitch, 11, dt)
    // Applied after lookAt so the walk still aims down the hall underneath.
    camera.rotateY(yaw.current)
    camera.rotateX(pitch.current)

    // --- tell the interface where we are ------------------------------------
    const id = sectionForZ(z)
    if (id !== lastSection.current) {
      lastSection.current = id
      setSection(id)
    }
  })

  return null
}
