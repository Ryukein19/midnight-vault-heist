# OPAL HOUR — Steal the Star of Marlow

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![make.fun · best-heist-game-20261122-0559 rank](https://make.fun/badge/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![make.fun · best-heist-game-20261122-0559 reward](https://make.fun/badge/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down stealth heist game for the make.fun bounty
`best-heist-game-20261122-0559`. One gallery, one night, one opal.

**1 gallery · 3 guards · 2 cameras · 3 tools · 1 getaway**

You are Kestrel, a thief crossing the Marlow Gallery after dark. Read the guards'
vision cones, slip past the sweeping cameras, lift the Star of Marlow from its glass
case — and get out before the alarm hits 100.

- **WIN:** steal the Star and reach the EXIT door.
- **LOSE:** the alarm reaches 100, or a guard catches you.
- **Tools (limited charges):** smoke bomb `F` (×2), camera jammer `Q` (×2),
  coin throw — click to toss (×3, guards investigate the sound ring).
- **Sneak** with `Shift` — slower, but guards notice you half as fast.

## Play

Serve `game/` with any static server (or `node serve.ts`) and open
http://localhost:8080 in desktop Chrome. No network requests, no build step.

- `WASD` / arrows — move
- `Shift` — sneak
- `E` — grab the Star (near its case)
- `F` — smoke bomb · `Q` — jam nearest camera · mouse click — throw a coin
- `P` — pause · `M` — sound on/off · `Space` / click — start / restart

## Layout

- `main.ts` — the hand-in program: copies `game/` + `screenshots/` to `/output` and
  writes `dossier.json` with the vendored make.fun library.
- `game/` — the playable game as static files (`index.html` + `src/*.js`, Canvas 2D,
  no libraries, no network).
- `game/src/` — one file per job: `config` (tuning), `level` (the gallery),
  `vision` (line of sight + cones), `guards` (patrol/suspicion/chase AI),
  `cameras` (sweep + jam), `thief` (movement + tools), `alarm` (the meter),
  `audio` (WebAudio bleeps), `render` (all drawing), `shots` (screenshot staging),
  `input` (keyboard + mouse), `main` (boot + loop).
- `screenshots/` — 4 real renders of the game's own code (see `shots.json`).
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
