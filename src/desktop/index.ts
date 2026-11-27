// The player's desktop: the engine's pages opened in application windows of their own, sized and placed for their kind, and RPG Engine's icon on the
// desktop and in the system's menu, which opens the launcher with a double click; on Windows, macOS and Linux.
export { appBrowser, type BrowserOpened, type BrowserOpening, type BrowserSystem, openedAddress, openInBrowser, openWindow, realSystem } from "./browser.ts";
export { type IconCommand, iconCommand, type IconPlaces, iconSettled, iconToRemake, makeIcons, noteIconMade, noteIconSettled, removeIcons } from "./icon/index.ts";
export {
    oneWindowAtATime,
    pageTitle,
    type PlaceCommand,
    placeCommand,
    readPlaced,
    type ScreenRoom,
    type WindowKind,
    type WindowOpener,
    type WindowPlace,
    windowPlace,
    type WindowSize,
    windowSizes,
    type WindowTitles,
    windowTitles,
} from "./window/index.ts";
