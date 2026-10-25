<p align="center"><img src="https://raw.githubusercontent.com/stefanocaronia/rpg-engine/main/docs/logo.png" width="160" alt="The RPG Engine mascot: a yellow robot behind a game master's screen"></p>

# RPG Engine

Play a tabletop role-playing game with an **AI as your game master**.

![The dashboard during a fight in a tavern: the place's picture, the scene with the party and two hooded bandits, the quest under way and the last rolls](https://raw.githubusercontent.com/stefanocaronia/rpg-engine/main/docs/screenshots/scene.png)

## A world that resists

A game needs a world that resists: a locked door stays locked even when the story would like it open, the arrows run out, a dead innkeeper stays dead. Without that there is nothing to win and nothing to lose, only a story that bends to whoever tells it.

An AI is a wonderful storyteller, but a storyteller tends to make the world fit the story. RPG Engine gives the master determinism: dice that are rolled, not narrated; mechanics that work the same way every time; things that stay where they were left, even when no one is looking. A world with its own rules and its own memory, independent of the master and of us. The AI tells the story and plays everyone else; RPG Engine **keeps the world**, **rolls the dice** and **keeps the accounts**.

## What you can do

- **Play in a chat** with the master, with the **dashboard** open beside it: your sheet, the dice, the maps, the journal.
- **Let the master create the world** as you play, from a premise; **prepare an adventure** before you start, on what you agree together; or **bring your own** adventures, notes and house rules, which the master sets up, secrets and all.
- **Travel with companions** that the master plays as characters of their own, each with what they know and how they feel.
- **Roll real dice**, on the page or your own at the table: the master cannot bend them.
- **Keep secrets secret**: the master never reveals what your character has not discovered.
- **Live in a world that moves**: time passes, and threats advance while you rest or travel.
- **Fight and explore** in scenes with turns, on maps of places and of the world, travelling by road or across country.
- **Follow quests** with goals and deadlines, and a **journal** that tells your story in chapters.
- **Save**, as in a video game: at the end of every scene, to go back or start over as you choose.
- **Choose how you play**: difficulty, lethality, how much the master teaches the rules, its style, your lines and veils.
- **Play in your language**: the dashboard speaks 26, and any other is translated for you. With Claude Code or Codex on your computer, the master also draws places, quests and the people you meet.

## The game

Today RPG Engine plays **fifth edition**, from the free System Reference Document 5.1: races, classes, the 319 spells, items, monsters, and the rules chapters, which the master reads by their exact text. Your sheet works itself out, as a digital character sheet does. A class the SRD lacks, a monster from a manual you own: the master writes them into your campaign, and RPG Engine treats them as its own.

![Your character's sheet on the dashboard: hit points, armor class, experience, the spell slots and hit dice left, and the last rolls](https://raw.githubusercontent.com/stefanocaronia/rpg-engine/main/docs/screenshots/party.png)

## Coming later

- **Play as the master**, with the AI playing the party.
- **An authoring mode**: write an adventure with the AI, then export it and share it.
- **Several players on the same computer**, each with their own character, taking turns in the same chat.
- **Extensions**: settings, adventures, features such as the weather, house rules to share.
- **Other game systems**, and your own.

## What you need

**Node.js 22.4** or newer, a web browser, and an AI agent to be the master: an AI app that can work with the files on your computer, such as Claude Code or Codex. A plain chat such as claude.ai or ChatGPT, or a phone app, is not enough: the master needs to reach the campaign's files on your computer.

RPG Engine is tied to no AI company: any agent that supports MCP tools can be the master, local ones included. We play and test it with **Claude Code**; **Codex** is connected and checked, but no whole campaign has been played with it yet; [the guide](https://github.com/stefanocaronia/rpg-engine/blob/main/src/dashboard/guide/en.md#24-connect-your-ai) says how to connect any other agent. Give the master the largest model you have: a small one is easier to talk into revealing secrets or bending the rules.

RPG Engine is free: the master runs on your agent's own plan (for Claude Code, a paid Claude plan; for Codex, a ChatGPT account), or on your computer with a local model. RPG Engine itself never uses an API key, which is paid by the call: sign your agent in with your account, not with a key. You do not need to know how to program, and once your agent is installed, you are playing in a few minutes.

## Quick start

Open a terminal in the folder where you keep your games, and type:

```text
npm install -g rpg-engine
rpg init "The Salt Isles"
cd "The Salt Isles"
claude
```

With Codex write `codex`; with another agent, start it in that folder (the guide says how to connect it). When it asks whether you trust the folder, say yes; careful, in Claude Code the answer already selected is *No, exit*.

Then write *Hi! Let's start.* The master answers with the link to your dashboard: open it beside the chat. It asks how you want to play, a few questions at a time, then you make your character together, and the story begins.

**[The complete guide](https://github.com/stefanocaronia/rpg-engine/blob/main/src/dashboard/guide/en.md)** ([in Italian](https://github.com/stefanocaronia/rpg-engine/blob/main/src/dashboard/guide/it.md)) explains every step, and then how to play; the dashboard shows it in its Help.

## Try it, and tell us

RPG Engine is at its first versions, and it grows with the games played on it. Try it, and when something breaks, confuses you or could work better, open an [issue on GitHub](https://github.com/stefanocaronia/rpg-engine/issues): what you did, what you expected, what happened. Every report helps.

## How it works

RPG Engine is an MCP server and a command line, `rpg`, made from the same commands. `rpg init` writes into the campaign folder the few files that tell your AI app where RPG Engine is, and that keep the app's own memory off: the campaign lives in its files, and only there, so that going back to a save really goes back.

A campaign is a folder of markdown pages with `[[links]]`, the format of Obsidian, with its settings, its state, a log of every change and its saves. It holds the secrets of your story: you never need to open it.

RPG Engine stays in that folder: it reads and writes the game only there, and never touches your other files. Outside it, it keeps only a data folder of its own (the dashboard's translations, and Codex or Claude Code if you let it install them) and temporary folders while a picture is drawn. The master plays through RPG Engine's tools; anything else your agent wants to do on your computer, it asks you first.

For developers: [the architecture](https://github.com/stefanocaronia/rpg-engine/blob/main/docs/architecture.md), [the commands](https://github.com/stefanocaronia/rpg-engine/blob/main/docs/commands.md), [game systems](https://github.com/stefanocaronia/rpg-engine/blob/main/docs/game-systems.md), [extensions](https://github.com/stefanocaronia/rpg-engine/blob/main/docs/extensions.md) and [the guide for development agents](https://github.com/stefanocaronia/rpg-engine/blob/main/AGENTS.md).

## License

The code is under the [MIT](https://github.com/stefanocaronia/rpg-engine/blob/main/LICENSE) license.

The 5e system, in `systems/5e/`, is under the Creative Commons Attribution 4.0 International License ([its license](https://github.com/stefanocaronia/rpg-engine/blob/main/systems/5e/LICENSE.md)): This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode. Its creatures' icons are from game-icons.net, under the Creative Commons Attribution 3.0 Unported License, by the authors its license names. rpg-engine is compatible with fifth edition.

Our extensions are packages of their own, installed only when a campaign wants them: [weather](https://github.com/stefanocaronia/rpg-engine-weather) (`@rpgengine/weather`), Weather by the climate score, and [lockpicking](https://github.com/stefanocaronia/rpg-engine-lockpicking) (`@rpgengine/lockpicking`), Lockpicking by complexity, both by Stefano Caronia under CC BY 4.0, with their code under MIT; each repo has its license.

rpg-engine ships only original or open-licensed content: for fifth edition, the SRD 5.1 under CC BY 4.0. Anything else that appears in your game is written by your AI or by you, as pages of your campaign on your computer: it is not part of rpg-engine, and we do not distribute it.

The tests use a system based on Ironsworn, with the names of its mechanics and a foe of our own: This work is based on Ironsworn (https://www.ironswornrpg.com), created by Shawn Tomkin, and licensed for our use under the Creative Commons Attribution 4.0 International License (https://creativecommons.org/licenses/by/4.0/).

## Development notes

Developed with the help of AI coding agents. Everything is designed, reviewed and tested by the project's human maintainer.

**We encourage everyone to use AI for their own purposes.**  
The means of production should belong to the people.  
Fight corporate control of technology, not our right to use it.

---

© 2026 [Stefano Caronia](https://stefanocaronia.it) · [GitHub](https://github.com/stefanocaronia/rpg-engine) · [npm](https://www.npmjs.com/package/rpg-engine) · [♥ Support RPG Engine](https://www.paypal.com/paypalme/stefanocaronia)
