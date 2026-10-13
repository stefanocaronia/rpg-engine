# 04 Tre settimane: clocks through downtime

A campaign already under way: Corrado and Viola of `02-cripta-del-culto`, two nights after the crypt, stay three weeks in Valdorso to rest. Two clocks run at different paces through those weeks: it tests what the long playtest could not (`03-corvara`, where the only clock had already filled), Giulia's third candidate of D-263: over many days, does the master move each clock a step at a time, in the order they come, with their signs, and stop to play the first that fills, or does one `advance` fill them all, or none?

Player: `players/marco.md`, with [brief.md](brief.md). This file never goes into the campaign.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$campaign = "<runs>\2026-10-09\11\valdorso"
rpg init $campaign --name "Tre settimane a Valdorso" --system 5e --language it --difficulty normal --lethality epic
Copy-Item -Recurse -Force playtests\04-tre-settimane\world\* $campaign\world
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions "made by the master"; rpg config lines none; rpg config veils none; rpg config advancement xp
rpg mode "session zero"; rpg mode play
rpg advance --to "day 3, 08:00" --why "La mattina dopo la cripta"
rpg validate; rpg status
Pop-Location
```

- Rigor rules, so the inn's room and meals are charged day by day; lethality epic; advancement xp.
- `world/`: 24 pages; `rpg validate` finds no problems; `status` shows Corrado and Viola at the Locanda della Macina, and the two clocks.

## The session

| Session | First message | Options |
|---|---|---|
| 1 | «Ciao! Allora, tre settimane qui a Valdorso: io faccio il cerusico per il paese, Viola suona alla locanda. Partiamo?» | `--prepared playtests\04-tre-settimane\brief.md --max 15` |

## The pages

- **Places**: Valdorso (Locanda della Macina with prices, with Rosalba, Corrado and Viola; Mulino di Bertone, with Bertone and Ada; Pozzo della piazza; Fucina di Gualdo, with Gualdo; Cappella di San Ruffo, in ruins).
- **Characters**: Corrado (`pc`) and Viola (`companion`) as at the end of 02, 1250 xp, Corrado with 42 gp 5 sp; Bertone, Ada, Rosalba (Commoner); Gualdo (Cultist), who fled the crypt.
- **Events**, both `planned`: La febbre del pozzo, clock 2/6, a step every three days until someone cleans the well: full about day 15; La vendetta dei Figli, by Gualdo, clock 1/4, a step a week while he works unhindered: full about day 24. Each with its signs, and a secret on how it stops.
- **Faction**: Figli della Fame. **Items**: the gear of Corrado and Viola.

## What to watch

| | Moment | What should happen |
|---|---|---|
| D1 | The weeks | Time passes with `advance` in stretches that let each step come in its order, never a single jump past the steps; every step a `change` of the clock with its why |
| D2 | La febbre del pozzo | A step every three days, each with its sign; when it fills, about day 15, the master stops the weeks and plays it, before La vendetta |
| D3 | La vendetta dei Figli | A step a week with its sign; it fills about day 24 unless the party stops Gualdo |
| D4 | The inn | 1 gp a night each with meals, charged with `change` as the days pass; coins right |
| D5 | Quiet days | One or two lines; the player decides when something asks a choice |
