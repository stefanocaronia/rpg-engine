# Extensions

An extension adds to a campaign what its game system lacks: rules as text, parts of the master's instructions, a calendar, and code, commands the master calls, work done as time passes and widgets on the dashboard. It is a package, an npm package for rpg-engine; a campaign plays one game system and any number of extensions. Our own are in [extensions/](../extensions/), such as [weather](../extensions/weather/), each published as a package of its own. The code that reads them is [src/extensions/](../src/extensions/); the commands use them through [commands/game-extensions.ts](../src/commands/game-extensions.ts), and the dashboard its widgets through [commands/game-widgets.ts](../src/commands/game-widgets.ts).

## 1. The package

```text
extensions/<name>/
  package.json       its npm name, version and code; "rpg-engine": {"kind": "extension", "api": 3}; the keyword rpg-engine-package;
                     bugs, or a repository on GitHub, for the dashboard's "Report a problem" link
  extension.yaml     what it is (section 2)
  instructions/*.md  what it adds to the master's instructions, as a system's parts
  words/<code>.yaml  its words in other languages, for the dashboard (section 4)
  images/            the pictures its widgets show
  src/, dist/        its code, written in TypeScript and built to dist/ (section 3)
  LICENSE.md, README.md
  test/              its tests, not shipped
```

Its name without the scope is the name its commands start with: `@rpgengine/weather` gives `weather` and `weather-set`. `api` is the version of the code's API (section 3) it is made for: 2 added the widgets, 3 the additions to the game system, the pages, the scene, writing its own fields and asking the player. rpg-engine reads a package made for its own or an older one, and refuses one made for a newer one before installing it.

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

What it adds to the game system, as `campaign.yaml` adds it (see [game-systems.md](game-systems.md#5-what-a-campaign-adds)): `fields`, `tables`, `computed`, `counters`, `recipes` and `values`.

```yaml
fields: {lock-dc: number, lock-state: text, lockpicking-rerolls: counter}
counters:
  lockpicking-rerolls: {max: "has(tool-proficiencies, thieves' tools) * proficiency", refill: short rest}
```

None may be a field the core's pages hold, as `role`, `status` or `contains`: such an extension is left out, and `validate` says so. The layers stack in order: the system, then the campaign's extensions in the order `campaign.yaml` lists them, then the campaign, the nearest winning. An entry of `fields`, `tables`, `computed` or `counters` takes the place of one of the same name below; a recipe adds to the one below; `values` adds names to the lists below. An extension's additions with which the system does not read are left out, and `validate` names the extension; the other layers stay.

Its widgets on the dashboard, and their icons:

```yaml
icons:
  rain: "M7 14.5h10a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 6.6 6.5a4 4 0 0 0 .4 8Z M8.5 17.5l-1 3"
widgets:
  now: {title: Weather, icon: rain, place: top}
  today: {title: Today's weather, icon: rain, place: page, page: scene, order: 0}
```

- An icon is the path of an SVG drawn on 24 by 24, which the dashboard strokes in its own colour; at most 40.
- A widget, at most 8, stands in one `place`: `top`, a chip in the dashboard's top, hidden on a phone; `side`, a card in the table's column, over the rolls; `page`, a card at the end of a `page`: `scene`, `sheet`, `world` or `journal`. `order` sorts the cards of a place, the lowest first. Its code's hook of the same name says what it shows (section 3).
- The campaign moves one or turns it off in `campaign.yaml`, which the dashboard's Settings writes through `config`: `widgets: {weather.today: side}`, with `top`, `side`, a page's name or `off`, or `{place, page, order}`; taken away, the extension's place holds again.

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

- A command is defined as the core's are, with the kit's zod; its `run` gives the text the master reads, and its description is at most 150 words. It appears on the command line and through MCP while the campaign uses the extension. A command that may ask the player with `game.ask` says `needsPlayer: true`: through MCP the host is told it waits for the player, so that it does not give up on it. Unlike the core's `ask`, it stays on the command line and where nothing shows buttons, where `ask` gives the question in words.
- `timePassed` runs after `advance` and `travel`, once for all the time they let pass, and as the game starts, with `from` and `to` the same; its lines end their output. An error there becomes a line that says the time did pass.
- `widgets` gives, by each widget's name in extension.yaml, a hook that says what it shows now, or `undefined` for nothing. It reads the game as `game` does, without `roll`, `ask`, `set`, `log` or writing its state, and runs as the dashboard reads the game, all the hooks together within two seconds; one still at work then shows nothing, and is not called again until it answers:

  ```ts
  widgets: {
      now: (game) => ({ icon: "rain", chip: { text: "{range}", values: { range: { from: 10, to: 15, unit: "°C" } } }, says: "scattered rain" }),
      today: (game) => ({ parts: [{ lead: "Scattered rain", icon: "rain", value: { from: 10, to: 15, unit: "°C" } }, { facts: ["Light fog this morning"] }] }),
  },
  ```

  In an ask's card, a `track` stands at the `stage`'s `start`, `center` or `end`; `look: steps` draws it as the steps of a progress; after its `value` come `held` (lit but not yet sure), `marked` (as a die that failed) and `coming` (those the roll may light); a `track` or a `lead` has a `tone`, good or bad. A chip shows `icon` and `chip`, and `says` in its tip; a card has the widget's title, `note` at the end of its head, and `parts`: `lead` (one thing large, with its icon and value), `text`, `facts`, `values` (each in a box under its label), `track` (pips or a bar), `rows`, `table`, `image` (a file of its `images/`, served at an address of the extension's own). Words are the extension's, in its language, translated by its words as a whole; numbers are values, never inside the words: `{text: "From {low} to {high}", values: {low: 10, high: 15}}`, a number, `{number, unit}` or `{from, to, unit}`, which the page writes in its language. The server checks what a hook gives against these parts, keeps it short (some 12,000 characters), and sends the page nothing else: never the extension's state. A hook that fails or gives what no part draws shows nothing, and the dashboard's `/api/widgets` says why.

  What a hook gives, the player sees: it is never a place for secrets. It runs in the process of the chat's server, as the commands do: a loop that never yields stops the dashboard and the master's tools with it.
- `game` is all the code reaches:
  - reading: `now` and `calendarDay`, `units`; `party()`, the first living player character's places, what their environment holds, and its living `members`, each `{name, pc}`; `page(name)`, by name or alias, secret pages too, with `value(field)` and `counter(field)` as `show` gives them, its effects and what the system works out included, `has(effect)` and `formula(text)`, a formula of the system worked out on it; `scene()`, the open scene's `title`, `opened`, and in a fight its `round` and `turn`. A widget reads all of these.
  - `roll(notation)` rolls with the engine's dice and logs nothing; `roll(notation, {who, why, check?, values?, says?})` is a roll in the log for `who`, in view for the party and behind the screen for anyone else as the `master-rolls` setting says, with `id` and `hidden`; with `values`, the faces of the player's physical dice, always in view.
  - `ask({who?, question, check, notation, decline?, says?})` asks the player for a roll of their character with the buttons of the core's `ask`, `decline` naming the button that turns it down: `{rolled: {id, total, faces, text}}`, logged as the player's; `{declined: true}`, when they change their mind; `{said}`, their own words; `{inWords, physical}`, the question to ask in the chat where nothing shows buttons: with `physical`, the player tells the faces, to roll with `values`; else, once they go ahead, roll it with `roll` and `who`.
  - `ask` takes too `roll`, the words of the roll's button; `decline: false`, for no button to turn down a forced roll; `rule`, a line under the buttons; `tones(faces)`, good or bad for each die, which the page colours; and `card: {widget, key}`, one of its widgets to ask in, the same `key` for each question of one attempt, as a reroll after the roll. The page shows the widget as its hook gives it when the question comes, before the dice, and once the command ends, after them, and animates the difference: write the state before asking. A button's words are a text, or `{label, note}` for a note under its name. Without the dashboard, with physical dice or in the host's form, the question is as without a card.
  - `question`, `roll`, `decline`, `rule` and what `says` gives are the extension's words, a text or `{text, values}`, translated by its words (section 4). `says(faces)` tells what the faces mean when their sum means nothing, as `4 pins, no 1`: the dashboard's rolls show it in place of the total.
  - `set(page, values, why)` writes numbers or text, a counter only numbers and keeping its maximum, only in the fields and counters its extension.yaml adds that neither the system, an extension listed before it nor the campaign declares, under the names it gives them, and none while its additions are left out; each field has its line in the log, which the player sees when the engine shows them that page. Any other field, or a name no page alone has, throws, and nothing is written.
  - its own `state`, kept in the campaign in `extensions/<name>/state.yaml`, and `log`. It writes no other page, field or file; once the call is stopped, as while `ask` waits, `set`, `state.write`, `log` and a roll with `who` throw.
- A game system's code is loaded the same way, from a `package.json` of kind `system`, with hooks of its own: see [game-systems.md](game-systems.md#6-code).

## 4. Words

`words/<code>.yaml` gives the extension's words in a language, the base one for a regional one (`pt` for `pt-BR`): its `title` and `about`, which the Packages page shows; `fields`, the names of the fields it adds to the game system, by their id, which the sheet, `show` and the dashboard write over the system's own, layered as the additions are; and `words`, each text its widgets write, from its own language to that one. A word the list lacks stays as written; one with a capital and without matches the same entry. A file that does not read leaves the words as written, and `validate` names it.

```yaml
title: il meteo secondo il punteggio del clima, di Stefano Caronia
about: il cielo cambia a ogni alba con un tiro…
words: {Weather: Meteo, scattered rain: pioggia sparsa, "From {low} to {high}": "Da {low} a {high}"}
fields: {lockpicking-rerolls: Ritiri di scasso}
```

## 5. Installing

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

## 6. Tests

An extension tests itself with the engine's test kit, `rpg-engine/testing`, never with the engine's own files: what it gives is part of the extension API.

```ts
import { testCampaign } from "rpg-engine/testing";

const campaign = await testCampaign({ system: "5e", extensions: [fileURLToPath(new URL("..", import.meta.url))], settings: { "calendar-start": "14 April" } });
campaign.dice(3, 2, 6);
expect(await campaign.ok("advance", "--to", "day 1, 18:00")).toContain("Weather:");
await campaign.close();
```

- `testCampaign({system, extensions, language?, play?, settings?})` makes a campaign in a temporary folder with `init`, its setup done unless `play: false`, the extensions linked from their folders as the player's own, so that their code runs, and `settings` written in `campaign.yaml` as by hand. The systems are those the engine ships, `5e` and `free`.
- `run(...args)` runs a command as the command line does, giving `{output, exitCode}`; `ok(...args)` one that must succeed, giving its output. `dice(...faces)` sets the faces the dice show in turn; else each shows 4. The time is a fixed day.
- `log()` gives the log's lines, `read(path)` a file of the campaign, `widgets()` the widgets as the dashboard shows them, `dashboard()` the campaign's dashboard on a port of this computer with a page open, its `player`, `get` and `post`. `context` is what the commands run with: give it a `page`, a fake player whose `choose` answers the questions, or a `signal`.
- `close()` takes the campaign away, the links first, never what they lead to.
- Its code runs from its built `dist/`, as installed: build it before its tests. In the engine's repository its source runs, and its tests run with the engine's.

In this repository `test/extensions.test.ts` checks the mechanism with test extensions in [test/extensions/](../test/extensions/), on Ironsworn; `test/packages.test.ts` the `package` command with npm faked. `npm run test:downstream` runs the tests of the extensions' own repositories beside this one, `../rpg-engine-weather` and `../rpg-engine-lockpicking`, against the engine built here, and skips those that are not there.
