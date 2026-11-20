// Light Gray Mini: what is on the Settings screen. Each row is one setting:
// what it is called, what it starts as, what it can be, and a line of help.
//
// kind: 'level'  a slider from 0 to max
//       'toggle' off or on (`words` renames the two)
//       'pick'   one of `choices`, each [value, what it is called]
//       'page'   opens another page
//       'do'     does something when chosen
// A row with `live` is read from the browser and never saved.

import { VOLUME_MAX, VOLUME_DEFAULT } from '../audio.js';

export const SETTINGS = [
  { key: 'music', label: 'Music', kind: 'level', max: VOLUME_MAX, def: VOLUME_DEFAULT,
    help: 'DRAFT|How loud the songs are.' },
  { key: 'sfx', label: 'SFX', kind: 'level', max: VOLUME_MAX, def: VOLUME_DEFAULT,
    help: 'DRAFT|How loud everything else is.' },
  { key: 'muted', label: 'Mute', kind: 'toggle', def: false,
    help: 'DRAFT|All of it off at once.' },
  { key: 'hold', label: 'Hold to attack', kind: 'toggle', def: false,
    help: 'DRAFT|Hold {a}, {b} or {y} and you keep going. It is cheese.' },
  { key: 'text', label: 'Text speed', kind: 'pick', def: 'normal',
    choices: [['slow', 'slow'], ['normal', 'normal'], ['fast', 'fast'], ['instant', 'all at once']],
    help: 'DRAFT|How fast people talk.' },
  { key: 'shake', label: 'Screen shake', kind: 'toggle', def: true,
    help: 'DRAFT|The screen jumps on a crit. Or it does not.' },
  { key: 'rumble', label: 'Rumble', kind: 'toggle', def: true,
    help: 'DRAFT|A pad or a phone shakes when you get hit, if it can.' },
  { key: 'clock', label: 'Run clock', kind: 'toggle', def: true, words: ['hidden', 'shown'],
    help: 'DRAFT|The clock up top. Hidden, it still counts.' },
  { key: 'scan', label: 'Scanlines', kind: 'toggle', def: false,
    help: 'DRAFT|Dark lines across the screen, like an old TV.' },
  { key: 'full', label: 'Fullscreen', kind: 'toggle', live: true,
    help: 'DRAFT|The game takes the whole screen.' },
  { key: 'pad', label: 'Pad buttons', kind: 'pick', def: 'auto',
    choices: [['auto', 'auto'], ['xbox', 'Xbox'], ['nintendo', 'Nintendo'], ['playstation', 'PlayStation']],
    help: 'DRAFT|The letters printed on your pad.' },
  { key: 'keys', label: 'Keys', kind: 'page',
    help: 'DRAFT|Put more keys on a button, or take one off.' },
  { key: 'reset', label: 'Defaults', kind: 'do',
    help: 'DRAFT|Everything on this page back the way it came.' },
];

/** Letters of speech shown per frame, for each text speed. */
export const TEXT_RATE = { slow: 0.6, normal: 1.2, fast: 2.4, instant: 999 };

/** What each button does, in a word, for the Keys page. */
export const BUTTON_NAMES = {
  a: 'Swing', b: 'Throw', y: 'Cast', x: 'Eat', start: 'Bag', map: 'Map', mute: 'Sound',
  up: 'Up', down: 'Down', left: 'Left', right: 'Right',
};

/** The things the Settings screen says back. {key}, {name} and {from} are filled in. */
export const NOTES = {
  menu: 'DRAFT|Sound, keys, the game pad and the screen.',
  padNone: 'DRAFT|No pad yet. Press a button on it.',
  padSeen: 'DRAFT|It sees a pad.',
  reset: 'DRAFT|Back the way it came.',
  noFull: 'DRAFT|The browser said no. Try it with a key or a click.',
  keyAsk: 'DRAFT|Press a key for {name}.',
  keyCancel: 'DRAFT|{back} cancels.',
  added: 'DRAFT|{key} is {name} now.',
  moved: 'DRAFT|{key} is {name} now. It was {from}.',
  removed: 'DRAFT|{key} is not {name} anymore.',
  have: 'DRAFT|{key} is already {name}.',
  full: 'DRAFT|{name} has four keys. That is the limit.',
  last: 'DRAFT|{key} is the only key for {from}. It stays.',
  fixed: 'DRAFT|Esc always backs out. It stays.',
  blocked: 'DRAFT|The browser keeps that key.',
  keysReset: 'DRAFT|The keys are back the way they came.',
};
