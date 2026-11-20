// Light Gray Mini: one input state for keyboard, touch and a game pad.
// Buttons, laid out like a 16-bit pad: a (swing / talk / confirm), b (ranged /
// back), y (spell), x (use the chosen item), start (menu), map. `held` is the live state; `pressed` is true for the one
// update after a button goes down.

const BUTTONS = ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y', 'start', 'map', 'mute'];

/** The buttons in the order the Keys page lists them. */
export const ACTIONS = ['a', 'b', 'y', 'x', 'start', 'map', 'mute', 'up', 'down', 'left', 'right'];

// The keys each button starts with. The player can add and take away keys in
// Settings; the first key in a list is the one the game names.
export const DEFAULT_KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  a: ['KeyZ', 'KeyJ', 'Space'],
  b: ['KeyX', 'KeyK'],
  y: ['KeyC', 'KeyL'],
  x: ['KeyV', 'Semicolon'],
  start: ['Enter', 'Escape', 'KeyI'],
  map: ['Tab', 'KeyQ'],
  mute: ['KeyM'],
};
export const MAX_KEYS = 4;
// Esc always opens the bag and backs out of things, so no set of keys can lock you out.
const FIXED = { Escape: 'start' };
// Keys the browser or the system needs more than the game does.
const BLOCKED = /^(F\d{1,2}|Meta.*|OS.*|Control.*|Alt.*|CapsLock|NumLock|ScrollLock|ContextMenu|PrintScreen|Pause|Power|Sleep|WakeUp|Unidentified)$/;

export const held = Object.fromEntries(BUTTONS.map((b) => [b, false]));
export const pressed = Object.fromEntries(BUTTONS.map((b) => [b, false]));
const queued = Object.fromEntries(BUTTONS.map((b) => [b, false]));
// What is holding each button down: a key code, 'touch' or 'pad'. Two keys on
// one button keep it down until both are let go.
const sources = Object.fromEntries(BUTTONS.map((b) => [b, new Set()]));

// -------------------------------------------------------------------- keys

const cloneKeys = (map) => Object.fromEntries(BUTTONS.map((b) => [b, [...map[b]]]));

let keys = cloneKeys(DEFAULT_KEYS);
let byCode = new Map();
let stamp = 0;

function reindex() {
  byCode = new Map();
  for (const b of BUTTONS) for (const code of keys[b]) byCode.set(code, b);
  stamp += 1;
}
reindex();

/** Whether the player may put this key on a button. */
export function bindable(code) {
  return typeof code === 'string' && code.length > 0 && !BLOCKED.test(code) && !FIXED[code];
}

const KEY_NAMES = {
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Escape: 'Esc', Space: 'Space', Enter: 'Enter', Tab: 'Tab', Backspace: 'Bksp', Delete: 'Del', Insert: 'Ins',
  Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn', ShiftLeft: 'LShift', ShiftRight: 'RShift',
  Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', IntlBackslash: '\\',
  BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '~',
  NumpadEnter: 'NumEnt', NumpadAdd: 'Num+', NumpadSubtract: 'Num-', NumpadMultiply: 'Num*',
  NumpadDivide: 'Num/', NumpadDecimal: 'Num.',
};

/** What a key is called on screen: KeyZ is 'Z', ArrowUp is 'Up'. */
export function keyName(code) {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1];
  m = /^Digit(\d)$/.exec(code);
  if (m) return m[1];
  m = /^Numpad(\d)$/.exec(code);
  if (m) return `Num${m[1]}`;
  return String(code).slice(0, 6);
}

/**
 * Make a saved set of keys safe to use. A key sits on one button only (the
 * first to claim it wins), Esc stays where it is, and a button left with no
 * keys gets its own back. Pure, so the tests can read it.
 */
export function normalizeKeys(saved) {
  if (!saved || typeof saved !== 'object') return cloneKeys(DEFAULT_KEYS);
  const out = Object.fromEntries(BUTTONS.map((b) => [b, []]));
  const used = new Set(Object.keys(FIXED));
  const room = (b) => MAX_KEYS - Object.values(FIXED).filter((owner) => owner === b).length;
  const take = (b, list) => {
    for (const code of list) {
      if (!bindable(code) || used.has(code) || out[b].length >= room(b)) continue;
      out[b].push(code);
      used.add(code);
    }
  };
  // What was saved goes first, so a button the save does not mention cannot take a key back.
  for (const b of BUTTONS) if (Array.isArray(saved[b])) take(b, saved[b]);
  for (const b of BUTTONS) if (!Array.isArray(saved[b])) take(b, DEFAULT_KEYS[b]);
  for (const [code, b] of Object.entries(FIXED)) {
    const at = Math.min(DEFAULT_KEYS[b].indexOf(code), out[b].length);
    out[b].splice(Math.max(0, at), 0, code);
  }
  for (const b of BUTTONS) {
    if (out[b].length) continue;
    out[b] = DEFAULT_KEYS[b].filter((code) => !used.has(code));
    if (!out[b].length) return cloneKeys(DEFAULT_KEYS);   // nothing left for it: start over
    out[b].forEach((code) => used.add(code));
  }
  return out;
}

/** Use a saved set of keys (or none, for the usual ones). */
export function setKeys(saved) {
  keys = normalizeKeys(saved);
  reindex();
  clearInput();
}

export function resetKeys() {
  setKeys(null);
}

export function keysFor(button) {
  return [...(keys[button] || [])];
}

/** The keys as they should be saved: null when nothing has been changed. */
export function customKeys() {
  const same = BUTTONS.every((b) => keys[b].join() === DEFAULT_KEYS[b].join());
  return same ? null : cloneKeys(keys);
}

/**
 * Put a key on a button. A key on another button moves over, unless it is the
 * only key that button has. Returns { ok } or { ok: false, why, from }.
 */
export function bindKey(button, code) {
  if (!keys[button]) return { ok: false, why: 'unknown' };
  if (FIXED[code]) return { ok: false, why: 'fixed' };
  if (!bindable(code)) return { ok: false, why: 'blocked' };
  if (keys[button].includes(code)) return { ok: false, why: 'have' };
  if (keys[button].length >= MAX_KEYS) return { ok: false, why: 'full' };
  const from = byCode.get(code) || null;
  if (from && keys[from].length <= 1) return { ok: false, why: 'last', from };
  if (from) keys[from] = keys[from].filter((c) => c !== code);
  keys[button].push(code);
  reindex();
  clearInput();
  return { ok: true, from };
}

/** Take a key off a button. A button keeps at least one key, and Esc stays. */
export function unbindKey(button, code) {
  if (!keys[button] || !keys[button].includes(code)) return { ok: false, why: 'unknown' };
  if (FIXED[code]) return { ok: false, why: 'fixed' };
  if (keys[button].length <= 1) return { ok: false, why: 'last', from: button };
  keys[button] = keys[button].filter((c) => c !== code);
  reindex();
  clearInput();
  return { ok: true };
}

// The Keys page asks for the next key the player presses. Esc comes back as
// 'Escape' and means never mind.
let capture = null;

export function captureKey(cb) {
  capture = cb;
}

export function cancelCapture() {
  capture = null;
}

// --------------------------------------------------------------- game pads

// A pad reports its face buttons by where they sit: bottom, right, left, top.
// What is printed on them depends on who made it. `face` says which of the
// game's buttons each position is, so the letter on screen is the letter under
// your thumb.
export const PAD_LAYOUTS = {
  xbox: { face: ['a', 'b', 'x', 'y'], names: { a: 'A', b: 'B', x: 'X', y: 'Y', start: 'START', map: 'SELECT', back: 'B' } },
  nintendo: { face: ['b', 'a', 'y', 'x'], names: { a: 'A', b: 'B', x: 'X', y: 'Y', start: '+', map: '-', back: 'B' } },
  playstation: { face: ['a', 'b', 'x', 'y'], names: { a: '×', b: '○', x: '□', y: '△', start: 'OPTIONS', map: 'SHARE', back: '○' } },
};
const PAD_BUTTONS = ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y', 'start', 'map'];
const STICK_DEAD = 0.4;

/** Guess whose pad this is from the name the browser gives it. */
export function padKind(id) {
  const s = String(id || '').toLowerCase();
  if (/nintendo|057e|joy-con|pro controller|switch/.test(s)) return 'nintendo';
  // Sony's pads call themselves just "Wireless Controller", and so does an Xbox one, so Xbox is asked first.
  if (/xbox|xinput|045e|microsoft/.test(s)) return 'xbox';
  if (/playstation|dualshock|dualsense|054c|sony|wireless controller/.test(s)) return 'playstation';
  return 'xbox';
}

/**
 * What a pad is holding, as the game's buttons. `pad` is a Gamepad in the
 * browser's standard layout: face buttons 0-3, select 8, start 9, d-pad 12-15,
 * left stick on axes 0 and 1. Pure, so the tests can read it.
 */
export function readPad(pad, layout = 'xbox') {
  const L = PAD_LAYOUTS[layout] || PAD_LAYOUTS.xbox;
  const buttons = (pad && pad.buttons) || [];
  const down = (i) => {
    const b = buttons[i];
    if (b === undefined || b === null) return false;
    return typeof b === 'object' ? !!b.pressed || b.value > 0.5 : b > 0.5;
  };
  const out = Object.fromEntries(PAD_BUTTONS.map((b) => [b, false]));
  out.up = down(12);
  out.down = down(13);
  out.left = down(14);
  out.right = down(15);
  out.start = down(9);
  out.map = down(8);
  L.face.forEach((name, i) => { if (down(i)) out[name] = true; });
  // The stick, read as eight directions the same way the touch pad is.
  const axes = (pad && pad.axes) || [];
  const dx = Number(axes[0]) || 0;
  const dy = Number(axes[1]) || 0;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const useX = ax > STICK_DEAD && ax > ay * 0.4;
  const useY = ay > STICK_DEAD && ay > ax * 0.4;
  if (useX) out[dx < 0 ? 'left' : 'right'] = true;
  if (useY) out[dy < 0 ? 'up' : 'down'] = true;
  return out;
}

let padLayout = 'auto';   // 'auto', or a name in PAD_LAYOUTS
let padSeen = null;       // the kind of the pad that last did something
const padDown = Object.fromEntries(PAD_BUTTONS.map((b) => [b, false]));
let padWoke = false;

export function setPadLayout(name) {
  padLayout = PAD_LAYOUTS[name] ? name : 'auto';
  stamp += 1;
}

function activeLayout() {
  return padLayout !== 'auto' ? padLayout : (padSeen || 'xbox');
}

function livePads() {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return [];
  try {
    return [...navigator.getGamepads()].filter((pad) => pad && pad.connected !== false);
  } catch {
    return [];
  }
}

/** The pads plugged in right now: how many, and what the first one looks like. */
export function padInfo() {
  const pads = livePads();
  return { count: pads.length, kind: pads.length ? padKind(pads[0].id) : null };
}

function pollPads() {
  const now = {};
  let kind = null;
  for (const pad of livePads()) {
    const k = padKind(pad.id);
    const state = readPad(pad, padLayout === 'auto' ? k : padLayout);
    for (const b of PAD_BUTTONS) if (state[b]) { now[b] = true; kind = k; }
  }
  // Only a change counts, so a button still down after clearInput() is not a new press.
  for (const b of PAD_BUTTONS) {
    const down = !!now[b];
    if (down === padDown[b]) continue;
    padDown[b] = down;
    setButton(b, down, 'pad');
    if (!down) continue;
    if (device !== 'pad' || padSeen !== kind) stamp += 1;
    device = 'pad';
    padSeen = kind;
    // A pad press may not count as a gesture to the browser, so sound may have
    // to wait for a key or a tap. Try anyway, and let the real gesture try again.
    if (!gestured && !padWoke && onFirstGesture) { padWoke = true; onFirstGesture(); }
  }
}

/** Shake whatever the player is holding, if it can: a pad's motors, or a phone. */
export function rumble(ms = 100, strength = 0.6) {
  try {
    if (device === 'pad') {
      for (const pad of livePads()) {
        const motor = pad.vibrationActuator;
        if (!motor || !motor.playEffect) continue;
        const done = motor.playEffect('dual-rumble', { startDelay: 0, duration: ms, weakMagnitude: strength, strongMagnitude: strength * 0.7 });
        if (done && done.catch) done.catch(() => {});
      }
    } else if (device === 'touch' && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  } catch { /* play on without it */ }
}

// ------------------------------------------------------------------- names

// What a button is called depends on what you are holding. On a keyboard the
// sword is Z, so the game says Z; on the touch pad it is A, so it says A. On a
// game pad it is whatever that pad prints on the button.
const TOUCH_NAMES = { a: 'A', b: 'B', y: 'Y', x: 'X', start: 'START', map: 'MAP', back: 'B', mute: 'SOUND', move: 'The pad moves you.' };
const ARROWS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const DEVICES = ['keys', 'touch', 'pad'];
let device = 'keys';

const undraft = (text) => (text.startsWith('DRAFT|') ? text.slice(6) : text);

export function setDevice(name) {
  if (DEVICES.includes(name) && name !== device) { device = name; stamp += 1; }
}

export function currentDevice() {
  return device;
}

/** A value that changes whenever a button's name might have: device, pad or keys. */
export function inputStamp() {
  return `${device}:${activeLayout()}:${stamp}`;
}

const hasArrows = () => Object.entries(ARROWS).every(([b, code]) => keys[b].includes(code));

/** What moves you, in a word or four: 'Arrows', 'W A S D', 'Stick', 'Pad'. */
export function moveName() {
  if (device === 'pad') return 'Stick';
  if (device === 'touch') return 'Pad';
  if (hasArrows()) return 'Arrows';
  return ['up', 'left', 'down', 'right'].map((b) => keyName(keys[b][0])).join(' ');
}

function keyLabel(button) {
  if (button === 'back') return keyName('Escape');
  if (button === 'move') {
    if (hasArrows()) return 'The arrows move you.';
    const [u, l, d, r] = ['up', 'left', 'down', 'right'].map((b) => keyName(keys[b][0]));
    return undraft(`DRAFT|${u}, ${l}, ${d} and ${r} move you.`);
  }
  return keys[button] ? keyName(keys[button][0]) : undefined;
}

function padLabel(button) {
  if (button === 'move') return undraft('DRAFT|The stick moves you.');
  if (button === 'mute') return '';
  return PAD_LAYOUTS[activeLayout()].names[button];
}

/** The name on the button that does `button`: label('a') is 'Z' or 'A'. */
export function label(button) {
  const name = device === 'keys' ? keyLabel(button) : device === 'pad' ? padLabel(button) : TOUCH_NAMES[button];
  return name === undefined ? button : name;
}

/** The same name, cut to fit the corner of a HUD slot: one or two characters. */
export function tag(button) {
  const full = label(button);
  if (full.length <= 2 || device !== 'keys' || !keys[button]) return full.slice(0, 2);
  const short = keys[button].map(keyName).find((n) => n.length <= 2);
  return short || full.slice(0, 2);
}

/** Fill {a}, {b}, {x}, {y}, {start}, {map}, {back} and {move} in a line of text. */
export function withKeys(text) {
  return String(text).replace(/\{(a|b|x|y|start|map|back|move)\}/g, (_, k) => label(k));
}

// ------------------------------------------------------------------- state

let onFirstGesture = null;
let gestured = false;

function gesture() {
  if (gestured) return;
  gestured = true;
  if (onFirstGesture) onFirstGesture();
}

function setButton(name, down, source) {
  const by = sources[name];
  const was = by.size > 0;
  if (down) by.add(source); else by.delete(source);
  if (down && !was) queued[name] = true;
  held[name] = by.size > 0;
}

/** Call once per fixed update, before game logic reads `pressed`. */
export function pollInput() {
  pollPads();
  for (const b of BUTTONS) {
    pressed[b] = queued[b];
    queued[b] = false;
  }
}

export function clearInput() {
  for (const b of BUTTONS) { sources[b].clear(); held[b] = false; pressed[b] = false; queued[b] = false; }
}

/** The direction the player is pushing, as -1/0/1 on each axis. */
export function axis() {
  return {
    x: (held.right ? 1 : 0) - (held.left ? 1 : 0),
    y: (held.down ? 1 : 0) - (held.up ? 1 : 0),
  };
}

export function initInput({ firstGesture } = {}) {
  onFirstGesture = firstGesture || null;

  window.addEventListener('keydown', (e) => {
    // Cmd-R, Ctrl-L and the rest belong to the browser, whatever the keys are set to.
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (capture) {
      e.preventDefault();
      if (e.repeat) return;
      const cb = capture;
      capture = null;
      gesture();
      setDevice('keys');
      cb(e.code);
      return;
    }
    const name = byCode.get(e.code);
    if (!name) return;
    e.preventDefault();
    gesture();
    setDevice('keys');
    if (!e.repeat) setButton(name, true, e.code);
  });
  window.addEventListener('keyup', (e) => {
    const name = byCode.get(e.code);
    if (!name) return;
    e.preventDefault();
    setButton(name, false, e.code);
  });
  window.addEventListener('blur', clearInput);

  initTouch();
}

// ------------------------------------------------------------------- touch

function initTouch() {
  const pad = document.getElementById('dpad');
  const showTouch = () => { document.body.classList.add('touch'); setDevice('touch'); };
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) showTouch();
  window.addEventListener('touchstart', showTouch, { once: true, passive: true });

  if (pad) {
    let active = null;
    const read = (e) => {
      const r = pad.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const dead = 0.22;
      // Eight directions: an axis counts once it passes the dead zone and is at
      // least 40% as strong as the other one.
      const ax = Math.abs(dx), ay = Math.abs(dy);
      const useX = ax > dead && ax > ay * 0.4;
      const useY = ay > dead && ay > ax * 0.4;
      setButton('left', useX && dx < 0, 'touch');
      setButton('right', useX && dx > 0, 'touch');
      setButton('up', useY && dy < 0, 'touch');
      setButton('down', useY && dy > 0, 'touch');
      pad.dataset.dir = `${useX ? (dx < 0 ? 'l' : 'r') : ''}${useY ? (dy < 0 ? 'u' : 'd') : ''}`;
    };
    const release = () => {
      active = null;
      for (const b of ['left', 'right', 'up', 'down']) setButton(b, false, 'touch');
      pad.dataset.dir = '';
    };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      gesture();
      setDevice('touch');
      active = e.pointerId;
      pad.setPointerCapture(e.pointerId);
      read(e);
    });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === active) read(e); });
    pad.addEventListener('pointerup', (e) => { if (e.pointerId === active) release(); });
    pad.addEventListener('pointercancel', (e) => { if (e.pointerId === active) release(); });
  }

  for (const el of document.querySelectorAll('[data-btn]')) {
    const name = el.dataset.btn;
    const down = (e) => {
      e.preventDefault();
      gesture();
      setDevice('touch');
      el.classList.add('down');
      setButton(name, true, 'touch');
    };
    const up = (e) => {
      e.preventDefault();
      el.classList.remove('down');
      setButton(name, false, 'touch');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
