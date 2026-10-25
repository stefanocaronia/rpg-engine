export { getVersion } from "./core/version.ts";
// What an extension's code is given and gives back (D-436): extensions import these types from rpg-engine.
export type { SaveAsked } from "./core/context.ts";
export type {
    Asked,
    AskedRoll,
    ButtonWords,
    CalendarDay,
    DieTone,
    ExtensionCode,
    ExtensionCommand,
    ExtensionEntry,
    ExtensionKit,
    Game,
    GameMoment,
    GamePage,
    GameView,
    Rolled,
    RollFor,
    TimePassage,
    Track,
    Widget,
    WidgetPart,
    WidgetText,
    WidgetValue,
} from "./extensions/index.ts";
export type { CounterChange, RollMade, SystemEntry, SystemGame, SystemHooks, SystemPage, SystemReader } from "./systems/index.ts";
