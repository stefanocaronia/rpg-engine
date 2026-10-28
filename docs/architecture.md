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
| [src/library-reader.ts](../src/library-reader.ts) | `rpg --read-library`, the process that reads the books of the computer's library apart, as `rules`, `config` and the dashboard start it |
| [src/mcp-server.ts](../src/mcp-server.ts) | The MCP server |
| [src/bell-listener.ts](../src/bell-listener.ts) | `rpg --listen`, Claude Code's Stop hook that `init` writes: it waits at its chat's dashboard and wakes the chat when the player acts there |
| [src/dashboard-server.ts](../src/dashboard-server.ts), [src/dashboard/](../src/dashboard/) | The dashboard's server, and its page (Preact) |
| [src/testing.ts](../src/testing.ts), [src/system-checks.ts](../src/system-checks.ts) | `rpg-engine/testing`, the test kit for extensions and game systems: a campaign with its packages linked, its commands, log, widgets, the tools' descriptions and dashboard, and the checks of a system's folder; see [extensions.md](extensions.md#6-tests) |
| [systems/](../systems/) | The one game system the engine brings, [free](../systems/free/); the others are packages of their own, as the [5e](https://github.com/stefanocaronia/rpg-engine-5e) |
| [instructions/](../instructions/) | The game master's instructions |
| [test/](../test/) | Tests, and the fake game system they play, [test/systems/fake](../test/systems/fake/) |

| Module | Job |
|---|---|
| `pages` | Page files, frontmatter, sections and secrets, links, inheritance, containers, environment, checks |
| `campaign` | Finding and creating a campaign; `campaign.yaml`; `state.yaml` |
| `systems` | The installed game systems and their `system.yaml` |
| `extensions` | The installed extensions, their `extension.yaml` and their words; npm for the packages |
| `dice` | Dice notation, digital or physical faces, proofs for hidden rolls, random tables, the yes/no oracle |
| `counters` | Counters such as `5/12` |
| `money` | Coins and amounts, paying with change |
| `effects` | Effect lines: name, keeper, values, end |
| `scene` | The open scene: participants, numbered copies, turn order |
| `time` | Game dates and durations; the calendar that shows a date as a day of a month |
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

A command is defined once with `defineCommand` ([core/registry.ts](../src/core/registry.ts)): `name`, a `description` written for an AI, a zod `input`, flags (`readOnly`, `alwaysLoad`, `needsPlayer`, `slow`, `positionals`), `run(input, context)` and `format(result)`. [commands/index.ts](../src/commands/index.ts) lists them; the CLI ([command-line.ts](../src/command-line.ts)) and the MCP server ([mcp-server.ts](../src/mcp-server.ts)) are generated from that list, and the dashboard calls `view` through `/api/view`. The MCP server checks a tool's input itself, showing the host the same strict schema, and answers a wrong call with all the tool's parameters. Where a description names a game's thing it writes a placeholder, such as `{{counter}}` ([core/examples.ts](../src/core/examples.ts)): the MCP server fills it with the names of the campaign's system ([commands/game-examples.ts](../src/commands/game-examples.ts)) and again after a call that changes the system; the CLI and the reference use neutral names.

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
.imports/       documents being made adventures, each with its pieces, notes and adventure
exports/        adventures exported from the campaign, kept out of the saves
.player/        the player's notes
AGENTS.md, CLAUDE.md, .mcp.json, .claude/, .codex/   tell AI hosts where rpg-engine is, memory off
```

`init` creates it ([campaign/create-campaign.ts](../src/campaign/create-campaign.ts), host files in [campaign/host-files.ts](../src/campaign/host-files.ts)). A campaign is the nearest folder upwards with a `campaign.yaml`.

### Pages

A page is a markdown file under `world/` ([pages/world.ts](../src/pages/world.ts)): its name is the file name, its type the first folder, its fields the YAML frontmatter. The format is Obsidian's: `[[links]]`, headings make sections, `> [!secret] Name` blocks. Standard fields ([pages/standard-fields.ts](../src/pages/standard-fields.ts)) have fixed meanings; the others are free or declared by the system. Commands write a page with `writePage` ([pages/write-page.ts](../src/pages/write-page.ts)).

### An adventure

A folder or a `.zip` with `adventure.yaml` (title, about, language, version, author, license, needs, levels, content, length, party, start, opening) and only `world/`, `images/` and `rules/`, as a campaign has them ([adventures/](../src/adventures/)). `package install` copies it into the campaign whole or not at all: pages under `world/<type>/<Adventure>/`, the rest under a folder of its own, the dates of the frontmatter moved to today; the log says which adventures are installed, so they go back with a save. `package export` writes the world as it was at the start, without the player characters ([commands/game-adventures.ts](../src/commands/game-adventures.ts)). A document without `adventure.yaml` is made an adventure with `import`: the engine reads its text and pictures, a PDF's pages without readable text by Windows' OCR ([documents/](../src/documents/)), keeps it in pieces in `.imports/<title>/` with the mark of how far it is ([importer/](../src/importer/)), and a helper outside the chat, the player's Claude Code or Codex, reads it piece after piece, proposes starting points, then sets the world at the one chosen ([commands/game-import.ts](../src/commands/game-import.ts)); the result is an adventure folder for `package install`, and the document's text leaves `.imports/`. The dashboard tells how far an import is, from the document being opened (`.imports/opening.yaml`, with the pages the OCR has read) to the world written, and reads it again every few seconds while it works by itself. Where no helper is installed, the master reads the pieces in the chat and writes the pages into the world. The Packages page lists them, adds one from a `.zip` and exports the campaign ([dashboard/packages.tsx](../src/dashboard/packages.tsx)).

### A game system

A game system is a folder that holds `system.yaml`, `world/` (pages, as in a campaign), `rules/` (chapters of rules text), `images/`, `LICENSE.md`, `versions/<name>/` (a version of its rules in the same shape, read over the rest as the campaign's `ruleset` says). The engine brings `systems/free/` alone; any other is a package npm installs into the player's data folder, with `package install`, and lives in a repository of its own with its tests. The MCP server installs one of ours that a campaign plays and this computer lacks as it starts, once the world is read; its first call waits for it, before the dashboard opens, and says so in its answer ([commands/package.ts](../src/commands/package.ts), `installCampaignSystem`). [systems/game-system.ts](../src/systems/game-system.ts) validates it into a frozen `GameSystem`. A system may bring code, `package.json` and `src/` built to `dist/`: [systems/system-code.ts](../src/systems/system-code.ts) loads it as an entry starts, into the `Context`, and [commands/game-package-hooks.ts](../src/commands/game-package-hooks.ts) calls its hooks, and the extensions', after the commands' writes. See [game-systems.md](game-systems.md).

### A package's code

An extension's code and a game system's have one contract, [core/package-api.ts](../src/core/package-api.ts), exported by [index.ts](../src/index.ts): `PackageEntry` gives `PackageCode`, with its commands, what it does as time passes, its widgets' hooks, and the hooks after the engine's writes, called at once, the system's first ([commands/game-package-hooks.ts](../src/commands/game-package-hooks.ts)); the kind decides only the role, one system for a campaign with its data in `system.yaml`. The game it reaches is `Game`, read by widgets as `GameView`. [core/package-declarations.ts](../src/core/package-declarations.ts) holds what both declare alike: the API number, read from `rpg-engine.api` in `package.json`, and the icons, widgets and figures of `extension.yaml` and `system.yaml`; the pages a card stands in and the room of a figure are the contract's, which [page.ts](../src/page.ts) passes on to the page code. [commands/game-package-code.ts](../src/commands/game-package-code.ts) gives the campaign's packages, the system first, their commands and their game. The contract and the schema of both files are the API, whose number goes up with every addition a package may use, a new key too; the engine reads a range of them.

## 5. Mechanisms

| Mechanism | What it does | Where |
|---|---|---|
| World | All pages of the campaign and its system in a frozen `World`; campaign pages first, system pages read-only | [pages/world.ts](../src/pages/world.ts), [commands/game-world.ts](../src/commands/game-world.ts); what its system offers of the engine's settings, the settings a value asks and the parts its values choose, [commands/game-offers.ts](../src/commands/game-offers.ts) |
| Inheritance | A character derives from its `creature`, an item from its `item`; a page keeps only its differences | [pages/inheritance.ts](../src/pages/inheritance.ts) |
| Containers | A page never records where it is: its container lists it; `locate` climbs the chain | [pages/containers.ts](../src/pages/containers.ts), [commands/move.ts](../src/commands/move.ts) |
| Stacks | Goods counted where they are held, `[[Torch]] 7`: a kind is in no place; `change` spends, `move` takes pieces, `trade` swaps goods and money in one go | [pages/stacks.ts](../src/pages/stacks.ts), [pages/stack-entry.ts](../src/pages/stack-entry.ts), [commands/game-stacks.ts](../src/commands/game-stacks.ts), [commands/trade.ts](../src/commands/trade.ts) |
| Links | Links in fields and text, backlinks, `rename` that follows them | [pages/markdown.ts](../src/pages/markdown.ts), [pages/rename-page.ts](../src/pages/rename-page.ts) |
| Secrets | Only characters know, in `knows`; `reveal` adds | [commands/reveal.ts](../src/commands/reveal.ts) |
| Counters and money | `current/max` within limits; coins with change | [counters/](../src/counters/), [money/](../src/money/), [commands/change.ts](../src/commands/change.ts) |
| Effects | Lines in `effects` over a page's fields, ending at a date, a turn, a scene or a rest | [effects/](../src/effects/), [commands/effect-layer.ts](../src/commands/effect-layer.ts) |
| Formulas | What a system works out: computed fields, tables, counter limits | [core/formula.ts](../src/core/formula.ts), [commands/worked-out.ts](../src/commands/worked-out.ts) |
| Sheet | The character sheet as data, the same in chat and dashboard | [commands/sheet.ts](../src/commands/sheet.ts) |
| Progression | Levels, features, uses that a rest refills, experience; the pool of dice a rest lets one spend | [progression/](../src/progression/), [commands/progression.ts](../src/commands/progression.ts), [commands/game-recipes.ts](../src/commands/game-recipes.ts), [commands/game-dice-pool.ts](../src/commands/game-dice-pool.ts) |
| Rolls and asking | Dice, hidden rolls with proofs, a page's random tables, the yes/no oracle and coins; questions with buttons on the dashboard or in the host's form | [dice/](../src/dice/), [commands/roll.ts](../src/commands/roll.ts), [commands/game-tables.ts](../src/commands/game-tables.ts), [commands/ask.ts](../src/commands/ask.ts) |
| Scenes | The open scene in `state.yaml`: who, copies, turns, who is hostile, what strangers look like | [scene/](../src/scene/), [commands/scene.ts](../src/commands/scene.ts) |
| Saves | A zip at each scene's end; load and start over as the campaign's setting allows | [saves/](../src/saves/), [commands/save.ts](../src/commands/save.ts) |
| Pictures | A page's `image`; pictures drawn by the player's Codex or Claude | [images/](../src/images/), [pictures/](../src/pictures/), [commands/image.ts](../src/commands/image.ts) |
| Themes | A game system's theme of the dashboard, data alone: read and checked (files in its folder, both modes, contrast), turned into CSS of custom properties; served by the dashboard and turned off in its Settings | [themes/](../src/themes/), [commands/game-theme.ts](../src/commands/game-theme.ts), [dashboard/system-style.ts](../src/dashboard/system-style.ts) |
| Moods | The master's and the characters' moods, from a closed list | [core/mood.ts](../src/core/mood.ts), [commands/mood.ts](../src/commands/mood.ts) |
| Companions' diaries | A few lines of what a companion thinks, kept in the log, never on their page; outputs say whose is due on a new day or a quest's end; `view as` gives them their last three, the journal all | [commands/thoughts.ts](../src/commands/thoughts.ts), [commands/game-thoughts.ts](../src/commands/game-thoughts.ts) |
| The player's view | What the player may see, never a secret: party, place, scene, map, journal, what the character knows with its documents and the calendar, settings, saves; with more than one player character, what any of them knows and who, with one in the foreground for the place and the map; with `as`, what another character knows, for the character agent voicing them, which the dashboard never asks | [commands/view.ts](../src/commands/view.ts), [commands/game-knowledge.ts](../src/commands/game-knowledge.ts), [commands/game-view-world.ts](../src/commands/game-view-world.ts) |
| Time | The game date, `day N`; with `calendar-start` also a day of the calendar, the real months unless the campaign gives its own; `advance` stops at the first event due and ends effects | [time/](../src/time/), [commands/advance.ts](../src/commands/advance.ts) |
| Events | Planned events, due by date, clock or condition | [triggers/](../src/triggers/), [commands/game-events.ts](../src/commands/game-events.ts) |
| Environment | A place's `environment` holds for everything inside it | [pages/environment.ts](../src/pages/environment.ts) |
| Travel | Roads as places with `stops`, positions, travel on and off roads, maps of places | [map/](../src/map/), [grid/](../src/grid/), [commands/travel.ts](../src/commands/travel.ts) |
| Rules | House rules, then the system's chapters, searched by the system's own names too when the campaign plays in another language, then the player's books, then precedents | [rules/](../src/rules/), [commands/rules.ts](../src/commands/rules.ts) |
| Library | The player's books, by the folders added once to this computer (`library/folders.json`) and turned on in each campaign by its `library`, from the command, the chat or the Packages page's Library tab: their text indexed once in the player's local data folder (`library/`, a file for each book), read apart, pages without readable text read by Windows' OCR; searched by `rules`, never written into a campaign | [library/](../src/library/), [documents/](../src/documents/), [commands/game-library.ts](../src/commands/game-library.ts), [library-reader.ts](../src/library-reader.ts) |
| Problems | What `validate` lists; most never stop other commands | [commands/problems.ts](../src/commands/problems.ts), [pages/check.ts](../src/pages/check.ts) |
| State checks | What cannot be true together in the party and the open scene, told to the master; read-only | [commands/game-checks.ts](../src/commands/game-checks.ts) |
| Instructions | `core.md` at every chat, then a part per mode and situation, layered with the system's and the extensions'; in play in Claude Code, `voices.md`, when to call the character agent, an agent that `init` writes in `.claude/agents/` from `character.md` and that reads only `view` with `as` | [instructions/](../instructions/), [commands/parts.ts](../src/commands/parts.ts) |
| Extensions | The packages campaign.yaml lists: their parts, calendar, additions to the game system under the campaign's, commands and what they do as time passes, their widgets on the dashboard, read-only, where they put them and campaign.yaml moves them, and their words; `package` installs them with npm. The game system's commands, time passed and widgets go the same way | [extensions/](../src/extensions/), [commands/game-package-code.ts](../src/commands/game-package-code.ts), [commands/game-widgets.ts](../src/commands/game-widgets.ts), [commands/package.ts](../src/commands/package.ts) |
| Adventures | Installed, taken out while the story has not touched them, exported as they were at the start, and made from the player's documents | [adventures/](../src/adventures/), [documents/](../src/documents/), [importer/](../src/importer/), [commands/game-adventures.ts](../src/commands/game-adventures.ts), [commands/import.ts](../src/commands/import.ts) |
| Languages | A language's translation made by hand, as a package: the dashboard's phrases, its Guide and a system's words, before the translation on the fly | [languages/](../src/languages/), [page-words.ts](../src/page-words.ts) |
| Catalog | What npm has for every kind of package and the adventures GitHub has by topic, for the Packages page | [commands/game-catalog.ts](../src/commands/game-catalog.ts) |
| Consent | The player's yes to a package not ours, or to a library folder new to the computer from the chat or the dashboard, in a window of their operating system | [confirm/](../src/confirm/) |
| Translation | The dashboard's phrases and a system's words in the campaign's language | [page-words.ts](../src/page-words.ts), [commands/translate.ts](../src/commands/translate.ts) |

### The dashboard

The MCP server opens it on 127.0.0.1, at a port worked out from the campaign's folder. The server ([dashboard-server.ts](../src/dashboard-server.ts)) answers `/api/view` and the player's few actions (answers, notes, settings, saves, packages of ours, and what their character does, a sentence the master hears at the head of their next call: [player-acts.ts](../src/player-acts.ts), rung in by the hook or queued in Codex's thread), sends `/events` when files change (no data: the page reads `view` again), gives the extensions' widgets as their hooks show them (`/api/widgets`), and serves pictures by name only. The Packages page reads the engine itself at `/api/engine`: a GET gives `{version, installed?, latest?, update?, failed?, install, folder?, working?}`, `version` being the one this server runs, read as it started, `installed` the one npm put on disk since, which a new chat runs, `update` whether npm's latest is newer than that, and `install` being `global` (npm's global folder, which it updates), `link` (an `npm link` of `folder`, for development) or `other` (`folder`, any other way), `failed` why npm could not be asked; a POST `{action: "update"}`, from the page alone, installs npm's latest globally with npm and answers 202 `{kind: "engine-updated", version, restart}`, `restart` being `chat` (a new chat takes the new engine) or `app` (the app opened again), else 400 `{error}` with what to do, and 409 while another package's work goes on; where nothing updates it, as in the demo, a GET gives `{version}` alone. Until then the chat, its server and the page go on with the engine they started with. A catalog entry whose latest needs a newer engine has `newer: {version, engine?}`, the version offered being the newest this engine reads. The page ([dashboard/app.tsx](../src/dashboard/app.tsx)) writes its words with `t()` from [dashboard/i18n/](../src/dashboard/i18n/); Help's guide is [dashboard/guide/](../src/dashboard/guide/). It knows no game: a game's cards and panels, as the 5e's death saves and hit dice, are its packages' widgets and page modules, mounted where the page keeps a place ([dashboard/page-code.tsx](../src/dashboard/page-code.tsx), [dashboard/person-panel.tsx](../src/dashboard/person-panel.tsx), [dashboard/ask-card.tsx](../src/dashboard/ask-card.tsx)); a rest's dice with no card are the question's own buttons ([dashboard/asked-dice.tsx](../src/dashboard/asked-dice.tsx)).

## 6. Tests

`npm test` runs vitest on `test/`; the 5e, Ironsworn and our extensions keep their tests in their own repos, and `npm run test:downstream` runs them against this engine, with the 5e beside the others whose tests play it. Commands are tested through `runCommandLine(args, testContext(folder))`; `*-laws.test.ts` check rules with fast-check on random worlds. The tests play [test/systems/fake](../test/systems/fake/), a game system of names and shapes of its own made for them, never published, and `free`; a test that needs a system without something makes one in a temporary folder (`madeSystem` in [test/support.ts](../test/support.ts)). [test/system-packages.test.ts](../test/system-packages.test.ts) checks every installed system with the kit's `systemChecks`, which a system's repository runs on itself.

## 7. How to add things

**A command.** Create `src/commands/<name>.ts` with `defineCommand`. In `run`: `requireCampaign`, `campaignWorld`, read with `effectiveFields`, check everything, write through the modules, log. Return a result; `format` tells the AI what happened and what next. Add it to [commands/index.ts](../src/commands/index.ts), test it through `runCommandLine`, run `npm run docs`.

**A field kind.** Add it to `fieldKinds` in [core/field-kind.ts](../src/core/field-kind.ts), give it a meaning where kinds are read (`declaredKind` in [pages/system-pages.ts](../src/pages/system-pages.ts) and its callers), and its check to `fits` in [system-checks.ts](../src/system-checks.ts).

**A key of `system.yaml`.** Add it to `systemSchema` and `readSystem` in [systems/game-system.ts](../src/systems/game-system.ts), use it from a command helper, check it in [system-checks.ts](../src/system-checks.ts) when a value of it can be wrong, have the fake system use it, describe it in [game-systems.md](game-systems.md).

**A page of a system.** Add `world/<type>/<Name>.md` in the system's own repository; the kit's `systemChecks`, in its tests, checks its name, fields and links. Only open-licensed content, with its attribution.
