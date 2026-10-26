// What the player does from the sheet, said as their own sentence to the master (D-493 (1), D-495): the name acts, the number rolls. The system says which
// lists are actions and with which verbs, the engine's or its own with their words (D-514); the page writes the sentence, without articles, and never decides a rule.
import type { ActsShown, ActVerb, SheetGroup, SheetVerb, ShownPerson, ShownPlace, ShownScene } from "./data.ts";
import { strangerLabel } from "./labels.ts";
import { t } from "./text.ts";

/** What the player does: one of the system's verbs with a thing of the sheet, or talking to someone. */
export type ActStart = { verbs: ActVerb[]; item: string; } | { talk: string; };

/** On whom, or where: someone by the name the page shows, the character itself, no one in particular, or a square of the map. */
export type ActTarget = { person: string; } | { square: string; } | "self" | "none";

// The system's own verbs, by name, as the overview gives them (D-514).
let systemVerbs: Record<string, SheetVerb> = {};

/** Sets the game system's own verbs; none, the engine's alone. */
export function setSystemVerbs(verbs: Record<string, SheetVerb> | undefined): void
{
    systemVerbs = verbs ?? {};
}

/** Whether a verb asks for someone to act on, lets the player choose one, or goes straight to the sentence (D-495); a system's lets choose when it says on whom. */
export function targetMode(verb: ActVerb): "asks" | "lets" | "none"
{
    return verb === "attack" ? "asks" : verb === "use" || ownVerb(verb)?.on !== undefined ? "lets" : "none";
}

/** The player's sentence as the page first writes it, which the player may change before it goes: a model of the page's language with the names as shown. */
export function actSentence(verb: ActVerb, item: string, target: ActTarget = "none"): string
{
    const on = typeof target === "object" && "person" in target ? target.person : undefined;
    const at = typeof target === "object" && "square" in target ? target.square : undefined;
    const own = ownVerb(verb);

    if (own !== undefined) {
        const chosen = on !== undefined ? own.on : at !== undefined ? own.at : target === "self" ? own.self : undefined;
        return t(chosen ?? own.says, { item, ...(on === undefined ? {} : { target: on }), ...(at === undefined ? {} : { square: at }) });
    }

    switch (verb) {
        case "attack":
            return on !== undefined
                ? t("I attack {target} with {item}.", { target: on, item })
                : at !== undefined
                ? t("I attack at {square} with {item}.", { square: at, item })
                : target === "self"
                ? t("I attack myself with {item}.", { item })
                : t("I attack with {item}.", { item });
        case "use":
            return on !== undefined
                ? t("I use {item} on {target}.", { target: on, item })
                : at !== undefined
                ? t("I use {item} at {square}.", { square: at, item })
                : target === "self"
                ? t("I use {item} on myself.", { item })
                : t("I use {item}.", { item });
        case "equip":
            return t("I equip {item}.", { item });
        case "unequip":
            return t("I put away {item}.", { item });
        default:
            return t("I use {item}.", { item });
    }
}

/** The start of what the player says to someone, the cursor after it. */
export function talkSentence(name: string): string
{
    return `${t("I talk to {target}:", { target: name })} `;
}

/** The sentence with who says it in front, "Mira: …", as the master reads who acts with more than one player character (D-480 (8)); as it is for one. */
export function spokenBy(sentence: string, who: string | undefined): string
{
    return who === undefined ? sentence : `${who}: ${sentence}`;
}

/** What a verb does with a thing, as a button's tooltip and the sheet's title say it: Attack with Mace. */
export function actTitle(verb: ActVerb, item: string): string
{
    const own = ownVerb(verb);

    if (own !== undefined) {
        return t(own.title, { item });
    }

    switch (verb) {
        case "attack":
            return t("Attack with {item}", { item });
        case "equip":
            return t("Equip {item}", { item });
        case "unequip":
            return t("Put away {item}", { item });
        default:
            return t("Use {item}", { item });
    }
}

/** A verb alone, for the choice among a thing's verbs. */
export function verbLabel(verb: ActVerb): string
{
    const own = ownVerb(verb);

    if (own !== undefined) {
        return t(own.label);
    }

    switch (verb) {
        case "attack":
            return t("Attack");
        case "equip":
            return t("Equip");
        case "unequip":
            return t("Put away");
        default:
            return t("Use");
    }
}

/** The fields whose items the player acts with, each with its verbs, as view gives them for the player character (D-495). */
export type SheetActions = Partial<Record<string, ActVerb[]>>;

/**
 * The verbs of a line of a group the items of a list give: those of the first of its values the system names, as attack for the attacks; for what the
 * character carries, its quantity a value, those of the inventory, or of what is equipped for a thing equipped. None for a group the system names nothing of.
 */
export function itemVerbs(actions: SheetActions | undefined, item: NonNullable<SheetGroup["items"]>[number]): ActVerb[] | undefined
{
    const fields = item.values.map((value) => value.field);
    const named = fields.find((field) => (actions?.[field]?.length ?? 0) > 0);

    if (named !== undefined) {
        return actions?.[named];
    }

    if (!fields.includes("quantity")) {
        return undefined;
    }

    return (item.equipped === true ? actions?.equipped : undefined) ?? actions?.inventory;
}

/** Someone the player may act on or talk to, as the page shows them: their name, side, where they stand and how far, how many copies. */
export interface ActPerson
{
    name: string;
    role: ShownPerson["role"];
    hostile?: boolean;
    square?: string;
    distance?: string;
    count?: number;
}

/**
 * Who the player may name in a sentence: the other player characters there, the party's companions, then those at the place, as the map has them or else
 * the scene or the place, by the page's labels, as Hooded Bandit 1, never a name the character does not know; never the one acting, `self`, which is Myself,
 * nor without it any player character.
 */
export function actPeople(place: ShownPlace | undefined, scene: ShownScene | undefined, companions: string[], self?: string): ActPerson[]
{
    const present: (ShownPerson & { square?: string; distance?: string; })[] = place?.map?.at ?? scene?.who ?? place?.here ?? [];
    const shown = present.filter((person) => person.role !== "pc" || (self !== undefined && person.name !== self)).map((person): ActPerson => ({
        name: person.stranger === true ? strangerLabel(person.name) : person.name,
        role: person.role,
        ...(person.hostile === true ? { hostile: true } : {}),
        ...(person.square === undefined ? {} : { square: person.square }),
        ...(person.distance === undefined ? {} : { distance: person.distance }),
        ...(person.count === undefined || person.count < 2 ? {} : { count: person.count }),
    }));
    const away = companions.filter((name) => !shown.some((person) => person.name === name)).map((name): ActPerson => ({ name, role: "companion" }));
    return [...shown.filter((person) => person.role === "pc"), ...shown.filter((person) => person.role === "companion"), ...away, ...shown.filter((person) => person.role === "other")];
}

/** A sentence the player said on this page, by its id; lost when the game went away before the master heard it; or one copied, for the chat. */
export interface SaidAct
{
    id: string;
    text: string;
    lost?: boolean;
    copied?: boolean;
}

/**
 * How a sentence stands: said and waiting, which the player may take back; called, the doorbell rang for it and the master comes to read it, too late to take
 * back; heard by the master; never heard, the chat gone; or copied for the chat (D-495).
 */
export type SaidState = "said" | "called" | "heard" | "lost" | "copied";

/**
 * Each sentence said on this page with how it stands, as the server tells it: waiting while it is pending, called once the doorbell rang for it, heard once
 * the master's call took it; while the game is away, and after, what was not heard is lost, to say again in the chat. One the server no longer knows of,
 * heard long ago, is left out; one copied stays so, in its place.
 */
export function saidStates(said: SaidAct[], shown: ActsShown | undefined, live: boolean): { act: SaidAct; state: SaidState; }[]
{
    return said.flatMap((act) => {
        const pending = shown?.pending.find((one) => one.id === act.id);
        const heard = shown?.heard.includes(act.id) === true;
        const waiting = pending?.rung === true ? "called" : "said";
        const state: SaidState | undefined = act.copied === true
            ? "copied"
            : heard
            ? "heard"
            : pending !== undefined && live
            ? waiting
            : !live || act.lost === true
            ? "lost"
            : undefined;
        return state === undefined ? [] : [{ act, state }];
    });
}

/** A verb the system declares, by its name; undefined for one of the engine's. */
function ownVerb(verb: ActVerb): SheetVerb | undefined
{
    return Object.hasOwn(systemVerbs, verb) ? systemVerbs[verb] : undefined;
}
