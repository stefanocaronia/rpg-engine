# Game systems

A game system is the data of one game: its fields, its character sheet, its formulas, its pages and its rules text. The engine knows no game; each campaign plays one system. Examples come from [systems/5e](../systems/5e/), from [systems/ironsworn](../systems/ironsworn/), a test system based on Ironsworn, and from [systems/free](../systems/free/), free play with a sheet of words and no numbers. The code is in [src/systems/game-system.ts](../src/systems/game-system.ts).

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
  versions/<name>/   a version of its rules, in the same shape, over the rest (versions, in section 2)
  package.json       when it is a package: its npm name, version, the API it is made for, its code (section 6)
  build/, test/      scripts and tests, not shipped
```

The engine's own systems are in its `systems/` folder; any other is installed as a package with `package install`: from npm, or from a folder of this computer, `package install ./my-system`, whose `package.json` needs no more than `{"name": "my-system", "version": "1.0.0", "rpg-engine": {"kind": "system", "api": 5}}`. A campaign names it in `campaign.yaml` (`system: 5e`). A `system.yaml` with an unknown key or a formula that does not read is refused, with the key at fault. A running MCP server keeps the systems it started with.

The schema of `system.yaml` is part of the package API (section 6), which goes up with every addition a package may use: a new key comes with a new API number, and a system that uses it says that number, so that an older engine asks to be updated instead of refusing an unknown key. A folder without a `package.json` is data alone: it is read as made for the engine that reads it, and brings no code.

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
load: {field: weight, limit: ["str * 15 * table(carry-by-size, size)", str * 15], coins: 50, weightless: extradimensional, bundle: bundle}
length-unit: ft
```

Each coin's value in the smallest; `rare` coins are never given as change. Every measure is written in metric; `imperial` says what the game's mile and foot are, for campaigns in imperial units, and its pound, to show a load in kilograms. `load` sums what a character carries: each page's weight in `field`, a stack of a kind sold by the bundle by its pieces, how many the field `bundle` names holds, what items hold, unless an item has the field `weightless` names set to true, and the coins, `coins` to a unit of weight; the sheet shows it against `limit`, a formula or formulas in order, and `status` says when a character goes over it under the rigor `rules` or `simulation`; formulas read them as `load` and `load-limit`. `stages` lists what a load makes a character, the heaviest last, each with `when`, the formula that says so above 0, as `[{name: Encumbered, when: "has(rigor, simulation) * ceil(load - 5 * str)"}]`: the dashboard shows the heaviest reached, in the system's words. `length-unit` is the unit of the lengths the formulas work out, as the speeds.

### travel

```yaml
travel:
  paces: {fast: 6 km, normal: 4.5 km, slow: 3 km}
  pace: normal
  hours: 8
  rule: Travel Pace
  beyond: Forced March
  terrain: {difficult: 1/2}
  vehicles: {category: drawn vehicle}
  kinds:
    road: {}
    river: {vehicle: {category: waterborne vehicle}, speed: speed, hours: 24, current: 4.5 km}
```

Paces per hour, the hours of a day's travel and the rule past them, what terrain does to a pace, the vehicles and the kinds of road. A vehicle is an item with a field at a value `vehicles` names, one or a list, or the `vehicle` of a kind, which is travelled only in such an item, at its `speed`. Travellers in a vehicle go with it, and what it holds too; one in any other item is refused, and a game that declares no vehicles has none.

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

### versions

```yaml
versions:
  about: which rules you play
  srd-5.1: {means: "the SRD 5.1, the 2014 rules", player: "the 2014 rules"}
  srd-5.2.1: {means: "the SRD 5.2.1, the 2024 rules", player: "the 2024 rules"}
```

The versions of its rules, written as a setting: a campaign plays one with the setting `ruleset`, asked in the setup before the system's other settings, and changed only by the player's choice, from the next read on, the pages already written staying as they are. One version alone is no choice and no setting. Without `ruleset`, or with a name the system lacks, the first listed is played: list the oldest first, so that campaigns made before a new version stay on theirs. Each version has its folder, `versions/<name>/`, in the shape of the system's: a `system.yaml` with its `title` and only the keys it changes, and its `world/`, `rules/`, `words/`, `instructions/` and `images/`. The engine reads the common part, then the version over it, then what extensions and the campaign add (section 5). In the version's `system.yaml` a map is merged by its names at every depth, the version's winning, and a list or a value takes the place of the common one; a page, a chapter of `rules/` (by its file), a word or a part of the instructions with the name of a common one takes its place.

The 5e has one version for now, `srd-5.1`, whose folder holds only its title: everything else is common, and when a second version comes, what differs moves into the folder of the first, so that a campaign of today reads the same before and after.

### The sheet

```yaml
sheet:
  Character: [creature?, classes, level, xp, inspiration?]
  Abilities: [str (str-mod), dex (dex-mod), proficiency]
sheet-notes: {Personality: "..."}
sheet-icons: {Abilities: "M4.5 13.5h3v6h-3Z ..."}
sheet-headline: "Level {level} {classes}"
sheet-cards: {rail: [Abilities], order: [Skills, Combat], at-hand: [ac, hp, Attacks]}
sheet-actions: {spells: [cast], inventory: [use, equip]}
sheet-verbs: {cast: {label: Cast, title: "Cast {item}", says: "I cast {item}."}}
sheet-dice: {1d20: [str-mod, dex-mod, athletics, initiative, attack]}
token-icons: {field: classes, icons: {Cleric: "M12 4v16 M7 9h10"}}
status-line: [level, hp, temp-hp?, ac]
values: {save-proficiencies: [str, dex, con, int, wis, cha]}
marks: [save-proficiencies, skill-proficiencies, expertise]
```

- `sheet`: groups of fields in order. `field?` is written only when it applies; `field (beside)` shows a field beside it. The player character keeps a sheet, and so does a companion with a `level` or no `creature`. A group with `inventory` shows what the character carries, a row for each stack or item, what a container holds below it and what is equipped marked, after the group's other fields, such as `money`.
- `sheet-notes`: what `write` says of a group when a character joins the party.
- `sheet-icons`, `token-icons`: SVG path data on a 24 grid, for a group's card and for a token's mark by class.
- `sheet-headline`: the line under a name on the dashboard; a part between commas whose fields are all empty is left out.
- `sheet-cards`: where the dashboard puts the groups.
- `sheet-actions`: the fields whose items the player acts with on the dashboard, each with its verbs, the engine's (`attack`, `use`, `equip`, `unequip`) or the system's own, the first the one a click says. The page makes it the player's own sentence to the master, who rules it; it checks nothing. Without it, the sheet only shows.
- `sheet-verbs`: the system's own verbs, each with its `label`, its `title` with `{item}` and the sentence it `says`; `says-on` (`{target}`), `says-at` (`{square}`) and `says-self` together let the player choose on whom. In the system's language; its `words` translate them.
- `sheet-dice`: the dice of the dashboard's free roll for each number. `sheet-odds`: the dice of a better and a worse free roll, and `when`, fields with the formulas that make them `better` or `worse` above 0; both cancel out, and `why`, a word of the system the dashboard shows beside the roll, as `{better: 2d20kh1, worse: 2d20kl1, when: [{fields: [stealth], worse: "count(equipped, stealth-disadvantage = true)", why: Armor}]}`.
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
- `recipes`: what a rest does: counters `set`, partly `regain`ed or `lower`ed by an amount or a formula, never below 0 (`lower: {exhaustion: 1}`), dice one may `spend`, each rolled with what it `adds` and the total given to a counter (`spend: {hit-dice-*: {gives: hp, adds: con-mod}}`, used as `change Bruna hit-dice-d8 --spend 2 --recipe "short rest"`, with `--values 6,1` for physical dice, or by the player one die at a time on the dashboard, through `ask` with the recipe), the counter it `needs` above 0 to give anything (`needs: hp`), how often it gives anything (`once-per: 24h`, counted from the last time it gave a page something, applied once the hours it `lasts` have passed), the occasions it `ends`, the rules it leaves to the master.

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

The lists a character binds items in: `write` refuses more than `most`, and an item whose field `needs`, its own, its base's or a linked item's, asks for nothing; binding one says how many, what it asks (`by a paladin`) and the rules to read. With `while`, a bound item gives its bonuses only while in that list too, as a ring worn, and binding one not there says so. On the sheet the list shows how many it holds of `most`, and each thing carried that is in it is marked.

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

### conditions, keeping, combat, down

```yaml
conditions: [Blinded, Charmed, Poisoned, Prone]
condition-icons: {Prone: "M4 18h16M7 14l5-4 5 4"}
keeping: {counter: hp, conditions: [Incapacitated, Unconscious], rules: Concentration}
combat: {track: hp, in-words: [unhurt, hurt, bloodied, down], inactive: [Incapacitated, Stunned, Unconscious]}
down: {at: hp 0}
immune: condition-immunities
checks:
  - {when: Stable, needs: hp <= 0, say: "{page} is Stable with {hp}: effect end {page} Stable."}
```

- `conditions`: effects with these names show their rule; `condition-icons` draws them, and any other effect by its name, as a spell's: on the tokens, in the turns and in the effect's chip. Here and in `keeping`, `combat`, `immune` and `checks`, an effect named with the system's word in the campaign's language, from `words`, counts as its English name, and is the same effect: `Prono` is `Prone`.
- `keeping`: what can break what someone keeps alive, as concentration; the output names the rule, the engine ends nothing.
- `combat`: the counter the dashboard's Combat follows; `in-words`, the words a foe's is heard in, the first at full, the last at 0, those between at equal shares, translated by the system's `words`; who cannot act.
- `down`: when one of the party is down, `at` a counter's value or under it, which Combat and the tokens read. What being down does, and how the dashboard draws it, are the system's code and widgets (see [Code](#code)): the 5e's death saves are its widget in place `person`, a panel under the name, and the card of its widget in place `card` a death save is asked in. Without them the dashboard says down and leaves the counters in the line of values.
- `immune`: the list of a page whose conditions `effect add` refuses.
- `checks`: what cannot be true together, which the engine tells the master at `scene next` and `advance`, once in a chat while it lasts, and in `status` and `validate` every time; it never changes anything. `when` and `needs` are an effect's name, which counts only without an end or a keeper, or a field against a number; `say` fills `{page}` and each `{field}` with the page's own values. A check that needs more is the system's code. The engine checks two things itself, from the data above: who keeps an effect alive while a condition of `keeping` is on them, and one of the party at the value of `down`, not marked dead, with no condition of `combat.inactive`. It checks the party, alive or dead, and the characters of the open scene, never copies.

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
- A counter on every sheet, as `stress` from 0 to 6: declare it in `fields` as a counter, give it its limits here, `stress: {max: "6"}`, and name it in a group of `sheet`. A character that joins the party without it is told to the master, who writes it, `stress: 0/6`; the engine does not write it on its own.

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

Items of `list` such as `[[Barbarian]] 3` read the row of their page's level table: its columns become fields (but those in `skip`), its `features` column the features gained. `parts` are pages that add features by their class's level, as subclasses. Features written by hand on the character, as a feat gives one, join those gained: the sheet shows them all, and formulas read them all. `experience` gives the points each level needs. `level` names the field of a level written on a page: a companion with it, or with items of `list`, keeps the sheet.

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
- Besides the fields, a formula reads `effects` as the names of the page's effects, one written in the campaign's language by its English name from `words` (`has(effects, Grappled)` finds `Afferrato`), `rigor` as the campaign's, and `load` and `load-limit` (see `load`).
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

**Instructions.** `instructions/<part>.md` adds to the core's part of that name, or replaces it with `replace: true`. Parts: `setup`, `session-zero`, `play`, `combat` and any scene type, `new-day`, `quest-ends`, `session` (how a session opens in play), `adventure` (how to build one, when none is open or planned), `mentor-hints`, `mentor-tutorial`, `level-up`, and `import`, what the importer's helper reads, such as how the system's creatures stand in for the people of a book.

## 5. What a campaign adds

A campaign's pages work as a system's: a class in `world/topics/` counts in `sum(classes)`, a creature with `creature: "[[Elf]]"` is a new race, an item with `item: "[[Longsword]]"` a named sword. A campaign page cannot take a system page's name.

`campaign.yaml` adds to `fields`, `tables`, `computed`, `counters`, `recipes`, `status-line`, `travel`, `values` and `condition-icons`, with `config`; an entry with a system's name replaces it, but the names in `values` join the system's list, as a language of the campaign's world:

```text
config counters "bulwark-dice: {max: 'has(subclasses, Shield Oath) * 4', refill: short rest}"
```

An extension adds the same keys but `status-line` and `travel`, in its `extension.yaml`, under the campaign's: see [extensions.md](extensions.md#2-extensionyaml).

## 6. Code

Where data is not enough, a system brings code, as the 5e does for its dying point, its death saves and its hit dice on the dashboard. Its `package.json` says so, as an extension's does, with the API it is made for:

```json
{ "name": "@rpgengine/system-5e", "version": "1.0.0", "type": "module", "main": "dist/index.js", "rpg-engine": { "kind": "system", "api": 5, "page": "dist/page.js" } }
```

A system's code has the contract of an extension's, `PackageEntry`, described in [extensions.md](extensions.md#3-code): its `commands`, `timePassed`, the hooks of its `widgets`, and its page module. `system.yaml` declares `icons`, `widgets` and `figures` with the keys and limits of an `extension.yaml`. The engine calls the hooks after its own writes for the system first, then for the extensions, each optional, each giving lines for the command's output:

```ts
import type { PackageEntry } from "rpg-engine";

const system: PackageEntry = ({ z }) => ({
    commands: [{ name: "5e-spells", description: "…", input: z.object({}), readOnly: true, player: true, run: (input, game) => "…" }],
    counterChanged: (change, game) => [],   // after change or a rest's dice wrote a counter of a page
    turnStarted: ({ who }, game) => [],     // as someone's turn starts in a scene
    rolled: (roll, game) => [],             // after a roll for someone, never a hidden one
    effectAdded: ({ page, effect }, game) => [],
    asking: ({ who, checks, notations, recipe }, game) => undefined, // how the core's ask asks this roll, or a rest's dice; it only reads
});
export default system;
```

- A system's commands are named as the system, or start with its name and a hyphen, as the campaign plays it: `5e`, `5e-spells`.
- `asking` gives, before the core's `ask` shows its buttons, what an extension gives `game.ask`: the roll's button, `decline: false` for a forced roll, a `rule`, and `card: {widget, key}`, one of the package's widgets to ask in, its hook given the key and whose roll it is; `undefined` asks as always. With `recipe`, it is asked for the dice of a rest, which the page then spends in that card, its page module's body drawing them. The system is asked first. A package's own `game.ask` is not given to it.
- The engine loads the code once, as the command line, the MCP server or the dashboard starts: a system changed since needs the server started again. A system made for an API the engine does not read brings no code, and says why.
- In the hooks, `game` is a package's (see extensions.md): `set` writes as `write --set`, `change` changes a counter as the `change` command, the way for hit points and any counter the rules watch, and calls no hook from inside one; `addEffect` and `endEffect`. A roll for anyone outside the party is hidden while the campaign's `master-rolls` setting keeps it behind the screen. Each write has its line in the log, public or hidden as the engine shows that page; a write calls no hook. Its state is kept in `extensions/<name>/state.yaml`, as an extension's.
- A hook that fails, or code that cannot load, is a line for the master, with what to do: the command's change stands.
- The code reaches the game only through `game`; in this repository, lint refuses `Math.random`, `Date`, `process`, `globalThis`, `import()` and Node's modules in `systems/*/src`.

## 7. Checks

[test/system-packages.test.ts](../test/system-packages.test.ts) runs on every installed system: its pages read and pass `validate`, names are unique, every field is declared and fits its kind, every rule named is in its chapters, and it has an `attribution`. A system keeps its own tests in its `test/`.
