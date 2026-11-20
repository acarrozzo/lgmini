# lgmini: Claude Code Guide

## What this is

A small top-down action RPG set in the world of Light Gray RPG, Anthony's multiplayer browser text RPG. It retells the road from Room Zero to Camp Hero, at the gate of Star City, in the style of a 16-bit console game. Anthony is making it as a warm-up to the main game: the same world in a different medium, which he expects more people to play than the main game itself.

`lgmini` is the working title. The on-screen name reads "Light Gray Mini" and is not decided (see Decisions).

It was built inside the main game's repository in November 2026 and moved here on 2026-11-18. The git history before the move stayed behind.

## Its relationship to Light Gray RPG

- The main game is the source for the world: room ids and names, people, quest lines, enemy names, and the early numbers. This game copies them; nothing is shared in code. Keeping the two in step is manual.
- Real lines from the main game are used as they are. Two small edits are made without marking: an em dash becomes a period, and mentions of Wings or Gills potions are dropped (here those are bought once and kept).
- Numbers for the Grassy Field are the main game's. Past the Field they are this game's own, marked `MINI` in `js/data/items.js`, sized so the road ends near level 20.
- The combat math is the main game's: an offensive roll opposed by a defensive roll, floored at zero. STR swings, DEX throws, MAG casts. An enemy's melee is blocked by DEF, its ranged by DEX, its magic by MAG. XP is the cubic curve `2 * (level + 1)^3`.
- Do not grow this into the main game. It is short on purpose.

## Voice

Every line a player reads should sound like Anthony wrote it: short, second person, deadpan, plain. No em dashes in anything spoken. American spelling everywhere.

Any line Claude writes is a placeholder. Prefix it `DRAFT|` in the data so he can find and rewrite it; the prefix is stripped before it is shown. Do not present a drafted line as final.

Place names in this world are flat labels (Grassy Field, Red Town, Room Zero). Hype words do not fit.

Never advertise how long the game is, in the game or in its description.

## How it is built

Plain ES modules, no build step, no dependencies. Serve the folder and open `index.html`.

| File | Holds |
|---|---|
| `js/main.js` | Boot, title screen, the 60 Hz loop |
| `js/game.js` | Rooms, the hero, enemies, combat, objects, drawing the world |
| `js/ui.js` | HUD, feed line, dialogs, bag, shop, map frame, the ending |
| `js/map.js` | The map screen and its helpers |
| `js/settings.js` | The Settings screen and its helpers. Needs no game, so the title screen opens it too |
| `js/world.js` | Room adjacency, gates, and the world validator |
| `js/rules.js` | Every number: rolls, crits, XP, gear, items, the run clock. Pure functions |
| `js/state.js` | The save and settings, in `localStorage` |
| `js/input.js` | Keyboard, touch and game pad, the keys on each button, and what each button is called |
| `js/gfx.js`, `js/font.js` | The palette, the pixel buffer, pixel text |
| `js/art-tiles.js`, `js/art-sprites.js` | All art, drawn in code |
| `js/audio.js`, `js/songs.js` | The chip synth and the songs, written in code |
| `js/data/*` | Rooms, enemies, items, quests, people, shops, the ending text, the Settings rows |

Things to know:

- The screen is 256x224 with 16x16 tiles. A room is one 16x12 screen; walking off an edge flips to the next room.
- `js/data/rooms.js` holds the first 17 rooms drawn by hand. `js/data/rooms2.js` builds the rest from short descriptions with a seeded scatter, so a room always comes out the same.
- Add content as data. Add an engine branch only for a new kind of thing.
- Text that names a button uses tokens (`{a}`, `{b}`, `{x}`, `{y}`, `{start}`, `{map}`, `{back}`, `{move}`), never the letter. The game says Z on a keyboard and A on a phone. On a keyboard it is the first key that button has, which the player can change, so a name can be as long as "Space"; `tag()` cuts it to fit a HUD slot.
- A new setting is a row in `js/data/settings.js`. It is saved, cleaned and reset from that row. Read it as `settings.key` from `state.js`.
- Settings, changed keys and the best time share one stored object, `lgmini.prefs.v1`. Esc is fixed to the bag and cannot be moved, and no button can lose its last key, so no set of keys locks the player out.
- All art uses the one palette in `gfx.js`. There are no image or sound files.
- The save key is `lgmini.save.v1`. Do not rename it without a migration that carries an existing save forward.

## Checking your work

```bash
npm test
```

The tests cover the rules, the world validator (every exit has a way back, every room and object can be reached, no two rooms share a cell), the art grids, the songs, and a swings-to-kill balance check. Add a test beside any rule you change.

In a browser:

- `?slot=test` uses a separate save and separate settings. Always test there. Anthony's own save and best time are under the plain address and must not be touched.
- `?debug` adds `window.__lgmStart()` (skip the title), `window.__lgmStep(n)` (run n frames by hand) and `window.__lgm` (`game`, `ui`, `player`, `go(room, cx, cy)`, `give(item, n)`, `wear(item)`).
- A page in a background tab gets no frames, so the game stands still and presses pile up. When checking from a hidden pane, send a key event and then call `__lgmStep`.
- A plain static server lets the browser cache modules. After an edit, reload hard before trusting what you see.
- Keep the dev server on port 4173. His save belongs to that address.

## Working with Anthony

- For anything about look or layout, show two or three options as pictures and let him choose before building.
- He commits himself. Do not commit or push unless he asks. Never `git stash` or revert his working tree.
- Say what you decided on your own, so he can overturn it.

## Decisions on record

Chosen by Anthony:

- Real-time sword swings, with every hit still a Light Gray roll and the dice shown.
- Light RPG depth: the cubic XP curve, four stats, one point per level, gear tiers, key items.
- Art drawn in code and chiptune written in code. Keyboard and phone touch. Saves in the browser.
- The ending is open: reach Camp Hero, see the ending, keep playing.
- The map is the whole world at one pixel per tile with a cursor. Visited rooms are drawn, rooms an open exit leads to show as "?", the rest are hidden. It shows the count of rooms found and never the total. Gold pillars fast travel is picked on the map. Quest givers who are waiting are marked.
- Button names follow the device in use.
- Few trees in the middle of the Grassy Field.
- Wood comes from pines that actually fall to a hatchet, taken from the block at Jack's cabin.
- Dice forward: the two rolls of a hit are shown meeting over the target, and high rolls crit.
- A run clock, a split per boss, and a best time that survives New Game.
- The ending tells the player a reward in Light Gray RPG is not hooked up yet, to tell Anthony, and that whoever tells him gets to decide it. He wants that moment to feel good.
- The tagline is "A bit of Light Gray RPG."
- A quest handed in pops a card the player has to close. The room dims, QUEST COMPLETE is in big gold, and under it are the quest's name and a plate for each reward. He picked this on 2026-11-19 over a small card in the middle of the room and one the size of the speech box. Its button says "Nice" on every quest. He looked at a word per quest and chose one for all.
- A quest finished before its giver asked for it is asked and handed in with one line, in one visit, with the giver impressed. That line is the quest's `early`.
- The sword gets bigger as it upgrades. Each is longer than the one before, the last two are wider, and each has its own metal. He picked this on 2026-11-19 over longer blades that all look like the old one, and over a bigger set where the Mithril Sword outgrows the hero.
- The swing winds up, sweeps across the front and steps in. He tried it on 2026-11-19 and kept it on 2026-11-20, over a plain sweep from the side to the front and a sweep all the way across.

Declined, do not bring back:

- A gray or desaturated look for the world. It was built and removed: "losing color in this game is not worth it."

Claude's calls he has not confirmed:

- Wings and Gills are bought once at the Wizard's Guild and kept. The toll is 300 gold. Jack's bat quest pays a Wooden Bow.
- Bosses are the 16-pixel sprites doubled.
- A crit is a roll in the top tenth of its range and doubles the damage. Enemies do not crit.
- Eight pines at Jack's farm though he allows only ten wood. Two wood a tree.
- The achievement for finding every room is named "Been Everywhere" and pays 1000 gold. The Plane of Rebirth does not count toward it.
- Pax's lines, the reward card, the credits, and every `DRAFT|` line. Every quest's `early` line is one: the main game has none.
- The quest card: nothing is taken or paid until it is closed. It cannot be closed for its first half second. It replaced the "Quest done" lines that floated by. After it the giver goes on to their next quest in the same visit, so a player far ahead can get several cards in a row. A giver met for the first time still says their greeting before an `early` line. Gear on a plate says what it adds. Plates that do not fit one row go to a second.
- Settings, built 2026-11-19 without the usual pictures first, because he said not to stop and ask. All of it is open to change: the layout of the screen, a fifth SETTINGS tab in the bag (tabs moved closer together to fit it), and a Settings line on the title screen (the title options moved up 13 pixels).
- The settings themselves: Music and SFX sliders from 0 to 10 that start at 8, Mute, Hold to attack (off), Text speed, Screen shake, Rumble, Run clock shown or hidden, Scanlines (off), Fullscreen, Pad buttons, Keys, Defaults.
- The swords: the Training Sword is wood and the Battle Axe is drawn as a two-headed axe. A blade is a short description in `BLADES` in `js/art-sprites.js`, painted at sixteen angles, not a grid. The HUD and the bag still show one sword icon for all of them.
- A longer blade reaches farther: its length plus 3 pixels, and never less than the 15 every sword used to reach. The Mithril Sword reaches 23. A swing still hits only what is in front.
- The swing is still 16 frames, so nothing attacks faster or slower. The step forward is drawn, not moved: the hero's place and hit box stay where they were. The hatchet and the bare fist use the same swing.
- Hold to attack repeats the sword, the ranged weapon and the spell. It never talks, opens a chest or eats.
- A button holds up to four keys. A key moves to the button it is given to.
- Game pad: the bottom face button swings on Xbox and PlayStation pads, the right one on Nintendo pads, so the letter on screen is the letter on the pad. START is the bag and SELECT is the map. Shoulder buttons do nothing. Pad buttons cannot be remapped.

Open:

- The name. It must contain "Light Gray". He tried "Light Gray Super Adventure" and found it corny. Also considered: Light Gray Cartridge, Light Gray '92, Light Gray Overworld, Light Gray DX, Light Gray Land, and a "Light Gray Entertainment System" boot screen. "LG" alone in a public title reads as the electronics company.
- Not in the game: Rocky Flats, the Swamp, the Despair. No one has played it start to finish, so balance and pacing are unproven.
