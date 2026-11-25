// A yes or no asked of the player in a window of their operating system (D-478): what a master that has only its own tools cannot answer, unlike the
// dashboard's page, whose click a local program can forge (D-477). Its title and text come in the environment, never inside the script. And a folder the
// player chooses in such a window.
export { dialogAnswer, type DialogCommand, dialogCommands, plainText, systemConfirm } from "./confirm.ts";
export { chooseFolder, type ChosenFolder, type DialogRunner, folderAnswer, folderCommands } from "./folder.ts";
