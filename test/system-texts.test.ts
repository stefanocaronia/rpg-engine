// A game system's pages translated on this computer where the system has no translation in the campaign's language (D-539): asked as the player reads them,
// written in the player's data folder with the print of their text, and read in their place while that text is the page's.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { systemTexts } from "../src/commands/shared/system-texts.ts";
import { campaignWorld } from "../src/commands/shared/world.ts";
import type { Context, TextWriter } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { withFiles } from "../src/core/store.ts";
import { textPrint } from "../src/core/text.ts";
import { makeTempFolder, testContext } from "./support.ts";

let home: string;
let context: Context;
let writer: TextWriter & { asked: string[][]; briefs: string[]; };

/** A writer that puts PL: before each page's name and text, or answers with what `answer` makes of a page, and keeps the names it was asked. */
function fakeWriter(answer?: (page: { name: string; text: string; }) => unknown): TextWriter & { asked: string[][]; briefs: string[]; }
{
    const asked: string[][] = [];
    const briefs: string[] = [];
    return {
        asked,
        briefs,
        ready: () => true,
        write: (brief) => {
            const pages = JSON.parse(brief.slice(brief.lastIndexOf("\n") + 1)) as { id: string; name: string; text: string; }[];
            asked.push(pages.map((page) => page.name));
            briefs.push(brief);
            const made = (page: { name: string; text: string; }): unknown => answer?.(page) ?? { name: `PL:${page.name}`, text: `PL:${page.text}` };
            return Promise.resolve(JSON.stringify(Object.fromEntries(pages.map((page) => [page.id, made(page)]))));
        },
    };
}

beforeEach(async () => {
    home = makeTempFolder();
    writer = fakeWriter();
    context = { ...testContext(makeTempFolder()), home, writer };
    context.texts = systemTexts(context, () => undefined);
    await ok("init", "--name", "Bagno", "--language", "pl", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    await ok("write", "Ettore", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Scout]] 1", "--set", "equipped=[[Buckler]]");
});

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}

/** Waits until no page is being translated into Polish. */
async function translated(): Promise<void>
{
    for (let tries = 0; tries < 100 && context.texts?.translating("pl") === true; tries++) {
        await new Promise((done) => setTimeout(done, 10));
    }
}

function ownFile(path: string): string
{
    return join(home, "systems", "fake", "translations", "pl", path);
}

describe("a system's pages translated on this computer (D-539)", () => {
    it("translates in the background the system's pages of the party's sheets, keeps them with their print, and gives them in their place", async () => {
        const overview = JSON.parse(await ok("view", "--json")) as { textsTranslating?: string; };
        expect(overview.textsTranslating).toBe("pl");
        await translated();
        expect(writer.asked.flat()).toEqual(expect.arrayContaining(["Scout", "Buckler"]));
        const scout = readFileSync(ownFile("world/topics/Scout.md"), "utf8");
        expect(scout).toContain("name: PL:Scout");
        expect(scout).toContain("PL:**The Scout** walks ahead");
        const shown = await ok("show", "Scout");
        expect(shown).toContain("Named in the campaign's language: PL:Scout.");
        expect(shown).toContain("PL:**The Scout**");
        // The fields stay the system's, and the page is found by its English name.
        expect(shown).toContain("stamina-die: d4");
        // Read again, the pages translated are not asked for again.
        const asked = writer.asked.length;
        const again = JSON.parse(await ok("view", "--json")) as { textsTranslating?: string; };
        await translated();
        expect(again.textsTranslating).toBeUndefined();
        expect(writer.asked.length).toBe(asked);
        // The page names the system's pages in the language, though the system has no words in it.
        expect((again as { words?: { words: Record<string, string>; }; }).words?.words.Scout).toBe("PL:Scout");
    });

    it("translates a page as the player opens it, and the system's words in the language go with it as a glossary", async () => {
        mkdirSync(join(home, "systems", "fake", "words"), { recursive: true });
        writeFileSync(join(home, "systems", "fake", "words", "pl.yaml"), "words:\n  Steady Hand: Pewna ręka\n  Keen Eye: Bystre oko\n");
        await ok("view", "Warden");
        await translated();
        expect(writer.asked).toEqual([["Warden"]]);
        expect(existsSync(ownFile("world/topics/Warden.md"))).toBe(true);
        // Only the words its text uses.
        expect(writer.briefs[0]).toContain('"Steady Hand":"Pewna ręka"');
        expect(writer.briefs[0]).not.toContain("Bystre oko");
    });

    it("leaves a translation made from a text the system has since changed, and translates the page again", async () => {
        const file = ownFile("world/topics/Scout.md");
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, `---\nname: Stary zwiadowca\nsource: ${textPrint("an older text")}\n---\n\nStary tekst.\n`);
        expect(await ok("show", "Scout")).not.toContain("Stary");
        await ok("view", "Scout");
        await translated();
        expect(readFileSync(file, "utf8")).toContain("PL:Scout");
    });

    it("keeps no translation that loses a heading or a link, and stops for a while when a request brings none", async () => {
        writer = fakeWriter((page) => ({ name: page.name, text: page.text.replace(/^## .*$/gm, "").replace(/\[\[[^\]]+\]\]/g, "") }));
        context.writer = writer;
        await ok("view", "Scout");
        await translated();
        expect(writer.asked.length).toBe(1);
        expect(existsSync(ownFile("world/topics/Scout.md"))).toBe(false);
        // Within the pause, no other page is asked for.
        await ok("view", "Warden");
        await translated();
        expect(writer.asked.length).toBe(1);
    });

    it("asks nothing where the campaign plays in the system's language, or nothing can translate", async () => {
        const english = { ...testContext(makeTempFolder()), home, writer };
        english.texts = systemTexts(english, () => undefined);
        expect((await runCommandLine(["init", "--name", "Fen", "--language", "en", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], english)).exitCode).toBe(0);
        expect((await runCommandLine(["view", "Scout"], english)).exitCode).toBe(0);
        context.writer = { ready: () => false, write: () => Promise.resolve(undefined) };
        await ok("view", "Scout");
        await translated();
        expect(writer.asked).toEqual([]);
    });
    it("keeps a session's world from one call to the next, the system's pages translated on this computer written through it (D-137)", async () => {
        const session = new SessionStore({ systemFolders: [...(context.systemFolders ?? []), join(home, "systems")], watchFolder: () => ({ close: () => undefined }) });

        const read = async () => {
            await session.ready();
            return withFiles(session, () => campaignWorld(context.folder, context));
        };

        session.track(context.folder);
        const first = await read();
        expect(await read()).toBe(first);
        // A translation written through the session is read at the next call.
        withFiles(session, () => context.texts?.want("pl", { name: "fake", title: "fake" }, [{ path: "world/topics/Warden.md", name: "Warden", body: first.system?.pages.find((page) => page.name === "Warden")?.body ?? "" }], {}));
        await translated();
        expect((await read()).system?.pages.find((page) => page.name === "Warden")?.title).toBe("PL:Warden");
        session.close();
    });

    it("tries a page again after a writer that failed, as offline, and never writes outside the player's data folder", async () => {
        let now = new Date("2026-10-02T10:00:00Z");
        context.now = () => now;
        let failing = true;
        const healthy = writer;
        // As Codex and Claude Code do, a writer that fails answers nothing.
        context.writer = { ready: () => true, write: (brief) => (failing ? Promise.resolve(undefined) : healthy.write(brief)) };

        for (const minutes of [0, 11, 22]) {
            now = new Date(now.getTime() + minutes * 60_000);
            failing = minutes < 22;
            await ok("view", "Warden");
            await translated();
        }

        expect(existsSync(ownFile("world/topics/Warden.md"))).toBe(true);
        // A language written by hand as a path is no folder of translations.
        writeFileSync(join(context.folder, "campaign.yaml"), readFileSync(join(context.folder, "campaign.yaml"), "utf8").replace("language: pl", "language: ../../escaped"));
        await runCommandLine(["view", "Scout"], context);
        await translated();
        expect(existsSync(join(home, "systems", "escaped"))).toBe(false);
    });

    it("leaves out of the campaign's problems a translated file of this computer that does not read, and translates the page again over it", async () => {
        const file = ownFile("world/topics/Scout.md");
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, "---\nname: [broken\n---\n\nZepsuty.\n");
        expect(await ok("validate")).not.toContain("Scout.md");
        await ok("view", "Scout");
        await translated();
        expect(readFileSync(file, "utf8")).toContain("PL:Scout");
    });

    it("keeps a page of a version of the system's rules apart from the common one, as its text is the version's (VER-3)", async () => {
        await ok("config", "ruleset", "second");
        await ok("view", "Rushlight");
        await translated();
        expect(existsSync(ownFile(join("versions", "second", "world", "items", "Rushlight.md")))).toBe(true);
        expect(existsSync(ownFile(join("world", "items", "Rushlight.md")))).toBe(false);
        expect(await ok("show", "Rushlight")).toContain("Named in the campaign's language: PL:Rushlight.");
    });
});
