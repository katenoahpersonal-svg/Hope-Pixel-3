import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { createRoot, extend, events } from '@react-three/fiber'

extend(THREE)

/**
 * A hand-mounted react-three-fiber root instead of <Canvas>.
 *
 * Two reasons. <Canvas> will not create a renderer until a ResizeObserver has
 * reported a size, so a tab that is in the background at load time can end up
 * with a canvas that never starts. And owning the root lets ?drive step the
 * frameloop by hand when there are no animation frames to hook.
 *
 * The tree is rendered ONCE. Calling render again on a manual root remounts
 * everything inside it, so the scene takes its state from the store instead of
 * from props threaded down through here.
 */
export default function Stage({ children, frameloop = 'always', onCreated, onError, ...config }) {
  const canvasRef = useRef(null)

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const root = createRoot(canvas)
    let disposed = false
    let raf = 0

    const size = () => ({
      width: Math.max(1, window.innerWidth),
      height: Math.max(1, window.innerHeight),
      top: 0,
      left: 0,
    })

    const report = (error) => {
      if (disposed) return
      console.error('The 3D studio could not start.', error)
      onError?.(error)
    }

    const configure = (includeCreated = false) =>
      root.configure({
        ...config,
        frameloop,
        events,
        size: size(),
        ...(includeCreated ? { onCreated } : null),
      })

    /**
     * R3F 9's configure() is asynchronous. render() currently queues behind it,
     * but awaiting it explicitly prevents overlapping setup/resize work and,
     * most importantly, gives us somewhere to catch renderer failures.
     */
    const initialize = async () => {
      try {
        await configure(true)
        if (!disposed) root.render(children)
      } catch (error) {
        report(error)
      }
    }
    void initialize()

    const resize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        void configure().catch(report)
      })
    }

    const contextLost = (event) => {
      event.preventDefault()
      report(new Error('The browser lost the WebGL rendering context.'))
    }

    window.addEventListener('resize', resize)
    window.addEventListener('orientationchange', resize)
    canvas.addEventListener('webglcontextlost', contextLost, false)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('orientationchange', resize)
      canvas.removeEventListener('webglcontextlost', contextLost, false)
      root.unmount()
    }
    // Mounted once on purpose — see the note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
}
