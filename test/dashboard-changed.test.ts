// The pages of the game system that the campaign changed, on the page (D-564): which names of a sheet's lists are theirs, the mark as a screen reader hears
// it, the line that leads to their list, and what putting one back comes to, in the page's words.
import type { ComponentChildren, VNode } from "preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import { putPageBack } from "../src/dashboard/api.ts";

// The page's .tsx modules are typed by the page's own tsconfig, which has JSX, not by the tests': loaded by their address, with their functions' types.
const { ChangedLine, ChangedMark, isChanged, setChangedPages } = await import(new URL("../src/dashboard/parts/changed.tsx", import.meta.url).href) as {
    ChangedLine: () => VNode<{ children?: ComponentChildren; }>;
    ChangedMark: () => VNode<{ role?: string; "aria-label"?: string; "data-tip"?: string; }>;
    isChanged: (name: string) => boolean;
    setChangedPages: (layers: { name: string; title?: string; fields: { field: string; system?: string; campaign: string; }[]; sections: string[]; introduction?: true; }[] | undefined) => void;
};

/** The server's answer to the page's request, as the dashboard gives a refusal. */
function answers(status: number, body: object): void
{
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

/** The address of the link a line holds, when it holds one. */
function linkOf(line: VNode<{ children?: ComponentChildren; }>): string | undefined
{
    const inside = line.props.children as VNode<{ href?: string; }>;
    return inside.type === "a" ? inside.props.href : undefined;
}

describe("the pages the campaign changed, on the page (D-564)", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        setChangedPages(undefined);
    });

    it("tells a name of a list as a changed page's by its name or its title, whatever its case and accents; none while the campaign changed none", () => {
        expect(isChanged("Guiding Bolt")).toBe(false);
        setChangedPages([{ name: "Guiding Bolt", title: "Dardo tracciante", fields: [{ field: "range", system: "120 feet", campaign: "60 feet" }], sections: [] }, { name: "Élan", fields: [], sections: ["Use"] }]);
        expect(["Guiding Bolt", " guiding bolt ", "DARDO TRACCIANTE", "elan"].map(isChanged)).toEqual([true, true, true, true]);
        expect(["Guiding", "Bolt", ""].map(isChanged)).toEqual([false, false, false]);
        setChangedPages(undefined);
        expect(isChanged("Guiding Bolt")).toBe(false);
    });

    it("tells no name of a list by a page changed only in what the character does not know, as a creature whose name a language shares", () => {
        setChangedPages([{ name: "Goblin", fields: [], sections: [] }, { name: "Light", fields: [], sections: [], introduction: true }]);
        expect(["Goblin", "Light"].map(isChanged)).toEqual([false, true]);
    });

    it("names the mark for a screen reader and says in its tooltip where what changed is listed", () => {
        const mark = ChangedMark();
        expect([mark.props.role, mark.props["aria-label"], mark.props["data-tip"]]).toEqual(["img", "Changed in this campaign", "Changed in this campaign: Packages lists what changed"]);
    });

    it("leads from a page read whole to the list in Packages only while the page lists a changed page, one the character does not know too", () => {
        expect(linkOf(ChangedLine())).toBeUndefined();
        setChangedPages([{ name: "Wolf", fields: [], sections: [] }]);
        expect(linkOf(ChangedLine())).toBe("#/packages/installed/changed");
    });

    it("puts a page back by its name, and says a refusal in the page's words with the name the player reads", async () => {
        const asked: { address: string; body: unknown; }[] = [];
        vi.stubGlobal("fetch", (address: string, request: { body: string; }) => {
            asked.push({ address, body: JSON.parse(request.body) });
            return Promise.resolve(new Response("{}", { status: 202 }));
        });
        expect(await putPageBack("Wolf", "Lupo")).toEqual({ done: true });
        expect(asked).toEqual([{ address: "/api/layer", body: { page: "Wolf" } }]);

        answers(409, { error: "Wolf is in the scene being played: take the campaign's change off it once the scene is over.", code: "copies-in-scene", values: { page: "Wolf" } });
        expect(await putPageBack("Wolf", "Lupo")).toEqual({ done: false, code: "copies-in-scene", error: "Lupo is in the scene being played: put it back once the scene is over." });

        // Of a creature the character does not know, while any scene is open: no word of where it is.
        answers(409, { error: "A scene is being played: take the campaign's change off Wolf once it is over.", code: "scene-open", values: { page: "Wolf" } });
        expect(await putPageBack("Wolf", "Lupo")).toEqual({ done: false, code: "scene-open", error: "It can be restored once the scene being played is over." });

        answers(400, { error: "The campaign changes no page of the game system named Wolf: reload the page.", code: "no-layer", values: { page: "Wolf" } });
        expect(await putPageBack("Wolf", "Lupo")).toEqual({ done: false, code: "no-layer", error: "Lupo is no longer changed in this campaign: there is nothing to put back." });
    });

    it("says the engine's words for a refusal it does not know, and that the game was not reached when it was not", async () => {
        answers(400, { error: "Send the page of the game system whose change to take off: { page }." });
        expect(await putPageBack("Wolf", "Lupo")).toEqual({ done: false, error: "Send the page of the game system whose change to take off: { page }." });

        vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
        expect(await putPageBack("Wolf", "Lupo")).toEqual({ done: false, error: "It did not reach the game: try again." });
    });
});
