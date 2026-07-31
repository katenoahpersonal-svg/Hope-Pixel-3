import { useState } from 'react'
import { useStore } from '../state/store'
import { sections, identity } from '../data/content'
import { goToSection } from '../lib/navigate'
import { PHASES, formatHour, currentHour } from '../lib/palette'
import { setEnabled, tick } from '../lib/audio'
import Magnetic from './Magnetic'
import { resumeUrl } from '../lib/download'

export default function Nav() {
  const section = useStore((s) => s.section)
  const sound = useStore((s) => s.sound)
  const toggleSound = useStore((s) => s.toggleSound)
  const palette = useStore((s) => s.palette)
  const hour = useStore((s) => s.hour)
  const autoTime = useStore((s) => s.autoTime)
  const setHour = useStore((s) => s.setHour)
  const [menu, setMenu] = useState(false)

  const go = (id) => {
    tick()
    setMenu(false)
    goToSection(id)
  }

  /** Cycle the daylight by hand, then hand it back to the visitor's clock. */
  const cycleTime = () => {
    tick()
    if (autoTime) return setHour(PHASES[0].hour, true)
    const i = PHASES.findIndex((p) => p.id === palette.id)
    if (i >= PHASES.length - 1) {
      useStore.setState({ autoTime: true })
      setHour(currentHour(''))
    } else {
      setHour(PHASES[i + 1].hour, true)
    }
  }

  const onSound = () => {
    const next = !sound
    const ok = setEnabled(next)
    if (ok) toggleSound()
    if (next) setTimeout(tick, 260)
  }

  return (
    <>
      <nav className="nav" aria-label="Primary">
        <button className="nav__brand" onClick={() => go('home')}>
          <span className="nav__mark">KN</span>
          <span className="nav__name">{identity.name}</span>
        </button>

        <div className="nav__links" role="list">
          {sections.map((s) => (
            <button
              key={s.id}
              className="nav__link"
              aria-current={section === s.id}
              onClick={() => go(s.id)}
            >
              {s.nav}
            </button>
          ))}
        </div>

        <div className="nav__tools">
          <button
            className="chip"
            onClick={cycleTime}
            title={autoTime ? 'Daylight follows your local time — click to set it by hand' : 'Click to change the light'}
          >
            <span className="chip__dot" />
            <span>
              {palette.label}
              {autoTime ? ` · ${formatHour(hour)}` : ''}
            </span>
          </button>

          <button className="chip" data-on={sound} onClick={onSound} aria-pressed={sound}>
            <span className="chip__dot" />
            <span>{sound ? 'Sound on' : 'Sound'}</span>
          </button>

          <Magnetic
            as="a"
            className="btn btn--sm btn--ghost"
            href={resumeUrl}
            download
            onClick={tick}
          >
            Résumé
          </Magnetic>

          <button className="chip nav__menu" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
            <span>{menu ? 'Close' : 'Menu'}</span>
          </button>
        </div>
      </nav>

      <div className="sheet" data-show={menu} aria-hidden={!menu}>
        <ul>
          {sections.map((s) => (
            <li key={s.id}>
              <button onClick={() => go(s.id)} tabIndex={menu ? 0 : -1}>
                {s.nav}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
