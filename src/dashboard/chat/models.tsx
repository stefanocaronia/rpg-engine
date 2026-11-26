// The list of an app's models (T-290), one for the whole page: where a chat is opened, in the launcher's form and under the open chat's words. A button
// that says the model chosen, and opens over the page the list to choose from: a search where it is long, the advised first, each provider's apart, what
// is paid apart marked, a name written by hand, and at its foot how much the master thinks. A combobox with its listbox: the arrows move, Enter chooses,
// Escape closes, and the focus goes back to the button.
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { ChatHost, ChatModel } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { Segmented } from "../parts/segmented.tsx";
import { t } from "../text.ts";
import { effortName, effortsOf, modelOf, modelSearchAt, modelSections } from "./chat.ts";

// How far from its button the list stands, and from the window's edges; the least width it takes; under this width it is a sheet from the window's foot.
const gap = 6;
const margin = 8;
const leastWidth = 288;
const sheetUnder = 600;
// The id of the choice of a name written by hand.
const otherId = "\u0000other";

/**
 * The button and its list. `model` and `effort` are those chosen, `written` when the model is a name written by hand. `onPick` has a model of the list,
 * or "" for one to write; `onEffort` a level of thinking, "" for the default. `foot`, the small one under the open chat's words; `off`, why it cannot
 * be opened now, as in the master's turn. `efforts`, the model's levels where the app said them once it was chosen, in place of its list's; `fallback`,
 * whether Default is among them, which an open chat no longer offers once a level was chosen in it, as its app keeps that level.
 */
export function ModelPicker({ host, model, effort, efforts: told, fallback = true, written = false, id, labelledBy, describedBy, foot = false, off, onPick, onEffort }: {
    host: ChatHost;
    model: string;
    effort: string | undefined;
    efforts?: string[] | undefined;
    fallback?: boolean;
    written?: boolean;
    id: string;
    labelledBy?: string;
    describedBy?: string;
    foot?: boolean;
    off?: string | undefined;
    onPick(model: string): void;
    onEffort(effort: string): void;
})
{
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState<string>();
    const button = useRef<HTMLButtonElement>(null);
    const pop = useRef<HTMLDivElement>(null);
    const search = useRef<HTMLInputElement>(null);
    const listed = written ? undefined : modelOf(host, model);
    const sections = modelSections(host.models, query);
    const choices = [...sections.flatMap((section) => section.models.map((one) => one.id)), ...(foot ? [] : [otherId])];
    const more = sections.reduce((sum, section) => sum + section.more, 0);
    const searching = host.models.length > modelSearchAt;
    const efforts = told ?? effortsOf(host, model);
    const listId = `${id}-list`;
    const optionId = (choice: string): string => `${id}-option-${choices.indexOf(choice)}`;
    const shownName = listed?.name ?? (written || model === "" ? t("Another model, by name…") : model);

    const close = (focus: boolean): void => {
        setOpen(false);
        setQuery("");

        if (focus) {
            button.current?.focus();
        }
    };

    const show = (): void => {
        if (off !== undefined) {
            return;
        }

        setActive(listed?.id ?? (written ? otherId : choices[0]));
        setOpen(true);
    };

    const choose = (choice: string): void => {
        onPick(choice === otherId ? "" : choice);
        close(choice !== otherId);
    };

    usePlace(open, button, pop);

    // Open, the search takes the focus where there is one; a press out of the button and the list closes it, as the focus leaving both.
    useEffect(() => {
        if (!open) {
            return;
        }

        if (searching) {
            search.current?.focus();
        }

        const away = (event: Event): void => {
            const path = event.composedPath();

            if (!path.includes(pop.current as EventTarget) && !path.includes(button.current as EventTarget)) {
                close(false);
            }
        };

        document.addEventListener("pointerdown", away, true);
        document.addEventListener("focusin", away, true);

        return () => {
            document.removeEventListener("pointerdown", away, true);
            document.removeEventListener("focusin", away, true);
        };
    }, [open]);

    // The active choice in sight as the arrows move it.
    useEffect(() => {
        if (open && active !== undefined) {
            pop.current?.querySelector(`#${CSS.escape(optionId(active))}`)?.scrollIntoView({ block: "nearest" });
        }
    }, [open, active]);

    const keys = (event: KeyboardEvent): void => {
        if (!open) {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key) && event.currentTarget === button.current) {
                event.preventDefault();
                show();
            }

            return;
        }

        const at = active === undefined ? -1 : choices.indexOf(active);
        const moves: Record<string, number> = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: choices.length - 1, PageDown: at + 8, PageUp: at - 8 };

        if (event.key in moves && choices.length > 0) {
            event.preventDefault();
            setActive(choices[Math.min(choices.length - 1, Math.max(0, moves[event.key]))]);
        } else if (event.key === "Enter" && active !== undefined && choices.includes(active)) {
            event.preventDefault();
            choose(active);
        } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close(true);
        }
    };

    return (
        <>
            <button
                ref={button}
                id={id}
                type="button"
                role="combobox"
                class={foot ? "model-switch" : "model-button"}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-labelledby={labelledBy === undefined ? undefined : `${labelledBy} ${id}`}
                aria-describedby={describedBy}
                aria-activedescendant={open && !searching && active !== undefined ? optionId(active) : undefined}
                aria-disabled={off === undefined ? undefined : true}
                data-tip={off}
                onClick={() => (open ? close(true) : show())}
                onKeyDown={keys}
            >
                <span class="model-name" dir="auto">{shownName}</span>
                {/* Under the chat's words, how much the master thinks: what gives way first where the line is short; kept while the app takes another model. */}
                {foot && (efforts.length > 0 || effort !== undefined) && <span class="model-effort">· {effortName(effort)}</span>}
                {!foot && listed !== undefined && <ModelTags model={listed} />}
                <Icon name="more" />
            </button>
            <div ref={pop} class={foot ? "model-pop at-foot" : "model-pop"} popover="manual" onKeyDown={(event) => event.key === "Escape" && keys(event)}>
                {searching && (
                    <input
                        ref={search}
                        type="search"
                        class="search model-search"
                        dir="auto"
                        value={query}
                        placeholder={t("Search a model")}
                        aria-label={t("Search a model")}
                        aria-controls={listId}
                        aria-activedescendant={open && active !== undefined && choices.includes(active) ? optionId(active) : undefined}
                        autocomplete="off"
                        spellcheck={false}
                        onInput={(event) => {
                            const next = event.currentTarget.value;
                            setQuery(next);
                            setActive(modelSections(host.models, next)[0]?.models[0]?.id ?? (foot ? undefined : otherId));
                        }}
                        onKeyDown={keys}
                    />
                )}
                <div id={listId} class="model-list" role="listbox" aria-label={t("Model")}>
                    {sections.map((section, index) => (
                        <div key={section.title ?? index} role="group" aria-labelledby={section.title === undefined ? undefined : `${id}-group-${index}`}>
                            {section.title !== undefined && <div id={`${id}-group-${index}`} class="model-group" role="presentation" dir="auto">{section.title}</div>}
                            {section.models.map((one) => (
                                <ModelOption
                                    key={one.id}
                                    id={optionId(one.id)}
                                    model={one}
                                    chosen={listed?.id === one.id}
                                    active={active === one.id}
                                    onHover={() => setActive(one.id)}
                                    onChoose={() => choose(one.id)}
                                />
                            ))}
                        </div>
                    ))}
                    {!foot && (
                        <div
                            id={optionId(otherId)}
                            role="option"
                            class={active === otherId ? "model-other active" : "model-other"}
                            aria-selected={written}
                            onPointerMove={() => setActive(otherId)}
                            onClick={() => choose(otherId)}
                        >
                            {t("Another model, by name…")}
                        </div>
                    )}
                </div>
                {more > 0 && <p class="model-more">{t("…and {count} more: search them by name.", { count: String(more) })}</p>}
                {sections.length === 0 && <p class="model-more">{t("No model by that name.")}</p>}
                {host.models.some((one) => one.metered === true) && <p class="model-more">{t("Pay per use: it may cost extra; whoever provides the model decides.")}</p>}
                {efforts.length > 0 && <Thinking id={id} efforts={efforts} effort={effort} fallback={fallback} onEffort={onEffort} />}
            </div>
        </>
    );
}

/** Advised, and paid apart for each answer: two quiet words after a model's name, never the accent, which is the gold of what is chosen; in the list the advised stand under their own title. */
export function ModelTags({ model, advised = true }: { model: ChatModel; advised?: boolean; })
{
    return (
        <>
            {advised && model.advised === true && <span class="model-tag">{t("Recommended")}</span>}
            {model.metered === true && <span class="model-tag">{t("Pay per use")}</span>}
        </>
    );
}

/** How much the master thinks, at the list's foot: Default, where it is offered, and the model's own levels, with what changes. */
function Thinking({ id, efforts, effort, fallback, onEffort }: { id: string; efforts: string[]; effort: string | undefined; fallback: boolean; onEffort(effort: string): void; })
{
    return (
        <div class="model-thinking">
            <span id={`${id}-thinking`} class="chat-label">{t("Master's thinking")}</span>
            <Segmented
                label={`${id}-thinking`}
                described={`${id}-thinking-is`}
                options={[...(fallback ? [{ value: "", label: t("Default") }] : []), ...efforts.map((one) => ({ value: one, label: one }))]}
                value={effort ?? ""}
                onPick={onEffort}
            />
            <p id={`${id}-thinking-is`} class="chat-hint">{fallback ? t("More is slower and uses more of your plan; Default is fine.") : t("More is slower and uses more of your plan.")}</p>
        </div>
    );
}

function ModelOption({ id, model, chosen, active, onHover, onChoose }: { id: string; model: ChatModel; chosen: boolean; active: boolean; onHover(): void; onChoose(): void; })
{
    return (
        <div id={id} role="option" class={active ? "model-option active" : "model-option"} aria-selected={chosen} onPointerMove={onHover} onClick={onChoose}>
            {chosen ? <Icon name="check" /> : <span aria-hidden="true" />}
            <span class="model-option-name" dir="auto">{model.name}</span>
            <span class="model-option-tags">
                <ModelTags model={model} advised={false} />
            </span>
        </div>
    );
}

/**
 * The list in the top layer, beside its button: under it where the window has room, else over it, never out of the window; on a phone a sheet from the
 * window's foot, as its style says. Placed as it opens and as the window changes or scrolls.
 */
function usePlace(open: boolean, button: { current: HTMLElement | null; }, pop: { current: HTMLElement | null; }): void
{
    useLayoutEffect(() => {
        const list = pop.current;

        if (!open || list === null) {
            return;
        }

        const place = (): void => {
            const box = button.current?.getBoundingClientRect();

            if (box === undefined || window.innerWidth < sheetUnder) {
                return;
            }

            // Its width first, then its height as that width makes it, whole: where it goes, under or over, and the room it has there.
            const width = Math.min(Math.max(box.width, leastWidth), window.innerWidth - 2 * margin);
            list.style.setProperty("--pop-width", `${Math.round(width)}px`);
            list.style.removeProperty("--pop-room");
            const rtl = getComputedStyle(list).direction === "rtl";
            const left = Math.min(Math.max(margin, rtl ? box.right - width : box.left), window.innerWidth - width - margin);
            const height = list.offsetHeight;
            const roomUnder = window.innerHeight - box.bottom - gap - margin;
            const roomOver = box.top - gap - margin;
            const below = roomUnder >= height || roomUnder >= roomOver;
            const room = below ? roomUnder : roomOver;
            list.style.setProperty("--pop-room", `${Math.round(room)}px`);
            list.style.setProperty("--pop-left", `${Math.round(left)}px`);
            list.style.setProperty("--pop-top", `${Math.round(below ? box.bottom + gap : box.top - gap - Math.min(height, room))}px`);
        };

        list.showPopover();
        place();
        window.addEventListener("resize", place);
        document.addEventListener("scroll", place, { capture: true, passive: true });

        return () => {
            window.removeEventListener("resize", place);
            document.removeEventListener("scroll", place, { capture: true });

            if (list.matches(":popover-open")) {
                list.hidePopover();
            }
        };
    }, [open]);
}
