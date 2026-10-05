# Playtests

A playtest plays a scenario as with a real user: an AI master in Claude Code that knows only the campaign and the core instructions, and an AI player that sees only the master's text. After the last session the player answers the questionnaire and the team fills the checklist. Scenarios are played again at the end of every phase.

| Path | Content |
|---|---|
| `run-playtest.mjs` | plays one session of a scenario, or asks the questionnaire |
| `count-playtest.mjs` | counts the numbers of a run, the same way every time |
| `checklist.md` | the fixed checklist, filled after every run |
| `questionnaire.md` | the player's questionnaire, after the last session |
| `players/` | player profiles |
| `01-guadoscuro/` | a scenario: `start.md` and the pages it starts from (`world/`) |

Only scenarios live here, never results or quotes from a dialogue. The results of a run (the filled checklist, the answers to the questionnaire, the numbers to compare between phases) go to the private repo, in `private/project/playtest/<scenario>-<date>.md`, such as `01-guadoscuro-2026-10-04.md`; the transcripts stay in the run's output folder.

## Prepare

1. Commit everything, and `npm link` once: the run refuses uncommitted changes, builds `dist/` from the commit and checks that the global `rpg` is that build.
2. Make the campaign as the scenario's `start.md` says, in a folder outside the repo and the home folder, with no `&`: one folder per run, `F:\sviluppo\runs\rpg-engine\<date>\<n>\`, such as `F:\sviluppo\runs\rpg-engine\2026-10-03\1\guadoscuro`. The master sees the path, and Claude Code loads the instructions of every folder above it. Every run starts from a new campaign.
3. Put the output folder next to the campaign, such as `F:\sviluppo\runs\rpg-engine\2026-10-03\1\results`: a run folder can then be deleted or archived whole.
4. Try it first on a throwaway campaign and output folder, with `--max 1 --hard 2`.

## Run

From the repo, in a terminal of your own rather than inside a Claude Code session:

```
node playtests/run-playtest.mjs --campaign F:\sviluppo\runs\rpg-engine\2026-10-03\1\guadoscuro --profile playtests/players/marco.md --out F:\sviluppo\runs\rpg-engine\2026-10-03\1\results --session 1 --first "Ciao! Possiamo cominciare?" --max 50
node playtests/run-playtest.mjs --campaign F:\sviluppo\runs\rpg-engine\2026-10-03\1\guadoscuro --profile playtests/players/marco.md --out F:\sviluppo\runs\rpg-engine\2026-10-03\1\results --session 2 --first "Ciao, riprendiamo?" --max 15
node playtests/run-playtest.mjs --profile playtests/players/marco.md --out F:\sviluppo\runs\rpg-engine\2026-10-03\1\results --questionnaire playtests/questionnaire.md
```

Then count the numbers, for B12 and the report: `node playtests/count-playtest.mjs <results folder> playtests/01-guadoscuro/world`.

Each session is a new master chat; the player keeps one chat for the whole run. The organizer's notes reach only the player and are kept in `dialogue.md`: the opening of each evening and, once, at `--max` player messages, that it is getting late. A session stops when the player ends it, at `--hard` messages (default `--max` + 10), on an error, or when the master's session passes `--budget` dollars (default 15).

A run only goes forward: each session is played once, in the same output folder, and session 2 continues the player's chat of session 1. A session that fails is not resumed: start a new run, with a new campaign and a new output folder.

Cost: a run of 50 + 15 messages is about 6–9 $ at list prices, or quota with a subscription. Writing the pages, the trial run and reading the results for the checklist cost extra. `end.json` records the master's cost for the session and the player's for the run so far.

## Checks

Before the first turn the run stops unless:

- the repo has no uncommitted changes, `npm run build` succeeds, and the `rpg` on the PATH is npm's global link to this repo's `dist/cli.js`;
- the campaign and the output folder are outside the home folder and the repo, and neither holds the other;
- the campaign's `AGENTS.md` is this commit's `instructions/start.md`, its `CLAUDE.md` holds only `@AGENTS.md`, and it has no `.claude/` or `CLAUDE.local.md`;
- session 1 has a new output folder and a campaign never played: nothing in its `log.jsonl` after `campaign-created`, and no page with `role: pc`;
- session 2 continues the player's chat and the campaign of session 1, which stopped in play (player, hard cap or budget), not on an error or a broken isolation;
- `/context` (free) lists as memory files, of any type, exactly the campaign's `CLAUDE.md` and `AGENTS.md`, only the `rpg` server, and no custom agents.

At every turn it checks that `rpg` is connected, with the planned model and `dontAsk`; otherwise it stops, and the run is void.

## What the master gets

| Flag | Why |
|---|---|
| `--setting-sources project,local` | none of the developer's settings, `~/.claude/CLAUDE.md`, agents or plugins |
| `--strict-mcp-config --mcp-config .mcp.json` | only the `rpg` server, approved without a person |
| `--settings {"autoMemoryEnabled":false}` | no notes outside the campaign: session 2 starts from the files alone |
| `--permission-mode dontAsk --allowedTools mcp__rpg WebSearch WebFetch` | all of Claude Code's tools, as for a user, but nobody approves: any other write or command is denied, and the denial recorded |
| `--model claude-opus-5-5`, `--session-id`, then `--resume` | the same master at every phase; one chat per session |

Claude Code runs without the `CLAUDE*` variables of the shell, so a Claude Code session the run is started from cannot leak into it.

The player is Claude Code (`claude-sonnet-5-5`) with its profile as the whole system prompt, no tools, and a JSON answer: its message and whether it ends the evening.

## Output

Per session, in `session-N/`:

- `dialogue.md`: P1, M1, the organizer's notes, P2…
- `turns/M*.jsonl`: each master turn as Claude Code streamed it, subagents included: tool calls, whole results, `permission_denials`, cost. Every count comes from here.
- `context.md`, `meta.json` (commit, the `rpg` build, versions, models, the master's chat, options), `end.json` (why it stopped: player, hard cap, budget, error or isolation; messages; costs).
- `campaign-after/`: the campaign after the session, `log.jsonl` included.

Per run: `player-session.txt`, `player-turns.jsonl`, `questionnaire-answers.md`.
