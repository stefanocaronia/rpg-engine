// Newer versions of the campaign's packages on npm (D-569): asked at most once a day and with a short wait, told to the master, never installed by themselves
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readTextSetting } from "../../../campaign/index.ts";
import { type Context, engineSystemsFolder } from "../../../core/context.ts";
import { installedFromFolder } from "../../../core/files.ts";
import { files, isInside } from "../../../core/store.ts";
import { comparableText } from "../../../core/text.ts";
import { isNewerVersion } from "../../../core/version.ts";
import { findExtension, shortName } from "../../../extensions/index.ts";
import { verifiedScope } from "../../../packages/index.ts";
import { systemFolders } from "../../../systems/index.ts";
import { listedExtensions } from "./extensions.ts";

// What npm said, kept in the player's folder on this computer for a day, so that a session starts without asking it again.
const fileName = "package-updates.json";
const checkHolds = 24 * 60 * 60 * 1000;

/** A package of the campaign installed from npm: its npm name, its version here, and the name package install takes. */
interface CampaignPackage
{
    name: string;
    version: string;
    install: string;
}

/**
 * "Newer on npm: 5e 0.14.1 (here 0.11.2)…": the campaign's game system and extensions installed from npm that npm has a newer version of, one this engine reads,
 * with the command that updates each; undefined when there is none, without npm, or offline, which is never an error.
 */
export async function packageUpdates(root: string, context: Context): Promise<string | undefined>
{
    const newest = context.packages?.newest;
    const packages = campaignPackages(root, context);

    if (newest === undefined || packages.length === 0) {
        return undefined;
    }

    const known = await newestVersions(context, packages.map((one) => one.name), newest);
    const newer = packages.flatMap((one) => {
        const version = known[one.name];
        return version !== undefined && isNewerVersion(version, one.version) ? [{ ...one, newer: version }] : [];
    });

    if (newer.length === 0) {
        return undefined;
    }

    const listed = newer.map((one) => `${one.install} ${one.newer} (here ${one.version})`).join(", ");
    const commands = newer.map((one) => `package install ${one.install}`).join(", ");
    return `Newer on npm: ${listed}. Tell the player; update only if they want it, with ${commands}.`;
}

/** The newest versions of these packages npm has, by name: those kept from today, else asked now and kept; none for one npm did not answer. */
async function newestVersions(context: Context, names: string[], newest: (name: string) => Promise<string | undefined>): Promise<Record<string, string>>
{
    const now = context.now().getTime();
    const kept = keptCheck(context.home);

    if (kept !== undefined && now - kept.checked >= 0 && now - kept.checked < checkHolds && names.every((name) => name in kept.newest)) {
        return Object.fromEntries(Object.entries(kept.newest).filter((entry): entry is [string, string] => entry[1] !== null));
    }

    const asked = await Promise.all(names.map(async (name) => [name, (await newest(name)) ?? null] as const));
    keepCheck(context.home, now, Object.fromEntries(asked));
    return Object.fromEntries(asked.filter((entry): entry is readonly [string, string] => entry[1] !== null));
}

/** The game system the campaign plays and the extensions it lists, those installed from npm alone: a folder's copy, or a system the engine ships, has no newer version there. */
function campaignPackages(root: string, context: Context): CampaignPackage[]
{
    const plays = readTextSetting(root, "system");
    const system = plays === undefined ? undefined : systemFolders(context.systemFolders).find((one) => comparableText(one.name) === comparableText(plays));
    const manifest = system === undefined || isInside(engineSystemsFolder, system.folder) || installedFromFolder(system.folder) ? undefined : packageOf(system.folder);
    const systemPackage = manifest === undefined || system === undefined ? [] : [{ ...manifest, install: installName(manifest.name, system.name) }];
    const extensions = Object.keys(listedExtensions(root)).flatMap((name) => {
        try {
            const extension = findExtension(context.extensionFolders ?? [], name);
            return extension === undefined || extension.linked ? [] : [{ name: extension.package, version: extension.version, install: installName(extension.package) }];
        } catch {
            return [];
        }
    });
    return [...systemPackage, ...extensions];
}

/** The name package install takes for a package: one of ours by its short name, the 5e for @rpgengine/system-5e; another's by its npm name, npm: before one without a scope. */
function installName(name: string, system?: string): string
{
    if (name.startsWith(verifiedScope)) {
        return system !== undefined && name === `${verifiedScope}system-${system}` ? system : shortName(name);
    }

    return name.startsWith("@") ? name : `npm:${name}`;
}

/** The name and the version a package.json in this folder gives; undefined when it has none that reads. */
function packageOf(folder: string): { name: string; version: string; } | undefined
{
    try {
        const read = JSON.parse(files().text(join(folder, "package.json")) ?? "") as { name?: unknown; version?: unknown; };
        return typeof read.name === "string" && typeof read.version === "string" ? { name: read.name, version: read.version } : undefined;
    } catch {
        return undefined;
    }
}

/** The last check, as kept in the player's folder: when, and the newest version of each package, null where npm did not answer; none when it does not read. */
function keptCheck(home: string | undefined): { checked: number; newest: Record<string, string | null>; } | undefined
{
    if (home === undefined) {
        return undefined;
    }

    try {
        const read = JSON.parse(readFileSync(join(home, fileName), "utf8")) as { checked?: unknown; newest?: unknown; };
        const checked = typeof read.checked === "string" ? Date.parse(read.checked) : Number.NaN;
        const newest = read.newest !== null && typeof read.newest === "object" ? read.newest as Record<string, unknown> : undefined;

        if (Number.isNaN(checked) || newest === undefined) {
            return undefined;
        }

        return { checked, newest: Object.fromEntries(Object.entries(newest).map(([name, version]) => [name, typeof version === "string" ? version : null])) };
    } catch {
        return undefined;
    }
}

/** Keeps a check in the player's folder; a folder that cannot be written only means npm is asked again next time. */
function keepCheck(home: string | undefined, now: number, newest: Record<string, string | null>): void
{
    if (home === undefined) {
        return;
    }

    try {
        mkdirSync(home, { recursive: true });
        writeFileSync(join(home, fileName), `${JSON.stringify({ checked: new Date(now).toISOString(), newest }, null, 2)}\n`);
    } catch {
        // Nothing to keep is no reason to stop the session.
    }
}
