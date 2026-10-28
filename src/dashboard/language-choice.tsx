// The game's language as a choice with a search (D-394): every language, each in its own words and in the page's, those the page is written in first; a code
// not in the list can be written whole, as pt-PT. A choice is saved at once, as the other settings'.
import { useEffect, useId, useMemo, useState } from "preact/hooks";
import { languageName, languageOf, languages, matches } from "./languages.ts";
import { pageTranslation, t } from "./text.ts";

export function LanguageChoice({ value, labelledBy, describedBy, onPick }: { value?: string; labelledBy: string; describedBy: string; onPick(code: string): void; })
{
    const pageLanguage = document.documentElement.lang || "en";
    const all = useMemo(() => languages(pageLanguage), [pageLanguage]);
    const chosen = value === undefined ? undefined : languageOf(value, pageLanguage);
    // What the player writes to look for one; undefined while the list is closed.
    const [typed, setTyped] = useState<string>();
    const [active, setActive] = useState(0);
    const list = useId();
    const open = typed !== undefined;
    const written = typed?.trim() ?? "";
    const found = open ? all.filter((language) => matches(language, written)) : [];
    const whole = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(written) && !all.some((language) => language.code.toLowerCase() === written.toLowerCase());
    const extra = whole ? languageOf(written, pageLanguage) : undefined;
    const options = extra === undefined ? found : [extra, ...found];

    // The option the arrows are on stays in view.
    useEffect(() => {
        if (open) {
            document.getElementById(`${list}-${active}`)?.scrollIntoView({ block: "nearest" });
        }
    }, [open, active]);

    const pick = (code: string): void => {
        setTyped(undefined);

        if (code !== value) {
            onPick(code);
        }
    };

    const key = (event: KeyboardEvent): void => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();

            if (!open) {
                setTyped("");
                return;
            }

            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((at) => (options.length === 0 ? 0 : (at + step + options.length) % options.length));
        } else if (event.key === "Enter" && open) {
            event.preventDefault();
            const option = options[active];

            if (option !== undefined) {
                pick(option.code);
            }
        } else if (event.key === "Escape" && open) {
            event.preventDefault();
            setTyped(undefined);
        }
    };

    return (
        <div class={open ? "language-choice open" : "language-choice"}>
            <input
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={list}
                aria-autocomplete="list"
                aria-activedescendant={open && options[active] !== undefined ? `${list}-${active}` : undefined}
                aria-labelledby={labelledBy}
                aria-describedby={describedBy}
                value={open ? typed : chosen?.own ?? value ?? ""}
                placeholder={t("Search a language…")}
                autoComplete="off"
                spellcheck={false}
                onFocus={() => {
                    setTyped("");
                    setActive(Math.max(0, all.findIndex((language) => language.code === value)));
                }}
                onInput={(event) => {
                    setTyped(event.currentTarget.value);
                    setActive(0);
                }}
                onKeyDown={key}
                onBlur={() => setTyped(undefined)}
            />
            <svg class="language-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9.5l6 6 6-6" />
            </svg>
            {open && (
                <ul id={list} class="language-list" role="listbox" aria-label={t("Languages")}>
                    {options.length === 0
                        ? <li class="language-none" role="presentation">{t("No language matches: write its code, such as pt-BR.")}</li>
                        : options.map((language, index) => (
                            <li
                                key={language.code}
                                id={`${list}-${index}`}
                                role="option"
                                aria-selected={language.code === value}
                                class={[index === active ? "active" : "", language.page && options[index + 1]?.page === false ? "page-last" : ""].filter((name) => name !== "").join(" ") || undefined}
                                // A press keeps the field's focus, so that the click reaches the option before the list closes.
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => pick(language.code)}
                            >
                                <span class="language-own" lang={language.code}>{language.own}</span>
                                {language.here !== undefined && <span class="language-here">{language.here}</span>}
                                {language.page && <span class="language-page">{t("page translated")}</span>}
                                <span class="language-code">{language.code}</span>
                            </li>
                        ))}
                </ul>
            )}
        </div>
    );
}

/** What the chosen language means for the page: the master plays in it, and the page is in it too, or stays in English until it is translated. */
export function languageLine(code: string): string
{
    const pageLanguage = document.documentElement.lang || "en";
    const language = languageOf(code, pageLanguage);
    const name = languageName(code, pageLanguage) ?? code;
    const flying = pageTranslation();
    const state = language?.page === true ? "ready" : flying?.language === code.toLowerCase() ? flying.state : undefined;

    if (state === "translating") {
        return t("The master plays in {language}; this computer is translating the page into it, in English meanwhile.", { language: name });
    }

    if (state === "unable") {
        return t("The master plays in {language}; the page stays in English: Codex or Claude Code would translate it on this computer.", { language: name });
    }

    return state === "ready"
        ? t("The master plays in {language}, and the page is written in it too.", { language: name })
        : t("The master plays in {language}; the page stays in English.", { language: name });
}
