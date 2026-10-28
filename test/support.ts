import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Context } from "../src/core/context.ts";
import type { LogEntry } from "../src/core/log.ts";
import { loadSystemCode } from "../src/systems/index.ts";

/**
 * The game systems the tests see: those of the package, 5e and ironsworn, the second kept out of the npm package until it is playable; and the fake system
 * of the core's tests, in test/systems/, never published (D-513 (3)).
 */
export const testSystemFolders = [fileURLToPath(new URL("../systems/", import.meta.url)), fileURLToPath(new URL("./systems/", import.meta.url))];

/** The code of the systems the tests see, loaded once for each test file, as an entry of the engine does (D-448). */
export const testSystemCode = await loadSystemCode(testSystemFolders);

/** The extensions the tests see: the test ones, made for them; ours have repositories of their own (D-506). */
export const testExtensionFolders = [fileURLToPath(new URL("./extensions/", import.meta.url))];

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
export const fightGuidance = "As the fight starts, give the place two or three things that change it, such as a lantern, a ledge, a rotten rail; foes who know the place use them too, and first.\n\n"
    + "Give the fight a question beyond who wins, such as holding the gate or saving the child, and at least one choice that changes its outcome; "
    + "end it once the question is answered: foes flee, yield or bargain.\n\n"
    + "- Keep positions as places the player can picture (on the stairs, behind the cart, in the doorway), and say each move that changes who can reach, see or flank whom.\n"
    + "- The place can fight too: a hazard with its own clock, such as rising water or spreading fire, grows each round and acts on its own turn, shown a turn ahead.\n"
    + "- Give a hard fight a moment that asks for the right move, shown a turn ahead, such as a beam heaved or a bridge catching fire, so that what was saved for it pays there.\n"
    + "- When the player uses what they found out, such as a scout's word, a legend or a foe's tell, let it change the fight plainly: the ambush falls on empty ground, the wounds stop closing.\n"
    + "- A lone foe against a party falls fast: give it help, ground that shields it, or a change as it is hurt, such as calling the guards or taking to the air.\n"
    + "- When the party may lose, keep a way to lose short of death, such as retreat, surrender, capture or a deal; foes take it when their motives allow, and the loss moves the story on.\n\n"
    + "Tell the turns in order, as story, each roll the player sees in brackets where it falls, the order of turns too once the threat is in sight; "
    + "stop wherever the player can decide: their character's turn, a reaction they can take, a choice. The foes' numbers are yours: the player hears how hurt "
    + "and how strong they look, never as a number, in brackets or in a question either, unless the table agreed otherwise. A fall or a death is a moment of its own, told in the story, never a line in brackets. "
    + "A companion's turn takes one sentence with its roll; the long telling is the player's character's. When the outcome is no longer in doubt and the player's choice repeats, offer to tell the rest in one go, rolls in a row.\n\n"
    + "Whoever attacks the party turns hostile the moment they do, never before: mark them with `scene hostile`, and with `scene calm` the one who surrenders, "
    + "flees or parleys. Mark it, never announce it: the story shows it.\n\n"
    + "In a turn of a foe or a companion, send its calls together: its rolls in one message; in the next, what they change, with `change`, then `scene next` and the rolls "
    + "of whoever acts next. Never roll a later turn before the one before it is settled: who falls or flees changes what comes after.";

/** What scene open says about a place to explore: the core's part exploration (D-121, D-530). */
export const explorationGuidance = "A place worth exploring has more than one way in and through, and two or three things to touch, climb, break or use, given as the party arrives. "
    + "It also hides one thing a curious player can find, which rewards the looking, never the way on. "
    + "One you improvise can run entrance and guard, a puzzle or a talk, a setback, the climax, a reward or a twist.";

/** What scene open says about a journey: the core's part travel (D-121, D-530). */
export const travelGuidance = "On the road, each leg brings at most one event, from a table or the situation, aimed at what one of the party does on the way: guiding, scouting, hunting, "
    + "keeping watch. The road costs something: food, fatigue, time.";

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

/** The last line of the instructions, before the master's first words of an evening. */
export const openingLine = "Now read where the game stands, writing nothing: your first words to the player are the opening itself.";

/**
 * Puts a campaign in another game system by hand, as the tests of one system do on a campaign made with another: config refuses it once there is a player
 * character (D-519).
 */
export function useSystem(folder: string, system: string): void
{
    const settings = join(folder, "campaign.yaml");
    const written = readFileSync(settings, "utf8");
    writeFileSync(settings, /^system:.*$/m.test(written) ? written.replace(/^system:.*$/m, `system: ${system}`) : `${written}system: ${system}\n`);
}
