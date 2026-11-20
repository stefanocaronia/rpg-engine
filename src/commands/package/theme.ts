// A theme of the dashboard as a package of its own: unpacked for every campaign on this computer, checked as a game system's theme is, listed and taken away
// by its name or its id. Data alone, so no player's yes.
import { join } from "node:path";
import { topFile } from "../../core/archive.ts";
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { Refusal } from "../../core/refusal.ts";
import { files } from "../../core/store.ts";
import { type InstalledTheme, readTheme, themeFileName, themeFilesNamed, themeId } from "../../themes/index.ts";
import { keptFiles, placeTrial, themesFolder, themesHere, writeTrial } from "../shared/packages/unpacked.ts";
import { newDatedLogEntry } from "../shared/time/time.ts";
import type { DataPackage } from "./data.ts";
import type { ListedTheme, PackageResult } from "./result.ts";

// A licence at a theme's top, beside the files its theme.yaml names.
const licence = /^(licen[cs]e|copying)(\.(md|txt))?$/i;

/**
 * Installs a theme for every campaign on this computer, in the folder of its id, taking the place of one with the same; refused whole when it fails a check.
 * It keeps its theme.yaml, the files that names and a licence at its top: nothing else a repository holds.
 */
export function themeInstalled(root: string, context: Context, data: DataPackage): PackageResult
{
    const folder = themesFolder(context);

    if (folder === undefined) {
        throw new Error("Themes are installed only by the game's server or the command line, which keep them for every campaign on this computer.");
    }

    const text = (bytes: Uint8Array | undefined): string | undefined => (bytes === undefined ? undefined : new TextDecoder().decode(bytes));
    const named = new Set(themeFilesNamed(text(topFile(data.entries, themeFileName)?.[1]) ?? "", (name) => text(data.entries.find(([parts]) => parts.join("/") === name)?.[1])));
    const keep = (parts: string[]): boolean => isThemeYaml(parts) || named.has(parts.join("/")) || (parts.length === 1 && licence.test(parts[0]));
    const kept = keptFiles(data.label, data.entries, keep, "theme-refused", "a theme").map(([parts, bytes]): [string[], Uint8Array] => [isThemeYaml(parts) ? [themeFileName] : parts, bytes]);
    // Checked where it is written, in a folder of its own that no list reads, then put where its id puts it.
    const trial = writeTrial(folder, context, kept, data.source);

    try {
        const reading = readTheme(trial);

        if (reading.theme === undefined) {
            const why = reading.problems.map((problem) => problem.replaceAll(trial, data.label)).join("; ");
            throw new Refusal(`${data.label} is no theme the dashboard can use: ${why}. Nothing changed.`, "theme-refused", { name: data.label, why });
        }

        const theme = reading.theme;
        const id = themeId(theme.name);
        const before = themesHere(context).find((one) => one.id === id);
        placeTrial(trial, join(folder, id), context);
        appendLogEntry(root, newDatedLogEntry(root, context, "package-installed", "public", { package: id, version: theme.version ?? "", verified: false, kind: "theme" }));
        return {
            kind: "theme-installed",
            theme: { id, name: theme.name, ...(theme.version === undefined ? {} : { version: theme.version }) },
            ...(before === undefined ? {} : { replaced: { name: before.theme?.name ?? before.id, ...(before.theme?.version === undefined ? {} : { version: before.theme.version }) } }),
        };
    } finally {
        files().removeFolder(trial);
    }
}

/** Takes an installed theme off this computer. */
export function themeUninstalled(root: string, context: Context, found: InstalledTheme): PackageResult
{
    files().removeFolder(found.folder);
    appendLogEntry(root, newDatedLogEntry(root, context, "package-uninstalled", "public", { package: found.id, kind: "theme" }));
    return { kind: "uninstalled", name: found.theme?.name ?? found.id, wasUsed: false, extension: false };
}

/** The themes on this computer as list gives them: each with its id, and why one is not offered while it fails a check. */
export function themesListed(context: Context): ListedTheme[]
{
    return themesHere(context).map((one) => ({
        id: one.id,
        name: one.theme?.name ?? one.id,
        ...(one.theme?.version === undefined ? {} : { version: one.theme.version }),
        ...(one.problems.length === 0 ? {} : { problems: one.problems }),
    }));
}

/** Whether a path of a package is its theme.yaml, at its top, in any case. */
function isThemeYaml(parts: string[]): boolean
{
    return parts.length === 1 && parts[0].toLowerCase() === themeFileName;
}
