// The themes installed on this computer for every campaign, as packages of data alone: each in a folder of its own named by its id, read and checked as a
// game system's theme is.
import { createHash } from "node:crypto";
import { join } from "node:path";
import { files } from "../core/store.ts";
import { readTheme, type Theme } from "./theme.ts";

/** A theme installed on this computer: its id, which names its folder and its address; the theme when it passes its checks, else what to fix, each a line. */
export interface InstalledTheme
{
    id: string;
    folder: string;
    theme?: Theme;
    problems: string[];
}

// What an id is made of; a folder being unpacked starts with a dot, and is none.
const idPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The themes in this folder, by their id; one refused is listed with its problems, for the player to see why it is not offered. */
export function installedThemes(folder: string): InstalledTheme[]
{
    return files().entries(folder)
        .filter((entry) => entry.isFolder && idPattern.test(entry.name))
        .map((entry) => entry.name)
        .sort()
        .map((id) => {
            const path = join(folder, id);
            return { id, folder: path, ...readTheme(path) };
        });
}

/** Whether a text is a theme's id: lowercase letters and digits, joined by hyphens. */
export function isThemeId(text: string): boolean
{
    return idPattern.test(text);
}

/** The id of a theme by its name, lowercase letters, digits and hyphens: Old Parchment is old-parchment; a name without such letters, by a print of it. */
export function themeId(name: string): string
{
    const id = name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 64).replace(/^-+|-+$/g, "");
    return id === "" ? `theme-${createHash("sha256").update(name).digest("hex").slice(0, 8)}` : id;
}
