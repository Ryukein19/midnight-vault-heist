// OPAL HOUR — moving a circle through the room without clipping a wall.
// Movement is axis-separated: try the full step, then x-only, then y-only, so a
// walker slides along a case instead of sticking to its corner. The thief, the
// guards and the autopilot all walk through here, so nobody can ever clip
// through a wall the renderer draws as solid.
import { OBSTACLES } from './level.js';
import { ROOM } from './config.js';

function hitsSolid(x, y, r) {
  if (x - r < ROOM.x || x + r > ROOM.x + ROOM.width) return true;
  if (y - r < ROOM.y || y + r > ROOM.y + ROOM.height) return true;
  for (let i = 0; i < OBSTACLES.length; i += 1) {
    const o = OBSTACLES[i];
    const cx = Math.max(o.x, Math.min(x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(y, o.y + o.h));
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
  }
  return false;
}

/** Move the circle at (x,y) by (dx,dy), sliding along solids. Returns [x, y]. */
export function moveCircle(x, y, r, dx, dy) {
  if (!hitsSolid(x + dx, y + dy, r)) return [x + dx, y + dy];
  if (!hitsSolid(x + dx, y, r)) return [x + dx, y];
  if (!hitsSolid(x, y + dy, r)) return [x, y + dy];
  return [x, y];
}
