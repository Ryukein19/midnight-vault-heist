// OPAL HOUR — boot and the one loop.
// The world is one object: the thief, three guards, two cameras, the alarm,
// smoke clouds, thrown coins and their sound rings, the score and the clock.
// The loop steps it in fixed 1/60 s slices, asks the renderer to paint, and
// moves between five screens: title, play, paused, win and lose.
//
// ?seed=N fixes the patrol phases. ?shot=cover|approach|spotted|escape (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP, TOOLS, ROOM } from './config.js';
import { GUARD_DEFS, CAMERA_DEFS, EXIT_ZONE } from './level.js';
import { createThief, stepThief, canGrab, grabStar } from './thief.js';
import { createGuard, stepGuard, sendToInvestigate, guardSees, STATE_ALERT } from './guards.js';
import { createCamera, stepCamera, cameraSees, jamNearest } from './cameras.js';
import { createAlarm, stepAlarm, spikeAlarm, alarmStage, alarmLocked } from './alarm.js';
import { createRenderer, ratingFor, scoreFor, readBest, saveBest } from './render.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_GRAB, ACTION_SMOKE, ACTION_JAM, ACTION_SOUND } from './input.js';
import { sfx, setSound, soundOn } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

// A small seeded generator: patrol phases and camera phases vary per seed, and
// a fixed seed always plays the same room.
function mulberry32(a) {
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld(seedValue) {
  const rng = mulberry32(seedValue);
  return {
    seed: seedValue,
    t: 0,
    time: 0,
    thief: createThief(),
    guards: GUARD_DEFS.map((d) => createGuard(d, rng() * Math.PI * 2)),
    cameras: CAMERA_DEFS.map((d) => createCamera(d, rng() * Math.PI * 2)),
    alarm: createAlarm(),
    smoke: [],
    coins: [],
    rings: [],
    score: 0,
    best: readBest(),
    screen: 'title',
    moment: null,
    result: null,
  };
}

function showMoment(world, text, sub, colour, seconds) {
  world.moment = { text, sub: sub ?? '', colour, ttl: seconds ?? 2.5 };
}

function liveScore(world) {
  return scoreFor(world.alarm.peak, world.time);
}

export function endRun(world, win, title, reason) {
  world.screen = win ? 'win' : 'lose';
  const score = liveScore(world);
  world.score = score;
  if (score > world.best) {
    world.best = score;
    saveBest(score);
  }
  const rating = ratingFor(world.alarm.peak, world.time);
  const mins = Math.floor(world.time / 60);
  const secs = Math.floor(world.time % 60);
  world.result = {
    title,
    reason,
    score,
    rating: rating.rating,
    ratingLine: rating.line,
    time: `${mins}:${String(secs).padStart(2, '0')}`,
  };
  if (win) sfx.win();
  else sfx.lose();
}

function stepWorld(world, dt, input) {
  world.t += dt;
  if (world.screen !== 'play') return;
  world.time += dt;
  const dir = input.direction();
  stepThief(world.thief, dir.dx, dir.dy, input.sneaking(), dt);

  // Cameras sweep; guards watch.
  for (const c of world.cameras) stepCamera(c, world.t, dt);
  const stage = alarmStage(world.alarm);
  let anyAlert = false;
  let anyCameraSees = false;
  let spottedNow = false;
  for (const g of world.guards) {
    const seen = guardSees(g, world.thief, world.smoke);
    if (seen && g.state !== STATE_ALERT) spottedNow = true;
    if (g.state === STATE_ALERT) anyAlert = true;
    stepGuard(g, dt, seen, world.thief, stage === 'warn', stage === 'hot');
    if (g.state === STATE_ALERT) anyAlert = true;
  }
  for (const c of world.cameras) {
    c.seeing = cameraSees(c, world.thief, world.smoke);
    if (c.seeing) anyCameraSees = true;
  }
  stepAlarm(world.alarm, dt, anyAlert, anyCameraSees);
  if (spottedNow) {
    showMoment(world, 'SPOTTED!', 'Break line of sight — now.', '#e5484d', 1.6);
    sfx.spotted();
  }

  // Smoke and rings fade.
  for (let i = world.smoke.length - 1; i >= 0; i -= 1) {
    world.smoke[i].ttl -= dt;
    if (world.smoke[i].ttl <= 0) world.smoke.splice(i, 1);
  }
  for (let i = world.rings.length - 1; i >= 0; i -= 1) {
    world.rings[i].ttl -= dt;
    if (world.rings[i].ttl <= 0) world.rings.splice(i, 1);
  }
  if (world.moment) {
    world.moment.ttl -= dt;
    if (world.moment.ttl <= 0) world.moment = null;
  }

  // Caught: a guard touches the thief, or the alarm maxes out.
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

  // The getaway: the Star in hand, inside the EXIT door.
  const t = world.thief;
  if (t.hasStar && t.x > EXIT_ZONE.x && t.x < EXIT_ZONE.x + EXIT_ZONE.width && t.y > EXIT_ZONE.y && t.y < EXIT_ZONE.y + EXIT_ZONE.height) {
    endRun(world, true, 'CLEAN GETAWAY', '');
  }
}

function handleActions(world, input) {
  const actions = input.takeActions();
  const click = input.takeClick();
  if (actions & ACTION_SOUND) setSound(!soundOn());
  if (world.screen === 'title' || world.screen === 'win' || world.screen === 'lose') {
    if (actions & ACTION_CONFIRM || click) {
      const fresh = createWorld(world.seed);
      Object.assign(world, fresh, { best: world.best });
      world.screen = 'play';
      showMoment(world, 'STEAL THE STAR', 'Reach the vault. Mind the cones.', '#f2c14e', 2.5);
    }
    return;
  }
  if (actions & ACTION_PAUSE) {
    world.screen = world.screen === 'play' ? 'paused' : 'play';
    return;
  }
  if (world.screen !== 'play') return;
  const t = world.thief;
  if (actions & ACTION_GRAB && canGrab(t)) {
    if (grabStar(t)) {
      spikeAlarm(world.alarm, 20);
      for (const g of world.guards) sendToInvestigate(g, 1000, 140);
      showMoment(world, 'THE STAR IS YOURS — RUN!', 'Every guard is coming to the vault.', '#f2c14e', 3);
      sfx.grab();
    }
  }
  if (actions & ACTION_SMOKE && t.smoke > 0) {
    t.smoke -= 1;
    world.smoke.push({ x: t.x, y: t.y, r: TOOLS.smokeRadius, ttl: TOOLS.smokeSeconds });
    showMoment(world, 'SMOKE!', 'No eyes can see through it.', '#9aa3b8', 1.4);
    sfx.smoke();
  }
  if (actions & ACTION_JAM && t.jammer > 0) {
    const cam = jamNearest(world.cameras, t.x, t.y);
    if (cam) {
      t.jammer -= 1;
      showMoment(world, `${cam.label} JAMMED`, 'Eight seconds of blind camera.', '#37c8ab', 1.6);
      sfx.jam();
    }
  }
  if (click && t.coins > 0) {
    const dx = click.x - t.x;
    const dy = click.y - t.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 8 && dist <= TOOLS.coinRange && click.x > ROOM.x && click.x < ROOM.x + ROOM.width && click.y > ROOM.y && click.y < ROOM.y + ROOM.height) {
      t.coins -= 1;
      const cx = t.x + (dx / dist) * Math.min(dist, TOOLS.coinRange);
      const cy = t.y + (dy / dist) * Math.min(dist, TOOLS.coinRange);
      world.coins.push({ x: cx, y: cy, ttl: 5 });
      world.rings.push({ x: cx, y: cy, r: TOOLS.coinRing, ttl: 1.2 });
      for (const g of world.guards) {
        if (Math.hypot(g.x - cx, g.y - cy) < 280) sendToInvestigate(g, cx, cy);
      }
      sfx.coin();
    }
  }
}

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);

function runShot(name) {
  const scene = stageShot(name, world);
  world.screen = scene.screen;
  let painted = 0;
  function paint() {
    renderer.draw(world);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions(world, input);
    while (accumulator >= STEP && world.screen === 'play') {
      stepWorld(world, STEP, input);
      accumulator -= STEP;
    }
    if (world.screen !== 'play') accumulator = 0;
    world.score = world.screen === 'play' ? liveScore(world) : world.score;
    renderer.draw(world);
  }

  announce('Opal Hour. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
