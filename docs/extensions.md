# Extensions

An extension adds to a campaign what its game system lacks: rules as text, parts of the master's instructions, a calendar, and code, commands the master calls, work done as time passes and widgets on the dashboard. It is a package, an npm package for rpg-engine; a campaign plays one game system and any number of extensions. Ours live each in a repo of its own, [rpg-engine-weather](https://github.com/stefanocaronia/rpg-engine-weather) and [rpg-engine-lockpicking](https://github.com/stefanocaronia/rpg-engine-lockpicking), and are published to npm from there. The code that reads them is [src/extensions/](../src/extensions/); the commands use them, and the game system's code, through [commands/shared/packages/code.ts](../src/commands/shared/packages/code.ts), and the dashboard their widgets through [commands/shared/packages/widgets.ts](../src/commands/shared/packages/widgets.ts). An extension's code and a game system's have one contract, [core/package-api.ts](../src/core/package-api.ts) (section 3).

## 1. The package

```text
rpg-engine-<name>/
  package.json       its npm name, version and code; "rpg-engine": {"kind": "extension", "api": 6, "page": "dist/page.js"}; the keyword rpg-engine-package;
                     bugs, or a repository on GitHub, for the dashboard's "Report a problem" link
  extension.yaml     what it is (section 2)
  instructions/*.md  what it adds to the master's instructions, as a system's parts
  words/<code>.yaml  its words in other languages, for the dashboard (section 4)
  images/            the pictures its widgets show
  src/, dist/        its code, written in TypeScript and built to dist/ (section 3)
  LICENSE.md, README.md
  test/              its tests, not shipped
```

Its name without the scope is the name its commands start with: `@rpgengine/weather` gives `weather` and `weather-set`. `api` is the version of the package API it is made for, one number for every kind of package: the contract of its code (section 3) and what its `extension.yaml` or `system.yaml` may declare. It goes up with every addition a package may use, and the engine reads a range: an extension made for the API 1 to its own, a game system made for 5 to its own. 2 added the widgets, 3 the additions to the game system, the pages, the scene, writing its own fields and asking the player, 4 its code in the dashboard's page, 5 one contract for extensions and game systems, 6 a game system's `sheet-knowledge`. A package made for a newer API is refused, before installing it, saying that rpg-engine must be updated first; one made for an API the engine no longer reads, saying to install a newer version of it.

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

What it adds to the game system, as `campaign.yaml` adds it (see [game-systems.md](game-systems.md#5-what-a-campaign-adds)): `fields`, `tables`, `computed`, `counters`, `recipes`, `values` and `condition-icons`, the drawings of effects by their names.

```yaml
fields: {lock-dc: number, lock-state: text, lockpicking-rerolls: counter}
counters:
  lockpicking-rerolls: {max: "has(tool-proficiencies, thieves' tools) * proficiency", refill: short rest}
```

None may be a field the core's pages hold, as `role`, `status` or `contains`: such an extension is left out, and `validate` says so. The layers stack in order: the system, then the campaign's extensions in the order `campaign.yaml` lists them, then the campaign, the nearest winning. An entry of `fields`, `tables`, `computed`, `counters` or `condition-icons` takes the place of one of the same name below; a recipe adds to the one below; `values` adds names to the lists below. An extension's additions with which the system does not read are left out, and `validate` names the extension; the other layers stay.

Its widgets on the dashboard, and their icons:

```yaml
icons:
  rain: "M7 14.5h10a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 6.6 6.5a4 4 0 0 0 .4 8Z M8.5 17.5l-1 3"
widgets:
  now: {title: Weather, icon: rain, place: top}
  today: {title: Today's weather, icon: rain, place: page, page: scene, order: 0}
```

- An icon is the path of an SVG drawn on 24 by 24, which the dashboard strokes in its own colour; at most 40.
- A widget, at most 8, stands in one `place`: `top`, a chip in the dashboard's top, hidden on a phone; `side`, a card in the table's column, over the rolls; `page`, a card at the end of a `page`: `scene`, `sheet`, `world` or `journal`; `person`, on each of the party, as a game system's down point (below); `card`, only in the card of a question its code asks in, as the 5e's death save. `order` sorts the cards of a place, the lowest first. Its code's hook of the same name says what it shows (section 3).
- The campaign moves one or turns it off in `campaign.yaml`, which the dashboard's Settings writes through `config`: `widgets: {weather.today: side}`, with `top`, `side`, a page's name or `off`, or `{place, page, order}`; taken away, the extension's place holds again. A widget made for `person` stays there or `off`, one made for `card` has no place to choose, and Settings lists neither; another may be put on `person` too, its hook then given `{who}`.

## 3. Code

`main` in package.json is a module whose default export takes the kit and gives an object: the commands, what happens when time passes, the widgets' hooks and the hooks after the engine's writes, each optional. Every package has this one contract, a game system's code too ([game-systems.md](game-systems.md#6-code)); every field of what it gets and gives is in the types, which come from rpg-engine:

```ts
import type { PackageEntry } from "rpg-engine";

const weather: PackageEntry = ({ z }) => ({
    commands: [{ name: "weather", description: "…", input: z.object({}), readOnly: true, run: (input, game) => "…" }],
    timePassed: ({ from, to }, game) => ["Weather this morning: …"],
});
export default weather;
```

- A command is defined as the core's are, with the kit's zod; its `run` gives the text the master reads, and its description is at most 150 words. It appears on the command line and through MCP while the campaign uses the extension. A command that may ask the player with `game.ask` says `needsPlayer: true`: through MCP the host is told it waits for the player, so that it does not give up on it. Unlike the core's `ask`, it stays on the command line and where nothing shows buttons, where `ask` gives the question in words.
- `timePassed` runs after `advance` and `travel`, once for all the time they let pass, and as the game starts, with `from` and `to` the same; its lines end their output. An error there becomes a line that says the time did pass.
- `widgets` gives, by each widget's name in extension.yaml, a hook that says what it shows now, or `undefined` for nothing. It reads the game as `game` does, without `roll`, `ask`, `set`, the effects, `log` or writing its state, and runs as the dashboard reads the game, all the hooks together within two seconds; one still at work then shows nothing, and is not called again until it answers:

  ```ts
  widgets: {
      now: (game) => ({ icon: "rain", chip: { text: "{range}", values: { range: { from: 10, to: 15, unit: "°C" } } }, says: "scattered rain" }),
      today: (game) => ({ parts: [{ lead: "Scattered rain", icon: "rain", value: { from: 10, to: 15, unit: "°C" } }, { text: { text: "Rain for {hours} hours", values: { hours: 3 } } }] }),
  },
  ```

  A hook is given `{key}`, the attempt, and `{who}`, whose roll it is, when it is read as the card of a question, and `{who}`, the character shown, when a card or a page of the package's page code names the widget (below).

  A widget in `person` is read for each of the party, with `{who}`, and shows on those it gives something for. One made for `person` that gives a `chip`, only while they are down, says their state: the chip is its word, on their token's mark, in the turns and in the party's strip, its `icon` the mark's drawing and its `lead`'s `tone` their tint, good or bad; its counts and its lead are a panel under their name, in the card at hand and, in one line, in the turns; `dead: true` draws them as the dead, greyed with the skull, while the page is not marked dead yet. Any other is a small card of its package among the boxes of values under their name and in the card at hand: each `track`, `lead` and value a box, as the system's counters are. A `track` with `field` names the counter it counts, which leaves the line of values while it shows. One the campaign moved there is always a small card, its chip left aside. Where no widget gives a word, the dashboard says down.

  In an ask's card, a `track` stands at the `stage`'s `start`, `center` or `end`; `look: steps` draws it as the steps of a progress; after its `value` come `held` (lit but not yet sure), `marked` (as a die that failed) and `coming` (those the roll may light); a `track` or a `lead` has a `tone`, good or bad. A chip shows `icon` and `chip`, and `says` in its tip; a card has the widget's title, `note` at the end of its head, and `parts`: `lead` (one thing large, with its icon and value), `text`, `facts`, `values` (each in a box under its label), `track` (pips or a bar), `rows`, `table`, `image` (a file of its `images/`, served at an address of the extension's own). Words are the extension's, in its language, translated by its words as a whole; numbers are values, never inside the words: `{text: "From {low} to {high}", values: {low: 10, high: 15}}`, a number, `{number, unit}` or `{from, to, unit}`, which the page writes in its language. The server checks what a hook gives against these parts, keeps it short (some 12,000 characters), and sends the page nothing else: never the extension's state. A hook that fails or gives what no part draws shows nothing, and the dashboard's `/api/widgets` says why.

  What a hook gives, the player sees: it is never a place for secrets. It runs in the process of the chat's server, as the commands do: a loop that never yields stops the dashboard and the master's tools with it.
- `game` is all the code reaches:
  - reading: `now` and `calendarDay`, `units`, `setting(name)`, and `sameName(one, other)`, names compared as the engine does, a word of the system's in the campaign's language the same as its English, `Prono` as `Prone`; `party()`, the first living player character's places, what their environment holds, and its living `members`, each `{name, pc}`; `page(name)`, by name or alias, secret pages too, with `value(field)` and `counter(field)`, `{value, max}`, as `show` gives them, its effects and what the system works out included, `has(effect)` and `formula(text)`, a formula of the system worked out on it; `scene()`, the open scene's `title`, `opened`, and in a fight its `round` and `turn`. A widget reads all of these.
  - `roll(notation)` rolls with the engine's dice and logs nothing; `roll(notation, {who, why, check?, values?, says?})` is a roll in the log for `who`, in view for the party and behind the screen for anyone else as the `master-rolls` setting says, with `id` and `hidden`; with `values`, the faces of the player's physical dice, always in view. A roll gives its `notation`, `total`, `faces`, each die as thrown in `dice`, and its `text`.
  - `ask({who?, question, check, notation, decline?, says?})` asks the player for a roll of their character with the buttons of the core's `ask`, `decline` naming the button that turns it down: `{rolled: {id, total, faces, text}}`, logged as the player's; `{declined: true}`, when they change their mind; `{said}`, their own words; `{inWords, physical}`, the question to ask in the chat where nothing shows buttons: with `physical`, the player tells the faces, to roll with `values`; else, once they go ahead, roll it with `roll` and `who`.
  - `ask` takes too `roll`, the words of the roll's button; `decline: false`, for no button to turn down a forced roll; `rule`, a line under the buttons; `tones(faces)`, good or bad for each die, which the page colours; and `card: {widget, key}`, one of its widgets to ask in, the same `key` for each question of one attempt, as a reroll after the roll. The page shows the widget as its hook gives it when the question comes, before the dice, and once the command ends, after them, and animates the difference: write the state before asking. The card has the question's own frame; a hook that gives `tint`, `low`, `ally`, `gold` or `muted`, the dashboard's tokens, frames it in that colour of the moment instead, without the robot, as the 5e's death save is red while dying and gold back on its feet. A button's words are a text, or `{label, note}` for a note under its name. Without the dashboard, with physical dice or in the host's form, the question is as without a card.
  - `question`, `roll`, `decline`, `rule` and what `says` gives are the extension's words, a text or `{text, values}`, translated by its words (section 4). `says(faces)` tells what the faces mean when their sum means nothing, as `4 pins, no 1`: the dashboard's rolls show it in place of the total.
  - `set(page, values, why)` writes any field of any page, numbers or text, as `write --set` does, with its checks, under the name the game system with its additions gives it: what `write` refuses throws, and nothing is written, as a counter that already has a value, or a name no page alone has. Its log is `write`'s, nothing for a value that stays.
  - `change(page, field, {by | to | spend}, why)` changes a counter or money as the `change` command does, within its limits, and gives its text: the way for a counter the rules watch, as hit points. From a command it calls the hooks after the engine's writes; from inside a hook, none. `addEffect(page, name, why)` and `endEffect(page, name, why)` add an effect without end and end one, each with its line in the log; like `has`, they find it under the system's word for it in the campaign's language too.
  - its own `state`, kept in the campaign in `extensions/<name>/state.yaml`, and `log`. It writes no other file. Once the call is stopped, as while `ask` waits, `set`, `addEffect`, `endEffect`, `state.write`, `log` and a roll with `who` throw.
- `counterChanged`, `turnStarted`, `rolled`, `effectAdded` and `asking` are the hooks after the engine's own writes, the same for every package ([game-systems.md](game-systems.md#6-code)): the game system's first, then the extensions' in the order `campaign.yaml` lists them; for `asking`, the first that words the roll. `counterChanged` gets `{page, field, before, after, max, lost}`, `rolled` `{who, notation, total, faces, dice, text, id}`, `asking` `{who, checks, notations, recipe}`, the recipe for the dice of a rest. A hook gives its lines at once: a promise is a line that says so, and `game.ask` throws there. A package's lines are cut at five, 600 characters in all. The system's lines may take the place of the engine's own note, as a death save does; the extensions' come after it. They are called at once: an extension's code is loaded as the command line, the MCP server or the dashboard starts, and as its commands are read. One that fails says so in a line, and the command's change stands.
- An extension may not have the name of the game system the campaign plays, as their state, widgets and pictures go by it: it is refused as it is added, and `validate` says so.

### Code in the dashboard's page

A package, an extension or a game system, may draw in the dashboard's page with code of its own, in the dashboard's style.

- `page` in its `package.json`'s `"rpg-engine"` names its page module, an ES module built as its code is. The dashboard serves that module's folder at `/pkg/<package>/<version>/` (scripts, style sheets, SVG), only for the campaign's system and extensions whose code runs, and lists them at `/api/modules`. The module imports `preact` and `rpg-engine/page`, the dashboard's kit, from the page itself: one Preact, the dashboard's.
- A game system's page module may also give `pageStyle`, a style sheet over the whole page, without a layer: it wins over the dashboard's rules whatever their selectors, never over its focus ring, its tooltips and the guarantees, and shows while the player keeps the game's style on. One that declares a layer of its own, `@layer` in any spelling, is left out. The dashboard's classes are not a contract: a change of the page may break it. An extension's is never read. The theme, data alone, comes first ([game-systems.md](game-systems.md#theme)).
- Its default export gives, by name, the components of its `figures` and its `bodies`, and its own `style`, a style sheet each of its drawings takes after the dashboard's, for the layout and motion of its own parts: the dashboard's is in cascade layers, so this one wins over it whatever the selectors, but not over its focus ring and tooltips. `extension.yaml`, or a system's `system.yaml`, declares each figure's room, `figures: {tumblers: {width: 360, height: 105, mirror: true}}`, which the page keeps while the module comes; `mirror` turns one without words right to left.
- A widget's hook gives the page code what only it draws as `data`, JSON kept short, which goes to the page alone and never to the master. A `track` or a `lead` names the `figure` that draws it, its label and count, or its words and value, staying the dashboard's under it; a chip draws the figure of its widget's lead in place of its icon; `body` names the figure that draws the whole inside of its card of a roll, its outcome for a screen reader too, in a `role="status"` of its own, the dashboard keeping the question and the field for the player's own words; `{who, does}` is who acts, as "Ettore picks", whose portrait the dashboard finds. A figure a widget names must be declared.
- `rpg-engine/page` gives the props a figure's component gets (its `data`, before the dice in a roll's card, the part it draws, its place and room, `words`, `number`, `field`, a field of the system's sheet as the dashboard names it, `language`, `dir`, `theme`, `reducedMotion`); a body gets too the question's buttons, `rolled`, the last roll made from the card, and `rest`, the dice of a rest it asks, its buttons then a die of each counter and last the one that ends it; and `run(command, input)`, which runs, as the player, a command of the package marked `player: true`, an extension's or the game system's, through `POST /api/run`; the master hears it at their next call, quoted as the package's words, unless it is `readOnly`. A card or a page names one of its package's widgets as `widget`, and gets its hook's `data` for the character it shows, read again each time the game changes. The master's tools stay as they are.
- Its `cards` are cards at the end of the dashboard's pages, each with its `page` (`scene`, `sheet`, `world` or `journal`), `title`, `icon` and `order`; its `pages` are pages of its own at `#/pkg/<package>/<name>`, each with its `title` and `icon`, and `nav: "tab"` for a page central to the game, as a system's spells, a tab beside Party, Scene, Journal and World; any other is in the menu of the packages' icon at the top, as one that says nothing.
- What breaks shows its error and whose it is, in the card: no drawing stands in for it.

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

- A name alone is one of ours, under `@rpgengine/`, installed from npm: those are verified. A game system of ours is named by its name alone too, `5e` for `@rpgengine/system-5e`. Another's is named with its scope, or as `npm:name` without one; a folder or a `.tgz` file of this computer is never verified.
- By its name alone, a package installs as the newest version this engine reads; when its latest needs a newer engine, `available` and the catalog say which, by the `rpg-engine.api` of the engine's own `package.json` on npm.
- When npm's registry does not answer, the package is described and installed from npm's cache on this computer (`--offline`); without a copy there, the message gives the two ways: online once, or a `.tgz` or a folder.
- A package not ours is installed only with the player's own yes, where the master cannot give it with its own tools: the host's form, else a window of the player's operating system (PowerShell, osascript, zenity or kdialog), else not at all; never the dashboard's page, nor the master's word. It does not hold against a program with the player's shell: the host's own permission for each command does, unless it is opened without permissions. A file or a folder is copied at the yes, and its copy runs.
- The same command installs the other kinds, told by what the package holds: a game system (`"kind": "system"` and a `system.yaml`), on this computer for a new campaign, the campaign keeping its own, named by its package without its scope and its `system-`; a language (`"kind": "language"`, a `language.yaml` with its `code` and `name`, a `phrases.json` from each English phrase of the dashboard to its own, and maybe a `guide.md` and `systems/<name>/words/<code>.yaml`), texts only and no yes asked, one per language, its phrases coming before the dashboard's and the translation on the fly, refused when a phrase loses a `{name}` or turns the order of a text; an adventure, as a `.zip`, a folder or a link with `adventure.yaml`.
- The dashboard's Packages page adds by one field (a link, an npm name or a folder) or a file, and lists what npm has for every kind and the GitHub repositories with the topic `rpg-engine-adventure`. A package not ours that the page adds asks the player's yes in a window of their computer only.
- The code of a package not ours, on the computer and in the page, runs after the player's yes, which says in plain words what it can do there: see the whole campaign, its secrets included, press buttons and speak to the master for the player. The yes holds on this computer for that package, its version and the fingerprint of its files and of its dependencies' as npm resolved them: another version, or a file changed since, a dependency's too, asks again; `uninstall` takes it away. The code of a folder or a `.tgz` the player installed runs once copied. From the page, the player updates or takes away only the packages on this computer, a no in a window holds until the game's server starts again, and the window says the request comes from the dashboard. A `.tgz`, as `npm pack` makes it, is unpacked into rpg-engine's folder and installed from there, so the file can then be moved; `uninstall` takes the unpacked copy away too. A copy from a folder or a file takes the place of npm's on the whole computer, and the player is told so before saying yes; asking for the package by its name brings npm's back. Its parts come under a title of their own and never take the place of the core's or the system's.

## 6. Tests

An extension or a game system tests itself with the engine's test kit, `rpg-engine/testing`, never with the engine's own files: what it gives is part of the package API.

```ts
import { testCampaign } from "rpg-engine/testing";

const campaign = await testCampaign({ system: "5e", extensions: [fileURLToPath(new URL("..", import.meta.url))], settings: { "calendar-start": "14 April" } });
campaign.dice(3, 2, 6);
expect(await campaign.ok("advance", "--to", "day 1, 18:00")).toContain("Weather:");
await campaign.close();
```

- `testCampaign({system, systems?, extensions, language?, play?, settings?})` makes a campaign in a temporary folder with `init`, its setup done unless `play: false`, the extensions linked from their folders as the player's own, so that their code runs, and `settings` written in `campaign.yaml` as by hand, such as `{ruleset: "srd-5.1"}`. The systems are those of the folders in `systems`, then those the package's repository installs in its `node_modules`, then the engine's, `free` alone; the first by a name wins. A system's own repository gives `systems: ["."]`; an extension for the 5e has `@rpgengine/system-5e` among its devDependencies, or gives its folder. A system's folder takes its name from its package, `@rpgengine/system-5e` is `5e`, or from the folder when it has no `package.json`.
- `run(...args)` runs a command as the command line does, giving `{output, exitCode}`; `ok(...args)` one that must succeed, giving its output. `dice(...faces)` sets the faces the dice show in turn; else each shows 4. The time is a fixed day.
- `ask({question, options?, who?, square?, recipe?})` asks the player with the core's `ask`, as through MCP, since the command line asks in words; give `context` a `page` or a `player` to answer, and it gives `{output, exitCode}`.
- `descriptions()` gives each of the core's tools as a host reads it in the campaign, its description then its parameters', with the examples in the names of its game system.
- `systemChecks(folder)`, beside `testCampaign`, checks a game system's folder as the engine checks every system it tests (see game-systems.md, section 7): it gives its `name`, how many `pages` and `chapters` it has, its `attribution`, and lists of what is wrong, each empty when it passes: `unread`, `names`, `unquoted`, `bases`, `declarations`, `rules`, `values`, `undeclared`, `pictures`, and `theme`, what keeps its theme of the dashboard from being used.
- `log()` gives the log's lines, `read(path)` a file of the campaign, `widgets()` the extensions' widgets as the dashboard shows them, each with its `problem` when it shows nothing, `widgets(name)` those of one package, the game system's too, `dashboard()` the campaign's dashboard on a port of this computer with a page open, its `player`, `get` and `post`. `context` is what the commands run with: give it a `page`, a fake player whose `choose` answers the questions, or a `signal`.
- `close()` takes the campaign away, the links first, never what they lead to.
- Its code runs from its built `dist/`, as installed: build it before its tests. In the engine's repository its source runs, and its tests run with the engine's.

In this repository `test/extensions.test.ts` checks the mechanism with test extensions in [test/extensions/](../test/extensions/), on the fake system and on free; `test/packages.test.ts` the `package` command with npm faked. `npm run test:downstream` runs the tests of our packages' own repositories beside this one, `../rpg-engine-5e`, `../rpg-engine-ironsworn`, `../rpg-engine-weather` and `../rpg-engine-lockpicking`, against the engine built here, the 5e's repository installed beside the engine in the others, and skips those that are not there.
