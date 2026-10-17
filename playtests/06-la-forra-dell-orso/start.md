# 06 La forra dell'orso: falling, and getting up again

The party of 05 at 3rd level, at the mouth of a gorge where an owlbear sleeps, with a map of the place. In 05 and 05b nobody fell: a 5th-level party ended every fight in two or three rounds. Here an owlbear, CR 3, hits a 3rd-level party for about 24 a turn: Tobia (17 hit points) and Lucia (21) fall to one round of it. The run tests the dying point and getting up again: death saves, stabilizing (Medicine DC 10, a healer's kit, Spare the Dying), healing in the fight (Healing Word, Cure Wounds, a potion given by a companion), the Help action, and the short rest with hit dice afterwards. It also tests positions on the map: moves within the speed, reach, opportunity attacks when someone leaves an enemy's side, difficult ground (the stream, the scree, the fallen tree) and cover (the boulders, the trees). At dusk the owlbear's mate comes back to the den.

Player: `players/marco.md`, with [brief.md](brief.md), what Marco remembers of his character. This file never goes into the campaign.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$campaign = "<runs>\2026-10-17\4\forra"
rpg init $campaign --name "La forra dell'orso" --system 5e --language it --difficulty normal --lethality dice
Copy-Item -Recurse -Force playtests\06-la-forra-dell-orso\world\* $campaign\world
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions "made by the master"; rpg config lines none; rpg config veils none; rpg config advancement xp; rpg config mentor off
rpg config calendar-start "day 1"; rpg config pictures none
rpg mode "session zero"; rpg mode play
rpg advance --to "day 1, 10:00" --why "All'imbocco della forra"
rpg validate; rpg status
Pop-Location
```

- The settings of 05: lethality dice, so a fall is the game's own, death saves and all, and a companion can die; saves checkpoint, so a death of Corrado can go back to the end of a scene.
- `world/`: 21 pages; `rpg validate` finds no problems; `status` shows Corrado (hp 24, ac 18), Gisella (34, 19), Lucia (21, 15) and Tobia (17, 13) at 3rd level in the Forra del Rio Nero, with Bepi, each with a Modest lifestyle; the quest; the event at 18:30.

## The sessions

| Session | First message | Options |
|---|---|---|
| 1: the gorge, the den, the rest | «Ciao! Siamo all'imbocco della forra, cominciamo?» | `--prepared playtests\06-la-forra-dell-orso\brief.md --max 50 --dashboard` |
| 2: if session 1 did not reach a fall | «Ciao, riprendiamo?» | `--session 2 --max 20 --dashboard` |

Then the questionnaire, and the checklist: B17 and B18 above all.

## The pages

- **Places**: Roccalba (`kind: village`; Osteria della Lanterna, `kind: inn`, with Nella; Tecla); Sentiero della forra (`kind: path`, 7 km); Forra del Rio Nero (the party and Bepi, with their squares, and its map: scree, beeches, two boulders, a fallen trunk, the stream down the east side, the den's mouth at M3, the path at G10 and H10); Tana dell'orsogufo (`luce: buio`, Nando's bag).
- **Characters**: Corrado (`pc`, Human, Cleric 3, Life Domain); Gisella (Hill Dwarf, Fighter 3, Champion); Tobia (High Elf, Wizard 3, Evocation); Lucia (Lightfoot Halfling, Rogue 3, Thief); Bepi (Commoner, a secret: the mate); Nando (dead); Tecla, Nella.
- **Creature**: Orsogufo (Owlbear). **Event**: Il ritorno della femmina, day 1, 18:30, in the gorge. **Quest**: La bestia della forra, 60 gp.

## The fights

By the 2014 budget per character at 3rd level, for four (easy 300, medium 600, hard 900, deadly 1600): one owlbear, 700 XP, is between medium and hard; its mate the same, if it comes on a party already hurt. Beak 1d10 + 5 and claws 2d8 + 5, reach 5 feet, speed 40 feet, Large (two squares by two).

## What to watch

| | Moment | The rule, and the tool |
|---|---|---|
| D1 | A party member at 0 | Unconscious from the engine; the fall told as a moment of its own |
| D2 | Its turns at 0 | A death save each turn, `change death-successes` or `death-failures`; Corrado's by the player; a 20 brings 1 hit point, a 1 two failures; damage at 0 a failure, a critical two, as the engine says |
| D3 | Stabilizing | Medicine DC 10 with an action, a healer's kit's use without a check, Spare the Dying; then stable at 0, no more saves, 1 hit point after 1d4 hours |
| D4 | Healing at 0 | Healing Word as a bonus action at range, Cure Wounds by touch, a potion given with an action (Fast Hands for Lucia): any healing ends the dying, as the engine says |
| D5 | Help | A companion's Help, advantage on the next attack or check, marked as its action |
| D6 | The short rest after | Hit dice with `change <page> hit-dice-dN --spend N --recipe "short rest"`, the recipe for what comes back |
| P1 | Every move in a fight | `move … --at` before the story, within the speed (30 feet, 25 for Gisella and Lucia, 40 for the owlbear); difficult ground costing double; Dash or Disengage as an action or Cunning Action |
| P2 | Reach | An attack only from an adjacent square (5 feet), or at range for spells and bows; the owlbear's two squares by two |
| P3 | Leaving an enemy's side | The engine says «read Opportunity Attacks»: the enemy's reaction, `scene use … reaction`, unless the mover disengaged |
| P4 | Cover and ground | The boulders and beeches as half cover (+2 AC) for whoever is behind them; the stream, the scree and the trunk as difficult ground |
