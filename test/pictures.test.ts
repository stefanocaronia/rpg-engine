// The pictures by the chat in use (D-390): Codex first, Claude's SVG where Codex is not ready, never Claude in Codex; the SVG cleaned from a white list (D-342).
import { describe, expect, it } from "vitest";
import type { PictureMaker, PicturesReady, PictureSubject } from "../src/core/context.ts";
import { cleanSvg, hostPictures, svgBrief, svgIn } from "../src/pictures/index.ts";

/** A maker that says whether it is ready and records what it was asked to make. */
function maker(said: PicturesReady): PictureMaker & { made: PictureSubject[]; }
{
    const made: PictureSubject[] = [];
    return { made, ready: () => said, make: (subject) => (made.push(subject), Promise.resolve({ refused: "a fake makes nothing" })) };
}

const bridge: PictureSubject = { kind: "place", name: "Ponte", seen: "un ponte di pietra", unseen: ["ragni"] };

describe("who makes the pictures, by the chat in use (D-390)", () => {
    it("takes Codex where it is ready, else Claude, and in Codex only Codex", async () => {
        const codex = maker({ ready: true, maker: "Codex" });
        const claude = maker({ ready: true, maker: "Claude" });
        expect(hostPictures(() => "claude-code", codex, claude).ready()).toEqual({ ready: true, maker: "Codex" });

        const away = maker({ ready: false, why: "Codex is not installed on this computer" });
        const pictures = hostPictures(() => "claude-code", away, claude);
        expect(pictures.ready()).toEqual({ ready: true, maker: "Claude" });
        await pictures.make(bridge);
        expect(claude.made).toEqual([bridge]);
        expect(away.made).toEqual([]);

        // In Codex, Codex alone: its no is the answer.
        expect(hostPictures(() => "codex-mcp-client", away, claude).ready()).toEqual({ ready: false, why: "Codex is not installed on this computer" });
        // With neither, Codex's no and how to have it.
        expect(hostPictures(() => undefined, away, maker({ ready: false, why: "Claude Code is not logged in on this computer" })).ready()).toMatchObject({ ready: false, why: "Codex is not installed on this computer" });
    });

    it("asks Claude for an SVG of the same subject, in the shapes the engine keeps, never what the table keeps out", () => {
        const place = svgBrief(bridge);
        expect(place).toContain('viewBox="0 0 2100 900" (21:9)');
        expect(place).toContain("Primary request: Ponte, as adventurers see it arriving: un ponte di pietra");
        expect(place).toContain("Never show: ragni");
        expect(place).toContain("no script, style, text, image, use, a, foreignObject or animation");
        const quest = svgBrief({ kind: "quest", name: "La campana", seen: "una campana sommersa", unseen: [] });
        expect(quest).toContain('viewBox="0 0 1600 600" (16:6)');
        expect(quest).toContain("Primary request: the quest La campana, as an emblem of what it is about: una campana sommersa");
        expect(quest).not.toContain("Never show");
    });
});

describe("an SVG drawn by a model, cleaned (D-342)", () => {
    it("keeps the allowed shapes and the gradients they point to, and drops all else with what it holds", () => {
        const drawn = [
            '<?xml version="1.0"?><!-- a comment --><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)">',
            '<defs><linearGradient id="sky"><stop offset="0" stop-color="#123"/></linearGradient></defs>',
            '<rect width="10" height="10" fill="url(#sky)"/>',
            '<rect width="5" height="5" fill="url(https://example.com/x)"/>',
            "<script>alert(2)</script><style>rect{}</style><text>hi</text>",
            '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject>',
            '<svg><circle r="1"/></svg><use href="#sky"/><a href="https://example.com"><path d="M0 0"/></a>',
            '<circle r="2"><animate attributeName="r" to="3"/></circle>',
            "</svg>",
        ].join("");
        expect(cleanSvg(drawn)).toBe(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="sky"><stop offset="0" stop-color="#123"/></linearGradient></defs>'
                + '<rect width="10" height="10" fill="url(#sky)"/><rect width="5" height="5"/><circle r="2"></circle></svg>',
        );
    });

    it("never lets a quote in a value close it and open another, writes SVG's names and its namespace, and keeps each attribute once (Matteo)", () => {
        expect(cleanSvg(`<svg viewBox="0 0 1 1"><rect fill='x" onmouseover="alert(1)'/><rect fill='url("#a")' fill="red"/></svg>`)).toBe(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="x' onmouseover='alert(1)"/><rect fill="url('#a')"/></svg>`,
        );
        expect(cleanSvg('<SVG VIEWBOX="0 0 1 1"><lineargradient id="a" gradientunits="userSpaceOnUse"></LINEARGRADIENT></SVG>')).toBe(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><linearGradient id="a" gradientUnits="userSpaceOnUse"></linearGradient></svg>',
        );
    });

    it("takes none without a single closed root, or larger than 100 KB, and finds the SVG in an answer with words around it", () => {
        expect(cleanSvg("<g><rect/></g>")).toBeUndefined();
        expect(cleanSvg('<svg viewBox="0 0 1 1"><g>')).toBeUndefined();
        expect(cleanSvg(`<svg viewBox="0 0 1 1"><path d="${"M0 0 ".repeat(25_000)}"/></svg>`)).toBeUndefined();
        expect(svgIn('Here it is:\n```svg\n<svg viewBox="0 0 1 1"></svg>\n```')).toBe('<svg viewBox="0 0 1 1"></svg>');
        expect(svgIn("I cannot draw that.")).toBeUndefined();
    });
});
