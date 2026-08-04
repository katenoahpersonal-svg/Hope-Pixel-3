import { scrollToT, cancelTravel, lockScroll } from './scroll'
import { useStore } from '../state/store'
import { sections, zToT, panelPlacement, featured, projects } from '../data/content'
import { click as clickSound } from './audio'

/** Glide to a room — or, on the flat layout, to the matching block. */
export function goToSection(id, opts = {}) {
  const s = sections.find((x) => x.id === id)
  if (!s) return
  const anchor = document.getElementById(id)
  if (anchor) {
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  scrollToT(zToT(s.z), { duration: 1100, ...opts })
}

/** Where a project's panel hangs, as scroll progress. */
export function progressForProject(id) {
  const wall = panelPlacement.find((p) => p.id === id)
  if (wall) return zToT(wall.z)
  if (featured.id === id) return zToT(featured.z)
  const s = sections.find((x) => x.id === id)
  return zToT(s ? s.z : sections[1].z)
}

/** Dialogs that are not case studies but route the same way. */
export const SHEETS = ['resume', 'about']

export function isRoutable(id) {
  return projects.some((p) => p.id === id) || SHEETS.includes(id)
}

/**
 * Approach, then open. Walking to the panel first is what makes the dolly feel
 * like arriving rather than teleporting.
 */
export function openStudy(id, { approach = true } = {}) {
  if (!isRoutable(id)) return
  const store = useStore.getState()
  clickSound()

  const finish = () => {
    const current = useStore.getState().open
    // Opening another project from inside an existing study should replace the
    // current dialog entry, not build a stack of studies that the Close button
    // then has to walk backwards through.
    if (history.state?.study !== id) {
      const method = current && history.state?.study ? 'replaceState' : 'pushState'
      history[method]({ study: id }, '', `#${id}`)
    }
    useStore.getState().openProject(id)
  }

  if (!approach) return finish()

  scrollToT(progressForProject(id), { duration: 900 })
  // Give the walk a moment, then dolly in.
  clearTimeout(openStudy._timer)
  openStudy._timer = setTimeout(finish, store.open ? 120 : 620)
}

export function closeStudy() {
  clearTimeout(openStudy._timer)
  cancelTravel()

  // Close synchronously and clean the current history entry in place. Calling
  // history.back() here let the browser restore an old scroll position while
  // the dialog effect was simultaneously unlocking the camera — the exact
  // race that could leave the scrollbar moving while the room stayed parked.
  useStore.getState().closeProject()
  lockScroll(false)

  const cleanUrl = window.location.pathname + window.location.search
  if (history.state?.study || window.location.hash) {
    history.replaceState(null, '', cleanUrl)
  }
}

/** Keep the store in step with the address bar. */
export function bindHistory() {
  const previousRestoration = history.scrollRestoration
  history.scrollRestoration = 'manual'

  const sync = () => {
    const id = history.state?.study || null
    const store = useStore.getState()
    if (id !== store.open) (id ? store.openProject(id) : store.closeProject())
    if (!id) lockScroll(false)
  }
  window.addEventListener('popstate', sync)
  return () => {
    window.removeEventListener('popstate', sync)
    history.scrollRestoration = previousRestoration
  }
}

/** #bigcommerce in the address bar should open that case study on arrival. */
export function initialStudy() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return isRoutable(hash) ? hash : null
}
