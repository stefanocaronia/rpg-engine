# 14 Classi e livello 7: a new party at 7th level

A new party of four classes never played: Ilario, the player's paladin (Oath of Devotion), and three companions the master keeps, Erminia the druid (Circle of the Land, forest), Bastiano the ranger (Hunter) and Nives the warlock (the Fiend, Pact of the Tome). They are at the gate of a ruined tower where Corvino, a mage, holds the mayor's son. The run wants to see:
- Wild Shape, with the hit points left over when the form drops to 0 carrying to the druid;
- Divine Smite, the player's choice after a hit;
- the charges of a magic item: Bastiano's wand of magic missiles, and Corvino's wand of web;
- Counterspell, or another reaction: the Mage has it, Nives too, and Shield and Hellish Rebuke;
- a level-up to 8th, played: everyone is 600 XP short, and the fight gives 650 each.

Player: `players/marco.md`, with [brief.md](brief.md). This file never goes into the campaign.

## The campaign

As `05-vena-bianca/start.md` says, from this folder's `world/`, with `--name "La torre di Arnaldo"` and `rpg advance --to "day 2, 16:00" --why "Il gruppo arriva al cortile della torre"`. `world/`: 16 pages; `rpg validate` finds no problems; `status` shows the four at full hit points in the tower's yard, each 600 XP from 8th level.

## The fight

Corvino (Mage, 2300 XP) and three of his hired thugs (Thug, 100 each): 2600 XP, × 2 for four, 5200, hard for four at 7th level (4400; deadly 6800). The Mage casts Fireball and Ice Storm, has Counterspell and Shield, Misty Step and Greater Invisibility; Corvino carries a wand of web with 4 charges. His tactics and when he flees are on the place, in its secret. The master may size the fight to the party, moderate to high at difficulty normal.

## The session

One evening: «Ciao! Siamo alla torre, cominciamo?», with `--prepared playtests\14-classi-e-livello-7\brief.md --max 35 --dashboard`. Then the questionnaire, and the checklist: D1–D6 and P1–P4 of 06, and the moments below.

## What to watch

| | Moment | The rule, and the tool |
|---|---|---|
| L1 | Wild Shape | Erminia's `wild-shape` spent with `change`; the form's hit points apart from hers (an effect, or a copy of the beast); at the form's 0 the damage left over goes to her, and she is herself again |
| L2 | Divine Smite | After a hit by the player, the smite asked: a slot spent with `change`, 2d8 radiant with a 1st-level slot and 1d8 more per level above, 1d8 more on an undead or a fiend; on a critical, the dice doubled |
| L3 | Charges | `change` on the wand's `charges`, one charge for Magic Missile at 1st level and one more for each level above; Corvino's wand of web too |
| L4 | Reactions | Counterspell, Shield, Hellish Rebuke: `scene use … reaction` for the player's character; a companion's reaction told |
| L5 | Level 8 | `scene close` gives the XP; the sheet says 8th level; the player chooses the Ability Score Improvement, and the hit points rise by the die or the average; the companions' rises told; Erminia's Wild Shape to CR 1 |
| L6 | Pact Magic | Nives's `spell-slots` (two of 4th level) spent, and back with a short rest |
