// The theme of the dashboard the campaign's game system names (D-528): read and checked as the system is, for validate and for the dashboard.
import { relative } from "node:path";
import type { Context } from "../core/context.ts";
import type { Problem } from "../core/problem.ts";
import { readTheme, themeFileName, type ThemeReading } from "../themes/index.ts";
import { campaignSystem } from "./game-world.ts";

/** The theme of the campaign's game system, read and checked, with the system's name; undefined when it names none. */
export function campaignTheme(root: string, context: Context): (ThemeReading & { system: string; }) | undefined
{
    const system = campaignSystem(root, context);
    return system?.theme === undefined ? undefined : { ...readTheme(system.theme), system: system.name };
}

/** What keeps the system's theme from the dashboard, each a problem of its theme.yaml: until it is fixed, the page keeps its own look. */
export function themeProblems(root: string, context: Context): Problem[]
{
    const system = campaignSystem(root, context);
    const reading = campaignTheme(root, context);

    if (system?.theme === undefined || reading === undefined) {
        return [];
    }

    const path = `${relative(system.folder, system.theme).replaceAll("\\", "/") || "."}/${themeFileName}`;
    return reading.problems.map((message) => ({
        path: `${system.name}: ${path}`,
        message: `the theme of the game system ${system.name} is not used, and the dashboard keeps its own look: ${message}`,
        fix: "the system's author fixes its theme; the campaign plays on meanwhile",
    }));
}
