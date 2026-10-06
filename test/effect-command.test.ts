// Conditions and effects with a duration, through the commands (MECCANICHE, EFF-1–EFF-12).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, playerStop, playerTurn, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
    await ok("write", "Ossario", "--type", "place", "--set", "contains=[[Ennio]], [[Lena]]");
    await ok("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "hp=12/12", "--set", "ac=13");
    await ok("write", "Lena", "--type", "character", "--set", "role=companion", "--set", "hp=9/9");
    await ok("write", "Annegato", "--type", "creature", "--set", "hp=22/22", "--set", "ac=11");
    await ok("advance", "--to", "day 1, 18:00");
});

afterEach(() => removeFolder(folder));

function rpg(...args: string[])
{
    return runCommandLine(args, context);
}

async function ok(...args: string[]): Promise<string>
{
    const result = await rpg(...args);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

function page(path: string): string
{
    return readFileSync(join(folder, "world", path), "utf8");
}

async function combat(): Promise<void>
{
    await ok("scene", "open", "--title", "Scontro", "--type", "combat", "--creatures", "Annegato=2");
    await ok("scene", "order", "--order", "Ennio", "--order", "Annegato 1", "--order", "Lena", "--order", "Annegato 2");
}

describe("effect add and end (EFF-1, EFF-4, EFF-5)", () => {
    it("adds an effect with a duration in time and its values, written as a line, and says what changes", async () => {
        expect(await ok("effect", "add", "Ennio", "Scudo della fede", "--for", "10m", "--set", "ac=15", "--why", "preghiera")).toBe("Ennio: Scudo della fede until day 1, 18:10; ac 13 → 15.");
        expect(page("characters/Ennio.md")).toBe('---\nrole: pc\nhp: 12/12\nac: 13\neffects:\n  - "Scudo della fede (ac: 15) until day 1, 18:10"\n---\n');
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "effect-added", visibility: "public", data: { page: "Ennio", effect: "Scudo della fede (ac: 15) until day 1, 18:10", why: "preghiera" } });
    });

    it("adds one that lasts until it is ended, replaces one with the same name, and ends one by name", async () => {
        expect(await ok("effect", "add", "Ennio", "Maledizione della palude")).toBe("Ennio: Maledizione della palude, until it is ended.");
        await ok("effect", "add", "Ennio", "Scudo della fede", "--for", "10m", "--set", "ac=15");
        expect(await ok("effect", "add", "Ennio", "scudo della fede", "--for", "1h", "--set", "ac=16")).toBe(
            "Ennio: scudo della fede until day 1, 19:00; ac 15 → 16. It takes the place of Scudo della fede (ac: 15) until day 1, 18:10.",
        );
        expect(await ok("effect", "end", "Ennio", "SCUDO DELLA FEDE")).toBe("Ennio: scudo della fede ended; ac 16 → 13.");
        expect((await rpg("effect", "end", "Ennio", "Prono")).output).toBe("Ennio has no effect named Prono. Its effects: Maledizione della palude.");
        await ok("effect", "end", "Ennio", "Maledizione della palude");
        expect(page("characters/Ennio.md")).not.toContain("effects");
    });

    it("refuses values on fixed fields, lists, lines that would not read back, and time without a game date", async () => {
        expect((await rpg("effect", "add", "Ennio", "Morte apparente", "--set", "status=dead")).output).toBe("An effect gives values to counters and free fields, such as ac=15, not to status.");
        expect((await rpg("effect", "add", "Ennio", "Attesa until dawn")).output).toBe('The name Attesa until dawn has "until" in it: give the end with for or until, not in the name.');
        expect((await rpg("effect", "add", "Ennio", "Armatura (ac: 15)")).output).toBe("Give the values with set, not in the name, such as name Armatura, set ac=15.");
        expect((await rpg("effect", "add", "Ennio", "Scudo", "--set", "ac=+2")).output).toBe('ac on Ennio is a number, 13: give the value it reads while the effect lasts, such as ac=15, not "+2". Nothing changed.');
        expect((await rpg("effect", "add", "Ennio", "Scudo", "--set", "ac=15", "--set", "AC=17")).output).toBe("AC is given twice: give each value once.");
        expect((await rpg("effect", "add", "Ennio", "Strano", "--set", "x=[[1], [2]]")).output).toContain("would be a list inside a list");
        expect(page("characters/Ennio.md")).not.toContain("effects");
        expect((await rpg("effect", "add", "Ennio", "Volo", "--for", "presto")).output).toBe(
            '"presto" is not a duration: write it as 10m, 1h or 1d 6h, as rounds such as 1 round or 10 rounds, or scene, or an occasion of the system 5e: long rest, short rest.',
        );
        expect((await rpg("effect", "add", "Ennio", "Volo", "--for", "2 rounds")).output).toBe("Rounds are counted in a scene with turns: open one with scene open, then set the order, or give a duration in time, such as 1m.");
        await ok("scene", "open", "--title", "Calma", "--type", "social");
        expect((await rpg("effect", "add", "Ennio", "Volo", "--for", "2 rounds")).output).toBe("Rounds are counted in a scene with turns: set the order with scene order, or give a duration in time, such as 1m.");
    });

    it("refuses a duration in time before the game has a date", async () => {
        writeFileSync(join(folder, "state.yaml"), "date:\n");
        expect((await rpg("effect", "add", "Ennio", "Volo", "--for", "1h")).output).toBe(
            'The game has no date yet, so a duration in time cannot end: set the date with advance to, such as "day 1, 18:00", or count the effect in rounds.',
        );
    });
});

describe("the end of effects (EFF-8, EFF-9)", () => {
    it("ends effects in time when advance reaches their end, saying what comes back, without stopping", async () => {
        await ok("effect", "add", "Ennio", "Scudo della fede", "--for", "10m", "--set", "ac=15");
        expect(await ok("advance", "--by", "5m")).toBe("day 1, 18:00 → day 1, 18:05.");
        expect(await ok("advance", "--by", "1h")).toBe("day 1, 18:05 → day 1, 19:05.\nEnded: Scudo della fede on Ennio (ac 15 → 13).");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "effect-ended", visibility: "public", data: { page: "Ennio", effect: "Scudo della fede", why: "time passed" } });
    });

    it("ends effects in rounds when the turn comes back to whose turn it was, and the rest with the scene", async () => {
        await combat();
        expect(await ok("effect", "add", "Annegato 2", "Spaventato", "--for", "1 round")).toBe("Annegato 2: Spaventato until round 2, Ennio.");
        await ok("effect", "add", "Lena", "Benedetta", "--for", "3 rounds", "--set", "hp=12/12");

        for (let turn = 0; turn < 3; turn++) {
            await ok("scene", "next");
        }

        expect(await ok("scene", "next")).toBe(`Round 2 · now Ennio${playerTurn} (then Annegato 1)${playerStop}\nEnded: Spaventato on Annegato 2.`);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "effect-ended", visibility: "hidden", data: { page: "Annegato 2", copy: true, effect: "Spaventato" } });
        expect(await ok("scene", "close", "--summary", "Vinto.")).toContain("\nEnded with the scene: Benedetta on Lena (hp 12/12 → 9/9).");
    });

    it("ends an effect at the start of its round when whose turn ends it has left the order", async () => {
        await combat();
        await ok("effect", "add", "Ennio", "Schivata", "--for", "1 round");
        await ok("scene", "leave", "--who", "Ennio");
        await ok("scene", "next");
        await ok("scene", "next");
        expect(await ok("scene", "next")).toBe("Round 2 · now Annegato 1 (then Lena).\nEnded: Schivata on Ennio.");
    });

    it("lets a copy that leaves take its effects with it", async () => {
        await combat();
        await ok("effect", "add", "Annegato 1", "Prono");
        expect(await ok("scene", "leave", "--who", "Annegato 1")).toBe(`Annegato 1 (hp 22/22) left the scene.\nRound 1 · now Ennio${playerTurn} (then Lena)${playerStop}`);
        expect(readFileSync(join(folder, "state.yaml"), "utf8")).not.toContain("Prono");
    });
});

describe("the layer of values (EFF-3, EFF-6, EFF-7, EFF-10)", () => {
    it("changes a value an effect gives on the effect, and the page's own comes back when it ends", async () => {
        await ok("effect", "add", "Ennio", "Forma d'orso", "--set", "hp=34/34", "--set", "speed=40 ft");
        expect(await ok("change", "Ennio", "hp", "--by=-10")).toBe("Ennio: hp 34/34 → 24/34: in Forma d'orso.");
        expect(page("characters/Ennio.md")).toContain('effects:\n  - "Forma d\'orso (hp: 24/34, speed: 40 ft)"');
        expect(page("characters/Ennio.md")).toContain("hp: 12/12");
        expect(await ok("status")).toContain("PC: Ennio, in Ossario: hp 24/34 · ac 13 · Forma d'orso");
        expect(await ok("show", "Ennio")).toContain("While they last: hp 24/34 (12/12 without), speed 40 ft (none without)");
        expect(await ok("effect", "end", "Ennio", "Forma d'orso")).toBe("Ennio: Forma d'orso ended; hp 24/34 → 12/12, speed 40 ft → none.");
    });

    it("refuses to change effects with write, on pages and copies", async () => {
        const refused = 'effects change only with the effect command: action add with a name, for how long and the values it gives, such as name "Scudo della fede", for 10m, set ac=15; action end to take one away. Nothing changed.';
        expect((await rpg("write", "Ennio", "--set", "effects=[Prono]")).output).toBe(refused);
        await combat();
        expect((await rpg("write", "Annegato 1", "--add", "effects=Prono")).output).toBe(refused);
    });

    it("never passes a creature's effects to its copies or the pages that derive from it (INH-8)", async () => {
        await ok("effect", "add", "Annegato", "Fradicio", "--set", "ac=9");
        await ok("write", "Vecchio annegato", "--type", "character", "--set", "creature=[[Annegato]]");
        expect(await ok("show", "Vecchio annegato")).not.toContain("Fradicio");
        await ok("scene", "open", "--title", "Scontro", "--type", "combat", "--creatures", "Annegato=1");
        expect(await ok("status")).toContain("copies: Annegato 1: hp 22/22");
        expect(await ok("status")).not.toContain("Fradicio");
    });

    it("shows the effects of the party and of the copies in status, with their end", async () => {
        await combat();
        await ok("effect", "add", "Lena", "Benedetta", "--for", "10 rounds");
        await ok("effect", "add", "Annegato 2", "Prono");
        const shown = await ok("status");
        expect(shown).toContain("Companions: Lena, with Ennio: hp 9/9 · Benedetta until round 11, Ennio");
        expect(shown).toContain("Annegato 2: hp 22/22 · Prono");
    });
});

describe("validate (EFF-12)", () => {
    it("reports lines that do not read, ends that are not game dates, effects ended and still there, and rounds without a scene", async () => {
        writeFileSync(join(folder, "world", "characters", "Lena.md"), '---\nrole: companion\neffects:\n  - "Prono"\n  - "prono"\n---\n');
        writeFileSync(
            join(folder, "world", "characters", "Ennio.md"),
            '---\nrole: pc\neffects:\n  - "Scudo della fede (ac: 15) until day 1, 10:00"\n  - "Volo until domani"\n  - "Schivata until round 2, Ennio"\n---\n',
        );
        expect((await rpg("validate")).output).toBe([
            "4 problems:",
            '- world/characters/Ennio.md: Scudo della fede on Ennio ended at day 1, 10:00, and is still there. Fix: let time pass with advance, which ends it, or effect end Ennio "Scudo della fede".',
            '- world/characters/Ennio.md: Volo on Ennio ends "domani", which is not a game date nor an occasion of the system 5e (long rest, short rest). Fix: effect end Ennio "Volo", then add it again with a duration.',
            '- world/characters/Ennio.md: Schivata on Ennio ends with the scene, but no scene is open. Fix: effect end Ennio "Schivata".',
            '- world/characters/Lena.md: Lena: The effect prono is written twice: keep one. Fix: write each line of effects in quotes, such as - "Scudo della fede (ac: 15) until day 2, 14:20", and each effect once; or remove them all with write Lena, unset effects, and add again with effect add those that still hold.',
        ].join("\n"));
    });
});

describe("who keeps an effect alive (D-138, EFF-13)", () => {
    it("writes who keeps it, shows it next to them in status, and ends at once every effect they keep", async () => {
        await combat();
        expect(await ok("effect", "add", "Ennio", "Benedizione", "--for", "10 rounds", "--by", "Lena")).toBe("Ennio: Benedizione until round 11, Ennio.");
        await ok("effect", "add", "Annegato 1", "Benedizione", "--by", "[[Lena]]");
        await ok("effect", "add", "Annegato 2", "Paura", "--by", "Annegato 1");
        expect(page("characters/Ennio.md")).toContain('effects:\n  - "Benedizione (by: [[Lena]]) until round 11, Ennio"');
        expect(await ok("status")).toContain("Companions: Lena, with Ennio: hp 9/9 · keeps Benedizione (Ennio, Annegato 1)");
        expect(await ok("effect", "end", "--by", "Lena", "--why", "concentrazione persa")).toBe("Ended: Benedizione on Ennio · Benedizione on Annegato 1.");
        expect((await rpg("effect", "end", "--by", "Lena")).output).toBe("Lena keeps no effect alive.");
        expect(await ok("effect", "end", "--by", "Annegato 1")).toBe("Ended: Paura on Annegato 2.");
    });

    it("refuses end with more than the page and the name, or without them", async () => {
        await ok("effect", "add", "Ennio", "Prono");
        expect((await rpg("effect", "end", "Ennio", "Prono", "--for", "1h")).output).toBe("end takes the page and the effect's name, or by alone: nothing else.");
        expect((await rpg("effect", "end")).output).toBe("Give the page and the effect's name, such as page Ennio, name Benedizione; or only by, to end every effect someone keeps alive.");
        expect((await rpg("effect", "add", "Ennio", "Prono", "--by", "Nessuno")).output).toContain("There is no page named Nessuno");
    });
});

describe("other ends (EFF-4, EFF-9)", () => {
    it("ends at the start of someone's next turn, this round when it is still to come, else the next", async () => {
        await combat();
        await ok("scene", "next");
        expect(await ok("effect", "add", "Ennio", "Scudo", "--until", "Ennio", "--set", "ac=18")).toBe("Ennio: Scudo until round 2, Ennio; ac 13 → 18.");
        expect(await ok("effect", "add", "Lena", "Aiutata", "--until", "[[Lena]]")).toBe("Lena: Aiutata until round 1, Lena.");
        expect((await rpg("effect", "add", "Lena", "Altro", "--until", "Bruno")).output).toBe("Bruno takes no turn in this scene. The order: Ennio, Annegato 1, Lena, Annegato 2.");
        expect((await rpg("effect", "add", "Lena", "Altro", "--until", "Lena", "--for", "1 round")).output).toBe("Give for or until, not both.");
        expect(await ok("scene", "next")).toBe("Round 1 · now Lena (then Annegato 2).\nEnded: Aiutata on Lena.");
    });

    it("lasts the scene, and ends with it; refused without a scene", async () => {
        expect((await rpg("effect", "add", "Ennio", "Ira", "--for", "scene")).output).toBe("No scene is open: an effect that lasts the scene needs one. Open it with scene open, or give a duration such as 10m.");
        await ok("scene", "open", "--title", "Trattativa", "--type", "social");
        expect(await ok("effect", "add", "Ennio", "Ira", "--for", "scene")).toBe("Ennio: Ira until scene end.");
        expect(await ok("scene", "close", "--summary", "Accordo fatto.")).toContain("\nEnded with the scene: Ira on Ennio.");
    });

    it("turns a duration in time given in a scene with turns into rounds of the system, and warns where the system has no round (DAT-7)", async () => {
        await combat();
        expect(await ok("effect", "add", "Ennio", "Benedizione", "--for", "1m")).toBe("Ennio: Benedizione until round 11, Ennio. 1m is 10 rounds of 6 seconds.");
        writeFileSync(join(folder, "campaign.yaml"), readFileSync(join(folder, "campaign.yaml"), "utf8").replace("system: 5e", "system: ironsworn"));
        expect(await ok("effect", "add", "Ennio", "Ispirato", "--for", "1m")).toBe(
            "Ennio: Ispirato until day 1, 18:01. The scene counts turns, and time does not pass with them: if it should end during the turns, give it in rounds.",
        );
    });
});

describe("notes on values (EFF-3, EFF-4)", () => {
    it("says that a counter in an effect changes there and is lost at its end, and when a value goes over another effect's", async () => {
        expect(await ok("effect", "add", "Lena", "Aiuto", "--for", "8h", "--set", "hp=14/14")).toBe(
            "Lena: Aiuto until day 2, 02:00; hp 9/9 → 14/14. hp changes on Aiuto while it lasts, and at its end Lena reads hp 9/9 again: what must outlive it goes on the page, with change.",
        );
        await ok("effect", "add", "Ennio", "Velocità", "--set", "ac=15");
        expect(await ok("effect", "add", "Ennio", "Scudo della fede", "--set", "ac=17")).toBe("Ennio: Scudo della fede, until it is ended; ac 15 → 17. Its ac goes over Velocità (ac 15): write the value both give together.");
        expect(await ok("effect", "end", "Ennio", "Velocità")).toBe("Ennio: Velocità ended; ac stays 17, from Scudo della fede: check it.");
    });

    it("makes an effect added again with the same name the newest one", async () => {
        await ok("effect", "add", "Ennio", "Scudo", "--set", "ac=15");
        await ok("effect", "add", "Ennio", "Armatura", "--set", "ac=16");
        expect(await ok("effect", "add", "Ennio", "Scudo", "--set", "ac=18")).toBe(
            "Ennio: Scudo, until it is ended; ac 16 → 18. It takes the place of Scudo (ac: 15). Its ac goes over Armatura (ac 16): write the value both give together.",
        );
    });
});

describe("effects written by hand (EFF-1, EFF-12)", () => {
    it("reads lines written without quotes, and an Effects field in any case", async () => {
        writeFileSync(join(folder, "world", "characters", "Lena.md"), "---\nrole: companion\nhp: 9/9\nEffects:\n  - Maledetta (fiuto: 6) until day 9, 06:00\n---\n");
        expect(await ok("status")).toContain("Companions: Lena, with Ennio: hp 9/9 · fiuto 6 · Maledetta until day 9, 06:00");
        expect(await ok("effect", "add", "Lena", "Prona")).toBe("Lena: Prona, until it is ended.");
        expect(page("characters/Lena.md")).toBe('---\nrole: companion\nhp: 9/9\nEffects:\n  - "Maledetta (fiuto: 6) until day 9, 06:00"\n  - Prona\n---\n');
    });

    it("never writes over effects that do not read, and lets write remove them all", async () => {
        writeFileSync(join(folder, "world", "characters", "Lena.md"), '---\nrole: companion\neffects:\n  - "Prona"\n  - "prona"\n---\n');
        const refused = "Lena's effects do not read: The effect prona is written twice: keep one. Write each line in quotes by hand, or remove them all with write Lena, unset effects, and add again those that still hold. Nothing changed.";
        expect((await rpg("effect", "add", "Lena", "Benedetta")).output).toBe(refused);
        expect((await rpg("effect", "end", "Lena", "Prona")).output).toBe(refused);
        expect(await ok("write", "Lena", "--unset", "effects")).toBe("Updated Lena (character, world/characters/Lena.md): removed effects.");
        expect((await rpg("write", "Lena", "--unset", "effects")).output).toContain("effects change only with the effect command");
    });

    it("lets advance and the scene go on when a page that holds an ending effect shares its name with another", async () => {
        await ok("effect", "add", "Ennio", "Scudo della fede", "--for", "10m", "--set", "ac=15");
        writeFileSync(join(folder, "world", "Ennio.md"), "Una nota.\n");
        expect(await ok("advance", "--by", "1h")).toBe(
            "day 1, 18:00 → day 1, 19:00.\nEnded: Scudo della fede on Ennio: not written, Two pages have the same name: world/Ennio.md and world/characters/Ennio.md. Rename one of them by hand: names must be unique in the campaign..",
        );
        expect(readFileSync(join(folder, "state.yaml"), "utf8")).toContain("date: day 1, 19:00");
    });
});

describe("status shows the characters of the scene who are not of the party (EFF-10)", () => {
    it("with their counters and effects, as copies are shown", async () => {
        await ok("write", "Varro", "--type", "character", "--set", "role=npc", "--set", "hp=23/30");
        await ok("scene", "open", "--title", "Il mulino", "--type", "combat", "--with", "Ennio", "--with", "Varro");
        await ok("effect", "add", "Varro", "Prono");
        expect(await ok("status")).toContain("Scene: Il mulino (combat) at Ossario, with Ennio, Varro (hp 23/30 · Prono)");
    });
});

describe("the edges of the command, case by case", () => {
    it("ends at the start of the next turn of whose turn it is now, in the next round", async () => {
        await combat();
        expect(await ok("effect", "add", "Ennio", "Schivata", "--until", "Ennio")).toBe("Ennio: Schivata until round 2, Ennio.");
    });

    it("keeps an effect without an end through advance, the turns and validate", async () => {
        await ok("effect", "add", "Ennio", "Maledizione");
        expect(await ok("advance", "--by", "1d")).toBe("day 1, 18:00 → day 2, 18:00.");
        await combat();
        expect(await ok("scene", "next")).toBe("Round 1 · now Annegato 1 (then Lena).");
        await ok("effect", "add", "Lena", "Schivata", "--for", "1 round");
        expect((await rpg("validate")).output).toBe("No problems.");
        expect(await ok("scene", "close", "--summary", "Fatto.")).toBe(
            "Scene closed after 1 round: Scontro. Copies gone: Annegato 1: hp 22/22; Annegato 2: hp 22/22. Advance any time it took that you have not advanced yet.\nEnded with the scene: Schivata on Lena.\nStill there, with no end: Maledizione on Ennio. End those the scene ended, with effect end.",
        );
        expect(page("characters/Ennio.md")).toContain("Maledizione");
    });

    it("lists ten effects that end together at most, then how many more", async () => {
        await ok("scene", "open", "--title", "Sciame", "--type", "combat", "--creatures", "Annegato=12");

        for (let index = 1; index <= 12; index++) {
            await ok("effect", "add", `Annegato ${index}`, "Prono", "--for", "scene");
        }

        expect(await ok("scene", "close", "--summary", "Fatto.")).not.toContain("Prono on");
        await ok("scene", "open", "--title", "Sciame", "--type", "combat");

        for (const name of ["Ennio", "Lena"]) {
            await ok("effect", "add", name, "Benedetta", "--for", "scene");
        }

        expect(await ok("scene", "close", "--summary", "Fatto.")).toContain("\nEnded with the scene: Benedetta on Ennio · Benedetta on Lena.");
    });

    it("logs an effect on a copy as hidden, refuses an empty name, and says nothing for a value equal to the page's", async () => {
        await combat();
        await ok("effect", "add", "Annegato 1", "Prono", "--why", "");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "effect-added", visibility: "hidden", data: { page: "Annegato 1", copy: true, effect: "Prono" } });
        expect(readLogFile(folder).at(-1)?.data.why).toBeUndefined();
        expect((await rpg("effect", "add", "Ennio", "  ")).output).toBe("Give the page and the effect's name, such as page Ennio, name Benedizione.");
        expect(await ok("effect", "add", "Ennio", "Vigile", "--set", "ac=13")).toBe("Ennio: Vigile, until it is ended.");
        expect(await ok("effect", "end", "Ennio", "Vigile")).toBe("Ennio: Vigile ended.");
        await ok("effect", "add", "Lena", "Benedetta", "--by", "Lena");
        await ok("effect", "end", "--by", "Lena");
        expect(readLogFile(folder).at(-1)?.data).toEqual({ page: "Lena", effect: "Benedetta", why: "Lena stopped keeping them" });
    });

    it("validate finds no problem in effects that end with an open scene", async () => {
        await combat();
        await ok("effect", "add", "Ennio", "Ira", "--for", "scene");
        await ok("effect", "add", "Lena", "Schivata", "--for", "1 round");
        expect((await rpg("validate")).output).toBe("No problems.");
    });
});

describe("many effects ending together", () => {
    it("lists ten at most, then how many more", async () => {
        await ok("scene", "open", "--title", "Festa", "--type", "social");

        for (let index = 1; index <= 11; index++) {
            const name = `Ospite ${String(index).padStart(2, "0")}`;
            await ok("write", name, "--type", "character", "--set", "role=npc");
            await ok("effect", "add", name, "Allegro", "--for", "scene");
        }

        const closed = await ok("scene", "close", "--summary", "Fatto.");
        expect(closed).toContain("Ended with the scene: Allegro on Ospite 01 · ");
        expect(closed).toContain("Allegro on Ospite 10, and 1 more.");
    });
});

describe("what a copy keeps alive (D-145, EFF-13)", () => {
    it("ends when the copy leaves the scene or the scene closes, and the close lists the effects left with no end", async () => {
        await combat();
        await ok("effect", "add", "Ennio", "Afferrato", "--by", "Annegato 1");
        await ok("effect", "add", "Lena", "Afferrata", "--by", "Annegato 2");
        await ok("effect", "add", "Ennio", "Prono");
        expect(await ok("scene", "leave", "--who", "Annegato 1")).toContain("\nEnded: Afferrato on Ennio.");
        expect(page("characters/Ennio.md")).not.toContain("Afferrato");
        expect(readLogFile(folder).find((entry) => entry.type === "effect-ended")).toMatchObject({ data: { page: "Ennio", effect: "Afferrato", why: "who kept it left" } });

        const closed = await ok("scene", "close", "--summary", "Fuggiti.");
        expect(closed).toContain("\nEnded with the scene: Afferrata on Lena.\nStill there, with no end: Prono on Ennio. End those the scene ended, with effect end.");
        expect(page("characters/Lena.md")).not.toContain("Afferrata");
        expect(page("characters/Ennio.md")).toContain("Prono");
    });
});
