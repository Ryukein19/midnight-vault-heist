// OPAL HOUR — line of sight and vision cones.
// A cone is a fan of rays from the watcher's eye; each ray stops at the first
// solid segment it hits. The same test answers "can this watcher see that point".
// Nothing here knows about guards or cameras — it is pure geometry, so the
// renderer's cones and the AI's sight checks can never disagree.
import { solidSegments } from './level.js';

const RAYS = 26;

function cross(ax, ay, bx, by) {
  return ax * by - ay * bx;
}

/** Distance along ray (ox,oy)+t*(dx,dy) to segment (x1,y1)-(x2,y2), or Infinity. */
function rayHit(ox, oy, dx, dy, s) {
  const ex = s.x2 - s.x1;
  const ey = s.y2 - s.y1;
  const den = cross(dx, dy, ex, ey);
  if (Math.abs(den) < 1e-9) return Infinity;
  const t = cross(s.x1 - ox, s.y1 - oy, ex, ey) / den;
  const u = cross(s.x1 - ox, s.y1 - oy, dx, dy) / den;
  if (t > 0 && u >= 0 && u <= 1) return t;
  return Infinity;
}

/** Nearest solid along a ray, capped at `max`. */
export function rayDistance(ox, oy, angle, max, segments) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = max;
  for (let i = 0; i < segments.length; i += 1) {
    const d = rayHit(ox, oy, dx, dy, segments[i]);
    if (d < best) best = d;
  }
  return best;
}

function angleTo(x, y, tx, ty) {
  return Math.atan2(ty - y, tx - x);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/**
 * Can the watcher at (x,y), facing `angle` with half-angle `half` and range
 * `range`, see the point (tx,ty)? The point must be inside the cone and the
 * straight line to it must clear every solid. `smoke` is a list of clouds
 * {x,y,r}: sight through a cloud is blocked.
 */
export function canSee(x, y, angle, half, range, tx, ty, smoke) {
  const dx = tx - x;
  const dy = ty - y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (Math.abs(angleDiff(angleTo(x, y, tx, ty), angle)) > half) return false;
  const segments = solidSegments();
  if (rayDistance(x, y, angleTo(x, y, tx, ty), dist, segments) < dist - 1) return false;
  for (let i = 0; i < smoke.length; i += 1) {
    const c = smoke[i];
    if (pointInSmoke(x, y, tx, ty, c)) return false;
  }
  return true;
}

// Does the segment (x,y)-(tx,ty) pass through the smoke cloud c?
function pointInSmoke(x, y, tx, ty, c) {
  const dx = tx - x;
  const dy = ty - y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(x - c.x, y - c.y) < c.r;
  let t = ((c.x - x) * dx + (c.y - y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x + dx * t;
  const py = y + dy * t;
  return Math.hypot(px - c.x, py - c.y) < c.r;
}

/**
 * The cone as a polygon (a fan of ray endpoints) for drawing: the watcher at
 * (x,y), facing `angle`, half-angle `half`, range `range`, clipped by solids.
 */
export function conePolygon(x, y, angle, half, range) {
  const segments = solidSegments();
  const points = [{ x, y }];
  for (let i = 0; i <= RAYS; i += 1) {
    const a = angle - half + (2 * half * i) / RAYS;
    const d = rayDistance(x, y, a, range, segments);
    points.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return points;
}
