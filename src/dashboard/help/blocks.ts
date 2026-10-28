// The markdown the guide is written in (D-413), read into blocks: headings, with an icon in a comment after them (<!-- icon: dice -->); paragraphs, lists,
// tables, quotes, code. markdown.tsx draws them.

/** A block of a markdown text. */
export type Block =
    | { kind: "heading"; level: number; text: string; icon?: string; }
    | { kind: "paragraph"; text: string; }
    | { kind: "list"; ordered: boolean; items: string[]; }
    | { kind: "table"; head: string[]; rows: string[][]; }
    | { kind: "quote"; blocks: Block[]; }
    | { kind: "code"; text: string; }
    | { kind: "rule"; };

/** The blocks of a markdown text; its comments, but a heading's icon, left out. */
export function markdownBlocks(text: string): Block[]
{
    const lines = text.replace(/\r\n/g, "\n").replace(/<!--(?!\s*icon:)[\s\S]*?-->/g, "").split("\n");
    const blocks: Block[] = [];
    let index = 0;

    // The lines from here on that go together: each the next, while it is one.
    const run = (belongs: (line: string) => boolean): string[] => {
        const taken: string[] = [];

        while (index < lines.length && belongs(lines[index])) {
            taken.push(lines[index]);
            index += 1;
        }

        return taken;
    };

    while (index < lines.length) {
        const line = lines[index];
        const heading = /^(#{1,6})\s+(.*?)\s*(?:<!--\s*icon:\s*([\w-]+)\s*-->)?\s*$/.exec(line);

        if (line.trim() === "") {
            index += 1;
        } else if (heading !== null) {
            blocks.push({ kind: "heading", level: heading[1].length, text: heading[2], ...(heading[3] === undefined ? {} : { icon: heading[3] }) });
            index += 1;
        } else if (line.startsWith("```")) {
            index += 1;
            const code = run((one) => !one.startsWith("```"));
            index += 1;
            blocks.push({ kind: "code", text: code.join("\n") });
        } else if (/^-{3,}\s*$/.test(line)) {
            blocks.push({ kind: "rule" });
            index += 1;
        } else if (line.startsWith("|")) {
            const [head = [], , ...rows] = run((one) => one.startsWith("|")).map(cells);
            blocks.push({ kind: "table", head, rows });
        } else if (line.startsWith(">")) {
            blocks.push({ kind: "quote", blocks: markdownBlocks(run((one) => one.startsWith(">")).map((one) => one.replace(/^> ?/, "")).join("\n")) });
        } else if (listItem(line) !== undefined) {
            const ordered = listItem(line)?.ordered ?? false;
            const items = run((one) => one.trim() !== "" && (listItem(one)?.ordered === ordered || (listItem(one) === undefined && /^\s/.test(one))));
            blocks.push({ kind: "list", ordered, items: items.reduce<string[]>((all, one) => (listItem(one) === undefined ? [...all.slice(0, -1), `${all.at(-1) ?? ""} ${one.trim()}`] : [...all, listItem(one)?.text ?? ""]), []) });
        } else {
            const paragraph = run((one) => one.trim() !== "" && !/^(#{1,6}\s|```|>|\|)/.test(one) && listItem(one) === undefined);
            blocks.push({ kind: "paragraph", text: paragraph.map((one) => one.trim()).join(" ") });
        }
    }

    return blocks;
}

/** A heading's anchor as GitHub makes it: 2.4 Connect your AI, 24-connect-your-ai. */
export function anchorOf(heading: string): string
{
    return heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
}

/** A line's text without its marks, as a card's preview says it. */
export function plainText(text: string): string
{
    return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*|\*|`/g, "");
}

/** A list item's mark and text: - text, or 1. text; undefined for another line. */
function listItem(line: string): { ordered: boolean; text: string; } | undefined
{
    const item = /^([-*]|\d+\.)\s+(.*)$/.exec(line);
    return item === null ? undefined : { ordered: /\d/.test(item[1]), text: item[2] };
}

/** A table row's cells: | a | b |, a and b. */
function cells(line: string): string[]
{
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}
