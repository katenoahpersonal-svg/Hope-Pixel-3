(() => {
  'use strict';

  const content = window.ATELIER_CONTENT;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const body = document.body;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFile = location.protocol === 'file:';
  const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || window.innerWidth < 700;

  const state = {
    chapter: null,
    sound: false,
    motion: !prefersReduced,
    openProject: null,
    audioContext: null,
    ambientNodes: [],
    lastFocused: null
  };

  const chapters = [
    { id: 'threshold', number: '01', name: 'Threshold', accent: '#9d78ff' },
    { id: 'work', number: '02', name: 'Project Constellation', accent: '#9d78ff' },
    { id: 'archive', number: '03', name: 'Archive', accent: '#7eefff' },
    { id: 'about', number: '04', name: 'Inner Studio', accent: '#ffacd8' },
    { id: 'capabilities', number: '05', name: 'Material Library', accent: '#b4a5ff' },
    { id: 'process', number: '06', name: 'Process Engine', accent: '#76eaff' },
    { id: 'contact', number: '07', name: 'Open Door', accent: '#ffb3d8' }
  ];

  const projectTerritories = $('#project-territories');
  const archiveList = $('#archive-list');
  const archiveFilters = $('#archive-filters');
  const studioArtifacts = $('#studio-artifacts');
  const capabilityLibrary = $('#capability-library');
  const processEngine = $('#process-engine');
  const indexList = $('#project-index-list');
  const projectDialog = $('#project-dialog');
  const projectContent = $('#project-content');
  const indexDialog = $('#index-dialog');
  const artifactDialog = $('#artifact-dialog');
  const artifactContent = $('#artifact-content');
  const status = $('#screen-reader-status');
  const veil = $('.atmospheric-veil');

  function visualMarkup(type) {
    const map = {
      press: '<i class="paper-sheet"></i><i class="paper-sheet"></i><i class="paper-sheet"></i><i class="paper-line"></i><i class="paper-line"></i>',
      commerce: '<i class="commerce-column"></i><i class="commerce-column"></i><i class="commerce-column"></i><i class="commerce-column"></i><i class="commerce-column"></i><i class="commerce-track"></i>',
      signal: '<i class="signal-node"></i><i class="signal-node"></i><i class="signal-node"></i><i class="signal-node"></i><i class="signal-path"></i>',
      paper: '<i class="paper-sheet"></i><i class="paper-sheet"></i><i class="paper-sheet"></i><i class="fold-line"></i>',
      interface: '<i class="browser-frame"></i><i class="browser-frame"></i><i class="component-cube"></i>',
      memory: '<i class="memory-card"></i><i class="memory-card"></i><i class="memory-card"></i><i class="memory-line"></i>'
    };
    return map[type] || '';
  }

  function renderProjects() {
    projectTerritories.innerHTML = content.projects.map(project => `
      <button class="project-territory reveal" type="button" data-project="${project.slug}" data-cursor="View" style="--project-accent:${project.palette[0]}">
        <span class="project-world world-${project.visual}" aria-hidden="true">${visualMarkup(project.visual)}</span>
        <span class="project-meta">
          <span class="project-number">${project.number}</span>
          <span><h3>${project.title}</h3><p>${project.category}</p></span>
          <span class="project-arrow" aria-hidden="true">↗</span>
        </span>
        <span class="sr-only">Open ${project.title} case study</span>
      </button>
    `).join('');

    $$('.project-territory').forEach(card => {
      card.addEventListener('click', () => openProject(card.dataset.project, true));
      card.addEventListener('mouseenter', () => muteOtherProjects(card));
      card.addEventListener('mouseleave', clearProjectMute);
      card.addEventListener('focus', () => muteOtherProjects(card));
      card.addEventListener('blur', clearProjectMute);
    });
  }

  function muteOtherProjects(active) {
    $$('.project-territory').forEach(card => card.classList.toggle('is-muted', card !== active));
  }

  function clearProjectMute() {
    $$('.project-territory').forEach(card => card.classList.remove('is-muted'));
  }

  function renderArchive() {
    const filters = ['All', 'Web', 'Ecommerce', 'UI/UX', 'Branding', 'Print', 'Marketing', 'Video', 'Motion'];
    archiveFilters.innerHTML = filters.map((filter, i) => `<button class="filter-button" type="button" data-filter="${filter}" aria-pressed="${i === 0}">${filter}</button>`).join('');
    archiveList.innerHTML = content.projects.map(project => `
      <button class="archive-entry reveal" type="button" data-project="${project.slug}" data-disciplines="${project.disciplines.join('|')}" data-cursor="Open">
        <span class="archive-preview" style="--preview:${project.palette[0]}" aria-hidden="true"></span>
        <span><small class="project-number">${project.number}</small><h3>${project.title}</h3></span>
        <p>${project.summary}</p>
        <span class="archive-role">${project.role}<br>${project.tools.slice(0, 2).join(' · ')}</span>
        <span class="archive-arrow" aria-hidden="true">↗</span>
      </button>
    `).join('');

    $$('.filter-button').forEach(button => button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      $$('.filter-button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      $$('.archive-entry').forEach(entry => {
        const matches = filter === 'All' || entry.dataset.disciplines.split('|').some(item => item.toLowerCase().includes(filter.toLowerCase()));
        entry.hidden = !matches;
      });
      status.textContent = filter === 'All' ? 'Showing all projects.' : `Showing ${filter} projects.`;
      tone(420, .04);
    }));

    $$('.archive-entry').forEach(entry => entry.addEventListener('click', () => openProject(entry.dataset.project, true)));
  }

  function renderArtifacts() {
    studioArtifacts.innerHTML = content.artifacts.map((artifact, i) => `
      <button class="artifact-button" type="button" data-artifact="${i}" data-cursor="Open">
        <small>${artifact.label}</small><strong>${artifact.title}</strong>
      </button>
    `).join('');
    $$('.artifact-button').forEach(button => button.addEventListener('click', () => openArtifact(Number(button.dataset.artifact))));
  }

  function renderCapabilities() {
    capabilityLibrary.innerHTML = content.capabilities.map(cap => `
      <article class="capability-drawer reveal" id="cap-${cap.id}">
        <button class="capability-trigger" type="button" aria-expanded="false" aria-controls="detail-${cap.id}" data-cursor="Open">
          <span class="drawer-number">${cap.number} · ${cap.material}</span>
          <h3>${cap.title}</h3>
          <p>${cap.experience}</p>
          <span class="drawer-open" aria-hidden="true">+</span>
        </button>
        <div class="capability-details" id="detail-${cap.id}">
          <div class="capability-details-grid">
            <div><h4>Practical outcomes</h4><p>${cap.outcomes}</p></div>
            <div><h4>Connected projects</h4><p>${cap.projects.join(' · ')}</p></div>
          </div>
          <div class="skill-cloud">${cap.skills.map(skill => `<span>${skill}</span>`).join('')}</div>
        </div>
      </article>
    `).join('');

    $$('.capability-trigger').forEach(trigger => trigger.addEventListener('click', () => {
      const drawer = trigger.closest('.capability-drawer');
      const opening = !drawer.classList.contains('is-open');
      drawer.classList.toggle('is-open', opening);
      trigger.setAttribute('aria-expanded', String(opening));
      trigger.querySelector('.drawer-open').textContent = opening ? '×' : '+';
      tone(opening ? 360 : 260, .035);
    }));
  }

  function renderProcess() {
    processEngine.innerHTML = content.process.map(stage => `
      <article class="process-stage reveal">
        <button class="process-trigger" type="button" aria-expanded="false" data-cursor="Open">
          <span>${stage.number}</span><h3>${stage.title}</h3><span class="process-plus" aria-hidden="true">+</span>
        </button>
        <div class="process-detail">
          <p>${stage.summary}</p>
          <div class="process-detail-grid">
            <div><h4>Questions answered</h4><ul>${stage.questions.map(item => `<li>${item}</li>`).join('')}</ul></div>
            <div><h4>Possible deliverables</h4><ul>${stage.deliverables.map(item => `<li>${item}</li>`).join('')}</ul></div>
          </div>
        </div>
      </article>
    `).join('');

    $$('.process-trigger').forEach(trigger => trigger.addEventListener('click', () => {
      const stage = trigger.closest('.process-stage');
      const opening = !stage.classList.contains('is-open');
      $$('.process-stage').forEach(item => {
        item.classList.remove('is-open');
        item.querySelector('.process-trigger').setAttribute('aria-expanded', 'false');
      });
      if (opening) {
        stage.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
      tone(opening ? 520 : 280, .04);
    }));
  }

  function renderIndex() {
    indexList.innerHTML = content.projects.map(project => `
      <button class="index-project" type="button" data-project="${project.slug}" data-cursor="Open">
        <span class="project-number">${project.number}</span>
        <h3>${project.title}</h3>
        <p>${project.category}</p>
        <span aria-hidden="true">↗</span>
      </button>
    `).join('');
    $$('.index-project').forEach(item => item.addEventListener('click', () => {
      indexDialog.close();
      openProject(item.dataset.project, true);
    }));
  }

  function projectRoute(slug) {
    return isFile ? `#/work/${slug}` : `/work/${slug}`;
  }

  function currentRouteSlug() {
    const route = isFile ? location.hash.replace(/^#/, '') : location.pathname;
    const match = route.match(/^\/work\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function updateRoute(slug, push = true) {
    const url = slug ? projectRoute(slug) : (isFile ? '#threshold' : '/');
    const historyState = slug ? { project: slug } : {};
    if (push) history.pushState(historyState, '', url);
    else history.replaceState(historyState, '', url);
  }

  function openProject(slug, pushRoute = false) {
    const project = content.projects.find(item => item.slug === slug);
    if (!project) return;
    state.lastFocused = document.activeElement;
    state.openProject = slug;
    projectContent.style.setProperty('--project-accent', project.palette[0]);
    projectContent.innerHTML = projectCaseStudy(project);
    if (!projectDialog.open) projectDialog.showModal();
    body.classList.add('modal-open');
    if (pushRoute) updateRoute(slug, true);
    bindCaseNavigation();
    setTimeout(() => $('[data-close-project]', projectDialog)?.focus(), 40);
    status.textContent = `${project.title} case study opened.`;
    tone(620, .055);
  }

  function closeProject({ fromHistory = false } = {}) {
    if (!projectDialog.open) return;
    projectDialog.close();
    body.classList.remove('modal-open');
    const wasOpen = state.openProject;
    state.openProject = null;
    if (!fromHistory && currentRouteSlug()) {
      if (history.state?.project) history.back();
      else updateRoute(null, true);
    }
    if (state.lastFocused && document.contains(state.lastFocused)) state.lastFocused.focus();
    status.textContent = wasOpen ? 'Case study closed.' : '';
    tone(250, .035);
  }

  function projectCaseStudy(project) {
    const idx = content.projects.indexOf(project);
    const previous = content.projects[(idx - 1 + content.projects.length) % content.projects.length];
    const next = content.projects[(idx + 1) % content.projects.length];
    return `
      <header class="case-hero">
        <div class="case-visual" aria-hidden="true"><i class="case-plane"></i><i class="case-plane"></i><i class="case-plane"></i></div>
        <div class="case-hero-copy">
          <div class="case-kicker"><span>${project.number}</span><span>${project.environment}</span></div>
          <h1>${project.title}</h1>
          <p class="case-summary">${project.summary}</p>
          <div class="case-meta-grid">
            <div><small>Category</small><span>${project.category}</span></div>
            <div><small>Year</small><span>${project.year}</span></div>
            <div><small>Role</small><span>${project.role}</span></div>
            <div><small>Primary tools</small><span>${project.tools.join(' · ')}</span></div>
          </div>
        </div>
      </header>
      <div class="case-body">
        <section class="case-intro"><h2>Inside the world.</h2><blockquote>${project.statement}</blockquote></section>
        ${caseSection('Challenge', project.sections.challenge)}
        ${caseSection('Strategic approach', project.sections.approach)}
        ${caseSection('Process', project.sections.process)}
        <div class="case-gallery" aria-label="Generated project visual studies">
          <div class="gallery-panel"></div><div class="gallery-panel"></div><div class="gallery-panel"></div><div class="gallery-panel"></div>
        </div>
        ${caseSection('Technical execution', project.sections.execution)}
        ${caseSection('Final solution', project.sections.solution)}
        <section class="case-impact"><p class="eyebrow">RESULTS & IMPACT</p><h2>What changed.</h2><ul>${project.impact.map(item => `<li>${item}</li>`).join('')}</ul></section>
      </div>
      <nav class="case-navigation" aria-label="Other projects">
        <button class="case-nav-button" data-project-nav="${previous.slug}" data-cursor="Open"><small>Previous project</small><strong>← ${previous.title}</strong></button>
        <button class="case-nav-button" data-project-nav="${next.slug}" data-cursor="Open"><small>Next project</small><strong>${next.title} →</strong></button>
      </nav>
    `;
  }

  function caseSection(title, text) {
    return `<section class="case-section"><h3>${title}</h3><p>${text}</p></section>`;
  }

  function bindCaseNavigation() {
    $$('[data-project-nav]', projectContent).forEach(button => button.addEventListener('click', () => {
      const slug = button.dataset.projectNav;
      updateRoute(slug, true);
      openProject(slug, false);
      projectDialog.querySelector('.dialog-shell').scrollTop = 0;
    }));
  }

  function openArtifact(index) {
    const artifact = content.artifacts[index];
    if (!artifact) return;
    state.lastFocused = document.activeElement;
    artifactContent.innerHTML = `<p class="eyebrow">${artifact.label} · STUDIO ARTIFACT</p><h2>${artifact.title}</h2><p>${artifact.description}</p>`;
    artifactDialog.showModal();
    body.classList.add('modal-open');
    setTimeout(() => $('[data-close-artifact]')?.focus(), 20);
    tone(480, .04);
  }

  function closeArtifact() {
    artifactDialog.close();
    body.classList.remove('modal-open');
    state.lastFocused?.focus?.();
  }

  function openIndex() {
    state.lastFocused = document.activeElement;
    indexDialog.showModal();
    body.classList.add('modal-open');
    setTimeout(() => $('[data-close-index]')?.focus(), 20);
    tone(540, .04);
  }

  function closeIndex() {
    indexDialog.close();
    body.classList.remove('modal-open');
    state.lastFocused?.focus?.();
  }

  function setupDialogs() {
    $('[data-close-project]').addEventListener('click', () => closeProject());
    $('[data-close-index]').addEventListener('click', closeIndex);
    $('[data-close-artifact]').addEventListener('click', closeArtifact);
    $('#project-index-button').addEventListener('click', openIndex);
    $$('[data-open-index]').forEach(button => button.addEventListener('click', openIndex));

    [projectDialog, indexDialog, artifactDialog].forEach(dialog => {
      dialog.addEventListener('click', event => {
        if (event.target === dialog) {
          if (dialog === projectDialog) closeProject();
          if (dialog === indexDialog) closeIndex();
          if (dialog === artifactDialog) closeArtifact();
        }
      });
      dialog.addEventListener('cancel', event => {
        event.preventDefault();
        if (dialog === projectDialog) closeProject();
        if (dialog === indexDialog) closeIndex();
        if (dialog === artifactDialog) closeArtifact();
      });
    });
  }

  function setupNavigation() {
    $$('[data-nav]').forEach(link => link.addEventListener('click', event => {
      const target = link.dataset.nav;
      const section = document.getElementById(target);
      if (!section) return;
      event.preventDefault();
      transitionToChapter(target, () => section.scrollIntoView({ behavior: state.motion ? 'smooth' : 'auto', block: 'start' }));
      closeMobileMenu();
    }));

    const menu = $('.menu-toggle');
    menu.addEventListener('click', () => {
      const header = $('.site-header');
      const opening = !header.classList.contains('menu-open');
      header.classList.toggle('menu-open', opening);
      menu.setAttribute('aria-expanded', String(opening));
    });
  }

  function closeMobileMenu() {
    $('.site-header').classList.remove('menu-open');
    $('.menu-toggle').setAttribute('aria-expanded', 'false');
  }

  function transitionToChapter(id, callback) {
    if (!state.motion) {
      callback();
      return;
    }
    veil.classList.add('is-crossing');
    tone(320, .025);
    setTimeout(() => {
      callback();
      setTimeout(() => veil.classList.remove('is-crossing'), 280);
    }, 280);
  }

  function setupChapterObserver(world) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      setActiveChapter(visible.target.dataset.chapter, world);
    }, { rootMargin: '-32% 0px -48% 0px', threshold: [0, .1, .25, .5] });
    $$('.chapter').forEach(section => observer.observe(section));
  }

  function setActiveChapter(id, world) {
    if (state.chapter === id) return;
    state.chapter = id;
    const chapter = chapters.find(item => item.id === id) || chapters[0];
    document.documentElement.style.setProperty('--chapter-accent', chapter.accent);
    $('#chapter-number').textContent = chapter.number;
    $('#chapter-name').textContent = chapter.name;
    $$('.main-nav a').forEach(link => {
      if (link.dataset.nav === id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    world?.setChapter(id);
  }

  function setupRevealObserver() {
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      }
    }), { threshold: .08, rootMargin: '0px 0px -60px' });
    $$('.reveal').forEach(item => reveal.observe(item));
  }

  function setupMotionToggle(world) {
    const toggle = $('#motion-toggle');
    const saved = localStorage.getItem('atelier-motion');
    if (saved !== null) state.motion = saved === 'true' && !prefersReduced;
    applyMotion(world);
    toggle.addEventListener('click', () => {
      state.motion = !state.motion;
      localStorage.setItem('atelier-motion', String(state.motion));
      applyMotion(world);
      tone(state.motion ? 600 : 240, .04);
    });
  }

  function applyMotion(world) {
    body.classList.toggle('motion-off', !state.motion);
    const toggle = $('#motion-toggle');
    toggle.setAttribute('aria-pressed', String(state.motion));
    toggle.textContent = state.motion ? 'Motion on' : 'Motion off';
    toggle.setAttribute('aria-label', state.motion ? 'Disable environmental motion' : 'Enable environmental motion');
    world?.setMotion(state.motion);
  }

  function setupSound() {
    const toggle = $('#sound-toggle');
    toggle.addEventListener('click', async () => {
      state.sound = !state.sound;
      toggle.setAttribute('aria-pressed', String(state.sound));
      toggle.textContent = state.sound ? 'Sound on' : 'Sound off';
      toggle.setAttribute('aria-label', state.sound ? 'Disable atmospheric sound' : 'Enable atmospheric sound');
      if (state.sound) {
        await startAmbientSound();
        tone(660, .09);
      } else stopAmbientSound();
    });
  }

  async function ensureAudio() {
    if (!state.audioContext) state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (state.audioContext.state === 'suspended') await state.audioContext.resume();
    return state.audioContext;
  }

  async function startAmbientSound() {
    const ctx = await ensureAudio();
    stopAmbientSound();
    const master = ctx.createGain();
    master.gain.value = .012;
    master.connect(ctx.destination);
    const frequencies = [73.4, 110, 146.8];
    frequencies.forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = index === 1 ? 'sine' : 'triangle';
      osc.frequency.value = frequency;
      osc.detune.value = index * 4 - 4;
      filter.type = 'lowpass';
      filter.frequency.value = 360;
      gain.gain.value = index === 1 ? .45 : .22;
      osc.connect(filter).connect(gain).connect(master);
      osc.start();
      state.ambientNodes.push(osc, gain, filter, master);
    });
  }

  function stopAmbientSound() {
    state.ambientNodes.forEach(node => {
      try { node.stop?.(); } catch (_) {}
      try { node.disconnect?.(); } catch (_) {}
    });
    state.ambientNodes = [];
  }

  async function tone(frequency = 440, duration = .035) {
    if (!state.sound) return;
    const ctx = await ensureAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(.025, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function setupContactForm() {
    const form = $('#contact-form');
    const error = $('#form-error');
    form.addEventListener('submit', event => {
      event.preventDefault();
      error.textContent = '';
      const required = $$('[required]', form);
      let firstInvalid = null;
      required.forEach(field => {
        const valid = field.value.trim() && (field.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value));
        field.setAttribute('aria-invalid', String(!valid));
        if (!valid && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) {
        error.textContent = 'A few details still need your attention before the message can cross the threshold.';
        firstInvalid.focus();
        tone(180, .06);
        return;
      }
      $('#form-success').hidden = false;
      $$('input, textarea, select, button', form).forEach(field => field.disabled = true);
      tone(720, .12);
      status.textContent = 'Your message was submitted successfully.';
    });
  }

  function setupCustomCursor() {
    if (!matchMedia('(pointer:fine)').matches) return;
    const cursor = $('#cursor');
    let x = 0, y = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', event => {
      x = event.clientX;
      y = event.clientY;
      cursor.classList.add('is-visible');
      document.documentElement.style.setProperty('--pointer-x', ((x / innerWidth) - .5).toFixed(3));
      document.documentElement.style.setProperty('--pointer-y', ((y / innerHeight) - .5).toFixed(3));
    });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
    document.addEventListener('mouseover', event => {
      const target = event.target.closest('[data-cursor]');
      cursor.classList.toggle('is-active', Boolean(target));
      cursor.querySelector('span').textContent = target?.dataset.cursor || '';
    });
    function animate() {
      cx += (x - cx) * .22;
      cy += (y - cy) * .22;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(animate);
    }
    animate();
  }

  class AtelierWorld {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.dpr = Math.min(devicePixelRatio || 1, lowPower ? 1.2 : 1.75);
      this.motion = state.motion;
      this.chapter = 'threshold';
      this.targetChapter = 'threshold';
      this.fade = 1;
      this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      this.scroll = 0;
      this.time = 0;
      this.visible = true;
      this.seed = 1337;
      this.objects = [];
      this.dust = [];
      this.resize();
      this.buildScene(this.chapter);
      addEventListener('resize', () => this.resize(), { passive: true });
      addEventListener('mousemove', event => {
        this.pointer.tx = (event.clientX / innerWidth - .5) * 2;
        this.pointer.ty = (event.clientY / innerHeight - .5) * 2;
      }, { passive: true });
      addEventListener('scroll', () => { this.scroll = scrollY; }, { passive: true });
      document.addEventListener('visibilitychange', () => { this.visible = !document.hidden; });
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    random() {
      this.seed = (this.seed * 9301 + 49297) % 233280;
      return this.seed / 233280;
    }

    resize() {
      this.width = innerWidth;
      this.height = innerHeight;
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    setMotion(enabled) { this.motion = enabled; }

    setChapter(id) {
      if (this.chapter === id) return;
      this.targetChapter = id;
      if (!this.motion) {
        this.chapter = id;
        this.buildScene(id);
        return;
      }
      this.fadeDirection = -1;
    }

    buildScene(id) {
      const index = Math.max(0, chapters.findIndex(item => item.id === id));
      this.seed = 1200 + index * 777;
      this.objects = [];
      this.dust = [];
      const configs = {
        threshold: { count: 26, spread: 900, depth: 1700, types: ['plane', 'frame', 'beam', 'stair'] },
        work: { count: 34, spread: 1050, depth: 1900, types: ['territory', 'frame', 'plane', 'beam'] },
        archive: { count: 38, spread: 900, depth: 2200, types: ['slab', 'frame', 'slab', 'column'] },
        about: { count: 24, spread: 780, depth: 1500, types: ['plane', 'frame', 'sample', 'column'] },
        capabilities: { count: 42, spread: 980, depth: 1900, types: ['shelf', 'slab', 'sample', 'frame'] },
        process: { count: 30, spread: 900, depth: 1700, types: ['beam', 'frame', 'mechanism', 'plane'] },
        contact: { count: 20, spread: 1100, depth: 2100, types: ['portal', 'plane', 'beam', 'frame'] }
      };
      const cfg = configs[id] || configs.threshold;
      for (let i = 0; i < cfg.count; i++) {
        const type = cfg.types[Math.floor(this.random() * cfg.types.length)];
        this.objects.push({
          type,
          x: (this.random() - .5) * cfg.spread,
          y: (this.random() - .5) * (cfg.spread * .68),
          z: 100 + this.random() * cfg.depth,
          w: 70 + this.random() * 260,
          h: 40 + this.random() * 280,
          r: (this.random() - .5) * .7,
          phase: this.random() * Math.PI * 2,
          hue: this.random(),
          line: this.random() > .45
        });
      }
      const dustCount = lowPower ? 18 : 36;
      for (let i = 0; i < dustCount; i++) {
        this.dust.push({
          x: this.random() * this.width,
          y: this.random() * this.height,
          z: .2 + this.random() * .8,
          size: .5 + this.random() * 1.5,
          phase: this.random() * Math.PI * 2
        });
      }
    }

    palette() {
      const p = {
        threshold: [[157,120,255], [94,230,255], [244,238,255]],
        work: [[150,111,255], [97,218,255], [255,149,208]],
        archive: [[95,229,255], [110,132,255], [220,252,255]],
        about: [[255,160,210], [157,121,255], [245,230,255]],
        capabilities: [[180,165,255], [95,223,255], [232,226,255]],
        process: [[118,234,255], [91,106,255], [234,251,255]],
        contact: [[255,179,216], [160,121,255], [130,231,255]]
      };
      return p[this.chapter] || p.threshold;
    }

    project(point) {
      const focal = Math.min(this.width, this.height) * 1.08;
      const z = Math.max(120, point.z);
      const scale = focal / z;
      return {
        x: this.width / 2 + (point.x + this.pointer.x * 34) * scale,
        y: this.height / 2 + (point.y + this.pointer.y * 22 + (this.scroll % 1000) * .006) * scale,
        scale,
        visible: z > 80
      };
    }

    rgba(rgb, alpha) { return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`; }

    drawBackground(ctx, palette) {
      const bg = ctx.createRadialGradient(this.width * (.58 + this.pointer.x * .02), this.height * (.34 + this.pointer.y * .02), 10, this.width * .55, this.height * .42, Math.max(this.width, this.height) * .8);
      bg.addColorStop(0, this.rgba(palette[0], .11 * this.fade));
      bg.addColorStop(.38, this.rgba(palette[1], .04 * this.fade));
      bg.addColorStop(1, 'rgba(3,3,10,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, this.width, this.height);

      const horizon = ctx.createLinearGradient(0, this.height * .45, 0, this.height);
      horizon.addColorStop(0, 'rgba(0,0,0,0)');
      horizon.addColorStop(1, this.rgba(palette[0], this.chapter === 'contact' ? .12 : .025));
      ctx.fillStyle = horizon;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    drawObject(ctx, object, palette) {
      const drift = this.motion ? Math.sin(this.time * .00022 + object.phase) * 10 : 0;
      const rotation = object.r + (this.motion ? Math.sin(this.time * .00014 + object.phase) * .025 : 0);
      const projected = this.project({ x: object.x, y: object.y + drift, z: object.z });
      if (!projected.visible || projected.scale > 5 || projected.scale < .05) return;
      const w = object.w * projected.scale;
      const h = object.h * projected.scale;
      if (projected.x + w < -100 || projected.x - w > this.width + 100 || projected.y + h < -100 || projected.y - h > this.height + 100) return;
      const color = palette[Math.floor(object.hue * palette.length) % palette.length];
      const alpha = Math.max(.025, Math.min(.24, projected.scale * .14)) * this.fade;
      ctx.save();
      ctx.translate(projected.x, projected.y);
      ctx.rotate(rotation);
      ctx.lineWidth = Math.max(.4, projected.scale * .9);
      ctx.strokeStyle = this.rgba(color, alpha + .08);
      ctx.fillStyle = this.rgba(color, alpha * .20);

      switch (object.type) {
        case 'frame':
        case 'portal':
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          if (object.type === 'portal') {
            ctx.shadowBlur = 22;
            ctx.shadowColor = this.rgba(color, .34);
            ctx.strokeRect(-w * .34, -h * .38, w * .68, h * .76);
          }
          break;
        case 'plane':
        case 'sample':
          ctx.beginPath();
          ctx.moveTo(-w / 2, -h * .42);
          ctx.lineTo(w * .46, -h / 2);
          ctx.lineTo(w / 2, h * .42);
          ctx.lineTo(-w * .46, h / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case 'slab':
        case 'shelf':
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          ctx.beginPath();
          ctx.moveTo(-w * .38, -h * .22);
          ctx.lineTo(w * .36, -h * .22);
          ctx.moveTo(-w * .38, 0);
          ctx.lineTo(w * .22, 0);
          ctx.stroke();
          break;
        case 'column':
          ctx.fillRect(-w * .18, -h / 2, w * .36, h);
          ctx.strokeRect(-w * .18, -h / 2, w * .36, h);
          break;
        case 'beam':
          ctx.shadowBlur = 14;
          ctx.shadowColor = this.rgba(color, .26);
          ctx.beginPath();
          ctx.moveTo(-w / 2, 0);
          ctx.lineTo(w / 2, 0);
          ctx.stroke();
          break;
        case 'stair':
          for (let i = 0; i < 4; i++) ctx.strokeRect(-w / 2 + i * w * .12, -h / 2 + i * h * .14, w * (.65 - i * .07), h * .10);
          break;
        case 'territory':
          ctx.beginPath();
          ctx.moveTo(-w * .5, h * .15);
          ctx.lineTo(-w * .18, -h * .35);
          ctx.lineTo(w * .42, -h * .18);
          ctx.lineTo(w * .5, h * .26);
          ctx.lineTo(-w * .12, h * .42);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case 'mechanism':
          ctx.strokeRect(-w / 2, -h * .14, w, h * .28);
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const x = -w * .42 + i * w * .17;
            ctx.moveTo(x, -h * .14);
            ctx.lineTo(x + w * .09, h * .14);
          }
          ctx.stroke();
          break;
      }
      ctx.restore();
    }

    drawDust(ctx, palette) {
      for (const dust of this.dust) {
        const float = this.motion ? Math.sin(this.time * .00025 * dust.z + dust.phase) * 5 : 0;
        ctx.fillStyle = this.rgba(palette[2], .08 * dust.z * this.fade);
        ctx.fillRect(dust.x + this.pointer.x * dust.z * 5, dust.y + float + this.pointer.y * dust.z * 4, dust.size, dust.size * .45);
      }
    }

    loop(timestamp) {
      requestAnimationFrame(this.loop);
      if (!this.visible || !this.ctx) return;
      this.time = timestamp;
      this.pointer.x += (this.pointer.tx - this.pointer.x) * (this.motion ? .035 : .18);
      this.pointer.y += (this.pointer.ty - this.pointer.y) * (this.motion ? .035 : .18);

      if (this.fadeDirection) {
        this.fade += this.fadeDirection * .055;
        if (this.fade <= 0) {
          this.fade = 0;
          this.chapter = this.targetChapter;
          this.buildScene(this.chapter);
          this.fadeDirection = 1;
        } else if (this.fade >= 1) {
          this.fade = 1;
          this.fadeDirection = 0;
        }
      }

      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      const palette = this.palette();
      this.drawBackground(ctx, palette);
      const sorted = this.objects.slice().sort((a, b) => b.z - a.z);
      sorted.forEach(object => this.drawObject(ctx, object, palette));
      this.drawDust(ctx, palette);
    }
  }

  function setupRouter() {
    addEventListener('popstate', () => {
      const slug = currentRouteSlug();
      if (slug) openProject(slug, false);
      else closeProject({ fromHistory: true });
    });
    const slug = currentRouteSlug();
    if (slug) {
      updateRoute(slug, false);
      setTimeout(() => openProject(slug, false), 50);
    } else if (!isFile && location.pathname !== '/') {
      history.replaceState({}, '', '/');
    }
  }

  function initialize() {
    renderProjects();
    renderArchive();
    renderArtifacts();
    renderCapabilities();
    renderProcess();
    renderIndex();
    setupDialogs();
    setupNavigation();
    setupContactForm();
    setupSound();
    setupCustomCursor();

    const world = new AtelierWorld($('#world'));
    setupMotionToggle(world);
    setupChapterObserver(world);
    setupRevealObserver();
    setupRouter();
    setActiveChapter('threshold', world);

    addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMobileMenu();
    });
  }

  initialize();
})();
