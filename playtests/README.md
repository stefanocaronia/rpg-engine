# Playtests

A playtest plays a scenario as with a real user: an AI master in Claude Code that knows only the campaign and the core instructions, and an AI player that sees only the master's text. After the last session the player answers the questionnaire and the team fills the checklist. Scenarios are played again at the end of every phase.

| Path | Content |
|---|---|
| `run-playtest.mjs` | plays one session of a scenario, or asks the questionnaire |
| `codex-master.mjs` | the master played by Codex instead of Claude Code (`--master-host codex`) |
| `one-answer.mjs` | one answer from the player to a question that shows both on the page and in the chat's form |
| `page-player.mjs` | the dashboard's page in a run with `--dashboard`: the master's questions there answered by the player and clicked, the scenario's moments, what the page showed |
| `count-playtest.mjs` | counts the numbers of a run, the same way every time |
| `checklist.md` | the fixed checklist, filled after every run |
| `questionnaire.md` | the player's questionnaire, after the last session |
| `players/` | player profiles |
| `01-guadoscuro/` | a scenario: `start.md` and the pages it starts from (`world/`) |
| `02-cripta-del-culto/` | a scenario that starts in play, with the campaign prepared: `start.md`, `world/`, and `brief.md`, what the player remembers |
| `04-tre-settimane/` | prepared too: three weeks of downtime with two clocks at different paces |
| `03-corvara/` | a prepared scenario of a six-day journey by road, river and heath, then three weeks of downtime |
| `05-vena-bianca/` | prepared: a party of four classes at 5th level, a day's road to a mine, two fights, the rests and the village: what the engine counts on the sheet |
| `05b-pozzo-allagato/` | the world of 05 from the mine's yard, with harder fights: two ghouls, a wyrmling whose breath recharges, a cloak to attune to |
| `06-la-forra-dell-orso/` | the party of 05 at 3rd level against an owlbear in a gorge with a map: falling, death saves, stabilizing, healing, and positions |
| `07-il-pianoro-dei-lupi/` | the party of 06 at dawn on a plateau with a map, Lucia already at 0 among wolves: the dying point from the first turn |
| `08-il-guado-del-mulino/` | the player's character down at a ford, with an ogre and wolves on a map, and the master at low effort |
| `09-l-ossario-dei-pastori/` | a dark ossuary with a map: ghouls, a shadow and a dust mephit, a companion falling and stabilized, a cloak to attune and wear |
| `10-il-mago-a-terra/` | the plateau of 07 with Tobia already at 0 among goblins, and a cloak worn but not attuned: a companion's death saves and Stable |
| `11-senza-magia/` | a short scene on the plateau: Tobia at 0 with one failure, no healing left but Lucia's kit, archers on Corrado's unbound cloak: Stable, and the cloak asked about |
| `12-altri-host/` | the gorge of 06 with Codex as the master |
| `13-cadere-giocando/` | the ford of 08 at full strength against four orcs who take heads: the player's character falling in play |
| `14-classi-e-livello-7/` | a new party at 7th level, paladin, druid, ranger and warlock, against a mage in a ruined tower: Wild Shape, Divine Smite, the charges of a wand, reactions, and the level-up to 8th |

Only scenarios live here, never results or quotes from a dialogue. The results of a run (the filled checklist, the answers to the questionnaire, the numbers to compare between phases) go to the private repo, in `private/project/playtest/<scenario>-<date>.md`, such as `01-guadoscuro-2026-10-04.md`; the transcripts stay in the run's output folder.

## Prepare

1. Commit everything, and `npm link` once: the run refuses uncommitted changes, builds `dist/` from the commit and checks that the global `rpg` is that build. A run of several sessions checks again before each: while it plays, nothing else may change the checkout, so run it from a worktree of its own when other work goes on there.
2. Make the campaign as the scenario's `start.md` says, in a folder outside the repo and the home folder, with no `&`: one folder per run, `<runs>\<date>\<n>\`, where `<runs>` is a folder of yours, such as `<runs>\2026-10-03\1\guadoscuro`. The master sees the path, and Claude Code loads the instructions of every folder above it. Every run starts from a new campaign.
3. Put the output folder next to the campaign, such as `<runs>\2026-10-03\1\results`: a run folder can then be deleted or archived whole.
4. Try it first on a throwaway campaign and output folder, with `--max 1 --hard 2`.

## Run

From the repo, in a terminal of your own rather than inside a Claude Code session:

```
node playtests/run-playtest.mjs --campaign <runs>\2026-10-03\1\guadoscuro --profile playtests/players/marco.md --out <runs>\2026-10-03\1\results --session 1 --first "Ciao! Possiamo cominciare?" --max 50
node playtests/run-playtest.mjs --campaign <runs>\2026-10-03\1\guadoscuro --profile playtests/players/marco.md --out <runs>\2026-10-03\1\results --session 2 --first "Ciao, riprendiamo?" --max 15
node playtests/run-playtest.mjs --profile playtests/players/marco.md --out <runs>\2026-10-03\1\results --questionnaire playtests/questionnaire.md
```

Then count the numbers, for B12 and the report: `node playtests/count-playtest.mjs <results folder> playtests/01-guadoscuro/world`.

Each session is a new master chat; the player keeps one chat for the whole run. The organizer's notes reach only the player and are kept in `dialogue.md`: the opening of each evening and, once, at `--max` player messages, that it is getting late. A player who ends the evening before that note writes the message again, once, without ending it: the first stays in `dialogue.md`, and the master never reads it. A session stops when the player ends it, at `--hard` messages (default `--max` + 10), on an error, or when the master's session passes `--budget` dollars (default 15).

A run only goes forward: each session is played once, in the same output folder, and each later session continues the player's chat of the one before, even after a questionnaire. A session that fails is not resumed: start a new run, with a new campaign and a new output folder.

To try a moment again, a run can start from a save: `--from` with the `session-N` folder of an earlier run copies its `campaign-after/` into `--campaign`, a new folder, with the host files that this commit's `rpg init` writes, and plays session N+1 in a new `--out`. The player is a new chat that gets the earlier evenings' dialogues as its memory with its first turn, from the runs the save came through when it was itself a run from a save; the counts start from the saved campaign.

```
node playtests/run-playtest.mjs --from <runs>\2026-10-03\1\results\session-2 --campaign <runs>\2026-10-03\2\guadoscuro --profile playtests/players/marco.md --out <runs>\2026-10-03\2\results --first "Ciao, riprendiamo?" --max 3
```

A scenario may start in play, from a campaign its `start.md` prepares (settings, characters, the date): `--prepared` with the scenario's brief accepts it for session 1, and gives the brief to the player with the first turn, as what they remember of their character. Give it again to every run from a save of that scenario.

With `--dashboard` the session is played with the dashboard open, as in the desktop app (phase 3). The master's chat is one Claude Code process for the whole session, its prompts sent as a stream, so that the rpg server and the page it serves live from turn to turn. The first link to the dashboard in a tool's result opens the page in the Chrome installed, at 1280 in the dark theme. A question the master asks there goes to the player, with the master's words so far, and the player's answer is clicked on the page: a button, their own words, or a square of the map. A question that does not show within 10 s, or that the player or the click fails, is answered through the page's request instead, and said in `page/console.txt`. The same question shows in the chat's form too: the player is asked once, by whichever of the two gets it first, and the other gives that answer by its index, as both list the choices in the same order with other words ([one-answer.mjs](one-answer.mjs), meeting in the session's `answers/`); the form never steps aside within 1.5 s, or the server would take forms away for the session. The player reads each paragraph of the master's once: a question shows the words of the turn not yet read, and the end of the turn only the rest. `--moments` with the scenario's moments file does, before a player's message, what the page's Settings and Notes do (a setting, a note, a note shared) and tells the player. `--uncommitted` tests the working tree as it is, uncommitted changes included: `meta.json` gives the commit and the tree, and `tested.diff` the changes.

Cost: a run of 50 + 15 messages is about 6–9 $ at list prices, or quota with a subscription. Writing the pages, the trial run and reading the results for the checklist cost extra. `end.json` records the master's cost for the session and the player's for the run so far.

## Checks

Before the first turn the run stops unless:

- the repo has no uncommitted changes, unless `--uncommitted` says to test them, `npm run build` succeeds, and the `rpg` on the PATH is npm's global link to this repo's `dist/cli.js`;
- the campaign and the output folder are outside the home folder and the repo, and neither holds the other;
- the campaign's `AGENTS.md`, `CLAUDE.md` and `.claude/settings.json` are what this commit's `rpg init` writes (the start lines, the import, auto memory off), and it has nothing else in `.claude/` and no `CLAUDE.local.md`;
- session 1 has a new output folder and a campaign never played: nothing in its `log.jsonl` after `campaign-created`, and no page with `role: pc`; with `--prepared`, no scene opened and no roll;
- a later session continues the player's chat and the campaign of the session before, which stopped in play (player, hard cap or budget), not on an error or a broken isolation;
- a run from a save has a new output folder and a new campaign folder, and starts after a session that stopped in play;
- `/context` (free) lists as memory files, of any type, exactly the campaign's `CLAUDE.md` and `AGENTS.md`, only the `rpg` server, and no custom agents.

At every turn it checks that `rpg` is connected, with the planned model and `dontAsk`; otherwise it stops, and the run is void.

## What the master gets

| Flag | Why |
|---|---|
| `--setting-sources project,local` | none of the developer's settings, `~/.claude/CLAUDE.md`, agents or plugins; the campaign's own settings turn auto memory off, so session 2 starts from the files alone (D-242) |
| `--strict-mcp-config --mcp-config .mcp.json` | only the `rpg` server, approved without a person |
| `--permission-mode dontAsk --allowedTools mcp__rpg WebSearch WebFetch` | all of Claude Code's tools, as for a user, but nobody approves: any other write or command is denied, and the denial recorded |
| `--settings` with an `Elicitation` hook | the rpg server's buttons (`ask`) go to the AI player, who reads what the master wrote so far and presses one, as in a chat that shows them: [answer-form.mjs](answer-form.mjs); each press is in `dialogue.md` as **Buttons**, and one that fails in `forms-errors.txt` (D-148, D-246) |
| `--master-host codex` | Codex as the master: `codex exec`, resumed turn by turn, with a Codex home of its own in the output folder (the login and the campaign trusted), so that it reads the campaign's AGENTS.md and `.codex/config.toml`; its events beside each turn (`M3.codex.jsonl`) and, in Claude Code's shape, in the turn's file; no dashboard, as each turn starts a new rpg server; no cost, Codex's tokens instead |
| `--master-effort`, as `effortLevel` in those settings | the master's effort, when the run asks for one: low to max; Claude Code's own otherwise |
| `--model claude-opus-5-5`, `--session-id`, then `--resume` | the same master at every phase; one chat per session |

Claude Code runs without the `CLAUDE*` variables of the shell, so a Claude Code session the run is started from cannot leak into it.

The player is Claude Code (`claude-sonnet-5-5`) with its profile as the whole system prompt, read again at every turn (a profile changed between sessions reaches the player), no tools, and a JSON answer: its message and whether it ends the evening.

## Output

Per session, in `session-N/`:

- `dialogue.md`: P1, M1, the organizer's notes, P2…
- `turns/M*.jsonl`: each master turn as Claude Code streamed it, subagents included: tool calls, whole results, `permission_denials`, cost. Every count comes from here.
- `context.md`, `meta.json` (commit, the `rpg` build, versions, models, the master's chat, options), `end.json` (why it stopped: player, hard cap, budget, error or isolation; messages; costs).
- `campaign-after/`: the campaign after the session, `log.jsonl` included.
- With `--dashboard`, `page/`: after each master turn a screenshot and the accessibility tree of Party, Scene and, in a fight, Combat (`M3-scene.png`, `M3-scene.aria.yaml`); those of each moment; `asked.jsonl`, each question on the page with the player's answer and how long it took to show and to be answered; `console.txt`, the page's errors and warnings and what the run had to do itself. In `dialogue.md`, **Page** says what happened on the page.
- With `--uncommitted`, `tested.diff`.
- `questionnaire-answers.md`, when the questionnaire followed the session.

Per run: `player-session.txt`, `player-turns.jsonl`.
