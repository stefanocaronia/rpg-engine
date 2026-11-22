// What starts the player's action (D-495): a thing's name of the sheet, or someone's, as a button where the page has the player's actions; else as it was.
import { type ComponentChildren, createContext } from "preact";
import { useContext } from "preact/hooks";
import type { ActVerb } from "../data.ts";
import { t } from "../text.ts";
import { type ActStart, type SheetActions, verbLabel } from "./acts.ts";

/** What the page lets the player do with the sheet and the people (D-495): the verbs of the sheet's lists, and how an action starts. */
export interface PlayerActs
{
    actions: SheetActions;
    start(act: ActStart, opener: HTMLElement | SVGElement): void;
}

/** The player's actions where the page has them: none for a system that names none, and the page is as it was. */
export const PlayerActsContext = createContext<PlayerActs | undefined>(undefined);

/** The verbs of each thing of the sheet shown, by thingVerbs (D-581 (D)): none outside a sheet, where a name keeps the verbs of its own list. */
export const ThingVerbsContext = createContext<ReadonlyMap<string, ActVerb[]> | undefined>(undefined);

/** The player's actions, when the page has them. */
export function usePlayerActs(): PlayerActs | undefined
{
    return useContext(PlayerActsContext);
}

/**
 * A thing's name that opens its card (D-495): what it is, then its verbs; with none, only what it is. Its tooltip names its verbs; `page`, the thing's page
 * when the name shown is another; `facts`, what the sheet says of it; `said`, what a screen reader hears after it.
 */
export function ActName({ verbs, item, page, facts, document, said = "", children }: {
    verbs: ActVerb[];
    item: string;
    page?: string;
    facts?: string[];
    document?: true;
    said?: string;
    children: ComponentChildren;
})
{
    const acts = usePlayerActs();
    // The click opens the card: the tooltip names what can be done there, a screen reader the thing and what the sheet says of it.
    const title = verbs.length === 0 ? undefined : verbs.map(verbLabel).join(" · ");
    const start = { verbs, item, ...(page === undefined ? {} : { page }), ...(facts === undefined ? {} : { facts }), ...(document === undefined ? {} : { document }) };
    return (
        <button type="button" class={verbs.length === 0 ? "act reads" : "act"} data-tip={title} aria-label={`${item}${said}`} onClick={(event) => acts?.start(start, event.currentTarget)}>
            {children}
        </button>
    );
}

/** Someone's name that starts talking to them (D-495), where the page has the player's actions; else the name as it is. */
export function TalkName({ name, children }: { name: string; children: ComponentChildren; })
{
    const acts = usePlayerActs();

    if (acts === undefined) {
        return <>{children}</>;
    }

    const title = t("Talk to {name}", { name });
    return (
        <button type="button" class="act talk" data-name={name} data-tip={`${title}…`} aria-label={`${title}…`} onClick={(event) => acts.start({ talk: name }, event.currentTarget)}>
            {children}
        </button>
    );
}
