import { identity, projects, about, expertise, resume, contact as contactCopy, studioWork } from '../data/content'
import { openStudy } from '../lib/navigate'
import { resumeUrl } from '../lib/download'

/**
 * The fallback that is not a compromise.
 *
 * Shown when the visitor asks for reduced motion, when WebGL is unavailable,
 * or on ?flat=1. Same words, same work, laid out flat and quiet.
 */
export function FlatSite() {
  return (
    <div className="flat">
      <header className="flat__hero" id="home">
        <span className="eyebrow">Portfolio · {new Date().getFullYear()}</span>
        <h1>
          {identity.first}
          <br />
          {identity.last}
        </h1>
        <div className="rule" />
        <p className="meta">{identity.specialties.join(' · ')}</p>
        <p className="flat__lede">{identity.positioning}</p>
        <p style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <a className="btn btn--solid" href="#work">
            See the work
          </a>
          <a className="btn" href={resumeUrl} download>
            Download résumé
          </a>
          <a className="btn" href={`mailto:${identity.email}`}>
            Email
          </a>
        </p>
      </header>

      <section id="work">
        <h2>Selected work</h2>
        <div className="flat__grid">
          {projects.map((p) => (
            <button key={p.id} className="flat__card" onClick={() => openStudy(p.id, { approach: false })}>
              <span className="meta">
                {p.num} · {p.category}
              </span>
              <h3>{p.title}</h3>
              <p>{p.summary}</p>
            </button>
          ))}
        </div>
      </section>

      <section id="about">
        <h2>{about.title}</h2>
        <p className="flat__lede">{about.lede}</p>
        {about.chapters.map((c) => (
          <div key={c.id} style={{ marginTop: '1.8rem' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{c.heading}</h3>
            {c.body.map((b, i) => (
              <p key={i} style={{ color: 'var(--ink-soft)' }}>
                {b}
              </p>
            ))}
          </div>
        ))}
      </section>

      <section id="expertise">
        <h2>Expertise</h2>
        <div className="flat__grid">
          {expertise.map((e) => (
            <div key={e.id} className="flat__card" style={{ cursor: 'default' }}>
              <h3>{e.title}</h3>
              <p>{e.blurb}</p>
              <p className="meta" style={{ marginTop: '0.7rem' }}>
                {e.items.join(' · ')}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="resume">
        <h2>Résumé</h2>
        <p className="flat__lede">{resume.summary}</p>
        <p>
          <a className="btn btn--solid" href={resumeUrl} download>
            Download the PDF
          </a>
        </p>
        <ul className="flat__list">
          {resume.experience.map((job, i) => (
            <li className="flat__job" key={i}>
              <h3>{job.title}</h3>
              <p className="meta">
                {job.org} · {job.meta}
              </p>
              <ul>
                {job.points.map((pt, j) => (
                  <li key={j}>{pt}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <h3 style={{ fontSize: '1.3rem', marginTop: '2rem' }}>Education</h3>
        {resume.education.map((e) => (
          <p key={e.org}>
            <strong>{e.title}</strong> — {e.org}, {e.meta}
          </p>
        ))}
        <h3 style={{ fontSize: '1.3rem', marginTop: '2rem' }}>Leadership &amp; community</h3>
        <ul>
          {resume.service.map((s) => (
            <li key={s.org} style={{ color: 'var(--ink-soft)' }}>
              <strong>{s.org}</strong> ({s.meta}) — {s.note}
            </li>
          ))}
        </ul>
      </section>

      <section id="studio">
        <h2>Studio work</h2>
        <p className="flat__lede">{studioWork.intro}</p>
        <ul>
          {studioWork.pieces.map((p) => (
            <li key={p.id} style={{ color: 'var(--ink-soft)' }}>
              <strong>{p.title}</strong> — {p.meta}
            </li>
          ))}
        </ul>
      </section>

      <section id="contact">
        <h2>{contactCopy.heading}</h2>
        <p className="flat__lede">{contactCopy.body}</p>
        <p style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <a className="btn btn--solid" href={`mailto:${identity.email}`}>
            {identity.email}
          </a>
          <a className="btn" href={identity.linkedin.href} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          <a className="btn" href={identity.studio.href} target="_blank" rel="noopener noreferrer">
            {identity.studio.label}
          </a>
        </p>
        <p className="meta">
          {identity.location} · {identity.availability}
        </p>
      </section>
    </div>
  )
}

/**
 * The same content, for screen readers and crawlers, under the canvas.
 * Text only — the visible controls are the nav, the work index and the panels.
 */
export function SemanticContent() {
  return (
    <main className="sr-only">
      <h1>
        {identity.name} — {identity.role}
      </h1>
      <p>{identity.positioning}</p>
      <p>{identity.intro}</p>

      <h2>Selected work</h2>
      {projects.map((p) => (
        <article key={p.id}>
          <h3>
            {p.num}. {p.title}
          </h3>
          <p>{p.summary}</p>
          <p>
            Role: {p.role}. {p.org}. {p.timeline}.
          </p>
          <h4>The challenge</h4>
          {p.challenge.map((c, i) => (
            <p key={i}>{c}</p>
          ))}
          <h4>What she owned</h4>
          <ul>
            {p.contribution.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          <h4>Results</h4>
          <ul>
            {p.results.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          <p>Tools: {p.tools.join(', ')}.</p>
        </article>
      ))}

      <h2>{about.title}</h2>
      <p>{about.lede}</p>
      {about.chapters.map((c) => (
        <section key={c.id}>
          <h3>{c.heading}</h3>
          {c.body.map((b, i) => (
            <p key={i}>{b}</p>
          ))}
        </section>
      ))}

      <h2>Expertise</h2>
      {expertise.map((e) => (
        <section key={e.id}>
          <h3>{e.title}</h3>
          <p>{e.blurb}</p>
          <p>{e.items.join(', ')}</p>
        </section>
      ))}

      <h2>Résumé</h2>
      <p>{resume.summary}</p>
      {resume.experience.map((job, i) => (
        <section key={i}>
          <h3>
            {job.title} — {job.org}
          </h3>
          <p>{job.meta}</p>
          <ul>
            {job.points.map((pt, j) => (
              <li key={j}>{pt}</li>
            ))}
          </ul>
        </section>
      ))}
      {resume.education.map((e) => (
        <p key={e.org}>
          {e.title} — {e.org}, {e.meta}
        </p>
      ))}

      <h2>Contact</h2>
      <p>
        {identity.email} · {identity.location} · {identity.availability}
      </p>
    </main>
  )
}

export default FlatSite
