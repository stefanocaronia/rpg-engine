# 16 I controlli: the engine's checks of its state, in play

The plateau of 11, a short scene of 12–15 messages, for the checks of D-473 (CHK-1–CHK-4): the engine tells the master what the party and the open scene hold that cannot be true together, and says nothing while the state is coherent. Corrado has just cast Bless on Gisella and Lucia and keeps it alive (`effect … --by [[Corrado]]`). Three goblin archers and their boss, a bugbear, want him: he can truly fall to 0, and if he does, Bless breaks with him (EFF-14). Goblins brought down stay copies at 0, with no `status: dead`: a foe at 0 is dead by the game's rules, and no check speaks of it.

Player: `players/marco.md`, with [brief.md](brief.md). This file never goes into the campaign.

## The campaign

As `11-senza-magia/start.md` says, from this folder's `world/`, with `--name "I controlli"`, and in place of its last lines:

```
rpg advance --to "day 6, 11:00" --why "Le grida dei goblin sul pianoro"
rpg change Corrado slots-1 --by=-1 --why "Benedizione su Gisella e Lucia"
rpg effect add Gisella Benedizione --for 1m --by "[[Corrado]]" --why "Corrado prega alla prima grida dei goblin"
rpg effect add Lucia Benedizione --for 1m --by "[[Corrado]]" --why "Corrado prega alla prima grida dei goblin"
rpg validate; rpg status
```

- The settings of 11: lethality dice, saves checkpoint, mentor off; the master at its own effort.
- `world/`: 17 pages, the cloak of 11 left out and the boss added; `rpg validate` finds no problems; `status` shows the four at full hit points, Corrado with 3 slots of 1st level of 4, Bless on Gisella and Lucia kept by him, and no check line.

## The session

`--prepared playtests\16-i-controlli\brief.md --max 13 --hard 15 --dashboard`, first message «Ciao! I goblin gridano dai roccioni, cominciamo?». Then the checklist, on the moments below.

## The fight

Three Goblins (50 each) behind the boulders and the junipers (K4, K6, B6), shooting only at Corrado, and a Bugbear (200) at the top of the scree (B2), who comes down at him with his morning star and keeps hitting him if he falls, until someone drives him off. 350 XP, × 2 for four, 700, between medium and hard. When the boss dies, the archers left flee. The master rolls every die and plays them as their pages say.

## What to watch

| | Moment | What is right |
|---|---|---|
| C1 | Silence | No check line while the state is coherent, in the whole session: count every line of `scene next`, `advance` and `status` that ends with «which breaks it», «not marked dead» or «hold only at 0 hit points» |
| C2 | Corrado at 0 | `change` reminds that he keeps Bless; at the next `scene next` the line «keeps Benedizione … but is Unconscious, which breaks it» comes once, and the master ends Bless (or ends it already at the reminder of `change`) |
| C3 | Goblins at 0 | Copies at 0, never `status: dead`: no line |
| C4 | In passing | The fixes of D-466–D-472: work notes, the buttons, a shorter `show` |
