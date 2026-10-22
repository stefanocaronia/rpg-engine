// What starts the player's action (D-495): a thing's name of the sheet, or someone's, as a button where the page has the player's actions; else as it was.
import { type ComponentChildren, createContext } from "preact";
import { useContext } from "preact/hooks";
import { type ActStart, actTitle, type SheetActions } from "./acts.ts";
import type { ActVerb } from "./data.ts";
import { t } from "./text.ts";

/** What the page lets the player do with the sheet and the people (D-495): the verbs of the sheet's lists, and how an action starts. */
export interface PlayerActs
{
    actions: SheetActions;
    start(act: ActStart, opener: HTMLElement | SVGElement): void;
}

/** The player's actions where the page has them: none for a system that names none, and the page is as it was. */
export const PlayerActsContext = createContext<PlayerActs | undefined>(undefined);

/** The player's actions, when the page has them. */
export function usePlayerActs(): PlayerActs | undefined
{
    return useContext(PlayerActsContext);
}

/** A thing's name that acts (D-495): a click starts its first verb, its tooltip says it; `said`, what a screen reader hears after it. */
export function ActName({ verbs, item, said = "", children }: { verbs: ActVerb[]; item: string; said?: string; children: ComponentChildren; })
{
    const acts = usePlayerActs();
    const title = actTitle(verbs[0], item);
    return (
        <button type="button" class="act" data-tip={`${title}…`} aria-label={`${title}…${said}`} onClick={(event) => acts?.start({ verbs, item }, event.currentTarget)}>
            {children}
            <span class="act-mark" aria-hidden="true">›</span>
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
