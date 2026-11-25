// Where the launcher is found: one small file in the engine's data folder on this computer, with its process, engine, link and the token that asks it to
// quit. A place nobody listens at is stale: whoever finds it takes it away.
import { join } from "node:path";
import { readDataFile, removeDataFile, writeDataFile } from "../../core/data-file.ts";
import { isPageAddress } from "../../core/page-address.ts";

/** The launcher as its place file says it. */
export interface LauncherPlace
{
    pid: number;
    version: string;
    url: string;
    token: string;
}

/** The launcher's place; undefined where there is none, it does not read, or its link is no page of this computer's. */
export function readLauncher(home: string): LauncherPlace | undefined
{
    const read = (readDataFile(placeFile(home)) ?? {}) as Partial<LauncherPlace>;
    const texts = [read.version, read.url, read.token].every((one) => typeof one === "string");
    return texts && typeof read.pid === "number" && isPageAddress(read.url as string)
        ? { pid: read.pid, version: read.version as string, url: read.url as string, token: read.token as string }
        : undefined;
}

/** Writes the launcher's place, its token for the player alone to read. */
export function writeLauncher(home: string, place: LauncherPlace): void
{
    writeDataFile(placeFile(home), place);
}

/** Takes the launcher's place away, only while it is the one with this token: a launcher started since keeps its own. */
export function removeLauncher(home: string, token: string): void
{
    if (readLauncher(home)?.token === token) {
        removeDataFile(placeFile(home));
    }
}

function placeFile(home: string): string
{
    return join(home, "launcher.json");
}
