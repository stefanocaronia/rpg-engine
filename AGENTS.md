# rpg-engine — guide for development agents

**rpg-engine** is a TypeScript library with a CLI (`rpg`) and an MCP server that let any LLM run a tabletop RPG campaign. The model invents and narrates; the tool remembers, computes and rolls the dice.

This file is about **developing** rpg-engine. The instructions for **playing** (narrator, world keeper, companions…) are part of the product and live in `src/agents/`: see "Development vs game".

## Read first

- `project/SPEC.md`: what we are building and why (goals, decisions, architecture, phases). It is the source of truth for design decisions: when one changes, update it in the same session.
- `project/` is **local only** and gitignored on purpose: never force-add it. If it is missing (e.g. in a fresh clone), ask the maintainer.

## Layout

| Path | Content | GitHub | npm |
|---|---|---|---|
| `AGENTS.md`, `CLAUDE.md` | this guide (`CLAUDE.md` only imports it) | yes | no |
| `project/` | spec, plan, decisions (in Italian) | no | no |
| `docs/` | user guide | yes | no |
| `src/` | core, rules modules (`dnd5e` first), CLI, MCP server, dashboard | yes | built into `dist/` |
| `src/agents/` | game instructions: roles, commands, templates for the campaign files | yes | copied into `dist/agents/` |
| `test/` | tests | yes | no |
| `sandbox/`, `tmp/` | output of automated tests | no | no |

npm ships only what `files` in `package.json` lists (`dist/`), plus `README.md` and `LICENSE`.

## Development vs game

1. **No "magic" names for game files in the repo.** Nothing under `src/agents/` is called `AGENTS.md` or `CLAUDE.md`, and nothing sits in `.agents/` or `.claude/`: hosts load those on their own, and a development agent would take the game master's instructions as its own. The files get their real names only when `rpg init` writes them into a campaign (`AGENTS.md`, `CLAUDE.md`, `.agents/`).
2. **Playtests with an LLM run in a campaign outside the repo.** Claude Code also reads the `CLAUDE.md` files of parent folders, so inside the repo development and game instructions would mix. `sandbox/` is for automated tests only.

## Conventions

- TypeScript on Node ≥ 22; schemas with zod; tests with vitest.
- Code, comments, commit messages and public docs in English. Game content uses the campaign language.
- Never keep the repo under a path containing `&`: on Windows, npm's `.cmd` shims truncate the path and `npm run` fails.
- Credentials (D&D Beyond session cookies, LLM API keys) never go in the repo or in a campaign: they belong in the user's local config (`~/.rpg-engine/`) or the OS keychain.
