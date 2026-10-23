# 19 La plancia: the evening of the well, played from the dashboard

The world of 17b on the same evening, played with the dashboard open (`--dashboard`) and the player using it: the house rules turned on in Packages › Library (D-491 (13)), a sentence said to Gisella from her name in Scene, which rings the master through Claude Code's doorbell (D-495), and a short rest whose hit dice the player spends one at a time on the page (D-492, ASK-14). Corrado starts hurt, so that a rest makes sense. `voices` stays unset (auto). Davide judges the page as a player who does not program, Giulia the master's use of what the page brings, Tommaso the narration around it.

Player: `players/marco.md`, with [brief.md](brief.md). The page's moments: [moments.yaml](moments.yaml). This file never goes into the campaign.

## The campaign

From the base campaign of 17b (its `start.md` makes it), in a new folder of the day, with the run's own shelf of house rules beside it (PowerShell):

```
$runs = "<runs>"
$day = "$runs\2026-10-23"
$run = "$day\5-plancia"
New-Item -ItemType Directory -Force "$run\libri"
Copy-Item -Recurse "$day\base\fontebassa" "$run\fontebassa"
# The house rules, written by hand: an original text of a few lines on a short rest with a healer's kit, consecrated water and promises.
Set-Content -Encoding utf8 "$run\libri\Regole della casa.md" "<the house rules>"
Push-Location "$run\fontebassa"
rpg change Corrado hp --to 13 --why "Alle quattro, al pozzo, una pietra scivolata dal carro di Ermanno gli ha preso il fianco: costole ammaccate"
rpg config library --add "$run\libri"
rpg config library --remove "$run\libri"
rpg config library; rpg validate
Pop-Location
(Get-Content -Raw -Encoding utf8 playtests\19-la-plancia\moments.yaml).Replace("<runs>", $runs) | Set-Content -Encoding utf8 -NoNewline "$run\moments.yaml"
```

- `config library --add` from the terminal adds the folder to this computer's library without the window's yes, and reads it; `--remove` turns it off in the campaign and keeps it on the computer, so that the player turns it on from the page. `config library` says «on this computer, not used here».
- This is the player's real data folder: after the run, `rpg config library --remove "$run\libri" --computer` from the campaign takes the shelf and its text away.
- The log has no scene and no roll, as `--prepared` wants.

## The run

First the check, which plays nothing; then the run, from the repo (it builds `dist/`):

```
$day = "<runs>\2026-10-23"
$run = "$day\5-plancia"
node playtests/run-playtest.mjs --campaign "$run\fontebassa" --profile playtests\players\marco.md --out "$run\results" --prepared playtests\19-la-plancia\brief.md --first "Ciao, riprendiamo?" --max 14 --hard 16 --dashboard --moments "$run\moments.yaml" --check
node playtests/run-playtest.mjs --campaign "$run\fontebassa" --profile playtests\players\marco.md --out "$run\results" --prepared playtests\19-la-plancia\brief.md --first "Ciao, riprendiamo?" --max 14 --hard 16 --dashboard --moments "$run\moments.yaml"
node playtests/count-playtest.mjs "$run\results" "$day\base\fontebassa\world" > "$run\numbers.md"
```

- With uncommitted changes in the repo, add `--uncommitted`.
- After the sentence to Gisella the run waits up to 60 s for the turn the doorbell wakes (`M3-bell` in `turns/` and the dialogue); none means the hook did not ring, and the sentence waits for the master's next call.
- The short rest is the master's to ask: the moment before message 7 only gives Marco the wish. A master that rests without `ask` and its recipe is a finding for Giulia.

## Cost

As one run of 17b with `auto` (about 2.2–2.5 $), plus the page's questions and the woken turn: about 3–4 $ at list prices, 45–60 minutes.

## What to watch

- **The Library**: the master hears the shelf turned on; whether `rules` finds the house rules when Corrado heals or rests, citing the book.
- **The sentence to Gisella**: the strip on the page (`page/P4-said.png`), the woken turn, and whether the master answers it as Marco's words and keeps Gisella's promise secret as 17b wants.
- **The short rest**: `ask` with the recipe, the card on the page, the dice spent (`page/asked.jsonl`), the hit points after, and whether the master tells it in the story without asking again.
- **The page**: `page/console.txt` empty of errors; the screenshots of each turn.
