// Adventures as packages of content (D-372, D-483): their manifest, a .zip or a folder read and checked whole (ADV-1), where their files go (ADV-3), and the
// .zip an export writes (ADV-7).
export { type AdventureManifest, manifestFileName, manifestLine, readManifest, writeManifest } from "./manifest.ts";
export { adventureFolderName, adventureTarget } from "./placement.ts";
export { type AdventureFiles, isAdventureFolder, largestAdventure, packAdventure, readAdventureFolder, readAdventureZip } from "./source.ts";
