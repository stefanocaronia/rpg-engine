// The player's documents as text and pictures, for the importer to read (D-489 (2), (8)): a PDF by its pages, Word, OpenDocument, EPUB, HTML, RTF, text and
// markdown by parts of about a page, a folder by its files. Depends on nothing else in rpg-engine.
export { documentAt, documentKinds, type DocumentPart, type DocumentPicture, type DocumentText, readDocument } from "./read.ts";
