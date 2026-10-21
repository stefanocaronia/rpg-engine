// What a character knows, as the player's view and a character agent's read it (D-250, VIEW-2, VIEW-3, VIEW-10): the pages it knows and the text of each as it knows it.
import { readLog } from "../core/log.ts";
import { comparableText } from "../core/text.ts";
import {
    baseChain,
    inheritedByBase,
    introductionText,
    isPartyMember,
    links,
    locate,
    type Page,
    pagesWithNameOrAlias,
    parsePageReference,
    partContent,
    readSection,
    secretNames,
    stacksOf,
    textParts,
    textsIn,
    withoutComments,
    type World,
} from "../pages/index.ts";
import { readOpenScene } from "./game-scene.ts";

/** What a character knows: the pages, and the secrets by the page that writes them. */
export interface Knowledge
{
    /** Whose knowledge it is: the player character, or another character for the character agent voicing them (VIEW-10). */
    pc: Page;
    pages: Set<Page>;
    /** "coppa#veleno": the secrets it discovered, by the page that writes them and their name, as comparable text. */
    secrets: Set<string>;
}

/** The player character: the first living character with role pc, else the first dead one; undefined before there is one. */
export function playerCharacter(world: World): Page | undefined
{
    const players = world.pages.filter((page) => page.type === "character" && page.fields.role === "pc");
    return players.find((page) => page.fields.status !== "dead") ?? players[0];
}

/**
 * What a character knows (D-250, VIEW-10), the player's or another: what its knows lists, pages and the pages of its secrets; itself, the party when it is of it, and the
 * creatures they derive from (D-275, D-277), the quests the party took when it is of it, what it carries, the places around it, the characters and places of
 * the scenes it was in, and the places it was moved from and to, with those that hold them (D-316); the pages of the game system but its creatures, which anyone
 * may read (SYS-2). Never a creature of the campaign it was not told of.
 */
export function knowledgeOf(root: string, world: World, pc: Page): Knowledge
{
    // A link in knows, to a page or to one of its secrets, read with its secret (REV-1).
    const known = knownLinks(world, pc);
    const secrets = new Set(known.flatMap((link) => (link.secret === undefined ? [] : [secretKey(link.name, link.secret)])));
    const member = isPartyMember(pc);
    const pages = new Set<Page>([
        pc,
        // A secret discovered makes its page known, but a creature's: the secret is known, the creature's numbers stay the master's (D-254).
        ...known.flatMap((link) => (link.page === undefined || (link.secret !== undefined && link.page.type === "creature") ? [] : [link.page])),
        // The party, and the creatures its members derive from: the player knows a companion's stat block and the race of the character (D-275, D-277).
        ...[pc, ...(member ? world.pages.filter((page) => page.type === "character" && isPartyMember(page)) : [])].flatMap((page) => [
            page,
            ...baseChain(world, page).filter((base) => base.type === "creature"),
        ]),
        // The quests the player took (D-250).
        ...(member ? world.pages.filter((page) => page.type === "quest" && ["open", "done", "failed"].includes(String(page.fields.status))) : []),
        ...world.pages.filter((page) => page !== pc && locate(world, page).chain.includes(pc)),
        // The kinds of the stacks it carries, as the campaign's Lembas (STK-12).
        ...[pc, ...world.pages.filter((page) => locate(world, page).chain.includes(pc))].flatMap((holder) => stacksOf(world, holder).map((stack) => stack.kind)).filter((kind) => kind.system === undefined),
        ...locate(world, pc).chain,
        // The places it was in, and those that hold them, as the regions it crossed (D-316).
        ...livedOf(root, world, pc).flatMap((page) => (page.type === "place" ? [page, ...locate(world, page).chain] : page.type === "character" ? [page] : [])),
    ]);
    return { pc, pages, secrets };
}

/** Whether the player character knows a page: one of the campaign it knows, or one of the game system but a creature (D-250). */
export function knowsPage(knowledge: Knowledge, page: Page): boolean
{
    return knowledge.pages.has(page) || (page.system !== undefined && page.type !== "creature");
}

/**
 * A page's text as the player character knows it (VIEW-3): its introduction, or that of its nearest base it knows; its sections and those it shows from the bases
 * it knows (INH-13), never a creature's (D-254); of the secrets, only those discovered, recorded by the page that writes them (REV-2), from any base. A secret
 * without a name is never known; comments are left out (LNK-2).
 */
export function knownText(world: World, knowledge: Knowledge, page: Page): string
{
    const parts = [
        ...partsOf(page),
        ...inheritedByBase(world, page).flatMap((group) => group.parts.map((part) => ({ ...part, holder: group.base }))),
    ].filter((part) => isShown(knowledge, page, part));
    return withoutComments([knownIntroduction(world, knowledge, page), ...parts.map((part) => part.text)].filter((text) => text !== "").join("\n\n"));
}

/** A page's introduction as the character knows it (VIEW-3): its own, else that of its nearest base it knows; without comments. */
export function knownIntroduction(world: World, knowledge: Knowledge, page: Page): string
{
    const introduction = introductionText(page.body) || (baseChain(world, page).filter((base) => knowsPage(knowledge, base)).map((base) => introductionText(base.body)).find((text) => text !== "") ?? "");
    return withoutComments(introduction);
}

/**
 * The secrets the character discovered on pages not its own nor its bases', whose text its own page shows (VIEW-10): each by its page and its name there, with
 * its text; none it cannot read.
 */
export function discoveredSecrets(world: World, knowledge: Knowledge): { page: string; name: string; text: string; }[]
{
    const own = new Set([knowledge.pc, ...baseChain(world, knowledge.pc)]);
    return knownLinks(world, knowledge.pc).flatMap((link) => {
        const part = link.page === undefined || (link.secret ?? "") === "" || own.has(link.page) ? undefined : partContent(link.page.body, link.secret ?? "");
        return part?.secret === true ? [{ page: link.name, name: link.secret ?? "", text: withoutComments(part.content) }] : [];
    });
}

/** The scenes closed so far that a character was in, as the log keeps them (VIEW-10): with the game date, the title and the summary, the oldest first. */
export function scenesLivedBy(root: string, world: World, page: Page): { date?: string; title: string; summary: string; }[]
{
    const isSelf = (name: string): boolean => pagesWithNameOrAlias(world, parsePageReference(name).name)[0] === page;
    return readLog(root).filter((entry) => entry.type === "scene-closed").flatMap((entry) => {
        const data = entry.data as { title?: unknown; summary?: unknown; with?: unknown; left?: unknown; };
        const present = [...textList(data.with), ...textList(data.left)].some(isSelf);
        return present && typeof data.title === "string" ? [{ ...(entry.date === undefined ? {} : { date: entry.date }), title: data.title, summary: typeof data.summary === "string" ? data.summary : "" }] : [];
    });
}

/** The player character's story as the player sees it on the dashboard (D-373): the opening text of its page, without its secrets and comments, the master's. */
export function playerStory(page: Page): string
{
    return withoutComments(introductionText(page.body));
}

/**
 * The section or secret of a page the player character knows by this name (VIEW-3): a section whole, with its subsections and the secrets in it it discovered;
 * from a base, only one it knows, or a secret it discovered. Undefined when it knows none.
 */
export function knownPart(world: World, knowledge: Knowledge, page: Page, name: string): string | undefined
{
    const wanted = comparableText(name.trim());

    for (const holder of [page, ...baseChain(world, page)]) {
        const part = partsOf(holder).find((candidate) => comparableText(candidate.name) === wanted);

        if (part === undefined) {
            continue;
        }

        if (!isShown(knowledge, page, part)) {
            return undefined;
        }

        const whole = isSecretText(part.text) ? part.text : (readSection(holder.body, part.name) ?? part.text);
        const kept = isSecretText(part.text) ? [part] : partsOf({ ...holder, body: whole }).map((inner) => ({ ...inner, holder })).filter((inner) => isShown(knowledge, page, inner));
        return withoutComments(kept.map((inner) => inner.text).join("\n\n"));
    }

    return undefined;
}

/** Whether a part shows to the player character: a secret it discovered, or a section of the page or of a base it knows (D-254). */
function isShown(knowledge: Knowledge, page: Page, part: { name: string; text: string; holder: Page; }): boolean
{
    return isSecretText(part.text) ? knowledge.secrets.has(secretKey(part.holder.name, part.name)) : part.holder === page || knowsPage(knowledge, part.holder);
}

/** The sections and secrets of a page's own text, each with the page. */
function partsOf(page: Page): { name: string; text: string; holder: Page; }[]
{
    return textParts(page.body).map((part) => ({ ...part, holder: page }));
}

function isSecretText(text: string): boolean
{
    return /^[ \t]{0,3}>[ \t]*\[!secret\]/i.test(text);
}

/**
 * The links of a character's knows (REV-1), each with its page, found by a name or an old one among its aliases (D-417), and the secret it names, as that page
 * writes it: of two pages by one name, the one that writes the secret.
 */
function knownLinks(world: World, character: Page): { name: string; page?: Page; secret?: string; }[]
{
    return textsIn(character.fields.knows).flatMap(links).map((link) => {
        const pages = pagesWithNameOrAlias(world, parsePageReference(link.page).name);
        const wanted = link.section === undefined || link.section === "" ? undefined : comparableText(link.section);

        for (const page of wanted === undefined ? [] : pages) {
            const secret = secretNames(page.body).find((name) => comparableText(name) === wanted);

            if (secret !== undefined) {
                return { name: page.name, page, secret };
            }
        }

        return { name: pages[0]?.name ?? link.page, ...(pages[0] === undefined ? {} : { page: pages[0] }), ...(link.section === undefined ? {} : { secret: link.section }) };
    });
}

function secretKey(page: string, secret: string): string
{
    return `${comparableText(page)}#${comparableText(secret)}`;
}

/**
 * The pages of what the player character lived, as the log keeps it: the characters and places of the scenes it was in, those closed and the open one, and where
 * it was moved from and to; never one the master gave only by what the character sees of them, in any scene (D-416, VIEW-2).
 */
function livedOf(root: string, world: World, pc: Page): Page[]
{
    const pageOf = (name: string): Page | undefined => pagesWithNameOrAlias(world, parsePageReference(name).name)[0];
    const isPc = (name: string): boolean => pageOf(name) === pc;
    const log = readLog(root);
    const closed = log.filter((entry) => entry.type === "scene-closed").map((entry) => entry.data as { place?: unknown; with?: unknown; left?: unknown; unnamed?: unknown; });
    const { scene } = readOpenScene(root);
    const scenes = [...closed, ...(scene === undefined ? [] : [{ place: scene.place, with: scene.with, left: scene.left, unnamed: Object.keys(scene.seen ?? {}) }])];
    const unnamed = new Set(scenes.flatMap((one) => textList(one.unnamed).flatMap((name) => pageOf(name) ?? [])));
    const met = scenes.flatMap((one) => {
        const people = [...textList(one.with), ...textList(one.left)];
        return people.some(isPc) ? [...people, ...textList(one.place)] : [];
    });
    const moved = log.filter((entry) => entry.type === "moved" && textList(entry.data.pages).some(isPc)).flatMap((entry) => {
        const from = entry.data.from !== null && typeof entry.data.from === "object" ? Object.entries(entry.data.from).filter(([name]) => isPc(name)).map(([, holder]) => holder) : [];
        return [...textList(from), ...textList(entry.data.to)];
    });
    return [...met, ...moved].flatMap((name) => pageOf(name) ?? []).filter((page) => !unnamed.has(page));
}

function textList(value: unknown): string[]
{
    return (Array.isArray(value) ? value : [value]).filter((item): item is string => typeof item === "string");
}
