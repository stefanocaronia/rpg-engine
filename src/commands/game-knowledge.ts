// What the player character knows, as the player's view reads it (D-250, VIEW-2, VIEW-3): the pages it knows and the text of each as it knows it.
import { readLog } from "../core/log.ts";
import { comparableText } from "../core/text.ts";
import { baseChain, inheritedByBase, introductionText, links, locate, type Page, pagesWithName, parsePageReference, textParts, textsIn, type World } from "../pages/index.ts";
import { readOpenScene } from "./game-scene.ts";

/** What the player character knows: the pages, and the secrets by the page that writes them. */
export interface Knowledge
{
    pc: Page;
    pages: Set<Page>;
    /** "coppa#veleno": the secrets it discovered, by the page that writes them and their name, as comparable text. */
    secrets: Set<string>;
}

/** The player character, the first page of a character with role pc; undefined before there is one. */
export function playerCharacter(world: World): Page | undefined
{
    return world.pages.find((page) => page.type === "character" && page.fields.role === "pc");
}

/**
 * What the player character knows (D-250): what its knows lists, pages and the pages of its secrets; itself, the companions, what it carries, the places around
 * it, the characters and places of the scenes it was in, and the places it was moved from and to; the pages of the game system but its creatures, which anyone may read (SYS-2). Never a creature
 * of the campaign it was not told of.
 */
export function knowledgeOf(root: string, world: World, pc: Page): Knowledge
{
    const named = (name: string): Page[] => pagesWithName(world, parsePageReference(name).name).slice(0, 1);
    // A link in knows, to a page or to one of its secrets, read with its secret (REV-1).
    const known = textsIn(pc.fields.knows).flatMap(links);
    const secrets = new Set(known.filter((link) => link.section !== undefined).map((link) => secretKey(link.page, link.section ?? "")));
    const pages = new Set<Page>([
        pc,
        ...known.flatMap((link) => named(link.page)),
        ...world.pages.filter((page) => page.type === "character" && page.fields.role === "companion"),
        // The quests the player took (D-250).
        ...world.pages.filter((page) => page.type === "quest" && ["open", "done", "failed"].includes(String(page.fields.status))),
        ...world.pages.filter((page) => page !== pc && locate(world, page).chain.includes(pc)),
        ...locate(world, pc).chain,
        ...livedOf(root, pc).flatMap(named).filter((page) => page.type === "character" || page.type === "place"),
    ]);
    return { pc, pages, secrets };
}

/** Whether the player character knows a page: one of the campaign it knows, or one of the game system but a creature (D-250). */
export function knowsPage(knowledge: Knowledge, page: Page): boolean
{
    return knowledge.pages.has(page) || (page.system !== undefined && page.type !== "creature");
}

/**
 * A page's text as the player character knows it (VIEW-3): its introduction, or its nearest base's; its sections and those it shows from its bases (INH-13); of
 * its secrets, only those discovered, recorded by the page that writes them (REV-2). A secret without a name is never known.
 */
export function knownText(world: World, knowledge: Knowledge, page: Page): string
{
    const parts = [
        ...partsOf(page),
        ...inheritedByBase(world, page).flatMap((group) => group.parts.map((part) => ({ ...part, holder: group.base }))),
    ].filter((part) => !isSecretText(part.text) || knowledge.secrets.has(secretKey(part.holder.name, part.name)));
    const introduction = introductionText(page.body) || (baseChain(world, page).map((base) => introductionText(base.body)).find((text) => text !== "") ?? "");
    return [introduction, ...parts.map((part) => part.text)].filter((text) => text !== "").join("\n\n");
}

/** The section or secret of a page the player character knows by this name, with its text (VIEW-3); undefined when it knows none. */
export function knownPart(world: World, knowledge: Knowledge, page: Page, name: string): string | undefined
{
    const wanted = comparableText(name.trim());
    const holders = [page, ...baseChain(world, page)];

    for (const holder of holders) {
        const part = partsOf(holder).find((candidate) => comparableText(candidate.name) === wanted);

        if (part !== undefined) {
            return !isSecretText(part.text) || knowledge.secrets.has(secretKey(holder.name, part.name)) ? part.text : undefined;
        }
    }

    return undefined;
}

/** The sections and secrets of a page's own text, each with the page. */
function partsOf(page: Page): { name: string; text: string; holder: Page; }[]
{
    return textParts(page.body).map((part) => ({ ...part, holder: page }));
}

function isSecretText(text: string): boolean
{
    return /^>[ \t]*\[!secret\]/i.test(text);
}

function secretKey(page: string, secret: string): string
{
    return `${comparableText(page)}#${comparableText(secret)}`;
}

/**
 * The names of what the player character lived, as the log keeps it: the characters and places of the scenes it was in, those closed and the open one, and where
 * it was moved from and to.
 */
function livedOf(root: string, pc: Page): string[]
{
    const isPc = (name: string): boolean => comparableText(parsePageReference(name).name) === comparableText(pc.name);
    const log = readLog(root);
    const closed = log.filter((entry) => entry.type === "scene-closed").map((entry) => entry.data as { place?: unknown; with?: unknown; left?: unknown; });
    const { scene } = readOpenScene(root);
    const scenes = [...closed, ...(scene === undefined ? [] : [{ place: scene.place, with: scene.with, left: scene.left }])];
    const met = scenes.flatMap((seen) => {
        const people = [...textList(seen.with), ...textList(seen.left)];
        return people.some(isPc) ? [...people, ...textList(seen.place)] : [];
    });
    const moved = log.filter((entry) => entry.type === "moved" && textList(entry.data.pages).some(isPc)).flatMap((entry) => {
        const from = entry.data.from !== null && typeof entry.data.from === "object" ? Object.entries(entry.data.from).filter(([name]) => isPc(name)).map(([, holder]) => holder) : [];
        return [...textList(from), ...textList(entry.data.to)];
    });
    return [...met, ...moved];
}

function textList(value: unknown): string[]
{
    return (Array.isArray(value) ? value : [value]).filter((item): item is string => typeof item === "string");
}
