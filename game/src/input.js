// OPAL HOUR — keyboard and mouse.
// WASD/arrows move, Shift sneaks, E grabs, F smoke, Q jam, P pause, M sound,
// Space/click confirms. A mouse click on the room also throws a coin there:
// the click point is reported in canvas coordinates for the world to spend.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_GRAB = 4;
export const ACTION_SMOKE = 8;
export const ACTION_JAM = 16;
export const ACTION_SOUND = 32;

const KEY_ACTIONS = {
  ' ': ACTION_CONFIRM,
  Enter: ACTION_CONFIRM,
  p: ACTION_PAUSE,
  P: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  e: ACTION_GRAB,
  E: ACTION_GRAB,
  f: ACTION_SMOKE,
  F: ACTION_SMOKE,
  q: ACTION_JAM,
  Q: ACTION_JAM,
  m: ACTION_SOUND,
  M: ACTION_SOUND,
};

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let click = null;

  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
    keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    const action = KEY_ACTIONS[event.key];
    if (action) actions |= action;
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });
  canvas.addEventListener('mousedown', (event) => {
    click = toCanvas(event);
    actions |= ACTION_CONFIRM;
  });

  function direction() {
    let dx = 0;
    let dy = 0;
    if (keys.has('a') || keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('d') || keys.has('ArrowRight')) dx += 1;
    if (keys.has('w') || keys.has('ArrowUp')) dy -= 1;
    if (keys.has('s') || keys.has('ArrowDown')) dy += 1;
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    return { dx, dy };
  }

  return {
    direction,
    sneaking() {
      return keys.has('Shift');
    },
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
    takeClick() {
      const out = click;
      click = null;
      return out;
    },
  };
}
