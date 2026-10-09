# Game systems

A game system is the data of one game: its fields, its character sheet, its formulas, its pages (creatures, items, classes…) and the text of its rules. The engine knows no game: everything that names a game's concepts, such as hit points or ability modifiers, lives in a system as data. Each campaign plays one system.

This document is for developers, for AI agents, and for anyone who writes a system or adds a game's options to a campaign. It describes what the code does today. The examples come from the two systems in the repo: [systems/5e](../systems/5e/) (the SRD 5.1) and [test/systems/ironsworn](../test/systems/ironsworn/) (a test system based on Ironsworn, used to keep the core generic). The code is in [src/systems/game-system.ts](../src/systems/game-system.ts), [src/core/formula.ts](../src/core/formula.ts), [src/commands/worked-out.ts](../src/commands/worked-out.ts), [src/commands/sheet.ts](../src/commands/sheet.ts) and [src/pages/](../src/pages/).

## 1. What a system is

A folder whose name is the system's name, holding a `system.yaml`:

```text
systems/5e/
  system.yaml          what the system declares (section 3)
  LICENSE.md           the license of its content and the attribution its sources ask for
  world/
    creatures/*.md     stat blocks, races and subraces
    items/*.md         armor, weapons, gear, magic items
    topics/*.md        classes, subclasses, backgrounds, feats, spells
  rules/*.md           the chapters of its rules, as markdown
  images/              the pictures its pages link in image
  instructions/*.md    its parts of the master's instructions (section 6.6)
  build/               the scripts that wrote some of its pages and rules from its source (not shipped)
  test/                the system's own tests (not shipped)
```

- `world/<folder>/` holds its pages, one markdown file per page, in the same folders a campaign uses (section 6).
- `rules/` holds its rules as text, searched by the `rules` command and read by title (section 6.5).
- `images/` holds the pictures its pages link in their `image` field, such as `image: "[[goblin.svg]]"`; a campaign page derived from one shows it, and a campaign's own `images/` file with the same name takes its place.
- `instructions/` holds what it adds to the master's instructions, part by part (section 6.6).
- `LICENSE.md` is not read by the engine: it ships beside the system and says what the content is under and where it comes from.

## 2. How a system is found and installed

- The engine looks for systems in the folders of `context.systemFolders` ([src/core/context.ts](../src/core/context.ts)): by default only the package's own `systems/` folder. Every subfolder with a `system.yaml` is an installed system; its name is the folder's name, compared ignoring case. When several folders are given (the tests add `test/systems/`), the nearest folder wins for a name found twice.
- So today a system is installed by putting its folder in `systems/`. The npm package ships `systems/` without each system's `test/` folder.
- A campaign names its system in `campaign.yaml` (`system: 5e`), through `init` (option `system`) or `config` (setting `system`); both accept only an installed system and list those that are. A campaign whose system is not installed still works without its pages; `validate` reports it with the fix.
- `system.yaml` is read when a command needs it. One that is not valid stops the command: `The game system 5e cannot be read, because …/system.yaml is not valid:` followed by the key at fault; a key the engine does not know is refused by name, so a misspelled one never goes unnoticed.
- An MCP server keeps the systems it started with: after changing a system, reconnect it.

## 3. system.yaml

Every key but `title` and `language` is optional. Field names in all keys are compared ignoring case.

### title, language, attribution

```yaml
title: the fifth edition from the SRD 5.1, the 2014 rules
language: en
attribution: >-
  This work includes material taken from the System Reference Document 5.1 ...
```

- `title`: what the system is, in messages, `status` and `config` ("5e, the fifth edition from the SRD 5.1…").
- `language`: the language its pages and rules are named in, as a code such as `en` or `pt-BR`. When the campaign plays in another language, messages say that the system's pages are found by their names in this one.
- `attribution`: what a work that uses the system must say of its source. It is kept with the system; no command shows it today, so `LICENSE.md` repeats it.

### fields

The kind of each field the system's pages and sheets use:

| Kind | What the engine does with it |
|---|---|
| `counter` | Counted: written `12` or `current/max` such as `11/11`, changed with `change`. One without a maximum at 0 (such as `xp`) is left out of a character's line. |
| `number` | A number, never counted. An effect on it gives another number. |
| `modifier` | A number shown with its sign (`+2`), never counted. |
| `bonus` | A number that effects add up: two effects giving `bonus-saves=1` read 2. A bonus the page lacks reads as 0 in formulas. |
| `text` | Text, never counted, never money; or `true` and `false`, such as a spell's `ritual`. |
| `list` | A list, never counted. Given one item, a write makes it a list of one; text with commas, which would read as one item, is refused, and `validate` reports it written by hand. |
| `rolls` | Rolls kept for later, such as a diviner's Portent: `roll` with `keep` writes the dice rolled there, `roll` with `use` takes one in place of a die and logs which roll it replaced. The line of the character shows them; a rest reminds them. |

```yaml
fields:
  hp: counter
  str: number
  str-mod: modifier
  bonus-saves: bonus
  speed: text
  languages: list
```

A field the system does not declare is free: written as a number or `current/max`, it counts as a counter. No field the system declares is ever read as money.

### coins

The coins of the game, used when `campaign.yaml` gives none of its own. Written as `config` takes them, or as a map as `campaign.yaml` writes them:

```yaml
coins: gp 100, pp 1000 rare, ep 50 rare, sp 10, cp 1
```

Each coin has its value in the smallest coin; one coin is worth 1; the first is the coin totals are counted in; `rare` marks a coin never given as change; `gp/mo` gives a coin two names.

### round

```yaml
round: 6 seconds
```

How long a round lasts. In a scene with turns, an effect of up to a minute on someone in the scene ends after as many rounds (`1m is 10 rounds of 6 seconds.`).

### imperial

```yaml
imperial: {mile: 1.5 km, foot: 0.3 m}
```

What the game's mile and foot are worth in metric (D-262). Every measure the engine reads is written in metric, in `system.yaml` and in the pages (road lengths, paces, vehicle speeds); outputs give them in the campaign's `units`, and in imperial with these values, so that a player hears the book's numbers (the normal pace of 4.5 km an hour is 3 miles). Without it, the true mile and foot. Text stays as written: a page may say `30 ft.`, and the AI reads it so.

### travel

How one travels (D-261, `TRV-1`–`TRV-3`, `TRV-8`), read by `route` and `travel`:

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
    path: {}
    river: {vehicle: {category: waterborne vehicle}, speed: speed, hours: 24, current: 4.5 km}
    sea: {vehicle: {category: waterborne vehicle}, speed: speed, hours: 24}
```

- `paces`: each with the distance of an hour, in metric (`4.5 km` or `4.5 km/h`); `pace`, the one used when none is given, else the first. What a pace does (a penalty, stealth) stays in the rule `rule` names. A system without paces makes `travel` ask for a speed.
- `hours`: the hours of a day's travel; `travel` stops when they end, and names the rule `beyond`. Without it, 8.
- `terrain`: what a value of the environment's `terrain` entry does to a pace, as a factor (`1/2` or `0.5`); the entry is read on the road and the places around it, as the environment is (`ENV-2`).
- `kinds`: the kinds of road the system knows, by the name a road's `kind` gives. A kind with `vehicle` is travelled only in an item whose field has that value, at the speed its field `speed` names (in metric, as `speed: 1.5 km/h`), with no pace; `hours` gives its hours of a day; `current` is added going downstream, the way a river's stops are written. A kind without them is travelled at the pace. A kind the system does not know is travelled as `road`, and `validate` reports it.

A campaign adds to it in `campaign.yaml`, key by key, its paces, terrain and kinds by name (section 7).

### settings

What the setup asks for the system, with the campaign's own settings (`DAT-10`):

```yaml
settings:
  advancement:
    xp: {means: "experience points, as the SRD: …"}
    milestones: {means: "the characters rise when the story reaches a milestone …", without: [xp]}
```

- Each setting has two values or more, each with what it means. `status`, `init` and `config` say it among the settings still missing, and `status` shows its value on the campaign's line at every session; `config` shows what each value means, writes the value given into campaign.yaml and refuses one the system does not have; `validate` reports one written by hand.
- `without`: the fields a value leaves out. They are not in the sheet, the line or what the sheet still lacks, the experience and rewards of that field say nothing, and `write` says so when one is written. Without a value, nothing is left out.

### sheet and sheet-notes

The character sheet, in groups, each with its fields in order:

```yaml
sheet:
  Character: [creature?, classes, level, xp, inspiration?]
  Abilities: [str (str-mod), dex (dex-mod), proficiency]
  Personality: [ideal?, bond?, flaw?]
sheet-notes:
  Personality: "a player character's ideal, bond and flaw are the player's, in their words..."
```

- `field`: a field the character writes; `status` reminds it until it is written, unless the system works it out (`computed`).
- `field?`: written only when it applies; never reminded.
- `field (beside)`: a field shown in parentheses beside it: `str 14 (+2)`.
- The player character (`role: pc`) keeps the sheet, and so does a companion with a `level` or with no `creature` (a wolf with its stat block does not).
- `show` gives a sheet one line per group, effects and formulas included: `Abilities: str 14 (+2) · dex 12 (+1) · proficiency +2`. `show Page#Group` gives one group with how each number is made (a section or secret of that name comes first).
- Before there is a player character, `status` lists what the sheet asks to write, what only when it applies, what the system works out and the names its lists take, and the system's part `session-zero` says how to make one (section 6.6). In session zero its checklist says what each sheet still lacks; in play `status` reminds it.
- `sheet-notes`: what `write` says once of a group when a character joins the party. A note for a group the sheet does not have is refused when the system loads.

### values

The names a list field takes, for the lists the game closes:

```yaml
values:
  save-proficiencies: [str, dex, con, int, wis, cha]
  debilities: [wounded, shaken, unprepared, encumbered]
```

`write` refuses other names, listing these, and refuses links where the system wants its names; `validate` reports names written by hand on the campaign's pages. The field must be declared a `list`.

### marks

The lists that mark the numbers of the sheet that read them, such as proficiencies:

```yaml
marks: [save-proficiencies, skill-proficiencies, expertise]
```

A computed number has a ● for each of these lists that it reads with its item, where the item changes it: `athletics +5 ●`, and `stealth +7 ●●` with expertise. The fields must be declared `list`.

### status-line

The fields of the line that shows the player character and the companions in `status` and in scenes, in order:

```yaml
status-line: [level, hp, temp-hp?, ac, passive-perception, inspiration?, exhaustion?]
```

With `?`, a field usually at zero: shown only when it is not, reported by a recipe only when it is not, and named before a roll of that character when it is not. The page's other counters follow the listed fields.

### rewards

What the creatures overcome in a scene give the party (`DAT-11`):

```yaml
rewards:
  xp: {from: xp-value, overcome: hp 0}
```

`scene close` adds up `from` on the copies and on the characters outside the party who were in the scene, those that left it too, and are at the `overcome` value or below, or dead, and shares it, rounded down, among the living party members who were there and keep the sheet. It says the share with the calls of `change` (`write` for one who has no such field yet), and gives nothing by itself: it names the characters among the overcome, who may have fought on the party's side, those that left alive, who may have fled, and those whose page gives no `from`; who was overcome another way, and what the story rewards, are the master's to judge.

### thresholds

The rule a counter of the player character or a companion touches when `change` (or a recipe) changes it:

```yaml
thresholds:
  hp 0: Dropping to 0 Hit Points
  death-failures 3: Death Saving Throws
  exhaustion: Exhaustion
```

- `field value`: the output says when the counter reaches the value (even going beyond it), takes more while at it, leaves it or goes past it: `hp is at 0, 7 beyond: read rules "Dropping to 0 Hit Points".`
- `field` alone: the rule's text at every change, a house rule of the campaign first.

### recipes

What a rest does:

```yaml
recipes:
  long rest:
    set: { hp: max, temp-hp: 0, slots-*: max }
    regain: { hit-dice-*: "max(1, floor(level / 2))" }
    ends: [long rest, short rest]
    rules: [Long Rest]
  short rest:
    ends: [short rest]
    rules: [Short Rest]
```

`change recipe "long rest"` applies it to a page, or without one to the living player characters and the companions where they are:

- `ends`: the occasions it ends. An effect can last until one of them (`effect add … for "long rest"`); the recipe ends those effects first.
- `set`: the counters it brings to their maximum (`max`) or to a value; a name ending in `*` stands for every field that begins so.
- `regain`: how many of the counters a name stands for come back in all, by a formula on the page. When all that is spent comes back, or only one of them is spent, they come back by themselves; otherwise the output asks the player which.
- It also brings back the uses whose `refill` names one of the occasions it ends (see `counters`).
- `rules`: the titles of the rules for what it leaves to the master. The output names them, and lists the page's other counters away from their usual value, each with the rule of a threshold that applies.

### conditions

```yaml
conditions: [Blinded, Charmed, Poisoned, Prone]
```

An effect with one of these names shows the text of the rule so titled, a house rule first, with the table's precedents on it; a roll notes the conditions of who rolls.

### keeping

What can break what someone keeps alive, an effect given with `by`, such as a spell held by concentration (`EFF-14`):

```yaml
keeping: {counter: hp, conditions: [Incapacitated, Paralyzed, Petrified, Stunned, Unconscious], rules: Concentration}
```

When `change` lowers `counter` on whoever keeps an effect, a page or a copy, when `effect` gives them one of `conditions`, or gives them one more effect to keep, the output says what they keep, on whom, what they lost or took, and names the rule: `Viola keeps Eroismo (Corrado): lost 7 hp. Read rules Concentration.` The AI rolls what the rule asks; the engine ends nothing by itself. `counter` must be declared a counter in `fields`. A system without `keeping` says nothing.

### tables, computed, counters

What the system works out from a page's fields, in the formula language of section 4:

```yaml
tables:
  proficiency-by-level: {1: 2, 5: 3, 9: 4, 13: 5, 17: 6}
computed:
  str-mod: floor((str - 10) / 2)
  level: sum(classes)
  proficiency: table(proficiency-by-level, level)
  passive-perception: 10 + perception
counters:
  hp: {max: "hp-base + level * (con-mod + hp-per-level)"}
  hit-dice-d10: {max: "sum(classes, hit-die = d10)"}
  inspiration: {max: 1}
```

- `tables`: rows by number or by name. A number key reads the highest row not above it (level 7 reads row 5: 3); a name reads the row with that name (`ranks: {troublesome: 12, dangerous: 8}`).
- `computed`: a field worked out by a formula, a number, or several formulas in order, of which the first with a value counts. Computed fields are shown in this order; each is worked out when read, so a formula may read a computed field given below it.

  ```yaml
  str-save:
    - str-mod + proficiency * has(save-proficiencies, str) + bonus-saves
    - str-mod + has(saves, Str) * (item(saves, Str) - str-mod) + bonus-saves
  ```

  In 5e the first needs a level, so it is a character's; a creature has none, and its saves come from the totals its stat block lists (`saves: [Wis +0]`).
- `counters`: the `min` and `max` of a counter, each a number or a formula. A limit counts only when it is a whole number; a maximum below 0 counts as 0, as Divine Sense's `1 + cha-mod` with Charisma 7. `min` replaces 0 as the lowest value (`momentum: {min: -6, max: 10 - count(debilities)}`).
- `refill`: what of a counter comes back with a recipe that ends an occasion: `refill: long rest` brings it all back; by occasion, a formula where `max` is its maximum (`{long rest: max, short rest: "4 * has(features, Sorcerous Restoration)"}`). A counter without `max` takes its maximum from the column of a class's row with its name, such as `rages` (see `progression`).
- **Uses.** A counter with a `refill`, or that a recipe sets or regains, comes back with a rest: a character who keeps the sheet (the player character, and a companion with a level, written or given by its classes, or that derives from no creature) and whose maximum for it is above zero has it full until it spends it; other pages, places, items and copies in a scene never have it. `write` puts it on the page full, and says so; the line of the player character and the sheet show it. When a use's maximum grows, as at a new level, its current grows by the same amount: what was spent stays spent, and the slot or hit die a level gives is there at once; when it falls, the current stays within it. Any other counter keeps its current. A use that the lists give, such as `rages` from the classes, leaves the page when its maximum falls to 0 or has no value, as after a lower level, unless the sheet asks for it, as `hp`. When a page's effects change, what a current has above its written maximum that the maximum no longer allows goes, as when Aid ends, and `effect` says it; a form that lowers the maximum leaves the page's own current. A use the character does not get is not written by hand.
- A `refill` names occasions that a recipe `ends`: one that no recipe ends would never bring the use back, and the system does not load.
- `shields`: the counter this one protects, which loses from it first (`temp-hp: {shields: hp}`, `DAT-14`). When `change` lowers the protected counter of a page whose shield is above 0, the output says the shield goes first and how to put the change right, with the rule of the shield's threshold if it has one; the AI does the count. A counter with only `shields` has no limits.
- A counter declared in `fields` with no `max` and no `refill`, such as `temp-hp`, `xp` or `exhaustion`, starts at 0 when `change` is given it on a character, a quest or a copy that does not hold it yet and that no page derives from, and once written only `change` changes it (`CNT-7`, `CNT-8`).

When the system loads, every formula must read, name only tables it has, and computed fields must not read each other in a circle; a field given twice in different cases is refused. The error names the place: `computed.insight: "wis-mod +" is not a formula: …`.

### progression

How the classes of a character give the row of their table at the level the character has in each, and the features gained so far:

```yaml
progression:
  list: classes
  features: Features
  skip: [Proficiency Bonus, 1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th, 9th]
  parts: {list: subclasses, field: class, lists: [prepared]}
  experience: {field: xp, table: xp-by-level, rules: Beyond 1st Level}
```

- `list`: the list whose items name a page with a number, `[[Barbarian]] 3`. The page's first table that has the `features` column and whose first column counts levels (`1st`, `2nd`… or `1`, `2`…) gives its row 3.
- Every other column of the row is a field of the character, named in lowercase with hyphens (Rage Damage gives `rage-damage +2`), except those in `skip`; an empty cell or a dash gives nothing. Two classes with the same column give a value each, "Bard 3, Sorcerer 4", which no formula reads: in 5e what a character knows is counted class by class. These fields are worked out like computed ones: never written, refused by `change` and `effect`, read by formulas.
- `features`: the column of the features. The rows up to the level give them, each once: one written again with a value in parentheses takes the place of the earlier (`Bardic Inspiration (d8)`). Only names that are titles of the page's sections count, also when the column has the singular (`Signature Spell` for `Signature Spells`): "Path feature" or "Wild Shape improvement" do not.
- `parts`: the pages of another list that name their item in a field, such as a subclass with `class: [[Barbarian]]`. Each lists its features with the level at which it comes, `features: [Frenzy 3, Mindless Rage 6]`, and adds them up to the level of its class. `lists` names the character's lists a part adds to the same way, such as a cleric domain's spells, always prepared and not counted: `prepared: [Bless 1, Cure Wounds 1]` on its page; the sheet shows them apart, and `write` says when one is written by hand (PRO-7).
- The features make the list field named after the column (`features`): the sheet shows them in the group that lists it, with the row's fields after them; `show Page#Rage` gives a feature's text from the page that tells it, and from each page when two classes give the same name (`Spellcasting`), in the order of the classes, while the list holds the name once; formulas read them (`has(features, Jack of All Trades)`). When `write` changes the classes, it says the features of the rows it reaches: new, gained again (`Ability Score Improvement again`) or with a new value (`Bardic Inspiration (d6 → d8)`), and the values that change.
- When the character's levels rise in all, `write` gives the system's part `level-up` (section 6.6), unless the same write sets a field the part names, as `hp-base`.
- `experience` (`PRO-6`): the field of the experience points, a table of the points each level needs (`{1: 0, 2: 300, 3: 900, …}`), and the rule to read. The level is the sum of the numbers of `list`. The line and the sheet say beside the points how many the next level needs, `xp 350 (550 to level 3)`, the highest level they reach beyond the classes', `xp 950 (level 3 due)`, or the least their level needs when they are below it, `xp 0 (at least 6500 at level 5)`; nothing at the table's last level. When `change` or `write` brings the points to a new level, the output says so with the rule and the part `level-up`, a companion's choices left to the master; `status` says it at every session until the classes rise. `write` says when the points fall short of the level, and `validate` reports points below it, written with a maximum, or as text. Only the classes change the level.
- `validate` reports a class without a level or without a page, a class without such a table or without the row, and a part that names no class, names one the character lacks, or lists features without a level.

### item-formulas

For a list of a character, the fields to which the page of each item gives a formula, worked out on the character once for each item:

```yaml
item-formulas:
  classes: [spell-save-dc, spell-attack, max-prepared, unarmored-ac]
  equipped: [armor-class, armor-class-bonus, attack, damage-roll]
```

- A class's page gives `spell-save-dc: "8 + proficiency + wis-mod + bonus-spell-dc"`; an armor's `armor-class: "14 + min(dex-mod, 2) + bonus"`; a weapon's `attack: "str-mod + proficiency * max(has(weapon-proficiencies, martial weapons), …) + bonus"`.
- The formula reads the item's own fields first, with its effects, as the `bonus` of a magic weapon written `1` or `+1` on the campaign's item, or Magic Weapon's; then the character's. The fields the item gives for its list are read on the character. The 5e's arms and armor write `bonus: 0`, so that a formula never reads a bonus of who has them.
- With one item the field is that number; with several, "Cleric 13, Wizard 12". Another formula reads the number of the first item that gives it, as the first class's Unarmored Defense, and `write` says so when a second item gives it. A formula may begin with dice and end with words, as a damage `"1d8 + str-mod + bonus slashing"`: the dice and the words stay, the rest is worked out, "1d8+3 slashing".
- A group of the sheet whose fields all come from one list is shown item by item: `Attacks: [attack, damage-roll]` gives "Attacks: Longsword +5, 1d8+3 slashing · Light Crossbow +2, 1d8 piercing".
- A roll may take its dice from a field, with `dice(…)` in place of the dice: the largest of the dice, numbers and fields it names that have a value, by the average they roll, the first of two alike. A field gives the dice it holds, such as a monk's `martial-arts 1d6`, or a number. So a monk weapon writes `"dice(1d6, martial-arts) + … bludgeoning"`, and rolls the Martial Arts die once it is larger than its own; the unarmed strike writes `"dice(martial-arts, 1) + … bludgeoning"`, whose number adds to the rest: "4 bludgeoning", or "1d6+4 bludgeoning" for a monk. With none of them having a value, the item gives nothing; a field no one has never counts, and `validate` reports it. `dice(…)` goes only at the beginning. `show Page#Attacks` names the field the dice came from: `martial-arts 1d6`.
- Never written, like computed fields: an effect changes what the item's formula reads, on the item. `validate` reports a formula of an item's page that does not read, reads itself, or reads a table or a name no one has, its dice included, and words after a field that is a number or that another formula reads, as `12 + Dex modifier`.

### always-in

The pages every character who keeps the sheet has in a list without writing them there (`DAT-13`):

```yaml
always-in:
  equipped: [Unarmed Strike]
```

The formulas read the list with these pages after the written ones, so the attacks of every player character and companion with a sheet end with the unarmed strike: "Attacks: Longsword +5, 1d8+3 slashing · Unarmed Strike +5, 4 bludgeoning". The list as written does not change: the sheet's `equipped` shows only what the character carries. `write`, `effect` and `move` on such a page, equipping or carrying it, deriving an item from it, and `validate` on a page that lists it, say what it is, never how to derive an item from it, which would count it twice. Creatures and characters without a sheet never have them. The list is one the system declares or a list of the core, such as `equipped`, and each name a page of the system: [test/system-packages.test.ts](../test/system-packages.test.ts) checks both.

## 4. The formula language

| Form | Gives | Example |
|---|---|---|
| numbers, fields, `+ - * /`, `( )`, `-x` | arithmetic; `/` gives fractions | `floor((str - 10) / 2)` |
| `floor(x)`, `ceil(x)` | rounded down, up: one value | `ceil(level / 2)` |
| `min(a, b, …)`, `max(a, b, …)` | at least two values | `max(1, con-mod)` |
| `best(a, b, …)` | the highest of those that have a value; none when none has | `best(10 + dex-mod, unarmored-ac)` |

Of `min`, `max` and `best`, what a value came from is only what the operand that gives it read: `max(str-mod, dex-mod)` comes from `dex-mod +4` alone.
| `table(name, key)` | the table's row for the key | `table(ranks, rank)` |
| `has(list, Name)` | 1 when the list holds Name, else 0 | `has(skill-proficiencies, Sleight of Hand)` |
| `count(list)` | how many items | `10 - count(debilities)` |
| `item(list, Name)` | the number after Name, else 0 | `item(classes, Sorcerer)` |
| `sum(list)` | the total of the numbers after the items | `sum(classes)` |
| `sum(list, field = value)` | the same, only for items whose page has that value in that field | `sum(classes, hit-die = d10)` |
| `count(list, field = value)` | how many items whose page has that value in that field | `count(classes, spellcasting = full)` |

- **Names.** A field, table or list name starts with a letter and holds letters and digits, with single hyphens between them: `str-mod`, `hit-dice-d10`. A hyphen between two parts is part of the name, so `level-1` is a field called `level-1`: write `level - 1`. Names and functions ignore case. Only ASCII letters, digits and hyphens: a field with an accent or an underscore cannot be read by a formula.
- **Values.** A field reads as a number when it is one, a counter (its current value: `7/12` reads 7) or signed text (`"+2"`). Anything else is no number.
- **Lists.** An item is a name with an optional number after it: `"[[Fighter]] 3"` is Fighter with 3, `Perception +3` is Perception with 3. A value in parentheses after the name is not part of it, and gives the number it begins with: `Channel Divinity (2/rest)` is Channel Divinity with 2, `Bardic Inspiration (d8)` has no number. A link reads as the page it names, or as its section: `[[Cleric#Channel Divinity]]` reads as Channel Divinity. A single value is a list of one. The name in `has` and `item` runs up to `)` and may hold spaces.
- **Dice.** Only a formula of an item's page may begin with dice, `1d8` or `dice(…)` (see `item-formulas`); in any other formula a die is no number.
- **sum with a field.** For each item it reads the page the item names, the campaign's first, else the system's, with what that page inherits, and keeps the item when its field has the value (ignoring case).

### When a formula has no value

A formula has no value when a field it reads is missing, empty or not a number (a `bonus` reads 0 instead), when a table has no row for the key, when it divides by zero, or when `sum` reads a list the page lacks (`has`, `count` and `item` read a missing list as empty). A computed field without a value is not worked out: the page's own value, if it writes one, is read instead. So a page without `classes` writes its `level` by hand, and a creature with no level takes its saves from the second formula.

### What a result came from

Each result keeps the values it read, and the outputs name those that changed it: `insight +5: wis-mod +3, proficiency +2, Insight in skill-proficiencies` (`show Page#Group`), `hp max none → 20 (hp-base 14, level 3, con-mod +1, …)` (`write`). A value multiplied by 0, such as a proficiency without the skill, is left out.

### What the formulas change in the commands

- A computed field with a value is always the system's: `write` skips it and says so (`Not written, the system 5e works it out: level 5 (you gave 6). They come from classes.`); `change` and `effect` refuse it and name the fields it comes from, a `bonus` first, which is what an effect gives.
- A counter with a worked-out maximum keeps it: `write` puts it on the page, `change` refuses another maximum, and a current value above it reads as the maximum.
- `validate` reports a computed field written on a campaign page where the system works it out, and a written maximum that is not the system's.

## 5. How a page is read: the layers

Every command that shows or changes a page's fields reads it in four layers ([effect-layer.ts](../src/commands/effect-layer.ts), [inheritance.ts](../src/pages/inheritance.ts), [worked-out.ts](../src/commands/worked-out.ts)):

1. **Bases.** A character or creature derives from the creature its `creature` field links to, an item from the item in its `item` field, and so on up the chain. The farthest base is read first and a nearer one wins. Some fields are never inherited: `role`, `status`, `creature`, `item`, `inventory`, `equipped`, `knows`, `factions`, `contains`, `date`, `place`, `tags`, `aliases`, `effects`. Every other field is, those a system declares included. An empty value counts as missing.
2. **The page**, over its bases. A field written in another case is the same field.
3. **Effects**, in the page's `effects` field: the newest that gives a field wins; a `bonus` adds up the page's value and every effect's.
4. **What the system works out**: the fields the rows of the classes give and the features (`progression`), then each computed field with a value, and each counter with a worked-out maximum takes that maximum.

The maximum written in the file is worked out from the page without its effects; the one shown, from the page with them. A copy of a creature in the open scene reads as a page that derives from its creature.

The text follows the same chain: `show` gives the page's introduction, else its nearest base's, and the sections and secrets of its bases that it has none of by name (a secret without a name always shows).

## 6. Writing the pages of a system

### 6.1 Files and types

A page is `world/<folder>/<Name>.md`; the folder gives its type:

| Folder | Type | Folder | Type |
|---|---|---|---|
| `characters` | character | `items` | item |
| `places` | place | `events` | event |
| `factions` | faction | `topics` | topic |
| `quests` | quest | `creatures` | creature |

The file name is the page's name and the target of `[[Name]]`: unique among all the system's pages, with a straight apostrophe. A file directly in `world/` is a free page, with no type. The 5e uses `creatures` for stat blocks and races, `items`, and `topics` for classes, subclasses, the background, the feat and the spells; its declared `category` field (`race`, `class`, `subclass`, `background`, `feat`, `spell`, `beast`…) is the system's, not the core's.

A system's pages are read-only and nowhere: no container holds one, anyone may know them, and they are found after the campaign's own pages.

### 6.2 Frontmatter

```markdown
---
size: Medium
category: race
speed: 25 ft
darkvision: 60 ft
languages: [Common, Dwarvish]
damage-resistances: [poison]
---
```

- Fields are those the system declares, plus the core's standard fields of the type (`creature`, `item`, `aliases`, `tags`…).
- Each value fits its kind: a number, text, a list in brackets, a counter as `11/11`. Text has no final period.
- A signed number goes in quotes (`armor-class: "+2"`), or YAML reads it as a number.
- A link goes in quotes too, `creature: "[[Dwarf]]"`, `subclasses: ["[[Champion]]"]`: unquoted, `[[…]]` is a YAML list.
- A number the system works out is read from its formula wherever the formula has a value; a value written on the page counts only where it has none.

### 6.3 Text: introduction, sections, secrets

The text before the first heading is the introduction. Each heading opens a section, found by its name, ignoring case: `show Dwarf#Darkvision`, a link `[[Fighter#Second Wind]]`. A `###` heading for each trait or feature makes each one readable alone, and a list item that links to it reads as its name in `has`, `count` and `item`:

```markdown
## Traits

### Darkvision
...

### Dwarven Resilience
...
```

A page that derives from another shows the base's sections it has none of by name, so a page names a section of its own differently when both should show: the Hill Dwarf's is `### Ability Score Increase (Hill Dwarf)`, beside the Dwarf's `### Ability Score Increase`. Two sections or secrets with the same name on one page are a problem for `validate`.

A system's page holds no secrets: `reveal` refuses it, since anyone may know what it says. Secrets belong to the campaign's pages, as `> [!secret] Name` followed by quoted lines.

### 6.4 Aliases and derived pages

- `aliases: [Leather]` lets a page be found by another name, such as the one the source gives. A page's name wins over an alias, and the campaign's aliases over the system's.
- A system's page derives only from another page of the same system, never from the campaign's: the Hill Dwarf writes `creature: "[[Dwarf]]"` and adds `hp-per-level: 1`; a character with `creature: "[[Hill Dwarf]]"` reads both pages' fields. Only characters and creatures (through `creature`) and items (through `item`) derive; a class or any other topic is no base.

### 6.5 Rules chapters

`rules/*.md` (subfolders too) holds the rules as markdown, each file a chapter that opens with a heading. A section is a heading; a bold title that opens a paragraph (`***Escaping a Grapple.*** A grappled creature…`), one level below its heading; or a bold caption over a table. Text before the first heading is a section named after the file; frontmatter, code blocks and `%%` comments hold no titles.

`rules` searches the campaign's house rules (its own `rules/` folder) first, then the system's. Thresholds, recipes and conditions name a rule by its title, or by titles joined with `›`; a house rule with the same title comes first. Titles therefore hold no `›`, `>` or `/`.

### 6.6 Parts of the master's instructions

`instructions/<part>.md` holds what the system adds to a part of the master's instructions, as text the master reads (D-121): the part is named after the file. The engine gives a part when its situation opens, the core's text first ([instructions/](../instructions/)) and the system's after it; a part with `replace: true` in its frontmatter takes the place of the core's instead, the rare case of a game that does a thing its own way:

```markdown
---
replace: true
---
A fight has no turns: whoever has initiative acts, with Strike, and a miss gives it to the foe, …
```

The parts the engine gives today, and when:

| Part | Given by | When |
|---|---|---|
| `setup`, `session-zero`, `play` | `instructions`, `mode` | the mode the campaign is in, or enters: the 5e's `session-zero` says how its player character is made (`DAT-12`), its `play` how fights are sized and checks rolled |
| `combat`, and any scene type | `scene open` | a scene of that type opens; the core has `combat`, how a fight is told (D-139) |
| `new-day` | `advance` | the time reaches a new day with clocks to move; the core says how to move them (D-134) |
| `quest-ends` | `write` | a quest becomes done or failed, such as the experience the story gives |
| `level-up` | `write`, `change` | the character's levels rise, or the points reach a new level (`PRO-6`) |

In a chat with the MCP server a part comes once, the first time its situation opens, and again after `instructions`, which a chat calls at its start and after a summary (D-97); on the command line it comes every time. The 5e's parts are `session-zero` (what the table agrees first, the steps in order and what a character who starts above 1st level has), `play` (fights from medium to hard at difficulty normal, conditions rolled in, a roll in brackets), `quest-ends` and `level-up`; the core's text and the system's are joined by a blank line. The part of a mode comes with every `instructions`, not once a chat. The engine knows nothing of what a part says, and the frontmatter takes nothing but `replace`.

## 7. A campaign's own options

A campaign's pages work the same way as a system's, in the campaign's `world/` folder and language: formulas read them, characters derive from them, and they can derive from the system's pages. So a campaign adds what its system lacks without changing it:

```markdown
world/topics/Cacciatore di sangue.md
---
category: class
hit-die: d10
---
```

A character with `classes: ["[[Cacciatore di sangue]] 3", "[[Fighter]] 2"]` has level 5 and five d10 hit dice: `sum(classes)` and `sum(classes, hit-die = d10)` read the campaign's class as they read the system's Fighter. A class is not a base: the character inherits none of its fields, and adds what it gives (proficiencies, languages) with `add` in `write`, which copies a list the character only inherits before adding to it, so that what the race gives stays.

In the same way, a creature of the campaign with `creature: "[[Elf]]"` is a new race that reads the Elf's fields and traits, and an item with `item: "[[Longsword]]"` is one sword with a name of its own. A campaign page cannot take the name of a system's page, which it would hide: `write` refuses it and `validate` reports one written by hand. The campaign's own `rules/` folder (its house rules) comes before the system's rules, and `coins` in `campaign.yaml` replace the system's.

What the system's data lacks, `campaign.yaml` adds in the same keys as `system.yaml`: `fields`, `tables`, `computed`, `counters`, `recipes`, `status-line` and `travel`, written with `config`:

```text
config tables "superiority-dice-by-level: {0: 0, 3: 4, 7: 5, 15: 6}"
config counters "superiority-dice: {max: 'has(subclasses, Battle Master) * table(superiority-dice-by-level, item(classes, Fighter))', refill: short rest}"
```

A formula with commas goes in quotes, or YAML reads its commas as the map's. A use's `max` reads what gives it, as above, so that only who has the feature has the use. `travel` takes a campaign's own kinds of road or terrain, key by key:

```text
config travel "kinds: {canal: {vehicle: {category: waterborne vehicle}, speed: speed, hours: 12}}"
```

```text
config computed "passive-perception: 10 + perception + 5 * has(feats, Observant)"
config fields "portent: rolls"
```

The nearest layer wins: an entry of `fields`, `tables`, `computed` or `counters` with the name of one of the system's takes its place (a house rule changes the formula, never the number on the page), and `config` says what the system's entry was, since what the new one leaves out is gone; a recipe adds to the system's of that name, field by field, with its occasions and rules; `status-line` adds fields at the end. `config` refuses what the system would not read with, saying where and why, and `remove` takes an entry away by name; written wrongly by hand, the campaign plays with the system alone and `validate` says why.

## 8. The checks every system passes

[test/system-packages.test.ts](../test/system-packages.test.ts) runs on every installed system (adding one means adding its name to the first test). It checks that:

- its pages read, and `validate`'s checks find no problem in them;
- each page name is used once, with a straight apostrophe;
- a value YAML would read as a signed number is in quotes;
- a page derives only from another of the system that exists;
- its coins read; the fields of its sheet, status line, values and recipes are declared; each threshold is on a declared counter; every rule a threshold, recipe or condition names is found in its chapters; a round lasts more than 0 seconds;
- each chapter opens with a heading, and every section can be read by its path;
- every field its pages hold is declared, and every value fits its kind, without a final period;
- it gives an `attribution`.

A system keeps its own tests in its `test/` folder, as [systems/5e/test/package.test.ts](../systems/5e/test/package.test.ts) does for the SRD's numbers, text and attribution.
