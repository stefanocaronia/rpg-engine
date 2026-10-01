# rpg-engine — guide for development agents

**rpg-engine** is a toolbox that lets a high-level AI run a tabletop RPG campaign: the AI invents, plays and rules; the tool remembers, rolls the dice and keeps the accounts. A campaign is a folder of markdown files.

This file is about **developing** rpg-engine. The instructions for **playing** are part of the product: see "Development vs game".

## Read first

- `project/README.md`: index of the project docs (in Italian). `project/PLAN.md` says what comes next.
- The project docs hold only what the maintainer has decided, written briefly. Proposals go to `project/DECISIONI.md` under "Da decidere" until the maintainer decides. No premature detail (code, examples, formats, diagrams) before the work it belongs to.
- `project/IDEE.md`: the maintainer's idea inbox. When it has entries, fold each idea into the right document, delete it from `IDEE.md`, and tell the maintainer what changed.
- `project/` is **local only** and gitignored on purpose: never force-add it. `project/archivio/` is history. If `project/` is missing (e.g. in a fresh clone), ask the maintainer.

## Layout

| Path | Content | GitHub | npm |
|---|---|---|---|
| `AGENTS.md`, `CLAUDE.md` | this guide (`CLAUDE.md` only imports it) | yes | no |
| `project/` | project docs (Italian) | no | no |
| `docs/` | user guide | yes | no |
| `src/` | core, CLI, MCP server, dashboard | yes | built into `dist/` |
| `packs/` | built-in modules (e.g. `5e`) and the game instructions | yes | yes |
| `test/` | tests | yes | no |
| `sandbox/`, `tmp/` | output of automated tests | no | no |

## Commands

- `npm run build`: compile `src/` into `dist/`.
- `npm test`: run the tests.
- `npm link`: install the development build as the global `rpg` command.

## Development vs game

1. **No "magic" names for game files in the repo.** Nothing under `packs/` is called `AGENTS.md` or `CLAUDE.md`, and nothing sits in `.agents/` or `.claude/`: hosts load those on their own, and a development agent would take the game master's instructions as its own. The files get their real names only when they are installed into a campaign.
2. **Playtests with an AI run in a campaign outside the repo.** Claude Code also reads the `CLAUDE.md` files of parent folders, so inside the repo development and game instructions would mix.

## Architecture rules

- **Keep it simple.** The core only does what an AI is weak at: memory, dice, bookkeeping, time, secrets, text lookup.
- **Don't encode game rules.** Ruling is the AI's job, with the exact text at hand.
- **Core or module?** Core code must make sense for a game very different from D&D. Anything that names a game's concepts (HP, spell slots, advantage) belongs in a module, as data; module code only when data is not enough.
- Every operation is a command defined once, from which the CLI, the MCP server and the dashboard API are generated. Every command validates its input, checks the caller's role and logs an event.

## Conventions

- TypeScript on Node ≥ 22; zod; vitest; few dependencies.
- Code, comments, commit messages, public docs, command names, file names and config keys in English; game content in the campaign language.
- Secret parts of a page go in a `> [!secret]` block (Obsidian callout).
- Tests use Ironsworn (CC-BY-4.0) next to `5e`, to keep the core generic.
- Never keep the repo under a path containing `&`: on Windows, npm's `.cmd` shims truncate the path and `npm run` fails.
- Credentials never go in the repo or in a campaign: they belong in the OS keychain.
- **Licensing and trademarks.** The repo and the npm package hold only original or open-licensed content: for 5e, only SRD 5.1 and 5.2 (CC-BY-4.0) with the required attribution, and compatibility stated only as "compatible with fifth edition". No Wizards of the Coast trademarks in names or presentation, no non-SRD content (Forgotten Realms, non-SRD monsters, art), not even in tests. These rules cover only what we ship: never restrict what a user's AI knows, searches or reads.
