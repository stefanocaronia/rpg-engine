// A page's text as the player may read it, from its markdown (D-275): headings, paragraphs, lists, quotes, bold and italics, links as their names. Never HTML:
// every piece is text, so nothing in a page can run in the dashboard.
import { type ComponentChildren, Fragment } from "preact";

export function Markdown({ text }: { text: string; })
{
    return <div class="markdown">{blocks(text).map((block, index) => <Fragment key={index}>{block}</Fragment>)}</div>;
}

function blocks(text: string): ComponentChildren[]
{
    const shown: ComponentChildren[] = [];
    let paragraph: string[] = [];
    let list: string[] = [];

    const close = (): void => {
        if (paragraph.length > 0) {
            shown.push(<p>{inline(paragraph.join(" "))}</p>);
        }

        if (list.length > 0) {
            shown.push(<ul>{list.map((item, index) => <li key={index}>{inline(item)}</li>)}</ul>);
        }

        paragraph = [];
        list = [];
    };

    for (const line of text.split("\n")) {
        const heading = /^(#{1,6})\s+(.*)$/.exec(line);
        const item = /^\s*[-*]\s+(.*)$/.exec(line);

        if (line.trim() === "") {
            close();
        } else if (heading !== null) {
            close();
            // A page's own headings sit below the sheet's: the first level is a box's, and its sections come after.
            shown.push(heading[1].length <= 2 ? <h4>{inline(heading[2])}</h4> : <h5>{inline(heading[2])}</h5>);
        } else if (item !== null) {
            if (paragraph.length > 0) {
                close();
            }

            list.push(item[1]);
        } else {
            if (list.length > 0) {
                close();
            }

            // A quote, as a secret discovered: its text, its marker as a word.
            paragraph.push(line.replace(/^\s*>\s?/, "").replace(/\[!secret\]/i, "Secret:"));
        }
    }

    close();
    return shown;
}

/** Bold and italics, and links as the names of their pages. */
function inline(text: string): ComponentChildren[]
{
    const named = text.replace(/\[\[(?:[^\]|]*\|)?([^\]|]+)\]\]/g, "$1");
    return named.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/).filter((piece) => piece !== "").map((piece, index) => {
        if (/^\*\*\*.+\*\*\*$/.test(piece)) {
            return (
                <strong key={index}>
                    <em>{piece.slice(3, -3)}</em>
                </strong>
            );
        }

        if (/^\*\*.+\*\*$/.test(piece)) {
            return <strong key={index}>{piece.slice(2, -2)}</strong>;
        }

        return /^([*_]).+\1$/.test(piece) ? <em key={index}>{piece.slice(1, -1)}</em> : piece;
    });
}
