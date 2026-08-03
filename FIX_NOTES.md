# Studio freeze fix

This version fixes the portfolio stalls without changing the visual design.

## What was corrected

- The loader no longer waits while every large canvas texture is uploaded to the GPU in one blocking burst.
- Optional texture warming now runs gradually during browser idle time and is reduced on mid/low-tier hardware.
- React Three Fiber's manually driven clock now receives seconds instead of `requestAnimationFrame` milliseconds.
- Repeated render-frame failures, WebGL startup failures, and lost WebGL contexts switch safely to the lightweight portfolio.
- A 10-second startup watchdog prevents visitors from being trapped behind the loader.
- Navigation travel durations now use actual milliseconds (`1100` and `900`) instead of accidental `2.2ms` and `1.5ms` jumps.
- `root.configure()` is awaited and renderer startup errors are caught.

## Deploy

Commit the contents of this folder to the repository's `main` branch. The existing GitHub Pages workflow runs `npm ci`, builds the Vite project, and deploys `dist` automatically.

The generated `dist`, local `node_modules`, development screenshots, and Git history are intentionally excluded from this ZIP.
