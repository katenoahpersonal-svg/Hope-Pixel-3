import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import Loader from './ui/Loader'
import Nav from './ui/Nav'
import Overlays, { DepthRail } from './ui/Overlays'
import CaseStudy from './ui/CaseStudy'
import { FlatSite, SemanticContent } from './ui/FlatSite'
import { frame, useStore, SCROLL_SCREENS, detectQuality } from './state/store'
import { initScroll, scrollToT } from './lib/scroll'
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

  const flat = useMemo(() => {
    if (params.get('flat') === '1') return true
    if (params.get('flat') === '0') return false
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return reduce || !webglAvailable()
  }, [])

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

    const move = (e) => {
      frame.mx = (e.clientX / window.innerWidth) * 2 - 1
      frame.my = (e.clientY / window.innerHeight) * 2 - 1
    }
    const leave = () => {
      frame.mx = 0
      frame.my = 0
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerleave', leave)

    return () => {
      unbind()
      window.removeEventListener('pointermove', move)
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
    setProgress(55)
    const watchdog = setTimeout(() => {
      setProgress(100)
      setReady()
    }, 6000)
    return () => clearTimeout(watchdog)
  }, [flat, setProgress, setReady])

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
            <Studio onCreated={() => setProgress(65)} />
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
