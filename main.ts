// OPAL HOUR — the hand-in program (Node 22, standard library only).
//
// The game is this directory's game/ folder: plain static files a desktop browser
// loads offline (game/index.html and its ES modules, no library, no network
// request). This program copies game/ and screenshots/ from beside this file to
// /output and writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library (vendor/makefun-game.ts, unchanged from the kit).
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program is deterministic: two runs write the same bytes.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly instead of shipping a bad entry: the game must open, and the
// screenshots must exist and fit the caps the dossier enforces. Without this
// a missing screenshots/ folder would copy nothing and the dossier would
// quietly claim zero screenshots — an entry the scorer refuses.
if (!existsSync(join(here, 'game', 'index.html'))) throw new Error('game/index.html is missing');
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing');
const shots = readdirSync(shotsDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
if (shots.length === 0) throw new Error('screenshots/ has no images');
if (shots.length > 4) throw new Error(`screenshots/ has ${shots.length} images, the cap is 4`);
for (const shot of shots) {
  const size = statSync(join(shotsDir, shot)).size;
  if (size > 262144) throw new Error(`${shot} is ${size} bytes, over the 256 KiB cap`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps: only text_max_bytes shapes the bytes; the others refuse an
// entry the scorer would refuse (more than 4 screenshots or one over 256 KiB; more
// than 993 files in game/ or 48 MiB of game files in all, or a path under game/
// over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
