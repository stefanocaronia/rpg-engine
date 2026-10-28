// The player's actions from the dashboard as their own sentences (D-495): the page writes them from models without articles, in the page's language, with
// the names it shows; which lines act is the system's word; who may be named; how a sentence said stands as the server tells it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { actPeople, actSentence, actTitle, itemVerbs, saidStates, setSystemVerbs, spokenBy, talkSentence, targetMode, verbLabel } from "../src/dashboard/acts/acts.ts";
import type { ShownPlace, ShownScene } from "../src/dashboard/data.ts";
import { systemNameLabel } from "../src/dashboard/labels.ts";
import { setLanguage, setSystemWords } from "../src/dashboard/text.ts";
import { findSystem, systemWords } from "../src/systems/index.ts";
import { pageFolder } from "./i18n/phrases.ts";
import { testSystemFolders } from "./support.ts";

const italian = (): Promise<Record<string, string>> => Promise.resolve(JSON.parse(readFileSync(join(pageFolder, "i18n", "it.json"), "utf8")) as Record<string, string>);

describe("the player's sentence (D-495)", () => {
    afterAll(async () => {
        setSystemVerbs(undefined);
        setSystemWords(undefined);
        await setLanguage("en");
    });

    it("writes each of the engine's verbs with someone, a square, the character itself or no one, in English", async () => {
        await setLanguage("en");
        expect([
            actSentence("attack", "Mace", { person: "Hooded Bandit 1" }),
            actSentence("attack", "Mace", { square: "G7" }),
            actSentence("attack", "Mace"),
            actSentence("use", "Torches"),
            actSentence("use", "Shield", "none"),
            actSentence("equip", "Shield", { person: "Lupa" }),
            actSentence("unequip", "Shield"),
            talkSentence("Bruno"),
        ]).toEqual([
            "I attack Hooded Bandit 1 with Mace.",
            "I attack at G7 with Mace.",
            "I attack with Mace.",
            "I use Torches.",
            "I use Shield.",
            "I equip Shield.",
            "I put away Shield.",
            "I talk to Bruno: ",
        ]);
    });

    it("writes them in Italian without articles, the names as the page shows them", async () => {
        await setLanguage("it", italian);
        expect([
            actSentence("attack", "Mazza", { person: "Brigante incappucciato 1" }),
            actSentence("use", "Torce", "self"),
            actSentence("equip", "Scudo"),
            actSentence("unequip", "Scudo"),
            talkSentence("Bruno"),
            actTitle("attack", "Mazza"),
        ]).toEqual([
            "Attacco Brigante incappucciato 1 con Mazza.",
            "Uso Torce su di me.",
            "Mi equipaggio con Scudo.",
            "Metto via Scudo.",
            "Parlo con Bruno: ",
            "Attacca con Mazza",
        ]);
    });

    it("writes a verb the system declares with its own sentences, in the campaign's language through its words, and without them as the engine's use (D-514)", async () => {
        const fake = findSystem(testSystemFolders, "fake");
        setSystemVerbs(fake?.sheetVerbs);
        await setLanguage("en");
        setSystemWords(undefined);
        expect([actSentence("invoke", "Rite of Mist", { person: "Lupa" }), actSentence("invoke", "Rite of Mist", "self"), actTitle("invoke", "Rite of Mist"), verbLabel("invoke")]).toEqual([
            "I invoke Rite of Mist upon Lupa.",
            "I invoke Rite of Mist upon myself.",
            "Invoke Rite of Mist",
            "Invoke",
        ]);

        await setLanguage("it", italian);
        setSystemWords(systemWords(fake!.folder, "it"));
        expect([actSentence("invoke", "Rito della nebbia", { square: "G7" }), actSentence("invoke", "Rito della nebbia"), actTitle("invoke", "Rito della nebbia"), verbLabel("invoke")]).toEqual([
            "Invoco Rito della nebbia verso G7.",
            "Invoco Rito della nebbia.",
            "Invoca Rito della nebbia",
            "Invoca",
        ]);

        setSystemVerbs(undefined);
        expect(actSentence("invoke", "Rito della nebbia")).toBe("Uso Rito della nebbia.");
    });

    it("tries an ability of free play and uses its things, in Italian with its words; its badge says libero, another system's its name (D-521)", async () => {
        const free = findSystem(testSystemFolders, "free");
        expect(free?.sheetActions).toEqual({ abilities: ["try"], inventory: ["use"] });
        setSystemVerbs(free?.sheetVerbs);
        await setLanguage("it", italian);
        setSystemWords(systemWords(free!.folder, "it"));
        expect([
            actSentence("try", "Leggere le persone", { person: "Bertoldo" }),
            actSentence("try", "Navigare"),
            actSentence("try", "Il coltello lungo", "self"),
            actTitle("try", "Navigare"),
            verbLabel("try"),
            actSentence("use", "Corda"),
            systemNameLabel("free"),
            systemNameLabel("5e"),
        ]).toEqual([
            "Provo con Leggere le persone su Bertoldo.",
            "Provo con Navigare.",
            "Provo con Il coltello lungo su di me.",
            "Prova con Navigare",
            "Prova",
            "Uso Corda.",
            "libero",
            "5e",
        ]);
        setSystemVerbs(undefined);
        setSystemWords(undefined);
    });

    it("puts who acts in front with more than one player character, as the master reads it, and leaves the sentence as it is for one (D-480 (8))", () => {
        expect(spokenBy("Attacco Brigante incappucciato 1 con Dagger.", "Mira")).toBe("Mira: Attacco Brigante incappucciato 1 con Dagger.");
        expect(spokenBy("Parlo con Bruno: ", undefined)).toBe("Parlo con Bruno: ");
    });

    it("asks someone for an attack, lets the player choose for a use or a system's verb that says on whom, and goes straight to the sentence for the rest", () => {
        setSystemVerbs({
            invoke: { label: "Invoke", title: "Invoke {item}", says: "I invoke {item}.", on: "on {target} {item}", at: "at {square} {item}", self: "{item}" },
            bind: { label: "Bind", title: "Bind {item}", says: "I bind {item}." },
        });
        expect(["attack", "use", "equip", "unequip", "invoke", "bind"].map(targetMode)).toEqual(["asks", "lets", "none", "none", "lets", "none"]);
        setSystemVerbs(undefined);
    });
});

describe("which lines of the sheet act (D-495)", () => {
    const actions = { attack: ["attack" as const], inventory: ["use" as const, "equip" as const], equipped: ["use" as const, "unequip" as const] };
    const value = (field: string) => ({ field, text: "1", marks: 0 });

    it("gives an attack's line the verbs of the first of its values the system names", () => {
        expect(itemVerbs(actions, { item: "Mace", values: [value("attack"), value("damage-roll")] })).toEqual(["attack"]);
    });

    it("gives what the character carries the inventory's verbs, and a thing equipped those of what is equipped", () => {
        expect(itemVerbs(actions, { item: "Torches", values: [value("quantity")] })).toEqual(["use", "equip"]);
        expect(itemVerbs(actions, { item: "Shield", values: [value("quantity")], equipped: true })).toEqual(["use", "unequip"]);
        expect(itemVerbs({ inventory: ["use"] }, { item: "Shield", values: [value("quantity")], equipped: true })).toEqual(["use"]);
    });

    it("gives no verbs where the system names none, as a game without sheet-actions", () => {
        expect(itemVerbs(undefined, { item: "Mace", values: [value("attack")] })).toBeUndefined();
        expect(itemVerbs({ spells: ["cast"] }, { item: "Mace", values: [value("attack")] })).toBeUndefined();
    });
});

describe("whom a sentence names (D-495)", () => {
    const at = [
        { name: "Ettore", role: "pc" as const, square: "E6" },
        { name: "creature 1", role: "other" as const, stranger: true as const, hostile: true as const, square: "I4", distance: "6 m" },
        { name: "Lupa", role: "companion" as const, square: "F6", distance: "1.5 m" },
    ];
    const place: ShownPlace = { name: "Inn", within: [], around: [], text: "", here: [], map: { columns: 2, rows: 2, lines: [], legend: [], ground: "floor", exits: [], at } };

    it("names the companions first, then those at the place as the page labels them, never the player's own character", async () => {
        await setLanguage("en");
        expect(actPeople(place, undefined, ["Lupa", "Bruno"])).toEqual([
            { name: "Lupa", role: "companion", square: "F6", distance: "1.5 m" },
            { name: "Bruno", role: "companion" },
            { name: "Creature 1", role: "other", hostile: true, square: "I4", distance: "6 m" },
        ]);
    });

    it("with more than one player character, names the others first, never the one acting (VIEW-12)", () => {
        const two: ShownPlace = { ...place, map: { ...place.map!, at: [...at, { name: "Mira", role: "pc", square: "E5", distance: "1.5 m" }] } };
        expect(actPeople(two, undefined, [], "Mira").map((person) => person.name)).toEqual(["Ettore", "Lupa", "Creature 1"]);
        expect(actPeople(two, undefined, []).map((person) => person.name)).toEqual(["Lupa", "Creature 1"]);
    });

    it("names those of the scene without a map, with how many copies", () => {
        const scene: ShownScene = { title: "Brawl", type: "combat", who: [{ name: "Ettore", role: "pc" }, { name: "giant rat", role: "other", stranger: true, count: 3 }] };
        expect(actPeople({ name: "Inn", within: [], around: [], text: "", here: [] }, scene, [])).toEqual([{ name: "Giant rat", role: "other", count: 3 }]);
    });
});

describe("how a sentence said stands (D-495)", () => {
    const said = [{ id: "a", text: "I attack." }, { id: "b", text: "I use Torches." }, { id: "c", text: "I cast Bless.", copied: true }];

    it("waits while the server holds it, is heard once the master's call took it, and stays copied for the chat", () => {
        expect(saidStates(said, { pending: [{ id: "a", text: "I attack." }], heard: ["b"], bell: true }, true).map((one) => one.state)).toEqual(["said", "heard", "copied"]);
    });

    it("is called, no longer to take back, once the doorbell rang for it; lost if the game goes before the master reads it", () => {
        const rung = { pending: [{ id: "a", text: "I attack.", rung: true }, { id: "b", text: "I use Torches." }], heard: [], bell: true };
        expect(saidStates(said.slice(0, 2), rung, true).map((one) => one.state)).toEqual(["called", "said"]);
        expect(saidStates(said.slice(0, 1), rung, false).map((one) => one.state)).toEqual(["lost"]);
    });

    it("is lost while the game is away, and after, unless the server still holds it", () => {
        const shown = { pending: [{ id: "a", text: "I attack." }], heard: [], bell: true };
        expect(saidStates(said.slice(0, 1), shown, false).map((one) => one.state)).toEqual(["lost"]);
        expect(saidStates([{ ...said[0], lost: true }], shown, true).map((one) => one.state)).toEqual(["said"]);
        expect(saidStates([{ ...said[0], lost: true }], { pending: [], heard: [], bell: false }, true).map((one) => one.state)).toEqual(["lost"]);
    });

    it("leaves out one the server no longer knows of, heard long ago or taken back", () => {
        expect(saidStates(said.slice(0, 2), { pending: [], heard: [], bell: true }, true)).toEqual([]);
    });
});
