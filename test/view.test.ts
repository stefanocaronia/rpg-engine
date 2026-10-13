// The player's view (MECCANICHE, VIEW-1–VIEW-6; D-249, D-250): what the player character knows, a page as it knows it, and the diary; a law on pages made at
// random: no secret it did not discover ever shows, and every public part of a page it knows does.
import fc from "fast-check";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { type Knowledge, knownText } from "../src/commands/game-knowledge.ts";
import type { Context } from "../src/core/context.ts";
import type { Page, World } from "../src/pages/index.ts";
import { inPlay, makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await runCommandLine(["init", "--name", "Prova", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    await ok("write", "Kira", "--type", "character", "--set", "role=pc", "--text", "Una cacciatrice.");
    await ok("write", "Bran", "--type", "character", "--set", "role=companion");
    await ok("write", "Guado", "--type", "place", "--text", "Un villaggio sul fiume.", "--add", "contains=[[Kira]]", "--add", "contains=[[Bran]]");
    await ok("write", "Valle", "--type", "place", "--add", "contains=[[Guado]]");
    await ok("write", "Zaino", "--type", "item", "--text", "Uno zaino di cuoio.");
    await ok("write", "Kira", "--add", "inventory=[[Zaino]]");
    await ok("write", "Varro", "--type", "character", "--set", "role=npc", "--text", "Il mugnaio.");
    await ok("write", "Varro#Passato", "--text", "Era un soldato.");
    await ok("write", "Varro#Colpa", "--secret", "--text", "Ha ucciso il fratello.");
    await ok("write", "Varro#Paura", "--secret", "--text", "Teme il fiume.");
    await ok("write", "Mulino", "--type", "place", "--text", "Una ruota che gira.");
    await ok("write", "Strega", "--type", "character", "--set", "role=npc", "--text", "Vive nel bosco.");
    await ok("write", "Coppa", "--type", "item", "--text", "Una coppa d'argento.");
    await ok("write", "Coppa#Veleno", "--secret", "--text", "Il vino è avvelenato.");
    await ok("write", "Lupo nero", "--type", "creature", "--set", "creature=[[Wolf]]", "--text", "Un lupo enorme.");
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

// The table of what the player character knows (VIEW-2, D-250), before and after a scene with Varro at the mill, which brings Kira there from Guado, and a secret
// of the cup discovered: Valle, around her before, stays known, as she was in it (D-316).
const known: [string, "before" | "after" | "always" | "never"][] = [
    ["Kira", "always"],
    ["Bran", "always"],
    ["Zaino", "always"],
    ["Guado", "always"],
    ["Valle", "always"],
    ["Longsword", "always"],
    ["Varro", "after"],
    ["Mulino", "after"],
    ["Coppa", "after"],
    ["Strega", "never"],
    ["Lupo nero", "never"],
    ["Wolf", "never"],
    ["Nessuno", "never"],
];

describe("the player's view", () => {
    it("VIEW-2: knows itself, the companions, what it carries, the places around it, the system's pages but its creatures; then the scenes it was in and its knows", async () => {
        const knows = async (): Promise<string[]> => {
            const found: string[] = [];

            for (const [name] of known) {
                if (!(await ok("view", name)).startsWith("Kira does not know")) {
                    found.push(name);
                }
            }

            return found;
        };

        expect(await knows()).toEqual(known.filter(([, when]) => when === "always" || when === "before").map(([name]) => name));
        await ok("scene", "open", "--title", "Al mulino", "--type", "social", "--place", "Mulino", "--with", "Kira", "--with", "Varro");
        await ok("scene", "close", "--summary", "Kira parla con Varro.");
        await ok("reveal", "Coppa#Veleno", "--to", "Kira");
        expect(await knows()).toEqual(known.filter(([, when]) => when === "always" || when === "after").map(([name]) => name));
        // A page it does not know reads as one that does not exist.
        expect(await ok("view", "Strega")).toBe("Kira does not know Strega.");
        expect(await ok("view", "Nessuno")).toBe("Kira does not know Nessuno.");
    });

    it("VIEW-3: shows a page's introduction and public sections, and only the secrets discovered, whole or one at a time", async () => {
        await ok("reveal", "Varro", "Varro#Paura", "--to", "Kira");
        expect(await ok("view", "Varro")).toBe("Varro (character)\n\nIl mugnaio.\n\n## Passato\n\nEra un soldato.\n\n> [!secret] Paura\n> Teme il fiume.");
        expect(await ok("view", "Varro#Paura")).toBe("Varro#Paura\n\n> [!secret] Paura\n> Teme il fiume.");
        // The secrets written after a section are in it, as show reads it: the one discovered shows with it.
        expect(await ok("view", "Varro#Passato")).toBe("Varro#Passato\n\n## Passato\n\nEra un soldato.\n\n> [!secret] Paura\n> Teme il fiume.");
        expect(await ok("view", "Varro#Colpa")).toBe("Kira knows nothing of Varro called Colpa.");
        expect(await ok("view", "Strega#Bosco")).toBe("Kira does not know Strega.");
    });

    it("VIEW-3: shows the text of a base only when the character knows it, never a creature's, and a secret of a base as discovered by the base's link (REV-2)", async () => {
        await ok("write", "Mugnaio", "--type", "creature", "--text", "Chi macina il grano.");
        await ok("write", "Mugnaio#Mestiere", "--text", "Lavora all'alba.");
        await ok("write", "Mugnaio#Debito", "--secret", "--text", "Deve soldi al conte.");
        await ok("write", "Dario", "--type", "character", "--set", "role=npc", "--set", "creature=[[Mugnaio]]");
        await ok("reveal", "Dario", "--to", "Kira");
        // Mugnaio is a creature: its text is the master's (D-254).
        expect(await ok("view", "Dario")).toBe("Dario (character)");
        await ok("reveal", "Dario#Debito", "--to", "Kira");
        expect(await ok("view", "Dario")).toBe("Dario (character)\n\n> [!secret] Debito\n> Deve soldi al conte.");
        // The secret is known, the creature that writes it is not.
        expect(await ok("view", "Mugnaio")).toBe("Kira does not know Mugnaio.");
        // An item of the campaign shows the text of the system's item it derives from, which anyone may know.
        await ok("write", "Spada di Kira", "--type", "item", "--set", "item=[[Alchemist's Fire]]");
        await ok("write", "Kira", "--add", "inventory=[[Spada di Kira]]");
        expect(await ok("view", "Spada di Kira")).toMatch(/^Spada di Kira \(item\)\n\n\S/);
    });

    it("VIEW-4: gives the party, the open quests, the open scene and the diary of the public facts, without the master's reasons", async () => {
        await ok("write", "La lanterna", "--type", "quest", "--set", "status=open");
        await ok("write", "Il segreto del conte", "--type", "quest");
        await ok("advance", "--to", "day 1, 18:00", "--why", "il conte trama");
        await ok("scene", "open", "--title", "Al mulino", "--type", "social", "--place", "Mulino", "--with", "Kira", "--with", "Varro");
        await ok("roll", "1d20+2", "--who", "Kira", "--why", "convincere Varro del segreto");
        await ok("roll", "1d20", "--hidden", "--why", "la strega osserva");
        await ok("write", "Kira", "--set", "hp=10/12");
        await ok("change", "Kira", "hp", "--by=-3", "--why", "colpita dalla strega nascosta");
        await ok("write", "Varro", "--set", "umore=5");
        await ok("change", "Varro", "umore", "--to", "3");
        expect(await ok("view")).toBe(
            [
                "Kira, in Mulino: hp 7/12",
                // Kira knows Guado, where she came from, and Valle around it, where she was too (VIEW-2, D-316).
                "Bran (companion), in Guado › Valle",
                "",
                "Open quests: La lanterna",
                "",
                "Scene: Al mulino (social), at Mulino, with Kira and Varro",
                "",
                "Diary:",
                // A quest the character takes is a fact of the story (D-369).
                "- Quest taken: La lanterna",
                "- day 1, 18:00 · The story starts on day 1, 18:00",
                "- day 1, 18:00 · Kira to Mulino",
                "- day 1, 18:00 · Scene opened: Al mulino (social)",
                "- day 1, 18:00 · Kira: 1d20+2 = 6 [4] + 2",
                "- day 1, 18:00 · Kira: hp 10/12 → 7/12",
            ].join("\n"),
        );
        const view = await ok("view", "--diary", "all");
        expect(view).not.toMatch(/conte trama|segreto|strega|umore/);
        expect(await ok("view", "--diary", "1")).toContain("Diary (the last 1 of 6: view, diary all gives every one):\n- day 1, 18:00 · Kira: hp 10/12 → 7/12");
        expect((await rpg("view", "--diary", "0")).output).toBe('"0" is not how many lines of the diary: give a whole number from 1, or all.');
        expect((await rpg("view", "Varro", "--diary", "2")).output).toBe("Give page or diary, not both: diary goes with the whole view.");
    });

    it("VIEW-2: knows the quests the player took, and a known page by its aliases, never an unknown one", async () => {
        for (const [name, status] of [["Presa", "open"], ["Finita", "done"], ["Persa", "failed"], ["Futura", "planned"]]) {
            await ok("write", name, "--type", "quest", "--set", `status=${status}`, "--text", `La missione ${name}.`);
        }

        await ok("write", "Presa#Mandante", "--secret", "--text", "La manda il conte.");
        expect(await ok("view", "Presa")).toBe("Presa (quest)\n\nLa missione Presa.");
        expect(await ok("view", "Finita")).toContain("La missione Finita.");
        expect(await ok("view", "Persa")).toContain("La missione Persa.");
        expect(await ok("view", "Futura")).toBe("Kira does not know Futura.");

        await ok("write", "Varro", "--add", "aliases=il Grasso");
        await ok("write", "Strega", "--add", "aliases=la Vecchia");
        expect(await ok("view", "il Grasso")).toBe("Kira does not know il Grasso.");
        await ok("reveal", "Varro", "--to", "Kira");
        expect(await ok("view", "il Grasso")).toMatch(/^Varro \(character\)\n\nIl mugnaio\./);
        expect(await ok("view", "la Vecchia")).toBe("Kira does not know la Vecchia.");
    });

    it("VIEW-1: says there is no view before there is a player character, and shows the whole sheet of the party", async () => {
        writeFileSync(join(folder, "world", "characters", "Kira.md"), "---\nrole: npc\n---\n");
        expect(await ok("view")).toBe("There is no player character yet: the player's view starts with one.");
        writeFileSync(join(folder, "world", "characters", "Kira.md"), '---\nrole: pc\nclasses: ["[[Fighter]] 1"]\nstr: 16\ndex: 12\ncon: 14\nint: 10\nwis: 10\ncha: 8\nhp-base: 10\nhp: 12/12\n---\nUna cacciatrice.\n');
        expect(await ok("view", "Kira")).toMatch(/^Kira \(character\)\n\n.*str 16 \(\+3\)/s);
        // A group of the sheet, as show gives it (DAT-2).
        expect(await ok("view", "Kira#Abilities")).toMatch(/^Kira#Abilities\n\n.*str 16 \(\+3\)/s);
    });
});

describe("the player's view, after Matteo's round", () => {
    it("D-254: names only who and what the character knows: copies and strangers by the words of the page, unknown places elsewhere", async () => {
        await ok("write", "Lupo mannaro", "--type", "creature", "--text", "Un uomo che diventa lupo.");
        await ok("write", "Covo segreto", "--type", "place");
        // A scene Kira is not in: Bran with the witch, whom Kira never met.
        await ok("scene", "open", "--title", "Nel bosco", "--type", "combat", "--place", "Guado", "--with", "Bran", "--with", "Strega", "--creatures", "Lupo mannaro=2");
        await ok("roll", "1d20+4", "--who", "Lupo mannaro 1");
        await ok("move", "Zaino", "--to", "Strega");
        await ok("move", "Bran", "--to", "Covo segreto");
        const view = await ok("view");
        // The scene went with Bran to a place Kira does not know (CON-6): it has no place she can name.
        expect(view).toContain("Scene: Nel bosco (combat), with Bran, someone, creature 1 and creature 2");
        expect(view).toContain("Bran (companion), elsewhere");
        expect(view).toContain("- A creature: 1d20+4 = 8 [4] + 4");
        expect(view).toContain("- Bran to somewhere");
        expect(view).not.toMatch(/Lupo mannaro|Strega|Covo segreto|Zaino/);
        // A name is written as it is, without a capital that is not its own (D-403).
        await ok("write", "al-Mansur", "--type", "character");
        await ok("write", "Kira", "--add", "knows=[[al-Mansur]]");
        await ok("roll", "1d20", "--who", "al-Mansur");
        expect(await ok("view", "--diary", "1")).toMatch(/- al-Mansur: 1d20 = /);
    });

    it("VIEW-1: is the view of the living player character, when the first one died", async () => {
        await ok("write", "Kira", "--set", "status=dead");
        await ok("write", "Lia", "--type", "character", "--set", "role=pc");
        expect(await ok("view")).toMatch(/^Lia\n/);
        expect(await ok("view", "Lia")).toBe("Lia (character)");
    });

    it("VIEW-3: leaves out comments and undiscovered secrets a few spaces in, gives a section whole, and a group of the party's sheet", async () => {
        writeFileSync(
            join(folder, "world", "characters", "Varro.md"),
            "---\nrole: npc\n---\nIl mugnaio. %% master: è il fratello del conte %%\n<!-- tradirà Kira -->\n\n%%\n> [!secret] Piano\n> Fuggire.\n%%\n\n## Casa\n\nUna casa sul fiume.\n\n### Cantina\n\nUmida.\n\n- Nota\n  > [!secret] Botola\n  > Sotto il tavolo.\n",
        );
        await ok("reveal", "Varro", "--to", "Kira");
        const varro = await ok("view", "Varro");
        expect(varro).toBe("Varro (character)\n\nIl mugnaio.\n\n## Casa\n\nUna casa sul fiume.\n\n### Cantina\n\nUmida.\n\n- Nota");
        expect(await ok("view", "Varro#Casa")).toBe("Varro#Casa\n\n## Casa\n\nUna casa sul fiume.\n\n### Cantina\n\nUmida.\n\n- Nota");
        expect(await ok("view", "Varro#Botola")).toBe("Kira knows nothing of Varro called Botola.");
        writeFileSync(join(folder, "world", "places", "Mulino.md"), "---\n---\nUna ruota.\n\n    > [!secret] Troppo dentro\n    > Non letto.\n");
        expect(await ok("validate")).toContain('Mulino marks a secret that is read as public text: "> [!secret] Troppo dentro".');
    });

    it("VIEW-2: of two pages with one name, gives the one the character knows, and tells nothing of the other", async () => {
        await ok("reveal", "Strega", "--to", "Kira");
        // Pages written by hand with the name of another: validate reports them, the view never tells them.
        writeFileSync(join(folder, "world", "places", "Strega.md"), "---\n---\nUna rupe.\n");
        writeFileSync(join(folder, "world", "places", "Coppa.md"), "---\n---\nUna conca.\n");
        expect(await ok("view", "Strega")).toBe("Strega (character)\n\nVive nel bosco.");
        expect(await ok("view", "Coppa")).toBe("Kira does not know Coppa.");
    });
});

// Pages made at random: an introduction, public sections, secrets with a name or not, from the page or from its base; knows that lists some of them.
// Names are unique in each page; a secret without a name may come more than once.
const parts = fc.uniqueArray(fc.record({ name: fc.constantFrom("Uno", "Due", "Tre", "Quattro", ""), secret: fc.boolean(), base: fc.boolean(), id: fc.nat() }), {
    maxLength: 6,
    selector: (part) => (part.name === "" ? `${part.id}` : `${part.base} ${part.name}`),
});

describe("the laws of the player's view, on pages made at random", () => {
    it("VIEW-3: a known page shows its public parts, those of its base when the character knows the base, and every secret discovered, and no other secret", () => {
        fc.assert(
            fc.property(parts, fc.array(fc.tuple(fc.constantFrom("Pagina", "Base"), fc.constantFrom("Uno", "Due", "Tre", "Quattro")), { maxLength: 4 }), fc.boolean(), (made, discovered, baseKnown) => {
                const write = (holder: string): string =>
                    made.filter((part) => part.base === (holder === "Base") && (part.secret || part.name !== "")).map((part, index) => {
                        const text = `Testo ${holder} ${part.name} ${index}.`;
                        return part.secret ? `> [!secret] ${part.name}\n> ${text}` : `## ${part.name}\n\n${text}`;
                    }).join("\n\n");
                const base: Page = { name: "Base", type: "creature", path: "world/creatures/Base.md", fields: {}, body: write("Base") };
                const page: Page = { name: "Pagina", type: "character", path: "world/characters/Pagina.md", fields: { creature: "[[Base]]" }, body: write("Pagina") };
                const world: World = { root: "", problems: [], pages: [page, base] };
                const secrets = new Set(discovered.map(([holder, name]) => `${holder.toLowerCase()}#${name.toLowerCase()}`));
                // A creature is known only when knows lists it (D-254).
                const knowledge: Knowledge = { pc: page, pages: new Set(baseKnown ? [page, base] : [page]), secrets };
                const shown = knownText(world, knowledge, page);
                const own = new Set(made.filter((part) => !part.base && part.name !== "").map((part) => part.name));

                made.forEach((part, index) => {
                    const holder = part.base ? "Base" : "Pagina";
                    const text = `Testo ${holder} ${part.name} ${made.filter((other) => other.base === part.base && (other.secret || other.name !== "")).indexOf(part)}.`;
                    // A part of the base that the page writes by the same name is the page's (INH-13).
                    const hidden = part.base && part.name !== "" && own.has(part.name);

                    if (!part.secret && part.name !== "") {
                        expect(shown.includes(text), `${index}`).toBe(!hidden && (!part.base || baseKnown));
                    }

                    if (part.secret) {
                        const known = part.name !== "" && secrets.has(`${holder.toLowerCase()}#${part.name.toLowerCase()}`) && !hidden;
                        expect(shown.includes(text), `${index} ${JSON.stringify(made)}`).toBe(known);
                    }
                });
            }),
            { numRuns: 1000 },
        );
    });
});

describe("the place and the scene for the dashboard (VIEW-6, D-310)", () => {
    it("gives where the character is as it knows it: the places around, what holds there, the party and whom it knows, never a stranger", async () => {
        await ok("write", "Guado", "--add", "environment=light: dim", "--add", "contains=[[Varro]]", "--add", "contains=[[Strega]]");
        let place = JSON.parse(await ok("view", "--json")).place;
        expect(place).toMatchObject({ name: "Guado", within: ["Valle"], around: [{ name: "light", value: "dim", place: "Guado" }], text: "Un villaggio sul fiume." });
        // Varro and the witch are there, but Kira knows neither: none of them shows, not even as someone.
        expect(place.here.map((person: { name: string; role: string; }) => `${person.name} ${person.role}`)).toEqual(["Kira pc", "Bran companion"]);
        await ok("write", "Kira", "--add", "knows=[[Varro]]");
        place = JSON.parse(await ok("view", "--json")).place;
        expect(place.here.map((person: { name: string; }) => person.name)).toEqual(["Kira", "Bran", "Varro"]);
    });

    it("marks who attacks the party only when the master says so, and only in a fight; who stops or leaves is calm again (D-415)", async () => {
        await ok("scene", "open", "--title", "Nel bosco", "--type", "combat", "--place", "Guado", "--with", "Kira", "--with", "Bran", "--creatures", "Lupo nero=2");

        const hostile = async (): Promise<string[]> => {
            const overview = JSON.parse(await ok("view", "--json"));
            return overview.openScene.fighters.filter((one: { hostile?: true; }) => one.hostile === true).map((one: { name: string; }) => one.name);
        };

        expect(await hostile()).toEqual([]);
        expect(await ok("scene", "hostile", "--who", "Lupo nero 1")).toBe("Marked hostile: Lupo nero 1. Hostile now: Lupo nero 1.");
        expect(await hostile()).toEqual(["creature 1"]);
        expect(await ok("scene", "calm", "--who", "lupo nero 1")).toBe("Calm: Lupo nero 1. No one is hostile now.");
        expect(await hostile()).toEqual([]);
        await ok("scene", "hostile", "--who", "Lupo nero 2");
        await ok("scene", "leave", "--who", "Lupo nero 2");
        expect(JSON.parse(await ok("view", "--json")).openScene.fighters.some((one: { hostile?: true; }) => one.hostile)).toBe(false);
        expect((await rpg("scene", "hostile", "--who", "Oste")).output).toContain("Oste is not in the scene.");
        await ok("scene", "close", "--summary", "I lupi fuggono.");
        await ok("scene", "open", "--title", "Al guado", "--type", "social", "--place", "Guado", "--with", "Kira");
        expect((await rpg("scene", "hostile", "--who", "Kira")).output).toContain("Al guado is a social scene: hostile and calm mark who fights in a combat scene.");
    });

    it("calls who the character does not know by what it sees of them, as the master said, until it learns their name (D-416)", async () => {
        await ok("write", "Brunilde", "--type", "character", "--text", "Una donna del bosco.");
        await ok(
            "scene",
            "open",
            "--title",
            "Nel bosco",
            "--type",
            "combat",
            "--place",
            "Guado",
            "--with",
            "Kira",
            "--with",
            "Brunilde",
            "--creatures",
            "Lupo nero=2",
            "--seen",
            "Lupo nero=lupo dagli occhi gialli",
            "--seen",
            "Brunilde=donna incappucciata",
        );
        const names = async (): Promise<string[]> => JSON.parse(await ok("view", "--json")).openScene.fighters.map((one: { name: string; }) => one.name);
        expect(await names()).toEqual(["Kira", "donna incappucciata", "lupo dagli occhi gialli 1", "lupo dagli occhi gialli 2"]);
        // Being in the scene does not make her known, not even once it closes.
        expect(JSON.stringify(JSON.parse(await ok("view", "--json")))).not.toContain("Brunilde");
        // A copy's name is told to give it by its creature, as a master wrote it in the dashboard's playtest.
        expect((await rpg("scene", "add", "--seen", "Lupo nero 1=lupo grigio")).output).toContain(
            "seen Lupo nero 1: give it by the creature, Lupo nero, once for all its copies, such as Lupo nero=lupo grigio: they are numbered from those words.",
        );
        // Their rolls are named as the scene named them, and stay so once it closes (D-421).
        await ok("roll", "1d20+3", "--who", "Lupo nero 1", "--check", "Morso");
        await ok("roll", "1d20", "--who", "Brunilde", "--check", "Furtività");
        const rollers = async (): Promise<string[]> => JSON.parse(await ok("view", "--json")).rolls.map((roll: { who?: string; }) => roll.who);
        expect((await rollers()).slice(-2)).toEqual(["lupo dagli occhi gialli 1", "donna incappucciata"]);
        await ok("scene", "close", "--summary", "La donna sparisce nel bosco.");
        expect((await rollers()).slice(-2)).toEqual(["lupo dagli occhi gialli 1", "donna incappucciata"]);
        expect(await ok("view", "--json")).not.toContain("Brunilde");
        expect(JSON.parse(await ok("view", "Brunilde", "--json")).kind).toBe("unknown");
        await ok("scene", "open", "--title", "Ancora nel bosco", "--type", "combat", "--place", "Guado", "--with", "Kira", "--with", "Brunilde", "--seen", "Brunilde=donna incappucciata");
        await ok("write", "Kira", "--add", "knows=[[Brunilde]]");
        expect((await names())[1]).toBe("Brunilde");
        expect((await rpg("scene", "add", "--seen", "Oste=oste")).output).toContain("seen Oste: there is no character or creature of that name in the scene. In it: Kira, Brunilde.");
    });

    it("keeps one given only by what the character sees of them unknown in every scene after, until knows names them (D-416, VIEW-2)", async () => {
        await ok("scene", "open", "--title", "Uno", "--type", "social", "--place", "Guado", "--with", "Kira", "--with", "Varro", "--seen", "Varro=uomo incappucciato");
        expect(await ok("view")).toContain("Scene: Uno (social), at Guado, with Kira and uomo incappucciato");
        await ok("scene", "close", "--summary", "Un incappucciato passa.");
        await ok("scene", "open", "--title", "Due", "--type", "social", "--place", "Guado", "--with", "Kira", "--with", "Varro");
        expect(JSON.parse(await ok("view", "Varro", "--json")).kind).toBe("unknown");
        expect(await ok("scene", "add", "--seen", "Varro=uomo incappucciato")).toBe("Seen: Varro as uomo incappucciato.");
        expect((await rpg("scene", "add", "--seen", "Kira=una cacciatrice")).output).toBe(
            "seen Kira: Kira is of the party, whom the character knows by name. Give seen only for those it does not know, such as a stranger or a creature.",
        );
        await ok("scene", "close", "--summary", "Ancora lui.");
        expect(JSON.parse(await ok("view", "Varro", "--json")).kind).toBe("unknown");
        await ok("write", "Kira", "--add", "knows=[[Varro]]");
        expect(await ok("view", "Varro")).toContain("Il mugnaio.");
    });

    it("gives a fight's fighters in the order of the turns: the party's counter as numbers, a foe's in words, who does not act, the panel of the dying (D-314)", async () => {
        await ok("write", "Kira", "--set", "hp=0/12");
        await ok("scene", "open", "--title", "Nel bosco", "--type", "combat", "--place", "Guado", "--with", "Kira", "--with", "Bran", "--creatures", "Lupo nero=2");
        await ok("scene", "order", "--order", "Lupo nero 1", "--order", "Kira", "--order", "Lupo nero 2", "--order", "Bran");
        // The wolf's 11 hit points, 5 left: half or less.
        await ok("change", "Lupo nero 1", "hp", "--by=-6");
        await ok("effect", "add", "Lupo nero 2", "Stunned");
        await ok("effect", "add", "Lupo nero 2", "Maledizione");
        // At the first wolf's turn: the blessing ends at its turn in the next round.
        await ok("effect", "add", "Bran", "Benedizione", "--for", "1 round");
        const overview = JSON.parse(await ok("view", "--json"));
        const fighters = overview.openScene.fighters;
        expect(fighters.map((fighter: { name: string; }) => fighter.name)).toEqual(["creature 1", "Kira", "creature 2", "Bran"]);
        expect(fighters[0]).toEqual({ name: "creature 1", role: "other", stranger: true, health: "bloodied", effects: [] });
        // Of a foe only the conditions anyone sees, by name; a stunned one does not act. The party's effects as their line gives them, with the end, at the turn
        // of a creature the character does not know by its number (VIEW-4).
        expect(fighters[2]).toMatchObject({ health: "unhurt", effects: [{ name: "Stunned", text: "Stunned" }], inactive: true });
        expect(fighters[3].effects).toEqual([{ name: "Benedizione", end: { round: 2, turn: "creature 1" }, text: "Benedizione until round 2, creature 1" }]);
        expect(overview.party[1].effects).toEqual(fighters[3].effects);
        expect(fighters[1]).toMatchObject({ role: "pc", health: "0/12", dying: [{ field: "death-successes", value: 0, limit: 3 }, { field: "death-failures", value: 0, limit: 3 }] });
        // The same panel in the band of her sheet (D-310 (7)); none for Bran, who has no hit points at 0.
        expect(overview.party[0].dying).toEqual(fighters[1].dying);
        expect(overview.party[1].dying).toBeUndefined();
        // Nowhere the copies' names, of a creature the character does not know: in the diary the end is at a creature's turn.
        expect(JSON.stringify(overview)).not.toContain("Lupo nero");
        expect(overview.diary).toContain("Bran: Benedizione until round 2, a creature");
    });

    it("gives the state of each one at the place, in the scene and on the map: the party's effects, of the others the conditions anyone sees; none for someone (D-419)", async () => {
        await ok("write", "Radura", "--type", "place", "--text", "```map\n#######\n#.....#\n#.....#\n#######\n```");

        for (const [who, square] of [["Kira", "B2"], ["Bran", "C2"], ["Varro", "D2"], ["Strega", "E2"]]) {
            await ok("move", who, "--to", "Radura", "--at", square);
        }

        // The witch, seen once only as an old woman, stays unknown: in a scene where the master gives no words, she is someone (D-416).
        await ok("scene", "open", "--title", "Prima", "--type", "social", "--place", "Radura", "--with", "Kira", "--with", "Strega", "--seen", "Strega=vecchia");
        await ok("scene", "close", "--summary", "Una vecchia passa.");
        await ok("write", "Kira", "--set", "hp=0/12");
        const args = ["--with", "Kira", "--with", "Bran", "--with", "Varro", "--with", "Strega", "--creatures", "Lupo nero=1", "--creatures", "Wolf=2", "--seen", "Varro=uomo incappucciato"];
        await ok("scene", "open", "--title", "Radura", "--type", "combat", "--place", "Radura", ...args);
        await ok("move", "Lupo nero 1", "--at", "B3");
        await ok("move", "Wolf 1", "--at", "C3");
        await ok("move", "Wolf 2", "--at", "D3");
        await ok("effect", "add", "Bran", "Prone");
        await ok("effect", "add", "Bran", "Benedizione");
        await ok("effect", "add", "Varro", "Stunned");
        await ok("effect", "add", "Varro", "Maledizione");
        await ok("effect", "add", "Strega", "Prone");
        await ok("change", "Lupo nero 1", "hp", "--to=0");
        await ok("effect", "add", "Lupo nero 1", "prone");
        await ok("effect", "add", "Wolf 1", "Prone");
        // Each condition with its drawing, as the 5e gives one (condition-icons).
        const drawn = expect.any(String) as unknown as string;
        const prone = { name: "Prone", text: "Prone", condition: true, icon: drawn };
        const bran = { effects: [prone, { name: "Benedizione", text: "Benedizione" }] };
        const varro = { effects: [{ name: "Stunned", text: "Stunned", condition: true, icon: drawn }], inactive: true };
        const state = ({ effects, inactive, down, dead }: Record<string, unknown>): Record<string, unknown> => JSON.parse(JSON.stringify({ effects, inactive, down, dead }));
        const states = (people: Record<string, unknown>[]): Record<string, unknown> => Object.fromEntries(people.map((one) => [one.name, state(one)]));
        let overview = JSON.parse(await ok("view", "--json"));
        // Kira at 0; Bran's blessing too, which is no condition; the hooded man by the conditions anyone sees, one keeping him from acting; the witch nothing.
        expect(states(overview.place.here)).toEqual({ Kira: { down: true }, Bran: bran });
        const atZero = { effects: [{ name: "prone", text: "prone", condition: true, icon: drawn }], down: true };
        // A kind of one copy shows its copy's state, the name as written; a kind of two none, each its own on the map.
        expect(states(overview.openScene.who)).toEqual({ Kira: { down: true }, Bran: bran, "uomo incappucciato": varro, someone: {}, "creature A": atZero, "creature B": {} });
        expect(states(overview.place.map.at)).toEqual({ Kira: { down: true }, Bran: bran, "uomo incappucciato": varro, someone: {}, "creature A1": atZero, "creature B1": { effects: [prone] }, "creature B2": {} });
        // The same marks in Combat.
        expect(overview.openScene.fighters.find((one: { name: string; }) => one.name === "Bran").effects).toEqual(bran.effects);
        await ok("write", "Kira", "--add", "knows=[[Varro]]");
        await ok("write", "Bran", "--set", "status=dead");
        overview = JSON.parse(await ok("view", "--json"));
        expect(states(overview.place.here)).toEqual({ Kira: { down: true }, Varro: varro });
        expect(states(overview.openScene.who)).toMatchObject({ Bran: { ...bran, dead: true }, Varro: varro });
    });

    it("gives someone of the party at the dying point the panel of the dying in their band, outside a fight too; never the dead (D-310 (7))", async () => {
        await ok("write", "Bran", "--set", "hp=0/9", "--set", "death-failures=2");
        const dying = [{ field: "death-successes", value: 0, limit: 3 }, { field: "death-failures", value: 2, limit: 3 }];
        expect(JSON.parse(await ok("view", "--json")).party[1].dying).toEqual(dying);
        await ok("change", "Bran", "hp", "--to=1");
        expect(JSON.parse(await ok("view", "--json")).party[1].dying).toBeUndefined();
        await ok("change", "Bran", "hp", "--to=0");
        await ok("write", "Bran", "--set", "status=dead");
        expect(JSON.parse(await ok("view", "--json")).party[1]).toMatchObject({ dead: true });
        expect(JSON.parse(await ok("view", "--json")).party[1].dying).toBeUndefined();
    });

    it("gives the open scene as data: whom it meets there by name (VIEW-2), the copies counted, the turns as the character knows them", async () => {
        await ok("scene", "open", "--title", "Nel bosco", "--type", "combat", "--place", "Guado", "--with", "Kira", "--with", "Strega", "--creatures", "Lupo nero=2");
        await ok("scene", "order", "--order", "Kira", "--order", "Lupo nero 1", "--order", "Strega");
        const scene = JSON.parse(await ok("view", "--json")).openScene;
        expect(scene).toMatchObject({ title: "Nel bosco", type: "combat", place: "Guado", order: ["Kira", "creature 1", "Strega"], turn: "Kira", round: 1 });
        // The witch, met in the scene, is known by name (VIEW-2); the copies of a creature Kira was never told of are counted, never named (D-254).
        expect(scene.who).toEqual([
            expect.objectContaining({ name: "Kira", role: "pc" }),
            { name: "Strega", role: "other" },
            { name: "creature", role: "other", stranger: true, count: 2 },
        ]);
        expect(JSON.stringify(scene)).not.toContain("Lupo nero");
    });
});
