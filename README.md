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
2. **Time** — the studio is always after hours. `src/lib/palette.js` blends four
   midnight anchors against your local clock — Small hours, First light, Blue
   hour, Violet hour — so 4:40pm is genuinely between two of them. It drives the
   sun, the environment, the fog, the bloom, the accent and the interface theme.
   The room never goes bright; what changes is temperature and how much light is
   in the air. The chip in the nav overrides it by hand.

   `accentInk`, `signInk` and `signAccent` are deliberately identical in all four
   phases. Canvas textures are memoised on them, and a value that drifted with
   the clock would silently redraw every panel in the building once a minute.
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

| Tier | Floor reflections | Depth of field | Shadows | Max DPR |
| --- | --- | --- | --- | --- |
| `high` | yes | yes | yes | 1.75 |
| `mid` | no | yes | no | 1.35 |
| `low` | no | no | no | 1 |

`PerfGuard` in `src/three/Scene.jsx` measures the real frame rate and steps the
tier **down** if the machine cannot hold 45fps — never back up, because
oscillating between tiers reads worse than simply running at the lower one.

Nothing uses `transmission`. It looks lovely and costs an entire extra render of
the scene every frame; in a dark room, reflection and clearcoat read as glass
just as well for free.

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

## Keeping it smooth

The scene is warmed before the loader retires (`warmUp` in `src/three/Scene.jsx`):
every texture is pushed to the GPU with `initTexture` and every shader compiled
with `compileAsync`. Without it, each object uploads its 1024×1280 canvas texture
and compiles its program the first time it enters view — a ~100ms stall every few
metres of hall, which reads as the whole thing getting stuck. With it, a full
traversal holds a worst frame under 10ms.

**Hidden overlays must be hidden to hit-testing too.** `opacity: 0` still catches
every click and still composites its `backdrop-filter`. `.scrim`, `.study` and
`.sheet` all switch `visibility` and `pointer-events` off the `data-show`
attribute, and only attach their blur while actually on screen. Getting this
wrong on a full-screen element makes the entire site unclickable while scrolling
keeps working — which reads as a freeze, not as a CSS bug. There is an audit for
it in the checks below.

Two more rules that follow from this:

- **Nothing in a `useFrame` may allocate.** No array spreads, no `.map().sort()`,
  no `new Vector3()`. Use module-level scratch vectors and scan for a minimum
  instead of sorting.
- **Nothing may run a `requestAnimationFrame` loop forever.** An asymptotic ease
  never reaches its target, so a naive `setState` loop re-renders for the life of
  the page. Stop when it is close enough. `useFrameValue` takes an `active` flag
  for the same reason — an off-screen overlay should not poll.

### A check worth re-running after any overlay change

Paste this in the console. It lists anything positioned that covers a third of
the viewport and can still take clicks. Only `DIV.stage` — the canvas — should
ever appear.

```js
const W=innerWidth,H=innerHeight;[...document.querySelectorAll('body *')].filter(el=>{const c=getComputedStyle(el);if(!/fixed|absolute/.test(c.position)||c.pointerEvents==='none'||c.visibility==='hidden')return false;const r=el.getBoundingClientRect();return (Math.max(0,Math.min(r.right,W)-Math.max(r.left,0))*Math.max(0,Math.min(r.bottom,H)-Math.max(r.top,0)))/(W*H)>0.3}).map(el=>el.className||el.tagName)
```

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
- **Never put a Fragment inside `<EffectComposer>`.** It reads its children as
  effects, and `React.Children.toArray` drops `false` but keeps a Fragment — so
  `{cond ? <Effect/> : <></>}` breaks the composer the moment the condition
  flips, and the whole scene silently unmounts with no console error. Write
  `{cond && <Effect/>}`.
