// The card of a package's question on the dashboard (D-507): what the page keeps of it from one reading to the next, where its widget's parts stand on it,
// and what changed on its counts between two looks, for their marks to move.
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeCard } from "../src/dashboard/api.ts";
import type { Asked, AskedCard, WidgetShows, WidgetTrack } from "../src/dashboard/data.ts";
import { cardLayout, inCard, nextPackCard, type PackCard, trackChanges } from "../src/dashboard/pack-card.ts";

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
