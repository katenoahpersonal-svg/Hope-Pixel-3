# Hope in Print — Dimensional Portfolio Prototype

A procedural, asset-light immersive portfolio built with Three.js, GSAP ScrollTrigger, Lenis, GLSL shaders, and postprocessing.

## Fastest way to open it on Windows

1. Double-click `launch.bat`.
2. A browser window should open at `http://localhost:8080`.
3. Keep the black command window open while viewing the site.

If Windows says Python is not installed, install Python from python.org and check **Add Python to PATH** during installation. You can also use VS Code's **Live Server** extension and open `index.html` with Live Server.

## Open it manually

The prototype can run directly from the pinned CDN imports, so no npm installation is required.

Run a local server inside this folder:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

A local server is required because the site uses JavaScript modules. Opening `index.html` directly by double-clicking may be blocked by browser security rules.

## View it on your phone

1. Connect the computer and phone to the same Wi-Fi.
2. Run `launch-network.bat`.
3. Find the computer's IPv4 address in the command window, such as `192.168.1.24`.
4. On the phone, open `http://YOUR-IP:8080`.
5. If Windows Firewall asks, allow access on private networks.

## Where to customize

- Portfolio wording and semantic sections: `index.html`
- Visual design and responsive behavior: `styles.css`
- 3D worlds, camera path, butterfly, shaders, sound, and interactions: `app.js`
- Project data: search for `worldData` and `cases` in `app.js`
- Email/social links: search for `hello@hopeinprint.com` in `index.html`

## Implemented

- Scroll-driven curved 3D camera flight
- Mouse parallax across scene layers
- Local-time dawn/day/dusk/night color grading
- Procedural particle butterfly guide with idle, dash, and landing behavior
- Four floating project worlds and clickable portal transitions
- Procedural nebula, stars, holographic materials, wireframes, bloom, vignette, and chromatic shift
- Physics-like cursor trail and magnetic interface controls
- Optional generated ambient Web Audio with audio-reactive lights and particles
- Semantic HTML beneath the WebGL canvas
- Keyboard-openable project cards
- Reduced-motion and simplified mobile modes
- No required image or audio assets

## Production notes

This is a high-fidelity creative prototype. Before launch, replace placeholders, connect real case-study routes, test across target devices, compress any added media, add analytics, and host dependencies locally or through your production bundler.


## Optional Vite workflow

For local package installation and a production build:

```bash
npm install
npm run dev
```

Build the deployable site with `npm run build`.
