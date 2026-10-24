// The extensions installed beside the engine (D-427, D-428): which they are, what each declares, and the API their code is given. Depends on nothing else in rpg-engine.
export type { CalendarDay, ExtensionCode, ExtensionCommand, ExtensionEntry, ExtensionKit, Game, GameMoment, GameView, TimePassage, Widget, WidgetPart, WidgetText, WidgetValue } from "./api.ts";
export { type DeclaredWidget, type Extension, extensionApi, extensionFileName, findExtension, installedExtensions, readExtension, shortName, type WidgetPage, widgetPages, type WidgetPlace, widgetPlaces } from "./extension.ts";
export { isLocalSpec, isVerified, npmPackages, packageKeyword, verifiedScope } from "./packages.ts";
export { isTarball } from "./tarball.ts";
export { type ExtensionWords, extensionWords, wordIn } from "./words.ts";
