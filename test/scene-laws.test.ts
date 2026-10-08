// The laws of scenes (MECCANICHE, SCN-1–SCN-9): turns and copy names made at random against a model; runs of scene actions on a campaign, against a model of who is
// in the scene, the copies and the order of turns.
import fc from "fast-check";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { scene } from "../src/commands/scene.ts";
import type { LogEntry } from "../src/core/log.ts";
import { copyNames, nextTurn } from "../src/scene/index.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

const runs = { numRuns: 2000 };

describe("the laws of turns and copy names, made at random", () => {
    it("SCN-6: next goes through the order one by one, and after the last starts a new round from the first", () => {
        fc.assert(
            fc.property(fc.uniqueArray(fc.constantFrom("Kira", "Bran", "Lupo 1", "Lupo 2", "Varro"), { minLength: 1 }), fc.nat(10), fc.integer({ min: 1, max: 20 }), (order, start, round) => {
                let turn: { turn: string; round: number; } = { turn: order[start % order.length], round };

                for (let step = 1; step <= order.length; step++) {
                    turn = nextTurn(order, turn.turn, turn.round);
                    expect(turn.turn).toBe(order[(start + step) % order.length]);
                    expect(turn.round).toBe(round + (start % order.length + step >= order.length ? 1 : 0));
                }
            }),
            runs,
        );
    });

    it("SCN-3: new copies are numbered one after another, after the highest number their creature's name already takes, in any case", () => {
        fc.assert(
            fc.property(fc.array(fc.tuple(fc.constantFrom("Lupo", "lupo", "Lupo grigio", "Ombra"), fc.integer({ min: 1, max: 12 }))), fc.integer({ min: 1, max: 5 }), (taken, count) => {
                const names = taken.map(([name, number]) => `${name} ${number}`);
                const highest = Math.max(0, ...taken.filter(([name]) => name.toLowerCase() === "lupo").map(([, number]) => number));
                expect(copyNames("Lupo", count, names)).toEqual(Array.from({ length: count }, (_, index) => `Lupo ${highest + index + 1}`));
            }),
            runs,
        );
    });
});

// A run of scene actions: who and which copies are named by their place among those in the scene, counted round, 9 being someone who is not in it; an order
// names each once, unless it repeats on purpose.
const characters = ["Kira", "Bran", "Varro", "Lena"];
const creatures = fc.record({ Lupo: fc.nat(3), Ombra: fc.nat(2) }).map((counts) => Object.fromEntries(Object.entries(counts).filter(([, count]) => count > 0)));
type Action =
    | { action: "open"; with?: string[]; creatures: Record<string, number>; }
    | { action: "add"; with: string[]; creatures: Record<string, number>; again: boolean; }
    | { action: "leave"; who: number[]; }
    | { action: "order"; order: number[]; repeat: boolean; }
    | { action: "next"; }
    | { action: "close"; };
const actions: fc.Arbitrary<Action> = fc.oneof(
    { arbitrary: fc.record({ action: fc.constant("open" as const), with: fc.option(fc.subarray(characters), { nil: undefined }), creatures }), weight: 2 },
    // add brings in someone already in the scene only when again says so.
    { arbitrary: fc.record({ action: fc.constant("add" as const), with: fc.subarray(characters, { maxLength: 2 }), creatures, again: fc.constantFrom(false, false, false, true) }), weight: 3 },
    { arbitrary: fc.record({ action: fc.constant("leave" as const), who: fc.array(fc.nat(9), { minLength: 1, maxLength: 2 }) }), weight: 2 },
    { arbitrary: fc.record({ action: fc.constant("order" as const), order: fc.array(fc.nat(9), { minLength: 1, maxLength: 5 }), repeat: fc.boolean() }), weight: 3 },
    { arbitrary: fc.record({ action: fc.constant("next" as const) }), weight: 4 },
    { arbitrary: fc.record({ action: fc.constant("close" as const) }), weight: 1 },
);

/** The scene as the model keeps it: who is in it, the copies in the order they came, who left, and the turns. */
interface Model
{
    open: boolean;
    with: string[];
    copies: string[];
    left: string[];
    order?: string[];
    round?: number;
    turn?: string;
}

describe("the laws of scenes, on runs of actions made at random", () => {
    it("SCN-1–SCN-9: each action changes the scene as the model says, refuses what it refuses without writing anything, and logs only the opening and the close publicly", async () => {
        const outcomes = new Set<string>();
        await fc.assert(
            fc.asyncProperty(fc.array(actions, { minLength: 1, maxLength: 16 }), async (run) => {
                const root = sceneCampaign();
                let model: Model = { open: false, with: [], copies: [], left: [] };

                try {
                    for (const action of run) {
                        const members = [...model.with, ...model.copies];
                        const named = (index: number): string => (index === 9 || members.length === 0 ? "Nessuno" : members[index % members.length]);
                        const order = action.action === "order" ? action.order.map(named) : [];
                        const input = action.action === "leave"
                            ? { action: "leave", who: action.who.map(named) }
                            : action.action === "order"
                            ? { action: "order", order: action.repeat ? order : [...new Set(order)] }
                            : action.action === "add"
                            ? { action: "add", creatures: action.creatures, with: action.again ? action.with : action.with.filter((name) => !members.includes(name)) }
                            : action;
                        const expected = sceneByModel(model, input as Input);
                        const state = readFileSync(join(root, "state.yaml"), "utf8");
                        const lines = readLog(root).length;
                        let refused = false;

                        try {
                            const extra = input.action === "close" ? { summary: "Finita." } : input.action === "open" ? { title: "Lo scontro", type: "combat" } : {};
                            await scene.run(scene.input.parse({ ...input, ...extra }), testContext(root));
                        } catch {
                            refused = true;
                        }

                        const label = `${JSON.stringify(input)} on ${JSON.stringify(model)}`;
                        outcomes.add(`${action.action} ${expected === "refused" ? "refused" : "done"}`);
                        expect(refused, label).toBe(expected === "refused");

                        if (expected === "refused") {
                            expect(readFileSync(join(root, "state.yaml"), "utf8"), label).toBe(state);
                            expect(readLog(root).length, label).toBe(lines);
                            continue;
                        }

                        const logged = readLog(root).slice(lines);
                        expect(logged.every((entry) => entry.visibility === (["scene-opened", "scene-closed"].includes(entry.type) ? "public" : "hidden")), label).toBe(true);

                        if (action.action === "close") {
                            expect(logged.at(-1)?.type, label).toBe("scene-closed");
                            expect(logged.at(-1)?.data.rounds, label).toBe(model.round);
                        }

                        model = expected;
                        expect(sceneInState(root), label).toEqual(model.open ? shown(model) : undefined);
                    }
                } finally {
                    removeFolder(root);
                }
            }),
            { numRuns: 200 },
        );
        expect([...outcomes].sort()).toEqual(["add", "close", "leave", "next", "open", "order"].flatMap((action) => [`${action} done`, `${action} refused`]));
    }, 120000);
});

type Input =
    | { action: "open"; with?: string[]; creatures: Record<string, number>; }
    | { action: "add"; with: string[]; creatures: Record<string, number>; }
    | { action: "leave"; who: string[]; }
    | { action: "order"; order: string[]; }
    | { action: "next"; }
    | { action: "close"; };

/** What an action does to the scene, by the model (SCN-1–SCN-7), or "refused". */
function sceneByModel(model: Model, input: Input): Model | "refused"
{
    if (input.action === "open") {
        // Without with, or with an empty one, the party enters: Kira, the player's character, and Bran, the companion; no one has a place, so no one moves.
        const entering = [...new Set(input.with === undefined || input.with.length === 0 ? ["Bran", "Kira"] : input.with)];
        return model.open ? "refused" : { open: true, with: entering, copies: newCopiesByModel([...entering], input.creatures), left: [] };
    }

    if (!model.open) {
        return "refused";
    }

    const members = [...model.with, ...model.copies];

    switch (input.action) {
        case "add": {
            const entering = [...new Set(input.with)];

            if ((entering.length === 0 && Object.keys(input.creatures).length === 0) || entering.some((name) => members.includes(name))) {
                return "refused";
            }

            const copies = newCopiesByModel([...members, ...model.left, ...entering], input.creatures);
            return { ...model, with: [...model.with, ...entering], copies: [...model.copies, ...copies], order: model.order === undefined ? undefined : [...model.order, ...entering, ...copies] };
        }

        case "leave": {
            if (input.who.some((name) => !members.includes(name))) {
                return "refused";
            }

            const leaving = [...new Set(input.who)];
            const order = model.order?.filter((name) => !leaving.includes(name));
            const after = { ...model, with: model.with.filter((name) => !leaving.includes(name)), copies: model.copies.filter((name) => !leaving.includes(name)), left: [...model.left, ...leaving] };
            // Who leaves leaves the order too; with no one left in it, no one takes turns, and the round stays as it was.
            return order === undefined ? after : order.length === 0 ? { ...after, order: undefined, turn: undefined } : { ...after, order, ...keptTurnByModel(model, order) };
        }

        case "order":
            return input.order.some((name) => !members.includes(name)) || new Set(input.order).size !== input.order.length ? "refused" : { ...model, order: input.order, ...keptTurnByModel(model, input.order) };

        case "next": {
            if (model.order === undefined || model.turn === undefined) {
                return "refused";
            }

            const index = model.order.indexOf(model.turn);
            const last = index === model.order.length - 1;
            return { ...model, turn: model.order[last ? 0 : index + 1], round: (model.round ?? 1) + (last ? 1 : 0) };
        }

        default:
            return { open: false, with: [], copies: [], left: [] };
    }
}

/** The turn after a new order (SCN-5): a first order starts round 1; then the turn stays with its owner, or goes to the next of the old order still in the new one, or to a new round. */
function keptTurnByModel(model: Model, order: string[]): { round: number; turn: string; }
{
    if (model.order === undefined || model.turn === undefined) {
        return { round: 1, turn: order[0] };
    }

    if (order.includes(model.turn)) {
        return { round: model.round ?? 1, turn: model.turn };
    }

    const after = model.order.slice(model.order.indexOf(model.turn) + 1).find((name) => order.includes(name));
    return after === undefined ? { round: (model.round ?? 1) + 1, turn: order[0] } : { round: model.round ?? 1, turn: after };
}

/** New copies, numbered after every name of their creature among those given, the pages being named otherwise (SCN-3). */
function newCopiesByModel(taken: string[], counts: Record<string, number>): string[]
{
    return Object.entries(counts).flatMap(([creature, count]) => {
        const highest = Math.max(0, ...taken.filter((name) => name.startsWith(`${creature} `)).map((name) => Number(name.slice(creature.length + 1))));
        const names = Array.from({ length: count }, (_, index) => `${creature} ${highest + index + 1}`);
        taken.push(...names);
        return names;
    });
}

/** The scene as the comparison sees it: names sorted where the order does not count. */
function shown(model: Model): Record<string, unknown>
{
    return {
        with: [...model.with].sort(),
        copies: [...model.copies].sort(),
        left: [...model.left].sort(),
        ...(model.order === undefined ? {} : { order: model.order, turn: model.turn }),
        ...(model.round === undefined ? {} : { round: model.round }),
    };
}

/** The open scene in state.yaml, as the comparison sees it. */
function sceneInState(root: string): Record<string, unknown> | undefined
{
    const written = (parse(readFileSync(join(root, "state.yaml"), "utf8")) as { scene?: Record<string, unknown>; } | null)?.scene;

    if (written === undefined) {
        return undefined;
    }

    const names = (links: unknown): string[] => ((links as string[] | undefined) ?? []).map((link) => link.replace(/^\[\[|\]\]$/g, "")).sort();
    return {
        with: names(written.with),
        copies: Object.keys((written.copies as Record<string, unknown> | undefined) ?? {}).sort(),
        left: names(written.left),
        ...(written.order === undefined ? {} : { order: written.order, turn: written.turn }),
        ...(written.round === undefined ? {} : { round: written.round }),
    };
}

/** A campaign in play with four characters, two of the party, and two creatures, in no place. */
function sceneCampaign(): string
{
    const root = makeTempFolder();
    writeFileSync(join(root, "campaign.yaml"), "name: Prova\nsystem: ironsworn\nlanguage: it\n");
    writeFileSync(join(root, "state.yaml"), "mode: play\n");
    mkdirSync(join(root, "world", "characters"), { recursive: true });
    mkdirSync(join(root, "world", "creatures"), { recursive: true });
    const roles: Record<string, string> = { Kira: "pc", Bran: "companion", Varro: "npc", Lena: "npc" };

    for (const name of characters) {
        writeFileSync(join(root, "world", "characters", `${name}.md`), `---\nrole: ${roles[name]}\nhealth: 5/5\n---\n`);
    }

    writeFileSync(join(root, "world", "creatures", "Lupo.md"), "---\nhealth: 3/3\n---\n");
    writeFileSync(join(root, "world", "creatures", "Ombra.md"), "---\nhealth: 2/2\n---\n");
    return root;
}

function readLog(root: string): LogEntry[]
{
    try {
        return readFileSync(join(root, "log.jsonl"), "utf8").trim().split("\n").filter((line) => line !== "").map((line) => JSON.parse(line) as LogEntry);
    } catch {
        return [];
    }
}
