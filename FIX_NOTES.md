# Studio stability + lighting pass

This version addresses the remaining scrolling/case-study freezes and the hallway signage/lighting notes.

## Stability changes

- Returned animation to React Three Fiber's native `frameloop="always"` loop instead of maintaining a second manual `advance()` loop.
- Removed background GPU texture warm-up. Forced texture uploads were occurring shortly after entry and could stall the first scroll.
- Made the stable mid-quality renderer the default on every desktop. The reflective floor, shadows, bloom, and depth of field are now opt-in with `?quality=high` rather than being enabled automatically by a GPU guess.
- Reduced mid-tier DPR to 1 and high-tier maximum DPR to 1.25.
- Removed the large animated `backdrop-filter` from the case-study drawer and scrim. These now use simple composited surfaces rather than blurring the live WebGL canvas.
- Case-study close now restores the document scroll position, camera progress, velocity, and dolly state in the same tick. It also cleans the URL with `replaceState` instead of racing the camera against `history.back()` scroll restoration.
- Restoring focus after a dialog closes uses `preventScroll`, and browser history scroll restoration is disabled while the 3D experience is mounted, so neither path can quietly desynchronise the room.
- The existing startup watchdog and WebGL error fallback remain in place.

## Visual changes

- Removed the oversized “Katelynn Noah” lettering from the entrance wall.
- Added paired room titles on both walls for Main Gallery, Studio Tour, The Alcove, Records, The Quiet Room, and Studio Work. Titles sit lower in the natural field of view instead of clipping against the top edge.
- Fixed long wall labels so tracked lettering automatically shrinks to fit; “STUDIO WORK” no longer clips its final letters.
- Added a three-layer luminous ceiling cove through the full building.
- Added continuous warm wall-wash geometry along both walls, stronger ambient fill, and brighter cove lamps without requiring bloom.
- Shared duplicate left/right title textures to reduce GPU uploads and memory pressure.
- Kept the lower-right KN/Katelynn Noah signature block at the entrance.

## Deploy

Commit the contents of this folder to the repository's `main` branch. The existing GitHub Pages workflow runs `npm ci`, builds the Vite project, and deploys `dist` automatically.

The generated `dist`, local `node_modules`, development screenshots, and Git history are intentionally excluded from this ZIP.
