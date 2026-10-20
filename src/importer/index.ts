// The importer's folder (D-489): the player's document in pieces, how far the import is, and the adventure the helper writes. Depends on nothing else in
// rpg-engine.
export {
    doneImports,
    dropImport,
    finishAdventure,
    hasImport,
    importedPages,
    type ImportedText,
    importFile,
    importFolder,
    importsFolderName,
    type ImportStart,
    importStarts,
    type ImportState,
    openImport,
    openLicense,
    prepareImport,
    readImportState,
    writeImportState,
} from "./work.ts";
