import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry, readLog } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, withArticle } from "../core/text.ts";
import { baseChain, isEmptyField, isPartyMember, links, loadWorld, type Page, pageNamed, parsePageReference, secretNames, shownPart, withPage, type World, writePage } from "../pages/index.ts";
import type { Scene } from "../scene/index.ts";
import { copyName, readOpenScene } from "./game-scene.ts";
import { newDatedLogEntry } from "./game-time.ts";

// A list, or one text, as an MCP client may send it.
const textList = z.union([z.string(), z.array(z.string())]);

/** Something that can be learned, as knows records it: a page, or one of its secrets where it is written (REV-1, REV-2); or a section everyone can read. */
type Learnable = { kind: "known"; link: string; shown: string; asked?: string; } | { kind: "public"; shown: string; page: string; };

/** What reveal recorded, as its output tells it (REV-3). */
interface RevealResult
{
    learned: { who: string; what: string[]; }[];
    known: { who: string; what: string[]; }[];
    notSecret: { what: string; page: string; }[];
}

export const reveal = defineCommand({
    name: "reveal",
    description: "Record what characters learn: a secret, as Page#Secret, or a whole page they did not know; for one or more characters, the player's character if left out. "
        + "Use it as soon as a character learns it. It adds the links to their knows and answers in one line, without the text: read a secret with show before you tell it. "
        + "Example: page [Coppa#Veleno, Varro], to [Ettore, Bruna].",
    group: "game",
    positionals: ["page"],
    input: z.object({
        page: textList.describe("what they learn: Page#Secret, or a whole Page; one or a list"),
        to: textList.optional().describe("who learns it: one or more characters, companions too when they learn it; the player's character alone if left out"),
    }),

    run(input, context): RevealResult
    {
        const root = requireCampaign(context.folder);
        let world = loadWorld(root);
        const { scene } = readOpenScene(root);
        const asked = listOf(input.page);

        if (asked.length === 0) {
            throw new Error("Give what they learn, such as page Coppa#Veleno, or a whole page such as Varro.");
        }

        // An empty to, as an MCP client may send it, is left out.
        const to = input.to === undefined ? [] : listOf(input.to);
        const learners = to.length === 0 ? [playerCharacter(world)] : unique(to.map((name) => learnerOf(world, scene, name)));
        const found = asked.map((item) => learnableOf(root, world, item));
        const known = found.filter((item) => item.kind === "known").filter((item, index, all) => all.findIndex((other) => sameLink(other.link, item.link)) === index);
        learners.forEach(checkKnows);
        const result: RevealResult = { learned: [], known: [], notSecret: found.filter((item) => item.kind === "public").map((item) => ({ what: item.shown, page: item.page })) };
        const lines: { learner: Page; links: string[]; }[] = [];

        for (const learner of learners) {
            const already = known.filter((item) => knowsLink(learner, item.link));
            const learned = known.filter((item) => !already.includes(item));

            if (already.length > 0) {
                result.known.push({ who: learner.name, what: already.map((item) => item.shown) });
            }

            if (learned.length === 0) {
                continue;
            }

            const written = writePage(world, learner.name, undefined, { add: { knows: learned.map((item) => item.link) } });
            world = withPage(world, learner, written.page);
            lines.push({ learner, links: learned.map((item) => item.link) });
            result.learned.push({ who: learner.name, what: learned.map((item) => (item.asked === undefined ? item.shown : `${item.shown} (as ${item.asked} shows it)`)) });
        }

        logLearned(root, context, world, lines);
        return result;
    },

    format(result)
    {
        const learned = result.learned.map((entry) => `${entry.who} now knows ${entry.what.join(", ")}.`);
        const known = result.known.length === 0 ? "" : `Already known: ${result.known.map((entry) => `${entry.who}: ${entry.what.join(", ")}`).join("; ")}.`;
        const notSecret = result.notSecret.length === 0 ? "" : `Not secrets, nothing to record: ${result.notSecret.map((entry) => `${entry.what} (whoever knows ${entry.page} knows it)`).join(", ")}.`;
        return [...(learned.length === 0 ? ["Nothing new to record."] : learned), known, notSecret].filter((line) => line !== "").join(" ");
    },
});

/**
 * One line in the log for each who learned something (REV-3, D-158): public only for what the player's character knows, theirs and a companion's who learned it
 * with them; what someone else learned alone stays hidden, since a secret's name may tell too much.
 */
function logLearned(root: string, context: Context, world: World, lines: { learner: Page; links: string[]; }[]): void
{
    const players = world.pages.filter((page) => page.type === "character" && page.fields.role === "pc");
    const playerKnows = (link: string): boolean => players.some((player) => knowsLink(player, link));

    for (const { learner, links: learned } of lines) {
        const visible = learner.fields.role === "pc" || (isPartyMember(learner) && learned.every(playerKnows));
        appendLogEntry(root, newDatedLogEntry(root, context, "learned", visible ? "public" : "hidden", { page: learner.name, knows: learned }));
    }
}

/** What a name gives to learn (REV-2): a page, a secret where it is written, or a public section to skip. Anything that does not exist stops the command. */
function learnableOf(root: string, world: World, item: string): Learnable
{
    const reference = parsePageReference(item);

    if (reference.section === "") {
        throw new Error(`Give the secret's name after #, such as ${reference.name}#Name: a secret without a name cannot be revealed until it has one. Nothing recorded.`);
    }

    const page = pageNamed(world, reference.name);

    if (page === undefined) {
        const roll = readLog(root).some((entry) => entry.type === "roll" && entry.visibility === "hidden" && entry.id === reference.name);
        const why = roll ? `${reference.name} is a hidden roll: show its result with roll, reveal ${reference.name}.` : `There is no page named ${reference.name}: ${listHint(reference.name, "page") ?? "look for it with find."}`;
        throw new Error(`${why} Nothing recorded.`);
    }

    if (reference.section === undefined) {
        return { kind: "known", link: `[[${page.name}]]`, shown: page.name };
    }

    const part = shownPart(world, page, reference.section);

    if (part === undefined) {
        throw new Error(`${missingSecret(world, page, reference.section)} Nothing recorded.`);
    }

    const shown = `${part.holder.name}#${part.title}`;
    return part.secret ? { kind: "known", link: `[[${shown}]]`, shown, asked: part.holder === page ? undefined : page.name } : { kind: "public", shown: `${page.name}#${part.title}`, page: page.name };
}

/** What a page that lacks a secret has instead, and how to give it one: its secrets and those of its bases, and those without a name. */
function missingSecret(world: World, page: Page, name: string): string
{
    const holders = [page, ...baseChain(world, page)];
    const named = holders.flatMap((holder) => secretNames(holder.body).filter((title) => title !== "").map((title) => (holder === page ? title : `${title} (from ${holder.name})`)));
    const listed = named.length === 0 ? "It has no secrets." : `Its secrets: ${named.join(", ")}.`;
    const nameless = holders.some((holder) => secretNames(holder.body).includes("")) ? " It has a secret without a name: give it one, as > [!secret] Name, to reveal it." : "";
    return `${page.name} has no section or secret "${name}". ${listed}${nameless} To write a new one, write ${page.name}#Name with secret and its text.`;
}

/** Who learns, when not said: the player's character, when there is one only (REV-2). */
function playerCharacter(world: World): Page
{
    const players = world.pages.filter((page) => page.type === "character" && page.fields.role === "pc");

    if (players.length !== 1) {
        throw new Error(
            players.length === 0 ? "There is no player's character: give who learns it with to." : `There are ${players.length} player's characters, ${players.map((page) => page.name).join(" and ")}: give who learns it with to.`,
        );
    }

    return players[0];
}

/** A character who learns: only characters know things (REV-1); a copy in the open scene keeps nothing of its own. */
function learnerOf(world: World, scene: Scene | undefined, name: string): Page
{
    const reference = parsePageReference(name).name;
    const copy = copyName(world, scene, reference);

    if (copy !== undefined) {
        throw new Error(`${copy} is a copy in the open scene, which keeps nothing of its own: only characters know things. Nothing recorded.`);
    }

    const page = pageNamed(world, reference);

    if (page?.type !== "character") {
        throw new Error(
            page === undefined
                ? `There is no character named ${reference}: ${listHint(reference, "to") ?? "look for them with find."} Nothing recorded.`
                : `${page.name} is ${withArticle(page.type ?? "free page")}: only characters know things. Nothing recorded.`,
        );
    }

    return page;
}

/** knows takes items only as a list of links: one written otherwise stops the command before anything is written, for everyone. */
function checkKnows(learner: Page): void
{
    const knows = learner.fields.knows;

    if (!isEmptyField(knows) && !Array.isArray(knows)) {
        throw new Error(`knows on ${learner.name} is ${JSON.stringify(knows)}, not a list: write it as one first, such as write ${learner.name}, set knows=[[A]], [[B]]. Nothing recorded.`);
    }

    const entries: unknown[] = Array.isArray(knows) ? knows : [];
    const wrong = entries.find((entry) => typeof entry !== "string" || !/^\[\[[^\]]+\]\]$/.test(entry.trim()));

    if (wrong !== undefined) {
        const rewritten = entries.flatMap(linksOfEntry);
        const fix = rewritten.length === 0 ? `write ${learner.name}, unset knows` : `write ${learner.name}, set knows=${rewritten.join(", ")}`;
        throw new Error(`knows on ${learner.name} holds ${JSON.stringify(wrong)}, which is not a link: write the list again first, such as ${fix}. Nothing recorded.`);
    }
}

/** The links an entry of knows holds, as links: those in a text, or the one YAML reads as a list in a list from [[Page]] written without quotes. */
function linksOfEntry(entry: unknown): string[]
{
    if (typeof entry === "string") {
        return links(entry).map((link) => `[[${link.page}${link.section === undefined ? "" : `#${link.section}`}]]`);
    }

    const inner: unknown = Array.isArray(entry) && entry.length === 1 ? entry[0] : undefined;
    return Array.isArray(inner) && inner.length === 1 && typeof inner[0] === "string" ? [`[[${inner[0]}]]`] : [];
}

/** How to give more than one name, when a name with commas names no page: a list sent as one text, as some clients do; undefined for any other name. */
function listHint(name: string, field: "page" | "to"): string | undefined
{
    return name.includes(",") ? `for more than one, give a list, such as ${field} [${name.split(",").map((part) => part.trim()).join(", ")}].` : undefined;
}

/** Whether a character's knows holds a link, however written. */
function knowsLink(learner: Page, link: string): boolean
{
    const knows = learner.fields.knows;
    return (Array.isArray(knows) ? knows : []).some((entry) => typeof entry === "string" && sameLink(entry, link));
}

/** Whether two texts are the same link: [[coppa#veleno]] and [[Coppa#Veleno]]. */
function sameLink(first: string, second: string): boolean
{
    const key = (text: string): string => links(text).map((link) => comparableText(`${link.page}#${link.section ?? ""}`)).join("|");
    return key(first) !== "" && key(first) === key(second);
}

function listOf(value: string | string[]): string[]
{
    return (typeof value === "string" ? [value] : value).filter((item) => item.trim() !== "");
}

function unique(pages: Page[]): Page[]
{
    return pages.filter((page, index) => pages.indexOf(page) === index);
}
