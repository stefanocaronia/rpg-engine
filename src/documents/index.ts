// The player's documents as text and pictures, for the importer and the library to read (D-489 (2), (8), D-491): a PDF by its pages, read by the system's
// OCR where they have no readable text, Word, OpenDocument, EPUB, HTML, RTF, text and markdown by parts of about a page, a folder by its files; a locked one
// refused. Depends on nothing else in rpg-engine.
export { type PageReader, pagesWritten, systemPageReader } from "./ocr.ts";
export { documentAt, documentKinds, type DocumentPart, type DocumentPicture, type DocumentText, isReadable, readDocument, type ReadOptions } from "./read.ts";
