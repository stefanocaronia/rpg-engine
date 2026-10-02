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
| `systems/` | built-in game systems (e.g. `5e`): one per campaign, required | yes | yes |
| `extensions/` | built-in extensions (settings, adventures, features such as tarot, house rules): optional | yes | yes |
| `instructions/` | game instructions for the AI, installed into each campaign | yes | yes |
| `test/` | tests | yes | no |
| `playtests/` | playtest scenarios: player profiles, starting points, checklists | yes | no |
| `sandbox/`, `tmp/` | output of automated tests | no | no |

## Commands

- `npm run build`: compile `src/` into `dist/`.
- `npm test`: run the tests.
- `npm run format`: format the code (ESLint fixes, then dprint).
- `npm run lint`: check the formatting, as CI does.
- `npm link`: install the development build as the global `rpg` command.

## Development vs game

1. **No "magic" names for game files in the repo.** Nothing under `instructions/`, `systems/`, `extensions/` or `playtests/` is called `AGENTS.md` or `CLAUDE.md`, and nothing sits in `.agents/` or `.claude/`: hosts load those on their own, and a development agent would take the game master's instructions as its own. The files get their real names only when they are installed into a campaign.
2. **Playtests with an AI run in a campaign outside the repo.** Claude Code also reads the `CLAUDE.md` files of parent folders, so inside the repo development and game instructions would mix.

## Architecture rules

- **Keep it simple.** The core only does what an AI is weak at: memory, dice, bookkeeping, time, maps and positions, secrets, text lookup.
- **Don't encode game rules.** Ruling is the AI's job, with the exact text at hand.
- **Core, system or extension?** Core code must make sense for a game very different from D&D. Anything that names a game's concepts (HP, spell slots, advantage) belongs in a system or an extension, as data; their code only when data is not enough.
- **Data is object-oriented and SOLID.** Each page describes only itself. A relation lives in whoever holds it: who contains, owns or knows something keeps the list, with links, in its frontmatter; a thing never records where it is, who has it or who knows it. The engine works out where a thing is by climbing its containers. Systems and extensions add types and fields without changing the core ones.
- Every operation is a command defined once, from which the CLI, the MCP server and the dashboard API are generated. Every command validates its input, checks the caller's role and, when it changes something, logs an event.

## Coding guidelines

Clean, compact, ordered code that is easy to understand.

**Design first**
- Think the architecture before writing code: which module owns the change, its public API, its dependencies. For anything non-trivial, propose the design to the maintainer and wait for approval.
- Each module (a folder under `src/`, such as `dice/`) does one job, exposes a small API from its `index.ts` and depends only on core utilities: never on commands, the CLI or other modules. Commands are the glue between modules.
- SOLID: one responsibility per module and function; add behaviour with new modules and commands instead of bending working ones; inject what comes from outside (randomness, time, folders) through `Context`.
- No over-engineering: the simplest code that solves today's need, with no speculative options, layers or abstractions.

**Formatting** (applied by `npm run format` and on save in VS Code with the recommended extensions; checked by `npm run lint` and CI)
- 4-space indentation (2 in JSON and YAML, as npm writes them), lines up to 240 characters, double quotes, semicolons.
- Braces on their own line for classes, interfaces, functions and methods; on the same line for `if`, `else`, loops, `switch`, `try` and arrow functions, with `} else {` on one line.
- Braces always, even around a single statement.
- A blank line before and after every block statement (`if`, loops, `switch`, `try`); never more than one blank line in a row.

**Code**
- Extract a function when a block becomes complex or is needed twice; prefer well-named functions to sections marked by comments.
- Clear, descriptive names; no abbreviations or cryptic names (`context`, not `ctx`), except loop indexes.
- camelCase for variables, functions and constants; PascalCase for types, interfaces and classes, without an `I` prefix; no underscores or hyphens in identifiers. File names in kebab-case.
- Public API first in a file, private helpers below it.
- Let TypeScript infer local types; annotate parameters and return types of exported functions.
- Relative imports use the `.ts` extension; the build rewrites them to `.js`.
- Comments in English, one or two lines at most: the code should explain itself. A one-line `/** */` on exported functions and types when the name is not enough.
- Error messages say what went wrong and how to fix it: an AI reads them.
- Use our core utilities before writing new helpers.
- Test every module through its public API, with randomness and time injected.

## Tools and checks

- **CodeGraph** (`@colbymchenry/codegraph`, optional, set up per person): when `.codegraph/` exists, use it before Grep/Read chains for structure questions (who calls X, what Y reaches, what breaks if Z changes), then confirm in the file. After editing, run `codegraph sync .` before asking it about the changed files. Agents never run `init`, `index` or `uninit` for the maintainer.
- **Jev** (`mcp__jev__*`, optional, set up per person): before a commit, `jev_gate` with the diff, the claims of the commit message and the real test output; before reporting results, `jev_verify` the claims against the evidence. Fix or drop unsupported claims. Without Jev, say so and go on.
- **Regression check after every addition or change**: build and run all tests; check the callers and impact of every changed symbol with CodeGraph; review the diff for regressions, unhandled `undefined`, nondeterminism, simplicity and these guidelines, and fix what you find. When it matters, give the maintainer a short checklist to verify the behaviour.

## Conventions

- TypeScript on Node ≥ 22; zod; yaml; vitest; few dependencies.
- Code, comments, commit messages, public docs, command names, file names and config keys in English; game content in the campaign language.
- Secret parts of a page go in a `> [!secret]` block (Obsidian callout).
- Tests use Ironsworn (CC-BY-4.0) next to `5e`, to keep the core generic.
- Never keep the repo under a path containing `&`: on Windows, npm's `.cmd` shims truncate the path and `npm run` fails.
- Credentials never go in the repo or in a campaign: they belong in the OS keychain.
- **Licensing and trademarks.** The repo and the npm package hold only original or open-licensed content: for 5e, only SRD 5.1 and 5.2 (CC-BY-4.0) with the required attribution, and compatibility stated only as "compatible with fifth edition". No Wizards of the Coast trademarks in names or presentation, no non-SRD content (Forgotten Realms, non-SRD monsters, art), not even in tests. These rules cover only what we ship: never restrict what a user's AI knows, searches or reads.
