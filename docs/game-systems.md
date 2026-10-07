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
    topics/*.md        classes, subclasses, backgrounds, feats
  rules/*.md           the chapters of its rules, as markdown
  test/                the system's own tests (not shipped)
```

- `world/<folder>/` holds its pages, one markdown file per page, in the same folders a campaign uses (section 6).
- `rules/` holds its rules as text, searched by the `rules` command and read by title (section 6.5).
- `LICENSE.md` is not read by the engine: it ships beside the system and says what the content is under and where it comes from.

## 2. How a system is found and installed

- The engine looks for systems in the folders of `context.systemFolders` ([src/core/context.ts](../src/core/context.ts)): by default only the package's own `systems/` folder. Every subfolder with a `system.yaml` is an installed system; its name is the folder's name, compared ignoring case. When several folders are given (the tests add `test/systems/`), the nearest folder wins for a name found twice.
- So today a system is installed by putting its folder in `systems/`. The npm package ships `systems/` without each system's `test/` folder.
- A campaign names its system in `campaign.yaml` (`system: 5e`), through `init` (option `system`) or `config` (setting `system`); both accept only an installed system and list those that are. A campaign whose system is not installed still works without its pages; `validate` reports it with the fix.
- `system.yaml` is read when a command needs it. One that is not valid stops the command: `The game system 5e cannot be read, because …/system.yaml is not valid:` followed by the key at fault. Keys the engine does not know are ignored.
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
| `text` | Text, never counted, never money. |
| `list` | A list, never counted. Given one item, a write makes it a list of one. |

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
- Before there is a player character, `status` lists what the sheet asks to write, what only when it applies, what the system works out and the names its lists take; then it reminds what each character still lacks.
- `sheet-notes`: what `write` says once of a group when a character joins the party. A note for a group the sheet does not have is refused when the system loads.

### values

The names a list field takes, for the lists the game closes:

```yaml
values:
  save-proficiencies: [str, dex, con, int, wis, cha]
  debilities: [wounded, shaken, unprepared, encumbered]
```

`write` refuses other names, listing these, and refuses links where the system wants its names; `validate` reports names written by hand on the campaign's pages. The field must be declared a `list`.

### status-line

The fields of the line that shows the player character and the companions in `status` and in scenes, in order:

```yaml
status-line: [level, hp, temp-hp?, ac, passive-perception, inspiration?, exhaustion?]
```

With `?`, a field usually at zero: shown only when it is not, reported by a recipe only when it is not, and named before a roll of that character when it is not. The page's other counters follow the listed fields.

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
    ends: [long rest, short rest]
    rules: [Long Rest]
  short rest:
    ends: [short rest]
    rules: [Short Rest]
```

`change recipe "long rest"` applies it to a page, or without one to the living player characters and the companions where they are:

- `ends`: the occasions it ends. An effect can last until one of them (`effect add … for "long rest"`); the recipe ends those effects first.
- `set`: the counters it brings to their maximum (`max`) or to a value; a name ending in `*` stands for every field that begins so.
- `rules`: the titles of the rules for what it leaves to the master. The output names them, and lists the page's other counters away from their usual value, each with the rule of a threshold that applies.

### conditions

```yaml
conditions: [Blinded, Charmed, Poisoned, Prone]
```

An effect with one of these names shows the text of the rule so titled, a house rule first, with the table's precedents on it; a roll notes the conditions of who rolls.

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
- `counters`: the `min` and `max` of a counter, each a number or a formula. A limit counts only when it is a whole number. `min` replaces 0 as the lowest value (`momentum: {min: -6, max: 10 - count(debilities)}`).

When the system loads, every formula must read, name only tables it has, and computed fields must not read each other in a circle; a field given twice in different cases is refused. The error names the place: `computed.insight: "wis-mod +" is not a formula: …`.

## 4. The formula language

| Form | Gives | Example |
|---|---|---|
| numbers, fields, `+ - * /`, `( )`, `-x` | arithmetic; `/` gives fractions | `floor((str - 10) / 2)` |
| `floor(x)`, `ceil(x)` | rounded down, up: one value | `ceil(level / 2)` |
| `min(a, b, …)`, `max(a, b, …)` | at least two values | `max(1, con-mod)` |
| `table(name, key)` | the table's row for the key | `table(ranks, rank)` |
| `has(list, Name)` | 1 when the list holds Name, else 0 | `has(skill-proficiencies, Sleight of Hand)` |
| `count(list)` | how many items | `10 - count(debilities)` |
| `item(list, Name)` | the number after Name, else 0 | `item(classes, Sorcerer)` |
| `sum(list)` | the total of the numbers after the items | `sum(classes)` |
| `sum(list, field = value)` | the same, only for items whose page has that value in that field | `sum(classes, hit-die = d10)` |

- **Names.** A field, table or list name starts with a letter and holds letters and digits, with single hyphens between them: `str-mod`, `hit-dice-d10`. A hyphen between two parts is part of the name, so `level-1` is a field called `level-1`: write `level - 1`. Names and functions ignore case. Only ASCII letters, digits and hyphens: a field with an accent or an underscore cannot be read by a formula.
- **Values.** A field reads as a number when it is one, a counter (its current value: `7/12` reads 7) or signed text (`"+2"`). Anything else is no number.
- **Lists.** An item is a name with an optional number after it: `"[[Fighter]] 3"` is Fighter with 3, `Perception +3` is Perception with 3. A link reads as the page it names, or as its section: `[[Cleric#Channel Divinity]]` reads as Channel Divinity. A single value is a list of one. The name in `has` and `item` runs up to `)` and may hold spaces.
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

1. **Bases.** A character or creature derives from the creature its `creature` field links to, an item from the item in its `item` field, and so on up the chain. The farthest base is read first and a nearer one wins. Some fields are never inherited: `role`, `status`, `creature`, `item`, `inventory`, `knows`, `factions`, `contains`, `date`, `place`, `tags`, `aliases`, `effects`. Every other field is, those a system declares included. An empty value counts as missing.
2. **The page**, over its bases. A field written in another case is the same field.
3. **Effects**, in the page's `effects` field: the newest that gives a field wins; a `bonus` adds up the page's value and every effect's.
4. **Formulas**: each computed field with a value takes it, and each counter with a worked-out maximum takes that maximum.

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

The file name is the page's name and the target of `[[Name]]`: unique among all the system's pages, with a straight apostrophe. A file directly in `world/` is a free page, with no type. The 5e uses `creatures` for stat blocks and races, `items`, and `topics` for classes, subclasses, the background and the feat; its declared `category` field (`race`, `class`, `subclass`, `background`, `feat`, `beast`…) is the system's, not the core's.

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
