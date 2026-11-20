// The engine's block of a .gitignore: its lines between two marks, which it writes again whole; the lines around it are the player's and stay as they are.

const begin = "# rpg-engine: begin (written by rpg-engine; your own lines go outside this block)";
const end = "# rpg-engine: end";

/** The text of a .gitignore, or none, with the engine's block holding `lines`: in place of the block it had, else after its own lines. */
export function withIgnoreBlock(text: string | undefined, lines: string[]): string
{
    const newline = text?.includes("\r\n") === true ? "\r\n" : "\n";
    const block = [begin, ...lines, end].join(newline);
    const kept = (text ?? "").split(/\r?\n/);
    const from = kept.indexOf(begin);
    const to = kept.indexOf(end, from);

    if (from !== -1 && to !== -1) {
        return [...kept.slice(0, from), block, ...kept.slice(to + 1)].join(newline);
    }

    const before = (text ?? "").replace(/(\r?\n)*$/, "");
    return before === "" ? `${block}${newline}` : `${before}${newline}${newline}${block}${newline}`;
}
