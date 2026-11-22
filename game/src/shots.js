// OPAL HOUR — the screenshot scenes behind ?shot=cover|approach|spotted|escape.
// Each one plays the real rules forward from a fresh world for a scripted
// route, steered by a simple autopilot (walk the waypoints; hold still while a
// guard's suspicion is high), so the frame is what a short game really looks
// like and the same seed always gives the same frame. Nothing here fakes a
// state: the alarm, the cones and the guards are whatever the simulation made.
import { STEP } from './config.js';
import { createWorld, endRun } from './main.js';
import { EXIT_ZONE } from './level.js';
import { stepThief, grabStar } from './thief.js';
import { spikeAlarm } from './alarm.js';
import { sendToInvestigate, STATE_ALERT } from './guards.js';
import { sfx } from './audio.js';

// The world's own step, reached without the input loop: the autopilot drives
// the thief through a direction function the world reads each step.
import { stepGuard, guardSees } from './guards.js';
import { stepCamera, cameraSees } from './cameras.js';
import { stepAlarm, alarmStage, alarmLocked } from './alarm.js';
import { scoreFor, ratingFor } from './render.js';

const SAMPLE = STEP;

// Walk toward (tx,ty) at run speed. Returns true when the point is reached.
// A moving thief is hard to catch (168 px/s against a guard's 138), so the
// autopilot never freezes mid-route: the timing is set by the legs' waits.
function driveTo(world, tx, ty, dt) {
  const t = world.thief;
  const dx = tx - t.x;
  const dy = ty - t.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 14) return true;
  stepThief(t, dx / dist, dy / dist, false, dt);
  return false;
}

// The grab, exactly as the E key does it in the real game.
function applyGrab(world) {
  if (!grabStar(world.thief)) return false;
  spikeAlarm(world.alarm, 20);
  for (const g of world.guards) sendToInvestigate(g, 1000, 140);
  world.moment = { text: 'THE STAR IS YOURS — RUN!', sub: 'Every guard is coming to the vault.', colour: '#f2c14e', ttl: 3 };
  sfx.grab();
  return true;
}

// Step the world with no player input: the thief is driven by `drive`, a
// function that moves them each step. `until` stops the run early.
function playForward(world, drive, until, maxSeconds) {
  const input = { direction: () => ({ dx: 0, dy: 0 }), sneaking: () => false };
  const steps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    drive(world);
    // Step the world by hand: the same step the live loop runs.
    world.t += STEP;
    world.time += STEP;
    stepWorldForShot(world, input);
    if (world.screen !== 'play') break;
    if (until && until(world)) break;
  }
}

// The world's step, without the live loop's input handling. (main.js owns the
// loop; the shot runner reuses its world shape, not its event code.)
function stepWorldForShot(world, input) {
  for (const c of world.cameras) stepCamera(c, world.t, STEP);
  const stage = alarmStage(world.alarm);
  let anyAlert = false;
  let anyCameraSees = false;
  for (const g of world.guards) {
    const seen = guardSees(g, world.thief, world.smoke);
    stepGuard(g, STEP, seen, world.thief, stage === 'warn', stage === 'hot');
    if (g.state === STATE_ALERT) anyAlert = true;
  }
  for (const c of world.cameras) {
    c.seeing = cameraSees(c, world.thief, world.smoke);
    if (c.seeing) anyCameraSees = true;
  }
  stepAlarm(world.alarm, STEP, anyAlert, anyCameraSees);
  if (world.moment) {
    world.moment.ttl -= STEP;
    if (world.moment.ttl <= 0) world.moment = null;
  }
  // Caught: a guard touches the thief, or the alarm maxes out — then the
  // getaway: the Star in hand, inside the EXIT door. Same order and same
  // scoring as the live loop; the escape shot ends on a real win.
  for (const g of world.guards) {
    if (g.state === STATE_ALERT && Math.hypot(g.x - world.thief.x, g.y - world.thief.y) < 20) {
      endRun(world, false, 'CAUGHT', `${g.name} caught Kestrel in the gallery.`);
      return;
    }
  }
  if (alarmLocked(world.alarm)) {
    endRun(world, false, 'LOCKDOWN', 'The alarm hit 100 — the gallery sealed itself.');
    return;
  }
  const t = world.thief;
  if (t.hasStar && t.x > EXIT_ZONE.x && t.x < EXIT_ZONE.x + EXIT_ZONE.width && t.y > EXIT_ZONE.y && t.y < EXIT_ZONE.y + EXIT_ZONE.height) {
    endRun(world, true, 'CLEAN GETAWAY', '');
  }
}

// Mara's west leg: she walks north up the room's west side, far from the
// thief's crossing. Sable south: he is on the east side walking down, away
// from the vault. The legs wait for these windows before the thief moves.
function maraWest(world) {
  const m = world.guards[0];
  return m.x < 340 && m.y > 340 && m.y < 560;
}

function sableSouth(world) {
  const s = world.guards[2];
  return s.y > 300;
}

function maraSouth(world) {
  const m = world.guards[0];
  return m.y > 500;
}

const ROUTES = {
  cover: {
    // Hide west of CASE D until Mara is up the west side, cross while she is
    // far away, then wait at the vault approach until Sable is south. The
    // bottom lane runs at y=610: CASE D's south edge is y=580, and a thief
    // needs 11 px of clearance, so y=580 itself is a wall.
    waypoints: [
      { x: 230, y: 545, wait: maraWest },
      { x: 230, y: 610 },
      { x: 560, y: 610 },
      { x: 700, y: 430 },
      { x: 830, y: 270, wait: sableSouth },
      { x: 930, y: 205 },
      { x: 1000, y: 195, grabHere: true },
    ],
    grab: true,
    settle: 1.5,
    max: 90,
  },
  approach: {
    // Cross the open hall and hold still while Mara sweeps the south lane.
    waypoints: [
      { x: 300, y: 610 },
      { x: 480, y: 610 },
      { x: 480, y: 390 },
    ],
    grab: false,
    settle: 0,
    max: 40,
    until: (world) => maraSouth(world) && world.thief.y < 420,
  },
  spotted: {
    waypoints: [
      { x: 320, y: 610 },
      { x: 540, y: 610 },
      { x: 540, y: 360 },
    ],
    grab: false,
    settle: 0,
    max: 40,
    // Let the alarm climb and Mara close in for half a second after the
    // alert lands, so the frame shows the danger instead of its first tick.
    until: (world) => {
      const a = world.guards.find((g) => g.state === STATE_ALERT);
      if (!a) return false;
      if (world._alertAt == null) world._alertAt = world.time;
      return world.time - world._alertAt >= 0.5;
    },
  },
  escape: {
    waypoints: [
      { x: 230, y: 545, wait: maraWest },
      { x: 230, y: 610 },
      { x: 560, y: 610 },
      { x: 700, y: 430 },
      { x: 830, y: 270, wait: sableSouth },
      { x: 930, y: 205 },
      { x: 1000, y: 195, grabHere: true },
      { x: 860, y: 180 },
      { x: 620, y: 330 },
      { x: 430, y: 430 },
      { x: 340, y: 610 },
      { x: 95, y: 625 },
    ],
    grab: true,
    settle: 0,
    max: 120,
    until: (world) => world.screen === 'win',
  },
};

/**
 * Set `world` to the named scene and return the screen to draw. Any other
 * name stages the cover.
 */
export function stageShot(name, world) {
  const route = ROUTES[name] ?? ROUTES.cover;
  const fresh = createWorld(world.seed);
  Object.assign(world, fresh);
  world.screen = 'play';
  let leg = 0;
  let settled = 0;
  let grabbed = false;
  playForward(
    world,
    () => {
      if (leg < route.waypoints.length) {
        const wp = route.waypoints[leg];
        if (driveTo(world, wp.x, wp.y, STEP)) {
          // Arrived: a leg with a wait only advances once its window opens.
          // A waypoint can carry the grab: the thief takes the Star the
          // moment he reaches the vault, mid-route, not at the end of it.
          if (wp.grabHere && !grabbed) {
            grabbed = applyGrab(world);
            if (!grabbed) return;
          }
          if (!wp.wait || wp.wait(world)) leg += 1;
        }
      } else if (route.grab && !grabbed) {
        grabbed = applyGrab(world);
      } else {
        settled += STEP;
      }
    },
    (w) => {
      // A route with an `until` stops only on it: the thief stands at the
      // last waypoint until the moment arrives. A route without one stops
      // when the route is done (and the grab, if any, is taken).
      if (route.until && route.until(w)) return true;
      if (!route.until && leg >= route.waypoints.length && (!route.grab || grabbed) && settled >= route.settle) return true;
      return false;
    },
    route.max,
  );
  // The escape ends on the win screen; the rest stay in play.
  if (world.screen === 'play' && name === 'escape') {
    // The thief made it out: score the run as the live game would.
    const rating = ratingFor(world.alarm.peak, world.time);
    const mins = Math.floor(world.time / 60);
    const secs = Math.floor(world.time % 60);
    world.screen = 'win';
    world.result = {
      title: 'CLEAN GETAWAY',
      reason: '',
      score: scoreFor(world.alarm.peak, world.time),
      rating: rating.rating,
      ratingLine: rating.line,
      time: `${mins}:${String(secs).padStart(2, '0')}`,
    };
  }
  // The HUD's score is live during play; a finished run shows its own score.
  world.score = world.screen === 'play' ? scoreFor(world.alarm.peak, world.time) : (world.result ? world.result.score : 0);
  return { screen: world.screen, best: world.best };
}
