import { useMemo, useState } from 'react'
import { frame, useStore } from '../state/store'
import {
  identity,
  sections,
  projects,
  filters,
  panelPlacement,
  featured,
  about,
  CHAPTER_Z,
  expertise,
  resume,
  contact as contactCopy,
  studioWork,
} from '../data/content'
import { goToSection, openStudy } from '../lib/navigate'
import { tick } from '../lib/audio'
import useFrameValue from './useFrameValue'
import Magnetic from './Magnetic'
import { resumeUrl } from '../lib/download'

const DEBUG = new URLSearchParams(window.location.search).has('debug')

/* --------------------------------------------------------- depth rail */

export function DepthRail() {
  const section = useStore((s) => s.section)
  return (
    <div className="rail" aria-hidden="true">
      {sections.map((s) => (
        <button
          key={s.id}
          className="rail__item"
          aria-current={section === s.id}
          onClick={() => {
            tick()
            goToSection(s.id)
          }}
          tabIndex={-1}
        >
          <span className="rail__label">{s.nav}</span>
          <span className="rail__tick" />
        </button>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- home */

function Home({ show }) {
  return (
    <>
      <div className="home panelfade" data-show={show}>
        <span className="eyebrow">Portfolio · {new Date().getFullYear()}</span>
        <h2 className="home__title">{identity.positioning}</h2>
        <ul className="home__spec">
          {identity.specialties.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <div className="home__cta">
          <Magnetic className="btn btn--solid" onClick={() => { tick(); goToSection('work') }}>
            Walk the gallery
          </Magnetic>
          <Magnetic className="btn btn--ghost" onClick={() => { tick(); goToSection('contact') }}>
            Get in touch
          </Magnetic>
        </div>
      </div>

      <div className="scrollhint panelfade" data-show={show} aria-hidden="true">
        <span className="scrollhint__line" />
        <span>Scroll</span>
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- work */

function Work({ show }) {
  const filter = useStore((s) => s.filter)
  const setFilter = useStore((s) => s.setFilter)
  const focusIdx = useFrameValue(() => frame.focus, -1, show)

  const focusedId =
    focusIdx === -1 ? null : focusIdx >= panelPlacement.length ? featured.id : panelPlacement[focusIdx]?.id
  const focused = projects.find((p) => p.id === focusedId) || projects[0]
  const visible = useMemo(
    () => (filter === 'All' ? projects : projects.filter((p) => p.tags.includes(filter))),
    [filter]
  )

  return (
    <>
      <div className="work panelfade" data-show={show}>
        <div className="caption">
          <div className="caption__row">
            <span className="caption__num">{focused.num}</span>
            <span className="meta">{focused.category}</span>
          </div>
          <h2 className="caption__title">{focused.title}</h2>
          <p className="caption__sum">{focused.summary}</p>
          <Magnetic className="btn btn--solid btn--sm" onClick={() => openStudy(focused.id)}>
            Open case study
          </Magnetic>
        </div>

        <div className="filters" role="group" aria-label="Filter work">
          {filters.map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              onClick={() => {
                tick()
                setFilter(f)
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="index panelfade" data-show={show}>
        {projects.map((p, i) => (
          <button
            key={p.id}
            className="index__item"
            data-dim={filter !== 'All' && !p.tags.includes(filter)}
            aria-current={p.id === focusedId}
            onClick={() => openStudy(p.id)}
          >
            <span>{p.title}</span>
            <span className="index__n">{p.num}</span>
          </button>
        ))}
        <span className="sr-only">{visible.length} projects match the current filter</span>
      </div>
    </>
  )
}

/* --------------------------------------------------------------- about */

function About({ show }) {
  // Each chapter has a depth in the hall; whichever you are nearest is the one
  // you read.
  const z = useFrameValue(() => Math.round(frame.camZ), 0, show)
  const active = useMemo(() => {
    let best = 0
    let bestD = Infinity
    CHAPTER_Z.forEach((cz, i) => {
      const d = Math.abs(z - cz)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    return best
  }, [z])

  const chapter = about.chapters[active]

  return (
    <div className="column panelfade" data-show={show}>
      <span className="eyebrow">Studio tour · 0{active + 1} of 0{about.chapters.length}</span>
      <h2>{chapter.heading}</h2>
      {chapter.body.slice(0, 2).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <Magnetic className="btn btn--sm" onClick={() => openStudy('about', { approach: false })}>
        Read the whole story
      </Magnetic>
    </div>
  )
}

/* ----------------------------------------------------------- expertise */

function Expertise({ show }) {
  const z = useFrameValue(() => Math.round(frame.camZ), 0, show)
  const pair = z > -82.5 ? 0 : z > -86.5 ? 1 : 2

  return (
    <div className="column panelfade" data-show={show}>
      <span className="eyebrow">The alcove</span>
      <h2>Expertise</h2>
      <p>Six disciplines, each one something I actually produce rather than brief someone else to make.</p>
      <div className="grid6">
        {expertise.map((e, i) => (
          <div key={e.id} className="disc" data-active={Math.floor(i / 2) === pair}>
            <h3>{e.title}</h3>
            <p>{e.blurb}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- résumé */

function Resume({ show }) {
  return (
    <div className="column panelfade" data-show={show}>
      <span className="eyebrow">Records</span>
      <h2>Résumé</h2>
      <p>{resume.summary}</p>
      <div className="kv">
        <div className="kv__row">
          <span className="kv__k">Now</span>
          <span className="kv__v">Ecommerce Lead · {resume.experience[0].org}</span>
        </div>
        <div className="kv__row">
          <span className="kv__k">Studio</span>
          <span className="kv__v">Hope in Print — owner since 2023</span>
        </div>
        <div className="kv__row">
          <span className="kv__k">Education</span>
          <span className="kv__v">{resume.education[0].title}</span>
        </div>
      </div>
      <div className="links">
        <Magnetic className="btn btn--solid btn--sm" as="a" href={resumeUrl} download onClick={tick}>
          Download PDF
        </Magnetic>
        <Magnetic className="btn btn--sm" onClick={() => openStudy('resume', { approach: false })}>
          Full experience
        </Magnetic>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- contact */

function Contact({ show }) {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', subject: contactCopy.subjects[0], message: '' })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(`${form.subject} — portfolio enquiry`)
    const body = encodeURIComponent(
      `${form.message}\n\n— ${form.name}${form.email ? `\n${form.email}` : ''}`
    )
    window.location.href = `mailto:${identity.email}?subject=${subject}&body=${body}`
    setSent(true)
    tick()
  }

  return (
    <div className="column column--left panelfade" data-show={show}>
      <span className="eyebrow">The quiet room</span>
      <h2>{contactCopy.heading}</h2>
      <p style={{ fontSize: '0.84rem' }}>{contactCopy.body}</p>

      <form className="form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="c-name">Name</label>
          <input id="c-name" required value={form.name} onChange={set('name')} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="c-email">Email</label>
          <input id="c-email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="c-subject">About</label>
          <select id="c-subject" value={form.subject} onChange={set('subject')}>
            {contactCopy.subjects.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="c-message">Message</label>
          <textarea id="c-message" required value={form.message} onChange={set('message')} rows={3} />
        </div>
        <Magnetic className="btn btn--solid btn--sm" type="submit">
          Send
        </Magnetic>
      </form>

      {sent && (
        <div className="form__sent" role="status">
          Your email app should be open with the message ready. If it did not open, write to{' '}
          <a href={`mailto:${identity.email}`}>{identity.email}</a>.
        </div>
      )}

      <div className="links">
        <a className="btn btn--sm" href={`mailto:${identity.email}`}>
          Email
        </a>
        <a className="btn btn--sm" href={identity.linkedin.href} target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
        <a className="btn btn--sm" href={identity.studio.href} target="_blank" rel="noopener noreferrer">
          Hope in Print
        </a>
      </div>
      <p className="meta" style={{ marginTop: '0.9rem' }}>
        {identity.location} · {identity.availability}
      </p>
    </div>
  )
}

/* --------------------------------------------------------- studio work */

function Studio({ show }) {
  return (
    <div className="column panelfade" data-show={show}>
      <span className="eyebrow">Side gallery</span>
      <h2>Studio Work</h2>
      <p>{studioWork.intro}</p>
      <hr className="hair" />
      <div className="kv">
        {studioWork.pieces.map((p) => (
          <div className="kv__row" key={p.id}>
            <span className="kv__k">{p.meta}</span>
            <span className="kv__v">{p.title}</span>
          </div>
        ))}
      </div>
      <Magnetic className="btn btn--sm" onClick={() => { tick(); goToSection('contact') }}>
        Back to contact
      </Magnetic>
    </div>
  )
}

/* ------------------------------------------------------------ assembled */

/**
 * `?debug` — a live readout of what the scene is actually doing. Frames should
 * be climbing and fps should be a real number; if frames is stuck the render
 * loop has stopped, which is a different problem from a slow one.
 */
function Debug() {
  const stats = useFrameValue(
    () => `${window.__frames || 0}f · ${window.__fps ?? '–'}fps · z${Math.round(frame.camZ)} · ${useStore.getState().quality}`,
    '',
    DEBUG
  )
  if (!DEBUG) return null
  return (
    <div className="debug" role="status">
      {stats}
    </div>
  )
}

export default function Overlays() {
  const section = useStore((s) => s.section)
  const open = useStore((s) => s.open)
  const hidden = !!open

  return (
    <>
      <Debug />
      <Home show={section === 'home' && !hidden} />
      <Work show={section === 'work' && !hidden} />
      <About show={section === 'about' && !hidden} />
      <Expertise show={section === 'expertise' && !hidden} />
      <Resume show={section === 'resume' && !hidden} />
      <Contact show={section === 'contact' && !hidden} />
      <Studio show={section === 'studio' && !hidden} />
    </>
  )
}
