# 20 Due giocatori: two player characters at one screen

The first playtest of more than one player character played from the same computer (D-450, with the choices of D-480 and the vehicles of D-501). Two players, a sister and a brother on one sofa, each with a 3rd-level character: Mira (Irene) and Bruna (Dario). One AI player writes for both, as two people at one keyboard do: usually «Mira: …» or «@Bruna …», sometimes both in one message, sometimes a message that names no one. The evening starts with the two apart, in two places of the same village, so that the master must tell one at a time, and Mira alone can find a letter; then they meet, leave with a cart and its mule by road, and meet brigands in a gorge. Session 2 is played with the dashboard, Dario late for its first messages.

It tests:

1. **Whose turn it is**: the master asks at the start who plays tonight; one spotlight per message, handed on by name; asks whose a message is when it names no one and the scene does not say; never speaks or decides for a player character.
2. **A secret found by one, then by both**: Mira reads Ottavia's letter while Bruna is at the forge (`reveal --to Mira`), then tells her (`reveal --to Bruna`): «Known to Mira alone» in between, and on the dashboard «Mira found out», then «Mira and Bruna found out». Bruna may learn a secret of her own at the forge, Tullio's.
3. **A fight with both** in the party: each with her turn, stopped at by name, and her own numbers.
4. **A journey with the cart and no `who`**: the two in the cart or beside it, the cart going with whoever is in it, and what it holds (the mule, the oil, the box) with it (TRV-6, D-501).
5. **A scene opened without `with`**: the engine takes the party in the scene's place, never the other player character elsewhere.
6. **The party apart**: one group at a time, each in its own scene; `travel`, `route` and `scene open` without who, from or place refused while they are apart, with where each is.

Players: `players/irene-e-dario.md`, with [brief.md](brief.md), what they remember of their characters. The page's moments of session 2: [moments.yaml](moments.yaml). This file never goes into the campaign.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$run = "<runs>\<date>\<n>"
$campaign = "$run\carro"
rpg init $campaign --name "Il carro dei Brenta" --system 5e --language it --difficulty normal --lethality dice
Copy-Item -Recurse -Force playtests\20-due-giocatori\world\* $campaign\world
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions none; rpg config lines none; rpg config veils none; rpg config advancement xp; rpg config mentor off
rpg config calendar-start "day 1"; rpg config pictures none
rpg mode "session zero"; rpg mode play
rpg advance --to "day 1, 07:15" --why "Mira da Ottavia per il contratto e l'anticipo, Bruna alla fucina per il carro"
rpg validate; rpg status
Pop-Location
```

- The settings of 05: lethality dice, saves checkpoint (with two player characters, the engine goes back by itself only when both die; for one, the master asks the table, D-480 (2)), rigor rules, advancement xp, mentor off. `voices` stays unset (auto): Ottavia, Rosso and Gaspare are worth an agent at their key moments, and in session 2 Bruna, while Dario is away, if the table chooses to have her played.
- `world/`: 27 pages. `validate` finds no problems; `status` shows day 1, 07:15, Mira (hp 21, ac 14) in Casa Brenta with Ottavia, Bruna (hp 31, ac 16) in the Fucina di Tullio with Tullio and the cart, the quest «L'olio per Ponte Serrato», and two events: Il ritorno di Gaspare (day 1, 18:00) and La scadenza di Odone (day 2, 18:00).
- The log has no scene and no roll, as `--prepared` wants.

## The sessions

First the check, which plays nothing; then the two sessions, from the repo (each builds `dist/`); then the counts and the questionnaire:

```
$run = "<runs>\<date>\<n>"
node playtests/run-playtest.mjs --campaign "$run\carro" --profile playtests\players\irene-e-dario.md --out "$run\results" --prepared playtests\20-due-giocatori\brief.md --first "Ciao! Cominciamo?" --max 50 --check
node playtests/run-playtest.mjs --campaign "$run\carro" --profile playtests\players\irene-e-dario.md --out "$run\results" --prepared playtests\20-due-giocatori\brief.md --first "Ciao! Cominciamo?" --max 50
node playtests/run-playtest.mjs --campaign "$run\carro" --profile playtests\players\irene-e-dario.md --out "$run\results" --session 2 --first "Ciao, riprendiamo?" --max 20 --dashboard --moments playtests\20-due-giocatori\moments.yaml
node playtests/count-playtest.mjs "$run\results" playtests\20-due-giocatori\world > "$run\numbers.md"
node playtests/run-playtest.mjs --profile playtests\players\irene-e-dario.md --out "$run\results" --questionnaire playtests\questionnaire.md
```

- Session 1 without the dashboard: what is measured is the master's chat. Session 2 with it: «Tocca a Mira» on a question, a discovered secret with who found it, the two in Party, and the page's sentence to Livio, which starts with the name of the character in the foreground, «Mira: …», since the page has no other way to say who speaks.
- The first message names no one on purpose: the master must ask who plays tonight. Session 2 is a new chat, and asks again.
- In session 2, Dario is late until message 7 (moments.yaml): Bruna steps aside, or is played with prudence if the table chooses (D-480 (4)).
- With uncommitted changes in the repo, add `--uncommitted`. The engine has no seed for its dice: compare the moments, not their outcomes.

## The story

Ottavia Brenta, who owns the oil press of Pietralunga, hired Mira and Bruna to take her cart to her son Livio in Ponte Serrato: six casks of oil and an iron box sealed with lead. Her debt of 300 gp to Odone, the moneylender, falls due tomorrow at sunset, and the whole valley knows it.

- **The letter** (Mira's, alone): on Ottavia's desk, Livio's letter says the box is a decoy full of stones, to draw the brigands of the gorge to the cart; the silver goes on foot with Gaspare by the mill path; the carters must not know. Ottavia, found out, owns it and offers double pay.
- **The forge** (Bruna's, alone): Tullio saw Gaspare drink with a stranger in a red scarf last night, talking of the gorge and the box; he says it only when pressed or paid.
- **The gorge** (both): Rosso, the red scarf, and three brigands wait above a pine felled across the road, nine km out. They want the box, not blood; they run when Rosso falls or two of them do. Fagiolo the mule smells them before the bend.
- **Gaspare** sold the cart to the brigands and hides the silver under the millstone of the ruined mill; at 18:00 he reaches Ponte Serrato with a torn sleeve and a tale of being robbed at the ford (event). Three ways to see through it: Tullio, Rosso questioned («a servant of the Brenta with a red birthmark on his neck»), the mill (one man's footprints, no fight). Session 2's ground.

## The pages

Each page describes only itself; where a thing is comes from its container's `contains`. Positions in km east and north of Pietralunga.

- **Places**: Pietralunga (`village`; Casa Brenta, with Mira, Ottavia and Ottavia's desk with the letter; Fucina di Tullio, with Bruna, Tullio and the cart). Strada della Forra (`road`): Pietralunga, 9 km, Forra di Sasso Rosso (Rosso; a secret, the ambush), 9 km, Ponte Serrato (`town`; Livio, Odone). Sentiero del Mulino (`path`): Pietralunga, 9 km, Mulino diroccato (`mill`; Gaspare and the Bisaccia del pane, 300 gp; a secret, the millstone), 9 km, Ponte Serrato.
- **Characters**: Mira (`pc`, Half-Elf, Rogue 3, Thief); Bruna (`pc`, Half-Orc, Fighter 3, Champion, Great Weapon Fighting); Ottavia, Tullio, Livio, Odone (Commoner); Gaspare (Scout); Rosso (Thug); Fagiolo (Mule), harnessed: in the cart's `contains`, so it goes where the cart goes. Both player characters know the people, the places of the road and the cart, never the mill path, the mill or Rosso.
- **Creature**: Brigante della Forra (Bandit). **Items**: Carro dei Brenta (`item: [[Cart]]`, so `category: drawn vehicle`, written on it too; holds Fagiolo, the Botti d'olio and the Cassetta piombata, whose stones are a secret); Scrittoio di Ottavia; Lettera di Livio (`document: letter`, its words a secret); Bisaccia del pane.
- **Quest**: L'olio per Ponte Serrato (`main`, from Ottavia). **Events**: Il ritorno di Gaspare (day 1, 18:00), La scadenza di Odone (day 2, 18:00).

## The fights

By the 2014 budget at 3rd level, for two (easy 150, medium 300, hard 450, deadly 800):

- **Forra di Sasso Rosso**: Rosso (Thug, 100 XP) and three Brigands (Bandit, 25 each): 175 XP, × 2.5 for four foes against fewer than three: 437, hard. Their morale makes it shorter: they run when Rosso falls or two of them do. Crossbows from the slope first, then down to the road. The master may size it.
- **Mulino diroccato**, if it comes: Gaspare (Scout, 100 XP), × 1.5: 150, easy; he runs rather than fights.

## Where each point should happen, in session 1

| Messages | Moment | Points |
|---|---|---|
| M1 | «Ciao! Cominciamo?»: who plays tonight | 1 |
| M2–M12 | Apart: Mira in the study while Ottavia is in the cellar, Bruna at the forge with Tullio; the letter, the advance, the forge's secret | 1, 2, 5, 6 |
| M12–M18 | Mira crosses the square, `move` to the forge; she tells Bruna, or not yet; maybe Ottavia confronted | 2 |
| M18–M22 | They climb on the cart; `travel` without `who` to the Forra, 2 hours | 4 |
| M22–M38 | The felled pine; Perception for each; the fight | 3 |
| M38–M50 | Rosso questioned or fled; on to Ponte Serrato with `travel`, Livio | 2, 4 |

## What to watch

Every moment below, in `dialogue.md` and `turns/`, and in `numbers.md`.

| | Moment | What should happen |
|---|---|---|
| T1 | The first reply, in each session | The master asks who plays tonight, by the characters' names, before anything else; in session 2, again, and Bruna steps aside or is played with prudence while Dario is away (the table's choice), never stopped at |
| T2 | Every master message | One spotlight: it follows whoever acted, the other a sentence at most; it ends handing the choice to one by name, or to both when it is truly theirs. Count the messages that end with a name, and the longest run of master messages with no choice for Bruna, or for Mira |
| T3 | A message that names no one | The master asks whose it is, unless the scene makes it plain (only one of them is there); it never acts with the wrong character |
| T4 | Every master message | The master never writes what Mira or Bruna say or decide that the players did not; a player's objection in brackets is a finding |
| T5 | The opening, apart | One group at a time, each in its own scene, cut on a hook or a choice; never both settled in one message. A scene opened with `with` naming both, or with a place and both, would drag Bruna into Casa Brenta: a finding. `scene open` with `place` and no `with` takes only who is there (point 5); without either it refuses (point 6) |
| T6 | The letter | `reveal "Lettera di Livio#Cosa dice" --to Mira`, never to both; until Mira tells her, `view` says «Known to Mira alone» and the master never lets Bruna act on it; when Mira tells her, `reveal … --to Bruna`. Tullio's secret the same way for Bruna |
| T7 | The meeting | `move Mira --to "Fucina di Tullio"` (or Bruna to Casa Brenta) before it is told |
| T8 | Leaving with the cart | Before `travel`, whoever rides is moved into the Carro dei Brenta; `travel "Forra di Sasso Rosso"` with no `who` goes with both. After it, `show` puts the cart, Fagiolo, the oil and the box in the Forra. A cart told as travelling with nobody in it stays in the forge's yard: the story and the world apart, a finding. A `travel` tried while they were apart is refused with where each is |
| T9 | The gorge | A Perception check for each, asked by name, never «roll for everyone»; the combat scene has both player characters (a `with` naming only the brigands leaves them out: a finding); `scene next` stops at each one's turn by name, the long telling for her alone; `ask --who` with the right character for each roll; each one's hit points by her own page |
| T10 | Someone falls | Death saves on her turns, by her player; if one dies while the other lives, the master asks the table whether to go back to the last save (D-480 (2)) |
| T11 | The end of the fight | `scene close` gives the XP shared by the two; Rosso, if taken, questioned by one of them: what he says revealed to who heard it |
| T12 | The dashboard, session 2 | `page/`: «Tocca a Mira» or «Tocca a Bruna» on each question, with her portrait; Party with both; World with «only Mira knows» for what one alone found out; the sentence to Livio starting «Mira:» or «Bruna:», and the master answering it as that character's words |
| T13 | The length | The master's median words per message, against 167–191 with one player character in 05 and 17 |
