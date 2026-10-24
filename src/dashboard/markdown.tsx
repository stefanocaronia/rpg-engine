// A page's text as the player may read it, from its markdown (D-275): headings, paragraphs, lists, quotes, a secret discovered as a note of its own, bold and
// italics, links as their names, or as links where the page reading it says where they lead. Never HTML: every piece is text, so nothing in a page can run in
// the dashboard.
import { type ComponentChildren, Fragment } from "preact";
import { linkedName } from "./lore.ts";
import { foldedText, t } from "./text.ts";

/** Where a link of the text leads: the address of the page it names, or nothing, and the link stays its words. */
export type LinkTo = (name: string) => string | undefined;

/** What a secret's title says after its name, by the title the text gives it: who knows it, with more than one player character (VIEW-12). */
export type SecretNote = (title: string) => string | undefined;

export function Markdown({ text, link, secretNote }: { text: string; link?: LinkTo; secretNote?: SecretNote; })
{
    return <div class="markdown">{blocks(text, link, true, secretNote).map((block, index) => <Fragment key={index}>{block}</Fragment>)}</div>;
}

/** The first line of a page's text that is not a heading nor in a fenced block, as plain words: what a closed card shows of it. */
export function plainLine(text: string): string | undefined
{
    let fenced = false;
    const line = text.split("\n").find((candidate) => {
        if (fenced ? fenceEnd.test(candidate) : fenceStart.test(candidate)) {
            fenced = !fenced;
            return false;
        }

        return !fenced && candidate.trim() !== "" && !/^\s*#/.test(candidate);
    });

    if (line === undefined) {
        return undefined;
    }

    // A quote's words, a secret's with its word, as the text reads them.
    const quoted = quoteLine.exec(line)?.[1];
    const words = quoted === undefined ? line.replace(/^\s*[-*]\s+/, "") : quoted.replace(secretStart, (_, title: string) => (title.trim() === "" ? t("You found out") : t("You found out: {what}", { what: title.trim() })));
    return linkWords(words).replace(/[*_]/g, "").trim();
}

// A fenced block opens on a line of its own, with its language, and closes on a line of its own; one left open runs to the text's end.
const fenceStart = /^\s*```\s*([\w-]*)\s*$/;
const fenceEnd = /^\s*```\s*$/;
// A quote, as the engine reads a secret (VIEW-3): at most three spaces before its mark.
const quoteLine = /^[ \t]{0,3}>[ \t]?(.*)$/;
const secretStart = /^[ \t]*\[!secret\][-+]?[ \t]*(.*)$/i;
// A picture embedded in a page, which the text does not show.
const pictureFile = /\.(?:png|jpe?g|gif|webp|avif|bmp|svg)$/i;

/** The blocks of a text; `outer` for the text itself, where alone a quote may be a secret, as for the engine. */
function blocks(text: string, link: LinkTo | undefined, outer: boolean, note?: SecretNote): ComponentChildren[]
{
    const shown: ComponentChildren[] = [];
    let paragraph: string[] = [];
    let list: string[] = [];
    let quote: string[] = [];
    // A fenced block, its language and lines until it closes. A heading waits for what it heads: one with nothing under it is left out.
    let fence: { language: string; lines: string[]; } | undefined;
    let headings: { level: number; shown: ComponentChildren; }[] = [];

    const show = (block: ComponentChildren): void => {
        shown.push(...headings.map((one) => one.shown), block);
        headings = [];
    };

    const close = (): void => {
        if (paragraph.length > 0) {
            show(<p dir="auto">{inline(paragraph.map((line) => line.trim()).join(" "), link)}</p>);
        }

        if (list.length > 0) {
            show(<ul>{list.map((item, index) => <li key={index} dir="auto">{inline(item, link)}</li>)}</ul>);
        }

        if (quote.length > 0) {
            show(<Quote lines={quote} link={link} outer={outer} note={note} />);
        }

        paragraph = [];
        list = [];
        quote = [];
    };

    for (const line of text.split("\n")) {
        if (fence !== undefined) {
            if (!fenceEnd.test(line)) {
                fence.lines.push(line);
                continue;
            }

            // A place's map is drawn by the Scene, not read as text.
            if (fence.language !== "map") {
                show(<pre class="md-pre">{fence.lines.join("\n")}</pre>);
            }

            fence = undefined;
            continue;
        }

        const opening = fenceStart.exec(line);

        if (opening !== null) {
            close();
            fence = { language: opening[1], lines: [] };
            continue;
        }

        const title = /^(#{1,6})\s+(.*)$/.exec(line);
        const item = /^\s*[-*]\s+(.*)$/.exec(line);
        const quoted = quoteLine.exec(line);

        if (quoted !== null) {
            if (quote.length === 0) {
                close();
            }

            quote.push(quoted[1]);
        } else if (line.trim() === "") {
            close();
        } else if (title !== null) {
            close();
            // A page's own headings sit below the sheet's: the first level is a box's, and its sections come after.
            const level = Math.max(2, title[1].length);
            headings = [...headings.filter((one) => one.level < level), { level, shown: level === 2 ? <h4 dir="auto">{inline(title[2], link)}</h4> : <h5 dir="auto">{inline(title[2], link)}</h5> }];
        } else if (item !== null) {
            if (paragraph.length > 0 || quote.length > 0) {
                close();
            }

            list.push(item[1]);
        } else {
            if (list.length > 0 || quote.length > 0) {
                close();
            }

            paragraph.push(line);
        }
    }

    close();

    // A block left open is shown as it is: nothing of the text is lost.
    if (fence !== undefined) {
        show(<pre class="md-pre">{fence.lines.join("\n")}</pre>);
    }

    return shown;
}

/** A quote; at the text's own level, a secret the character discovered, written as a callout: a note of its own with its title. */
function Quote({ lines, link, outer, note }: { lines: string[]; link: LinkTo | undefined; outer: boolean; note: SecretNote | undefined; })
{
    const secret = outer ? secretStart.exec(lines[0]) : null;

    if (secret === null) {
        return <blockquote>{blocks(lines.join("\n"), link, false)}</blockquote>;
    }

    const title = secret[1].trim();
    return (
        <aside class="md-secret">
            <p class="eyebrow" dir="auto">{[t("You found out"), title, note?.(title)].filter((part) => part !== undefined && part !== "").join(" · ")}</p>
            {blocks(lines.slice(1).join("\n"), link, false)}
        </aside>
    );
}

/**
 * Links, and pages embedded, as their words; a link where the page says where it leads and its words do not hide whom: none, or the page's own name. A picture
 * embedded is left out. Then bold and italics.
 */
function inline(text: string, link: LinkTo | undefined): ComponentChildren[]
{
    return text.split(/(!?\[\[[^\]]*\]\])/).filter((piece) => piece !== "").flatMap((piece, index) => {
        const found = /^(!?)\[\[([^\]|]*)(?:\|([^\]]*))?\]\]$/.exec(piece);

        if (found === null) {
            return emphasis(piece, index);
        }

        const [, embed, target, said] = found;

        if (embed !== "" && pictureFile.test(target.split("#")[0].trim())) {
            return [];
        }

        const name = linkedName(target);
        const words = said?.trim() || name;
        const plain = said === undefined || foldedText(said.trim()) === foldedText(name);
        const address = name === "" || !plain ? undefined : link?.(name);
        return address === undefined ? emphasis(words, index) : [<a key={index} class="md-link" href={address}>{words}</a>];
    });
}

/** Bold and italics. */
function emphasis(text: string, at: number): ComponentChildren[]
{
    return text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/).filter((piece) => piece !== "").map((piece, index) => {
        const key = `${at}-${index}`;

        if (/^\*\*\*.+\*\*\*$/.test(piece)) {
            return (
                <strong key={key}>
                    <em>{piece.slice(3, -3)}</em>
                </strong>
            );
        }

        if (/^\*\*.+\*\*$/.test(piece)) {
            return <strong key={key}>{piece.slice(2, -2)}</strong>;
        }

        return /^([*_]).+\1$/.test(piece) ? <em key={key}>{piece.slice(1, -1)}</em> : piece;
    });
}

/** Links as their words: [[Page|name]] reads name, [[Page]] reads Page; a picture embedded reads nothing. */
function linkWords(text: string): string
{
    return text.replace(/!?\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (whole, target: string, said?: string) => whole.startsWith("!") && pictureFile.test(target.split("#")[0].trim()) ? "" : said?.trim() || linkedName(target));
}
