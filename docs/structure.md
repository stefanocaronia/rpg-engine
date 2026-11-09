# Structure

Where things are in the repository, what each module depends on, and where new code goes. How the parts work together is in [architecture.md](architecture.md); the development rules are in [AGENTS.md](../AGENTS.md). This page changes in the same commit that adds, moves or removes a folder.

## 1. The repository

| Path | What it holds |
|---|---|
| [src/](../src/) | The engine: core, modules, commands, CLI, MCP server, the dashboard's server and page |
| [systems/](../systems/) | The one game system the engine brings, [free](../systems/free/); the others are packages of their own, as the [5e](https://github.com/stefanocaronia/rpg-engine-5e) |
| [instructions/](../instructions/) | The game master's instructions, installed into each campaign |
| [test/](../test/) | Tests; the fake game system they play, [test/systems/fake](../test/systems/fake/), and the test extensions, [test/extensions/](../test/extensions/); the demo campaign and the look at the page ([test/demo/](../test/demo/)), betasim's flows ([test/betasim/](../test/betasim/)), the benchmark ([test/bench/](../test/bench/)), the translation scripts ([test/i18n/](../test/i18n/)), the packages' tests run against this engine ([test/downstream/](../test/downstream/)) |
| [playtests/](../playtests/) | Playtest scenarios: player profiles, starting points, checklists |
| [docs/](.) | These docs |

## 2. Inside `src/`

| Path | What it holds |
|---|---|
| [src/core/](../src/core/) | Shared utilities: command registry, context, file store, log, YAML files, text comparison, formulas, problems, the mark of a process that works alone |
| `src/<module>/` | One job each, behind its `index.ts` (table below) |
| [src/commands/](../src/commands/) | The commands, a file each; a topic whose commands have helpers of their own is a folder with them, such as [view/](../src/commands/view/), and the helpers that join modules for several topics are in [shared/](../src/commands/shared/) |
| [src/cli/cli.ts](../src/cli/cli.ts), [src/cli/command-line.ts](../src/cli/command-line.ts) | The `rpg` binary |
| [src/commands/shared/library-reader.ts](../src/commands/shared/library-reader.ts) | `rpg --read-library`, the process that reads the books of the computer's library apart, as `rules`, `config` and the dashboard start it |
| [src/server/mcp.ts](../src/server/mcp.ts) | The MCP server |
| [src/server/bell-listener.ts](../src/server/bell-listener.ts) | `rpg --listen`, Claude Code's Stop hook that `init` writes: it waits at its chat's dashboard and wakes the chat when the player acts there |
| [src/server/dashboard/](../src/server/dashboard/), [src/dashboard/](../src/dashboard/) | The dashboard's server, and its page (Preact) |
| [files.ts](../src/server/dashboard/files.ts), [player.ts](../src/server/dashboard/player.ts), [news.ts](../src/server/dashboard/news.ts), [writes.ts](../src/server/dashboard/writes.ts), [choices.ts](../src/server/dashboard/choices.ts), [ports.ts](../src/server/dashboard/ports.ts) | The server's parts: the files it serves, the master's question on the page, the player's words and what the master hears of the page, what the page writes, the choices the master prepared for the player, such as a new level; its ports, which the doorbell reads without the server |
| [src/testing/index.ts](../src/testing/index.ts), [src/testing/system-checks.ts](../src/testing/system-checks.ts) | `rpg-engine/testing`, the test kit for extensions and game systems: a campaign with its packages linked, its commands, log, widgets, the tools' descriptions and dashboard, and the checks of a system's folder; see [extensions.md](extensions.md#6-tests) |

| Module | Job |
|---|---|
| `pages` | Page files, frontmatter, sections and secrets, links, inheritance, containers, environment, checks |
| `campaign` | Finding and creating a campaign; `campaign.yaml`; `state.yaml`, with the choices waiting for the player |
| `systems` | The installed game systems and their `system.yaml` |
| `extensions` | The installed extensions, their `extension.yaml` and their words |
| `packages` | npm for every package, game systems and the engine included: install, update, a `.tgz` read |
| `adventures` | Adventures as packages of content: their manifest, a `.zip` or folder checked whole, the `.zip` an export writes |
| `languages` | Languages as packages: the dashboard's phrases, its Guide and a system's words, translated by hand |
| `themes` | A game system's theme of the dashboard: read, checked, written as CSS |
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
| `helpers` | Codex and Claude Code as the player's own programs: found, installed, signed in, stopped; the pictures, the import's reader and the translations' writer they give |
| `documents` | The player's documents as text and pictures: PDF, by OCR where it has no text, Word, OpenDocument, EPUB, HTML, RTF, text |
| `importer` | The import's folder: a document in pieces, how far it is, the adventure the helper writes |
| `library` | The player's books: their text indexed once in the local data folder, read apart one at a time |
| `confirm` | A yes or no asked of the player in a window of their operating system |
| `map` | The world map: roads, quickest way, compass, distances |
| `grid` | The map of a place: squares, legend, reach, adjacency |
| `saves` | Saves as zips |
| `player-notes` | The player's notes, outside the game |

No module names a game's concepts: hit points or conditions exist only as data in a system.

## 3. Dependencies

A module imports only its own files, `src/core/`, Node and packages: never another module, a command, the CLI or the server, from any of its folders. Commands are the glue. Only the store and a few readers of the package touch `node:fs`; everything else reads and writes through `files()`. [test/architecture.test.ts](../test/architecture.test.ts) enforces both.

## 4. Where new code goes

- **A job of its own** that makes sense for a game very different from D&D: a module, `src/<module>/` with its `index.ts`, and its row above.
- **Work that joins modules**: a command, `src/commands/<name>.ts`, or its topic's folder; a helper several topics use goes in [commands/shared/](../src/commands/shared/).
- **A part of the page**: in [src/dashboard/](../src/dashboard/), in the folder of its area; its style in [style/](../src/dashboard/style/). The page is one app: its folders group its parts and need no `index.ts`.
- **A game's concept**: not in `src/`, but data in a game system or an extension, their code only when data is not enough.
- **Folders, not prefixes**: a file name never repeats its folder (`pages/file.ts`, not `pages/page-file.ts`); a module that grows splits into subfolders, each with its `index.ts`.
