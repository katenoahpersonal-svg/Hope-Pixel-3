import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { panelLayout } from './Gallery'
import { frame, useStore } from '../state/store'
import { hallAt, tToZ, sections } from '../data/content'
import { safeDt, finite } from '../lib/math'
import { scrollProgress, isLocked } from '../lib/scroll'

/**
 * The visitor's body in the space. Scroll walks it down the hall, the pointer
 * orbits it a little, proximity leans it toward whatever panel is nearest, and
 * opening a case study dollies it in.
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

/** 0 outside [from, to], easing to 1 over `fade` units inside each end. */
function smoothWindow(z, from, to, fade) {
  const a = clamp((from - z) / fade, 0, 1)
  const b = clamp((z - to) / fade, 0, 1)
  return Math.min(a, b)
}

export default function Rig({ quality }) {
  const camera = useThree((s) => s.camera)
  const layout = useMemo(panelLayout, [])
  const byIndex = useMemo(
    () => new Map([layout.hero, ...layout.wall].map((p) => [p.index, p])),
    [layout]
  )
  const open = useStore((s) => s.open)
  const setSection = useStore((s) => s.setSection)

  const look = useRef(new THREE.Vector3(0, EYE, -10))
  const pos = useRef(new THREE.Vector3(0, EYE, 14))
  const yaw = useRef(0)
  const pitch = useRef(0)
  const bias = useRef(0)
  const leanPoint = useRef(new THREE.Vector3(0, EYE, -10))
  const hasLean = useRef(false)
  const lastSection = useRef('')

  const openPanel = useMemo(() => {
    if (!open) return null
    // Prefer the wall copy; the entrance panel is only a teaser for the same work.
    return layout.wall.find((p) => p.project.id === open) || (layout.hero.project.id === open ? layout.hero : null)
  }, [open, layout])

  useFrame((state, delta) => {
    const dt = safeDt(delta)
    const t = state.clock.elapsedTime

    const aspect = state.size.width / Math.max(1, state.size.height)
    const wantFov = fovForAspect(aspect)
    if (Math.abs(camera.fov - wantFov) > 0.05) {
      camera.fov = wantFov
      camera.updateProjectionMatrix()
    }
    const portrait = aspect < 1

    // --- scroll easing that reacts to how fast you are scrolling -----------
    frame.t = finite(frame.t)
    frame.mx = finite(frame.mx)
    frame.my = finite(frame.my)
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
    const { cx, hw } = hallAt(z)
    frame.camZ = z

    // --- lean toward whatever panel is nearest ----------------------------
    // Both the sideways bias and the point being looked at are eased rather
    // than set. Even with hysteresis choosing sensibly, handing focus from a
    // panel on one wall to one on the other flips these end to end, and a snap
    // there is a jolt.
    let wantBias = 0
    const p = frame.focus !== -1 ? byIndex.get(frame.focus) : null
    if (p) {
      wantBias = -p.side * frame.focusAmount * (portrait ? 2.1 : 1.55)
      leanPoint.current.lerp(p.centre, 1 - Math.exp(-5 * dt))
      hasLean.current = true
    }
    bias.current = damp(bias.current, wantBias, 4.5, dt)
    const sideBias = bias.current
    const leanTarget = p && hasLean.current ? leanPoint.current : null

    // --- pointer orbit ----------------------------------------------------
    const orbit = quality === 'low' ? 0.35 : 1
    const ox = frame.mx * 0.62 * orbit
    const oy = -frame.my * 0.3 * orbit

    // --- the walking camera ------------------------------------------------
    const wobble = Math.sin(t * 0.31) * 0.018 + Math.sin(t * 0.17 + 1.3) * 0.012
    const wantX = clamp(cx + sideBias + ox, cx - hw + 1.1, cx + hw - 1.1)
    const wantY = EYE + oy + wobble
    pos.current.set(wantX, wantY, z)

    // --- where the eyes go -------------------------------------------------
    const aheadZ = z - 9
    const ahead = hallAt(aheadZ)
    // In the alcove the head turns to take in the pedestals on either side.
    const sweep =
      // the alcove: the head turns to take in the pedestals on either side
      Math.sin((z + 76) * 0.42) * 3.4 * smoothWindow(z, -76, -94, 3) +
      // the quiet room: turn toward the closing statement rather than the bend
      -3.7 * smoothWindow(z, -104, -118, 4)
    // No sweep in the side gallery: you arrive there and look around yourself.
    look.current.set(ahead.cx + sweep, EYE - 0.06, aheadZ)
    if (leanTarget) {
      look.current.lerp(leanTarget, frame.focusAmount * (portrait ? 0.88 : 0.62))
    }

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
    camera.position.lerp(pos.current, 1 - Math.exp(-14 * dt))
    camera.lookAt(look.current)

    // --- turning your head ---------------------------------------------------
    // A drag holds where you put it so you can actually read an engraving, and
    // only recentres once you start walking again. Moving the pointer adds a
    // gentler look on top, so the room responds even without dragging.
    if (!frame.dragging) {
      const recentre = Math.min(6, speed * 55)
      frame.dragYaw = damp(frame.dragYaw, 0, recentre, dt)
      frame.dragPitch = damp(frame.dragPitch, 0, recentre, dt)
    }
    const wantYaw = frame.dragYaw - frame.mx * 0.3 * orbit
    const wantPitch = frame.dragPitch - frame.my * 0.13 * orbit
    yaw.current = damp(yaw.current, wantYaw, 9, dt)
    pitch.current = damp(pitch.current, wantPitch, 9, dt)
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
