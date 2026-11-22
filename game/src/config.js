// OPAL HOUR — tuning constants and the gallery layout.
// Everything the other files need to agree on lives here: canvas size, HUD
// geometry, speeds, vision, alarm and tool numbers. One change here retunes the
// whole game; nothing else hard-codes a number that matters.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;

// HUD geometry (the frame the judge sees first).
export const HUD = { top: 56, bottom: 48, panel: 184 };
export const ROOM = { x: 8, y: 64, width: 1080, height: 600 };

// Colours: night gallery — deep blue, warm gold for loot, red for danger.
export const COLOUR = {
  floorA: '#1b2138',
  floorB: '#171c30',
  wall: '#0d1120',
  trim: '#8a6d2f',
  caseFill: '#232c4a',
  caseEdge: '#6b7bb0',
  gold: '#f2c14e',
  goldDim: '#a8832f',
  teal: '#37c8ab',
  danger: '#e5484d',
  amber: '#f5a524',
  safe: '#46c98a',
  ink: '#e8e6df',
  dim: '#9aa3b8',
  panel: 'rgba(10, 13, 26, 0.92)',
  panelEdge: '#3a4568',
};

// The thief: Kestrel. Run fast, sneak slow and half as noticeable.
export const THIEF = {
  radius: 11,
  run: 168,
  sneak: 92,
  grabRange: 75,
  spawn: { x: 95, y: 600 },
};

// Guards: patrol, get suspicious in stages, chase, then investigate.
export const GUARD = {
  radius: 12,
  patrol: 72,
  chase: 138,
  visionRange: 190,
  visionHalf: 0.61, // ~35 degrees each side
  suspectRate: 130, // suspicion per second while the thief is seen
  suspectSneak: 0.5, // multiplier while the thief sneaks
  suspectDecay: 42,
  alertHold: 3.0, // seconds of no sight before giving up the chase
  catchRange: 20,
};

// Cameras: sweep, and a sighting feeds the alarm without ending the run.
export const CAMERA = {
  range: 230,
  half: 0.49, // ~28 degrees each side
  sweep: 0.5, // radians per second at the sweep's fastest point
  alarmRate: 18, // alarm per second while a camera sees the thief
};

// The alarm: 0-100, visible always. Guards on alert feed it; hiding drains it.
export const ALARM = {
  max: 100,
  guardRate: 22, // per second while any guard is alert
  decay: 5, // per second while nobody sees the thief
  grabSpike: 20, // instant jump when the Star is taken
  warnAt: 30, // amber: guards notice 25% faster
  hotAt: 70, // red: guards move 15% faster
};

// Tools, all limited — every spend is a trade-off.
export const TOOLS = {
  smoke: 2, // F: a cloud that blocks all vision for 6 s
  smokeRadius: 92,
  smokeSeconds: 6,
  jammer: 2, // Q: nearest camera dark for 8 s
  jamSeconds: 8,
  jamRange: 320,
  coins: 3, // click: a coin lands with a sound ring; guards investigate
  coinRange: 320,
  coinRing: 120,
  investigateSeconds: 4,
};

// Scoring: time bonus plus a style bonus for staying quiet.
export const SCORE = { base: 1000, timePar: 240, timeEach: 10, ghost: 500, shadow: 250 };
export const BEST_KEY = 'opal-hour-best';
