# 01 Guadoscuro: from the start

A new campaign with a written adventure and no character yet, as for a user who has just installed one. It tests setup, session zero, a first session, and a second session with a new master, started from the files alone.

Player: `players/marco.md`. This file never goes into the campaign: the clue map is for whoever checks the run.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$campaign = "F:\rpg-campaigns\guadoscuro-1"
rpg init $campaign --name "La nebbia di Guadoscuro"
Copy-Item -Recurse -Force playtests\01-guadoscuro\world\* $campaign\world
Copy-Item instructions\core.md $campaign\AGENTS.md
Set-Content -NoNewline -Path $campaign\CLAUDE.md -Value "@AGENTS.md`n"
Push-Location $campaign; rpg find; Pop-Location
```

- Only the name: language and system stay missing, so setup really happens.
- `world/`: the whole adventure, no player character; `rpg find` lists its 39 pages and no problems.
- `AGENTS.md` is the commit's `instructions/core.md`, unchanged; `CLAUDE.md` is exactly `@AGENTS.md` and a newline. Nothing else: no `.claude/`, no `CLAUDE.local.md`, no word about the test.

## The sessions

| Session | First message | `--max` | `--hard` |
|---|---|---|---|
| 1: setup, session zero, play | «Ciao! Possiamo cominciare?» | 50 | 60 (default) |
| 2: a new master chat, same campaign; the player remembers session 1 | «Ciao, riprendiamo?» | 15 | 25 (default) |

Each master session stops past `--budget` 15 $ (default). Then the questionnaire, and the checklist on both sessions. The commands are in `README.md`.

## The pages

The adventure of `private/project/AVVENTURA-DI-PROVA.md`, in Italian. Each page describes only itself; where a thing is comes from its container's `contains`; every secret is in its block. An NPC's `knows` lists every secret of other pages it knows, plus the hidden pages it knows of (the crypt, a planned event); NPCs without one know none. Event dates count from the character's arrival in Guadoscuro. A change to the pages goes in the run's report, since runs are compared.

- **Places** (14), with what they contain:
  - Guadoscuro: Agnese, Nina; Locanda del Guado (Gaspare, Rosa); Cappella (Fratello Odo); Emporio (Tobia); Casa di Varro (Diario di Varro); Capanno di Matteo (Lena).
  - Palude > Mulino abbandonato > Cripta: Ingresso allagato; Ossario; Corridoio della cripta; Laboratorio della cripta (Varro, Lanterna della cappella); Sala del rituale (Livia, Teresa, Matteo).
- **Characters** (11, all `npc`): Varro, Lena, Fratello Odo, Agnese, Gaspare, Nina, Tobia, Rosa, Teresa, Matteo, Livia (`dead`).
- **Events** (5): Il rogo (`happened`); Sparizione di Rosa, La nebbia si infittisce, La marcia della Confraternita, Il rituale della luna nuova (`planned`).
- **Creatures** (3): Annegato, Fuoco fatuo, Lupo. **Faction**: Confraternita della Lanterna. **Items**: Diario di Varro, Lanterna della cappella. **Quests**: Ritrovare gli scomparsi, Ritrovare la lanterna. **Topic**: La nebbia.

## The clock

| Event | Date on its page | Whose plan | What changes it |
|---|---|---|---|
| Sparizione di Rosa | la prima notte dopo l'arrivo del personaggio | Varro#Il piano | if Rosa is guarded, the drowned try anyway and flee from resistance |
| La nebbia si infittisce | il giorno dopo l'arrivo del personaggio | Varro#Il piano | |
| La marcia della Confraternita | due giorni dopo l'arrivo del personaggio, all'alba | Fratello Odo#La marcia | a day later if Odo gets the proof of who takes people, or is confronted with the fire |
| Il rituale della luna nuova | la notte di due giorni dopo l'arrivo del personaggio, dopo la marcia dell'alba, con la luna nuova | Varro#Il piano | Il rituale della luna nuova#Come si ferma; Varro#Cosa lo ferma |

Triggers by situation: Ossario#I dormienti (they rise for anyone but Varro), Corridoio della cripta#La trappola, Mulino abbandonato#La combinazione (left lever down wakes the ossuary; all three down raise the water).

## The clue map

For the checklist (A2, A6, A10): at least three ways to every conclusion the player needs, each on the page of whoever holds it.

| | Conclusion | Clues | The truth |
|---|---|---|---|
| C1 | Varro takes the villagers | Nina#Cosa ha visto; Tobia#I reagenti; Casa di Varro#Il laboratorio vuoto; Diario di Varro#Livia; Lena (Varro#Cosa vuole, Il rituale della luna nuova#Chi e perché) | Il rituale della luna nuova#Chi e perché; Sparizione di Rosa#Chi e perché |
| C2 | He hides under the mill | Nina#Cosa ha visto; Fratello Odo (Cosa dice: a light at the mill); Palude (Incontri 3, the merchant); Diario di Varro#La cripta; Lena (Cripta) | Laboratorio della cripta contains Varro |
| C3 | The sluices: middle down, sides up | Diario di Varro#La cripta; Lena#Le chiuse; Mulino abbandonato#Le tracce | Mulino abbandonato#La combinazione |
| C4 | The missing live until midnight of the new moon; Rosa is next | Diario di Varro#Livia; Casa di Varro#Il laboratorio vuoto; Lena (Il rituale della luna nuova, #Chi e perché) | Il rituale della luna nuova#Chi e perché |
| C5 | Lena hides in Matteo's hut | Gaspare (Le voci: smoke from the hut); Nina#La ragazza del pane; Tobia#Le consegne | Capanno di Matteo contains Lena |
| C6 | The Brotherhood burned the herbalist's house: the lever on Odo | Il rogo#Le tracce; Agnese#Il registro; Gaspare#Il silenzio; Fratello Odo#Il rimorso | Il rogo#Com'è andata (known to Agnese, Gaspare, Odo) |
| C7 | The ritual cannot succeed: the lever on Varro, besides Lena asking him | Annegato#Da dove vengono (Lena, or the four in the Ossario); Laboratorio della cripta#Gli appunti; Diario di Varro#Il primo rito | Il rituale della luna nuova#Cosa succede davvero |
| C8 | Varro has the lantern, in the lab; lit, it clears the fog | Cappella#La teca; Diario di Varro#La cripta; Lena#La fuga | Laboratorio della cripta contains Lanterna della cappella; Lanterna della cappella#La luce |

Lena alone is a way to C1–C4 and C7; she joins as Lena#Cosa vuole says.
