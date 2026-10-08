// The player's view (MECCANICHE, VIEW-1–VIEW-5; D-249, D-250): what the player character knows, a page as it knows it, and the diary; a law on pages made at
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
// of the cup discovered: Valle, around her before, is no more.
const known: [string, "before" | "after" | "always" | "never"][] = [
    ["Kira", "always"],
    ["Bran", "always"],
    ["Zaino", "always"],
    ["Guado", "always"],
    ["Valle", "before"],
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
                // Kira knows Guado, where she came from, no more Valle around it (VIEW-2).
                "Bran (companion), in Guado",
                "",
                "Open quests: La lanterna",
                "",
                "Scene: Al mulino (social), at Mulino, with Kira and Varro",
                "",
                "Diary:",
                "- day 1, 18:00 · The story starts on day 1, 18:00",
                "- day 1, 18:00 · Kira to Mulino",
                "- day 1, 18:00 · Scene opened: Al mulino (social)",
                "- day 1, 18:00 · Kira: 1d20+2 = 6 [4] + 2",
                "- day 1, 18:00 · Kira: hp 10/12 → 7/12",
            ].join("\n"),
        );
        const view = await ok("view", "--diary", "all");
        expect(view).not.toMatch(/conte trama|segreto|strega|umore/);
        expect(await ok("view", "--diary", "1")).toContain("Diary (the last 1 of 5: view, diary all gives every one):\n- day 1, 18:00 · Kira: hp 10/12 → 7/12");
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
    it("D-254: names only who and what the character knows: copies are counted, strangers are someone, unknown places elsewhere", async () => {
        await ok("write", "Lupo mannaro", "--type", "creature", "--text", "Un uomo che diventa lupo.");
        await ok("write", "Covo segreto", "--type", "place");
        // A scene Kira is not in: Bran with the witch, whom Kira never met.
        await ok("scene", "open", "--title", "Nel bosco", "--type", "combat", "--place", "Guado", "--with", "Bran", "--with", "Strega", "--creatures", "Lupo mannaro=2");
        await ok("roll", "1d20+4", "--who", "Lupo mannaro 1");
        await ok("move", "Zaino", "--to", "Strega");
        await ok("move", "Bran", "--to", "Covo segreto");
        const view = await ok("view");
        // The scene went with Bran to a place Kira does not know (CON-6): it has no place she can name.
        expect(view).toContain("Scene: Nel bosco (combat), with Bran, someone and 2 creatures");
        expect(view).toContain("Bran (companion), elsewhere");
        expect(view).toContain("- A creature: 1d20+4 = 8 [4] + 4");
        expect(view).toContain("- Bran to somewhere");
        expect(view).not.toMatch(/Lupo mannaro|Strega|Covo segreto|Zaino/);
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
