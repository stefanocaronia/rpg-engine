# Architecture of rpg-engine

rpg-engine lets a high-level AI run a tabletop RPG campaign: the AI invents, plays and rules; the engine remembers, rolls the dice and keeps the accounts. A campaign is a folder of markdown and YAML files; the engine is a set of commands over it, served as a command line (`rpg`) and as an MCP server (`rpg mcp`).

This is a map of the code for developers and AI agents. It describes what the code does today; [AGENTS.md](../AGENTS.md) holds the development rules and conventions.

Code comments cite two kinds of codes. Rule codes such as `INH-4`, `CON-1`, `FOR-7` or `DAT-2` name the numbered rules of a mechanic (families: `INH` inheritance, `CON` containers, `SYS` game systems, `FOR` formulas, `DAT` system data, `PRO` progression, `CAM` what a campaign adds to its system, `KEP` rolls kept for later, `EFF` effects, `ENV` environment, `EVT` events, `MON` money, `REV` reveal, `RUL` rules, `ASK` asking the player). Codes such as `D-137` name decisions. Both are kept in the maintainer's private documents; tests cite the same codes, so `grep -r "INH-5" src test` finds the code and the tests of a rule.

## 1. Where things are

| Path | What it holds |
|---|---|
| [src/core/](../src/core/) | Shared utilities: the command registry, the context, the file store, the log, YAML files, text comparison, formulas, problems |
| `src/<module>/` | One job each, behind a small API in its `index.ts` (table below) |
| [src/commands/](../src/commands/) | The commands, and the helpers that join modules for several commands (`game-*.ts`, `effect-layer.ts`, `worked-out.ts`, `sheet.ts`, `page-counters.ts`, `problems.ts`, `notes.ts`) |
| [src/cli.ts](../src/cli.ts), [src/command-line.ts](../src/command-line.ts) | The `rpg` binary and the command-line surface |
| [src/mcp-server.ts](../src/mcp-server.ts) | The MCP server, started by `rpg mcp` |
| [src/index.ts](../src/index.ts) | The package entry: only `getVersion` today |
| [systems/](../systems/) | Built-in game systems; today only [5e](../systems/5e/) (SRD 5.1) |
| [instructions/](../instructions/) | The game master's instructions, served to the AI |
| [test/](../test/) | Tests, test helpers, the Ironsworn-based test system and a performance bench |
| [playtests/](../playtests/) | Playtest scenarios (not code) |

There is no dashboard and no `extensions/` folder in the code today: the registry's comment anticipates a dashboard API, but only the CLI and the MCP server are generated from the commands.

| Module | Job | Entry |
|---|---|---|
| `pages` | The world: page files, frontmatter, markdown sections and secrets, links, inheritance, containers, environment, checks, writing pages | [pages/index.ts](../src/pages/index.ts) |
| `campaign` | Finding and creating a campaign; `campaign.yaml` settings; `state.yaml` | [campaign/index.ts](../src/campaign/index.ts) |
| `systems` | The installed game systems and what each `system.yaml` declares | [systems/index.ts](../src/systems/index.ts) |
| `dice` | Dice notation, digital or physical faces, proofs for hidden rolls | [dice/index.ts](../src/dice/index.ts) |
| `counters` | Counters such as `5/12`: read, change within limits, format | [counters/index.ts](../src/counters/index.ts) |
| `money` | Coins, amounts such as `34 gp 4 sp`, paying with change | [money/index.ts](../src/money/index.ts) |
| `effects` | Effect lines: name, keeper, temporary values, end | [effects/index.ts](../src/effects/index.ts) |
| `scene` | The open scene: participants, numbered copies of creatures, turn order | [scene/index.ts](../src/scene/index.ts) |
| `time` | Game dates (`day 3, 06:00`) and durations (`1d 6h`) | [time/index.ts](../src/time/index.ts) |
| `rules` | Rules as text: sections of markdown files, word search, what an answer shows | [rules/index.ts](../src/rules/index.ts) |
| `triggers` | Event conditions such as `party in [[Ossario]]`, judged through `TriggerFacts` | [triggers/index.ts](../src/triggers/index.ts) |
| `instructions` | Reads the files in `instructions/` from the installed package | [instructions/index.ts](../src/instructions/index.ts) |
| `progression` | Tables whose first column counts levels: the row at a level, the features up to it, those a part lists with their level | [progression/index.ts](../src/progression/index.ts) |

None of the modules names a game's concepts: hit points, ability modifiers or conditions exist only as data in a system's `system.yaml` and pages.

## 2. The rule of dependencies

A module (a folder of `src/` other than `core` and `commands`) imports only its own files, `src/core/`, Node and npm packages. It never imports another module, a command, the CLI or the MCP server. Commands are the glue: they read the campaign through `campaign` and `pages`, call the modules and write the results.

So `core` holds what several modules share: [core/formula.ts](../src/core/formula.ts) (read by `systems` when a system loads, worked out by commands), [core/field-kind.ts](../src/core/field-kind.ts) (declared by `systems`, read by `pages`), [core/text.ts](../src/core/text.ts) (how names compare), [core/problem.ts](../src/core/problem.ts).

[test/architecture.test.ts](../test/architecture.test.ts) enforces two rules:

1. Every `from "..."`, `import "..."` and `import("...")` in a module is relative to the module (`./`), to `../core/`, or a package name.
2. Only an allow-list of files imports `node:fs` or `node:fs/promises`: the store ([core/store.ts](../src/core/store.ts), [core/session-store.ts](../src/core/session-store.ts), [core/files.ts](../src/core/files.ts)) and what reads the package or looks for campaigns below a folder ([core/version.ts](../src/core/version.ts), [instructions/index.ts](../src/instructions/index.ts), [systems/game-system.ts](../src/systems/game-system.ts), [campaign/create-campaign.ts](../src/campaign/create-campaign.ts)). Everything else reads and writes through `files()`, so that the MCP server can keep the files between calls. A new file that touches `node:fs` fails this test.

## 3. The life of a command

### Defined once

A command is a `Command` object made with `defineCommand` in [core/registry.ts](../src/core/registry.ts):

| Field | Meaning |
|---|---|
| `name` | The CLI subcommand and the MCP tool name |
| `description` | Written for an AI; its first sentence is the line in `rpg --help` |
| `group` | `campaign` (setup) or `game` (play), for the help |
| `input` | A zod object; each field's `.describe()` is its help and its MCP parameter description |
| `readOnly` | Changes nothing: MCP `readOnlyHint` |
| `alwaysLoad` | Hosts load the tool at once (`anthropic/alwaysLoad`): `instructions`, `status` |
| `positionals` | Fields the CLI takes without `--name`, in order |
| `needsPlayer` | Asks the player directly: absent from the CLI, enabled on MCP only when the host shows forms |
| `run(input, context)` | Does the work, returns a result object |
| `format(result)` | Renders the result as plain text for the AI |

`defineCommand` wraps `run` so that it runs inside a file store (`withFiles`): the session's store when the context has one, else a new `FileStore` for that call. The commands are listed in [commands/index.ts](../src/commands/index.ts): `init`, `config`, `instructions`, `status`, `validate`, `write`, `move`, `reveal`, `show`, `find`, `rules`, `roll`, `ask`, `change`, `effect`, `advance`, `scene`.

### The context

[core/context.ts](../src/core/context.ts) holds everything that comes from outside: `folder` (where to look for the campaign, upwards), `random(sides)`, `now()`, `newId()` (log ids), `newSalt()` (hidden rolls), `actor` (always `master` today; `ask` stamps the player's roll and answer as `player`), `platform`, `systemFolders` (where game systems are installed, nearest first), `player` (asks the player with buttons, MCP only) and `files` (the session store, MCP only). `defaultContext()` builds the real one; tests use `testContext()` from [test/support.ts](../test/support.ts). No command checks a role beyond stamping `actor` on its log lines.

### From the two surfaces

- **CLI** ([command-line.ts](../src/command-line.ts)): `runCommandLine(argv, context)` finds the command, builds `parseArgs` options from the zod shape (booleans as flags, arrays as repeatable options, a list positional takes the rest), validates with `command.input.safeParse`, runs, and prints `format(result)`, or the result as JSON with `--json`. Errors become exit code 1 with the message. [cli.ts](../src/cli.ts) starts the MCP server instead when the only argument is `mcp`.
- **MCP** ([mcp-server.ts](../src/mcp-server.ts)): `createMcpServer` registers every command as a tool with the same name, description and `input.strict()` schema; the SDK validates the input. A call returns `format(result)` as text, or the error message with `isError`. The server's own instructions are [instructions/start.md](../instructions/start.md). When the host declares forms (MCP elicitation) and is not one known to hide them, `context.player` becomes a form player and the `needsPlayer` tools are enabled; a form closed faster than a person could read it disables them again (`ASK-6`).

### Reading and writing: the store

[core/store.ts](../src/core/store.ts) is how every command touches the disk. `files()` returns the store of the running command (an `AsyncLocalStorage`); a command run inside another keeps the outer store.

- `text`, `exists`, `files(folder, keep)` read a file or a listing once per store.
- `read(path, kind, parse)` keeps what a file reads as, by kind (`page <root>`, `yaml ...`, `log`, `rules ...`), deep-frozen with [core/frozen.ts](../src/core/frozen.ts): nothing read from files may be changed in place; copy it first.
- `remember(key, dependsOn, build)` keeps a value built from many files until one it depends on changes. [commands/game-world.ts](../src/commands/game-world.ts) `campaignWorld` uses it for the `World`.
- A store made with the systems' folders, as every call's is, keeps their files for the whole process while none changed since it was read, or in the two seconds before, as git does: many calls in one process, as in the tests, read a system's pages once, and the first reading costs nothing more.
- `fresh(path)` is read right before a write (the call's text in a plain store, the disk's in a session); `write`, `append`, `remove` update what is kept, the listings and the remembered values.

Many derived values are cached in `WeakMap`s keyed by the frozen `World` or `Page` (name, path and holder indexes in [pages/world.ts](../src/pages/world.ts), `checkWorld`, `effectiveFields`, `workedOutProblems`): a world never changes, a write produces a new one with `withPage`.

### The MCP session

`startMcpServer` gives the context a `SessionStore` ([core/session-store.ts](../src/core/session-store.ts)), which keeps files between calls:

- `requireCampaign` calls `files().track(root)`: from then on the campaign folder and every folder under its `world/` and `rules/` are watched with a non-recursive `fs.watch` each.
- Before each tool call, `ready()` reads again the files the watchers named and forgets what was kept outside watched campaigns and system folders. At `instructions`, after a watcher fails or cannot start, or after more than 10,000 changes, it first compares every kept file with the disk.
- `fresh()` throws when a file was changed by hand without the watchers noticing, before anything is written over it, and the next call checks everything (D-196).
- Game systems are read once per session; the server does not see changes to them until it restarts.
- 250 ms after the host initializes, the server preloads the world of the campaign in its folder.

### Logging and output

A command that changes the game appends one or more lines to `log.jsonl` with `appendLogEntry(root, newDatedLogEntry(root, context, type, visibility, data))` ([core/log.ts](../src/core/log.ts), [commands/game-time.ts](../src/commands/game-time.ts)). Each `LogEntry` has `id`, `at` (real time), `date` (game date, when there is one), `type`, `by`, `visibility` (`public` for what the player may see, `hidden` for the master) and `data`. Types in use: `campaign-created`, `config-changed`, `page-created`, `page-updated`, `moved`, `learned`, `counter-changed`, `effect-added`, `effect-ended`, `event-due`, `roll`, `roll-revealed`, `asked`, `time-advanced`, `scene-opened`, `scene-changed`, `scene-closed`. `write`'s page lines are hidden; lines about moves, counters and effects are public when they concern the player, as `concernsPlayer` / `playerConcerns` in [pages/world.ts](../src/pages/world.ts) say: the party, what it carries, open quests.

Error messages and outputs are read by an AI: they say what went wrong and what to call next, and writes that are refused say "Nothing changed". Commands check what they can before the first write.

## 4. The data on disk

### A campaign folder

```
campaign.yaml      settings: name, language, system, difficulty, lethality, lines, veils, table, precedents, coins (other keys are kept)
state.yaml         the present: date ("day 1, 18:00") and the open scene under scene
log.jsonl          one JSON line per change
.mcp.json          registers `rpg mcp` for AI hosts (through cmd /c on Windows)
sessions/          created by init
world/             characters/ places/ factions/ quests/ items/ events/ topics/ creatures/
rules/             house rules, one markdown file each (optional)
```

`init` ([commands/init.ts](../src/commands/init.ts), [campaign/create-campaign.ts](../src/campaign/create-campaign.ts)) creates all but `rules/`. A campaign is the nearest folder upwards with a `campaign.yaml` (`findCampaign`); one cannot hold another. Settings are validated by `settingsSchema` in [campaign/settings.ts](../src/campaign/settings.ts); YAML files are rewritten keeping their comments ([core/yaml-file.ts](../src/core/yaml-file.ts)).

### Pages

Each file under `world/` is a `Page` ([pages/world.ts](../src/pages/world.ts)): `name` (the file name without `.md`, unique in the campaign, compared ignoring case and accent encoding), `type` (from the first folder under `world/`, subfolders allowed; undefined for a free page), `path`, `fields` (the YAML frontmatter) and `body` (the markdown). The format follows Obsidian:

- Links are `[[Page]]`, `[[Page#Section]]`, `[[Page|label]]` or `[[folder/Page.md]]`; in YAML they are quoted, `creature: "[[Wolf]]"`. Links inside code fences do not count ([pages/markdown.ts](../src/pages/markdown.ts)).
- The text before the first heading is the introduction; headings make sections; `> [!secret] Name` followed by quoted lines is a secret block.
- Standard fields have fixed meanings per type ([pages/standard-fields.ts](../src/pages/standard-fields.ts)): `role` (pc, companion, npc), `status`, `creature`, `item`, `inventory`, `equipped`, `contains`, `knows`, `factions`, `environment`, an event's `date`, `place`, `clock`, `when`, `by`, and `tags`, `aliases` everywhere. Any other field is free, or declared by the game system.
- A field written empty counts as missing; a free field's name is the same in any case, the last written winning.

[pages/page-file.ts](../src/pages/page-file.ts) splits and joins the frontmatter and body and applies a `FieldChange` (`set`, `unset`, `add`, `remove`) to the YAML document, keeping comments.

Few places write files, all through the store: `writePage` in [pages/write-page.ts](../src/pages/write-page.ts) (a page's fields and text, creating or retyping it), `applyMove` in [pages/containers.ts](../src/pages/containers.ts) (containers' lists during a move), `writeYamlFile` in [core/yaml-file.ts](../src/core/yaml-file.ts) (`campaign.yaml`, `state.yaml`), `appendLogEntry` in [core/log.ts](../src/core/log.ts), and `createCampaign`.

### A game system package

```
systems/<name>/system.yaml   title, language, attribution, fields, coins, round, sheet, sheet-notes, values, marks,
                             status-line, thresholds, recipes, conditions, tables, computed, counters, progression
systems/<name>/world/        pages, as in a campaign (creatures/, items/, topics/ in 5e)
systems/<name>/rules/        chapters of rules text, one markdown file each
systems/<name>/LICENSE.md    the license and attribution
systems/<name>/test/         the system's own tests (not published to npm)
systems/<name>/build/        scripts that wrote some of its pages from its source, such as 5e's spells (not published)
```

[systems/game-system.ts](../src/systems/game-system.ts) finds systems in `context.systemFolders` (a folder with a `system.yaml`), validates the file with zod and returns a frozen `GameSystem`; formulas that do not read make the whole system unreadable (`FOR-9`). `campaign.yaml`'s `system` names the one a campaign uses; `campaignWorld` loads its pages beside the campaign's, each marked with `page.system`.

## 5. Key mechanisms

Each mechanism lists the files that implement it and the rule codes their comments cite.

### Pages and the world

Files: [pages/world.ts](../src/pages/world.ts), [pages/system-pages.ts](../src/pages/system-pages.ts), [commands/game-world.ts](../src/commands/game-world.ts). Codes: `SYS-1`–`SYS-8`.

- `campaignWorld` loads every page of the campaign and of its system into a frozen `World`: `pages`, `problems` (files that do not read), `system`, `language`. A file that does not read is a problem, not a failure: the other pages work.
- `findPage` looks in the campaign first, then in the system (`SYS-3`), and stops the command when two campaign pages share a name; `pageNamed` also accepts `aliases`.
- System pages are read-only and in no container, and a campaign page may not take the name of one (`SYS-2`, `SYS-4`, `SYS-6`). [pages/system-pages.ts](../src/pages/system-pages.ts) holds the messages that say so and what to write instead: a campaign page that derives from the system's (`SYS-7`).

### Inheritance and bases

File: [pages/inheritance.ts](../src/pages/inheritance.ts). Codes: `INH-1`–`INH-16`.

- A character or creature derives from the creature its `creature` field links to; an item from the item in its `item` field (`INH-1`, `INH-2`). `baseChain` follows the chain, nearest first; `baseProblem` and `newBaseProblem` refuse wrong types and loops (`INH-3`, `INH-15`).
- `inheritedFields` layers the bases under the page, nearer winning (`INH-4`–`INH-8`), except a closed list of fields never inherited (`role`, `status`, `inventory`, `equipped`, `knows`, `contains`, `effects` and the other relations).
- Sections, secrets and the introduction a page lacks are shown from its nearest base (`INH-13`, `inheritedByBase`).
- A write keeps the field name the page reads (`INH-5`), makes an inherited list the page's own before adding to it (`INH-7`), and drops values equal to the base's, so that a page holds only its differences (`INH-9`). `followersOf` and `keepersOf` say which derived pages a change reaches and which keep their own value (`INH-10`).
- A copy in a scene is a page that derives from its creature (`INH-14`, `copyPage` in [commands/game-scene.ts](../src/commands/game-scene.ts)).

### Containers and where a thing is

Files: [pages/containers.ts](../src/pages/containers.ts), [commands/game-moves.ts](../src/commands/game-moves.ts), [commands/move.ts](../src/commands/move.ts). Codes: `CON-1`–`CON-10`.

- A page never records where it is: its container lists it, in `contains` (places, items) or `inventory` (characters) (`CON-1`). A place holds places, characters and items; a character carries items; an item holds items and characters (`canHold`). What a character wears and wields is in its `equipped`, among what it carries; `move` takes an item out of it when it goes elsewhere, and `validate` reports one it does not carry (`CON-12`).
- `locate` climbs the holders to give the chain (`CON-1`, `CON-3`); `checkWorld` reports a page listed by two containers or inside itself (`CON-10`).
- `planMove` checks everything first; `applyMove` removes every entry pointing to the page, however it is written, and writes the destination last, so that a move stopped halfway finishes when repeated (`CON-4`, `CON-7`).
- `movePages` then logs public and hidden lines, fires events and notes the quests and events linked to what moved (`CON-5`, `CON-9`); the open scene follows the party (`CON-6`).

### Links and backlinks

Files: [pages/markdown.ts](../src/pages/markdown.ts), [pages/world.ts](../src/pages/world.ts), [pages/check.ts](../src/pages/check.ts).

`linksIn` reads links from any field value; `links` reads them from text, remembered per text with [core/memo.ts](../src/core/memo.ts). `backlinks` lists the pages that link to one, by field or text, which `show` prints. `checkWorld` reports links to pages, sections or secrets that do not exist.

### Secrets and what characters know

File: [commands/reveal.ts](../src/commands/reveal.ts). Codes: `REV-1`–`REV-3`.

Only characters know things, in their `knows` list of links to pages and to secrets such as `[[Coppa#Veleno]]` (`REV-1`). `reveal` adds the links, refuses what does not exist and skips public sections (`REV-2`); it logs one line per learner, public only for what the player's character knows (`REV-3`). `show` gives the master everything, secrets included: what reaches the player is the AI's call.

### Counters and money

Files: [counters/counter.ts](../src/counters/counter.ts), [money/money.ts](../src/money/money.ts), [commands/change.ts](../src/commands/change.ts), [commands/game-money.ts](../src/commands/game-money.ts), [commands/game-recipes.ts](../src/commands/game-recipes.ts), [commands/game-thresholds.ts](../src/commands/game-thresholds.ts). Codes: `MON-1`–`MON-8`, `DAT-1`, `DAT-3`–`DAT-5`.

- A counter is a whole number or `current/max`. `changeCounter` applies `by` (stops at a limit and says how far beyond), `spend` (refused when there is not enough) or `to`.
- Money is a field written in the campaign's coins, such as `money: 34 gp 4 sp`. The coins come from `campaign.yaml`, else from the system (`MON-1`, `DAT-1`); `payCoins` pays with change, never in rare coins (`MON-5`).
- `write` refuses to overwrite a counter or money (`MON-6`); `change` changes them and logs `counter-changed`. It also applies a system's recipes, such as `long rest` (`DAT-4`, `DAT-5`), and adds the rule notes of the thresholds a party counter touches (`DAT-3`).

### Effects and their layer

Files: [effects/effect.ts](../src/effects/effect.ts), [commands/effect-layer.ts](../src/commands/effect-layer.ts), [commands/effect.ts](../src/commands/effect.ts), [commands/game-effects.ts](../src/commands/game-effects.ts). Codes: `EFF-1`–`EFF-13`.

- An effect is one line of a page's `effects` field, such as `Name (by: [[Lena]], ac: 15) until day 2, 14:20` (`EFF-1`). It ends at a game date, at someone's turn in a round, with the scene, or at a system occasion such as `long rest` (`EFF-2`, `DAT-5`).
- `effectiveFields` is what commands read as a page's fields: inherited fields, then effects over them (the newest wins, a `bonus` field adds up), then what the system works out (`EFF-3`, `FOR-5`, `FOR-3`). It is cached per world and page.
- `write` refuses the `effects` field: effects are added and ended with `effect` (`EFF-6`); `change` on a value an effect gives changes the effect (`EFF-7`). `advance` and `scene` end effects on time, turn or scene end (`EFF-8`, `EFF-9`), with log lines public when they concern the player (`EFF-11`).

### Formulas and what the system works out

Files: [core/formula.ts](../src/core/formula.ts), [commands/worked-out.ts](../src/commands/worked-out.ts). Codes: `FOR-1`–`FOR-9`.

- A system's `computed` fields, `tables` and `counters` limits are formulas (`FOR-1`, `FOR-2`): numbers, fields, `+ - * /`, `floor`, `ceil`, `min`, `max`, `table(name, key)`, and on list fields `has`, `count`, `item`, `sum`; `sum(classes, hit-die = d10)` reads the pages the list names. A field may give several formulas: the first with a value counts (D-210). `readFormulas` refuses unknown tables and circles when the system loads (`FOR-9`).
- `workOut` gives no value when something is missing, and then the page's own value is read (`FOR-4`).
- [commands/worked-out.ts](../src/commands/worked-out.ts) is where formulas meet pages: `withWorkedOut` puts computed values and counter maxima over the fields (`FOR-6`); `computedField` and `computedMessage` let `write` and `change` refuse a computed field and name the written fields it comes from (`FOR-7`); `workedLine` explains a value by what changed it (`FOR-8`); `workedOutProblems` feeds `validate`.

### The character sheet

Files: [commands/sheet.ts](../src/commands/sheet.ts), [commands/page-counters.ts](../src/commands/page-counters.ts). Codes: `DAT-2`, `SYS-8`.

A system's `sheet` groups, `sheet-notes`, `values` and `status-line` drive the sheet of the player character and of companions that keep one (`hasSheet` in [commands/worked-out.ts](../src/commands/worked-out.ts), which also decides who has the system's uses full, `DAT-9`). `show` prints it by group (`sheetLines`), and one group with how each number is made (`show Page#Group`). `status` summarizes the sheet before there is a player character and reminds what a character still lacks (`missingSheetFields`). `write` gives the sheet's notes when a character joins the party (`joiningNotes`) and refuses list items the system does not take (`checkListValues`). The line of counters shown for the party is `partyCounters`.

### Classes, uses and what a campaign adds

Files: [progression/](../src/progression/), [core/progression-rule.ts](../src/core/progression-rule.ts), [commands/progression.ts](../src/commands/progression.ts), [commands/game-recipes.ts](../src/commands/game-recipes.ts), [systems/game-system.ts](../src/systems/game-system.ts), [commands/config.ts](../src/commands/config.ts). Codes: `PRO-1`–`PRO-4`, `DAT-9`, `CAM-1`–`CAM-3`, `KEP-1`–`KEP-4`.

- The `progression` module reads a page's table of levels and knows no game; `progressionOf` joins it to a character's lists as the system's `progression` says: the row's fields, the features each with the pages that tell it, and every feature as a row or part gives it (`gains`), from which `write` tells what a new level adds. The formulas the items' pages give (`item-formulas`, `PRO-5`), for the classes and for what a character has `equipped` (`CON-12`), are worked out in `worked-out.ts` (`eachItem`, `itemLines`), one value for each item, reading the item's own fields first.
- Uses are counters with a `refill` or named by a recipe (`isUse`); `withWorkedOut` reads them full on who keeps the sheet, `write` writes them and takes off those that only the lists give when their maximum falls to 0. `change` with a recipe brings them back by occasion (`refillAmount`, `recipeTargets`) and leaves a choice to the player, or to the master for a companion.
- What `campaign.yaml` adds is merged over `system.yaml` before it is validated (`findCampaignSystem`): the system with the additions, or the system alone and why. The reader refuses unknown keys, a refill no recipe ends and a recipe that sets kept rolls, each at its place on one line.
- `roll` with `keep` writes the dice in a field of kind `rolls`, with `use` takes one in place of the die; the page is written before the log line.

### Rolls and asking the player

Files: [dice/](../src/dice/), [commands/roll.ts](../src/commands/roll.ts), [commands/ask.ts](../src/commands/ask.ts). Codes: `DAT-8`, `ASK-1`–`ASK-7`.

- The `dice` module parses notation (`1d20+5`, `2d20kh1`, `4d6dl1`, `2d6ro<=2`, `1d6!`, `6d10>=8`, `4dF`, `d%`) and rolls with `context.random` or with the faces of physical dice.
- `roll` replaces the names in a notation by the sheet values of who rolls (`DAT-8`) and logs the roll. A hidden roll stores a proof (`id|text|salt`) whose SHA-256 starts with the fingerprint given to the player; `roll --reveal <id>` shows it.
- `ask` puts a question with buttons to the player through the host's form; for a check it rolls and logs the roll as the player's.

### Scenes and turns

Files: [scene/scene.ts](../src/scene/scene.ts), [commands/scene.ts](../src/commands/scene.ts), [commands/game-scene.ts](../src/commands/game-scene.ts).

The open scene lives in `state.yaml` under `scene`: title, type, place, who is in it, numbered copies of creatures holding only what changed (`Annegato 1`), and when there are turns, `order`, `round` and `turn`. The `scene` command opens, adds, leaves, orders, passes the turn and closes; closing removes the scene from `state.yaml` and logs a `scene-closed` line, from which `status` lists the last scenes.

### Game time

Files: [time/game-date.ts](../src/time/game-date.ts), [commands/advance.ts](../src/commands/advance.ts), [commands/game-time.ts](../src/commands/game-time.ts). Codes: `DAT-7`, `EVT-1`, `EVT-8`.

The present is `state.yaml`'s `date`, a `GameDate` of day and minute. `advance` moves it forward by a duration or to a date, never back; it stops at the first planned event that comes due, ends the effects whose time has come, and on a new day lists the event clocks to move. A system's `round` length turns short durations into rounds in a scene with turns (`DAT-7`).

### Planned events and triggers

Files: [triggers/trigger.ts](../src/triggers/trigger.ts), [commands/game-events.ts](../src/commands/game-events.ts). Codes: `EVT-1`–`EVT-10`.

- An event page has `date`, `place`, `status` (planned, happened, cancelled), `clock`, `when` and `by`. It is due when its date has come; without a readable date, when its clock is full or a `when` condition holds (`EVT-1`–`EVT-3`).
- The `triggers` module reads conditions (`party in [[X]]`, `[[A]] in [[B]]`, `[[Item]] in party`, `[[Page]] dead`) and judges them through `TriggerFacts`, which `worldFacts` answers from the world: the module never sees a page.
- After `write`, `move`, `scene` (when it brings the party to its place) or `change` (on an event's clock), `fireEvents` compares the world before and after and logs the events set off (`EVT-4`, `EVT-5`).

### Environment

Files: [pages/environment.ts](../src/pages/environment.ts), [commands/game-environment.ts](../src/commands/game-environment.ts). Codes: `ENV-1`–`ENV-6`.

A place's `environment` lines (`light: dark`) hold for everything inside it, from the nearest place of its chain; effects on a place hold the same way (`ENV-1`–`ENV-3`). `write` changes one line at a time (`ENV-4`); `move` says what changes around whoever moves (`ENV-5`).

### Rules lookup

Files: [rules/](../src/rules/), [commands/rules.ts](../src/commands/rules.ts), [commands/game-rules.ts](../src/commands/game-rules.ts). Codes: `RUL-1`, `RUL-3`–`RUL-6`, `DAT-6`.

- The `rules` module cuts markdown files into sections: headings, bold paragraph titles, table captions (`RUL-1`). It finds them by title path (`Combat › Grappling`) or by words, rarer words and title words weighing more, accepting forms of a word (`RUL-3`–`RUL-5`), and chooses what an answer shows within about 800 words (`RUL-6`).
- The `rules` command searches the campaign's house rules, then the system's chapters, then the precedents in `campaign.yaml`. Thresholds and conditions find their rule by title with `ruleTitled`, a house rule first (`DAT-6`).

### Validate and problems

Files: [core/problem.ts](../src/core/problem.ts), [commands/problems.ts](../src/commands/problems.ts), [pages/check.ts](../src/pages/check.ts), [commands/validate.ts](../src/commands/validate.ts).

A `Problem` is `{ path?, message, fix? }`. `campaignProblems` gathers those of the settings, the system, the coins, the log, the world (`checkWorld`), worked-out values, list values, game time, events, effects and the open scene. `validate` lists them; `status` gives their count. Most problems do not stop other commands, as a page file that does not read leaves the rest of the world working; a command stops when what it needs cannot be read, such as the game date for `advance`.

### The instructions delivered to the AI

Files: [instructions/](../instructions/), [instructions/index.ts](../src/instructions/index.ts), [commands/instructions.ts](../src/commands/instructions.ts).

Three layers, in English. The MCP server's instructions, [start.md](../instructions/start.md), send the AI to `instructions` and then `status` at the start of every chat. The `instructions` command returns [core.md](../instructions/core.md), plus [buttons.md](../instructions/buttons.md) when the host shows forms. Each command's description and each output carry the guidance for that moment. The files are read from the installed package, wherever it is.

## 6. Tests

`npm test` runs vitest on `test/**/*.test.ts` and `systems/*/test/**/*.test.ts` ([vitest.config.ts](../vitest.config.ts)); `npx vitest run test/move.test.ts` runs one file. `npm run lint` checks ESLint, dprint and the types of the tests; CI runs lint, build and tests on Linux and Windows.

- **Commands** are tested through `runCommandLine(args, testContext(folder))` in a temporary campaign made with `init`, or by calling `command.run` directly. `mcp.test.ts` connects a client to `createMcpServer` in memory; `session-store.test.ts` drives the session store with a fake watcher.
- **Laws**: `*-laws.test.ts` (inheritance, containers, events, rules, systems) check rules with fast-check on worlds or texts generated at random, some against a model written another way; some build `World` objects in memory, others write campaigns to disk and run the commands. Case tables such as `inheritance-cases.test.ts` cover every combination of one rule. Test titles cite the rule codes.
- **Test systems**: tests see `systems/` (5e) and [test/systems/](../test/systems/) (`ironsworn`, a small system based on Ironsworn, with its own fields, a table, computed fields and counter limits), so that the core stays generic. [test/system-packages.test.ts](../test/system-packages.test.ts) runs the checks every installed system must pass; [systems/5e/test/package.test.ts](../systems/5e/test/package.test.ts) checks what 5e takes from the SRD and its attribution.
- **Helpers** in [test/support.ts](../test/support.ts): `testSystemFolders`, `testContext(folder)` (dice always 4, a fixed time, ids `id1`, `id2`..., salt `salt`, platform linux), `makeTempFolder`, `removeFolder`, `readLogFile`, `systemPageCount`, and texts that several outputs share.
- **Bench**: [test/bench/bench.ts](../test/bench/bench.ts) times the commands on generated campaigns (`node test/bench/bench.ts 100,1000`); it is not part of `npm test`.

## 7. How to add things

### A command

1. Create `src/commands/<name>.ts` with `defineCommand`: a description written for an AI (what it does first, when to use it, an example), a zod `input` with `.describe()` on every field, `readOnly` if it changes nothing, `positionals` for the CLI.
2. In `run`: `requireCampaign(context.folder)`, then `campaignWorld(root, context)`, and read fields with `effectiveFields`. Check everything, then write through the modules (`writePage`, `changeState`...), then log with `appendLogEntry(root, newDatedLogEntry(...))`. Take randomness, time and ids only from `context`.
3. Return a result object; `format` turns it into text that tells the AI what happened and what to do next.
4. Add it to `commands` in [commands/index.ts](../src/commands/index.ts): the CLI, its help and the MCP tool follow.
5. Test it through `runCommandLine` with `testContext`.

Logic that knows no game and no other module goes in a module, or in a new folder under `src/` with an `index.ts`; joining modules for several commands goes in a `src/commands/game-*.ts` helper.

### A field kind

Add it to `fieldKinds` in [core/field-kind.ts](../src/core/field-kind.ts); the validation of `system.yaml` picks it up. Then give it a meaning where kinds are read: `declaredKind` and `isDeclaredUncounted` in [pages/system-pages.ts](../src/pages/system-pages.ts), and their callers in `effect-layer.ts`, `worked-out.ts`, `effect.ts`, `change.ts`, `write.ts`, `page-counters.ts` and `game-recipes.ts`. Add its value check to the `fits` table in [test/system-packages.test.ts](../test/system-packages.test.ts).

### A datum of a game system

1. Add the key to `systemSchema`, a field to `GameSystem` and its reading to `readSystem` in [systems/game-system.ts](../src/systems/game-system.ts); formulas go through `readFormulas` in [core/formula.ts](../src/core/formula.ts).
2. Use it from a command helper, as `game-recipes.ts` and `game-thresholds.ts` do.
3. In [test/system-packages.test.ts](../test/system-packages.test.ts), check that every system's value can be used (fields declared, rules that exist); test the behaviour as [test/system-data.test.ts](../test/system-data.test.ts) does.

### A page of a system

Add `systems/<name>/world/<type folder>/<Name>.md`, named in the system's language. [test/system-packages.test.ts](../test/system-packages.test.ts) checks that:

- its name is unique among all the system's pages, with straight apostrophes;
- every frontmatter field that is not standard is declared in `fields`, with a value of its kind and no final period, and signed numbers such as `"+2"` are quoted;
- `creature` or `item` links only to another page of the same system.

Rules text goes in `systems/<name>/rules/`, in chapters that open with a heading; the same test checks that the rules named by thresholds, recipes and conditions are there. Only open-licensed content, with its attribution (see [AGENTS.md](../AGENTS.md)). Tests that count a system's pages use `systemPageCount`, so they follow.
