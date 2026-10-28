import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry, readLog } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText, withArticle } from "../core/text.ts";
import { baseChain, isEmptyField, isPartyMember, isPlayerCharacter, links, locate, type Page, pageNamed, parsePageReference, playerCharacters, secretNames, shownPart, systemLabel, withPage, type World, writePage } from "../pages/index.ts";
import type { Scene } from "../scene/index.ts";
import { placedPosition } from "./shared/positions.ts";
import { copyName, readOpenScene } from "./shared/scene.ts";
import { newDatedLogEntry } from "./shared/time.ts";
import { campaignWorld } from "./shared/world.ts";

// A list, or one text, as an MCP client may send it.
const textList = z.union([z.string(), z.array(z.string())]);

/** Something that can be learned, as knows records it: a page, or one of its secrets where it is written (REV-1, REV-2); or a section everyone can read. */
type Learnable = { kind: "known"; link: string; shown: string; asked?: string; } | { kind: "public"; shown: string; page: string; };

/** What reveal recorded, as its output tells it (REV-3): and the places the player's character now knows that have no point on the map, with one that has (D-319). */
interface RevealResult
{
    learned: { who: string; what: string[]; }[];
    known: { who: string; what: string[]; }[];
    notSecret: { what: string; page: string; }[];
    unplaced?: { places: string[]; from?: string; };
}

export const reveal = defineCommand({
    name: "reveal",
    description: "Record what characters learn: a secret, as Page#Secret, or a whole page they did not know. "
        + "Use it as soon as a character learns it. It adds the links to their knows and answers without the text: read a secret with show before you tell it. "
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
        let world = campaignWorld(root, context);
        const { scene } = readOpenScene(root);
        const asked = listOf(input.page);

        if (asked.length === 0) {
            throw new Error("Give what they learn, such as page Coppa#Veleno, or a whole page such as Varro.");
        }

        // An empty to, as an MCP client may send it, is left out.
        const to = input.to === undefined ? [] : listOf(input.to);
        const learners = to.length === 0 ? [playerCharacter(world)] : [...new Set(to.map((name) => learnerOf(world, scene, name)))];
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

            let written: ReturnType<typeof writePage>;

            try {
                written = writePage(world, learner.name, undefined, { add: { knows: learned.map((item) => item.link) } });
            } catch (error) {
                // Those already written have their lines, so that the diary knows who learned it.
                logLearned(root, context, world, lines);
                const before = result.learned.map((one) => one.who);
                const done = before.length === 0 ? "" : ` ${before.join(", ")} learned it, and the log says so.`;
                throw new Error(`${learner.name}'s page could not be written: ${error instanceof Error ? error.message : String(error)}.${done} Fix the file, then reveal it again for ${learner.name}.`);
            }

            world = withPage(world, learner, written.page);
            lines.push({ learner, links: learned.map((item) => item.link) });
            result.learned.push({ who: learner.name, what: learned.map((item) => (item.asked === undefined ? item.shown : `${item.shown} (as ${item.asked} shows it)`)) });
        }

        logLearned(root, context, world, lines);
        const unplaced = unplacedPlaces(world, lines);
        return unplaced === undefined ? result : { ...result, unplaced };
    },

    format(result)
    {
        const learned = result.learned.map((entry) => `${entry.who} now knows ${entry.what.join(", ")}.`);
        const known = result.known.length === 0 ? "" : `Already known: ${result.known.map((entry) => `${entry.who}: ${entry.what.join(", ")}`).join("; ")}.`;
        const notSecret = result.notSecret.length === 0 ? "" : `Not secrets, nothing to record: ${result.notSecret.map((entry) => `${entry.what} (whoever knows ${entry.page} knows it)`).join(", ")}.`;
        const unplaced = result.unplaced === undefined ? "" : placesNote(result.unplaced.places, result.unplaced.from);
        return [...(learned.length === 0 ? ["Nothing new to record."] : learned), known, notSecret, unplaced].filter((line) => line !== "").join(" ");
    },
});

/**
 * One line in the log for each who learned something (REV-3, D-158): public only for what the player's character knows, theirs and a companion's who learned it
 * with them; what someone else learned alone stays hidden, since a secret's name may tell too much.
 */
function logLearned(root: string, context: Context, world: World, lines: { learner: Page; links: string[]; }[]): void
{
    const players = playerCharacters(world);
    const playerKnows = (link: string): boolean => players.some((player) => knowsLink(player, link));

    for (const { learner, links: learned } of lines) {
        const visible = isPlayerCharacter(learner) || (isPartyMember(learner) && learned.every(playerKnows));
        appendLogEntry(root, newDatedLogEntry(root, context, "learned", visible ? "public" : "hidden", { page: learner.name, knows: learned }));
    }
}

/**
 * The places the player's character just learned of that have no point on the map, neither their own nor from a place that holds them (D-319), as a found map
 * may bring; and a place with a position to give theirs from. Undefined when there is none.
 */
function unplacedPlaces(world: World, lines: { learner: Page; links: string[]; }[]): RevealResult["unplaced"]
{
    // What any player character learned (VIEW-12).
    const players = lines.filter((line) => isPlayerCharacter(line.learner));
    const player = players[0];
    const places = [...new Set(players.flatMap((line) => line.links))].flatMap((link) => links(link)).filter((link) => link.section === undefined).flatMap((link) => {
        const page = pageNamed(world, link.page);
        return page?.type === "place" && page.fields.stops === undefined && [page, ...locate(world, page).chain].every((holder) => placedPosition(world, holder) === undefined) ? [page.name] : [];
    });

    if (player === undefined || places.length === 0) {
        return undefined;
    }

    const from = [...locate(world, player.learner).chain, ...world.pages].find((page) => placedPosition(world, page) !== undefined)?.name;
    return { places, ...(from === undefined ? {} : { from }) };
}

/** What reveal says of places with no point on the map: they are not on it until they have a position, given from a place that has one (POS-2). */
function placesNote(places: string[], from: string | undefined): string
{
    const example = `write ${places[0]}, set position="12 km NE of [[${from ?? "a place with a position"}]]"`;
    return `${places.join(", ")} ${places.length === 1 ? "has" : "have"} no position, so the map does not show ${places.length === 1 ? "it" : "them"} yet: give one from a place that has one, such as ${example}.`;
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

    if (page.system !== undefined) {
        throw new Error(`${page.name} is ${systemLabel(page)}: it holds no secrets, and anyone may know what it says. Nothing recorded.`);
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
    // A dead one learns nothing more, beside the living (VIEW-12).
    const all = playerCharacters(world);
    const living = all.filter((page) => page.fields.status !== "dead");
    const players = living.length > 0 ? living : all;

    if (players.length !== 1) {
        throw new Error(
            players.length === 0 ? "There is no player's character: give who learns it with to." : `There are ${players.length} player characters, ${players.map((page) => page.name).join(" and ")}: give who learns it with to.`,
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
