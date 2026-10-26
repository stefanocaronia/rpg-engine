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
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
});

afterEach(() => removeFolder(folder));

// What advance and status say to do with due events (D-106).
const one =
    "If the characters see or hear it, play it as a scene; if not, it happens off screen, and they will find its traces. Then set its status: happened if it went as written, cancelled if it never will; or give it a later date if it is put off or tried again. If what it needs is gone, cancel it, or let whoever wanted it try another way; never bend the world back to the written story.";
const many =
    "Play as scenes those the characters see or hear; the others happen off screen, and they will find their traces. Then set each one's status: happened if it went as written, cancelled if it never will; or give it a later date if it is put off or tried again. If what it needs is gone, cancel it, or let whoever wanted it try another way; never bend the world back to the written story.";

function rpg(...args: string[])
{
    return runCommandLine(args, context);
}

async function event(name: string, status: string, date: string, place?: string): Promise<void>
{
    const result = await rpg("write", name, "--type", "event", "--set", `status=${status}`, "--set", `date=${date}`, ...(place === undefined ? [] : ["--set", `place=[[${place}]]`]));
    expect(result.exitCode, result.output).toBe(0);
}

function stateFile(): string
{
    return readFileSync(join(folder, "state.yaml"), "utf8");
}

function writeByHand(path: string, text: string): void
{
    writeFileSync(join(folder, path), text);
}

describe("rpg advance", () => {
    it("needs a starting date first, set with to, and keeps the comment of state.yaml", async () => {
        const before = await rpg("advance", "--by", "2h");
        expect(before.exitCode).toBe(1);
        expect(before.output).toBe('The game has no date yet: set the date it starts on with to, such as to "day 1, 18:00".');

        expect((await rpg("advance", "--to", "day 1, 18:00", "--why", "arrivo a Guadoscuro")).output).toBe("The game starts on day 1, 18:00.");
        expect(stateFile()).toBe("# The present of the game, kept by rpg: mode, date and current scene.\nmode: play\ndate: day 1, 18:00\n");
        expect(readLogFile(folder).at(-1)).toEqual({ id: "id2", at: "2026-10-02T10:00:00.000Z", date: "day 1, 18:00", type: "time-advanced", by: "master", visibility: "public", data: { to: "day 1, 18:00", why: "arrivo a Guadoscuro" } });
    });

    it("lets time pass, and says which planned event comes next", async () => {
        await event("Il rituale della luna nuova", "planned", "day 2, 23:00", "Sala del rituale");
        await rpg("advance", "--to", "day 1, 18:00");
        expect((await rpg("advance", "--by", "3h", "--why", "cena")).output).toBe("day 1, 18:00 → day 1, 21:00.\nNext: Il rituale della luna nuova (day 2, 23:00, in 1d 2h).");
        expect(readLogFile(folder).at(-1)).toMatchObject({ date: "day 1, 21:00", type: "time-advanced", visibility: "public", data: { from: "day 1, 18:00", to: "day 1, 21:00", requested: "3h", why: "cena" } });
    });

    it("stops at the first planned event that comes due, and reminds of it until its status changes", async () => {
        await event("Sparizione di Rosa", "planned", "day 1, 23:00", "Guadoscuro");
        await event("Il rituale della luna nuova", "planned", "day 2, 23:00");
        await event("Il rogo", "happened", "due inverni fa");
        await event("La festa", "cancelled", "day 1, 22:00");
        await rpg("advance", "--to", "day 1, 21:00");

        expect((await rpg("advance", "--by", "8h", "--why", "notte alla locanda")).output).toBe([
            "day 1, 21:00 → day 1, 23:00: stopped after 2h of 8h.",
            `Due: Sparizione di Rosa (day 1, 23:00, at Guadoscuro). ${one} Then advance the other 6h, if they are still doing what they were.`,
        ].join("\n"));
        expect(readLogFile(folder).at(-1)?.data).toEqual({ from: "day 1, 21:00", to: "day 1, 23:00", requested: "8h", why: "notte alla locanda" });

        expect((await rpg("advance", "--by", "6h")).output).toBe([
            "day 1, 23:00 → day 2, 05:00.",
            `Still due: Sparizione di Rosa (day 1, 23:00, at Guadoscuro). ${one}`,
            "Next: Il rituale della luna nuova (day 2, 23:00, in 18h).",
        ].join("\n"));

        await rpg("write", "Sparizione di Rosa", "--set", "status=happened");
        expect((await rpg("advance", "--to", "day 2, 06:00")).output).toBe("day 2, 05:00 → day 2, 06:00.\nNext: Il rituale della luna nuova (day 2, 23:00, in 17h).");
    });

    it("names every event due at the same moment, and stops at a date it is given", async () => {
        await event("La marcia", "planned", "day 3, 06:00", "Mulino abbandonato");
        await event("La nebbia si infittisce", "planned", "day 3, 06:00");
        await rpg("advance", "--to", "day 2, 22:00");
        expect((await rpg("advance", "--to", "day 3, 12:00")).output).toBe([
            "day 2, 22:00 → day 3, 06:00: stopped after 8h of 14h.",
            `Due: La marcia (day 3, 06:00, at Mulino abbandonato) · La nebbia si infittisce (day 3, 06:00). ${many} Then advance the other 6h, if they are still doing what they were.`,
        ].join("\n"));
    });

    it("does not ask for more time when the event falls at the end of what was asked", async () => {
        await event("Il rituale", "planned", "day 1, 23:00");
        await rpg("advance", "--to", "day 1, 21:00");
        expect((await rpg("advance", "--by", "2h")).output).toBe(`day 1, 21:00 → day 1, 23:00.\nDue: Il rituale (day 1, 23:00). ${one}`);
    });

    it("names the events already due when the game starts", async () => {
        await event("Sparizione di Rosa", "planned", "day 1, 06:00");
        await event("Il rituale della luna nuova", "planned", "day 2, 23:00");
        expect((await rpg("advance", "--to", "day 1, 18:00")).output).toBe([
            "The game starts on day 1, 18:00.",
            `Still due: Sparizione di Rosa (day 1, 06:00). ${one}`,
            "Next: Il rituale della luna nuova (day 2, 23:00, in 1d 5h).",
        ].join("\n"));
    });

    it("says which planned events it cannot stop at: dates it cannot read, and pages it cannot read", async () => {
        await rpg("advance", "--to", "day 1, 18:00");
        writeByHand("world/events/Parole.md", "---\nstatus: planned\ndate: la prima notte\n---\n");
        writeByHand("world/events/Rotto.md", "---\nstatus: planned\ndate: day 1, 20:00\nnota: *importante*\n---\n");
        const output = (await rpg("advance", "--by", "8h")).output;
        expect(output).toContain("day 1, 18:00 → day 2, 02:00.\nTime does not stop at these planned events, whose date is not a game date: Parole. Give each one a game date with write.");
        expect(output).toContain("These files could not be read as pages and were left out:\n- The frontmatter of world/events/Rotto.md is not valid YAML");
    });

    it("never goes back, and changes nothing when the date is already now", async () => {
        await rpg("advance", "--to", "day 1, 23:00");
        const lines = readLogFile(folder).length;

        const back = await rpg("advance", "--to", "day 1, 10:00");
        expect(back.exitCode).toBe(1);
        expect(back.output).toBe("day 1, 10:00 is before now, day 1, 23:00: time never goes back.");
        expect((await rpg("advance", "--to", "day 1, 23:00")).output).toBe("Nothing changed: it is already day 1, 23:00.");
        expect(readLogFile(folder)).toHaveLength(lines);
        expect(stateFile()).toContain("date: day 1, 23:00");
    });

    it("counts days only, for a game without hours", async () => {
        await event("Il voto scade", "planned", "day 3");
        expect((await rpg("advance", "--to", "day 1")).output).toBe("The game starts on day 1.\nNext: Il voto scade (day 3, in 2d).");
        expect((await rpg("advance", "--by", "1d")).output).toBe("day 1 → day 2.\nNext: Il voto scade (day 3, in 1d).");
        expect((await rpg("advance", "--by", "3d")).output).toContain("day 2 → day 3: stopped after 1d of 3d.");
        expect((await rpg("advance", "--by", "4h")).output).toContain("day 3 → day 3, 04:00.");
    });

    it("never goes past the last day it can read back", async () => {
        await rpg("advance", "--to", "day 999999999, 23:00");
        const result = await rpg("advance", "--by", "2h");
        expect(result.exitCode).toBe(1);
        expect(result.output).toBe("2h would go past day 999999999, the last game date the engine counts: let less time pass.");
        expect(stateFile()).toContain("date: day 999999999, 23:00");
    });

    it("says how to write what it cannot read", async () => {
        await rpg("advance", "--to", "day 1, 18:00");
        const refusals: [string[], string][] = [
            [["advance"], "Give one of by (how much time passes, such as 8h or 1d 6h) or to (the game date to reach, such as day 3, 06:00)."],
            [["advance", "--by", "2h", "--to", "day 2"], "Give one of by"],
            [["advance", "--by", "2 ore"], '"2 ore" is not a duration: write days, hours and minutes in this order, such as 10m, 4h or 1d 6h.'],
            [["advance", "--by", "0h"], '"0h" is not a duration'],
            [["advance", "--to", "giorno 3, all'alba"], `"giorno 3, all'alba" is not a game date: write it as day 3, 06:00, or day 3.`],
        ];

        for (const [args, message] of refusals) {
            const result = await rpg(...args);
            expect(result.exitCode, args.join(" ")).toBe(1);
            expect(result.output, args.join(" ")).toContain(message);
        }
    });

    it("stops on a game date in state.yaml that it cannot read, and says how to fix it", async () => {
        writeByHand("state.yaml", "date: giorno 3\n");
        const result = await rpg("advance", "--by", "1h");
        expect(result.exitCode).toBe(1);
        expect(result.output).toBe('The game date in state.yaml, "giorno 3", is not a game date: write it by hand as day 3, 06:00.');
    });
});

describe("the game date elsewhere", () => {
    it("stamps every log line once the game has a date, as the engine writes dates", async () => {
        await rpg("write", "Varro", "--type", "character");
        expect(readLogFile(folder).at(-1)?.date).toBeUndefined();

        writeByHand("state.yaml", "date: Day 1,18:00\n");
        await rpg("write", "Lena", "--type", "character", "--set", "hp=7/7");
        await rpg("change", "Lena", "hp", "--by=-2");
        await rpg("roll", "1d20");
        expect(readLogFile(folder).slice(-3).map((entry) => entry.date)).toEqual(["day 1, 18:00", "day 1, 18:00", "day 1, 18:00"]);
    });

    it("keeps every other command working when state.yaml cannot be read, and status counts it", async () => {
        for (const broken of ["date: 3\n", "date: [day 3\n", "date: giorno 3\n", "date: *nessuna\n"]) {
            writeByHand("state.yaml", broken);
            expect((await rpg("config", "lines", "--add", `ragni ${broken}`)).exitCode, broken).toBe(0);
            expect(readLogFile(folder).at(-1)).toMatchObject({ type: "config-changed" });
            expect(readLogFile(folder).at(-1)?.date).toBeUndefined();
            expect((await rpg("roll", "1d20")).exitCode, broken).toBe(0);

            const status = (await rpg("status")).output;
            expect(status, broken).toContain("1 problem in the campaign: validate lists them, with how to fix each.");
            expect(status, broken).not.toContain("Now:");
        }

        writeByHand("state.yaml", "date:\n");
        expect((await rpg("advance", "--by", "1h")).output).toContain("The game has no date yet");
    });

    it("refuses a planned event with a date it cannot read, and keeps dates in words for what has happened", async () => {
        const planned = await rpg("write", "Sparizione di Rosa", "--type", "event", "--set", "status=planned", "--set", "date=la prima notte");
        expect(planned.exitCode).toBe(1);
        expect(planned.output).toBe('The date "la prima notte" is not a game date: a planned event needs one the engine can read, such as day 1, 23:00. Words, such as two winters ago, fit only an event that has happened.');

        expect((await rpg("write", "Il crollo", "--type", "event", "--set", "date=due inverni fa")).output).toContain('The date "due inverni fa" is not a game date');
        await rpg("write", "La fiera", "--type", "event", "--set", "date=day 3, 06:00");
        expect(JSON.parse((await rpg("show", "La fiera", "--json")).output).fields).toEqual({ status: "planned", date: "day 3, 06:00" });

        await event("Il rogo", "happened", "due inverni fa");
        expect((await rpg("write", "Il rogo", "--set", "status=planned")).exitCode).toBe(1);
        expect((await rpg("write", "Il rogo", "--set", "status=planned", "--set", "date=day 1, 06:00")).exitCode).toBe(0);
        expect((await rpg("write", "Il rogo", "--unset", "date")).exitCode).toBe(0);
        expect((await rpg("write", "Il rogo", "--set", "status=rinviato")).output).toContain('"status" must be one of: planned, happened, cancelled.');
    });

    it("lets a page written by hand be changed elsewhere, and validate shows how to fix its date", async () => {
        writeByHand("world/events/Sparizione di Rosa.md", "---\nstatus: planned\ndate: la prima notte\n---\n");
        expect((await rpg("write", "Sparizione di Rosa", "--text", "Rosa va al guado.")).exitCode).toBe(0);

        expect((await rpg("validate")).output).toBe([
            "1 problem:",
            '- world/events/Sparizione di Rosa.md: Sparizione di Rosa is planned, but its date "la prima notte" is not a game date. Fix: write Sparizione di Rosa, set date to a game date such as day 1, 23:00, or status to happened if it already took place.',
        ].join("\n"));
        await rpg("write", "Sparizione di Rosa", "--set", "date=day 1, 23:00");
        expect((await rpg("validate")).output).toBe("No problems.");
    });

    it("validate checks state.yaml", async () => {
        writeByHand("state.yaml", "date: giorno 3\n");
        expect((await rpg("validate")).output).toBe('1 problem:\n- The game date in state.yaml, "giorno 3", is not a game date. Fix: write it by hand as day 3, 06:00.');

        writeByHand("state.yaml", "date: [day 3]\n");
        expect((await rpg("validate")).output).toBe("1 problem:\n- state.yaml is not valid: date: write the game date as text, such as day 1, 18:00. Fix it by hand.");

        writeByHand("state.yaml", "date: [day 3\n");
        expect((await rpg("validate")).output).toContain("1 problem:\n- state.yaml is not valid YAML; fix it by hand:");
    });

    it("finds standard fields written in another case, which the engine would not read", async () => {
        writeByHand("world/events/La fiera.md", "---\nStatus: planned\nDate: day 1, 19:00\n---\n");
        const output = (await rpg("validate")).output;
        expect(output).toContain(
            '- world/events/La fiera.md: "Status" is the standard field status written another way, so the engine does not read it: write it as status. Fix: write La fiera, unset Status and write its value again as status.',
        );
        expect(output).toContain('"Date" is the standard field date written another way');
        expect((await rpg("write", "La fiera", "--unset", "Status", "--set", "status=planned")).exitCode).toBe(0);

        const refused = await rpg("write", "La fiera", "--set", "Place=[[Guadoscuro]]");
        expect(refused.exitCode).toBe(1);
        expect(refused.output).toContain('"Place" is the standard field place written another way');
    });
});

describe("pages and files written by hand", () => {
    it("takes an event without a status as planned, and an empty date as no date", async () => {
        writeByHand("world/events/La fiera.md", "---\ndate: day 1, 20:00\n---\n");
        writeByHand("world/events/Attesa.md", "---\nstatus: planned\ndate:\n---\n");
        writeByHand("world/events/Il rogo.md", "---\ndate: due inverni fa\n---\n");
        await rpg("advance", "--to", "day 1, 18:00");
        expect((await rpg("advance", "--by", "4h")).output).toBe(
            `day 1, 18:00 → day 1, 20:00: stopped after 2h of 4h.\nDue: La fiera (day 1, 20:00). ${one} Then advance the other 2h, if they are still doing what they were.\nTime does not stop at these planned events, whose date is not a game date: Il rogo. Give each one a game date with write.`,
        );
        expect((await rpg("validate")).output).toBe([
            "1 problem:",
            '- world/events/Il rogo.md: Il rogo is planned, but its date "due inverni fa" is not a game date. Fix: write Il rogo, set date to a game date such as day 1, 23:00, or status to happened if it already took place.',
        ].join("\n"));
    });

    it("gives the advice once when old and new events are due, and names every next event at the same moment", async () => {
        await event("Prima", "planned", "day 1, 10:00");
        await event("Dopo", "planned", "day 1, 20:00");
        await event("Fiera", "planned", "day 2, 06:00");
        await event("Mercato", "planned", "day 2, 06:00");
        await rpg("advance", "--to", "day 1, 18:00");
        expect((await rpg("advance", "--by", "4h")).output).toBe(
            `day 1, 18:00 → day 1, 20:00: stopped after 2h of 4h.\nDue: Dopo (day 1, 20:00). ${one} Then advance the other 2h, if they are still doing what they were.\nStill due as well: Prima (day 1, 10:00).`,
        );

        await rpg("write", "Prima", "--set", "status=happened");
        await rpg("write", "Dopo", "--set", "status=cancelled");
        expect((await rpg("advance", "--by", "1h")).output).toBe("day 1, 20:00 → day 1, 21:00.\nNext: Fiera (day 2, 06:00, in 9h) · Mercato (day 2, 06:00, in 9h).");
    });

    it("status says why the game date cannot be read, instead of asking to set it", async () => {
        await event("Dopo", "planned", "day 2, 08:00");
        writeByHand("state.yaml", "date: giorno 3\n");
        const status = (await rpg("status")).output;
        expect(status).toContain('The game date in state.yaml, "giorno 3", is not a game date: write it by hand as day 3, 06:00.');
        expect(status).not.toContain("No game date yet");

        writeByHand("state.yaml", 'date: ""\n');
        expect((await rpg("advance", "--to", "day 1, 18:00")).output).toContain("The game starts on day 1, 18:00.");
    });

    it("names the misspelled field before anything else a write would say", async () => {
        const result = await rpg("write", "Rogo", "--type", "event", "--set", "Status=happened", "--set", "date=due inverni fa");
        expect(result.exitCode).toBe(1);
        expect(result.output).toBe('"Status" is the standard field status written another way, so the engine does not read it: write it as status.');
    });

    it("says which file holds a broken YAML alias, also when a setting changes", async () => {
        writeByHand("campaign.yaml", "name: Guadoscuro\nsystem: *x\n");
        const result = await rpg("config", "language", "en");
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("campaign.yaml is not valid YAML; fix it by hand: Unresolved alias");
    });
});
