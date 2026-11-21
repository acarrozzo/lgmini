// Light Gray Mini: terrain. Every tile is painted in code from a region theme,
// so one set of painters draws every region by changing the palette roles.
//
// A room is a 16x12 grid of characters (see TILES). paintRoom() paints its
// ground once. What moves is kept out of that picture and handed back as a
// list, so the game can draw it each frame: trees that lean, flowers and tall
// grass that bend (weather.js). bakeRoom() turns the lot into canvases.

import { Buf, rng, TILE, COLS, ROWS } from './gfx.js';

// ------------------------------------------------------------------ tiles

export const TILES = {
  '.': { kind: 'ground' },
  ',': { kind: 'flowers' },
  '"': { kind: 'tallgrass' },
  ':': { kind: 'path' },
  _: { kind: 'floor' },
  s: { kind: 'sand' },
  '=': { kind: 'bridge' },
  T: { kind: 'tree', solid: true },
  b: { kind: 'bush', solid: true, cut: true },
  o: { kind: 'rock', solid: true },
  '#': { kind: 'wall', solid: true },
  '~': { kind: 'water', solid: true, water: true },
  f: { kind: 'fence', solid: true },
  u: { kind: 'stump', solid: true },
  O: { kind: 'cavemouth' },
  v: { kind: 'stairsdown' },
  '^': { kind: 'stairsup' },
  ' ': { kind: 'void', solid: true },
};

export function tileAt(room, cx, cy) {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return null;
  return TILES[room.map[cy][cx]] || TILES['.'];
}

// ----------------------------------------------------------------- themes
// Each value is a palette key from gfx.js.

const BASE = {
  ground: 'G', groundDark: 'g', groundLight: 'h',
  path: 'd', pathDark: 'D', pathLight: 't',
  leaf: 'g', leafDark: 'f', leafLight: 'h', leafHi: 'H', leafEdge: 'x',
  trunk: 'B', trunkDark: 'b',
  rock: '5', rockDark: '3', rockLight: '7', rockEdge: '2',
  water: 'w', waterDark: 'U', waterLight: 'W', foam: 'i',
  wallTop: '5', wallTopDark: '4', wallRim: '7', wallFace: '3', wallFaceDark: '2',
  floor: '5', floorDark: '4', floorLight: '6',
  sand: 'T', sandDark: 't', sandLight: '8',
  wood: 'N', woodDark: 'n', woodEdge: 'B',
  void: '0',
};

export const THEMES = {
  field: { ...BASE },
  // Room Zero: a gray square. Nothing but gray.
  zero: {
    ...BASE,
    ground: '5', groundDark: '4', groundLight: '6',
    floor: '6', floorDark: '5', floorLight: '7',
    wallTop: '3', wallTopDark: '2', wallRim: '5', wallFace: '4', wallFaceDark: '3',
  },
  cave: {
    ...BASE,
    ground: 'B', groundDark: 'b', groundLight: 'n',
    path: 'n', pathDark: 'B', pathLight: 'N',
    rock: '4', rockDark: '2', rockLight: '6', rockEdge: '1',
    water: 'U', waterDark: 'u', waterLight: 'w', foam: 'W',
    wallTop: '2', wallTopDark: '1', wallRim: '4', wallFace: '3', wallFaceDark: '2',
    floor: '4', floorDark: '3', floorLight: '5',
  },
  // The Plane of Rebirth: pale and empty.
  rebirth: {
    ...BASE,
    ground: '7', groundDark: '6', groundLight: '8',
    floor: '7', floorDark: '6', floorLight: '8',
    wallTop: '6', wallTopDark: '5', wallRim: '8', wallFace: '5', wallFaceDark: '4',
    void: '8',
  },
};
THEMES.beach = { ...BASE, ground: 'T', groundDark: 't', groundLight: '8' };
THEMES.marsh = {
  ...BASE, ground: 'g', groundDark: 'f', groundLight: 'G',
  leaf: 'f', leafDark: 'x', leafLight: 'g', leafHi: 'G',
  water: 'c', waterDark: 'x', waterLight: 'C', foam: 'e',
};
THEMES.forest = {
  ...BASE, ground: 'g', groundDark: 'f', groundLight: 'G',
  leaf: 'f', leafDark: 'x', leafLight: 'g', leafHi: 'G',
  path: 'D', pathDark: 'n', pathLight: 'd',
};
THEMES.town = {
  ...BASE, floor: '6', floorDark: '5', floorLight: '7',
  wallTop: 'R', wallTopDark: 'r', wallRim: 'o', wallFace: 'r', wallFaceDark: 'z',
};
THEMES.underwater = {
  ...BASE, ground: 'U', groundDark: 'u', groundLight: 'w',
  rock: 'c', rockDark: 'x', rockLight: 'C', rockEdge: 'x',
  wallTop: 'c', wallTopDark: 'x', wallRim: 'C', wallFace: 'X', wallFaceDark: 'x',
  leaf: 'c', leafDark: 'x', leafLight: 'C', leafHi: 'e', leafEdge: 'x', trunk: 'c', trunkDark: 'x',
  void: 'u',
};
THEMES.darkforest = {
  ...BASE, ground: 'f', groundDark: 'x', groundLight: 'g',
  leaf: 'X', leafDark: 'x', leafLight: 'c', leafHi: 'C', leafEdge: '0',
  path: 'B', pathDark: 'b', pathLight: 'n', trunk: 'b', trunkDark: '0',
  water: 'c', waterDark: 'x', waterLight: 'C', foam: 'e',
  rock: '3', rockDark: '2', rockLight: '5',
};
THEMES.mountain = {
  ...BASE, ground: '7', groundDark: '6', groundLight: '8',
  leaf: 'c', leafDark: 'x', leafLight: '8', leafHi: '8', leafEdge: 'X',
  path: '5', pathDark: '4', pathLight: '6',
  wallTop: '6', wallTopDark: '5', wallRim: '8', wallFace: '4', wallFaceDark: '3',
  water: 'W', waterDark: 'w', waterLight: 'i', foam: '8',
};
THEMES.camp = { ...BASE, floor: 't', floorDark: 'd', floorLight: 'T' };
THEMES.ogrelair = { ...THEMES.cave, ground: '3', groundDark: '2', groundLight: '4', wallFace: 'B', wallFaceDark: 'b', wallRim: 'n' };
THEMES.koboldlair = { ...THEMES.cave, ground: 'p', groundDark: 'z', groundLight: 'P', wallFace: 'P', wallFaceDark: 'p', wallRim: 'v' };
THEMES.spidercave = { ...THEMES.cave, ground: 'Z', groundDark: 'z', groundLight: 'P', wallFace: 'p', wallFaceDark: 'z', wallRim: 'P' };
THEMES.batcave = { ...THEMES.cave, ground: 'X', groundDark: 'x', groundLight: 'U', wallFace: 'X', wallFaceDark: 'x', wallRim: 'U' };
THEMES.scorpionpit = { ...THEMES.cave, ground: 'n', groundDark: 'B', groundLight: 'N', wallFace: 'B', wallFaceDark: 'b', wallRim: 'n' };

// --------------------------------------------------------------- painters

const GROUNDISH = new Set(['ground', 'flowers', 'tallgrass', 'tree', 'bush', 'rock', 'fence', 'stump', 'stairsdown']);
const PATHISH = new Set(['path', 'bridge', 'floor', 'stairsup', 'stairsdown', 'cavemouth', null]);
const WATERISH = new Set(['water', 'bridge', null]);
const WALLISH = new Set(['wall', 'cavemouth', 'void', null]);
const SANDISH = new Set(['sand', 'water', 'bridge', 'path', null]);

const SIDES = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

/** Smooth noise that repeats every 32 units, for patches bigger than a tile. */
function noiseGrid(seed) {
  const r = rng(seed);
  const v = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) v[i] = r();
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const a = v[((yi & 31) << 5) | (xi & 31)];
    const b = v[((yi & 31) << 5) | ((xi + 1) & 31)];
    const c = v[(((yi + 1) & 31) << 5) | (xi & 31)];
    const d = v[(((yi + 1) & 31) << 5) | ((xi + 1) & 31)];
    const u = fx * fx * (3 - 2 * fx);
    const w = fy * fy * (3 - 2 * fy);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
}

/** A fixed number from 0 to 1 for one pixel of one room. */
function speck(x, y, seed) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function ground(b, ox, oy, c) {
  const { th, r } = c;
  b.rect(ox, oy, 16, 16, th.ground);
  for (let i = 0; i < 2; i++) {
    const x = 1 + ((r() * 12) | 0);
    const y = 1 + ((r() * 13) | 0);
    b.px(ox + x, oy + y, th.groundDark);
    b.px(ox + x + 1, oy + y + 1, th.groundDark);
    b.px(ox + x + 2, oy + y, th.groundDark);
  }
  for (let i = 0; i < 3; i++) b.px(ox + ((r() * 16) | 0), oy + ((r() * 16) | 0), th.groundLight);
  if (!c.tex) return;
  // Ground is not one flat color. Patches bigger than a tile catch the light
  // and grow short blades; others sit in shade and pick up dark flecks.
  const { big, small, seed } = c.tex;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const wx = ox + x;
      const wy = oy + y;
      if (b.get(wx, wy) !== th.ground) continue;
      const n = big(wx / 30, wy / 22) * 0.7 + small(wx / 10, wy / 9) * 0.3;
      const h = speck(wx, wy, seed);
      if (n > 0.54) {
        if (h >= (n - 0.54) * 0.42) continue;
        b.px(wx, wy, th.groundLight);
        if (y > 0 && b.get(wx, wy - 1) === th.ground) b.px(wx, wy - 1, th.groundLight);
      } else if (n < 0.44 && h < (0.44 - n) * 0.4) {
        b.px(wx, wy, th.groundDark);
        if (x < 15 && y < 15) b.px(wx + 1, wy + 1, th.groundDark);
      }
    }
  }
  if (c.self !== 'ground' && c.self !== 'flowers') return;
  for (let i = 0; i < 2; i++) {          // a tuft or two on open ground
    const x = ox + 2 + ((r() * 12) | 0);
    const y = oy + 3 + ((r() * 11) | 0);
    b.px(x - 1, y - 1, th.groundLight); b.px(x + 1, y - 1, th.groundLight);
    b.px(x, y, th.groundLight); b.px(x, y + 1, th.groundDark);
  }
}

/** Where the three flowers of a flower tile stand, and their colors. They are drawn each frame. */
function flowerSpots(ox, oy, c) {
  const petals = ['8', 'Y', 'M', 'W'];
  const out = [];
  for (let i = 0; i < 3; i++) {
    const x = ox + 2 + ((c.r() * 12) | 0);
    const y = oy + 2 + ((c.r() * 12) | 0);
    const p = petals[(c.r() * petals.length) | 0];
    out.push({ x, y, p, c: p === 'Y' ? 'O' : 'Y' });
  }
  return out;
}

/** Where the blades of a tall grass tile stand: the top of each. They are drawn each frame. */
function bladeSpots(ox, oy, c) {
  const out = [];
  for (let i = 0; i < 9; i++) out.push({ x: ox + ((c.r() * 16) | 0), y: oy + 2 + ((c.r() * 12) | 0) });
  return out;
}

/** Let the neighboring ground creep over the edges of a path or beach tile. */
function fringe(b, ox, oy, c, sameSet, creep, border) {
  const open = {};
  for (const side of Object.keys(SIDES)) open[side] = !sameSet.has(c.kind(side));
  for (let i = 0; i < 16; i++) {
    const depth = 1 + (c.r() < 0.4 ? 1 : 0);
    if (open.N) { for (let d = 0; d < depth; d++) b.px(ox + i, oy + d, creep); b.px(ox + i, oy + depth, border); }
    if (open.S) { for (let d = 0; d < depth; d++) b.px(ox + i, oy + 15 - d, creep); b.px(ox + i, oy + 15 - depth, border); }
    if (open.W) { for (let d = 0; d < depth; d++) b.px(ox + d, oy + i, creep); b.px(ox + depth, oy + i, border); }
    if (open.E) { for (let d = 0; d < depth; d++) b.px(ox + 15 - d, oy + i, creep); b.px(ox + 15 - depth, oy + i, border); }
  }
  // Round the corners where two open sides meet.
  const corner = (cx, cy, sx, sy) => {
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3 - j; i++) b.px(ox + cx + i * sx, oy + cy + j * sy, creep);
  };
  if (open.N && open.W) corner(0, 0, 1, 1);
  if (open.N && open.E) corner(15, 0, -1, 1);
  if (open.S && open.W) corner(0, 15, 1, -1);
  if (open.S && open.E) corner(15, 15, -1, -1);
}

function path(b, ox, oy, c) {
  const { th, r } = c;
  b.rect(ox, oy, 16, 16, th.path);
  for (let i = 0; i < 5; i++) b.px(ox + ((r() * 16) | 0), oy + ((r() * 16) | 0), th.pathDark);
  for (let i = 0; i < 3; i++) b.px(ox + ((r() * 16) | 0), oy + ((r() * 16) | 0), th.pathLight);
  for (let i = 0; i < 2; i++) {          // pebbles: lit on top, dark underneath
    const x = ox + 3 + ((r() * 9) | 0);
    const y = oy + 3 + ((r() * 9) | 0);
    b.hline(x, y, 2, th.pathLight);
    b.hline(x, y + 1, 2, th.pathDark);
  }
  fringe(b, ox, oy, c, PATHISH, th.ground, th.pathDark);
}

function sand(b, ox, oy, c) {
  const { th, r } = c;
  b.rect(ox, oy, 16, 16, th.sand);
  for (let i = 0; i < 6; i++) b.px(ox + ((r() * 16) | 0), oy + ((r() * 16) | 0), th.sandDark);
  for (let i = 0; i < 3; i++) b.px(ox + ((r() * 16) | 0), oy + ((r() * 16) | 0), th.sandLight);
  const rx = ox + 2 + ((r() * 7) | 0);     // a ripple the wind left
  const ry = oy + 3 + ((r() * 10) | 0);
  for (let j = 0; j < 7; j++) b.px(rx + j, ry + (j > 2 && j < 5 ? 1 : 0), th.sandDark);
  fringe(b, ox, oy, c, SANDISH, th.ground, th.sandDark);
}

function floor(b, ox, oy, c) {
  const { th, r } = c;
  b.rect(ox, oy, 16, 16, th.floor);
  b.hline(ox, oy, 16, th.floorLight);
  b.vline(ox, oy, 16, th.floorLight);
  b.hline(ox, oy + 15, 16, th.floorDark);
  b.vline(ox + 15, oy, 16, th.floorDark);
  for (let i = 0; i < 2; i++) b.px(ox + 2 + ((r() * 12) | 0), oy + 2 + ((r() * 12) | 0), th.floorDark);
}

/** A lit, lumpy blob: canopies, bushes and boulders all use it. */
function blob(b, f, ox, oy, c, shape, cols) {
  const { cx, cy, rx, ry, wobble = 0 } = shape;
  const phase = c.r() * 6.28;
  for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++) {
    for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) {
      if (x < 0 || x > 15) continue;
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const lim = 1 + wobble * Math.sin(Math.atan2(dy, dx) * 7 + phase);
      const d2 = dx * dx + dy * dy;
      if (d2 > lim * lim) continue;
      let ch;
      if (d2 > lim * lim * 0.72) ch = cols.edge;
      else {
        const s = dx * 0.6 + dy * 0.8;
        ch = s < -0.4 ? cols.light : s > 0.36 ? cols.dark : cols.mid;
      }
      b.px(ox + x, oy + y, ch);
      if (f && y < 0) f.px(ox + x, oy + y, ch);
    }
  }
  // A little texture so it is not three flat bands.
  for (let i = 0; i < (shape.specks ?? 5); i++) {
    const a = c.r() * 6.28;
    const m = c.r() * 0.6;
    const x = Math.round(cx + Math.cos(a) * rx * m);
    const y = Math.round(cy + Math.sin(a) * ry * m);
    const s = ((x - cx) / rx) * 0.6 + ((y - cy) / ry) * 0.8;
    const ch = s < -0.4 ? cols.hi : s > 0.36 ? cols.mid : cols.dark;
    b.px(ox + x, oy + y, ch);
    if (f && y < 0) f.px(ox + x, oy + y, ch);
  }
}

// A tree is two pictures, 16 wide and 24 tall, that sit on a tile with their
// top 8 rows hanging over the tile above: the trunk with its shadow, and the
// leaves. They are kept apart so the leaves can lean in the wind.
export const TREE_H = 24;
export const TREE_OVER = 8;

/** One tree: `trunk` and `can` (the canopy), each a Buf. */
export function paintTree(th, r) {
  const trunk = new Buf(16, TREE_H);
  const can = new Buf(16, TREE_H);
  const oy = TREE_OVER;
  const c = { th, r };
  trunk.ellipse(8.5, oy + 14.2, 7, 1.8, th.groundDark);
  trunk.rect(6, oy + 9, 4, 6, th.trunk);
  trunk.vline(8, oy + 9, 6, th.trunkDark);
  trunk.vline(9, oy + 9, 6, th.trunkDark);
  trunk.vline(5, oy + 11, 4, th.leafEdge);
  trunk.vline(10, oy + 11, 4, th.leafEdge);
  trunk.px(5, oy + 14, th.trunk);
  trunk.px(10, oy + 14, th.trunkDark);
  trunk.hline(5, oy + 15, 6, th.leafEdge);
  // A dark mass first, then three lit clumps of leaves on top of it.
  blob(can, null, 0, oy, c, { cx: 7.5, cy: 4.3, rx: 7.7, ry: 7.0, wobble: 0.08, specks: 0 },
    { edge: th.leafEdge, light: th.leafDark, mid: th.leafDark, dark: th.leafDark, hi: th.leafDark });
  const clump = { edge: th.leafDark, light: th.leafLight, mid: th.leaf, dark: th.leaf, hi: th.leafHi };
  blob(can, null, 0, oy, c, { cx: 10.6, cy: 4.2, rx: 4.3, ry: 3.6, wobble: 0.1, specks: 2 }, clump);
  blob(can, null, 0, oy, c, { cx: 6.4, cy: 7.4, rx: 4.6, ry: 3.4, wobble: 0.1, specks: 1 }, { ...clump, light: th.leaf });
  blob(can, null, 0, oy, c, { cx: 5.2, cy: 1.8, rx: 4.6, ry: 3.8, wobble: 0.1, specks: 3 }, clump);
  // Keep the dark ring whole where a clump reached the rim.
  const rim = [];
  for (let y = 0; y < TREE_H; y++) {
    for (let x = 0; x < 16; x++) {
      if (can.get(x, y) === '.') continue;
      if (x === 0 || x === 15 || can.get(x - 1, y) === '.' || can.get(x + 1, y) === '.' ||
          can.get(x, y - 1) === '.' || can.get(x, y + 1) === '.') rim.push([x, y]);
    }
  }
  for (const [x, y] of rim) can.px(x, y, th.leafEdge);
  return { trunk, can };
}

function bush(b, f, ox, oy, c) {
  const { th } = c;
  ground(b, ox, oy, c);
  b.ellipse(ox + 7.5, oy + 14, 5.5, 1.3, th.groundDark);
  blob(b, null, ox, oy, c, { cx: 7.5, cy: 8.5, rx: 6.6, ry: 5.6, wobble: 0.08, specks: 4 },
    { edge: th.leafEdge, light: th.leafHi, mid: th.leafLight, dark: th.leaf, hi: th.leafHi });
}

function rock(b, f, ox, oy, c) {
  const { th } = c;
  ground(b, ox, oy, c);
  b.ellipse(ox + 8, oy + 14, 6, 1.4, th.groundDark);
  blob(b, null, ox, oy, c, { cx: 7.5, cy: 8.5, rx: 6.7, ry: 5.6, wobble: 0.04, specks: 3 },
    { edge: th.rockEdge, light: th.rockLight, mid: th.rock, dark: th.rockDark, hi: th.rockLight });
  b.px(ox + 9, oy + 7, th.rockDark);
  b.px(ox + 10, oy + 8, th.rockDark);
  b.px(ox + 10, oy + 9, th.rockDark);
}

function stump(b, f, ox, oy, c) {
  const { th } = c;
  ground(b, ox, oy, c);
  b.ellipse(ox + 8, oy + 13.5, 6, 1.6, th.groundDark);
  b.rect(ox + 3, oy + 7, 10, 6, th.woodEdge);
  b.rect(ox + 4, oy + 7, 8, 5, th.woodDark);
  b.ellipse(ox + 7.5, oy + 6.5, 5, 2.6, th.woodEdge);
  b.ellipse(ox + 7.5, oy + 6.5, 4, 1.8, th.wood);
  b.px(ox + 7, oy + 6, th.woodDark);
  b.px(ox + 8, oy + 7, th.woodDark);
}

function fence(b, f, ox, oy, c) {
  const { th } = c;
  ground(b, ox, oy, c);
  const vertical = (c.kind('N') === 'fence' || c.kind('S') === 'fence') &&
    c.kind('W') !== 'fence' && c.kind('E') !== 'fence';
  if (vertical) {
    b.rect(ox + 6, oy, 4, 16, th.woodEdge);
    b.rect(ox + 7, oy, 2, 16, th.wood);
    b.rect(ox + 5, oy + 3, 6, 3, th.woodEdge);
    b.rect(ox + 6, oy + 3, 4, 2, th.woodDark);
    b.rect(ox + 5, oy + 11, 6, 3, th.woodEdge);
    b.rect(ox + 6, oy + 11, 4, 2, th.woodDark);
    return;
  }
  for (const y of [5, 10]) {
    b.rect(ox, oy + y, 16, 3, th.woodEdge);
    b.rect(ox, oy + y, 16, 2, th.wood);
  }
  for (const x of [2, 11]) {
    b.rect(ox + x, oy + 2, 4, 13, th.woodEdge);
    b.rect(ox + x + 1, oy + 2, 2, 12, th.woodDark);
    b.px(ox + x + 1, oy + 2, th.wood);
  }
}

function water(b, f, ox, oy, c) {
  const { th, r } = c;
  b.rect(ox, oy, 16, 16, th.water);
  for (let i = 0; i < 2; i++) b.hline(ox + ((r() * 12) | 0), oy + 3 + ((r() * 11) | 0), 3, th.waterDark);
  if (c.tex && c.shore) {
    // Farther from land the water is deeper: more of the same dark dashes.
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 14; x++) {
        const wx = ox + x;
        const wy = oy + y;
        const far = c.shore[wy * ROOM_W + wx] + (c.tex.big(wx / 13, wy / 13) - 0.5) * 16;
        if (far > 20 && speck(wx, wy, c.tex.seed) < (far > 36 ? 0.075 : 0.04)) b.hline(wx, wy, 3, th.waterDark);
      }
    }
  }
  const open = {};
  for (const side of Object.keys(SIDES)) open[side] = !WATERISH.has(c.kind(side));
  for (let i = 0; i < 16; i++) {
    const d = c.r() < 0.5 ? 1 : 2;
    if (open.N) { b.vline(ox + i, oy, d, th.foam); b.px(ox + i, oy + d, th.waterLight); b.px(ox + i, oy + d + 1, th.waterDark); }
    if (open.W) { b.px(ox, oy + i, th.foam); if (d === 2) b.px(ox + 1, oy + i, th.waterLight); }
    if (open.E) { b.px(ox + 15, oy + i, th.foam); if (d === 2) b.px(ox + 14, oy + i, th.waterLight); }
    if (open.S) { b.px(ox + i, oy + 15, th.foam); }
  }
}

function bridge(b, f, ox, oy, c) {
  const { th } = c;
  const eastWest = WATERISH.has(c.kind('N')) && c.kind('N') !== null || WATERISH.has(c.kind('S')) && c.kind('S') !== null;
  b.rect(ox, oy, 16, 16, th.wood);
  if (eastWest) {
    for (let x = 3; x < 16; x += 4) b.vline(ox + x, oy, 16, th.woodDark);
    b.rect(ox, oy, 16, 2, th.woodEdge);
    b.rect(ox, oy + 14, 16, 2, th.woodEdge);
    b.hline(ox, oy + 2, 16, th.woodDark);
  } else {
    for (let y = 3; y < 16; y += 4) b.hline(ox, oy + y, 16, th.woodDark);
    b.rect(ox, oy, 2, 16, th.woodEdge);
    b.rect(ox + 14, oy, 2, 16, th.woodEdge);
  }
}

function wall(b, f, ox, oy, c) {
  const { th, r } = c;
  const front = !WALLISH.has(c.kind('S'));
  const faceH = front ? 7 : 0;
  const topH = 16 - faceH;
  b.rect(ox, oy, 16, topH, th.wallTop);
  for (let i = 0; i < 4; i++) {
    const x = ox + ((r() * 14) | 0);
    const y = oy + ((r() * Math.max(1, topH - 2)) | 0);
    b.px(x, y, th.wallTopDark);
    b.px(x + 1, y, th.wallTopDark);
  }
  if (!WALLISH.has(c.kind('N'))) b.hline(ox, oy, 16, th.wallRim);
  if (!WALLISH.has(c.kind('W'))) b.vline(ox, oy, topH, th.wallRim);
  if (!WALLISH.has(c.kind('E'))) b.vline(ox + 15, oy, topH, th.wallTopDark);
  if (front) {
    b.hline(ox, oy + topH - 1, 16, th.wallRim);
    b.rect(ox, oy + topH, 16, faceH, th.wallFace);
    for (let i = 0; i < 4; i++) {
      const x = ox + 1 + ((r() * 14) | 0);
      b.vline(x, oy + topH + ((r() * 3) | 0), 2 + ((r() * 3) | 0), th.wallFaceDark);
    }
    b.hline(ox, oy + 15, 16, th.wallFaceDark);
  }
}

function cavemouth(b, f, ox, oy, c) {
  const { th } = c;
  b.rect(ox, oy, 16, 16, th.wallFace);
  b.hline(ox, oy, 16, th.wallRim);
  for (let y = 2; y < 16; y++) {
    const inset = y < 4 ? 5 - y : y < 6 ? 2 : 1;
    b.hline(ox + inset + 1, oy + y, 14 - inset * 2, '0');
  }
  b.hline(ox + 4, oy + 15, 8, '1');
  b.hline(ox + 5, oy + 14, 6, '1');
}

function stairsdown(b, f, ox, oy, c) {
  const { th } = c;
  ground(b, ox, oy, c);
  b.rect(ox + 1, oy + 1, 14, 14, th.rockEdge);
  b.rect(ox + 2, oy + 2, 12, 12, '0');
  const steps = ['5', '4', '3', '2'];
  steps.forEach((ch, i) => b.rect(ox + 2, oy + 11 - i * 3, 12, 2, ch));
}

function stairsup(b, f, ox, oy, c) {
  const { th } = c;
  b.rect(ox, oy, 16, 16, th.ground);
  b.rect(ox + 1, oy, 14, 15, th.rockEdge);
  const steps = ['3', '4', '5', '6', '7'];
  steps.forEach((ch, i) => { b.rect(ox + 2, oy + 12 - i * 3, 12, 2, ch); b.hline(ox + 2, oy + 14 - i * 3, 12, '1'); });
}

function voidTile(b, f, ox, oy, c) {
  b.rect(ox, oy, 16, 16, c.th.void);
}

// Trees, flowers and tall grass are painted as bare ground here. What grows on
// them is handed back by paintRoom() and drawn each frame.
const PAINT = {
  ground: (b, f, ox, oy, c) => ground(b, ox, oy, c),
  flowers: (b, f, ox, oy, c) => ground(b, ox, oy, c),
  tallgrass: (b, f, ox, oy, c) => ground(b, ox, oy, c),
  tree: (b, f, ox, oy, c) => ground(b, ox, oy, c),
  path: (b, f, ox, oy, c) => path(b, ox, oy, c),
  sand: (b, f, ox, oy, c) => sand(b, ox, oy, c),
  floor: (b, f, ox, oy, c) => floor(b, ox, oy, c),
  bush, rock, stump, fence, water, bridge, wall, cavemouth, stairsdown, stairsup,
  void: voidTile,
};

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const ROOM_W = COLS * TILE;
const ROOM_H = ROWS * TILE;

/**
 * How far every pixel of a room is from dry land, in pixels. Land is 0. A
 * bridge counts as water, and so does whatever is past the edge of the room.
 * Null when the room has no water.
 */
export function shoreMap(map) {
  const wet = (cx, cy) => { const t = TILES[map[cy][cx]]; return !!t && (t.kind === 'water' || t.kind === 'bridge'); };
  if (!map.some((row) => row.includes('~'))) return null;
  const d = new Float32Array(ROOM_W * ROOM_H);
  for (let y = 0; y < ROOM_H; y++) for (let x = 0; x < ROOM_W; x++) d[y * ROOM_W + x] = wet(x >> 4, y >> 4) ? 1e5 : 0;
  const relax = (i, x, y, w) => {
    if (x < 0 || y < 0 || x >= ROOM_W || y >= ROOM_H) return;
    const v = d[y * ROOM_W + x] + w;
    if (v < d[i]) d[i] = v;
  };
  // Two sweeps, counting 3 for a step and 4 for a diagonal, then back to pixels.
  for (let y = 0; y < ROOM_H; y++) {
    for (let x = 0; x < ROOM_W; x++) {
      const i = y * ROOM_W + x;
      relax(i, x - 1, y, 3); relax(i, x, y - 1, 3); relax(i, x - 1, y - 1, 4); relax(i, x + 1, y - 1, 4);
    }
  }
  for (let y = ROOM_H - 1; y >= 0; y--) {
    for (let x = ROOM_W - 1; x >= 0; x--) {
      const i = y * ROOM_W + x;
      relax(i, x + 1, y, 3); relax(i, x, y + 1, 3); relax(i, x + 1, y + 1, 4); relax(i, x - 1, y + 1, 4);
    }
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

/**
 * Paint a whole room without a browser. Returns its ground as a Buf, 256x192,
 * and what grows on it: `trees` ({ cx, cy, trunk, can }), `flowers`
 * ({ x, y, p, c }) and `blades` ({ x, y }), in room pixels.
 */
export function paintRoom(room) {
  const th = THEMES[room.theme] || THEMES.field;
  const bg = new Buf(ROOM_W, ROOM_H, th.void);
  const base = hashStr(String(room.id));
  const shore = shoreMap(room.map);
  const tex = { big: noiseGrid(base + 5), small: noiseGrid(base + 11), seed: base };
  const trees = [];
  const flowers = [];
  const blades = [];
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      const t = tileAt(room, cx, cy);
      const c = {
        th, tex, shore, self: t.kind,
        r: rng(base + cx * 7919 + cy * 104729),
        kind(side) {
          const [dx, dy] = SIDES[side];
          const n = tileAt(room, cx + dx, cy + dy);
          return n ? n.kind : null;
        },
      };
      (PAINT[t.kind] || PAINT.ground)(bg, null, cx * TILE, cy * TILE, c);
      if (t.kind === 'tree') trees.push({ cx, cy, ...paintTree(th, c.r) });
      else if (t.kind === 'flowers') flowers.push(...flowerSpots(cx * TILE, cy * TILE, c));
      else if (t.kind === 'tallgrass') blades.push(...bladeSpots(cx * TILE, cy * TILE, c));
    }
  }
  return { th, bg, trees, flowers, blades, shore };
}

/**
 * Paint a room for the screen. `bg` is its ground. `trees` is one canvas with
 * every tree of the room side by side, trunks in the top row and leaves under
 * them, and `treeAt` says where each one stands. `water` lists the pixels that
 * are open water, for the ripples.
 */
export function bakeRoom(room) {
  const p = paintRoom(room);
  const n = p.trees.length;
  const sheet = new Buf(Math.max(1, n) * 16, TREE_H * 2);
  p.trees.forEach((t, i) => {
    sheet.stamp(t.trunk.rows(), i * 16, 0);
    sheet.stamp(t.can.rows(), i * 16, TREE_H);
  });
  let water = null;
  if (p.shore) {
    const pix = [];
    for (let y = 0; y < ROOM_H; y++) {
      for (let x = 0; x < ROOM_W; x++) if ((TILES[room.map[y >> 4][x >> 4]] || {}).water) pix.push(y * ROOM_W + x);
    }
    water = Int32Array.from(pix);
  }
  return {
    th: p.th,
    bg: p.bg.toCanvas(`room ${room.id}`),
    trees: n ? sheet.toCanvas(`room ${room.id} trees`) : null,
    treeAt: p.trees.map((t) => [t.cx, t.cy]),
    flowers: p.flowers,
    blades: p.blades,
    shore: p.shore,
    water,
    seed: hashStr(String(room.id)),
  };
}

export { GROUNDISH };
