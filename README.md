# The Infinite Atelier

An immersive, accessible dimensional portfolio prototype for Kate Noah / Hope in Print.

This build turns the portfolio into one continuous architectural world while keeping the experience readable, keyboard-accessible, mobile-friendly, and compatible with normal browser scrolling.

## What is included

- A custom generative dimensional canvas environment with chapter-specific architecture
- The Threshold hero
- Six unique project territories
- Full editorial case-study overlays
- Browser Back and Forward support for `/work/project-slug` routes
- Direct project index
- Filterable archive
- Interactive About artifacts
- Expandable capability library
- Interactive six-stage process
- Accessible contact form and in-world success state
- Optional atmospheric sound, off by default
- Motion toggle and `prefers-reduced-motion` support
- Desktop custom cursor with contextual labels
- Purpose-built mobile layout
- Static visual fallback when canvas is unavailable
- No external libraries, fonts, image requests, or build dependencies

## Run locally

1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Run:

```bash
npm start
```

4. Open:

```text
http://localhost:4173
```

The local Node server includes a History API fallback, so direct case-study URLs such as `/work/matuska` work correctly.

You may also open `index.html` directly. In direct-file mode, the project automatically uses hash routes such as `#/work/matuska` because a browser cannot provide server-side URL fallback from a local file.

## Edit portfolio content

All portfolio content is stored in `data.js`:

- `projects`
- project case-study sections
- results and impact
- studio artifacts
- capabilities and tools
- process stages

The scene logic is kept separate in `app.js`, so project copy can be changed without editing the dimensional environment.

## Contact form

The included form provides complete client-side validation and a polished confirmation state. It intentionally does not transmit personal data until a form service is selected.

To connect it, replace the success branch inside `setupContactForm()` in `app.js` with one of the following:

- Netlify Forms
- Formspree
- Basin
- a serverless function
- a custom API endpoint

## Deployment

### Vercel

1. Upload the folder to a Git repository.
2. Import the repository into Vercel.
3. Use the default static deployment settings.
4. `vercel.json` already includes the route fallback.

### Netlify

1. Drag the folder into Netlify Drop or connect the repository.
2. Set the publish directory to `.`.
3. `netlify.toml` already includes the route fallback.

### GitHub Pages

GitHub Pages does not provide native History API fallback for arbitrary paths. The easiest option is to deploy with hash routing:

1. In `app.js`, set `const isFile = true;` or replace the routing helper with hash-only routing.
2. Push the folder to a repository.
3. Enable Pages from the repository root.

For clean `/work/...` URLs, use Vercel or Netlify.

## Accessibility notes

- Semantic headings and section landmarks
- Skip link
- Minimum 44px interaction targets
- Keyboard-operable project cards, filters, artifacts, capability drawers, process stages, dialogs, and form
- Native modal dialogs with Escape behavior
- Visible focus states
- Reduced-motion behavior
- Screen-reader status announcements
- No essential information is stored only in the canvas
- Sound is optional and disabled by default

## Performance notes

The world uses a lightweight Canvas 2D projection system rather than heavy external 3D dependencies. It automatically lowers detail on smaller or lower-core devices, caps pixel density, pauses when the tab is hidden, and keeps the HTML content independent from scene rendering.

## Files

- `index.html` — semantic application shell
- `styles.css` — full visual system and responsive behavior
- `data.js` — editable structured content
- `app.js` — interactions, routing, accessibility, sound, and dimensional environment
- `server.js` — zero-dependency local server with route fallback
- `vercel.json` — Vercel routing
- `netlify.toml` — Netlify routing
