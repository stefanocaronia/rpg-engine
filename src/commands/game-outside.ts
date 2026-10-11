// What changed in a campaign outside the chat's commands (OUT-1–OUT-4, D-364): by hand, as in Obsidian, by another chat or by the command line. The master
// hears it at the head of the next call, the log keeps it hidden, and the planned events it sets off fire as after a command.
import { join, relative, sep } from "node:path";
import { parse } from "yaml";
import { campaignFileName } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { filesIn } from "../core/files.ts";
import { appendLogEntry, logFileName, readLog } from "../core/log.ts";
import type { OutsideChange } from "../core/session-store.ts";
import { files } from "../core/store.ts";
import { readFields, splitPageFile, type World, worldFolderName } from "../pages/index.ts";
import { fireEvents, nowDueNote } from "./game-events.ts";
import { isGameFile } from "./game-saves.ts";
import { newDatedLogEntry, readPresent } from "./game-time.ts";
import { campaignWorld } from "./game-world.ts";

// At most this many changes are named; the rest are counted: a folder rewritten whole would fill the answer.
const mostNamed = 10;
// The files a command writes before its line in the log is stamped: a file changed this long after the log's last line was changed outside it.
const writeSlack = 2000;
// The files of the game a change can be told of: pages, settings and state, house rules, pictures; never an editor's copy or a system's file (OUT-1).
const gameKinds = /\.(md|ya?ml|png|jpe?g|webp|gif|svg)$/i;

/** One file changed outside the commands, as the master hears it and the log keeps it. */
interface OutsideItem
{
    file: string;
    name: string;
    fields?: [string, unknown, unknown][];
    text?: boolean;
    added?: boolean;
    gone?: boolean;
    unread?: boolean;
}

/**
 * What changed outside the chat since its last call (OUT-1–OUT-3): each page with its fields before and after and whether its text changed, campaign.yaml and
 * state.yaml with their keys, the other files named; a hidden line in the log; and the events it set off, fired from the world `before` it, when known.
 * Nothing for a change that leaves the game as it was, nor for the log, which the commands write.
 */
export function outsideNews(root: string, context: Context, changes: OutsideChange[], before: World | undefined): string[]
{
    const counted = changes.filter((change) => isToldFile(root, change.path));
    const items = counted.flatMap((change) => itemOf(root, change));
    const outside = { ...context, actor: "outside" };

    if (items.length === 0) {
        // A change of form alone, as spaces: nothing to tell, but the log notes it, so that the next chat never takes it for one made while it was closed.
        if (counted.length > 0) {
            appendLogEntry(root, newDatedLogEntry(root, outside, "changed-outside", "hidden", { files: counted.map((change) => ({ file: fileOf(root, change.path), form: true })) }));
        }

        return [];
    }

    appendLogEntry(root, newDatedLogEntry(root, outside, "changed-outside", "hidden", { files: items.map(logged) }));
    const shown = items.slice(0, mostNamed).map(itemText).join(" · ");
    const more = items.length > mostNamed ? `, and ${items.length - mostNamed} more` : "";
    return [
        `Changed outside this chat since your last call, by hand or elsewhere (the log keeps it, hidden): ${shown}${more}. Take it as the game's truth, and go on from it.`,
        ...dueAfter(root, outside, before),
    ];
}

/**
 * The files changed while no chat was open (OUT-4): those of world, rules and campaign.yaml written after the log's last line and before the chat `began`, as by
 * hand in Obsidian. Named only, with a hidden line in the log: no earlier copy of them is kept.
 */
export function whileClosedNews(root: string, context: Context, began: number): string[]
{
    const last = readLog(root).at(-1);
    const since = last === undefined ? Number.NaN : Date.parse(last.at) + writeSlack;

    if (Number.isNaN(since)) {
        return [];
    }

    const changed = [...filesIn(join(root, worldFolderName), () => true), ...filesIn(join(root, "rules"), () => true), join(root, campaignFileName)]
        .filter((path) => isToldFile(root, path) && (files().modified(path) ?? 0) > since && (files().modified(path) ?? 0) < began)
        .map((path) => relative(root, path).split(sep).join("/"));

    if (changed.length === 0) {
        return [];
    }

    appendLogEntry(root, newDatedLogEntry(root, { ...context, actor: "outside" }, "changed-outside", "hidden", { files: changed.map((file) => ({ file })), whileClosed: true }));
    const more = changed.length > mostNamed ? `, and ${changed.length - mostNamed} more` : "";
    return [`Changed outside rpg while no chat was open (the log keeps it, hidden): ${changed.slice(0, mostNamed).join(" · ")}${more}. Read those that matter with show.`];
}

/** Whether a changed file is one the master hears of: a game file of its kinds, not the log, nor a name with a dot or a tilde anywhere in its path. */
function isToldFile(root: string, path: string): boolean
{
    const parts = relative(root, path).split(sep);
    return isGameFile(root, path) && relative(root, path) !== logFileName && gameKinds.test(path) && !parts.some((part) => part.startsWith(".") || part.endsWith("~"));
}

function fileOf(root: string, path: string): string
{
    return relative(root, path).split(sep).join("/");
}

/** A change as an item: a page by its name, campaign.yaml and state.yaml by their keys, any other file by its path; none when nothing that counts changed. */
function itemOf(root: string, change: OutsideChange): OutsideItem[]
{
    const file = relative(root, change.path).split(sep).join("/");
    const page = file.startsWith(`${worldFolderName}/`) && file.toLowerCase().endsWith(".md");
    const name = page ? (file.split("/").at(-1) ?? file).replace(/\.md$/i, "") : file;

    if (change.before === undefined || change.after === undefined) {
        return [{ file, name, ...(change.before === undefined ? { added: true } : { gone: true }) }];
    }

    try {
        if (page) {
            const [then, now] = [splitPageFile(change.before), splitPageFile(change.after)];
            const fields = fieldChanges(readFields(then.frontmatter, file), readFields(now.frontmatter, file));
            const text = then.body !== now.body;
            return fields.length === 0 && !text ? [] : [{ file, name, ...(fields.length === 0 ? {} : { fields }), ...(text ? { text } : {}) }];
        }

        if (file === campaignFileName || file === "state.yaml") {
            const fields = fieldChanges(keysOf(change.before), keysOf(change.after));
            return fields.length === 0 ? [] : [{ file, name, fields }];
        }
    } catch {
        // A file that no longer reads: named, and validate says how to fix it.
        return [{ file, name, unread: true }];
    }

    return [{ file, name, text: true }];
}

function keysOf(text: string): Record<string, unknown>
{
    const values: unknown = parse(text) ?? {};
    return typeof values === "object" && values !== null && !Array.isArray(values) ? values as Record<string, unknown> : {};
}

/** The fields whose value differs, in the order the page has them now, then those gone. */
function fieldChanges(before: Record<string, unknown>, after: Record<string, unknown>): [string, unknown, unknown][]
{
    const names = [...new Set([...Object.keys(after), ...Object.keys(before)])];
    return names.filter((name) => JSON.stringify(before[name]) !== JSON.stringify(after[name])).map((name) => [name, before[name], after[name]]);
}

/** "Kira: hp 7 → 12, and its text", "new: Cortile", "gone: Bran". */
function itemText(item: OutsideItem): string
{
    if (item.added === true || item.gone === true) {
        return `${item.added === true ? "new" : "gone"}: ${item.name}`;
    }

    if (item.unread === true) {
        return `${item.name}: changed, and it no longer reads (validate says how to fix it)`;
    }

    const fields = (item.fields ?? []).map(([name, before, after]) => `${name} ${valueText(before)} → ${valueText(after)}`);
    return `${item.name}: ${[...fields, ...(item.text === true ? [fields.length === 0 ? "its text" : "and its text"] : [])].join(", ")}`;
}

/** A value as the master reads it, short: a list's items, none as a dash. */
function valueText(value: unknown): string
{
    const text = value === undefined || value === null
        ? "—"
        : Array.isArray(value)
        ? value.map(String).join(", ")
        : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
    return text.length > 40 ? `${text.slice(0, 39)}…` : text;
}

function logged(item: OutsideItem): Record<string, unknown>
{
    return {
        file: item.file,
        ...(item.fields === undefined ? {} : { fields: Object.fromEntries(item.fields.map(([name, before, after]) => [name, [before ?? null, after ?? null]])) }),
        ...(item.text === true ? { text: true } : {}),
        ...(item.added === true ? { added: true } : {}),
        ...(item.gone === true ? { gone: true } : {}),
        ...(item.unread === true ? { unread: true } : {}),
    };
}

/** The planned events the changes set off, fired as after a command (OUT-3, EVT-4); none without the world before them, or with a world that does not read. */
function dueAfter(root: string, context: Context, before: World | undefined): string[]
{
    if (before === undefined) {
        return [];
    }

    try {
        const note = nowDueNote(fireEvents(root, context, before, campaignWorld(root, context), readPresent(root).date).due);
        return note === "" ? [] : [note];
    } catch {
        return [];
    }
}
