# 18 Un libro: playing inside a book

The first playtest of the Importer, adventures piece 2 (D-484, D-489). A new campaign in its setup, most settings chosen, no world yet. The player brings a book he owns, as a PDF: «The Man Who Would Be King», Rudyard Kipling's novella of 1888, in the public domain. The master imports it from the chat with `import`, while the setup goes on; the helper reads it outside the chat; the master asks whether the player has read it and proposes three or four starting points; the player chooses; the world is set at that point, installed, and the narration follows the book. Then session zero with the character of the book he chose, and the first scenes. One evening of about 30 messages.

Player: `players/marco.md`, with [brief.md](brief.md). This file never goes into the campaign.

## The book

The text of Project Gutenberg #8147, laid out as an A5 PDF of 32 pages with selectable text, without Project Gutenberg's header and licence (the work itself is in the public domain): not kept in this repo. Make it once, or take the one of an earlier run, and put it beside the campaign, outside it: `$run\libri\l-uomo-che-volle-farsi-re.pdf`.

## The campaign

Before session 1, in a new folder chosen as `README.md` says, from the repo at the commit under test (PowerShell):

```
$run = "<runs>\2026-10-21\1"
$campaign = "$run\kafiristan"
rpg init $campaign --name "L'uomo che volle farsi re" --system 5e --language it --difficulty normal --lethality dice
New-Item -ItemType Directory "$run\libri"; Copy-Item <the PDF> "$run\libri\l-uomo-che-volle-farsi-re.pdf"
Push-Location $campaign
rpg config saves checkpoint; rpg config rigor rules; rpg config dice digital; rpg config units metric
rpg config companions none; rpg config lines none; rpg config veils none; rpg config advancement milestones; rpg config mentor off
rpg config pictures none
rpg validate; rpg status
Pop-Location
```

- Left to the setup: premise, preparation and calendar-start, which the book answers; the prose, story and author are never set, so the import sets them from the book (D-489 (9)).
- Claude Code logged in on this computer: the import's helper is `claude -p`.

## The session

`--prepared playtests\18-un-libro\brief.md --max 30 --hard 36`, first message, with the PDF's whole path in place of `<path>`: «Ciao! Vorrei giocare dentro un libro che ho, L'uomo che volle farsi re di Kipling: è il PDF <path>. Si può?». After the session, `rpg import`, `rpg package list` and `rpg config` in `campaign-after/`. Then the checklist, on the moments below.

## What to watch

| | Moment | What is right |
|---|---|---|
| B1 | The import | One `import` with the path the player gave, no reading of the PDF with the host's own tools; the master tells the player it takes minutes and goes on with the setup meanwhile, never pretending it is done |
| B2 | The starts | The master asks whether he has read it; three or four starts, with who could be played, told as a back cover would: nothing of how the story ends (Dravot's crown, the bridge, Carnehan's return) |
| B3 | The world at the start | `import` with the start chosen, then `package install` of the folder it names; the events before the start happened, those after planned; the pages in Italian, the names as the book has them |
| B4 | The narration | `author` Rudyard Kipling and `story` set by the import, and the master tells the player in a line, who may change it; the master then writes in that way, never his sentences |
| B5 | The character | Session zero makes the character of the book chosen: his past, bonds and nature from his page, the sheet derived from what the book shows and confirmed by the player, `role: pc` only then; what he did not know at that point stays secret |
| B6 | Secrets | Nothing of the secret blocks or of what comes after the start in the chat; the opening page never shown |
| B7 | The book goes on | The world moves as in the book until the player changes it: a planned event comes when it is due; changed, it is cancelled or tried another way |
| B8 | Times | Minutes from the first message to the starts, to the world set, to the first scene; what the player waited for and how the master filled it |
