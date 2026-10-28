// What the character knows and the documents it found, as the World section lists them: the kinds of page in groups, a search over their names and openings,
// the links of a page's text, and each kind of document with its look.
import type { KnownEntry } from "../data.ts";
import { foldedText } from "../text.ts";

/** The groups of the lore, in the order the list shows them: people, places, factions, creatures, items, tales and events, then the rest. */
const loreGroups = ["people", "places", "factions", "creatures", "items", "tales", "other"] as const;

export type LoreGroup = (typeof loreGroups)[number];

/** The group a page belongs to, by its type. */
export function loreGroupOf(entry: Pick<KnownEntry, "type">): LoreGroup
{
    const groups: Record<string, LoreGroup> = { character: "people", place: "places", faction: "factions", creature: "creatures", item: "items", event: "tales", topic: "tales" };
    return groups[entry.type] ?? "other";
}

/** The pages a search finds, every word of it in their name, their opening or the places that hold them, without minding case or accents; in a group, or all. */
export function foundLore(entries: KnownEntry[], search: string, group?: LoreGroup): KnownEntry[]
{
    const words = foldedText(search).split(/\s+/).filter((word) => word !== "");
    return entries.filter((entry) => {
        const text = foldedText([entry.name, entry.summary, ...(entry.within ?? [])].join(" "));
        return (group === undefined || loreGroupOf(entry) === group) && words.every((word) => text.includes(word));
    });
}

/** Whether a player character knows a page, with more than one: all of them do unless it says who (VIEW-12). */
export function knownTo(entry: Pick<KnownEntry, "knownBy">, name: string): boolean
{
    return entry.knownBy === undefined || entry.knownBy.includes(name);
}

/** The pages in their groups, in the groups' order, each group as the list gives it; the empty groups left out. */
export function groupedLore(entries: KnownEntry[]): { group: LoreGroup; entries: KnownEntry[]; }[]
{
    return loreGroups.map((group) => ({ group, entries: entries.filter((entry) => loreGroupOf(entry) === group) })).filter((part) => part.entries.length > 0);
}

/** The page a link of a text names: [[Page]], [[Page|words]], [[Page#Part]], [[folder/Page.md|words]] all name Page. */
export function linkedName(target: string): string
{
    return target.split("#")[0].split("/").at(-1)?.replace(/\.md$/i, "").trim() ?? "";
}

/** The looks of documents: each kind the page draws, and the words of the document field that name it. */
const documentLooks: Record<string, string[]> = {
    letter: ["letter", "message", "missive", "invitation", "envelope"],
    note: ["note", "receipt", "list", "ticket"],
    notice: ["notice", "poster", "bounty", "proclamation", "decree", "sign", "placard"],
    page: ["page", "book", "tome", "leaf", "chapter", "prayer"],
    diary: ["diary", "journal", "logbook", "log"],
    map: ["map", "chart", "plan"],
    scroll: ["scroll"],
    inscription: ["inscription", "carving", "epitaph", "tablet", "stone"],
};

/** The look of a document by what it is, as letter or notice; plain for one the page does not know. */
export function documentLook(document: string): string
{
    const word = document.trim().toLowerCase();
    return Object.entries(documentLooks).find(([, words]) => words.includes(word))?.[0] ?? "plain";
}
