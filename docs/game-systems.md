# Game systems

A game system is the data of one game: its fields, its character sheet, its formulas, its pages and its rules text. The engine knows no game; each campaign plays one system. Examples come from [systems/5e](../systems/5e/) and from [systems/ironsworn](../systems/ironsworn/), a test system based on Ironsworn. The code is in [src/systems/game-system.ts](../src/systems/game-system.ts).

## 1. The folder

```text
systems/<name>/
  system.yaml        what the system declares (section 2)
  LICENSE.md         its license and attribution
  world/             its pages, in the folders a campaign uses (section 4)
  rules/*.md         its rules, one chapter a file
  images/            the pictures its pages link in `image`
  instructions/*.md  what it adds to the master's instructions (section 4)
  words/<code>.yaml  its words in other languages (section 4)
  build/, test/      scripts and tests, not shipped
```

A system is installed by putting its folder in the package's `systems/`. A campaign names it in `campaign.yaml` (`system: 5e`). A `system.yaml` with an unknown key or a formula that does not read is refused, with the key at fault. A running MCP server keeps the systems it started with.

## 2. system.yaml

Only `title` and `language` are required. Field names ignore case.

### title, language, attribution

```yaml
title: the fifth edition from the SRD 5.1, the 2014 rules
language: en
attribution: This work includes material taken from the System Reference Document 5.1 ...
```

`language` is the language its pages are named in. `attribution` is what its source asks to be credited with; the dashboard shows it.

### fields

```yaml
fields: {hp: counter, str: number, str-mod: modifier, bonus-saves: bonus, speed: text, languages: list, portent: rolls}
```

| Kind | Meaning |
|---|---|
| `counter` | `12` or `current/max`, changed with `change` |
| `number` | a number, never counted |
| `at-least` | a number the pages of `bonus-lists` raise to at least theirs, never lowering it; an effect sets it |
| `modifier` | a number shown with its sign |
| `bonus` | a number effects add up; missing reads 0 |
| `factor` | a number effects multiply, written as `2`, `0.5`, `1/2` or `½`; missing reads 1 |
| `length` | a length worked out, shown in `length-unit` and in metres for a metric player |
| `weight` | a weight worked out, shown in the unit of `load`'s weights and in kilograms for a metric player |
| `duration` | minutes worked out, shown as durations are written: `3m`, `1h 30m`, `30s` under a minute |
| `text` | text, or `true`/`false` |
| `list` | a list |
| `rolls` | dice kept for later, as a diviner's Portent |

A field not declared is free; written as a number or `current/max`, it counts as a counter.

### coins, round, imperial, load, length-unit

```yaml
coins: gp 100, pp 1000 rare, ep 50 rare, sp 10, cp 1
round: 6 seconds
imperial: {mile: 1.5 km, foot: 0.3 m, pound: 0.5 kg}
load: {field: weight, limit: ["str * 15 * table(carry-by-size, size)", str * 15], coins: 50, weightless: extradimensional}
length-unit: ft
```

Each coin's value in the smallest; `rare` coins are never given as change. Every measure is written in metric; `imperial` says what the game's mile and foot are, for campaigns in imperial units, and its pound, to show a load in kilograms. `load` sums what a character carries: each page's weight in `field`, stacks by their `bundle`, what items hold, unless an item has the field `weightless` names set to true, and the coins, `coins` to a unit of weight; the sheet shows it against `limit`, a formula or formulas in order, and `status` says when a character goes over it under the rigor `rules`; formulas read them as `load` and `load-limit`. `length-unit` is the unit of the lengths the formulas work out, as the speeds.

### travel

```yaml
travel:
  paces: {fast: 6 km, normal: 4.5 km, slow: 3 km}
  pace: normal
  hours: 8
  rule: Travel Pace
  beyond: Forced March
  terrain: {difficult: 1/2}
  kinds:
    road: {}
    river: {vehicle: {category: waterborne vehicle}, speed: speed, hours: 24, current: 4.5 km}
```

Paces per hour, the hours of a day's travel and the rule past them, what terrain does to a pace, and the kinds of road: a kind with `vehicle` is travelled only in such an item, at its `speed`.

### grid

```yaml
grid: {square: 1.5 m, diagonal: 1, difficult: 2, speed: speed, walking: walking, size: size, footprints: {Large: 2, Huge: 3}, leaving: Opportunity Attacks}
```

How the map of a place counts: a square's size, a diagonal's cost, difficult ground, the fields of speed and size, and the rule for leaving someone's side. `walking` names the computed speed a move counts with, in the unit of `speed`; where it has no value, the written `speed`.

### settings

```yaml
settings:
  advancement:
    about: how your character levels up
    xp: {means: "experience points", player: "your character levels up with experience points"}
    milestones: {means: "...", player: "...", without: [xp]}
```

What the setup asks for this system. `means` is for the master, `player` for the dashboard; `without` lists fields a value leaves out.

### The sheet

```yaml
sheet:
  Character: [creature?, classes, level, xp, inspiration?]
  Abilities: [str (str-mod), dex (dex-mod), proficiency]
sheet-notes: {Personality: "..."}
sheet-icons: {Abilities: "M4.5 13.5h3v6h-3Z ..."}
sheet-headline: "Level {level} {classes}"
sheet-cards: {rail: [Abilities], order: [Skills, Combat], at-hand: [ac, hp, Attacks]}
sheet-dice: {1d20: [str-mod, dex-mod, athletics, initiative, attack]}
token-icons: {field: classes, icons: {Cleric: "M12 4v16 M7 9h10"}}
status-line: [level, hp, temp-hp?, ac]
values: {save-proficiencies: [str, dex, con, int, wis, cha]}
marks: [save-proficiencies, skill-proficiencies, expertise]
```

- `sheet`: groups of fields in order. `field?` is written only when it applies; `field (beside)` shows a field beside it. The player character keeps a sheet, and so does a companion with a `level` or no `creature`. A group with `inventory` shows what the character carries, a row for each stack or item, what a container holds below it and what is equipped marked, after the group's other fields, such as `money`.
- `sheet-notes`: what `write` says of a group when a character joins the party.
- `sheet-icons`, `token-icons`: SVG path data on a 24 grid, for a group's card and for a token's mark by class.
- `sheet-headline`: the line under a name on the dashboard.
- `sheet-cards`: where the dashboard puts the groups.
- `sheet-dice`: the dice of the dashboard's free roll for each number. `sheet-odds`: the dice of a better and a worse free roll, and `when`, fields with the formulas that make them `better` or `worse` above 0; both cancel out, as `{better: 2d20kh1, worse: 2d20kl1, when: [{fields: [stealth], worse: "count(equipped, stealth-disadvantage = true)"}]}`.
- `status-line`: the character's line in `status`; `?` hides a field at zero.
- `values`: the names a closed list or text takes, such as the skills or the alignments, written in the system's language and shown in the campaign's. `sheet-values`: the same, only on a page that keeps the sheet, as the languages, while a creature's stat block keeps its own words. `marks`: lists that mark the numbers reading them (`stealth +7 ●●`).

### roll-names

```yaml
roll-names: {2d20kh1: {en: with advantage, it: con vantaggio}}
```

What the game calls a roll, written on the dashboard's buttons.

### rewards, thresholds, recipes

```yaml
rewards: {xp: {from: xp-value, overcome: hp 0}}
thresholds: {hp 0: Dropping to 0 Hit Points, exhaustion: Exhaustion}
recipes:
  long rest: {set: {hp: max, slots-*: max}, regain: {hit-dice-*: "max(1, floor(level / 2))"}, ends: [long rest, short rest], rules: [Long Rest]}
```

- `rewards`: what the creatures overcome in a scene give the party, which `scene close` proposes.
- `thresholds`: the rule a counter touches at a value, or at every change.
- `recipes`: what a rest does: counters `set`, partly `regain`ed or `lower`ed by an amount or a formula, never below 0 (`lower: {exhaustion: 1}`), dice one may `spend`, each rolled with what it `adds` and the total given to a counter (`spend: {hit-dice-*: {gives: hp, adds: con-mod}}`, used as `change Bruna hit-dice-d8 --spend 2 --recipe "short rest"`), the counter it `needs` above 0 to give anything (`needs: hp`), how often it gives anything (`once-per: 24h`, counted from the last time it gave a page something, less how long it `lasts`, as the master may advance its hours before or after), the occasions it `ends`, the rules it leaves to the master.

### upkeep, burning

```yaml
upkeep:
  daily: Rations
  short: days-without-food
  grace: 3 + con-mod
  worsens: exhaustion
  water: "a gallon each"
  lifestyle: {field: lifestyle, costs: {Poor: 2 sp, Modest: 1 gp}, rules: Lifestyle Expenses}
  rules: Food and Water
burning: {Torch: {lasts: 1h}, Lamp: {lasts: 6h, spends: Oil}}
```

Under the rigor rules, each midnight `advance` passes, a party member with a sheet outside a settlement (a place of kind city, town, village or inn, or one inside it) spends a piece of `daily`; without one it counts a day in `short`, and past the days `grace` gives raises `worsens` by one; `water` is said, never counted. In a settlement, a member pays from `money` a day of the `lifestyle` it keeps, at its `costs`; without one, or without the coins, the line says what to do. An effect named after something in `burning` spends one of it, or of what it `spends`, from what the holder carries, and lasts as long as it burns.

### bonds

```yaml
bonds:
  attuned: {most: 3, needs: attunement, while: equipped, rules: Attunement}
```

The lists a character binds items in: `write` refuses more than `most`, and an item whose field `needs`, its own, its base's or a linked item's, asks for nothing; binding one says how many, what it asks (`by a paladin`) and the rules to read. With `while`, a bound item gives its bonuses only while in that list too, as a ring worn, and binding one not there says so.

### at-most

```yaml
at-most: {str: 20 + bonus-str-max, prepared: max-prepared}
```

The most a field of a sheet holds, a number or a formula on the page: `write` refuses a number written above it, or a list longer, before writing (all of them when a page begins to keep a sheet); `validate` reports one written by hand. What an item or an effect raises is worked out, never checked.

### turn-uses

```yaml
turn-uses:
  action: {}
  reaction: {any-turn: true}
  attack: {within: action, most: 1 + extra-attacks}
  sneak attack: {needs: "has(features, Sneak Attack)", any-turn: true, resets: each turn}
```

What one may do in a turn, which `scene use` counts once the scene has an order of turns (a use's name takes no word `by` or `for`): each use at most `most` times (1 when left out; a formula on who uses it, unlimited when it gives nothing), in one's own turn unless `any-turn`, for who `needs` gives more than 0; a use `within` another takes that one first and counts inside it. Uses come back at the start of one's own turn, or at every turn with `resets: each turn`. A use may carry a `note` its line says each time, only for whom `note-when` gives more than 0. The master names what gives one more with `by`; when it names a counter of the sheet, as `action-surge` for Action Surge, the engine spends one, and refuses at 0. The dashboard shows a party member who acts the uses that stand alone.

### damage

```yaml
damage: {counter: hp, halves: damage-resistances, ignores: damage-immunities, doubles: damage-vulnerabilities, rules: Damage Resistance and Vulnerability}
```

`change` with `damage` and a negative `by` reads the lists of who takes it, what it writes with what the pages of `bonus-lists` and its effects add: a type in `ignores` takes nothing, in `halves` half rounded down, then in `doubles` twice that; the counter that shields `counter`, as temporary hit points, loses first. An item that names the type with a condition, as "slashing from nonmagical attacks", or names no type, as "damage from spells", waits for the master to say `slashing (applies)` or `slashing (does not apply)`.

### conditions, keeping, combat, dying

```yaml
conditions: [Blinded, Charmed, Poisoned, Prone]
condition-icons: {Prone: "M4 18h16M7 14l5-4 5 4"}
keeping: {counter: hp, conditions: [Incapacitated, Unconscious], rules: Concentration}
combat: {track: hp, in-words: [unhurt, hurt, bloodied, down], inactive: [Incapacitated, Stunned, Unconscious]}
dying:
  at: hp 0
  show: {successes: death-successes, failures: death-failures}
  stable: Stable
  marks: {successes: Successes, failures: Failures}
immune: condition-immunities
checks:
  - {when: Stable, needs: hp <= 0, say: "{page} is Stable with {hp}: effect end {page} Stable."}
```

- `conditions`: effects with these names show their rule; `condition-icons` draws them.
- `keeping`: what can break what someone keeps alive, as concentration; the output names the rule, the engine ends nothing.
- `combat`: the counter the dashboard's Combat follows; `in-words`, the words a foe's is heard in, the first at full, the last at 0, those between at equal shares, translated by the system's `words`; who cannot act.
- `dying`: when the dashboard shows the panel of the dying, its counters by their sides, `stable`, what it calls one whose successes are full, and `marks`, the short words of each side (the field's label where none), all translated by `words`. What the dying point does, as the 5e's death saves, is the system's code (see [Code](#code)); the dashboard tells a death save from what that code wrote.
- `immune`: the list of a page whose conditions `effect add` refuses.
- `checks`: what cannot be true together, which the engine tells the master at `scene next` and `advance`, once in a chat while it lasts, and in `status` and `validate` every time; it never changes anything. `when` and `needs` are an effect's name, which counts only without an end or a keeper, or a field against a number; `say` fills `{page}` and each `{field}` with the page's own values. A check that needs more is the system's code. The engine checks two things itself, from the data above: who keeps an effect alive while a condition of `keeping` is on them, and one of the party at the value of `dying`, not marked dead, with no condition of `combat.inactive`. It checks the party, alive or dead, and the characters of the open scene, never copies.

### tables, computed, counters

```yaml
tables: {proficiency-by-level: {1: 2, 5: 3, 9: 4, 13: 5, 17: 6}}
computed:
  str-mod: floor((str - 10) / 2)
  level: sum(classes)
  proficiency: table(proficiency-by-level, level)
counters:
  hp: {max: "hp-base + level * (con-mod + hp-per-level)"}
  hit-dice-d10: {max: "sum(classes, hit-die = d10)", refill: long rest}
  temp-hp: {shields: hp}
```

- `tables`: a number key reads the highest row not above it; a name key reads its row.
- `computed`: a field worked out by a formula, or by the first of several that has a value. Never written by hand.
- `counters`: `min` and `max` by formula. `refill` names the occasions that bring a use back. `shields`: the counter this one protects.

### progression

```yaml
progression:
  list: classes
  level: level
  features: Features
  skip: [Proficiency Bonus, 1st, 2nd, 3rd]
  parts: {list: subclasses, field: class, lists: [prepared]}
  experience: {field: xp, table: xp-by-level, rules: Beyond 1st Level}
```

Items of `list` such as `[[Barbarian]] 3` read the row of their page's level table: its columns become fields (but those in `skip`), its `features` column the features gained. `parts` are pages that add features by their class's level, as subclasses. `experience` gives the points each level needs. `level` names the field of a level written on a page: a companion with it, or with items of `list`, keeps the sheet.

### item-formulas, always-in

```yaml
item-formulas:
  classes: [spell-save-dc, max-prepared]
  equipped: [armor-class, attack, damage-roll]
always-in: {equipped: [Unarmed Strike]}
```

- `item-formulas`: fields whose formula each item's page gives, worked out on the character once per item: a weapon's `attack: "str-mod + proficiency + bonus"`. A formula of an item may begin with dice and end with words: `"1d8 + str-mod slashing"`, or `dice(1d6, martial-arts)` for the largest of several.
- `always-in`: pages every character with a sheet has in a list without writing them.
- `bonus-lists`: lists whose pages give their `bonus` fields to who lists them, added up as effects are, as `bonus-lists: [attuned, feats]` with a Ring of Protection's `bonus-ac: 1`, and raise their `at-least` fields, as Gauntlets of Ogre Power's `str: 19`.

## 3. Formulas

| Form | Gives |
|---|---|
| numbers, fields, `+ - * /`, `( )` | arithmetic |
| `floor`, `ceil`, `min`, `max` | as usual |
| `best(a, b, …)` | the highest of those that have a value |
| `table(name, key)` | the table's row |
| `has(list, Name)` | 1 if the list holds Name, else 0 |
| `count(list)`, `count(list, field = value)` | how many items |
| `item(list, Name)` | the number after Name |
| `sum(list)`, `sum(list, field = value)` | the total of the numbers after the items |

- Names are ASCII letters, digits and single hyphens: `level-1` is a field; write `level - 1`.
- A list item is a name with an optional number: `"[[Fighter]] 3"`, `Perception +3`.
- A field reads as a number when it is one, a counter, `+2`, or a measure such as `25 ft` (a number and a word of up to three letters), even with a note in brackets after it, as `40 ft (hover)`.
- Besides the fields, a formula reads `effects` as the names of the page's effects (`has(effects, Grappled)`), `rigor` as the campaign's, and `load` and `load-limit` (see `load`).
- A formula has no value when a field it reads is missing; then the page's own value is read.
- A page is read in layers: its bases (`creature`, `item`), the page, its effects, then what the system works out.

## 4. Pages, rules, words and instructions

**Pages.** `world/<folder>/<Name>.md`, the folder giving the type: `characters`, `places`, `factions`, `quests`, `items`, `events`, `topics`, `creatures`. Names are unique, with straight apostrophes. Fields are those declared plus the standard ones; quote signed numbers (`"+2"`) and links (`"[[Dwarf]]"`); no final period in text. The introduction is the text before the first heading; each heading is a section, found as `[[Page#Section]]`. A system's pages hold no secrets and derive only from pages of the same system; `aliases` give other names. An item is a kind, unless its page has a counter, such as `uses: 10/10` or `charges: 7/7`, or the system gives it to every sheet (`always-in`): a container counts it in a stack, `"[[Torch]] 7"`, in the units the system sells it in, or in pieces where the page declares `bundle: number`, as `bundle: 20` for arrows, whose cost and weight are the bundle's. An item with a counter is one thing, which a campaign's item derived from it holds.

**Rules.** `rules/*.md`, each chapter opening with a heading. Sections are headings, bold paragraph titles and table captions. A campaign's house rules come first. Titles hold no `›`, `>` or `/`.

**Words.** `words/<code>.yaml` gives the system's words in a language, for the dashboard:

```yaml
groups: {Abilities: Caratteristiche}
fields: {str: FOR, ac: CA}
words: {Cleric: Chierico, long rest: riposo lungo}
headline: "{classes} di livello {level}"
```

**Instructions.** `instructions/<part>.md` adds to the core's part of that name, or replaces it with `replace: true`. Parts: `setup`, `session-zero`, `play`, `combat` and any scene type, `new-day`, `quest-ends`, `mentor-hints`, `mentor-tutorial`, `level-up`.

## 5. What a campaign adds

A campaign's pages work as a system's: a class in `world/topics/` counts in `sum(classes)`, a creature with `creature: "[[Elf]]"` is a new race, an item with `item: "[[Longsword]]"` a named sword. A campaign page cannot take a system page's name.

`campaign.yaml` adds to `fields`, `tables`, `computed`, `counters`, `recipes`, `status-line`, `travel` and `values`, with `config`; an entry with a system's name replaces it, but the names in `values` join the system's list, as a language of the campaign's world:

```text
config counters "bulwark-dice: {max: 'has(subclasses, Shield Oath) * 4', refill: short rest}"
```

## 6. Code

Where data is not enough, a system brings code, as the 5e does for its dying point. Its `package.json` says so, as an extension's does:

```json
{ "type": "module", "main": "dist/index.js", "rpg-engine": { "kind": "system", "api": 1 } }
```

`src/index.ts` is built into `dist/` with the engine; the package ships `dist/` without `src/`. Its default export gives the hooks, each optional, each giving lines for the command's output:

```ts
import type { SystemEntry } from "rpg-engine";

const system: SystemEntry = () => ({
    counterChanged: (change, game) => [],   // after change or the hit dice wrote a counter of a page
    turnStarted: ({ who }, game) => [],     // as someone's turn starts in a scene
    rolled: (roll, game) => [],             // after a roll for someone, never a hidden one
    effectAdded: ({ page, effect }, game) => [],
    asking: ({ who, notations }, game) => undefined, // what the page draws of a question, as a death save; it only reads
});
export default system;
```

- The engine loads the code once, as the command line, the MCP server or the dashboard starts: a system changed since needs the server started again.
- `game` reads a page (its counters with its effects, its effects, whether it is in the party or the player's character), a setting, and compares names as the engine does; it sets numbers (a counter keeps its maximum), adds and ends effects, and rolls with the engine's dice. Each write has its line in the log, public or hidden as the engine shows that page; a write calls no hook.
- A hook that fails, or code that cannot load, is a line for the master, with what to do: the command's change stands.
- The code reaches the game only through `game`: lint refuses `Math.random`, `Date`, `process`, `globalThis`, `import()` and Node's modules in `systems/*/src`.

## 7. Checks

[test/system-packages.test.ts](../test/system-packages.test.ts) runs on every installed system: its pages read and pass `validate`, names are unique, every field is declared and fits its kind, every rule named is in its chapters, and it has an `attribution`. A system keeps its own tests in its `test/`.
