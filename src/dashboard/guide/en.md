# RPG Engine: the complete guide

**RPG Engine** lets you play a tabletop role-playing game with an **AI as your game master**. You play in the **dashboard**, a window on your computer with your sheet, the dice, the maps, your journal and the **chat** with the master.

This guide tells you how to play. The page explains its own buttons: rest the pointer on one to see what it does.

## Quick start <!-- icon: send -->

1. Install **Node.js** from [nodejs.org](https://nodejs.org) (the LTS version).
2. Open a new terminal and write `npm install -g rpg-engine`. If Windows says that running scripts is disabled, write `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, answer yes and try again.
3. Write `rpg open`: it puts RPG Engine's icon on your desktop ([2.2](#22-installing)). From then on you start RPG Engine from the icon.
4. Press **New campaign**, give it a name and press **Create** ([2.3](#23-a-new-campaign)).
5. In the chat, choose your AI app and its model ([2.4](#24-connect-your-ai)): Claude Code needs a paid Claude plan, Codex a ChatGPT account, free or paid. Press **Open the chat**, then **Begin**.

The first answer can take a couple of minutes. Then the master asks how you want to play, and you make your character together.

## 1. What RPG Engine is <!-- icon: about -->

| Who | What they do |
|---|---|
| **You** | You play your character: what they do, say and try. |
| **The master** (the AI) | Tells the story, plays everyone else, decides what happens, asks for rolls. |
| **RPG Engine** | Keeps the world in files, rolls the dice, counts hit points, money, time and distances, keeps secrets until you discover them. |

So the world stays the same from one evening to the next, even in a new chat, even with a different AI:

- **What has been said stays true.** A dead villain stays dead.
- **The dice are real.** The master cannot change them, except at the easiest difficulty.
- **Secrets stay secret.** The master never tells you what your character does not know.
- **The world moves.** Threats advance while you rest or travel.
- **A campaign is a folder** on your computer: stop when you want, go on later.

A game comes as a game system: today ours is **fifth edition**, from the free System Reference Document 5.1. Without one you play free, a story without numbers.

---

## 2. Getting started <!-- icon: path -->

### 2.1 What you need

- A computer with Windows, macOS or Linux.
- **Node.js 24** or newer, from [nodejs.org](https://nodejs.org).
- A **terminal**, only to install: on Windows, Terminal or PowerShell; on macOS, Terminal.
- An **AI app** for the master, with your own account ([2.4](#24-connect-your-ai)).

### 2.2 Installing

```text
npm install -g rpg-engine
rpg open
```

The first line installs RPG Engine. If npm offers to update itself, you can ignore it.

`rpg open` opens RPG Engine's window. The first time, it also puts an icon on your desktop and in your menu: from then on you start from the icon. To take it away, write `rpg icon --remove`.

If installing fails, check that `node --version` says 24 or more. If Windows says that running scripts is disabled, write `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` and answer yes. On Windows, keep RPG Engine and your campaigns out of paths that contain `&`.

### 2.3 A new campaign

Press **New campaign** and give it a **Name**, a **Language** and a **Game system**. The master makes the rest with you. Press **Create**: the campaign opens in a window of its own.

The master and the dashboard speak the campaign's language. The rules text of fifth edition stays in English, and the master tells it in your language.

The campaign is a folder with its name, inside the `RPG Engine` folder of your user folder. Next time, click its card.

### 2.4 Connect your AI

The master runs in an **AI app** on your computer, with your account. A web chat like claude.ai or ChatGPT is not enough: the master must reach the campaign's files.

- **Claude Code**: a paid Claude plan (Pro or higher).
- **Codex**: a ChatGPT account, free or paid.
- **OpenCode**: no account; a few free models for a limited time, or your own provider's, local ones too.
- **Antigravity**: a Google account; its free use has weekly limits.

In the chat, choose the app, its **Model** and the **Master's thinking**. If the app is missing or you are not signed in, a button installs it, signs you in or opens its site. RPG Engine never sees your password.

An evening of play is a long chat: on the smallest plans you can reach the limit before the evening ends. Play with the largest model you have: a small one is easier to talk into revealing secrets.

We play and test RPG Engine most with **Claude Code**. Antigravity is **on trial**: it can step out of the game, and it keeps your chats in a memory you cannot turn off. What you write there goes to Google, which may have people read it. RPG Engine is not a Google product.

### 2.5 The first chat

Press **Open the chat**, then **Begin**. The first answer can take a couple of minutes. Then a new campaign goes through three steps:

1. **Settings**: the master asks how you want to play, a few questions at a time: how hard the world is, whether you can die, when you can go back to a save. Write *you decide* to let it choose. Everything can change later.
2. **Session zero**: you make your character with the master, as at a table. RPG Engine does the sums of the sheet. If you already have a character, paste its sheet in the chat.
3. **Play**: the master sets the first scene.

### 2.6 Playing in your AI app

You can also play in your AI app's own chat, in a terminal or in its desktop app, with the dashboard beside it.

1. Open a terminal in the folder where you keep your games: right-click the folder and choose **Open in Terminal** (Windows) or **Services > New Terminal at Folder** (macOS).
2. Write `rpg init "The Salt Isles"`: it makes the folder `The Salt Isles` with a new campaign in it.
3. Start your app in that folder: `claude`, `codex`, `agy` for Antigravity, or `opencode`. Say yes when it asks whether you trust the folder: in Claude Code the answer already selected is *No, exit*.
4. Write *Hi! Let's start.* The master gives you the link to your dashboard: open it beside the chat.

Good to know:

- Do not open the details of the tools your app uses (in Claude Code, ctrl+o): they can show secrets.
- In Codex's desktop app, turn memories off for the game's chats.
- If the master does not know the game, write `rpg init` in the campaign folder and open a new chat.
- If Windows does not find `claude`, add the folder its installer named to the PATH, then open a new terminal.
- One chat at a time plays a campaign: while yours is open, the dashboard's chat waits.

---

## 3. Playing <!-- icon: chat -->

### 3.1 Talking with the master

Write what your character does or says:

> I ask the innkeeper who else came through tonight.

You say what you try; the master says what happens. It never decides for your character.

Out of the story, write `[OOC: …]` (out of character): *[OOC: How does grappling work?]* You can ask the master the rules, or how the dashboard works.

When the master asks you something, answer with its buttons or in your own words. You can also act from your sheet: click a weapon, a spell or an item, and choose what to do.

**Standing orders**: tell your companions something that should last, such as *From now on, always leave one alive*. The master keeps it until you lift it.

### 3.2 Rolls

The master asks for a roll only when the outcome is uncertain and matters. A banner shows the roll: click it and the dice fall.

The dice are RPG Engine's, not the master's. You can always ask *[Was that roll real?]*: even for a secret roll, the master can prove it was made before you asked.

With the **Dice** setting on physical, roll your own dice and write the result: *[I rolled a 14.]* The rolls you make for fun, from your sheet or with **Free roll**, never count.

### 3.3 Scenes, fights and travel

The story runs in **scenes**: a fight, a talk, a journey, a rest. At the end of each scene the game saves by itself, and the scene goes into your journal.

In a fight the master plays every turn that is not yours, and stops when you have to decide.

Say where you go, *We take the road north to Rocca*: RPG Engine works out the distance and the days, and stops if something happens on the way. Meanwhile the villains' plans go on, and you see their signs.

### 3.4 Saves

RPG Engine saves the campaign at the end of every scene. The **Saves** setting decides when you can go back:

- **permadeath**: never.
- **checkpoint**: to the last save, only when your character dies.
- **free**: to any save, and you can save when you want.

In every mode you can start over, in the chat or in **Saves**.

After going back, open a new chat, because the old one remembers what was undone:

1. Press **Close the chat**, then **New chat**. In your AI app's own chat, open a new conversation (`/clear` in Claude Code).
2. Write *continue*.
3. Press **I opened a new chat** in Saves. Until then the master waits.

### 3.5 Stopping and resuming

Stop whenever you want: everything is already saved. Close the dashboard's window, and shortly after the game stops. Nothing is lost.

To come back, open RPG Engine from its icon and click your campaign. Press **Resume the chat**, then **Take up the story**: the master tells you where you were and goes on. Next time you can also choose another AI app.

### 3.6 Limits and stop

**Lines** never appear in the game; **veils** happen only off screen. You set them in **Settings**.

At any moment write *[stop]*: the master drops that content and adds it to your lines.

### 3.7 Pictures

The master can have pictures made of places, quests and people, as the **Pictures** setting says, and a portrait of your character when you ask. Your AI app makes them, on your plan. If none appear, **Settings** says whether this computer can make them.

You can also give your character, or a page of the world, a picture of your own, from the page itself.

---

## 4. The dashboard <!-- icon: party -->

The window where you see your game. It shows only what your character knows.

- **Roleplay**: the chat with the master, when it is not beside the page.
- **Party**: your sheet, your companions' and the rolls.
- **Scene**: where you are, who is there and the map; in a fight, the turns.
- **Journal**: quests, the story as a book, your companions' diaries and your notes.
- **World**: the world map, what your character knows, the documents found and the calendar.
- **Saves**: going back and starting over.
- **Settings**: how you play, and how the page looks.
- **Packages**: the game system, extensions, your manuals, and updates: when a new RPG Engine is out, it says so here.

If the page says it is not connected, press **Reopen the campaign**.

To play from your phone, at home: in **Settings**, **Dashboard**, turn on **Phone access** and frame the code with the phone, on the same Wi-Fi as the computer. Windows may ask whether Node.js can use the network: allow it on private networks, and set the Wi-Fi as a private network. The game travels unencrypted: use it only on a network you trust, as your home's; never on a public, hotel or office Wi-Fi. Turn it off when you are done: the game ends with the computer's last window.

If a theme makes the page hard to read, add `#/settings/page` at the end of its address, and turn off **Theme's own style**.

---

## 5. Rules, manuals and extensions <!-- icon: dice -->

A **game system** is the data of one game: the sheet, creatures, items, spells and rules. RPG Engine works out the sheet; how a rule applies, the master reads and decides, as at a table.

**Fifth edition** holds the free rules of the System Reference Document 5.1. You can also play content from a book you own: the master writes it into your campaign.

**Your manuals**: tell the master where they are, or add their folder in **Packages**. The master looks rules up in them and cites the book and the page. RPG Engine never changes them and never copies them into a campaign.

**House rules**: ask the master, *[House rule: a natural 1 on an attack means you drop your weapon.]* It keeps the rule. A ruling it makes once holds the next time too.

**Extensions** add something to the game, such as the weather. Add them in **Packages**, or ask the master.

---

## 6. Your own adventure <!-- icon: world -->

Without a written world, the master builds one from your premise, and keeps it.

To play an adventure or a book you own, give the master its file: *[Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* A file outside the campaign is read only after your yes. It reads best as text, EPUB, Word or a PDF whose text can be selected.

The whole document goes to the company of the AI that reads it. A campaign is played once: to play the same adventure again, create a new campaign.

---

## 7. Your data <!-- icon: lock -->

- A campaign is a folder. It holds the campaign's secrets, your chats with the master too: you never need to open it.
- RPG Engine reads and writes only in that folder. Your manuals it only reads; anything else outside the campaign only after your yes, in a window of your computer.
- In the dashboard's chat the master opens none of your files by itself.
- What you write goes to the company whose model plays the master, under your account's terms. With a local model it stays on your computer.
- A game system or an extension that is not ours is code that runs on your computer: it comes only with your yes. Say yes only to authors you trust.
- If the campaign folder is a git repository, **Settings** can commit it for you. Let your chats in only if the repository is private.
- With **Phone access** on, the game goes unencrypted from the computer to the phone over your home network, through no outside service: whoever is on that network could read it.
