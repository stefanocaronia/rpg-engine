# Structure

Where things are in the repository, what each module depends on, and where new code goes. How the parts work together is in [architecture.md](architecture.md); the development rules are in [AGENTS.md](../AGENTS.md). This page changes in the same commit that adds, moves or removes a folder.

## 1. The repository

| Path | What it holds |
|---|---|
| [src/](../src/) | The engine: core, modules, commands, CLI, MCP server, the dashboard's server and page |
| [systems/](../systems/) | The one game system the engine brings, [free](../systems/free/); the others are packages of their own, as the [5e](https://github.com/stefanocaronia/rpg-engine-5e) |
| [instructions/](../instructions/) | The game master's instructions, installed into each campaign |
| [plugins/](../plugins/) | The engine's plugin for OpenCode, plain JavaScript, installed into each campaign as `.opencode/plugins/rpg.js`: it runs the doorbell on OpenCode's events |
| [test/](../test/) | Tests; the fake game system they play, [test/systems/fake](../test/systems/fake/), and the test extensions, [test/extensions/](../test/extensions/); the demo campaign, the look at the page and the icon's images made from the logo ([test/demo/](../test/demo/)), betasim's flows ([test/betasim/](../test/betasim/)), the benchmark ([test/bench/](../test/bench/)), the translation scripts ([test/i18n/](../test/i18n/)), the packages' tests run against this engine ([test/downstream/](../test/downstream/)), the fake browser the window script is tried with on Windows ([test/desktop/](../test/desktop/)), the fake hosts, Claude Code's and an agent of the Agent Client Protocol, and the recorded flows the master's drivers are tested on, and a host of node that plays them over a real process ([test/master/](../test/master/)) |
| [playtests/](../playtests/) | Playtest scenarios: player profiles, starting points, checklists |
| [docs/](.) | These docs |

## 2. Inside `src/`

| Path | What it holds |
|---|---|
| [src/core/](../src/core/) | Shared utilities: command registry, context, file store, log, YAML files, text comparison, formulas, problems, a package's archive read whole, the mark of a process that works alone, the processes the engine starts, stopped with what they started and read by lines, and the guard of a long process against what nobody caught ([process.ts](../src/core/process.ts)), a look repeated until it finds or its time is up ([wait.ts](../src/core/wait.ts)), paths compared as the system compares them ([paths.ts](../src/core/paths.ts)), the addresses of the pages the engine serves on this computer ([page-address.ts](../src/core/page-address.ts)), the small JSON files of the player's data folder, written whole ([data-file.ts](../src/core/data-file.ts)), the AI hosts and their names ([hosts.ts](../src/core/hosts.ts)) |
| `src/<module>/` | One job each, behind its `index.ts` (table below) |
| [src/commands/](../src/commands/) | The commands, a file each; a topic whose commands have helpers of their own is a folder with them, such as [view/](../src/commands/view/), [scene/](../src/commands/scene/), [config/](../src/commands/config/) and [package/](../src/commands/package/), and the helpers that join modules for several topics are in [shared/](../src/commands/shared/), a folder for each topic: `campaign/`, `sheet/`, `scene/`, `time/`, `places/`, `characters/`, `books/`, `packages/` |
| [src/cli/cli.ts](../src/cli/cli.ts), [src/cli/command-line.ts](../src/cli/command-line.ts) | The `rpg` binary |
| [src/cli/open.ts](../src/cli/open.ts), [src/cli/icon.ts](../src/cli/icon.ts) | `rpg open`, which reaches the launcher and opens its page, and `rpg icon`; the question, once a machine, whether to put the icon on the desktop and in the menu |
| [src/commands/shared/books/library-reader.ts](../src/commands/shared/books/library-reader.ts) | `rpg --read-library`, the process that reads the books of the computer's library apart, as `rules`, `config` and the dashboard start it |
| [src/server/mcp.ts](../src/server/mcp.ts) | The MCP server |
| [src/server/context.ts](../src/server/context.ts) | The context of a server on this computer, a chat's own or its campaign's table: what reaches the player's computer, and what follows the chat it serves |
| [src/server/subagent.ts](../src/server/subagent.ts) | Whether a call comes from a character's subagent, by the metadata Codex and Antigravity send, so that the MCP server lets it only `view` |
| [src/server/chats.ts](../src/server/chats.ts) | The MCP server's copies of the campaign's chats into `sessions/`, now and then after a call |
| [src/server/bell/](../src/server/bell/) | `rpg --listen`, the doorbell: the Stop hook that `init` writes for Claude Code and Antigravity, which OpenCode's plugin runs too; it waits at its chat's dashboard and wakes the chat when the player acts there ([listener.ts](../src/server/bell/listener.ts)), and in Antigravity lets the chat go when the player writes in it or a subagent's answer waits for it, and holds no subagent's conversation ([antigravity.ts](../src/server/bell/antigravity.ts)) |
| [src/server/approver.ts](../src/server/approver.ts) | `rpg --approve`, Antigravity's hook that `init` writes: it lets the rpg tools run without asking, and asks for every other; it notes which campaign the conversation plays, for the router |
| [src/server/fence.ts](../src/server/fence.ts) | `rpg --fence <file>`, the hook the engine writes in the working folder of Antigravity's writer, importer and painter: it refuses every tool but reading and writing files in the folders its file names and the tools it names, so that the run goes on |
| [src/server/route/](../src/server/route/) | The router of Antigravity's app: `rpg mcp` started outside a campaign keeps a child `rpg mcp` for each campaign a call's conversation plays and one in its own folder, and passes each line to the right one ([router.ts](../src/server/route/router.ts)); where `rpg mcp` reads its client ([front.ts](../src/server/route/front.ts)); the notes of the conversations ([notes.ts](../src/server/route/notes.ts)) |
| [src/server/table/](../src/server/table/) | `rpg table`, the table of a campaign: a process that serves its page with no chat open and runs the commands of the chat at it, one at a time, ending by itself once no chat and no page has been there for a while, or once the code of a package it loaded changed on disk and no call runs ([serve.ts](../src/server/table/serve.ts), who knocks at its socket and whether they sit [door.ts](../src/server/table/door.ts), the chat at it [seat.ts](../src/server/table/seat.ts)); `rpg mcp` in the campaign pipes its chat to it when it is on ([pipe.ts](../src/server/table/pipe.ts)); where it is found, a file in the player's data folder with its local socket and token ([place.ts](../src/server/table/place.ts)), and what the two say first, a chat's hello or a probe that only asks whether the table is there ([hello.ts](../src/server/table/hello.ts)); the table's own chat with the master, which the page shows and speaks to ([chat.ts](../src/server/table/chat.ts)), and its last choice of host, model and effort beside the place ([last-chat.ts](../src/server/table/last-chat.ts)), and its messages kept in the campaign's `sessions/table-chats/` ([flow.ts](../src/server/table/flow.ts)) |
| [src/server/launcher/](../src/server/launcher/) | `rpg launcher`, the page of the campaigns of this computer: a process that lists them, makes a new one and opens one by starting its table, ending by itself after ten idle minutes, and one alone of two started together ([serve.ts](../src/server/launcher/serve.ts), [routes.ts](../src/server/launcher/routes.ts)); where it is found ([place.ts](../src/server/launcher/place.ts)), found or started for `rpg open` and, through the CLI, for a table's page ([start.ts](../src/server/launcher/start.ts)); the list and the campaigns it remembers ([campaigns.ts](../src/server/launcher/campaigns.ts)), a campaign made ([make.ts](../src/server/launcher/make.ts)) and opened ([open.ts](../src/server/launcher/open.ts)). It imports the table and the page's server, never the dashboard's, and loads the commands only to make a campaign |
| [src/server/page/](../src/server/page/) | What the dashboard and the launcher serve alike: the gate that lets in only their own page ([gate.ts](../src/server/page/gate.ts)), the headers, a body read and a JSON answer ([http.ts](../src/server/page/http.ts)), the page's shell and its built files ([files.ts](../src/server/page/files.ts)) |
| [src/desktop/](../src/desktop/) | The player's desktop: the browser that opens a page in an application window of its own ([browser.ts](../src/desktop/browser.ts)), the kinds of window and their sizes ([window/sizes.ts](../src/desktop/window/sizes.ts)) and, on Windows, PowerShell placing the window it knows for ours by its title, one at a time ([window/](../src/desktop/window/)), and the icon on the desktop and in the menu, for each system ([icon/](../src/desktop/icon/)) |
| [src/server/dashboard/](../src/server/dashboard/), [src/dashboard/](../src/dashboard/) | The dashboard's server, and its page (Preact) |
| [files.ts](../src/server/dashboard/files.ts), [player.ts](../src/server/dashboard/player.ts), [news.ts](../src/server/dashboard/news.ts), [writes.ts](../src/server/dashboard/writes.ts), [engine.ts](../src/server/dashboard/engine.ts), [choices.ts](../src/server/dashboard/choices.ts), [pictures.ts](../src/server/dashboard/pictures.ts), [ports.ts](../src/server/dashboard/ports.ts), [opener.ts](../src/server/dashboard/opener.ts), [routes.ts](../src/server/dashboard/routes.ts), [master.ts](../src/server/dashboard/master.ts), [home.ts](../src/server/dashboard/home.ts) | The server's parts: the files it serves, the master's question on the page, the player's words and what the master hears of the page, what the page writes, npm's latest RPG Engine asked at most once a day, the choices the master prepared for the player, such as a new level; a picture of the player's own for a page they see; its ports, which the doorbell reads without the server; what opens it for a chat's own server, and the page a server shows; what it answers at each address, the gate of [src/server/page/](../src/server/page/) first, then the page's API as a table by path; the table's chat with the master in the page; the way back to the launcher, which the CLI gives a table, and the campaign's folder |
| [src/testing/index.ts](../src/testing/index.ts), [src/testing/system-checks.ts](../src/testing/system-checks.ts) | `rpg-engine/testing`, the test kit for extensions and game systems: a campaign with its packages linked, its commands, log, widgets, the tools' descriptions and dashboard, and the checks of a system's folder; see [extensions.md](extensions.md#6-tests) |

| Module | Job |
|---|---|
| `pages` | Page files, frontmatter, sections and secrets, links, inheritance, containers, environment, checks |
| `campaign` | Finding and creating a campaign; `campaign.yaml`; `state.yaml`, with the choices waiting for the player |
| `systems` | The installed game systems and their `system.yaml` |
| `extensions` | The installed extensions, their `extension.yaml` and their words |
| `packages` | npm for every package, game systems and the engine included: install, update, a `.tgz` read |
| `adventures` | Adventures as packages of content: their manifest, a `.zip` or folder checked whole, the `.zip` an export writes |
| `languages` | Languages as packages, from npm or of data alone: the dashboard's phrases, its Guide and a system's words, translated by hand |
| `themes` | A game system's theme of the dashboard, and those installed on their own, copied or linked: read, checked, written as CSS; a new theme's template |
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
| `helpers` | Codex and Claude Code as the player's own programs: found, installed, signed in, stopped; how each AI host's account stands, looked at in the background, and its sign-in and installation from a page (`access.ts`); the pictures, the import's reader and the translations' writer they give; OpenCode's reader and writer, in its own chat (`opencode.ts`); Antigravity's writer and reader, its `agy` fenced by settings of the engine's and started with a home of the engine's, in its own chat, and its painter where the campaign chose it in another chat (`antigravity.ts`) |
| `documents` | The player's documents as text and pictures: PDF, by OCR where it has no text, Word, OpenDocument, EPUB, HTML, RTF, text |
| `importer` | The import's folder: a document in pieces, how far it is, the adventure the helper writes |
| `library` | The player's books: their text indexed once in the local data folder, read apart one at a time |
| `confirm` | A yes or no asked of the player in a window of their operating system, and the folder they choose in another |
| `map` | The world map: roads, quickest way, compass, distances |
| `grid` | The map of a place: squares, legend, reach, adjacency |
| `saves` | Saves as zips |
| `git` | Git in a folder, through the git of the computer, never asking: whether it is a repository, a commit of the folder, a push, the engine's block of a `.gitignore` |
| `player-notes` | The player's notes, outside the game |
| `chats` | The chats Claude Code and Codex keep of a campaign, read in their folders and written into it as text |
| `master` | A chat with the master in the AI host's own program, started with no terminal and driven by its protocol, so that the table can show it: the events of a chat, the same for every host ([chat.ts](../src/master/chat.ts)); what every driver shares, the reading of a host's lines and JSON-RPC's requests and answers ([lines.ts](../src/master/lines.ts)) and the life of a chat and its turns, from the player's words to the chat's end ([state.ts](../src/master/state.ts)); and a driver per host, its own state and reading beside those, with where its program is, the environment it runs in, its model and efforts, the models the host offers, asked of its program, and what a campaign lacks for it: Claude Code's in [claude-code/](../src/master/claude-code/), with the paths its tools that read may ask ([paths.ts](../src/master/claude-code/paths.ts)) and its models ([models.ts](../src/master/claude-code/models.ts)); Codex's in [codex/](../src/master/codex/), over its own JSON-RPC of `codex app-server`; OpenCode's in [opencode/](../src/master/opencode/), its program and how its tools are read, and Antigravity's in [antigravity/](../src/master/antigravity/), its tools read by the protocol's kinds, both over the client of the Agent Client Protocol in [acp/](../src/master/acp/), which names no host; where a host's program is looked for ([program.ts](../src/master/program.ts)) and the campaign's folder a tool that reads is held to ([paths.ts](../src/master/paths.ts)); every host of the registry as the page offers it ([index.ts](../src/master/index.ts)), with the models of each kept for ten minutes ([keeper.ts](../src/master/keeper.ts)) |

No module names a game's concepts: hit points or conditions exist only as data in a system.

## 3. Dependencies

A module imports only its own files, `src/core/`, Node and packages: never another module, a command, the CLI or the server, from any of its folders. Commands are the glue. Only the store and a few readers of the package touch `node:fs`; everything else reads and writes through `files()`. [test/architecture.test.ts](../test/architecture.test.ts) enforces both.

## 4. Where new code goes

- **A job of its own** that makes sense for a game very different from D&D: a module, `src/<module>/` with its `index.ts`, and its row above.
- **Work that joins modules**: a command, `src/commands/<name>.ts`, or its topic's folder; a helper several topics use goes in [commands/shared/](../src/commands/shared/), in the folder of its topic.
- **A part of the page**: in [src/dashboard/](../src/dashboard/), in the folder of its area (`shell/` the frame, `parts/` what every section draws with, `play/` what happens at the table, `sheet/`, `journal/`, `settings/`, `world/`, `place/`, `packages/`, `acts/`, `chat/` the table's chat with the master, `dice/`, `help/`, and `launcher/` the launcher's page, an entry of its own); its style in [style/](../src/dashboard/style/). The page is one app: its folders group its parts and need no `index.ts`.
- **A game's concept**: not in `src/`, but data in a game system or an extension, their code only when data is not enough.
- **Folders, not prefixes**: a file name never repeats its folder (`pages/file.ts`, not `pages/page-file.ts`); a module that grows splits into subfolders, each with its `index.ts`.
