// The pages of the game system that the campaign changed (D-564), under the system's row in Installed: each with what the system gave and what the campaign
// has, the parts of its text rewritten by name, and the way to put it back as the system writes it, after asking with what goes back: the page cannot undo
// it. One changed only in what the character does not know, as a creature it never met, says so by its name, never what changed. Nothing is put back while a
// scene is played, and the list says so first. Nothing at all while the campaign changed none.
import { useEffect, useRef, useState } from "preact/hooks";
import { putPageBack } from "../api.ts";
import type { ShownLayer } from "../data.ts";
import { changedItem } from "../parts/changed.tsx";
import { Icon } from "../parts/icons.tsx";
import { fieldLabel, phraseLabel, shownText } from "../parts/labels.ts";
import { InlineText } from "../parts/markdown.tsx";
import { Confirm } from "../settings/saves.tsx";
import { isolated, listText, t } from "../text.ts";
import { SaidNote } from "./rows.tsx";

/** What happened to the last page asked about, said in its place in the list, which it keeps once the page is back and its row gone. */
interface SaidOf
{
    of: ShownLayer;
    problem: boolean;
    text: string;
}

/**
 * The pages the campaign changed. `open` is what the address names in the tab: named as this list is, its heading takes the focus. `sceneOpen` says a scene
 * is being played, when nothing is put back. `onChanged` reads the game again, once a page is put back or was found already back.
 */
export function ChangedPages({ layers, sceneOpen = false, open, onChanged }: { layers: ShownLayer[]; sceneOpen?: boolean; open?: string | undefined; onChanged(): void; })
{
    const [asking, setAsking] = useState<ShownLayer>();
    // One at a time: the others wait for the answer.
    const [sending, setSending] = useState(false);
    const [said, setSaid] = useState<SaidOf>();
    const heading = useRef<HTMLHeadingElement>(null);
    const shown = layers.length > 0;
    // The page just put back keeps its place for what was said of it, where the player was looking.
    const gone = said !== undefined && !layers.some((layer) => layer.name === said.of.name) ? said.of : undefined;
    // In the order of the names the player reads, not of the system's.
    const rows = [...layers, ...(gone === undefined ? [] : [gone])].sort((one, other) => nameOf(one).localeCompare(nameOf(other)));

    // Reached from the mark of a changed page: the list in sight, its heading read.
    useEffect(() => {
        if (open === changedItem && shown) {
            heading.current?.focus({ preventScroll: true });
            heading.current?.scrollIntoView({ block: "center" });
        }
    }, [open, shown]);

    const ask = (layer: ShownLayer): void => {
        // Said again in the row pressed, for who did not read it over the list: the server would say the same.
        if (sceneOpen) {
            setSaid({ of: layer, problem: true, text: t("It can be put back once the scene being played is over.") });
            return;
        }

        setAsking(layer);
    };

    const putBack = async (layer: ShownLayer): Promise<void> => {
        const name = nameOf(layer);
        setAsking(undefined);
        setSaid(undefined);
        setSending(true);
        const outcome = await putPageBack(layer.name, name);
        setSending(false);
        setSaid(
            outcome.done
                ? { of: layer, problem: false, text: `✓ ${t("{name} reads as the game system writes it again. The master hears of it at their next move.", { name })}` }
                : { of: layer, problem: true, text: outcome.error },
        );

        // One already back leaves the list at the next reading, as one put back does.
        if (outcome.done || outcome.code === "no-layer") {
            onChanged();
        }
    };

    if (rows.length === 0) {
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
                    <p class="package-note">
                        {layers.some(isRead)
                            ? t("These pages of the game system changed for this campaign: each line has what the game system gave, then what it is now, in bold.")
                            : t("These pages of the game system changed for this campaign.")}
                    </p>
                </>
            )}
            {shown && sceneOpen && <p class="package-note changed-waits" id="packages-changed-waits">{t("Nothing is put back while a scene is being played: wait for it to end.")}</p>}
            <ul class="changed-list">
                {rows.map((layer) => (
                    <ChangedPage
                        key={layer.name}
                        layer={layer}
                        gone={layer === gone}
                        busy={sending}
                        waits={sceneOpen}
                        said={said?.of.name === layer.name ? said : undefined}
                        onPutBack={() => ask(layer)}
                    />
                ))}
            </ul>
            {asking !== undefined && (
                <Confirm title={t("Put {name} back as the game system writes it?", { name: nameOf(asking) })} onClose={() => setAsking(undefined)}>
                    {isRead(asking)
                        ? (
                            <>
                                <p>{t("Wherever {name} is used, this goes back to what the game system gives:", { name: nameOf(asking) })}</p>
                                <ChangedFields layer={asking} back />
                            </>
                        )
                        : <p>{t("Your character does not know what changed in {name}: you put it back without knowing what you take away.", { name: nameOf(asking) })}</p>}
                    <p>{t("It cannot be undone from this page: ask the master to write it again.")}</p>
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
 * what the character does not know, and Put back, which waits while a scene is played. Once it is back (`gone`), only what was said of it, in its place.
 */
function ChangedPage({ layer, gone, busy, waits, said, onPutBack }: { layer: ShownLayer; gone: boolean; busy: boolean; waits: boolean; said: SaidOf | undefined; onPutBack(): void; })
{
    const name = nameOf(layer);
    return (
        <li class="changed-page">
            {!gone && (
                <strong class="package-title">
                    <bdi>{name}</bdi>
                </strong>
            )}
            {!gone && (
                <button
                    type="button"
                    class="button package-button"
                    aria-label={t("Put back {name}, as the game system writes it…", { name })}
                    aria-disabled={busy || waits}
                    aria-describedby={waits ? "packages-changed-waits" : undefined}
                    onClick={() => !busy && onPutBack()}
                >
                    <Icon name="undo" />
                    {t("Put back…")}
                </button>
            )}
            {/* Nothing of it the character knows changed, as of a creature never met: that it changed, never what. */}
            {!gone && !isRead(layer) && <p class="package-note">{t("Changed: your character does not know what changed.")}</p>}
            {!gone && isRead(layer) && <ChangedFields layer={layer} />}
            {/* Why it stays, or that it is back, with the focus, which the question had. */}
            <SaidNote said={said === undefined ? undefined : { at: layer.name, problem: said.problem, text: said.text }} focus />
        </li>
    );
}

/**
 * What changed in a page, a line each: the field's label, what the system gave, an arrow, what the campaign has in bold, and the parts of its text rewritten
 * by name. `back` turns each line round, for what putting the page back does: what the campaign has, then in bold what the system gives again.
 */
function ChangedFields({ layer, back = false }: { layer: ShownLayer; back?: boolean; })
{
    // The names of the parts are the game's words: each keeps its own order in a page written from right to left.
    const rewritten = [...(layer.introduction === true ? [t("its description")] : []), ...layer.sections.map(isolated)];
    const system = t("the game system gives");
    const campaign = t("this campaign has");
    return (
        <ul class={back ? "changed-fields back" : "changed-fields"}>
            {layer.fields.map((field) => (
                <li key={field.field}>
                    <span class="changed-field">{phraseLabel(fieldLabel(field.field))}</span>
                    {back
                        ? <ChangedValues was={field.campaign} wasSaid={campaign} now={field.system} nowSaid={system} without={t("goes away")} />
                        : <ChangedValues was={field.system} wasSaid={system} now={field.campaign} nowSaid={campaign} added={field.system === undefined} />}
                </li>
            ))}
            {rewritten.length > 0 && (
                <li>
                    <span class="changed-field">{t("Text rewritten")}</span>
                    <span class="changed-values">
                        {back
                            ? (
                                <>
                                    <span class="changed-was">{listText(rewritten)}</span>
                                    <span class="changed-to">
                                        <Arrow />
                                        <span class="changed-now">{t("as the game system writes it")}</span>
                                    </span>
                                </>
                            )
                            : listText(rewritten)}
                    </span>
                </li>
            )}
        </ul>
    );
}

/**
 * A field's two values: what it was, quiet, an arrow, what it is, in bold, each said to a screen reader by whose it is. A field the campaign added has no
 * value before it, and says so after; put back, it has none after, and `without` says what becomes of it. The arrow goes to a new line with what it leads to.
 */
function ChangedValues({ was, wasSaid, now, nowSaid, added = false, without }: { was: string | undefined; wasSaid: string; now: string | undefined; nowSaid: string; added?: boolean; without?: string; })
{
    const is = now === undefined ? <span class="changed-now">{without}</span> : (
        <bdi class="changed-now">
            <InlineText text={shownText(now)} />
        </bdi>
    );
    return (
        <span class="changed-values">
            {was !== undefined && (
                <>
                    <span class="visually-hidden">{wasSaid}</span>
                    <bdi class="changed-was">
                        <InlineText text={shownText(was)} />
                    </bdi>
                    <span class="changed-to">
                        <Arrow />
                        {now !== undefined && <span class="visually-hidden">{nowSaid}</span>}
                        {is}
                    </span>
                </>
            )}
            {was === undefined && is}
            {added && <span class="changed-new">{t("added")}</span>}
        </span>
    );
}

/** The arrow from what a value was to what it is: it turns by itself in a page written from right to left. */
function Arrow()
{
    return (
        <span class="changed-arrow" aria-hidden="true">
            <Icon name="send" />
        </span>
    );
}

/** Whether the player reads what changed in a page: one changed only in what the character does not know has its name alone. */
function isRead(layer: ShownLayer): boolean
{
    return layer.fields.length > 0 || layer.sections.length > 0 || layer.introduction === true;
}

/** A changed page's name as the player reads it: its title in the campaign's language, else its name. */
function nameOf(layer: ShownLayer): string
{
    return layer.title ?? layer.name;
}
