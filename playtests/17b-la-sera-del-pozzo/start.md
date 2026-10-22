# 17b La sera del pozzo: the four ways of voices

The world of 17 on the evening the well is walled up, played four times, once for each value of `voices` (D-481, D-490): `master`, no agent; `auto`, the character agent at key moments; `important`, always for the companions and the characters with `kind: main`; `always`, always for everyone. The same start, the same player, the same first message: what changes is who speaks for the characters. Two of them carry the evening: Ermanno, questioned, with a secret, the villain who decides whether to wall the well; and Gisella, who gave him her word. Tommaso judges the narration with [narration.md](narration.md); the counts give the cost, the wait and the calls.

Player: `players/marco.md`, with [brief.md](brief.md). This file never goes into the campaign.

## The start

Day 7, 17:30, at Fontebassa, half an hour before [[Il pozzo murato]] (day 7, 18:00): the adventure of 17 installed, its start put 13 km south of Roccalba with the Mulattiera di valle, the party arrived in the morning with Nino, and the quest «La voce nel pozzo» open since Agata asked it at noon. No scene is open.

- **Ermanno** (`kind: main`). His secret is split in two: «Cosa ha fatto», what he did and that he salts the well at night, is his, in his `knows`; «Ciò che non sa, e quando cede» is the master's: Nino saw him, and he confesses before two proofs or the buckle, never one. The master gives that to the agent as his nature (Voices). He also knows Gisella's promise.
- **Gisella** (`kind: main`). A secret of hers, «La promessa», in her `knows` and Ermanno's: this morning she took ten gold coins from Ermanno to help him wall the well at sunset, and has told no one. Her ideal: a promise is worth more than gold; her bond: Corrado saved her leg.
- **Corrado** knows Nino's secret: three nights ago Nino saw Ermanno pour salt into the well. One proof, and he has not told the others.
- **Agata** and **Nino** know their own secrets, and everyone in the hamlet knows the party.

## The campaigns

Before the runs, from the repo at the commit under test (PowerShell), in a new folder of the day:

```
$day = "<runs>\2026-10-23"
$campaign = "$day\base\fontebassa"
rpg init $campaign --name "La sera del pozzo" --system 5e --language it --difficulty normal --lethality dice
Copy-Item -Recurse -Force playtests\17-un-avventura-a-meta\world\* $campaign\world
Copy-Item -Recurse -Force playtests\17b-la-sera-del-pozzo\world\* $campaign\world
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions "made by the master"; rpg config lines none; rpg config veils none; rpg config advancement xp; rpg config mentor off
rpg config calendar-start "day 1"; rpg config pictures none
rpg mode "session zero"; rpg mode play
rpg advance --to "day 6, 20:00" --why "La cena all'osteria, dopo i goblin del pianoro"
rpg package install <repo>\playtests\17-un-avventura-a-meta\adventure
rpg write Fontebassa --set "position=0 km E, 13 km S" --why "Il casale in fondo alla valle, a mezza giornata a sud di Roccalba"
rpg write "Ermanno#Cosa ha fatto" --text "Vent'anni fa, nella lite per il prato di sopra, spinse Piero contro il pozzo aperto. Piero cadde; Ermanno non chiamò nessuno, e all'alba disse che il fratello era partito. Da quando il pozzo sussurra ci versa sale di notte, di nascosto." --why "Ciò che Ermanno sa di sé, separato da ciò che è del master"
rpg write Ermanno --section "Ciò che non sa, e quando cede" --secret --text "[[Nino]] l'ha visto versare il sale. Non confessa per una prova sola; davanti a due, o alla fibbia, crolla. Se confessa davanti al casale, Piero è soddisfatto; se lo dice soltanto al pozzo, al buio, no." --why "Ciò che Ermanno non sa, per il master"
rpg write Ermanno --set kind=main --why "Il cattivo che decide"
rpg write Gisella --set kind=main --why "La scelta della sera"
rpg reveal Fontebassa "Mulattiera di valle" Agata Nino "La voce nel pozzo" --to Corrado --to Gisella --to Tobia --to Lucia
rpg reveal Corrado Gisella Tobia Lucia Roccalba "Osteria della Lanterna" "Mulattiera di valle" --to Nino
rpg advance --to "day 7, 06:00" --why "La notte all'osteria; all'alba si parte con Nino per Fontebassa"
rpg travel Fontebassa
rpg reveal Ermanno "Pozzo di Fontebassa" --to Corrado --to Gisella --to Tobia --to Lucia
rpg reveal "Ermanno#Cosa ha fatto" Corrado Gisella Tobia Lucia Fontebassa "Pozzo di Fontebassa" Agata Nino --to Ermanno
rpg reveal "Agata#Cosa sa" Corrado Gisella Tobia Lucia Fontebassa "Pozzo di Fontebassa" Ermanno Nino --to Agata
rpg reveal "Nino#Cosa ha visto" Fontebassa "Pozzo di Fontebassa" Ermanno Agata --to Nino
rpg advance --to "day 7, 10:00" --why "Il casale, il pozzo e la fucina; Agata porta Corrado dai malati"
rpg write Gisella --section "La promessa" --secret --text "Stamattina, mentre Corrado era da Agata coi malati, [[Ermanno]] l'ha presa da parte alla fucina: dieci monete d'oro per aiutarlo a murare il pozzo al tramonto, «prima che faccia altro male». Lei gli ha stretto la mano e ha preso le monete. Agli altri non l'ha ancora detto." --why "Ermanno compra l'aiuto di Gisella"
rpg reveal "Gisella#La promessa" --to Gisella --to Ermanno
rpg change Gisella money --by "+10 gp" --why "Le dieci monete di Ermanno, per murare il pozzo al tramonto"
rpg advance --to "day 7, 12:00" --why "Corrado fra le febbri in casa di Agata"
rpg write "La voce nel pozzo" --set status=open --why "Agata chiede al gruppo di far tacere il pozzo senza murarlo"
rpg advance --to "day 7, 15:00" --why "Il pomeriggio al casale"
rpg reveal "Nino#Cosa ha visto" --to Corrado
rpg advance --to "day 7, 17:30" --why "Nino parla a Corrado al lavatoio; Ermanno e i figli portano le ultime pietre al pozzo"
rpg validate; rpg status
Pop-Location

$ways = [ordered]@{ "1-master" = "master"; "2-auto" = "auto"; "3-important" = "important"; "4-always" = "always" }
foreach ($run in $ways.Keys) {
    Copy-Item -Recurse $campaign "$day\$run\fontebassa"
    Push-Location "$day\$run\fontebassa"
    rpg config voices $ways[$run]
    Pop-Location
}
Remove-Item "$day\1-master\fontebassa\.claude\agents\rpg-character.md"
```

- `validate` finds no problems; `status` shows day 7, 17:30, the four at full hit points in Fontebassa with Agata, Ermanno and Nino, the quest open, and Il pozzo murato in 30 minutes.
- `config voices master` leaves the agent's file to the rpg server, which takes it away as it starts; the run checks the campaign before that, so the last line takes it away as the server would.
- The log has no scene and no roll, as `--prepared` wants.

## The runs

First a check of each campaign, which plays nothing: `--check` with the same options. Then the four, one after the other, from the repo (each builds `dist/`, so never two at once), and the counts of each:

```
$day = "<runs>\2026-10-23"
foreach ($run in "1-master", "2-auto", "3-important", "4-always") {
    node playtests/run-playtest.mjs --campaign "$day\$run\fontebassa" --profile playtests\players\marco.md --out "$day\$run\results" --prepared playtests\17b-la-sera-del-pozzo\brief.md --first "Ciao, riprendiamo?" --max 12 --hard 14
    node playtests/count-playtest.mjs "$day\$run\results" "$day\base\fontebassa\world" > "$day\$run\numbers.md"
}
```

- No `--dashboard`: the turns are the same in the four, and the subagent's wait is not mixed with the page's.
- The engine has no seed for its dice: each run rolls its own. Compare the moments, not their outcomes.
- The master at its own effort, Opus; the player Sonnet, as in every run.
- With uncommitted changes in the repo, add `--uncommitted`.

## Cost

From 17 (1.87 $ for 15 master turns, 0.16 $ the player) and Elena's measure of a call to the agent with Opus (about 0.085 $), at list prices:

| Run | Calls to the agent, guessed | Cost |
|---|---|---|
| master | 0 | about 1.8 $ |
| auto | 4–8 | about 2.2–2.5 $ |
| important | 25–40: the companions and Ermanno at every line | about 4–5.5 $ |
| always | 40–65: everyone at every line | about 5.5–7.5 $ |

About 14–17 $ for the four, and 2–3 hours one after the other; `important` and `always` wait longest per turn.

## What to watch

The narration, for Tommaso: [narration.md](narration.md). The numbers, from `numbers.md` of each run: the master's cost per turn and in all, the seconds per master turn, and the character agent's rows (calls per turn and by character, the same character twice in a turn, seconds and tokens per call, `view` as the name the message begins with, the answers in Says and Does, the names it said that it was not given). Each call's answer is in `numbers.json`, `characterAgent`.
