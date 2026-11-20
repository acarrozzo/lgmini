// Light Gray Mini: boot, the title screen and the loop.

import { W, H, HUD_H, drawText, drawTextCentered, textWidth, fillRect, makeCanvas } from './gfx.js';
import { buildSprites } from './art-sprites.js';
import { bakeRoom } from './art-tiles.js';
import { initInput, pollInput, pressed, label, currentDevice, inputStamp, moveName } from './input.js';
import { initAudio, playSong, isMuted, sfx } from './audio.js';
import { loadGame, clearSave, prefs, savePrefs, settings, setSetting } from './state.js';
import { newSettingsState, updateSettings, drawSettings, applySettings, applyKeys, SETTINGS_H } from './settings.js';
import { newPlayer, addItem, takeGear, isBest, clock } from './rules.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { ROOMS, START } from './data/rooms.js';
import { validateWorld } from './world.js';

const canvas = document.getElementById('screen');
const g = canvas.getContext('2d');
g.imageSmoothingEnabled = false;

applySettings();
applyKeys();
let saved = loadGame();

const S = buildSprites();
const problems = validateWorld();
if (problems.length) console.warn('Light Gray Mini: world data problems\n' + problems.join('\n'));

let scene = 'title';
let game = null;
let ui = null;
const title = { sel: 0, confirm: false, settings: null, t: 0, backdrop: bakeRoom({ ...ROOMS['000'], id: '000' }).bg };

// ------------------------------------------------------------------ sizing

function fit() {
  const touch = document.body.classList.contains('touch');
  const landscape = window.innerWidth > window.innerHeight;
  // Upright on a phone the pad needs its own room under the screen.
  const below = touch && !landscape ? 200 : (touch ? 0 : 34);
  const availW = window.innerWidth - (touch ? 0 : 16);
  const availH = window.innerHeight - below - (touch ? 0 : 16);
  let scale = Math.min(availW / W, availH / H);
  if (scale >= 2) scale = Math.floor(scale);          // whole pixels when there is room
  scale = Math.max(1, scale);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
  // Scanlines are one dark row per game pixel, so they need to know how big a pixel is.
  // Under two screen pixels each there is no room for one.
  document.body.style.setProperty('--px', `${scale}px`);
  document.body.classList.toggle('small', scale < 2);
}
window.addEventListener('resize', fit);
new MutationObserver(fit).observe(document.body, { attributes: true, attributeFilter: ['class'] });

// ------------------------------------------------------------------- start

function begin(player, fresh) {
  ui = new UI(S);
  game = new Game({ sprites: S, ui, player });
  // The first time at Camp Hero: keep the fastest run, which outlives New Game.
  game.onFinish = (run) => {
    const isNew = isBest(run, prefs.best);
    if (isNew) {
      prefs.best = { frames: run.frames, level: run.level, deaths: run.deaths };
      savePrefs(prefs);
    }
    return prefs.best ? { isNew, frames: prefs.best.frames } : null;
  };
  if (fresh) {
    game.enterRoom(START.room, START.cx, START.cy, START.dir);
  } else {
    game.setRoom(ROOMS[player.room] ? player.room : '001');
    game.hero.x = player.x;
    game.hero.y = player.y;
    game.hero.dir = player.dir || 'down';
    if (!game.heroFree(game.hero.x, game.hero.y)) game.enterRoom(player.hub || '001', 7, 7, 'down');
    else game.arrive();
  }
  scene = 'play';
  if (new URLSearchParams(location.search).has('debug')) {
    // For checking a room without walking to it. Not part of the game.
    window.__lgm = {
      game, ui, player,
      go: (id, cx, cy) => game.enterRoom(id, cx, cy, 'down'),
      give: (slug, n = 1) => addItem(player, slug, n),
      wear: (slug) => takeGear(player, slug),
    };
  }
}

function updateTitle() {
  title.t += 1;
  const options = titleOptions();
  if (title.settings) {
    if (updateSettings(title.settings)) title.settings = null;
    return;
  }
  if (title.confirm) {
    if (pressed.a) { clearSave(); saved = null; sfx.confirm(); begin(newPlayer(), true); }
    else if (pressed.b || pressed.start) { title.confirm = false; sfx.select(); }
    return;
  }
  if (pressed.up || pressed.down) { title.sel = (title.sel + (pressed.up ? options.length - 1 : 1)) % options.length; sfx.select(); }
  if (!(pressed.a || pressed.start)) return;
  const pick = options[Math.min(title.sel, options.length - 1)];
  sfx.confirm();
  if (pick === 'Settings') title.settings = newSettingsState();
  else if (pick === 'Continue') begin(saved, false);
  else if (saved) title.confirm = true;
  else begin(newPlayer(), true);
}

function titleOptions() {
  return saved ? ['Continue', 'New Game', 'Settings'] : ['Start', 'Settings'];
}

function big(text, scale, color) {
  const c = makeCanvas(textWidth(text) + 1, 8);
  drawText(c.getContext('2d'), text, 0, 0, color);
  const out = makeCanvas(c.width * scale, c.height * scale);
  const og = out.getContext('2d');
  og.imageSmoothingEnabled = false;
  og.drawImage(c, 0, 0, out.width, out.height);
  return out;
}
const LOGO = big('LIGHT GRAY', 3, '7');
const LOGO_SHADE = big('LIGHT GRAY', 3, '2');
const SUBTITLE = big('MINI', 2, 'J');

function drawTitle() {
  fillRect(g, 0, 0, W, H, 'q');
  g.globalAlpha = 0.35;
  g.drawImage(title.backdrop, 0, 16);
  g.globalAlpha = 1;
  const pillar = S.things.pillar;
  g.drawImage(pillar, W / 2 - 8, 104);
  if ((title.t >> 4) % 4 === 0) fillRect(g, W / 2 - 1, 117, 2, 2, '8');

  const lx = Math.round((W - LOGO.width) / 2);
  g.drawImage(LOGO_SHADE, lx + 2, 34);
  g.drawImage(LOGO, lx, 32);
  g.drawImage(SUBTITLE, Math.round((W - SUBTITLE.width) / 2), 62);
  drawTextCentered(g, 'A bit of Light Gray RPG.', W / 2, 86, 'a');

  if (title.confirm) {
    drawTextCentered(g, 'Erase the old save?', W / 2, 160, '9');
    drawTextCentered(g, `${label('a')} erases it.  ${label('back')} goes back.`, W / 2, 174, 'J');
  } else {
    const options = titleOptions();
    options.forEach((o, i) => {
      const y = 147 + i * 13;
      const on = i === Math.min(title.sel, options.length - 1);
      drawTextCentered(g, o, W / 2, y, on ? 'J' : 'a');
      if (on && (title.t >> 4) % 2 === 0) drawText(g, '▶', W / 2 - textWidth(o) / 2 - 10, y, 'J');
    });
    if (saved) drawTextCentered(g, `Level ${saved.level}  ${ROOMS[saved.room] ? ROOMS[saved.room].name : ''}`, W / 2, 192, '%');
    if (prefs.best && prefs.best.frames) drawTextCentered(g, `Best ${clock(prefs.best.frames)}`, W / 2, 204, '%');
  }
  if (isMuted()) drawText(g, 'sound off', 4, 4, '%');
  if (title.settings) {
    g.globalAlpha = 0.8;
    fillRect(g, 0, 0, W, H, 'q');
    g.globalAlpha = 1;
    drawSettings(g, title.settings, Math.round((H - SETTINGS_H) / 2));
  }
}

// ------------------------------------------------------ the line under it

// On a desk the page lists the buttons under the screen. They are whatever
// the player is holding and whatever keys they have set.
const hintEl = document.getElementById('keys');
let hintStamp = '';
function drawHint() {
  const now = inputStamp();
  if (!hintEl || now === hintStamp) return;
  hintStamp = now;
  const parts = [[moveName(), 'move'], [label('a'), 'swing / talk'], [label('b'), 'throw'], [label('y'), 'cast'],
    [label('x'), 'eat'], [label('start'), 'bag'], [label('map'), 'map'], [label('mute'), 'sound']];
  hintEl.replaceChildren();
  for (const [name, does] of parts) {
    if (!name) continue;
    const b = document.createElement('b');
    b.textContent = name;
    hintEl.append(b, ` ${does} \u00a0 `);
  }
}

// -------------------------------------------------------------------- loop

function tick() {
  if (pressed.mute) {
    setSetting('muted', !settings.muted);
    applySettings();
  }
  if (scene === 'title') { updateTitle(); return; }
  // The run clock: it counts whenever the game is open, and stops at Camp Hero.
  if (!game.p.flags.ended) game.p.frames = (game.p.frames || 0) + 1;
  const was = ui.busy;
  ui.update();
  if (!was && !ui.busy) game.update();
}

function render() {
  if (scene === 'title') { drawTitle(); return; }
  fillRect(g, 0, 0, W, H, '0');
  game.draw(g);
  ui.draw(g);
  if (isMuted()) drawText(g, 'M', W - 8, HUD_H + 3, '%');
}

const STEP = 1000 / 60;
let last = performance.now();
let acc = 0;
function frame(now) {
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= STEP) {
    pollInput();
    tick();
    acc -= STEP;
  }
  render();
  if (currentDevice() !== 'touch') drawHint();
  requestAnimationFrame(frame);
}

initInput({
  firstGesture() {
    initAudio();
    if (scene === 'title') playSong('zero');
  },
});
fit();
// ?debug: start without the title screen, for checking rooms from the console.
if (new URLSearchParams(location.search).has('debug')) {
  window.__lgmStart = () => begin(newPlayer(), true);
  // Run the loop by hand. A page in a background tab gets no frames, so a
  // check that presses keys has to turn the crank itself.
  window.__lgmStep = (n = 1) => { for (let i = 0; i < n; i++) { pollInput(); tick(); } render(); };
}
requestAnimationFrame(frame);
