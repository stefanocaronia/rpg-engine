// The extensions installed beside the engine (D-427, D-428): which they are, what each declares, and the API their code is given. Depends on nothing else in rpg-engine.
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
} from "./api.ts";
export {
    type DeclaredWidget,
    type Extension,
    extensionApi,
    extensionFileName,
    findExtension,
    installedExtensions,
    readExtension,
    readsApi,
    shortName,
    systemAdditionNames,
    type SystemAdditions,
    type WidgetPage,
    widgetPages,
    type WidgetPlace,
    widgetPlaces,
} from "./extension.ts";
export { isLocalSpec, issuesPage, isVerified, npmPackages, packageKeyword, verifiedScope } from "./packages.ts";
export { isTarball } from "./tarball.ts";
export { type ExtensionWords, extensionWords, wordIn } from "./words.ts";
