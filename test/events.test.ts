// Planned events that come due by their date, their clock or a condition (MECCANICHE, EVT-1–EVT-10).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { write } from "../src/commands/write.ts";
import type { Context } from "../src/core/context.ts";
import { makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

// What the outputs say to do with due events (D-106).
const one =
    "If the characters see or hear it, play it as a scene; if not, it happens off screen, and they will find its traces. Then set its status: happened if it went as written, cancelled if it never will; or give it a later date if it is put off or tried again. If what it needs is gone, cancel it, or let whoever wanted it try another way; never bend the world back to the written story.";
const many =
    "Play as scenes those the characters see or hear; the others happen off screen, and they will find their traces. Then set each one's status: happened if it went as written, cancelled if it never will; or give it a later date if it is put off or tried again. If what it needs is gone, cancel it, or let whoever wanted it try another way; never bend the world back to the written story.";
const judge = "If an event no longer goes as planned, write it: its status, date or by.";
const questJudge = "If the story of a quest has ended, set its status.";
// The part new-day, which the command line gives every time (D-97, D-134).
const turn = "Move each clock as its event says, or a step for each day its owner worked unhindered, at the pace the difficulty says; show each step as a sign, never the plan, "
    + "and after days skipped, in their summary.";

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], context);
    await ok("write", "Guadoscuro", "--type", "place", "--set", "contains=[[Locanda]], [[Ossario]]");
    await ok("write", "Locanda", "--type", "place", "--set", "contains=[[Ennio]], [[Lanterna]]");
    await ok("write", "Ossario", "--type", "place");
    await ok("write", "Ennio", "--type", "character", "--set", "role=pc");
    await ok("write", "Lanterna", "--type", "item");
    await ok("write", "Varro", "--type", "character", "--set", "role=npc");
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

function eventFile(name: string): string
{
    return readFileSync(join(folder, "world", "events", `${name}.md`), "utf8");
}

async function moveEnnio(from: string, to: string): Promise<string>
{
    await ok("write", from, "--remove", "contains=[[Ennio]]");
    return ok("write", to, "--add", "contains=[[Ennio]]");
}

describe("clocks (EVT-2)", () => {
    it("fills with change and makes its event due, written on it with the present date", async () => {
        await ok("write", "La marcia", "--type", "event", "--set", "clock=0/2", "--set", "date=day 3, 06:00", "--set", "place=[[Guadoscuro]]");
        await ok("advance", "--to", "day 1, 18:00");
        expect(await ok("change", "La marcia", "clock", "--by", "1")).toBe("La marcia: clock 0/2 → 1/2.");
        expect(await ok("change", "La marcia", "clock", "--by", "1", "--why", "Ennio umilia Odo")).toBe(
            `La marcia: clock 1/2 → 2/2: at max.\nNow due: La marcia (day 1, 18:00, at Guadoscuro), since clock 2/2. ${one}`,
        );
        expect(eventFile("La marcia")).toBe('---\nstatus: planned\nclock: 2/2\ndate: day 1, 18:00\nplace: "[[Guadoscuro]]"\n---\n');
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "event-due", visibility: "hidden", date: "day 1, 18:00", data: { event: "La marcia", since: "clock 2/2", date: "day 1, 18:00", was: "day 3, 06:00" } });
    });

    it("stays due when the clock goes down after it fired, until its status or a later date says otherwise", async () => {
        await ok("write", "La marcia", "--type", "event", "--set", "clock=1/2");
        await ok("advance", "--to", "day 1, 18:00");
        await ok("change", "La marcia", "clock", "--by", "1");
        expect(await ok("change", "La marcia", "clock", "--by=-1")).toBe("La marcia: clock 2/2 → 1/2.");
        expect(await ok("status")).toContain("Due: La marcia (day 1, 18:00).");
        await ok("write", "La marcia", "--set", "date=day 2");
        expect(await ok("status")).toContain("Planned events: La marcia (clock 1/2, day 2, in 6h)");
    });

    it("changes only with change once written, as any counter (D-92)", async () => {
        await ok("write", "La marcia", "--type", "event", "--set", "clock=0/4");
        expect((await rpg("write", "La marcia", "--set", "clock=2/4")).output).toBe(
            'clock is a counter: use change, page "La marcia", field clock, to 2/4 (or by an amount). To make it something else, unset it, then set it.',
        );
    });

    it("is listed on a new day, while it is not full, to move if the time moved it (EVT-8)", async () => {
        await ok("advance", "--to", "day 1, 18:00");
        await ok("write", "La marcia", "--type", "event", "--set", "clock=1/4", "--set", "date=day 9");
        await ok("write", "Il crollo", "--type", "event", "--set", "clock=3/3", "--set", "by=[[Varro]]");
        expect(await ok("advance", "--by", "4h")).toBe(`day 1, 18:00 → day 1, 22:00.\nStill due: Il crollo (day 1, 18:00). ${one}\nNext: La marcia (clock 1/4, day 9, in 7d 2h).`);
        expect(await ok("advance", "--by", "4h")).toBe(
            `day 1, 22:00 → day 2, 02:00.\nStill due: Il crollo (day 1, 18:00). ${one}\nNext: La marcia (clock 1/4, day 9, in 6d 22h).\nA new day (day 2), with clocks to move: La marcia 1/4.\n${turn}`,
        );
        await ok("write", "La marcia", "--set", "by=[[Varro]]");
        expect(await ok("advance", "--by", "3d")).toBe(
            `day 2, 02:00 → day 5, 02:00.\nStill due: Il crollo (day 1, 18:00). ${one}\nNext: La marcia (clock 1/4, day 9, in 3d 22h).\n3 new days (to day 5), with clocks to move: La marcia 1/4 (Varro).\n${turn}`,
        );
    });
});

describe("conditions (EVT-3, EVT-4, EVT-5)", () => {
    it("fire once, in the command that makes them hold, and the event keeps the date it fired at", async () => {
        await ok("write", "I servitori si svegliano", "--type", "event", "--set", "when=party in [[Ossario]]", "--set", "place=[[Ossario]]");
        await ok("advance", "--to", "day 1, 18:00");
        expect(await moveEnnio("Locanda", "Ossario")).toBe(
            `Updated Ossario (place, world/places/Ossario.md): added to contains.\nNow due: I servitori si svegliano (day 1, 18:00, at Ossario), since party in Ossario. ${one}`,
        );
        expect(eventFile("I servitori si svegliano")).toBe('---\nstatus: planned\nwhen: party in [[Ossario]]\nplace: "[[Ossario]]"\ndate: day 1, 18:00\n---\n');

        await moveEnnio("Ossario", "Locanda");
        expect(await ok("status")).toContain(`Due: I servitori si svegliano (day 1, 18:00, at Ossario). ${one}`);
    });

    it("do not fire again when the event is put off with a later date while they still hold", async () => {
        await ok("write", "I servitori si svegliano", "--type", "event", "--set", "when=party in [[Ossario]]");
        await ok("advance", "--to", "day 1, 18:00");
        await moveEnnio("Locanda", "Ossario");
        expect(await ok("write", "I servitori si svegliano", "--set", "date=day 2, 06:00")).toBe("Updated I servitori si svegliano (event, world/events/I servitori si svegliano.md): set date.");
        expect(await ok("write", "Ennio", "--set", "hp=12/12")).toBe("Updated Ennio (character, world/characters/Ennio.md): set hp.");
        expect(await ok("status")).toContain("Planned events: I servitori si svegliano (day 2, 06:00, in 12h, when party in Ossario)");
    });

    it("fire when the event is created already holding, and on a status, an item carried, a list of which one is enough", async () => {
        await ok("advance", "--to", "day 1, 18:00");
        expect(await ok("write", "Il buio", "--type", "event", "--set", "when=[[Ennio]] in [[Guadoscuro]]")).toBe(
            `Created Il buio (event, world/events/Il buio.md): set when.\nNow due: Il buio (day 1, 18:00), since Ennio in Guadoscuro. ${one}`,
        );

        await ok("write", "Lena fugge", "--type", "event", "--set", "when=[[Varro]] dead");
        await ok("write", "La luce", "--type", "event", "--add", "when=[[Diario]] in party", "--add", "when=[[Lanterna]] in party");
        await ok("write", "Locanda", "--remove", "contains=[[Lanterna]]");
        expect(await ok("write", "Ennio", "--add", "inventory=[[Lanterna]]")).toBe(
            `Updated Ennio (character, world/characters/Ennio.md): added to inventory.\nNow due: La luce (day 1, 18:00), since Lanterna in party. ${one}`,
        );
        expect(await ok("write", "Varro", "--set", "status=dead")).toBe(
            `Updated Varro (character, world/characters/Varro.md): set status.\nNow due: Lena fugge (day 1, 18:00), since Varro dead. ${one}`,
        );
    });

    it("without a game date write nothing: the event is due while they hold", async () => {
        await ok("write", "I servitori si svegliano", "--type", "event", "--set", "when=party in [[Ossario]]");
        expect(await moveEnnio("Locanda", "Ossario")).toContain("Now due: I servitori si svegliano, since party in Ossario.");
        expect(eventFile("I servitori si svegliano")).not.toContain("date:");
        expect(await ok("status")).toContain("Due: I servitori si svegliano.");
        await moveEnnio("Ossario", "Locanda");
        expect(await ok("status")).toContain("Planned events: I servitori si svegliano (when party in Ossario)");
        expect(readLogFile(folder).filter((entry) => entry.type === "event-due").map((entry) => entry.data)).toEqual([{ event: "I servitori si svegliano", since: "party in Ossario" }]);
    });

    it("fire nothing for a change made by hand: the event is due only while its condition holds", async () => {
        await ok("write", "I servitori si svegliano", "--type", "event", "--set", "when=party in [[Ossario]]");
        await ok("advance", "--to", "day 1, 18:00");
        writeFileSync(join(folder, "world", "places", "Ossario.md"), '---\ncontains:\n  - "[[Ennio]]"\n---\n');
        writeFileSync(join(folder, "world", "places", "Locanda.md"), '---\ncontains:\n  - "[[Lanterna]]"\n---\n');
        expect(await ok("write", "Varro", "--set", "hp=10/10")).toBe("Updated Varro (character, world/characters/Varro.md): set hp.");
        expect(await ok("status")).toContain("Due: I servitori si svegliano.");
    });

    it("names every event a command makes due, the ones made due by their date or status too", async () => {
        await ok("advance", "--to", "day 2, 18:00");
        await ok("write", "Lena fugge", "--type", "event", "--set", "when=[[Varro]] dead");
        await ok("write", "Il funerale", "--type", "event", "--set", "when=[[Varro]] dead", "--set", "status=cancelled");
        expect(await ok("write", "Varro", "--set", "status=dead")).toContain(`Now due: Lena fugge (day 2, 18:00), since Varro dead. ${one}`);
        expect(await ok("write", "Il funerale", "--set", "status=planned")).toContain(`Now due: Il funerale (day 2, 18:00), since Varro dead. ${one}`);
        expect(await ok("write", "La festa", "--type", "event", "--set", "date=day 1")).toContain(`Now due: La festa (day 1). ${one}`);
        expect(await ok("status")).toContain(`Due: La festa (day 1) · Il funerale (day 2, 18:00) · Lena fugge (day 2, 18:00). ${many}`);
    });
});

describe("who makes it happen, and consequences (EVT-6, EVT-7)", () => {
    it("lists the planned events and open or planned quests linked to a page whose status changes, but those just said due", async () => {
        await ok("write", "Il rituale", "--type", "event", "--set", "by=[[Varro]]", "--set", "date=day 3, 23:00");
        await ok("write", "Lena fugge", "--type", "event", "--set", "when=[[Varro]] dead");
        await ok("write", "Fermare Varro", "--type", "quest", "--set", "status=open", "--text", "Fermare [[Varro]].");
        await ok("write", "Il segreto", "--type", "quest", "--text", "Sapere cosa vuole.");
        await ok("write", "Il segreto#Chi", "--secret", "--text", "[[Varro]].");
        await ok("write", "La vendetta", "--type", "quest", "--set", "status=done", "--text", "[[Varro]].");
        await ok("advance", "--to", "day 1, 18:00");
        expect(await ok("write", "Varro", "--set", "status=dead")).toBe([
            "Updated Varro (character, world/characters/Varro.md): set status.",
            `Now due: Lena fugge (day 1, 18:00), since Varro dead. ${one}`,
            `Linked to Varro: Il rituale (day 3, 23:00, in 2d 5h) · Fermare Varro (quest, open) · Il segreto (quest, planned). ${judge} ${questJudge}`,
        ].join("\n"));
    });

    it("says nothing when a member of the party moves, which is the game itself (D-146)", async () => {
        await ok("write", "Lena", "--type", "character", "--set", "role=companion");
        await ok("write", "Il patto", "--type", "event", "--set", "date=day 3, 06:00", "--text", "Il patto fra [[Ennio]], [[Lena]] e [[Varro]].");
        await ok("write", "Locanda", "--add", "contains=[[Lena]]", "--add", "contains=[[Varro]]");
        expect(await ok("write", "Locanda", "--remove", "contains=[[Ennio]]", "--remove", "contains=[[Lena]]")).toBe("Updated Locanda (place, world/places/Locanda.md): removed from contains.");
        expect(await ok("write", "Locanda", "--remove", "contains=[[Varro]]")).toContain("Linked to Varro: Il patto (day 3, 06:00)");
    });

    it("lists what is linked to a thing that moves", async () => {
        await ok("write", "Ritrovare la lanterna", "--type", "quest", "--set", "status=open", "--text", "Trova la [[Lanterna]].");
        expect(await ok("write", "Locanda", "--remove", "contains=[[Lanterna]]")).toBe(
            `Updated Locanda (place, world/places/Locanda.md): removed from contains.\nLinked to Lanterna: Ritrovare la lanterna (quest, open). ${questJudge}`,
        );
        expect(await ok("write", "Ennio", "--set", "hp=12/12")).toBe("Updated Ennio (character, world/characters/Ennio.md): set hp.");
    });

    it("says nothing when a page is created, or when what changed is linked from nothing that is still to come", async () => {
        expect(await ok("write", "Bruno", "--type", "character", "--set", "status=dead")).toBe("Created Bruno (character, world/characters/Bruno.md): set status.");
        expect(await ok("write", "Varro", "--set", "status=dead")).toBe("Updated Varro (character, world/characters/Varro.md): set status.");
    });
});

describe("checks (EVT-10)", () => {
    it("refuse a clock that is not current/max and conditions that do not read, nothing changed", async () => {
        for (
            const [set, problem] of [
                ["clock=4", "The clock 4 is not a clock: write it as current/max, with a maximum of at least 1, such as 0/4."],
                ["clock=0/0", 'The clock "0/0" is not a clock: write it as current/max, with a maximum of at least 1, such as 0/4.'],
                ["when=Varro dead", '"Varro dead" is not a condition: write "party in [[Place]]", "[[Item]] in party", "[[Thing]] in [[Place]]" or "[[Page]] dead", with the pages as links.'],
                ["when=[[Ossario]] dead", '[[Ossario]] dead can never hold: Ossario has no status. Conditions on it are "[[Ossario]] in [[Place]]" or "[[Ossario]] in party".'],
                ["when=[[Varro]] happened", "[[Varro]] happened can never hold: the status of Varro is one of alive, dead."],
                ["by=Varro", '"by" must be a link, or a list of links, such as [[Varro]].'],
            ]
        ) {
            const result = await rpg("write", "La marcia", "--type", "event", "--set", set);
            expect(result.output, set).toBe(problem);
        }

        expect(await ok("find", "--type", "event")).not.toContain("La marcia");
    });

    it("validate reports them written by hand, and an event planned by the dead", async () => {
        writeFileSync(join(folder, "world", "events", "Rotto.md"), "---\nclock: tre\nwhen: Varro dead\n---\n");
        writeFileSync(join(folder, "world", "events", "Il rituale.md"), '---\nby:\n  - "[[Varro]]"\n  - "[[Ennio]]"\n---\n');
        await ok("write", "Varro", "--set", "status=dead");
        expect((await rpg("validate")).output).toBe([
            "3 problems:",
            "- world/events/Il rituale.md: Il rituale is planned, but Varro, who makes it happen, is dead. Fix: cancel it, give it to someone else with by, or write what happens instead.",
            '- world/events/Rotto.md: Rotto: The clock "tre" is not a clock: write it as current/max, with a maximum of at least 1, such as 0/4. Fix: write Rotto, set clock to current/max, such as 0/4, or unset it.',
            '- world/events/Rotto.md: Rotto: "Varro dead" is not a condition: write "party in [[Place]]", "[[Item]] in party", "[[Thing]] in [[Place]]" or "[[Page]] dead", with the pages as links. Fix: write Rotto, set when to a condition such as party in [[Place]], or unset it.',
        ].join("\n"));
    });
});

describe("firing, case by case (EVT-1, EVT-4, EVT-5)", () => {
    it("never fires an event whose name another page shares, and never fails after writing: it is due while its condition holds", async () => {
        await ok("write", "Lena fugge", "--type", "event", "--set", "when=[[Varro]] dead");
        writeFileSync(join(folder, "world", "topics", "lena fugge.md"), "Un'altra pagina.\n");
        await ok("advance", "--to", "day 1, 18:00");
        expect(await ok("write", "Varro", "--set", "status=dead")).toBe(`Updated Varro (character, world/characters/Varro.md): set status.\nNow due: Lena fugge. ${one}`);
        expect(readLogFile(folder).some((entry) => entry.type === "event-due")).toBe(false);
    });

    it("lets a date still to come, given in the same command, win: the event waits for it", async () => {
        await ok("advance", "--to", "day 1, 18:00");
        expect(await ok("write", "Il buio", "--type", "event", "--set", "when=[[Ennio]] in [[Guadoscuro]]", "--set", "date=day 5, 06:00")).toBe([
            "Created Il buio (event, world/events/Il buio.md): set when, date.",
            "Set off, but given a date still to come, so waiting for it: Il buio (day 5, 06:00, in 3d 12h, when Ennio in Guadoscuro). To have it come now, unset its date.",
        ].join("\n"));
        expect(await ok("write", "Il buio", "--unset", "date")).toContain(`Now due: Il buio (day 1, 18:00), since Ennio in Guadoscuro. ${one}`);
    });

    it("does not fire again an event already due and not played yet, when its condition comes back", async () => {
        await ok("write", "I servitori si svegliano", "--type", "event", "--set", "when=party in [[places/Ossario]]");
        await ok("advance", "--to", "day 1, 18:00");
        await moveEnnio("Locanda", "Ossario");
        await moveEnnio("Ossario", "Locanda");
        await ok("advance", "--by", "1h");
        expect(await moveEnnio("Locanda", "Ossario")).toBe("Updated Ossario (place, world/places/Ossario.md): added to contains.");
        expect(readLogFile(folder).filter((entry) => entry.type === "event-due")).toHaveLength(1);
    });

    it("before the game has a date, makes an event due by its clock even when it has a date", async () => {
        await ok("write", "La marcia", "--type", "event", "--set", "clock=0/1", "--set", "date=day 3, 06:00");
        expect(await ok("change", "La marcia", "clock", "--by", "1")).toBe(`La marcia: clock 0/1 → 1/1: at max.\nNow due: La marcia (day 3, 06:00), since clock 1/1. ${one}`);
        expect(await ok("status")).toContain(`Due: La marcia (day 3, 06:00). ${one}`);
        expect(readLogFile(folder).at(-1)?.data).toEqual({ event: "La marcia", since: "clock 1/1" });
    });

    it("names two events made due at once, and writes no place left empty", async () => {
        await ok("write", "Lena fugge", "--type", "event", "--set", "when=[[Varro]] dead");
        await ok("write", "Il funerale", "--type", "event", "--set", "when=[[Varro]] dead", "--set", "place=[[Guadoscuro]]");
        writeFileSync(join(folder, "world", "events", "Lena fugge.md"), '---\nwhen: "[[Varro]] dead"\nplace: ""\n---\n');
        expect(await ok("write", "Varro", "--set", "status=dead")).toContain(`Now due: Il funerale (at Guadoscuro), since Varro dead · Lena fugge, since Varro dead. ${many}`);
    });

    it("adds a condition to one already there as a list, of which one is enough", async () => {
        await ok("write", "Lena fugge", "--type", "event", "--set", "when=[[Varro]] dead");
        await ok("write", "Lena fugge", "--add", "when=party in [[Ossario]]");
        expect(eventFile("Lena fugge")).toBe('---\nstatus: planned\nwhen:\n  - "[[Varro]] dead"\n  - party in [[Ossario]]\n---\n');
        expect(await ok("status")).toContain("Planned events: Lena fugge (when Varro dead or party in Ossario)");
    });

    it("says when a condition names a page that does not exist yet, and the page that has that alias", async () => {
        await ok("write", "Ser Aldo Malvezzi", "--type", "character", "--set", "aliases=[Aldo]");
        expect(await ok("write", "La vendetta", "--type", "event", "--set", "when=[[Aldo]] dead")).toBe([
            "Created La vendetta (event, world/events/La vendetta.md): set when.",
            "[[Aldo]] is not a page yet: the condition on it cannot hold until a page has that name. Ser Aldo Malvezzi has Aldo among its aliases: write [[Ser Aldo Malvezzi]].",
        ].join("\n"));
        expect(await ok("write", "La paura", "--type", "event", "--set", "when=[[Nessuno]] in party")).toContain("[[Nessuno]] is not a page yet: the condition on it cannot hold until a page has that name.");
    });

    it("takes a list of links given as text through MCP in a field that is a list, and conditions only as a list (D-136)", async () => {
        await ok("write", "Cripta", "--type", "place");
        await ok("write", "Diario", "--type", "item");
        const result = await write.run(write.input.parse({ page: "Il rituale", type: "event", set: { by: "[[Varro]], [[Ennio]]", when: ["[[Varro]] dead", "party in [[Cripta]]"] } }), context);
        expect(write.format(result)).toBe("Created Il rituale (event, world/events/Il rituale.md): set by, when.");
        expect(eventFile("Il rituale")).toContain('by:\n  - "[[Varro]]"\n  - "[[Ennio]]"');
        await ok("write", "Locanda", "--remove", "contains=[[Lanterna]]");
        write.run(write.input.parse({ page: "Cripta", add: { contains: "[[Lanterna]], [[Diario]]" } }), context);
        expect(readFileSync(join(folder, "world", "places", "Cripta.md"), "utf8")).toContain('contains:\n  - "[[Lanterna]]"\n  - "[[Diario]]"');
        expect(() => write.run(write.input.parse({ page: "Il rituale", set: { when: "[[Varro]] dead, party in [[Cripta]]" } }), context)).toThrow(
            '"[[Varro]] dead, party in [[Cripta]]" holds more than one condition: give a list, of which one is enough, such as ["[[Varro]] dead", "party in [[Cripta]]"].',
        );
        // Any field: text written as a list reads as one, as the command line reads it (Code tab game of 17 October).
        write.run(write.input.parse({ page: "Diario", set: { tags: "[antico, cifrato]", note: "[[Varro]] lo scrisse" } }), context);
        expect(readFileSync(join(folder, "world", "items", "Diario.md"), "utf8")).toContain('tags:\n  - antico\n  - cifrato\nnote: "[[Varro]] lo scrisse"');
    });
});

describe("clocks with change, and what status shows (EVT-2, EVT-9, D-135)", () => {
    it("refuses a clock without a maximum, and suggests an empty one to add", async () => {
        await ok("write", "La marcia", "--type", "event", "--set", "clock=0/4");
        expect((await rpg("change", "La marcia", "clock", "--to", "0/0")).output).toBe("A clock needs a maximum of at least 1, such as 0/4: 0/0 is not one. Nothing changed.");
        await ok("write", "Il mercato", "--type", "event");
        expect((await rpg("change", "Il mercato", "clock", "--by", "1")).output).toContain("To add one, use write, such as set clock=0/4.");
        expect((await rpg("change", "Il mercato", "clock", "--to", "1/6")).output).toContain("To add one, use write, such as set clock=1/6.");
    });

    it("shows every due event, the three nearest planned ones and every clock with who carries it", async () => {
        await ok("advance", "--to", "day 1, 18:00");

        for (const day of [1, 2, 3, 4, 5]) {
            await ok("write", `Passato ${day}`, "--type", "event", "--set", `date=day 1, 0${day}:00`);
            await ok("write", `Futuro ${day}`, "--type", "event", "--set", `date=day ${day + 1}`, "--set", `clock=${day}/9`, "--set", "by=[[Varro]]");
        }

        const shown = await ok("status");
        expect(shown).toContain("Due: Passato 1 (day 1, 01:00) · Passato 2 (day 1, 02:00) · Passato 3 (day 1, 03:00) · Passato 4 (day 1, 04:00) · Passato 5 (day 1, 05:00).");
        expect(shown).toContain("Planned events: Futuro 1 (clock 1/9, day 2, in 6h) · Futuro 2 (clock 2/9, day 3, in 1d 6h) · Futuro 3 (clock 3/9, day 4, in 2d 6h), and 2 more: find text planned, type event");
        expect(shown).toContain("Clocks: Futuro 1 1/9 (Varro) · Futuro 2 2/9 (Varro) · Futuro 3 3/9 (Varro) · Futuro 4 4/9 (Varro) · Futuro 5 5/9 (Varro)");
    });
});

describe("consequences, case by case (EVT-6, EVT-7)", () => {
    it("lists ten linked events and quests at most, with how many more there are", async () => {
        for (let index = 1; index <= 12; index++) {
            await ok("write", `Missione ${String(index).padStart(2, "0")}`, "--type", "quest", "--text", "[[Varro]].");
        }

        writeFileSync(join(folder, "world", "quests", "Senza stato.md"), "---\nrole: npc\n---\n[[Varro]].\n");
        const output = await ok("write", "Varro", "--set", "status=dead");
        expect(output).toContain("Linked to Varro: Missione 01 (quest, planned) · Missione 02 (quest, planned)");
        expect(output).toContain("Missione 10 (quest, planned), and 3 more.");
    });

    it("says it once for each thing that leaves a container, from inventories too, and nothing for a status written the same way", async () => {
        await ok("write", "Ritrovare la lanterna", "--type", "quest", "--set", "status=open", "--text", "Trova la [[Lanterna]].");
        await ok("write", "Locanda", "--remove", "contains=[[Lanterna]]");
        expect(await ok("write", "Ennio", "--add", "inventory=[[Lanterna]]")).toBe("Updated Ennio (character, world/characters/Ennio.md): added to inventory.");
        expect(await ok("write", "Ennio", "--remove", "inventory=[[Lanterna]]")).toContain(`Linked to Lanterna: Ritrovare la lanterna (quest, open). ${questJudge}`);
        await ok("write", "Il rituale", "--type", "event", "--text", "[[Varro]].");
        expect(await ok("write", "Varro", "--set", "status=alive")).toBe("Updated Varro (character, world/characters/Varro.md): set status.");
    });

    it("validate names every dead who makes an event happen, and only characters", async () => {
        await ok("write", "Bruno", "--type", "character", "--set", "status=dead");
        await ok("write", "Lanterna", "--set", "status=dead");
        await ok("write", "Il rituale", "--type", "event", "--set", "by=[[Varro]], [[Bruno]], [[Lanterna]]");
        await ok("write", "Varro", "--set", "status=dead");
        expect((await rpg("validate")).output).toBe(
            "1 problem:\n- world/events/Il rituale.md: Il rituale is planned, but Varro and Bruno, who make it happen, are dead. Fix: cancel it, give it to someone else with by, or write what happens instead.",
        );
    });

    it("refuses conditions of which any asks a page for a status its type does not have", async () => {
        expect((await rpg("write", "La marcia", "--type", "event", "--add", "when=party in [[Ossario]]", "--add", "when=[[Ossario]] dead")).output).toBe(
            '[[Ossario]] dead can never hold: Ossario has no status. Conditions on it are "[[Ossario]] in [[Place]]" or "[[Ossario]] in party".',
        );
    });
});

describe("the gaps the second mutation run found", () => {
    it("names only what left a container, not what stayed", async () => {
        await ok("write", "Seguire Ennio", "--type", "quest", "--text", "Seguire [[Ennio]].");
        await ok("write", "Ritrovare la lanterna", "--type", "quest", "--text", "Trova la [[Lanterna]].");
        expect(await ok("write", "Locanda", "--remove", "contains=[[Lanterna]]")).toBe(
            `Updated Locanda (place, world/places/Locanda.md): removed from contains.\nLinked to Lanterna: Ritrovare la lanterna (quest, planned). ${questJudge}`,
        );
    });

    it("lists every one who carries a clock, and fires an event whose date, written before, is still to come: the first of the three", async () => {
        await ok("advance", "--to", "day 1, 18:00");
        await ok("write", "La marcia", "--type", "event", "--set", "clock=1/4", "--set", "by=[[Varro]], [[Ennio]]");
        expect(await ok("status")).toContain("Clocks: La marcia 1/4 (Varro, Ennio)");
        await ok("write", "Il buio", "--type", "event", "--set", "when=[[Varro]] dead", "--set", "date=day 4");
        expect(await ok("write", "Varro", "--set", "status=dead")).toContain(`Now due: Il buio (day 1, 18:00), since Varro dead. ${one}`);
        expect(readLogFile(folder).at(-1)?.data).toEqual({ event: "Il buio", since: "Varro dead", date: "day 1, 18:00", was: "day 4" });
    });

    it("unsets conditions, and refuses a condition whose page names a part of a page on either side of in", async () => {
        await ok("write", "Lena fugge", "--type", "event", "--set", "when=[[Varro]] dead");
        expect(await ok("write", "Lena fugge", "--unset", "when")).toBe("Updated Lena fugge (event, world/events/Lena fugge.md): removed when.");
        expect((await rpg("write", "Lena fugge", "--set", "when=[[Varro#Il piano]] in party")).output).toBe(
            "[[Varro#Il piano]] names a part of a page: a condition is on a whole page, such as [[Varro]].",
        );
    });

    it("validate reports a clock or conditions of the wrong kind of value once, and leaves free fields of other pages alone", async () => {
        writeFileSync(join(folder, "world", "events", "Rotto.md"), "---\nclock:\n  - 1\n  - 4\nwhen: 42\n---\n");
        await ok("write", "Bruno", "--type", "character", "--set", "clock=tre", "--set", "when=presto");
        expect((await rpg("validate")).output).toBe([
            "2 problems:",
            '- world/events/Rotto.md: "clock" must be a counter written current/max, such as 1/4. Fix: write Rotto, set clock again with an allowed value.',
            '- world/events/Rotto.md: "when" must be a condition or a list of conditions, as text, such as party in [[Ossario]]. Fix: write Rotto, set when again with an allowed value.',
        ].join("\n"));
    });
});

describe("one item in a field that is always a list", () => {
    it("is a list of that item, from the command line and through MCP", async () => {
        expect(await ok("write", "Cantina", "--type", "place", "--set", "contains=[[Diario]]", "--set", "tags=buia")).toBe("Created Cantina (place, world/places/Cantina.md): set contains, tags.");
        expect(readFileSync(join(folder, "world", "places", "Cantina.md"), "utf8")).toBe('---\ncontains:\n  - "[[Diario]]"\ntags:\n  - buia\n---\n');
        write.run(write.input.parse({ page: "Ennio", set: { aliases: "il giovane" } }), context);
        expect(readFileSync(join(folder, "world", "characters", "Ennio.md"), "utf8")).toContain("aliases:\n  - il giovane");
        expect((await rpg("write", "Varro", "--set", "aliases=Il conte, il vecchio")).output).toContain('"aliases" must be a list');
    });
});
