<!-- Generated from the definitions of the commands: do not edit it by hand. After changing a command, run npm run docs. -->

# Commands

## Campaign

### init

Create a new campaign. It makes the settings, the present, the log, the sessions, the folders of the world, the .mcp.json through which an AI host such as Claude Code finds these tools, and the AGENTS.md and CLAUDE.md that send it to them. Use it once, when the player starts a new campaign; then ask the player for the settings that are still missing and set them with config. Example: name "The Salt Isles", language en, system 5e.

Read-only: no. Positional parameters: `folder`.

- `folder` (`string`, optional): folder of the new campaign; the current folder if left out
- `name` (`string`, optional): name of the campaign; the folder's name if left out
- `language` (`string`, optional): language of the game, as a code such as it or en
- `system` (`string`, optional): game system: one of those installed, such as 5e
- `difficulty` (`"story" | "easy" | "normal" | "hard" | "brutal"`, optional): how hard the world plays: story, easy, normal, hard, brutal
- `lethality` (`"narrative" | "epic" | "dice"`, optional): what a fall means: narrative, epic, dice

### config

Show or change the campaign settings. Without a setting it shows them all and says which are still missing; with a setting and a value it changes that one. Use it at the start of a campaign, to learn what to ask the player, and whenever the player changes a setting. system is one of the game systems installed: config lists them while it is missing. difficulty (story, easy, normal, hard, brutal) is how hard the world plays; lethality what a fall means: narrative (the character never dies), epic (only when it matters) or dice (the dice decide); saves when the game may go back: permadeath (never), checkpoint (to the last end of a scene, once the player character dies) or free (to any save, and saves when the player asks). rigor is how closely travel, fatigue, food, spell components and the like follow the rules: smooth (you gloss over them), rules (as written) or simulation (beyond them); dice who rolls the player character's dice: digital (rpg) or physical (the player, who tells you the values); units metric or imperial; companions how they come: none, made with the player or made by you in session zero, or met in play. premise (the genre, the tone and a few elements of the world, in the player's words) and preparation (on the fly or all at the start) are for a campaign without a written world. lines (what never appears in the game) and veils (what happens only off screen) are lists, changed with add and remove, and value none when the player wants none: when the player signals stop, add that content to lines. table is a list too: what you promise the player about how you play, in the words you said. precedents too: each ruling you made without the text, starting with the name of the rule in the system's language, then what you said, such as 'Poisoned: …'. coins, for a game with money whose system does not give them, lists each coin with its value in the smallest coin, with other names after a slash and "rare" for a coin never given as change; the first is the one totals are counted in. The game system may add settings of its own, such as advancement for 5e: config lists them with what each value means. fields, tables, computed, counters and recipes add to the game system what it lacks, or change it as a house rule: the value gives entries by name, written as in system.yaml, each taking the place of one with that name (a recipe adds to the system's); remove takes their names. status-line adds fields to the line of the player character. A formula with commas goes in quotes; a use's max reads what gives it, so that only who has it has it. Example: setting language, value it; or setting lines, add "spiders"; or setting counters, value 'superiority-dice: {max: "4 * has(features, Combat Superiority)", refill: short rest}'.

Read-only: no. Positional parameters: `setting`, `value`.

- `setting` (`string`, optional): setting to show or change: name, language, system, premise, preparation, difficulty, lethality, saves, rigor, dice, units, companions, lines, veils, table, precedents, coins, fields, tables, computed, counters, recipes, status-line, or one the game system adds
- `value` (`string`, optional): new value of the setting
- `add` (`string[]`, optional): items to add to a list setting (lines, veils, table, precedents, status-line), repeatable
- `remove` (`string[]`, optional): items to remove from a list setting (lines, veils, table, precedents, status-line), repeatable

## Game

### instructions

Your instructions as game master, in full: how to run this campaign and use these tools. They end with the part of the mode the campaign is in. Call it before your first reply in every chat, and again after the conversation has been summarized; then call status. Read-only, no parameters.

Read-only: yes.

No parameters.

### status

Show where the game stands. It gives the campaign's settings, the player character and companions with their counters and whereabouts, who is with them, open quests, the game date, the events due and planned, the open scene and the last ones, problems. Call it right after instructions at the start of every chat and after a summary, and whenever you need to check where things stand. It shows names and numbers only: read pages with show. Read-only, no parameters.

Read-only: yes.

No parameters.

### mode

Move the campaign to another mode, the main state of the game: setup (the settings, out of the game), session zero (the player character and the companions, made in play) or play. It goes on only when the checklist before that mode is complete, and otherwise says what is still missing; then it gives the instructions of the mode it enters. Call it when status says nothing is missing and the player confirms; back to session zero to make a new player character. Example: to "session zero".

Read-only: no. Positional parameters: `to`.

- `to` (`"setup" | "session zero" | "play"`, required): the mode to enter: setup, session zero, play

### validate

Check the whole campaign and say how to fix each problem. It looks for files that cannot be read, standard fields, links to pages, sections or secrets that do not exist, things in two places, repeated names, the settings and the log. Use it when status reports problems, or after pages were changed by hand. Read-only, no parameters.

Read-only: yes.

No parameters.

### write

Create or change a page of the world. The world's pages are written only with this command: use it as soon as something becomes true in the story, such as a new character, place or item, or a change. Without a section it writes the introduction, the text before the first heading; with Page#Name it writes one section, or one secret written > [!secret] Name. Add secret to create a missing one as a secret; empty text removes the section or secret. A list field changes one item at a time with add and remove; a place's environment, one line at a time, such as add environment="light: dark". It also writes the fields of a copy in the open scene. Moving someone or something goes with move, what a character learns with reveal, conditions and forms with effect. Example: page Bruna, type character, set role=npc, text "A ferry keeper who knows every current of the river."

Read-only: no. Positional parameters: `page`.

- `page` (`string`, required): name of the page, or of a copy in the open scene; Page#Name writes one section or one secret
- `type` (`"character" | "place" | "faction" | "quest" | "item" | "event" | "topic" | "creature"`, optional): type of a new page, or the new type of one that exists: character, place (a room, a house, a ship, a region), faction, quest, item (a thing, even one with someone inside, such as a cart), event, topic, creature
- `set` (`string[] | object`, optional): fields to set: field=value, repeatable, or an object such as {"role": "npc"}. A link is [[Page]], links are [[A]], [[B]], a list is [a, b]
- `unset` (`string[]`, optional): fields to remove, repeatable
- `add` (`string[] | object`, optional): items to add to list fields: field=value, repeatable, such as factions=[[Barcaioli]], or an object
- `remove` (`string[] | object`, optional): items to remove from list fields: field=value, repeatable, or an object
- `text` (`string`, optional): text of the introduction, the part before the first heading; or of the section or secret given
- `section` (`string`, optional): section or secret to write; a missing one is added at the end of the page, as a secret if secret is given; empty text removes it
- `append` (`boolean`, optional): add the text at the end instead of replacing
- `secret` (`boolean`, optional): with a section: create it, if missing, as a secret block > [!secret] Name

### move

Move characters, items or places into a place, a character's inventory or an item: whenever someone or something goes somewhere, before you narrate it. Each ends up only there, wherever it was before, and conditions such as party in [[Ossario]] fire; it says where they are now, who else is there and what changes around them. Time does not pass: advance does that. Example: page [Ettore, Lena], to Ossario.

Read-only: no. Positional parameters: `page`.

- `page` (`string | string[]`, required): what moves: one or more characters, items or places, such as [Ettore, Lena]
- `to` (`string`, required): where: a place; for characters and items also an item, such as a cart; for items also a character who carries them

### reveal

Record what characters learn: a secret, as Page#Secret, or a whole page they did not know; for one or more characters, the player's character if left out. Use it as soon as a character learns it. It adds the links to their knows and answers in one line, without the text: read a secret with show before you tell it. Example: page [Coppa#Veleno, Varro], to [Ettore, Bruna].

Read-only: no. Positional parameters: `page`.

- `page` (`string | string[]`, required): what they learn: Page#Secret, or a whole Page; one or a list
- `to` (`string | string[]`, optional): who learns it: one or more characters, companions too when they learn it; the player's character alone if left out

### show

Show a page of the world, or one of its sections or secrets, with what it inherits from the pages it derives from. It also says where the thing is and which pages link to it, and shows a copy in the open scene too. Use it before describing anything that already exists, so that what you say matches what is written. The player character and the companions show the sheet of the game system in groups, such as Abilities; Page#Group shows one group with how each number is made. Example: page "Old lighthouse"; or page "Old lighthouse#Cellar" for one section.

Read-only: yes. Positional parameters: `page`.

- `page` (`string`, required): name of the page, or of a copy in the open scene; Page#Name shows one section or one secret, or a group of a character's sheet

### find

Find pages of the world. It looks for a text in their names, fields and text, ignoring case, or lists the pages of a type; the game system's pages are found by their names and fields. Use it when you do not know a page's exact name, and before creating a page, to check that it does not exist under another name. Example: text "lanterna"; or type place.

Read-only: yes. Positional parameters: `text`.

- `text` (`string`, optional): text to look for, ignoring case; every page if left out
- `type` (`"character" | "place" | "faction" | "quest" | "item" | "event" | "topic" | "creature"`, optional): only pages of this type: character, place, faction, quest, item, event, topic, creature

### rules

Find the exact text of a rule: the campaign's house rules first, then the game system's rules, then the table's precedents. Use it whenever you are unsure how a rule works, before you rule and say what is at stake, and when the player questions a ruling. Give the book's words, such as grappled, opportunity attack or long rest; a heading, or headings joined by ›, reads that section. Without a text it lists the chapters. Example: text "grappled".

Read-only: yes. Positional parameters: `text`.

- `text` (`string`, optional): the words of the rule, or the heading of a section; the chapters when left out

### roll

Roll dice and log the roll. Give what the roll is for and, if it belongs to someone, whose it is. When the player rolls physical dice, pass the faces they rolled as values. When the player must not see the result, make it hidden; give the player its fingerprint only if they ask for it. reveal shows a hidden roll's proof later. Notation: 1d20+5, 2d20kh1 (keep the highest), 4d6dl1 (drop the lowest), 2d6ro<=2 (reroll once), 1d6! (exploding), 6d10>=8 (count successes), 4dF, d%. With who, a field of their sheet stands for its value, such as 1d20+athletics. keep writes the dice rolled in a field of who that keeps rolls for later, such as the two d20 of a diviner's Portent, rolled by the player for the player character, by you for a companion; use takes one of those instead of the die, as field=value, from who or from the page in from, and logs which roll it replaced. Example: notation 1d20+perception, why "notice the trap", who Lena.

Read-only: no. Positional parameters: `notation`.

- `notation` (`string`, optional): dice to roll: 1d20+5, 2d20kh1, 4d6dl1, 2d6ro<=2, 1d6!, 6d10>=8, 4dF, d%; with who, 1d20+athletics takes the value from their sheet
- `why` (`string`, optional): what the roll is for
- `who` (`string`, optional): character the roll belongs to, or a copy in the open scene; leave it out for a free roll of the master
- `values` (`number[]`, optional): faces rolled by the player with physical dice, separated by commas; on the command line write --values=-1,0,1 for negative faces
- `hidden` (`boolean`, optional): only the master sees the result; its fingerprint goes to the player only if they ask for it
- `reveal` (`string`, optional): id of a hidden roll to reveal
- `keep` (`string`, optional): a field of who that keeps rolls for later, such as portent: the dice rolled go there, in place of what it held
- `use` (`string`, optional): a kept roll to use instead of the die, as field=value, such as portent=3: the notation has one die
- `from` (`string`, optional): who keeps the roll that use takes, when it is not who rolls

### ask

Ask the player with buttons, in apps that show them a form: every roll of the player's character, and every choice that is truly theirs to make. The call returns when the player clicks: for a check, the engine rolls it, logs it as the player's roll, and gives you the result. For a roll: put in the question what is at stake either way, in one line of about 100 characters (apps may cut it), and give the checks that fit, each with its dice; the player may also change their mind. In a fight: the attack, then the damage if it hits, each with its own ask; saving throws and rolls to stay alive too. For a choice the rules or the story force (a reaction, a fork): give the answers. Never to offer actions, which are the player's to say, and never for hidden rolls. Write nothing before the call: the question carries what is at stake, and the story goes on after the click. Example: question "Scavalcare il muro prima della ronda: se fallisci, cadi e ti sentono", options ["Atletica 1d20+5", "Acrobazia 1d20+3"], who Bruna.

Read-only: no.

- `question` (`string`, required): what is at stake either way, or the choice, in one line, in the player's language
- `options` (`string | string[]`, required): for a roll, the checks that fit with their dice, such as Atletica 1d20+5; for a choice, the answers, such as Sì and No; from 1 to 4
- `who` (`string`, optional): for a roll, the player's character, such as Bruna; the only one there is, if left out

### change

Change a counter or money on a page: hit points, uses, ammunition, supply, a progress track, an event's clock, coins. A counter is a field written as a number (20, from 0 up) or as current/max (12/12, from 0 to the maximum); create it with write, then change it only with this command. by adds or takes away and stops at a limit (damage, healing); spend takes what is paid or used up, and is refused when there is not enough; to sets a value, max, or current/max (15/15 changes the maximum too), even outside the limits. Money is a field written in the campaign's coins, such as money: 34 gp 4 sp: spend "5 sp" pays and makes change, by "+20 gp" adds coins, to "10 gp" sets the purse. recipe applies a rest of the game system, such as long rest, once you have advanced its hours: to the page, or without one to the player character and the companions with them. Example: page Bruna, field hp, by -7, why "bitten by the wolf"; or recipe "long rest".

Read-only: no. Positional parameters: `page`, `field`.

- `page` (`string`, optional): page that holds the counter or the money; with a recipe, left out for the player character and the companions with them
- `field` (`string`, optional): the counter or the money, such as hp; none with a recipe
- `by` (`integer | string`, optional): how much to add, or to take away when negative, or coins; on the command line write --by=-7
- `spend` (`integer | string`, optional): how much is paid or used up, or coins
- `to` (`integer | string`, optional): the new value: a number, max, current/max such as 15/15, or coins; on the command line write --to=-3
- `why` (`string`, optional): what the change is for
- `recipe` (`string`, optional): a recipe of the game system, such as long rest

### effect

Put a condition or an effect on a character, a place or a copy in the open scene, or end one: frightened, prone, a spell, a form; on a place, such as rain or magical darkness, it holds for all inside by its name, and its values are the place's own. add gives its name, how long it lasts, who keeps it alive if someone must (concentration), and the values it gives meanwhile; what else it does in play is yours to rule. It ends by itself, and advance or scene says so; end takes it away sooner, or every effect someone keeps alive. Example: action add, page Ennio, name "Scudo della fede", for 10m, by [[Lena]], set bonus-ac=2.

Read-only: no. Positional parameters: `action`, `page`, `name`.

- `action` (`"add" | "end"`, required): add or end
- `page` (`string`, optional): who has it: a page, or a copy in the open scene such as Annegato 2
- `name` (`string`, optional): the effect's name, such as Benedizione; a condition of the game system always by its name there, such as Frightened
- `for` (`string`, optional): add: how long it lasts: 10m, 1h, 1d 6h; in a scene with turns, rounds from the current turn, such as 1 round; or scene, until it ends; or an occasion of the game system, such as long rest, which its recipe brings. Left out, it lasts until it is ended: so for one that ends with something in the story, such as until they breathe clean air; end it then
- `until` (`string`, optional): add, in a scene with turns: whose next turn ends it when it starts, such as Ennio, instead of for
- `by` (`string`, optional): add: who keeps it alive, such as [[Lena]]; end: take away every effect they keep, on everyone
- `set` (`string[] | object`, optional): add: the values it reads while it lasts, field=value, repeatable, such as speed=20; for a field the game system declares a bonus, what it adds, such as bonus-ac=2. What must outlive it, such as hit points it adds, change on the page instead
- `why` (`string`, optional): what caused it, or ended it

### advance

Let time pass in the story, whenever it does, before you narrate it: by a duration, such as 10m, 4h or 1d 6h, or to a later game date, such as day 3, 06:00. At the first scene, set the date the game starts on with to, at the scene's hour. Time never goes back. It stops at the first planned event that comes due, names it and says how to play it; on a new day, it lists the events' clocks to move. Example: by 8h, why "a night at the inn".

Read-only: no.

- `by` (`string`, optional): how much time passes, in days, hours and minutes: 10m, 4h, 1d 6h
- `to` (`string`, optional): the game date to reach, such as day 3, 06:00 (day 3 alone is its midnight); the first one sets when play starts, at the hour of the first scene, such as day 1, 18:00
- `why` (`string`, optional): what the time is spent on

### scene

Open, run and close a scene of the story. open starts one: title, type (combat, social, exploration, travel, rest, challenge, other), place (the character's if left out), with (everyone in it, the character included: the character and the companions with them, if left out) and creatures, as numbered copies such as Annegato 1: a copy holds only what changes, the rest is read from the creature. Whoever of the party is elsewhere moves to the scene's place, except in a travel scene. add brings in more characters or creatures; leave takes out who goes (fled, fallen, gone); order sets who takes turns, in order, after rolling for it if the game does; next passes the turn; close ends the scene with a summary of one or two sentences, as the player saw it: the player may read the title and summary. Change a copy's counters with change, as for a page. Example: action open, title "Scontro all'ossario", type combat, creatures {"Annegato": 2}.

Read-only: no. Positional parameters: `action`.

- `action` (`"open" | "add" | "leave" | "order" | "next" | "close"`, required): open, add, leave, order, next or close
- `title` (`string`, optional): open: the scene's title
- `type` (`"combat" | "social" | "exploration" | "travel" | "rest" | "challenge" | "other"`, optional): open: combat, social, exploration, travel, rest, challenge, other
- `place` (`string`, optional): open: the place, such as [[Ossario]]; the character's if left out
- `with` (`string | string[]`, optional): open, add: the characters in the scene, such as [[Lena]]
- `creatures` (`string | string[] | { [key]: integer }`, optional): open, add: creatures as numbered copies: Annegato=2 (Annegato alone is one), or through MCP an object such as {"Annegato": 2}
- `who` (`string | string[]`, optional): leave: who leaves the scene, characters or copies, such as Annegato 2
- `order` (`string | string[]`, optional): order: who takes turns, in order; those left out (fallen, fled) take none
- `summary` (`string`, optional): close: what happened, in one or two sentences, as the player saw it

### save

The saves of the campaign: a zip of its files in .saves, made by itself at the end of each scene. list gives them, with what loading may do under the campaign's saves setting; make saves when the player asks, only with saves free; load goes back to a save, by its number or last: with free to any, with checkpoint only to the last and only once the player character is dead, with permadeath never. Going back removes what happened since, the later saves too: load only when the player has said so. A load that stopped halfway is finished by save load. Example: action load, save last.

Read-only: no. Positional parameters: `action`, `save`.

- `action` (`"list" | "make" | "load"`, optional): list, make or load
- `label` (`string`, optional): make: a few words that name the save, such as before the duel
- `save` (`string`, optional): load: the number of a save, or last
