// The card of a package's question on the dashboard (D-507): what the page keeps of it from one reading to the next, where its widget's parts stand on it,
// and what changed on its counts between two looks, for their marks to move.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeCard } from "../src/dashboard/api.ts";
import type { Asked, AskedCard, WidgetShows, WidgetTrack } from "../src/dashboard/data.ts";
import { cardLayout, inCard, nextPackCard, type PackCard, trackChanges } from "../src/dashboard/packages/card.ts";
// The page's .tsx modules are typed by the page's own tsconfig: loaded by their address, with their functions' types.
const { cardsIn, ownPageIn, navPagesOf } = await import(new URL("../src/dashboard/packages/page-code.tsx", import.meta.url).href) as {
    cardsIn: (loaded: object | Error | undefined, page: string) => [string, { page: string; order?: number; }][] | Error;
    ownPageIn: (loaded: object | Error | undefined, page: string) => object | Error | undefined;
    navPagesOf: (loaded: { module: { package: string; }; loaded: object | Error | undefined; }[]) => object[];
};

const pins = (more: Partial<WidgetTrack> = {}): WidgetTrack => ({ label: "Pins", value: 2, max: 6, look: "steps", stage: "center", ...more });
const rerolls = (value: number): WidgetTrack => ({ label: "Rerolls", value, max: 2, look: "pips", stage: "start", tone: "good" });
const shows = (...tracks: WidgetTrack[]): WidgetShows => ({ parts: [{ lead: "Ettore", icon: "M0 0" }, ...tracks.map((track) => ({ track }))] });

function asked(id: string, question: string, card?: AskedCard): Asked
{
    return { id, question, title: "Roll", labels: ["Roll: Lockpicking (2d6)", "Change of mind"], ...(card === undefined ? {} : { card }) };
}

const attempt = (more: Partial<AskedCard> = {}): AskedCard => ({ widget: "lockpicking.lock", key: "attempt-1", shows: shows(pins({ coming: 2 })), ...more });
const none = new Map<string, string | undefined>();

describe("a package's card from one reading to the next (D-507)", () => {
    it("waits for its widget, then has the question of the attempt as its title", () => {
        expect(nextPackCard(undefined, { asked: asked("q1", "Pick the lock", attempt({ shows: undefined, coming: true })) }, none)).toEqual({});
        const card = nextPackCard(undefined, { asked: asked("q1", "Pick the lock", attempt()) }, none).card;
        expect(card).toMatchObject({ key: "attempt-1", title: "Pick the lock", asked: { id: "q1" } });
        expect(card?.sent).toBeUndefined();
    });

    it("keeps its title and the card before through the questions of the same attempt, the button pressed only for its own question", () => {
        const pressed: PackCard = { ...nextPackCard(undefined, { asked: asked("q1", "Pick the lock", attempt()) }, none).card!, sent: 0 };
        // The reroll's question, its card not read yet: the card as it was.
        expect(nextPackCard(pressed, { asked: asked("q2", "A 1 came up: reroll?", attempt({ shows: undefined, coming: true })) }, none).card).toBe(pressed);
        const next = nextPackCard(pressed, { asked: asked("q2", "A 1 came up: reroll?", attempt({ shows: shows(pins({ held: 1, marked: 1 })) })) }, none).card;
        expect(next).toMatchObject({ title: "Pick the lock", asked: { question: "A 1 came up: reroll?" } });
        expect(next?.sent).toBeUndefined();
    });

    it("stays while the button pressed goes, then shows how the call left it, until another question without a card takes its place", () => {
        const pressed: PackCard = { ...nextPackCard(undefined, { asked: asked("q1", "Pick the lock", attempt()) }, none).card!, sent: 0 };
        expect(nextPackCard(pressed, { asked: null }, none).card).toBe(pressed);
        const ended = nextPackCard(pressed, { asked: null, card: attempt({ shows: shows(pins({ value: 0 })), ended: true }) }, none).card;
        expect(ended).toMatchObject({ ended: true, title: "Pick the lock", asked: { id: "q1" } });
        expect(nextPackCard(ended, { asked: asked("q9", "Which way?") }, none)).toEqual({});
    });

    it("goes when its question goes with no button of it pressed, and what the call leaves of it stays away until the attempt is asked again", () => {
        const card = nextPackCard(undefined, { asked: asked("q1", "Pick the lock", attempt()) }, none).card;
        expect(nextPackCard(card, { asked: null }, none)).toEqual({ let: "attempt-1" });
        const gone = new Map([["attempt-1", undefined]]);
        expect(nextPackCard(undefined, { asked: null, card: attempt({ ended: true }) }, gone)).toEqual({});
        // Let go at a question the master has not taken back yet: no card for it.
        expect(nextPackCard(undefined, { asked: asked("q1", "Pick the lock", attempt()) }, new Map([["attempt-1", "q1"]]))).toEqual({});
    });

    it("is none when its widget gave nothing in time, and comes on a fresh page as the call left it", () => {
        expect(nextPackCard(undefined, { asked: asked("q1", "Pick the lock", attempt({ shows: undefined })) }, none)).toEqual({});
        expect(nextPackCard(undefined, { asked: null, card: attempt({ ended: true }) }, none).card).toMatchObject({ ended: true, key: "attempt-1" });
        expect(nextPackCard(undefined, { asked: null, card: attempt({ shows: undefined, ended: true }) }, none)).toEqual({});
    });
});

describe("a package's card and the rest of the page (D-507)", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("answers its question alone while it comes or is there; its widget giving nothing, the banner and the sheet's rows answer it again", () => {
        expect(inCard(asked("q1", "Pick the lock", attempt()))).toBe(true);
        expect(inCard(asked("q1", "Pick the lock", attempt({ shows: undefined, coming: true })))).toBe(true);
        expect(inCard(asked("q1", "Pick the lock", attempt({ shows: undefined })))).toBe(false);
        expect(inCard(asked("q1", "Which way?"))).toBe(false);
        expect(inCard(undefined)).toBe(false);
    });

    it("closed, tells the server the attempt's key, so that no reading here or on another page brings it back", async () => {
        const sent: { url: string; body: unknown; }[] = [];
        vi.stubGlobal("fetch", (url: string, init: { body: string; }) => {
            sent.push({ url, body: JSON.parse(init.body) });
            return Promise.resolve(new Response(null, { status: 202 }));
        });
        await closeCard("attempt-1");
        expect(sent).toEqual([{ url: "/api/card", body: { close: "attempt-1" } }]);
        // The server away: closed on this page alone, never an error.
        vi.stubGlobal("fetch", () => Promise.reject(new Error("away")));
        await expect(closeCard("attempt-1")).resolves.toBeUndefined();
    });

    it("goes when the call is over with nothing to show, as a roll turned down before its first die", () => {
        const pressed: PackCard = { ...nextPackCard(undefined, { asked: asked("q1", "Pick the lock", attempt()) }, none).card!, sent: 1 };
        expect(nextPackCard(pressed, { asked: null, card: attempt({ shows: undefined, ended: true }) }, none)).toEqual({});
    });
});

describe("the parts of a package's card (D-507)", () => {
    it("stands each count in its place, one with none in the middle, the facts under the counts at the end, else in the middle", () => {
        const failures: WidgetTrack = { label: "Failures", value: 2, max: 4, stage: "end", tone: "bad" };
        const loose: WidgetTrack = { label: "Time", value: 1, max: 3 };
        const layout = cardLayout({ parts: [{ lead: "Failed", tone: "bad" }, { track: pins() }, { track: failures }, { track: loose }, { facts: ["Harder"] }, { text: "Two to go" }] });
        expect(layout.lead).toEqual({ lead: "Failed", tone: "bad" });
        expect(layout.places).toEqual({ start: [], center: [pins(), loose], end: [failures] });
        expect([layout.facts, layout.texts]).toEqual([["Harder"], ["Two to go"]]);
    });

    it("takes who acts apart from the counts, the first of them, with what they do (D-509)", () => {
        const layout = cardLayout({ parts: [{ who: "Ettore", does: "picks" }, { track: pins({ figure: "tumblers" }) }, { who: "Lupa" }] });
        expect(layout.who).toEqual({ who: "Ettore", does: "picks" });
        expect(layout.places.center).toEqual([pins({ figure: "tumblers" })]);
        expect(layout.others).toEqual([]);
    });
});

describe("the kit of rpg-engine/page (D-510)", () => {
    it("gives in the page every part its types declare to the extensions, and no other", () => {
        const page = readFileSync("src/page.ts", "utf8");
        // Its functions, and the values it passes on from the core, as the pages a card stands in.
        const passed = [...page.matchAll(/^export \{ ([^}]+) \} from/gm)].flatMap((match) => match[1].split(", ").filter((name) => !name.startsWith("type ")));
        const declared = [...page.matchAll(/^export declare function (\w+)/gm)].map((match) => match[1]).concat(passed).sort();
        const kit = readFileSync("src/dashboard/kit.tsx", "utf8");
        const given = [...kit.matchAll(/^export function (\w+)/gm)].map((match) => match[1]).concat(...[...kit.matchAll(/^export \{ ([^}]+) \}/gm)].map((match) => match[1].split(", "))).sort();
        expect(given).toEqual(declared);
    });

    it("lists the pages a card stands in as the core declares them to the packages, in the page code and in Settings (D-514)", () => {
        const list = (file: string, pattern: RegExp): string[] => (JSON.parse(`[${pattern.exec(readFileSync(file, "utf8"))?.[1] ?? ""}]`) as string[]).sort();
        const declared = list("src/core/package-api.ts", /export const cardPages = \[([^\]]*)\]/);
        expect(declared).toEqual(["journal", "scene", "sheet", "world"]);
        expect(list("src/dashboard/packages/page-code.tsx", /export const cardPages = \[([^\]]*)\]/)).toEqual(declared);
        expect(list("src/dashboard/settings.tsx", /const widgetPages: WidgetPage\[\] = \[([^\]]*)\]/)).toEqual(declared);
        const union = /export type WidgetPage = ([^;]+);/.exec(readFileSync("src/dashboard/data.ts", "utf8"))?.[1] ?? "";
        expect(union.split("|").map((page) => page.trim().replace(/"/g, "")).sort()).toEqual(declared);
    });
});

describe("what changed on a card's counts (D-507)", () => {
    it("lights the marks the dice lit, in order, a held one lit already", () => {
        expect(trackChanges(shows(pins({ held: 1, marked: 1 })), shows(pins({ value: 4 }))).get(JSON.stringify("Pins"))).toEqual({ lit: [3], out: [], marked: [] });
        expect(trackChanges(shows(pins({ coming: 2 })), shows(pins({ value: 4 }))).get(JSON.stringify("Pins"))).toEqual({ lit: [2, 3], out: [], marked: [] });
    });

    it("puts them out from the last as the lock resets, marks a failed die anew, and leaves out the counts that did not change", () => {
        const changes = trackChanges(shows(pins({ held: 1, marked: 1 }), rerolls(2)), shows(pins({ value: 0 }), rerolls(1)));
        expect(changes.get(JSON.stringify("Pins"))).toEqual({ lit: [], out: [2, 1, 0], marked: [] });
        expect(changes.get(JSON.stringify("Rerolls"))).toEqual({ lit: [], out: [1], marked: [] });
        expect(trackChanges(shows(pins({ coming: 2 })), shows(pins({ held: 1, marked: 1 }))).get(JSON.stringify("Pins"))).toEqual({ lit: [2], out: [], marked: [3] });
        expect(trackChanges(shows(rerolls(2)), shows(rerolls(2))).size).toBe(0);
        expect(trackChanges(undefined, shows(pins())).size).toBe(0);
    });
});

describe("a package's page code that did not load (D-510 (5), D-511)", () => {
    const broken = new TypeError("Failed to fetch dynamically imported module");
    const draw = () => null;
    const loaded = { cards: { later: { page: "sheet", title: "Later", order: 2, draw }, first: { page: "sheet", title: "First", order: 1, draw }, map: { page: "world", title: "Map", draw } }, pages: { deck: { title: "Deck", draw } } };

    it("gives its error to the cards of every page and to its own pages, for them to say it with whose it is", () => {
        expect(["scene", "sheet", "world", "journal"].map((page) => cardsIn(broken, page))).toEqual([broken, broken, broken, broken]);
        expect(ownPageIn(broken, "deck")).toBe(broken);
    });

    it("gives a page the cards its module puts there, in their order, and none while it comes", () => {
        expect((cardsIn(loaded, "sheet") as [string, object][]).map(([name]) => name)).toEqual(["first", "later"]);
        expect(cardsIn(loaded, "scene")).toEqual([]);
        expect(cardsIn(undefined, "sheet")).toEqual([]);
        expect(ownPageIn(loaded, "deck")).toBe(loaded.pages.deck);
        expect([ownPageIn(loaded, "other"), ownPageIn(undefined, "deck")]).toEqual([undefined, undefined]);
    });
});

describe("a package's pages in the navigation (D-512)", () => {
    const draw = () => null;

    it("puts each where its module says, a tab or the packages' menu, the menu when it says nothing, in the order of the modules", () => {
        const system = { module: { package: "@rpgengine/system-fake" }, loaded: { pages: { spells: { title: "Spells", icon: "M0 0", nav: "tab", draw } } } };
        const charms = { module: { package: "charms" }, loaded: { pages: { knots: { title: "Knots", draw }, braid: { title: "Braid", nav: "menu", draw } } } };
        expect(navPagesOf([system, charms])).toEqual([
            { package: "@rpgengine/system-fake", name: "spells", title: "Spells", icon: "M0 0", nav: "tab" },
            { package: "charms", name: "knots", title: "Knots", nav: "menu" },
            { package: "charms", name: "braid", title: "Braid", nav: "menu" },
        ]);
    });

    it("leaves out the pages of a module that comes or broke", () => {
        expect(navPagesOf([{ module: { package: "later" }, loaded: undefined }, { module: { package: "broken" }, loaded: new Error("no") }])).toEqual([]);
    });
});
