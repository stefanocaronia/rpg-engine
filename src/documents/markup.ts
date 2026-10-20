// The text of the markup documents are written in: HTML and XHTML, a Word document's XML, an OpenDocument's XML, and RTF, as paragraphs, with a mark where a
// picture stands. Enough to read a book, never a renderer.

/** Where a picture stands in the text, as the reader of the document names it; the reader finds its file by `source`. */
export const pictureMark = (source: string): string => `\u0000${source}\u0000`;

/** The text of HTML or XHTML: blocks as paragraphs, headings marked with #, pictures marked. */
export function htmlText(html: string): string
{
    return paragraphs(
        entities(
            html
                .replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, "")
                .replace(/<!--[\s\S]*?-->/g, "")
                .replace(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi, (_, source: string) => `\n${pictureMark(entities(source))}\n`)
                .replace(/<image\b[^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi, (_, source: string) => `\n${pictureMark(entities(source))}\n`)
                .replace(/<h([1-6])\b[^>]*>/gi, (_, level: string) => `\n\n${"#".repeat(Number(level))} `)
                .replace(/<br\b[^>]*>/gi, "\n")
                .replace(/<\/?(p|div|section|article|li|ul|ol|tr|table|blockquote|h[1-6]|title|body|header|footer|aside|nav|figure|figcaption)\b[^>]*>/gi, "\n\n")
                .replace(/<[^>]+>/g, ""),
        ),
    );
}

/** The text of a Word document's word/document.xml: paragraphs, headings by their style, pictures marked by their relation's id. */
export function wordText(xml: string): string
{
    // Only the runs' text, tabs, breaks and pictures, in their order: the rest of the XML is layout.
    const parts = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:(?:br|cr)\b[^>]*\/>|<a:blip\b[^>]*?r:embed="([^"]+)"/g;

    const paragraph = (body: string): string => {
        const heading = /<w:pStyle\s+w:val="(?:Heading|Title)(\d?)"/i.exec(body);
        const text = [...body.matchAll(parts)]
            .map(([whole, run, picture]) => (run !== undefined ? run : picture !== undefined ? `\n${pictureMark(picture)}\n` : whole.startsWith("<w:tab") ? "\t" : "\n"))
            .join("");
        return heading === null ? text : `${"#".repeat(Math.max(1, Number(heading[1] || 1)))} ${text}`;
    };

    return paragraphs(entities([...xml.matchAll(/<w:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:p>)/g)].map((match) => paragraph(match[1] ?? "")).join("\n\n")));
}

/** The text of an OpenDocument's content.xml: paragraphs and headings, spaces and tabs as written, pictures marked by their path in the file. */
export function openDocumentText(xml: string): string
{
    return paragraphs(
        entities(
            xml
                .replace(/<office:automatic-styles>[\s\S]*?<\/office:automatic-styles>/g, "")
                .replace(/<draw:image\b[^>]*?xlink:href="([^"]+)"[^>]*>/g, (_, source: string) => `\n${pictureMark(source)}\n`)
                .replace(/<text:h\b[^>]*?text:outline-level="(\d)"[^>]*>/g, (_, level: string) => `\n\n${"#".repeat(Number(level))} `)
                .replace(/<text:s\b[^>]*?text:c="(\d+)"[^>]*\/>/g, (_, count: string) => " ".repeat(Number(count)))
                .replace(/<text:s\b[^>]*\/>/g, " ")
                .replace(/<text:tab\b[^>]*\/>/g, "\t")
                .replace(/<text:line-break\b[^>]*\/>/g, "\n")
                .replace(/<\/text:(p|h)>/g, "\n\n")
                .replace(/<[^>]+>/g, ""),
        ),
    );
}

/** The text of an RTF file: its paragraphs, its escaped and Unicode letters; its pictures, fields' codes and other hidden groups left out. */
export function rtfText(rtf: string): string
{
    let text = "";
    let skip = 0;
    let depth = 0;
    const skipped: number[] = [];
    let index = 0;

    while (index < rtf.length) {
        const char = rtf[index] ?? "";

        if (char === "{") {
            depth++;
            index++;

            if (/^\{\\\*|^\{\\(pict|fonttbl|colortbl|stylesheet|info|header|footer|fldinst)\b/.test(rtf.slice(index - 1, index + 12))) {
                skipped.push(depth);
                skip++;
            }

            continue;
        }

        if (char === "}") {
            if (skipped.at(-1) === depth) {
                skipped.pop();
                skip--;
            }

            depth--;
            index++;
            continue;
        }

        if (char === "\\") {
            const word = /^\\([a-z]+)(-?\d+)? ?|^\\'([0-9a-f]{2})|^\\(.)/i.exec(rtf.slice(index));
            index += word?.[0].length ?? 1;

            if (skip > 0 || word === null) {
                continue;
            }

            if (word[3] !== undefined) {
                text += windows1252(Number.parseInt(word[3], 16));
            } else if (word[4] !== undefined) {
                text += /[\\{}]/.test(word[4]) ? word[4] : word[4] === "~" ? " " : "";
            } else if (word[1] === "par" || word[1] === "line") {
                text += word[1] === "par" ? "\n\n" : "\n";
            } else if (word[1] === "tab") {
                text += "\t";
            } else if (word[1] === "u" && word[2] !== undefined) {
                const code = Number(word[2]);
                text += String.fromCharCode(code < 0 ? code + 65536 : code);
                // The letter for readers without Unicode, after it.
                index += rtf[index] === "\\" && rtf[index + 1] === "'" ? 4 : rtf[index] === "?" ? 1 : 0;
            }

            continue;
        }

        if (skip === 0 && char !== "\r" && char !== "\n") {
            text += char;
        }

        index++;
    }

    return paragraphs(text);
}

// Paragraphs as blank-line separated blocks, each with its spaces folded, none empty.
function paragraphs(text: string): string
{
    return text
        .split(/\n\s*\n/)
        .map((block) => block.replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").trim())
        .filter((block) => block !== "")
        .join("\n\n");
}

const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”" };

function entities(text: string): string
{
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
        if (name.startsWith("#")) {
            const code = name[1] === "x" || name[1] === "X" ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1));
            return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
        }

        return named[name.toLowerCase()] ?? whole;
    });
}

const high = "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ";

function windows1252(code: number): string
{
    return code >= 0x80 && code < 0xa0 ? (high[code - 0x80] ?? "") : String.fromCharCode(code);
}
