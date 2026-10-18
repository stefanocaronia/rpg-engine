# 15 Lingua e lunghezza: the same campaign in English and in German, three evenings each

The campaign of 13, the ford below the burnt mill and the orcs of the Broken Tooth at 3rd level, translated: `en/world/` in English, `de/world/` in German, with the names of each language. Each is played for three evenings by a player of its language, `players/sam.md` in English and `players/jonas.md` in German. The run wants to see:
- the master playing in the campaign's language all the way, and the dashboard's words in it (the page's `aria.yaml` with no Italian, the 5e's words from `systems/5e/words/<code>.yaml`);
- a new master who resumes in the middle of a fight, from the files alone: the first evening is cut short by its hard cap during the ambush at the ford (in 02 it was a "no": facts and positions wrong);
- continuity from one evening to the next: names, what people said, what happened, the clocks.

Player: `players/sam.md` with [en/brief.md](en/brief.md), or `players/jonas.md` with [de/brief.md](de/brief.md). This file never goes into the campaign.

## The campaigns

As `08-il-guado-del-mulino/start.md` says, from `en/world/` with `--name "The Mill Ford" --language en` or from `de/world/` with `--name "Die Mühlfurt" --language de`, with `rpg advance --to "day 3, 19:00"` and without putting anyone at 0. Each `world/`: 15 pages; `rpg validate` finds no problems; `status` shows the four at full hit points at the ford.

## The evenings

| Evening | English | German | Options |
|---|---|---|---|
| 1: the ambush, cut short | «Hi! We're at the ford, shall we start?» | «Hallo! Wir sind an der Furt, fangen wir an?» | `--prepared <code>\brief.md --max 4 --hard 4 --dashboard` |
| 2: a new master in the fight | «Hi, shall we pick up where we left off?» | «Hallo, machen wir weiter?» | `--session 2 --max 25 --dashboard` |
| 3: a later evening | «Hi, I'm back, shall we go on?» | «Hallo, ich bin wieder da, machen wir weiter?» | `--session 3 --max 20 --dashboard` |

The hard cap of evening 1 stops it after the player's fourth message, in the first rounds of the fight. If the fight is already over, the run goes on all the same, and the report says so. After evening 3, the questionnaire, and the checklist: D1–D6 and P1–P4 of 06, and the moments below.

## What to watch

| | Moment | What is right |
|---|---|---|
| T1 | The language | Every message of the master in the campaign's language: the story, the brackets, the rolls; the spells and rules named as that language's fifth edition names them; no Italian, no English in the German campaign |
| T2 | The dashboard | Its words, the 5e's words on the sheet and the turn's marks, the dates, all in the language; nothing left in Italian or as a raw key |
| T3 | The resume in the fight | The new master reads the open scene with `show`: the order, whose turn, the hit points, effects and concentration; the positions from the map; asks the player only what the files lack; nothing reinvented |
| T4 | Continuity | Names, what people said, what was found, the fallen and the fled, from evening to evening; the clocks moved by the time passed |
| T5 | The engine's lines | What the tools return is in English for the master (it is the engine's language); what the player sees is in theirs |
