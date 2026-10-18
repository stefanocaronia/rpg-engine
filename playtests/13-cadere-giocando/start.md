# 13 Cadere giocando: a hard fight at 3rd level, nobody down at the start

The ford of 08 with its map, the party at 3rd level at full strength, and four orcs of the Broken Tooth ambushing it: 400 XP, × 2 for four, 800, close to hard (900). A greataxe hits for 1d12 + 3, 2d12 + 3 on a critical: the player's character can fall in play, as only Codex's run of 12 has shown, and once in 12 he was healed before his turn. The orcs want heads, not prisoners: they go for whoever bears a holy symbol and whoever hurts them most, and finish whoever falls when nobody stands over them. That is their motive, written on the place: the master plays it honestly, with nothing to make anyone fall or to save them. The run wants to see blows on someone at 0 (a failure, two for a critical, as the engine counts), the player's death save with the button (D-460), and, if it comes, an instant death.

Player: `players/marco.md`, with [brief.md](brief.md). This file never goes into the campaign.

## The campaign

As `08-il-guado-del-mulino/start.md` says, from this folder's `world/`, with `rpg advance --to "day 3, 19:00"` and without putting anyone at 0. `world/`: 15 pages; `rpg validate` finds no problems; `status` shows the four at full hit points at the ford.

## The session

One evening: «Ciao! Siamo al guado, cominciamo?», with `--prepared playtests\13-cadere-giocando\brief.md --max 30 --dashboard`. Then the questionnaire, and the checklist: D1–D6 and P1–P4 of 06, and the moments below.

## What to watch

| | Moment | The rule, and the tool |
|---|---|---|
| K1 | Corrado falls | Unconscious from the engine; the fall told as a moment of its own |
| K2 | His turns at 0 | `scene next` says to ask his death save with `ask`; the player presses it on the heartbeat card; the engine writes it (D-460) |
| K3 | A blow on someone at 0 | `change … --damage`: the engine counts a failure; a critical from 5 feet counts two, the master adds the second; three failures dead |
| K4 | Instant death | Damage past 0 at least the maximum: the engine says the death |
| K5 | A companion at 0 | Its death save from the engine as its turn starts (DIE-5), told unnamed with mentor off |
