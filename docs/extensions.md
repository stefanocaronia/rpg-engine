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

## 4. Installing

`package install <name>` installs a package with npm, without running its scripts, in rpg-engine's own folder of this computer, checks it, and adds it to the campaign's `campaign.yaml` with its version; `package remove` takes it out of the campaign; `package list` says what is installed, used, and published on npm for this API.

- A name alone is one of ours, under `@rpgengine/`, installed from npm: those are verified. Another's is named with its scope, or as `npm:name` without one; a folder of this computer is never verified.
- A package not ours is installed only with the player's own yes: a button on their dashboard or in the host's form, or `--accept-risk` typed in their terminal; never the master's word.
- For now a package not ours brings its texts and data, never its code, which does not run; the code of a folder the player installed does. Its parts come under a title of their own and never take the place of the core's or the system's.

## 5. Checks

`test/extensions.test.ts` checks the mechanism with test extensions in [test/extensions/](../test/extensions/), on Ironsworn; `test/packages.test.ts` the `package` command with npm faked. An extension keeps its own tests in its `test/`, run with the others.
