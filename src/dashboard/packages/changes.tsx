// The pages of the game system that the campaign changed (D-564), under the system's row in Installed: each with what the system gave and what the campaign
// has, the parts of its text rewritten by name, and the way to put it back as the system writes it, after asking: the page cannot bring a change back. One
// changed only in what the character does not know, as a creature it never met, says so by its name, never what changed. Nothing at all while the campaign
// changed none.
import { useEffect, useRef, useState } from "preact/hooks";
import { putPageBack } from "../api.ts";
import type { ShownLayer } from "../data.ts";
import { changedItem } from "../parts/changed.tsx";
import { Icon } from "../parts/icons.tsx";
import { fieldLabel, phraseLabel, shownText } from "../parts/labels.ts";
import { InlineText } from "../parts/markdown.tsx";
import { Confirm } from "../settings/saves.tsx";
import { isolated, listText, t } from "../text.ts";
import { type Said, SaidNote } from "./rows.tsx";

// What happened to the last page put back is said under the list, as its row is gone.
const underList = "list";

/**
 * The pages the campaign changed. `open` is what the address names in the tab: named as this list is, its heading takes the focus. `onChanged` reads the game again, once a page is put back or was found already back.
 */
export function ChangedPages({ layers, open, onChanged }: { layers: ShownLayer[]; open?: string | undefined; onChanged(): void; })
{
    const [asking, setAsking] = useState<ShownLayer>();
    // One at a time: the others wait for the answer.
    const [sending, setSending] = useState(false);
    const [said, setSaid] = useState<Said>();
    const heading = useRef<HTMLHeadingElement>(null);
    const shown = layers.length > 0;

    // Reached from the mark of a changed page: the list in sight, its heading read.
    useEffect(() => {
        if (open === changedItem && shown) {
            heading.current?.focus({ preventScroll: true });
            heading.current?.scrollIntoView({ block: "center" });
        }
    }, [open, shown]);

    const putBack = async (layer: ShownLayer): Promise<void> => {
        const name = nameOf(layer);
        setAsking(undefined);
        setSaid(undefined);
        setSending(true);
        const outcome = await putPageBack(layer.name, name);
        setSending(false);

        if (outcome.done) {
            setSaid({ at: underList, problem: false, text: `✓ ${t("{name} reads as the game system writes it again. The master hears of it at their next move.", { name })}` });
        } else {
            // One already back leaves the list at the next reading: said under it. One that waits for the scene to end stays, and says so in its row.
            setSaid({ at: outcome.code === "copies-in-scene" || outcome.code === "scene-open" ? layer.name : underList, problem: true, text: outcome.error });
        }

        if (outcome.done || outcome.code === "no-layer") {
            onChanged();
        }
    };

    if (!shown && said === undefined) {
        return null;
    }

    return (
        <section class="package-changes" aria-labelledby={shown ? "packages-changed" : undefined}>
            {shown && (
                <>
                    <h4 class="eyebrow package-sub" id="packages-changed" tabIndex={-1} ref={heading}>
                        {t("Changed in this campaign")}
                        <span class="package-count">{layers.length}</span>
                    </h4>
                    <p class="package-note">{t("These pages of the game system read differently in this campaign.")}</p>
                </>
            )}
            {shown && (
                <ul class="changed-list">
                    {/* In the order of the names the player reads, not of the system's. */}
                    {[...layers].sort((one, other) => nameOf(one).localeCompare(nameOf(other))).map((layer) => (
                        <ChangedPage
                            key={layer.name}
                            layer={layer}
                            busy={sending}
                            said={said?.at === layer.name ? said : undefined}
                            onPutBack={() => setAsking(layer)}
                        />
                    ))}
                </ul>
            )}
            {said?.at === underList && <SaidNote said={said} focus />}
            {asking !== undefined && (
                <Confirm title={t("Put {name} back as the game system writes it?", { name: nameOf(asking) })} onClose={() => setAsking(undefined)}>
                    <p>{t("What this campaign changed of it is deleted, wherever it is used. The dashboard cannot bring it back: ask the master to write it again.")}</p>
                    <div class="confirm-buttons">
                        {/* Closed as Escape closes it, so that the focus goes back to the page's button. */}
                        <button type="button" class="button" autoFocus onClick={(event) => event.currentTarget.closest("dialog")?.close()}>{t("Cancel")}</button>
                        <button type="button" class="button danger final" onClick={() => void putBack(asking)}>{t("Put back")}</button>
                    </div>
                </Confirm>
            )}
        </section>
    );
}

/**
 * A page the campaign changed: its name, each field as the system gave it and as the campaign has it, the parts of its text rewritten, or that it changed in
 * what the character does not know, and Put back.
 */
function ChangedPage({ layer, busy, said, onPutBack }: { layer: ShownLayer; busy: boolean; said: Said | undefined; onPutBack(): void; })
{
    const name = nameOf(layer);
    // The names of the parts are the game's words: each keeps its own order in a page written from right to left.
    const rewritten = [...(layer.introduction === true ? [t("its opening")] : []), ...layer.sections.map(isolated)];
    return (
        <li class="changed-page">
            <strong class="package-title">
                <bdi>{name}</bdi>
            </strong>
            <button type="button" class="button package-button" aria-label={t("Put back {name}, as the game system writes it…", { name })} aria-disabled={busy} onClick={() => !busy && onPutBack()}>
                <Icon name="undo" />
                {t("Put back…")}
            </button>
            {/* Nothing of it the character knows changed, as of a creature never met: that it changed, never what. */}
            {layer.fields.length === 0 && rewritten.length === 0 && <p class="package-note">{t("Changed: your character does not know what changed.")}</p>}
            {(layer.fields.length > 0 || rewritten.length > 0) && (
                <ul class="changed-fields">
                    {layer.fields.map((field) => (
                        <li key={field.field}>
                            <span class="changed-field">{phraseLabel(fieldLabel(field.field))}</span>
                            <span class="changed-values">
                                {field.system !== undefined && (
                                    <>
                                        <span class="visually-hidden">{t("the game system gives")}</span>
                                        <bdi class="changed-was">
                                            <InlineText text={shownText(field.system)} />
                                        </bdi>
                                        <span class="changed-arrow" aria-hidden="true">
                                            <Icon name="send" />
                                        </span>
                                        <span class="visually-hidden">{t("this campaign has")}</span>
                                    </>
                                )}
                                <bdi class="changed-now">
                                    <InlineText text={shownText(field.campaign)} />
                                </bdi>
                                {field.system === undefined && <span class="changed-new">{t("added")}</span>}
                            </span>
                        </li>
                    ))}
                    {rewritten.length > 0 && (
                        <li>
                            <span class="changed-field">{t("Text rewritten")}</span>
                            <span class="changed-values">{listText(rewritten)}</span>
                        </li>
                    )}
                </ul>
            )}
            {/* Why it stays, with the focus, which the question had. */}
            <SaidNote said={said} focus />
        </li>
    );
}

/** A changed page's name as the player reads it: its title in the campaign's language, else its name. */
function nameOf(layer: ShownLayer): string
{
    return layer.title ?? layer.name;
}
