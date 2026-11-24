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
- One place the Mini went first: Magic Missile is blocked by the enemy's DEF and can crit, and staffs carry the same numbers as swords and bows. In the main game nothing blocks a spell and staffs are lower; Anthony is changing that there.
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
| `js/weather.js` | Wind, moving water, and what lives in each region's air. For the eye only |
| `js/light.js` | The light laid over the finished field: the hour, dark caves, glow, clouds, fog |
| `js/audio.js`, `js/songs.js` | The chip synth and the songs, written in code |
| `js/data/*` | Rooms, enemies, items, quests, people, shops, the ending text, the Settings rows, each region's air |

Things to know:

- The screen is 256x224 with 16x16 tiles. A room is one 16x12 screen; walking off an edge flips to the next room.
- `js/data/rooms.js` holds the first 17 rooms drawn by hand. `js/data/rooms2.js` builds the rest from short descriptions with a seeded scatter, so a room always comes out the same.
- Add content as data. Add an engine branch only for a new kind of thing.
- Text that names a button uses tokens (`{a}`, `{b}`, `{x}`, `{y}`, `{start}`, `{map}`, `{back}`, `{move}`), never the letter. The game says Space on a keyboard and A on a phone. On a keyboard it is the first key that button has, which the player can change, so a name can be as long as "Space"; `tag()` cuts it to fit a HUD slot.
- A new setting is a row in `js/data/settings.js`. It is saved, cleaned and reset from that row. Read it as `settings.key` from `state.js`.
- Settings, changed keys and the best time share one stored object, `lgmini.prefs.v1`. Esc is fixed to the bag and cannot be moved, and no button can lose its last key, so no set of keys locks the player out.
- All art uses the one palette in `gfx.js`. There are no image or sound files.
- Nothing that lives is outlined in black. When a sprite is baked it is lit from above (`lightFromAbove`) and its line takes the deep shade of the color it wraps (`inkLine`), both in `js/art-sprites.js`. The ramps and the `INK` table they read are beside the palette in `gfx.js`. Objects (signs, chests, houses) are not touched by either.
- A look is the person in other colors, or it names a `body` of its own in `BODIES`: `small` (16 by 16), `lanky` (16 by 24), `brute` (24 by 24) or `hulk` (32 by 32, for the Ogre Lieutenant and the Troll King). A body has side views only, so a look with one can fight but cannot stand and talk, and a test says so. An enemy is the size of its grid, and where it stands, its hit box and its shadow all follow that. `big` in `enemies.js` doubles it.
- A person's overlays may reach past the 16 by 16 person (a hat, a spear). `reach` says how far, the sprite is baked that much bigger, and its set carries `ox` and `oy`. Whoever draws a person starts that far up and to the left.
- A room's ground is painted once (`paintRoom` in `js/art-tiles.js`). Trees, flowers and tall grass are not in that picture. They are handed back as lists and drawn each frame, so they can move.
- What a region looks like beyond its tiles is a row in `js/data/regions.js`, keyed by theme: its hour, whether it is dark, its wind, what lives in its air. A new theme needs a row there, and a test says so. What gives off light is in the same file, keyed by sprite.
- The field is drawn off screen, the light is laid over it, and then it goes on the screen. Whatever has to stay readable (the dice, the numbers, the boss bar, the HUD) is drawn after the light.
- There are two clocks. `game.t` runs the game and stops while people talk. `game.vt` runs the weather and does not. Both stop for the few frames a hit holds, and the run clock does not count those frames.
- Nothing in `weather.js`, `light.js` or `regions.js` may change a roll, a wall or the save.
- The save key is `lgmini.save.v1`. Do not rename it without a migration that carries an existing save forward.

## Checking your work

```bash
npm test
```

The tests cover the rules, the world validator (every exit has a way back, every room and object can be reached, no two rooms share a cell), the art grids, the line and the bodies, the room painters, the regions, the light, the songs, and a swings-to-kill balance check. Add a test beside any rule you change.

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
- Equipment is equal across the three attacks: a staff is worth what the sword and bow of its tier are. Magic Missile is a hit like the others, blocked by a full DEF roll, and a top roll crits. He picked this on 2026-11-20 over a block by half of DEF with no crits.
- Where gear comes from, set by him on 2026-11-20 from a chart of the whole road. The Long Sword is in the chest in the Spider Cave room with the scorpions, not on the Alpha Scorpion. The Gator quest pays a Wooden Staff worth 3. Jack's bat quest pays the Long Bow and his cloak quest pays the Battle Axe, so the Goblin Chief hands over nothing. The Kobold Master quest pays the Iron Staff, the same tier as the Warriors' Iron Sword. The Ranger Guard's quest pays the Iron Bow. There is no Wooden Bow, no Wand, and no Savior of the Grassy Field quest; the Guardian Angel still talks.
- Space is the first key on swing and talk, so it is the one the game names. Z and J still swing. Chosen 2026-11-23. A player who had already changed their keys keeps their own.
- A berry bush gives 5 a visit and is full again once you walk off the screen and back, so a player can stock up. He knows it can be farmed and is fine with it. Chosen 2026-11-23.
- The berry bushes are 24 by 22, bigger than a tile and a little taller than the hero. He was shown three as pictures on 2026-11-23 (20 by 18, 24 by 22, and a 32 by 20 patch two tiles wide) and picked the middle one. He had said the blueberries barely showed.
- Nothing over the world names a key, because a button has several. What the hero faces gets a mark instead: a speech bubble over someone to talk to, a gold arrow over anything else. On 2026-11-23 he was shown four ways (the key's name, a mark, the verb, nothing) and picked the mark. Menus and the key list under the screen still name the key.
- The look. On 2026-11-20 he was shown a live page of options running on the game's own rooms, in four directions (Alive, Lit, Repainted, Arcade), and took all of it. Wind in the trees, the flowers and the tall grass, and gusts over the ground. Water that ripples in to shore. People who breathe and blink. Footsteps. Each region's own life (butterflies, leaves, shafts of sun, fireflies, fog, snow, bubbles, drips). Shadows under feet and under clouds. Glow from fires and pillars. Dark caves where the hero carries the only light. An hour of the day for each region. Richer tiles. A held frame and a spark on a hit, and enemies that burst into their own pixels and drop coins. CRT and handheld screens beside the scanlines.
- How the hero, the people and the enemies are drawn. On 2026-11-20 he was shown a second live page, of sprite options in the game's own rooms, and picked these: a colored line; a lit top and a dark underside; own bodies, with people carrying things; the Wanderer as he is; the Ogre on its own body at 24 by 24; the Giant Rat as its own drawing, 24 wide. He left Taller people (16 by 24) off, and passed on the gold scarf and the gray cloak for the Wanderer. He had asked for the Ogre smaller and the Giant Rat bigger. The same night he asked for the Troll King to be drawn on a body of his own, and the next day for the Ogre Lieutenant to be drawn bigger than his ogres.

Declined, do not bring back:

- A gray or desaturated look for the world. It was built and removed: "losing color in this game is not worth it."

Claude's calls he has not confirmed:

- Wings and Gills are bought once at the Wizard's Guild and kept. The toll is 300 gold.
- A boss with no drawing of its own is its kind doubled. The Goblin Chief and the Kobold Master are the small body doubled. The Highwayman at the toll and the two giants are still the person doubled. The Ogre Lieutenant and the Troll King are not doubled. They share a body drawn at 32 by 32.
- The sprites, built 2026-11-20 from the page he picked on. He chose what; these are how, and every drawing is a first draft.
  - The bodies: goblins and kobolds are `small`, the Troll Shaman and the Ice Troll are `lanky`, the Ogre and the Troll Elder are `brute`, the Ogre Lieutenant and the Troll King are `hulk`. The page showed the first three bodies, and the Lieutenant on the brute at 24.
  - The Troll King: he asked for him to be drawn, and how is mine. A grid at 32 by 32, the size he was when he was the person doubled, so his fight and his place on the ending card are the same size as before. The brute's build under a red robe, with a gold belt, a crown, a white fur collar and two tusks. He saw a picture of it after it was built, not before.
  - The Ogre Lieutenant: he asked for him bigger than his ogres, and how is mine. The same 32 by 32 grid as the King, which is also the size the Lieutenant was before any of this, so his fight is the size it always was. A helmet with a red crest, a plate over his back, a red belt. His armor went one step lighter, from `3` to `4`, because `3` is the floor of his lair and he was a hole in it. He was sent a picture with three other armors (dark red, leather, and as dark as he was) after it was built.
  - What people carry: the Old Man a cane, Jack a knit cap and his axe, the wizards a pointed hat, a robe and a staff, the warriors a helmet, a shield and a sword, the Shopkeeper an apron and a mustache, the Red Guard a spear and a shield. The Green Guard, Captain Hector and the Young Soldier got the spear and shield too, though the page only showed the Red Guard.
  - People used to be outlined twice, by their grid and again by the baker, so they had two pixels of line where animals had one. Now everyone has one.
  - A sprite that reaches the top or the side of the person (the angel's halo and wings, a plume) gets its line there too, where it used to be cut off.
  - The Ogre and the Troll Elder are smaller on screen, so they are smaller to hit and to dodge. The Giant Rat is wider to hit. No number changed.
  - The shadow under a 24 pixel body is half again the small one.
  - The Giant Spider and the Alpha Scorpion are still the small ones in other colors, at the same size.
- How the berry bushes are drawn (`paintBerryBush` in `js/art-sprites.js`): leaves in clumps like the trees, eight round berries 3 by 3, each with a shine and a shaded underside, and a shadow painted under the bush. The blue is a true blue with a white shine, because the old blue was as bright as the leaves. The red has a pink shine. The bush hangs 4 pixels past its tile on each side, but you bump into the tile only, and it hides the hero's legs when he stands behind it.
- The mark over what you face (`MARKS` and `markFor` in `js/art-sprites.js`): it bobs a pixel instead of blinking the way the key's name did. A shop counter gets the bubble, since you are talking to the shopkeeper. It is drawn after the light, so it shows in a dark cave.
- The berries, 2026-11-23: the bag still holds 20 of each. Picking is said in the feed line with a +5, like chopping wood, not in a box. A picked bush is drawn bare and says nothing until you leave. A bag that fills partway leaves the rest on the bush for that visit.
- A crit is a roll in the top tenth of its range and doubles the damage. Enemies do not crit.
- Eight pines at Jack's farm though he allows only ten wood. Two wood a tree.
- The achievement for finding every room is named "Been Everywhere" and pays 1000 gold. The Plane of Rebirth does not count toward it.
- Pax's lines, the reward card, the credits, and every `DRAFT|` line. Every quest's `early` line is one: the main game has none.
- The quest card: nothing is taken or paid until it is closed. It cannot be closed for its first half second. It replaced the "Quest done" lines that floated by. After it the giver goes on to their next quest in the same visit, so a player far ahead can get several cards in a row. A giver met for the first time still says their greeting before an `early` line. Gear on a plate says what it adds. Plates that do not fit one row go to a second.
- Settings, built 2026-11-19 without the usual pictures first, because he said not to stop and ask. All of it is open to change: the layout of the screen, a fifth SETTINGS tab in the bag (tabs moved closer together to fit it), and a Settings line on the title screen (the title options moved up 13 pixels).
- The settings themselves: Music and SFX sliders from 0 to 10 that start at 8, Mute, Hold to attack (off), Text speed, Screen shake, Rumble, Run clock shown or hidden, Fullscreen, Pad buttons, Keys, Defaults. Added with the look on 2026-11-20: Screen (sharp, scanlines, CRT, handheld), which took the place of the Scanlines switch and carries an old saved "on" forward; Hit stop (on); Light (on), which turns the whole light pass off for a slow phone; Strict colors (off), which snaps light and shadow to the palette.
- The swords: the Training Sword is wood and the Battle Axe is drawn as a two-headed axe. A blade is a short description in `BLADES` in `js/art-sprites.js`, painted at sixteen angles, not a grid. The HUD and the bag still show one sword icon for all of them.
- A longer blade reaches farther: its length plus 3 pixels, and never less than the 15 every sword used to reach. The Mithril Sword reaches 23. A swing still hits only what is in front.
- The swing is still 16 frames, so nothing attacks faster or slower. The step forward is drawn, not moved: the hero's place and hit box stay where they were. The hatchet and the bare fist use the same swing.
- The staffs: Iron Staff 18 and Steel Staff 27, to match the iron and steel swords and bows. The Basic Shop still sells the Basic Staff, which is the same 3 as the Wooden Staff the Gator quest pays.
- The Wizard's Guild line said the recruiter hands you a wand. It pays a staff now, so that one word was changed to "staff" in his line.
- A save that holds something the game dropped (the Wooden Bow, the Wand) has it taken out on load, and the slot wears the best of what is left.
- The missile's flat 2 (1 + spell level) is on the attack die: it is blocked and doubled with the rest, and the crit is judged on the MAG roll alone. It still costs 2 MP. Heal is unchanged, so bigger staffs heal a little more.
- Hold to attack repeats the sword, the ranged weapon and the spell. It never talks, opens a chest or eats.
- A button holds up to four keys. A key moves to the button it is given to.
- Game pad: the bottom face button swings on Xbox and PlayStation pads, the right one on Nintendo pads, so the letter on screen is the letter on the pad. START is the bag and SELECT is the map. Shoulder buttons do nothing. Pad buttons cannot be remapped.
- The look, built 2026-11-20. He chose what; these are how, and none of it has been played start to finish.
  - The hours: Field and Beach are day, Forest is gold, Marsh and Dark Forest are dusk, Mountain is night, Camp Hero is dawn. Red Town is a mild late afternoon, because gold turned its gray stone yellow. Caves and the ocean floor have no hour. An hour tints the hero too.
  - Room Zero and the Plane of Rebirth do not move at all. Only the light on the pillar does. The first step into the Field is when the world starts moving.
  - Dark caves are dimmed to about a quarter and the hero's light reaches 62 pixels. A boss can always be seen in the dark, and a spell lights its own way, yours or theirs. Everything else is dark until it is close. This changes how caves play.
  - A hit holds the game for 1 frame on a block, 3 on a hit, 5 on a crit, 7 on a kill, and 4 when the hero is hit, which the page did not show. A button pressed during a hold counts on the frame after. The hit also shoves the picture a pixel or two, and that follows Screen shake.
  - Coins: one to four by how much gold dropped. They hop out, sit a moment and fly to the hero. The page had them blink out; flying in says the gold is already yours, which it is, counted at the kill as before.
  - Dust rises on paths and on cave ground, not on stone floors. Prints stay in sand and in mountain snow.
  - The weather keeps running while people talk and while the bag is open.
  - The richer tiles are a first pass: patches and tufts in the ground, trees in clumps of leaves, deeper water off shore, pebbles on paths, ripples in sand. Walls, floors, houses, bushes, rocks and cave rock are as they were. The ground texture goes on every region's ground, snow and cave dirt included.
  - Tall grass does not cover feet. The page said it would and the blades are too thin for it to read.

Open:

- The name. It must contain "Light Gray". He tried "Light Gray Super Adventure" and found it corny. Also considered: Light Gray Cartridge, Light Gray '92, Light Gray Overworld, Light Gray DX, Light Gray Land, and a "Light Gray Entertainment System" boot screen. "LG" alone in a public title reads as the electronics company.
- Not in the game: Rocky Flats, the Swamp, the Despair. No one has played it start to finish, so balance and pacing are unproven.
