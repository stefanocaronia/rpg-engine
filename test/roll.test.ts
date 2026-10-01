import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.js";
import type { Context } from "../src/core/context.js";

let folder: string;
let context: Context;

beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "rpg-test-"));
    let idCount = 0;
    context = {
        folder,
        random: () => 4,
        now: () => new Date("2026-10-02T10:00:00Z"),
        newId: () => `id${++idCount}`,
        newSalt: () => "salt",
    };
});

afterEach(() => rmSync(folder, { recursive: true, force: true }));

function loggedEvents()
{
    return readFileSync(join(folder, "events.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
}

describe("rpg roll", () => {
    it("rolls digital dice and logs the roll", async () => {
        const result = await runCommandLine(["roll", "2d6+1", "--why", "damage", "--who", "Galdrak"], context);
        expect(result).toEqual({ exitCode: 0, output: "id1 Galdrak, damage: 2d6+1 = 9 [4, 4] + 1" });
        expect(loggedEvents()).toEqual([
            {
                id: "id1",
                at: "2026-10-02T10:00:00.000Z",
                type: "roll",
                visibility: "public",
                data: { notation: "2d6+1", total: 9, result: "2d6+1 = 9 [4, 4] + 1", why: "damage", who: "Galdrak", physical: false },
            },
        ]);
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
        const shownFingerprint = /fingerprint: ([0-9a-f]{16})/.exec(hidden.output)![1];

        const revealed = await runCommandLine(["roll", "--reveal", "id1"], context);
        const proof = /Proof: (.*)/.exec(revealed.output)![1];
        expect(proof).toBe("id1|1d20 = 4 [4]|salt");
        expect(createHash("sha256").update(proof).digest("hex").startsWith(shownFingerprint)).toBe(true);

        await runCommandLine(["roll", "--reveal", "id1"], context);
        expect(loggedEvents().map((event) => [event.type, event.visibility])).toEqual([
            ["roll", "hidden"],
            ["reveal", "public"],
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
