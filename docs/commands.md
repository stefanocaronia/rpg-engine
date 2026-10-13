<!-- Generated from the definitions of the commands: do not edit it by hand. After changing a command, run npm run docs. -->

# Commands

## Campaign

### init

Create a new campaign.

Read-only: no. Positional parameters: `folder`.

- `folder` (`string`, optional): folder of the new campaign; the current folder if left out
- `name` (`string`, optional): name of the campaign; the folder's name if left out
- `language` (`string`, optional): language of the game, as a code such as it or en
- `system` (`string`, optional): game system: one of those installed, such as 5e
- `difficulty` (`"story" | "easy" | "normal" | "hard" | "brutal"`, optional): how hard the world plays: story, easy, normal, hard, brutal
- `lethality` (`"narrative" | "epic" | "dice"`, optional): what a fall means: narrative, epic, dice

### config

Show or change the campaign settings.

Read-only: no. Positional parameters: `setting`, `value`.

- `setting` (`string`, optional): setting to show or change: name, language, system, mentor, premise, preparation, prose, story, author, style, difficulty, lethality, saves, rigor, dice, units, companions, pictures, lines, veils, table, precedents, learned, coins, fields, tables, computed, counters, recipes, status-line, travel, or one the game system adds
- `value` (`string`, optional): new value of the setting
- `add` (`string[]`, optional): items to add to a list setting (lines, veils, table, precedents, learned, status-line), repeatable
- `remove` (`string[]`, optional): items to remove from a list setting (lines, veils, table, precedents, learned, status-line), repeatable

### translate

Translate the player's dashboard into the campaign's language yourself, in the chat.

Read-only: no.

- `phrases` (`{ [key]: string } | string`, optional): the last batch translated: from each id, such as p12, to its translation

### install

Install Codex or Claude Code on the player's computer, and open their sign-in.

Read-only: no. Positional parameters: `program`.

- `program` (`"codex" | "claude"`, required): codex for a ChatGPT account, any plan; claude for Claude Pro or Max

## Game

### instructions

Your instructions as game master, in full: how to run this campaign and use these tools.

Read-only: yes.

No parameters.

### status

Show where the game stands.

Read-only: yes.

No parameters.

### mode

Move the campaign to another mode: setup (the settings, out of the game), session zero (the player character and the companions, made in play) or play.

Read-only: no. Positional parameters: `to`.

- `to` (`"setup" | "session zero" | "play"`, required): the mode to enter: setup, session zero, play

### validate

Check the whole campaign and say how to fix each problem.

Read-only: yes.

No parameters.

### write

Create or change a page of the world.

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
- `here` (`boolean`, optional): a new place where the journey stopped: on a road it becomes a stop there, in the open it takes the point; those who travel go into it

### rename

Give a page of the campaign a new name, as when the player names their wolf or the character learns a place's true name.

Read-only: no. Positional parameters: `page`, `to`.

- `page` (`string`, required): the page to rename: its name, or its path, as world/characters/Varro.md
- `to` (`string`, required): its new name

### move

Move characters, items or places into a place, a character's inventory or an item: whenever someone or something goes somewhere, before you narrate it.

Read-only: no. Positional parameters: `page`.

- `page` (`string | string[]`, required): what moves: one or more characters, items or places, such as [Ettore, Lena]
- `to` (`string`, optional): where: a place; for characters and items also an item, such as a cart; for items also a character who carries them
- `at` (`string`, optional): the square one stands on, such as E6: on the map of the place they are in, or with to of the place they go into; for one page or one copy of the open scene

### reveal

Record what characters learn: a secret, as Page#Secret, or a whole page they did not know.

Read-only: no. Positional parameters: `page`.

- `page` (`string | string[]`, required): what they learn: Page#Secret, or a whole Page; one or a list
- `to` (`string | string[]`, optional): who learns it: one or more characters, companions too when they learn it; the player's character alone if left out

### image

Give a page its picture: a portrait for a character, an image for a creature, an item or a place, as the dashboard will show it in a round token.

Read-only: no. Positional parameters: `page`, `file`.

- `page` (`string`, required): the page that gets the picture
- `file` (`string`, optional): the picture's file, PNG, JPEG, WebP or SVG up to 5 MB: its full path or one from the folder the command runs in; leave it out to remove the page's own picture
- `describe` (`string`, optional): instead of file, in a few lines, never a victim or wounds: for a place, what the party sees arriving; for a quest, what the character knows of it; for one of the party, their look, their people as this world has them and the rest as the player described it; for a character or a creature met, what the character sees of them, a disguise as the disguise; never what the character does not know. The picture is made where it can be, and comes by itself

### show

Show a page of the world, or one of its sections or secrets, with what it inherits from the pages it derives from.

Read-only: yes. Positional parameters: `page`.

- `page` (`string`, required): name of the page, or of a copy in the open scene; Page#Name shows one section or one secret, or a group of a character's sheet

### view

What the player may see, without spoilers: use it, not show, when the player asks what their character knows, remembers or carries.

Read-only: yes. Positional parameters: `page`.

- `page` (`string`, optional): a page as the player character knows it, or Page#Name for one section or discovered secret; none for the whole view
- `diary` (`string`, optional): how many lines of the diary, from the last; 10 if left out; all only when the player asks for the whole story
- `rolls` (`string`, optional): for the dashboard: how many of the last public rolls; 20 if left out
- `map` (`boolean`, optional): the world map as the player character knows it: the places it knows, nearest first, with kind, distance and direction, and the regions
- `settings` (`boolean`, optional): for the dashboard: the player's settings and what each value means
- `saves` (`boolean`, optional): for the dashboard: the saves, and what the player may do with each
- `setup` (`boolean`, optional): for the dashboard: the campaign's mode and name, what the next mode needs, and the setup's questions
- `journal` (`boolean`, optional): for the dashboard: the quests the character knows, with goals, counters, clock and deadline, and the story by scenes

### find

Find pages of the world.

Read-only: yes. Positional parameters: `text`.

- `text` (`string`, optional): text to look for, ignoring case; every page if left out
- `type` (`"character" | "place" | "faction" | "quest" | "item" | "event" | "topic" | "creature"`, optional): only pages of this type: character, place, faction, quest, item, event, topic, creature

### rules

Find the exact text of a rule: the campaign's house rules first, then the game system's rules, then the table's precedents.

Read-only: yes. Positional parameters: `text`.

- `text` (`string`, optional): the words of the rule, or the heading of a section; the chapters when left out

### roll

Roll dice and log the roll.

Read-only: no. Positional parameters: `notation`.

- `notation` (`string`, optional): dice to roll: 1d20+5, 2d20kh1 (keep the highest), 4d6dl1 (drop the lowest), 2d6ro<=2 (reroll once), 1d6! (exploding), 6d10>=8 (count successes), 4dF, d%; with who, a field of their sheet stands for its value, such as 1d20+athletics
- `why` (`string`, optional): what the roll is for
- `check` (`string`, optional): what the roll is, as the player sees it in the dashboard's rolls, such as Bite or Stealth: never what only you know
- `who` (`string`, optional): character the roll belongs to, or a copy in the open scene; leave it out for a free roll of the master
- `values` (`number[]`, optional): faces rolled by the player with physical dice, separated by commas; on the command line write --values=-1,0,1 for negative faces
- `hidden` (`boolean`, optional): only the master sees the result; its fingerprint goes to the player only if they ask for it
- `reveal` (`string`, optional): id of a hidden roll whose proof to show, later
- `keep` (`string`, optional): a field of who that keeps rolls for later, such as portent: the dice rolled go there, in place of what it held
- `use` (`string`, optional): a kept roll to use instead of the die, as field=value, such as portent=3: the notation has one die
- `from` (`string`, optional): who keeps the roll that use takes, when it is not who rolls

### ask

Ask the player with buttons: every roll of the player's character, and every choice that is truly theirs to make.

Read-only: no.

- `question` (`string`, required): what is at stake either way, or the choice, in one line, in the player's language
- `options` (`string | string[]`, optional): for a roll, the checks that fit with their dice, such as Atletica 1d20+athletics; for a choice, the answers, such as Sì and No; from 1 to 4
- `who` (`string`, optional): for a roll or a square, the player's character, such as Bruna; the only one there is, if left out
- `square` (`boolean`, optional): true to ask where the player's character moves on its place's map

### change

Change a counter or money on a page: hit points, uses, ammunition, supply, a progress track, an event's clock, coins.

Read-only: no. Positional parameters: `page`, `field`.

- `page` (`string`, optional): page that holds the counter or the money; with a recipe, left out for the player character and the companions with them
- `field` (`string`, optional): the counter or the money, such as hp; none with a recipe
- `by` (`integer | string`, optional): how much to add, or to take away when negative, or coins; stops at a limit (damage, healing); on the command line write --by=-7
- `spend` (`integer | string`, optional): how much is paid or used up, or coins; refused when there is not enough
- `to` (`integer | string`, optional): the new value, even outside the limits: a number, max, current/max such as 15/15 (the maximum changes too), or coins; on the command line write --to=-3
- `why` (`string`, optional): what the change is for
- `recipe` (`string`, optional): a recipe of the game system, such as long rest

### effect

Put a condition or an effect on a character, a place or a copy in the open scene, or end one: frightened, prone, a spell, a form.

Read-only: no. Positional parameters: `action`, `page`, `name`.

- `action` (`"add" | "end"`, required): add or end
- `page` (`string`, optional): who has it: a page, or a copy in the open scene such as Annegato 2
- `name` (`string`, optional): the effect's name, such as Benedizione; a condition of the game system always by its name there, such as Frightened
- `for` (`string`, optional): add: how long it lasts: 10m, 1h, 1d 6h; in a scene with turns, rounds from the current turn, such as 1 round; scene, until it ends; or an occasion of the game system its recipe brings, such as long rest. Left out, until it is ended: so for one that ends with something in the story, such as breathing clean air; end it then
- `until` (`string`, optional): add, in a scene with turns: whose next turn ends it when it starts, such as Ennio, instead of for
- `by` (`string`, optional): add: who keeps it alive, if someone must (concentration), such as [[Lena]]; end: take away every effect they keep, on everyone
- `set` (`string[] | object`, optional): add: the values it gives while it lasts, field=value, repeatable, such as speed=20; for a field the game system declares a bonus, what it adds, such as bonus-ac=2. What must outlive it, such as hit points it adds, change on the page instead
- `why` (`string`, optional): what caused it, or ended it

### mood

Set a mood: yours as the master, which the dashboard's robot shows, or a character's when it changes for a while: the party's show on their sheets, anyone else's only you see, in status.

Read-only: no. Positional parameters: `who`, `mood`.

- `who` (`string`, required): master for yours, or a character's page: the player character, a companion, anyone
- `mood` (`"neutral" | "happy" | "delighted" | "curious" | "focused" | "determined" | "worried" | "surprised" | "afraid" | "sad" | "angry" | "disgusted" | "mischievous"`, required): the mood: neutral, happy, delighted, curious, focused, determined, worried, surprised, afraid, sad, angry, disgusted, mischievous
- `moment` (`boolean`, optional): yours only: show it for a few seconds, then go back to your mood, which stays as it is

### advance

Let time pass in the story, whenever it does, before you narrate it: by a duration or to a later game date.

Read-only: no.

- `by` (`string`, optional): how much time passes, in days, hours and minutes: 10m, 4h, 1d 6h
- `to` (`string`, optional): the game date to reach, such as day 3, 06:00 (day 3 alone is its midnight); the first one sets when play starts, such as day 1, 18:00
- `why` (`string`, optional): what the time is spent on

### travel

Make a journey: whenever the party goes somewhere, use it instead of advance and move.

Read-only: no. Positional parameters: `to`.

- `to` (`string`, optional): where to: a place; by road, or straight across country with across
- `across` (`boolean`, optional): go to the place straight across country, off the roads; both need a position
- `toward` (`string`, optional): off the roads, one way to go instead of a place: a point of the compass, such as west or NNE
- `distance` (`string`, optional): with toward, how far, such as 12 km; if left out, until the day's travel ends
- `who` (`string | string[]`, optional): who travels; if left out, the party where the player character is, with the vehicle they are in
- `pace` (`string`, optional): one of the game's paces, such as fast or slow, or a speed, such as 4.5 km; if left out, the game's usual pace, or the one the journey had
- `hours` (`any`, optional): the hours of travel today, when they differ from the game's: more for a forced march, 24 for a ship with its crew, 8 for a boat the party rows

### route

How far a place is by road, and how long the journey takes: the stops and roads of the quickest way, the distance and the days, at the party's pace or another.

Read-only: yes. Positional parameters: `to`.

- `to` (`string`, required): where to: a place
- `from` (`string`, optional): where from: a place, or a character; if left out, where the party is, or where its journey stopped
- `pace` (`string`, optional): one of the game's paces, such as fast, or a speed, such as 4.5 km; if left out, the game's usual pace
- `across` (`boolean`, optional): straight across country, off the roads, when both places have a position

### scene

Open, run and close a scene of the story.

Read-only: no. Positional parameters: `action`.

- `action` (`"open" | "add" | "leave" | "order" | "next" | "now" | "hostile" | "calm" | "close"`, required): open, add, leave, order, next, now, hostile, calm or close
- `title` (`string`, optional): open: the scene's title
- `type` (`"combat" | "social" | "exploration" | "travel" | "rest" | "challenge" | "other"`, optional): open: combat, social, exploration, travel, rest, challenge, other
- `place` (`string`, optional): open: the place, such as [[Ossario]]; the character's if left out
- `with` (`string | string[]`, optional): open, add: the characters in the scene, the player character included, such as [[Lena]]; at open, the character and the companions with them if left out
- `creatures` (`string | string[] | { [key]: integer }`, optional): open, add: creatures as numbered copies: Annegato=2 (Annegato alone is one), or through MCP an object such as {"Annegato": 2}
- `who` (`string | string[]`, optional): leave: who leaves the scene; hostile, calm: who attacks the party, or stops; characters or copies, such as Annegato 2
- `order` (`string | string[]`, optional): order: who takes turns, in order; those left out (fallen, fled) take none
- `now` (`string`, optional): open, now: what is happening now, in one line as the player sees it, such as "The bandits overturn the tables"; never what they cannot see
- `summary` (`string`, optional): close: what happened, in one or two sentences, as the player saw it
- `seen` (`string | string[] | { [key]: string }`, optional): open, add: what the character sees of one it does not know by name, by its page or creature, in two or three words, never its kind when that is a secret: Bandito=brigante incappucciato, or through MCP an object such as {"Varro": "il mugnaio"}

### save

The saves of the campaign, made by themselves at the end of each scene.

Read-only: no. Positional parameters: `action`, `save`.

- `action` (`"list" | "make" | "load" | "reset" | "new chat"`, optional): list, make, load, reset or new chat
- `label` (`string`, optional): make: a few words that name the save, such as before the duel
- `save` (`string`, optional): load: the number of a save, or last
- `to` (`"start" | "session zero"`, optional): reset: start, the start of play with the same character (if left out), or session zero, to make the character again
