// Light Gray Mini: light. One pass over the finished picture of the field,
// pixel by pixel, the way a 16-bit console mixed a second layer in: the hour
// of the day, the dark of a cave and the light you carry into it, glow from
// fires and pillars, cloud shadows, fog, shafts of sun, light on a sea floor.
//
// Every edge is dithered on a 4x4 grid, so light falls off in steps, not in
// a smooth blur. Nothing in here needs a browser: it works on the pixels it
// is handed.

import { PAL } from './gfx.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);
const pack = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;

// Clouds are a few ovals each, drifting left to right. x is where one starts.
const CLOUDS = [
  { x: 0, y: 40, speed: 0.16, ovals: [[0, 0, 58, 26], [44, 10, 42, 20], [-38, 8, 36, 17]] },
  { x: 260, y: 140, speed: 0.12, ovals: [[0, 0, 66, 24], [-50, -8, 40, 18], [48, 6, 34, 16]] },
];
// Banks of fog: low, wide, thick in the middle.
const FOG = [
  { x: 30, y: 58, speed: 0.07, rx: 64, ry: 15 }, { x: 96, y: 66, speed: 0.07, rx: 46, ry: 11 },
  { x: 210, y: 120, speed: 0.05, rx: 72, ry: 17 }, { x: 270, y: 110, speed: 0.05, rx: 40, ry: 12 },
  { x: 350, y: 164, speed: 0.09, rx: 58, ry: 13 }, { x: 420, y: 30, speed: 0.06, rx: 50, ry: 12 },
];
const FOG_COLOR = '7';
const GLOW = 0.05;     // how much of a light's own color it adds, per step of brightness

let colors = null;
const lut = new Uint32Array(32768);

/** The color the game owns that is nearest to this one, packed the way a canvas stores it. */
export function nearest(r, g, b) {
  const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  let v = lut[key];
  if (v) return v;
  if (!colors) colors = Object.values(PAL).map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  let best = 1e9;
  let at = 0;
  for (let i = 0; i < colors.length; i++) {
    const c = colors[i];
    const dr = c[0] - r;
    const dg = c[1] - g;
    const db = c[2] - b;
    const e = dr * dr * 2 + dg * dg * 4 + db * db * 3;
    if (e < best) { best = e; at = i; }
  }
  v = pack(colors[at][0], colors[at][1], colors[at][2]);
  lut[key] = v;
  return v;
}

/** Is there anything for the pass to do? A plainly lit room skips it. */
export function needsLight(s) {
  return !!s && !!(s.dim || s.lights.length || s.cloud > 0 || s.shafts > 0 || s.fog > 0 || s.caustics > 0 || s.wobble || s.strict);
}

let level = null;
let tintR = null;
let tintG = null;
let tintB = null;

/**
 * Lay the light over a picture. `d` is its pixels, one 32-bit number each, w by h.
 *   s.t         the frame, for everything that drifts
 *   s.dim       [r, g, b] every color is multiplied by, or null. Lights undo it near them.
 *   s.lights    [{ x, y, r, color }]
 *   s.cloud, s.shafts, s.fog, s.caustics   0 to 1, how much of each
 *   s.wobble    the rows sway, as if seen through water
 *   s.strict    snap every pixel to a color the game owns
 */
export function lightFrame(d, w, h, s) {
  const t = s.t;
  const n = w * h;
  if (!level || level.length !== n) {
    level = new Uint8Array(n);
    tintR = new Uint16Array(n);
    tintG = new Uint16Array(n);
    tintB = new Uint16Array(n);
  }
  const lit = s.lights.length > 0;
  if (lit) {
    level.fill(0); tintR.fill(0); tintG.fill(0); tintB.fill(0);
    for (const L of s.lights) {
      const R = L.r;
      const R2 = R * R;
      const x0 = Math.max(0, Math.floor(L.x - R));
      const x1 = Math.min(w - 1, Math.ceil(L.x + R));
      const y0 = Math.max(0, Math.floor(L.y - R));
      const y1 = Math.min(h - 1, Math.ceil(L.y + R));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - L.x;
          const dy = y - L.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= R2) continue;
          // Four steps of brightness, each edge broken up by the dither.
          let lv = ((1 - Math.sqrt(d2) / R) * 5 + BAYER[(x & 3) | ((y & 3) << 2)]) | 0;
          if (lv > 4) lv = 4;
          if (!lv) continue;
          const i = y * w + x;
          if (lv > level[i]) level[i] = lv;
          tintR[i] += L.color[0] * lv; tintG[i] += L.color[1] * lv; tintB[i] += L.color[2] * lv;
        }
      }
    }
  }
  const dim = s.dim;
  const clouds = [];
  if (s.cloud > 0) {
    for (const c of CLOUDS) {
      const bx = ((c.x + t * c.speed) % 460) - 100;
      for (const o of c.ovals) clouds.push([bx + o[0], c.y + o[1], o[2], o[3]]);
    }
  }
  const fog = [];
  if (s.fog > 0) for (const c of FOG) fog.push([((c.x + t * c.speed) % 500) - 120, c.y + Math.sin(t * 0.006 + c.x) * 4, c.rx, c.ry]);
  const fogHex = PAL[FOG_COLOR];
  const fr = parseInt(fogHex.slice(1, 3), 16);
  const fgr = parseInt(fogHex.slice(3, 5), 16);
  const fb = parseInt(fogHex.slice(5, 7), 16);
  const shade = [1 - 0.2 * s.cloud, 1 - 0.15 * s.cloud, 1 - 0.05 * s.cloud];
  const sway = Math.sin(t * 0.004) * 18;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const v = d[i];
      let r = v & 255;
      let g = (v >> 8) & 255;
      let b = (v >> 16) & 255;
      const by = BAYER[(x & 3) | ((y & 3) << 2)];
      if (s.cloud > 0) {
        for (let k = 0; k < clouds.length; k++) {
          const e = clouds[k];
          const qx = (x - e[0]) / e[2];
          const qy = (y - e[1]) / e[3];
          if (qx * qx + qy * qy < 1 - by * 0.32) { r *= shade[0]; g *= shade[1]; b *= shade[2]; break; }
        }
      }
      if (s.shafts > 0) {
        const across = x - y * 0.55 + sway;
        const u = ((across % 104) + 104) % 104;
        if (u < 24) {
          const band = Math.floor(across / 104);
          const k = (0.55 + 0.45 * Math.sin(t * 0.012 + band * 2.1)) * (u < 4 || u > 20 ? 0.45 : 0.8) * s.shafts;
          if (by < k) { r += 30; g += 25; b += 4; }
        }
      }
      if (dim) {
        const k = lit ? level[i] * 0.25 : 0;
        r *= dim[0] + (1 - dim[0]) * k; g *= dim[1] + (1 - dim[1]) * k; b *= dim[2] + (1 - dim[2]) * k;
      }
      if (lit) { r += tintR[i] * GLOW; g += tintG[i] * GLOW; b += tintB[i] * GLOW; }
      if (s.fog > 0) {
        // Thick in the middle of a bank and thinning to nothing, one dither step at a time.
        let f = 0;
        for (let k = 0; k < fog.length; k++) {
          const e = fog[k];
          const qx = (x - e[0]) / e[2];
          const qy = (y - e[1]) / e[3];
          const q = 1 - (qx * qx + qy * qy);
          if (q > f) f = q;
        }
        if (f > 0 && by < Math.min(0.56, f * 0.9) * s.fog) { r += (fr - r) * 0.42; g += (fgr - g) * 0.42; b += (fb - b) * 0.42; }
      }
      if (s.caustics > 0) {
        // Patches of light where two slow waves cross, the way sun lands on a sea floor.
        const c1 = Math.sin(x * 0.105 + Math.sin(y * 0.07 + t * 0.021) * 2.1 + t * 0.013);
        const c2 = Math.sin(y * 0.125 + Math.sin(x * 0.06 - t * 0.017) * 2.3 - t * 0.011);
        const cv = c1 + c2;
        if (cv > 1.5 || (cv > 1.22 && by < 0.5)) { r += 14 * s.caustics; g += 44 * s.caustics; b += 50 * s.caustics; }
      }
      if (r > 255) r = 255;
      if (g > 255) g = 255;
      if (b > 255) b = 255;
      d[i] = s.strict ? nearest(r | 0, g | 0, b | 0) : pack(r | 0, g | 0, b | 0);
    }
  }
  if (s.wobble) {
    for (let y = 0; y < h; y++) {
      const shift = Math.round(Math.sin(y * 0.11 + t * 0.045) * 1.2);
      if (!shift) continue;
      const row = d.subarray(y * w, (y + 1) * w);
      if (shift > 0) row.copyWithin(shift, 0, w - shift); else row.copyWithin(0, -shift, w);
    }
  }
}
