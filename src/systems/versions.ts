// A system's versions of its rules: which one is chosen, and its data over the common data (VER-1 to VER-3)
import { join } from "node:path";
import { files } from "../core/store.ts";
import { comparableText } from "../core/text.ts";
import { readYamlValues } from "../core/yaml-file.ts";
import { systemFileName } from "./game-system.ts";
import { isMap, nameIn } from "./maps.ts";

// The folder that holds a system's versions of its rules, each in a folder named after it (VER-1).
const versionsFolderName = "versions";

/**
 * The version of its rules a system is read with (VER-1, VER-2): the one asked, by any case, else the first it lists; none for a system without versions.
 * Each version it lists has its folder in versions/, with a system.yaml of what it changes, if any, and a title of its own.
 */
export function chosenVersion(own: unknown, file: string, name: string, asked: string | undefined): { name: string; title?: string; folder: string; data: Record<string, unknown>; } | undefined
{
    const versions = isMap(own) && isMap(own.versions) ? Object.keys(own.versions).filter((key) => key !== "about") : [];
    const folder = join(file, "..");
    // A version is a folder of versions/ itself, never one a path leads to out of the system.
    const astray = versions.find((version) => /[\\/]/.test(version) || version.trim() === "." || version.trim() === "..");

    if (astray !== undefined) {
        throw new Error(`The game system ${name} cannot be read, because ${file} is not valid: versions.${astray}: a version is a folder of ${versionsFolderName}/, named such as srd-5.1.`);
    }

    const unfound = versions.find((version) => files().files(join(folder, versionsFolderName, version), () => true).length === 0);

    if (unfound !== undefined) {
        throw new Error(
            `The game system ${name} cannot be read, because ${file} is not valid: versions.${unfound}: there is no folder ${versionsFolderName}/${unfound} with files beside it; give each version its folder, with what it changes.`,
        );
    }

    const chosen = versions.find((version) => asked !== undefined && comparableText(version) === comparableText(asked.trim())) ?? versions[0];

    if (chosen === undefined) {
        return undefined;
    }

    const at = join(folder, versionsFolderName, chosen);
    const versionFile = join(at, systemFileName);
    const data = files().exists(versionFile) ? (readYamlValues(versionFile, 'what the version changes, such as "title: ..."') ?? {}) : {};

    if (!isMap(data) || data.versions !== undefined) {
        const why = isMap(data) ? "a version lists no versions of its own" : "write it as the keys of system.yaml the version changes, such as title: the second rules";
        throw new Error(`The game system ${name} cannot be read, because ${versionFile} is not valid: ${why}.`);
    }

    const { title, ...changes } = data;
    return { name: chosen, ...(typeof title === "string" ? { title } : {}), folder: at, data: changes };
}

/** A system's data with its version's over it (VER-3): a map by its names, at every depth, the version's winning; a list or a value in the place of the common one. */
export function withVersion(below: Record<string, unknown>, over: Record<string, unknown>): Record<string, unknown>
{
    const taken = new Set<string>();
    const merged = Object.entries(below).map(([key, value]): [string, unknown] => {
        const named = nameIn(over, key);

        if (named === undefined) {
            return [key, value];
        }

        taken.add(named);
        return [named, isMap(value) && isMap(over[named]) ? withVersion(value, over[named]) : over[named]];
    });
    return Object.fromEntries([...merged, ...Object.entries(over).filter(([key]) => !taken.has(key))]);
}
