# 07 Il pianoro dei lupi: a companion already down

The party of 06 at 3rd level, at dawn on a plateau with a map, where Lucia lies at 0 hit points among a pack of wolves. In 05, 05b and 06 nobody ever fell: here the scene starts with a fall, so the run sees the dying point played by an AI master from the first turn. Lucia's death saves, rolled each of her turns and counted by the engine (DIE-1–DIE-3); the wolves' bites on someone at 0, a failure each and two for a critical (an unconscious creature is hit critically from 5 feet); a natural 20; stabilizing with Medicine DC 10 or the healer's kit; healing from 0 with Healing Word or Cure Wounds, or a potion given by a companion; the choice between saving her and fighting; and the short rest with hit dice afterwards. Positions on the map as in 06.

Player: `players/marco.md`, with [brief.md](brief.md), what Marco remembers of his character. This file never goes into the campaign.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$campaign = "<runs>\2026-10-17\5\pianoro"
rpg init $campaign --name "Il pianoro dei lupi" --system 5e --language it --difficulty normal --lethality dice
Copy-Item -Recurse -Force playtests\07-il-pianoro-dei-lupi\world\* $campaign\world
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions "made by the master"; rpg config lines none; rpg config veils none; rpg config advancement xp; rpg config mentor off
rpg config calendar-start "day 1"; rpg config pictures none
rpg mode "session zero"; rpg mode play
rpg advance --to "day 2, 06:00" --why "L'alba sul pianoro"
rpg change Lucia hp --to 0 --why "Sbranata dai lupi nella notte"
rpg validate; rpg status
Pop-Location
```

- The settings of 06: lethality dice, so Lucia can die; saves checkpoint.
- `world/`: 16 pages; `rpg validate` finds no problems; `status` shows Corrado (hp 24, ac 18, every slot), Gisella (34) and Tobia (17) at the south edge of the plateau, and Lucia at 0, Unconscious, with no death saves yet, five squares north of them.

## The session

One evening: «Ciao! Siamo sul pianoro, cominciamo?», with `--prepared playtests\07-il-pianoro-dei-lupi\brief.md --max 30 --dashboard`. Then the questionnaire, and the checklist: D1–D6 and P1–P4 of 06, above all.

## The pages

- **Places**: Roccalba (`kind: village`; Osteria della Lanterna, `kind: inn`; Tecla); Sentiero dei pascoli (`kind: path`, 9 km); Pianoro dei ginepri, with the party at E9, F9 and G9, Lucia at F4, and its map: scree to the west, junipers, two boulders, the low wall of a ruined pen, a pool, the path at F10 and G10. Its secret: where the wolves are, and what they go for.
- **Characters**: Corrado, Gisella, Tobia and Lucia as in 06, each 15 gp richer for the owlbears; Tecla, Nella.
- **Creatures**: Lupo del pianoro (Wolf), Capobranco (Worg).

## The fight

Three Wolves (50 each) and a Worg (100): 250 XP, × 2 for four, 500, medium for four at 3rd level (600), and harder with Lucia down. Wolf: bite 2d4 + 2, DC 11 Strength or prone, Pack Tactics. Worg: bite 2d6 + 3, DC 13 Strength or prone. The pack goes for the one on the ground and for whoever comes near her, as hungry wolves would; it flees when two are dead or the worg is under half. The master rolls every die and plays the wolves as their page says: nothing to make Lucia die, nothing to save her.

## What to watch

D1–D6 and P1–P4 of 06, and:

| | Moment | The rule, and the tool |
|---|---|---|
| L1 | Lucia's turns | A death save each turn, rolled by the master (a companion), `change Lucia death-successes` or `death-failures`; three successes stable, three failures dead; a 20 brings 1 hit point, a 1 two failures |
| L2 | A bite on Lucia | Damage at 0 with `change … --damage piercing`: the engine counts a failure; from 5 feet it is a critical, so the master adds one more |
| L3 | Reaching her | Medicine DC 10 or a healer's kit's use as an action, Spare the Dying; Healing Word from range as a bonus action; a potion given with an action |
| L4 | When she wakes | Any healing ends the dying, the engine says so and takes away Unconscious; she stands up from prone with half her speed |
