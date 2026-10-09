// Where the player character is and the open scene, as data for the dashboard (VIEW-6, D-310): what the player may see of them, as the character knows them.
import type { Context } from "../core/context.ts";
import { comparableText } from "../core/text.ts";
import { environmentAt, formatEnvironmentEntry, locate, type Page, pagesWithName, parsePageReference, placesAround, type World } from "../pages/index.ts";
import { effectsOf } from "./effect-layer.ts";
import { effectText } from "./game-effects.ts";
import { shownImage } from "./game-images.ts";
import { type Knowledge, knownText, knowsPage } from "./game-knowledge.ts";
import { readOpenScene } from "./game-scene.ts";

/** Someone at the place or in the scene as the player sees them: a name, or someone; their role and picture; for copies of a creature, how many. */
export interface ShownPerson
{
    name: string;
    role: "pc" | "companion" | "other";
    image?: { file: string; version: number; };
    /** Someone the character does not know, shown without a name. */
    stranger?: true;
    /** How many copies of a creature, in the open scene. */
    count?: number;
}

/** Where the player character is, as it knows it (VIEW-6). */
export interface ShownPlace
{
    name: string;
    image?: { file: string; version: number; };
    /** The places that hold it, the outermost first, of those the character knows. */
    within: string[];
    /** What holds there, nearest first: the environment, then the places' effects; each with its place, when the character knows it. */
    around: { text: string; place?: string; }[];
    /** Its text as the character knows it (VIEW-3). */
    text: string;
    /** The party and the characters the character knows who are there; never someone it does not know, who would give themselves away. */
    here: ShownPerson[];
}

/** The open scene as the player sees it (VIEW-6): who is in it as in VIEW-4, and the order of the turns. */
export interface ShownScene
{
    title: string;
    type: string;
    /** The game date it opened. */
    since?: string;
    place?: string;
    who: ShownPerson[];
    order?: string[];
    turn?: string;
    round?: number;
}

/** What the view reads to show the place and the scene: the campaign, the world, what the character knows, and who the party are. */
export interface PlaceSight
{
    root: string;
    context: Context;
    world: World;
    knowledge: Knowledge;
    party: Page[];
}

/** Where the player character is, as it knows it; none when it is in no place it knows, as in the open on a journey. */
export function shownPlace(sight: PlaceSight): ShownPlace | undefined
{
    const { world, knowledge } = sight;
    const places = locate(world, knowledge.pc).chain.filter((holder) => holder.type === "place" && knowsPage(knowledge, holder));
    const place = places[0];

    if (place === undefined) {
        return undefined;
    }

    const known = (holder: Page): string | undefined => (knowsPage(knowledge, holder) ? holder.name : undefined);
    const around = [
        ...environmentAt(world, place).map(({ entry, place: holder }) => ({ text: formatEnvironmentEntry(entry), place: known(holder) })),
        ...placesAround(world, place).flatMap((holder) => effectsOf(holder).map((effect) => ({ text: effectText(effect), place: known(holder) }))),
    ].map((item) => (item.place === undefined ? { text: item.text } : { text: item.text, place: item.place }));
    const present = world.pages.filter((page) =>
        page.type === "character" && page.fields.status !== "dead" && locate(world, page).chain[0] === place
        && (sight.party.includes(page) || knowsPage(knowledge, page))
    );
    const image = picture(sight, place);
    return {
        name: place.name,
        ...(image === undefined ? {} : { image }),
        within: places.slice(1).map((holder) => holder.name).reverse(),
        around,
        text: knownText(world, knowledge, place),
        // The party first, the player character at its head.
        here: [...sight.party.filter((page) => present.includes(page)), ...present.filter((page) => !sight.party.includes(page))].map((page) => person(sight, page)),
    };
}

/** The open scene as the player sees it; none when no scene is open, or it cannot be read. */
export function shownScene(sight: PlaceSight): ShownScene | undefined
{
    const { scene } = readOpenScene(sight.root);

    if (scene === undefined) {
        return undefined;
    }

    const place = knownPage(sight, scene.place);
    const characters = scene.with.map((link) => {
        const page = knownPage(sight, link);
        return page === undefined ? { name: "someone", role: "other" as const, stranger: true as const } : person(sight, page);
    });
    const creatures = [...new Set(Object.values(scene.copies).map((copy) => copy.creature))].map((creature) => {
        const count = Object.values(scene.copies).filter((copy) => copy.creature === creature).length;
        const page = knownPage(sight, creature);
        return page === undefined ? { name: "creature", role: "other" as const, stranger: true as const, count } : { ...person(sight, page), count };
    });
    const turnName = (name: string): string => shownTurn(sight, scene.copies, name);
    return {
        title: scene.title,
        type: scene.type,
        ...(scene.opened === undefined ? {} : { since: scene.opened }),
        ...(place === undefined ? {} : { place: place.name }),
        who: [...characters, ...creatures],
        ...(scene.order === undefined ? {} : { order: scene.order.map(turnName) }),
        ...(scene.turn === undefined ? {} : { turn: turnName(scene.turn) }),
        ...(scene.round === undefined ? {} : { round: scene.round }),
    };
}

/** Someone the character knows, with their picture and their role. */
function person(sight: PlaceSight, page: Page): ShownPerson
{
    const role = page === sight.knowledge.pc ? "pc" : sight.party.includes(page) ? "companion" : "other";
    const image = picture(sight, page);
    return { name: page.name, role, ...(image === undefined ? {} : { image }) };
}

/** A page's picture, its own or from a base the character knows (D-267, D-277). */
function picture(sight: PlaceSight, page: Page): { file: string; version: number; } | undefined
{
    return shownImage(sight.root, sight.context, sight.world, page, (base) => knowsPage(sight.knowledge, base));
}

/** The page the character knows by a link or a name, of the campaign or of the system. */
function knownPage(sight: PlaceSight, name: string | undefined): Page | undefined
{
    if (name === undefined) {
        return undefined;
    }

    const page = pagesWithName(sight.world, parsePageReference(name).name)[0];
    return page !== undefined && knowsPage(sight.knowledge, page) ? page : undefined;
}

/** Whose turn it is, as the character knows them: a character it knows by name, a copy by its own name when it knows the creature, else creature and its number. */
function shownTurn(sight: PlaceSight, copies: Record<string, { creature: string; }>, name: string): string
{
    const copy = Object.entries(copies).find(([copyName]) => comparableText(copyName) === comparableText(name));

    if (copy === undefined) {
        return knownPage(sight, name)?.name ?? "someone";
    }

    return knownPage(sight, copy[1].creature) === undefined ? `creature ${/\d+$/.exec(copy[0])?.[0] ?? ""}`.trim() : copy[0];
}
