// A theme of the dashboard as a package of its own: unpacked for every campaign on this computer, or linked for its author, checked as a game system's theme
// is, listed and taken away by its name or its id; a new one made from the template. Data alone, so no player's yes.
import { basename, join, resolve } from "node:path";
import { parse } from "yaml";
import { manifestFileName } from "../../adventures/index.ts";
import { topFile } from "../../core/archive.ts";
import type { Context } from "../../core/context.ts";
import { appendLogEntry } from "../../core/log.ts";
import { Refusal } from "../../core/refusal.ts";
import { files } from "../../core/store.ts";
import { getVersion } from "../../core/version.ts";
import { type InstalledTheme, linkFileName, readTheme, themeFileName, themeFilesNamed, themeId, themeTemplate } from "../../themes/index.ts";
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
    const folder = installedThemesFolder(context);
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

/**
 * Links a theme's folder of this computer for its author, for every campaign, in place of an installed theme of the same id: its folder among the installed
 * ones holds only the path of the author's, which is read where it is, never copied. One that fails its checks is linked too, for its author to see why.
 */
export function themeLinked(root: string | undefined, context: Context, folder: string): PackageResult
{
    const themes = installedThemesFolder(context);
    const reading = readTheme(folder);
    const name = reading.theme?.name ?? looseName(folder) ?? basename(folder);
    const id = themeId(name);
    const before = themesHere(context).find((one) => one.id === id);
    const trial = writeTrial(themes, context, [[[linkFileName], new TextEncoder().encode(`${folder}\n`)]], folder);

    try {
        placeTrial(trial, join(themes, id), context);
    } finally {
        files().removeFolder(trial);
    }

    if (root !== undefined) {
        appendLogEntry(root, newDatedLogEntry(root, context, "package-installed", "public", { package: id, version: reading.theme?.version ?? "", verified: false, kind: "theme" }));
    }

    return {
        kind: "theme-installed",
        theme: { id, name, ...(reading.theme?.version === undefined ? {} : { version: reading.theme.version }) },
        linked: folder,
        ...(reading.problems.length === 0 ? {} : { problems: reading.problems }),
        ...(before === undefined ? {} : { replaced: { name: before.theme?.name ?? before.id, ...(before.theme?.version === undefined ? {} : { version: before.theme.version }) } }),
    };
}

/** Makes a new theme from the template in a folder of its own, by default the theme's id in the folder the command runs from, and links it. */
export function themeMade(root: string | undefined, context: Context, name: string, folder: string | undefined): PackageResult
{
    const id = themeId(name);
    const target = resolve(context.folder, folder ?? id);

    if (files().entries(target).length > 0 || files().links(target).length > 0) {
        throw new Refusal(`${target} is not empty: give package new another name, or a folder that is empty or not there yet. Nothing changed.`, "folder-not-empty", { name: target });
    }

    if (themesHere(context).some((one) => one.id === id)) {
        throw new Refusal(
            `A theme ${id} is installed on this computer already: give the new one another name, or take that one away first with package uninstall theme:${id}. Nothing changed.`,
            "theme-here",
            { name: id },
        );
    }

    for (const [path, text] of themeTemplate(name, getVersion())) {
        files().write(join(target, ...path.split("/")), text);
    }

    const linked = themeLinked(root, context, target);
    return linked.kind === "theme-installed" ? { ...linked, made: true as const } : linked;
}

/** Takes an installed theme off this computer: its folder among the installed ones, never the author's folder a linked one is read from. */
export function themeUninstalled(root: string | undefined, context: Context, found: InstalledTheme): PackageResult
{
    files().removeFolder(found.entry);

    if (root !== undefined) {
        appendLogEntry(root, newDatedLogEntry(root, context, "package-uninstalled", "public", { package: found.id, kind: "theme" }));
    }

    return { kind: "uninstalled", name: found.theme?.name ?? found.id, wasUsed: false, extension: false };
}

/** The themes on this computer as list gives them: each with its id, the folder a linked one is read from, and why one is not offered while it fails a check. */
export function themesListed(context: Context): ListedTheme[]
{
    return themesHere(context).map((one) => ({
        id: one.id,
        name: one.theme?.name ?? one.id,
        ...(one.theme?.version === undefined ? {} : { version: one.theme.version }),
        ...(one.linked === true ? { linked: one.folder } : {}),
        ...(one.problems.length === 0 ? {} : { problems: one.problems }),
    }));
}

/** Whether a folder of this computer can be linked as a theme: it has theme.yaml at its top and is no adventure, which comes first. */
export function isThemeFolder(folder: string): boolean
{
    return files().exists(join(folder, themeFileName)) && !files().exists(join(folder, manifestFileName));
}

/** The folder of the installed themes, where the game's server or the command line keep them. */
function installedThemesFolder(context: Context): string
{
    const folder = themesFolder(context);

    if (folder === undefined) {
        throw new Error("Themes are installed only by the game's server or the command line, which keep them for every campaign on this computer.");
    }

    return folder;
}

/** The name a theme.yaml gives, read without any check, for a theme linked while it fails one; undefined when it gives none. */
function looseName(folder: string): string | undefined
{
    try {
        const read = parse(files().text(join(folder, themeFileName)) ?? "") as { name?: unknown; } | null;
        return typeof read?.name === "string" && read.name.trim() !== "" ? read.name.trim() : undefined;
    } catch {
        return undefined;
    }
}

/** Whether a path of a package is its theme.yaml, at its top, in any case. */
function isThemeYaml(parts: string[]): boolean
{
    return parts.length === 1 && parts[0].toLowerCase() === themeFileName;
}
