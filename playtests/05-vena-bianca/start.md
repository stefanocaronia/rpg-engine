# 05 La miniera di Vena Bianca: a party of four

A campaign already under way: setup done, a 5th-level cleric and three companions with their sheets (fighter, wizard, rogue), at the inn of a mining village the evening before they set off. It tests what the engine counts since D-449, D-453 and D-454, with an AI master and a real fight: the uses of a turn with `scene use`, typed damage against resistances and immunities, a resistance that holds only for some damage, the dying point, the short and the long rest, a ration a day on the road and the lifestyle in a village, an item to attune to, and a power that recharges. The engine counts them only when the master calls the tools: the run shows whether it does, and where it goes wrong (D-230: a new mechanic only when a playtest shows the AI getting a count wrong).

Player: `players/marco.md`, with [brief.md](brief.md), what Marco remembers of his character. This file never goes into the campaign.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$campaign = "<runs>\2026-10-17\1\vena"
rpg init $campaign --name "La miniera di Vena Bianca" --system 5e --language it --difficulty normal --lethality dice
Copy-Item -Recurse -Force playtests\05-vena-bianca\world\* $campaign\world
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions "made by the master"; rpg config lines none; rpg config veils none; rpg config advancement xp; rpg config mentor off
rpg config calendar-start "day 1"; rpg config pictures none
rpg mode "session zero"; rpg mode play
rpg advance --to "day 1, 20:00" --why "La sera all'Osteria della Lanterna"
rpg validate; rpg status
Pop-Location
```

- The settings: lethality dice, so a fall to 0 hit points is the game's own, death saves and all; saves checkpoint, so a death of Corrado can go back to the end of a scene; rigor rules, so rations, lifestyle, light and the weight of coins are counted; advancement xp, so `scene close` gives the creatures' experience points; mentor off, as Marco knows the game; pictures none.
- `world/`: 31 pages; `rpg validate` finds no problems, and `status` shows Corrado (hp 38, ac 18) and the companions at 5th level, Gisella (54, 19), Lucia (38, 16) and Tobia (27, 13), at the Osteria della Lanterna, with the quest and the event of day 4. Nobody has a `lifestyle` yet: the first midnight at the inn asks for it.
- `AGENTS.md`, `CLAUDE.md` and `.claude/settings.json` are as `rpg init` writes them.

## The sessions

| Session | Days | First message | Options |
|---|---|---|---|
| 1: the inn, the road, the mine | 1–2 | «Ciao! Siamo all'osteria di Roccalba, cominciamo?» | `--prepared playtests\05-vena-bianca\brief.md --max 50 --dashboard` |
| 2: a new master | from where session 1 stopped: the mine or the way back, Roccalba | «Ciao, riprendiamo?» | `--session 2 --max 20 --dashboard` |

Then the questionnaire, and the checklist: parts A and B, B17 above all, with the watch list below. A party faster than the table goes on: session 2 may start on the way back.

## The pages

Each page describes only itself; where a thing is comes from its container's `contains`; every secret is in its block. Positions in km east and north of Roccalba; measures in metric.

- **Places**: Roccalba (`kind: village`; Osteria della Lanterna, `kind: inn`, with the party, Nella and Ermete; Cappella delle Fonti; Tecla). Mulattiera della Vena (`kind: path`): Roccalba, 19 km, Croce del Passo, 16 km, Miniera di Vena Bianca, 7 h 47 m at a normal pace. Miniera di Vena Bianca (`kind: mine`): Galleria alta (`luce: buio`, with the Fagotto di Fosco), Sala del Pozzo (`luce: buio`, with Aldo Serra and the Forziere del caposquadra, and its map: the shaft, its crumbling edge, two props, the winch, four carts, the door from the gallery and the rungs up the Pozzo dei Venti), Pozzo dei Venti, a way in from the hill.
- **Characters**: Corrado (`pc`, Human, Cleric 5, Life Domain); Gisella (`companion`, Hill Dwarf, Fighter 5, Champion, Defense: poison resistance from her race); Tobia (`companion`, High Elf, Wizard 5, Evocation); Lucia (`companion`, Lightfoot Halfling, Rogue 5, Thief, a silvered shortsword); Aldo Serra (Wight); Tecla, Ermete and Nella (Commoner).
- **Creatures**: Ragno della galleria (Giant Spider), Scheletro di minatore (Skeleton), Morto della miniera (Zombie).
- **Items**: Corrado's mace, holy symbol, healer's kit (10/10) and 6 torches; Lucia's silvered shortsword; plain gear as the system's kinds, 3 rations each, 20 arrows, 2 handaxes, 2 potions of healing; Anello di giaietto (Ring of Resistance, necrotic; what it does is a secret), in the Fagotto di Fosco with 18 gp 6 sp; the Forziere del caposquadra, 1500 sp 40 gp; the Registro dell'argento (a secret: Tecla's father was paid to wall in the miners).
- **Event**: I morti a Roccalba, day 4, 00:00, by Aldo Serra; it stops if Aldo is no more. **Quest**: I morti della Vena, three goals, 120 gp from Tecla.

The mystery has three ways in: Ermete#Cosa ha visto, the Registro dell'argento, and Tecla#Cosa tace when the party presses her. The sheep were the spiders' (Galleria alta#I ragni), not the dead's.

## The fights

By the 2014 budget per character at 5th level (SRD 5.1, the 2014 rules; easy 250, medium 500, hard 750, deadly 1100), for four:

- **Galleria alta**: two Giant Spiders, 400 XP, × 1.5 for two: 600, easy. Web (Recharge 5–6), restrained; the bite's poison, DC 11 Constitution for half, halved again on Gisella; at 0 hit points from the poison, stable but poisoned and paralyzed for an hour.
- **Sala del Pozzo**: Aldo Serra (Wight, 700), three Skeletons and two Zombies (50 each): 950 XP, × 2 for six: 1900, moderate. Skeletons take bludgeoning double and no poison; zombies no poison, and Undead Fortitude; Aldo resists necrotic and the bludgeoning, piercing and slashing of nonmagical weapons that are not silvered, and his Life Drain lowers the maximum of hit points until a long rest. Destroy Undead (CR 1/2) can end skeletons and zombies at once; Turn Undead can turn Aldo.

The master may size them to the party, moderate to high at difficulty normal.

## What to watch

Every moment below, in `dialogue.md` and `turns/`, and counted by `count-playtest.mjs` (the rows "scene use", "Damage with a type", "Dying", "Rests", "Upkeep", "Attunement", "Recharge"): whether the master calls the tool, and whether what it narrates matches what the tool said.

| | Moment | The rule, and the tool |
|---|---|---|
| W1 | Every turn of a party member in a fight | What it uses, with `scene use` as it happens: action, bonus action, reaction, attack (TRN-1); `scene next` reminds it on each turn of the party |
| W2 | Gisella's Attack action | Two attacks with Extra Attack, `attack` twice; Action Surge with `by "Action Surge"`, which the engine spends (TRN-3, TRN-5) |
| W3 | Lucia's turn | Sneak Attack once a turn, `sneak attack`; Cunning Action or Fast Hands (a potion given) as `bonus action`; Uncanny Dodge as `reaction` in a foe's turn |
| W4 | Tobia | Shield or Counterspell as `reaction`; Misty Step as `bonus action` leaves only a cantrip for the action (turn-uses note) |
| W5 | A use refused | The next call is a legal turn; said in `[ ]` or not at all, never with tool words |
| W6 | Every damage with a type | `change … --damage <type>` with the amount as rolled: skeletons' bludgeoning doubled, poison on undead ignored, Gisella's poison halved, necrotic on whoever wears the attuned ring halved (DMG-1, DMG-4) |
| W7 | Damage to Aldo Serra | `"<type> (applies)"` for a plain mace, longsword or claw; `"(does not apply)"` for Lucia's silvered sword or a weapon under Magic Weapon; radiant, fire and force whole (DMG-3) |
| W8 | A save for half (the spider's poison, Fireball) | The amount given is halved by the save, then the engine halves it again for a resistance: the master never halves for the resistance itself |
| W9 | A party member at 0 hit points | Unconscious from the engine; a death save on each of their turns, Corrado's rolled by the player; `change death-successes` or `death-failures`; damage at 0 a failure (a critical two); any healing ends it, as the engine says (DIE-1–DIE-3). The fall told as a moment of its own |
| W10 | Life Drain | On a failed DC 13 Constitution save, the maximum lowered by the necrotic damage taken, with `change hp --to <now>/<max>`, and back after the long rest |
| W11 | Web | Once spent, an effect without end on the copy, such as «Ragnatela (spent)»; its recharge rolled when its turn starts names it, the effect ended when it comes back; Restrained on the target until a DC 12 Strength check bursts the web, or the web is destroyed |
| W12 | Channel Divinity | `change Corrado channel-divinity`; Turned as an effect on each copy that fails, for 10 rounds; a copy destroyed at once at 0 |
| W13 | A short rest | An hour with `advance`, then the hit dice with `change <page> hit-dice-dN --spend N --recipe "short rest"`, and the recipe for what comes back (Action Surge, Second Wind, Channel Divinity); Arcane Recovery told |
| W14 | The ring | Found in the bundle and moved with `move`; what it does learned with Detect Magic or a short rest (`reveal`); `attuned` written only after a short rest with it, at most three |
| W15 | A long rest | After 8 hours, `change --recipe "long rest"`; a second one in 24 hours refused (RST-1) |
| W16 | The road and the mine | `travel` on the Mulattiera; at a midnight outside Roccalba the engine spends a ration each, and says water; torches burn an hour each, the Light cantrip as an effect of an hour |
| W17 | The inn | At the first midnight the engine asks for a lifestyle: the player chooses Corrado's, the master the companions'; every day in Roccalba paid by the engine; Tecla's 120 gp with `change money` (UPK-4) |
| W18 | The coins | 18 gp 6 sp from the bundle, 1500 sp 40 gp from the chest, moved with `trade` or `change`; their weight on whoever carries them |
| W19 | The end of each fight | `scene close` gives the XP, 950 shared by four; I morti a Roccalba cancelled when Aldo is no more |
