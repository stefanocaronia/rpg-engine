// The player's actions from the dashboard as their own sentences (D-495): the page writes them from models without articles, in the page's language, with
// the names it shows; which lines act is the system's word; who may be named; how a sentence said stands as the server tells it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { actPeople, actSentence, actTitle, itemVerbs, saidStates, talkSentence, targetMode } from "../src/dashboard/acts.ts";
import type { ShownPlace, ShownScene } from "../src/dashboard/data.ts";
import { setLanguage } from "../src/dashboard/text.ts";
import { pageFolder } from "./i18n/phrases.ts";

const italian = (): Promise<Record<string, string>> => Promise.resolve(JSON.parse(readFileSync(join(pageFolder, "i18n", "it.json"), "utf8")) as Record<string, string>);

describe("the player's sentence (D-495)", () => {
    afterAll(async () => {
        await setLanguage("en");
    });

    it("writes each verb with someone, a square, the character itself or no one, in English", async () => {
        await setLanguage("en");
        expect([
            actSentence("attack", "Mace", { person: "Hooded Bandit 1" }),
            actSentence("attack", "Mace", { square: "G7" }),
            actSentence("attack", "Mace"),
            actSentence("cast", "Healing Word", { person: "Lupa" }),
            actSentence("cast", "Guiding Bolt", { square: "G7" }),
            actSentence("cast", "Bless", "self"),
            actSentence("use", "Torches"),
            actSentence("use", "Shield", "none"),
            actSentence("equip", "Shield", { person: "Lupa" }),
            actSentence("unequip", "Shield"),
            actSentence("prepare", "Bless"),
            talkSentence("Bruno"),
        ]).toEqual([
            "I attack Hooded Bandit 1 with Mace.",
            "I attack at G7 with Mace.",
            "I attack with Mace.",
            "I cast Healing Word on Lupa.",
            "I cast Guiding Bolt at G7.",
            "I cast Bless on myself.",
            "I use Torches.",
            "I use Shield.",
            "I equip Shield.",
            "I put away Shield.",
            "I prepare Bless.",
            "I talk to Bruno: ",
        ]);
    });

    it("writes them in Italian without articles, the names as the page shows them", async () => {
        await setLanguage("it", italian);
        expect([
            actSentence("attack", "Mazza", { person: "Brigante incappucciato 1" }),
            actSentence("cast", "Parola guaritrice", { person: "Lupa" }),
            actSentence("cast", "Dardo guida", { square: "G7" }),
            actSentence("use", "Torce", "self"),
            actSentence("equip", "Scudo"),
            actSentence("unequip", "Scudo"),
            actSentence("prepare", "Benedizione"),
            talkSentence("Bruno"),
            actTitle("attack", "Mazza"),
        ]).toEqual([
            "Attacco Brigante incappucciato 1 con Mazza.",
            "Lancio Parola guaritrice su Lupa.",
            "Lancio Dardo guida verso G7.",
            "Uso Torce su di me.",
            "Mi equipaggio con Scudo.",
            "Metto via Scudo.",
            "Preparo Benedizione.",
            "Parlo con Bruno: ",
            "Attacca con Mazza",
        ]);
    });

    it("asks someone for an attack, lets the player choose for a spell or a use, and goes straight to the sentence for the rest", () => {
        expect((["attack", "cast", "use", "equip", "unequip", "prepare"] as const).map(targetMode)).toEqual(["asks", "lets", "lets", "none", "none", "none"]);
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
