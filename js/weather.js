// Light Gray Mini: the weather. Wind, moving water, and whatever lives in a
// region's air. All of it is for the eye: nothing in here touches a roll, a
// wall or the save. What a region gets is data (data/regions.js).

import { PAL, TILE, COLS, ROWS, makeCanvas, rng } from './gfx.js';
import { TILES, TREE_H, TREE_OVER } from './art-tiles.js';

const RW = COLS * TILE;
const RH = ROWS * TILE;
const rnd = (n) => Math.floor(Math.random() * n);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function px(g, x, y, key, w = 1, h = 1) {
  g.fillStyle = PAL[key] || key;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}

function pack(key) {
  const hex = PAL[key];
  const r = parseInt(hex.slice(1, 3), 16);
  const gr = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return ((255 << 24) | (b << 16) | (gr << 8) | r) >>> 0;
}

// -------------------------------------------------------------------- wind

/** Where the front of the gust is. It crosses a room left to right about every eight seconds. */
export const gustX = (t) => ((t * 1.15) % 560) - 150;

/** How hard the wind leans on a spot: a slow sway, and a shove as the gust goes by. About -0.7 to 2.3. */
export function wind(t, x, y) {
  const gust = Math.exp(-((x - gustX(t) + y * 0.3) ** 2) / 2600);
  return Math.sin(t * 0.021 + x * 0.045 + y * 0.03) * 0.7 + gust * 1.6;
}

/** A room's trees. `top` draws only what hangs over the tile above, for whoever walks behind. */
export function drawTrees(g, bake, t, windy, ox, oy, top) {
  if (!bake.trees) return;
  const sheet = bake.trees;
  for (let i = 0; i < bake.treeAt.length; i++) {
    const x = bake.treeAt[i][0] * TILE;
    const y = bake.treeAt[i][1] * TILE - TREE_OVER;
    const sx = i * 16;
    let high = 0;
    let mid = 0;
    if (windy) {
      const w = wind(t, x + 8, y + 8);
      high = clamp(Math.round(w * 0.9), -1, 2);
      mid = clamp(Math.round(w * 0.45), -1, 1);
    }
    if (!top) g.drawImage(sheet, sx, 0, 16, TREE_H, ox + x, oy + y, 16, TREE_H);
    // The leaves in three bands. The higher the band, the farther it leans.
    g.drawImage(sheet, sx, TREE_H, 16, 5, ox + x + high, oy + y, 16, 5);
    g.drawImage(sheet, sx, TREE_H + 5, 16, top ? 3 : 6, ox + x + mid, oy + y + 5, 16, top ? 3 : 6);
    if (!top) g.drawImage(sheet, sx, TREE_H + 11, 16, TREE_H - 11, ox + x, oy + y + 11, 16, TREE_H - 11);
  }
}

export function drawFlowers(g, bake, t, windy, ox, oy) {
  for (const f of bake.flowers) {
    const lean = windy && wind(t, f.x, f.y) > 0.75 ? 1 : 0;
    const x = ox + f.x;
    const y = oy + f.y;
    px(g, x + lean, y - 1, f.p); px(g, x - 1 + lean, y, f.p); px(g, x + 1 + lean, y, f.p);
    px(g, x, y + 1, f.p); px(g, x + lean, y, f.c);
  }
}

/** One blade of tall grass. Its foot stays put and its top goes with the wind. */
export function drawBlade(g, bake, b, t, windy, ox, oy) {
  const lean = windy ? clamp(Math.round(wind(t, b.x, b.y) * 0.9), -1, 2) : 0;
  px(g, ox + b.x + lean, oy + b.y, bake.th.groundLight);
  px(g, ox + b.x + Math.round(lean / 2), oy + b.y + 1, bake.th.groundLight);
  px(g, ox + b.x, oy + b.y + 2, bake.th.groundDark);
}

// ------------------------------------------------------------------- water

/**
 * Open water: rings that roll in to shore, and light sliding across the rest.
 * Painted fresh each frame over the room's still water.
 */
export function drawWater(g, bake, t, ox, oy) {
  if (!bake.water) return;
  let fx = bake.wfx;
  if (!fx) {
    const canvas = makeCanvas(RW, RH);
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(RW, RH);
    const r = rng(bake.seed + 99);
    const rowOn = new Int8Array(RH);      // which rows carry light, and which way it slides
    const rowOff = new Uint8Array(RH);
    for (let y = 0; y < RH; y++) { const v = r(); rowOn[y] = v < 0.24 ? 1 : v < 0.46 ? -1 : 0; rowOff[y] = (r() * 31) | 0; }
    fx = { canvas, ctx, img, buf: new Uint32Array(img.data.buffer), rowOn, rowOff, light: pack(bake.th.waterLight), foam: pack(bake.th.foam) };
    bake.wfx = fx;
  }
  const { buf, rowOn, rowOff } = fx;
  const pix = bake.water;
  const shore = bake.shore;
  const slide = (t / 5) | 0;
  for (let n = 0; n < pix.length; n++) {
    const i = pix[n];
    const x = i % RW;
    const y = (i / RW) | 0;
    const s = shore[i];
    let c = 0;
    if (s < 12) {
      // The rings wander a little, so a square pond does not get square ripples.
      const far = s + Math.sin(x * 0.23 + t * 0.011) * 1.1 + Math.sin(y * 0.19 - t * 0.009) * 1.1;
      const ph = (((far + t * 0.05) % 7) + 7) % 7;
      if (ph < 1 && Math.sin(x * 0.37 + y * 0.29 + t * 0.012) > 0.05) c = s < 3 ? fx.foam : fx.light;
    }
    if (!c && s > 4 && rowOn[y]) {
      const u = (((x + rowOn[y] * slide + rowOff[y]) % 31) + 31) % 31;
      if (u < 4 && Math.sin(x * 0.05 + y * 1.7 + t * 0.017) > -0.45) c = fx.light;
    }
    buf[i] = c;
  }
  fx.ctx.putImageData(fx.img, 0, 0);
  g.drawImage(fx.canvas, ox, oy);
}

// --------------------------------------------------------------- the air

const GRASSY = new Set(['ground', 'flowers', 'tallgrass']);

/**
 * What lives in one room's air: its butterflies, leaves, fireflies, snow and
 * the rest, and the gusts that cross its ground. One per room on screen.
 */
export class Air {
  /** map: the room's rows as they are now, with any bushes that were cut. */
  constructor(map, bake, region) {
    this.map = map;
    this.bake = bake;
    this.region = region;
    this.bits = [];
    this.gusts = [];
    const L = region.life;
    const spot = () => [rnd(RW), rnd(RH)];
    if (L.includes('butterfly')) {
      for (let i = 0; i < 4; i++) {
        const f = bake.flowers.length ? bake.flowers[rnd(bake.flowers.length)] : null;
        const [hx, hy] = f ? [f.x, f.y - 8] : spot();
        this.bits.push({ k: 'butterfly', hx, hy, x: hx, y: hy, ph: Math.random() * 6.28, col: ['Y', '8', 'M', 'W'][i % 4] });
      }
    }
    if (L.includes('mote')) for (let i = 0; i < 12; i++) { const [x, y] = spot(); this.bits.push({ k: 'mote', x, y, ph: Math.random() * 6.28 }); }
    if (L.includes('leaf')) for (let i = 0; i < 8; i++) { const q = { k: 'leaf', ph: Math.random() * 6.28 }; this.newLeaf(q, true); this.bits.push(q); }
    if (L.includes('firefly')) for (let i = 0; i < 12; i++) { const [x, y] = spot(); this.bits.push({ k: 'firefly', hx: x, hy: y, x, y, ph: Math.random() * 6.28 }); }
    if (L.includes('snow')) for (let i = 0; i < 64; i++) { const [x, y] = spot(); this.bits.push({ k: 'snow', x, y, sp: 0.3 + Math.random() * 0.5, ph: Math.random() * 6.28, big: rnd(5) === 0 }); }
    if (L.includes('bubble')) for (let i = 0; i < 12; i++) { const [x, y] = spot(); this.bits.push({ k: 'bubble', x, y, ph: Math.random() * 6.28, big: rnd(3) === 0 }); }
    if (L.includes('dust')) for (let i = 0; i < 22; i++) { const [x, y] = spot(); this.bits.push({ k: 'dust', x, y, ph: Math.random() * 6.28 }); }
    if (L.includes('drip')) for (let i = 0; i < 2; i++) this.bits.push({ k: 'drip', wait: 30 + rnd(120), s: 0 });
    if (L.includes('bird')) this.bits.push({ k: 'bird', wait: 120 + rnd(240), x: 0, y: 0, vx: 0, vy: 0 });
  }

  kindAt(x, y) {
    const cx = Math.floor(x / TILE);
    const cy = Math.floor(y / TILE);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return null;
    return (TILES[this.map[cy][cx]] || TILES['.']).kind;
  }

  /** A cell something could land on. */
  open() {
    for (let i = 0; i < 80; i++) {
      const cx = 1 + rnd(COLS - 2);
      const cy = 1 + rnd(ROWS - 2);
      if (!(TILES[this.map[cy][cx]] || {}).solid) return [cx, cy];
    }
    return [7, 6];
  }

  /** A leaf lets go of a tree, if the room has one, and has somewhere to land. */
  newLeaf(q, anywhere) {
    const at = this.bake.treeAt;
    const tr = at.length ? at[rnd(at.length)] : null;
    q.x = tr ? tr[0] * TILE + 2 + rnd(12) : rnd(RW);
    q.y = tr ? tr[1] * TILE - 4 + rnd(8) : -4;
    q.gy = q.y + 26 + rnd(50);
    if (anywhere) q.y += rnd(40);
    q.rest = 0;
    q.col = rnd(4) === 0 ? 'Y' : rnd(3) === 0 ? 'O' : this.bake.th.leafLight;
  }

  step(t) {
    if (this.region.wind === 'air' && rnd(2) === 0) {
      const x = gustX(t) + rnd(40) - 20;
      const y = rnd(RH);
      const k = this.kindAt(x, y);
      if (GRASSY.has(k) || k === 'sand') this.gusts.push({ x, y, t: 0 });
    }
    for (const q of this.gusts) { q.t += 1; q.x += 1.8; }
    if (this.gusts.length) this.gusts = this.gusts.filter((q) => q.t < 20);

    for (const q of this.bits) {
      if (q.k === 'butterfly') {
        q.x = q.hx + Math.sin(t * 0.021 + q.ph) * 24 + Math.sin(t * 0.05 + q.ph * 2) * 6;
        q.y = q.hy + Math.cos(t * 0.017 + q.ph * 1.3) * 13 + Math.sin(t * 0.09 + q.ph) * 2;
      } else if (q.k === 'mote') {
        q.x += 0.12 + Math.max(0, wind(t, q.x, q.y)) * 0.35;
        q.y += Math.sin(t * 0.03 + q.ph) * 0.12;
        if (q.x > RW + 2) { q.x = -2; q.y = rnd(RH); }
      } else if (q.k === 'leaf') {
        if (q.rest > 0) { if (--q.rest === 0) this.newLeaf(q, false); }
        else {
          q.y += 0.32;
          q.x += Math.sin(t * 0.07 + q.ph) * 0.55 + wind(t, q.x, q.y) * 0.25;
          if (q.y >= q.gy) q.rest = 120;
        }
      } else if (q.k === 'firefly') {
        q.x = q.hx + Math.sin(t * 0.011 + q.ph) * 18 + Math.sin(t * 0.027 + q.ph * 3) * 5;
        q.y = q.hy + Math.cos(t * 0.013 + q.ph * 1.7) * 12;
      } else if (q.k === 'snow') {
        q.y += q.sp;
        q.x += 0.22 + Math.max(0, wind(t, q.x, q.y)) * 0.6 + Math.sin(t * 0.04 + q.ph) * 0.2;
        if (q.y > RH) { q.y = -2; q.x = rnd(RW + 40) - 40; }
        if (q.x > RW) q.x -= RW;
      } else if (q.k === 'bubble') {
        q.y -= q.big ? 0.22 : 0.34;
        q.x += Math.sin(t * 0.08 + q.ph) * 0.3;
        if (q.y < -3) { q.y = RH + 2; q.x = rnd(RW); }
      } else if (q.k === 'dust') {
        q.x += Math.sin(t * 0.011 + q.ph) * 0.07;
        q.y -= 0.025;
        if (q.y < 0) q.y = RH;
      } else if (q.k === 'drip') {
        if (q.wait > 0) {
          if (--q.wait === 0) {
            const [cx, cy] = this.open();
            q.x = cx * TILE + 3 + rnd(10); q.gy = cy * TILE + 4 + rnd(10); q.y = q.gy - 46; q.s = 1; q.t = 0;
          }
        } else if (q.s === 1) {
          q.y += 2.4;
          if (q.y >= q.gy) { q.s = 2; q.t = 0; }
        } else if (++q.t > 18) { q.s = 0; q.wait = 70 + rnd(160); }
      } else if (q.k === 'bird') {
        if (q.wait > 0) {
          if (--q.wait === 0) { q.x = -10; q.y = 20 + rnd(120); q.vx = 2.1; q.vy = (Math.random() - 0.5) * 0.9; }
        } else {
          q.x += q.vx; q.y += q.vy;
          if (q.x > RW + 10) q.wait = 380 + rnd(300);
        }
      }
    }
  }

  /**
   * phase 'ground': what lies on the ground, under everyone.
   *       'air':    what flies over them, and is lit like them.
   *       'bright': what makes its own light, drawn after the light is laid on.
   */
  draw(g, phase, t, ox, oy) {
    const th = this.bake.th;
    if (phase === 'ground') {
      for (const q of this.gusts) {
        const k = this.kindAt(q.x + 2, q.y);
        if (!GRASSY.has(k) && k !== 'sand') continue;
        const col = k === 'sand' ? th.sandLight : th.groundLight;
        g.globalAlpha = q.t < 4 ? q.t / 4 : q.t > 14 ? (20 - q.t) / 6 : 1;
        px(g, ox + q.x, oy + q.y, col, 4, 1);
        px(g, ox + q.x - 3, oy + q.y, col, 2, 1);
      }
      g.globalAlpha = 1;
    }
    for (const q of this.bits) {
      const x = Math.round(ox + q.x);
      const y = Math.round(oy + q.y);
      if (phase === 'ground') {
        if (q.k === 'bird' && q.wait <= 0) {            // only its shadow
          const up = (t >> 3) & 1;
          g.globalAlpha = 0.26;
          px(g, x - 3, y + (up ? -1 : 1), '0', 2, 1); px(g, x - 1, y, '0', 3, 1); px(g, x + 2, y + (up ? -1 : 1), '0', 2, 1);
          g.globalAlpha = 1;
        } else if (q.k === 'drip' && q.s === 2) {       // the ring where it landed
          const r = 1 + Math.floor(q.t / 6);
          const gy = Math.round(oy + q.gy);
          px(g, x - r, gy, 'W'); px(g, x + r, gy, 'W');
          px(g, x - r + 1, gy - 1, 'w', Math.max(1, r * 2 - 1), 1); px(g, x - r + 1, gy + 1, 'w', Math.max(1, r * 2 - 1), 1);
        }
      } else if (phase === 'air') {
        if (q.k === 'butterfly') {
          if ((t >> 3) & 1) { px(g, x - 1, y - 1, q.col, 1, 2); px(g, x + 1, y - 1, q.col, 1, 2); }
          else { px(g, x - 2, y, q.col); px(g, x + 2, y, q.col); px(g, x - 1, y - 1, q.col); px(g, x + 1, y - 1, q.col); }
          px(g, x, y, '1');
        } else if (q.k === 'mote') {
          if (((t + q.ph * 40) >> 4) % 3) px(g, x, y, 'l');
        } else if (q.k === 'leaf') {
          if (q.rest > 0) { g.globalAlpha = Math.min(1, q.rest / 40); px(g, x, y, q.col, 2, 1); g.globalAlpha = 1; }
          else if ((t >> 3) & 1) px(g, x, y, q.col, 2, 1);
          else px(g, x, y, q.col, 1, 2);
        } else if (q.k === 'dust') px(g, x, y, '6');
        else if (q.k === 'drip' && q.s === 1) px(g, x, y, 'W', 1, 2);
      } else if (q.k === 'firefly') {
        const glow = Math.sin(t * 0.05 + q.ph * 4);
        if (glow > 0.1) {
          g.globalAlpha = 0.4 * glow;
          px(g, x - 1, y, 'Y'); px(g, x + 1, y, 'Y'); px(g, x, y - 1, 'Y'); px(g, x, y + 1, 'Y');
          g.globalAlpha = 1;
          px(g, x, y, 'l');
        }
      } else if (q.k === 'snow') px(g, x, y, q.big ? '8' : '7', q.big ? 2 : 1, 1);
      else if (q.k === 'bubble') {
        if (q.big) { px(g, x, y - 1, 'W'); px(g, x - 1, y, 'W'); px(g, x + 1, y, 'W'); px(g, x, y + 1, 'W'); px(g, x - 1, y - 1, 'i'); }
        else px(g, x, y, 'i');
      }
    }
  }
}
