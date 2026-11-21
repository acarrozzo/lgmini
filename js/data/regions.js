// Light Gray Mini: the air of each region. What moves there, what hour it is
// and what gives off light. Keyed by a room's theme (art-tiles.js). Nothing
// here changes a number in a fight. It is all for the eye.
//
// hour    the time of day the road has reached there (see HOURS). Indoors has none.
// sky     open to the sky: clouds drag their shadows over it.
// dark    no light gets in. The room is dimmed to this much red, green and blue,
//         and the hero carries a light.
// wind    'air' leans the trees, bends flowers and tall grass and sends gusts
//         over the ground. 'water' sways what grows there and nothing else.
// prints  feet leave marks in the ground itself (snow, sand).
// dusty   feet kick up dust on bare ground, not only on paths.
// life    what moves in the air (see LIFE).

/** What an hour does to every color: red, green and blue, each times this. */
export const HOURS = {
  day: null,
  late: [1.04, 0.97, 0.86],
  gold: [1.08, 0.94, 0.72],
  dusk: [0.86, 0.66, 0.9],
  night: [0.4, 0.5, 0.92],
  dawn: [1.05, 0.86, 0.82],
};

/** Everything that can live in a region's air. weather.js draws each one. */
export const LIFE = ['butterfly', 'mote', 'bird', 'leaf', 'shafts', 'firefly', 'fog', 'snow', 'bubble', 'caustics', 'wobble', 'dust', 'drip'];

const CAVE = { dark: [0.25, 0.27, 0.42], dusty: true, life: ['dust', 'drip'] };

export const REGIONS = {
  // Room Zero does not move. The first step into the Field is when the world starts to.
  zero: {},
  rebirth: {},
  field: { hour: 'day', sky: true, wind: 'air', life: ['butterfly', 'mote', 'bird'] },
  beach: { hour: 'day', sky: true, wind: 'air', prints: true, life: ['bird'] },
  marsh: { hour: 'dusk', sky: true, wind: 'air', life: ['firefly', 'fog'] },
  forest: { hour: 'gold', wind: 'air', life: ['leaf', 'mote', 'shafts'] },
  town: { hour: 'late' },
  darkforest: { hour: 'dusk', wind: 'air', life: ['firefly', 'leaf', 'fog'] },
  mountain: { hour: 'night', wind: 'air', prints: true, life: ['snow'] },
  camp: { hour: 'dawn', wind: 'air', life: ['mote', 'butterfly'] },
  underwater: { wind: 'water', life: ['bubble', 'caustics', 'wobble'] },
  cave: CAVE, ogrelair: CAVE, koboldlair: CAVE, spidercave: CAVE, batcave: CAVE, scorpionpit: CAVE,
};

const PLAIN = { hour: 'day', sky: false, dark: null, wind: null, prints: false, dusty: false, life: [] };

/** A room's region, with every field filled in. */
export function regionOf(room) {
  return { ...PLAIN, ...(REGIONS[room && room.theme] || {}) };
}

// What gives off light, by the sprite a room names for it. x and y are pixels
// from the top left of the thing's cell, r is how far the light reaches.
export const LIGHTS = {
  fire: { x: 8, y: 9, r: 54, color: [255, 132, 40], flicker: true },
  pillar: { x: 8, y: -2, r: 40, color: [60, 150, 255] },
  hubPillar: { x: 8, y: -2, r: 40, color: [255, 196, 60] },
  fountain: { x: 16, y: 20, r: 36, color: [90, 170, 255] },
};

/** What the hero carries where it is dark. */
export const LANTERN = { r: 62, color: [120, 96, 60] };
/** A spell lights its own way, yours or theirs. Keyed by the kind of shot. */
export const SHOT_LIGHTS = { orb: { r: 28, color: [70, 150, 255] }, eorb: { r: 28, color: [170, 90, 255] } };
/** A boss can be seen in the dark. Nothing else can until it is close. */
export const BOSS_LIGHT = { r: 46, color: [110, 40, 40] };
