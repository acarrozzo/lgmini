// Light Gray Mini: the save. One slot, in this browser only. Nothing here is
// tied to a Light Gray RPG account.

import { newPlayer, dropLostItems } from './rules.js';
import { SETTINGS } from './data/settings.js';

// ?slot=name keeps a separate save, so a test run never touches the real one.
const slot = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('slot') : null;
const KEY = `lgmini.save.v1${slot ? `.${slot}` : ''}`;
// The slot keeps its own settings and best time too, so a test run cannot set a record.
const PREFS = `lgmini.prefs.v1${slot ? `.${slot}` : ''}`;

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1) return null;
    // A save from an older build may be missing newer fields.
    const player = { ...newPlayer(), ...data, gear: { ...newPlayer().gear, ...(data.gear || {}) } };
    // A save from before the run clock: its time would be a lie, so it has none.
    if (data.frames === undefined) player.untimed = true;
    return dropLostItems(player);
  } catch {
    return null;
  }
}

export function saveGame(player) {
  try {
    localStorage.setItem(KEY, JSON.stringify(player));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}

export function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS) || '{}') || {}; } catch { return {}; }
}

export function savePrefs(data) {
  try { localStorage.setItem(PREFS, JSON.stringify(data)); } catch { /* play on without it */ }
}

// ---------------------------------------------------------------- settings

/** One setting's value made safe: what was saved if it still makes sense, else what it starts as. */
export function cleanSetting(row, value) {
  if (row.kind === 'level') return Number.isFinite(value) ? Math.max(0, Math.min(row.max, Math.round(value))) : row.def;
  if (row.kind === 'toggle') return typeof value === 'boolean' ? value : row.def;
  if (row.kind === 'pick') return row.choices.some((c) => c[0] === value) ? value : row.def;
  return undefined;
}

/** Every saved setting, read out of what is stored. Pure. */
export function readSettings(stored) {
  const out = {};
  for (const row of SETTINGS) {
    if (row.def === undefined) continue;
    out[row.key] = cleanSetting(row, stored ? stored[row.key] : undefined);
  }
  return out;
}

// What is stored (the settings, any changed keys, the best time), and the
// settings as the game reads them. One of each, shared by everything.
export const prefs = loadPrefs();
export const settings = readSettings(prefs);

export function setSetting(key, value) {
  const row = SETTINGS.find((r) => r.key === key);
  if (!row || row.def === undefined) return;
  settings[key] = cleanSetting(row, value);
  prefs[key] = settings[key];
  savePrefs(prefs);
}

/** Every setting back to what it starts as. Changed keys and the best time stay. */
export function resetSettings() {
  for (const row of SETTINGS) {
    if (row.def === undefined) continue;
    settings[row.key] = row.def;
    delete prefs[row.key];
  }
  savePrefs(prefs);
}
