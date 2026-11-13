// The pages of the game system the campaign changed with a layer (SYS-11), as the player may see them: what changed, and what the system gave
import { lengthsInUnits } from "../../core/length.ts";
import { comparableText, sameName, valueNamed, valueText } from "../../core/text.ts";
import { baseChain, type Page, partContent, poundsInKilograms, systemOriginal, type World } from "../../pages/index.ts";
import type { GameSystem } from "../../systems/index.ts";
import { inKnownWords, type Knowledge, knowsPage } from "../shared/characters/knowledge.ts";
import type { Measures } from "../shared/places/roads.ts";

/** A page of the game system the campaign changed with a layer (SYS-11), as the dashboard lists it. */
export interface ShownLayer
{
    /** The page's name, by which its layer is taken off. */
    name: string;
    /** Its name in the campaign's language, when the system's translation gives one (D-542). */
    title?: string;
    /** Its type, of a page the player may read. */
    type?: string;
    /** The fields the layer changes: each as the system gives it, none for one the layer adds, and as the campaign has it, its measures in the story's units; none of a page the player may not read. */
    fields: { field: string; system?: string; campaign: string; }[];
    /** The sections the layer writes, by name: never a secret, and none of a page the player may not read. */
    sections: string[];
    /** Whether the layer writes the introduction, of a page the player may read. */
    introduction?: true;
}

/**
 * The pages of the game system with a layer of the campaign, by name (SYS-11). One the player may read (VIEW-2) with what the layer changes and the system's
 * value of every field; any other, as a creature the character does not know, by its name alone, never a value nor what changed: a layer is a house rule of
 * the campaign, not a fact of the story (D-565).
 */
export function shownLayers(world: World, knowledge: Knowledge, system: GameSystem | undefined, measures: Measures): ShownLayer[]
{
    const pound = measures.units === "metric" ? system?.pound : undefined;
    const weightField = system?.load?.field;

    // Measures in the story's units, as the sheet tells them (D-328, LOAD-2); a layer never holds aliases (INH-8), so no name is told in other units.
    const text = (field: string, value: unknown): string => {
        const known = inKnownWords(world, knowledge, valueText(value));
        return pound !== undefined && weightField !== undefined && comparableText(field) === comparableText(weightField)
            ? poundsInKilograms(known, pound)
            : lengthsInUnits(known, measures.units, measures.imperial);
    };

    return layeredPages(world).map((page) => {
        const named = { name: page.name, ...(page.title === undefined ? {} : { title: page.title }) };

        if (!knowsPage(knowledge, page)) {
            return { ...named, fields: [], sections: [] };
        }

        const original = systemOriginal(page).fields;
        return {
            ...named,
            ...(page.type === undefined ? {} : { type: page.type }),
            fields: (page.layer?.fields ?? []).map((field) => {
                const given = valueNamed(original, field);
                return { field: sameName(Object.keys(original), field) ?? field, ...(given === undefined ? {} : { system: text(field, given) }), campaign: text(field, valueNamed(page.fields, field)) };
            }),
            sections: (page.layer?.sections ?? []).filter((section) => partContent(page.body, section)?.secret === false),
            ...(page.layer?.introduction === true ? { introduction: true as const } : {}),
        };
    }).sort((one, other) => one.name.localeCompare(other.name));
}

/** The page of the game system with a layer, by its name, as the view lists it and the player takes the layer off; undefined for any other. */
export function listedLayer(world: World, name: string): Page | undefined
{
    return layeredPages(world).find((page) => comparableText(page.name) === comparableText(name));
}

/**
 * Whether what a page shows comes from a page of the game system the campaign changed with a layer (SYS-11): itself, or one it derives from; with `known`, only
 * a base the viewer knows, so that the mark never tells of a creature that is the master's (D-254).
 */
export function isLayered(world: World, page: Page, known: (base: Page) => boolean = () => true): boolean
{
    return [page, ...baseChain(world, page).filter(known)].some((one) => one.layer !== undefined);
}

/** The pages of the game system the campaign changed with a layer. */
function layeredPages(world: World): Page[]
{
    return (world.system?.pages ?? []).filter((page) => page.layer !== undefined);
}
