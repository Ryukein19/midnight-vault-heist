// OPAL HOUR — sound, made, not loaded.
// Every effect is a few WebAudio oscillators, so the game ships no audio files
// and makes no network request. The context starts on the first user gesture
// (browsers demand that) and stays silent until then.
let ctx = null;
let on = true;

export function setSound(enabled) {
  on = enabled;
}

export function soundOn() {
  return on;
}

function audio() {
  if (!on) return null;
  try {
    if (ctx === null) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, seconds, type, gain, when) {
  const c = audio();
  if (c === null) return;
  const t0 = c.currentTime + (when ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + seconds + 0.02);
}

export const sfx = {
  // A coin lands: a bright tick.
  coin() {
    tone(1568, 0.08, 'sine', 0.12);
  },
  // Smoke blooms: a soft hush.
  smoke() {
    tone(220, 0.35, 'triangle', 0.1);
    tone(165, 0.4, 'triangle', 0.08, 0.05);
  },
  // A camera dies: a falling blip.
  jam() {
    tone(880, 0.12, 'square', 0.06);
    tone(440, 0.2, 'square', 0.06, 0.1);
  },
  // A guard's suspicion fills: a low warning.
  suspicious() {
    tone(330, 0.18, 'sawtooth', 0.05);
  },
  // Spotted: a two-tone sting.
  spotted() {
    tone(622, 0.14, 'sawtooth', 0.09);
    tone(466, 0.3, 'sawtooth', 0.09, 0.12);
  },
  // The Star is lifted: a bright chime.
  grab() {
    tone(1047, 0.16, 'sine', 0.12);
    tone(1319, 0.2, 'sine', 0.12, 0.1);
    tone(1568, 0.32, 'sine', 0.1, 0.2);
  },
  // The getaway: a rising arpeggio.
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, i * 0.12));
  },
  // Caught: a low fall.
  lose() {
    tone(220, 0.5, 'sawtooth', 0.09);
    tone(147, 0.8, 'sawtooth', 0.09, 0.25);
  },
};
