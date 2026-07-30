# Hope Atlas — Kate Noah · Hope in Print

A portfolio charted like a night sky. Six worlds of work sit in a constellation
of glass cards; **everything is clickable and everything opens into a card.**
No 3D engine, no guide character, no scroll-jacking — the wonder comes from
light, depth and typography instead.

Built from Kate's real 2026 resume: ecommerce & digital experience, UI/UX,
integrated campaigns, print production, interactive and product work.

## Run it

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1
```

Then open http://localhost:8394/. It's a static site — no build step, no npm
install, no dependencies. Only Google Fonts is fetched from the network.

## Deploy

Push this folder to GitHub Pages (Settings → Pages → deploy from branch, root).
`index.html` at the root is all Pages needs. `serve.ps1` and `_snaps/` are
local dev helpers and can be deleted before publishing.

## Structure

```
index.html    the whole interface + THE ARCHIVE (all copy lives here) ← edit copy
css/main.css  design system: sky, glass cards, dialogs, form, reading mode
js/app.js     one module: starfield, tilt, router, dialogs, form, audio
serve.ps1     local dev server (port 8394)
```

## How the content works

`index.html` → `<section class="doc" id="docArchive">` is the **single source of
truth** for every word on the site. It holds the six full case studies plus
About, Capabilities and Process.

* The card dialogs **clone their content from it** at open time.
* "Read as one page" reveals it as one calm, styled document (`?lite=1`).
* `<noscript>` unhides it, so the portfolio is readable with JS disabled.
* Screen readers and search engines get the real text either way.

To change copy, edit the archive. To change a world's color or card art, edit
its `--accent` in the card markup and its `.art-*` rule in the CSS.

## Everything clickable

| Click | Opens |
|---|---|
| Any of the six world cards | Full case study card (challenge → strategy → process → tools → solution → impact) |
| About / Capabilities / Process cards *or* nav links | The matching card dialog |
| Card arrows, or ← / → keys | Previous / next world, in place |
| "All work", ✕, Escape, or the scrim | Closes back to the atlas |
| Contact form | Composes a prefilled email + shows a confirmation |

Overlays are **hash-routed** (`#w/matuska`, `#about`, `#capabilities`,
`#process`), so deep links work and the browser Back button behaves: Back steps
card by card, while ✕ / Escape unwind to the page in one action. Each history
entry stores its own depth in `history.state`, so the unwind stays correct even
after the visitor presses Back themselves.

## The five dimensions, without the engine

1. **Space** — layered depth: parallax starfield, drifting nebulae, tilting
   cards with cursor-tracked glare, staggered constellation grid.
2. **Time** — the palette shifts with the visitor's local hour (dawn / day /
   dusk / night). Test with `?phase=dusk`.
3. **Interaction** — card tilt, magnetic chrome, trailing cursor, reveal-on-
   scroll, hover glare. Every motion is tied to something clickable.
4. **Sound** — the nav toggle starts a WebAudio ambient pad, synthesized live
   (no audio files, never autoplaying).
5. **Personalization** — reduced-motion support, touch tiers, and a one-page
   reading mode that persists across visits.

## Accessibility

* Real `<button>` / `<a>` elements throughout; visible focus rings.
* Focus is trapped in dialogs and returned to the trigger on close; Escape closes.
* `prefers-reduced-motion`: no starfield animation, comets, drift, tilt or reveals.
* Card art is decorative (`aria-hidden`); all meaning is in text.
* One-page reading mode and `<noscript>` both expose the complete portfolio.
* Mobile (< 900px): cards stack full width, nav collapses into a menu sheet,
  no horizontal scroll at 375px.
