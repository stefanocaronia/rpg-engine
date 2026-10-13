# RPG Engine: the complete guide

**RPG Engine** lets you play a tabletop role-playing game with an **AI as your game master**.

You talk with the master in a **chat**: the master tells the story, plays everyone else and rules on what happens.

RPG Engine works behind the scenes: it **remembers the world**, **rolls the dice** and **keeps the accounts**.

Beside the chat you keep a page open in your browser, the **dashboard**, with your character's sheet, the dice, the maps and your journal.

This guide is for players: you do not need to know how to program.

## Quick start <!-- icon: send -->

1. Install **Node.js** from [nodejs.org](https://nodejs.org) (the LTS version).
2. Install **Claude Code** or **Codex**, the AI app the master runs in, and sign in ([2.4](#24-connect-your-ai)).
3. Open a terminal and install RPG Engine: `npm install -g rpg-engine`.
4. In the terminal, create a campaign: `rpg init "The Salt Isles"`.
5. Open Claude Code or Codex in the new folder and write *Hi! Let's start.* The master answers with the link to your dashboard: open it beside the chat.

The rest of this guide explains each step, and then how to play.

## 1. What RPG Engine is <!-- icon: about -->

### Who does what

| Who | What they do |
|---|---|
| **You** | You play your character. You say what they do, say and try. |
| **The master** (the AI) | Tells the story, plays every other character, decides what happens, asks for rolls. |
| **RPG Engine** | Remembers everything in files, rolls the dice, counts hit points, money, time and distances, keeps secrets until you discover them. |

An AI is good at telling stories and bad at remembering. Left alone, it forgets who owes you money, how many arrows you have, or that the bridge burned two sessions ago. RPG Engine keeps all of that, so the world stays the same from one evening to the next, even in a new chat, even with a different AI.

### What it feels like

You write in the chat, as you would talk at a table:

> I push the door open slowly and look inside.

The master answers with what you see, and stops when it is your turn to choose. When something is uncertain and matters, the master says what is at stake and asks for a roll. The roll's buttons appear on your dashboard. You click, the dice fall on the page, and the master tells you what happens.

### What makes it different

- **The world is persistent.** What has been said stays true. A dead villain stays dead.
- **The dice are real.** The master cannot bend them (except at the easiest difficulty, if you choose it).
- **Secrets stay secret.** The master never tells you what your character does not know, even if you insist.
- **The world moves without you.** Threats advance while you rest or travel, and you see their signs.
- **Many evenings, one story.** A campaign is a folder on your computer. You can stop whenever you want and pick up later.

### The game it plays today

RPG Engine is made for any tabletop RPG. Today it ships one game system: **fifth edition** (from the free System Reference Document 5.1). Other games will come; see [Game systems](#5-game-systems-and-house-rules) and [Coming later](#9-coming-later).

---

## 2. Getting started <!-- icon: path -->

### 2.1 What you need

- A computer with Windows, macOS or Linux.
- **Node.js 22** or newer. Get it from [nodejs.org](https://nodejs.org): the "LTS" version is fine. It comes with `npm`, which installs RPG Engine.
- A **terminal**, the window where you write commands: on Windows, the Terminal app or PowerShell; on macOS, Terminal. You use it to install RPG Engine, to create each campaign, and to start Claude Code or Codex.
- An **AI host**, the app the master runs in: **Claude Code** or **Codex**, with its plan and login. See [2.4](#24-connect-your-ai).
- The **largest model** your host offers. A small model gets fooled: in our tests it told secrets to a player who claimed to be the real master.
- A web browser, for the dashboard.

The login you use for your host does more: RPG Engine uses it, on your computer, to draw pictures of places, quests and your character, and to translate the dashboard into languages it does not ship. See [Pictures](#311-pictures) and [Languages](#72-languages).

**Getting a terminal into a folder.** Many steps say "in the campaign folder". On Windows, right-click the folder in File Explorer and choose **Open in Terminal**. On macOS, right-click the folder in Finder and choose **Services > New Terminal at Folder**. Or, in a terminal already open, write `cd` and the folder's path, such as `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Install

Open a terminal and write:

```text
npm install -g rpg-engine
```

This gives you the `rpg` command. To check it worked:

```text
rpg --version
```

You will use `rpg` once per campaign, to create it. After that, you only talk with the master: your AI host starts RPG Engine by itself, with the same `rpg` command.

### 2.3 Create a campaign

A campaign is a folder. Open a terminal in the folder where you keep your games, and write:

```text
rpg init "The Salt Isles"
```

This makes the folder `The Salt Isles` with a new campaign in it, and tells you what to do next:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

The lines after *For the master* are for the master, which reads them in the chat: you have nothing to do with them. Keep in mind where the folder is: you come back to it every time you play. Without a folder name, `rpg init` turns the folder you are in into the campaign.

`init` makes everything the campaign needs: its settings, its world folders, and the small files that tell your AI host to use RPG Engine and to keep no memory of its own outside the campaign.

You do not need to choose anything now. The master asks you the rest in the chat, or you choose it on the dashboard. If you already know some choices, you can give them here:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

This makes the folder `salt-isles`, with the campaign *The Salt Isles* in it: a folder name without spaces, and the campaign's name as you like it.

| Option | What it sets | Values |
|---|---|---|
| `--name` | The campaign's name | any; the folder's name if you leave it out |
| `--language` | The game's language | a code, such as `en`, `it`, `fr` |
| `--system` | The game system | `5e`, today the only one |
| `--difficulty` | How hard the world plays | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | What falling in a fight means | `narrative`, `epic`, `dice` |

`rpg init --help` lists them too. A campaign cannot sit inside another campaign's folder.

You cannot ask the master to create a campaign: before `init`, the folder has nothing that tells your AI host where RPG Engine is.

### 2.4 Connect your AI

RPG Engine works with **Claude Code** and **Codex**. Other AI apps that use MCP tools might work too, but we do not guarantee them.

**Installing your host.** Claude Code and Codex run in the terminal: they are not the Claude or ChatGPT app on your phone. Each needs its own plan and login: Claude Code a paid Claude plan, Codex a ChatGPT login. Follow their own pages to install them and sign in: [Claude Code](https://code.claude.com/docs/en/setup) and [Codex](https://learn.chatgpt.com/docs/codex/cli). You do this once, for all your campaigns.

**Claude Code.** Open a terminal in the campaign folder and write `claude`. The first time, it asks whether you trust the folder, and says the folder allows the game's tools (`mcp__rpg`): choose **Yes, I trust this folder**. Careful: the answer already selected is *No, exit*, so pressing Enter right away closes Claude Code. That is all: the campaign has already told Claude Code to use RPG Engine and its tools, and to keep its memory off.

**Codex.** Open a terminal in the campaign folder and write `codex`. When it asks whether you trust the folder, say yes: the campaign's own settings tell Codex where RPG Engine is, allow its tools and keep its memory off, and Codex reads them only in a folder you trust. In the desktop app, check that memories are off for the game's chats.

**Why memory matters.** The campaign lives in its files. If the host also remembers things on its own, going back to a save would not really go back: the master would still remember what was undone.

### 2.5 The first chat

Write anything, for example:

> Hi! Let's start.

The master reads where the game stands and answers. In its first answer of every chat it gives you the **link to your dashboard** (something like `http://127.0.0.1:4750`). Open it in your browser and keep it beside the chat for the whole game. Each campaign keeps the same link from one chat to the next, unless another program has taken it: then the master gives you the new one.

Between the master's messages, your host shows the tools the master uses, in short lines. Do not open their details (in Claude Code, ctrl+o): they can show what the master writes, secrets included.

A new campaign goes through three stages, like a game with a human master. The dashboard shows them at the top as *1 Settings · 2 Session zero · 3 Play*:

1. **Settings**: you choose how you want to play. Out of the story.
2. **Session zero**: you make your character, in play.
3. **Play**: the story.

### 2.6 Settings: choosing how you play

The master asks only what is still missing, a few questions at a time. If you write "you decide", the master chooses and tells you what it chose. With the dashboard open, its first step, **Settings**, shows the same questions as cards: one question at a time, each value with what it means, the usual one marked **Suggested**. Choose there, and the master will not ask again in the chat; **Skip** leaves a question for later. The chat settles what only words can: the premise of a new world, the language, and the pictures, which the master asks about only if your computer can make them. That is why the page asks fewer questions than the table below lists.

You do not need to study the table: it is here to look up. You can change every one of these later, in the chat or in the dashboard's **Settings**. A change counts from the master's next answer.

| Setting | What it decides | Values | Suggested |
|---|---|---|---|
| **Mentor** (asked as "How well do you know this game?") | How much the master teaches you the rules, out of the story | **off** (the story alone; ask between brackets when you want), **hints** (a short tip before choices that matter and when a rule slips by), **tutorial** (each rule explained the first time, the whole sum of each roll, a short debrief after fights) | from your answer: never played → tutorial, a little → hints, I know it → off |
| **Difficulty** | How hard the world plays: fights, enemy tactics, clues, treasure, how fast threats move | story, easy, normal, hard, brutal | |
| **Lethality** | What falling in a fight means | **narrative** (your character never dies), **epic** (dies only when it matters to the story), **dice** (the dice decide) | follows the difficulty: story → narrative, easy → epic, normal and up → dice |
| **Saves** | When you may go back | **permadeath** (never; only start the campaign over), **checkpoint** (back to the last end of a scene, only if your character dies), **free** (back to any save, and save whenever you ask) | checkpoint |
| **Rigor** | How closely food, light, fatigue, carrying weight, spell components and travel follow the rules | **smooth** (the master glosses over them), **rules** (as written: torches burn out, rations run out), **simulation** (beyond the rules: wear, spoilage, weather) | smooth |
| **Dice** | Who rolls your character's dice | **digital** (RPG Engine rolls them, on the page), **physical** (you roll your own and tell the faces) | |
| **Units** | Distances and weights in the story | metric, imperial | |
| **Companions** | Who travels with you | none, made with you in session zero, made by the master, met in play | |
| **Pictures** | Pictures of places and quests, and your character's portrait when you ask | none, on request, new places and quests | asked once, only if your computer can make them |
| **Lines** | What never appears in the game | a list, or none | |
| **Veils** | What may happen, but only off screen | a list, or none | |
| **Language** | The language of the game and the dashboard | any | taken from how you write, and confirmed |

The game system can add its own settings. Fifth edition adds **advancement**: how your character levels up, with **experience points** or at **milestones** of the story.

**What the difficulty means in play.** Story: weak, naive foes, obvious clues, plenty of everything; the master may soften its own rolls. Easy: simple foes, generous resources. Normal: sensible foes, three clues to every conclusion, standard prices and treasure. Hard: smart foes, subtle clues, scarce resources, threats that move fast. Brutal: foes that ambush, retreat and finish the fallen, very scarce resources, the harshest rests. Fights are always sized to your party as it is now.

**Without a written world**, the setup asks two more things:

- **Premise**: the genre, the tone and a few elements of the world, in your words. For example: *"Low fantasy, grim but with hope. A river town, a haunted ford, a cult in the hills."*
- **Preparation**: **on the fly** (the master builds each part of the world just before you need it; suggested) or **all at the start**.

The master then proposes a name for the campaign. When nothing is missing and you say you are ready, the game moves to session zero.

### 2.7 Session zero: your character

Session zero is play: you make your character with the master, as you would at a table.

- **Every choice is yours**, unless you ask the master to make it. You can come with a full idea ("a half-elf cleric who left her temple"), a vague one ("someone who heals, but is not nice about it"), or nothing ("surprise me, then let me change things").
- **Ability scores.** The master tells you the method and the safety net before any die is rolled. In fifth edition: the standard array, point buy, or 4d6 drop the lowest. The method you agree on stays in the table's agreements.
- **Your story** is never required. If you give one, the master writes it in your words, reads it back to you once, and ties its people and places into the world. You can also write it on the dashboard (see [Party](#party)).
- **Personality** (fifth edition): a trait, an ideal, a bond and a flaw, from your background's tables or your own.
- **A picture.** Once your character is made, the master asks you for a picture of them: a file on your computer, or a portrait made on your computer from how you describe them (see [your character's picture](#37-your-characters-story-and-picture)).

The sheet's numbers are worked out by RPG Engine from your choices: you never do the sums. When the characters are made and you confirm, the story begins.

---

## 3. Playing <!-- icon: chat -->

### 3.1 Talking with the master

Write what your character does or says, in your own words. Short is fine.

> I ask the innkeeper who else came through tonight.
>
> "We're not here for trouble," I say, hand away from my sword.
>
> I climb onto the roof and wait.

**Out of the story**, write between square brackets:

> [How does grappling work?]
>
> [Can I still use my reaction this round?]
>
> [Let's stop here for tonight.]

The master answers in brackets too, then goes back to the story.

**You say what you try; the master says what happens.** Something that breaks the world's logic or the facts already set does not happen: the master tells you, inside the story, and offers what is possible.

**The master never decides for your character.** It will not make you speak, feel or choose. When in doubt, it asks.

**The master never talks about the engine.** Ask it whether it keeps track of things and it answers like a game master: "I keep it all: we pick up from here next time."

**You can ask the master how to use the dashboard.** It knows the page: "Where do I see my spells?", "How do I roll by hand?"

### 3.2 Rolls

**When a roll happens.** The master asks for a roll only when the outcome is uncertain and matters. Otherwise it says yes, or "yes, but". Before your roll, the master says what is at stake and which checks fit, then stops. You roll, or change your mind:

> **Master:** The ledge is narrow and wet. If you slip, it is a long fall into the river. A Dexterity (Acrobatics) check, or you can go back and look for the stairs.
>
> **You:** I'll try it.

**Rolling on the dashboard.** When the master asks, a banner appears at the top of the page with a button for each check, for example *Acrobatics +4 · with advantage*. Click it: the dice fall on the page, and the master hears the result. You can also:

- click the matching line of your sheet, which lights up in gold;
- throw the right dice from the tray;
- write your own words in the banner instead, if you want to do something else.

**Rolling by hand.** If you prefer to pick the dice yourself, turn on **By hand** in the banner's corner (or in **Settings**). The check's button goes away, and the banner says what to roll as a master would: *Roll Acrobatics yourself, on your sheet or with the dice.* Click the line of your sheet that lights up, or throw the right dice from the tray: RPG Engine rolls them, adds your bonus and the master hears the result. A check that neither your sheet nor the tray can make, such as damage that rerolls its 1s, keeps its button. By hand stays on in this browser until you turn it off.

**Physical dice for the whole game.** With the **dice** setting on physical, the master asks your rolls in words and you write the faces you rolled:

> [I rolled a 14.]

RPG Engine adds your modifiers and refuses a face your dice cannot show.

**Free rolls.** Click any number on your sheet, or open the dice tray, to roll just for fun. Free rolls never count, are never recorded, and the master never sees them. A free 20 never becomes a real one later.

**The master's rolls.** The master rolls for enemies and others with RPG Engine too. Most rolls are shown in your roll column. When you must not see a result, the master rolls in secret. You can always ask:

> [Was that roll real?]

For a shown roll, the master gives its numbers and reason. For a secret one, a fingerprint that proves the roll was made before you asked.

**Rolls in the chat** appear in brackets, right after the moment they decide: *[Persuasion 14 + 3 = 17]*. Then the story tells the outcome.

### 3.3 Scenes and fights

The master runs the story in **scenes**: a fight, a conversation, exploring, travelling, a rest, a challenge (a chase, a race, a puzzle). You do not have to manage them: they are how RPG Engine keeps the story's chapters. At the end of each scene the game saves by itself, and the scene goes into your journal's story.

**In a fight**, the master tells all the turns that are not yours, one after another, with every roll, and **stops where you can decide**: your turn, a reaction, a choice. On your turn, say what you do:

> I cast Sacred Flame on the one by the door.

The dashboard's **Combat** section shows the order of the turns, whose turn it is, your party's hit points, and how hurt the enemies look (unhurt, hurt, bloodied, down: in words, never in numbers). If your character falls, the death saves appear large on the page.

**When the fight is already decided**, the master may offer to tell the rest in one message.

### 3.4 Time, travel and the world that moves

**Time.** Every action takes time in the story, and RPG Engine keeps the date: day 3, early morning. The master tells time as the world measures it: dawn, the third bell, nightfall. Between sessions, no time passes: you pick up where you stopped.

**Rests.** Say you rest, and the master applies what a rest brings back, such as hit points and spell slots:

> We make camp and take a long rest.

**Travel.** Say where you want to go:

> We take the road north to Rocca.

RPG Engine works out the way, the distance and the days at your pace, and moves you there. A journey stops when something planned happens on the way, at the end of each day's travel, and on arrival. You can ask how far a place is before you leave:

> [How far is Rocca, and how long would it take on foot?]

**The world moves without you.** Villains have plans with deadlines and clocks. Each new day, the master moves the threats that time has advanced, and you see their signs: a rumour, a trace, a change in town. You never see the clock itself, only what it leaves behind.

**Money** is counted in the game's coins. Pay, sell, get paid: RPG Engine makes the change.

### 3.5 Maps

**The world map** (dashboard: **World**) shows only the places your character knows, with the roads between them, the trail you have walked, and the fog over everything else. Click a place to see what you know of it and how far it is.

**The map of a place** (dashboard: **Scene**, and **Combat** in a fight) appears when the master draws one for where you are: walls, doors, the ground, and who stands where, as tokens. In a fight, on your turn, the squares you cannot reach are veiled, so you see at a glance where you can go. When the master asks where your character moves, the page opens the map and you touch a square, or write it, such as *E4*.

### 3.6 Quests, journal and notes

**Quests.** When your character takes on a task, it becomes a quest in your **Journal**: who gave it, where, by when, its goals as a list, and what it measures (a deadline with the time left, a clock, a count). Mark one with its star to follow it: it stays small at the top of Scene, with its next goal. The quest ends when the story ends it, never by itself.

**The story.** The Journal's Story tab is your campaign as a timeline: each scene a chapter, with its place, date and a short summary, the last one first.

**Your notes.** In the Journal's Notes tab you write your own notes: theories, names, plans. They stay on your computer and the master does not read them, unless you **Share** one. A shared note reaches the master at its next answer as what you think, never as a fact. Your theory does not become true because you wrote it. A note that asks to stop or avoid some content counts as if you had said it at the table.

### 3.7 Your character's story and picture

On your character's sheet, the **Description** card has a box to write your character's story. Send it, and the master writes it into the character in its own words, after you say yes.

For your character's picture, give the master a picture file in the chat, with where it is on your computer (PNG, JPEG, WebP or SVG, up to 5 MB):

> [Here's my character's portrait: C:\Users\me\Pictures\mira.png]

The master copies it into the campaign, and it appears on your character's token on the dashboard. You can change it the same way whenever you want.

Or have the portrait made, where your computer makes pictures (see [Pictures](#311-pictures)): describe your character to the master, or let the master describe them.

> [Make me a portrait: grey hair in a braid, a scar on the chin, tired eyes.]

The portrait shows exactly what your character is in the game, their people as this world has them, a hill dwarf as a hill dwarf, with the look you described. It comes in a minute or so, on your character's token. Your companions can have theirs the same way.

### 3.8 Saves and going back

RPG Engine saves the whole campaign **at the end of every scene**, by itself. What you can do with those saves depends on the **saves** setting:

| Saves | Save when you want | Go back |
|---|---|---|
| **permadeath** | no | never; you can only start the campaign over |
| **checkpoint** | no | to the last save, only when your character dies |
| **free** | yes | to any save, whenever you want |

In every mode you can **start over**: from the start of play with the same character, or from session zero with a new one.

You can do all of this in the chat ("[Let's go back to before the duel.]") or in the dashboard's **Saves** section.

**After going back, open a new chat.** The chat you were playing in remembers what was undone. Open a new chat with the master (`/clear` in Claude Code, `/new` in Codex), write *continue*, then press **I opened a new chat** in Saves, or tell the master in the new chat. Never resume the old chat. Until you confirm, the master will not go on.

### 3.9 Sessions: stopping and coming back

**You end the session** whenever you want:

> [Let's stop here for tonight.]

There is no "save and quit": everything is already in the files.

**To close** the chat, write `/exit` in Claude Code, or `/quit` in Codex. The dashboard goes quiet until the next chat.

**To come back**, open a terminal in the campaign folder (the one `init` printed), start your host there and write *continue*. The master reads where the game stands, gives you a short recap, and starts with something happening. A new chat loses nothing: the campaign lives in its files, not in the chat.

The master does not ask routine questions at the end. Only if it noticed something did not work, it asks briefly.

### 3.10 The master's mood

At the top of the dashboard sits the master's avatar, a small robot. Its face follows the tone of the story: worried when danger grows, delighted at a bold idea, surprised at a twist. It reacts for a moment to a natural 20 or a natural 1. It never shows what you do not know yet: no grin before the trap is sprung. Your party's tokens show their moods too. When the chat is closed, the robot sleeps.

### 3.11 Pictures

RPG Engine can have a picture made for each place you reach and each quest you take, as the **pictures** setting says, and your character's portrait when you ask. It uses what is already on your computer:

- **Codex**, with your ChatGPT login: a painted picture.
- Otherwise **Claude Code**, with your Claude login: a drawing.

The picture uses your own plan, not ours. The **Settings** section tells you whether pictures can be made on your computer, and if not, the steps to set it up. Without pictures, the page shows the mark of each kind of place instead. You can also give the master a picture of your own for any place or character.

### 3.12 Safety: lines, veils and stop

- **Lines**: what never appears in the game.
- **Veils**: what may happen, but only off screen.
- **Stop**: at any moment you can stop a content, without explaining. Write it out of the story:

> [stop]

The master drops it at once and adds it to your lines, for every session to come. You can see and change your lines and veils in **Settings**.

### 3.13 Changing your mind

Every setting can change during the campaign: in the chat ("[Let's make it harder.]") or in **Settings**. The master hears of a change at its next answer. A ruling the master made without the book becomes a **precedent** and is kept, so the same question gets the same answer next time.

---

## 4. The dashboard, section by section <!-- icon: party -->

The dashboard is a page on your own computer. The master gives you its link at the start of every chat. It follows the game live: when the master changes something, the page changes too.

Only the browser of the computer where you play can open it: not a phone or a tablet, even on the same Wi-Fi. The page fits a narrow window too: then the sections move to a bar at the bottom, and the icons to a menu.

The page lives as long as the chat. Close the chat, and a page left open shows *Not connected* with the sheet as it was, and the master's robot falls asleep; open a chat in the campaign again, and once the master has answered, the page comes back by itself.

### At the top

- The **master's avatar**, with its mood.
- The campaign's name, the game system, the **game time** and whether the game is **live** (the chat connected).
- The sections: **Party**, **Scene**, **Combat** (only during a fight), **Journal**, **World**; at the end of the row, as icons: **Saves**, **Help**, **Settings**, **About**.
- The light and dark theme, in the top right corner.

When the master asks you something, its banner stays at the top of the page, whatever section you are in.

### Party

Your character's sheet, and your companions'. Each part of the sheet is a card you can open and close.

- **Click a number** to roll it for fun. Point at a number to see how it is made ("+5: Wisdom +3, proficiency +2").
- **Hit points, slots and uses** show as bars and pips.
- **Conditions and effects** show with how long they last.
- **Description** holds your character's text, and the box to send the master your character's story.
- At 0 hit points, the **death saves** appear large under the name.
- Beside the sheet (below it on a narrow screen): **the rolls**, newest first, yours and those of the master you may see. **Clear** empties the list; **Restore** brings it back. Free rolls show dashed and dimmed.

A companion with a stat block, such as a wolf, shows its stat block instead of a full sheet.

### Scene

Where your party is: the place's picture and name, the places around it, the map of the place when it has one, who is there, and the open scene with what is happening now. The quest you follow sits at the top.

### Combat

Only during a fight. On top: the round, who acts, who comes next. Below: the order of the turns, each fighter with their state, your party in numbers and the enemies in words; what your character has at hand (armor class, hit points, attacks); the map of the place, with the one acting ringed. On your turn the Combat link pulses in gold, wherever you are.

### Journal

Three tabs:

- **Quests**: active, completed and failed, each as a card with its goals, its deadline as a timer and its clocks. The star follows a quest.
- **Story**: the campaign's chapters, scene by scene, the last first.
- **Notes**: your own notes, private until you share one.

### World

The world map as your character knows it, with the fog over the rest. Drag to move, wheel or pinch to zoom. Click a place for its card. A list of the places, nearest first, sits beside it. With more than one map (a city, a continent, another plane), tabs switch between them.

### The dice tray

The dice button opens the tray: choose dice and a modifier, and throw. With two or more dice of a kind, choose which count: **All**, **High** (only the highest) or **Low** (only the lowest). The dice you chose stay until you press **Clear**, so the same damage roll is one click every round. While the master asks for a roll, the tray tells you which dice answer it.

### Saves

Your saves, newest first, each with its place, the game date and when it was made. **Save now** (with free saves), **Go back here**, and **Start over**, in red, in two steps. See [Saves and going back](#38-saves-and-going-back).

### Settings

Your settings, in groups: the game, learning the game (the mentor and the rules already explained to you), dice and measures, limits (lines and veils), pictures, language. Click a value to choose it; under it, what it means. Then the page's own preferences, kept in this browser only: the theme, the dice's sound, the **dice set** (resin, metal, wood, stone), rounded or sharp edges, rolling by hand.

The master's own settings, such as house rules and precedents, are not here: they stay in the chat.

### Help and About

**Help**: this guide. **About**: what RPG Engine is, its links, its licences, and the credits of the game system.

### Before play: Settings and session zero

While a new campaign is in its first step, **Settings**, the whole page asks its questions: one at a time, each with what its values mean and the suggested one. **You decide** leaves a question to the master, except lines and veils, which are always yours; **Skip** leaves it for later. At the end, **I'm ready**.

### Messages from the page

Sometimes the page shows a notice over itself: a problem in the campaign's files (the master fixes it), the game away (the chat is closed), the page being translated.

---

## 5. Game systems and house rules <!-- icon: dice -->

### 5.1 What a game system is

A game system is the data of one game: its sheet, its numbers, its creatures, items, spells and rules text. Each campaign plays one system.

RPG Engine works out your character sheet and what is spent and comes back, such as hit points and spell slots, as a digital character sheet does. How a feature or a spell works, the master reads in the rules and decides, as at a table.

### 5.2 Fifth edition, included

RPG Engine ships **5e**, from the System Reference Document 5.1 (the 2014 rules, free under Creative Commons). It includes:

- the races, classes, subclasses, a background and a feat of the SRD;
- the 319 spells, the weapons, armor and gear, the magic items and the monsters of the SRD;
- the rules chapters, which the master looks up by their exact text;
- the full character sheet, worked out: ability modifiers, saves, skills, armor class, attacks, spell save DC, slots, hit dice, features by level, experience and levelling up;
- rests that bring back what they should; conditions with their rule text; concentration reminders.

**Content beyond the SRD.** You can play fifth edition with content the SRD lacks, such as a class or a monster from a book you own. The master knows the game, can read your manuals and can search the web. It writes what it needs as pages of your campaign, and RPG Engine works the same with them. What we ship is limited by its licence; what your master knows is not.

RPG Engine is compatible with fifth edition.

### 5.3 House rules and your own additions

You do not need to touch any file. Ask the master:

> [House rule: a natural 1 on an attack means you drop your weapon.]
>
> [I'd like to play a Blood Hunter. I have the book: here are the class features.]
>
> [In this campaign, a short rest takes 10 minutes.]

The master records them in your campaign, in one of these ways:

- **An agreement of the table**, in words, such as the dropped weapon or the short rest above. The master keeps it with the campaign's settings and plays by it from then on. A ruling the master makes without the book is kept the same way, as a **precedent**.
- **A new page**, such as a class, a race or an item. A new class works like the system's: your level, hit dice and features count it. A new race can build on an existing one ("like the Elf, plus…"); a named sword can build on the Longsword.
- **New numbers for the sheet**: a field, a table, a formula, a counter that a rest brings back. For example, a Battle Master's superiority dice that return on a short rest. A house rule can also replace one of the system's formulas.

If you have house rules already written out, you can also put them as text files in the campaign's `rules` folder (see [the campaign folder](#8-for-the-curious-the-campaign-folder)): the master reads them before the book's rule of the same name.

### 5.4 Adding or importing your own game system

Today RPG Engine plays only fifth edition. Other game systems will come, and so will a way to add your own, or to turn a game you own into one from its manuals. See [Coming later](#9-coming-later).

---

## 6. Extensions <!-- icon: plus -->

**Extensions are not available yet.** An extension will add something to a campaign on top of its game system: a world, an adventure, a feature such as the weather or a tarot deck, house rules to share. You will choose which ones each campaign uses. The first planned for fifth edition are weather and lockpicking.

---

## 7. Where a campaign comes from, and its language <!-- icon: world -->

### 7.1 Three ways to have a world

**Made on the fly.** You give a premise in the setup, and the master builds the world as you go: each place, person and plot just before you need it, and kept from then on. This is the quickest way to play: install, create, and in a few minutes you are making your character. Nothing invented is lost: once said, it is written and stays true.

**Prepared at the start.** Same premise, but with **preparation: all at the start**, the master builds the world's places, factions, threats and their plans before play begins. The first session starts later, with more ready behind the scenes.

**From an existing campaign or adventure.** Today there is no import button. Give the master your adventure (a text or a PDF your host can read) and ask it to set it up:

> [I have this adventure as a PDF. Set it up as our campaign: read it, and write its places, characters and secrets. Don't tell me anything that's in it.]

The master reads it with your AI host's tools and writes it as pages of the campaign, secrets included, which you will discover in play. Claude Code reads PDFs; with Codex, a text or markdown file is the safer choice. Do it during the setup, before session zero.

While the master works, do not open the details of what it reads or writes (in Claude Code, ctrl+o): they show the adventure's text, secrets and all. The master itself keeps the secrets, as always.

As soon as the campaign has pages of its own, the setup stops asking for a premise and a preparation. Even in a written campaign, when you go somewhere the text does not cover, the master creates what is needed and records it.

**A campaign is played once.** To play the same adventure again, create a new campaign. Within a campaign, you can still go back to a save or start over, as the saves setting allows.

### 7.2 Languages

**One language per campaign**: the master's. The master writes in it, and the dashboard follows it. The master takes it from how you write, and confirms it.

**The dashboard** ships in English and Italian (curated) and in 24 more languages: French, German, Spanish, Portuguese (Brazilian), Dutch, Swedish, Norwegian, Danish, Finnish, Icelandic, Russian, Ukrainian, Polish, Czech, Romanian, Hungarian, Greek, Turkish, Arabic, Hebrew, Hindi, Chinese, Japanese, Korean. Arabic and Hebrew read from right to left: the page mirrors, while the maps and the dice stay as drawn.

**Any other language** you choose in Settings is translated on your computer, in the background, by Codex or Claude Code with your own login, starting with the section you have open. It is done once per language, for all your campaigns. Until it is ready, the page is in English. Settings tells you whether the translation is under way, ready, or not possible on your computer.

**The game's words.** Fifth edition brings its own terms in Italian from the official Italian SRD, so Italian players read *Classe Armatura*, *tiro salvezza*, *vantaggio*. Other languages get the system's terms translated.

**The game system's own text** (the spells, the monsters, the rules chapters) stays in English. The master reads it and tells it to you in your language.

**Changing language mid-campaign** keeps the pages already written as they are; the master writes new ones in the new language.

---

## 8. For the curious: the campaign folder <!-- icon: list -->

You never need to open it. If you do, know that **it holds the secrets** of your campaign: reading it spoils the game.

A campaign folder holds:

- `campaign.yaml`: your settings;
- `state.yaml`: where the game stands now: its stage, the date, the open scene;
- `world/`: one page per character, place, faction, quest, item, event, topic or creature, as markdown files;
- `rules/`: your house rules as text files, if you add some (`init` does not make it);
- `images/`: the pictures, once there are some;
- `log.jsonl`: every change, in order;
- `.saves/`: the saves, from the first one on;
- `.player/`: your own notes from the Journal, which the master does not read;
- `sessions/`: kept by RPG Engine;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: the small files that tell AI hosts where RPG Engine is and keep their memory off. RPG Engine keeps them up to date; leave them as they are.

The pages are plain markdown with links like `[[Rocca]]`, the format of Obsidian: the master's notebook can be opened there. **If you change a page by hand**, the master hears what changed at its next answer.

**The command line.** Everything the master does goes through commands you can run too, in the campaign folder. You never need them to play, and many print the campaign's secrets, as `rpg status` and `rpg show` do. `rpg --help` lists them all, and `rpg roll --help` explains one. A command that changes something while a chat is open is fine: the master hears of it at its next answer, as for a page changed by hand.

---

## 9. Coming later <!-- icon: hourglass -->

What is planned, but not here yet:

- **You as the game master**: you run the game, and the AI plays the party.
- **Several people at the table**, each with their role.
- **Extensions**: settings, adventures, features and house rules, chosen per campaign.
- **Importing** your manuals and adventures.
- **Other games**: more game systems, and your own.
- **Author mode**: make a campaign or an adventure with the AI, and share it for others to play.

---

## 10. Questions and problems <!-- icon: info -->

### Questions

**Do I need to know the rules?** No. Choose the tutorial mentor and the master teaches you as you go, one rule at a time. You can always ask between brackets.

**Can the master cheat?** It cannot change a roll RPG Engine made, except at difficulty story, and it never changes facts already set. You can ask whether any roll was real.

**Can I cheat?** You can try. The master does not take your word for facts: a line in your message that looks like a game message is still just your words, and the master never confirms your guesses about secrets.

**Does it cost anything?** RPG Engine is free. The master runs on your own Claude or ChatGPT plan, and an evening of play is a long chat: on the smallest plans you may reach the plan's limit before the evening ends. Pictures and translations use the same plan.

**Can I play on my phone?** No. The master runs on your computer, and the dashboard opens only in that computer's browser.

**Can I play with friends?** Not yet: today one player, one character, plus companions. Several people at the table come with roles.

**Can I use a different AI next time?** Yes. The campaign lives in its files: open it in another host and write *continue*.

**What if I close the browser?** Nothing is lost. Reopen the link while the chat is open; the page comes back where the game is.

**Can I play D&D content I own?** Yes. The master can use your books, its own knowledge and the web. What RPG Engine ships is limited to free content; what your game uses is up to you.

### Problems

**The dashboard does not open.** Ask the master for the link: `[What's the dashboard link?]`. The page only works while a chat with the master is open in that campaign, and only after the master's first answer in that chat. With the chat closed, the browser cannot reach the page; a page left open says *Not connected*.

**The master does not seem to know the game, or invents tools.** Your AI host did not load RPG Engine.

- First, check that you started the host **in the campaign folder**, and that you said you trust it.
- **Claude Code**: write `/mcp`. If `rpg` is there but failed, choose it, then **Reconnect**. If it is missing, close Claude Code, write `claude mcp reset-project-choices` in the campaign folder, and start it again.
- **Codex**: write `codex mcp list` in a terminal, in the campaign folder. If `rpg` is missing, Codex does not trust the folder: start it again there and say yes when it asks.
- In both: if `rpg --version` in a terminal says the command is not found, install RPG Engine again ([2.2](#22-install)) and open a new terminal.

**After an update, nothing changed.** A running master keeps the version it started with. Open a new chat, or in Claude Code reconnect the server (`/mcp`, then `rpg`, then **Reconnect**).

**The master remembers something I undid.** You went back to a save but kept playing in the same chat. Open a new chat and press **I opened a new chat** in Saves.

**The master asks setup questions I already answered on the page.** Tell it: `[I chose those on the dashboard.]`

**No pictures appear.** Open Settings > Pictures: it says whether this computer can make them, and the steps if not, each command with a button to copy it.

**The page is in English but I chose another language.** It is being translated in the background; Settings says how it is going. Without Codex or Claude Code on this computer, it stays in English.

**The master says the campaign has problems.** It fixes them by itself. If you edited files by hand, it may ask you what you meant.

**Windows: `npm` fails in my folder.** Do not keep the campaign, or RPG Engine, under a path that contains `&`.

**Installing fails, or `rpg` will not start.** Check your Node.js version with `node --version`: it must be 22 or newer. If it is older, install the LTS version from [nodejs.org](https://nodejs.org), then install RPG Engine again.

**The dashboard link changed.** Another program was using the campaign's usual address, or Windows had reserved it. RPG Engine took another one; the master gives you the new link. Nothing else changes.
