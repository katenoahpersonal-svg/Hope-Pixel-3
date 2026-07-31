# The Studio — Katelynn Noah

An immersive 3D portfolio. The work is not laid out on a page; it hangs in a
gallery you walk through. Scroll flies the camera down a hall of lit display
panels, the daylight tracks your local clock, and clicking a panel dollies you
in and opens the full case study.

Design · Ecommerce · Marketing · Creative Production.

---

## Running it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:8395.

```bash
npm run build
```

Output lands in `dist/`. `base` is `./`, so it works from any subpath.

## Deploying

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every
push to `main`. In the repo settings, set **Pages → Source → GitHub Actions**
once and it runs itself.

---

## Where the content lives

**Everything you would want to edit is in [`src/data/content.js`](src/data/content.js).**
Nothing else needs touching to change copy, projects, or the shape of the
building. Lines marked `// VERIFY` are the ones to confirm before launch — see
[VERIFY.md](VERIFY.md).

That file holds:

| Export | What it controls |
| --- | --- |
| `identity` | Name, positioning statement, email, links, availability |
| `hallProfile` | **The architecture.** Centre line, half width and ceiling height at each depth. Widen a row and a room opens; move `cx` and the hall bends. |
| `sections` | The seven rooms, where the nav walks you to, and where each takes over the interface |
| `projects` | The eight flagship case studies |
| `panelPlacement` / `featured` | Which wall each panel hangs on, and at what depth |
| `about`, `expertise`, `resume`, `studioWork`, `contact` | The written sections |

## How it is built

- **React Three Fiber + drei** for the scene, **GSAP + Lenis** for scroll,
  **@react-three/postprocessing** for bloom, depth of field and vignette,
  **zustand** for state.
- **No asset downloads.** Every surface, artwork, label and résumé sheet is
  drawn into a 2D canvas at runtime (`src/lib/textures.js`) and uploaded as a
  texture. No HDRI, no GLTF, no image files — which is why it loads instantly
  and works offline. The environment map is baked in-scene from drei
  lightformers.
- **The hall is one generated mesh.** `src/three/Hall.jsx` samples
  `hallProfile` every half metre and extrudes floor, walls, ceiling and the
  ceiling light slot as four quad strips, with ambient occlusion baked into
  vertex colours.

### The five dimensions

1. **Space** — scroll walks the camera down the hall; the pointer orbits it;
   panels swing into view as you approach and the camera leans toward whichever
   one you are nearest.
2. **Time** — `src/lib/palette.js` blends four daylight anchors against your
   local clock, so 4:40pm is genuinely between midday and dusk. It drives the
   sun, the environment, the fog, the bloom, the accent colour and the
   interface theme. The chip in the nav overrides it by hand.
3. **Interaction** — panels lift, tilt toward the pointer and drag a highlight
   across the glass; clicking dollies the camera in and opens the case study.
   Interface buttons are magnetic.
4. **Sound** — entirely synthesised WebAudio (`src/lib/audio.js`): a brown-noise
   room tone under two quiet drones, plus a materialised click. Opt-in only,
   never autoplayed.
5. **Reactivity** — the gallery publishes a focal point every frame
   (`src/three/focus.js`) and depth of field follows it, so the panel you are
   standing at is sharp and the rest of the room falls away. Scroll velocity
   widens the bokeh and changes how hard the camera eases.

### Quality tiers

Detected from viewport and device (`detectQuality` in `src/state/store.js`),
overridable with `?quality=`.

| Tier | Floor reflections | Real glass | Depth of field | Shadows | DPR |
| --- | --- | --- | --- | --- | --- |
| `high` | yes | transmission | yes | yes | 2 |
| `mid` | no | no | yes | no | 1.5 |
| `low` | no | no | no | no | 1.5 |

Field of view is aspect-aware: the horizontal angle is held steady so a tall
phone screen does not end up looking through a slot.

### The flat layout

Visitors with `prefers-reduced-motion: reduce`, without WebGL, or on `?flat=1`
get [`src/ui/FlatSite.jsx`](src/ui/FlatSite.jsx) — the same words and the same
work, laid out flat and quiet. three.js is a lazy import, so those visitors
never download it at all (~60 kB gzipped instead of ~410 kB).

In 3D mode the full text is still in the DOM under the canvas as a
screen-reader-only `<main>`, so crawlers and assistive tech get everything.

### Accessibility

Real `<button>`s for every panel in the work index, focus-trapped dialogs with
Escape to close, hash-routed case studies (`#bigcommerce`) that survive Back,
visible focus rings, and keyboard shortcuts: **1–8** open a case study,
**Home**/**End** jump to either end of the hall.

---

## Query parameters

| Parameter | Effect |
| --- | --- |
| `?flat=1` / `?flat=0` | Force the flat layout on or off |
| `?quality=high\|mid\|low` | Force a quality tier |
| `?phase=morning\|midday\|golden\|night` | Force a daylight phase |
| `?hour=18.5` | Force a specific hour |
| `?drive` | Stop the frameloop and expose `window.__drive(n)` to step frames by hand |

`?drive` exists because a backgrounded tab receives no animation frames at all.
With it, `window.__seek(t)` sets scroll progress and `window.__drive(n)` renders
`n` frames synchronously — enough to screenshot the canvas from a console.

## Two things worth knowing before you change the 3D code

- **The scene is mounted once.** `src/three/Stage.jsx` hand-mounts a
  react-three-fiber root instead of using `<Canvas>`, because `<Canvas>` waits
  on a ResizeObserver that a backgrounded tab never fires. Calling `render()`
  again on a manual root remounts the entire tree, so the scene reads its state
  from the zustand store rather than from props passed down through `<Stage>`.
- **Clamp your frame deltas.** Everything eases with `MathUtils.damp`, which
  folds the previous value back in, so a single non-finite delta poisons a
  smoothed value permanently and the camera never recovers. Use `safeDt` from
  `src/lib/math.js` in every `useFrame`.
