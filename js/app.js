// ═══ HOPE ATLAS · one module, no dependencies ═══
// A clickable night sky: starfield canvas, tilt cards, hash-routed card
// dialogs cloned from the archive in index.html, mailto contact form,
// one-page reading mode, local-time color phases, ambient sound.

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(pointer: coarse)').matches;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// Projects, in order — read from the archive so index.html stays the source of truth.
const PROJECTS = $$('.doc-case').map((el) => ({
  id: el.dataset.project,
  accent: el.dataset.accent,
  title: el.querySelector('h3').textContent,
  el,
}));

/* ── Dimension two: TIME · local-hour color phase (?phase=dawn|day|dusk|night) ── */
function applyPhase() {
  const forced = new URLSearchParams(location.search).get('phase');
  const h = new Date().getHours();
  const name = forced || (h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 21 ? 'dusk' : 'night');
  document.body.dataset.phase = name;
  const hh = String(h).padStart(2, '0');
  const mm = String(new Date().getMinutes()).padStart(2, '0');
  const chip = $('#phaseText');
  if (chip) chip.textContent = `${name.toUpperCase()} · ${hh}:${mm} LOCAL`;
}
applyPhase();
setInterval(applyPhase, 60000);

/* ── The sky · 2D canvas starfield with depth parallax and rare comets ── */
(function starfield() {
  const canvas = $('#sky');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const N = TOUCH ? 130 : 240;
  const stars = [];
  let mx = 0, my = 0, smx = 0, smy = 0;
  let comet = null;
  let last = performance.now();

  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  addEventListener('resize', size);

  for (let i = 0; i < N; i++) {
    stars.push({
      x: Math.random(), y: Math.random(),
      z: 0.25 + Math.random() * 0.75,             // depth → parallax + size
      tw: Math.random() * Math.PI * 2,
      ts: 0.4 + Math.random() * 1.6,
      hue: Math.random(),
    });
  }
  addEventListener('pointermove', (e) => {
    mx = (e.clientX / innerWidth) * 2 - 1;
    my = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  function draw(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    smx += (mx - smx) * dt * 3;
    smy += (my - smy) * dt * 3;
    const scroll = scrollY * 0.04;
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.tw += dt * s.ts;
      const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(s.tw));
      const px = ((s.x * W) - smx * 18 * s.z + W) % W;
      const py = ((s.y * H) - smy * 12 * s.z - scroll * s.z + H * 4) % H;
      const r = s.z * 1.5;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, 6.2832);
      ctx.fillStyle = s.hue < 0.7
        ? `rgba(214, 226, 255, ${a * 0.85})`
        : s.hue < 0.88
          ? `rgba(158, 233, 255, ${a * 0.8})`
          : `rgba(255, 186, 226, ${a * 0.8})`;
      ctx.fill();
    }
    // a comet, once in a while
    if (!REDUCED) {
      if (!comet && Math.random() < dt * 0.06) {
        comet = { x: Math.random() * W * 0.7, y: Math.random() * H * 0.3, vx: 340 + Math.random() * 200, vy: 130 + Math.random() * 80, life: 1 };
      }
      if (comet) {
        comet.x += comet.vx * dt; comet.y += comet.vy * dt; comet.life -= dt * 0.65;
        if (comet.life <= 0 || comet.x > W + 80) comet = null;
        else {
          const g = ctx.createLinearGradient(comet.x, comet.y, comet.x - 90, comet.y - 34);
          g.addColorStop(0, `rgba(230, 240, 255, ${0.8 * comet.life})`);
          g.addColorStop(1, 'rgba(230, 240, 255, 0)');
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(comet.x, comet.y);
          ctx.lineTo(comet.x - 90, comet.y - 34);
          ctx.stroke();
        }
      }
    }
  }
  if (REDUCED) {
    draw(performance.now() + 16); // one calm, static sky
  } else {
    (function loop(now) {
      requestAnimationFrame(loop);
      if (!document.hidden) draw(now || performance.now());
    })(performance.now());
  }
})();

/* ── Reveal on scroll ── */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: 0.12 });
$$('.reveal').forEach((el) => io.observe(el));
setTimeout(() => document.body.classList.add('settled'), 1700);

/* ── Dimension three: INTERACTION · card tilt + glare ── */
if (!TOUCH && !REDUCED) {
  $$('.world-card, .studio-card').forEach((card) => {
    const hit = card.querySelector('.wc-hit');
    card.addEventListener('pointermove', (e) => {
      const r = hit.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      hit.style.setProperty('--ry', ((nx - 0.5) * 7).toFixed(2) + 'deg');
      hit.style.setProperty('--rx', ((0.5 - ny) * 6).toFixed(2) + 'deg');
      hit.style.setProperty('--mx', (nx * 100).toFixed(1) + '%');
      hit.style.setProperty('--my', (ny * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', () => {
      hit.style.setProperty('--rx', '0deg');
      hit.style.setProperty('--ry', '0deg');
    });
  });
}

/* ── Magnetic chrome ── */
if (!TOUCH && !REDUCED) {
  let magEl = null;
  addEventListener('pointermove', (e) => {
    const m = e.target.closest?.('.magnetic');
    if (m !== magEl) { magEl?.style.setProperty('transform', ''); magEl = m; }
    if (m) {
      const r = m.getBoundingClientRect();
      m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.22}px)`;
      m.style.transition = 'transform 0.12s ease-out';
    }
  }, { passive: true });
  addEventListener('pointerout', () => { if (magEl) { magEl.style.transform = ''; magEl = null; } }, { passive: true });
}

/* ── Custom cursor ── */
(function cursor() {
  if (TOUCH) return;
  document.body.classList.add('no-cursor');
  const wrap = $('#cursor'), dot = $('#cursorDot'), ring = $('#cursorRing'), tag = $('#cursorTag');
  const trail = [];
  if (!REDUCED) {
    for (let i = 0; i < 7; i++) {
      const el = document.createElement('div');
      el.className = 'cursor-trail';
      el.style.opacity = String(0.4 - i * 0.05);
      wrap.appendChild(el);
      trail.push({ el, x: innerWidth / 2, y: innerHeight / 2 });
    }
  }
  let tx = innerWidth / 2, ty = innerHeight / 2;
  let dx = tx, dy = ty, rx = tx, ry = ty;
  addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    const m = e.target.closest?.('button, a, input, select, textarea, .wc-hit');
    wrap.classList.toggle('hot', !!m);
    tag.textContent = e.target.closest?.('.wc-hit') ? 'open' : '';
  }, { passive: true });
  let lastT = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    const k = Math.min(1, dt * 26), k2 = Math.min(1, dt * 12);
    dx += (tx - dx) * k; dy += (ty - dy) * k;
    rx += (tx - rx) * k2; ry += (ty - ry) * k2;
    dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    let px = dx, py = dy;
    for (const t of trail) {
      t.x += (px - t.x) * Math.min(1, dt * 9);
      t.y += (py - t.y) * Math.min(1, dt * 9);
      t.el.style.transform = `translate(${t.x}px, ${t.y}px) translate(-50%,-50%)`;
      px = t.x; py = t.y;
    }
  })(performance.now());
})();

/* ── Focus containment for dialogs ── */
function trapFocus(container) {
  function handler(e) {
    if (e.key !== 'Tab') return;
    const els = [...container.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')]
      .filter((el) => el.offsetParent !== null);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }
  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}

/* ── Dialog machinery · everything opens to a card ── */
function makeDialog(overlay) {
  const inner = overlay.querySelector('.case-inner');
  const panel = overlay.querySelector('.case-panel');
  let lastFocus = null, untrap = null, openKey = null;
  function open(key, html, accent) {
    const wasOpen = !overlay.hidden;
    if (wasOpen && key === openKey) return; // already showing this card
    if (!wasOpen) lastFocus = document.activeElement;
    panel.style.setProperty('--accent', accent || '#8b7bff');
    inner.innerHTML = html;
    inner.scrollTop = 0;
    openKey = key;
    if (wasOpen) return;
    overlay.hidden = false;
    void overlay.offsetHeight;
    overlay.classList.add('open');
    document.body.classList.add('locked');
    untrap = trapFocus(overlay);
    overlay.querySelector('.case-close').focus();
  }
  function close() {
    if (overlay.hidden) return;
    overlay.classList.remove('open');
    document.body.classList.remove('locked');
    untrap?.(); untrap = null;
    openKey = null;
    setTimeout(() => { overlay.hidden = true; }, 480);
    lastFocus?.focus?.();
  }
  return { overlay, inner, open, close, isOpen: () => !overlay.hidden, key: () => openKey };
}
const caseDlg = makeDialog($('#caseOverlay'));
const panelDlg = makeDialog($('#panelOverlay'));

function caseHTML(p) {
  const doc = p.el;
  const idx = PROJECTS.indexOf(p);
  const prev = PROJECTS[(idx - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(idx + 1) % PROJECTS.length];
  return `
    <p class="case-eyebrow">${doc.querySelector('.dc-eyebrow').textContent}</p>
    <h2 class="case-title" id="caseTitle">${p.title}</h2>
    <p class="case-tag">${doc.querySelector('.dc-tag').textContent}</p>
    <div class="case-art art-${p.id}" aria-hidden="true"></div>
    ${doc.querySelector('.dc-meta').outerHTML}
    <div class="dc-overview">${doc.querySelector('.dc-overview').innerHTML}</div>
    ${[...doc.querySelectorAll('.dc-sec')].map((s) => `<section class="${s.className}">${s.innerHTML}</section>`).join('')}
    <div class="case-nav">
      <button data-jump="${prev.id}">← ${prev.title}</button>
      <button class="case-index" data-close-dialog>All work</button>
      <button data-jump="${next.id}">${next.title} →</button>
    </div>`;
}
function panelHTML(name) {
  if (name === 'about') {
    const src = $('#doc-about');
    return `
      <p class="case-eyebrow">The maker</p>
      <h2 class="case-title" id="panelTitle">About Kate</h2>
      ${[...src.querySelectorAll(':scope > p')].map((p) => p.outerHTML).join('')}
      ${src.querySelector('.doc-xp').outerHTML}`;
  }
  const src = name === 'capabilities' ? $('#doc-capabilities') : $('#doc-process');
  const body = name === 'capabilities' ? src.querySelector('.cap-groups').outerHTML : src.querySelector('.proc-steps').outerHTML;
  return `
    <p class="case-eyebrow">${name === 'capabilities' ? 'What Kate does' : 'How it gets made'}</p>
    <h2 class="case-title" id="panelTitle">${src.querySelector('.doc-sec-title').textContent}</h2>
    ${src.querySelector('.doc-sec-lede')?.outerHTML ?? ''}
    ${body}`;
}

/* ── Hash router · Back button, Escape and deep links all behave ── */
const PANELS = ['about', 'capabilities', 'process'];
// Each dialog entry carries its own distance from the dialog-free page in
// history.state, so ✕ / Escape can unwind exactly that far — no counter to go
// stale when the visitor presses Back themselves. Back still steps card by card.
const depthOf = () => history.state?.haDepth ?? 0;
function applyHash() {
  const h = location.hash.replace(/^#\/?/, '');
  if (h.startsWith('w/')) {
    const p = PROJECTS.find((x) => x.id === h.slice(2));
    panelDlg.close();
    if (p) caseDlg.open(p.id, caseHTML(p), p.accent);
    else caseDlg.close();
  } else if (PANELS.includes(h)) {
    caseDlg.close();
    panelDlg.open(h, panelHTML(h), { about: '#8b7bff', capabilities: '#6ee7ff', process: '#ff7ac3' }[h]);
  } else {
    caseDlg.close();
    panelDlg.close();
  }
}
addEventListener('popstate', applyHash);
addEventListener('hashchange', applyHash);
const router = {
  go(hash) {
    if (location.hash === '#' + hash) return; // same card: no-op, no history entry
    history.pushState({ haDepth: depthOf() + 1 }, '', '#' + hash);
    applyHash(); // pushState fires neither hashchange nor popstate
  },
  close() {
    const d = depthOf();
    if (d > 0) history.go(-d);                    // unwind every card we opened
    else if (location.hash) {                     // arrived by deep link
      history.replaceState(null, '', location.pathname + location.search);
      applyHash();
    } else applyHash();
  },
};

// clicks: cases, panels, jumps, closes, scrolls — one delegated listener
document.addEventListener('click', (e) => {
  const c = e.target.closest?.('[data-case]');
  if (c) { router.go('w/' + c.dataset.case); return; }
  const d = e.target.closest?.('[data-dialog]');
  if (d && !d.classList.contains('menu-link')) { router.go(d.dataset.dialog); return; }
  const j = e.target.closest?.('[data-jump]');
  if (j) { router.go('w/' + j.dataset.jump); return; }
  if (e.target.closest?.('[data-close-dialog]') || e.target.closest?.('[data-close]')) { router.close(); return; }
  const s = e.target.closest?.('[data-scroll]');
  if (s && !s.classList.contains('menu-link')) {
    e.preventDefault();
    const t = s.dataset.scroll === 'top' ? document.body : $('#' + s.dataset.scroll);
    t?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  }
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (caseDlg.isOpen() || panelDlg.isOpen())) { router.close(); return; }
  if (caseDlg.isOpen() && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const cur = PROJECTS.findIndex((p) => p.id === caseDlg.key());
    if (cur < 0) return;
    const d = e.key === 'ArrowRight' ? 1 : -1;
    router.go('w/' + PROJECTS[(cur + d + PROJECTS.length) % PROJECTS.length].id);
  }
});

/* ── Menu ── */
(function menu() {
  const overlay = $('#menuOverlay');
  const toggle = $('#menuToggle');
  let untrap = null;
  function open() {
    overlay.hidden = false;
    void overlay.offsetHeight;
    overlay.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('locked');
    untrap = trapFocus(overlay);
    overlay.querySelector('.menu-link').focus();
  }
  function close() {
    if (overlay.hidden) return;
    overlay.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('locked');
    untrap?.(); untrap = null;
    setTimeout(() => { overlay.hidden = true; }, 400);
  }
  toggle.addEventListener('click', () => (overlay.hidden ? open() : close()));
  overlay.querySelector('[data-menu-close]').addEventListener('click', close);
  overlay.querySelectorAll('.menu-link[data-scroll]').forEach((b) =>
    b.addEventListener('click', () => {
      close();
      const t = b.dataset.scroll === 'top' ? document.body : $('#' + b.dataset.scroll);
      setTimeout(() => t?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }), 60);
    }));
  overlay.querySelectorAll('.menu-link[data-dialog]').forEach((b) =>
    b.addEventListener('click', () => { close(); router.go(b.dataset.dialog); }));
  addEventListener('keydown', (e) => { if (!overlay.hidden && e.key === 'Escape') close(); });
})();

/* ── Contact form · mailto compose + visible confirmation ── */
function mountContactForms() {
  const tpl = $('#tplContactForm');
  $$('[data-form-mount]').forEach((mount) => {
    if (mount.dataset.mounted) return;
    mount.dataset.mounted = '1';
    mount.appendChild(tpl.content.cloneNode(true));
    const form = mount.querySelector('.contact-form');
    const done = mount.querySelector('.cf-done');
    const err = form.querySelector('.cf-error');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form).entries());
      const missing = [];
      if (!d.name?.trim()) missing.push('your name');
      if (!d.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) missing.push('a valid email');
      if (!d.message?.trim()) missing.push('a message');
      if (missing.length) {
        err.textContent = `Almost there — the signal still needs ${missing.join(', ')}.`;
        err.hidden = false;
        form.querySelector(missing[0] === 'your name' ? '[name="name"]' : missing[0] === 'a valid email' ? '[name="email"]' : '[name="message"]').focus();
        return;
      }
      err.hidden = true;
      const subject = `Project inquiry — ${d.type} (${d.name})`;
      const body = [
        `Name: ${d.name}`, `Email: ${d.email}`, `Project type: ${d.type}`,
        `Budget: ${d.budget}`, `Timeline: ${d.timeline}`, '', d.message,
      ].join('\n');
      location.href = `mailto:katenoah.personal@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      form.hidden = true;
      done.hidden = false;
      done.focus();
    });
    mount.querySelector('.cf-again').addEventListener('click', () => {
      done.hidden = true;
      form.hidden = false;
      form.querySelector('[name="name"]').focus();
    });
  });
}
mountContactForms();

/* ── Dimension five: PERSONALIZATION · one-page reading mode ── */
const archive = $('#docArchive');
function enterLite() {
  document.body.classList.add('lite');
  archive.hidden = false;
  mountContactForms(); // the archive's form mount is live now
  localStorage.setItem('ha-lite', '1');
  const q = new URLSearchParams(location.search);
  q.set('lite', '1');
  history.replaceState(null, '', location.pathname + '?' + q.toString());
  scrollTo(0, 0);
}
function leaveLite() {
  document.body.classList.remove('lite');
  archive.hidden = true;
  localStorage.removeItem('ha-lite');
  const q = new URLSearchParams(location.search);
  q.delete('lite');
  const qs = q.toString();
  history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  scrollTo(0, 0);
}
document.addEventListener('click', (e) => {
  if (e.target.closest?.('[data-action="lite"]')) { e.preventDefault(); enterLite(); }
  else if (e.target.closest?.('[data-action="unlite"]')) { e.preventDefault(); leaveLite(); }
});
if (new URLSearchParams(location.search).has('lite') || localStorage.getItem('ha-lite') === '1') enterLite();

/* ── Dimension four: SOUND · synthesized ambient, no assets ── */
class Ambient {
  constructor() { this.ctx = null; this.on = false; }
  _build() {
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = this.master = ctx.createGain();
    master.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 750; filter.Q.value = 0.6;
    const delay = ctx.createDelay(2); delay.delayTime.value = 0.46;
    const fb = ctx.createGain(); fb.gain.value = 0.34;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    delay.connect(fb); fb.connect(delay);
    filter.connect(delay); delay.connect(wet);
    filter.connect(master); wet.connect(master);
    master.connect(ctx.destination);
    // A2 · E3 · B3 · D4 — an open, hopeful cluster
    [110, 164.81, 246.94, 293.66].forEach((f, i) => {
      for (const det of [-2.4, 2.4]) {
        const o = ctx.createOscillator();
        o.type = i % 2 ? 'triangle' : 'sine';
        o.frequency.value = f; o.detune.value = det;
        const og = ctx.createGain(); og.gain.value = 0.028;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.04 + i * 0.023;
        const lg = ctx.createGain(); lg.gain.value = 0.016;
        lfo.connect(lg); lg.connect(og.gain);
        o.connect(og); og.connect(filter);
        o.start(); lfo.start();
      }
    });
    const flfo = ctx.createOscillator(); flfo.frequency.value = 0.05;
    const flg = ctx.createGain(); flg.gain.value = 320;
    flfo.connect(flg); flg.connect(filter.frequency); flfo.start();
  }
  toggle() {
    if (!this.ctx) this._build();
    this.on = !this.on;
    this.ctx.resume();
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(this.on ? 0.5 : 0, now + 1.4);
    return this.on;
  }
}
const ambient = new Ambient();
$('#soundToggle').addEventListener('click', (e) => {
  const on = ambient.toggle();
  e.currentTarget.setAttribute('aria-pressed', String(on));
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) ambient.ctx?.suspend?.(); else if (ambient.on) ambient.ctx?.resume?.();
});

// deep links (#w/…, #about …) on arrival
if (location.hash) applyHash();
