// Light Gray Mini: the parts that run without a browser.

import test from 'node:test';
import assert from 'node:assert/strict';

const load = (name) => import(`../js/${name}`);

/** A random source that replays a fixed list, then repeats the last value. */
function fixed(...values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

test('mini: the world data is consistent', async () => {
  const { validateWorld } = await load('world.js');
  assert.deepEqual(validateWorld(), []);
});

test('mini: every room edge that opens has a way back', async () => {
  const { neighbor, EDGES } = await load('world.js');
  const { ROOMS } = await load('data/rooms.js');
  for (const id of Object.keys(ROOMS)) {
    for (const edge of Object.keys(EDGES)) {
      const nb = neighbor(id, edge);
      if (nb) assert.equal(neighbor(nb, EDGES[edge].opposite), id, `${id} ${edge} -> ${nb} does not return`);
    }
  }
});

test('mini: every sprite grid fits and uses real palette colors', async () => {
  const { checkArt } = await load('art-sprites.js');
  const { PAL } = await load('gfx.js');
  assert.deepEqual(checkArt(PAL), []);
});

test('mini: every song track fits its song', async () => {
  const { SONGS } = await load('songs.js');
  const { songShape, noteHz } = await load('audio.js');
  for (const [name, song] of Object.entries(SONGS)) {
    const shape = songShape(song);
    assert.ok(shape.steps > 0 && shape.steps % 16 === 0, `${name} is ${shape.steps} steps, not whole bars`);
    assert.equal(shape.misfit, 0, `${name} has a track that does not divide the song`);
  }
  assert.equal(Math.round(noteHz('a4')), 440);
  assert.equal(Math.round(noteHz('bb3')), 233);
});

test('mini: the XP curve is the original cubic one', async () => {
  const R = await load('rules.js');
  // Light Gray RPG: getNextLevelXP(level) = (level + 1)^3 * 2, cumulative.
  assert.deepEqual([1, 2, 3, 4, 9].map(R.nextLevelXp), [16, 54, 128, 250, 2000]);
  const p = R.newPlayer();
  assert.deepEqual(R.addXp(p, 15), []);
  const ups = R.addXp(p, 1);
  assert.equal(ups.length, 1);
  assert.equal(p.level, 2);
  assert.equal(p.cp, 2, 'one point per level, on top of the starting one');
  assert.equal(p.hp, p.hpMax, 'a level-up restores HP');
  // A big reward can cross several levels at once.
  const q = R.newPlayer();
  assert.equal(R.addXp(q, 130).length, 3);
  assert.equal(q.level, 4);
});

test('mini: a hit is an offensive roll minus a defensive roll, floored at zero', async () => {
  const R = await load('rules.js');
  assert.deepEqual(R.opposedRoll(5, 3, fixed(0.99, 0)), { a: 5, d: 0, dmg: 5 });
  assert.deepEqual(R.opposedRoll(5, 3, fixed(0, 0.99)), { a: 0, d: 3, dmg: 0 });
  assert.equal(R.opposedRoll(0, 0).dmg, 0, 'no strength, no damage');
  assert.equal(R.opposedRoll(-4, 2, fixed(0.99, 0)).a, 0, 'gear can push a stat below zero; the roll floors');
  for (let i = 0; i < 200; i++) {
    const r = R.opposedRoll(7, 4);
    assert.ok(r.a >= 0 && r.a <= 7 && r.d >= 0 && r.d <= 4 && r.dmg === Math.max(0, r.a - r.d));
  }
});

test('mini: each attack type is blocked by its own stat', async () => {
  const R = await load('rules.js');
  const stats = { str: 9, dex: 2, def: 5, mag: 7 };
  assert.equal(R.defenseFor('melee', stats), 5);
  assert.equal(R.defenseFor('ranged', stats), 2);
  assert.equal(R.defenseFor('magic', stats), 7);
  // The Gator's bite: one hit in five lands at twice full attack.
  const bite = R.enemyHit({ att: 8, type: 'melee', special: 'bite' }, stats, fixed(0.1, 0));
  assert.deepEqual(bite, { a: 16, d: 0, dmg: 16, special: 'bite' });
});

test('mini: gear is worn when it is better, and counts toward stats', async () => {
  const R = await load('rules.js');
  const p = R.newPlayer();
  assert.equal(R.takeGear(p, 'long-sword'), true);
  assert.equal(R.takeGear(p, 'training-sword'), false, 'a worse sword goes in the pack, not the hand');
  assert.equal(p.gear.sword, 'long-sword');
  R.takeGear(p, 'kite-shield');
  R.takeGear(p, 'padded-armor');
  assert.deepEqual(R.effectiveStats(p), { str: 5, dex: 0, def: 14, mag: 0 });
});

test('mini: food heals up to the cap and is not wasted when full', async () => {
  const R = await load('rules.js');
  const p = R.newPlayer();
  R.addItem(p, 'redberry', 3);
  assert.equal(p.quick, 'redberry', 'the first food lands on the X button');
  assert.deepEqual(R.useItem(p, 'redberry'), { hp: 0, mp: 0, wasted: true });
  assert.equal(p.bag.redberry, 3, 'a full Wanderer keeps the berry');
  p.hp = 7;
  assert.deepEqual(R.useItem(p, 'redberry'), { hp: 3, mp: 0, wasted: false });
  assert.equal(p.bag.redberry, 2);
  assert.equal(R.addItem(p, 'flower', 5), 1, 'one flower at a time');
});

test('mini: the Old Man and the Soldier hand out their quests in order', async () => {
  const R = await load('rules.js');
  const { currentQuest, questProgress, QUESTS } = await load('data/quests.js');
  const p = R.newPlayer();
  assert.equal(currentQuest(p, 'old_man'), 'oldman_001');
  assert.equal(questProgress(p, 'oldman_001').met, false);
  R.addItem(p, 'flower', 1);
  assert.equal(questProgress(p, 'oldman_001').met, true);
  p.quests.oldman_001 = 'done';
  assert.equal(currentQuest(p, 'old_man'), 'oldman_002');
  p.kills['giant-rat'] = 1;
  assert.deepEqual(questProgress(p, 'oldman_002'), { have: 1, want: 2, met: false });
  p.kills['giant-rat'] = 5;
  assert.deepEqual(questProgress(p, 'oldman_002'), { have: 2, want: 2, met: true });
  assert.equal(currentQuest(p, 'young_soldier'), 'soldier_001');
  R.takeGear(p, 'training-sword');
  assert.equal(questProgress(p, 'soldier_001').met, true);
  assert.equal(currentQuest(p, 'shaman'), null, 'the Shaman has no quests');
  for (const q of Object.values(QUESTS)) assert.ok(q.remind && q.done && q.early && q.title);
});

test('mini: a giver asks, reminds, and takes a quest, and takes one done early in a single breath', async () => {
  const R = await load('rules.js');
  const { questBeat } = await load('data/quests.js');
  const p = R.newPlayer();
  assert.deepEqual(questBeat(p, 'old_man'), { quest: 'oldman_001', kind: 'offer' });
  p.quests.oldman_001 = 'active';
  assert.equal(questBeat(p, 'old_man').kind, 'remind');
  R.addItem(p, 'flower', 1);
  assert.equal(questBeat(p, 'old_man').kind, 'done');
  // Never asked, already done: one line asks and thanks.
  const q = R.newPlayer();
  R.addItem(q, 'flower', 1);
  assert.deepEqual(questBeat(q, 'old_man'), { quest: 'oldman_001', kind: 'early' });
  // The next quest in a chain can be early too, so one visit can hand in several.
  q.quests.oldman_001 = 'done';
  q.kills['giant-rat'] = 2;
  assert.deepEqual(questBeat(q, 'old_man'), { quest: 'oldman_002', kind: 'early' });
  q.quests.oldman_002 = 'done';
  assert.deepEqual(questBeat(q, 'old_man'), { quest: 'oldman_003', kind: 'offer' });
  assert.equal(questBeat(q, 'shaman'), null, 'nothing to say about quests');
});

test('mini: handing a quest in takes what it asked for and pays what it promised', async () => {
  const R = await load('rules.js');
  const { QUESTS, currentQuest } = await load('data/quests.js');
  const p = R.newPlayer();
  R.addItem(p, 'scorpion-tail', 7);
  p.quests.soldier_001 = 'done';
  p.quests.soldier_002 = 'active';
  const ups = R.finishQuest(p, 'soldier_002', QUESTS.soldier_002);
  assert.equal(p.quests.soldier_002, 'done');
  assert.equal(p.bag['scorpion-tail'], 2, 'five tails are taken, the rest are yours');
  assert.equal(p.gold, 100);
  assert.equal(p.xp, 50);
  assert.equal(p.bag['gold-key'], 1);
  assert.deepEqual(ups.map((u) => u.level), [2], 'the XP is added, and the levels it gave come back');
  assert.equal(currentQuest(p, 'young_soldier'), null);
  // A kill quest takes nothing; gear it pays is worn when it is better.
  const j = R.newPlayer();
  R.finishQuest(j, 'jack_001', { ...QUESTS.jack_001, consume: false });
  assert.equal(j.gear.ranged, 'long-bow');
});

test('mini: gear goes where Anthony put it', async () => {
  const { QUESTS, PEOPLE } = await load('data/quests.js');
  const { ENEMIES } = await load('data/enemies.js');
  const { ROOMS } = await load('data/rooms.js');
  const { ITEMS } = await load('data/items.js');
  const pays = (id) => (QUESTS[id].reward.items || []).map(([slug]) => slug);
  assert.deepEqual(pays('oldman_003'), ['wooden-staff'], 'the Gator quest pays the first staff');
  assert.deepEqual(pays('jack_001'), ['long-bow'], 'the bat quest pays the first bow');
  assert.deepEqual(pays('jack_000'), ['battle-axe']);
  assert.deepEqual(pays('warriors_000'), ['iron-sword']);
  assert.deepEqual(pays('wizards_000'), ['iron-staff'], 'the two guilds pay the same tier');
  assert.deepEqual(pays('ranger_001'), ['iron-bow']);
  // The Long Sword is in the chest where the scorpions are, not on the Alpha Scorpion.
  assert.equal(ENEMIES['alpha-scorpion'].first, undefined);
  assert.equal(ENEMIES['goblin-chief'].first, undefined);
  const cave = ROOMS['010'];
  assert.ok(cave.spawns.some(([slug]) => slug === 'alpha-scorpion'));
  assert.ok(cave.things.some((t) => t.t === 'chest' && t.loot.items.some(([slug]) => slug === 'long-sword')));
  // Gone from the game.
  assert.equal(ITEMS['wooden-bow'], undefined);
  assert.equal(ITEMS.wand, undefined);
  assert.equal(QUESTS.grand_field, undefined);
  assert.equal(PEOPLE.guardian_angel.quests, undefined, 'the Guardian Angel still talks, and asks for nothing');
});

test('mini: a save holding gear the game dropped wears the best of what is left', async () => {
  const R = await load('rules.js');
  const p = R.newPlayer();
  R.takeGear(p, 'boomerang');
  R.takeGear(p, 'wooden-staff');
  Object.assign(p.owned, { 'wooden-bow': true, wand: true });
  Object.assign(p.gear, { ranged: 'wooden-bow', staff: 'wand' });
  p.bag['old-thing'] = 2;
  p.quick = 'old-thing';
  R.dropLostItems(p);
  assert.deepEqual([p.gear.ranged, p.gear.staff], ['boomerang', 'wooden-staff']);
  assert.deepEqual(Object.keys(p.owned).sort(), ['boomerang', 'wooden-staff']);
  assert.deepEqual([p.bag['old-thing'], p.quick], [undefined, null]);
  // Nothing to fall back on: the slot is empty, and an empty slot is left alone.
  const q = R.newPlayer();
  q.gear.ranged = 'wooden-bow';
  R.dropLostItems(q);
  assert.deepEqual(q.gear, R.newPlayer().gear);
});

test('mini: the quest card has a plate for everything a quest pays, and they fit the screen', async () => {
  const U = await load('ui.js');
  const { QUESTS } = await load('data/quests.js');
  const { GLYPHS } = await load('font.js');
  const { W, H, HUD_H } = await load('gfx.js');
  const { plain } = await load('world.js');
  assert.deepEqual(U.questRewards(QUESTS.ranger_001), [
    { mark: 'coin', text: '400', color: 'J' },
    { mark: 'star', text: '600 XP', color: 'I' },
    { mark: 'bow', text: 'Iron Bow', color: '9', note: '+18 DEX' },
  ]);
  assert.equal(U.questRewards(QUESTS.oldman_002)[2].text, '5 Cooked Meat');
  for (const [id, q] of Object.entries(QUESTS)) {
    const rewards = U.questRewards(q);
    const rows = U.plateRows(rewards);
    assert.equal(rows.flat().length, rewards.length, `${id} lost a plate`);
    assert.ok(rows.length >= 1 && rows.length <= 2, `${id} needs ${rows.length} rows of plates`);
    // The card moves up half a row for each row it adds. Its button must stay on the screen.
    const top = HUD_H + 34 - (rows.length - 1) * 11;
    assert.ok(top >= HUD_H + 4 && top + 66 + rows.length * 22 + 8 <= H, `${id}: the card does not fit with ${rows.length} rows`);
    for (const row of rows) {
      const width = row.reduce((n, r) => n + U.plateWidth(r), 0) + (row.length - 1) * 5;
      assert.ok(width <= W - 16, `${id} has a row of plates ${width} wide`);
    }
    assert.ok(q.title.length * 6 <= W - 16, `${id} has a title too long for the card`);
    for (const ch of plain(q.early)) assert.ok(GLYPHS[ch] !== undefined, `no glyph for "${ch}" in: ${q.early}`);
  }
  // Too many for one row: they wrap, in order, and none is split.
  const many = [1, 2, 3, 4].map((n) => ({ mark: 'key', text: `Reward number ${n}`, color: '9' }));
  assert.deepEqual(U.plateRows(many).map((r) => r.length), [2, 2]);
});

test('mini: gates read the same conditions the rooms declare', async () => {
  const R = await load('rules.js');
  const { check, edgeGate } = await load('world.js');
  const p = R.newPlayer();
  assert.match(edgeGate(p, '004', 'W'), /sand crabs/);
  R.takeGear(p, 'training-sword');
  assert.equal(edgeGate(p, '004', 'W'), null);
  assert.match(edgeGate(p, '006', 'E'), /Gold Chest/);
  p.flags.chest1 = true;
  assert.equal(edgeGate(p, '006', 'E'), null);
  // The Forest waits on Jack; Red Town on an Ogre; the Magical Gate on the Kobold Master.
  assert.match(edgeGate(p, '023', 'E'), /Jack Lumber/);
  assert.match(edgeGate(p, '107', 'S'), /killing an Ogre/);
  p.kills.ogre = 1;
  assert.equal(edgeGate(p, '107', 'S'), null);
  assert.match(edgeGate(p, '114', 'N'), /Magical Gate/);
  p.kills['kobold-master'] = 1;
  assert.equal(edgeGate(p, '114', 'N'), null, 'the kill alone opens it, as in the main game');
  // The toll takes gold or a fight.
  assert.match(edgeGate(p, '504', 'W'), /toll/);
  p.flags.toll = true;
  assert.equal(edgeGate(p, '504', 'W'), null);
  assert.equal(check(p, { has: 'gills' }), false);
  R.addItem(p, 'gills', 1);
  assert.equal(check(p, { has: 'gills' }), true);
  assert.equal(check(p, { all: [{ quest: 'oldman_001' }, { sword: true }] }), false);
  p.quests.oldman_001 = 'done';
  assert.equal(check(p, { all: [{ quest: 'oldman_001' }, { sword: true }] }), true);
});

test('mini: the Blue Gate opens on three kings, in any order', async () => {
  const R = await load('rules.js');
  const { questProgress } = await load('data/quests.js');
  const { edgeGate } = await load('world.js');
  const p = R.newPlayer();
  assert.deepEqual(questProgress(p, 'rigel_001'), { have: 0, want: 3, met: false });
  p.kills['giant-mountain-giant'] = 1;
  p.kills['troll-king'] = 2;
  assert.deepEqual(questProgress(p, 'rigel_001'), { have: 2, want: 3, met: false });
  p.kills.kraken = 1;
  assert.equal(questProgress(p, 'rigel_001').met, true);
  assert.match(edgeGate(p, '611', 'W'), /Blue Gate/, 'the kills are not enough; Rigel has to be told');
  p.quests.rigel_001 = 'done';
  assert.equal(edgeGate(p, '611', 'W'), null);
});

test('mini: you can walk from Room Zero to Camp Hero', async () => {
  const { ROOMS } = await load('data/rooms.js');
  const { neighbor, EDGES } = await load('world.js');
  // Every room reachable from the start by edges, stairs, doors and pillars, ignoring gates.
  const seen = new Set(['000']);
  const todo = ['000'];
  while (todo.length) {
    const id = todo.pop();
    const room = ROOMS[id];
    const next = [];
    for (const edge of Object.keys(EDGES)) next.push(neighbor(id, edge));
    for (const w of room.warps || []) next.push(w.to);
    for (const t of room.things || []) if (t.to && t.to !== 'hub') next.push(t.to);
    for (const n of next) if (n && !seen.has(n)) { seen.add(n); todo.push(n); }
  }
  const lost = Object.keys(ROOMS).filter((id) => !seen.has(id) && id !== '999');
  assert.deepEqual(lost, [], 'rooms nobody can get to');
  assert.ok(seen.has('701'));
  assert.ok(Object.keys(ROOMS).length >= 60);
});

test('mini: everything the data names can be drawn', async () => {
  const { hasArt, THING_SPRITES, LOOKS } = await load('art-sprites.js');
  const { ENEMIES } = await load('data/enemies.js');
  const { ROOMS } = await load('data/rooms.js');
  const { PEOPLE } = await load('data/quests.js');
  const { THEMES } = await load('art-tiles.js');
  const { SONGS } = await load('songs.js');
  for (const [slug, def] of Object.entries(ENEMIES)) assert.ok(hasArt(def), `no art for enemy ${slug}`);
  for (const [id, person] of Object.entries(PEOPLE)) assert.ok(LOOKS[person.look], `no look for ${id}`);
  for (const [id, room] of Object.entries(ROOMS)) {
    assert.ok(THEMES[room.theme], `room ${id}: unknown theme ${room.theme}`);
    assert.ok(SONGS[room.music], `room ${id}: unknown song ${room.music}`);
    for (const t of room.things || []) {
      if (t.sprite) assert.ok(THING_SPRITES.has(t.sprite), `room ${id}: unknown sprite ${t.sprite}`);
      if (t.heldSprite) assert.ok(THING_SPRITES.has(t.heldSprite), `room ${id}: unknown sprite ${t.heldSprite}`);
      if (t.look) assert.ok(LOOKS[t.look], `room ${id}: unknown look ${t.look}`);
    }
  }
});

test('mini: a fight takes a sane number of swings at the level you meet it', async () => {
  const { ENEMIES } = await load('data/enemies.js');
  // Expected damage of one opposed roll, exactly.
  const expected = (off, def) => {
    let sum = 0;
    for (let a = 0; a <= off; a++) for (let d = 0; d <= def; d++) sum += Math.max(0, a - d);
    return sum / ((off + 1) * (def + 1));
  };
  // Roughly the STR a Wanderer brings: 60% of their points, plus the sword of the day.
  const sword = (lv) => (lv >= 18 ? 27 : lv >= 12 ? 18 : lv >= 9 ? 11 : lv >= 4 ? 5 : 3);
  for (const [slug, e] of Object.entries(ENEMIES)) {
    const off = Math.round(e.level * 0.6) + sword(e.level);
    const swings = e.hp / expected(off, e.def);
    const cap = e.boss ? 90 : 14;
    assert.ok(swings <= cap, `${slug} takes about ${Math.round(swings)} swings at level ${e.level}`);
  }
});

test('mini: the map shows where you have been and where the roads go', async () => {
  const R = await load('rules.js');
  const M = await load('map.js');
  const p = R.newPlayer();
  p.seen['000'] = true;
  assert.deepEqual([...M.knownRooms(p)], [], 'Room Zero has no doors, so it promises nothing');
  assert.equal(M.roomsFound(p), 1);
  p.seen['001'] = true;
  assert.deepEqual([...M.knownRooms(p)].sort(), ['002', '004', '005', '006'], 'the four roads off the Crossroads');
  p.seen['006'] = true;
  assert.ok(M.knownRooms(p).has('023'), 'a gated road still shows: you can see it from here');
  assert.ok(!M.knownRooms(p).has('101'), 'but not what lies two rooms on');
  p.seen['stale-room-from-an-old-save'] = true;
  assert.equal(M.roomsFound(p), 3, 'a room that no longer exists is not counted');
  assert.doesNotThrow(() => M.knownRooms(p));
});

test('mini: the overworld fits the map screen, and every pillar is on it', async () => {
  const M = await load('map.js');
  const { ROOMS } = await load('data/rooms.js');
  const lay = M.sheetLayout('field');
  // One pixel per tile with a pixel between rooms, inside a 240 by 117 window.
  assert.ok(lay.cols * 17 - 1 <= 240 && lay.rows * 13 - 1 <= 117, `the overworld is ${lay.cols} by ${lay.rows}`);
  for (const [id, room] of Object.entries(ROOMS)) {
    assert.ok(M.SHEET_NAME[room.sheet], `room ${id} is on a sheet with no name`);
    if (room.hub) assert.equal(room.sheet, 'field', `gold pillar ${id} is not on the overworld`);
    if (room.sheet !== 'field') {
      const small = M.sheetLayout(room.sheet);
      assert.ok(small.cols * 49 - 1 <= 240 && small.rows * 37 - 1 <= 117, `sheet ${room.sheet} is too big to draw`);
    }
  }
});

test('mini: the cursor steps between rooms you know, and stairs lead between sheets', async () => {
  const M = await load('map.js');
  const all = () => true;
  assert.equal(M.stepCursor('001', 1, 0, all), '006');
  assert.equal(M.stepCursor('001', 0, -1, all), '005');
  assert.equal(M.stepCursor('001', 1, 0, (id) => id === '104'), '104', 'it skips what it may not land on');
  assert.equal(M.stepCursor('617', 0, -1, all), null, 'nothing is north of the Giant');
  assert.equal(M.stepCursor('026', 0, 1, all), null, 'it does not leap across the world for want of a neighbor');
  const pillars = (id) => ['001', '104', '210', '413', '507', '605', '701'].includes(id);
  assert.equal(M.stepCursor('210', 0, -1, pillars, true), '104');
  assert.equal(M.stepCursor('001', -1, 0, pillars, true), '413', 'between pillars it may jump as far as it must');
  for (const from of ['001', '104', '210', '413', '507', '605', '701']) {
    const reach = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => M.stepCursor(from, dx, dy, pillars, true)).filter(Boolean);
    assert.ok(reach.length > 0, `pillar ${from} can reach another`);
  }
  assert.equal(M.stairsLink('007'), '008');
  assert.equal(M.stairsLink('008'), '007');
  assert.equal(M.stairsLink('410'), '486');
  assert.equal(M.stairsLink('020'), null, 'the waterfall stays on one sheet');
  assert.equal(M.stairsLink('999'), null);
  assert.deepEqual(M.roomNotes('210'), ['Gold pillar', 'Rest']);
  assert.deepEqual(M.roomNotes('003'), ['Way down']);
});

test('mini: the map marks who is waiting on you', async () => {
  const R = await load('rules.js');
  const M = await load('map.js');
  const p = R.newPlayer();
  assert.deepEqual(M.questMark(p, '003'), { kind: 'offer', who: 'old_man', quest: 'oldman_001' });
  assert.equal(M.questMark(p, '007'), null, 'the Soldier will not talk until you have met the Old Man');
  p.met.old_man = true;
  p.quests.oldman_001 = 'active';
  assert.equal(M.questMark(p, '003'), null, 'a quest in progress is not a reason to go back yet');
  assert.equal(M.questMark(p, '007').kind, 'offer');
  R.addItem(p, 'flower', 1);
  assert.equal(M.questMark(p, '003').kind, 'ready');
  assert.equal(M.questMark(p, '001'), null);
  assert.equal(M.questMark(p, '024'), null, 'Jack waits on the gold chest');
});

test('mini: finding every room is every room but the Plane of Rebirth', async () => {
  const R = await load('rules.js');
  const M = await load('map.js');
  const { ROOMS } = await load('data/rooms.js');
  const p = R.newPlayer();
  for (const id of Object.keys(ROOMS)) if (id !== '999' && id !== '617') p.seen[id] = true;
  assert.equal(M.foundEverything(p), false);
  p.seen['617'] = true;
  assert.equal(M.foundEverything(p), true, 'nobody has to die to finish the map');
  assert.equal(M.roomsFound(p), Object.keys(ROOMS).length - 1);
});

test('mini: a button is called what it is on the thing you are holding', async () => {
  const I = await load('input.js');
  I.setDevice('keys');
  assert.deepEqual(['a', 'b', 'y', 'x', 'start', 'map', 'back'].map(I.label), ['Z', 'X', 'C', 'V', 'Enter', 'Tab', 'Esc']);
  assert.equal(I.withKeys('{a} swings. {b} throws. {start} is your bag.'), 'Z swings. X throws. Enter is your bag.');
  I.setDevice('touch');
  assert.deepEqual(['a', 'b', 'y', 'x', 'start', 'map', 'back'].map(I.label), ['A', 'B', 'Y', 'X', 'START', 'MAP', 'B']);
  assert.equal(I.withKeys('{move} {x} eats.'), 'The pad moves you. X eats.');
  assert.equal(I.withKeys('No keys here. {nope}'), 'No keys here. {nope}');
  I.setDevice('nonsense');
  assert.equal(I.currentDevice(), 'touch', 'an unknown device changes nothing');
  I.setDevice('keys');
});

test('mini: no text in the data names a pad button outright', async () => {
  const { ROOMS } = await load('data/rooms.js');
  const { QUESTS, PEOPLE, ENDING } = await load('data/quests.js');
  // "A swings" would be wrong on a keyboard. Lines name buttons with {a}, {b}, {x}, {y}.
  const bad = /\b[ABXY] (swings|throws|casts|eats|talks|closes|buys|uses|opens)\b|\bSTART (is|opens|closes)\b/;
  const lines = [];
  for (const room of Object.values(ROOMS)) for (const t of room.things || []) lines.push(...[t.text, t.full, t.msg, t.ask, t.locked, t.noTool].flat().filter(Boolean));
  for (const q of Object.values(QUESTS)) lines.push(q.remind, q.done, q.early, q.objective);
  for (const person of Object.values(PEOPLE)) lines.push(person.greeting, person.locked, ...(person.idle || []));
  lines.push(...ENDING.reached, ...ENDING.reward, ...ENDING.credits, ENDING.untimed);
  for (const line of lines.filter(Boolean)) assert.ok(!bad.test(line), `names a button outright: ${line}`);
});

test('mini: the middle of the Grassy Field is open ground', async () => {
  const { ROOMS } = await load('data/rooms.js');
  const trees = (id) => ROOMS[id].map.join('').split('T').length - 1;
  assert.equal(trees('001'), 0, 'no trees at the Crossroads');
  // The eight rooms around it keep trees only on their outer sides.
  for (const [id, inner] of Object.entries({ '005': 'S', '002': 'N', '004': 'E', '006': 'W' })) {
    const m = ROOMS[id].map;
    const edge = inner === 'S' ? m[11] : inner === 'N' ? m[0] : m.map((r) => r[inner === 'E' ? 15 : 0]).join('');
    assert.ok(!edge.includes('T'), `room ${id} still has trees on the side facing the Crossroads`);
  }
});

test('mini: a tree gives two wood until the place or the bag says stop', async () => {
  const R = await load('rules.js');
  const p = R.newPlayer();
  const jacks = { item: 'wood', gives: 2, upTo: 10 };
  const forest = { item: 'wood', gives: 2, upTo: 20 };
  assert.equal(R.chopYield(p, jacks), 2);
  p.bag.wood = 9;
  assert.equal(R.chopYield(p, jacks), 1, 'the last tree tops you up and no further');
  p.bag.wood = 10;
  assert.equal(R.chopYield(p, jacks), 0, 'Jack lets you take ten');
  assert.equal(R.chopYield(p, forest), 2, 'the Forest goes on to twenty');
  p.bag.wood = 20;
  assert.equal(R.chopYield(p, { item: 'wood', gives: 2, upTo: 99 }), 0, 'the bag holds twenty whatever the place says');
  assert.equal(R.chopYield(p, { item: 'nothing', gives: 2, upTo: 9 }), 0);
});

test("mini: the hatchet is at Jack's cabin, and the pines add up to a boat", async () => {
  const { ROOMS } = await load('data/rooms.js');
  const { ITEMS } = await load('data/items.js');
  const { neighbor } = await load('world.js');
  const things = (id) => ROOMS[id].things || [];
  const where = (pick) => Object.keys(ROOMS).filter((id) => things(id).some(pick)).sort();
  assert.deepEqual(where((t) => t.t === 'take' && t.item === 'hatchet'), ['024']);
  assert.equal(neighbor('024', 'N'), '025', "Jack's trees are one screen north of his cabin");
  assert.deepEqual(where((t) => t.t === 'chop'), ['025', '101']);
  const farm = things('025').filter((t) => t.t === 'chop');
  assert.equal(farm[0].upTo, 10);
  assert.ok(farm.reduce((n, t) => n + t.gives, 0) >= 10, 'one visit to the farm is enough for the ten Jack allows');
  assert.equal(things('101').find((t) => t.t === 'chop').upTo, ITEMS.wood.cap, 'the Forest fills the bag: the twenty a boat costs');
  // Nothing still hands out wood for free.
  assert.deepEqual(where((t) => t.t === 'take' && t.item === 'wood'), []);
});

test('mini: a roll in the top tenth is a crit, and a crit doubles the damage', async () => {
  const R = await load('rules.js');
  assert.equal(R.isCrit(3, 3), true);
  assert.equal(R.isCrit(2, 3), false);
  assert.equal(R.isCrit(2, 2), false, 'a roll that small is never a crit');
  assert.equal(R.isCrit(9, 10), true);
  assert.equal(R.isCrit(8, 10), false);
  // The attack rolls first, then the block. 0.99 is the top of a range, 0 the bottom.
  const crit = R.strike(10, 4, fixed(0.99, 0));
  assert.deepEqual([crit.a, crit.d, crit.dmg, crit.crit], [10, 0, 20, true]);
  assert.deepEqual([crit.aMax, crit.dMax], [10, 4], 'both ranges come back so the dice can be shown');
  const plainHit = R.strike(10, 4, fixed(0.5, 0.5));
  assert.deepEqual([plainHit.a, plainHit.d, plainHit.dmg, plainHit.crit], [5, 2, 3, false]);
  const blocked = R.strike(3, 9, fixed(0.99, 0.99));
  assert.deepEqual([blocked.dmg, blocked.crit], [0, false], 'a top roll that is blocked whole is not a crit');
});

test('mini: Magic Missile is a hit like any other, blocked by DEF, and it crits', async () => {
  const R = await load('rules.js');
  const missile = R.SPELLS.missile;
  // 1 + spell level on top of a MAG roll. The attack rolls first, then the block.
  const plainHit = missile.roll(10, 4, fixed(0.5, 0.5));
  assert.deepEqual([plainHit.a, plainHit.d, plainHit.dmg, plainHit.crit], [7, 2, 5, false]);
  assert.deepEqual([plainHit.aMax, plainHit.dMax], [12, 4], 'both dice can be shown, the flat 2 on the attack die');
  const blocked = missile.roll(10, 12, fixed(0.3, 0.99));
  assert.deepEqual([blocked.a, blocked.d, blocked.dmg], [5, 12, 0], 'DEF can stop it whole');
  const crit = missile.roll(10, 4, fixed(0.99, 0.5));
  assert.deepEqual([crit.a, crit.d, crit.dmg, crit.crit], [12, 2, 20, true], 'a top MAG roll doubles what gets through');
  const noMag = missile.roll(0, 0, fixed(0.99, 0));
  assert.deepEqual([noMag.dmg, noMag.crit], [2, false], 'with no MAG it is the flat 2, and never a crit');
  // The flat 2 does not make crits more common: 9 of 0..10 is a crit, 8 is not.
  assert.equal(missile.roll(10, 0, fixed(0.75, 0)).crit, false);
  for (let i = 0; i < 200; i++) {
    const r = missile.roll(7, 4);
    assert.ok(r.a >= 2 && r.a <= 9 && r.d >= 0 && r.d <= 4);
    assert.equal(r.dmg, Math.max(0, r.a - r.d) * (r.crit ? 2 : 1));
  }
});

test('mini: a staff is worth what the sword and bow of its tier are', async () => {
  const { ITEMS } = await load('data/items.js');
  const { QUESTS } = await load('data/quests.js');
  const tier = (t) => [ITEMS[`${t}-sword`].str, ITEMS[`${t}-bow`].dex, ITEMS[`${t}-staff`].mag];
  for (const t of ['iron', 'steel']) {
    const [str, dex, mag] = tier(t);
    assert.ok(str === dex && dex === mag, `${t}: sword ${str}, bow ${dex}, staff ${mag}`);
  }
  // The first staff, the first sword and the first thing you throw are all a 3.
  assert.equal(ITEMS['basic-staff'].mag, ITEMS['training-sword'].str);
  assert.equal(ITEMS['wooden-staff'].mag, ITEMS['training-sword'].str);
  assert.equal(ITEMS['wooden-staff'].mag, ITEMS.boomerang.dex);
});

test('mini: at the same number, a spell lands a little more than an arrow and never twice as much', async () => {
  const R = await load('rules.js');
  const { ENEMIES } = await load('data/enemies.js');
  // Expected damage of a strike, crits and all, exactly.
  const expected = (off, def, flat = 0) => {
    let sum = 0;
    for (let a = 0; a <= off; a++) for (let d = 0; d <= def; d++) {
      const dmg = Math.max(0, flat + a - d);
      sum += dmg > 0 && R.isCrit(a, off) ? dmg * 2 : dmg;
    }
    return sum / ((off + 1) * (def + 1));
  };
  for (const [slug, e] of Object.entries(ENEMIES)) {
    if (e.level < 6) continue;    // before the first bow and staff the numbers are too small to compare
    const stat = Math.round(e.level * 0.6) + (e.level >= 18 ? 27 : e.level >= 12 ? 18 : 11);
    const arrow = expected(stat, e.def);
    const spell = expected(stat, e.def, R.SPELLS.missile.flat);
    assert.ok(spell > arrow && spell < arrow * 1.35, `${slug}: arrow ${arrow.toFixed(1)}, spell ${spell.toFixed(1)}`);
  }
});

test('mini: a better sword is a bigger sword, and a bigger sword reaches farther', async () => {
  const R = await load('rules.js');
  const { ITEMS } = await load('data/items.js');
  const { BLADES, bladeLength } = await load('art-sprites.js');
  const swords = Object.entries(ITEMS).filter(([, item]) => item.slot === 'sword').sort((a, b) => a[1].str - b[1].str);
  for (const [id] of swords) assert.ok(BLADES[id], `no blade drawn for ${id}`);
  assert.ok(BLADES.hatchet, 'the hatchet is swung too');
  for (let i = 1; i < swords.length; i++) {
    const [worse, better] = [swords[i - 1][0], swords[i][0]];
    assert.ok(bladeLength(better) > bladeLength(worse), `${better} is not longer than ${worse}`);
    assert.ok(R.swingReach(bladeLength(better)) >= R.swingReach(bladeLength(worse)), `${better} reaches less than ${worse}`);
  }
  assert.equal(R.swingReach(0), 8, 'no sword is a punch');
  assert.equal(R.swingReach(bladeLength('training-sword')), 15, 'the first sword reaches what every sword used to');
  assert.equal(R.swingReach(bladeLength('long-sword')), 15);
  assert.equal(R.swingReach(bladeLength('mithril-sword')), 23);
});

test('mini: a blade is painted around the hand, the same at every quarter turn', async () => {
  const { BLADES, TURN, paintBlade, paintTrail, bladeLength } = await load('art-sprites.js');
  const ink = (buf) => buf.d.filter((ch) => ch !== '.').length;
  for (const name of Object.keys(BLADES)) {
    const up = paintBlade(name, 0);
    const mid = (up.w - 1) / 2;
    assert.notEqual(up.get(mid, mid), '.', `${name}: the hand holds nothing`);
    assert.notEqual(up.get(mid, mid - bladeLength(name) + 1), '.', `${name}: stops short of its length`);
    assert.equal(up.get(mid, mid - bladeLength(name)), '.', `${name}: runs past its length`);
    for (const turn of [4, 8, 12]) assert.equal(ink(paintBlade(name, turn)), ink(up), `${name}: turn ${turn} is not the same blade`);
    for (let turn = 0; turn < TURN; turn++) assert.ok(ink(paintBlade(name, turn)) > 0, `${name}: nothing at turn ${turn}`);
  }
  assert.equal(ink(paintTrail(12, 5, 5)), 0, 'a blade that has not moved leaves no streak');
  assert.ok(ink(paintTrail(12, 5, -1)) > ink(paintTrail(12, 5, 4)), 'the streak grows as the blade sweeps');
});

test('mini: the run clock reads as a clock, and the kings are listed in the order they fell', async () => {
  const R = await load('rules.js');
  assert.equal(R.clock(0), '0:00');
  assert.equal(R.clock(247 * 60 + 59), '4:07');
  assert.equal(R.clock(3729 * 60), '1:02:09');
  const p = R.newPlayer();
  assert.equal(p.frames, 0);
  p.frames = 1000;
  p.splits = { 'troll-king': 300, kraken: 700, 'goblin-chief': 100 };
  p.kills = { rat: 3, kraken: 1 };
  const run = R.runSummary(p, 12);
  assert.deepEqual(run.kings.map((k) => k.slug), ['troll-king', 'kraken'], 'only the three kings, in kill order');
  assert.deepEqual([run.kills, run.rooms, run.timed, run.frames], [4, 12, true, 1000]);
  assert.equal(R.isBest(run, null), true);
  assert.equal(R.isBest(run, { frames: 900 }), false);
  assert.equal(R.isBest(run, { frames: 1001 }), true);
  p.untimed = true;
  assert.equal(R.isBest(R.runSummary(p, 12), null), false, 'a save from before the clock sets no record');
});

test('mini: the ending has words for every king and a reward card', async () => {
  const { ENDING } = await load('data/quests.js');
  const { ENEMIES } = await load('data/enemies.js');
  const R = await load('rules.js');
  for (const slug of R.KINGS) {
    assert.ok(ENEMIES[slug] && ENEMIES[slug].boss, `${slug} is not a boss`);
    assert.ok(ENDING.kings[slug], `no name on the results card for ${slug}`);
  }
  assert.equal(ENDING.reached.length, 2);
  assert.ok(ENDING.reward.length >= 3 && ENDING.reward.every((l) => typeof l === 'string' && l.length <= 76), 'reward lines fit two rows each');
  assert.ok(ENDING.reward.some((l) => l.includes('Anthony')));
});

test('mini: music and sound effects each have their own volume', async () => {
  const A = await load('audio.js');
  const { SETTINGS } = await load('data/settings.js');
  assert.equal(A.levelGain(0), 0, 'the bottom of a slider is silence');
  assert.equal(A.levelGain(A.VOLUME_DEFAULT), 1, 'where a slider starts is the mix the game was written at');
  assert.ok(A.levelGain(A.VOLUME_MAX) > 1 && A.levelGain(A.VOLUME_MAX) < 2, 'the top is louder, not deafening');
  assert.equal(A.levelGain(99), A.levelGain(A.VOLUME_MAX));
  for (let i = 1; i <= A.VOLUME_MAX; i++) assert.ok(A.levelGain(i) > A.levelGain(i - 1), `step ${i} is louder than the one under it`);
  const rows = Object.fromEntries(SETTINGS.map((r) => [r.key, r]));
  assert.deepEqual([rows.music.kind, rows.sfx.kind, rows.music.def, rows.sfx.def], ['level', 'level', A.VOLUME_DEFAULT, A.VOLUME_DEFAULT]);
});

test('mini: a saved setting that makes no sense falls back to what it starts as', async () => {
  const S = await load('state.js');
  const { SETTINGS, TEXT_RATE } = await load('data/settings.js');
  const fresh = S.readSettings({});
  assert.deepEqual(fresh, S.readSettings(null));
  assert.deepEqual([fresh.music, fresh.sfx, fresh.muted, fresh.hold, fresh.text, fresh.shake, fresh.clock, fresh.scan, fresh.pad],
    [8, 8, false, false, 'normal', true, true, false, 'auto']);
  assert.equal(fresh.full, undefined, 'fullscreen is the browser\'s to remember, not the save\'s');
  const odd = S.readSettings({ music: 99, sfx: -4, muted: 'yes', hold: true, text: 'warp', pad: 'sega', best: { frames: 10 } });
  assert.deepEqual([odd.music, odd.sfx, odd.muted, odd.hold, odd.text, odd.pad], [10, 0, false, true, 'normal', 'auto']);
  assert.equal(odd.best, undefined, 'the best time is not a setting');
  // An old save only knew "muted". It still means what it meant.
  assert.equal(S.readSettings({ muted: true }).muted, true);
  for (const row of SETTINGS) {
    assert.ok(row.label && row.label.length <= 14, `${row.key}: the label fits its column`);
    assert.ok(row.help && row.help.replace('DRAFT|', '').length <= 72, `${row.key}: the help fits two lines`);
    if (row.kind === 'pick') assert.ok(row.choices.some((c) => c[0] === row.def), `${row.key} starts on one of its choices`);
  }
  const text = SETTINGS.find((r) => r.key === 'text');
  for (const [value] of text.choices) assert.ok(TEXT_RATE[value] > 0, `no text speed for "${value}"`);
});

test('mini: left and right change a setting the way its kind says', async () => {
  const { stepSetting, valueText } = await load('settings.js');
  const { SETTINGS } = await load('data/settings.js');
  const row = (key) => SETTINGS.find((r) => r.key === key);
  assert.equal(stepSetting(row('music'), 8, 1), 9);
  assert.equal(stepSetting(row('music'), 10, 1), 10, 'a slider stops at the top');
  assert.equal(stepSetting(row('sfx'), 0, -1), 0, 'and at the bottom');
  assert.equal(stepSetting(row('hold'), false, 1), true);
  assert.equal(stepSetting(row('hold'), true, 1), false, 'a toggle flips either way');
  assert.equal(stepSetting(row('text'), 'instant', 1), 'slow', 'a list goes round');
  assert.equal(stepSetting(row('text'), 'slow', -1), 'instant');
  assert.equal(valueText(row('hold'), true), 'on');
  assert.equal(valueText(row('clock'), false), 'hidden');
  assert.equal(valueText(row('pad'), 'nintendo'), 'Nintendo');
});

test('mini: a key can be added to a button, moved, and taken off, but never the last one', async () => {
  const I = await load('input.js');
  I.resetKeys();
  I.setDevice('keys');
  assert.equal(I.customKeys(), null, 'untouched keys are not worth saving');
  assert.deepEqual(I.keysFor('a'), ['KeyZ', 'KeyJ', 'Space']);

  // E does what V does.
  assert.deepEqual(I.bindKey('x', 'KeyE'), { ok: true, from: null });
  assert.deepEqual(I.keysFor('x'), ['KeyV', 'Semicolon', 'KeyE']);
  assert.equal(I.bindKey('x', 'KeyE').why, 'have');
  // A key on another button moves over.
  assert.deepEqual(I.bindKey('x', 'KeyK'), { ok: true, from: 'b' });
  assert.deepEqual(I.keysFor('b'), ['KeyX']);
  assert.equal(I.bindKey('x', 'KeyP').why, 'full', 'four keys to a button');
  // The only key a button has stays where it is.
  assert.deepEqual(I.bindKey('a', 'KeyM'), { ok: false, why: 'last', from: 'mute' });
  assert.deepEqual(I.unbindKey('b', 'KeyX'), { ok: false, why: 'last', from: 'b' });
  assert.equal(I.unbindKey('x', 'KeyV').ok, true);
  assert.equal(I.label('x'), ';', 'the game names the first key a button has left');

  // Esc always backs out, and the browser keeps its own keys.
  assert.equal(I.bindKey('a', 'Escape').why, 'fixed');
  assert.equal(I.unbindKey('start', 'Escape').why, 'fixed');
  for (const code of ['F5', 'MetaLeft', 'ControlLeft', 'AltRight', '']) assert.equal(I.bindKey('a', code).why, 'blocked', `${code} is not for the game`);
  assert.equal(I.bindable('ShiftLeft'), true);

  // What is saved comes back the same.
  const saved = JSON.parse(JSON.stringify(I.customKeys()));
  I.resetKeys();
  assert.deepEqual(I.keysFor('x'), ['KeyV', 'Semicolon']);
  I.setKeys(saved);
  assert.deepEqual(I.keysFor('x'), ['Semicolon', 'KeyE', 'KeyK']);
  assert.deepEqual(I.keysFor('b'), ['KeyX']);
  I.resetKeys();
});

test('mini: a broken set of saved keys cannot lock you out', async () => {
  const I = await load('input.js');
  const def = I.DEFAULT_KEYS;
  assert.deepEqual(I.normalizeKeys(null), def);
  assert.deepEqual(I.normalizeKeys(def), def);
  assert.deepEqual(I.normalizeKeys('nonsense'), def);
  // The same key on two buttons: the first one keeps it, the other gets its own back.
  const twice = I.normalizeKeys({ ...def, a: ['KeyZ'], b: ['KeyZ'] });
  assert.deepEqual([twice.a, twice.b], [['KeyZ'], ['KeyX', 'KeyK']]);
  // A button with nothing, a key the browser keeps, and Esc left off.
  const holes = I.normalizeKeys({ ...def, a: [], map: ['F5'], start: ['Enter'] });
  assert.deepEqual(holes.a, ['KeyZ', 'KeyJ', 'Space']);
  assert.deepEqual(holes.map, ['Tab', 'KeyQ']);
  assert.ok(holes.start.includes('Escape'), 'Esc is always there');
  // A save that only mentions one button still moves the key it names.
  const one = I.normalizeKeys({ b: ['KeyZ'] });
  assert.deepEqual([one.b, one.a], [['KeyZ'], ['KeyJ', 'Space']]);
  for (const map of [twice, holes, one]) {
    const all = Object.values(map).flat();
    assert.equal(new Set(all).size, all.length, 'no key is on two buttons');
    for (const [button, list] of Object.entries(map)) assert.ok(list.length >= 1 && list.length <= I.MAX_KEYS, `${button} has ${list.length} keys`);
  }
});

test('mini: keys are called what is printed on them', async () => {
  const I = await load('input.js');
  assert.deepEqual(['KeyZ', 'Digit7', 'ArrowUp', 'Space', 'Semicolon', 'ShiftLeft', 'Numpad4', 'Escape'].map(I.keyName),
    ['Z', '7', 'Up', 'Space', ';', 'LShift', 'Num4', 'Esc']);
  I.resetKeys();
  I.setDevice('keys');
  assert.equal(I.moveName(), 'Arrows');
  // Space as the only swing key: the HUD corner has room for two letters.
  I.unbindKey('a', 'KeyZ');
  I.unbindKey('a', 'KeyJ');
  assert.equal(I.label('a'), 'Space');
  assert.equal(I.tag('a'), 'Sp');
  I.bindKey('a', 'KeyE');
  assert.equal(I.tag('a'), 'E', 'a short key is a better fit than half a long one');
  // Take the arrows off and the game stops saying "the arrows".
  for (const [button, code] of [['up', 'ArrowUp'], ['down', 'ArrowDown'], ['left', 'ArrowLeft'], ['right', 'ArrowRight']]) I.unbindKey(button, code);
  assert.equal(I.moveName(), 'W A S D');
  assert.equal(I.withKeys('{move}'), 'W, A, S and D move you.');
  I.resetKeys();
  assert.equal(I.withKeys('{move} {a} swings.'), 'The arrows move you. Z swings.');
});

test('mini: a game pad is read by where its buttons sit, and named by what they say', async () => {
  const I = await load('input.js');
  const pad = (down = [], axes = [0, 0]) => ({ buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i), value: down.includes(i) ? 1 : 0 })), axes });
  const on = (state) => Object.keys(state).filter((k) => state[k]).sort();

  assert.deepEqual(on(I.readPad(pad())), []);
  // Xbox and PlayStation: the bottom button swings. Nintendo prints B there.
  assert.deepEqual(on(I.readPad(pad([0]), 'xbox')), ['a']);
  assert.deepEqual(on(I.readPad(pad([0]), 'playstation')), ['a']);
  assert.deepEqual(on(I.readPad(pad([0]), 'nintendo')), ['b']);
  assert.deepEqual(on(I.readPad(pad([1, 2, 3]), 'xbox')), ['b', 'x', 'y']);
  assert.deepEqual(on(I.readPad(pad([2]), 'nintendo')), ['y'], 'Nintendo prints Y on the left');
  assert.deepEqual(on(I.readPad(pad([8, 9, 12, 15]))), ['map', 'right', 'start', 'up']);
  // The stick: a dead zone, then eight directions.
  assert.deepEqual(on(I.readPad(pad([], [0.2, -0.3]))), []);
  assert.deepEqual(on(I.readPad(pad([], [-0.9, 0.1]))), ['left']);
  assert.deepEqual(on(I.readPad(pad([], [0.7, 0.7]))), ['down', 'right']);
  assert.deepEqual(on(I.readPad({ buttons: [1, 0], axes: [] })), ['a'], 'a pad that reports plain numbers still works');
  assert.deepEqual(on(I.readPad(null)), []);

  assert.equal(I.padKind('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)'), 'xbox');
  assert.equal(I.padKind('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)'), 'playstation');
  assert.equal(I.padKind('Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)'), 'nintendo');
  assert.equal(I.padKind('Some Pad Nobody Has Heard Of'), 'xbox');

  I.setDevice('pad');
  I.setPadLayout('xbox');
  assert.deepEqual(['a', 'b', 'x', 'y', 'start', 'map', 'back'].map(I.label), ['A', 'B', 'X', 'Y', 'START', 'SELECT', 'B']);
  assert.equal(I.moveName(), 'Stick');
  I.setPadLayout('playstation');
  assert.equal(I.withKeys('{a} swings. {b} throws.'), '× swings. ○ throws.');
  I.setPadLayout('nonsense');
  I.setDevice('keys');
  assert.equal(I.label('a'), 'Z');
});

test('mini: everything the Settings screen can say has letters to say it with', async () => {
  const { SETTINGS, BUTTON_NAMES, NOTES } = await load('data/settings.js');
  const { GLYPHS } = await load('font.js');
  const I = await load('input.js');
  const { plain } = await load('world.js');
  const said = [];
  for (const row of SETTINGS) said.push(row.label, row.help, ...(row.words || []), ...(row.choices || []).map((c) => c[1]));
  said.push(...Object.values(BUTTON_NAMES), ...Object.values(NOTES));
  for (const layout of Object.values(I.PAD_LAYOUTS)) said.push(...Object.values(layout.names));
  for (const code of Object.values(I.DEFAULT_KEYS).flat()) said.push(I.keyName(code));
  for (const line of said) {
    // {a}, {key} and the like are filled in before a line is drawn.
    for (const ch of plain(line).replace(/\{\w+\}/g, '')) assert.ok(GLYPHS[ch] !== undefined, `no glyph for "${ch}" in: ${line}`);
  }
  for (const button of I.ACTIONS) assert.ok(BUTTON_NAMES[button] && BUTTON_NAMES[button].length <= 5, `${button} needs a short name for the Keys page`);
  // A line that names a button names it with a token, so it is right on every device.
  const bad = /\b[ABXY] (swings|throws|casts|eats|talks|closes|buys|uses|opens|cancels)\b|\b(Esc|START) (cancels|closes|opens)\b/;
  for (const line of [...SETTINGS.map((r) => r.help), ...Object.values(NOTES)]) assert.ok(!bad.test(line), `names a button outright: ${line}`);
});
