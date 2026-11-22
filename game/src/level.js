// OPAL HOUR — the Marlow Gallery: one room, three routes.
// The room is the whole play area (ROOM in config.js). Walls are its border;
// cases and the statue block movement and sight. Three lanes cross it:
// the left gallery (cover-heavy), the central hall (open, fast, risky) and the
// right corridor (camera-heavy, past the vault). The Star of Marlow sits in its
// glass case top-right; the EXIT door is bottom-left, where Kestrel starts.
import { ROOM } from './config.js';

export const EXIT_ZONE = { x: 55, y: 615, width: 80, height: 45 };
export const OPAL = { x: 1000, y: 140 };

// Rects that block movement and sight: { x, y, w, h, label }.
export const OBSTACLES = [
  { x: 190, y: 200, w: 60, h: 130, label: 'CASE A' },
  { x: 190, y: 400, w: 60, h: 130, label: 'CASE B' },
  { x: 500, y: 180, w: 90, h: 90, label: 'STATUE' },
  { x: 660, y: 240, w: 130, h: 55, label: 'CASE C' },
  { x: 250, y: 470, w: 60, h: 110, label: 'CASE D' },
  { x: 860, y: 330, w: 60, h: 150, label: 'CASE E' },
  { x: 950, y: 100, w: 100, h: 80, label: 'VAULT' },
  { x: 320, y: 120, w: 34, h: 34, label: 'PILLAR' },
];

// Guards: name, colour, and the patrol loop they walk.
export const GUARD_DEFS = [
  {
    name: 'MARA',
    colour: '#c65b7c',
    patrol: [
      { x: 320, y: 340 },
      { x: 760, y: 340 },
      { x: 760, y: 560 },
      { x: 320, y: 560 },
    ],
  },
  {
    name: 'IVO',
    colour: '#7c9cf5',
    patrol: [
      { x: 140, y: 140 },
      { x: 140, y: 420 },
    ],
  },
  {
    name: 'SABLE',
    colour: '#e0a458',
    patrol: [
      { x: 830, y: 200 },
      { x: 1020, y: 200 },
      { x: 1020, y: 500 },
      { x: 830, y: 500 },
    ],
  },
];

// Cameras: wall mount, base angle (radians, 0 = east), sweep either side.
export const CAMERA_DEFS = [
  { x: 560, y: 70, base: Math.PI / 2, sweep: 0.96, label: 'CAM 1' },
  { x: 1082, y: 240, base: Math.PI, sweep: 1.05, label: 'CAM 2' },
];

// The room's own walls, as segments, for movement and sight.
export function roomWalls() {
  const r = ROOM;
  return [
    { x1: r.x, y1: r.y, x2: r.x + r.width, y2: r.y },
    { x1: r.x + r.width, y1: r.y, x2: r.x + r.width, y2: r.y + r.height },
    { x1: r.x + r.width, y1: r.y + r.height, x2: r.x, y2: r.y + r.height },
    { x1: r.x, y1: r.y + r.height, x2: r.x, y2: r.y },
  ];
}

// Every solid segment in the room: walls plus each obstacle's four sides.
export function solidSegments() {
  const out = roomWalls();
  for (const o of OBSTACLES) {
    out.push({ x1: o.x, y1: o.y, x2: o.x + o.w, y2: o.y });
    out.push({ x1: o.x + o.w, y1: o.y, x2: o.x + o.w, y2: o.y + o.h });
    out.push({ x1: o.x + o.w, y1: o.y + o.h, x2: o.x, y2: o.y + o.h });
    out.push({ x1: o.x, y1: o.y + o.h, x2: o.x, y2: o.y });
  }
  return out;
}
