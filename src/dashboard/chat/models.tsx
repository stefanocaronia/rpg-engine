// The list of an app's models (T-290, T-307), one for the whole page: where a chat is opened, in the launcher's form and under the open chat's words. A
// button as wide as its form, which says the model chosen, and opens over the page the list to choose from: every model the app lists, each provider's
// under its title, none marked as advised; a search over it where the models are more than fit in sight; and at its foot how much the master thinks,
// always a level of the model's own. The list alone scrolls, with no bar, a shade at its edge where there is more. The arrows move, Enter chooses,
// Escape closes, and the focus goes back to the button.
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { ChatHost, ChatModel } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { Segmented } from "../parts/segmented.tsx";
import { t } from "../text.ts";
import { effortsOf, modelOf, modelSearchAt, modelSections } from "./chat.ts";
import { useShades } from "./shades.ts";

// How far from its button the list stands, and from the window's edges; the least width it takes; under this width it is a sheet from the window's foot.
const gap = 6;
const margin = 8;
const leastWidth = 288;
const sheetUnder = 600;

/**
 * The button and its list. `model` and `effort` are those chosen. `onPick` has a model of the list; `onEffort` a level of thinking. `foot`, the small
 * one under the open chat's words; `off`, why it cannot be opened now, as in the master's turn. `efforts`, the model's levels where the app said them
 * once it was chosen, in place of its list's.
 */
export function ModelPicker({ host, model, effort, efforts: told, id, labelledBy, describedBy, foot = false, off, onPick, onEffort }: {
    host: ChatHost;
    model: string;
    effort: string | undefined;
    efforts?: string[] | undefined;
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
    const list = useRef<HTMLDivElement>(null);
    const listed = modelOf(host, model);
    const sections = modelSections(host.models, query);
    const choices = sections.flatMap((section) => section.models.map((one) => one.id));
    const searching = host.models.length > modelSearchAt;
    const efforts = told ?? effortsOf(host, model);
    const listId = `${id}-list`;
    const optionId = (choice: string): string => `${id}-option-${choices.indexOf(choice)}`;
    const shades = useShades(list, `${open}${query}${host.models.length}`);

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

        setActive(listed?.id ?? choices[0]);
        setOpen(true);
    };

    const choose = (choice: string): void => {
        onPick(choice);
        close(true);
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
            // In a sheet, a press on the list gives the focus to the sheet itself, which holds the list: the focus did not leave it.
            const holder = event.type === "focusin" && event.target instanceof Node && pop.current !== null && event.target.contains(pop.current);

            if (!holder && !path.includes(pop.current as EventTarget) && !path.includes(button.current as EventTarget)) {
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
        // In the search, Home and End move in the words written.
        const inWords = event.currentTarget === search.current && (event.key === "Home" || event.key === "End");

        if (event.key in moves && choices.length > 0 && !inWords) {
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

    const activeId = open && active !== undefined && choices.includes(active) ? optionId(active) : undefined;
    return (
        <>
            {/* With a search the button only opens the list, and the search is the combobox; with none, the button is. */}
            <button
                ref={button}
                id={id}
                type="button"
                role={searching ? undefined : "combobox"}
                class={foot ? "model-switch" : "model-button"}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-labelledby={labelledBy === undefined ? undefined : `${labelledBy} ${id}`}
                aria-describedby={describedBy}
                aria-activedescendant={searching ? undefined : activeId}
                aria-disabled={off === undefined ? undefined : true}
                data-tip={off}
                onClick={() => (open ? close(true) : show())}
                onKeyDown={keys}
            >
                <span class="model-name" dir="auto">{listed?.name ?? model}</span>
                {
                    /* After the model, always, how much the master thinks, where a level is chosen: nothing of the choice is left unsaid. Under the chat's words
                    it is what gives way first where the line is short; kept while the app takes another model. */
                }
                {effort !== undefined && <span class="model-effort">· {effort}</span>}
                {!foot && listed !== undefined && <ModelTags model={listed} />}
                <Icon name="more" />
            </button>
            <div ref={pop} class={foot ? "model-pop at-foot" : "model-pop"} popover="manual" onKeyDown={(event) => event.key === "Escape" && keys(event)}>
                {searching && (
                    <label class="model-find">
                        <Icon name="search" />
                        <input
                            ref={search}
                            type="text"
                            role="combobox"
                            dir="auto"
                            value={query}
                            placeholder={t("Search a model")}
                            aria-label={t("Search a model")}
                            aria-expanded={open}
                            aria-autocomplete="list"
                            aria-controls={listId}
                            aria-activedescendant={activeId}
                            autocomplete="off"
                            spellcheck={false}
                            onInput={(event) => {
                                const next = event.currentTarget.value;
                                setQuery(next);
                                setActive(modelSections(host.models, next)[0]?.models[0]?.id);
                            }}
                            onKeyDown={keys}
                        />
                        {/* How many the search found, said quietly as it changes. */}
                        <span class="model-count" role="status">{query.trim() === "" ? "" : t("{found} of {all}", { found: String(choices.length), all: String(host.models.length) })}</span>
                    </label>
                )}
                <div class={`model-list-frame ${shades}`}>
                    <div ref={list} id={listId} class="model-list" role="listbox" aria-label={t("Model")}>
                        {sections.map((section, index) => (
                            <div key={section.title ?? index} role="group" aria-labelledby={section.title === undefined ? undefined : `${id}-group-${index}`}>
                                {section.title !== undefined && (
                                    <div id={`${id}-group-${index}`} class="model-group" role="presentation" dir="auto">
                                        {section.title}
                                        {/* Paid apart, said once on the provider's title, never on each of its models. */}
                                        {section.metered && <span class="model-group-note">· {t("Pay per use")}</span>}
                                    </div>
                                )}
                                {section.models.map((one) => (
                                    <ModelOption
                                        key={one.id}
                                        id={optionId(one.id)}
                                        model={one}
                                        paid={!section.metered}
                                        chosen={listed?.id === one.id}
                                        active={active === one.id}
                                        onHover={() => setActive(one.id)}
                                        onChoose={() => choose(one.id)}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                {sections.length === 0 && <p class="model-more">{t("No model by that name.")}</p>}
                {host.models.some((one) => one.metered === true) && <p class="model-more">{t("Pay per use: it may cost extra; whoever provides the model decides.")}</p>}
                {efforts.length > 0 && <Thinking id={id} efforts={efforts} effort={effort} onEffort={onEffort} />}
            </div>
        </>
    );
}

/** Paid apart for each answer: quiet words after a model's name, never the accent, which is the gold of what is chosen. */
export function ModelTags({ model }: { model: ChatModel; })
{
    return model.metered === true ? <span class="model-tag">{t("Pay per use")}</span> : null;
}

/** How much the master thinks, at the list's foot: the model's own levels, one of them always chosen where the player or the page chose one. */
function Thinking({ id, efforts, effort, onEffort }: { id: string; efforts: string[]; effort: string | undefined; onEffort(effort: string): void; })
{
    return (
        <div class="model-thinking">
            <span id={`${id}-thinking`} class="chat-label">{t("Master's thinking")}</span>
            <Segmented label={`${id}-thinking`} described={`${id}-thinking-is`} options={efforts.map((one) => ({ value: one, label: one }))} value={effort} onPick={onEffort} />
            <p id={`${id}-thinking-is`} class="chat-hint">{t("More is slower and uses more of your plan.")}</p>
        </div>
    );
}

function ModelOption({ id, model, paid, chosen, active, onHover, onChoose }: {
    id: string;
    model: ChatModel;
    /** Whether the row says it is paid apart: not where its provider's title does. */
    paid: boolean;
    chosen: boolean;
    active: boolean;
    onHover(): void;
    onChoose(): void;
})
{
    return (
        <div id={id} role="option" class={active ? "model-option active" : "model-option"} aria-selected={chosen} onPointerMove={onHover} onClick={onChoose}>
            {chosen ? <Icon name="check" /> : <span aria-hidden="true" />}
            <span class="model-option-name" dir="auto">{model.name}</span>
            <span class="model-option-tags">{paid && <ModelTags model={model} />}</span>
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
