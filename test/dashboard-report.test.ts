// Telling us what went wrong (PLAN, phase 3, "real games: the safety nets"): the Help's invitation to the issues of RPG Engine, as its README gives them, and
// each package's link to where its own problems are reported.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ComponentChildren, VNode } from "preact";
import { afterAll, describe, expect, it } from "vitest";
import { setLanguage } from "../src/dashboard/text.ts";
import { pageFolder } from "./i18n/phrases.ts";

// The page's .tsx modules are typed by the page's own tsconfig, which has JSX, not by the tests': loaded by their address, with their functions' types.
const { ReportCard, issuesLink } = await import(new URL("../src/dashboard/help.tsx", import.meta.url).href) as { ReportCard: () => ComponentChildren; issuesLink: string; };
const { ReportLink } = await import(new URL("../src/dashboard/packages.tsx", import.meta.url).href) as {
    ReportLink: (props: { issues: string | undefined; name: string; after: boolean; }) => ComponentChildren;
};

const italian = (): Promise<Record<string, string>> => Promise.resolve(JSON.parse(readFileSync(join(pageFolder, "i18n", "it.json"), "utf8")) as Record<string, string>);

describe("telling us what went wrong", () => {
    afterAll(async () => {
        await setLanguage("en");
    });

    it("ends the Help with the README's issues on GitHub, saying what to write there to one who never saw GitHub, in the page's language", async () => {
        await setLanguage("en");
        expect(readFileSync(new URL("../README.md", import.meta.url), "utf8")).toContain(`(${issuesLink})`);
        const english = drawn(ReportCard());
        expect(english.links).toEqual([{ href: issuesLink, target: "_blank", words: "Open a report on GitHub" }]);
        expect(english.text).toContain("what you did, what you expected and what happened");
        expect(english.text).toContain("a free account");
        await setLanguage("it", italian);
        const shown = drawn(ReportCard());
        expect(shown.links).toEqual([{ href: issuesLink, target: "_blank", words: "Apri una segnalazione su GitHub" }]);
        expect(shown.text).toContain("Qualcosa non va, ti confonde o potrebbe andare meglio?");
    });

    it("links each package to where its package.json says its problems go, named for the package; nothing where it says nowhere", async () => {
        await setLanguage("it", italian);
        const link = drawn(ReportLink({ issues: "https://github.com/stefanocaronia/rpg-engine/issues", name: "weather", after: true }));
        expect(link.text).toBe(" · Segnala un problema");
        expect(link.links).toEqual([{ href: "https://github.com/stefanocaronia/rpg-engine/issues", target: "_blank", label: "Segnala un problema con weather", words: "Segnala un problema" }]);
        expect(drawn(ReportLink({ issues: "https://example.org/bugs", name: "fake", after: false })).text).toBe("Segnala un problema");
        expect(drawn(ReportLink({ issues: undefined, name: "tarot", after: true }))).toEqual({ text: "", links: [] });
    });
});

/** What a part of the page draws: its words, and its links with where they go, how they open and their names. */
function drawn(node: ComponentChildren): { text: string; links: Record<string, string>[]; }
{
    const links: Record<string, string>[] = [];
    const text = words(node, links);
    return { text, links };
}

function words(node: ComponentChildren, links: Record<string, string>[]): string
{
    if (node === null || node === undefined || typeof node === "boolean") {
        return "";
    }

    if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
        return String(node);
    }

    if (Array.isArray(node)) {
        return node.map((one: ComponentChildren) => words(one, links)).join("");
    }

    const element = node as VNode<{ href?: string; target?: string; "aria-label"?: string; children?: ComponentChildren; }>;

    if (typeof element.type === "function") {
        return words((element.type as (props: object) => ComponentChildren)(element.props), links);
    }

    const said = words(element.props.children, links);

    if (element.type === "a") {
        const label = element.props["aria-label"];
        links.push({ href: element.props.href ?? "", target: element.props.target ?? "", ...(label === undefined ? {} : { label }), words: said });
    }

    return said;
}
