# 08 Il guado del mulino: the player's character down, and a master at low effort

The party of 07 in a fight already under way at a ford, with a map: Corrado, the player's character, lies at 0 hit points under an ogre's club, Unconscious, with no death saves yet, and two wolves are on his friends. In 07 the master rolled a companion's death save and never wrote it; since D-460 the player rolls their character's with a button (`scene next` tells the master to ask it), the engine writes the outcome, and rolls a companion's itself as its turn starts (DIE-4, DIE-5). This run sees the player face that button, the companions choose between raising Corrado and fighting, and, if a companion falls too, the engine's roll. The master plays at low effort (`--master-effort low`), to see what that costs in speed and in the story.

Player: `players/marco.md`, with [brief.md](brief.md), what Marco remembers of his character. This file never goes into the campaign.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$campaign = "<runs>\2026-10-17\6\guado"
rpg init $campaign --name "Il guado del mulino" --system 5e --language it --difficulty normal --lethality dice
Copy-Item -Recurse -Force playtests\08-il-guado-del-mulino\world\* $campaign\world
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions "made by the master"; rpg config lines none; rpg config veils none; rpg config advancement xp; rpg config mentor off
rpg config calendar-start "day 1"; rpg config pictures none
rpg mode "session zero"; rpg mode play
rpg advance --to "day 3, 19:00" --why "Il guado del mulino, al tramonto"
rpg change Corrado hp --to 0 --why "La clava dell'orco"
rpg validate; rpg status
Pop-Location
```

- The settings of 07: lethality dice, saves checkpoint; mentor off, so the engine's rolls for a companion's death saves are not named to the player.
- `world/`: 16 pages; `rpg validate` finds no problems; `status` shows Corrado at 0, Unconscious, Gisella at 22/34, Lucia (21) and Tobia (17) at the ford.

## The session

One evening: «Ciao! Riprendiamo, sono a terra?», with `--prepared playtests\08-il-guado-del-mulino\brief.md --max 20 --dashboard --master-effort low`. Then the questionnaire, and the checklist: D1–D6 and P1–P4 of 06.

## The fight

An Ogre (450 XP) and two Wolves (50 each): 550, × 2 for three, 1100, hard for four at 3rd level (900), harder with Corrado down. Ogre: greatclub 2d8 + 4, reach 5 feet, Large, 59 hit points, AC 11; it flees under half. The master rolls every die and plays them as their page says.

## What to watch

D1–D6 and P1–P4 of 06, and:

| | Moment | The rule, and the tool |
|---|---|---|
| C1 | Corrado's turns | `scene next` says to ask his death save with `ask`; the player presses the button; the engine writes the success or the failure, a 20 bringing 1 hit point and a 1 two failures (DIE-4) |
| C2 | A blow on Corrado at 0 | A failure, two for a critical: an unconscious creature hit from 5 feet is hit critically |
| C3 | A companion at 0 | Its death save rolled by the engine as its turn starts (DIE-5), not named to the player with mentor off |
| C4 | Raising Corrado | Healing Word from range, a potion given, Medicine DC 10 or the healer's kit: the companions choose, the engine ends the dying |
| S1 | The master's speed at low effort | Seconds per player turn, model steps per turn, seconds and calls per step, against 07 at medium; steps per enemy turn in the fight |
| S2 | The story at low effort | Whether it gets thinner, with examples |
| S3 | The tools | `change … --by -2d8-4` rolling the dice (D-459); the calls of one turn sent together, never a turn begun before the one before is done |
