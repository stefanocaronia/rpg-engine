// Asking the player with buttons (MECCANICHE, ASK-1–ASK-7; D-148).
import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { ask } from "../src/commands/ask.ts";
import type { Context, Picked, Player, Rows, SpendAsked } from "../src/core/context.ts";
import { makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;
let shown: { question: string; title: string; labels: string[]; }[];

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    shown = [];
    await rpg("init", "--name", "Rocca", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    await rpg("write", "Bruna", "--type", "character", "--set", "role=pc");
    await rpg("write", "Lena", "--type", "character", "--set", "role=companion");
});

afterEach(() => removeFolder(folder));

function rpg(...args: string[])
{
    return runCommandLine(args, context);
}

/** A player who clicks the button at `index`, or never answers. */
function playerClicking(index: number | undefined): Player
{
    return {
        choose: async (question, title, labels) => {
            shown.push({ question, title, labels });
            return index;
        },
    };
}

async function asked(args: Record<string, unknown>, index: number | undefined): Promise<string>
{
    return ask.format(await ask.run(ask.input.parse(args), { ...context, player: playerClicking(index) }));
}

async function refused(args: Record<string, unknown>): Promise<string>
{
    try {
        await ask.run(ask.input.parse(args), { ...context, player: playerClicking(0) });
    } catch (error) {
        return error instanceof Error ? error.message : String(error);
    }

    throw new Error("ask was not refused");
}

const wall = { question: "Scavalcare il muro prima della ronda: se fallisci, cadi e ti sentono", options: ["Atletica 1d20+5", "Acrobazia 1d20+3"], who: "Bruna" };

describe("a roll with buttons (ASK-3, ASK-7)", () => {
    it("shows the checks and the change of mind, rolls the chosen one with the engine's dice and logs it as the player's roll", async () => {
        expect(await asked(wall, 0)).toBe(
            "id4 Bruna, Atletica: 1d20+5 = 9 [4] + 5, rolled by the player. Tell the outcome in the story, with the roll in brackets right after the moment it decides; write nothing until your message is ready.",
        );
        expect(shown).toEqual([{ question: wall.question, title: "Tiro", labels: ["Atletica · d20 +5", "Acrobazia · d20 +3", "Cambio idea"] }]);
        expect(readLogFile(folder).at(-1)).toMatchObject({
            id: "id4",
            type: "roll",
            by: "player",
            visibility: "public",
            data: { notation: "1d20+5", total: 9, result: "1d20+5 = 9 [4] + 5", why: `Atletica: ${wall.question}`, who: "Bruna", physical: false },
        });
    });

    it("rolls any notation of the dice, such as advantage, and takes the only player character when who is left out", async () => {
        expect(await asked({ question: "Colpire il lupo", options: "Attacco 3d6kh2+5" }, 0)).toContain("Bruna, Attacco: 3d6kh2+5 = 13 [(4), 4, 4] + 5, rolled by the player.");
        expect(shown[0].labels).toEqual(["Attacco · 2d6 +5, con un margine", "Cambio idea"]);
        // The form writes the dice as the dashboard's button draws them: the game's name for a roll, every kind of die, the number added (D-297, D-399).
        await asked({ question: "Colpo furtivo", options: "Spada corta 1d6+2d6+3" }, 1);
        expect(shown[1].labels).toEqual(["Spada corta · d6 + 2d6 +3", "Cambio idea"]);
    });

    it("gives the buttons in English when the campaign is in a language the dashboard does not ship", async () => {
        await rpg("config", "language", "sw");
        await asked(wall, 2);
        expect(shown[0]).toMatchObject({ title: "Roll", labels: ["Atletica · d20 +5", "Acrobazia · d20 +3", "Change my mind"] });
    });
});

describe("no roll (ASK-4, ASK-6)", () => {
    it("rolls nothing when the player changes their mind, and says to ask what they do instead", async () => {
        expect(await asked(wall, 2)).toBe("The player changed their mind: no roll. Ask what they do instead, and stop.");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "asked", by: "player", data: { question: wall.question, answer: "Cambio idea" } });
        expect(readLogFile(folder).filter((entry) => entry.type === "roll")).toHaveLength(0);
    });

    it("rolls nothing when the app cannot show the buttons, and says to ask in words from now on what the call held, which the player has not seen", async () => {
        const unavailable: Player = { choose: async () => "unavailable" };
        const result = await ask.run(ask.input.parse(wall), { ...context, player: unavailable });
        expect(ask.format(result)).toBe(
            "The player saw no buttons: ask them what the call held, which they have not seen: Scavalcare il muro prima della ronda: se fallisci, cadi e ti sentono (the checks: Atletica 1d20+5, Acrobazia 1d20+3). Ask with your app's own tool for questions with options, if it has one: each check an option, and a change of mind; then roll the chosen check with roll. Else in words. No word about buttons; then stop. From now on, the same way.",
        );
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "asked", by: "master", data: { answer: null } });
    });

    it("rolls nothing when no one answers, and says to ask in words what the call held", async () => {
        expect(await asked(wall, undefined)).toBe(
            "No answer from the buttons: ask the player in words what the call held: Scavalcare il muro prima della ronda: se fallisci, cadi e ti sentono (the checks: Atletica 1d20+5, Acrobazia 1d20+3). Then stop.",
        );
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "asked", by: "master", data: { answer: null } });
    });
});

describe("a forced choice (ASK-5)", () => {
    it("shows the answers as given and returns the one chosen", async () => {
        expect(await asked({ question: "Il lupo fugge: attacco di opportunità?", options: ["Sì", "No"] }, 1)).toBe("The player chose: No.");
        expect(shown[0]).toEqual({ question: "Il lupo fugge: attacco di opportunità?", title: "Scelta", labels: ["Sì", "No"] });
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "asked", by: "player", data: { options: ["Sì", "No"], answer: "No" } });
    });

    it("keeps a number at the end of an answer as part of it, since a number alone is no dice", async () => {
        expect(await asked({ question: "Quale porta?", options: ["La porta 2", "La porta 3"] }, 0)).toBe("The player chose: La porta 2.");
    });
});

describe("what ask refuses (ASK-1, ASK-2)", () => {
    it("exists only where the player can be asked: never on the command line", async () => {
        const result = await rpg("ask", "--question", "Tiri?");
        expect(result).toEqual({ output: "ask works only in an AI app that shows the player a form; here, ask the player in words.", exitCode: 1 });
        expect((await rpg("--help")).output).not.toMatch(/^ {2}ask /m);
        await expect(ask.run(ask.input.parse(wall), context)).rejects.toThrow("The player cannot be asked with buttons here: ask them in words, without a word about buttons, and stop");
    });

    it("refuses checks mixed with answers, repeated buttons, too many, an empty question, and rolls for anyone but the player's character", async () => {
        expect(await refused({ ...wall, options: ["Atletica 1d20+5", "Corri via"] })).toBe(
            "Give every check its dice, such as Atletica 1d20+5; for a choice, give only the answers, such as Sì and No. A roll already has its button to change one's mind (Cambio idea): leave out an answer such as No.",
        );
        // A roll whose dice are not at the end would be one answer, and nothing would be rolled (ASK-2, D-266).
        expect(await refused({ ...wall, options: ["Danni 1d8 radianti"] })).toBe(
            '"Danni 1d8 radianti" alone is no choice: a roll ends with its dice, such as Danni radianti 1d8; a choice gives two answers or more.',
        );
        expect(await refused({ ...wall, options: ["Sì", "sì"] })).toBe("sì is given twice: each button needs its own words.");
        expect(await refused({ ...wall, options: ["a", "b", "c", "d", "e"] })).toBe("Give from 1 to 4 options; 5 were given.");
        expect(await refused({ ...wall, options: [" "] })).toBe("Give from 1 to 4 options; none was given.");
        expect(await refused({ ...wall, question: " " })).toBe("Give the question: for a roll, what is at stake either way; for a choice, what the player chooses.");
        expect(await refused({ ...wall, who: "Lena" })).toBe("Lena is not the player's character (role pc): ask rolls only theirs; roll for the others with roll.");
        expect(shown).toHaveLength(0);
        expect(readLogFile(folder).filter((entry) => entry.type === "roll" || entry.type === "asked")).toHaveLength(0);
    });

    it("asks who rolls when there is more than one player character, and refuses a roll when there is none", async () => {
        await rpg("write", "Ettore", "--type", "character", "--set", "role=pc");
        expect(await refused({ ...wall, who: undefined })).toBe("Give who rolls: Bruna or Ettore.");
        await rpg("write", "Bruna", "--set", "role=npc");
        await rpg("write", "Ettore", "--set", "role=npc");
        expect(await refused({ ...wall, who: undefined })).toBe("There is no player character yet (role pc): ask rolls only theirs.");
    });
});

describe("laws of ask (ASK-3, ASK-4)", () => {
    it("rolls exactly when a check is clicked, and logs what it reports", async () => {
        const notations = ["1d20+5", "1d20-1", "2d20kh1+3", "1d8+2", "4d6dl1", "1d4"];
        await fc.assert(
            fc.asyncProperty(fc.uniqueArray(fc.constantFrom(...notations), { minLength: 1, maxLength: 4 }), fc.nat(4), async (picked, click) => {
                const options = picked.map((notation, index) => `Prova${index} ${notation}`);
                const index = click % (options.length + 1);
                const before = readLogFile(folder).length;
                const text = await asked({ question: "Riesci?", options, who: "Bruna" }, index);
                const added = readLogFile(folder).slice(before);
                expect(added).toHaveLength(1);

                if (index < options.length) {
                    expect(added[0]).toMatchObject({ type: "roll", by: "player", data: { notation: picked[index], who: "Bruna" } });
                    expect(text).toContain(`Bruna, Prova${index}: ${String(added[0].data.result)}, rolled by the player.`);
                } else {
                    expect(added[0]).toMatchObject({ type: "asked", data: { answer: "Cambio idea" } });
                }
            }),
            { numRuns: 60 },
        );
    });
});

describe("checks that name the numbers of the sheet (ASK-12)", () => {
    const named = { question: "Scavalcare il muro prima della ronda: se fallisci, cadi e ti sentono", options: ["Forza 2d6+might-bonus", "Grazia 2d6+grace-bonus"], who: "Bruna" };

    beforeEach(async () => {
        await rpg("write", "Bruna", "--set", "might=7", "--set", "grace=5");
    });

    it("works out the numbers from the sheet, as roll does, and tells the page the field of each check, whose row it lights", async () => {
        let rows: Rows | undefined;
        const page: Player = {
            choose: async (...given: Parameters<Player["choose"]>) => {
                const [question, title, labels] = given;
                shown.push({ question, title, labels });
                rows = given[4];
                return 0;
            },
        };
        const result = ask.format(await ask.run(ask.input.parse(named), { ...context, page }));
        expect(shown[0].labels).toEqual(["Tiro: Forza (2d6+2)", "Tiro: Grazia (2d6+1)", "Cambio idea"]);
        expect(rows).toEqual({ who: "Bruna", fields: ["might-bonus", "grace-bonus", null] });
        expect(result).toMatch(/^\S+ Bruna, Forza: 2d6\+2 = \d+ \[\d+, \d+\] \+ 2, rolled by the player\./);
    });

    it("gives no field for a check with a number, or with more than one name; refuses a field the sheet does not have; with physical dice, asks the numbers in words", async () => {
        let rows: Rows | undefined;
        const page: Player = {
            choose: async (...given: Parameters<Player["choose"]>) => {
                rows = given[4];
                return undefined;
            },
        };
        await ask.run(ask.input.parse({ ...named, options: ["Forza 2d6+5", "Grazia 2d6+grace-bonus+might-bonus"] }), { ...context, page });
        expect(rows?.fields).toEqual([null, null, null]);
        expect(await refused({ ...named, options: ["Forza 2d6+mihgt"] })).toContain("Bruna has no mihgt.");
        expect(await refused({ ...named, options: ["Ingegno 2d6+ingegno"] })).toContain("Bruna has no ingegno.");
        await rpg("config", "dice", "physical");
        expect(await asked(named, 0)).toContain("Forza 2d6+2, Grazia 2d6+1");
    });
});

describe("checks whose dice are written with spaces or a minus, as roll's own advice says (ASK-12)", () => {
    beforeEach(async () => {
        await rpg("write", "Bruna", "--set", "might=7");
    });

    it("takes the dice from the first word that is a die, spaces and a minus included", async () => {
        await asked({ question: "Il muro", options: ["Forza 2d6+might-bonus - 1", "Prova 2d6 + might-bonus"], who: "Bruna" }, undefined);
        expect(shown[0].labels).toEqual(["Forza · 2d6 +1", "Prova · 2d6 +2", "Cambio idea"]);
    });
});

describe("where the player's character moves on the map (ASK-11)", () => {
    /** A page that shows the map and gives back the square touched, the change of mind, or nothing. */
    const pagePicking = (choice: Picked | 0 | undefined): Player => ({
        choose: async () => undefined,
        chooseSquare: async (question, title, change) => {
            shown.push({ question, title, labels: [change] });
            return choice;
        },
    });

    const moved = async (choice: Picked | 0 | undefined): Promise<string> => ask.format(await ask.run(ask.input.parse({ question: "Dove ti sposti?", square: true }), { ...context, page: pagePicking(choice) }));

    beforeEach(async () => {
        await rpg("write", "Sala", "--type", "place", "--text", "```map\n#####\n#...#\n#...#\n#####\n```");
        await rpg("move", "Bruna", "--to", "Sala", "--at", "B2");
    });

    it("shows the map on the page and moves the character to the square touched, telling the master the way", async () => {
        expect(await moved({ square: "D3" })).toBe("The player chose where to go: Bruna: now on D3 in Sala, 5 m from B2.");
        expect(shown).toEqual([{ question: "Dove ti sposti?", title: "Movimento", labels: ["Cambio idea"] }]);
        expect(readLogFile(folder).filter((entry) => entry.type === "asked").at(-1)).toMatchObject({ by: "player", visibility: "public", data: { question: "Dove ti sposti?", answer: "D3" } });
    });

    it("leaves the character where it is when the player changes their mind, and has the master ask in words without a page", async () => {
        expect(await moved(0)).toBe("The player changed their mind: their character does not move. Ask what they do instead, and stop.");
        const inWords = ask.format(await ask.run(ask.input.parse({ question: "Dove ti sposti?", square: true }), { ...context, player: playerClicking(0) }));
        expect(inWords).toContain("which they have not seen: Dove ti sposti? (where their character goes in Sala, in the story's words; then move them with move and at to the square that fits)");
    });

    it("moves no one and logs nothing when the character is no longer on the map the player chose on", async () => {
        await rpg("write", "Cortile", "--type", "place", "--text", "```map\n#####\n#...#\n#####\n```");
        const page: Player = {
            choose: async () => undefined,
            chooseSquare: async () => {
                // While the player chooses, the master moves Bruna elsewhere.
                await rpg("move", "Bruna", "--to", "Cortile", "--at", "B2");
                return { square: "D2" };
            },
        };
        const asked = readLogFile(folder).filter((entry) => entry.type === "asked").length;
        await expect(ask.run(ask.input.parse({ question: "Dove ti sposti?", square: true }), { ...context, page })).rejects.toThrow("Bruna is no longer in Sala, on whose map the player chose D2");
        expect(readLogFile(folder).filter((entry) => entry.type === "asked")).toHaveLength(asked);
    });

    it("is refused with options, and when the character stands in no place with a map", async () => {
        expect(await refused({ question: "Dove ti sposti?", square: true, options: ["Sì", "No"] })).toContain("Give square without options");
        await rpg("write", "Prato", "--type", "place");
        await rpg("move", "Bruna", "--to", "Prato");
        expect(await refused({ question: "Dove ti sposti?", square: true })).toBe("Bruna stands in no place with a map: ask in words where they go, and stop.");
    });

    it("moves no one and logs nothing for a square no one stands on", async () => {
        const asked = readLogFile(folder).filter((entry) => entry.type === "asked").length;
        await expect(moved({ square: "A1" })).rejects.toThrow("The player chose A1, but A1 is a wall: Bruna cannot stand there, and nothing moved. Ask again where they go, and stop.");
        expect(readLogFile(folder).filter((entry) => entry.type === "asked")).toHaveLength(asked);
    });
});

describe("the page and the form at once (ASK-13, D-455)", () => {
    const choice = { question: "Apri la porta della cripta?", options: ["Sì", "No"] };

    /** A way that waits until it is taken away, and says it was. */
    const waiting = (taken: string[], name: string): Player => ({
        choose: (_question, _title, _labels, signal) =>
            new Promise((done) => {
                signal?.addEventListener("abort", () => {
                    taken.push(name);
                    done(undefined);
                });
            }),
    });
    const answering = (index: number | "unavailable" | "absent"): Player => ({ choose: async () => index });

    it("takes the first answer, from the form or from the page, and takes the other away", async () => {
        const taken: string[] = [];
        expect(ask.format(await ask.run(ask.input.parse(choice), { ...context, page: waiting(taken, "page"), player: answering(1) }))).toBe("The player chose: No.");
        expect(taken).toEqual(["page"]);
        expect(ask.format(await ask.run(ask.input.parse(choice), { ...context, page: answering(0), player: waiting(taken, "form") }))).toBe("The player chose: Sì.");
        expect(taken).toEqual(["page", "form"]);
    });

    it("leaves the page to answer when the host shows no form, and asks in words when neither shows", async () => {
        expect(ask.format(await ask.run(ask.input.parse(choice), { ...context, page: answering(0), player: answering("unavailable") }))).toBe("The player chose: Sì.");
        expect(ask.format(await ask.run(ask.input.parse(choice), { ...context, page: answering("absent"), player: answering("unavailable") }))).toContain("The player has no buttons open now");
    });
});

describe("the dice of a rest, spent one at a time on the page (ASK-14, D-492)", () => {
    /** A page that shows the dice of the rest, spends one at each of the player's clicks, then ends it or is left; with what it showed and what was refused. */
    const pageSpending = (clicks: string[], end: 0 | "absent", seen: { shown: SpendAsked[]; refused: (string | undefined)[]; }): Player => ({
        choose: async () => undefined,
        spendDice: async (question, title, done, spending) => {
            shown.push({ question, title, labels: [done] });
            seen.shown.push(spending.shown());

            for (const field of clicks) {
                seen.refused.push(spending.spend(field));
                seen.shown.push(spending.shown());
            }

            return end;
        },
    });

    const rest = { question: "Riposo breve sotto il mulino: quanti dadi vita spendi?", recipe: "breather", who: "Bruna" };
    const spent = async (page: Player): Promise<string> => ask.format(await ask.run(ask.input.parse(rest), { ...context, page }));

    beforeEach(async () => {
        await rpg("write", "Bruna", "--set", "vocations=[[Warden]] 3", "--set", "might=7", "--set", "grit=5/17");
    });

    it("shows the dice and the hit points, spends a die at each click as the player's roll, and gives the master what they healed", async () => {
        const seen = { shown: [] as SpendAsked[], refused: [] as (string | undefined)[] };
        expect(await spent(pageSpending(["stamina-d6", "STAMINA-D6"], 0, seen))).toBe(
            "The player spent 2 of Bruna's dice: stamina-d6 4 + 2 = 6, stamina-d6 4 + 2 = 6; grit 5/17 → 17/17; stamina-d6 3/3 → 1/3. Already written: tell it in the story.",
        );
        expect(shown).toEqual([{ question: rest.question, title: "Riposo", labels: ["Ho finito"] }]);
        expect(seen.refused).toEqual([undefined, undefined]);
        expect(seen.shown[0]).toEqual({ who: "Bruna", dice: [{ field: "stamina-d6", sides: 6, value: 3, max: 3, adds: 2 }], gives: { field: "grit", from: 5, value: 5, max: 17 }, rolls: [], rule: "Each die adds the might bonus" });
        // The system words the dice of its rest, as asking words a roll (D-514).
        expect(seen.shown[2]).toHaveProperty("rule", "Each die adds the might bonus");
        expect(seen.shown[2]).toMatchObject({ dice: [{ field: "stamina-d6", value: 1 }], gives: { from: 5, value: 17 }, rolls: [{ field: "stamina-d6", face: 4, adds: 2, total: 6 }, { face: 4 }] });
        const log = readLogFile(folder);
        const rolls = log.filter((entry) => entry.type === "roll");
        expect(rolls.slice(-2)).toMatchObject([{ by: "player", visibility: "public", data: { who: "Bruna", check: "Fiato d6", total: 6 } }, { by: "player" }]);
        expect(seen.shown[2].rolls.map((roll) => roll.id)).toEqual(rolls.slice(-2).map((entry) => entry.id));
        expect(log.filter((entry) => entry.type === "asked").at(-1)).toMatchObject({ by: "player", data: { question: rest.question, answer: "Ho finito" } });
    });

    it("spends none when the player ends it at once, refuses a die they lack, and keeps what was spent when the page closes first", async () => {
        const seen = { shown: [] as SpendAsked[], refused: [] as (string | undefined)[] };
        expect(await spent(pageSpending(["stamina-d4"], 0, seen))).toBe("The player spends none of Bruna's dice (stamina-d6 3/3).");
        expect(seen.refused).toEqual(["Bruna has no stamina-d4 that breather lets one spend."]);
        const left = await spent(pageSpending(["stamina-d6"], "absent", seen));
        expect(left).toContain("The player spent 1 of Bruna's dice: stamina-d6 4 + 2 = 6; grit 5/17 → 11/17; stamina-d6 3/3 → 2/3.");
        expect(left).toContain('The player closed the page before they were done: ask in words whether they spend more, then change with page Bruna, the dice\'s counter, spend and recipe "breather".');
    });

    it("has the master ask in words without a page, and with physical dice", async () => {
        const inWords = ask.format(await ask.run(ask.input.parse(rest), { ...context, player: playerClicking(0) }));
        expect(inWords).toBe(
            'Ask the player in words, without a word about buttons: Riposo breve sotto il mulino: quanti dadi vita spendi? (the dice of Bruna: stamina-d6 3/3, each 1d6+2; they give grit; then change with page Bruna, the dice\'s counter, spend and recipe "breather", which rolls them). Then stop.',
        );
        await rpg("config", "dice", "physical");
        const physical = ask.format(await ask.run(ask.input.parse(rest), { ...context, page: pageSpending([], 0, { shown: [], refused: [] }) }));
        expect(physical).toContain('they roll them with their own dice: then change with page Bruna, the dice\'s counter, spend, recipe "breather" and values, the faces they tell');
    });

    it("is refused with options, for a recipe that spends no dice, and when no die is left", async () => {
        expect(await refused({ ...rest, options: ["Sì", "No"] })).toContain("Give recipe without options or square");
        expect(await refused({ ...rest, recipe: "night's sleep" })).toBe("night's sleep lets one spend no dice: there is nothing to ask.");
        await rpg("change", "Bruna", "stamina-d6", "--to", "0");
        expect(await refused(rest)).toBe("Bruna has no dice left that breather lets one spend (stamina-d6 0/3): there is nothing to ask.");
    });
});
