// The dashboard's themes (D-527, D-528): a folder of data a game system names, or a package of its own installed on this computer, copied or linked for its
// author, read and checked here, its CSS of custom properties written here; and a new theme's template.
export { contrast } from "./contrast.ts";
export { themeCss } from "./css.ts";
export { type InstalledTheme, installedTheme, installedThemes, isThemeId, themeId } from "./installed.ts";
export { folderPrint, linkedThemeFolders, linkFileName } from "./linked.ts";
export { themeTemplate } from "./template.ts";
export { drawnOrnament, drawnTexture, readTheme, type Theme, themeFile, themeFileName, themeFilesNamed, themeIconNames, themeKeys, type ThemeReading } from "./theme.ts";
