# 11 Senza magia: Stable, and a cloak not bound

The plateau of 10, a short scene of 10–15 messages that brings into play what 10 left out (D-456 and DIE-6). Tobia lies at 0 hit points, Unconscious, with one failure already marked; Lucia kneels beside him with a healer's kit; Corrado has spent every slot and his Channel Divinity, nobody has a potion, so stabilizing is the obvious move: Medicine DC 10 or the kit, then the effect Stable, which the engine turns into full successes, failures at 0 and no more saves (DIE-6). Goblin archers shoot at Corrado, who wears a cloak of protection he is not attuned to: his AC stays 18 at every shot (D-456). The player's profile asks once, in the middle of the fight, whether the cloak protects him: the master must say no, not attuned, and give no +1. A goblin by Tobia may hit him while stable: a failure, and Stable taken away.

Player: `players/marco-mantello.md`, Marco who asks once about his cloak, with [brief.md](brief.md), what he remembers of his character. This file never goes into the campaign.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$campaign = "<runs>\2026-10-17\9\pianoro"
rpg init $campaign --name "Senza magia" --system 5e --language it --difficulty normal --lethality dice
Copy-Item -Recurse -Force playtests\11-senza-magia\world\* $campaign\world
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions "made by the master"; rpg config lines none; rpg config veils none; rpg config advancement xp; rpg config mentor off
rpg config calendar-start "day 1"; rpg config pictures none
rpg mode "session zero"; rpg mode play
rpg advance --to "day 6, 11:00" --why "Il secondo agguato sul pianoro"
rpg change Corrado slots-1 --to 0 --why "Le preghiere dell'alba"; rpg change Corrado slots-2 --to 0 --why "Le preghiere dell'alba"; rpg change Corrado channel-divinity --to 0 --why "All'alba"
rpg change Tobia hp --to 0 --why "Le frecce dei goblin"; rpg change Tobia death-failures --by 1 --why "Il primo tiro contro la morte"
rpg validate; rpg status
Pop-Location
```

- The settings of 10: lethality dice, saves checkpoint, mentor off; the master at its own effort.
- `world/`: 15 pages; `rpg validate` finds no problems; `status` shows Corrado (ac 18, no slots, no Channel Divinity) at J9, Tobia at 0, Unconscious, one failure, at C3, Lucia beside him at D3 with her kit (3 uses), Gisella at H8; no potions.

## The session

`--prepared playtests\11-senza-magia\brief.md --profile playtests\players\marco-mantello.md --max 12 --dashboard`, first message «Ciao! Tobia è a terra e io non ho più preghiere, cominciamo?». Then the checklist, on the moments below.

## The fight

Four Goblins (50 each): three archers behind the boulders and the junipers (K4, K6, B6) shooting at Corrado, the healer; one on the scree by Tobia (C2), waiting to loot him and hitting whoever is next to it, the wizard on the ground included. 200 XP, × 2 for four, 400, medium. They flee when two are dead. The master rolls every die and plays them as their pages say.

## What to watch

| | Moment | The rule, and the tool |
|---|---|---|
| T1 | Tobia's turns, before he is stable | The engine rolls and writes his death save at `scene next` (DIE-5); told without naming it, as mentor off asks |
| T2 | Stabilizing him | Medicine DC 10 or a use of Lucia's kit (`change … uses`), then `effect add Tobia Stable`: the engine sets the successes to their most and the failures to 0; no more saves at his turns (DIE-6) |
| T3 | A hit on Tobia stable | A failure, two for a critical, and Stable taken away by the engine |
| T5 | The cloak | Corrado's ac 18 at every shot; asked whether the cloak protects him, the master says no, not attuned (D-456), and gives no +1 |
| D1 | The dashboard | The goblins' health words from the system (D-465); Tobia shown dying, then «Stabile» |
