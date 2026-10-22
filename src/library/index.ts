// The player's library (D-491): the books in the folders a campaign lists, their text indexed once in the player's local data folder, read apart one at a time, and
// the language each is in. Depends on nothing else in rpg-engine: what reads a document, and what a library leaves out, come from its caller.
export { type BookPart, type BookResume, type BookText, claimLibrary, foldersIn, isWithin, type LibraryBook, libraryReader, type LibraryScope, type LibraryState, libraryState, mostBooks, readLibrary, releaseLibrary } from "./books.ts";
export { dropUnlisted, libraryFolders, samePath, saveLibraryFolders } from "./folders.ts";
export { bookLanguage } from "./language.ts";
