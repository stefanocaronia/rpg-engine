# RPG Engine: the complete guide

**RPG Engine** lets you play a tabletop role-playing game with an **AI as your game master**. You play in the **dashboard**, a window on your computer with your sheet, the dice, the maps, your journal and the **chat** with the master. RPG Engine works behind the scenes: it **remembers the world**, **rolls the dice** and **keeps the accounts**.

This guide is for players: you do not need to know how to program.

## Quick start <!-- icon: send -->

1. Install **Node.js** from [nodejs.org](https://nodejs.org) (the LTS version).
2. Once, in a new terminal opened after Node.js is installed, install RPG Engine: `npm install -g rpg-engine`. If Windows answers that running scripts is disabled, write once `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, answer yes and try again.
3. Write `rpg open`. It asks whether to put RPG Engine's icon on your desktop and in your menu: press Enter for yes. From then on you start RPG Engine from its icon, with no terminal ([2.2](#22-install)).
4. A window shows your campaigns. Press **New campaign**, give it a name and press **Create** ([2.3](#23-create-a-campaign)): its dashboard opens in a window of its own.
5. In the chat with the master, choose your AI app and its model: Claude Code needs a paid Claude plan, Codex a ChatGPT account, free or paid ([2.4](#24-connect-your-ai)). If the app is missing, or you are not signed in, the page installs it or signs you in. Press **Open the chat**, then **Begin**. The first answer can take a couple of minutes; then the master asks how you want to play, and you make your character together.

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

A game comes as a game system, a package the master installs for your campaign: today ours is **fifth edition**, from the free System Reference Document 5.1. Without one you play free, a story without numbers. Others will come ([Coming later](#9-coming-later)).

---

## 2. Getting started <!-- icon: path -->

### 2.1 What you need

- A computer with Windows, macOS or Linux, and a web browser.
- **Node.js 24** or newer, from [nodejs.org](https://nodejs.org). It brings `npm`, which installs RPG Engine.
- A **terminal**, once, to install RPG Engine: on Windows, Terminal or PowerShell; on macOS, Terminal. To open one in a folder, right-click the folder and choose **Open in Terminal** (Windows) or **Services > New Terminal at Folder** (macOS). If Windows answers that running scripts is disabled, write once `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` and answer yes.
- An **AI app** for the master, with your own account ([2.4](#24-connect-your-ai)): the page can install it for you. Play with the **largest model** it offers: a small model is easier to talk into revealing secrets or bending the rules.

### 2.2 Install

```text
npm install -g rpg-engine
rpg open
```

The first line installs RPG Engine; `rpg --version` checks that it worked. If npm offers to update itself, you can ignore it.

`rpg open` opens RPG Engine's window, with your campaigns. The first time, it asks in the terminal whether to add its icon to your desktop and to your Start menu (Applications on a Mac): press Enter for yes. From then on you double-click the icon, and you need the terminal no more. Without the icon, write `rpg open` each time you play; `rpg icon` adds the icon later, and `rpg icon --remove` takes it away.

### 2.3 Create a campaign

RPG Engine's window shows your campaigns as cards, the last one opened first. Press **New campaign** and give its **Name**, its **Language** and its **Game system**: the master makes the rest with you. It goes in a folder with its name, inside the `RPG Engine` folder of your user folder (on Windows, `C:\Users\<name>`); **Choose another folder…** puts it in an empty folder of your choice. Under **The master** you can already choose the AI app and the model for its first chat ([2.4](#24-connect-your-ai)). Press **Create**: the campaign's dashboard opens in a window of its own.

Next time, click a card to open its campaign; one that is open says **Open now**. **Open a folder…** adds a campaign you already have on this computer. The small cross on a card takes it off the list: its files stay where they are.

### 2.4 Connect your AI

The master runs in an **AI app** on your computer, with your own account: Claude Code, Codex, OpenCode or Antigravity. A plain chat such as claude.ai or ChatGPT, or a phone app, is not enough: the master needs to reach the campaign's files on your computer. Each app needs its own account: Claude Code a paid Claude plan (Pro or higher); Codex a ChatGPT account, free or paid; Antigravity a Google account, whose free use has weekly limits; OpenCode has some free models for a limited time, or uses your own provider's, local ones included.

In the dashboard's chat, choose the app under **Your AI app**, then its **Model** and the **Master's thinking**: the page proposes them. More thinking is slower and uses more of your plan. An app that is not ready says what it needs, with a button that does it:

- **Claude Code** and **Codex**: **Install Claude Code** or **Install Codex** downloads it into RPG Engine's own folder on this computer; **Sign in to Claude Code** or **Sign in to Codex** opens its sign-in page in your browser. RPG Engine never sees your password.
- **OpenCode** and **Antigravity**: **Get OpenCode** or **Get Antigravity** opens its site, where you install it. OpenCode plays without signing in; Antigravity signs in from its own app. Then come back and press **Check again**.

Antigravity is marked **on trial**: it can step out of the game and ask questions its own way, so Claude Code, Codex or OpenCode are better to play. Antigravity keeps your past chats, and its memory cannot be turned off: the master is told never to read them. What you write goes to Google, which may have people read it: keep personal data out of the game. RPG Engine is not a Google product. We play and test RPG Engine most with **Claude Code**: no whole campaign has been played with the others yet.

In the dashboard's chat the master touches your computer only through RPG Engine: it opens none of your files by itself. RPG Engine reads outside the campaign only what you chose, after you say yes in a window of your computer.

You can also play in your AI app's own chat, in a terminal or in its desktop app ([2.8](#28-the-other-way-your-ai-apps-own-chat)).

### 2.5 The first chat

With the app and the model chosen, press **Open the chat**: the app starts, which can take a few seconds. Then press **Begin**, or write anything, such as *Hi! Let's start.* The first answer can take a couple of minutes, while the master sets the scene.

The chat has its own section, **Roleplay**, or stands beside the page: the small buttons at its top put it **In its tab**, **On the left** or **On the right**, and you drag its edge to make it wider.

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
| **Character voices** | Who speaks for the characters you meet, from the master to the characters: the master always; at key moments the character themselves, knowing only what they know, as the master chooses; or always the character, for the main ones or for everyone, slower and costlier, where your AI app can | the master, sometimes, main characters, everyone |
| **Your character** | How your character is made in session zero | with the master, by the master, your own ([2.7](#27-session-zero-your-character)) |
| **Companions** | Who travels with you | none, made with you, made by the master, met in play |
| **Pictures** | Pictures of places, quests and those you meet | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Lines** and **Veils** | What never appears, and what happens only off screen | lists |
| **Language** | The game's and the dashboard's language | any |

Fifth edition adds **advancement**: experience points or milestones.

Without a written world, the master also asks a **premise** (genre, tone, a few elements and what you enjoy most in a game, such as fights, mysteries, talk or exploring, in your words) the **preparation**: build the world on the fly, as you go, or all at the start; and the **length**: one evening, a few sessions (three to five evenings), or open, one adventure after another. At the end of a story with a length you can always go on.

**The master's style** is never asked, but you can change it in the chat or in **Settings**: the **prose** (plain, literary, pulp, wry), the **stories** it invents (situations, arcs, episodes, mystery), an author to **write like**, or anything else **in your words**.

### 2.7 Session zero: your character

You make your character with the master, as at a table. Every choice is yours, unless you ask the master to make it: come with a full idea, a vague one, or nothing; or ask the master to make it all from a few words. In a game with levels the master asks from which level you start: the first, unless you want another. The master tells you how ability scores are made before any die is rolled. Your story is never required; if you give one, the master writes it in your words. Then the master asks for a picture of your character ([3.7](#37-your-characters-story-and-picture)). RPG Engine works out the sheet: you never do the sums.

Do you already have a character, from another game or another campaign? Choose **I already have one** in the setup and give it to the master: paste the sheet in the chat. In your AI app's own chat you can also say where its file is on your computer (a PDF, a picture, a text); in the dashboard's chat the master opens no file of yours. The master writes it as it is, at its level, checks it against the rules and the world, and agrees with you anything that does not fit.

### 2.8 The other way: your AI app's own chat

You can also play in the chat of your AI app itself, in a terminal or in its desktop app, with the dashboard open beside it. Then you make the campaign in a terminal, in the folder where you keep your games ([2.1](#21-what-you-need) says how), always with its name: `rpg init "The Salt Isles"` makes the folder `The Salt Isles` with a new campaign in it. RPG Engine prepares by itself what each app needs there.

Start your app in that folder: `claude` for Claude Code, `codex` for Codex, `agy` for Antigravity, `opencode` for OpenCode; or open the folder in its desktop app. Say yes when it asks whether you trust the folder: careful, in Claude Code the answer already selected is *No, exit*. Any other agent that supports MCP can be the master too: start it in the campaign folder and give it the MCP server `rpg mcp`.

Write *Hi! Let's start.* In its first answer of every chat the master gives you the **link to your dashboard**, something like `http://127.0.0.1:4750`: open it beside the chat.

- Between the master's messages your app shows the tools it uses: do not open their details (in Claude Code, ctrl+o), they can show secrets.
- The campaign turns off the app's own memory: the game lives in its files, so that going back to a save really goes back. In Codex's desktop app, check in the settings that memories are off for the game's chats.
- If the master says it cannot find RPG Engine's tools, write `rpg init` in the campaign folder, then open a new chat.
- One chat at a time plays a campaign: while yours is open, the dashboard's chat waits.

---

## 3. Playing <!-- icon: chat -->

### 3.1 Talking with the master

Write what your character does or says, in your own words:

> I ask the innkeeper who else came through tonight.

Out of the story, write `[OOC: …]` (out of character): *[OOC: How does grappling work?]* The master answers the same way; in the dashboard's chat its words out of the game stand apart, marked OOC.

In the dashboard's chat, write in the box at the bottom and press Enter to send; Shift+Enter starts a new line. While the master answers, **Stop** halts them, and your words wait in the box. When the master asks you something, its buttons come with the question, rolls included: click one, or write your answer. Under the box you see the app and the model; where the app allows it, click the model to change it once the master has answered. **Close the chat** ends the chat; the game stays in its files.

You say what you try; the master says what happens. The master never decides for your character, and never talks about the engine. You can ask it how to use the dashboard.

**Acting from the dashboard**: click a name on your sheet, such as a weapon, a spell or something you carry: its card says what it is; a bag opens with its arrow, and its ⓘ shows its card. Choose what you do with it. Something that needs no one, such as **Equip**, asks you to confirm on the same button, *Confirm: I equip Shield*: press it again and it goes to the master. Something done to someone, such as **Attack**, asks whom, in the list or with a click on the map; then the button says the whole sentence, *I attack Hooded Bandit 1 with Mace*, and one click sends it. To say it your own way, click a person to talk to, or write in the chat. The master hears it as said in the chat, rules it as any other, and asks you with buttons what you left out. Where your AI app has no doorbell, the master reads it as soon as you next write in the chat; if the chat was closed before, **Say it again** sends it once more.

### 3.2 Rolls

The master asks for a roll only when the outcome is uncertain and matters, and says first what is at stake. Then:

- **On the dashboard**, a banner shows a button for each check, such as *Acrobatics +4 · with advantage*. Click it: the dice fall on the page and the master hears the result. You can also click the line of your sheet that lights up, throw the dice from the tray, or write something else in the banner.
- **By hand**, in the banner's corner or in **Settings**: the banner tells you what to roll, and you roll it from your sheet or the tray.
- **Physical dice**, with the dice setting on physical: you write the faces you rolled, *[I rolled a 14.]*, and RPG Engine adds your modifiers.

**Free rolls**: click any number on your sheet, or open the tray, to roll for fun. They never count and the master never sees them.

**The master's rolls** show in your roll column, except the secret ones. You can always ask *[Was that roll real?]*: for a secret roll the master gives a fingerprint that proves it was made before you asked.

### 3.3 Scenes and fights

The story runs in **scenes**: a fight, a conversation, exploring, travelling, a rest. At the end of each scene the game saves by itself, the scene goes into your journal, and when the story turns the master writes the scenes since the last chapter as a new chapter of your story's book.

In a fight the master tells every turn that is not yours, and stops where you can decide. The **Scene** shows on top whose turn it is and who comes next, and your character's card beside the map; the order of the turns, your party's hit points and how hurt the enemies look, in words, stay beside the page. If your character falls, the death saves appear large on the page.

**Standing orders**: tell your companions something that should last, such as *From now on, always leave one alive*, and the master keeps it until you lift it. Your companions follow it as far as their character allows, and if one would not, they say so. You find your orders in **Settings**, where you can add and take them off.

### 3.4 Time, travel and the world that moves

RPG Engine keeps the date. Between sessions the game time stops, unless you choose in **Settings** to let it run, such as a day of the game for each week away, or ask the master. Say you rest, *We take a long rest*, and once the master agrees the rest brings back what it should. In a short rest the master may ask on the dashboard how many hit dice you spend: roll them one at a time, see what each heals, and stop when you like. Say where you go, *We take the road north to Rocca*, and RPG Engine works out the way, the distance and the days, stopping when something happens on the way. Money is counted in the game's coins, change included.

Villains have plans with deadlines. Each new day the master moves the threats that time has advanced, and you see their signs, never the clock itself.

### 3.5 Maps

**World** shows the places your character knows, the roads between them and the trail you walked, with fog over the rest. **Scene** shows the map of the place where you are, when it has one, with who stands where; in a fight, on your turn, the squares you cannot reach are veiled. When the master asks where you move, touch a square, or write it, such as *E4*.

**World** also keeps what your character knows. **Lore** lists the people, places, factions, creatures and stories they know, each as they know it: search it, or open one to read it whole; a name in the text leads to its page. **Documents** keeps the letters, notices and pages they found, to read again. **Calendar** shows today, your quests' deadlines with the time left, and the days of the story: a day with scenes leads to them in the Journal's timeline.

### 3.6 Quests, journal and notes

A task your character takes becomes a quest in the **Journal**, with its goals, its deadline and what it measures; star it to keep it in view at the top of Scene. Under **Story** the Journal tells your story as a book: the master writes a chapter of prose each time the story turns, telling the scenes since the last one, in the style you chose; read it chapter by chapter, the last marked by its bookmark, and download it as Markdown or as a web page to print or pass on. In a game begun before, ask the master to write the story so far. **Timeline** lists the scenes, numbered, with what happened in each. The Journal also keeps your **notes**: private, unless you **Share** one, which the master hears as what you think, never as a fact. Under **Companions** you read your companions' diaries: now and then, at the end of a day or a quest, they write a few lines of what they think and feel.

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

After going back, **open a new chat**: the old one remembers what was undone. In the dashboard's chat, press **Close the chat**, then **New chat**; in your AI app's own chat, open a new conversation (`/clear` in Claude Code). Write *continue* in the new chat. Then tell the master that the chat is new: press **I opened a new chat** in Saves, or say so in the chat. Until then the master does not go on.

If you do not know what git is, skip this paragraph. If the campaign's folder is a git repository, **Settings** has a **Git** section, all off until you choose: a commit at the start of each session, at each save and at each end of a scene, and a push after it if you want. A commit is a snapshot of the campaign at that moment; a push sends the snapshots to the repository online, on GitHub for example, so that a copy lives outside this computer. The saves and your chats with the master stay out of the repository unless you let them in; let the chats in only if the repository is private.

### 3.9 Sessions: stopping and coming back

Stop whenever you want: *[Let's stop here for tonight.]* Everything is already saved in the files. To come back, open RPG Engine from its icon and click your campaign. If you left the chat open, it comes back by itself. If you closed it, press **Resume the chat**. Then press **Take up the story**: the master tells you in a few lines where you were, and goes on. If the game was closed while the master was still answering, or while a question of theirs waited for you, that button says **Pick up from here** instead. **New chat** opens a fresh chat on the same game. In your AI app's own chat, start it in the campaign folder and write *continue*.

### 3.10 The master's mood

The robot at the top of the dashboard is the master: its face follows the tone of the story, and never gives away what you do not know yet. When the dashboard is not connected to the game, it sleeps.

### 3.11 Pictures

RPG Engine can have pictures made of the places you reach, the quests you take and those you meet, as the **pictures** setting says, and your character's portrait when you ask. Your own AI app makes them with its own means, with your login, on your plan and its limits: **Claude** draws them as vector pictures, **Codex** and **Antigravity** paint them, **OpenCode** draws simple vector pictures in the chat. In **Settings > Campaign > Pictures** you can have Codex or Antigravity paint them also when your master is another app: where the one you chose cannot, your chat makes them. **Settings** says whether this computer can make them, and how to set it up if not. You can always give a picture of your own, to your character or to any page you see: pass the pointer over one of its pictures and a small picture button shows in its corner (with the keyboard too, and always on a phone); in **World** the page you open also has **Change the picture…**, or **Add a picture…** while it has none. With the pointer over a picture, or its button focused, you can also paste one you copied, with Ctrl+V (⌘V on a Mac). Yours takes the place of the one it has. Or drop the file in the campaign's **inbox** folder and tell the master which page it is for.

### 3.12 Safety: lines, veils and stop

**Lines** never appear in the game; **veils** happen only off screen. At any moment write *[stop]*: the master drops that content at once and adds it to your lines.

### 3.13 Changing your mind

Every setting can change, in the chat or in **Settings**. A ruling the master makes without the book becomes a **precedent**, so the same question gets the same answer next time.

---

## 4. The dashboard <!-- icon: party -->

A page on your own computer, in a window of its own, open only on that computer. It stays live while its window is open, with or without a chat; about thirty seconds after you close it, the game stops, and the chat with it. Nothing is lost: it is all in the files. In your AI app's own chat, it is live while that chat is open. When the game is away the page shows *Not connected*: press **Reopen the campaign**, or, in your own app, open the next chat. The **Campaigns** button, with the house, leads back to all your campaigns.

- **Roleplay**: the chat with the master, when it is not beside the page ([2.5](#25-the-first-chat)).
- **Party**: your sheet and your companions'. Click a number to roll it; hover over it to see where it comes from and, when an arrow marks its die, what makes the roll better or worse. When the master prepares choices for you, as at a new level, a notice on the sheet opens them: pick when you like, read the pages the options name, roll where an option rolls, then confirm; the story goes on meanwhile. Beside it, the rolls.
- **Scene**: where you are, its picture and map, who is there, what is happening; in a fight, the turns and your character's card.
- **Journal**: quests, the story as a book, its timeline, your companions' diaries, your notes.
- **World**: the world map, what your character knows, the documents found and the calendar.
- **The dice tray**: choose dice and a modifier, and throw; ×2 doubles the dice, never the modifier, as for a critical hit.
- **Saves**, **Help**, **Settings** and **About**, as icons at the end of the row. Settings also holds, under **Dashboard**, the page's own preferences: mode, dice sound, dice set, and the **theme**, the colours, faces and pictures of the page: the game system's, a theme you added in Packages › Add, from the catalog, a GitHub link, a .zip or a folder, or the page's own. If a theme's own style sheet makes the page hard to read, turn off **Theme's own style** there: Settings always show without it, at the page's address with `#/settings/page` at the end.

When the master asks you something, its banner stays at the top, whatever section you are in.

---

## 5. Game systems and house rules <!-- icon: dice -->

### 5.1 What a game system is

The data of one game: its sheet, its numbers, its creatures, items, spells and rules text. Each campaign plays one system. RPG Engine works out the sheet and what is spent and comes back; how a feature works, the master reads in the rules and decides, as at a table.

### 5.2 Fifth edition

The races, classes, subclasses, a background and a feat of the SRD 5.1; the 319 spells, the weapons, armor, magic items and monsters; the rules chapters, which the master reads by their exact text; the full sheet, worked out.

It is a package of its own: the master offers it when you set up a campaign and installs it. A campaign that plays it installs it by itself the first time it opens on a computer without it, and the master tells you.

You can also play content the SRD lacks, from a book you own: the master writes it as pages of your campaign, and RPG Engine treats them as its own. RPG Engine ships only open content; what your master knows is not limited.

Your own manuals can be your library: tell the master where they are, *[My manuals are in D:\Books\5e.]*, or add their folder in Packages › Library, and say yes in the window your computer shows, once. RPG Engine reads them on this computer; each campaign uses the folders you turn on there, and the master searches them when it decides a rule, after the SRD, citing the book and the page. They read best as text, or as PDFs whose text can be selected; a scanned PDF is read from the pictures of its pages, on Windows only, in a few minutes and with a few mistakes. RPG Engine never changes your manuals, never sends their text anywhere and never copies it into a campaign.

### 5.3 House rules and your own additions

Ask the master: *[House rule: a natural 1 on an attack means you drop your weapon.]* It keeps it as an agreement of the table, or writes a page or a number of the sheet when one is needed. House rules already written out can go as text files in the campaign's `rules` folder.

When the master changes a page of the game system for your campaign, as a creature's hit points or a spell's range, the dashboard marks it with a small asterisk after its name wherever it shows. Packages › Installed lists what changed, under the game system, beside what the system gave; a creature your character does not know is there by its name alone. There you can put a page back as the system writes it, once the scene being played is over; the dashboard cannot undo it, only the master can write the change again.

### 5.4 Adding or importing your own game system

A game system is a package: the master installs one from npm, a folder or a file, and one that is not ours only with your yes, in a form of your agent or a window of your computer. Making one is a developer's work, described in RPG Engine's documents on GitHub. Turning a book of yours into a game system is not here yet ([Coming later](#9-coming-later)).

---

## 6. Extensions <!-- icon: plus -->

An extension adds something to a campaign on top of its game system: a feature such as the weather, which changes at each dawn, or picking a lock with dice. Add one in Packages › Add, from the list or by its name on npm, a folder or a file; one that is not ours brings code, and comes only with your yes, in a window of your computer. One made for another game system says which, and is not added. In Packages › Installed you update one or take it out; the master can add one too, when you ask.

---

## 7. Where a campaign comes from, and its language <!-- icon: world -->

### 7.1 Three ways to have a world

- **Made on the fly**: from your premise, the master builds each place, person and plot just before you need it, and keeps it.
- **Prepared at the start**: the same, with the world built before play.
- **From your own adventure or book**: give the master its file, *[Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* A file outside the campaign is read only after you say yes in a window of your computer; one you put in the campaign's **inbox** folder is read at once. It reads best as text, an EPUB, a Word document or a PDF whose text can be selected; a scanned PDF is read from the pictures of its pages, on Windows only, slowly and with a few mistakes. Your own AI app reads it outside the chat, or else the master in the chat, on your plan: in Claude Code or Codex one of those two reads it, in Antigravity your Antigravity, in OpenCode the model you last chose in it. The whole document goes to the maker of the one that reads it, under the terms of your account and its choice on training. The dashboard shows how far it is; from a novel, the master proposes where to start. It writes the places, the characters and the secrets.

A campaign is played once: to play the same adventure again, create a new campaign.

### 7.2 Languages

One language per campaign, the master's, which the dashboard follows. The dashboard ships 26 languages. Any other is translated on your computer by your own AI app outside the chat (Codex or Claude Code; in Antigravity and OpenCode, their own), or, where none can, by the master in the chat. Fifth edition's terms in Italian come from the official Italian SRD; the rules text stays in English, and the master tells it in your language.

---

## 8. For the curious: the campaign folder <!-- icon: list -->

You never need to open it, and it holds the secrets of your campaign. It has `campaign.yaml` (your settings), `state.yaml` (where the game stands), `world/` (one markdown page for each character, place, quest and the rest), `rules/` (your house rules), `images/`, `log.jsonl` (every change), `sessions/` (your chats with the master as text, from Claude Code and Codex), `.saves/`, `.player/` (your notes), and the small files that tell AI agents where RPG Engine is. The pages use Obsidian's format. If you change a page by hand, the master hears of it at its next answer.

RPG Engine stays in this folder: it reads and writes the game only here, and never touches your other files; the folders of your manuals it only reads. Outside it, it keeps only data folders of its own (the dashboard's translations, the text it read of your manuals, and Codex or Claude Code if you let it install them) and temporary folders while a picture is drawn. Anything else your agent wants to do on your computer, it asks you first. A game system or an extension is code, as any npm package is: one that is not ours runs on your computer with your permissions, and RPG Engine installs it only with your yes, in a form of your agent or a window of your computer. Say yes only to packages whose authors you trust.

Every command the master uses can be run in the campaign folder too: `rpg --help` lists them. Many print the campaign's secrets.

---

## 9. Coming later <!-- icon: hourglass -->

- **You as the game master**, with the AI playing the party.
- **Author mode**: write an adventure with the AI, then export it and share it.
- **Several players on the same computer**, each with their own character, taking turns in the same chat.
- **More extensions**: worlds, features and house rules to share.
- **Other games**: more game systems, and your own.

---

## 10. Questions and problems <!-- icon: info -->

### Questions

**Do I need to know the rules?** No. Choose the tutorial mentor, and ask in `[OOC: …]` whenever you want.

**Can the master cheat?** It cannot change a roll RPG Engine made, except at difficulty story, nor facts already set.

**Does it cost anything?** RPG Engine is free. The master runs on your AI app's plan, or on your own computer with a local model. An evening of play is a long chat: on the smallest plans you may reach the plan's limit before the evening ends. Pictures, translations and imports use the same plan. RPG Engine itself never uses an API key, which is paid by the call: sign your AI app in with your account, not with a key.

**Can I play on my phone?** No: the master runs on your computer, and the dashboard opens only there.

**Can I play with friends?** Not yet: today one player, one character, plus companions ([Coming later](#9-coming-later)).

**Can I use a different AI next time?** Yes: choose another app in the chat before you open it, or open the campaign in another app and write *continue*.

### Problems

**A campaign does not open.** Open RPG Engine again from its icon, or with `rpg open` in a terminal, and click the campaign. If its dashboard says *Not connected*, press **Reopen the campaign**. A card that says **Folder not found** lost its folder: take it off the list, and add it again with **Open a folder…** where it is now. In your AI app's own chat, the dashboard works only while a chat of that campaign is open: ask the master `[OOC: What's the dashboard link?]`. In the Claude app a chat left in the background for a while sleeps, and the page with it: click the chat, and the page comes back at the same address.

**The master does not seem to know the game.** This happens in your AI app's own chat: it did not load RPG Engine. Check that you started it in the campaign folder and trusted it. In Claude Code, write `/mcp` and reconnect `rpg`. In Codex, `codex mcp list` in the campaign folder must show `rpg`. If `rpg --version` is not found, install RPG Engine again ([2.2](#22-install)).

**Windows does not find `claude`.** This happens when you installed Claude Code yourself. Its installer says so in a yellow note, with the folder it went into: add that folder to the PATH (System Properties > Environment Variables), then open a new terminal.

**Updating.** When a newer RPG Engine is out, the dashboard says so: in Packages › Installed, RPG Engine comes first, with **Update**; then do what the page tells you. Or run `npm install -g rpg-engine` again in a terminal, then open a new chat: a running master keeps the version it started with.

**The master remembers something I undid.** Open a new chat and press **I opened a new chat** in Saves.

**An app does not install.** The page says why: press **Try again**. Or install it yourself from its maker's site, then press **Check again**.

**The sign-in page does not open in the browser.** While the page waits for you, press **Open the sign-in page again** where it shows, or **Cancel** and try once more.

**The dashboard's chat says another chat is playing.** A chat you opened yourself in your AI app is playing this campaign: go on there, or close it to play in the dashboard.

**No pictures appear.** Settings > Campaign > Pictures says whether this computer can make them, and how.

**Installing fails, or `rpg` will not start.** `node --version` must say 24 or newer. If Windows answers that running scripts is disabled, see [2.1](#21-what-you-need). On Windows, keep RPG Engine and your campaigns out of paths that contain `&`.

**The dashboard link changed.** In your AI app's own chat, each campaign has its own address, the same chat after chat. It changes only when another program is already using it: the master gives you the new link, and from then on it stays. A second chat of the same campaign keeps the page at the same address, and takes it over once you close the first.
