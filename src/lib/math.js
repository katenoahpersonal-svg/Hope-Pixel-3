/**
 * Frame timing that cannot poison the scene.
 *
 * Almost everything here eases toward a target with MathUtils.damp, which folds
 * the previous value back in. That means one bad delta — a resize, a tab coming
 * back from the background, a manually stepped frame — turns a smoothed value
 * into NaN permanently, and the camera never comes back. Clamping every delta
 * at the point of use is cheap and ends the whole class of bug.
 */
export function safeDt(delta, max = 1 / 30) {
  return Number.isFinite(delta) ? Math.min(Math.max(delta, 0), max) : 1 / 60
}

/** Fall back to `fallback` if a smoothed value has gone non-finite. */
export function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}
