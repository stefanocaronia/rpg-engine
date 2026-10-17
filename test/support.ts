import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Context } from "../src/core/context.ts";
import type { LogEntry } from "../src/core/log.ts";
import { loadSystemCode } from "../src/systems/index.ts";

/** The game systems the tests see: those of the package, 5e and ironsworn, the second kept out of the npm package until it is playable. */
export const testSystemFolders = [fileURLToPath(new URL("../systems/", import.meta.url))];

/** The code of the systems the tests see, loaded once for each test file, as an entry of the engine does (D-448). */
export const testSystemCode = await loadSystemCode(testSystemFolders);

/** The extensions the tests see: ours of the repository, such as weather, and the test ones. */
export const testExtensionFolders = [fileURLToPath(new URL("../extensions/", import.meta.url)), fileURLToPath(new URL("./extensions/", import.meta.url))];

/** How many pages a game system the tests see has, in a folder of its world if given: "The system 5e has 22 more pages". */
export function systemPageCount(system: string, folder?: string): number
{
    const world = join(testSystemFolders.find((candidate) => readdirSync(candidate).includes(system)) ?? testSystemFolders[0], system, "world", folder ?? "");
    return readdirSync(world, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".md")).length;
}

/** A context with dice that always show 4, a fixed time and ids id1, id2…, working in `folder` as the master. */
export function testContext(folder: string): Context
{
    let idCount = 0;
    return {
        folder,
        random: () => 4,
        now: () => new Date("2026-10-02T10:00:00Z"),
        newId: () => `id${++idCount}`,
        newSalt: () => "salt",
        actor: "master",
        platform: "linux",
        systemFolders: testSystemFolders,
        systemCode: testSystemCode,
        extensionFolders: testExtensionFolders,
    };
}

// The temporary folders this test file made, which test/setup.ts removes when its tests end.
const made = new Set<string>();

export function makeTempFolder(): string
{
    const folder = mkdtempSync(join(tmpdir(), "rpg-test-"));
    made.add(folder);
    return folder;
}

/** Removes every temporary folder the test file made and has not removed, even after a test that failed half way. */
export function removeMadeFolders(): void
{
    for (const folder of made) {
        removeFolder(folder);
    }

    made.clear();
}

export function removeFolder(folder: string): void
{
    rmSync(folder, { recursive: true, force: true });
}

export function readLogFile(folder: string): LogEntry[]
{
    return readFileSync(join(folder, "log.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line) as LogEntry);
}

/** What scene open says about telling a fight: the core's part combat (D-139, D-121, D-238). */
export const fightGuidance = "Tell the turns in order, as story, each roll in brackets where it falls, the order of turns too once the threat is in sight; "
    + "stop wherever the player can decide: their character's turn, a reaction they can take, a choice. The foes' numbers are yours: the player hears how hurt they look "
    + "and how hard they are to hit, unless the table agreed otherwise. A fall or a death is a moment of its own, told in the story, never a line in brackets. "
    + "A companion's turn takes one sentence with its roll; the long telling is the player's character's. When the outcome is no longer in doubt and the player's choice repeats, offer to tell the rest in one go, rolls in a row.\n\n"
    + "Whoever attacks the party turns hostile the moment they do, never before: mark them with `scene hostile`, and with `scene calm` the one who surrenders, "
    + "flees or parleys. Mark it, never announce it: the story shows it.\n\n"
    + "In a turn of a foe or a companion, send its calls together: its attacks in one message; in the next, the damage of those that hit, with `change` and its dice, "
    + "such as by -(2d6+3), then `scene next` and the attacks of whoever acts next. Never roll a later turn before the one before it is settled: who falls or flees changes "
    + "what comes after.";

/** What a turn of the player's character says after its name (D-139). */
export const playerTurn = ", the player's character";
export const playerStop = ": stop here and hand them the turn.";

/** What another's turn reminds, at its end. */
export const quietTurn = "Write nothing until the round is told: what you work out stays in your thinking.";

/**
 * Puts a campaign that init made in play, as after its setup and session zero (MOD-1): the settings the master follows in play that are not yet there take
 * their usual values, and the tests of play open scenes at once.
 */
export function inPlay(folder: string): void
{
    const state = join(folder, "state.yaml");
    writeFileSync(state, readFileSync(state, "utf8").replace(/^mode: setup$/m, "mode: play"));
    const settings = join(folder, "campaign.yaml");
    const written = readFileSync(settings, "utf8");
    const usual = ["saves: checkpoint", "rigor: smooth", "dice: digital", "units: metric"].filter((line) => !new RegExp(`^${line.split(":")[0]}:`, "m").test(written));
    writeFileSync(
        settings,
        `${written}${
            usual.map((line) =>
                `${line}
`
            ).join("")
        }`,
    );
}
