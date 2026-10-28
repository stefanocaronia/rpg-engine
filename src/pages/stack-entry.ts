// How an entry of a container reads (STK-1): a link alone, a link with the count of a stack, or something else; and how a stack is written back.
import { comparableText } from "../core/text.ts";
import { links } from "./markdown.ts";

// A link alone, [[Torch]] or [[Torch|torce]], and a link followed by a count in digits, [[Torch]] 7.
const linkAlone = /^\[\[([^\][]+)\]\]$/;
const linkAndCount = /^\[\[([^\][]+)\]\][ \t]+(\d+)$/;

/** An entry of a container as written, read (STK-1). */
export type EntryReading =
    /** A link and nothing else: the page in this container, or a stack of 1 of a kind. */
    | { shape: "link"; page: string; section?: string; label?: string; }
    /** A link to a page without a section, and a count from 1 up. */
    | { shape: "stack"; page: string; label?: string; count: number; }
    /** A link with something else beside it, such as [[Torch]] 0 or 7 [[Torch]]: never a stack. */
    | { shape: "other"; page: string; }
    /** No link: text, as on a paper sheet. */
    | { shape: "text"; };

/** How an entry of a container reads (STK-1). */
export function readEntry(entry: string): EntryReading
{
    const text = entry.trim();
    const found = links(text);

    if (found.length === 0) {
        return { shape: "text" };
    }

    const label = labelOf(text);
    const counted = linkAndCount.exec(text);
    const count = counted === null ? undefined : Number(counted[2]);

    if (found.length === 1 && count !== undefined && Number.isSafeInteger(count) && count >= 1 && found[0].section === undefined) {
        return { shape: "stack", page: found[0].page, ...(label === undefined ? {} : { label }), count };
    }

    if (found.length === 1 && linkAlone.test(text)) {
        return { shape: "link", page: found[0].page, ...(found[0].section === undefined ? {} : { section: found[0].section }), ...(label === undefined ? {} : { label }) };
    }

    return { shape: "other", page: found[0].page };
}

/** A stack as the engine writes it: [[Torch]] 7, or [[Torch|torce]] 7 with the label its entry had. */
export function stackEntry(kind: string, count: number, label?: string): string
{
    const shown = label === undefined || comparableText(label) === comparableText(kind) ? "" : `|${label}`;
    return `[[${kind}${shown}]] ${count}`;
}

/** Whether an entry names this kind, alone or with a count, however its link is written. */
export function entryOfKind(entry: unknown, kind: string): boolean
{
    if (typeof entry !== "string") {
        return false;
    }

    const read = readEntry(entry);
    return (read.shape === "stack" || (read.shape === "link" && read.section === undefined)) && comparableText(read.page) === comparableText(kind);
}

/**
 * A container's list with the stack of a kind set to a count (STK-3): one entry in the place of the first that named the kind, the others gone, or one at the end when there was
 * none; with 0, the kind leaves the list. The label is the one given, else the first entry's.
 */
export function withStackCount(list: readonly unknown[], kind: string, count: number, label?: string): unknown[]
{
    const first = list.findIndex((entry) => entryOfKind(entry, kind));
    const firstLabel = first === -1 ? undefined : labelOf(String(list[first]).trim());
    const written = stackEntry(kind, count, label ?? firstLabel);
    const kept = list.flatMap((entry, index) => (!entryOfKind(entry, kind) ? [entry] : index === first && count > 0 ? [written] : []));
    return first === -1 && count > 0 ? [...kept, written] : kept;
}

/** The kinds a list counts in more than one entry, as two stacks of Torch written by hand: names that some stack gives, each once, as first written. */
export function doubledKinds(list: readonly unknown[]): string[]
{
    const named = list.flatMap((entry) => {
        const read = typeof entry === "string" ? readEntry(entry) : undefined;
        return read?.shape === "stack" ? [read.page] : [];
    });
    const once = named.filter((name, index) => named.findIndex((other) => comparableText(other) === comparableText(name)) === index);
    return once.filter((name) => list.filter((entry) => entryOfKind(entry, name)).length > 1);
}

/** The count of an entry of a kind: its number for a stack, 1 for a link alone. */
export function countOf(entry: unknown): number
{
    const read = typeof entry === "string" ? readEntry(entry) : undefined;
    return read?.shape === "stack" ? read.count : 1;
}

/** The name and count of a text with a whole number at one end, as torce 7 or 3 frecce; undefined for any other text. */
export function countedText(entry: string): { name: string; count: number; } | undefined
{
    const text = entry.trim();
    const first = /^(\d+)\s+(\S.*)$/.exec(text);
    const last = /^(.*\S)\s+[x×]?(\d+)$/.exec(text);

    if (first !== null) {
        return { name: first[2].trim(), count: Number(first[1]) };
    }

    return last === null ? undefined : { name: last[1].trim(), count: Number(last[2]) };
}

/** The words after | in a single link, as torce in [[Torch|torce]] 7. */
function labelOf(text: string): string | undefined
{
    const inner = /^\[\[([^\][]+)\]\]/.exec(text)?.[1];
    const bar = inner === undefined ? -1 : inner.indexOf("|");
    const label = bar === -1 || inner === undefined ? "" : inner.slice(bar + 1).trim();
    return label === "" ? undefined : label;
}
