// A PDF made by hand for the tests of the documents and of the importer: text on its pages, and pictures, its own or the same on many pages.
import { zlibSync } from "fflate";

/** A PDF of these pages, each with its line of text and, when asked, a picture: `shared` is the same picture on every page that has it, as a decoration. */
export function tinyPdf(pages: { text: string; picture?: "own" | "shared"; }[]): Uint8Array
{
    const objects: (string | Uint8Array)[] = [];
    const add = (body: string | Uint8Array): number => objects.push(body);
    const stream = (dictionary: string, data: Uint8Array): Uint8Array => joined([ascii(`<< ${dictionary} /Length ${data.length} >>\nstream\n`), data, ascii("\nendstream")]);

    const picture = (shade: number): number => {
        const raw = new Uint8Array(200 * 200 * 3).map((_, index) => (index % 3 === 0 ? shade : (index / 600) % 256));
        return add(stream("/Type /XObject /Subtype /Image /Width 200 /Height 200 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode", zlibSync(raw)));
    };

    const catalog = add("<< /Type /Catalog /Pages 2 0 R >>");
    add("");
    const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const shared = picture(30);
    const kids = pages.map((page, index) => {
        const image = page.picture === "own" ? picture(100 + index) : page.picture === "shared" ? shared : undefined;
        const draw = image === undefined ? "" : "q 200 0 0 200 72 400 cm /Im1 Do Q\n";
        // Ten words a line, as a page lays them out: a line past the page's edge is not read.
        const lines = (page.text.match(/(\S+\s*){1,10}/g) ?? [""]).map((line) => `(${line.trim()}) Tj 0 -12 Td`).join(" ");
        const content = add(stream("", ascii(`${draw}BT /F1 10 Tf 72 760 Td ${lines} ET`)));
        const resources = `/Font << /F1 ${font} 0 R >>${image === undefined ? "" : ` /XObject << /Im1 ${image} 0 R >>`}`;
        return add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << ${resources} >> /Contents ${content} 0 R >>`);
    });
    objects[1] = `<< /Type /Pages /Kids [${kids.map((kid) => `${kid} 0 R`).join(" ")}] /Count ${kids.length} >>`;
    const parts: Uint8Array[] = [ascii("%PDF-1.4\n")];
    const offsets: number[] = [];
    let length = parts[0]!.length;

    objects.forEach((body, index) => {
        const object = joined([ascii(`${index + 1} 0 obj\n`), typeof body === "string" ? ascii(body) : body, ascii("\nendobj\n")]);
        offsets.push(length);
        parts.push(object);
        length += object.length;
    });

    const table = offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
    parts.push(ascii(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${table}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${length}\n%%EOF\n`));
    return joined(parts);
}

function ascii(text: string): Uint8Array
{
    return new TextEncoder().encode(text);
}

function joined(parts: Uint8Array[]): Uint8Array
{
    const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let at = 0;

    for (const part of parts) {
        out.set(part, at);
        at += part.length;
    }

    return out;
}
