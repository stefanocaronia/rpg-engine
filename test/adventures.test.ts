// Adventures as packages (D-483, ADV-1–ADV-8): installed whole or not at all, from a folder or a .zip, with their dates moved to today; taken out while the
// story has not touched them; exported as they were at the start, without the player characters, with the campaign's layers over its game system as they are now.
import { zipSync } from "fflate";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readAdventureZip, readManifest } from "../src/adventures/index.ts";
import { runCommandLine } from "../src/cli/command-line.ts";
import { makeSave } from "../src/commands/shared/campaign/saves.ts";
import type { Context } from "../src/core/context.ts";
import { appendLogEntry, newLogEntry } from "../src/core/log.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { type Dashboard, startDashboard } from "../src/server/dashboard/index.ts";
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

    it("exports a world whose link names an alias two pages share, which leads to no page of the system", async () => {
        writeFileSync(join(folder, "world", "characters", "Gemello Alto.md"), "---\naliases: [Gemello]\n---\nThe elder twin.\n");
        writeFileSync(join(folder, "world", "characters", "Gemello Basso.md"), "---\naliases: [Gemello]\n---\nThe younger twin.\n");
        writeFileSync(join(folder, "world", "places", "Locanda.md"), "---\n---\nWhere [[Gemello]] waits.\n");
        makeSave(folder, context, undefined, "session zero");
        const result = await rpg("package", "export");
        expect(result.exitCode, result.output).toBe(0);
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

describe("the layers an adventure carries over its game system (ADV-8, SYS-11)", () => {
    const layersFolder = "layers/fake/world/creatures";
    const houndLayer = `${layersFolder}/Bog Hound.md`;
    const witchLayer = `${layersFolder}/Fen Witch.md`;
    const bigHound = "---\ngrit: 12/12\n---\n";
    const oldWitch = "---\ngrit: 12/12\nguard: 9\n---\n\nAn old woman of the reeds, who trades in years.\n\n## Curse\n\nA name taken is a year lost.\n";
    // Without its own Bog Hound, which would take the place of the system's.
    const withLayers = (layers: Record<string, string>): Record<string, string | null> => ({ "world/creatures/Bog Hound.md": null, ...layers });
    const layerNow = (path: string, root = folder): string | undefined => (existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : undefined);
    const exported = (root = folder) => readAdventureZip(readFileSync(join(root, "exports", "Prova.adventure.zip")), "Prova.adventure.zip");

    function handWrite(path: string, text: string): void
    {
        mkdirSync(dirname(join(folder, path)), { recursive: true });
        writeFileSync(join(folder, path), text);
    }

    /** A second adventure, with one page of its own and these layers. */
    function towerFolder(layers: Record<string, string>): string
    {
        const none = Object.fromEntries(Object.keys(pages).map((path) => [path, null]));
        return adventureFolder({ ...none, "world/places/Torre.md": "A tower.\n", ...layers }, "title: La torre\nabout: A tower in the fens.\nlanguage: en\nversion: 1.0.0\nneeds: {system: fake}\n");
    }

    /** Another campaign on the fake system, in play or still in its setup, with the commands that run in it. */
    async function otherCampaign(played: boolean): Promise<{ root: string; run: (...args: string[]) => ReturnType<typeof runCommandLine>; }>
    {
        const root = makeTempFolder();
        const own = testContext(root);
        const run = (...args: string[]) => runCommandLine(args, own);
        await run("init", "--name", "Altrove", "--language", "en", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");

        if (played) {
            inPlay(root);
        }

        return { root, run };
    }

    it("exports the layers at their own path and installs them there in another campaign, the same bytes, with no folder of the adventure's and no date moved", async () => {
        await rpg("write", "Borgo", "--type", "place");
        await rpg("write", "Bog Hound", "--layer", "--set", "grit=12/12", "--set", "omen=day 2, 06:00");
        await rpg("write", "Bog Hound#Bite", "--layer", "--text", "Three dice, at who stands beside it.");
        const written = layerNow(houndLayer);
        makeSave(folder, context, undefined, "session zero");
        const result = await rpg("package", "export");
        expect(result.output).toContain("1 pages, from the save 1 - save. It carries the campaign's layers over pages of the game system, as they are now: Bog Hound (creature).");
        const file = join(folder, "exports", "Prova.adventure.zip");
        const first = readFileSync(file);
        expect(Object.keys(exported().layers)).toEqual(["world/creatures/Bog Hound.md"]);
        // The manifest lists no layer: they are told by their folder.
        expect(new TextDecoder().decode(first)).not.toContain("layers:");
        await rpg("package", "export");
        expect(readFileSync(file).equals(first)).toBe(true);

        const other = await otherCampaign(true);
        const state = join(other.root, "state.yaml");
        writeFileSync(state, `${readFileSync(state, "utf8").replace(/^date:.*\n/m, "")}date: day 5, 08:00\n`);
        const installed = await other.run("package", "install", file);
        expect(installed.exitCode, installed.output).toBe(0);
        expect(installed.output).toContain("Its layers change pages of the game system for the whole campaign: Bog Hound (creature); show says what each changes.");
        expect(layerNow(houndLayer, other.root)).toBe(written);
        expect(existsSync(join(other.root, layersFolder, "Prova"))).toBe(false);
        expect((await other.run("show", "Bog Hound")).output).toContain("grit: 12/12");
        expect(readLogFile(other.root).at(-1)).toMatchObject({ type: "adventure-installed", data: { files: ["world/places/Prova/Borgo.md"], layers: { [houndLayer]: expect.stringMatching(/^[0-9a-f]{16}$/) } } });
    });

    it("needs the game system and credits it, saying the material is changed, with layers alone and no page that uses it", async () => {
        await rpg("write", "Borgo", "--type", "place");
        await rpg("write", "Bog Hound", "--layer", "--set", "grit=12/12");
        makeSave(folder, context, undefined, "session zero");
        await rpg("package", "export");
        expect(exported().manifest.needs.system).toBe("fake");
        expect(exported().manifest.attribution).toBe(
            "The fake system of rpg-engine's tests, made for them; no game's text. Changes were made: the files under layers/ modify pages the game system adapted from that material.",
        );
    });

    it("takes the layers as they are now: one written after the save of session zero, and those of a campaign never played", async () => {
        makeSave(folder, context, undefined, "session zero");
        await rpg("write", "Bog Hound", "--layer", "--set", "grit=12/12");
        expect((await rpg("package", "export")).exitCode).toBe(0);
        expect(new TextDecoder().decode(exported().layers["world/creatures/Bog Hound.md"])).toBe(bigHound);

        const setup = await otherCampaign(false);
        mkdirSync(join(setup.root, layersFolder), { recursive: true });
        writeFileSync(join(setup.root, houndLayer), bigHound);
        const result = await setup.run("package", "export");
        expect(result.output).toContain("from the world as it is, before play. It carries the campaign's layers over pages of the game system, as they are now: Bog Hound (creature).");
        expect(Object.keys(readAdventureZip(readFileSync(join(setup.root, "exports", "Altrove.adventure.zip")), "a.zip").layers)).toEqual(["world/creatures/Bog Hound.md"]);
    });

    it("leaves out by name a layer over no page, one that writes what no layer changes, and one an installed adventure brought; that one goes once it is changed", async () => {
        makeSave(folder, context, undefined, "session zero");
        handWrite(`${layersFolder}/Nessuno.md`, "---\ngrit: 1/1\n---\n");
        handWrite("layers/fake/world/items/Hardtack.md", "---\ntags: [cibo]\n---\n");
        await rpg("write", "Bog Hound", "--layer", "--set", "grit=12/12");
        expect((await rpg("package", "install", adventureFolder(withLayers({ [witchLayer]: oldWitch })))).exitCode).toBe(0);
        const result = await rpg("package", "export");
        expect(result.output).toContain(", without the layers an installed adventure brought, not changed since (Fen Witch)");
        expect(result.output).toContain("It carries the campaign's layers over pages of the game system, as they are now: Bog Hound (creature).");
        expect(result.output).toContain("the layers over no page of the game system, which validate names (Nessuno)");
        expect(result.output).toContain("the layers that write what a layer cannot change, which validate names with the fields to take out (Hardtack)");
        expect(Object.keys(exported().layers)).toEqual(["world/creatures/Bog Hound.md"]);

        await rpg("write", "Fen Witch", "--layer", "--set", "guard=8");
        await rpg("write", "Rushlight", "--layer", "--set", "heft=0.2 kg");
        expect((await rpg("package", "export")).output).toContain("It carries the campaign's layers over pages of the game system, as they are now: Bog Hound (creature), Fen Witch (creature), Rushlight (item).");
        expect(Object.keys(exported().layers)).toEqual(["world/creatures/Bog Hound.md", "world/creatures/Fen Witch.md", "world/items/Rushlight.md"]);
    });

    it("counts a layer with a source among what comes from the player's documents", async () => {
        makeSave(folder, context, undefined, "session zero");
        await rpg("write", "Bog Hound", "--layer", "--set", "grit=12/12", "--set", "source=The King, p. 3");
        expect((await rpg("package", "export")).output).toContain("1 of its pages or layers come from the player's own documents (source:): Bog Hound. So it says personal use only.");
        expect(exported().manifest.license).toBe("personal use only");
    });

    it("keeps the campaign's own layer over a page byte for byte, says what the adventure's gave with its values, names the page a layer has none under, and installs the rest; goblin.md is Goblin.md", async () => {
        handWrite(witchLayer, "---\ngrit: 10/10\n---\n");
        const result = await rpg("package", "install", adventureFolder(withLayers({ [`${layersFolder}/fen witch.md`]: oldWitch, [houndLayer]: bigHound, [`${layersFolder}/Nessuno.md`]: bigHound })));
        expect(result.exitCode, result.output).toBe(0);
        expect(layerNow(witchLayer)).toBe("---\ngrit: 10/10\n---\n");
        expect(readdirSync(join(folder, layersFolder)).sort()).toEqual(["Bog Hound.md", "Fen Witch.md"]);
        expect(result.output).toContain("Its layers change pages of the game system for the whole campaign: Bog Hound (creature); show says what each changes.");
        expect(result.output).toContain(
            "The campaign's own layer over Fen Witch stays: the adventure's is left out (it gave grit 12/12, guard 9, the section Curse, the introduction).",
        );
        expect(result.output).toContain("Left out, as the rules the campaign plays have no such page: Nessuno.");
        expect(Object.keys((readLogFile(folder).at(-1)?.data as { layers: Record<string, string>; }).layers)).toEqual([houndLayer]);
        // Taken out, it leaves the campaign's own where it is.
        expect((await rpg("package", "remove", "Il pozzo")).output).toBe("Il pozzo is out of the campaign, with the files it wrote. Its layers are off Bog Hound (creature): each reads as the game system writes it again.");
        expect(layerNow(witchLayer)).toBe("---\ngrit: 10/10\n---\n");
        expect(layerNow(houndLayer)).toBeUndefined();
    });

    it("leaves a layer two adventures brought the same with the one that stays", async () => {
        await rpg("package", "install", adventureFolder(withLayers({ [witchLayer]: oldWitch })));
        const second = await rpg("package", "install", towerFolder({ [witchLayer]: oldWitch }));
        expect(second.exitCode, second.output).toBe(0);
        expect(second.output).not.toContain("has its own layer");
        expect((await rpg("package", "remove", "Il pozzo")).output).toBe("Il pozzo is out of the campaign, with the files it wrote.");
        expect(layerNow(witchLayer)).toBe(oldWitch);
        expect((await rpg("package", "remove", "La torre")).output).toContain("Its layers are off Fen Witch (creature)");
        expect(layerNow(witchLayer)).toBeUndefined();
    });

    it("finishes an install that stopped halfway with its layers its own, which go when it is taken out (ADV-5)", async () => {
        const adventure = adventureFolder(withLayers({ [houndLayer]: bigHound }));
        await rpg("package", "install", adventure);
        // As if it stopped before its line: the line goes, the mark stays.
        writeFileSync(join(folder, "log.jsonl"), readFileSync(join(folder, "log.jsonl"), "utf8").trim().split("\n").slice(0, -1).join("\n") + "\n");
        writeFileSync(join(folder, ".adventure-install.yaml"), 'title: "Il pozzo"\nshift: 0\n');
        expect((await rpg("package", "install", adventure)).exitCode).toBe(0);
        expect(readLogFile(folder).at(-1)).toMatchObject({ type: "adventure-installed", data: { layers: { [houndLayer]: expect.any(String) } } });
        expect(layerNow(houndLayer)).toBe(bigHound);
        expect((await rpg("package", "remove", "Il pozzo")).exitCode).toBe(0);
        expect(layerNow(houndLayer)).toBeUndefined();
    });

    it("takes the mark away when the install stopped after its line, so that another adventure comes in (ADV-5)", async () => {
        const adventure = adventureFolder();
        await rpg("package", "install", adventure);
        writeFileSync(join(folder, ".adventure-install.yaml"), 'title: "Il pozzo"\nshift: 0\n');
        expect((await rpg("package", "install", adventure)).output).toContain("The campaign already has the adventure Il pozzo");
        expect(existsSync(join(folder, ".adventure-install.yaml"))).toBe(false);
        expect((await rpg("package", "install", towerFolder({}))).exitCode).toBe(0);
    });

    it("takes out the layers still as it wrote them, keeps by name one changed since with write or by hand, and skips one already gone (ADV-6)", async () => {
        const oxLayer = `${layersFolder}/Mire Ox.md`;
        const cutterLayer = `${layersFolder}/Reed Cutter.md`;
        await rpg("package", "install", adventureFolder(withLayers({ [houndLayer]: bigHound, [witchLayer]: oldWitch, [oxLayer]: "---\ngrit: 30/30\n---\n", [cutterLayer]: "---\ngrit: 5/5\n---\n" })));
        await rpg("write", "Fen Witch", "--layer", "--set", "guard=8");
        handWrite(oxLayer, "---\ngrit: 31/31\n---\n");
        rmSync(join(folder, cutterLayer));
        const result = await rpg("package", "remove", "Il pozzo");
        expect(result.output).toBe(
            "Il pozzo is out of the campaign, with the files it wrote. Its layers are off Bog Hound (creature): each reads as the game system writes it again. "
                + "What it layered over Fen Witch, Mire Ox was changed since it came, and stays the campaign's: write the page with layer and reset takes it off.",
        );
        expect(layerNow(houndLayer)).toBeUndefined();
        expect(layerNow(witchLayer)).toContain("guard: 8");
        expect(layerNow(oxLayer)).toBe("---\ngrit: 31/31\n---\n");
        expect((await rpg("show", "Bog Hound")).output).toContain("grit: 9/9");
    });

    it("is taken out after a fight with the creature its layer changes: a layer is no page of the adventure's the story touched (ADV-6)", async () => {
        await rpg("package", "install", adventureFolder(withLayers({ [houndLayer]: bigHound })));
        expect((await rpg("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Bog Hound=1")).exitCode).toBe(0);
        expect((await rpg("change", "Bog Hound 1", "grit", "--by=-3")).output).toContain("9/12");
        expect((await rpg("scene", "close", "--summary", "The hound is driven off.")).exitCode).toBe(0);
        expect((await rpg("package", "remove", "Il pozzo")).exitCode).toBe(0);
        expect(layerNow(houndLayer)).toBeUndefined();
    });

    it("refuses whole a .zip with layers for another system, without the system it needs, of another kind, or writing what no layer changes", async () => {
        const refused = async (changes: Record<string, string>, said: string) => {
            const result = await rpg("package", "install", adventureZip(changes));
            expect(result.exitCode, result.output).toBe(1);
            expect(result.output).toContain(said);
            expect(existsSync(join(folder, "world", "characters", "Il pozzo"))).toBe(false);
            expect(existsSync(join(folder, "layers"))).toBe(false);
        };

        await refused({ "layers/free/world/creatures/Bog Hound.md": bigHound }, "holds layers/free/world/creatures/Bog Hound.md, and layers/ holds only fake/world/ with markdown files");
        await refused({ "layers/fake/world/creatures/notes.txt": "Mine." }, "holds layers/fake/world/creatures/notes.txt, and layers/ holds only fake/world/ with markdown files");
        await refused({ "layers/fake/rules/Acqua.md": "# Acqua\n" }, "layers/ holds only fake/world/ with markdown files");
        await refused(
            { "adventure.yaml": manifest.replace("needs: {system: fake}\n", "").replace("levels: 1-3\n", ""), [houndLayer]: bigHound },
            "a layer over a page of a game system, and its adventure.yaml names none: write there the system its layers are for, as needs: {system: its name}",
        );
        await refused(
            { [houndLayer]: "---\ngrit: 12/12\ntags: [fens]\nname: Cane\n---\n", "layers/fake/world/items/Hardtack.md": "---\nuses: 3/3\n---\n" },
            "Il pozzo cannot be installed: its layer over Bog Hound writes tags, name; its layer over Hardtack writes uses. A layer changes neither the name nor the type of a page of the game system",
        );
        await refused({ [houndLayer]: "---\ngrit: [1\n---\n" }, "Il pozzo cannot be installed: its layer over Bog Hound does not read: The frontmatter of layers/fake/world/creatures/Bog Hound.md is not valid YAML");
        // The same page twice: by the system's folder in another case, or by a name written another way.
        await refused({ [houndLayer]: bigHound, "layers/FAKE/world/creatures/Bog Hound.md": bigHound }, "holds layers/fake/world/creatures/Bog Hound.md twice");
        await refused({ [`${layersFolder}/Will-o'-the-Fen.md`]: bigHound, [`${layersFolder}/Will-o’-the-Fen.md`]: bigHound }, "two of its layers lie over Will-o'-the-Fen");
    });

    it("writes no layer for a file that gives nothing, as write leaves none, and exports none", async () => {
        const result = await rpg("package", "install", adventureFolder(withLayers({ [houndLayer]: "---\n---\n", [witchLayer]: "\n" })));
        expect(result.exitCode, result.output).toBe(0);
        expect(result.output).not.toContain("Its layers change");
        expect(existsSync(join(folder, "layers"))).toBe(false);
        expect(readLogFile(folder).at(-1)?.data).not.toHaveProperty("layers");
        handWrite(houndLayer, "---\n---\n");
        makeSave(folder, context, undefined, "session zero");
        expect((await rpg("package", "export")).output).not.toContain("layers");
        expect(exported().layers).toEqual({});
    });

    it("INH-10: refuses to come in, and to go, while copies of a page whose fields its layer changes are in the open scene; nothing is written", async () => {
        const adventure = adventureFolder(withLayers({ [houndLayer]: bigHound, [witchLayer]: "A woman of the reeds, older than the fens.\n" }));
        await rpg("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Bog Hound=1", "--creatures", "Fen Witch=1");
        const lines = readLogFile(folder).length;
        const refused = await rpg("package", "install", adventure);
        expect(refused.exitCode).toBe(1);
        expect(refused.output).toBe(
            "Il pozzo cannot be installed now: its layers change a page of the game system that has copies in the open scene, which read from it what they do not change. "
                + "Close the scene first, then give the same command again. Nothing changed.",
        );
        expect(existsSync(join(folder, "world", "characters", "Il pozzo"))).toBe(false);
        expect(existsSync(join(folder, "layers"))).toBe(false);
        expect(existsSync(join(folder, ".adventure-install.yaml"))).toBe(false);
        expect(readLogFile(folder).length).toBe(lines);

        expect((await rpg("scene", "close", "--summary", "They part.")).exitCode).toBe(0);
        expect((await rpg("package", "install", adventure)).exitCode).toBe(0);
        await rpg("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Bog Hound=1");
        const kept = await rpg("package", "remove", "Il pozzo");
        expect(kept.exitCode).toBe(1);
        expect(kept.output).toContain("Il pozzo cannot be taken out now: its layers change a page of the game system that has copies in the open scene");
        expect(layerNow(houndLayer)).toBe(bigHound);
        expect(existsSync(join(folder, "world", "characters", "Il pozzo", "Oste.md"))).toBe(true);
        expect(readLogFile(folder).at(-1)?.type).not.toBe("adventure-removed");
    });

    it("INH-10: a layer that changes only a page's text comes in while its copies are in the open scene", async () => {
        await rpg("scene", "open", "--title", "Bosco", "--type", "combat", "--creatures", "Fen Witch=1");
        expect((await rpg("package", "install", adventureFolder(withLayers({ [witchLayer]: "A woman of the reeds, older than the fens.\n" })))).exitCode).toBe(0);
        expect(layerNow(witchLayer)).toBe("A woman of the reeds, older than the fens.\n");
    });

    it("INH-11: a companion that derives from a page it layers has the public line of its counter, coming in and going", async () => {
        await rpg("write", "Lupa", "--type", "character", "--set", "role=companion", "--set", "creature=[[Bog Hound]]");
        await rpg("package", "install", adventureFolder(withLayers({ [houndLayer]: bigHound })));
        const came = readLogFile(folder).slice(-2);
        expect(came[0]).toMatchObject({ type: "counter-changed", visibility: "public", data: { page: "Lupa", field: "grit", before: "9/9", after: "12/12" } });
        expect(came[1]).toMatchObject({ type: "adventure-installed" });
        // The line names Lupa, a page of the campaign: the adventure still goes.
        expect((await rpg("package", "remove", "Il pozzo")).exitCode).toBe(0);
        const went = readLogFile(folder).slice(-2);
        expect(went[0]).toMatchObject({ type: "counter-changed", visibility: "public", data: { page: "Lupa", field: "grit", before: "12/12", after: "9/9" } });
        expect(went[1]).toMatchObject({ type: "adventure-removed" });
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

    it("ADV-8: a .zip with a layer changes the system's page for the session at once, and gives it back when it is taken out", async () => {
        const inSession = (...args: string[]) => runCommandLine(args, { ...context, files: session });
        expect((await inSession("show", "Fen Witch")).output).toContain("grit: 8/8");
        const zip = readFileSync(adventureZip({ "layers/fake/world/creatures/Fen Witch.md": "---\ngrit: 12/12\n---\n" }));
        expect((await send("POST", "/api/add", zip, { "content-type": "application/zip", "x-file-name": encodeURIComponent("Il pozzo.adventure.zip") })).status).toBe(202);
        expect(dashboard.news().lines.join(" ")).toContain("Its layers change pages of the game system for the whole campaign: Fen Witch (creature); show says what each changes.");
        expect((await inSession("show", "Fen Witch")).output).toContain("grit: 12/12");
        expect((await inSession("package", "remove", "Il pozzo")).exitCode).toBe(0);
        expect((await inSession("show", "Fen Witch")).output).toContain("grit: 8/8");
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
