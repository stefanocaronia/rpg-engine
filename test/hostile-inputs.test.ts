// Inputs an AI may give that the commands' own tests do not (D-537): a field named as an object's own property, dice out of their bounds in brackets, two
// names where one goes. Each is a field like any other, or a refusal that says what to give.
import { chmodSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { write } from "../src/commands/write.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, readLogFile, testContext } from "./support.ts";

let context: Context;

const rpg = async (...args: string[]): Promise<{ output: string; exitCode: number; }> => await runCommandLine(args, context);

beforeEach(async () => {
    const folder = makeTempFolder();
    context = testContext(folder);
    await rpg("init", "--name", "Guadoscuro", "--language", "en", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await rpg("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "grit=10/10", "--set", "vocations=[[Scout]] 2");
});

describe("inputs the commands must not trip on", () => {
    it("writes a list field named constructor as any other", async () => {
        const result = await write.run(write.input.parse({ page: "Ettore", add: { constructor: "x" } }), context);
        expect(write.format(result)).toContain("Updated Ettore");
    });

    it("says what is wrong with dice out of their bounds in brackets, not to put the brackets there", async () => {
        const changed = await rpg("change", "Ettore", "grit", "--by=-(1d1-5)");
        expect(changed.exitCode).toBe(1);
        expect(changed.output).toContain("does not read as a roll: ");
        expect(changed.output).not.toContain("put the whole roll in brackets");
    });

    it("marks a turn's use for one at a time", async () => {
        await rpg("write", "Vespa", "--type", "character", "--set", "role=companion");
        await rpg("scene", "open", "--title", "Cripta", "--type", "combat", "--with", "Ettore", "--with", "Vespa");
        await rpg("scene", "order", "--order", "Ettore", "--order", "Vespa");
        const used = await rpg("scene", "use", "--who", "Ettore", "--who", "Vespa", "--uses", "attack");
        expect(used.exitCode).toBe(1);
        expect(used.output).toContain("One at a time: give who as one name, then use again for Vespa.");
    });
});

describe("a reveal that stops half way", () => {
    it("logs what those before learned, and says what to fix, so that the diary knows who learned it", async () => {
        const folder = context.folder;
        await rpg("write", "Bruna", "--type", "character", "--set", "role=companion");
        await rpg("write", "Coppa", "--type", "item");
        await rpg("write", "Coppa#Veleno", "--secret", "--text", "The wine is poisoned.");
        const bruna = join(folder, "world", "characters", "Bruna.md");
        chmodSync(bruna, 0o444);

        try {
            const revealed = await rpg("reveal", "Coppa#Veleno", "--to", "Ettore", "--to", "Bruna");
            expect(revealed.exitCode).toBe(1);
            expect(revealed.output).toContain("Bruna's page could not be written");
            expect(revealed.output).toContain("Ettore learned it, and the log says so. Fix the file, then reveal it again for Bruna.");
            expect(readLogFile(folder).filter((entry) => entry.type === "learned").map((entry) => entry.data.page)).toEqual(["Ettore"]);
        } finally {
            chmodSync(bruna, 0o666);
        }
    });
});
