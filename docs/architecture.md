# Architecture

rpg-engine is a set of commands over a campaign folder of markdown and YAML files, served as a command line (`rpg`) and as an MCP server (`rpg mcp`), with a dashboard for the player. This is a map of the code; the code says the rest. [AGENTS.md](../AGENTS.md) holds the development rules.

Comments and tests cite rule codes such as `INH-4` or `CON-1`: `grep -r "INH-4" src test` finds the code and the tests of a rule.

## 1. Where things are

| Path | What it holds |
|---|---|
| [src/core/](../src/core/) | Shared utilities: command registry, context, file store, log, YAML files, text comparison, formulas, problems |
| `src/<module>/` | One job each, behind its `index.ts` (table below) |
| [src/commands/](../src/commands/) | The commands, and `game-*.ts` helpers that join modules for several commands |
| [src/cli.ts](../src/cli.ts), [src/command-line.ts](../src/command-line.ts) | The `rpg` binary |
| [src/mcp-server.ts](../src/mcp-server.ts) | The MCP server |
| [src/dashboard-server.ts](../src/dashboard-server.ts), [src/dashboard/](../src/dashboard/) | The dashboard's server, and its page (Preact) |
| [systems/](../systems/) | Built-in game systems: [5e](../systems/5e/) |
| [instructions/](../instructions/) | The game master's instructions |
| [test/](../test/) | Tests and the Ironsworn-based test system |

| Module | Job |
|---|---|
| `pages` | Page files, frontmatter, sections and secrets, links, inheritance, containers, environment, checks |
| `campaign` | Finding and creating a campaign; `campaign.yaml`; `state.yaml` |
| `systems` | The installed game systems and their `system.yaml` |
| `dice` | Dice notation, digital or physical faces, proofs for hidden rolls |
| `counters` | Counters such as `5/12` |
| `money` | Coins and amounts, paying with change |
| `effects` | Effect lines: name, keeper, values, end |
| `scene` | The open scene: participants, numbered copies, turn order |
| `time` | Game dates and durations |
| `rules` | Rules as text: sections, word search |
| `triggers` | Event conditions such as `party in [[Ossario]]` |
| `instructions` | Reads `instructions/` from the package |
| `progression` | Tables of levels: rows and features up to a level |
| `images` | Picture formats and finding a picture file |
| `pictures` | Pictures made with the player's Codex or Claude login |
| `map` | The world map: roads, quickest way, compass, distances |
| `grid` | The map of a place: squares, legend, reach, adjacency |
| `saves` | Saves as zips |
| `player-notes` | The player's notes, outside the game |

No module names a game's concepts: hit points or conditions exist only as data in a system.

## 2. Dependencies

A module imports only its own files, `src/core/`, Node and packages: never another module, a command, the CLI or the server. Commands are the glue. Only the store and a few readers of the package touch `node:fs`; everything else reads and writes through `files()`. [test/architecture.test.ts](../test/architecture.test.ts) enforces both.

## 3. A command

A command is defined once with `defineCommand` ([core/registry.ts](../src/core/registry.ts)): `name`, a `description` written for an AI, a zod `input`, flags (`readOnly`, `alwaysLoad`, `needsPlayer`, `slow`, `positionals`), `run(input, context)` and `format(result)`. [commands/index.ts](../src/commands/index.ts) lists them; the CLI ([command-line.ts](../src/command-line.ts)) and the MCP server ([mcp-server.ts](../src/mcp-server.ts)) are generated from that list, and the dashboard calls `view` through `/api/view`.

- **Context** ([core/context.ts](../src/core/context.ts)): everything from outside, injected: the folder, randomness, time, ids, the system folders; on MCP also the player's forms, the dashboard, the session store. Tests use `testContext()` from [test/support.ts](../test/support.ts).
- **Store** ([core/store.ts](../src/core/store.ts)): each call reads a file once, keeps what it parsed deep-frozen, and writes through it. The MCP server keeps a `SessionStore` ([core/session-store.ts](../src/core/session-store.ts)) across calls, watching the campaign's folders; what changed outside the session is told to the master at the next call ([commands/game-outside.ts](../src/commands/game-outside.ts)).
- **Log**: a command that changes the game appends lines to `log.jsonl` ([core/log.ts](../src/core/log.ts)), each `public` or `hidden`.
- **Output**: an AI reads it. Errors say what went wrong and what to call next; a refused write says "Nothing changed". Everything is checked before the first write.

## 4. Data on disk

### A campaign

```
campaign.yaml   settings
state.yaml      the present: mode, date, open scene, journey, the master's mood
log.jsonl       one JSON line per change
world/          the pages: characters/ places/ factions/ quests/ items/ events/ topics/ creatures/
rules/          house rules (optional)
images/         pictures (optional)
.saves/         saves, one zip each
.player/        the player's notes
AGENTS.md, CLAUDE.md, .mcp.json, .claude/, .codex/, .gemini/   tell AI hosts where rpg-engine is, memory off
```

`init` creates it ([campaign/create-campaign.ts](../src/campaign/create-campaign.ts), host files in [campaign/host-files.ts](../src/campaign/host-files.ts)). A campaign is the nearest folder upwards with a `campaign.yaml`.

### Pages

A page is a markdown file under `world/` ([pages/world.ts](../src/pages/world.ts)): its name is the file name, its type the first folder, its fields the YAML frontmatter. The format is Obsidian's: `[[links]]`, headings make sections, `> [!secret] Name` blocks. Standard fields ([pages/standard-fields.ts](../src/pages/standard-fields.ts)) have fixed meanings; the others are free or declared by the system. Commands write a page with `writePage` ([pages/write-page.ts](../src/pages/write-page.ts)).

### A game system

`systems/<name>/` holds `system.yaml`, `world/` (pages, as in a campaign), `rules/` (chapters of rules text), `images/`, `LICENSE.md`, and, not published, `test/` and `build/`. [systems/game-system.ts](../src/systems/game-system.ts) validates it into a frozen `GameSystem`. See [game-systems.md](game-systems.md).

## 5. Mechanisms

| Mechanism | What it does | Where |
|---|---|---|
| World | All pages of the campaign and its system in a frozen `World`; campaign pages first, system pages read-only | [pages/world.ts](../src/pages/world.ts), [commands/game-world.ts](../src/commands/game-world.ts) |
| Inheritance | A character derives from its `creature`, an item from its `item`; a page keeps only its differences | [pages/inheritance.ts](../src/pages/inheritance.ts) |
| Containers | A page never records where it is: its container lists it; `locate` climbs the chain | [pages/containers.ts](../src/pages/containers.ts), [commands/move.ts](../src/commands/move.ts) |
| Links | Links in fields and text, backlinks, `rename` that follows them | [pages/markdown.ts](../src/pages/markdown.ts), [pages/rename-page.ts](../src/pages/rename-page.ts) |
| Secrets | Only characters know, in `knows`; `reveal` adds | [commands/reveal.ts](../src/commands/reveal.ts) |
| Counters and money | `current/max` within limits; coins with change | [counters/](../src/counters/), [money/](../src/money/), [commands/change.ts](../src/commands/change.ts) |
| Effects | Lines in `effects` over a page's fields, ending at a date, a turn, a scene or a rest | [effects/](../src/effects/), [commands/effect-layer.ts](../src/commands/effect-layer.ts) |
| Formulas | What a system works out: computed fields, tables, counter limits | [core/formula.ts](../src/core/formula.ts), [commands/worked-out.ts](../src/commands/worked-out.ts) |
| Sheet | The character sheet as data, the same in chat and dashboard | [commands/sheet.ts](../src/commands/sheet.ts) |
| Progression | Levels, features, uses that a rest refills, experience | [progression/](../src/progression/), [commands/progression.ts](../src/commands/progression.ts), [commands/game-recipes.ts](../src/commands/game-recipes.ts) |
| Rolls and asking | Dice, hidden rolls with proofs; questions with buttons on the dashboard or in the host's form | [dice/](../src/dice/), [commands/roll.ts](../src/commands/roll.ts), [commands/ask.ts](../src/commands/ask.ts) |
| Scenes | The open scene in `state.yaml`: who, copies, turns, who is hostile, what strangers look like | [scene/](../src/scene/), [commands/scene.ts](../src/commands/scene.ts) |
| Saves | A zip at each scene's end; load and start over as the campaign's setting allows | [saves/](../src/saves/), [commands/save.ts](../src/commands/save.ts) |
| Pictures | A page's `image`; pictures drawn by the player's Codex or Claude | [images/](../src/images/), [pictures/](../src/pictures/), [commands/image.ts](../src/commands/image.ts) |
| Moods | The master's and the characters' moods, from a closed list | [core/mood.ts](../src/core/mood.ts), [commands/mood.ts](../src/commands/mood.ts) |
| The player's view | What the player may see, never a secret: party, place, scene, map, journal, settings, saves | [commands/view.ts](../src/commands/view.ts), [commands/game-knowledge.ts](../src/commands/game-knowledge.ts) |
| Time | The game date; `advance` stops at the first event due and ends effects | [time/](../src/time/), [commands/advance.ts](../src/commands/advance.ts) |
| Events | Planned events, due by date, clock or condition | [triggers/](../src/triggers/), [commands/game-events.ts](../src/commands/game-events.ts) |
| Environment | A place's `environment` holds for everything inside it | [pages/environment.ts](../src/pages/environment.ts) |
| Travel | Roads as places with `stops`, positions, travel on and off roads, maps of places | [map/](../src/map/), [grid/](../src/grid/), [commands/travel.ts](../src/commands/travel.ts) |
| Rules | House rules, then the system's chapters, then precedents | [rules/](../src/rules/), [commands/rules.ts](../src/commands/rules.ts) |
| Problems | What `validate` lists; most never stop other commands | [commands/problems.ts](../src/commands/problems.ts), [pages/check.ts](../src/pages/check.ts) |
| Instructions | `core.md` at every chat, then a part per mode and situation, layered with the system's | [instructions/](../instructions/), [commands/parts.ts](../src/commands/parts.ts) |
| Translation | The dashboard's phrases and a system's words in the campaign's language | [page-words.ts](../src/page-words.ts), [commands/translate.ts](../src/commands/translate.ts) |

### The dashboard

The MCP server opens it on 127.0.0.1, at a port worked out from the campaign's folder. The server ([dashboard-server.ts](../src/dashboard-server.ts)) answers `/api/view` and the player's few actions (answers, notes, settings, saves), sends `/events` when files change (no data: the page reads `view` again), and serves pictures by name only. The page ([dashboard/app.tsx](../src/dashboard/app.tsx)) writes its words with `t()` from [dashboard/i18n/](../src/dashboard/i18n/); Help's guide is [dashboard/guide/](../src/dashboard/guide/).

## 6. Tests

`npm test` runs vitest on `test/` and `systems/*/test/`. Commands are tested through `runCommandLine(args, testContext(folder))`; `*-laws.test.ts` check rules with fast-check on random worlds; [test/systems/](../test/systems/) has an Ironsworn-based system so the core stays generic; [test/system-packages.test.ts](../test/system-packages.test.ts) checks every installed system.

## 7. How to add things

**A command.** Create `src/commands/<name>.ts` with `defineCommand`. In `run`: `requireCampaign`, `campaignWorld`, read with `effectiveFields`, check everything, write through the modules, log. Return a result; `format` tells the AI what happened and what next. Add it to [commands/index.ts](../src/commands/index.ts), test it through `runCommandLine`, run `npm run docs`.

**A field kind.** Add it to `fieldKinds` in [core/field-kind.ts](../src/core/field-kind.ts), give it a meaning where kinds are read (`declaredKind` in [pages/system-pages.ts](../src/pages/system-pages.ts) and its callers), and its check to `fits` in [test/system-packages.test.ts](../test/system-packages.test.ts).

**A key of `system.yaml`.** Add it to `systemSchema` and `readSystem` in [systems/game-system.ts](../src/systems/game-system.ts), use it from a command helper, check it in [test/system-packages.test.ts](../test/system-packages.test.ts), describe it in [game-systems.md](game-systems.md).

**A page of a system.** Add `systems/<name>/world/<type>/<Name>.md`; [test/system-packages.test.ts](../test/system-packages.test.ts) checks its name, fields and links. Only open-licensed content, with its attribution.
