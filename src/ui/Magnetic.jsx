import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * A button that leans toward the cursor in three dimensions — the interface
 * behaving like the objects in the room.
 */
export default function Magnetic({ as: Tag = 'button', strength = 0.32, tilt = 9, children, ...props }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const x = gsap.quickTo(el, 'x', { duration: 0.55, ease: 'power3.out' })
    const y = gsap.quickTo(el, 'y', { duration: 0.55, ease: 'power3.out' })
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.55, ease: 'power3.out' })
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.55, ease: 'power3.out' })

    const move = (e) => {
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      x(dx * r.width * strength * 0.5)
      y(dy * r.height * strength * 0.5)
      ry(dx * tilt)
      rx(-dy * tilt)
    }
    const reset = () => {
      x(0)
      y(0)
      rx(0)
      ry(0)
    }

    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', reset)
    el.addEventListener('blur', reset)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', reset)
      el.removeEventListener('blur', reset)
      gsap.killTweensOf(el)
    }
  }, [strength, tilt])

  return (
    <Tag ref={ref} {...props}>
      {children}
    </Tag>
  )
}
