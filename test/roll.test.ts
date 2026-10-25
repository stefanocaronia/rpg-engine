import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(() => {
    folder = makeTempFolder();
    context = testContext(folder);
    // A bare campaign, so that the first roll gets the id id1.
    writeFileSync(join(folder, "campaign.yaml"), "name: Test\n");
});

afterEach(() => removeFolder(folder));

function loggedEvents()
{
    return readLogFile(folder);
}

describe("rpg roll", () => {
    it("rolls digital dice and logs the roll", async () => {
        writeFileSync(join(folder, "campaign.yaml"), "name: Test\nmaster-rolls: in view\n");
        const result = await runCommandLine(["roll", "2d6+1", "--why", "damage", "--who", "Lena"], context);
        expect(result).toEqual({ exitCode: 0, output: "id1 Lena, damage: 2d6+1 = 9 [4, 4] + 1" });
        expect(loggedEvents()).toEqual([
            {
                id: "id1",
                at: "2026-10-02T10:00:00.000Z",
                type: "roll",
                by: "master",
                visibility: "public",
                data: { notation: "2d6+1", total: 9, result: "2d6+1 = 9 [4, 4] + 1", why: "damage", who: "Lena", physical: false, dice: [{ sides: 6, value: 4 }, { sides: 6, value: 4 }] },
            },
        ]);
    });

    it("rolls twice the dice and the same numbers with double, as a critical hit's damage (D-449)", async () => {
        const result = await runCommandLine(["roll", "1d8+d6+3", "--double", "--values", "5,7,2,6"], context);
        expect(result.output).toBe("id1 2d8+2d6+3 = 23 [5, 7] + [2, 6] + 3 (physical dice)");
        const upper = await runCommandLine(["roll", "1D8+3", "--double", "--values", "4,6"], context);
        expect(upper.output).toBe("id2 2D8+3 = 13 [4, 6] + 3 (physical dice)");
    });

    it("uses the faces of physical dice and refuses impossible ones", async () => {
        const good = await runCommandLine(["roll", "1d20+5", "--values", "14"], context);
        expect(good.output).toBe("id1 1d20+5 = 19 [14] + 5 (physical dice)");

        const impossible = await runCommandLine(["roll", "1d6", "--values", "9"], context);
        expect(impossible.exitCode).toBe(1);
        expect(impossible.output).toContain("Impossible value 9 on a d6");

        // PowerShell passes 14,7 as "14 7"
        const spaced = await runCommandLine(["roll", "2d20kh1", "--values", "14 7"], context);
        expect(spaced.output).toBe("id2 2d20kh1 = 14 [14, (7)] (physical dice)");

        expect(loggedEvents()).toHaveLength(2);
    });

    it("hides a roll behind a fingerprint and reveals it", async () => {
        const hidden = await runCommandLine(["roll", "1d20", "--hidden", "--why", "ambush"], context);
        expect(hidden.output).toContain("only for the master: 1d20 = 4 [4]");
        const shownFingerprint = /asks for it: ([0-9a-f]{16})/.exec(hidden.output)![1];

        const revealed = await runCommandLine(["roll", "--reveal", "id1"], context);
        expect(revealed.output).toContain("revealed: 1d20 = 4 [4]. Tell the player what it was for and what came out, in the story's words; give the proof only if they ask how to check it.");
        const proof = /Proof: (.*)/.exec(revealed.output)![1];
        expect(proof).toBe("id1|1d20 = 4 [4]|salt");
        expect(createHash("sha256").update(proof).digest("hex").startsWith(shownFingerprint)).toBe(true);

        await runCommandLine(["roll", "--reveal", "id1"], context);
        expect(loggedEvents().map((event) => [event.type, event.visibility])).toEqual([
            ["roll", "hidden"],
            ["roll-revealed", "public"],
        ]);
    });

    it("refuses to hide physical dice or reveal unknown rolls", async () => {
        expect((await runCommandLine(["roll", "1d20", "--hidden", "--values", "3"], context)).exitCode).toBe(1);
        expect((await runCommandLine(["roll", "--reveal", "nope"], context)).output).toContain("no hidden roll with id nope");
    });

    it("asks for the dice, or for either dice or a reveal", async () => {
        expect((await runCommandLine(["roll"], context)).output).toContain("Give the dice to roll");
        expect((await runCommandLine(["roll", "1d6", "--reveal", "id1"], context)).output).toContain("not both");
    });

    it("prints JSON on request", async () => {
        const result = await runCommandLine(["roll", "1d4", "--json"], context);
        expect(JSON.parse(result.output)).toMatchObject({ kind: "roll", id: "id1", total: 4 });
    });
});

describe("the master's rolls behind the screen (D-287)", () => {
    const screen = "Behind the screen, as master-rolls says: tell only the outcome, in the story.";

    async function rolled(...args: string[]): Promise<string>
    {
        const result = await runCommandLine(["roll", ...args], context);
        expect(result.exitCode, result.output).toBe(0);
        return result.output;
    }

    beforeEach(async () => {
        writeFileSync(join(folder, "state.yaml"), "mode: play\n");

        for (const [name, role] of [["Kira", "pc"], ["Bran", "companion"], ["Varro", "npc"]]) {
            await runCommandLine(["write", name, "--type", "character", "--set", `role=${role}`], context);
        }

        await runCommandLine(["write", "Lupo", "--type", "creature"], context);
    });

    it("hides by itself a roll for an NPC, a foe's copy in the scene or a name of no page, while the setting is unset or behind the screen", async () => {
        const npc = await rolled("1d20+4", "--who", "Varro", "--why", "mente");
        expect(npc).toMatch(new RegExp(`^Hidden roll (\\S+), only for the master: 1d20\\+4 = 8 \\[4\\] \\+ 4 ${screen.replace(/[.:]/g, "\\$&")}\\nIts fingerprint, only if the player asks for it: [0-9a-f]{16}$`));
        await runCommandLine(["scene", "open", "--title", "Nel bosco", "--type", "combat", "--creatures", "Lupo=1"], context);
        expect(await rolled("1d20+3", "--who", "Lupo 1")).toContain(screen);
        await runCommandLine(["config", "master-rolls", "behind the screen"], context);
        expect(await rolled("1d6", "--who", "la guardia")).toContain(screen);
        expect(loggedEvents().filter((event) => event.type === "roll").map((event) => [event.data.who, event.visibility, typeof event.data.fingerprint])).toEqual([
            ["Varro", "hidden", "string"],
            ["Lupo 1", "hidden", "string"],
            ["la guardia", "hidden", "string"],
        ]);
        const id = /^Hidden roll (\S+),/.exec(npc)?.[1] ?? "";
        expect(await rolled("--reveal", id)).toContain(`Hidden roll ${id} revealed: 1d20+4 = 8 [4] + 4.`);
    });

    it("never hides by itself the rolls of the player character and the companions, nor one of no one, nor the player's physical dice", async () => {
        expect(await rolled("1d20+2", "--who", "Kira")).toBe("id5 Kira: 1d20+2 = 6 [4] + 2");
        expect(await rolled("1d20", "--who", "Bran")).toBe("id6 Bran: 1d20 = 4 [4]");
        expect(await rolled("1d6", "--why", "oracolo")).toBe("id7 oracolo: 1d6 = 4 [4]");
        expect(await rolled("1d20", "--who", "Varro", "--values", "12")).toBe("id8 Varro: 1d20 = 12 [12] (physical dice)");
        expect(loggedEvents().filter((event) => event.type === "roll").every((event) => event.visibility === "public")).toBe(true);
    });

    it("shows a roll for an NPC in view, and an explicit hidden wins both ways", async () => {
        expect(await rolled("1d20", "--who", "Varro", "--no-hidden")).toBe("id5 Varro: 1d20 = 4 [4]");
        expect(await rolled("1d20", "--who", "Kira", "--hidden")).toMatch(/^Hidden roll id6, only for the master: 1d20 = 4 \[4\]\nIts fingerprint/);
        await runCommandLine(["config", "master-rolls", "in view"], context);
        expect(await rolled("1d20", "--who", "Varro")).toBe("id8 Varro: 1d20 = 4 [4]");
        expect(await rolled("1d20", "--who", "Varro", "--hidden")).not.toContain(screen);
        expect(loggedEvents().filter((event) => event.type === "roll").map((event) => event.visibility)).toEqual(["public", "hidden", "public", "hidden"]);
    });

    it("is asked in the setup, suggested behind the screen, never in play, and the player changes it in the Settings", async () => {
        writeFileSync(join(folder, "state.yaml"), "mode: setup\n");
        expect((await runCommandLine(["status"], context)).output).toContain("master-rolls (your rolls for foes and NPCs: behind the screen, in view; suggest behind the screen)");
        const setup = JSON.parse((await runCommandLine(["view", "--setup", "--json"], context)).output) as { questions: { name: string; value?: string; suggested?: string; }[]; };
        expect(setup.questions.find((question) => question.name === "master-rolls")).toMatchObject({ suggested: "behind the screen" });
        expect(setup.questions.find((question) => question.name === "master-rolls")).not.toHaveProperty("value");
        const settings = JSON.parse((await runCommandLine(["view", "--settings", "--json"], context)).output) as { settings: { name: string; value?: string; }[]; };
        expect(settings.settings.find((setting) => setting.name === "master-rolls")).toMatchObject({ value: "behind the screen" });
        writeFileSync(join(folder, "state.yaml"), "mode: play\n");
        expect((await runCommandLine(["status"], context)).output).not.toContain("master-rolls");
        expect((await runCommandLine(["config", "master-rolls", "in view"], { ...context, actor: "player" })).exitCode).toBe(0);
        expect((await runCommandLine(["config", "master-rolls", "aperti"], context)).exitCode).toBe(1);
    });
});

describe("rpg", () => {
    it("lists the commands and explains each one", async () => {
        expect((await runCommandLine([], context)).output).toContain("roll");
        expect((await runCommandLine(["roll", "--help"], context)).output).toContain("--hidden");
    });

    it("rejects unknown commands and options", async () => {
        expect((await runCommandLine(["fly"], context)).exitCode).toBe(1);
        expect((await runCommandLine(["roll", "1d6", "--loud"], context)).exitCode).toBe(1);
    });
});
