import { basename } from "node:path";
import { type Document, isMap, parseDocument } from "yaml";
import { files } from "./store.ts";

/**
 * A YAML file of keys and values, read as the disk has it now so that writing it back keeps its comments and loses no change (D-193). `holds` says what it
 * must hold, for the error message: settings, such as "name: ...".
 */
export function readYamlFile(path: string, holds: string): Document
{
    return documentOf(path, files().fresh(path) ?? missing(path), holds);
}

/** The keys and values of a YAML file, as plain data, read once by the store of the call; an empty file gives an empty object. */
export function readYamlValues(path: string, holds: string): unknown
{
    return files().read(path, `yaml ${holds}`, (text) => documentOf(path, text, holds).toJS() ?? {}) ?? missing(path);
}

/** Writes a YAML file read with readYamlFile; long values stay on one line. */
export function writeYamlFile(path: string, document: Document): void
{
    files().write(path, document.toString({ lineWidth: 0 }));
}

/** The text of a YAML file as a document, refused with the file's name when it is not valid YAML or does not hold keys and values. */
function documentOf(path: string, text: string, holds: string): Document
{
    const document = parseDocument(text);
    // Only the first line of the parser's message, without the colon that leads to the rest, which quotes the file.
    const invalid = (message: string): Error => new Error(`${basename(path)} is not valid YAML; fix it by hand: ${message.split("\n")[0].replace(/:\s*$/, "")}`);

    if (document.errors.length > 0) {
        throw invalid(document.errors[0].message);
    }

    if (document.contents !== null && !isMap(document.contents)) {
        throw new Error(`${basename(path)} must hold ${holds}; fix it by hand.`);
    }

    try {
        document.toJS();
    } catch (error) {
        // Such as an alias to an anchor that is not there, which only toJS finds.
        throw invalid(error instanceof Error ? error.message : String(error));
    }

    return document;
}

/** A file that is not there, as reading it would say. */
function missing(path: string): never
{
    throw Object.assign(new Error(`ENOENT: no such file or directory, open '${path}'`), { code: "ENOENT" });
}
