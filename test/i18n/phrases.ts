// What every translation of the page must hold (D-394): each phrase the page's code gives t() or tParts() as a string of its own, and the words of the player's
// settings the engine gives the page (what each is, what its values mean, the setup's questions, the pictures' notes), which it writes through t(). The test
// checks the files against them; test/i18n/translate.ts completes them.
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommandLine } from "../../src/cli/command-line.ts";
import { picturesNotes, playerSettingNames } from "../../src/commands/config.ts";
import type { PlayerSetting } from "../../src/dashboard/data.ts";
import { makeTempFolder, testContext } from "../support.ts";

/** The page's folder, where its code and its translations (i18n/) are. */
export const pageFolder = fileURLToPath(new URL("../../src/dashboard/", import.meta.url));

/** Every phrase the page needs translated: its code's, and its settings'. */
export async function pagePhrases(): Promise<Set<string>>
{
    return new Set([...codePhrases(), ...await settingPhrases()]);
}

/** Every phrase the page's code gives t() or tParts() as a string of its own. */
export function codePhrases(): Set<string>
{
    const files = readdirSync(pageFolder, { recursive: true, encoding: "utf8" }).filter((file) => /\.tsx?$/.test(file) && !file.startsWith("i18n"));
    const calls = files.flatMap((file) => [...readFileSync(join(pageFolder, file), "utf8").matchAll(/\bt(?:Parts)?\(\s*("(?:[^"\\]|\\.)*")/g)]);
    return new Set(calls.map((call) => JSON.parse(call[1]) as string));
}

/**
 * The words of the player's settings the engine gives the page, in a campaign made for it, and every note of the pictures' setting, which depends on the
 * computer; a game system's own come with its words (D-394, 3).
 */
export async function settingPhrases(): Promise<Set<string>>
{
    const campaign = join(makeTempFolder(), "campaign");
    mkdirSync(campaign);
    const context = { ...testContext(campaign), folder: campaign };
    // Without a system, which may leave some of them out (DAT-16).
    await runCommandLine(["init", "--language", "it"], context);

    const read = async (...args: string[]): Promise<PlayerSetting[]> => {
        const view = JSON.parse((await runCommandLine(["view", ...args, "--json"], context)).output) as { settings?: PlayerSetting[]; questions?: PlayerSetting[]; };
        return view.settings ?? view.questions ?? [];
    };

    const own = new Set<string>([...playerSettingNames, "companions", "preparation", "name"]);
    const settings = [...await read("--settings"), ...await read("--setup")].filter((setting) => own.has(setting.name));
    const words = settings.flatMap((setting) => [setting.about, setting.question, ...(setting.choices ?? []).flatMap((choice) => [choice.means, choice.label])]);
    return new Set([...words, ...picturesNotes].filter((word) => word !== undefined));
}

/** The {names} a phrase fills, in order of their names. */
export function phraseNames(text: string): string[]
{
    return [...text.matchAll(/\{(\w+)\}/g)].map((found) => found[1]).sort();
}
