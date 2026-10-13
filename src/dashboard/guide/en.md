# RPG Engine: the complete guide

**RPG Engine** lets you play a tabletop role-playing game with an **AI as your game master**. You talk with the master in a **chat**; RPG Engine works behind the scenes: it **remembers the world**, **rolls the dice** and **keeps the accounts**. Beside the chat you keep a page open in your browser, the **dashboard**, with your sheet, the dice, the maps and your journal.

This guide is for players: you do not need to know how to program.

## Quick start <!-- icon: send -->

1. Install **Node.js** from [nodejs.org](https://nodejs.org) (the LTS version).
2. Install an **AI agent**, the program the master runs in, and sign in: for example Claude Code or Codex ([2.4](#24-connect-your-ai)).
3. In a terminal, install RPG Engine: `npm install -g rpg-engine`.
4. Create a campaign: `rpg init "The Salt Isles"`.
5. Go into the new folder, `cd "The Salt Isles"`, and start your agent there: `claude` for Claude Code, `codex` for Codex. Say yes when it asks whether you trust the folder ([2.4](#24-connect-your-ai)), then write *Hi! Let's start.* The master answers with the link to your dashboard.

## 1. What RPG Engine is <!-- icon: about -->

| Who | What they do |
|---|---|
| **You** | You play your character: what they do, say and try. |
| **The master** (the AI) | Tells the story, plays everyone else, decides what happens, asks for rolls. |
| **RPG Engine** | Keeps the world in files, rolls the dice, counts hit points, money, time and distances, keeps secrets until you discover them. |

The world stays the same from one evening to the next, even in a new chat, even with a different AI:

- **What has been said stays true.** A dead villain stays dead.
- **The dice are real.** The master cannot bend them, except at the easiest difficulty, if you choose it.
- **Secrets stay secret.** The master never tells you what your character does not know.
- **The world moves.** Threats advance while you rest or travel, and you see their signs.
- **A campaign is a folder** on your computer: stop whenever you want, pick it up later.

Today RPG Engine plays one game system, **fifth edition**, from the free System Reference Document 5.1. Others will come ([Coming later](#9-coming-later)).

---

## 2. Getting started <!-- icon: path -->

### 2.1 What you need

- A computer with Windows, macOS or Linux, and a web browser.
- **Node.js 22** or newer, from [nodejs.org](https://nodejs.org). It brings `npm`, which installs RPG Engine.
- A **terminal**: on Windows, Terminal or PowerShell; on macOS, Terminal. To open one in a folder, right-click the folder and choose **Open in Terminal** (Windows) or **Services > New Terminal at Folder** (macOS).
- An **AI agent** for the master ([2.4](#24-connect-your-ai)), with the **largest model** it offers: a small model is easier to talk into revealing secrets or bending the rules.

### 2.2 Install

```text
npm install -g rpg-engine
```

`rpg --version` checks that it worked. You use `rpg` once per campaign, to create it; after that your agent starts RPG Engine by itself.

### 2.3 Create a campaign

Open a terminal in the folder where you keep your games ([2.1](#21-what-you-need) says how):

```text
rpg init "The Salt Isles"
```

This makes the folder `The Salt Isles` with a new campaign in it; go into it with `cd "The Salt Isles"`. Remember where it is: you come back to it every time you play. You choose everything else later, in the chat or on the dashboard; `rpg init --help` lists the options to choose some now, such as `--language it` or `--difficulty hard`.

The master cannot create a campaign for you: before `init`, nothing tells your agent where RPG Engine is.

### 2.4 Connect your AI

The master runs in an **AI agent**: an AI app, in the terminal or on the desktop, that can work with the files on your computer, such as Claude Code or Codex. A plain chat such as claude.ai or ChatGPT, or a phone app, is not enough: the master needs to reach the campaign's files on your computer. Each agent needs its own plan and login: Claude Code a paid Claude plan, Codex a ChatGPT login. You install it once, from its own page: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: in the campaign folder write `claude`. When it asks whether you trust the folder, choose **Yes, I trust this folder**; careful, the answer already selected is *No, exit*.
- **Codex**: in the campaign folder write `codex`, and say yes when it asks whether you trust the folder. In its desktop app, check in the settings that memories are off for the game's chats.
- **Another agent**: start it in the campaign folder and give it the MCP server `rpg mcp`. RPG Engine is a standard MCP server: any agent that supports MCP can be the master, local ones included.

We play and test it with **Claude Code**; **Codex** is connected and checked, but no whole campaign has been played with it yet; `init` also sets up **Gemini CLI**. The campaign turns off the agent's own memory: the game lives in its files, so that going back to a save really goes back.

### 2.5 The first chat

Write anything, such as *Hi! Let's start.* In its first answer of every chat the master gives you the **link to your dashboard**, something like `http://127.0.0.1:4750`: open it and keep it beside the chat.

Between the master's messages your agent shows the tools it uses: do not open their details (in Claude Code, ctrl+o), they can show secrets.

A new campaign goes through three stages, shown at the top of the dashboard: **1 Settings** (how you want to play), **2 Session zero** (you make your character, in play), **3 Play**.

### 2.6 Settings: choosing how you play

The master asks only what is still missing, a few questions at a time; the dashboard's **Settings** step shows the same questions as cards. Write "you decide" and the master chooses. Everything can change later, in the chat or in **Settings**.

| Setting | What it decides | Values |
|---|---|---|
| **Mentor** | How much the master teaches you the rules | off, hints, tutorial |
| **Difficulty** | How hard the world plays | story, easy, normal, hard, brutal |
| **Lethality** | What falling in a fight means | narrative (never die), epic (only when it matters), dice |
| **Saves** | When you may go back | permadeath, checkpoint, free ([3.8](#38-saves-and-going-back)) |
| **Rigor** | How closely food, light and travel follow the rules | smooth, rules, simulation |
| **Dice** | Who rolls your dice | digital, physical |
| **Units** | Distances and weights | metric, imperial |
| **Companions** | Who travels with you | none, made with you, made by the master, met in play |
| **Pictures** | Pictures of places, quests and those you meet | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Lines** and **Veils** | What never appears, and what happens only off screen | lists |
| **Language** | The game's and the dashboard's language | any |

Fifth edition adds **advancement**: experience points or milestones.

Without a written world, the master also asks a **premise** (genre, tone, a few elements, in your words) and the **preparation**: build the world on the fly, as you go, or all at the start.

**The master's style** is never asked, but you can change it in the chat or in **Settings**: the **prose** (plain, literary, pulp, wry), the **stories** it invents (situations, arcs, episodes, mystery), an author to **write like**, or anything else **in your words**.

### 2.7 Session zero: your character

You make your character with the master, as at a table. Every choice is yours, unless you ask the master to make it: come with a full idea, a vague one, or nothing. The master tells you how ability scores are made before any die is rolled. Your story is never required; if you give one, the master writes it in your words. Then the master asks for a picture of your character ([3.7](#37-your-characters-story-and-picture)). RPG Engine works out the sheet: you never do the sums.

---

## 3. Playing <!-- icon: chat -->

### 3.1 Talking with the master

Write what your character does or says, in your own words:

> I ask the innkeeper who else came through tonight.

Out of the story, write between square brackets: *[How does grappling work?]* The master answers in brackets too.

You say what you try; the master says what happens. The master never decides for your character, and never talks about the engine. You can ask it how to use the dashboard.

### 3.2 Rolls

The master asks for a roll only when the outcome is uncertain and matters, and says first what is at stake. Then:

- **On the dashboard**, a banner shows a button for each check, such as *Acrobatics +4 · with advantage*. Click it: the dice fall on the page and the master hears the result. You can also click the line of your sheet that lights up, throw the dice from the tray, or write something else in the banner.
- **By hand**, in the banner's corner or in **Settings**: the banner tells you what to roll, and you roll it from your sheet or the tray.
- **Physical dice**, with the dice setting on physical: you write the faces you rolled, *[I rolled a 14.]*, and RPG Engine adds your modifiers.

**Free rolls**: click any number on your sheet, or open the tray, to roll for fun. They never count and the master never sees them.

**The master's rolls** show in your roll column, except the secret ones. You can always ask *[Was that roll real?]*: for a secret roll the master gives a fingerprint that proves it was made before you asked.

### 3.3 Scenes and fights

The story runs in **scenes**: a fight, a conversation, exploring, travelling, a rest. At the end of each scene the game saves by itself, and the scene goes into your journal.

In a fight the master tells every turn that is not yours, and stops where you can decide. The **Combat** section shows the order of the turns, your party's hit points and how hurt the enemies look, in words. If your character falls, the death saves appear large on the page.

### 3.4 Time, travel and the world that moves

RPG Engine keeps the date; no time passes between sessions. Say you rest, *We take a long rest*, and the rest brings back what it should. Say where you go, *We take the road north to Rocca*, and RPG Engine works out the way, the distance and the days, stopping when something happens on the way. Money is counted in the game's coins, change included.

Villains have plans with deadlines. Each new day the master moves the threats that time has advanced, and you see their signs, never the clock itself.

### 3.5 Maps

**World** shows the places your character knows, the roads between them and the trail you walked, with fog over the rest. **Scene** shows the map of the place where you are, when it has one, with who stands where; in a fight, on your turn, the squares you cannot reach are veiled. When the master asks where you move, touch a square, or write it, such as *E4*.

### 3.6 Quests, journal and notes

A task your character takes becomes a quest in the **Journal**, with its goals, its deadline and what it measures; star it to keep it in view at the top of Scene. The Journal also tells your **story**, scene by scene, and keeps your **notes**: private, unless you **Share** one, which the master hears as what you think, never as a fact.

### 3.7 Your character's story and picture

On your sheet, the **Description** card has a box for your character's story: the master writes it in, after you say yes. For a picture, give the master a file (PNG, JPEG, WebP or SVG, up to 5 MB) with where it is on your computer, or have a portrait made ([3.11](#311-pictures)): *[Make me a portrait: grey hair in a braid, a scar on the chin.]*

### 3.8 Saves and going back

RPG Engine saves the whole campaign at the end of every scene. The **saves** setting decides the rest:

| Saves | Save when you want | Go back |
|---|---|---|
| **permadeath** | no | never |
| **checkpoint** | no | to the last save, only when your character dies |
| **free** | yes | to any save |

In every mode you can **start over**, from the start of play or from session zero. Do it in the chat or in **Saves**.

After going back, **open a new chat**: the old one remembers what was undone. Write *continue* in the new chat, then press **I opened a new chat** in Saves.

### 3.9 Sessions: stopping and coming back

Stop whenever you want: *[Let's stop here for tonight.]* Everything is already saved in the files. To come back, start your agent in the campaign folder and write *continue*: the master gives you a short recap and goes on.

### 3.10 The master's mood

The robot at the top of the dashboard is the master: its face follows the tone of the story, and never gives away what you do not know yet. When the chat is closed, it sleeps.

### 3.11 Pictures

RPG Engine can have pictures made of the places you reach, the quests you take and those you meet, as the **pictures** setting says, and your character's portrait when you ask. It uses what is on your computer, with your own login: **Codex** paints them, otherwise **Claude Code** draws them. **Settings** says whether this computer can make them, and how to set it up if not. You can always give the master a picture of your own.

### 3.12 Safety: lines, veils and stop

**Lines** never appear in the game; **veils** happen only off screen. At any moment write *[stop]*: the master drops that content at once and adds it to your lines.

### 3.13 Changing your mind

Every setting can change, in the chat or in **Settings**. A ruling the master makes without the book becomes a **precedent**, so the same question gets the same answer next time.

---

## 4. The dashboard <!-- icon: party -->

A page on your own computer, open only in that computer's browser, live while the chat is open. When the chat closes, it shows *Not connected*; it comes back by itself with the next chat.

- **Party**: your sheet and your companions'. Click a number to roll it; hover over it to see where it comes from. Beside it, the rolls.
- **Scene**: where you are, its picture and map, who is there, what is happening.
- **Combat**: only in a fight: the turns, the fighters, what you have at hand.
- **Journal**: quests, the story, your notes.
- **World**: the world map as your character knows it.
- **The dice tray**: choose dice and a modifier, and throw.
- **Saves**, **Help**, **Settings** and **About**, as icons at the end of the row. Settings also holds the page's own preferences: theme, dice sound, dice set.

When the master asks you something, its banner stays at the top, whatever section you are in.

---

## 5. Game systems and house rules <!-- icon: dice -->

### 5.1 What a game system is

The data of one game: its sheet, its numbers, its creatures, items, spells and rules text. Each campaign plays one system. RPG Engine works out the sheet and what is spent and comes back; how a feature works, the master reads in the rules and decides, as at a table.

### 5.2 Fifth edition, included

The races, classes, subclasses, a background and a feat of the SRD 5.1; the 319 spells, the weapons, armor, magic items and monsters; the rules chapters, which the master reads by their exact text; the full sheet, worked out.

You can also play content the SRD lacks, from a book you own: the master writes it as pages of your campaign, and RPG Engine treats them as its own. RPG Engine ships only open content; what your master knows is not limited.

### 5.3 House rules and your own additions

Ask the master: *[House rule: a natural 1 on an attack means you drop your weapon.]* It keeps it as an agreement of the table, or writes a page or a number of the sheet when one is needed. House rules already written out can go as text files in the campaign's `rules` folder.

### 5.4 Adding or importing your own game system

Not yet: today RPG Engine plays only fifth edition ([Coming later](#9-coming-later)).

---

## 6. Extensions <!-- icon: plus -->

Not yet. An extension will add something to a campaign on top of its game system: a world, an adventure, a feature such as the weather, house rules to share.

---

## 7. Where a campaign comes from, and its language <!-- icon: world -->

### 7.1 Three ways to have a world

- **Made on the fly**: from your premise, the master builds each place, person and plot just before you need it, and keeps it.
- **Prepared at the start**: the same, with the world built before play.
- **From your own adventure**: give the master a text or a PDF and ask it to set it up, *[Set up this adventure as our campaign. Don't tell me anything that's in it.]* It writes the places, the characters and the secrets. There is no import button yet.

A campaign is played once: to play the same adventure again, create a new campaign.

### 7.2 Languages

One language per campaign, the master's, which the dashboard follows. The dashboard ships 26 languages. Any other is translated on your computer by Codex or Claude Code, or, without them, by the master in the chat. Fifth edition's terms in Italian come from the official Italian SRD; the rules text stays in English, and the master tells it in your language.

---

## 8. For the curious: the campaign folder <!-- icon: list -->

You never need to open it, and it holds the secrets of your campaign. It has `campaign.yaml` (your settings), `state.yaml` (where the game stands), `world/` (one markdown page for each character, place, quest and the rest), `rules/` (your house rules), `images/`, `log.jsonl` (every change), `.saves/`, `.player/` (your notes), and the small files that tell AI agents where RPG Engine is. The pages use Obsidian's format. If you change a page by hand, the master hears of it at its next answer.

Every command the master uses can be run in the campaign folder too: `rpg --help` lists them. Many print the campaign's secrets.

---

## 9. Coming later <!-- icon: hourglass -->

- **You as the game master**, with the AI playing the party.
- **Author mode**: write an adventure with the AI, then export it and share it.
- **Several players on the same computer**, each with their own character, taking turns in the same chat.
- **Extensions**: settings, adventures, features and house rules.
- **Importing** your manuals and adventures.
- **Other games**: more game systems, and your own.

---

## 10. Questions and problems <!-- icon: info -->

### Questions

**Do I need to know the rules?** No. Choose the tutorial mentor, and ask between brackets whenever you want.

**Can the master cheat?** It cannot change a roll RPG Engine made, except at difficulty story, nor facts already set.

**Does it cost anything?** RPG Engine is free. The master runs on your agent's plan, or on your own computer with a local model. An evening of play is a long chat: on the smallest plans you may reach the plan's limit before the evening ends. Pictures and translations use the same plan.

**Can I play on my phone?** No: the master runs on your computer, and the dashboard opens only there.

**Can I play with friends?** Not yet: today one player, one character, plus companions ([Coming later](#9-coming-later)).

**Can I use a different AI next time?** Yes: open the campaign in another agent and write *continue*.

### Problems

**The dashboard does not open.** Ask the master: `[What's the dashboard link?]`. It works only while a chat is open in that campaign, after the master's first answer.

**The master does not seem to know the game.** Your agent did not load RPG Engine. Check that you started it in the campaign folder and trusted it. In Claude Code, write `/mcp` and reconnect `rpg`. In Codex, `codex mcp list` in the campaign folder must show `rpg`. If `rpg --version` is not found, install RPG Engine again ([2.2](#22-install)).

**Updating.** Run `npm install -g rpg-engine` again, then open a new chat: a running master keeps the version it started with.

**The master remembers something I undid.** Open a new chat and press **I opened a new chat** in Saves.

**No pictures appear.** Settings > Pictures says whether this computer can make them, and how.

**Installing fails, or `rpg` will not start.** `node --version` must say 22 or newer. On Windows, keep RPG Engine and your campaigns out of paths that contain `&`.

**The dashboard link changed.** Another program took the usual address; the master gives you the new link.
