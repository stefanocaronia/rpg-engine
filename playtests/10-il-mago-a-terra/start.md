# 10 Il mago a terra: a companion already down, and a cloak not yet bound

The plateau of 07, with the party of 06–09 at 3rd level and a map, in a fight already under way: Tobia lies at 0 hit points, Unconscious, with no death saves, among goblins going through his pockets. In five runs nobody fell in honest play (09, problem 1): this one starts with a companion down, as 07 did for the player's character, to see what no run has shown yet: a companion's death save rolled and written by the engine as its turn starts (DIE-5), told as the mentor setting asks (off: not named); Medicine or a healer's kit, then the effect Stable (DIE-6), with the successes full, the failures at 0 and no more saves; healing from 0; damage to a stable companion, if it comes. Corrado wears a cloak of protection he is not attuned to: its +1 counts only attuned and worn (D-456), so the master must either bind him with a short rest or leave the bonus out.

Player: `players/marco.md`, with [brief.md](brief.md), what Marco remembers of his character. This file never goes into the campaign.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$campaign = "<runs>\2026-10-17\8\pianoro"
rpg init $campaign --name "Il mago a terra" --system 5e --language it --difficulty normal --lethality dice
Copy-Item -Recurse -Force playtests\10-il-mago-a-terra\world\* $campaign\world
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions "made by the master"; rpg config lines none; rpg config veils none; rpg config advancement xp; rpg config mentor off
rpg config calendar-start "day 1"; rpg config pictures none
rpg mode "session zero"; rpg mode play
rpg advance --to "day 5, 09:00" --why "L'agguato sul pianoro"
rpg change Tobia hp --to 0 --why "Le frecce dei goblin"
rpg validate; rpg status
Pop-Location
```

- The settings of 09: lethality dice, saves checkpoint, mentor off. The master at its own effort.
- `world/`: 17 pages; `rpg validate` finds no problems; `status` shows Tobia at 0, Unconscious, Corrado (ac 18: the cloak does not count), Gisella and Lucia at full hit points.

## The session

One evening: «Ciao! Tobia è a terra, cominciamo?», with `--prepared playtests\10-il-mago-a-terra\brief.md --max 30 --dashboard`. Then the questionnaire, and the checklist: D1–D6 and P1–P4 of 06, and the moments below.

## The fight

Four Goblins (50 each) and a Hobgoblin (100): 300 XP, × 2 for five, 600, medium for four at 3rd level, harder with Tobia down. Goblins: scimitar 1d6 + 2 or shortbow 1d6 + 2, Nimble Escape; Hobgoblin: longsword 1d8 + 1 and Martial Advantage, 2d6 more on a foe next to an ally. They want the loot, not the dead: they go for whoever comes near the wizard or threatens them, and flee when the hobgoblin or three goblins fall. The master rolls every die and plays them as their pages say.

## What to watch

D1–D6 and P1–P4 of 06, and:

| | Moment | The rule, and the tool |
|---|---|---|
| T1 | Tobia's turns at 0 | The engine rolls and writes his death save at `scene next` (DIE-5); the master tells it as mentor off asks, without naming it |
| T2 | Stabilizing him | Medicine DC 10 or the healer's kit as an action, then `effect add Tobia Stable`: the engine brings the successes to their most, the failures to 0, and no more saves (DIE-6) |
| T3 | A hit on Tobia at 0 | A failure, two for a critical; Stable taken away |
| T4 | Healing him | Healing Word, Cure Wounds or a potion: the dying ends, as the engine says |
| T5 | The cloak | ac 18, not 19, until Corrado is attuned: a short rest with it, then `attuned`; the master says so if the player counts on it |
