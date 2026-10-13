// The moods (MECCANICHE, MOOD-1–MOOD-6; D-305): the master's and the characters', where they are kept, who sees them; a law on runs of moods made at random: the
// view gives the master's last mood and moment and the party's moods, never anyone else's, and a moment never changes the master's mood.
import fc from "fast-check";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readStateValues } from "../src/campaign/index.ts";
import { runCommandLine } from "../src/command-line.ts";
import { mood } from "../src/commands/mood.ts";
import { view, type ViewResult } from "../src/commands/view.ts";
import type { Context } from "../src/core/context.ts";
import { type Mood, moods } from "../src/core/mood.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

async function refused(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).not.toBe(0);
    return result.output;
}

async function campaign(): Promise<void>
{
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Prova", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await ok("write", "Kira", "--type", "character", "--set", "role=pc");
    await ok("write", "Bran", "--type", "character", "--set", "role=companion");
    await ok("write", "Varro", "--type", "character", "--set", "role=npc");
    await ok("write", "Guado", "--type", "place", "--add", "contains=[[Kira]]", "--add", "contains=[[Bran]]", "--add", "contains=[[Varro]]");
}

function overview(): Extract<ViewResult, { kind: "overview"; }>
{
    // view reads synchronously; run is typed for the commands that wait too.
    const result = view.run({}, context) as ViewResult;

    if (result.kind !== "overview") {
        throw new Error(`The view is ${result.kind}, not the overview.`);
    }

    return result;
}

function pageText(name: string): string
{
    return readFileSync(join(folder, "world", "characters", `${name}.md`), "utf8");
}

describe("the moods", () => {
    beforeEach(campaign);
    afterEach(() => removeFolder(folder));

    it("MOOD-2, MOOD-3, MOOD-5: the master's mood in state.yaml, with a public line; the same one again changes nothing; neutral takes it away", async () => {
        expect(await ok("mood", "master", "worried")).toBe("Your mood is now worried: the robot on the dashboard shows it. Let your voice follow it, until the story's tone turns again.");
        expect(readStateValues(folder)["master-mood"]).toBe("worried");
        const line = readLogFile(folder).at(-1);
        expect(line).toMatchObject({ type: "mood-changed", visibility: "public", data: { who: "master", mood: "worried", from: "neutral" } });
        const lines = readLogFile(folder).length;
        expect(await ok("mood", "master", "worried")).toBe("Your mood is already worried: nothing changed.");
        expect(readLogFile(folder)).toHaveLength(lines);
        expect(await ok("mood", "Master", "neutral")).toBe("Your mood is neutral again: the robot on the dashboard shows a calm face.");
        expect(readStateValues(folder)).not.toHaveProperty("master-mood");
    });

    it("MOOD-4: a moment leaves the master's mood as it is, and the view gives it as the last moment", async () => {
        await ok("mood", "master", "focused");
        expect(await ok("mood", "master", "surprised", "--moment")).toBe("The robot on the dashboard shows surprised for a moment, then goes back to focused.");
        expect(readStateValues(folder)["master-mood"]).toBe("focused");
        const line = readLogFile(folder).at(-1);
        expect(line).toMatchObject({ type: "mood-moment", visibility: "public", data: { who: "master", mood: "surprised", back: "focused" } });
        expect(overview().master).toEqual({ mood: "focused", moment: { id: line?.id, mood: "surprised", at: "2026-10-02T10:00:00.000Z" } });
        // The same moment twice is two moments.
        await ok("mood", "master", "surprised", "--moment");
        expect(overview().master.moment?.id).toBe(readLogFile(folder).at(-1)?.id);
    });

    it("MOOD-3, MOOD-5, MOOD-6: the party's moods on their pages, public, in the view and its line; an NPC's hidden, never in the view", async () => {
        expect(await ok("mood", "Kira", "angry")).toBe(
            "Kira's mood is now angry: the dashboard shows it on their sheet. It mirrors what the player writes and plays, never what you narrate or what a spell or condition "
                + "does to them: when the player says they feel otherwise, follow the player.",
        );
        expect(await ok("mood", "Bran", "afraid")).toBe("Bran's mood is now afraid: the dashboard shows it on their sheet. Let it colour how they speak and act.");
        expect(await ok("mood", "Varro", "disgusted")).toContain("Varro's mood is now disgusted: only you know it.");
        expect(pageText("Kira")).toMatch(/^mood: angry$/m);
        expect(pageText("Varro")).toMatch(/^mood: disgusted$/m);
        expect(readLogFile(folder).slice(-3).map((entry) => [entry.data.who, entry.visibility])).toEqual([["Kira", "public"], ["Bran", "public"], ["Varro", "hidden"]]);
        expect(overview().party.map((member) => [member.name, member.mood])).toEqual([["Kira", "angry"], ["Bran", "afraid"]]);
        expect(JSON.stringify(overview())).not.toContain("disgusted");
        const shown = await ok("view");
        expect(shown).toContain("Kira (angry), in Guado");
        expect(shown).toContain("Bran (companion, afraid), in Guado");
        expect(await ok("mood", "Kira", "neutral")).toBe("Kira has no mood any more.");
        expect(pageText("Kira")).not.toMatch(/^mood:/m);
        expect(overview().party[0]).not.toHaveProperty("mood");
        // The dead have no mood to show.
        await ok("write", "Bran", "--set", "status=dead");
        expect(overview().party[1]).not.toHaveProperty("mood");
        expect(await ok("view")).toContain("Bran (companion, dead)");
    });

    it("MOOD-6: status gives the master their mood, the party's and those of the characters in the open scene, only when they have one", async () => {
        expect(await ok("status")).not.toContain("mood");
        await ok("mood", "master", "mischievous");
        await ok("mood", "Bran", "determined");
        await ok("mood", "Varro", "angry");
        await ok("scene", "open", "--title", "Al guado", "--type", "social", "--with", "Varro");
        const status = await ok("status");
        expect(status).toContain("Your mood is mischievous: let your voice follow it.");
        expect(status).toMatch(/Companions: Bran, with Kira.*mood determined/);
        expect(status).toContain("Varro (mood angry)");
    });

    it("MOOD-1, MOOD-2: refuses a mood not on the list, a page that is not a character, a page of the system, a copy, a moment for a character, with what to do", async () => {
        expect(await refused("mood", "master", "furious")).toContain(`expected one of ${moods.map((name) => `"${name}"`).join("|")}`);
        expect(await refused("mood", "Guado", "happy")).toContain("Guado is a place, not a character: only you and the characters have moods. Nothing changed.");
        expect(await refused("mood", "Wolf", "happy")).toContain('Wolf is a creature, a kind of being: moods are for characters. Make one from it, such as with write "Name"');
        expect(await refused("mood", "Nessuno", "happy")).toContain("There is no page Nessuno: write the character first");
        expect(await refused("mood", "Bran", "sad", "--moment")).toContain("Only your mood has moments, as the master. Give Bran a mood that stays");
        await ok("scene", "open", "--title", "Lupi", "--type", "combat", "--creatures", "Wolf=1");
        expect(await refused("mood", "Wolf 1", "angry")).toContain("Wolf 1 is a copy of a creature in the open scene: moods are for characters.");
        expect(readLogFile(folder).filter((entry) => entry.type.startsWith("mood-"))).toEqual([]);
    });

    it("MOOD-3, INH-8: a mood is never inherited from a base, and write checks it as the list says", async () => {
        await ok("write", "Lupo nero", "--type", "creature", "--set", "creature=[[Wolf]]", "--set", "mood=angry");
        await ok("write", "Fumo", "--type", "character", "--set", "role=companion", "--set", "creature=[[Lupo nero]]");
        expect(overview().party.find((member) => member.name === "Fumo")).not.toHaveProperty("mood");
        expect(await refused("write", "Bran", "--set", "mood=furious")).toContain("mood");
    });
});

// A run of moods: the master's, a moment of theirs, or a character's, among the party and an NPC.
const who = ["master", "Kira", "Bran", "Varro"] as const;
const runOfMoods = fc.array(fc.record({ who: fc.constantFrom(...who), mood: fc.constantFrom(...moods), moment: fc.boolean() }), { minLength: 1, maxLength: 10 });

describe("the law of moods, on runs made at random", () => {
    beforeAll(campaign);
    afterAll(() => removeFolder(folder));

    it("MOOD-4, MOOD-6: the view gives the master's last mood and last moment, and the party's last moods, never the NPC's", () => {
        fc.assert(
            fc.property(runOfMoods, (run) => {
                for (const name of who) {
                    mood.run({ who: name, mood: "neutral" }, context);
                }

                const model: Record<string, Mood> = { master: "neutral", Kira: "neutral", Bran: "neutral", Varro: "neutral" };
                let moment: Mood | undefined;

                for (const step of run) {
                    const isMoment = step.moment && step.who === "master";
                    mood.run({ who: step.who, mood: step.mood, ...(isMoment ? { moment: true } : {}) }, context);

                    if (isMoment) {
                        moment = step.mood;
                    } else {
                        model[step.who] = step.mood;
                    }
                }

                const shown = overview();
                expect(shown.master.mood).toBe(model.master);

                if (moment !== undefined) {
                    expect(shown.master.moment?.mood).toBe(moment);
                }

                expect(shown.party.map((member) => member.mood ?? "neutral")).toEqual([model.Kira, model.Bran]);
                expect(readLogFile(folder).filter((entry) => entry.visibility === "public" && entry.data.who === "Varro")).toEqual([]);
            }),
            { numRuns: 25 },
        );
    });
});
