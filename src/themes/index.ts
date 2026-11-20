// The dashboard's themes (D-527, D-528): a folder of data a game system names, or a package of its own installed on this computer, read and checked here,
// its CSS of custom properties written here.
export { contrast } from "./contrast.ts";
export { themeCss } from "./css.ts";
export { type InstalledTheme, installedThemes, isThemeId, themeId } from "./installed.ts";
export { drawnOrnament, drawnTexture, readTheme, type Theme, themeFile, themeFileName, themeFilesNamed, themeIconNames, type ThemeReading } from "./theme.ts";
