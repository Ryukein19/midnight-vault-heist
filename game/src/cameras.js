// OPAL HOUR — the wall cameras.
// Each camera sits on a wall and sweeps its cone back and forth. Being seen by
// a camera feeds the alarm and brings the guards running, but it does not end
// the run by itself. A jammer (Q) kills the nearest camera for a few seconds —
// a spend, like every tool here. A jammed camera's cone goes dark.
import { CAMERA, TOOLS } from './config.js';
import { canSee } from './vision.js';

export function createCamera(def, phase) {
  return {
    x: def.x,
    y: def.y,
    base: def.base,
    sweep: def.sweep,
    label: def.label,
    phase,
    angle: def.base,
    jammed: 0, // seconds of jam left
    seeing: false,
  };
}

/** Sweep the camera; `t` is the running clock in seconds. */
export function stepCamera(c, t, dt) {
  if (c.jammed > 0) c.jammed = Math.max(0, c.jammed - dt);
  c.angle = c.base + Math.sin(t * CAMERA.sweep + c.phase) * c.sweep;
}

/** Does this camera see the thief? (Smoke clouds block sight.) */
export function cameraSees(c, thief, smoke) {
  if (c.jammed > 0) return false;
  return canSee(c.x, c.y, c.angle, CAMERA.half, CAMERA.range, thief.x, thief.y, smoke);
}

/** Jam the nearest camera to (x,y) within range. Returns the camera or null. */
export function jamNearest(cameras, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < cameras.length; i += 1) {
    const c = cameras[i];
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  if (best === null || bestDist > TOOLS.jamRange) return null;
  best.jammed = TOOLS.jamSeconds;
  return best;
}
