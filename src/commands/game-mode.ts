// The mode of the campaign, the main state of the game (D-77): setup, session zero or play, each opened by the checklist of the one before (D-221, D-241; MOD-1–MOD-7).
import { basename } from "node:path";
import { companionWays, diceWays, difficulties, lethalities, missingSettings, preparations, readSettings, readStateValues, rigors, saveModes, type SettingName, unansweredSettings, unitSystems } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { readLog } from "../core/log.ts";
import type { Problem } from "../core/problem.ts";
import { comparableText } from "../core/text.ts";
import { isInParty, type World } from "../pages/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { campaignSystem, campaignWorld, missingWithSystems } from "./game-world.ts";
import { missingSettingsNote } from "./notes.ts";
import { partText } from "./parts.ts";
import { missingSheetFields } from "./sheet.ts";

/** The modes, in their order (D-75, D-77). */
export const modes = ["setup", "session zero", "play"] as const;

export type Mode = (typeof modes)[number];

/** What a mode lacks before the campaign may leave it: the mode whose checklist is not complete, and its items. */
export interface Blocked
{
    mode: Mode;
    missing: string[];
}

// The settings the setup asks, with the values they take, so that the master offers them as they are (MOD-3).
const settingLabels: Partial<Record<SettingName, string>> = {
    language: "language (a code, such as it)",
    mentor: "mentor (ask how well the player knows the game: never played, tutorial; a little, hints; well, off)",
    premise: "premise (the genre, the tone and a few elements of the world, in the player's words)",
    preparation: `preparation (${preparations.join(", ")})`,
    difficulty: `difficulty (${difficulties.join(", ")})`,
    lethality: `lethality (${lethalities.join(", ")})`,
    saves: `saves (${saveModes.join(", ")})`,
    rigor: `rigor (${rigors.join(", ")})`,
    dice: `dice (${diceWays.join(", ")})`,
    units: `units (${unitSystems.join(", ")})`,
    companions: `companions (${companionWays.join(", ")})`,
    "calendar-start": "calendar-start (when the story starts: day 1 to count only the days, or a day of the world, such as 14 April 1491)",
    lines: 'lines ("none" is an answer)',
    veils: 'veils ("none" is an answer)',
};

/**
 * The mode the campaign is in: the one state.yaml keeps; for a campaign made before modes, or one whose mode is written wrongly, play once it has had a scene,
 * session zero once it has a player character, setup before (MOD-1).
 */
export function campaignMode(root: string, world: World): Mode
{
    const written = writtenMode(root);
    const known = modes.find((mode) => typeof written === "string" && comparableText(mode) === comparableText(written));

    if (known !== undefined) {
        return known;
    }

    if (readLog(root).some((entry) => entry.type === "scene-opened")) {
        return "play";
    }

    return world.pages.some((page) => page.type === "character" && page.fields.role === "pc") ? "session zero" : "setup";
}

/** A mode written by hand in state.yaml that is no mode: it counts as none (MOD-1), and validate says how to fix it. */
export function modeProblems(root: string): Problem[]
{
    const written = writtenMode(root);
    const known = typeof written === "string" && modes.some((mode) => comparableText(mode) === comparableText(written));

    if (written === undefined || written === null || known) {
        return [];
    }

    return [{ path: "state.yaml", message: `The mode in state.yaml, "${String(written)}", is not a mode: ${modes.join(", ")}.`, fix: "call mode with the one the campaign is in" }];
}

/** The first checklist the campaign must complete before entering `mode`: the setup's, then session zero's; undefined when nothing stops it (MOD-2). */
export function blockingMode(mode: Mode, root: string, context: Context, world: World): Blocked | undefined
{
    if (mode === "setup") {
        return undefined;
    }

    const setup = setupMissing(root, context, world);

    if (setup.length > 0) {
        return { mode: "setup", missing: setup };
    }

    const zero = mode === "play" ? sessionZeroMissing(root, context, world) : [];
    return zero.length > 0 ? { mode: "session zero", missing: zero } : undefined;
}

/** "still to agree with the player: lethality (…); set each with config", or what session zero still has to make: what a checklist lacks, as outputs say it. */
export function missingText(blocked: Blocked): string
{
    return blocked.mode === "setup"
        ? `still to agree with the player: ${blocked.missing.join(", ")}; set each with config`
        : `still to make with the player: ${blocked.missing.join("; ")}`;
}

/** What the campaign still needs, as init, config and status say it: before play, the checklist and the call that moves on; in play, the settings still missing (MOD-7). */
export function campaignNote(root: string, context: Context): string
{
    const world = campaignWorld(root, context);
    return checklistLine(campaignMode(root, world), root, context, world) ?? missingSettingsNote(missingWithSystems(root, missingSettings(readSettings(root)), context));
}

/** Before play, what the next mode still needs and the call that enters it once the player confirms (MOD-7); undefined in play. */
export function checklistLine(mode: Mode, root: string, context: Context, world: World): string | undefined
{
    if (mode === "play") {
        return undefined;
    }

    const next = mode === "setup" ? "session zero" : "play";
    const blocked = blockingMode(next, root, context, world);
    const missing = blocked === undefined ? "nothing is missing" : missingText(blocked);
    const settings = readSettings(root);
    const unnamed = mode === "setup" && settings.premise !== undefined && comparableText(settings.name) === comparableText(basename(root));
    const name = unnamed ? ` The campaign is still named after its folder, ${settings.name}: propose a name that fits the premise, and set it with config name once the player likes it.` : "";
    // With the dashboard open, the setup's closed choices are made there, one at a time (D-370).
    const page = mode === "setup" && context.dashboard !== undefined
        ? " The player can make the setup's choices on the dashboard, one at a time: offer it, and meanwhile ask in the chat only the premise, the language and when the story starts. "
            + "Ask the rest only when they leave it to you, or once they say they are ready."
        : "";
    return `${missing.charAt(0).toUpperCase()}${missing.slice(1)}. When ${blocked === undefined ? "" : "none is left and "}the player confirms: ${modeCall(next)}.${name}${page}`;
}

/** The call that enters a mode, as outputs give it: mode, to "session zero". */
export function modeCall(mode: Mode): string
{
    return `mode, to ${mode.includes(" ") ? `"${mode}"` : mode}`;
}

/** The part of the instructions of a mode, the core's with the system's (MOD-5): the file setup, session-zero or play. */
export function modePart(mode: Mode, system: GameSystem | undefined): string | undefined
{
    return partText(mode.replace(" ", "-"), system);
}

/** The mode state.yaml writes; undefined when it writes none, or cannot be read, which status and validate say elsewhere: the other commands go on. */
function writtenMode(root: string): unknown
{
    try {
        return readStateValues(root).mode;
    } catch {
        return undefined;
    }
}

/** What the setup still has to agree with the player, each setting with the values it takes, the system's own too (MOD-3). */
function setupMissing(root: string, context: Context, world: World): string[]
{
    const unanswered = unansweredSettings(readSettings(root), world.pages.length > 0);
    return missingWithSystems(root, unanswered, context).map((name) => settingLabels[name as SettingName] ?? name);
}

/** What session zero still has to make (MOD-4): a living player character, the companions the setup said are made in it, and the sheets they keep, whole. */
function sessionZeroMissing(root: string, context: Context, world: World): string[]
{
    const system = campaignSystem(root, context);
    const players = world.pages.filter((page) => isInParty(page) && page.fields.role === "pc");
    const companions = world.pages.filter((page) => isInParty(page) && page.fields.role === "companion");
    const way = readSettings(root).companions;
    const made = (way === "made with the player" || way === "made by the master") && companions.length === 0;
    const sheets = [...players, ...companions].flatMap((page) => {
        const missing = missingSheetFields(system, world, page);
        return missing.length === 0 ? [] : [`${page.name}'s sheet, which lacks ${missing.join(", ")}`];
    });
    return [...(players.length === 0 ? ["a player character"] : []), ...(made ? [`a companion, ${way}`] : []), ...sheets];
}
