// What a character knows, as the player's view and a character agent's read it (D-250, VIEW-2, VIEW-3, VIEW-10): the pages it knows and the text of each as it knows it;
// with more than one player character, what any of them knows, and who (VIEW-12).
import { type LogEntry, readLog } from "../../core/log.ts";
import { comparableText } from "../../core/text.ts";
import {
    baseChain,
    inheritedByBase,
    introductionText,
    isPartyMember,
    isPlayerCharacter,
    type Link,
    links,
    locate,
    type Page,
    pagesWithNameOrAlias,
    parsePageReference,
    partContent,
    playerCharacters,
    readSection,
    secretNames,
    stacksOf,
    systemPageNamed,
    textParts,
    textsIn,
    withLinksAsWords,
    withoutComments,
    type World,
} from "../../pages/index.ts";
import type { Scene } from "../../scene/index.ts";
import { readOpenScene } from "./scene.ts";

/** What a character knows: the pages, and the secrets by the page that writes them. */
export interface Knowledge
{
    /** Whose knowledge it is: the player character, the one in the foreground when there are more (VIEW-12), or another character for the character agent voicing them (VIEW-10). */
    pc: Page;
    pages: Set<Page>;
    /** "coppa#veleno": the secrets it discovered, by the page that writes them and their name, as comparable text. */
    secrets: Set<string>;
    /** With more than one player character, what each of them knows (VIEW-12): the pages and secrets above are what any of them knows. */
    each?: Knowledge[];
}

/** The player character: the first living character with role pc, else the first dead one; undefined before there is one. */
export function playerCharacter(world: World): Page | undefined
{
    const players = playerCharacters(world);
    return players.find((page) => page.fields.status !== "dead") ?? players[0];
}

/**
 * What the player characters know (VIEW-12): with one, its knowledge; with more, what any of them knows, living or dead, with what each does, and the one in the
 * foreground as whose it is. Undefined before there is one.
 */
export function playerKnowledge(root: string, world: World, wanted?: string): Knowledge | undefined
{
    const pc = foregroundCharacter(root, world, wanted);

    if (pc === undefined) {
        return undefined;
    }

    const players = playerCharacters(world);

    if (players.length === 1) {
        return knowledgeOf(root, world, pc);
    }

    // One read of the log for them all.
    const read = { log: readLog(root), scene: readOpenScene(root).scene };
    // A dead one knows what it knew at its death (D-480 (1)), while one of them lives.
    const living = players.some((player) => player.fields.status !== "dead");
    const each = players.map((player) => knowledgeOf(root, world, player, read, living && player.fields.status === "dead"));
    return { pc, pages: new Set(each.flatMap((one) => [...one.pages])), secrets: new Set(each.flatMap((one) => [...one.secrets])), each };
}

/** Who of the player characters knows a page, when more than one is played and only some of them do (VIEW-12); undefined otherwise. */
export function pageKnownBy(knowledge: Knowledge, page: Page): string[] | undefined
{
    return knownApart(knowledge, (one) => knowsPage(one, page));
}

/** Who of the player characters discovered a secret, by the page that writes it and its name, when more than one is played and only some of them did (VIEW-12). */
export function secretKnownBy(knowledge: Knowledge, page: Page, secret: string): string[] | undefined
{
    return knownApart(knowledge, (one) => one.secrets.has(secretKey(page.name, secret)));
}

/**
 * What a character knows (D-250, VIEW-10), the player's or another: what its knows lists, pages and the pages of its secrets; itself, the party when it is of it, and the
 * creatures they derive from (D-275, D-277), the quests the party took when it is of it, what it carries, the places around it, the characters and places of
 * the scenes it was in, and the places it was moved from and to, with those that hold them (D-316); the pages of the game system but its creatures, which anyone
 * may read (SYS-2). Never a creature of the campaign it was not told of. As it was at its death, for a dead player character beside the living (VIEW-12): the
 * place it died in, never where it was moved after, nor the scenes after.
 */
export function knowledgeOf(root: string, world: World, pc: Page, read?: LogRead, atDeath = false): Knowledge
{
    const lived = read ?? { log: readLog(root), scene: readOpenScene(root).scene };
    const carried = [pc, ...world.pages.filter((page) => locate(world, page).chain.includes(pc))];
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
        ...carried.filter((page) => page !== pc),
        // The kinds of the stacks it carries, as the campaign's Lembas (STK-12).
        ...carried.flatMap((holder) => stacksOf(world, holder).map((stack) => stack.kind)).filter((kind) => kind.system === undefined),
        ...(atDeath ? placesAtDeath(lived, world, pc) : locate(world, pc).chain),
        // The places it was in, and those that hold them, as the regions it crossed (D-316).
        ...livedOf(atDeath ? untilDeath(lived, pc) : lived, world, pc).flatMap((page) => (page.type === "place" ? [page, ...locate(world, page).chain] : page.type === "character" ? [page] : [])),
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
        ...readableParts(page),
        ...inheritedByBase(world, page).flatMap((group) => readableInherited(group).map((part) => ({ ...part, holder: group.base }))),
    ].filter((part) => isShown(knowledge, page, part));
    return inKnownWords(world, knowledge, withoutComments([knownIntroduction(world, knowledge, page), ...parts.map((part) => part.text)].filter((text) => text !== "").join("\n\n")));
}

/** The secrets a page's text shows (VIEW-3) that only some of the player characters discovered, when more than one is played, each by its name and with who (VIEW-12). */
export function knownSecretsApart(world: World, knowledge: Knowledge, page: Page): { secret: string; who: string[]; }[]
{
    const parts = [...partsOf(page), ...inheritedByBase(world, page).flatMap((group) => group.parts.map((part) => ({ ...part, holder: group.base })))];
    return parts.filter((part) => isSecretText(part.text) && isShown(knowledge, page, part)).flatMap((part) => {
        const who = secretKnownBy(knowledge, part.holder, part.name);
        return who === undefined ? [] : [{ secret: part.name, who }];
    });
}

/** A page's introduction as the character knows it (VIEW-3): its own, else that of its nearest base it knows; without comments. */
export function knownIntroduction(world: World, knowledge: Knowledge, page: Page): string
{
    const introduction = introductionText(page.translated ?? page.body)
        || (baseChain(world, page).filter((base) => knowsPage(knowledge, base)).map((base) => introductionText(base.translated ?? base.body)).find((text) => text !== "") ?? "");
    return inKnownWords(world, knowledge, withoutComments(introduction));
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
        return part?.secret === true ? [{ page: link.name, name: link.secret ?? "", text: inKnownWords(world, knowledge, withoutComments(part.content)) }] : [];
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
        return inKnownWords(world, knowledge, withoutComments(kept.map((inner) => inner.text).join("\n\n")));
    }

    return undefined;
}

/** Whether a page's own text, not its bases', tells the character something: its introduction, or a section or secret of it the character may read (VIEW-3). */
export function writesKnownText(knowledge: Knowledge, page: Page): boolean
{
    const said = (text: string | undefined): boolean => withoutComments(text ?? "").trim() !== "";
    return said(introductionText(page.body)) || partsOf(page).some((part) => isShown(knowledge, page, part) && said(partContent(page.body, part.name)?.content));
}

/** The links of a character's knows (REV-1), each with its page and the secret it names, as knownLink finds them. */
export function knownLinks(world: World, character: Page): KnownLink[]
{
    return textsIn(character.fields.knows).flatMap(links).map((link) => knownLink(world, link));
}

/** A link of knows with its page and secret (REV-1), found as knownLinks finds them. */
export interface KnownLink
{
    name: string;
    page?: Page;
    secret?: string;
}

/** One link as knows means it: its page, by a name or an alias (D-417), and the secret it names; of two pages by one name, the one that writes the secret. */
export function knownLink(world: World, link: Link): KnownLink
{
    const pages = pagesWithNameOrAlias(world, parsePageReference(link.page).name);
    const wanted = link.section === undefined || link.section === "" ? undefined : comparableText(link.section);

    for (const page of wanted === undefined ? [] : pages) {
        const secret = secretNames(page.body).find((name) => comparableText(name) === wanted);

        if (secret !== undefined) {
            return { name: page.name, page, secret };
        }
    }

    return { name: pages[0]?.name ?? link.page, ...(pages[0] === undefined ? {} : { page: pages[0] }), ...(link.section === undefined ? {} : { secret: link.section }) };
}

/** The texts of a field, one or a list, without what is not text. */
export function textList(value: unknown): string[]
{
    return (Array.isArray(value) ? value : [value]).filter((item): item is string => typeof item === "string");
}

/**
 * The player character in the foreground (VIEW-12), whose place, map and squares the view shows: the one named; else, of the living, the one whose turn it is in
 * the open scene, then one in the open scene, then the first; else the first. Undefined before there is one.
 */
function foregroundCharacter(root: string, world: World, wanted?: string): Page | undefined
{
    const players = playerCharacters(world);

    if (wanted !== undefined && wanted.trim() !== "") {
        const page = pagesWithNameOrAlias(world, parsePageReference(wanted).name).find(isPlayerCharacter);

        if (page === undefined) {
            throw new Error(`${wanted.trim()} is not a player character: give one of ${players.map((player) => player.name).join(", ") || "them, once there is one"}.`);
        }

        return page;
    }

    const living = players.filter((page) => page.fields.status !== "dead");
    const { scene } = readOpenScene(root);
    const named = (page: Page, name: string | undefined): boolean => name !== undefined && pagesWithNameOrAlias(world, parsePageReference(name).name)[0] === page;
    return living.find((page) => named(page, scene?.turn)) ?? living.find((page) => (scene?.with ?? []).some((link) => named(page, link))) ?? living[0] ?? players[0];
}

/** A text as the character may read it (VIEW-3): a link to a page it does not know, or to none, written as its words, so that no name tells the page exists. */
function inKnownWords(world: World, knowledge: Knowledge, text: string): string
{
    return withLinksAsWords(text, (link) => [...pagesWithNameOrAlias(world, link.page), systemPageNamed(world, link.page)].some((page) => page !== undefined && knowsPage(knowledge, page)));
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

/** A page's sections as the player reads them: a system's page in the campaign's language where it has it (D-542). */
function readableParts(page: Page): { name: string; text: string; holder: Page; }[]
{
    return textParts(page.translated ?? page.body).map((part) => ({ ...part, holder: page }));
}

/**
 * The sections a page inherits from a base as the player reads them: in the campaign's language when the base has it and every section of it reaches the page
 * (D-542), as the stat block of a wolf for a companion; else as the base writes them, since a section the page has of its own hides one by its English name.
 */
function readableInherited(group: { base: Page; parts: { name: string; text: string; }[]; }): { name: string; text: string; }[]
{
    return group.base.translated !== undefined && group.parts.length === textParts(group.base.body).length ? textParts(group.base.translated) : group.parts;
}

function isSecretText(text: string): boolean
{
    return /^[ \t]{0,3}>[ \t]*\[!secret\]/i.test(text);
}

/** The names of the player characters a test holds for, when more than one is played and not all of them pass it. */
function knownApart(knowledge: Knowledge, knows: (one: Knowledge) => boolean): string[] | undefined
{
    const knowers = knowledge.each?.filter(knows).map((one) => one.pc.name);
    return knowers === undefined || knowers.length === knowledge.each?.length ? undefined : knowers;
}

function secretKey(page: string, secret: string): string
{
    return `${comparableText(page)}#${comparableText(secret)}`;
}

/**
 * The pages of what the player character lived, as the log keeps it: the characters and places of the scenes it was in, those closed and the open one, and where
 * it was moved from and to; never one the master gave only by what the character sees of them, in any scene (D-416, VIEW-2).
 */
function livedOf({ log, scene }: LogRead, world: World, pc: Page): Page[]
{
    const pageOf = (name: string): Page | undefined => pagesWithNameOrAlias(world, parsePageReference(name).name)[0];
    const isPc = (name: string): boolean => pageOf(name) === pc;
    const closed = log.filter((entry) => entry.type === "scene-closed").map((entry) => entry.data as { place?: unknown; with?: unknown; left?: unknown; unnamed?: unknown; });
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

/** The log up to a character's death, the last line that wrote it dead, and no open scene; the whole log when no line did, as for one written dead by hand. */
function untilDeath({ log }: LogRead, page: Page): LogRead
{
    const died = log.findLastIndex((entry) => {
        const set = entry.data.set as Record<string, unknown> | undefined;
        return ["page-created", "page-updated"].includes(entry.type) && comparableText(String(entry.data.page ?? "")) === comparableText(page.name) && set?.status === "dead";
    });
    return { log: died < 0 ? log : log.slice(0, died), scene: undefined };
}

/** Where a dead character lay when it died, and what holds it: where it was moved from by the first move after its death, else where it is. */
function placesAtDeath(read: LogRead, world: World, page: Page): Page[]
{
    const before = untilDeath(read, page).log.length;
    const named = (name: unknown): boolean => comparableText(String(name)) === comparableText(page.name);
    const moved = read.log.slice(before).find((entry) => entry.type === "moved" && textList(entry.data.pages).some(named));
    const from = moved?.data.from !== null && typeof moved?.data.from === "object" ? Object.entries(moved.data.from).find(([name]) => named(name))?.[1] : undefined;
    const holder = typeof from === "string" ? pagesWithNameOrAlias(world, parsePageReference(from).name)[0] : undefined;
    return moved === undefined ? locate(world, page).chain : holder === undefined ? [] : [holder, ...locate(world, holder).chain];
}

/** The log and the open scene, read once for what several characters lived. */
interface LogRead
{
    log: LogEntry[];
    scene: Scene | undefined;
}
