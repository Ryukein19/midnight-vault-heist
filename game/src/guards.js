// OPAL HOUR — the guards: Mara, Ivo and Sable.
// Each guard walks a patrol loop and watches a cone. Detection runs in stages,
// never a snap: suspicion fills while the thief is seen (half as fast while the
// thief sneaks), decays out of sight, and only a full meter turns the guard
// alert. An alert guard chases the thief's position; losing sight for a while
// sends them to investigate the last place they saw the thief, then back to
// patrol. A thrown coin pulls nearby guards to its sound ring instead.
import { GUARD } from './config.js';
import { canSee } from './vision.js';
import { moveCircle } from './move.js';

export const STATE_PATROL = 'patrol';
export const STATE_SUSPICIOUS = 'suspicious';
export const STATE_ALERT = 'alert';
export const STATE_INVESTIGATE = 'investigate';

export function createGuard(def, phase) {
  const start = def.patrol[0];
  return {
    name: def.name,
    colour: def.colour,
    patrol: def.patrol,
    leg: 0,
    x: start.x,
    y: start.y,
    angle: 0,
    state: STATE_PATROL,
    suspicion: 0,
    noSight: 0,
    investigate: null,
    investigateTimer: 0,
    phase,
  };
}

function angleTo(x, y, tx, ty) {
  return Math.atan2(ty - y, tx - x);
}

function turnToward(g, target, rate, dt) {
  let d = target - g.angle;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const step = Math.max(-rate * dt, Math.min(rate * dt, d));
  g.angle += step;
}

function walkToward(g, tx, ty, speed, dt) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const [nx, ny] = moveCircle(g.x, g.y, GUARD.radius, (dx / dist) * step, (dy / dist) * step);
  g.x = nx;
  g.y = ny;
  turnToward(g, angleTo(g.x, g.y, tx, ty), 10, dt);
  return dist - step < 6;
}

/** One fixed step. `seen` says whether this guard sees the thief right now. */
export function stepGuard(g, dt, seen, thief, alarmHot, alertBoost) {
  const speedMul = alertBoost ? 1.15 : 1;
  if (seen) {
    g.suspicion += GUARD.suspectRate * (thief.sneaking ? GUARD.suspectSneak : 1) * (alarmHot ? 1.25 : 1) * dt;
    g.noSight = 0;
  } else {
    g.suspicion = Math.max(0, g.suspicion - GUARD.suspectDecay * dt);
    g.noSight += dt;
  }
  if (g.suspicion >= 100 && g.state !== STATE_ALERT) {
    g.state = STATE_ALERT;
    g.noSight = 0;
  }

  if (g.state === STATE_ALERT) {
    if (seen) {
      walkToward(g, thief.x, thief.y, GUARD.chase * speedMul, dt);
      g.investigate = { x: thief.x, y: thief.y };
    } else if (g.noSight > GUARD.alertHold) {
      g.state = STATE_INVESTIGATE;
      g.investigateTimer = 5;
    } else if (g.investigate) {
      // Keep closing on the last place the thief was seen.
      walkToward(g, g.investigate.x, g.investigate.y, GUARD.chase * speedMul, dt);
    }
    return;
  }

  if (g.state === STATE_INVESTIGATE) {
    if (g.investigate && walkToward(g, g.investigate.x, g.investigate.y, GUARD.patrol * speedMul, dt)) {
      g.investigateTimer -= dt;
      if (g.investigateTimer <= 0) {
        g.state = STATE_PATROL;
        g.investigate = null;
        g.suspicion = 0;
      }
    }
    return;
  }

  // Patrol (or suspicious, which still patrols, just warier).
  if (g.suspicion > 25) g.state = STATE_SUSPICIOUS;
  else if (g.state === STATE_SUSPICIOUS) g.state = STATE_PATROL;
  const target = g.patrol[(g.leg + 1) % g.patrol.length];
  if (walkToward(g, target.x, target.y, GUARD.patrol * speedMul, dt)) {
    g.leg = (g.leg + 1) % g.patrol.length;
  }
}

/** Send a guard to investigate a point (a coin's sound ring, or the vault). */
export function sendToInvestigate(g, x, y) {
  if (g.state === STATE_ALERT) return;
  g.state = STATE_INVESTIGATE;
  g.investigate = { x, y };
  g.investigateTimer = 5;
}

/** Does this guard see the thief? (Smoke clouds block sight.) */
export function guardSees(g, thief, smoke) {
  return canSee(g.x, g.y, g.angle, GUARD.visionHalf, GUARD.visionRange, thief.x, thief.y, smoke);
}
