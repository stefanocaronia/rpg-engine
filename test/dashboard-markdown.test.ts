// A page's text on the dashboard (D-275, VIEW-3): links only where they lead to a page the character knows and their words do not hide whom, secrets as the
// engine reads them, fenced blocks that never swallow the text, headings with nothing under them left out, pictures embedded left out.
import type { ComponentChildren, VNode } from "preact";
import { describe, expect, it } from "vitest";

// The page's .tsx modules are typed by the page's own tsconfig, which has JSX, not by the tests': this one is loaded by its address, with its two functions' types.
const { Markdown, plainLine } = await import(new URL("../src/dashboard/markdown.tsx", import.meta.url).href) as {
    Markdown: (props: { text: string; link?: (name: string) => string | undefined; secretNote?: (title: string) => string | undefined; }) => ComponentChildren;
    plainLine: (text: string) => string | undefined;
};

const known = new Set(["Conte Ugo", "Bertoldo"]);
const link = (name: string): string | undefined => known.has(name) ? `#/world/lore/${encodeURIComponent(name)}` : undefined;

describe("a page's text on the dashboard (D-275)", () => {
    it("links a page the character knows only with no words, or its own name in them, whatever their case and accents", () => {
        expect(shown("La lettera è firmata da [[Conte Ugo|il tuo amico segreto]].")).toBe("<p>La lettera è firmata da il tuo amico segreto.</p>");
        expect(shown("Parla con [[Bertoldo]], [[Bertoldo|bèrtoldo]] e [[Bertoldo#Fato|lui]].")).toBe(
            '<p>Parla con <a href="#/world/lore/Bertoldo">Bertoldo</a>, <a href="#/world/lore/Bertoldo">bèrtoldo</a> e lui.</p>',
        );
        expect(shown("Il [[Re Nero|sovrano]] e [[Re Nero]], [[world/character/Bertoldo.md]].")).toBe('<p>Il sovrano e Re Nero, <a href="#/world/lore/Bertoldo">Bertoldo</a>.</p>');
        expect(shown("[[|parole]] e [[ ]].")).toBe("<p>parole e .</p>");
    });

    it("leaves out a picture embedded, and reads a page embedded as a link", () => {
        expect(shown("![[Bertoldo]] e ![[ritratto.png]] qui.")).toBe('<p><a href="#/world/lore/Bertoldo">Bertoldo</a> e  qui.</p>');
        expect(plainLine("![[ritratto.webp]]Il [[Bertoldo#Fato|suo fato]].")).toBe("Il suo fato.");
    });

    it("reads a secret as the engine does: at the text's own level, at most three spaces before its mark, any after", () => {
        expect(shown(">  [!secret] Doppio\n>  testo")).toBe("<aside><p>Secret · Doppio</p><p>testo</p></aside>");
        expect(shown("> Una citazione\n> > [!secret] Falso\n> > testo")).toBe("<blockquote><p>Una citazione</p><blockquote><p>[!secret] Falso testo</p></blockquote></blockquote>");
        expect(shown("    > [!secret] Rientrato")).toBe("<p>> [!secret] Rientrato</p>");
        expect(shown("> [!secret]")).toBe("<aside><p>Secret</p></aside>");
    });

    it("says after a secret's title who knows it, with more than one player character, by the title the text gives it (VIEW-12)", () => {
        const secretNote = (title: string): string | undefined => (title === "Verità" ? "known to Mira alone" : undefined);
        expect(shown("> [!secret] Verità\n> testo", secretNote)).toBe("<aside><p>Secret · Verità · known to Mira alone</p><p>testo</p></aside>");
        expect(shown("> [!secret] Altro\n> testo", secretNote)).toBe("<aside><p>Secret · Altro</p><p>testo</p></aside>");
    });

    it("never lets a fenced block swallow the text: it opens and closes on lines of its own, and one left open is shown as it is", () => {
        expect(shown("```map\nA B\n```\nUn villaggio sul fiume.")).toBe("<p>Un villaggio sul fiume.</p>");
        expect(shown("```rpg roll 1d20```\nTesto dopo.")).toBe("<p>```rpg roll 1d20``` Testo dopo.</p>");
        expect(shown("Prima.\n```\ncodice senza fine\n## Dopo")).toBe("<p>Prima.</p><pre>codice senza fine\n## Dopo</pre>");
        expect(plainLine("```map\nA B\n```\nUn villaggio sul fiume.")).toBe("Un villaggio sul fiume.");
    });

    it("leaves out a heading with nothing under it, and keeps the one over its sections", () => {
        expect(shown("## Vuota\n## Piena\ntesto")).toBe("<h4>Piena</h4><p>testo</p>");
        expect(shown("## Storia\n### Infanzia\ntesto\n### Vuota")).toBe("<h4>Storia</h4><h5>Infanzia</h5><p>testo</p>");
    });
});

/** The text as the page draws it, its tags and the addresses of its links, without classes. */
function shown(text: string, secretNote?: (title: string) => string | undefined): string
{
    const page = html(Markdown({ text, link, ...(secretNote === undefined ? {} : { secretNote }) }));
    return page.replace(/^<div>|<\/div>$/g, "");
}

function html(node: ComponentChildren): string
{
    if (node === null || node === undefined || typeof node === "boolean") {
        return "";
    }

    if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
        return String(node);
    }

    if (Array.isArray(node)) {
        return node.map(html).join("");
    }

    const element = node as VNode<{ href?: string; children?: ComponentChildren; }>;

    if (typeof element.type === "function") {
        return html((element.type as (props: object) => ComponentChildren)(element.props));
    }

    const href = element.props.href === undefined ? "" : ` href="${element.props.href}"`;
    return `<${String(element.type)}${href}>${html(element.props.children)}</${String(element.type)}>`;
}
