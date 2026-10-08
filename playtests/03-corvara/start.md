# 03 Corvara: the long road

A campaign already under way: setup done, the 3rd-level party of `02-cripta-del-culto` (Corrado and Viola) with a porter and a mule, in Ponteselce on the first morning of a six-day journey. It tests the world map with an AI master (D-256, D-258–D-262): `travel` on every kind of leg (a road, a river in a boat, the heath off the roads), the evening stops, a place written where the party camps, the events at a stop and at a date halfway; and then three weeks of downtime in town, with what piles up over days: rations, water, feed, wages, lifestyle, coins and a clock (D-263, PLAN phase 2 step 6). Giulia's scenario, written with the travel session (9 October).

Player: `players/marco-lungo.md`, Marco who counts everything on a journey, with [brief.md](brief.md), what he remembers. This file never goes into the campaign.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$campaign = "F:\sviluppo\runs\rpg-engine\2026-10-09\1\corvara"
rpg init $campaign --name "La strada per Corvara" --system 5e --language it --difficulty normal --lethality epic
Copy-Item -Recurse -Force playtests\03-corvara\world\* $campaign\world
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions "made by the master"; rpg config lines none; rpg config veils none; rpg config advancement milestones
rpg mode "session zero"; rpg mode play
rpg advance --to "day 1, 07:00" --why "La partenza da Ponteselce"
rpg validate; rpg status
Pop-Location
```

- The settings: rigor rules, so rations, water, feed and wages are counted; lethality epic; milestones, so no experience points to count.
- `world/`: 48 pages; `rpg validate` finds no problems; `status` shows Corrado and Viola at 3rd level in Ponteselce, with Bastiano, Testarda and Mastro Ilario there.
- `AGENTS.md`, `CLAUDE.md` and `.claude/settings.json` are as `rpg init` writes them.

## The sessions

| Session | Days | First message | Options |
|---|---|---|---|
| 1: the road | 1–2, Ponteselce to Guado dei Salici | «Ciao! Si parte per Corvara, cominciamo?» | `--prepared playtests\03-corvara\brief.md --max 30` |
| 2: a new master | 3–6: the river, the heath, Torre Mozza, Corvara | «Ciao, riprendiamo?» | `--session 2 --max 35` |
| 3: a new master | three weeks in Corvara, to the consecration on day 27 | «Ciao, riprendiamo?» | `--session 3 --max 20` |

Sessions 2 and 3 go on in the same campaign and output folder. A party faster than the table goes on to what comes next: session 2 may already reach the downtime. Then the questionnaire, and the checklist's parts on what the run touches, with the watch list below.

## The pages

Each page describes only itself; where a thing is comes from its container's `contains`; every secret is in its block. Positions are written as the engine writes them, km east and north of Ponteselce (D-259); measures in metric (D-262).

- **Regions**: Colli di Ponteselce (radius 25 km, `incontri`), holding Ponteselce, Locanda della Fonte, Bivio dei Cippi and the Strada del Colle; Brughiera Nera (radius 25 km around Torre Mozza, `terrain: difficult`, `incontri`, #Orientarsi), holding Torre Mozza.
- **Places**: Ponteselce (Mastro Ilario, Corrado, Viola, Bastiano, Testarda); Locanda della Fonte; Bivio dei Cippi; Guado dei Salici (Orsola, La Tarda); Molino Rosso; Approdo delle Canne (#La collina); Torre Mozza (Custode Berta); Corvara (Locanda del Corvo, with prices and a stable; Tempio di Corvara).
- **Roads**: Strada del Colle: Ponteselce, 20 km, Locanda della Fonte, 22 km, Bivio dei Cippi, 26 km, Guado dei Salici. Fiume Lenta (`kind: river`, upstream first): Guado dei Salici, 40 km, Molino Rosso, 50 km, Approdo delle Canne. Sentiero della Torre (`kind: path`): Torre Mozza, 9 km, Corvara. No road from the river to Torre Mozza: 30 km west-north-west of Approdo across the heath.
- **Characters**: Corrado (`pc`) and Viola (`companion`) as in scenario 02, with rations (5 each) and waterskins as items; Bastiano, porter (Commoner, 2 sp a day, 12 rations); Testarda, mule (from Mule, with the pack saddle holding the chest and 6 days of feed: `who` takes characters, so the mule is one); Mastro Ilario; Orsola, boatwoman (1 sp a mile a head, about ten hours a day); Custode Berta (Guard, the seal); Gualtiero, pilgrim.
- **Items**: Corrado's and Viola's gear from 02; La Tarda (Keelboat); Cassa sigillata (a secret); Sigillo della Torre; Basto di Testarda.
- **Events**: Il pellegrino ferito (when the party is at Locanda della Fonte); La piena della Lenta (day 4, 10:00); La consacrazione (day 27, 10:00); I ladri del Corvo (clock 0/4, a step a week in Corvara). **Quest**: Portare la cassa a Corvara, two goals.

Three ways to keep the course across the heath: Gualtiero#Cosa sa (at the Locanda), Orsola#La brughiera, Approdo delle Canne#La collina.

## Expected times (normal pace, 8 h a day)

Day 1: the Locanda at 11:27, where the pilgrim stops the journey; then on, a camp on the road about 16 km past it at the end of the day's hours. Day 2: Guado dei Salici in about 7 h. Days 3–4: the river at 6 km/h downstream, 15 h in all; with Orsola's hours (about 10 a day, given with `hours`) the first night on the bank, La piena stops the boat on day 4 at 10:00, arrival on day 4; with the river's 24 h they would sail through the night. Days 5–6: 30 km across the heath, 25 of them difficult: about 12 h, a camp in the heath written `here`. Day 6: Torre Mozza, then Corvara in 2 h by the path.

## What to watch

| | Moment | What should happen |
|---|---|---|
| T1 | Every leg | `travel` or `route`, no times or distances made up; no `move` for a journey, or `move` then `advance` |
| T2 | Bastiano and Testarda | In every leg, named in `who` with the party; on the river all inside La Tarda; nobody left behind |
| T3 | Every evening stop (about 5) | The camp told: where, the watches, the region's night encounters (`incontri`), rolled hidden; the player chooses; a quiet night in a line or two |
| T4 | Rigor rules | A ration and water a day each, the mule's feed, Bastiano's wages; the totals right on day 6 |
| T5 | A forced march | Only when the player asks, with `hours` and the rule |
| T6 | Il pellegrino ferito | Stops the travel at the Locanda, played before going on |
| T7 | The river | Orsola's hours given with `hours`, not the 24 h; La piena stops the boat on day 4 and changes something; going back up refused, as the Keelboat says |
| T8 | The heath | `travel` with `across` to Torre Mozza or `toward`; a navigation roll at most once a day, only with a risk, the stakes said first; a failure drifts and never stops the story |
| T9 | The camp in the heath | Written with `write … here`, inside Brughiera Nera; day 6 leaves from it |
| T10 | Sessions 2 and 3 | Start from the files: the journey (`status` says it), the position, rations, coins and wages as the session before left them |
| T11 | Downtime | Big `advance`s: lifestyle × 21 days, the stable, Bastiano kept or paid off; coins right at the end |
| T12 | The clock and the date | I ladri del Corvo moves a step a week; La consacrazione comes due on day 27 |
| T13 | An uneventful day | One or two lines |
