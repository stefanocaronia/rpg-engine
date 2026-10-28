// The player's library (D-491, LIB-1–LIB-8): the list a campaign keeps, its books indexed once in the player's data folder, the pages without readable text,
// the locked files, the search of rules after the system and what it shows. The books here are written for the tests, never a manual's text.
import { zipSync } from "fflate";
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { basename, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { libraryContents, libraryEntries, libraryScope, skippedKind } from "../src/commands/game/library.ts";
import type { Confirmed, Context } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { isReadable, pagesWritten, readDocument } from "../src/documents/index.ts";
import { bookLanguage, type BookResume, claimLibrary, dropUnlisted, libraryFolders, libraryReader, libraryState, readLibrary, releaseLibrary, saveLibraryFolders } from "../src/library/index.ts";
import { findPages, pageExcerpt } from "../src/rules/index.ts";
import { type Dashboard, startDashboard } from "../src/server/dashboard/index.ts";
import { tinyPdf } from "./pdf-fixture.ts";
import { makeTempFolder, testContext } from "./support.ts";

const falling = "FALLING\nA creature that drops from a height lands hard: it takes one die of damage for each ten feet it falls, and ends prone unless it avoids the damage. "
    + "A fall into deep water hurts less, and a creature that can fly falls only when it cannot use its wings. A slope breaks a fall too, if it is steep enough to slide on.";
const climbing = "CLIMBING\nA climber moves at half speed on a rough wall, and a smooth one needs a check.";
const englishBook = [
    "CHAPTER ONE\nThe road north is long and the inns are few. Travellers keep to the river, where the ferries run until the first frost.",
    `${falling}\nCLIMBING\nA climber moves at half speed on a rough wall, and a smooth one needs a check.`,
    "THE MOUNTAIN PASS\nSnow covers the pass in winter. A traveller who slips may fall, but the guides know the safe paths and rope the party together.",
    "FEATHER STEP\nA spell of the wind: the caster drifts down like a leaf and lands on their feet.",
    "SHORT REST\nA short rest is an hour of quiet: eating, drinking, tending wounds. During a short rest a creature may spend its healing dice.",
    "RESTING IN THE WILD\nThe wild is never quiet. A party that rests outside keeps watches, and every short watch is a rest broken by noises in the dark.",
].join("\n\n");

function book(name: string, parts: string[]): { name: string; parts: { label: string; text: string; }[]; }
{
    return { name, parts: parts.map((text, index) => ({ label: `p. ${index + 1}`, text })) };
}

function ascii(text: string): Uint8Array
{
    return new TextEncoder().encode(text);
}

function fileIn(folder: string, name: string, body: string | Uint8Array): string
{
    const file = join(folder, name);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, body);
    return file;
}

/** An EPUB of one chapter, with what META-INF holds besides. */
function epub(meta: Record<string, string>): Uint8Array
{
    const opf = '<package><manifest><item id="c1" href="ch1.xhtml"/></manifest><spine><itemref idref="c1"/></spine></package>';
    return zipSync({
        "META-INF/container.xml": ascii('<container><rootfiles><rootfile full-path="OEBPS/book.opf"/></rootfiles></container>'),
        "OEBPS/book.opf": ascii(opf),
        "OEBPS/ch1.xhtml": ascii("<html><body><p>The ferryman waits by the river.</p></body></html>"),
        ...Object.fromEntries(Object.entries(meta).map(([path, text]) => [path, ascii(text)])),
    });
}

/** A PDF that asks for a password: its trailer says it is encrypted, with keys no empty password opens. */
function lockedPdf(): Uint8Array
{
    const pdf = new TextDecoder("latin1").decode(tinyPdf([{ text: "Secret page." }]));
    const key = "0123456789ABCDEF".repeat(4);
    const locked = pdf.replace(/(\/Root \d+ 0 R) >>/, `$1 /Encrypt << /Filter /Standard /V 1 /R 2 /O <${key}> /U <${key}> /P -4 >> /ID [<${key.slice(0, 32)}> <${key.slice(0, 32)}>] >>`);
    return Uint8Array.from(locked, (letter) => letter.charCodeAt(0));
}

describe("pages without readable text (LIB-4)", () => {
    it("reads a page as text when half of its words with letters are true words; numbers, dice and marks count neither way", () => {
        expect(isReadable("A creature that falls takes damage.")).toBe(true);
        expect(isReadable("Longsword 15 gp 1d8 slashing 3 lb. —")).toBe(true);
        expect(isReadable("12 15 1d6 +2 (3) 50%")).toBe(true);
        expect(isReadable("<0=?\"=0H <?2H%:6 &0H?5H%6 :0<865&'5='H8: one")).toBe(false);
        expect(isReadable("")).toBe(false);
        expect(isReadable("Lancia d'arme, semi-elfo, «Lotta»: niente.")).toBe(true);
        expect(isReadable("我们走了。他来了，很好。渡し守は川のほとりで待っている。")).toBe(true);
        expect(isReadable("z.B. 1d6+2, 3,5 kg; (10).")).toBe(true);
    });

    it("reads a PDF's page without readable text by the OCR given, and leaves it empty, and says so, without one", async () => {
        const file = fileIn(makeTempFolder(), "scan.pdf", tinyPdf([{ text: "A page of words, as a book writes them." }, { text: "<0=?\"=0H <?2H%:6 &0H?5H%6 :0<865&'5='H8:" }]));
        const asked: number[][] = [];

        const ocr = (_pdf: string, pages: number[]) => {
            asked.push(pages);
            return Promise.resolve(new Map([[2, "The ferryman waits by the river."]]));
        };

        const read = await readDocument(file, { ocr });
        expect(asked).toEqual([[2]]);
        expect(read.parts[1].text).toBe("The ferryman waits by the river.");
        expect(read.unreadable).toEqual([]);
        const without = await readDocument(file);
        expect(without.parts[1].text).toBe("");
        expect(without.unreadable).toEqual(["p. 2"]);
    });

    it("takes the pages Windows' OCR wrote, each by its number and its text in base64", () => {
        const line = (page: number, text: string): string => `${page} ${Buffer.from(text, "utf8").toString("base64")}`;
        expect([...pagesWritten(`${line(3, "Città\nAFFERRATO")}\r\n${line(4, "")}\nnoise\n`)]).toEqual([[3, "Città\nAFFERRATO"], [4, ""]]);
    });
});

describe("locked files (LIB-5)", () => {
    it("refuses a PDF that asks for a password, a Word document with one, an OpenDocument encrypted and an EPUB with DRM, saying why", async () => {
        const folder = makeTempFolder();
        await expect(readDocument(fileIn(folder, "locked.pdf", lockedPdf()))).rejects.toThrow("locked.pdf asks for a password to open: the engine never opens a locked document.");
        await expect(readDocument(fileIn(folder, "locked.docx", Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])))).rejects.toThrow("locked.docx asks for a password");
        const odt = zipSync({ "META-INF/manifest.xml": ascii("<manifest><file-entry><encryption-data/></file-entry></manifest>"), "content.xml": ascii("<x/>") });
        await expect(readDocument(fileIn(folder, "locked.odt", odt))).rejects.toThrow("locked.odt asks for a password to open");
        const drm = epub({ "META-INF/encryption.xml": '<encryption><EncryptedData><CipherData><CipherReference URI="OEBPS/ch1.xhtml"/></CipherData></EncryptedData></encryption>' });
        await expect(readDocument(fileIn(folder, "locked.epub", drm))).rejects.toThrow("locked.epub is locked by DRM");
    });

    it("reads an EPUB whose fonts alone are obfuscated, as its maker may do", async () => {
        const fonts = epub({ "META-INF/encryption.xml": '<encryption><EncryptedData><CipherData><CipherReference URI="OEBPS/font.otf"/></CipherData></EncryptedData></encryption>' });
        const read = await readDocument(fileIn(makeTempFolder(), "fonts.epub", fonts));
        expect(read.parts[0].text).toContain("The ferryman waits by the river.");
    });
});

describe("the books and their index (LIB-2, LIB-3)", () => {
    let home: string;
    let shelf: string;
    let reads: string[];

    const reader = async (path: string) => {
        reads.push(path);
        const read = await readDocument(path, { pictures: false });
        return { parts: read.parts, unreadable: read.unreadable, recognized: read.recognized };
    };

    beforeEach(() => {
        home = makeTempFolder();
        shelf = makeTempFolder();
        reads = [];
        fileIn(shelf, "Rules of the Road.md", englishBook);
        fileIn(shelf, "old/Rules of the Road.txt", "An older edition of the road's rules, kept for its maps.");
        fileIn(shelf, ".hidden/secret.md", "Never read.");
        fileIn(shelf, "campaign/campaign.yaml", "name: Inside\n");
        fileIn(shelf, "campaign/world/notes.md", "A campaign's own page.");
        fileIn(shelf, "cover.png", "not a book");
    });

    it("takes the documents of the folders, not those whose name starts with a dot nor a campaign's, and names books alike by their kind, then their folder", async () => {
        const waiting = libraryState(home, [shelf], libraryScope);
        expect(waiting.books).toEqual([]);
        expect(waiting.waiting.map((path) => path.slice(shelf.length + 1).replaceAll("\\", "/"))).toEqual(["Rules of the Road.md", "old/Rules of the Road.txt"]);
        await readLibrary(home, () => [shelf], libraryScope, reader);
        const state = libraryState(home, [shelf], libraryScope);
        expect(state.waiting).toEqual([]);
        expect(state.books.map((one) => [one.name, one.language])).toEqual([["Rules of the Road.md", "en"], ["Rules of the Road.txt", undefined]]);
        fileIn(shelf, "old/Rules of the Road.md", "The old rules.");
        await readLibrary(home, () => [shelf], libraryScope, reader);
        expect(libraryState(home, [shelf], libraryScope).books.map((one) => one.name)).toEqual([
            `Rules of the Road.md (${shelf.split(/[\\/]/).at(-1)})`,
            "Rules of the Road.md (old)",
            "Rules of the Road.txt",
        ]);
    });

    it("reads a book once, again only when its size or date changes, and drops the index of a book that is gone", async () => {
        await readLibrary(home, () => [shelf], libraryScope, reader);
        expect(reads).toHaveLength(2);
        await readLibrary(home, () => [shelf], libraryScope, reader);
        expect(reads).toHaveLength(2);
        const changed = join(shelf, "old", "Rules of the Road.txt");
        writeFileSync(changed, "An older edition of the road's rules, now with its maps and its inns.");
        utimesSync(changed, new Date(), new Date(Date.now() + 5000));
        expect(libraryState(home, [shelf], libraryScope).waiting).toEqual([changed]);
        await readLibrary(home, () => [shelf], libraryScope, reader);
        expect(reads).toHaveLength(3);
        expect(readdirSync(home).filter((name) => name.endsWith(".json"))).toHaveLength(2);
        rmSync(changed);
        await readLibrary(home, () => [shelf], libraryScope, reader);
        expect(readdirSync(home).filter((name) => name.endsWith(".json"))).toHaveLength(1);
        // Nothing is ever written in the books' folders.
        expect(readdirSync(shelf).sort()).toEqual([".hidden", "Rules of the Road.md", "campaign", "cover.png", "old"]);
    });

    it("keeps a book it cannot read as skipped, with why, and reads it again once it changes", async () => {
        fileIn(shelf, "locked.pdf", lockedPdf());
        await readLibrary(home, () => [shelf], libraryScope, reader);
        const state = libraryState(home, [shelf], libraryScope);
        expect(state.skipped).toEqual([{ path: join(shelf, "locked.pdf"), why: "locked.pdf asks for a password to open: the engine never opens a locked document." }]);
        expect(state.waiting).toEqual([]);
        expect(state.books.map((one) => one.name)).not.toContain("locked");
    });

    it("tells an entry that is not there, and reads a document given alone", async () => {
        const alone = fileIn(makeTempFolder(), "Ferries.md", "The ferries run until the first frost.");
        const state = libraryState(home, [join(shelf, "gone"), alone], libraryScope);
        expect(state.missing).toEqual([join(shelf, "gone")]);
        expect(state.waiting).toEqual([alone]);
    });

    it("lets one process at a time read the library, and takes the mark of one that is gone", () => {
        // Another live process holds it: the one that started these tests.
        writeFileSync(join(home, ".reading"), String(process.ppid));
        expect(claimLibrary(home)).toBe(false);
        writeFileSync(join(home, ".reading"), "999999999");
        expect(claimLibrary(home)).toBe(true);
        expect(libraryReader(home)).toBe(process.pid);
        expect(claimLibrary(home)).toBe(true);
        releaseLibrary(home);
        expect(libraryReader(home)).toBeUndefined();
        expect(readdirSync(home)).toEqual([]);
    });

    it("stops reading when another reader took the library meanwhile", async () => {
        writeFileSync(join(home, ".reading"), String(process.ppid));
        await readLibrary(home, () => [shelf], libraryScope, reader);
        expect(reads).toEqual([]);
    });

    it("keeps the books of a folder that is not there now, as a disk taken out, and drops those gone from a folder still there", async () => {
        await readLibrary(home, () => [shelf], libraryScope, reader);
        const disk = join(makeTempFolder(), "disk");
        fileIn(disk, "Ferries.md", "The ferries run until the first frost.");
        await readLibrary(home, () => [disk], libraryScope, reader);
        renameSync(disk, `${disk}-out`);
        await readLibrary(home, () => [shelf], libraryScope, reader);
        renameSync(`${disk}-out`, disk);
        expect(libraryState(home, [disk], libraryScope).waiting).toEqual([]);
        expect(reads).toHaveLength(3);
    });

    it("reads no further a folder taken off the computer meanwhile, and drops the text of the books in no entry, never of one still in an entry", async () => {
        let listed = [shelf];
        await readLibrary(home, () => listed, libraryScope, async (path) => {
            listed = [];
            return await reader(path);
        });
        expect(reads).toHaveLength(1);
        const book = join(shelf, "Rules of the Road.md");
        dropUnlisted(home, [book.toUpperCase()]);
        expect(libraryState(home, [book], libraryScope).books).toHaveLength(process.platform === "win32" ? 1 : 0);
        dropUnlisted(home, [`${shelf}x`]);
        expect(libraryState(home, [book], libraryScope).books).toEqual([]);
    });

    it("refuses a list of the computer's folders that does not read, never taking it for an empty one", () => {
        expect(libraryFolders(home)).toEqual([]);
        saveLibraryFolders(home, [shelf]);
        expect(libraryFolders(home)).toEqual([shelf]);
        writeFileSync(join(home, "folders.json"), `{ "folders": ["${shelf.replaceAll("\\", "\\\\")}",] }`);
        expect(() => libraryFolders(home)).toThrow("does not read: fix it, or delete it and add the folders again");
    });

    it("skips a book that stopped two readers, or that another program kept busy twice, saying how to have it read again", async () => {
        const hanging = () => new Promise<never>(() => undefined);
        void readLibrary(home, () => [shelf], libraryScope, hanging);
        expect(libraryState(home, [shelf], libraryScope).waiting).toHaveLength(2);
        void readLibrary(home, () => [shelf], libraryScope, hanging);
        const state = libraryState(home, [shelf], libraryScope);
        expect(state.skipped.map((one) => one.why)).toEqual([
            "Rules of the Road.md could not be read 2 times, too big or broken for the reader, or kept busy by another program: close that program, or save the file again, which has it read again",
        ]);
        const busy = makeTempFolder();
        fileIn(busy, "Busy.md", "Open elsewhere.");
        const kept = () => Promise.reject(Object.assign(new Error("resource busy"), { code: "EBUSY" }));
        await readLibrary(home, () => [busy], libraryScope, kept);
        expect(libraryState(home, [busy], libraryScope)).toMatchObject({ waiting: [join(busy, "Busy.md")], skipped: [] });
        await readLibrary(home, () => [busy], libraryScope, kept);
        expect(libraryState(home, [busy], libraryScope).skipped).toHaveLength(1);
        // A file it may not open is no passing trouble: skipped at once, with why.
        const denied = makeTempFolder();
        fileIn(denied, "Denied.md", "Not for you.");
        await readLibrary(home, () => [denied], libraryScope, () => Promise.reject(Object.assign(new Error("EACCES: permission denied, open Denied.md"), { code: "EACCES" })));
        expect(libraryState(home, [denied], libraryScope).skipped.map((one) => one.why)).toEqual(["EACCES: permission denied, open Denied.md"]);
    });

    it("goes on from the pages the OCR read before a reader stopped, which counts as a reader the book stopped only when it read none (LIB-3)", () => {
        const pages = (from: number, to: number) => new Map(Array.from({ length: to - from + 1 }, (_, at) => [from + at, `Page ${from + at}`]));
        const known: number[] = [];

        // Each reader stops on the first book, as when the app is closed: after the pages it reads, if any.
        const stopping = (read?: Map<number, string>) => (_path: string, resume: BookResume) => {
            known.push(resume.known.size);

            if (read !== undefined) {
                resume.keep(read);
            }

            return new Promise<never>(() => undefined);
        };

        const skipped = () => libraryState(home, [shelf], libraryScope).skipped.length;
        void readLibrary(home, () => [shelf], libraryScope, stopping(pages(1, 12)));
        void readLibrary(home, () => [shelf], libraryScope, stopping(pages(13, 24)));
        expect(skipped()).toBe(0);
        void readLibrary(home, () => [shelf], libraryScope, stopping());
        expect(skipped()).toBe(0);
        void readLibrary(home, () => [shelf], libraryScope, stopping());
        expect(known).toEqual([0, 12, 24, 24]);
        expect(skipped()).toBe(1);
    });

    it("leaves a book whose OCR stopped half way to be read again from its pages, never closed with holes; the importer keeps what it read", async () => {
        const pages = new Map(Array.from({ length: 10 }, (_, at) => [at + 1, `Page ${at + 1}`]));
        const stoppedOcr = Object.assign(new Error("The OCR stopped before its last page."), { code: "EINTR", read: pages });
        const known: string[] = [];

        await readLibrary(home, () => [shelf], libraryScope, (path, resume) => {
            known.push(`${basename(path)} ${resume.known.size}`);
            resume.keep(pages);
            return Promise.reject(stoppedOcr);
        });

        expect(libraryState(home, [shelf], libraryScope)).toMatchObject({ skipped: [] });
        expect(libraryState(home, [shelf], libraryScope).waiting).toContain(join(shelf, "Rules of the Road.md"));
        await readLibrary(home, () => [shelf], libraryScope, (path, resume) => (known.push(`${basename(path)} ${resume.known.size}`), reader(path)));
        expect(known).toEqual(["Rules of the Road.md 0", "Rules of the Road.txt 0", "Rules of the Road.md 10", "Rules of the Road.txt 10"]);
        // A document's reading: stopped for a library, which goes on from it; whole with the pages read, for the importer.
        const pdf = fileIn(makeTempFolder(), "Scan.pdf", tinyPdf([{ text: "@<=?%:6 &0H?5H%6" }, { text: ":0<865&=H8: <0=?=0H" }]));
        const stopping = () => Promise.reject(Object.assign(new Error("The OCR stopped before its last page."), { code: "EINTR", read: new Map([[1, "THE FORD\nThe ferryman waits by the river for the travellers."]]) }));
        await expect(readDocument(pdf, { pictures: false, ocr: stopping, resume: { known: new Map(), keep: () => undefined } })).rejects.toMatchObject({ code: "EINTR" });
        expect((await readDocument(pdf, { pictures: false, ocr: stopping })).recognized).toEqual(["p. 1"]);
    });

    it("reads by the OCR only the pages it has not read before, and tells each page it reads", async () => {
        const pdf = fileIn(makeTempFolder(), "Scan.pdf", tinyPdf([{ text: englishBook }, { text: "@<=?%:6 &0H?5H%6" }, { text: ":0<865&=H8: <0=?=0H" }]));
        const asked: number[][] = [];
        const heard: number[][] = [];

        const ocr = (_pdf: string, wanted: number[], _signal?: AbortSignal, onPage?: (read: Map<number, string>) => void) => {
            asked.push(wanted);
            const read = new Map(wanted.map((page) => [page, `THE FORD\nThe ferryman waits by the river for the travellers of page ${page}.`]));
            onPage?.(read);
            return Promise.resolve(read);
        };

        const known = new Map([[2, "THE ROAD\nThe road north is long, and the river is wide where the ferryman waits."]]);
        const read = await readDocument(pdf, { pictures: false, ocr, resume: { known, keep: (fresh) => heard.push([...fresh.keys()]) } });
        expect(asked).toEqual([[3]]);
        expect(heard).toEqual([[3]]);
        expect(read.recognized).toEqual(["p. 2", "p. 3"]);
        expect(read.parts[1].text).toContain("The road north is long");
    });

    it("keeps a book's name while another one is still to read", async () => {
        await readLibrary(home, () => [shelf], libraryScope, reader);
        fileIn(shelf, "old/Rules of the Road.pdf", "not read yet");
        expect(libraryState(home, [shelf], libraryScope).books.map((one) => one.name)).toEqual(["Rules of the Road.md", "Rules of the Road.txt"]);
    });

    it.runIf(process.platform === "win32")("takes a book once however its folder is written, where a path is the same in any case", async () => {
        expect(libraryState(home, [shelf, shelf.toUpperCase()], libraryScope).waiting).toHaveLength(2);
    });

    it("tells a book's language by the little words it repeats, or by its script", () => {
        expect(bookLanguage(englishBook)).toBe("en");
        expect(bookLanguage("La compagnia parte all'alba. Il traghettatore aspetta sulla riva del fiume, e non parla con chi non paga. ".repeat(5))).toBe("it");
        expect(bookLanguage("渡し守は川のほとりで待っている。".repeat(5))).toBe("ja");
        expect(bookLanguage("Ferry.")).toBeUndefined();
    });
});

describe("the search of the books (LIB-6, LIB-7)", () => {
    const road = book("Rules of the Road", englishBook.split("\n\n"));

    it("finds first the page whose title has the word, then those that repeat it, the rarest words weighing most", () => {
        const found = findPages([road], "falling");
        expect(found.map((finding) => finding.part)).toEqual([1, 2]);
        expect(found[0].score).toBeGreaterThan(found[1].score * 2);
    });

    it("counts the words in a row: short rest finds the page that says it before the one that has both words apart", () => {
        expect(findPages([road], "short rest").map((finding) => finding.part).slice(0, 2)).toEqual([4, 5]);
    });

    it("finds by a word's forms (RUL-4), and nothing by a word that more than half of the pages have", () => {
        expect(findPages([road], "climbs").map((finding) => finding.part)).toEqual([1]);
        expect(findPages([road], "the")).toEqual([]);
    });

    it("searches the other searches too, as the system's words in the books' language", () => {
        const italian = book("Regole", ["IL VIAGGIO\nLa compagnia parte all'alba.", "AFFERRATO\nUna creatura afferrata resta dove si trova finché la presa non si scioglie."]);
        expect(findPages([italian], "grappled")).toEqual([]);
        expect(findPages([italian], "grappled", ["Afferrato"]).map((finding) => finding.part)).toEqual([1]);
    });

    it("shows a page's section from the title with the words to the next title once it has sixty words, within the words given, and whether it goes on", () => {
        expect(pageExcerpt(road, 1, "falling", [], 250)).toEqual({ text: falling, goesOn: false, cut: false });
        expect(pageExcerpt(road, 1, "climber", [], 250)).toEqual({ text: climbing, goesOn: true, cut: false });
        expect(pageExcerpt(road, 1, "falling", [], 10)).toEqual({ text: "FALLING\nA creature that drops from a height lands hard: …", goesOn: false, cut: true });
    });

    it("weighs a title by how much of it the search names, and never starts a section at a title found only by a word of two letters", () => {
        const fall = book("Cadute", [
            "CADUTA MORBIDA\nChi lancia questo incantesimo rallenta la caduta di chi cade.",
            "CADUTE\nUna caduta da tre metri fa un dado di danni.",
            "IL VIAGGIO\nLa compagnia parte con il sole.",
            "IL FIUME\nIl traghettatore aspetta sulla riva.",
        ]);
        expect(findPages([fall], "caduta")[0].part).toBe(1);
        const rules = book("Lotta", ["ATTACCHI DI OPPORTUNITÀ\nUna creatura che esce dalla portata subisce un attacco.\nPROVE DI LOTTA\nChi lotta fa una prova di Forza."]);
        expect(pageExcerpt(rules, 0, "prova di lotta", [], 250).text).toBe("PROVE DI LOTTA\nChi lotta fa una prova di Forza.");
    });

    it("never ends a section at a page's running head, a column of short words, or a paragraph that opens in capitals", () => {
        const head = "THE ROAD NORTH | CHAPTER 2";
        const long = "The river runs north past the old mill and the ford, ".repeat(6).trim();
        const section = [
            "RIVER CROSSINGS",
            long,
            "STR DEX CON",
            "10 12 14",
            head,
            "THE FERRYMAN",
            "takes a coin from each traveller, and two from those who look at him.",
            "WOLVES",
            "Wolves hunt in packs along the river.",
        ];
        const roadBook = book("Road", [section.join("\n"), `${head}\nPage two.`, `${head}\nPage three.`]);
        expect(pageExcerpt(roadBook, 0, "crossings", [], 250).text).toBe(section.slice(0, 7).join("\n"));
    });
});

describe("the library in config and rules (LIB-1, LIB-3, LIB-7)", () => {
    let folder: string;
    let home: string;
    let shelf: string;
    let context: Context;
    let started: number;
    let asked: string[];

    const rpg = (...args: string[]) => runCommandLine(args, context);

    async function ok(...args: string[]): Promise<string>
    {
        const result = await rpg(...args);
        expect(result.exitCode, result.output).toBe(0);
        return result.output;
    }

    function allow(answer: Confirmed): void
    {
        context.confirm = { ask: (_title, text) => (asked.push(text), Promise.resolve(answer)) };
    }

    async function readShelf(): Promise<void>
    {
        // The third page of the PDF has no readable text: an OCR reads it.
        const ocr = () => Promise.resolve(new Map([[3, "IL GUADO\nIl traghettatore chiede una moneta per il guado del fiume, e due a chi lo guarda storto."]]));
        await readLibrary(home, () => [shelf], libraryScope, async (path) => {
            const read = await readDocument(path, { pictures: false, ocr });
            return { parts: read.parts, unreadable: read.unreadable, recognized: read.recognized };
        });
    }

    beforeEach(async () => {
        folder = makeTempFolder();
        home = makeTempFolder();
        shelf = makeTempFolder();
        started = 0;
        asked = [];
        context = { ...testContext(folder), bookIndex: home, readLibrary: () => started++ };
        await ok("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
        fileIn(shelf, "Rules of the Road.md", englishBook);
        const regole = [
            "IL VIAGGIO\nLa compagnia parte con il sole e il traghettatore aspetta sulla riva del fiume. Non parla con chi non paga, ma per una moneta di rame porta una persona e il suo bagaglio.",
            "AFFERRATO\nUna creatura afferrata resta dove si trova fino a quando la presa non si scioglie. Il suo movimento scende a zero e non sale con altro. La presa finisce se chi afferra non agisce.",
            "@<=?%:6 &0H?5H%6 :0<865&=H8: <0=?=0H <?2H%:6",
        ];
        fileIn(shelf, "Regole del Guado.pdf", tinyPdf(regole.map((text) => ({ text }))));
    });

    it("adds a folder from the chat only with the player's yes in a window of their computer, as a full path, and starts reading it", async () => {
        allow("yes");
        const output = await ok("config", "library", "--add", shelf);
        expect(asked[0]).toContain(`RPG Engine asks to read the documents in ${shelf}, to search your books for the rules: for the game master of Guadoscuro, `);
        expect(output).toContain(`library: ${shelf} (0 books read, 2 being read)`);
        expect(started).toBe(1);
        expect(libraryFolders(home)).toEqual([shelf]);
        // Already there, it asks nothing again.
        await ok("config", "library", "--add", shelf);
        expect(asked).toHaveLength(1);
    });

    it("takes a path as a full one, without the quotes a copied path has; a relative one only in the player's terminal", async () => {
        allow("yes");
        expect((await rpg("config", "library", "--add", "..")).output).toContain(".. is no full path: give the whole path");
        await ok("config", "library", "--add", `"${shelf}"`);
        expect(libraryFolders(home)).toEqual([shelf]);
    });

    it("turns on in another campaign a folder of this computer without asking again; off in one, it stays in the other; off the computer, its text goes", async () => {
        allow("yes");
        await ok("config", "library", "--add", shelf);
        await readShelf();
        const other = makeTempFolder();
        const first = folder;
        context.folder = other;
        await ok("init", "--name", "Altrove", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
        expect(await ok("config", "library")).toContain(`library: ${shelf} (on this computer, not used here: add turns it on)`);
        expect(await ok("rules", "falling")).not.toContain("From the player's books");
        await ok("config", "library", "--add", shelf);
        expect(asked).toHaveLength(1);
        expect(await ok("rules", "falling")).toContain("From the player's books");
        await ok("config", "library", "--remove", shelf);
        expect(await ok("rules", "falling")).not.toContain("From the player's books");
        context.folder = first;
        expect(await ok("rules", "falling")).toContain("From the player's books");
        // Off the computer: no campaign searches it, and the text read of its books is deleted.
        expect(readdirSync(home).filter((name) => name !== "folders.json" && name.endsWith(".json"))).toHaveLength(2);
        await ok("config", "library", "--remove", shelf, "--computer");
        expect(libraryFolders(home)).toEqual([]);
        expect(readdirSync(home).filter((name) => name !== "folders.json" && name.endsWith(".json"))).toEqual([]);
        expect(await ok("config", "library")).toMatch(/^library: \(none\)\n/);
        expect((await rpg("config", "library", "--remove", shelf, "--computer")).output).toContain("is not in this computer's library, so nothing changed");
        expect((await rpg("config", "lines", "--remove", "spiders", "--computer")).output).toContain("computer goes only with setting library and remove");
    });

    it("keeps the books' two excerpts when the system's name was found by one word of a longer search (RUL-8)", async () => {
        context.terminal = true;
        // The fake system's Cadere is its Falling: found by one word of the search.
        fileIn(shelf, "Ponti.md", "CADERE DAL PONTE\nChi cade dal ponte nel fiume perde il fiato e la corrente lo porta a valle, finché non tocca la riva con una prova di Forza.");
        fileIn(shelf, "Fiumi.md", "I FIUMI\nChi vuole cadere dal ponte senza farsi male salta dalla sponda bassa del ponte, dove il fondo del fiume è alto.");
        await ok("config", "library", "--add", shelf);
        await readShelf();
        const output = await ok("rules", "cadere dal ponte");
        expect(output).toContain("searched by its own names too: Falling");
        expect(output.match(/^(Ponti|Fiumi), part \d+:$/gm)).toHaveLength(2);
    });

    it("adds a book inside a folder the player allowed without asking again", async () => {
        allow("yes");
        await ok("config", "library", "--add", shelf);
        await ok("config", "library", "--add", join(shelf, "Rules of the Road.md"));
        expect(asked).toHaveLength(1);
        expect(libraryFolders(home)).toEqual([shelf, join(shelf, "Rules of the Road.md")]);
    });

    it("tells the master what an entry turned on holds: each book read with its titles, and those still being read", async () => {
        expect(libraryContents(context, shelf)).toBe("2 books still being read");
        await readShelf();
        const told = libraryContents(context, shelf);
        expect(told).toContain("«Regole del Guado» (IL VIAGGIO; AFFERRATO; IL GUADO)");
        expect(told).toContain("«Rules of the Road» (CHAPTER ONE; FALLING; CLIMBING; THE MOUNTAIN PASS; FEATHER STEP; SHORT REST; RESTING IN THE WILD)");
        expect(libraryContents(context, makeTempFolder())).toBe("no book the engine reads");
    });

    it("never searches a folder a campaign lists that is not in this computer's library, which the player allowed", async () => {
        writeFileSync(join(folder, "campaign.yaml"), `${readFileSync(join(folder, "campaign.yaml"), "utf8")}library:\n  - ${JSON.stringify(shelf)}\n`);
        await readShelf();
        expect(await ok("rules", "falling")).not.toContain("From the player's books");
        expect(await ok("config", "library")).toContain(`library: ${shelf} (not in this computer's library: add it again, with the player's yes)`);
    });

    it("refuses an addition the player does not allow, or when no window can be shown, saying how to add it in their terminal", async () => {
        allow("no");
        expect((await rpg("config", "library", "--add", shelf)).output).toContain("The player did not allow it. Nothing changed");
        allow("none");
        expect((await rpg("config", "library", "--add", shelf)).output).toContain(`in the campaign's folder, with rpg config library --add "${shelf}". Nothing changed.`);
        expect(await ok("config", "library")).toMatch(/^library: \(none\)\n/);
    });

    it("adds from the player's terminal without a window, and turns an entry off by any spelling of its path", async () => {
        context.terminal = true;
        await ok("config", "library", "--add", shelf);
        expect(asked).toEqual([]);
        await ok("config", "library", "--remove", `${shelf}/`);
        expect(await ok("config", "library")).toMatch(/^library: .* \(on this computer, not used here: add turns it on\)\n/);
    });

    it("refuses what is not there, a file of a kind it does not read, and a folder inside a campaign", async () => {
        context.terminal = true;
        expect((await rpg("config", "library", "--add", join(shelf, "gone"))).output).toContain("There is no");
        expect((await rpg("config", "library", "--add", fileIn(shelf, "map.png", "x"))).output).toContain("map.png is no book the engine reads");
        mkdirSync(join(folder, "books"));
        expect((await rpg("config", "library", "--add", join(folder, "books"))).output).toContain("is inside the campaign in");
    });

    it("searches the books after the system, each excerpt with its book and page, and fewer when the system answered", async () => {
        context.terminal = true;
        fileIn(shelf, "Prese.pdf", tinyPdf([{ text: "BLOCCATO\nUna persona bloccata resta dove si trova finché non si libera: non si muove, e chi la tiene non lascia la presa." }, { text: "LA CORDA\nUna corda regge una persona sola." }]));
        await ok("config", "library", "--add", shelf);
        await readShelf();
        const fall = await ok("rules", "falling");
        expect(fall).toContain(`From the player's books, in Italian and English:\n\nRules of the Road, part 1:\n${falling}\n\nThe system's`);
        expect(fall).toContain("The system's sheet numbers win over the books;");
        expect(fall).toContain('only your own words and the numbers, in m, with source: "<book>, PDF p. N"');
        expect(fall).not.toContain("No rule matches");
        // The system answers Pinned; the Italian book is searched with the system's Italian words, Bloccato, one excerpt beside it.
        const pinned = await ok("rules", "pinned");
        expect(pinned).toContain("Pinned (fake)");
        expect(pinned).toContain("Prese, PDF p. 1:\nBLOCCATO\nUna persona bloccata");
        expect(pinned.match(/PDF p\. \d+:/g)).toHaveLength(1);
    });

    it("reads a page whole, says when a book has no such page, and lists the books when there is no text", async () => {
        context.terminal = true;
        await ok("config", "library", "--add", shelf);
        await readShelf();
        expect(await ok("rules", "Regole del Guado, PDF p. 1")).toBe(await ok("rules", "Regole del Guado › p. 1"));
        expect(await ok("rules", "Regole del Guado › p. 1")).toMatch(/^Regole del Guado, PDF p\. 1:\nIL VIAGGIO\nLa compagnia parte con il sole [^]*bagaglio\.\n\nThe system's sheet numbers/);
        expect((await rpg("rules", "Regole del Guado › p. 9")).output).toContain("Regole del Guado has no PDF p. 9: it has 3, from 1.");
        expect(await ok("rules")).toContain('The player\'s books: Regole del Guado (Italian, 3 pages); Rules of the Road (English, 1 part). Search them with words, as rules does; rules "<book> › p. N" reads a page.');
    });

    it("warns of a page the OCR read, and says when the system, written in another language, found nothing", async () => {
        context.terminal = true;
        await ok("config", "library", "--add", shelf);
        await readShelf();
        const ford = await ok("rules", "guado");
        expect(ford).toContain("Nothing in the rules of fake for these words: it writes its rules in English, so search it with the rule's English name too; the system wins over the books.");
        expect(ford).toContain("Regole del Guado, PDF p. 3:\nIL GUADO\nIl traghettatore chiede una moneta");
        expect(ford).toContain("Pages the OCR read may lose a number or misread one (O for 0, l for 1)");
    });

    it("refuses a folder with more documents than a library takes, as a disk or a folder of everything", async () => {
        context.terminal = true;
        const everything = makeTempFolder();
        Array.from({ length: 301 }, (_, index) => fileIn(everything, `note-${index}.txt`, "A note."));
        expect((await rpg("config", "library", "--add", everything)).output).toContain(
            `${everything} holds more than 300 documents, and a shelf of a game's books has from 5 to 50: give the folder inside it with this game's books. Nothing changed.`,
        );
        // With folders inside, it names some, for the player to choose among.
        Array.from({ length: 8 }, (_, index) => fileIn(everything, `shelf-${index}/book.md`, "A book."));
        const refused = (await rpg("config", "library", "--add", everything)).output;
        expect(refused).toContain(`with this game's books, such as ${join(everything, "shelf-0")}, ${join(everything, "shelf-1")}, `);
        expect(refused).toContain(`${join(everything, "shelf-5")}, or another of its 8. Nothing changed.`);
        // Never to the master, before the player allowed anything there.
        context.terminal = false;
        expect((await rpg("config", "library", "--add", everything)).output).toContain("with this game's books. Nothing changed.");
    });

    it("says how many books are still being read, and starts reading them", async () => {
        context.terminal = true;
        await ok("config", "library", "--add", shelf);
        started = 0;
        expect(await ok("rules", "falling")).toContain("Still being read: 2 of the player's books, which a search finds in a few minutes.");
        expect(started).toBe(1);
        expect(readFileSync(join(folder, "campaign.yaml"), "utf8")).toContain("library:");
    });
});

describe("why a book was skipped, in the player's words (LIB-5)", () => {
    it.each([
        ["password", "locked.pdf asks for a password to open: the engine never opens a locked document."],
        ["drm", "locked.epub is locked by DRM: the engine never opens a locked document."],
        ["stuck", "Big.pdf could not be read 2 times, too big or broken for the reader, or kept busy by another program: close that program, or save the file again"],
        ["denied", "EACCES: permission denied, open Denied.md"],
        ["broken", "Invalid PDF structure."],
    ])("tells a book skipped for %s", (kind, why) => {
        expect(skippedKind(why)).toBe(kind);
    });

    it("gives the dashboard each book skipped with the kind of its why, as the readers said it", async () => {
        const folder = makeTempFolder();
        const home = makeTempFolder();
        const shut = makeTempFolder();
        const context: Context = { ...testContext(folder), bookIndex: home, terminal: true };
        await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake"], context);
        fileIn(shut, "locked.pdf", lockedPdf());
        fileIn(shut, "locked.epub", epub({ "META-INF/rights.xml": "<rights/>" }));
        fileIn(shut, "broken.pdf", "not a PDF at all");
        // A name with the words of another why: Passwords.md is no locked book.
        fileIn(shut, "Passwords.md", "Never read.");
        expect((await runCommandLine(["config", "library", "--add", shut], context)).exitCode).toBe(0);
        await readLibrary(home, () => [shut], libraryScope, async (path) => {
            if (path.endsWith("Passwords.md")) {
                throw Object.assign(new Error(`EACCES: permission denied, open ${path}`), { code: "EACCES" });
            }

            const read = await readDocument(path, { pictures: false });
            return { parts: read.parts, unreadable: read.unreadable, recognized: read.recognized };
        });
        const skipped = libraryEntries(folder, context)[0]?.skipped.map((one) => [one.name, one.kind]);
        expect(skipped).toEqual([["Passwords.md", "denied"], ["broken.pdf", "broken"], ["locked.epub", "drm"], ["locked.pdf", "password"]]);
    });
});

describe("the library on the dashboard's Packages page (D-491 (13))", () => {
    let folder: string;
    let shelf: string;
    let session: SessionStore;
    let dashboard: Dashboard;
    let port: number;
    let answer: Confirmed;
    let asked: string[];

    beforeEach(async () => {
        folder = makeTempFolder();
        shelf = makeTempFolder();
        fileIn(shelf, "Rules of the Road.md", englishBook);
        asked = [];
        answer = "yes";
        const context: Context = {
            ...testContext(folder),
            bookIndex: makeTempFolder(),
            confirm: { ask: (_title, text) => (asked.push(text), Promise.resolve(answer)) },
        };
        await runCommandLine(["init", "--name", "Guadoscuro", "--language", "it", "--system", "fake"], context);
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

    function send(method: string, path: string, body?: unknown): Promise<{ status: number; body: string; }>
    {
        const headers = body === undefined ? {} : { origin: `http://127.0.0.1:${port}`, "content-type": "application/json" };
        return new Promise((done, fail) => {
            const sent = request({ host: "127.0.0.1", port, path, method, headers }, (response) => {
                let text = "";
                response.setEncoding("utf8");
                response.on("data", (chunk: string) => (text += chunk));
                response.on("end", () => done({ status: response.statusCode ?? 0, body: text }));
            });
            sent.on("error", fail);
            sent.end(body === undefined ? undefined : JSON.stringify(body));
        });
    }

    it("lists this computer's library, adds a folder only with the player's yes in a window, never the page's click alone, turns it off and takes it off", async () => {
        expect(JSON.parse((await send("GET", "/api/library")).body)).toEqual({ entries: [] });
        answer = "no";
        const refused = await send("POST", "/api/library", { action: "add", path: shelf });
        expect([refused.status, JSON.parse(refused.body).code]).toEqual([400, "declined"]);
        answer = "yes";
        expect((await send("POST", "/api/library", { action: "add", path: shelf })).status).toBe(202);
        expect(asked.at(-1)).toContain(`RPG Engine asks to read the documents in ${shelf}, to search your books for the rules: for the game master of Guadoscuro`);
        const entry = { path: shelf, books: 0, reading: 1, skipped: [], missing: false, crowded: false, onComputer: true };
        expect(JSON.parse((await send("GET", "/api/library")).body).entries).toEqual([{ ...entry, used: true }]);
        // Added twice, the master hears once.
        expect((await send("POST", "/api/library", { action: "add", path: shelf })).status).toBe(202);
        expect(dashboard.news().lines.filter((line) => line.includes(`The player, on the dashboard, turned on ${shelf} in the campaign's library`))).toHaveLength(1);
        expect((await send("POST", "/api/library", { action: "remove", path: shelf })).status).toBe(202);
        expect(JSON.parse((await send("GET", "/api/library")).body).entries).toEqual([{ ...entry, used: false }]);
        expect((await send("POST", "/api/library", { action: "add", path: shelf })).status).toBe(202);
        expect(asked).toHaveLength(2);
        expect((await send("POST", "/api/library", { action: "forget", path: shelf })).status).toBe(202);
        expect(JSON.parse((await send("GET", "/api/library")).body)).toEqual({ entries: [] });
        expect((await send("POST", "/api/library", { action: "erase", path: shelf })).status).toBe(400);
    });
});
