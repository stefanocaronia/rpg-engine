# 09 L'ossario dei pastori: a companion falls, and what 06–08 left

The party of 06–08 at 3rd level, at the foot of the stair of a dark ossuary with a map, where two ghouls, a shadow and a dust mephit wait. It plays together what 06, 07 and 08 did not show, and the points left of D-456: a companion falling (the ghouls' claws paralyze, and hits on the paralyzed are critical), its death save rolled and written by the engine as its turn starts (DIE-5), a friend stabilizing it with Medicine (the effect Stable, DIE-6) or healing it; and, if Corrado falls, the player before the heartbeat card, pressing the save (D-460, D-461). Besides: a power that recharges (the mephit's Blinding Breath, Recharge 6), a resistance only to nonmagical weapons (the shadow: Lucia's silver does not count, Magic Weapon does), radiant damage doubled on the shadow, a cloak of protection that gives its bonus only attuned and worn (D-456), and `change` rolling the dice, with brackets for more than one term (`-(2d6+3)`). It also checks today's fixes to the run: the player reaching the late note, answering each question once, and reading each of the master's paragraphs once.

Player: `players/marco.md`, with [brief.md](brief.md), what Marco remembers of his character. This file never goes into the campaign.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$campaign = "<runs>\2026-10-17\7\ossario"
rpg init $campaign --name "L'ossario dei pastori" --system 5e --language it --difficulty normal --lethality dice
Copy-Item -Recurse -Force playtests\09-l-ossario-dei-pastori\world\* $campaign\world
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions "made by the master"; rpg config lines none; rpg config veils none; rpg config advancement xp; rpg config mentor off
rpg config calendar-start "day 1"; rpg config pictures none
rpg mode "session zero"; rpg mode play
rpg advance --to "day 4, 16:00" --why "Nell'ossario della cappella dei pastori"
rpg validate; rpg status
Pop-Location
```

- The settings of 08: lethality dice, saves checkpoint; mentor off, so the companions' death saves the engine rolls are not named to the player. The master at its own effort, medium.
- `world/`: 20 pages; `rpg validate` finds no problems; `status` shows the four at full hit points in the ossuary, the cloak in Corrado's pack, not worn and not attuned.

## The session

One evening: «Ciao! Siamo in fondo alla scala dell'ossario, cominciamo?», with `--prepared playtests\09-l-ossario-dei-pastori\brief.md --max 30 --dashboard`. Then the questionnaire, and the checklist: D1–D6 and P1–P4 of 06, and the moments below.

## The fight

Two Ghouls (200 each), a Shadow (100) and a Dust Mephit (100): 600 XP, × 2 for four, 1200, between hard (900) and deadly (1600) for four at 3rd level. Ghoul claws: DC 10 Constitution or paralyzed for a minute, a save at the end of each of its turns; Tobia, an elf, is immune. Shadow: resists nonmagical weapons and five elements, takes radiant double, drains Strength. Mephit: Blinding Breath, a 15-foot cone, DC 10 Dexterity or blinded for a minute, Recharge 6; it bursts in dust when it dies. They come out together when someone reaches the middle of the room or lights a strong light, go for the nearest, and do not flee. The master rolls every die and plays them as their pages say: nothing to make anyone fall, nothing to save them.

## What to watch

D1–D6 and P1–P4 of 06, and:

| | Moment | The rule, and the tool |
|---|---|---|
| F1 | A companion at 0 | Its death save rolled and written by the engine at `scene next`, as its turn starts (DIE-5); not named to the player, with mentor off |
| F2 | Stabilizing it | Medicine DC 10 or the healer's kit, then `effect add … Stable`: the engine brings the successes to their most and the failures to 0; damage at 0 takes it away (DIE-6) |
| F3 | Corrado at 0 | The heartbeat card on the page; the save asked with `ask`, pressed by the player, written by the engine |
| F4 | The breath | Once spent, an effect without end on the mephit's copy, its recharge rolled as its turn starts names it |
| F5 | A weapon on the shadow | `"(applies)"` for a mace, a longsword, Lucia's silvered sword; `"(does not apply)"` for a weapon under Magic Weapon; Sacred Flame's radiant doubled |
| F6 | The cloak | Its bonus only once in `attuned` (after a short rest with it) and in `equipped` (D-456) |
| F7 | `change` with dice | `by` rolling the dice, with brackets for more than one term |
| R1 | Today's run fixes | The player at the late note; one answer to each question (`answers/`); each paragraph read once |
| S1 | Speed | Steps and seconds per turn, against 07 and 08 |
