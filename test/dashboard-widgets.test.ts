// The parts of the extensions' widget cards (D-502), as a screen reader hears them.
import type { ComponentChildren, VNode } from "preact";
import { describe, expect, it } from "vitest";

// The page's .tsx modules are typed by the page's own tsconfig, which has JSX, not by the tests': loaded by their address, with their functions' types.
const { Track } = await import(new URL("../src/dashboard/packages/widgets.tsx", import.meta.url).href) as {
    Track: (
        props: { track: { label: string; value: number; max: number; look?: "pips" | "bar" | "steps"; held?: number; marked?: number; coming?: number; tone?: "good" | "bad"; }; place?: "start" | "center" | "end"; },
    ) => ComponentChildren;
};

describe("a widget's count", () => {
    it("keeps its label in view and names it once to a screen reader, in the count's own name, as pips or as a bar", () => {
        expect(heard(Track({ track: { label: "Pins", value: 2, max: 4, look: "pips" } }))).toEqual({ inView: ["Pins"], read: [], named: ["Pins: 2 of 4"] });
        expect(heard(Track({ track: { label: "Supplies", value: 12, max: 40, look: "bar" } }))).toEqual({ inView: ["Supplies", "12/40"], read: [], named: ["Supplies"] });
    });

    it("says the marks held, failed and coming after its value in its name, and as steps shows their count under them, lit and held (D-507)", () => {
        expect(heard(Track({ track: { label: "Pins", value: 2, max: 6, look: "steps", held: 1, marked: 1 }, place: "center" }))).toEqual({
            inView: ["Pins", "3/6"],
            read: [],
            named: ["Pins: 2 of 6, held: 1, failed: 1"],
        });
        expect(heard(Track({ track: { label: "Pins", value: 2, max: 6, look: "steps", coming: 2 } })).named).toEqual(["Pins: 2 of 6, this roll: 2"]);
        expect(heard(Track({ track: { label: "Failures", value: 2, max: 4, look: "pips", tone: "bad" } })).named).toEqual(["Failures: 2 of 4"]);
    });

    it("draws past twelve steps or ten pips as a bar", () => {
        expect(heard(Track({ track: { label: "Pins", value: 3, max: 14, look: "steps" } })).inView).toEqual(["Pins", "3/14"]);
    });
});

/** What a part draws: the words in view, those a screen reader reads as text, and the names it gives. */
function heard(node: ComponentChildren): { inView: string[]; read: string[]; named: string[]; }
{
    const said = { inView: [] as string[], read: [] as string[], named: [] as string[] };

    const walk = (child: ComponentChildren, hidden: boolean): void => {
        if (child === null || child === undefined || typeof child === "boolean") {
            return;
        }

        if (typeof child === "string" || typeof child === "number") {
            said.inView.push(String(child));

            if (!hidden) {
                said.read.push(String(child));
            }

            return;
        }

        if (Array.isArray(child)) {
            child.forEach((one: ComponentChildren) => walk(one, hidden));
            return;
        }

        const element = child as VNode<{ "aria-hidden"?: string; "aria-label"?: string; children?: ComponentChildren; }>;
        const label = element.props["aria-label"];

        if (label !== undefined) {
            said.named.push(label);
        }

        walk(element.props.children, hidden || element.props["aria-hidden"] === "true");
    };

    walk(node, false);
    return said;
}
