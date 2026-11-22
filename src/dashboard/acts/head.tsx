// The head of an action's card (D-495): the way back to the thing when a verb was chosen, the title, what the sheet says of the thing, and Close.
import type { Ref } from "preact";
import { Icon } from "../parts/icons.tsx";
import { t } from "../text.ts";

/** The head of an action's card: `facts` under the title, as ×5 · in Backpack; `onBack`, when there is a step to go back to. */
export function ActHead({ title, facts = [], closer, onBack, onClose }: { title: string; facts?: string[]; closer?: Ref<HTMLButtonElement>; onBack?: () => void; onClose(): void; })
{
    return (
        <header class="map-sheet-head act-head">
            {onBack !== undefined && (
                <button type="button" class="icon-button tip-right act-back" aria-label={t("Back")} data-tip={t("Back")} onClick={onBack}>
                    <Icon name="fold" />
                </button>
            )}
            <div class="act-heading">
                <h2 id="act-sheet-title">{title}</h2>
                {facts.length > 0 && <p id="act-facts" class="act-facts">{facts.join(" · ")}</p>}
            </div>
            <button ref={closer} type="button" class="icon-button tip-left" aria-label={t("Close")} data-tip={t("Close")} onClick={onClose}>
                <Icon name="close" />
            </button>
        </header>
    );
}
