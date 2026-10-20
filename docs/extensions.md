# Extensions

An extension adds to a campaign what its game system lacks: rules as text, parts of the master's instructions, a calendar, and code, commands the master calls and work done as time passes. It is a package, an npm package for rpg-engine; a campaign plays one game system and any number of extensions. Our own are in [extensions/](../extensions/), such as [weather](../extensions/weather/), each published as a package of its own. The code that reads them is [src/extensions/](../src/extensions/); the commands use them through [commands/game-extensions.ts](../src/commands/game-extensions.ts).

## 1. The package

```text
extensions/<name>/
  package.json       its npm name, version and code; "rpg-engine": {"kind": "extension", "api": 1}; the keyword rpg-engine-package
  extension.yaml     what it is (section 2)
  instructions/*.md  what it adds to the master's instructions, as a system's parts
  src/, dist/        its code, written in TypeScript and built to dist/ (section 3)
  LICENSE.md, README.md
  test/              its tests, not shipped
```

Its name without the scope is the name its commands start with: `@rpgengine/weather` gives `weather` and `weather-set`. `api` is the version of the code's API (section 3) it is made for: rpg-engine refuses a package made for another.

## 2. extension.yaml

```yaml
title: the weather by the climate score, by Stefano Caronia
about: the sky changes each dawn by a roll, with the seasons, hot deserts, polar cold and fog
language: en
attribution: Weather by the climate score, by Stefano Caronia, under CC BY 4.0.
needs: {system: 5e}
calendar:
  months:
    - {name: Thaw, days: 90, season: spring}
```

`about` is the line `status` gives the master. `needs` names the game system it is made for, when it is made for one. `calendar` gives its months in place of the core's real ones; the campaign's own `calendar` takes theirs. An unknown key is refused by name.

## 3. Code

`main` in package.json is a module whose default export takes the kit and gives the commands and what happens when time passes. The types come from rpg-engine:

```ts
import type { ExtensionEntry } from "rpg-engine";

const weather: ExtensionEntry = ({ z }) => ({
    commands: [{ name: "weather", description: "…", input: z.object({}), readOnly: true, run: (input, game) => "…" }],
    timePassed: ({ from, to }, game) => ["Weather this morning: …"],
});
export default weather;
```

- A command is defined as the core's are, with the kit's zod; its `run` gives the text the master reads, and its description is at most 150 words. It appears on the command line and through MCP while the campaign uses the extension.
- `timePassed` runs after `advance` and `travel`, once for all the time they let pass, and as the game starts, with `from` and `to` the same; its lines end their output. An error there becomes a line that says the time did pass.
- `game` is all the code reaches: `roll` with the engine's dice, `now` and `calendarDay`, `units`, `party` (the player character's places and what their environment holds), its own `state`, kept in the campaign in `extensions/<name>/state.yaml`, and `log`. It writes no page and no other file.
- A game system's code is loaded the same way, from a `package.json` of kind `system`, with hooks of its own: see [game-systems.md](game-systems.md#6-code).

## 4. Installing

The `package` command, which the dashboard will call too:

| Action | What it does |
|---|---|
| `list` | the packages on this computer and those the campaign uses, at once, without npm |
| `available` | those npm has for this API, ours first, with author and description, and the updates of those installed |
| `install <name>` | installs or updates one with npm, without running its scripts, in rpg-engine's own folder of this computer; checks it, and adds it to `campaign.yaml` with its version |
| `remove <name>` | takes it out of the campaign; it stays on this computer for other campaigns |
| `uninstall <name>` | takes it off this computer, and out of this campaign |

With `--json`, each gives its result as data.

- A name alone is one of ours, under `@rpgengine/`, installed from npm: those are verified. Another's is named with its scope, or as `npm:name` without one; a folder or a `.tgz` file of this computer is never verified.
- A package not ours is installed only with the player's own yes, where the master cannot give it with its own tools: the host's form, else a window of the player's operating system (PowerShell, osascript, zenity or kdialog), else not at all; never the dashboard's page, nor the master's word. It does not hold against a program with the player's shell: the host's own permission for each command does, unless it is opened without permissions. A file or a folder is copied at the yes, and its copy runs.
- The same command installs the other kinds, told by what the package holds: a game system (`"kind": "system"` and a `system.yaml`), on this computer for a new campaign, the campaign keeping its own, named by its package without its scope and its `system-`; a language (`"kind": "language"`, a `language.yaml` with its `code` and `name`, a `phrases.json` from each English phrase of the dashboard to its own, and maybe a `guide.md` and `systems/<name>/words/<code>.yaml`), texts only and no yes asked, one per language, its phrases coming before the dashboard's and the translation on the fly, refused when a phrase loses a `{name}` or turns the order of a text; an adventure, as a `.zip`, a folder or a link with `adventure.yaml`.
- The dashboard's Packages page adds by one field (a link, an npm name or a folder) or a file, and lists what npm has for every kind and the GitHub repositories with the topic `rpg-engine-adventure`. A package not ours that the page adds asks the player's yes in a window of their computer only.
- For now a package not ours brings its texts and data, never its code, which does not run; the code of a folder or a `.tgz` the player installed does. A `.tgz`, as `npm pack` makes it, is unpacked into rpg-engine's folder and installed from there, so the file can then be moved; `uninstall` takes the unpacked copy away too. A copy from a folder or a file takes the place of npm's on the whole computer, and the player is told so before saying yes; asking for the package by its name brings npm's back. Its parts come under a title of their own and never take the place of the core's or the system's.

## 5. Checks

`test/extensions.test.ts` checks the mechanism with test extensions in [test/extensions/](../test/extensions/), on Ironsworn; `test/packages.test.ts` the `package` command with npm faked. An extension keeps its own tests in its `test/`, run with the others.
