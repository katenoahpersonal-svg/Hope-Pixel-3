import { Vector3 } from 'three'

/**
 * DIMENSION FIVE — REACTIVITY.
 * Whatever the visitor is nearest becomes the focal plane; everything else
 * falls into bokeh. The gallery writes here every frame and the depth-of-field
 * effect reads it.
 */
export const focus = {
  /** World point the lens is focused on. */
  point: new Vector3(0, 1.6, -6),
  /** Distance from camera to that point. */
  distance: 8,
  /** 0 = wandering the hall, 1 = locked onto a panel. */
  lock: 0,
}
