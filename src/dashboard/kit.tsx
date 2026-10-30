// rpg-engine/page (D-510): what an extension's page code draws with, so that it looks as the page does. The page's own parts, its types and the shapes of what
// it gives each drawing; the page's tokens reach a drawing as CSS variables, and its style sheet's parts by their classes. Its types for the extensions are
// in src/page.ts, which declares these.
import type { ComponentChildren } from "preact";
import { useContext } from "preact/hooks";
import type { WidgetText } from "./data.ts";
import { NotationIcons } from "./icons.tsx";
import { PeopleContext } from "./packages/people.ts";
import { Drawn, Text } from "./packages/widgets.tsx";
import { sideOf, Token } from "./party.tsx";

export { statusIcons } from "./icons.tsx";
export { Choices } from "./packages/ask-card.tsx";
export { cardPages } from "./packages/page-code.tsx";
export { Text, Track, Value, Who } from "./packages/widgets.tsx";

/** A button of words, as the page's: gold for the one main action, quiet for a secondary one, danger for one that loses something. */
export function Button({ children, onClick, kind, disabled, tip }: {
    children: ComponentChildren;
    onClick(): void;
    kind?: "gold" | "quiet" | "danger" | undefined;
    /** Waiting, as while what it asked goes: it keeps the focus, and a press does nothing. */
    disabled?: boolean | undefined;
    tip?: string | undefined;
})
{
    return (
        <button
            type="button"
            class={kind === undefined ? "button" : `button ${kind}`}
            aria-disabled={disabled === true ? "true" : undefined}
            data-tip={tip}
            onClick={() => disabled !== true && onClick()}
        >
            {children}
        </button>
    );
}

/** A button of an icon, named by its words, which its tooltip shows. */
export function IconButton({ path, label, onClick }: { path: string; label: string; onClick(): void; })
{
    return (
        <button type="button" class="icon-button" aria-label={label} data-tip={label} onClick={onClick}>
            <Drawn path={path} kind="icon" />
        </button>
    );
}

/** An icon, a path on a grid of 24 stroked in the accent as the page's own. */
export function Icon({ path }: { path: string; })
{
    return <Drawn path={path} kind="icon" />;
}

/** The dice of a notation as the page draws them, as a d20 for 1d20+5. */
export function Dice({ notation }: { notation: string; })
{
    return <NotationIcons notation={notation} />;
}

/** Things of a list, as the page's chips. */
export function Chips({ items }: { items: WidgetText[]; })
{
    return (
        <ul class="chips">
            {items.map((item, index) => (
                <li key={index} dir="auto">
                    <Text text={item} />
                </li>
            ))}
        </ul>
    );
}

/** Someone's portrait as the page draws it, the party and those at the place known by name, else their initials; large as in a sheet. */
export function Portrait({ name, large }: { name: string; large?: boolean | undefined; })
{
    const person = useContext(PeopleContext).find((one) => one.name === name) ?? { name, role: "other" as const };
    const side = sideOf(person.role);
    return <Token member={person} large={large === true} {...(side === undefined ? {} : { side })} />;
}
