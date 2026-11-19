# lgmini

A bit of Light Gray RPG.

A small top-down action RPG in the world of Light Gray RPG: Room Zero, the Grassy Field, Red Town, the Blue Ocean, the Dark Forest, the Mountains, and the gate to Star City. You swing a sword in real time, and every hit still shows its dice.

`lgmini` is the working title. The name on the title screen is not final.

## Play

It is a static page. Serve the folder with anything and open it:

```bash
npm start
```

Then go to http://localhost:4173.

| | Keyboard | Phone |
|---|---|---|
| Move | Arrows or WASD | Pad |
| Swing / talk | Z | A |
| Ranged | X | B |
| Spell | C | Y |
| Eat | V | X |
| Bag | Enter | START |
| Map | Tab | MAP |
| Sound | M | SOUND |

The game saves in your browser. It is not tied to a Light Gray RPG account.

## How it is made

- Plain ES modules. No build step and no dependencies.
- All art is drawn in code from one palette (`js/gfx.js`, `js/art-tiles.js`, `js/art-sprites.js`).
- All music is written in code and played by a small chip synth (`js/audio.js`, `js/songs.js`).
- The world is data: rooms, enemies, items, quests and the ending text live in `js/data/`.
- The numbers are in `js/rules.js`, which runs without a browser.

## Tests

```bash
npm test
```

Needs Node 20 or newer. The tests cover the rules, the world data (every room reachable, every exit with a way back), the art grids and the songs.
