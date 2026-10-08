import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

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
    return (await rpg("status")).output;
}

describe("rpg status", () => {
    it("says the mode and what the setup still needs before the game starts, and leaves the instructions to their own command (MOD-7)", async () => {
        const status = await state();
        expect(status).toMatch(/^Guadoscuro · mode setup\nStill to agree with the player: system \(installed: 5e, ironsworn\), language \(a code, such as it\), premise \(/);
        expect(status).toMatch(/veils \("none" is an answer\); set each with config\. When none is left and the player confirms: mode, to "session zero"\.\nNo player character yet\.$/);
        const file = (name: string): string => readFileSync(new URL(`../instructions/${name}`, import.meta.url), "utf8").replace(/\r\n/g, "\n").trim();
        expect((await rpg("instructions")).output).toBe(`${file("core.md")}\n\n${file("setup.md")}`);
    });

    it("shows the party, where they are, their counters and who is with them", async () => {
        inPlay(folder);
        await rpg("config", "language", "it");
        await rpg("config", "system", "5e");
        await rpg("config", "difficulty", "normal");
        await rpg("config", "lethality", "epic");
        await rpg("config", "lines", "--add", "harm to children");
        await rpg("config", "table", "--add", "rolls shown as they fall");
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
            "Guadoscuro · it · 5e, the fifth edition from the SRD 5.1, the 2014 rules · difficulty normal · lethality epic · saves checkpoint · rigor smooth · dice digital · units metric · mode play",
            "Difficulty normal: fights medium to hard; foes with sensible tactics, average toughness, normal morale; three clues to every conclusion; resources standard (treasure, supplies, prices); "
            + "random encounters normal; threat clocks at their pace.",
            "Rigor smooth: you gloss over food and water, light, encumbrance, fatigue, spell components and the like: count them only when the story turns on them.",
            "Still missing: advancement (xp or milestones). Ask the player, then set it with the config command (setting and value).",
            "Lines: harm to children · Veils: none",
            "Table: rolls shown as they fall",
            "PC: Ennio, in Laboratorio › Cripta: hp 5/12 · arrows 18",
            "Companions: Lena, with Ennio: hp 7/7",
            "Ennio's sheet still lacks, by these names: classes, xp, str, dex, con, int, wis, cha, speed, hp-base, save-proficiencies, skill-proficiencies, weapon-proficiencies, languages.",
            "Lena's sheet still lacks, by these names: classes, xp, str, dex, con, int, wis, cha, speed, hp-base, save-proficiencies, skill-proficiencies, weapon-proficiencies, languages.",
            "Also there: Varro (dead)",
            "Open quests: Ritrovare gli scomparsi",
            "Planned events: Il rituale",
        ].join("\n"));
    });

    it("shows the game date, the events that are due, and the planned ones in order, with how long until then", async () => {
        inPlay(folder);
        await rpg("write", "Ennio", "--type", "character", "--set", "role=pc");
        await rpg("write", "Il drago si sveglia", "--type", "event");
        await rpg("write", "Il rituale", "--type", "event", "--set", "status=planned", "--set", "date=day 2, 23:00");
        await rpg("write", "Sparizione di Rosa", "--type", "event", "--set", "status=planned", "--set", "date=day 1, 23:00");
        await rpg("write", "La fiera", "--type", "event", "--set", "status=planned", "--set", "date=day 3, 06:00");
        await rpg("write", "La festa", "--type", "event", "--set", "status=cancelled", "--set", "date=day 1, 20:00");
        expect(await state()).toBe(
            [
                "Guadoscuro · saves checkpoint · rigor smooth · dice digital · units metric · mode play",
                "Rigor smooth: you gloss over food and water, light, encumbrance, fatigue, spell components and the like: count them only when the story turns on them.",
                "Still missing: system (installed: 5e, ironsworn), language, difficulty, lethality. Ask the player, then set each one with the config command (setting and value).",
                "No game date yet: at the first scene, set it with advance to, at the scene's hour, such as day 1, 18:00.",
                "PC: Ennio",
                "Planned events: Sparizione di Rosa (day 1, 23:00) · Il rituale (day 2, 23:00) · La fiera (day 3, 06:00), and 1 more: find text planned, type event",
            ].join("\n"),
        );

        await rpg("advance", "--to", "day 1, 23:00");
        expect(await state()).toContain([
            "Now: day 1, 23:00",
            "PC: Ennio",
            "Due: Sparizione di Rosa (day 1, 23:00). If the characters see or hear it, play it as a scene; if not, it happens off screen, and they will find its traces. Then set its status: happened if it went as written, cancelled if it never will; or give it a later date if it is put off or tried again.",
            "Planned events: Il rituale (day 2, 23:00, in 1d) · La fiera (day 3, 06:00, in 1d 7h) · Il drago si sveglia",
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

    it("puts first the open quests whose goals are all ticked, and asks whether their story is over (D-239)", async () => {
        await rpg("write", "Ennio", "--type", "character", "--set", "role=pc");
        await rpg("write", "Altra", "--type", "quest", "--set", "status=open", "--text=- [x] Uno\n- [ ] Due");
        await rpg("write", "Il pozzo", "--type", "quest", "--set", "status=open", "--text", "Trovare l'acqua.\n\n- [x] Scendere\n- [X] Riempire il secchio");
        await rpg("write", "Senza compiti", "--type", "quest", "--set", "status=open");
        await rpg("write", "Non presa", "--type", "quest", "--text=- [x] Fatto");
        expect(await state()).toContain("Open quests: Il pozzo (every goal ticked: if the story has ended it, write status done) · Altra · Senza compiti");
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
