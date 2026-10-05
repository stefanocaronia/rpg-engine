import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { comparableText } from "../core/text.ts";
import { isInParty, loadWorld, locate, type Page, pageNamed, pageTypeNames, parsePageReference, type World } from "../pages/index.ts";
import type { Scene } from "../scene/index.ts";
import { type Surrounding, surroundings, surroundingsChange } from "./game-environment.ts";
import { movePages } from "./game-moves.ts";
import { copyName, readOpenScene, updateScene } from "./game-scene.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { shortList, skippedPagesNote } from "./notes.ts";

// A list, or one text, as an MCP client may send it.
const textList = z.union([z.string(), z.array(z.string())]);

/** What move did, as its output tells it (CON-8, ENV-5). */
interface MoveResult
{
    moved: string[];
    /** Those that were already only there. */
    already: string[];
    to: string;
    /** The destination and what holds it, nearest first. */
    chain: string[];
    /** The other characters right in the destination. */
    there: string[];
    /** What changes around the characters who moved. */
    here: string[];
    noLonger: string[];
    notes: string[];
    problems: string[];
}

export const move = defineCommand({
    name: "move",
    description: "Move characters, items or places into a place, a character's inventory or an item: whenever someone or something goes somewhere, before you narrate it. "
        + "Each ends up only there, wherever it was before, and conditions such as party in [[Ossario]] fire; it says where they are now, who else is there and what changes around them. "
        + "Time does not pass: advance does that. "
        + "Example: page [Ettore, Lena], to Ossario.",
    group: "game",
    positionals: ["page"],
    input: z.object({
        page: textList.describe("what moves: one or more characters, items or places, such as [Ettore, Lena]"),
        to: z.string().describe("where: a place; for items, also a character who carries them or an item that holds them"),
    }),

    run(input, context): MoveResult
    {
        const root = requireCampaign(context.folder);
        const world = loadWorld(root);
        const { scene } = readOpenScene(root);
        const names = (typeof input.page === "string" ? [input.page] : input.page).filter((name) => name.trim() !== "");

        if (names.length === 0) {
            throw new Error("Give what moves, such as page Ettore.");
        }

        const pages = names.map((name) => pageOf(world, scene, name, "what")).filter((page, index, all) => all.indexOf(page) === index);
        const destination = pageOf(world, scene, input.to, "where");
        // The characters who go, by themselves or inside a place that goes, such as a cart or a ship (CON-8, ENV-5).
        const riders = world.pages.filter((page) => page.type === "character" && (pages.includes(page) || locate(world, page).chain.some((holder) => pages.includes(holder))));
        const before = new Map(riders.map((page) => [page.path, surroundings(world, page)]));
        const done = movePages(root, context, world, pages, destination);
        const after = done.world;
        const now = (page: Page): Page => after.pages.find((other) => other.path === page.path) ?? page;
        const target = now(destination);
        const moved = new Set(done.moved.map((page) => page.path));
        const changes = riders.map((page) => surroundingsChange(before.get(page.path) ?? [], surroundings(after, now(page))));
        const went = riders.filter((page) => moved.has(page.path) || locate(world, page).chain.some((holder) => moved.has(holder.path)));
        const sceneNote = scene === undefined ? undefined : followParty(root, context, after, scene, went, target);
        // Who else is there matters to characters who arrive (CON-8), not to things.
        const there = riders.length === 0 ? [] : after.pages.filter((page) => page.type === "character" && !pages.some((other) => other.path === page.path) && locate(after, page).chain[0] === target);
        return {
            moved: done.moved.map((page) => page.name),
            already: pages.filter((page) => !moved.has(page.path)).map((page) => page.name),
            to: target.name,
            chain: [target, ...locate(after, target).chain].map((page) => page.name),
            there: there.map((page) => (page.fields.status === "dead" ? `${page.name} (dead)` : page.name)),
            here: distinctTexts(changes.flatMap((change) => change.here)),
            noLonger: distinctTexts(changes.flatMap((change) => change.noLonger)),
            notes: [...done.notes, ...(sceneNote === undefined ? [] : [sceneNote])],
            problems: world.problems,
        };
    },

    format(result)
    {
        if (result.moved.length === 0) {
            return [`Nothing changed: ${result.already.join(", ")} ${result.already.length === 1 ? "is" : "are"} already in ${result.to}.`, skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
        }

        const already = result.already.length === 0 ? "" : ` Already there: ${result.already.join(", ")}.`;
        const there = result.there.length === 0 ? "" : ` There: ${shortList(result.there, ", ")}.`;
        const around = [result.here.length === 0 ? "" : `Here: ${result.here.join(" · ")}.`, result.noLonger.length === 0 ? "" : `No longer: ${result.noLonger.join(" · ")}.`].filter((part) => part !== "").join(" ");
        const lines = [`Moved ${result.moved.join(", ")}: now in ${result.chain.join(" › ")}.${already}${there}`, around, ...result.notes];
        return [lines.filter((line) => line !== "").join("\n"), skippedPagesNote(result.problems)].filter((block) => block !== "").join("\n\n");
    },
});

/** The page that moves, or where it goes: by name or alias, never a copy in the open scene, which has no place of its own (CON-3). */
function pageOf(world: World, scene: Scene | undefined, name: string, role: "what" | "where"): Page
{
    const reference = parsePageReference(name);

    if (reference.section !== undefined) {
        throw new Error(`Give ${reference.name} without #${reference.section}: whole pages move. Nothing moved.`);
    }

    const copy = copyName(world, scene, reference.name);

    if (copy !== undefined) {
        const why = role === "what" ? "has no place of its own: it is where the scene is, and one that goes leaves with scene leave" : "holds nothing: give a place, a character or an item";
        throw new Error(`${copy} is a copy in the open scene, which ${why}. Nothing moved.`);
    }

    const page = pageNamed(world, reference.name);

    if (page === undefined) {
        // A list sent as one text, as some clients do, names no page: creating one by that name would be wrong.
        const list = reference.name.includes(",")
            ? ` For more than one, give a list, such as page [${reference.name.split(",").map((part) => part.trim()).join(", ")}].`
            : ` Look for it with find, or create it with write and its type: ${pageTypeNames.join(", ")}.`;
        throw new Error(`There is no page named ${reference.name}.${list} Nothing moved.`);
    }

    return page;
}

/**
 * The open scene follows the party (CON-6): when all its living members in the scene went, by themselves or aboard a place that moved, into the destination and out
 * of the scene's place, the scene goes there, copies and all; when only some of them left the scene's place, they may have left the scene.
 */
function followParty(root: string, context: Context, world: World, scene: Scene, went: Page[], destination: Page): string | undefined
{
    // Read without stopping at names two pages share: the move is already done.
    const pageCalled = (link: string): Page | undefined => world.pages.find((page) => comparableText(page.name) === comparableText(parsePageReference(link).name));
    const party = scene.with.map(pageCalled).filter((page): page is Page => page !== undefined && isInParty(page));
    const gone = party.filter((page) => went.some((other) => other.path === page.path));
    const place = scene.place === undefined ? undefined : pageCalled(scene.place);
    const outside = (page: Page): boolean => place === undefined || !locate(world, page).chain.includes(place);

    if (gone.length === 0) {
        return undefined;
    }

    // Only a place holds characters (CON-1), and only a place holds places, so the party went into one.
    if (party.every((page) => locate(world, page).chain.includes(destination) && outside(page))) {
        updateScene(root, [[["place"], `[[${destination.name}]]`]]);
        appendLogEntry(root, newDatedLogEntry(root, context, "scene-changed", "hidden", { title: scene.title, place: `[[${destination.name}]]` }));
        const copies = Object.keys(scene.copies);
        const copiesToo = copies.length === 0 ? "" : `, with ${copies.join(", ")}`;
        return `The open scene, ${scene.title}, goes with them: now at ${destination.name}${copiesToo}. Close it if it ended${place === undefined ? "" : ` in ${place.name}`}; scene leave whoever stays behind.`;
    }

    if (place === undefined) {
        return undefined;
    }

    const left = gone.filter(outside).map((page) => page.name);
    const who = left.length === 1 ? left[0] : `[${left.join(", ")}]`;
    return left.length === 0 ? undefined : `${left.join(", ")} left ${place.name}, where the open scene is: if they left the scene, scene leave, who ${who}.`;
}

/** The texts of what changed around those who moved, each once. */
function distinctTexts(items: Surrounding[]): string[]
{
    return [...new Set(items.map((item) => item.text))];
}
