// A package's widget on each of the party (D-514, D-516): the word of their state it gives, its icon and tone, dead by its rules, in place of the page's own;
// without one, down.
import { describe, expect, it } from "vitest";

type Shows = { chip?: string; icon?: string; dead?: true; parts?: unknown[]; };
type Widget = { id: string; place: string; order: number; own?: { place: string; order: number; }; icon?: string; people?: Record<string, Shows>; };
type Status = { party?: boolean; down?: boolean; dead?: boolean; effects?: { name: string; text: string; condition?: true; }[]; person?: { word: string; icon?: string; tone?: string; dead?: true; }; };

// The page's .tsx modules are typed by the page's own tsconfig, which has JSX, not by the tests': loaded by their address, with their functions' types.
const { personState, statusMarks, downTint } = await import(new URL("../src/dashboard/status.tsx", import.meta.url).href) as {
    personState: (widgets: Widget[], name: string) => Status["person"];
    statusMarks: (status: Status, all?: boolean) => { icon: string; label: string; kind: string; tone?: string; }[];
    downTint: (status: Status) => string | undefined;
};

const { personShown, personBoxes, personFields } = await import(new URL("../src/dashboard/person-panel.tsx", import.meta.url).href) as {
    personShown: (widgets: Widget[], name: string) => { widget: Widget; shows: Shows; }[];
    personBoxes: (widgets: Widget[], name: string) => { widget: Widget; shows: Shows; }[];
    personFields: (shown: { widget: Widget; shows: Shows; }[]) => Set<string>;
};

type Mark = { props: { "aria-hidden"?: string; "aria-label"?: string; }; };

const { saidInRow } = await import(new URL("../src/dashboard/turns.tsx", import.meta.url).href) as {
    saidInRow: (fighter: { name: string; role: string; wound?: string; }, person: { widget: Widget; shows: Shows; }[], counted: boolean) => string[];
};

const { StatusIcons } = await import(new URL("../src/dashboard/status.tsx", import.meta.url).href) as {
    StatusIcons: (props: { status: Status; said: string[]; }) => { props: { children: Mark[]; }; };
};

// What a screen reader hears of a row's icons beside its words.
const heard = (status: Status, said: string[]): string[] => StatusIcons({ status, said }).props.children.flatMap((mark) => (mark.props["aria-hidden"] === "true" ? [] : [mark.props["aria-label"] ?? ""]));

const fade = "M4 12h16 M12 4v16";
const down = (shows: Shows): Widget => ({ id: "fake.down", place: "person", order: 0, own: { place: "person", order: 0 }, icon: fade, people: { Tamsin: shows } });

describe("the word of the state of one of the party", () => {
    it("is the chip of the first widget on them that gives one, with its icon or the widget's, and its lead's tone", () => {
        const widgets = [{ id: "fake.rally", place: "side", order: 0, people: { Tamsin: { chip: "Rally" } } }, down({ chip: "Down", parts: [{ lead: "Down", tone: "bad" }] })];
        expect(personState(widgets, "Tamsin")).toEqual({ word: "Down", icon: fade, tone: "bad" });
        expect(personState([down({ chip: "Steady", icon: "M1 1h2", parts: [{ track: { label: "Fading", value: 0, max: 3 } }] })], "Tamsin")).toEqual({ word: "Steady", icon: "M1 1h2" });
        // Dead by the package's rules, as the 5e's at the last failure, though not marked so (D-516).
        expect(personState([down({ chip: "Dead", dead: true, parts: [{ lead: "Dead" }] })], "Tamsin")).toEqual({ word: "Dead", icon: fade, dead: true });
        // Nothing on whom it gives nothing, or no word.
        expect(personState(widgets, "Odo")).toBeUndefined();
        expect(personState([down({ parts: [{ lead: "Down" }] })], "Tamsin")).toBeUndefined();
    });

    it("names their mark in place of the page's, tinted by its tone; without one they are down", () => {
        const mark = (status: Status) => {
            const [first] = statusMarks({ party: true, down: true, ...status });
            return [first.label, first.icon === fade ? "fade" : "page's", first.tone, downTint({ party: true, down: true, ...status })];
        };

        expect(mark({ person: { word: "Down", icon: fade, tone: "bad" } })).toEqual(["Down", "fade", "dying", "dying"]);
        expect(mark({ person: { word: "Steady", icon: fade, tone: "good" } })).toEqual(["Steady", "fade", "stable", "stable"]);
        expect(mark({ person: { word: "Out", icon: fade } })).toEqual(["Out", "fade", "down", "down"]);
        expect(mark({})).toEqual(["down", "page's", "down", "down"]);
        // The dead are dead, whatever a widget says.
        expect(mark({ dead: true, person: { word: "Down", tone: "bad" } })).toEqual(["dead", "page's", "dead", "dead"]);
    });

    it("never says again the effect the word already says, as the 5e's Stable beside Stable (playtest 11)", () => {
        const effects = [{ name: "Stable", text: "Stable", condition: true as const }, { name: "Unconscious", text: "Unconscious", condition: true as const }];
        const labels = (word: string) => statusMarks({ party: true, down: true, effects, person: { word, tone: "good" } }, true).map((mark) => mark.label);
        expect(labels("Stable")).toEqual(["Stable", "Unconscious"]);
        expect(labels("Dying")).toEqual(["Dying", "Unconscious", "Stable"]);
    });
});

describe("a widget on one of the party (D-516)", () => {
    it("is their panel when it says their state, else a small card among their boxes, in their order, the counters they count out of the line", () => {
        const fading = { track: { label: "Fading", value: 2, max: 3, tone: "bad", field: "fading" } };
        const widgets = [
            { ...down({ chip: "Down", parts: [{ lead: "Down", tone: "bad" }, fading] }), order: 2 },
            { id: "fake.mood", place: "person", order: 1, people: { Tamsin: { parts: [{ text: "Grim" }] } } },
            { id: "luck.luck", place: "person", order: 0, people: { Tamsin: { parts: [{ track: { label: "Luck", value: 1, max: 2, tone: "good", field: "luck" } }, { values: [{ label: "Omen", value: "fair" }] }] } } },
        ];
        expect(personShown(widgets, "Tamsin").map(({ widget }) => widget.id)).toEqual(["fake.down"]);
        expect(personBoxes(widgets, "Tamsin").map(({ widget }) => widget.id)).toEqual(["luck.luck"]);
        expect([...personFields([...personShown(widgets, "Tamsin"), ...personBoxes(widgets, "Tamsin")])]).toEqual(["fading", "luck"]);
        expect([personShown(widgets, "Odo"), personBoxes(widgets, "Odo")]).toEqual([[], []]);
    });

    it("says their state only when made for them: one the campaign moved there is a small card, its chip the top's", () => {
        // The weather's today, moved on each of the party: its chip is the top's words, never the state of whom it shows on.
        const weather = { id: "weather.today", place: "person", order: 0, own: { place: "top", order: 0 }, people: { Tamsin: { chip: "10–15 °C", parts: [{ lead: "Rain" }] } } };
        expect(personShown([weather], "Tamsin")).toEqual([]);
        expect(personState([weather], "Tamsin")).toBeUndefined();
        expect(personBoxes([weather], "Tamsin").map(({ widget }) => widget.id)).toEqual(["weather.today"]);
    });
});

describe("a row of the turns (D-516)", () => {
    it("says the word of a package's panel once: its icon is hidden from a screen reader", () => {
        const panel = [{ widget: down({}), shows: { chip: "Down", parts: [{ lead: "Down", tone: "bad" }] } }];
        const said = saidInRow({ name: "Tamsin", role: "pc" }, panel, true);
        expect(heard({ party: true, down: true, person: { word: "Down", icon: fade, tone: "bad" } }, said)).toEqual([]);
        // Without a word in the row, the icon says it.
        expect(heard({ party: true, down: true, person: { word: "Down", icon: fade, tone: "bad" } }, saidInRow({ name: "Tamsin", role: "pc" }, [], true))).toEqual(["Down"]);
    });
});
