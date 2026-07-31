import { scrollToT } from './scroll'
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
  scrollToT(zToT(s.z), { duration: 2.2, ...opts })
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
    if (history.state?.study !== id) history.pushState({ study: id }, '', `#${id}`)
    useStore.getState().openProject(id)
  }

  if (!approach) return finish()

  scrollToT(progressForProject(id), { duration: 1.5 })
  // Give the walk a moment, then dolly in.
  clearTimeout(openStudy._timer)
  openStudy._timer = setTimeout(finish, store.open ? 120 : 620)
}

export function closeStudy() {
  clearTimeout(openStudy._timer)
  if (history.state?.study) history.back()
  else {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    useStore.getState().closeProject()
  }
}

/** Keep the store in step with the address bar. */
export function bindHistory() {
  const sync = () => {
    const id = history.state?.study || null
    const store = useStore.getState()
    if (id !== store.open) (id ? store.openProject(id) : store.closeProject())
  }
  window.addEventListener('popstate', sync)
  return () => window.removeEventListener('popstate', sync)
}

/** #bigcommerce in the address bar should open that case study on arrival. */
export function initialStudy() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return isRoutable(hash) ? hash : null
}
