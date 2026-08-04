import { useEffect, useRef } from 'react'
import { useStore } from '../state/store'
import { projects, about, resume, identity } from '../data/content'
import { closeStudy, openStudy } from '../lib/navigate'
import { tick } from '../lib/audio'
import { lockScroll } from '../lib/scroll'
import Magnetic from './Magnetic'
import { resumeUrl } from '../lib/download'

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

function ProjectBody({ p }) {
  const next = projects[(projects.indexOf(p) + 1) % projects.length]
  return (
    <>
      <span className="study__num">{p.num}</span>
      <h1>{p.title}</h1>
      <p className="study__sum">{p.summary}</p>

      <h2>At a glance</h2>
      <div className="kv">
        <div className="kv__row">
          <span className="kv__k">Role</span>
          <span className="kv__v">{p.role}</span>
        </div>
        <div className="kv__row">
          <span className="kv__k">Where</span>
          <span className="kv__v">{p.org}</span>
        </div>
        <div className="kv__row">
          <span className="kv__k">Timeline</span>
          <span className="kv__v">{p.timeline}</span>
        </div>
        <div className="kv__row">
          <span className="kv__k">Discipline</span>
          <span className="kv__v">{p.tags.join(' · ')}</span>
        </div>
      </div>

      <h2>The challenge</h2>
      {p.challenge.map((c, i) => (
        <p key={i}>{c}</p>
      ))}

      <h2>What I owned</h2>
      <ul>
        {p.contribution.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>

      <h2>Process</h2>
      <ol>
        {p.process.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ol>

      <h2>Decisions, and why</h2>
      {p.decisions.map((d, i) => (
        <div className="decision" key={i}>
          <h3>{d.q}</h3>
          <p>{d.a}</p>
        </div>
      ))}

      <h2>Results</h2>
      <ul>
        {p.results.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>

      <h2>Looking back</h2>
      <p>{p.reflection}</p>

      <h2>Tools</h2>
      <div className="tags">
        {p.tools.map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </div>

      <div className="study__foot">
        <Magnetic className="btn btn--solid btn--sm" onClick={() => openStudy(next.id)}>
          Next — {next.title}
        </Magnetic>
        <Magnetic className="btn btn--sm" as="a" href={resumeUrl} download>
          Download résumé
        </Magnetic>
      </div>
    </>
  )
}

function AboutBody() {
  return (
    <>
      <span className="study__num">·</span>
      <h1>{about.title}</h1>
      <p className="study__sum">{about.lede}</p>
      {about.chapters.map((c) => (
        <section key={c.id}>
          <h2>{c.heading}</h2>
          {c.body.map((b, i) => (
            <p key={i}>{b}</p>
          ))}
        </section>
      ))}
      <div className="study__foot">
        <Magnetic className="btn btn--solid btn--sm" onClick={() => openStudy('resume', { approach: false })}>
          See the résumé
        </Magnetic>
      </div>
    </>
  )
}

function ResumeBody() {
  return (
    <>
      <span className="study__num">·</span>
      <h1>{identity.name}</h1>
      <p className="study__sum">{resume.summary}</p>

      <h2>Experience</h2>
      {resume.experience.map((job, i) => (
        <section key={i}>
          <h3>{job.title}</h3>
          <p className="meta">
            {job.org} · {job.meta}
          </p>
          <ul>
            {job.points.map((pt, j) => (
              <li key={j}>{pt}</li>
            ))}
          </ul>
        </section>
      ))}

      <h2>Capabilities</h2>
      {resume.capabilities.map((c) => (
        <div className="decision" key={c.label}>
          <h3>{c.label}</h3>
          <p>{c.value}</p>
        </div>
      ))}

      <h2>Education</h2>
      {resume.education.map((e) => (
        <p key={e.org}>
          <strong>{e.title}</strong> — {e.org}, {e.meta}
        </p>
      ))}

      <h2>Leadership & community</h2>
      <ul>
        {resume.service.map((s) => (
          <li key={s.org}>
            <strong>{s.org}</strong> ({s.meta}) — {s.note}
          </li>
        ))}
      </ul>

      <div className="study__foot">
        <Magnetic className="btn btn--solid btn--sm" as="a" href={resumeUrl} download>
          Download the PDF
        </Magnetic>
        <a className="btn btn--sm" href={`mailto:${identity.email}`}>
          {identity.email}
        </a>
      </div>
    </>
  )
}

export default function CaseStudy() {
  const open = useStore((s) => s.open)
  const ref = useRef(null)
  const restore = useRef(null)
  const project = projects.find((p) => p.id === open)

  useEffect(() => {
    lockScroll(!!open)
    if (!open) return

    restore.current = document.activeElement
    const node = ref.current
    node.scrollTop = 0
    // Move focus into the dialog once it has slid in.
    const t = setTimeout(() => node.querySelector(FOCUSABLE)?.focus(), 120)

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        tick()
        closeStudy()
        return
      }
      if (e.key !== 'Tab') return
      const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      if (restore.current instanceof HTMLElement) restore.current.focus({ preventScroll: true })
    }
  }, [open])

  const title = project ? project.title : open === 'about' ? 'About' : 'Résumé'

  return (
    <>
      <div className="scrim" data-show={!!open} onClick={closeStudy} aria-hidden="true" />
      <div
        className="study"
        data-show={!!open}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        inert={!open}
      >
        <button className="btn btn--sm btn--ghost study__close" onClick={() => { tick(); closeStudy() }}>
          Close ✕
        </button>
        <div className="study__inner">
          {project ? <ProjectBody p={project} /> : open === 'about' ? <AboutBody /> : open === 'resume' ? <ResumeBody /> : null}
        </div>
      </div>
    </>
  )
}
