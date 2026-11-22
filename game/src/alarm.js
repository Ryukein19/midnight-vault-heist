// OPAL HOUR — the alarm meter, 0 to 100, always on screen.
// It is pressure, not a binary fail: guards on alert and cameras that see the
// thief feed it, hiding drains it, and taking the Star spikes it. Two stages
// change the room: past 30 the guards notice faster, past 70 they move faster.
// At 100 the gallery locks down and the run ends.
import { ALARM } from './config.js';

export function createAlarm() {
  return { value: 0, peak: 0 };
}

export function stepAlarm(a, dt, anyAlert, anyCameraSees) {
  let rate = 0;
  if (anyAlert) rate += ALARM.guardRate;
  if (anyCameraSees) rate += ALARM.alarmRate;
  if (rate > 0) a.value = Math.min(ALARM.max, a.value + rate * dt);
  else a.value = Math.max(0, a.value - ALARM.decay * dt);
  if (a.value > a.peak) a.peak = a.value;
}

export function spikeAlarm(a, amount) {
  a.value = Math.min(ALARM.max, a.value + amount);
  if (a.value > a.peak) a.peak = a.value;
}

export function alarmStage(a) {
  if (a.value >= ALARM.hotAt) return 'hot';
  if (a.value >= ALARM.warnAt) return 'warn';
  return 'calm';
}

export function alarmLocked(a) {
  return a.value >= ALARM.max;
}
