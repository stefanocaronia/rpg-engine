// Adventures as packages (D-483, ADV-1–ADV-7): installed whole or not at all, from a folder or a .zip, with their dates moved to today; taken out while the
// story has not touched them; exported as they were at the start, without the player characters.
import { zipSync } from "fflate";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readAdventureZip, readManifest } from "../src/adventures/index.ts";
import { runCommandLine } from "../src/command-line.ts";
import { makeSave } from "../src/commands/game-saves.ts";
import type { Context } from "../src/core/context.ts";
import { appendLogEntry, newLogEntry } from "../src/core/log.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { type Dashboard, startDashboard } from "../src/dashboard-server.ts";
import { inPlay, makeTempFolder, readLogFile, testContext } from "./support.ts";

const manifest = [
    "title: Il pozzo",
    "about: A well that whispers under a village.",
    "language: en",
    "version: 1.0.0",
    "author: Ada",
    "license: CC BY 4.0",
    "needs: {system: fake}",
    "levels: 1-3",
    "content: [drowning]",
    "start: '[[Pozzo]]'",
    "opening: '[[Apertura del pozzo]]'",
].join("\n");

const pages: Record<string, string> = {
    "world/places/Pozzo.md": "---\ncontains: ['[[Oste]]']\n---\n\nAn old well.\n",
    "world/characters/Oste.md": "---\nrole: npc\naliases: [Bertoldo]\n---\n\nThe innkeeper. On day 4 he leaves.\n",
    "world/events/La piena.md": "---\ndate: day 3, 06:00\nstatus: planned\n---\n\nThe water rises.\n",
    "world/topics/Apertura del pozzo.md": "---\ntags: [opening]\n---\n\nThe situation.\n",
    "world/creatures/Bog Hound.md": "---\ngrit: 3\n---\n\nA hound of the well.\n",
    "rules/Acqua.md": "# Acqua fredda\n\nCold water tires.\n",
    "images/pozzo.svg": "<svg xmlns='http://www.w3.org/2000/svg'/>",
};

let folder: string;
let context: Context;
const rpg = (...args: string[]) => runCommandLine(args, context);

/** The adventure as a folder of this computer, with these files in place of its own, or without those given as null. */
function adventureFolder(changes: Record<string, string | null> = {}, top = manifest): string
{
    const root = join(makeTempFolder(), "Il pozzo");
    const all: Record<string, string | null> = { "adventure.yaml": top, ...pages, ...changes };

    for (const [path, text] of Object.entries(all)) {
        if (text !== null) {
            mkdirSync(dirname(join(root, path)), { recursive: true });
            writeFileSync(join(root, path), text);
        }
    }

    return root;
}

/** The adventure as a .zip, its files under `top` when given, as GitHub zips a repository. */
function adventureZip(changes: Record<string, string> = {}, top = ""): string
{
    const all = { "adventure.yaml": manifest, ...pages, ...changes };
    const file = join(makeTempFolder(), "Il pozzo.adventure.zip");
    writeFileSync(file, zipSync(Object.fromEntries(Object.entries(all).map(([path, text]) => [`${top}${path}`, new TextEncoder().encode(text)]))));
    return file;
}

function setDay(day: number): void
{
    const state = join(folder, "state.yaml");
    writeFileSync(state, `${readFileSync(state, "utf8").replace(/^date:.*\n/m, "")}date: day ${day}, 08:00\n`);
}

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await rpg("init", "--name", "Prova", "--language", "en", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
});

describe("package install of an adventure (ADV-1–ADV-5)", () => {
    it("puts its pages under their type's folder, its pictures and rules in folders of its own, logs the files, and tells the master what to read", async () => {
        const result = await rpg("package", "install", adventureFolder());
        expect(result.exitCode).toBe(0);
        expect(existsSync(join(folder, "world", "characters", "Il pozzo", "Oste.md"))).toBe(true);
        expect(existsSync(join(folder, "images", "Il pozzo", "pozzo.svg"))).toBe(true);
        expect(existsSync(join(folder, "rules", "Il pozzo", "Acqua.md"))).toBe(true);
        expect(result.output).toContain("Installed the adventure Il pozzo 1.0.0 by Ada (CC BY 4.0): A well that whispers under a village.");
        expect(result.output).toContain("It is written for levels 1-3: adapt it to the party's.");
        expect(result.output).toContain("Its content: drowning; keep to the player's lines and veils.");
        expect(result.output).toContain("Its pages take the place of the game system's: Bog Hound.");
        expect(result.output).toContain("Show [[Apertura del pozzo]] and the pages it says to read first before you narrate.");
        expect(result.output).toContain("It starts in [[Pozzo]], in no place of the world yet");
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "adventure-installed", data: { title: "Il pozzo", version: "1.0.0", shift: 0 } });
        expect((await rpg("package", "list")).output).toContain("Its adventures: Il pozzo 1.0.0");
    });

    it("moves the dates of its frontmatter to today, and counts those its text keeps (ADV-4)", async () => {
        setDay(5);
        const result = await rpg("package", "install", adventureFolder());
        expect(readFileSync(join(folder, "world", "events", "Il pozzo", "La piena.md"), "utf8")).toContain("date: day 7, 06:00");
        expect(result.output).toContain("Its dates moved 4 days: the first, [[La piena]], on day 7, 06:00. 1 date in its text stays as written");
    });

    it("refuses it whole when a name or an alias is the campaign's already, or twice its own, and writes nothing (ADV-2)", async () => {
        await rpg("write", "Bertoldo", "--type", "character");
        const result = await rpg("package", "install", adventureFolder({ "world/places/Oste.md": "A second Oste.\n" }));
        expect(result.exitCode).toBe(1);
        expect(result.output).toContain("Bertoldo is already a page of the campaign");
        expect(result.output).toContain("Oste names two of its pages");
        expect(result.output).toMatch(/Nothing changed\.$/);
        expect(existsSync(join(folder, "world", "characters", "Il pozzo"))).toBe(false);
    });

    it("refuses what is not for the campaign: another game system, an extension it lacks, levels where the system has none", async () => {
        expect((await rpg("package", "install", adventureFolder({}, manifest.replace("system: fake", "system: free")))).output).toContain("is for the game system free");
        expect((await rpg("package", "install", adventureFolder({}, manifest.replace("{system: fake}", "{system: fake, extensions: {weather: 0.1.0}}")))).output).toContain(
            "needs the extension weather: install it with package install weather first",
        );
    });

    it("finishes an install that stopped halfway, with the same shift, as a file already written is no name taken (ADV-5)", async () => {
        setDay(3);
        await rpg("package", "install", adventureFolder());
        const written = readFileSync(join(folder, "world", "events", "Il pozzo", "La piena.md"), "utf8");
        // As if it stopped before its line: the line goes, the mark stays, and the day moved on.
        writeFileSync(join(folder, "log.jsonl"), readFileSync(join(folder, "log.jsonl"), "utf8").trim().split("\n").slice(0, -1).join("\n") + "\n");
        writeFileSync(join(folder, ".adventure-install.yaml"), 'title: "Il pozzo"\nshift: 2\n');
        setDay(9);
        expect((await rpg("package", "install", adventureFolder())).exitCode).toBe(0);
        expect(readFileSync(join(folder, "world", "events", "Il pozzo", "La piena.md"), "utf8")).toBe(written);
        expect(existsSync(join(folder, ".adventure-install.yaml"))).toBe(false);
    });

    it("tells a document from a package: one without adventure.yaml is the master's to import (D-483 (10))", async () => {
        const result = await rpg("package", "install", join(folder, "Il pozzo.pdf"));
        expect(result.output).toContain("is a document, not a package: make an adventure from it with import");
    });
});

describe("an adventure's .zip (ADV-1)", () => {
    it("is read inside one folder at its top, as GitHub makes it, leaving out what is no part of it", async () => {
        const result = await rpg("package", "install", adventureZip({ "README.md": "Read me.", "LICENSE": "CC BY 4.0", "notes.txt": "Mine." }, "pozzo-main/"));
        expect(result.exitCode).toBe(0);
        expect(result.output).toContain("Left out, no part of an adventure: notes.txt.");
        expect(result.output).toContain("Its first date: [[La piena]], on day 3, 06:00.");
    });

    it("is refused whole for a path that climbs out, a file of the wrong kind, a name not in UTF-8, or no manifest", () => {
        const zip = (entries: Record<string, string>) => zipSync(Object.fromEntries(Object.entries(entries).map(([path, text]) => [path, new TextEncoder().encode(text)])));
        expect(() => readAdventureZip(zip({ "adventure.yaml": manifest, "../evil.md": "x" }), "a.zip")).toThrow("a path outside the adventure");
        expect(() => readAdventureZip(zip({ "adventure.yaml": manifest, "world/run.exe": "x" }), "a.zip")).toThrow("world/ holds only markdown files");
        expect(() => readAdventureZip(zip({ "adventure.yaml": manifest, "world/places/Citt\u0085.md": "x" }), "a.zip")).toThrow("not written in UTF-8");
        expect(() => readAdventureZip(zip({ "world/places/A.md": "x" }), "a.zip")).toThrow("has no adventure.yaml at its top");
        expect(() => readAdventureZip(zip({ "adventure.yaml": manifest, "world/topics/Chi va là?.md": "x" }), "a.zip")).toThrow("one this computer cannot write");
    });

    it("reads again the UTF-8 of a name the zip did not mark, and leaves out what macOS adds beside the folder", () => {
        const zip = (entries: Record<string, string>) => zipSync(Object.fromEntries(Object.entries(entries).map(([path, text]) => [path, new TextEncoder().encode(text)])));
        // "Leña" as its UTF-8 bytes read one by one, as an unmarked name is.
        const read = readAdventureZip(
            zip({ "pozzo-main/adventure.yaml": manifest, "pozzo-main/world/places/LeÃ±a.md": "x", "__MACOSX/pozzo-main/._adventure.yaml": "x", ".DS_Store": "x" }),
            "a.zip",
        );
        expect(Object.keys(read.files)).toEqual(["world/places/Leña.md"]);
        expect(read.ignored).toEqual([]);
    });

    it("has a manifest that says what to fix", () => {
        expect(() => readManifest("title: X\nabout: Y\nlanguage: english\nversion: 1", "a.zip")).toThrow("language, a language code, such as en, it or pt-BR");
    });
});

describe("package remove of an adventure (ADV-6)", () => {
    it("takes it out with its files while the story has not touched it, and keeps it once a line names one of its pages", async () => {
        await rpg("package", "install", adventureFolder());
        expect((await rpg("package", "remove", "Il pozzo")).output).toBe("Il pozzo is out of the campaign, with the files it wrote.");
        expect(existsSync(join(folder, "world", "characters", "Il pozzo", "Oste.md"))).toBe(false);
        expect((await rpg("package", "list")).output).not.toContain("Il pozzo");

        await rpg("package", "install", adventureFolder());
        appendLogEntry(folder, newLogEntry(context, "moved", "public", { what: "Oste", to: "Pozzo" }));
        const kept = await rpg("package", "remove", "Il pozzo");
        expect(kept.exitCode).toBe(1);
        expect(kept.output).toContain("is part of the story now");
    });

    it("takes out an adventure whose picture the campaign had, or whose page was deleted by hand, and is not held by a word that only contains a name", async () => {
        mkdirSync(join(folder, "images"), { recursive: true });
        writeFileSync(join(folder, "images", "pozzo.svg"), pages["images/pozzo.svg"]);
        await rpg("package", "install", adventureFolder({ "world/characters/Re.md": "The king.\n" }));
        expect(existsSync(join(folder, "images", "Il pozzo", "pozzo.svg"))).toBe(false);
        appendLogEntry(folder, newLogEntry(context, "rested", "public", { rest: "a long rest" }));
        rmSync(join(folder, "world", "places", "Il pozzo", "Pozzo.md"));
        expect((await rpg("package", "remove", "Il pozzo")).exitCode).toBe(0);
        expect(existsSync(join(folder, "images", "pozzo.svg"))).toBe(true);
    });
});

describe("an install under way (ADV-5)", () => {
    it("is finished before another adventure comes in, and an adventure installed again says the dates it moved", async () => {
        writeFileSync(join(folder, ".adventure-install.yaml"), 'title: "La torre"\nshift: 0\nfrom: torre.zip\n');
        expect((await rpg("package", "install", adventureFolder())).output).toBe("The install of La torre stopped halfway: finish it first with package install torre.zip. Nothing changed.");
        rmSync(join(folder, ".adventure-install.yaml"));
        setDay(5);
        await rpg("package", "install", adventureFolder());
        expect((await rpg("package", "install", adventureFolder())).output).toContain("Its dates moved 4 days: the first, [[La piena]], on day 7, 06:00.");
    });
});

describe("package export (ADV-7)", () => {
    it("writes the world as it was before session zero, without the player characters and their pictures, the same bytes each time", async () => {
        await rpg("write", "Borgo", "--type", "place");
        await rpg("write", "Inizio", "--type", "topic", "--set", "tags=[opening]", "--set", "start=[[Borgo]]");
        makeSave(folder, context, undefined, "session zero");
        await rpg("write", "Ettore", "--type", "character", "--set", "role=pc");
        const result = await rpg("package", "export", "--author", "Ada");
        expect(result.output).toContain("2 pages, from the save 1");
        expect(result.output).toContain("Its opening is [[Inizio]].");
        const file = join(folder, "exports", "Prova.adventure.zip");
        const first = readFileSync(file);
        const read = readAdventureZip(first, "Prova.adventure.zip");
        expect(Object.keys(read.files).sort()).toEqual(["world/places/Borgo.md", "world/topics/Inizio.md"]);
        expect(read.manifest).toMatchObject({ title: "Prova", author: "Ada", opening: "Inizio", start: "Borgo" });
        // No page uses the game system: the adventure needs none, nor its credits (D-489 (6)).
        expect(read.manifest.needs.system).toBeUndefined();
        expect(read.manifest.attribution).toBeUndefined();
        await rpg("package", "export", "--author", "Ada");
        expect(readFileSync(file).equals(first)).toBe(true);
    });

    it("needs the game system only where a page uses it, and keeps to the player the pages from their own documents (D-489 (6))", async () => {
        await rpg("write", "Borgo", "--type", "place", "--set", "source=The King, p. 3");
        await rpg("write", "Grosh", "--type", "character", "--set", "creature=[[Bog Hound]]");
        makeSave(folder, context, undefined, "session zero");
        const result = await rpg("package", "export");
        expect(result.output).toContain("1 of its pages come from the player's own documents (source:): Borgo. So it says personal use only.");
        const read = readAdventureZip(readFileSync(join(folder, "exports", "Prova.adventure.zip")), "Prova.adventure.zip");
        expect(read.manifest).toMatchObject({ license: "personal use only", needs: { system: "fake" } });
        expect(read.manifest.attribution).toContain("The fake system of rpg-engine's tests");
        // The player says they may share it, with the document's own license.
        expect((await rpg("package", "export", "--license", "CC BY 4.0")).output).not.toContain("personal use only");
    });

    it("writes a manifest that installs again, whatever the campaign's premise and language", async () => {
        const settings = join(folder, "campaign.yaml");
        writeFileSync(settings, `${readFileSync(settings, "utf8").replace(/^language: en$/m, "language: es-419")}premise: ${"A long premise of many words. ".repeat(12)}\n`);
        makeSave(folder, context, undefined, "session zero");
        await rpg("package", "export");
        const read = readAdventureZip(readFileSync(join(folder, "exports", "Prova.adventure.zip")), "Prova.adventure.zip");
        expect(read.manifest).toMatchObject({ language: "es-419", about: "A long premise of many words." });
    });

    it("refuses a campaign played with no save of its start: what it is now is a save of the whole game", async () => {
        await rpg("scene", "open", "--title", "Inizio");
        expect((await rpg("package", "export")).output).toContain("has no save of its start");
    });
});

describe("the adventures on the dashboard's page (D-483)", () => {
    let session: SessionStore;
    let dashboard: Dashboard;
    let port: number;

    beforeEach(async () => {
        session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
        const started = await startDashboard({ ...context, files: session }, session, { ports: [0], page: folder });

        if (started === undefined) {
            throw new Error("The dashboard did not start.");
        }

        dashboard = started;
        port = Number(new URL(dashboard.url).port);
    });

    afterEach(async () => {
        await dashboard.close();
        session.close();
    });

    function send(method: string, path: string, body?: Uint8Array | string, headers: Record<string, string> = {}): Promise<{ status: number; body: Buffer; type?: string; }>
    {
        const sentHeaders = { ...(body === undefined ? {} : { origin: `http://127.0.0.1:${port}` }), ...headers };
        return new Promise((done, fail) => {
            const sent = request({ host: "127.0.0.1", port, path, method, headers: sentHeaders }, (response) => {
                const chunks: Buffer[] = [];
                response.on("data", (chunk: Buffer) => chunks.push(chunk));
                response.on("end", () => done({ status: response.statusCode ?? 0, body: Buffer.concat(chunks), type: response.headers["content-type"] }));
            });
            sent.on("error", fail);
            sent.end(body);
        });
    }

    it("adds one from a .zip the page sends, lists it with its date, and the master hears of it", async () => {
        const added = await send("POST", "/api/add", readFileSync(adventureZip()), { "content-type": "application/zip", "x-file-name": encodeURIComponent("Il pozzo.adventure.zip") });
        expect(added.status).toBe(202);
        const listed = JSON.parse((await send("GET", "/api/packages")).body.toString("utf8")) as { adventures: { title: string; }[]; };
        expect(listed.adventures).toMatchObject([{ title: "Il pozzo", version: "1.0.0" }]);
        expect(dashboard.news().lines.join(" ")).toContain("The player, on the dashboard, added an adventure: Installed the adventure Il pozzo 1.0.0");

        const twice = await send("POST", "/api/add", new TextEncoder().encode("not a zip"), { "x-file-name": "broken.zip" });
        expect(twice.status).toBe(400);
        expect(JSON.parse(twice.body.toString("utf8")).error).toContain("broken.zip is not a .zip that reads");
    });

    it("adds one from a GitHub link, read as the zip of its branch", async () => {
        const asked: string[] = [];
        await dashboard.close();

        const download = (url: string): Promise<Uint8Array> => {
            asked.push(url);
            return Promise.resolve(readFileSync(adventureZip({}, "pozzo-main/")));
        };

        const started = await startDashboard({ ...context, files: session, download }, session, { ports: [0], page: folder });
        dashboard = started as Dashboard;
        port = Number(new URL(dashboard.url).port);
        const added = await send("POST", "/api/add", JSON.stringify({ source: "https://github.com/ada/pozzo/tree/main" }), { "content-type": "application/json" });
        expect(added.status).toBe(202);
        expect(asked).toEqual(["https://codeload.github.com/ada/pozzo/zip/refs/heads/main"]);
        expect((await send("POST", "/api/add", JSON.stringify({ source: "http://example.com/a.zip" }), { "content-type": "application/json" })).status).toBe(400);
    });

    it("exports the campaign, then gives its .zip to download by its name alone", async () => {
        makeSave(folder, context, undefined, "session zero");
        const exported = JSON.parse((await send("POST", "/api/export", JSON.stringify({ author: "Ada" }), { "content-type": "application/json" })).body.toString("utf8")) as { file: string; };
        expect(exported.file).toBe("Prova.adventure.zip");
        const downloaded = await send("GET", `/api/export?file=${encodeURIComponent(exported.file)}`);
        expect(downloaded.type).toBe("application/zip");
        expect(readAdventureZip(downloaded.body, exported.file).manifest).toMatchObject({ title: "Prova", author: "Ada" });
        expect((await send("GET", `/api/export?file=${encodeURIComponent("../campaign.yaml")}`)).status).toBe(404);
    });
});
