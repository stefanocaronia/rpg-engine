// The pictures as the campaign chose, else by the chat in use (D-390, D-572): Codex where chosen, the chat in use where it cannot; the SVG cleaned from a white list (D-342).
import { describe, expect, it } from "vitest";
import type { DocumentReader, PictureMaker, PicturesReady, PictureSubject } from "../src/core/context.ts";
import { hosts } from "../src/core/hosts.ts";
import { cleanSvg, hostPictures, hostReader, svgBrief, svgIn } from "../src/helpers/index.ts";
import { approval } from "../src/server/approver.ts";

/** A maker that says whether it is ready and records what it was asked to make. */
function maker(said: PicturesReady): PictureMaker & { made: PictureSubject[]; }
{
    const made: PictureSubject[] = [];
    return { made, ready: () => said, make: (subject) => (made.push(subject), Promise.resolve({ refused: "a fake makes nothing" })) };
}

const bridge: PictureSubject = { kind: "place", name: "Ponte", seen: "un ponte di pietra", unseen: ["ragni"] };

describe("who makes the pictures, as the campaign chose, else by the chat in use (D-390, D-572)", () => {
    it("takes the chat in use where nothing is chosen, or chat is: Claude elsewhere, Codex in Codex", async () => {
        const codex = maker({ ready: true, maker: "Codex" });
        const claude = maker({ ready: true, maker: "Claude" });
        expect(hostPictures(() => "claude-code", () => undefined, codex, claude).ready()).toEqual({ ready: true, maker: "Claude" });
        expect(hostPictures(() => undefined, () => "chat", codex, claude).ready()).toEqual({ ready: true, maker: "Claude" });
        const pictures = hostPictures(() => "claude-code", () => undefined, codex, claude);
        await pictures.make(bridge);
        expect(claude.made).toEqual([bridge]);
        expect(codex.made).toEqual([]);
        expect(hostPictures(() => "codex-mcp-client", () => undefined, codex, claude).ready()).toEqual({ ready: true, maker: "Codex" });
        // In Codex, Codex is the chat: its no is the answer, with nothing in its place.
        const away = maker({ ready: false, why: "Codex is not installed on this computer" });
        expect(hostPictures(() => "codex-mcp-client", () => "codex", away, claude).ready()).toEqual({ ready: false, why: "Codex is not installed on this computer" });
    });

    it("takes Codex where chosen, and where it is not ready leaves the picture to the chat in use, saying why", async () => {
        const codex = maker({ ready: true, maker: "Codex" });
        const claude = maker({ ready: true, maker: "Claude" });
        expect(hostPictures(() => "claude-code", () => "codex", codex, claude).ready()).toEqual({ ready: true, maker: "Codex" });
        const away = maker({ ready: false, why: "Codex is not logged in on this computer", fix: "1. Paste `codex login`." });
        const pictures = hostPictures(() => "claude-code", () => "codex", away, claude);
        expect(pictures.ready()).toEqual({
            ready: true,
            maker: "Claude",
            instead: { maker: "Codex", by: "Claude", why: "Codex is not logged in on this computer", fix: "1. Paste `codex login`." },
        });
        expect(await pictures.make(bridge)).toEqual({ refused: "Codex is not logged in on this computer; Claude made none either: a fake makes nothing" });
        expect(claude.made).toEqual([bridge]);
        // With neither, Codex's no and how to have it.
        expect(hostPictures(() => undefined, () => "codex", away, maker({ ready: false, why: "Claude Code is not logged in on this computer" })).ready()).toMatchObject({
            ready: false,
            why: "Codex is not logged in on this computer",
        });
    });

    it("remembers a refusal of Codex until the choice changes, the chat in use making the pictures meanwhile", async () => {
        let choice = "codex";
        const codex: PictureMaker & { asked: number; } = { asked: 0, ready: () => ({ ready: true, maker: "Codex" }), make: () => (codex.asked++, Promise.resolve({ refused: "your plan makes no pictures" })) };
        const claude: PictureMaker = { ready: () => ({ ready: true, maker: "Claude" }), make: () => Promise.resolve({ file: "drawn.svg", done: () => undefined }) };
        const pictures = hostPictures(() => "claude-code", () => choice, codex, claude);
        const instead = { maker: "Codex", by: "Claude", why: "your plan makes no pictures", refused: true };
        expect(await pictures.make(bridge)).toMatchObject({ file: "drawn.svg", instead });
        expect(pictures.ready()).toEqual({ ready: true, maker: "Claude", instead });
        expect(await pictures.make(bridge)).toMatchObject({ file: "drawn.svg", instead });
        expect(codex.asked).toBe(1);
        // Chosen again: Codex is asked again.
        choice = "chat";
        pictures.ready();
        choice = "codex";
        expect(pictures.ready()).toEqual({ ready: true, maker: "Codex" });
    });

    it("asks Codex again after a refusal of that one picture, as the safety check's", async () => {
        const codex: PictureMaker & { asked: number; } = {
            asked: 0,
            ready: () => ({ ready: true, maker: "Codex" }),
            make: () => (codex.asked++, Promise.resolve({ refused: "the generator's safety check refused it", onlyThis: true as const })),
        };
        const claude: PictureMaker = { ready: () => ({ ready: true, maker: "Claude" }), make: () => Promise.resolve({ file: "drawn.svg", done: () => undefined }) };
        const pictures = hostPictures(() => "claude-code", () => "codex", codex, claude);
        expect(await pictures.make(bridge)).toMatchObject({ file: "drawn.svg", instead: { maker: "Codex", by: "Claude", refused: true } });
        expect(pictures.ready()).toEqual({ ready: true, maker: "Codex" });
        await pictures.make(bridge);
        expect(codex.asked).toBe(2);
    });

    it("takes Antigravity's painter where chosen in another chat, and the chat's own in Antigravity (T-251)", async () => {
        const codex = maker({ ready: true, maker: "Codex" });
        const claude = maker({ ready: true, maker: "Claude" });
        const painter = maker({ ready: true, maker: "Antigravity" });
        const pictures = hostPictures(() => "claude-code", () => "antigravity", codex, claude, painter);
        expect(pictures.ready()).toEqual({ ready: true, maker: "Antigravity" });
        expect(pictures.brief?.(bridge)).toBeUndefined();
        await pictures.make(bridge);
        expect(painter.made).toEqual([bridge]);
        // In Antigravity, the chat paints it itself: the painter is never started.
        const inAntigravity = hostPictures(() => hosts.antigravity.client, () => "antigravity", codex, claude, painter);
        expect(inAntigravity.ready()).toEqual({ ready: true, maker: "Antigravity" });
        expect(inAntigravity.brief?.(bridge)).toMatch(/^Make exactly one new image from the brief below/);
        expect(await inAntigravity.make(bridge)).toEqual({ refused: "Antigravity makes its pictures in its own chat" });
        expect(painter.made).toEqual([bridge]);
        expect(codex.made).toEqual([]);
    });

    it("leaves the picture to the chat in use where Antigravity's painter is not ready, saying why, as Codex's (T-251)", async () => {
        const claude = maker({ ready: true, maker: "Claude" });
        const away = maker({ ready: false, why: "Antigravity's agy does not answer on this computer, or is not signed in" });
        const pictures = hostPictures(() => "claude-code", () => "antigravity", maker({ ready: true, maker: "Codex" }), claude, away);
        expect(pictures.ready()).toEqual({
            ready: true,
            maker: "Claude",
            instead: { maker: "Antigravity", by: "Claude", why: "Antigravity's agy does not answer on this computer, or is not signed in" },
        });
        expect(await pictures.make(bridge)).toEqual({ refused: "Antigravity's agy does not answer on this computer, or is not signed in; Claude made none either: a fake makes nothing" });
        expect(claude.made).toEqual([bridge]);
        expect(away.made).toEqual([]);
    });

    it("remembers a refusal of Antigravity's painter apart from Codex's, until the choice changes (T-251)", async () => {
        let choice = "antigravity";
        const painter: PictureMaker & { asked: number; } = {
            asked: 0,
            ready: () => ({ ready: true, maker: "Antigravity" }),
            make: () => (painter.asked++, Promise.resolve({ refused: "Antigravity made no picture: the image tool failed" })),
        };
        const claude: PictureMaker = { ready: () => ({ ready: true, maker: "Claude" }), make: () => Promise.resolve({ file: "drawn.svg", done: () => undefined }) };
        const codex = maker({ ready: true, maker: "Codex" });
        const pictures = hostPictures(() => "claude-code", () => choice, codex, claude, painter);
        const instead = { maker: "Antigravity", by: "Claude", why: "Antigravity made no picture: the image tool failed", refused: true };
        expect(await pictures.make(bridge)).toMatchObject({ file: "drawn.svg", instead });
        expect(pictures.ready()).toEqual({ ready: true, maker: "Claude", instead });
        await pictures.make(bridge);
        expect(painter.asked).toBe(1);
        // Codex is not the one that refused.
        choice = "codex";
        expect(pictures.ready()).toEqual({ ready: true, maker: "Codex" });
        choice = "antigravity";
        expect(pictures.ready()).toEqual({ ready: true, maker: "Antigravity" });
    });

    it("has the master make it from the brief with ElevenLabs, or with a tool the player named, and starts nothing", () => {
        const codex = maker({ ready: true, maker: "Codex" });
        const claude = maker({ ready: true, maker: "Claude" });
        const eleven = hostPictures(() => "claude-code", () => "elevenlabs", codex, claude);
        expect(eleven.ready()).toEqual({ ready: true, maker: "ElevenLabs", tool: "ElevenLabs" });
        expect(eleven.brief?.(bridge)).toContain("Ponte, as adventurers see it arriving");
        expect(hostPictures(() => "claude-code", () => "Pittore", codex, claude).ready()).toEqual({ ready: true, maker: "Pittore", tool: "Pittore" });
        // Another tool, not named yet: the master asks the player which.
        const other = hostPictures(() => "claude-code", () => "other", codex, claude);
        expect(other.ready()).toEqual({ ready: true, maker: "another tool", askTool: true });
        expect(other.brief?.(bridge)).toContain("Ponte, as adventurers see it arriving");
        expect([...codex.made, ...claude.made]).toEqual([]);
    });

    it("in Antigravity has the chat paint it itself from the brief, and starts nothing", async () => {
        const codex = maker({ ready: true, maker: "Codex" });
        const pictures = hostPictures(() => hosts.antigravity.client, () => undefined, codex, maker({ ready: true, maker: "Claude" }));
        expect(pictures.ready()).toEqual({ ready: true, maker: "Antigravity" });
        const brief = pictures.brief?.(bridge) ?? "";
        expect(brief).toMatch(/^Make exactly one new image from the brief below with your own image generation tool/);
        expect(brief).toContain("Ponte, as adventurers see it arriving: un ponte di pietra");
        expect(brief).toContain("landscape, 16:9");
        expect(brief).toContain("Never show: ragni");
        // Elsewhere no brief: the engine makes the picture.
        expect(hostPictures(() => "claude-code", () => undefined, codex).brief?.(bridge)).toBeUndefined();
        // Codex chosen and not ready: the chat paints it in its place.
        const away = maker({ ready: false, why: "Codex is not installed on this computer" });
        expect(hostPictures(() => hosts.antigravity.client, () => "codex", away).brief?.(bridge)).toContain("Ponte, as adventurers see it arriving");
        expect(codex.made).toEqual([]);
        // Its tool fails or it has none: it draws the SVG instead, in one more line.
        expect(brief.split("\n").at(-1)).toMatch(/^If your image tool fails or you have none, draw it as SVG code instead: .* call image again for the same page with svg holding the code\.$/);
        expect(brief.length).toBeLessThan(1400);
    });

    it("gives each chat its own means by the name its client gives itself", () => {
        const codex = maker({ ready: true, maker: "Codex" });
        const claude = maker({ ready: true, maker: "Claude" });
        const ready = (client: string | undefined): PicturesReady => hostPictures(() => client, () => undefined, codex, claude).ready();
        expect(ready("codex-mcp-client")).toEqual({ ready: true, maker: "Codex" });
        expect(ready(hosts.antigravity.client)).toEqual({ ready: true, maker: "Antigravity" });
        expect(ready("claude-code")).toEqual({ ready: true, maker: "Claude" });
        expect(ready("claude-ai")).toEqual({ ready: true, maker: "Claude" });
        expect(ready(undefined)).toEqual({ ready: true, maker: "Claude" });
        expect(ready("opencode")).toEqual({ ready: true, maker: "OpenCode", draws: true });
        expect(ready("some-agent")).toEqual({ ready: true, maker: "some-agent", draws: true });
    });

    it("has any other chat, as OpenCode, draw the SVG itself and hand it back with svg, and starts nothing", async () => {
        const codex = maker({ ready: true, maker: "Codex" });
        const claude = maker({ ready: true, maker: "Claude" });
        const pictures = hostPictures(() => "opencode", () => undefined, codex, claude);
        const brief = pictures.brief?.(bridge) ?? "";
        expect(brief).toMatch(/^Draw exactly one new picture from the brief below yourself, as SVG code\./);
        expect(brief).toContain('viewBox="0 0 2100 900" (21:9)');
        expect(brief).toContain("Primary request: Ponte, as adventurers see it arriving: un ponte di pietra");
        expect(brief).toContain("Never show: ragni");
        expect(brief).toContain("no script, style, text, image, use, a, foreignObject or animation");
        expect(brief).not.toContain("Reply with the SVG alone");
        expect(brief.split("\n").at(-1)).toBe("Then call image again for the same page with svg holding the code, from <svg to </svg>: write no file, and do not show the code to the player.");
        expect(await pictures.make(bridge)).toEqual({ refused: "OpenCode draws its pictures in its own chat" });
        expect([...codex.made, ...claude.made]).toEqual([]);
    });

    it("leaves the picture to a chat that draws where Codex is chosen and cannot, saying the next are its own to draw", async () => {
        const away = maker({ ready: false, why: "Codex is not installed on this computer" });
        const pictures = hostPictures(() => "opencode", () => "codex", away, maker({ ready: true, maker: "Claude" }));
        expect(pictures.ready()).toEqual({ ready: true, maker: "OpenCode", draws: true, instead: { maker: "Codex", by: "OpenCode", why: "Codex is not installed on this computer" } });
        expect(pictures.brief?.(bridge)).toMatch(/^Draw exactly one new picture/);
        // Codex ready, then refusing a picture: the call has answered, and the next pictures are the chat's to draw.
        const refusing: PictureMaker = { ready: () => ({ ready: true, maker: "Codex" }), make: () => Promise.resolve({ refused: "your plan makes no pictures" }) };
        const after = hostPictures(() => "opencode", () => "codex", refusing);
        expect(after.brief?.(bridge)).toBeUndefined();
        expect(await after.make(bridge)).toEqual({ refused: "your plan makes no pictures; the next pictures are yours to draw as SVG code and give with image, svg" });
        expect(after.ready()).toMatchObject({ ready: true, maker: "OpenCode", draws: true, instead: { refused: true } });
        expect(after.brief?.(bridge)).toMatch(/^Draw exactly one new picture/);
    });

    it("names the program that would read a document, which the player is told it goes to (D-493)", () => {
        const reader = (ready: boolean, program: "Claude Code" | "Codex"): DocumentReader => ({ ready: () => ready, program: () => program, read: () => Promise.resolve({ said: "" }) });
        expect(hostReader(() => "claude-code", reader(true, "Codex"), reader(true, "Claude Code")).program?.()).toBe("Claude Code");
        expect(hostReader(() => "claude-code", reader(true, "Codex"), reader(false, "Claude Code")).program?.()).toBe("Codex");
        expect(hostReader(() => "codex-mcp-client", reader(false, "Codex"), reader(true, "Claude Code")).program?.()).toBeUndefined();
    });

    it("passes the stop on to the program that reads", async () => {
        const signals: (AbortSignal | undefined)[] = [];
        const claude: DocumentReader = { ready: () => true, read: (_folder, _brief, _writable, signal) => (signals.push(signal), Promise.resolve({ said: "" })) };
        const stop = new AbortController();
        await hostReader(() => "claude-code", claude, claude).read("folder", "brief", [], stop.signal);
        expect(signals).toEqual([stop.signal]);
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
        const portrait = svgBrief({ kind: "portrait", name: "Mira", who: "Hill Dwarf, Dwarf; Level 3 Cleric", seen: "una chierica dai capelli grigi", unseen: [] });
        expect(portrait).toContain('viewBox="0 0 1024 1024" (1:1)');
        expect(portrait).toContain("Primary request: a portrait of Mira, Hill Dwarf, Dwarf; Level 3 Cleric: una chierica dai capelli grigi");
        expect(portrait).toContain("Faithfulness: exactly what the game says they are (Hill Dwarf, Dwarf; Level 3 Cleric)");
        // A kind of creature met: its head, as the character sees it (D-420).
        const creature = svgBrief({ kind: "creature", name: "a creature", seen: "un lupo dal pelo bianco", unseen: ["ragni"] });
        expect(creature).toContain('Asset type: square picture of a creature for the round token of a tabletop role-playing game, viewBox="0 0 1024 1024" (1:1)');
        expect(creature).toContain("Primary request: the head of a creature: un lupo dal pelo bianco");
        expect(creature).toContain("a close-up of the head, its face or muzzle centred");
        expect(creature).toContain("Never show: ragni");
        expect(creature).not.toContain("Faithfulness");
    });
});

describe("Antigravity's hook before each tool", () => {
    it("lets the rpg server's tools and their descriptions run, and asks for every other", () => {
        const call = (name: string, args: Record<string, unknown>): string => JSON.stringify({ toolCall: { name, args }, hookEventName: "PreToolUse" });
        expect(approval(call("call_mcp_tool", { ServerName: "rpg", ToolName: "roll", Arguments: {} }))).toEqual({ decision: "auto_approve" });
        expect(approval(call("read_file", { Path: "C:\\Users\\me\\.gemini\\antigravity-cli\\mcp\\rpg\\roll.json" }))).toEqual({ decision: "auto_approve" });
        expect(approval(call("call_mcp_tool", { ServerName: "mappe", ToolName: "draw" }))).toEqual({ decision: "ask" });
        expect(approval(call("read_file", { Path: "/home/me/.gemini/antigravity-cli/mcp/rpg/../../oauth_creds.json" }))).toEqual({ decision: "ask" });
        expect(approval(call("read_file", { Path: "campaign.yaml" }))).toEqual({ decision: "ask" });
        expect(approval(call("run_command", { CommandLine: "rpg status" }))).toEqual({ decision: "ask" });
        expect(approval("not json")).toEqual({ decision: "ask" });
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

    it("never lets a quote in a value close it and open another, writes SVG's names and its namespace, and keeps each attribute once", () => {
        expect(cleanSvg(`<svg viewBox="0 0 1 1"><rect fill='x" onmouseover="alert(1)'/><rect fill='url("#a")' fill="red"/></svg>`)).toBe(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="x' onmouseover='alert(1)"/><rect fill="url('#a')"/></svg>`,
        );
        expect(cleanSvg('<SVG VIEWBOX="0 0 1 1"><lineargradient id="a" gradientunits="userSpaceOnUse"></LINEARGRADIENT><RECT/></SVG>')).toBe(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><linearGradient id="a" gradientUnits="userSpaceOnUse"></linearGradient><rect/></svg>',
        );
    });

    it("drops an outer url() left open, and a CSS escape, from any value", () => {
        expect(cleanSvg('<svg viewBox="0 0 1 1"><rect filter="url(http://example.com/x" fill="\\75rl(http://example.com/y)" stroke="url( \'#a\' )"/></svg>')).toBe(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect stroke="url( '#a' )"/></svg>`,
        );
        expect(cleanSvg('<svg viewBox="0 0 1 1"><rect fill="url(  #a"/></svg>')).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="url(  #a"/></svg>');
    });

    it("takes none without a single closed root, or larger than 100 KB, and finds the SVG in an answer with words around it", () => {
        expect(cleanSvg("<g><rect/></g>")).toBeUndefined();
        expect(cleanSvg('<svg viewBox="0 0 1 1"><g>')).toBeUndefined();
        expect(cleanSvg(`<svg viewBox="0 0 1 1"><path d="${"M0 0 ".repeat(25_000)}"/></svg>`)).toBeUndefined();
        // Nothing with a shape left: text, a link and a use alone.
        expect(cleanSvg('<svg viewBox="0 0 1 1"><text>hi</text><a href="#a"><use href="#b"/></a><defs></defs></svg>')).toBeUndefined();
        expect(svgIn('Here it is:\n```svg\n<svg viewBox="0 0 1 1"></svg>\n```')).toBe('<svg viewBox="0 0 1 1"></svg>');
        expect(svgIn("I cannot draw that.")).toBeUndefined();
    });
});
