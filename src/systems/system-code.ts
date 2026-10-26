// The code a game system brings where its data is not enough (D-448, D-514), with the same contract as an extension's: the engine loads it once for the process,
// as it starts. A system's package.json says it has code and which API it is made for, as an extension's does (D-439); a folder without one is data alone.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { packageCodeMayRun } from "../core/consents.ts";
import { realPath } from "../core/files.ts";
import type { PackageCode, PackageEntry } from "../core/package-api.ts";
import { apiProblem } from "../core/package-declarations.ts";
import { isInside } from "../core/store.ts";
import { systemFolders } from "./system-folders.ts";

/** A system's code as loaded: what it gives, or what kept it from loading; the version of its package, as it was loaded. */
export type LoadedSystemCode = ({ code: PackageCode; } | { problem: string; } | { refused: string; }) & { version: string; };

/** A system's package.json of kind system (D-448, D-511): its name and version, the main of its code and its page module, the API it is made for. */
export interface SystemPackage
{
    package: string;
    version: string;
    main?: string;
    page?: string;
    api?: number;
}

/** A system's package.json of kind system; undefined for a folder without one, which is data alone. */
export function systemPackage(folder: string): SystemPackage | undefined
{
    const path = join(folder, "package.json");

    if (!existsSync(path)) {
        return undefined;
    }

    try {
        const data = JSON.parse(readFileSync(path, "utf8")) as { name?: unknown; version?: unknown; main?: unknown; "rpg-engine"?: { kind?: unknown; api?: unknown; page?: unknown; }; };
        const marker = data["rpg-engine"];

        if (marker?.kind !== "system") {
            return undefined;
        }

        return {
            package: typeof data.name === "string" ? data.name : "",
            version: typeof data.version === "string" ? data.version : "0.0.0",
            ...(typeof data.main === "string" ? { main: data.main } : {}),
            ...(typeof marker.page === "string" ? { page: marker.page } : {}),
            ...(typeof marker.api === "number" ? { api: marker.api } : {}),
        };
    } catch {
        return undefined;
    }
}

/** What a package's default export gave, refused when it is not its code, an object, as null is not. */
export function givenCode(given: unknown, file: string): PackageCode
{
    if (typeof given !== "object" || given === null || Array.isArray(given)) {
        throw new Error(`${file}'s default export gave ${given === null ? "null" : Array.isArray(given) ? "a list" : typeof given}, not its code: give an object, such as { commands: [] }`);
    }

    return given as PackageCode;
}

/** Whether a system's folder brings code: a package.json of kind system with a main (D-448). */
export function systemHasCode(folder: string): boolean
{
    return systemPackage(folder)?.main !== undefined;
}

/** Why this engine does not read the system in this folder, made for another API, with what to do; undefined when it does, or when it is data alone. */
export function systemApiProblem(folder: string): string | undefined
{
    const own = systemPackage(folder);
    return own === undefined ? undefined : apiProblem(own.api, "system");
}

/** A system's code for the dashboard's page, as its package.json declares it (D-511): its module's file, the package's name and version; undefined without one. */
export function systemPageModule(folder: string): { file: string; package: string; version: string; } | undefined
{
    const own = systemPackage(folder);
    // Its page code is a file of its own, by real paths, links included (D-510).
    const inside = own?.page !== undefined && isInside(realPath(folder), realPath(resolve(folder, own.page)));
    return !inside || own?.page === undefined || own.package === "" ? undefined : { file: join(folder, own.page), package: own.package, version: own.version };
}

/**
 * The code of every system in these folders that brings some, by the system's name, loaded once: from its source where the engine runs from its own, as in
 * the tests, else from its built main. One that fails to load, or is made for an API this engine does not read, says why, for the command that needs it.
 */
export async function loadSystemCode(folders: string[]): Promise<Record<string, LoadedSystemCode>>
{
    const loaded: Record<string, LoadedSystemCode> = {};

    // The nearest system by a name is the one played, as findSystem reads it: another of that name never brings its code.
    const seen = new Set<string>();

    for (const { name, folder: own } of systemFolders(folders)) {
        const main = systemPackage(own)?.main;
        const version = systemPackage(own)?.version ?? "0.0.0";
        const first = !seen.has(name.toLowerCase());
        seen.add(name.toLowerCase());

        if (main === undefined || !first) {
            continue;
        }

        const unread = systemApiProblem(own);

        if (unread !== undefined) {
            loaded[name] = { refused: unread.replace(/^it /, ""), version };
            continue;
        }

        // Another's code runs only after the player's yes, for this version and these files (D-478, D-511).
        if (!packageCodeMayRun(own)) {
            loaded[name] = { refused: `is not ours, and the player has not said yes to it as it is installed: install it again with package install, for their yes`, version };
            continue;
        }

        const source = join(own, "src", "index.ts");
        const file = import.meta.url.endsWith(".ts") && existsSync(source) ? source : join(own, main);

        try {
            const module = await import(pathToFileURL(file).href) as { default?: unknown; };

            if (typeof module.default !== "function") {
                throw new Error(`${file} has no default export that gives its code`);
            }

            loaded[name] = { code: givenCode((module.default as PackageEntry)({ z }), file), version };
        } catch (error) {
            loaded[name] = { problem: error instanceof Error ? error.message : String(error), version };
        }
    }

    return loaded;
}
