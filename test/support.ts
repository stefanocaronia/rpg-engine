import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Context } from "../src/core/context.ts";
import type { LogEntry } from "../src/core/log.ts";

/** The game systems the tests see: those of the package, such as 5e, and the test system ironsworn. */
export const testSystemFolders = [fileURLToPath(new URL("../systems/", import.meta.url)), fileURLToPath(new URL("./systems/", import.meta.url))];

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
    };
}

export function makeTempFolder(): string
{
    return mkdtempSync(join(tmpdir(), "rpg-test-"));
}

export function removeFolder(folder: string): void
{
    rmSync(folder, { recursive: true, force: true });
}

export function readLogFile(folder: string): LogEntry[]
{
    return readFileSync(join(folder, "log.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line) as LogEntry);
}

/** What scene open says about telling a fight: the core's part combat (D-139, D-121). */
export const fightGuidance = "Tell the turns in order, as story, each roll in brackets where it falls, the order of turns too once the threat is in sight; "
    + "stop wherever the player can decide: their character's turn, a reaction they can take, a choice. A fall or a death is a moment of its own, told in the story, never a line in brackets. "
    + "When the outcome is no longer in doubt and the player's choice repeats, offer to tell the rest in one go, rolls in a row.";

/** What a turn of the player's character says after its name (D-139). */
export const playerTurn = ", the player's character";
export const playerStop = ": stop here and hand them the turn, even if all they can do is roll to stay alive.";

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
    const usual = ["rigor: smooth", "dice: digital", "units: metric"].filter((line) => !new RegExp(`^${line.split(":")[0]}:`, "m").test(written));
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
