# 17 Un'avventura a metà: an adventure brought into a campaign under way

The first playtest of adventures as packages, piece 1 (D-483, ADV-1–ADV-7). The party of 11 on the evening of day 6, at the Osteria della Lanterna in Roccalba: the goblins of the plateau driven off this morning, everyone rested and safe, no scene open. The player says a friend gave him an adventure and gives the path of its folder. The master installs it, reads its opening and the pages it names, puts its start into the world, and brings a hook into the story: the adventure begins only when the player takes it. A short evening of 12–15 messages, that may end on the road or at the adventure's first place.

Player: `players/marco.md`, with [brief.md](brief.md). This file and `adventure/` never go into the campaign: the adventure is copied next to it.

## The adventure

`adventure/`, «Il pozzo che sussurra» 1.0.0, original, in Italian, CC BY 4.0, for 5e at 3rd level, 1–2 sessions: `adventure.yaml` and 10 pages in `world/` (1 topic, the opening; 2 places; 3 characters; 1 creature, derived from the SRD Specter; 1 quest, planned; 2 events, planned). Its start, Fontebassa, is a hamlet half a day's walk from a larger village, in no place of its own: the master must put it in the world. Its events are dated day 2, 18:00 and day 3, 23:00; one page has a date in its text (day 5). No page has the name of one of the campaign's.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$run = "<runs>\2026-10-21\1"
$campaign = "$run\lanterna"
rpg init $campaign --name "Un'avventura a metà" --system 5e --language it --difficulty normal --lethality dice
Copy-Item -Recurse -Force playtests\17-un-avventura-a-meta\world\* $campaign\world
Copy-Item -Recurse playtests\17-un-avventura-a-meta\adventure "$run\il-pozzo-che-sussurra"
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions "made by the master"; rpg config lines none; rpg config veils none; rpg config advancement xp; rpg config mentor off
rpg config calendar-start "day 1"; rpg config pictures none
rpg mode "session zero"; rpg mode play
rpg advance --to "day 6, 20:00" --why "La cena all'osteria, dopo i goblin del pianoro"
rpg validate; rpg status; rpg package list
Pop-Location
```

- The settings of 11: lethality dice, saves checkpoint, mentor off; the master at its own effort.
- `world/`: 15 pages, those of 11 without the cloak and the goblins, the party at the Osteria; `rpg validate` finds no problems; `status` shows day 6, 20:00, the four at full hit points with all their slots, at the Osteria della Lanterna; `package list` shows no adventure.
- The adventure sits beside the campaign and the results, `$run\il-pozzo-che-sussurra`, outside both: the master reaches it only through `package install`.

## The session

`--prepared playtests\17-un-avventura-a-meta\brief.md --max 13 --hard 15 --dashboard`, first message, with the folder's whole path in place of `<path>`: «Ciao! Un amico mi ha passato un'avventura, Il pozzo che sussurra: è nella cartella <path>. La giochiamo col mio gruppo?». After the session, `rpg package list` in `campaign-after/`. Then the checklist, on the moments below.

## Install, by hand

What `package install <path>` should say, to compare: installed «Il pozzo che sussurra» 1.0.0 by Bea Ruggeri (CC BY 4.0), with its about; 1 topics, 2 places, 3 characters, 1 creatures, 1 quests, 2 events; written for level 3; its content; its dates moved 5 days, the first [[Il pozzo murato]] on day 7, 18:00; 1 date in its text, to count from today; show [[Apertura del pozzo che sussurra]] and the pages it names; it starts in [[Fontebassa]], in no place of the world yet. In this world no page holds Roccalba: places stand by a `position` and paths with `stops`, as the plateau does.

## What to watch

| | Moment | What is right |
|---|---|---|
| A1 | The yes | The install comes after the player's request of P1, never before it; at most one question back, as at a table («la prossima è questa?»), and none on a form if the request is plain |
| A2 | The install | One `package install` with the path the player gave, no other way to read the folder (no denied Read in `permission_denials`); refused or not, the master tells the player in a line, without the engine's words |
| A3 | Reading before narrating | `show` of the opening and of the six pages it says to read first, before the first line of the adventure's fiction; the install's message tells nothing of the adventure |
| A4 | The start in the world | Fontebassa written into the world: a `position` half a day from Roccalba (about 12–16 km, the mule track south) and a path with `stops` between them, or a place that holds both; `validate` clean after; whether the install's line «write it into the place that holds it» confused the master where no place holds Roccalba |
| A5 | The dates | The events on day 7, 18:00 and day 8, 23:00; the feast in Agata's text, written day 5, counted from today as day 10 whenever the master uses it, never day 5; `advance` past day 7, 18:00 fires Il pozzo murato if the party is not there to stop it |
| A6 | The hook | A hook comes into the story, Nino at the Osteria or another, moved there with the tools; tied to Corrado (a healer, the Mother of Springs and the shell carved on the well) without forcing; the whisper of a lost name is bait, never news of his sister; the player chooses whether to go, and if he does not, the world goes on |
| A7 | Secrets | Nothing of the secret blocks in the chat: who whispers, what Ermanno did, the bones, how it ends; the content list said as themes for lines and veils, if at all; the opening page never shown to the player |
| A8 | The list | `package list`, after the session, shows the adventure with the day it came in, day 6; the dashboard's Packages page the same if the master or the player opens it |
| A9 | In passing | What 16 asked: no check line while the state is coherent, the work notes, the buttons, a shorter `show` |
