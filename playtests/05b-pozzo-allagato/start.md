# 05b Il pozzo allagato: the fall, the breath and the cloak

The world of `05-vena-bianca`, with harder fights, starting at the mine (D-456). In 05 the cleric's Channel Divinity and three spells ended both fights before the engine's counts were tested: nobody fell, no power recharged, no weapon hit the wight, and the ring stayed in a bag. Here two ghouls, whose claws paralyze and make every hit a critical, wait with the spider in the main gallery; in the hall a green dragon wyrmling flies up the shaft in the third round, its poison breath on Recharge 5–6; Aldo Serra still resists nonmagical weapons that are not silvered; and Corrado carries a cloak of protection he has not yet worn. It also shows whether the master marks `attack` and `sneak attack` now that the turn's reminder names them.

Player: `players/marco.md`, with [brief.md](brief.md), what Marco remembers of his character. This file never goes into the campaign.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$campaign = "<runs>\2026-10-17\3\vena"
rpg init $campaign --name "La miniera di Vena Bianca" --system 5e --language it --difficulty normal --lethality dice
Copy-Item -Recurse -Force playtests\05b-pozzo-allagato\world\* $campaign\world
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions "made by the master"; rpg config lines none; rpg config veils none; rpg config advancement xp; rpg config mentor off
rpg config calendar-start "day 1"; rpg config pictures none
rpg mode "session zero"; rpg mode play
rpg advance --to "day 2, 13:20" --why "Arrivo alla miniera di Vena Bianca"
rpg validate; rpg status
Pop-Location
```

- The settings are those of 05: lethality dice, saves checkpoint, rigor rules, advancement xp, mentor off.
- `world/`: the pages of 05, changed as below; `rpg validate` finds no problems; `status` shows the party at 5th level in the mine's yard, each with a Modest lifestyle and 1 gp less (the night at the inn), and the cloak in Corrado's pack, not worn.

## The sessions

| Session | First message | Options |
|---|---|---|
| 1: the gallery, a rest, the hall | «Ciao! Siamo davanti alla miniera, cominciamo?» | `--prepared playtests\05b-pozzo-allagato\brief.md --max 50 --dashboard` |
| 2: if session 1 did not reach the hall | «Ciao, riprendiamo?» | `--session 2 --max 20 --dashboard` |

Then the questionnaire, and the checklist: B17 above all, compared with the run of 05.

## What changes from 05

- **The party** starts in the Miniera di Vena Bianca, day 2, 13:20, with three rations each and `lifestyle: Modest`; Corrado knows Ermete and the Pozzo dei Venti, and carries the Mantello di Bruno (Cloak of Protection, attunement, not equipped).
- **Galleria alta**: one Giant Spider (Ragno della galleria) on the vault and two Ghouls (Divoratore della miniera) behind the carts; Fosco's bundle with the jet ring, as in 05.
- **Sala del Pozzo**: Aldo Serra and two Skeletons; the noise wakes the Draghetto del pozzo (Green Dragon Wyrmling) in the Pozzo allagato, thirty metres below, which flies up and attacks in the third round, and goes back down at half its hit points. Its treasure: 600 sp 25 gp.
- Zombies and the third skeleton are gone, so Destroy Undead (CR 1/2) ends only the two skeletons; the ghouls are CR 1, and Turn Undead only turns them.

## The fights

By the 2014 budget per character at 5th level, for four (easy 1000, medium 2000, hard 3000, deadly 4400):

- **Galleria alta**: Giant Spider 200 and two Ghouls 400, × 2 for three: 1200, between easy and medium. Ghoul claws: DC 10 Constitution or paralyzed for a minute, a save at the end of each of its turns; a hit within 5 feet on a paralyzed creature is a critical. Not an elf or undead: Tobia, a high elf, is immune.
- **Sala del Pozzo**: Aldo Serra 700, two Skeletons 100, the wyrmling 450, × 2 for four: 2500, between medium and hard. Poison Breath: a 15-foot cone, DC 11 Constitution, 6d6 poison, half on a success; Gisella halves it again.

## What to watch

The moments of 05's watch list (W1–W19) still hold. Above all:

| | Moment | The rule, and the tool |
|---|---|---|
| X1 | Gisella's and the ghouls' turns | `scene use … attack` for each attack of the Attack action, two for Gisella; Action Surge with `by` |
| X2 | Lucia's turn | `scene use … sneak attack` when she deals it, once a turn |
| X3 | A ghoul's claws | Paralyzed as an effect, its save at the end of the target's turns; criticals on it within 5 feet, with `double` on the damage roll |
| X4 | A party member at 0 | Unconscious from the engine; death saves with `change`, Corrado's by the player; damage at 0 a failure, a critical two; healing ends it (DIE-1–DIE-3) |
| X5 | Poison Breath | Rolled once, each target's save; the amount after the save given with `damage poison`, the engine halving Gisella's; «Soffio velenoso (spent)» on the copy, its recharge rolled at the start of each of its turns, the effect ended when it comes back |
| X6 | A weapon on Aldo | `"(applies)"` for Gisella's longsword or Corrado's mace; `"(does not apply)"` for Lucia's silvered sword or a weapon under Magic Weapon |
| X7 | The cloak, and the ring | Attuned only after a short rest with it, and worn (`equipped`): only then ac and saves +1 (D-456); the ring's necrotic resistance only on who wears it |
