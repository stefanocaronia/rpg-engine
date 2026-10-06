import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { type Document, isMap, parseDocument } from "yaml";
import { frozen } from "./frozen.ts";

/** A YAML file of keys and values, read so that writing it back keeps its comments. `holds` says what it must hold, for the error message: settings, such as "name: ...". */
export function readYamlFile(path: string, holds: string): Document
{
    const document = parseDocument(readFileSync(path, "utf8"));
    // Only the first line of the parser's message: the rest quotes the file.
    const invalid = (message: string): Error => new Error(`${basename(path)} is not valid YAML; fix it by hand: ${message.split("\n")[0]}`);

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

/** The keys and values of a YAML file, as plain data; an empty file gives an empty object. */
export function readYamlValues(path: string, holds: string): unknown
{
    return frozen(readYamlFile(path, holds).toJS() ?? {});
}

/** Writes a YAML file read with readYamlFile; long values stay on one line. */
export function writeYamlFile(path: string, document: Document): void
{
    writeFileSync(path, document.toString({ lineWidth: 0 }), "utf8");
}
