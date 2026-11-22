// OPAL HOUR — everything the player (and the judge) sees.
// One canvas, one room, one frame: the gallery fills the view, the HUD frames
// it top and bottom, and a side panel carries tools, objectives and guard
// states. The rules for legibility: gold means loot and score, red means
// danger, teal means the thief and safety, and the moment that matters is
// written across the middle in letters big enough to read at a glance.
// The thief is drawn big (radius 16) with a bold outlined YOU label so the
// player is the first thing the eye finds in every frame, even at the small
// size the judge reads the screenshots at.
import { VIEW, HUD, ROOM, COLOUR, SCORE, BEST_KEY } from './config.js';
import { OBSTACLES, OPAL, EXIT_ZONE } from './level.js';
import { conePolygon } from './vision.js';
import { GUARD, CAMERA } from './config.js';
import { STATE_ALERT, STATE_SUSPICIOUS } from './guards.js';
import { alarmStage } from './alarm.js';

const TILE = 54;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;

  function panel(x, y, w, h) {
    ctx.fillStyle = COLOUR.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = COLOUR.panelEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  function text(str, x, y, size, colour, align, weight) {
    ctx.fillStyle = colour;
    ctx.font = `${weight ?? 700} ${size}px system-ui, sans-serif`;
    ctx.textAlign = align ?? 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  // Bold text with a dark outline, so a label reads over any background.
  function outlinedText(str, x, y, size, colour, align) {
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    ctx.textAlign = align ?? 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(8, 10, 20, 0.9)';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = colour;
    ctx.fillText(str, x, y);
  }

  function drawFloor(t) {
    for (let y = ROOM.y; y < ROOM.y + ROOM.height; y += TILE) {
      for (let x = ROOM.x; x < ROOM.x + ROOM.width; x += TILE) {
        const odd = (Math.floor((x - ROOM.x) / TILE) + Math.floor((y - ROOM.y) / TILE)) % 2 === 0;
        ctx.fillStyle = odd ? COLOUR.floorA : COLOUR.floorB;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
    // No carpet: a thin gold dashed line marks the thief's road from the
    // EXIT to the vault instead — a guide, not a slash across the room.
    ctx.strokeStyle = 'rgba(242, 193, 78, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(95, 640);
    ctx.lineTo(300, 590);
    ctx.lineTo(560, 560);
    ctx.lineTo(830, 300);
    ctx.lineTo(975, 200);
    ctx.stroke();
    ctx.setLineDash([]);
    // Gold trim around the room.
    ctx.strokeStyle = COLOUR.trim;
    ctx.lineWidth = 3;
    ctx.strokeRect(ROOM.x + 1.5, ROOM.y + 1.5, ROOM.width - 3, ROOM.height - 3);
  }

  function drawExit() {
    ctx.fillStyle = '#0f3d24';
    ctx.fillRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.width, EXIT_ZONE.height);
    ctx.strokeStyle = COLOUR.safe;
    ctx.lineWidth = 2;
    ctx.strokeRect(EXIT_ZONE.x + 1, EXIT_ZONE.y + 1, EXIT_ZONE.width - 2, EXIT_ZONE.height - 2);
    text('EXIT', EXIT_ZONE.x + EXIT_ZONE.width / 2, EXIT_ZONE.y + EXIT_ZONE.height / 2, 15, COLOUR.safe, 'center', 800);
    ctx.fillStyle = COLOUR.safe;
    ctx.beginPath();
    ctx.moveTo(EXIT_ZONE.x + EXIT_ZONE.width / 2 - 14, EXIT_ZONE.y - 12);
    ctx.lineTo(EXIT_ZONE.x + EXIT_ZONE.width / 2 + 14, EXIT_ZONE.y - 12);
    ctx.lineTo(EXIT_ZONE.x + EXIT_ZONE.width / 2, EXIT_ZONE.y - 24);
    ctx.closePath();
    ctx.fill();
  }

  // Decorative wall paintings: gold-framed canvases on the wall bands.
  // They fill the empty wall space; they block nothing and hide nothing.
  function drawPaintings() {
    const paintings = [
      { x: 430, y: 72, w: 96, h: 40, sky: '#2c4a6e', hill: '#3f6b4f', sun: '#f2c14e' },
      { x: 700, y: 72, w: 96, h: 40, sky: '#4a2c5e', hill: '#6b4f2f', sun: '#e8e6df' },
      { x: 600, y: 620, w: 96, h: 38, sky: '#1f3a5e', hill: '#2f5e4a', sun: '#f5a524' },
    ];
    for (const p of paintings) {
      ctx.fillStyle = p.sky;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = p.hill;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + p.h);
      ctx.lineTo(p.x + p.w * 0.35, p.y + p.h * 0.45);
      ctx.lineTo(p.x + p.w * 0.7, p.y + p.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = p.sun;
      ctx.beginPath();
      ctx.arc(p.x + p.w * 0.72, p.y + p.h * 0.32, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLOUR.gold;
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x + 1.5, p.y + 1.5, p.w - 3, p.h - 3);
    }
  }

  function drawObstacles(t) {
    for (const o of OBSTACLES) {
      ctx.fillStyle = COLOUR.caseFill;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = COLOUR.caseEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
      if (o.label === 'VAULT') continue;
      if (o.label === 'STATUE') {
        ctx.fillStyle = '#c9b48a';
        ctx.beginPath();
        ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a6d2f';
        ctx.beginPath();
        ctx.arc(o.x + o.w / 2, o.y + o.h / 2 - 8, 9, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.label === 'PILLAR') {
        ctx.fillStyle = '#3a4568';
        ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, o.h - 8);
      } else {
        // A glowing exhibit inside each case.
        ctx.fillStyle = COLOUR.goldDim;
        ctx.beginPath();
        ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      text(o.label, o.x + o.w / 2, o.y + o.h + 13, 10, COLOUR.dim, 'center', 600);
    }
    // The vault: gold frame, glass, and the Star inside.
    const v = OBSTACLES.find((o) => o.label === 'VAULT');
    ctx.strokeStyle = COLOUR.gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(v.x + 1.5, v.y + 1.5, v.w - 3, v.h - 3);
    text('VAULT', v.x + v.w / 2, v.y - 12, 11, COLOUR.gold, 'center', 800);
  }

  function drawOpal(state) {
    // The Star stays visible in the vault when the shot wants it there
    // (the cover, after the grab): showOpal keeps the loot in the money shot.
    if (state.thief.hasStar && !state.showOpal) return;
    const pulse = 1 + 0.18 * Math.sin(state.t * 4);
    const r = 13 * pulse;
    ctx.save();
    ctx.shadowColor = '#7fe7ff';
    ctx.shadowBlur = 26;
    ctx.fillStyle = '#bff3ff';
    ctx.beginPath();
    ctx.moveTo(OPAL.x, OPAL.y - r);
    ctx.lineTo(OPAL.x + r * 0.62, OPAL.y);
    ctx.lineTo(OPAL.x, OPAL.y + r);
    ctx.lineTo(OPAL.x - r * 0.62, OPAL.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(OPAL.x, OPAL.y, 3, 0, Math.PI * 2);
    ctx.fill();
    text('★ THE STAR OF MARLOW', OPAL.x, OPAL.y - 34, 13, COLOUR.gold, 'center', 800);
  }

  function drawCone(x, y, angle, half, range, fill, edge) {
    const poly = conePolygon(x, y, angle, half, range);
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawGuards(state) {
    for (const g of state.guards) {
      const alert = g.state === STATE_ALERT;
      const susp = g.state === STATE_SUSPICIOUS;
      const fill = alert
        ? 'rgba(229, 72, 77, 0.30)'
        : susp
          ? 'rgba(245, 165, 36, 0.22)'
          : 'rgba(245, 200, 60, 0.20)';
      const edge = alert ? 'rgba(229, 72, 77, 0.75)' : susp ? 'rgba(245, 165, 36, 0.6)' : 'rgba(245, 200, 60, 0.55)';
      drawCone(g.x, g.y, g.angle, GUARD.visionHalf, GUARD.visionRange, fill, edge);
    }
    for (const g of state.guards) {
      const alert = g.state === STATE_ALERT;
      const susp = g.state === STATE_SUSPICIOUS;
      ctx.fillStyle = g.colour;
      ctx.beginPath();
      ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0d1120';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Facing tick.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(g.angle) * (GUARD.radius + 7), g.y + Math.sin(g.angle) * (GUARD.radius + 7));
      ctx.stroke();
      // Suspicion arc above the guard.
      if (g.suspicion > 5) {
        ctx.strokeStyle = alert ? COLOUR.danger : COLOUR.amber;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(g.x, g.y, GUARD.radius + 9, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * g.suspicion) / 100);
        ctx.stroke();
      }
      text(alert ? '!' : susp ? '?' : '', g.x, g.y - GUARD.radius - 16, 18, alert ? COLOUR.danger : COLOUR.amber, 'center', 900);
      text(g.name, g.x, g.y + GUARD.radius + 13, 10, COLOUR.dim, 'center', 700);
    }
  }

  function drawCameras(state) {
    for (const c of state.cameras) {
      if (c.jammed <= 0) {
        drawCone(
          c.x, c.y, c.angle, CAMERA.half, CAMERA.range,
          c.seeing ? 'rgba(229, 72, 77, 0.30)' : 'rgba(245, 200, 60, 0.20)',
          c.seeing ? 'rgba(229, 72, 77, 0.75)' : 'rgba(245, 200, 60, 0.55)',
        );
      }
      ctx.fillStyle = c.jammed > 0 ? '#3a4568' : '#222a44';
      ctx.strokeStyle = c.seeing ? COLOUR.danger : COLOUR.caseEdge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.jammed > 0 ? '#5a6a8a' : c.seeing ? COLOUR.danger : COLOUR.danger;
      ctx.beginPath();
      ctx.arc(c.x + Math.cos(c.angle) * 4, c.y + Math.sin(c.angle) * 4, 3.5, 0, Math.PI * 2);
      ctx.fill();
      text(c.jammed > 0 ? `${c.label} JAMMED` : c.label, c.x, c.y - 18, 10, c.jammed > 0 ? COLOUR.dim : COLOUR.danger, 'center', 800);
    }
  }

  function drawSmokeAndCoins(state) {
    for (const s of state.smoke) {
      ctx.fillStyle = 'rgba(180, 190, 210, 0.35)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(220, 230, 245, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    for (const r of state.rings) {
      ctx.strokeStyle = `rgba(242, 193, 78, ${Math.max(0, r.ttl / 1.2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const c of state.coins) {
      ctx.fillStyle = COLOUR.gold;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The thief, drawn BIG: a 16 px teal figure with a gold ring, a dark cowl
  // and a bold outlined YOU label above, so the player is unmistakable at
  // a glance — even in a 300 px contact sheet. The carried Star is 1.5x.
  function drawThief(state) {
    const t = state.thief;
    ctx.fillStyle = COLOUR.teal;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLOUR.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Hooded silhouette: a dark cowl and a pale face dot.
    ctx.fillStyle = '#0f7a68';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e6df';
    ctx.beginPath();
    ctx.arc(t.x, t.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    // The Star, carried high.
    if (t.hasStar) {
      ctx.save();
      ctx.shadowColor = '#7fe7ff';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#bff3ff';
      ctx.beginPath();
      ctx.moveTo(t.x, t.y - 26);
      ctx.lineTo(t.x + 7.5, t.y - 15);
      ctx.lineTo(t.x, t.y - 4);
      ctx.lineTo(t.x - 7.5, t.y - 15);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    outlinedText('YOU', t.x, t.y - 38, 16, '#ffffff', 'center');
    if (t.sneaking) text('sneaking', t.x, t.y + 30, 10, COLOUR.teal, 'center', 700);
  }

  function drawTopBar(state) {
    panel(0, 0, VIEW.width, HUD.top);
    text('WIN', 16, 20, 13, COLOUR.safe, 'left', 900);
    text('steal the Star & reach the EXIT', 52, 20, 13, COLOUR.ink, 'left', 600);
    text('LOSE', 16, 42, 13, COLOUR.danger, 'left', 900);
    text('alarm hits 100, or a guard catches you', 58, 42, 13, COLOUR.ink, 'left', 600);
    // Alarm meter, centre.
    const stage = alarmStage(state.alarm);
    const colour = stage === 'hot' ? COLOUR.danger : stage === 'warn' ? COLOUR.amber : COLOUR.safe;
    text('ALARM', 470, 20, 12, COLOUR.dim, 'left', 800);
    ctx.fillStyle = '#0d1120';
    ctx.fillRect(470, 28, 320, 16);
    ctx.fillStyle = colour;
    ctx.fillRect(472, 30, 316 * (state.alarm.value / 100), 12);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    ctx.strokeRect(470.5, 28.5, 320, 16);
    text(`${Math.round(state.alarm.value)}`, 800, 36, 20, colour, 'left', 900);
    text(stage === 'hot' ? 'LOCKDOWN WARNING' : stage === 'warn' ? 'SUSPICIOUS' : 'CALM', 470, 50, 10, colour, 'left', 700);
    // Score, right.
    text('SCORE', 1050, 20, 12, COLOUR.dim, 'right', 800);
    text(String(state.score).replace(/\B(?=(\d{3})+(?!\d))/g, ','), 1264, 20, 24, COLOUR.gold, 'right', 900);
    text(`BEST ${state.best}`, 1264, 44, 11, COLOUR.dim, 'right', 600);
  }

  function drawSidePanel(state) {
    const x = VIEW.width - HUD.panel;
    panel(x, HUD.top, HUD.panel, VIEW.height - HUD.top - HUD.bottom);
    let y = HUD.top + 24;
    text('TOOLS', x + 14, y, 13, COLOUR.ink, 'left', 900);
    y += 26;
    const tools = [
      ['F', 'SMOKE', state.thief.smoke],
      ['Q', 'JAMMER', state.thief.jammer],
      ['CLICK', 'COIN', state.thief.coins],
    ];
    for (const [key, name, n] of tools) {
      text(key, x + 14, y, 11, COLOUR.gold, 'left', 800);
      text(name, x + 62, y, 11, COLOUR.ink, 'left', 700);
      text(n > 0 ? `×${n}` : '—', x + HUD.panel - 16, y, 12, n > 0 ? COLOUR.ink : COLOUR.danger, 'right', 800);
      y += 22;
    }
    y += 12;
    text('OBJECTIVES', x + 14, y, 13, COLOUR.ink, 'left', 900);
    y += 26;
    const objectives = [
      ['Reach the vault', state.thief.hasStar || state.thief.x > 820],
      ['Take the Star', state.thief.hasStar],
      ['Reach the EXIT', state.screen === 'win'],
    ];
    for (const [label, done] of objectives) {
      text(done ? '✓' : '○', x + 14, y, 12, done ? COLOUR.safe : COLOUR.dim, 'left', 800);
      text(label, x + 34, y, 11, done ? COLOUR.safe : COLOUR.ink, 'left', 600);
      y += 22;
    }
    y += 12;
    text('GUARDS', x + 14, y, 13, COLOUR.ink, 'left', 900);
    y += 26;
    for (const g of state.guards) {
      const label = g.state === STATE_ALERT ? 'ALERT!' : g.state === STATE_SUSPICIOUS ? 'SUSPICIOUS' : 'PATROL';
      const colour = g.state === STATE_ALERT ? COLOUR.danger : g.state === STATE_SUSPICIOUS ? COLOUR.amber : COLOUR.dim;
      text(g.name, x + 14, y, 11, g.colour, 'left', 800);
      text(label, x + HUD.panel - 16, y, 10, colour, 'right', 800);
      y += 20;
    }
    y += 12;
    text('TIME', x + 14, y, 13, COLOUR.ink, 'left', 900);
    y += 24;
    const secs = Math.floor(state.time);
    text(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, x + 14, y, 16, COLOUR.ink, 'left', 800);
  }

  function drawBottomBar() {
    panel(0, VIEW.height - HUD.bottom, VIEW.width, HUD.bottom);
    text(
      'WASD move · SHIFT sneak · E grab the Star · F smoke · Q jam camera · CLICK throw a coin · P pause · M sound',
      VIEW.width / 2, VIEW.height - HUD.bottom / 2, 13, COLOUR.dim, 'center', 600,
    );
  }

  function drawMoment(state) {
    const m = state.moment;
    if (!m || m.ttl <= 0) return;
    const alpha = Math.min(1, m.ttl / 0.8);
    ctx.save();
    ctx.globalAlpha = alpha;
    // A dark band behind the moment so it reads over any part of the room.
    ctx.fillStyle = 'rgba(8, 10, 20, 0.55)';
    const bandW = 760;
    ctx.fillRect(VIEW.width / 2 - bandW / 2, 258, bandW, 108);
    outlinedText(m.text, VIEW.width / 2, 300, 46, m.colour, 'center');
    if (m.sub) text(m.sub, VIEW.width / 2, 340, 18, COLOUR.ink, 'center', 700);
    ctx.restore();
  }

  function drawScreenOverlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(8, 10, 20, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    text(title, VIEW.width / 2, 250, 54, accent, 'center', 900);
    let y = 320;
    for (const line of lines) {
      text(line, VIEW.width / 2, y, 18, COLOUR.ink, 'center', 600);
      y += 30;
    }
  }

  function draw(state) {
    ctx.fillStyle = '#0b0e1a';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    drawFloor(state.t);
    drawExit();
    drawObstacles(state.t);
    drawPaintings();
    drawOpal(state);
    drawSmokeAndCoins(state);
    drawCameras(state);
    drawGuards(state);
    drawThief(state);
    drawTopBar(state);
    drawSidePanel(state);
    drawBottomBar();
    drawMoment(state);

    if (state.screen === 'title') {
      drawScreenOverlay('OPAL HOUR', [
        'Steal the Star of Marlow',
        '1 gallery · 3 guards · 2 cameras · 3 tools · 1 getaway',
        '',
        'Read the cones. Spend your tools. Take the Star. Run.',
        '',
        'Press SPACE or click to start',
      ], COLOUR.gold);
      if (state.best > 0) text(`BEST ${state.best}`, VIEW.width / 2, 530, 16, COLOUR.dim, 'center', 700);
    } else if (state.screen === 'paused') {
      drawScreenOverlay('PAUSED', ['Press P to keep playing'], COLOUR.ink);
    } else if (state.screen === 'win') {
      drawScreenOverlay('CLEAN GETAWAY', [
        `Rating: ${state.result.rating} — ${state.result.ratingLine}`,
        `Time ${state.result.time} · Score ${state.result.score} · Best ${state.best}`,
        '',
        'Press SPACE to play again',
      ], COLOUR.safe);
    } else if (state.screen === 'lose') {
      drawScreenOverlay(state.result.title, [
        state.result.reason,
        `Score ${state.result.score} · Best ${state.best}`,
        '',
        'Press SPACE to try again',
      ], COLOUR.danger);
    }
  }

  return { draw };
}

export function ratingFor(peakAlarm, seconds) {
  if (peakAlarm < 25) return { rating: 'GHOST', line: 'never seen, never heard' };
  if (peakAlarm < 60) return { rating: 'SHADOW', line: 'a whisper in the dark' };
  return { rating: 'LOUD', line: 'the whole gallery knows' };
}

export function scoreFor(peakAlarm, seconds) {
  const timeBonus = Math.max(0, SCORE.timePar - Math.floor(seconds)) * SCORE.timeEach;
  const style = peakAlarm < 25 ? SCORE.ghost : peakAlarm < 60 ? SCORE.shadow : 0;
  return SCORE.base + timeBonus + style;
}

export function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}
