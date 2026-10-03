import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro"], context);
});

afterEach(() => removeFolder(folder));

function rpg(...args: string[])
{
    return runCommandLine(args, context);
}

async function state(): Promise<string>
{
    return (await rpg("status")).output.split("\n\n# Your instructions")[0];
}

describe("rpg status", () => {
    it("says what is missing before the game starts, and gives the full instructions", async () => {
        const output = (await rpg("status")).output;
        expect(output.split("\n\n# Your instructions")[0]).toBe("Guadoscuro\nStill missing: language, system. Ask the player, then set each one with the config command (setting and value).\nNo player character yet.");
        expect(output).toContain(`# Your instructions\n\n${readFileSync(new URL("../instructions/core.md", import.meta.url), "utf8").trim()}`);
    });

    it("shows the party, where they are, their counters and who is with them", async () => {
        await rpg("config", "language", "it");
        await rpg("config", "system", "5e");
        await rpg("config", "lines", "--add", "harm to children");
        await rpg("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "hp=5/12", "--set", "arrows=18");
        await rpg("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "hp=7/7");
        await rpg("write", "Varro", "--type", "character", "--set", "role=npc", "--set", "status=dead");
        await rpg("write", "Gaspare", "--type", "character", "--set", "role=npc");
        await rpg("write", "Laboratorio", "--type", "place", "--add", "contains=[[Ennio]]", "--add", "contains=[[Lena]]", "--add", "contains=[[Varro]]");
        await rpg("write", "Cripta", "--type", "place", "--add", "contains=[[Laboratorio]]");
        await rpg("write", "Locanda", "--type", "place", "--add", "contains=[[Gaspare]]");
        await rpg("write", "Ritrovare gli scomparsi", "--type", "quest", "--set", "status=open");
        await rpg("write", "Ritrovare la lanterna", "--type", "quest");
        await rpg("write", "Il rituale", "--type", "event", "--set", "status=planned");

        expect(await state()).toBe([
            "Guadoscuro · it · 5e",
            "Lines: harm to children · Veils: none",
            "PC: Ennio, in Laboratorio › Cripta: hp 5/12 · arrows 18",
            "Companions: Lena, with Ennio: hp 7/7",
            "Also there: Varro (dead)",
            "Open quests: Ritrovare gli scomparsi",
            "Planned events: Il rituale",
        ].join("\n"));
    });

    it("shows three names per list and says how to find the rest", async () => {
        await rpg("write", "Ennio", "--type", "character", "--set", "role=pc");
        await rpg("write", "Chiusa", "--type", "quest", "--set", "status=done");

        for (const name of ["Uno", "Due", "Tre", "Quattro", "Cinque"]) {
            await rpg("write", name, "--type", "quest", "--set", "status=open");
        }

        expect(await state()).toContain("Open quests: Cinque · Due · Quattro, and 2 more: find text open, type quest");
        expect((await rpg("find", "open", "--type", "quest")).output.split("\n").filter((line) => line.startsWith("Uno") || line.startsWith("Tre"))).toHaveLength(2);
        expect((await rpg("find", "open", "--type", "quest")).output).not.toContain("Chiusa");
    });

    it("marks the dead, shows the companions before a character exists, and says with whom only when they share a place", async () => {
        await rpg("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "hp=0/7", "--set", "status=dead");
        expect(await state()).toContain("No player character yet.\nCompanions: Lena (dead): hp 0/7");

        await rpg("write", "Ennio", "--type", "character", "--set", "role=pc");
        expect(await state()).toContain("PC: Ennio\nCompanions: Lena (dead): hp 0/7");
    });

    it("counts the files it cannot read, without showing what is in them", async () => {
        writeFileSync(join(folder, "world", "characters", "Lidia.md"), "---\n> [!secret] La sorella\nÈ viva.\n---\n");
        const output = await state();
        expect(output).toContain("1 problem in the campaign: validate lists them, with how to fix each.");
        expect(output).not.toContain("sorella");
    });

    it("never shows the text of pages, and writes nothing to the log", async () => {
        await rpg("write", "Ennio", "--type", "character", "--set", "role=pc", "--text", "Ex soldato.\n\n> [!secret] La sorella\n> È viva.");
        const lines = readLogFile(folder).length;
        const output = await state();
        expect(output).not.toContain("soldato");
        expect(output).not.toContain("viva");
        expect(readLogFile(folder)).toHaveLength(lines);
    });
});
