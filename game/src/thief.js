// OPAL HOUR — Kestrel, the thief.
// WASD/arrows to move, Shift to sneak (slower, half as noticeable), E to lift
// the Star from its case, F for a smoke bomb, Q to jam the nearest camera, and
// a mouse click to throw a coin: the ring it draws is exactly how far its sound
// carries, and any guard inside it walks over to look. Every tool has a count;
// spending one is a decision, not a reflex.
import { THIEF, TOOLS } from './config.js';
import { moveCircle } from './move.js';
import { OPAL } from './level.js';

export function createThief() {
  return {
    x: THIEF.spawn.x,
    y: THIEF.spawn.y,
    angle: -Math.PI / 2,
    sneaking: false,
    hasStar: false,
    smoke: TOOLS.smoke,
    jammer: TOOLS.jammer,
    coins: TOOLS.coins,
  };
}

/** Move from a direction vector (dx,dy, already normalised or zero). */
export function stepThief(t, dx, dy, sneaking, dt) {
  t.sneaking = sneaking;
  if (dx === 0 && dy === 0) return;
  const speed = sneaking ? THIEF.sneak : THIEF.run;
  const [nx, ny] = moveCircle(t.x, t.y, THIEF.radius, dx * speed * dt, dy * speed * dt);
  t.x = nx;
  t.y = ny;
  t.angle = Math.atan2(dy, dx);
}

/** Close enough to the Star to lift it? */
export function canGrab(t) {
  return !t.hasStar && Math.hypot(t.x - OPAL.x, t.y - OPAL.y) <= THIEF.grabRange;
}

/** Lift the Star. Returns true when it worked. */
export function grabStar(t) {
  if (!canGrab(t)) return false;
  t.hasStar = true;
  return true;
}
