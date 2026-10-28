// The player's documents as text and pictures (D-489 (2), (8)): a PDF by its pages, with its pictures and without the decorations of every page; Word,
// OpenDocument and EPUB by their XML, HTML, RTF and text by their paragraphs, in parts of about a page; a folder by its files.
import { zipSync } from "fflate";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readDocument } from "../src/documents/index.ts";
import { tinyPdf } from "./pdf-fixture.ts";
import { makeTempFolder } from "./support.ts";

function ascii(text: string): Uint8Array
{
    return new TextEncoder().encode(text);
}

function zipped(files: Record<string, string | Uint8Array>): Uint8Array
{
    return zipSync(Object.fromEntries(Object.entries(files).map(([path, body]) => [path, typeof body === "string" ? ascii(body) : body])));
}

const picture = new Uint8Array(5000).fill(7);

function fileOf(name: string, body: string | Uint8Array): string
{
    const file = join(makeTempFolder(), name);
    writeFileSync(file, body);
    return file;
}

describe("a PDF, page by page (D-489 (2), (8))", () => {
    it("gives each page's text with its label, and its own pictures as PNG files marked where they stand, never a decoration of every page", async () => {
        const pdf = tinyPdf([
            { text: "The Square at Marwar.", picture: "shared" },
            { text: "Kafiristan, beyond the passes.", picture: "own" },
            { text: "The crown of gold.", picture: "shared" },
            { text: "The rope bridge.", picture: "shared" },
            { text: "The end.", picture: "shared" },
        ]);
        const document = await readDocument(fileOf("king.pdf", pdf));
        expect(document.parts.map((part) => part.label)).toEqual(["p. 1", "p. 2", "p. 3", "p. 4", "p. 5"]);
        expect(document.parts[1]?.text).toBe("Kafiristan, beyond the passes.\n\n[picture: p002-1.png]");
        expect(document.parts[0]?.text).toBe("The Square at Marwar.");
        expect(document.pictures.map((one) => [one.name, one.label])).toEqual([["p002-1.png", "p. 2"]]);
        expect([...document.pictures[0]!.data.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    });
});

describe("documents of text, in parts of about a page", () => {
    it("reads a Word document's paragraphs and headings, and its pictures by their relations", async () => {
        const docx = zipped({
            "word/document.xml": '<w:document><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Chapter One</w:t></w:r></w:p>'
                + '<w:p><w:r><w:t xml:space="preserve">Dravot &amp; </w:t></w:r><w:r><w:t>Carnehan.</w:t></w:r></w:p>'
                + '<w:p><w:r><w:drawing><a:blip r:embed="rId7"/></w:drawing></w:r></w:p></w:body></w:document>',
            "word/_rels/document.xml.rels": '<Relationships><Relationship Id="rId7" Type="image" Target="media/image1.jpeg"/></Relationships>',
            "word/media/image1.jpeg": picture,
        });
        const document = await readDocument(fileOf("notes.docx", docx));
        expect(document.parts).toEqual([{ label: "part 1", text: "# Chapter One\n\nDravot & Carnehan.\n\n[picture: image1.jpg]" }]);
        expect(document.pictures.map((one) => [one.name, one.label])).toEqual([["image1.jpg", "part 1"]]);
    });

    it("unpacks only the files it reads, up to a size: a document that says it unpacks to more is refused with what to do", async () => {
        const docx = zipped({ "word/document.xml": "<w:document><w:body><w:p><w:r><w:t>A short adventure.</w:t></w:r></w:p></w:body></w:document>", "word/media/big.bin": "x" });
        // The central directory as a document full of zeros writes it: the uncompressed size of its text, at 24 past the mark of its entry, past 512 MB.
        const view = new DataView(docx.buffer, docx.byteOffset, docx.byteLength);

        for (let at = 0; at < docx.length - 4; at++) {
            if (view.getUint32(at, true) === 0x02014b50 && new TextDecoder().decode(docx.subarray(at + 46, at + 63)) === "word/document.xml") {
                view.setUint32(at + 24, 0xf0000000, true);
            }
        }

        await expect(readDocument(fileOf("bomb.docx", docx))).rejects.toThrow("unpacks to more than 512 MB of text and pictures: save it again without its largest pictures, or as a PDF.");
        const plain = zipped({ "word/document.xml": "<w:document><w:body><w:p><w:r><w:t>A short adventure.</w:t></w:r></w:p></w:body></w:document>", "word/media/big.bin": new Uint8Array(64) });
        expect((await readDocument(fileOf("plain.docx", plain))).parts).toEqual([{ label: "part 1", text: "A short adventure." }]);
    });

    it("reads an OpenDocument's paragraphs, an EPUB's chapters in the order of its spine, HTML, RTF and text", async () => {
        const odt = zipped({
            "content.xml": '<office:document-content><office:body><text:h text:outline-level="2">The Serai</text:h><text:p>Two<text:s/>men<text:tab/>wait.</text:p>'
                + '<draw:frame><draw:image xlink:href="Pictures/serai.png"/></draw:frame></office:body></office:document-content>',
            "Pictures/serai.png": picture,
        });
        expect((await readDocument(fileOf("serai.odt", odt))).parts[0]?.text).toBe("## The Serai\n\nTwo men wait.\n\n[picture: serai.png]");

        const epub = zipped({
            "META-INF/container.xml": '<container><rootfiles><rootfile full-path="OEBPS/book.opf"/></rootfiles></container>',
            "OEBPS/book.opf": '<package><manifest><item id="b" href="text/two.xhtml"/><item id="a" href="text/one.xhtml"/></manifest>'
                + '<spine><itemref idref="a"/><itemref idref="b"/></spine></package>',
            "OEBPS/text/one.xhtml": '<html><head><title>x</title></head><body><h1>One</h1><p>First.</p><img src="../images/map.png"/></body></html>',
            "OEBPS/text/two.xhtml": "<html><body><h1>Two</h1><p>Second.</p></body></html>",
            "OEBPS/images/map.png": picture,
        });
        const book = await readDocument(fileOf("book.epub", epub));
        expect(book.parts[0]?.text).toBe("# One\n\nFirst.\n\n[picture: map.png]\n\n# Two\n\nSecond.");

        expect((await readDocument(fileOf("page.html", "<p>A &ldquo;king&rdquo;<br>at last</p><script>x()</script>"))).parts[0]?.text).toBe("A “king”\nat last");
        expect((await readDocument(fileOf("old.rtf", "{\\rtf1{\\fonttbl{\\f0 Times;}}\\f0 Caf\\'e9 \\b bold\\b0\\par Next\\u8212? line}"))).parts[0]?.text).toBe("Café bold\n\nNext— line");

        const long = Array.from({ length: 20 }, (_, index) => `Paragraph ${index} ${"word ".repeat(60)}`).join("\n\n");
        const parts = (await readDocument(fileOf("long.txt", long))).parts;
        expect(parts.map((part) => part.label)).toEqual(["part 1", "part 2", "part 3"]);
    });

    it("reads a folder by its files, in order, each cited by its name, and refuses what it does not read", async () => {
        const folder = makeTempFolder();
        mkdirSync(join(folder, "chapters"));
        writeFileSync(join(folder, "chapters", "2 inn.md"), "The inn.");
        writeFileSync(join(folder, "chapters", "10 road.md"), "The road.");
        writeFileSync(join(folder, "cover.jpg"), picture);
        const document = await readDocument(folder);
        expect(document.parts).toEqual([{ label: "chapters/2 inn.md", text: "The inn." }, { label: "chapters/10 road.md", text: "The road." }]);
        await expect(readDocument(fileOf("sheet.xlsx", "x"))).rejects.toThrow("sheet.xlsx is no document the engine reads: give a .pdf, .docx");
    });
});

describe("documents that are not written as the reader expects (Matteo's review of 20 October)", () => {
    it("cuts into pages a text with a line for each paragraph, and one with no spaces between its words", async () => {
        const lines = Array.from({ length: 300 }, (_, index) => `Line ${index} ${"word ".repeat(9)}`).join("\n");
        const parts = (await readDocument(fileOf("lines.txt", lines))).parts;
        expect(parts.length).toBeGreaterThan(5);
        expect(parts.every((part) => part.text.split(/\s+/).length <= 460)).toBe(true);
        const chinese = (await readDocument(fileOf("zh.txt", "王".repeat(20000)))).parts;
        expect(chinese.length).toBe(Math.ceil(20000 / 450));
    });

    it("reads text in UTF-16 by its mark, and in the Windows encoding where it is no UTF-8", async () => {
        const utf16 = new Uint8Array([0xff, 0xfe, ...[..."Caffè"].flatMap((char) => [char.charCodeAt(0), 0])]);
        expect((await readDocument(fileOf("u16.txt", utf16))).parts[0]?.text).toBe("Caffè");
        expect((await readDocument(fileOf("old.txt", new Uint8Array([0x43, 0x61, 0x66, 0x66, 0xe8, 0x20, 0x93, 0x6f, 0x6b, 0x94])))).parts[0]?.text).toBe("Caffè “ok”");
    });

    it("renames the second of two pictures with one name in a folder, and its marks with it", async () => {
        const docx = (text: string, bytes: Uint8Array): Uint8Array =>
            zipped({
                "word/document.xml": `<w:document><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p><w:p><w:r><w:drawing><a:blip r:embed="rId1"/></w:drawing></w:r></w:p></w:body></w:document>`,
                "word/_rels/document.xml.rels": '<Relationships><Relationship Id="rId1" Type="image" Target="media/image1.png"/></Relationships>',
                "word/media/image1.png": bytes,
            });
        const folder = makeTempFolder();
        writeFileSync(join(folder, "a.docx"), docx("The inn.", picture));
        writeFileSync(join(folder, "b.docx"), docx("The road.", new Uint8Array(5000).fill(9)));
        const document = await readDocument(folder);
        expect(document.parts.map((part) => part.text)).toEqual(["The inn.\n\n[picture: image1.png]", "The road.\n\n[picture: image1-2.png]"]);
        expect(document.pictures.map((one) => [one.name, one.label, one.data[0]])).toEqual([["image1.png", "a.docx", 7], ["image1-2.png", "b.docx", 9]]);
    });
});
