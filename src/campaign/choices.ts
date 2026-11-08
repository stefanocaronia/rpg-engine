// The choices waiting for the player (D-556): what the master prepares for the player to choose on the dashboard when they like, as a new level, kept in
// state.yaml with the present of the game, so that a save brings them back; the player's answers stay there until the master hears them.
import { z } from "zod";
import { changeStateAt, readStateValues } from "./state.ts";

/** How many options of an item the player picks: from `least` to `most`. */
export interface PickRange
{
    least: number;
    most: number;
}

/** One choice of a set: its question, its options as the master wrote them, how many to pick, the player's answer so far, and the roll an option made. */
export interface ChoiceItem
{
    question: string;
    options: string[];
    pick: PickRange;
    answer?: string[];
    rolled?: string;
}

/** A set of choices for one character, such as a new level: its title, when it was made, its items, and the day the player confirmed it. */
export interface ChoiceSet
{
    id: string;
    title: string;
    who: string;
    made: string;
    items: ChoiceItem[];
    confirmed?: string;
}

const pickPattern = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/;

const itemSchema = z.object({
    question: z.string(),
    options: z.array(z.string()),
    pick: z.union([z.number().int(), z.string()]).optional(),
    answer: z.array(z.string()).optional(),
    rolled: z.string().optional(),
});

const setSchema = z.object({
    id: z.string(),
    title: z.string(),
    who: z.string(),
    made: z.string(),
    items: z.array(itemSchema),
    confirmed: z.string().optional(),
});

/** The choices waiting in state.yaml, in the order they were made; none when there are none, or when they do not read. */
export function readChoices(root: string): ChoiceSet[]
{
    let values: Record<string, unknown>;

    // A state.yaml that does not read is validate's to say: what reads it goes on without choices.
    try {
        values = readStateValues(root);
    } catch {
        return [];
    }

    const parsed = z.array(z.unknown()).safeParse(values.choices ?? []);
    return parsed.success ? parsed.data.flatMap((value) => readSet(value) ?? []) : [];
}

/** Writes the choices waiting, in place of those in state.yaml; none takes the key away. */
export function writeChoices(root: string, sets: ChoiceSet[]): void
{
    changeStateAt(root, [[["choices"], sets.length === 0 ? undefined : sets.map(writtenSet)]]);
}

/** "2" as 2 to 2, "0-2" as 0 to 2; undefined for anything else. One alone, as a choice is, when nothing is given. */
export function readPick(value: number | string | undefined): PickRange | undefined
{
    if (value === undefined) {
        return { least: 1, most: 1 };
    }

    const found = pickPattern.exec(String(value));

    if (found === null) {
        return undefined;
    }

    const least = Number(found[1]);
    const most = found[2] === undefined ? least : Number(found[2]);
    return least <= most ? { least, most } : undefined;
}

/** How a pick is written: 2, or 0-2. */
export function pickText(pick: PickRange): string
{
    return pick.least === pick.most ? String(pick.least) : `${pick.least}-${pick.most}`;
}

function readSet(value: unknown): ChoiceSet | undefined
{
    const parsed = setSchema.safeParse(value);

    if (!parsed.success) {
        return undefined;
    }

    const items = parsed.data.items.flatMap((item): ChoiceItem[] => {
        const pick = readPick(item.pick);
        return pick === undefined
            ? []
            : [{ question: item.question, options: item.options, pick, ...(item.answer === undefined ? {} : { answer: item.answer }), ...(item.rolled === undefined ? {} : { rolled: item.rolled }) }];
    });
    return { ...parsed.data, items };
}

// As state.yaml keeps it: a pick of one left out, a pick of a range as text.
function writtenSet(set: ChoiceSet): Record<string, unknown>
{
    return {
        id: set.id,
        title: set.title,
        who: set.who,
        made: set.made,
        items: set.items.map((item) => ({
            question: item.question,
            options: item.options,
            ...(item.pick.least === 1 && item.pick.most === 1 ? {} : { pick: item.pick.least === item.pick.most ? item.pick.least : pickText(item.pick) }),
            ...(item.answer === undefined ? {} : { answer: item.answer }),
            ...(item.rolled === undefined ? {} : { rolled: item.rolled }),
        })),
        ...(set.confirmed === undefined ? {} : { confirmed: set.confirmed }),
    };
}
