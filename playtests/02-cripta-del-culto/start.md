# 02 La cripta del culto: magic in a fight

A campaign already under way: setup done, a 3rd-level player character and a companion made, the party at the top of the stairs of a dark crypt. It tests what no run of `01-guadoscuro` reached: spells in a fight of six rounds or more, and a new master who picks the fight up halfway from the files alone (D-263). Nothing about concentration, effects that act each turn, temporary hit points or burning light is in the engine yet: the run shows whether the master keeps them by itself.

Player: `players/marco.md`, with [brief.md](brief.md), what Marco remembers of his character. This file never goes into the campaign.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$campaign = "F:\sviluppo\runs\rpg-engine\2026-10-09\1\cripta"
rpg init $campaign --name "La cripta di San Ruffo" --system 5e --language it --difficulty normal --lethality epic
Copy-Item -Recurse -Force playtests\02-cripta-del-culto\world\* $campaign\world
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions "made by the master"; rpg config lines none; rpg config veils none; rpg config advancement xp
rpg mode "session zero"; rpg mode play
rpg advance --to "day 1, 23:00" --why "Arrivo alla cappella di San Ruffo"
rpg validate; rpg status
Pop-Location
```

- The settings: lethality epic, so a fall to 0 hit points happens but the fight is not cut short by a death; rigor rules, so light is counted; advancement xp, so `scene close` gives the creatures' experience points; dice digital.
- `world/`: 26 pages; `rpg validate` finds no problems, and `status` shows Corrado and Viola at 3rd level, the quest and the event at midnight.
- `AGENTS.md`, `CLAUDE.md` and `.claude/settings.json` are as `rpg init` writes them.

## The sessions

| Session | First message | Options |
|---|---|---|
| 1: from the stairs into the fight; it stops halfway | «Ciao! Eccoci alla cripta, cominciamo?» | `--prepared playtests\02-cripta-del-culto\brief.md --max 8 --hard 8` |
| from session 1, three times: a new master and a new player who remembers | «Ciao, riprendiamo?» | `--from <run>\results\session-1 --prepared playtests\02-cripta-del-culto\brief.md --max 12` |

The hard cap of session 1 stops it in the third round or so. Each run from it is a new master that knows only the files: as after a summary, it must find again who concentrates on what, the effects and their saves, the temporary hit points and the light. No questionnaire: the checklist's parts A and B on what the fight touches, and the watch list below.

## The pages

Each page describes only itself; where a thing is comes from its container's `contains`; every secret is in its block. Creatures and characters derive from pages of 5e.

- **Places** (6): Valdorso (Bertone; Cappella di San Ruffo) › Cappella di San Ruffo (Corrado, Viola; Cripta di San Ruffo) › Cripta di San Ruffo, `luce: buio` (Ossario; Sala del rito, `luce: fioca`, with Malco and Ada; Stanza delle offerte, with the Forziere delle offerte).
- **Characters** (5): Corrado (`pc`, Cleric 3, Life Domain), Viola (`companion`, Bard 3, College of Lore), Malco (Cult Fanatic), Ada and Bertone (Commoner).
- **Creature**: Cultista (Cultist); the Ghoul is the system's. **Faction**: Figli della Fame. **Event**: Il sacrificio di Ada, day 2, 00:00, by Malco. **Quest**: Salvare Ada, open.
- **Items** (11): Corrado's chain mail, mace, shield and holy symbol (equipped), healer's kit (7/10), 5 torches, 1 alchemist's fire; Viola's leather armor and rapier (equipped), lute; the chest of offerings, 1200 cp 45 sp.

## The fight

In the Sala del rito: Malco, two Cultists around the altar and a Ghoul in a locked cage, which Malco opens (Sala del rito#La gabbia). Malco#In battaglia: Shield of Faith on himself first, then Hold Person on whoever threatens him most. 700 XP for two characters of 3rd level: high by the 2024 budget (SRD 5.2.1, p. 202), deadly by the 2014 one. The master may size it to the party.

## What to watch

Every moment below, in `dialogue.md` and `turns/`: whether the master applies the rule, and whether the files keep it (`effect` with `by` for concentration, rounds or `until`, `change` on `temp-hp`, the torch's count and burning).

| | Moment | The rule |
|---|---|---|
| W1 | Damage to whoever concentrates (Corrado's Bless or Shield of Faith, Viola's Heroism, Malco's spell) | Constitution save, DC 10 or half the damage, one per source; the player rolls Corrado's (Spellcasting.md, Concentration) |
| W2 | A second concentration spell (Malco: Hold Person after Shield of Faith) | The first ends at once |
| W3 | Whoever concentrates is incapacitated, paralyzed or at 0 hit points | The spell ends |
| W4 | Hold Person or the Ghoul's claws on someone | Paralyzed; a Wisdom (Hold Person) or DC 10 Constitution (Ghoul) save at the end of each of its turns; melee hits on a paralyzed creature within 5 feet are critical |
| W5 | Alchemist's fire that hits | 1d4 fire at the start of each of the target's turns, until it spends its action on a DC 10 Dexterity check |
| W6 | Heroism on Corrado | 3 temporary hit points at the start of each of his turns, not added to those left; damage takes them first; they go when the spell ends |
| W7 | A torch lit | Burns 1 hour, then goes out; a new one from the count |
| W8 | The end of the fight | `scene close` gives the XP; the copper of the chest counted as coins |
| W9 | The new master of each run from the save | Before narrating, finds again the round, whose turn, the effects and who keeps them, the temporary hit points and the torch, from the files |
