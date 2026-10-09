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
| [src/dashboard-server.ts](../src/dashboard-server.ts) | The server of the player's dashboard, which the MCP server starts |
| [src/dashboard/](../src/dashboard/) | The dashboard's page: TSX with Preact, built by its own `tsconfig.json` into `dist/dashboard/`, with its style sheet, pictures and dice (`assets/`); `dice/make-dice.py`, the Blender script that makes the dice, stays out of the build |
| [src/index.ts](../src/index.ts) | The package entry: only `getVersion` today |
| [systems/](../systems/) | Built-in game systems; today only [5e](../systems/5e/) (SRD 5.1) |
| [instructions/](../instructions/) | The game master's instructions, served to the AI |
| [test/](../test/) | Tests, test helpers, the Ironsworn-based test system and a performance bench |
| [playtests/](../playtests/) | Playtest scenarios (not code) |

There is no `extensions/` folder in the code today.

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
| `images` | Pictures of pages: the formats a picture can have (PNG, JPEG, WebP, SVG, known by their bytes), the largest one, finding a linked file in the `images/` folders | [images/index.ts](../src/images/index.ts) |
| `map` | The world map: roads as stretches between stops, the quickest way across them; points, the 16 directions of the compass, distances, crossings | [map/index.ts](../src/map/index.ts) |

None of the modules names a game's concepts: hit points, ability modifiers or conditions exist only as data in a system's `system.yaml` and pages.

## 2. The rule of dependencies

A module (a folder of `src/` other than `core` and `commands`) imports only its own files, `src/core/`, Node and npm packages. It never imports another module, a command, the CLI or the MCP server. Commands are the glue: they read the campaign through `campaign` and `pages`, call the modules and write the results.

So `core` holds what several modules share: [core/formula.ts](../src/core/formula.ts) (read by `systems` when a system loads, worked out by commands), [core/field-kind.ts](../src/core/field-kind.ts) (declared by `systems`, read by `pages`), [core/length.ts](../src/core/length.ts) (lengths and speeds in metric, told in the story's units: read by `pages`, `systems` and commands), [core/text.ts](../src/core/text.ts) (how names compare), [core/problem.ts](../src/core/problem.ts).

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

`defineCommand` wraps `run` so that it runs inside a file store (`withFiles`): the session's store when the context has one, else a new `FileStore` for that call. The commands are listed in [commands/index.ts](../src/commands/index.ts): `init`, `config`, `instructions`, `status`, `mode`, `validate`, `write`, `move`, `reveal`, `show`, `view`, `find`, `rules`, `roll`, `ask`, `change`, `effect`, `advance`, `travel`, `route`, `scene`, `save`.

### The context

[core/context.ts](../src/core/context.ts) holds everything that comes from outside: `folder` (where to look for the campaign, upwards), `random(sides)`, `now()`, `newId()` (log ids), `newSalt()` (hidden rolls), `actor` (always `master` today; `ask` stamps the player's roll and answer as `player`), `platform`, `systemFolders` (where game systems are installed, nearest first), `player` (asks the player with buttons in the host's form, MCP only), `page` (asks them on the dashboard's page while one is open, MCP only, D-279), `signal` (the call's cancel, when the user stops it, MCP only), `files` (the session store, MCP only), `told` (the parts of the instructions already given in the chat, MCP only) and `dashboard` (the link of the player's dashboard, MCP only, which `status` gives). `defaultContext()` builds the real one; tests use `testContext()` from [test/support.ts](../test/support.ts). No command checks a role beyond stamping `actor` on its log lines.

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

- `requireCampaign` calls `files().track(root)`: from then on the campaign folder and every folder under its `world/`, `rules/` and `images/` are watched with a non-recursive `fs.watch` each.
- Before each tool call, `ready()` reads again the files the watchers named and forgets what was kept outside watched campaigns and system folders. At `instructions`, after a watcher fails or cannot start, or after more than 10,000 changes, it first compares every kept file with the disk.
- `fresh()` throws when a file was changed by hand without the watchers noticing, before anything is written over it, and the next call checks everything (D-196).
- Game systems are read once per session; the server does not see changes to them until it restarts.
- 250 ms after the host initializes, the server preloads the world of the campaign in its folder, and brings its host files up to date (`refreshHostFiles`): the start lines in `AGENTS.md`, `CLAUDE.md`, Claude Code's settings.
- `onChange(listener)` calls back whenever a watcher names a change or loses track of a folder, for the dashboard's notices.

### Logging and output

A command that changes the game appends one or more lines to `log.jsonl` with `appendLogEntry(root, newDatedLogEntry(root, context, type, visibility, data))` ([core/log.ts](../src/core/log.ts), [commands/game-time.ts](../src/commands/game-time.ts)). Each `LogEntry` has `id`, `at` (real time), `date` (game date, when there is one), `type`, `by`, `visibility` (`public` for what the player may see, `hidden` for the master) and `data`. Types in use: `campaign-created`, `config-changed`, `page-created`, `page-updated`, `moved`, `learned`, `counter-changed`, `effect-added`, `effect-ended`, `event-due`, `roll`, `roll-revealed`, `asked`, `time-advanced`, `scene-opened`, `scene-changed`, `scene-closed`. `write`'s page lines are hidden; lines about moves, counters and effects are public when they concern the player, as `concernsPlayer` in [pages/world.ts](../src/pages/world.ts) says: the party, what is inside it climbing the containers, open quests (`CNT-10`).

Error messages and outputs are read by an AI: they say what went wrong and what to call next, and writes that are refused say "Nothing changed". Commands check what they can before the first write.

## 4. The data on disk

### A campaign folder

```
campaign.yaml      settings: name, language, system, difficulty, lethality, saves, units, lines, veils, table, precedents, coins, what it adds to its system (other keys are kept)
state.yaml         the present: mode (setup, session zero, play), date ("day 1, 18:00"), the open scene under scene, the journey under way under journey
log.jsonl          one JSON line per change
.mcp.json          registers `rpg mcp` for AI hosts (through cmd /c on Windows)
AGENTS.md          opens with the start lines between rpg's marks, kept up to date; the player's own text may follow
CLAUDE.md          imports AGENTS.md (@AGENTS.md)
.claude/           settings.json: Claude Code's auto memory off (D-242)
sessions/          created by init
world/             characters/ places/ factions/ quests/ items/ events/ topics/ creatures/
rules/             house rules, one markdown file each (optional)
images/            the pictures of its pages, which `image` copies there (optional)
.saves/            the saves, one zip each, made at the end of each scene (SAV-2–SAV-4)
```

`init` ([commands/init.ts](../src/commands/init.ts), [campaign/create-campaign.ts](../src/campaign/create-campaign.ts)) creates all but `rules/`; the host files come from [campaign/host-files.ts](../src/campaign/host-files.ts), which keeps what a folder already had: its own text after the start lines, other settings, a memory choice already written. A campaign is the nearest folder upwards with a `campaign.yaml` (`findCampaign`); one cannot hold another. Settings are validated by `settingsSchema` in [campaign/settings.ts](../src/campaign/settings.ts); YAML files are rewritten keeping their comments ([core/yaml-file.ts](../src/core/yaml-file.ts)).

### Pages

Each file under `world/` is a `Page` ([pages/world.ts](../src/pages/world.ts)): `name` (the file name without `.md`, unique in the campaign, compared ignoring case and accent encoding), `type` (from the first folder under `world/`, subfolders allowed; undefined for a free page), `path`, `fields` (the YAML frontmatter) and `body` (the markdown). The format follows Obsidian:

- Links are `[[Page]]`, `[[Page#Section]]`, `[[Page|label]]` or `[[folder/Page.md]]`; in YAML they are quoted, `creature: "[[Wolf]]"`. Links inside code fences do not count ([pages/markdown.ts](../src/pages/markdown.ts)).
- The text before the first heading is the introduction; headings make sections; `> [!secret] Name` followed by quoted lines is a secret block.
- Standard fields have fixed meanings per type ([pages/standard-fields.ts](../src/pages/standard-fields.ts)): `role` (pc, companion, npc), `status`, `creature`, `item`, `inventory`, `equipped`, `contains`, `knows`, `factions`, `environment`, a place's `stops`, `position` and `radius`, an event's `date`, `place`, `clock`, `when`, `by`, and `tags`, `aliases`, `image` everywhere. Any other field is free, or declared by the game system.
- A field written empty counts as missing; a free field's name is the same in any case, the last written winning.

[pages/page-file.ts](../src/pages/page-file.ts) splits and joins the frontmatter and body and applies a `FieldChange` (`set`, `unset`, `add`, `remove`) to the YAML document, keeping comments.

Few places write files, all through the store: `writePage` in [pages/write-page.ts](../src/pages/write-page.ts) (a page's fields and text, creating or retyping it), `applyMove` in [pages/containers.ts](../src/pages/containers.ts) (containers' lists during a move), `writeYamlFile` in [core/yaml-file.ts](../src/core/yaml-file.ts) (`campaign.yaml`, `state.yaml`), `appendLogEntry` in [core/log.ts](../src/core/log.ts), `createCampaign`, and `refreshHostFiles` as the MCP server starts.

### A game system package

```
systems/<name>/system.yaml   title, language, attribution, fields, coins, round, imperial, travel, settings, sheet, sheet-notes, creation,
                             values, marks, status-line, thresholds, recipes, conditions, tables, computed, counters,
                             progression, item-formulas, always-in, rewards, quest-ends
systems/<name>/world/        pages, as in a campaign (creatures/, items/, topics/ in 5e)
systems/<name>/rules/        chapters of rules text, one markdown file each
systems/<name>/images/       the pictures its pages link in `image` (optional)
systems/<name>/LICENSE.md    the license and attribution
systems/<name>/test/         the system's own tests (not published to npm)
systems/<name>/build/        scripts that wrote some of its pages and rules from its source, such as 5e's spells (not published)
```

[systems/game-system.ts](../src/systems/game-system.ts) finds systems in `context.systemFolders` (a folder with a `system.yaml`), validates the file with zod and returns a frozen `GameSystem`; formulas that do not read make the whole system unreadable (`FOR-9`). `campaign.yaml`'s `system` names the one a campaign uses; `campaignWorld` loads its pages beside the campaign's, each marked with `page.system`. A system's pages are read once in a process (`packagePages`): they ship read-only, and a running server keeps the systems it started with.

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

- A page never records where it is: its container lists it, in `contains` (places, items) or `inventory` (characters) (`CON-1`). A place holds places, characters and items; a character carries items; an item holds items and characters (`canHold`). What a character wears and wields is in its `equipped`, among what it carries; `write` refuses a page of the system there, `move` takes an item out of it when it goes elsewhere, inside a container too, and `write` and `validate` report one it does not carry (`CON-12`).
- `locate` climbs the holders to give the chain (`CON-1`, `CON-3`); `checkWorld` reports a page listed by two containers or inside itself (`CON-10`).
- `planMove` checks everything first; `applyMove` removes every entry pointing to the page, however it is written, and writes the destination last, so that a move stopped halfway finishes when repeated (`CON-4`, `CON-7`).
- `movePages` then logs public and hidden lines, fires events and notes the quests and events linked to what moved (`CON-5`, `CON-9`); the open scene follows the party (`CON-6`).

### Links and backlinks

Files: [pages/markdown.ts](../src/pages/markdown.ts), [pages/world.ts](../src/pages/world.ts), [pages/check.ts](../src/pages/check.ts). Codes: `LNK-1`–`LNK-5`.

`linksIn` reads links from any field value; `links` reads them from text, remembered per text with [core/memo.ts](../src/core/memo.ts). Code, inline or fenced, and `%%` comments, also across lines, hold no links, titles, secrets or goals (`lineViews`, `LNK-2`). `backlinks` lists the pages that link to one, by field or text, which `show` prints. `checkWorld` reports links to pages, sections or secrets that do not exist.

### Secrets and what characters know

File: [commands/reveal.ts](../src/commands/reveal.ts). Codes: `REV-1`–`REV-3`.

Only characters know things, in their `knows` list of links to pages and to secrets such as `[[Coppa#Veleno]]` (`REV-1`). `reveal` adds the links, refuses what does not exist and skips public sections (`REV-2`); it logs one line per learner, public only for what the player's character knows (`REV-3`). `show` gives the master everything, secrets included: what reaches the player is the AI's call.

### Counters and money

Files: [counters/counter.ts](../src/counters/counter.ts), [money/money.ts](../src/money/money.ts), [commands/change.ts](../src/commands/change.ts), [commands/game-money.ts](../src/commands/game-money.ts), [commands/game-recipes.ts](../src/commands/game-recipes.ts), [commands/game-thresholds.ts](../src/commands/game-thresholds.ts). Codes: `CNT-1`–`CNT-10`, `MON-1`–`MON-8`, `DAT-1`, `DAT-3`–`DAT-5`, `DAT-14`.

- A counter is a whole number or `current/max` (`CNT-1`), from 0 or a minimum the system works out up to its maximum (`CNT-2`). `changeCounter` applies `by` (stops at a limit and says how far beyond; a value outside never goes further out), `spend` (refused below 0, or below a minimum above it) or `to` (`CNT-3`–`CNT-5`).
- Money is a field written in the campaign's coins, such as `money: 34 gp 4 sp`. The coins come from `campaign.yaml`, else from the system (`MON-1`, `DAT-1`); `payCoins` pays with change, never in rare coins (`MON-5`).
- `write` refuses to overwrite a `current/max` counter or money, but writes a plain number, which may be a statistic, unless the system declares it a counter (`CNT-7`, `MON-6`); `change` changes them and logs `counter-changed`, and starts at 0 a declared counter with no maximum (`CNT-8`). It also applies a system's recipes, such as `long rest` (`DAT-4`, `DAT-5`), and adds the rule notes of the thresholds a party counter touches (`DAT-3`).

### Effects and their layer

Files: [effects/effect.ts](../src/effects/effect.ts), [commands/effect-layer.ts](../src/commands/effect-layer.ts), [commands/effect.ts](../src/commands/effect.ts), [commands/game-effects.ts](../src/commands/game-effects.ts), [commands/game-reminders.ts](../src/commands/game-reminders.ts). Codes: `EFF-1`–`EFF-15`.

- The reminders of a fight are said, never done (D-266): what breaks what someone keeps alive, from the system's `keeping`, when `change` or `effect` touches the keeper (`EFF-14`); the effects on who ends and who starts a turn, when it passes, and those without an end on who rests (`EFF-15`); the counter that shields one that went down (`DAT-14`).
- An effect is one line of a page's `effects` field, such as `Name (by: [[Lena]], ac: 15) until day 2, 14:20` (`EFF-1`). It ends at a game date, at someone's turn in a round, with the scene, or at a system occasion such as `long rest` (`EFF-2`, `DAT-5`).
- A system may add settings to the setup (`DAT-10`): `withSettings` gives the system as the campaign's values have it, without the fields a value leaves out, and `campaignSystem` in `game-world.ts` reads it so; `config`, `status` and `validate` ask, show and check them.
- `effectiveFields` is what commands read as a page's fields: inherited fields, then effects over them (the newest wins, a `bonus` field adds up), then what the system works out (`EFF-3`, `FOR-5`, `FOR-3`). The layer of effects alone is `withEffectValues` in `worked-out.ts`, which the formulas of an item's page read, as a weapon under Magic Weapon. Both are cached per world and page.
- `write` refuses the `effects` field: effects are added and ended with `effect` (`EFF-6`); `change` on a value an effect gives changes the effect (`EFF-7`). `advance` and `scene` end effects on time, turn or scene end (`EFF-8`, `EFF-9`), with log lines public when they concern the player (`EFF-11`).

### Formulas and what the system works out

Files: [core/formula.ts](../src/core/formula.ts), [commands/worked-out.ts](../src/commands/worked-out.ts). Codes: `FOR-1`–`FOR-9`.

- A system's `computed` fields, `tables` and `counters` limits are formulas (`FOR-1`, `FOR-2`): numbers, fields, `+ - * /`, `floor`, `ceil`, `min`, `max`, `table(name, key)`, and on list fields `has`, `count`, `item`, `sum`; `sum(classes, hit-die = d10)` reads the pages the list names. A field may give several formulas: the first with a value counts (D-210). `readFormulas` refuses unknown tables and circles when the system loads (`FOR-9`).
- `workOut` gives no value when something is missing, and then the page's own value is read (`FOR-4`).
- [commands/worked-out.ts](../src/commands/worked-out.ts) is where formulas meet pages: `withWorkedOut` puts computed values and counter maxima over the fields (`FOR-6`); `computedField` and `computedMessage` let `write` and `change` refuse a computed field and name the written fields it comes from (`FOR-7`); `workedLine` explains a value by what changed it (`FOR-8`); `workedOutProblems` feeds `validate`.

### The character sheet

Files: [commands/sheet.ts](../src/commands/sheet.ts), [commands/page-counters.ts](../src/commands/page-counters.ts). Codes: `DAT-2`, `SYS-8`.

A system's `sheet` groups, `sheet-notes`, `sheet-dice`, `values` and `status-line` drive the sheet of the player character and of companions that keep one (`hasSheet` in [commands/worked-out.ts](../src/commands/worked-out.ts), which also decides who has the system's uses full, `DAT-9`). `sheetData` gives it as data, a group for each that has a value, and each value with its kind, its text as the chat shows it, its marks, what is beside it, a counter with its limits, a list's items and what the character's parts add to a list (`always`), the free roll of a number the system rolls (`roll`: its dice from `sheet-dice`, the number, the notation; D-280), and where the experience is between the points of the level and those of the next (`progress`, on the sheet and on the line); a group that the items of one list give, as the attacks, has them item by item. `sheetText` makes the chat's lines from it, so that chat and dashboard never differ: `show` prints it by group (`sheetLines`), and one group with how each number is made (`show Page#Group`). `status` summarizes the sheet before there is a player character, with the system's `creation` note on how to make one (`DAT-12`), and reminds what a character still lacks (`missingSheetFields`). `write` gives the sheet's notes when a character joins the party (`joiningNotes`) and refuses list items the system does not take (`checkListValues`). The line of counters shown for the party is `partyCounters`.

### Classes, uses and what a campaign adds

Files: [progression/](../src/progression/), [core/progression-rule.ts](../src/core/progression-rule.ts), [commands/progression.ts](../src/commands/progression.ts), [commands/game-recipes.ts](../src/commands/game-recipes.ts), [systems/game-system.ts](../src/systems/game-system.ts), [commands/config.ts](../src/commands/config.ts). Codes: `PRO-1`–`PRO-4`, `DAT-9`, `CAM-1`–`CAM-3`, `KEP-1`–`KEP-4`.

- The `progression` module reads a page's table of levels and knows no game; `progressionOf` joins it to a character's lists as the system's `progression` says: the row's fields, the features each with the pages that tell it, and every feature as a row or part gives it (`gains`), from which `write` tells what a new level adds. The formulas the items' pages give (`item-formulas`, `PRO-5`), for the classes and for what a character has `equipped` (`CON-12`), are worked out in `worked-out.ts` (`itemValues`, `itemLines`), one value for each item, reading the item's own fields and effects first; another formula reads the first item's number. A roll's dice may come from a field, the largest of several (`chosenDice` in `core/formula.ts`), as a monk's Martial Arts die; and the formulas read a list with the pages the system's `always-in` puts there for who keeps the sheet, as the unarmed strike in `equipped` (`DAT-13`). A subclass's page adds to the character's lists the system's `parts.lists` names, by the level of its class, as a domain's spells to `prepared` (`given`, `PRO-7`): the sheet shows them apart, never counted with what is written. The experience points (`PRO-6`) are counted in `game-experience.ts`: what the next level needs, the level they reach, said by the line, the sheet, `change`, `write` and `status`. What the story rewards comes when a quest is done or failed, as the system's `quest-ends` says, milestones included; an open quest whose goals are all ticked (`everyGoalTicked` in `pages/markdown.ts`) is named by `status`, by `write` and at every `scene close`, asking whether its story is over (`game-quests.ts`, D-239).
- Uses are counters with a `refill` or named by a recipe (`isUse`); `withWorkedOut` reads them full on who keeps the sheet, `write` writes them and takes off those that only the lists give when their maximum falls to 0. `change` with a recipe brings them back by occasion (`refillAmount`, `recipeTargets`) and leaves a choice to the player, or to the master for a companion.
- What `campaign.yaml` adds is merged over `system.yaml` before it is validated (`findCampaignSystem`): the system with the additions, or the system alone and why. The reader refuses unknown keys, a refill no recipe ends and a recipe that sets kept rolls, each at its place on one line.
- `roll` with `keep` writes the dice in a field of kind `rolls`, with `use` takes one in place of the die; the page is written before the log line.

### Rolls and asking the player

Files: [dice/](../src/dice/), [commands/roll.ts](../src/commands/roll.ts), [commands/ask.ts](../src/commands/ask.ts). Codes: `DAT-8`, `ASK-1`–`ASK-9`.

- The `dice` module parses notation (`1d20+5`, `2d20kh1`, `4d6dl1`, `2d6ro<=2`, `1d6!`, `6d10>=8`, `4dF`, `d%`) and rolls with `context.random` or with the faces of physical dice. A roll gives each die as it was thrown (`ThrownDie`: its sides, the face it shows, the faces of a compounding explosion, the face before a reroll, dropped, a success), which `roll` and `ask` log as `dice`, for the dashboard (D-279).
- `roll` replaces the names in a notation by the sheet values of who rolls (`DAT-8`) and logs the roll. A hidden roll stores a proof (`id|text|salt`) whose SHA-256 starts with the fingerprint given to the player; `roll --reveal <id>` shows it.
- `ask` puts a question with buttons to the player: on the dashboard's page while one is open (`context.page`), else in the host's form (`context.player`), else it tells the master to ask in words this time (`ASK-1`). For a check it rolls and logs the roll as the player's, with the check; with physical dice it tells the master to ask the roll in words (`ASK-8`). A call the user stops (`context.signal`) logs nothing (`ASK-9`).

### Scenes and turns

Files: [scene/scene.ts](../src/scene/scene.ts), [commands/scene.ts](../src/commands/scene.ts), [commands/game-scene.ts](../src/commands/game-scene.ts). Codes: `SCN-1`–`SCN-10`, `DAT-11`.

- `show` with the open scene's title gives its log since it opened, round by round, with every why (`openSceneLog`, `SCN-10`): what a chat that starts in the middle of a fight reads before its recap; `instructions` gives with it the part of the open scene's type (`MOD-5`).

The open scene lives in `state.yaml` under `scene`: title, type, place, who is in it, numbered copies of creatures holding only what changed (`Annegato 1`, numbered after the highest number their name already takes, so that no name comes back: `SCN-3`), and when there are turns, `order`, `round` and `turn` (`SCN-6`). The `scene` command opens, adds, leaves, orders, passes the turn and closes; closing removes the scene from `state.yaml` and logs a `scene-closed` line, from which `status` lists the last scenes. Closing also says what the creatures overcome give the party, as the system's `rewards` say (`DAT-11`), with the calls of `change` and without giving it: a copy that leaves is kept under `gone`, without its effects, for it. What the close says is worked out before the scene goes, so that a page it cannot find stops it with the scene still open.

### Saves

Files: [saves/saves.ts](../src/saves/saves.ts), [commands/game-saves.ts](../src/commands/game-saves.ts), [commands/save.ts](../src/commands/save.ts). Codes: `SAV-1`–`SAV-6`.

A save is a zip, made with `fflate`, of the game's files: everything in the campaign but `.saves/`, what has a name starting with a dot at its top (`.git`, `.obsidian`, `.claude`, `.mcp.json`) and the host's files (`hostFileNames` in [campaign/host-files.ts](../src/campaign/host-files.ts), in any case), read from the disk, never from what a session kept (`SAV-2`). `scene close` makes one unless every player character is dead, writing its `saved` line only once the zip is written, and a save that fails never stops the close (`SAV-3`); `save make` too, with `saves: free`. `save load` first zips what it will replace into `before load NNN.zip`, leaves a mark (`loading.txt`) until it is done, gives the files back through the store, so that a session reads them at the next call, removes those made since and the later saves, and logs `save-loaded`; a load that stopped halfway is finished by the next `save load`, and `status` says so. The campaign's `saves` setting decides what may be loaded (`SAV-5`). The store reads and writes bytes for it: `entries`, `bytes`, `writeBytes`.

### Pictures

Files: [images/images.ts](../src/images/images.ts), [commands/game-images.ts](../src/commands/game-images.ts), [commands/image.ts](../src/commands/image.ts). Decision: D-267.

A page's picture is its standard field `image`, a link to a file such as `[[Ettore.webp]]`, inherited like any other field: a character derived from the system's Goblin shows the Goblin's. `findImage` looks for the file by name in the campaign's `images/` folder, then in its system's, so a campaign can give a picture of its own in place of the system's. `image` reads the file through the store, knows its format by its bytes, refuses anything else or anything over 5 MB, copies it to `images/<page name>.<extension>`, links it and logs `image-set`; without a file it removes the page's own picture (`image-removed`). The old file goes when no other campaign page links it. `validate` reports a link to a file that no `images/` folder has (`imageProblems`). The 5e system gives every creature an icon of game-icons.net (CC BY 3.0), which [systems/5e/build/icons.mjs](../systems/5e/build/icons.mjs) copies and links from `creature-icons.json`. The engine neither resizes nor generates pictures: the AI makes or downloads them with its host's tools, and the dashboard crops them into round tokens. `shownImage` gives the picture a page shows, its own or a base's, with when its file last changed; `view` takes only bases the player character knows (D-277).

### The player's view

Files: [commands/view.ts](../src/commands/view.ts), [commands/game-knowledge.ts](../src/commands/game-knowledge.ts). Codes: `VIEW-1`–`VIEW-5`.

`view` gives what the player may see, for the master to answer without spoilers and for the dashboard. Its result is data, which `format` makes into the chat's text: the campaign's name and the game's time, the party as `PartyMember`s (name, role, whether dead, picture with `shownImage`, place, the numbers of their line with their limits, effects with their end), a page with its sheet as `sheetData`, or with the stat block of its creature (`statBlock`) for a companion who keeps no sheet (D-275), or one section. `knowledgeOf` works out what the player character, the first living one, knows: its `knows`, itself, the companions and the creatures both derive from (D-275, D-277), the quests taken, what it carries, the places around it, the characters and places of the scenes it was in and where it was moved, as the log keeps them; the system's pages but its creatures (`VIEW-2`). `knownText` and `knownPart` give a page as it knows it: the introduction, the public sections, its own and those of the bases it knows, never a creature's, the secrets discovered by the page that writes them, without comments (`withoutComments`, `VIEW-3`). The overview reads the public lines of the log as a diary of facts, without the master's `why`; every name it writes is one the character knows, the others are someone or elsewhere, and copies are counted (`VIEW-4`, D-254). It also gives the last 20 public rolls as `ShownRoll`s, for the dashboard: who threw them, the player (physical dice too) or the master, for whom as the character knows them, the check the master asked, the notation, the total, the text and the dice; never a hidden roll, never the `why` (D-279).

### The dashboard

Files: [dashboard-server.ts](../src/dashboard-server.ts), [dashboard/](../src/dashboard/). Decisions: D-270, D-272, D-273, D-278, D-279.

`dashboardOpener` in [mcp-server.ts](../src/mcp-server.ts) opens it before the first call that finds a campaign in the server's folder, as after `init`, and that call waits for it, so that its `status` gives the link (D-277); never in a folder without a campaign. `startDashboard` listens on 127.0.0.1 only, at the first port from 4747 to 4756 where no other program answers, on 127.0.0.1 or on `::1`; it never keeps the process alive, nor does an open page, and its link, `http://127.0.0.1:<port>`, goes in `context.dashboard`, which `status` gives the master for the player. It answers only requests whose `Host` and `Origin`, when there is one, are its own (`localhost` or `127.0.0.1` at its port), and only `GET`, but for the click on what the master asks:

- `/api/<command>`: a command the player may run, today only `view`, with its parameters from the query, validated with `input.strict()`, run after `ready()` as the MCP server runs a tool; its result in JSON, or `{ error }`.
- `/api/asked`: what the master asks now, `{ asked: { id, question, title, labels } }`, or `null`. `POST /api/answer` with `{ asked, choice }`, from the page alone (its `Origin` is required), settles it with the button's place: `202`, or `409` for a question no longer asked. The page never sends a number: the engine rolls (D-279).
- `/events`: server-sent events; `changed` when the session's watchers name a change or lose track (`onChange`), at most once every 100 ms. The notice carries no data: the page reads `view` again, so nothing the player may not see goes through it.
- `/images/<name>`: a picture by the name of its file, looked for with `findImage` in the campaign's and the system's `images/` folders, never by a path; with an ETag of its bytes, `no-cache`, and a policy that runs nothing, even an SVG opened by itself.

- `/`: the page, written by the server with an import map that names Preact's, three.js's (with `three/addons/`, for its loader of models) and cannon-es's modules; its policy runs only the page's own scripts and that map, known by its hash.
- `/vendor/<module>`: the modules the map names, from their packages, and only those; `/<file>`: a script, a style sheet, a picture or the dice's models and data of the built page, never outside its folder.

`Dashboard.player`, which `dashboardOpener` puts in `context.page`, asks on the page (D-279): with no page open it answers `absent` at once, and `ask` turns to the form; else the question waits on every open page, up to 30 minutes, for the first click, and a new question takes its place. The MCP server keeps `ask` offered while the dashboard runs, forms or not, and gives each call its own `signal`: a stop takes the question away. When the last page closes and none comes back within 5 seconds, as after a reload, the question is `absent`, and goes to the form or to words.

Every answer carries `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and `Content-Security-Policy: default-src 'self'`; a picture, one that runs nothing.

The page ([dashboard/app.tsx](../src/dashboard/app.tsx)) reads `view` for the party and `view <member>` for the sheet of whom the address names (`#/character/<name>`, D-276), again at every `changed`, whenever it connects and when the address changes, and keeps showing the last sheet, dimmed, while the chat is closed. On top are the master's avatar ([dashboard/master.tsx](../src/dashboard/master.tsx): `assets/master.svg` inline, one mood shown at a time, a blink now and then, a breath unless motion is reduced; D-274), the campaign's name with the product's below, and the game's time and place; then the party's strip, links to their sheets. A sheet puts its groups of a few short numbers in a rail beside columns of the others, and a page's text, as a companion's traits and actions, read from its markdown without HTML ([dashboard/markdown.tsx](../src/dashboard/markdown.tsx)). A picture's address carries when its file last changed, so that it comes again only when it changes. It is generic: [dashboard/layout.ts](../src/dashboard/layout.ts) draws each value by its kind, never by a field's name (pips for a counter up to 10, a bar beyond, a track when it goes below zero, chips for a list, tiles for a group of a few short numbers), and [dashboard/labels.ts](../src/dashboard/labels.ts) makes the labels from the fields' names (D-273). A click on a number reads `view <member>#<group>` and shows how it is made (FOR-8), or that it is as written, with a button for its free roll when it has one, which the tray throws as a free throw (D-280); the arrows move among a group's numbers, which take one stop of the Tab key. [dashboard/data.ts](../src/dashboard/data.ts) holds the types of what the page reads, and a test checks that `view`'s result fits them.

What the master asks shows as a banner under the party's strip ([dashboard/asked.tsx](../src/dashboard/asked.tsx)), read from `/api/asked` at every reading: the question, a gold button for each check, read from its label (`checkOf`), and the others plain; the tab's title starts with a die while it waits. After a click the page reads again at once. Beside the sheet on a wide screen, below it on a narrow one, the rolls ([dashboard/rolls.tsx](../src/dashboard/rolls.tsx)): the newest first, the player's with their character's token, the master's with the robot and for whom; the new ones flash. The dice are in [dashboard/dice/](../src/dashboard/dice/) (D-278). `make-dice.py`, which Blender runs by itself (`blender --background --factory-startup --python src/dashboard/dice/make-dice.py`), makes the seven dice, the d4, d6, d8, d10, d12, d20 and the tens of a d%, bevelled, with their numbers engraved in Inter (SIL OFL 1.1, which Blender ships), opposite faces adding up as on real dice: `assets/dice/dice.glb`, their meshes with a body and an ink, and `assets/dice/dice.json`, each one's shape without bevels and, for each value, the direction that looks up when it is rolled and the top of its number. `models.ts` works on them as data: a roll's dice as dice to throw (`diceToThrow`: a d% as its tens and units, a reroll or a compounding explosion as values in turn, while the dice an explosion adds come with the others), a shape's symmetries, the one that shows a landed die on its value (`landingTurn`), and the turn on its face that brings its number upright as it stops (`uprightAngle`). `throw.ts` simulates a throw with cannon-es before it is shown, recorded frame by frame with the knocks, a knock once for two dice, until the dice have stayed in place for a few frames; `stage.ts` is the three.js scene over the page, with the dice in the theme's colours and a dropped one faded toward the page, without its shadow, drawn frame by frame only while a celebration moves; `sounds.ts` makes the knocks with the browser, a noise and a short tone through a compressor, without files; `roller.ts` throws the dice, then, after a moment, again those rerolled or exploded, past those lying, each shown turned by its symmetry. `tray.tsx` loads `roller.ts`, with three.js, cannon-es and three's loader of models, at the first throw: a check rolled after the page's first reading is thrown landing on the engine's dice, with a plate of its total, which on a wide screen then flies into its line of the rolls; a rare face of a die that counts, the highest or the lowest of a d10 or bigger (`rareFace`), is celebrated on the floor, a gold halo with sparks for the highest and a red one with smoke for the lowest ([dashboard/dice/celebration.ts](../src/dashboard/dice/celebration.ts), D-282), with its words in the plate, as natural 20 (D-281); the button opens a tray of dice for fun, as many as the player likes and a modifier, decided by the page, which count for nothing, their plate in dashes. Escape lets the dice land at once; with reduced motion they appear landed; without WebGL, the plate comes alone; the sound can be turned off, and the browser remembers it. `npm run build` compiles the page with its own `tsconfig.json`, for the browser, and copies its style sheet and `assets/`; `npm run lint` checks its types. [test/demo/](../test/demo/) makes a campaign in `tmp/dashboard-demo` to look at the page: `dashboard.ts` serves it until stopped, and with `--ask` asks the page its questions in turn; `look.ts` opens it in Chrome with Playwright and gives a screenshot, the console and the accessibility tree, and with `--ask <n>` has the demo ask one of its questions first.

### Game time

Files: [time/game-date.ts](../src/time/game-date.ts), [commands/advance.ts](../src/commands/advance.ts), [commands/game-time.ts](../src/commands/game-time.ts). Codes: `TIM-1`–`TIM-7`, `DAT-7`, `EVT-1`, `EVT-8`.

The present is `state.yaml`'s `date`, a `GameDate` of day and minute (`TIM-1`, `TIM-4`); a day without a time counts from its midnight. `advance` moves it forward by a duration or to a date, never back (`TIM-5`); it stops at the first planned event that comes due (`TIM-6`), ends the effects whose time has come, and on a new day lists the event clocks to move. A system's `round` length turns short durations into rounds in a scene with turns (`DAT-7`).

### Planned events and triggers

Files: [triggers/trigger.ts](../src/triggers/trigger.ts), [commands/game-events.ts](../src/commands/game-events.ts). Codes: `EVT-1`–`EVT-10`.

- An event page has `date`, `place`, `status` (planned, happened, cancelled), `clock`, `when` and `by`. It is due when its date has come; without a readable date, when its clock is full or a `when` condition holds (`EVT-1`–`EVT-3`).
- The `triggers` module reads conditions (`party in [[X]]`, `[[A]] in [[B]]`, `[[Item]] in party`, `[[Page]] dead`) and judges them through `TriggerFacts`, which `worldFacts` answers from the world: the module never sees a page.
- After `write`, `move`, `scene` (when it brings the party to its place) or `change` (on an event's clock), `fireEvents` compares the world before and after and logs the events set off (`EVT-4`, `EVT-5`).

### Environment

Files: [pages/environment.ts](../src/pages/environment.ts), [commands/game-environment.ts](../src/commands/game-environment.ts). Codes: `ENV-1`–`ENV-6`.

A place's `environment` lines (`light: dark`) hold for everything inside it, from the nearest place of its chain; effects on a place hold the same way (`ENV-1`–`ENV-3`). `write` changes one line at a time (`ENV-4`); `move` says what changes around whoever moves (`ENV-5`).

### Roads and travel

Files: [map/](../src/map/), [core/length.ts](../src/core/length.ts), [pages/roads.ts](../src/pages/roads.ts), [commands/game-roads.ts](../src/commands/game-roads.ts), [commands/game-journey.ts](../src/commands/game-journey.ts), [commands/game-advance.ts](../src/commands/game-advance.ts), [commands/route.ts](../src/commands/route.ts), [commands/travel.ts](../src/commands/travel.ts). Codes: `ROA-1`–`ROA-7`, `TRV-1`–`TRV-11`.

- A road is a place with `stops`: links and lengths taking turns, as `[[Guadoscuro]], 12 km, [[Bivio]]`, read by `readStops`; its `kind` (road when it has none) says what the system's `travel.kinds` make of it. Lengths and speeds are always metric (`readLength`, `readSpeed`, D-262); outputs give them in the campaign's `units`, imperial with the system's `imperial` mile and foot (`formatLength`, `measuresOf`).
- `roadsOf` turns the world's roads into the `map` module's stretches, only between places of the campaign, once per world. A journey starts and ends at the nearest stop of a page's chain (`stopOf`, `ROA-5`). `speedOf` gives metres a minute on each stretch: in a vehicle on a kind it travels, its speed plus the current downstream; at the pace on the others, times the factor of the `terrain` entry of the road's environment (`TRV-2`, `TRV-3`). `quickestWay` in `map/ways.ts` is a Dijkstra on time, then length, then the order of the stretches (`TRV-4`).
- `route` says the way, the distance and the time, from where the party is or its journey stopped, and with `across` the straight line (`TRV-5`). `travel` walks the way step by step: the travellers, or the vehicle they are all in (`moversOf`, `TRV-6`), enter each road with `movePages`, time passes with `passTime` (the heart of `advance`, which stops at the first dated event), and they enter each stop, then the destination itself. It stops at an event a move or the time made due, even one due right as it reaches a stop, and when the day's hours end (`TRV-7`, `TRV-8`), which start again after a stop of 8 hours (`travelledSinceRest`); stopped, `journey` in `state.yaml` keeps who travels, where to, where on a road (`road`, `stretch`, `from`, `toward`, `done` in metres), the pace, when the last travel ended, the minutes since the last rest and the hours given (`TRV-9`), and the next `travel` goes on from there. One journey at a time: another group's `travel` is refused while one is stopped between places. `status` says it. The loop over the legs is `walk` in `travel.ts`, which counts minutes on the whole way so that rounding never adds up.
- Positions ([pages/positions.ts](../src/pages/positions.ts), [commands/game-positions.ts](../src/commands/game-positions.ts), [commands/game-here.ts](../src/commands/game-here.ts); `POS-1`–`POS-6`): a place's `position` is written by the engine as `8.5 km E, 3 km S` from the map's centre; `write` turns relations such as `12 km NE of [[Guadoscuro]]` into it, averaging several, and makes the first place named the centre (`positionFromWrite`, `writeOrigin`). `positionOf` gives a page's position: its own, a stop's on the line between the nearest stops of its road that have one, or its nearest container's; the positions and the regions are worked out once for each world. A place with a position and a `radius` is a region; `regionAt` gives the smallest that covers a point. `shortRoadProblems` reports a road shorter than the straight line between two of its stops.
- Off the roads ([commands/game-open.ts](../src/commands/game-open.ts); `TRV-12`–`TRV-15`): `travel` with `across` or `toward` starts from where the movers are on the map (`moversPosition`: the journey's point in the open, its point on a road, or their place's position), cuts the straight line into legs where the region changes (`openLegs`, every 250 m), and walks them as it walks a road's stretches: the movers enter each region, or leave every place in the open (`planLeave`), and the journey keeps the point as `at`. At a stop it says the region, the places near (`nearPlaces`), the roads crossed (`crossedRoads`) and how to make the spot a place. `write` with `here` writes a new place where the journey stopped: a stop splitting the road's stretch, or a place at the point inside the region that covers it, and moves the movers into it (`placeHere`). `move` between two stops of the roads says that a journey goes with `travel`.

### Rules lookup

Files: [rules/](../src/rules/), [commands/rules.ts](../src/commands/rules.ts), [commands/game-rules.ts](../src/commands/game-rules.ts). Codes: `RUL-1`, `RUL-3`–`RUL-6`, `DAT-6`.

- The `rules` module cuts markdown files into sections: headings, bold paragraph titles, table captions (`RUL-1`). It finds them by title path (`Combat › Grappling`) or by words, rarer words and title words weighing more, accepting forms of a word (`RUL-3`–`RUL-5`), and chooses what an answer shows within about 800 words (`RUL-6`).
- The `rules` command searches the campaign's house rules, then the system's chapters, then the precedents in `campaign.yaml`. Thresholds and conditions find their rule by title with `ruleTitled`, a house rule first (`DAT-6`). A text that names a page, or a section of pages (`Domain Spells`, `Cleric › Domain Spells`: a class's features are on its page), is said first with how to read it (`sectionsNamed`, `RUL-6`).

### Validate and problems

Files: [core/problem.ts](../src/core/problem.ts), [commands/problems.ts](../src/commands/problems.ts), [pages/check.ts](../src/pages/check.ts), [commands/validate.ts](../src/commands/validate.ts).

A `Problem` is `{ path?, message, fix? }`. `campaignProblems` gathers those of the settings, the system, the coins, the log, the world (`checkWorld`), worked-out values, list values, game time, events, effects and the open scene. `validate` lists them; `status` gives their count. Most problems do not stop other commands, as a page file that does not read leaves the rest of the world working; a command stops when what it needs cannot be read, such as the game date for `advance`.

### The instructions delivered to the AI

Files: [instructions/](../instructions/), [instructions/index.ts](../src/instructions/index.ts), [commands/instructions.ts](../src/commands/instructions.ts), [commands/parts.ts](../src/commands/parts.ts).

Three layers, in English. The start lines, [start.md](../instructions/start.md), send the AI to `instructions` and then `status` at the start of every chat: they are the MCP server's instructions and the start of the campaign's `AGENTS.md`. The `instructions` command returns [core.md](../instructions/core.md), what holds in every mode (the role, the tools of every mode, the pages, truth and rulings, secrets, the table), then the part of the mode, such as [play.md](../instructions/play.md) with the tools and the craft of play, plus [buttons.md](../instructions/buttons.md) when the host shows forms. Each command's description and each output carry the guidance for that moment. The files are read from the installed package, wherever it is.

The campaign's mode (D-77, MOD-1–MOD-7; [commands/game-mode.ts](../src/commands/game-mode.ts)) is kept in `state.yaml`: `setup`, `session zero` or `play`, set to setup by `init`; a campaign without one is in play once its log opened a scene, in session zero once it has a player character. The `mode` command moves it, forward only when the checklists before the target are complete: the setup's (`unansweredSettings` in [campaign/settings.ts](../src/campaign/settings.ts): the settings every campaign needs, the system's own, `companions`, `lines` and `veils` until answered, even with `none`, and `premise` and `preparation` for a world without pages) and session zero's (a living player character, the companions the setup says are made then, whole sheets). `status`, `init` and `config` say what the next mode needs (`campaignNote`); `scene open` refuses outside play. `instructions` gives `core.md` and the part of the mode, `setup.md`, `session-zero.md` or `play.md`, with the system's layer; `mode` gives the part of the mode it enters.

A situation that opens gives its part of the instructions (D-97, D-121): `scene open` the part named after the scene's type, such as [combat.md](../instructions/combat.md); `advance` the part `new-day` with the clocks to move; `write` the parts `quest-ends` and `level-up`, and `change` `level-up`. `situationPart` in [commands/parts.ts](../src/commands/parts.ts) layers the core's file (`corePart`) and the system's `instructions/<part>.md` (`GameSystem.parts`) with `layeredPart`: each adds its text after a blank line, or takes the place of those below with `replace: true` in its frontmatter. The MCP server keeps in `context.told` the parts it gave, so each comes once in a chat; `instructions` empties it, as a chat starts or follows a summary. On the command line every call gives them.

## 6. Tests

`npm test` runs vitest on `test/**/*.test.ts` and `systems/*/test/**/*.test.ts` ([vitest.config.ts](../vitest.config.ts)); `npx vitest run test/move.test.ts` runs one file. `npm run lint` checks ESLint, dprint and the types of the tests; CI runs lint, build and tests on Linux and Windows.

- **Commands** are tested through `runCommandLine(args, testContext(folder))` in a temporary campaign made with `init`, or by calling `command.run` directly. `mcp.test.ts` connects a client to `createMcpServer` in memory; `session-store.test.ts` drives the session store with a fake watcher; `dashboard.test.ts` starts the dashboard's server on a free port and asks it over HTTP.
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
