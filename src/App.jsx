import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import Loader from './ui/Loader'
import Nav from './ui/Nav'
import Overlays, { DepthRail } from './ui/Overlays'
import CaseStudy from './ui/CaseStudy'
import { FlatSite, SemanticContent } from './ui/FlatSite'
import { frame, useStore, SCROLL_SCREENS, detectQuality } from './state/store'
import { initScroll, scrollToT, cancelTravel } from './lib/scroll'
import { bindHistory, initialStudy, openStudy } from './lib/navigate'
import { currentHour } from './lib/palette'
import { projects } from './data/content'

const params = new URLSearchParams(window.location.search)

/** three.js and the gallery only load for visitors who will actually see it. */
const Studio = lazy(() => import('./three/Studio'))

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'))
  } catch {
    return false
  }
}

export default function App() {
  const quality = useStore((s) => s.quality)
  const palette = useStore((s) => s.palette)
  const setProgress = useStore((s) => s.setProgress)
  const setReady = useStore((s) => s.setReady)
  const ready = useStore((s) => s.ready)
  const setHour = useStore((s) => s.setHour)

  const [fontsReady, setFontsReady] = useState(false)
  const [studioFailed, setStudioFailed] = useState(false)

  const hardwareFlat = useMemo(() => {
    if (params.get('flat') === '1') return true
    if (params.get('flat') === '0') return false
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return reduce || !webglAvailable()
  }, [])
  const flat = hardwareFlat || studioFailed

  const handleStudioError = useCallback(
    (error) => {
      console.error('Switching to the lightweight portfolio after a 3D error.', error)
      setStudioFailed(true)
      setProgress(100)
      setReady()
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
    },
    [setProgress, setReady]
  )

  /* --- theme the interface to match the light in the room ---------------- */
  useEffect(() => {
    document.documentElement.dataset.dark = String(!!palette.dark)
    document.documentElement.style.setProperty('--accent', palette.accent)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', palette.bg)
  }, [palette])

  /* --- the clock keeps moving -------------------------------------------- */
  useEffect(() => {
    const id = setInterval(() => {
      if (useStore.getState().autoTime) setHour(currentHour(''))
    }, 60000)
    return () => clearInterval(id)
  }, [setHour])

  /* --- settle the quality tier now the viewport is real ------------------- */
  useEffect(() => {
    const q = detectQuality()
    if (q !== useStore.getState().quality) useStore.getState().setQuality(q)
  }, [])

  /* --- fonts must be loaded before any text is drawn into a canvas -------- */
  useEffect(() => {
    let cancelled = false
    const done = () => {
      if (cancelled) return
      setFontsReady(true)
      setProgress(35)
    }
    if (document.fonts?.ready) {
      document.fonts.ready.then(done)
      // Never let a slow font host hold the gallery hostage.
      setTimeout(done, 2500)
    } else done()
    setProgress(12)
    return () => {
      cancelled = true
    }
  }, [setProgress])

  /* --- scroll, history, pointer ------------------------------------------ */
  useEffect(() => {
    if (flat) return
    initScroll()
    const unbind = bindHistory()

    /* Drag anywhere on the room to turn and look — at a panel on the wall, at
       the engraving on a pedestal. Held, not sprung: it only recentres once you
       start walking again (see the rig). Touch is excluded because a drag there
       is how you scroll. */
    let last = null

    const move = (e) => {
      frame.mx = (e.clientX / window.innerWidth) * 2 - 1
      frame.my = (e.clientY / window.innerHeight) * 2 - 1
      if (!last) return
      const clamp = (v, r) => Math.max(-r, Math.min(r, v))
      frame.dragYaw = clamp(frame.dragYaw - (e.clientX - last.x) * 0.0026, 1.15)
      frame.dragPitch = clamp(frame.dragPitch - (e.clientY - last.y) * 0.0018, 0.42)
      last = { x: e.clientX, y: e.clientY }
    }

    const down = (e) => {
      if (e.button !== 0 || e.pointerType === 'touch') return
      // Only the room turns; the interface and the case study keep their clicks.
      if (e.target instanceof Element && e.target.closest('.chrome, .study, .scrim')) return
      last = { x: e.clientX, y: e.clientY }
      frame.dragging = true
      document.body.classList.add('is-turning')
    }

    const up = () => {
      last = null
      frame.dragging = false
      document.body.classList.remove('is-turning')
    }

    const leave = () => {
      frame.mx = 0
      frame.my = 0
      up()
    }

    /* The wheel always walks the hall.
       These reading panels cover a third of the screen, so the cursor sits over
       one most of the time. Left alone, a panel with more content than height
       swallows the gesture and the room simply stops — which reads as the site
       freezing, not as a scroll landing somewhere else. The case study dialog is
       excluded: there the page is locked and the dialog is what should scroll. */
    const wheel = (e) => {
      if (!(e.target instanceof Element)) return
      if (e.target.closest('.study')) return
      // Touching the wheel abandons any nav journey in progress — the visitor
      // has taken the controls back.
      cancelTravel()
      if (!e.target.closest('.column, .caption, .index')) return
      e.preventDefault()
      window.scrollBy(0, e.deltaY)
    }
    window.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('touchstart', cancelTravel, { passive: true })

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('pointerleave', leave)

    return () => {
      unbind()
      window.removeEventListener('wheel', wheel)
      window.removeEventListener('touchstart', cancelTravel)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('pointerleave', leave)
    }
  }, [flat])

  /* --- deep links --------------------------------------------------------- */
  useEffect(() => {
    if (!ready) return
    const id = initialStudy()
    if (id) setTimeout(() => openStudy(id, { approach: !flat }), 260)
  }, [ready, flat])

  /* --- the loader must always retire -------------------------------------- */
  useEffect(() => {
    if (flat) {
      setProgress(100)
      setReady()
      return
    }
    if (ready) return

    setProgress(55)
    const watchdog = setTimeout(() => {
      handleStudioError(new Error('The 3D studio did not produce a usable frame in time.'))
    }, 10000)
    return () => clearTimeout(watchdog)
  }, [flat, ready, setProgress, setReady, handleStudioError])

  /* --- keyboard: 1-8 open a case study, Home/End jump --------------------- */
  useEffect(() => {
    if (flat) return
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (/^[1-8]$/.test(e.key)) {
        openStudy(projects[Number(e.key) - 1].id)
      } else if (e.key === 'Home') {
        scrollToT(0)
      } else if (e.key === 'End') {
        scrollToT(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flat])

  if (flat) {
    return (
      <>
        <Nav />
        <FlatSite />
        <CaseStudy />
      </>
    )
  }

  return (
    <>
      <Loader />

      <div className="stage">
        {fontsReady && (
          <Suspense fallback={null}>
            <Studio onCreated={() => setProgress(65)} onError={handleStudioError} />
          </Suspense>
        )}
      </div>

      <div className="chrome">
        <Nav />
        <DepthRail />
        <Overlays />
      </div>

      <CaseStudy />
      <SemanticContent />

      {/* the height that scrolling the hall actually consumes */}
      <div className="spacer" style={{ height: `${SCROLL_SCREENS * 100}vh` }} aria-hidden="true" />
    </>
  )
}
