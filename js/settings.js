// Light Gray Mini: the Settings screen and its helpers. It draws its own panel
// and needs no game, so the title screen can open it too. The rows are data
// (data/settings.js); the values live in state.js.

import { W, drawText, drawTextCentered, textWidth, wrap, panel, fillRect } from './gfx.js';
import {
  pressed, held, label, withKeys, ACTIONS, MAX_KEYS, keysFor, keyName, bindKey, unbindKey,
  resetKeys, customKeys, setKeys, captureKey, cancelCapture, setPadLayout, padInfo,
} from './input.js';
import { sfx, setMuted, setMusicVolume, setSfxVolume, levelGain } from './audio.js';
import { SETTINGS, BUTTON_NAMES, NOTES } from './data/settings.js';
import { prefs, settings, setSetting, resetSettings, savePrefs } from './state.js';
import { plain } from './world.js';

const X = 8;
const PANEL_W = W - 16;
export const SETTINGS_H = 180;
const VISIBLE = 10;      // rows of settings on screen at once
const PITCH = 11;
const WRAP = 36;

// ------------------------------------------------------------------ values

const hasDoc = () => typeof document !== 'undefined';
const canFullscreen = () => hasDoc() && !!document.fullscreenEnabled && !!document.documentElement.requestFullscreen;
const isFullscreen = () => hasDoc() && !!document.fullscreenElement;

/** Make the game match the settings. Call at boot and after any change. */
export function applySettings() {
  setMusicVolume(levelGain(settings.music));
  setSfxVolume(levelGain(settings.sfx));
  setMuted(settings.muted);
  setPadLayout(settings.pad);
  // The page draws the glass in front of the game: one class on the body for each kind.
  if (hasDoc() && document.body) for (const kind of ['scan', 'crt', 'lcd']) document.body.classList.toggle(kind, settings.screen === kind);
}

/** Use the keys the player saved, if they changed any. */
export function applyKeys() {
  setKeys(prefs.keys);
}

function saveKeys() {
  const changed = customKeys();
  if (changed) prefs.keys = changed; else delete prefs.keys;
  savePrefs(prefs);
}

/** The rows this browser can use. Fullscreen is left out where there is none. */
export function settingRows() {
  return SETTINGS.filter((row) => row.key !== 'full' || canFullscreen());
}

function valueOf(row) {
  return row.live ? isFullscreen() : settings[row.key];
}

/**
 * A row's value after left (-1) or right (+1). A slider stops at its ends, a
 * toggle flips, a list goes round. Pure.
 */
export function stepSetting(row, value, dir) {
  if (row.kind === 'level') return Math.max(0, Math.min(row.max, value + dir));
  if (row.kind === 'toggle') return !value;
  if (row.kind === 'pick') {
    const at = Math.max(0, row.choices.findIndex((c) => c[0] === value));
    return row.choices[(at + dir + row.choices.length) % row.choices.length][0];
  }
  return value;
}

/** A row's value as the words on screen. */
export function valueText(row, value) {
  if (row.kind === 'level') return `${value}`;
  if (row.kind === 'toggle') return (row.words || ['off', 'on'])[value ? 1 : 0];
  if (row.kind === 'pick') {
    const name = (row.choices.find((c) => c[0] === value) || row.choices[0])[1];
    if (row.key !== 'pad' || value !== 'auto') return name;
    const pad = padInfo();
    return pad.count ? `${name}: ${row.choices.find((c) => c[0] === pad.kind)[1]}` : name;
  }
  return '';
}

function fill(note, words = {}) {
  return withKeys(plain(note)).replace(/\{(key|name|from)\}/g, (_, k) => words[k] || '');
}

// ------------------------------------------------------------------ update

export function newSettingsState() {
  return { type: 'settings', page: 'main', row: 0, top: 0, krow: 0, kcol: 99, note: '', capture: null, hold: null, t: 0 };
}

// A held direction repeats, so a slider does not take ten presses.
function repeat(m, btn) {
  if (pressed[btn]) { m.hold = { btn, t: 0 }; return true; }
  if (!m.hold || m.hold.btn !== btn || !held[btn]) return false;
  m.hold.t += 1;
  return m.hold.t > 22 && m.hold.t % 4 === 0;
}

function toggleFullscreen(m) {
  const no = () => { m.note = fill(NOTES.noFull); };
  try {
    const done = isFullscreen() ? document.exitFullscreen() : document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    if (done && done.catch) done.catch(no);
  } catch { no(); }
}

function change(m, row, value) {
  if (row.live) { toggleFullscreen(m); sfx.select(); return; }
  if (value === settings[row.key]) return;
  setSetting(row.key, value);
  applySettings();
  // The SFX slider answers with a sound of its own, so you hear what you set.
  if (row.key === 'sfx') sfx.coin(); else sfx.select();
}

/** One frame of the Settings screen. Returns true when the player backs out of it. */
export function updateSettings(m) {
  m.t += 1;
  if (m.page === 'keys') { updateKeys(m); return false; }
  if (pressed.b || pressed.start) { sfx.select(); return true; }

  const list = settingRows();
  const up = repeat(m, 'up');
  const down = !up && repeat(m, 'down');
  if (up || down) { m.row = (m.row + (up ? list.length - 1 : 1)) % list.length; m.note = ''; sfx.select(); }
  m.row = Math.min(m.row, list.length - 1);
  if (m.row < m.top) m.top = m.row;
  if (m.row >= m.top + VISIBLE) m.top = m.row - VISIBLE + 1;
  // A stick pushed on a diagonal moves the cursor. It does not also change the row it lands on.
  if (up || down) return false;

  const row = list[m.row];
  if (row.kind === 'page') {
    if (pressed.a || pressed.right) { m.page = 'keys'; m.krow = 0; m.kcol = 99; m.note = ''; sfx.confirm(); }
    return false;
  }
  if (row.kind === 'do') {
    if (!pressed.a) return false;
    resetSettings();
    applySettings();
    m.note = fill(NOTES.reset);
    sfx.confirm();
    return false;
  }
  const dir = repeat(m, 'left') ? -1 : repeat(m, 'right') ? 1 : 0;
  if (dir) change(m, row, stepSetting(row, valueOf(row), dir));
  else if (pressed.a && row.kind !== 'level') change(m, row, stepSetting(row, valueOf(row), 1));
  return false;
}

function keyNote(res, button, code) {
  const words = { key: keyName(code), name: BUTTON_NAMES[button], from: BUTTON_NAMES[res.from] };
  if (res.ok) return fill(res.from ? NOTES.moved : NOTES.added, words);
  return fill(NOTES[res.why] || '', words);
}

function updateKeys(m) {
  if (m.capture) {
    // The keyboard is being listened to. Touch and a pad can still back out.
    if (pressed.b || pressed.start) { cancelCapture(); m.capture = null; m.note = ''; sfx.select(); }
    return;
  }
  if (pressed.b || pressed.start) { m.page = 'main'; m.note = ''; sfx.select(); return; }

  const n = ACTIONS.length + 1;                  // the buttons, then Reset
  const up = repeat(m, 'up');
  const down = !up && repeat(m, 'down');
  // A new row starts on its "+", so a stray press adds a key and never takes one.
  if (up || down) { m.krow = (m.krow + (up ? n - 1 : 1)) % n; m.kcol = 99; m.note = ''; sfx.select(); return; }
  const button = ACTIONS[m.krow];
  const list = button ? keysFor(button) : [];
  m.kcol = Math.max(0, Math.min(list.length, m.kcol));
  if (button && pressed.left && m.kcol > 0) { m.kcol -= 1; m.note = ''; sfx.select(); }
  if (button && pressed.right && m.kcol < list.length) { m.kcol += 1; m.note = ''; sfx.select(); }
  if (!pressed.a) return;

  if (!button) {
    resetKeys();
    saveKeys();
    m.note = fill(NOTES.keysReset);
    sfx.confirm();
    return;
  }
  if (m.kcol < list.length) {
    const code = list[m.kcol];
    const res = unbindKey(button, code);
    m.note = res.ok ? fill(NOTES.removed, { key: keyName(code), name: BUTTON_NAMES[button] }) : keyNote(res, button, code);
    if (res.ok) { saveKeys(); sfx.confirm(); } else sfx.deny();
    return;
  }
  if (list.length >= MAX_KEYS) { m.note = fill(NOTES.full, { name: BUTTON_NAMES[button] }); sfx.deny(); return; }
  m.capture = button;
  m.note = '';
  sfx.confirm();
  captureKey((code) => {
    m.capture = null;
    if (code === 'Escape') { sfx.select(); return; }
    const res = bindKey(button, code);
    m.note = keyNote(res, button, code);
    m.kcol = 99;
    if (res.ok) { saveKeys(); sfx.confirm(); } else sfx.deny();
  });
}

// -------------------------------------------------------------------- draw

function heading(g, text, y0) {
  drawText(g, text, X + 10, y0 + 7, 'J');
  fillRect(g, X + 10, y0 + 16, textWidth(text), 1, 'J');
}

function footer(g, y0, left, right) {
  if (left) drawText(g, left, X + 10, y0 + SETTINGS_H - 14, '%');
  drawText(g, right, W - 16 - 10 - textWidth(right), y0 + SETTINGS_H - 14, '%');
}

function lines(g, text, y, color) {
  wrap(text, WRAP).slice(0, 2).forEach((line, i) => drawText(g, line, X + 10, y + i * 10, color));
}

function drawValue(g, row, x, y, on) {
  const value = valueOf(row);
  if (row.kind === 'page') { drawText(g, '→', x + 12, y, on ? 'J' : 'a'); return; }
  if (row.kind === 'do') return;
  let end = x + 12;
  if (row.kind === 'level') {
    for (let i = 0; i < row.max; i++) fillRect(g, end + i * 6, y, 5, 7, i < value ? (on ? 'J' : 'a') : 'j');
    end += row.max * 6 + 3;
    drawText(g, `${value}`, end, y, '9');
    end += 11;
  } else {
    const text = valueText(row, value);
    const lit = row.kind === 'toggle' ? (value ? 'I' : 'a') : '9';
    drawText(g, text, end, y, lit);
    end += textWidth(text);
  }
  if (!on) return;
  drawText(g, '◀', x, y, 'a');
  drawText(g, '▶', end + 6, y, 'a');
}

/** Draw the Settings screen with the top of its panel at y0. */
export function drawSettings(g, m, y0) {
  panel(g, X, y0, PANEL_W, SETTINGS_H, 'Q', 'a');
  if (m.page === 'keys') { drawKeys(g, m, y0); return; }
  heading(g, 'SETTINGS', y0);

  const list = settingRows();
  for (let i = 0; i < VISIBLE; i++) {
    const row = list[m.top + i];
    if (!row) break;
    const on = m.top + i === m.row;
    const y = y0 + 24 + i * PITCH;
    if (on) drawText(g, '▶', X + 10, y, 'J');
    drawText(g, row.label, X + 20, y, on ? 'J' : '9');
    drawValue(g, row, X + 112, y, on);
  }
  // More rows than fit: the marks in the corner light up for the way there is more.
  if (list.length > VISIBLE) {
    drawText(g, '▲', X + PANEL_W - 27, y0 + 7, m.top > 0 ? 'a' : 'j');
    drawText(g, '▼', X + PANEL_W - 17, y0 + 7, m.top + VISIBLE < list.length ? 'a' : 'j');
  }

  fillRect(g, X + 10, y0 + 136, PANEL_W - 20, 1, 'j');
  const row = list[m.row];
  if (m.note) lines(g, m.note, y0 + 141, '9');
  else {
    let help = fill(row.help);
    if (row.key === 'pad') help += `\n${fill(padInfo().count ? NOTES.padSeen : NOTES.padNone)}`;
    lines(g, help, y0 + 141, 'a');
  }
  footer(g, y0, '', `${label('back')} closes`);
}

function chip(g, text, x, y, on, dim) {
  const w = textWidth(text) + 4;
  fillRect(g, x, y - 1, w, 9, on ? 'J' : 'j');
  drawText(g, text, x + 2, y, on ? 'q' : dim ? '%' : '9');
  return x + w + 2;
}

function drawKeys(g, m, y0) {
  heading(g, 'KEYS', y0);
  let hint = '';
  ACTIONS.forEach((button, i) => {
    const on = i === m.krow;
    const y = y0 + 22 + i * 10;
    if (on) drawText(g, '▶', X + 10, y, 'J');
    drawText(g, BUTTON_NAMES[button], X + 20, y, on ? 'J' : '9');
    const list = keysFor(button);
    let x = X + 58;
    list.forEach((code, j) => { x = chip(g, keyName(code), x, y, on && j === m.kcol, false); });
    const onPlus = on && m.kcol >= list.length;
    chip(g, '+', x, y, onPlus, list.length >= MAX_KEYS);
    if (on) hint = onPlus ? `${label('a')} adds a key` : `${label('a')} takes ${keyName(list[m.kcol])} off`;
  });
  const y = y0 + 22 + ACTIONS.length * 10;
  const onReset = m.krow === ACTIONS.length;
  if (onReset) { drawText(g, '▶', X + 10, y, 'J'); hint = `${label('a')} resets them`; }
  drawText(g, 'Reset keys', X + 20, y, onReset ? 'J' : '9');

  if (m.note) lines(g, m.note, y0 + 145, '9');
  footer(g, y0, hint, `${label('back')} back`);

  if (m.capture) {
    const bw = 196;
    const bx = Math.round((W - bw) / 2);
    const by = y0 + 62;
    panel(g, bx, by, bw, 42, 'q', 'J');
    drawTextCentered(g, fill(NOTES.keyAsk, { name: BUTTON_NAMES[m.capture] }), W / 2, by + 10, '9');
    if ((m.t >> 4) % 2 === 0) drawTextCentered(g, fill(NOTES.keyCancel), W / 2, by + 24, 'a');
  }
}
