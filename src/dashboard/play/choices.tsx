// The choices the master prepares for one of the party, as a new level (D-556): a notice on their sheet, a mark on their token and on the Party's tab, and their
// page, #/choices/<who>, where the player picks when they like, reads beside the options the pages they name (#/choices/<who>/<page>), rolls where an option
// rolls, and confirms; the master hears the answers and writes them. The words and pages are the master's, the parts the page's: nothing of one game.
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { choicesAddress } from "../address.ts";
import { changeChoices, type ChoicesChange, readChoices, readView } from "../api.ts";
import type { ChoicesNow, Member, OptionPage, ShownChoice, ShownChoices, ShownOption, ShownRoll } from "../data.ts";
import { useMedia } from "../parts/card.tsx";
import { Icon, NotationIcons } from "../parts/icons.tsx";
import { diceIn, shownNotation } from "../parts/labels.ts";
import { type LinkTo, Markdown } from "../parts/markdown.tsx";
import { sheetAddress, sideOf, Token } from "../sheet/party.tsx";
import { arrowStep, capitalized, foldedText, t } from "../text.ts";

// From this width an option's page stands beside the choices; under it, in their place.
const wide = "(min-width: 900px)";
// From how many options a choice has its search, and the ones chosen over it.
const longList = 9;
// How long at most a roll's total waits for its dice, when they never land.
const longestRoll = 12_000;

/** Someone's sets of choices, waiting or confirmed, in the order the master made them. */
export function choicesOf(choices: ChoicesNow | undefined, who: string | undefined): ShownChoices[]
{
    return who === undefined ? [] : (choices?.sets ?? []).filter((set) => set.who === who);
}

/** Whether a set still waits for the player: not confirmed yet. */
export function waits(set: ShownChoices): boolean
{
    return set.confirmed === undefined;
}

/** The notice of a set of someone's choices on their sheet: a strip to its page with how far the player is; once confirmed, that the master writes them. */
export function ChoicesNotice({ set }: { set: ShownChoices; })
{
    const confirmed = !waits(set);
    // What the player must choose counts; an optional choice only when it is all there is.
    const required = set.items.filter((item) => item.least > 0);
    const counted = required.length > 0 ? required : set.items;
    const done = counted.filter(settled).length;
    return (
        <a class={confirmed ? "choices-notice confirmed" : "choices-notice"} href={choicesAddress(set.who)}>
            <Icon name={confirmed ? "check" : "levelUp"} />
            <span class="choices-notice-words">
                <span>{confirmed ? t("{title}: confirmed", { title: set.title }) : t("{title}: choices waiting", { title: set.title })}</span>
                <small>{confirmed ? t("The master writes them on the sheet") : t("Whenever you like · {done} of {count} done", { done, count: counted.length })}</small>
            </span>
            <span class="choices-notice-go">
                {!confirmed && <span class="choices-notice-word">{t("Choose")}</span>}
                <Icon name="fold" />
            </span>
        </a>
    );
}

/**
 * The page of someone's choices: the way back to their sheet, then each set of theirs with its steps, its choices and its end; the page of an option open
 * beside them on a wide screen, in their place on a phone. `flying` is the roll whose dice are in the air, whose total waits for them.
 */
export function ChoicesPage({ who, open, choices, member, version, flying, onChanged }: {
    who: string | undefined;
    open?: string | undefined;
    choices: ChoicesNow | undefined;
    member?: Member | undefined;
    version: number;
    flying?: ShownRoll | undefined;
    onChanged: (now: ChoicesNow) => void;
})
{
    const besides = useMedia(wide);
    const sets = choicesOf(choices, who);
    const name = who ?? "";
    // On a phone an option's page takes the place of the choices, with the way back to them alone.
    const readingSet = open === undefined || besides ? undefined : sets.find((set) => openOption(set, open) !== undefined);
    const back = (
        <a class="button quiet choices-back" href={member === undefined ? "#/party" : sheetAddress(member.name)}>
            <Icon name="fold" />
            {capitalized(t("{name}'s sheet", { name }))}
        </a>
    );

    if (choices === undefined) {
        return <p class="choices-none">{t("Reading…")}</p>;
    }

    if (sets.length === 0) {
        return (
            <section class="choices" aria-label={t("{name}'s choices", { name })}>
                {back}
                <p class="choices-none">{t("{name} has no choices waiting: the master prepares them when the game asks for some, as at a new level.", { name })}</p>
            </section>
        );
    }

    return (
        <div class="choices-page">
            {readingSet === undefined && back}
            {open !== undefined && !sets.some((set) => openOption(set, open) !== undefined) && <p class="choices-none" role="status">{t("No option here is called “{name}”.", { name: open })}</p>}
            {(readingSet === undefined ? sets : [readingSet]).map((set, index) => (
                <ChoiceSet
                    key={set.id}
                    set={set}
                    first={index === 0}
                    member={member}
                    physical={choices.physical}
                    open={open}
                    besides={besides}
                    version={version}
                    flying={flying}
                    onChanged={onChanged}
                />
            ))}
        </div>
    );
}

/** A set of choices: its head, its steps, its choices, the page of an option open, and its end with what is missing and the confirm. */
function ChoiceSet({ set, first, member, physical, open, besides, version, flying, onChanged }: {
    set: ShownChoices;
    first: boolean;
    member?: Member | undefined;
    physical: boolean;
    open?: string | undefined;
    besides: boolean;
    version: number;
    flying?: ShownRoll | undefined;
    onChanged: (now: ChoicesNow) => void;
})
{
    const [problem, setProblem] = useState<{ item?: number; text: string; }>();
    const [sending, setSending] = useState(false);
    // The choice whose roll was sent: its total waits for the dice, seen in the air, to land.
    const [rolling, setRolling] = useState<{ item: number; seen: boolean; }>();
    const box = useRef<HTMLElement>(null);
    const title = useRef<HTMLHeadingElement>(null);
    const done = useRef<HTMLParagraphElement>(null);
    const lastRead = useRef<string | undefined>(undefined);
    const confirmed = !waits(set);
    const reading = open === undefined ? undefined : openOption(set, open);
    const missing = set.items.map((item, index) => ({ item, index })).filter((one) => !answered(one.item));
    const key = idOf(set);

    // The page opened from the sheet's notice starts at its title, for a screen reader to read it.
    useEffect(() => {
        if (first && open === undefined) {
            title.current?.focus({ preventScroll: true });
        }
    }, []);

    // An option's page closed, the focus goes back to its Read, in sight on a phone.
    useEffect(() => {
        if (reading !== undefined) {
            lastRead.current = reading.option.pages?.[0]?.name;
            return;
        }

        const name = lastRead.current;
        lastRead.current = undefined;
        const link = name === undefined ? undefined : [...box.current?.querySelectorAll<HTMLElement>(".choice-read") ?? []].find((one) => one.dataset.name === name);
        link?.focus({ preventScroll: true });

        if (!besides) {
            link?.scrollIntoView({ block: "center" });
        }
    }, [reading?.option.pages?.[0]?.name]);

    // A roll's total shows once its dice, seen in the air, have landed; or after a while, when they never fly.
    useEffect(() => {
        if (rolling === undefined) {
            return;
        }

        if (flying?.by === "player" && !rolling.seen) {
            setRolling({ ...rolling, seen: true });
        } else if (flying === undefined && rolling.seen) {
            setRolling(undefined);
        }
    }, [flying?.id, rolling?.seen, rolling?.item]);

    useEffect(() => {
        if (rolling === undefined) {
            return;
        }

        const timer = window.setTimeout(() => setRolling(undefined), longestRoll);
        return () => window.clearTimeout(timer);
    }, [rolling?.item]);

    const send = async (change: ChoicesChange, item?: number): Promise<boolean> => {
        setProblem(undefined);
        const now = await changeChoices(change);

        if (now === undefined || now === "changed") {
            setProblem({ ...(item === undefined ? {} : { item }), text: now === undefined ? t("It did not reach the game: try again.") : t("The choices changed meanwhile: here they are as they are now.") });

            if (now === "changed") {
                void readChoices().then(onChanged, () => undefined);
            }

            return false;
        }

        onChanged(now);
        return true;
    };

    const roll = async (item: number, option: ShownOption, faces?: number[]): Promise<boolean> => {
        if (faces === undefined) {
            setRolling({ item, seen: false });
        }

        const taken = await send({ id: set.id, item, roll: option.text, ...(faces === undefined ? {} : { faces }) }, item);

        if (!taken) {
            setRolling(undefined);
        }

        return taken;
    };

    const focusItem = (index: number): void => {
        const heading = document.getElementById(`${key}-${index}`);
        heading?.focus({ preventScroll: true });
        heading?.closest(".choice-item")?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };

    const confirm = async (): Promise<void> => {
        if (missing.length > 0 || sending) {
            if (missing[0] !== undefined) {
                focusItem(missing[0].index);
            }

            return;
        }

        setSending(true);
        const taken = await send({ id: set.id, confirm: true, said: t("I confirmed my choices: {title}.", { title: set.title }) });
        setSending(false);

        if (taken) {
            requestAnimationFrame(() => done.current?.focus());
        }
    };

    const link = optionLinks(set);

    // On a phone, an option's page in place of the choices, with the way back to them.
    if (reading !== undefined && !besides) {
        return (
            <section class="choices" ref={box} aria-label={t("{name}'s choices", { name: set.who })}>
                <a class="button quiet choices-back" href={choicesAddress(set.who)}>
                    <Icon name="fold" />
                    {t("Back to the choices")}
                </a>
                <ChoiceReader
                    set={set}
                    at={reading.item}
                    option={reading.option}
                    page={reading.page}
                    version={version}
                    phone
                    link={link}
                    closed={confirmed || rolling !== undefined}
                    onPick={(answer) => void send({ id: set.id, item: reading.item, answer }, reading.item)}
                />
            </section>
        );
    }

    return (
        <section class="choices" ref={box} aria-labelledby={`${key}-title`}>
            <header class="choices-head">
                <Token member={member ?? { name: set.who, role: "other" }} large side={member === undefined ? undefined : sideOf(member.role)} />
                <div>
                    <p class="eyebrow accent">{t("{name}'s choices", { name: set.who })}</p>
                    <h2 id={`${key}-title`} tabIndex={-1} ref={title} dir="auto">{set.title}</h2>
                    <p class="choices-lead">
                        {confirmed
                            ? t("Confirmed: they are the master's now, who writes them on the sheet and tells you.")
                            : t("Choose whenever you like: the story goes on meanwhile. Read the pages here; ask the master anything in the chat.")}
                    </p>
                </div>
            </header>
            <ol class="choices-steps" aria-label={t("The choices")}>
                {set.items.map((item, index) => (
                    <li key={index} class={settled(item) ? "done" : index === missing[0]?.index ? "now" : undefined}>
                        <button type="button" onClick={() => focusItem(index)}>
                            <span class="step-dot num" dir="ltr" aria-hidden="true">
                                {settled(item) ? <Icon name="check" /> : item.most > 1 && item.answer.length > 0 ? `${item.answer.length}/${item.most}` : index + 1}
                            </span>
                            <bdi>{item.question}</bdi>
                            <span class="visually-hidden">{stateWords(item)}</span>
                        </button>
                    </li>
                ))}
            </ol>
            <div class={reading === undefined ? "choices-body" : "choices-body reading"}>
                <div class="choices-items">
                    {set.items.map((item, index) => (
                        <ChoiceItem
                            key={index}
                            set={set}
                            item={item}
                            at={index}
                            physical={physical}
                            closed={confirmed}
                            rolling={rolling?.item === index}
                            reading={reading?.item === index ? reading.option.text : undefined}
                            problem={problem?.item === index ? problem.text : undefined}
                            onPick={(answer) => void send({ id: set.id, item: index, answer }, index)}
                            onRoll={(option, faces) => roll(index, option, faces)}
                        />
                    ))}
                </div>
                {reading !== undefined && (
                    <ChoiceReader
                        key={reading.option.text}
                        set={set}
                        at={reading.item}
                        option={reading.option}
                        page={reading.page}
                        version={version}
                        link={link}
                        closed={confirmed || rolling !== undefined}
                        onPick={(answer) => void send({ id: set.id, item: reading.item, answer }, reading.item)}
                    />
                )}
            </div>
            <footer class="choices-foot">
                {confirmed
                    ? (
                        <p class="choices-done" tabIndex={-1} ref={done}>
                            <Icon name="check" />
                            {t("Confirmed: they are the master's now, who writes them on the sheet and tells you.")}
                        </p>
                    )
                    : (
                        <>
                            {missing.length > 0 && (
                                <p class="choices-missing">
                                    <span class="eyebrow">{t("Still to choose")}</span>
                                    {missing.map((one) => (
                                        <button key={one.index} type="button" class="setup-chip" onClick={() => focusItem(one.index)}>
                                            <bdi>{one.item.question}</bdi>
                                            {one.item.most > 1 && <span class="num">{` · ${t("{count} of {most}", { count: one.item.answer.length, most: one.item.most })}`}</span>}
                                        </button>
                                    ))}
                                </p>
                            )}
                            <button type="button" class="button gold" aria-disabled={missing.length > 0 || sending ? true : undefined} aria-describedby={`${key}-after`} onClick={() => void confirm()}>
                                <Icon name="check" />
                                {t("Confirm the choices")}
                            </button>
                            {problem !== undefined && problem.item === undefined && <p class="choices-problem" role="alert">{problem.text}</p>}
                            <p class="choices-after" id={`${key}-after`}>
                                {t("Once you confirm, the master writes them on the sheet and tells you. Until then you can change everything but a roll made.")}
                            </p>
                        </>
                    )}
            </footer>
        </section>
    );
}

/** A choice: its question and state, the ones chosen and a search over a long list, its options as cards, and what to know of it. */
function ChoiceItem({ set, item, at, physical, closed, rolling, reading, problem, onPick, onRoll }: {
    set: ShownChoices;
    item: ShownChoice;
    at: number;
    physical: boolean;
    closed: boolean;
    rolling: boolean;
    reading?: string | undefined;
    problem?: string | undefined;
    onPick: (answer: string[]) => void;
    onRoll: (option: ShownOption, faces?: number[]) => Promise<boolean>;
})
{
    const [search, setSearch] = useState("");
    const field = useRef<HTMLInputElement>(null);
    const key = `${idOf(set)}-${at}`;
    // One among them is a radio; any other number, or one that may be none, a checkbox.
    const single = item.least === 1 && item.most === 1;
    const rolled = item.rolled !== undefined;
    const full = !single && item.answer.length >= item.most;
    const long = item.options.length >= longList;
    const found = search.trim() === "" ? item.options : item.options.filter((option) => foldedText(`${option.label} ${(option.pages ?? []).map((page) => `${page.title} ${page.opening}`).join(" ")}`).includes(foldedText(search.trim())));
    const chosen = item.options.filter((option) => item.answer.includes(option.text));
    const shut = (option: ShownOption): boolean => closed || rolled || rolling || (full && !item.answer.includes(option.text));
    // The radio group's one stop: the option chosen, else the first that may be.
    const chosenAt = found.findIndex((option) => item.answer.includes(option.text));
    const stop = chosenAt >= 0 ? chosenAt : Math.max(0, found.findIndex((option) => !shut(option)));
    const total = rolled ? / = (-?\d+)/.exec(item.rolled ?? "")?.[1] ?? item.rolled : undefined;

    const choose = (option: ShownOption): void => {
        if (shut(option)) {
            return;
        }

        if (option.notation !== undefined) {
            if (physical) {
                document.getElementById(`${key}-${item.options.indexOf(option)}-die-0`)?.focus();
            } else {
                void onRoll(option);
            }

            return;
        }

        const has = item.answer.includes(option.text);

        if (single) {
            if (!has) {
                onPick([option.text]);
            }

            return;
        }

        onPick(has ? item.answer.filter((one) => one !== option.text) : [...item.answer, option.text]);
    };

    // In a radio group the arrows move along the options, choosing as they go; never rolling: a roll is pressed.
    const move = (event: KeyboardEvent): void => {
        const step = arrowStep(event.key);

        if (!single || step === 0 || !(event.target as HTMLElement).classList.contains("choice-pick")) {
            return;
        }

        event.preventDefault();
        const buttons = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(".choice-pick")];
        const next = (buttons.indexOf(event.target as HTMLElement) + step + buttons.length) % buttons.length;
        buttons[next]?.focus();
        const option = found[next];

        if (option !== undefined && option.notation === undefined && !shut(option)) {
            choose(option);
        }
    };

    return (
        <section class="choice-item" aria-labelledby={key}>
            <header class="choice-item-head">
                <p class="eyebrow">{t("Choice {n} of {count}", { n: at + 1, count: set.items.length })}</p>
                <h3 id={key} tabIndex={-1} dir="auto">{item.question}</h3>
                <ItemState item={item} />
            </header>
            {long && chosen.length > 0 && (
                <div class="choice-chosen">
                    <span class="eyebrow" id={`${key}-chosen`}>{t("Chosen")}</span>
                    <ul aria-labelledby={`${key}-chosen`}>
                        {chosen.map((option) => (
                            <li key={option.text} class="chip">
                                <bdi>{option.label}</bdi>
                                {!closed && !rolled && !single && (
                                    <button
                                        type="button"
                                        class="icon-button"
                                        aria-label={t("Take {item} off", { item: option.label })}
                                        data-tip={t("Take {item} off", { item: option.label })}
                                        onClick={() => {
                                            choose(option);
                                            field.current?.focus();
                                        }}
                                    >
                                        <Icon name="close" />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {long && (
                <div class="choice-find">
                    <span class="search">
                        <Icon name="search" />
                        <input
                            ref={field}
                            type="search"
                            value={search}
                            placeholder={t("Search among {count}", { count: item.options.length })}
                            aria-label={t("Search the options of “{question}”", { question: item.question })}
                            onInput={(event) => setSearch(event.currentTarget.value)}
                        />
                    </span>
                </div>
            )}
            {found.length === 0 && (
                <p class="choices-none" role="status">
                    {t("Nothing matches “{query}”.", { query: search })} <button type="button" class="button quiet" onClick={() => setSearch("")}>{t("Clear the search")}</button>
                </p>
            )}
            <div class="choice-options" role={single ? "radiogroup" : "group"} aria-labelledby={key} onKeyDown={move}>
                {found.map((option, index) => {
                    const checked = item.answer.includes(option.text);
                    const rollsHere = option.notation !== undefined;
                    return (
                        <OptionCard
                            key={option.text}
                            id={`${key}-${item.options.indexOf(option)}`}
                            option={option}
                            role={single ? "radio" : "checkbox"}
                            checked={checked}
                            closed={shut(option)}
                            tabIndex={single ? (index === stop ? 0 : -1) : undefined}
                            read={option.text === reading}
                            href={option.pages === undefined ? undefined : choicesAddress(set.who, option.pages[0].name)}
                            total={rollsHere && checked && rolled && !rolling ? total : undefined}
                            about={rollsHere
                                ? rolling && checked
                                    ? t("The dice are rolling…")
                                    : checked && rolled
                                    ? physical ? t("Rolled with your dice") : t("Rolled with the dashboard's dice")
                                    : undefined
                                : undefined}
                            hand={rollsHere && physical && !rolled && !closed && option.notation !== undefined
                                ? <HandDice notation={option.notation} id={`${key}-${item.options.indexOf(option)}`} onWrite={(faces) => onRoll(option, faces)} />
                                : undefined}
                            onChoose={() => choose(option)}
                        />
                    );
                })}
            </div>
            {rolled && <p class="choice-note">{t("A roll made stays.")}</p>}
            {full && !rolled && !closed && item.options.length > item.most && <p class="choice-note">{t("You chose {most}: take one off to choose another.", { most: item.most })}</p>}
            {problem !== undefined && <p class="choices-problem" role="alert">{problem}</p>}
        </section>
    );
}

/** A choice's state beside its question: done, how many of how many, optional with none, or still to choose. */
function ItemState({ item }: { item: ShownChoice; })
{
    if (settled(item)) {
        return (
            <span class="choice-state done">
                <Icon name="check" />
                {t("Done")}
            </span>
        );
    }

    return <span class={item.least === 0 ? "choice-state optional" : "choice-state"}>{stateWords(item)}</span>;
}

/** An option as a card: its mark and words, which choose it; the way to read the page it names; a roll's total, or the field for the player's own dice. */
function OptionCard({ id, option, role, checked, closed, tabIndex, read, href, total, about, hand, onChoose }: {
    id: string;
    option: ShownOption;
    role: "radio" | "checkbox";
    checked: boolean;
    closed: boolean;
    tabIndex?: number | undefined;
    read: boolean;
    href?: string | undefined;
    total?: string | undefined;
    about?: string | undefined;
    hand?: ComponentChildren;
    onChoose: () => void;
})
{
    const opening = about ?? option.pages?.[0].opening;
    const kinds = ["choice-card", checked ? "chosen" : "", closed && !checked ? "closed" : "", option.notation === undefined ? "" : "choice-roll", href === undefined ? "alone" : ""];
    return (
        <div class={kinds.filter((kind) => kind !== "").join(" ")}>
            <button
                type="button"
                class="choice-pick"
                role={role}
                aria-checked={checked}
                aria-disabled={closed ? true : undefined}
                tabIndex={tabIndex}
                aria-labelledby={total === undefined ? `${id}-name` : `${id}-name ${id}-total`}
                aria-describedby={opening === undefined || opening === "" ? undefined : `${id}-about`}
                onClick={onChoose}
            >
                <span class={role === "checkbox" ? "choice-mark square" : "choice-mark"} aria-hidden="true">
                    <Icon name="check" />
                </span>
                <span class="choice-words">
                    <strong id={`${id}-name`} class={option.notation === undefined ? undefined : "choice-dice"}>
                        {option.notation !== undefined && <NotationIcons notation={option.notation} />}
                        <bdi>{option.label}</bdi>
                        {option.notation !== undefined && <bdi class="num">{shownNotation(option.notation)}</bdi>}
                    </strong>
                    {opening !== undefined && opening !== "" && <span class="choice-about" id={`${id}-about`}>{opening}</span>}
                </span>
                {total !== undefined && <span class="choice-total num" id={`${id}-total`}>{total}</span>}
            </button>
            {href !== undefined && option.pages !== undefined && (
                <a
                    class="icon-button choice-read tip-left"
                    href={href}
                    data-name={option.pages[0].name}
                    aria-label={t("Read {name}", { name: option.label })}
                    data-tip={t("Read {name}", { name: option.label })}
                    aria-current={read ? "true" : undefined}
                >
                    <Icon name="read" />
                </a>
            )}
            {hand}
        </div>
    );
}

/** The field of a roll made with the player's own dice: a number for each die, as it landed, then Write. */
function HandDice({ notation, id, onWrite }: { notation: string; id: string; onWrite: (faces: number[]) => Promise<boolean>; })
{
    const dice = diceIn(notation).flatMap((kind) => Array.from({ length: Math.min(kind.count, 10) }, () => kind.sides));
    const [values, setValues] = useState<string[]>(() => dice.map(() => ""));
    const [wrong, setWrong] = useState(false);
    const [sending, setSending] = useState(false);
    const range = (sides: number | "F"): [number, number] => (sides === "F" ? [-1, 1] : [1, sides]);

    const write = async (event: Event): Promise<void> => {
        event.preventDefault();
        const faces = values.map((value) => Number(value.trim().replace("−", "-")));
        const fits = faces.length > 0 && faces.every((face, index) => values[index].trim() !== "" && Number.isInteger(face) && face >= range(dice[index])[0] && face <= range(dice[index])[1]);
        setWrong(!fits);

        if (fits && !sending) {
            setSending(true);
            await onWrite(faces);
            setSending(false);
        }
    };

    return (
        <form class="choice-hand" onSubmit={(event) => void write(event)}>
            <label for={`${id}-die-0`}>{t("With your own dice: what did you roll?")}</label>
            {dice.map((sides, index) => (
                <input
                    key={index}
                    id={`${id}-die-${index}`}
                    class="num"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder={`${range(sides)[0]}–${range(sides)[1]}`}
                    aria-label={dice.length > 1 ? t("Die {n} of {count}", { n: index + 1, count: dice.length }) : undefined}
                    aria-invalid={wrong ? true : undefined}
                    aria-describedby={wrong ? `${id}-wrong` : undefined}
                    value={values[index]}
                    onInput={(event) => {
                        const value = event.currentTarget.value;
                        setValues((before) => before.map((one, at) => (at === index ? value : one)));
                    }}
                />
            ))}
            <button type="submit" class="button" aria-disabled={sending ? true : undefined}>{t("Write")}</button>
            {wrong && <p class="choices-problem" id={`${id}-wrong`} role="alert">{t("Write the number of each die, as it landed.")}</p>}
        </form>
    );
}

/**
 * A page an option names, read whole beside the choices or in their place: what it is for, its title, the way to choose it, the option's other pages, its
 * text.
 */
function ChoiceReader({ set, at, option, page, version, phone, link, closed, onPick }: {
    set: ShownChoices;
    at: number;
    option: ShownOption;
    page: OptionPage;
    version: number;
    phone?: boolean;
    link: LinkTo;
    closed: boolean;
    onPick: (answer: string[]) => void;
})
{
    const [text, setText] = useState<string>();
    const [problem, setProblem] = useState(false);
    const reads = useRef(0);
    const title = useRef<HTMLHeadingElement>(null);
    const item = set.items[at];
    const name = page.name;
    const pages = option.pages ?? [];
    const heading = page.name === pages[0]?.name ? option.label : page.title;
    const key = `${idOf(set)}-reader`;

    // Its whole text, read when it opens and again as the game changes, the last reading alone; its first sentence until then.
    useEffect(() => {
        const reading = ++reads.current;
        readView(name).then(
            (page) => {
                if (reading === reads.current) {
                    setText(page.kind === "page" ? page.text : "");
                    setProblem(false);
                }
            },
            () => reading === reads.current && setProblem(true),
        );
    }, [name, version]);

    // Opened, its title has the focus, for a screen reader to read it; on a phone the page goes back to its top.
    useEffect(() => {
        title.current?.focus({ preventScroll: true });

        if (phone === true) {
            window.scrollTo({ top: 0 });
        }
    }, [name]);

    if (item === undefined) {
        return null;
    }

    const single = item.least === 1 && item.most === 1;
    const checked = item.answer.includes(option.text);
    const shut = closed || item.rolled !== undefined || (!single && !checked && item.answer.length >= item.most);
    const count = single ? undefined : t("{count} of {most}", { count: item.answer.length, most: item.most });
    return (
        <article class="browse-reader choices-reader" aria-labelledby={`${key}-title`}>
            <header class="reader-head">
                <div>
                    <p class="eyebrow">
                        <bdi>{item.question}</bdi>
                        {count !== undefined && <span class="num">{` · ${count}`}</span>}
                    </p>
                    <h3 id={`${key}-title`} tabIndex={-1} ref={title} dir="auto">{heading}</h3>
                </div>
                {phone !== true && (
                    <a class="icon-button tip-left" href={choicesAddress(set.who)} aria-label={t("Close the page")} data-tip={t("Close the page")}>
                        <Icon name="close" />
                    </a>
                )}
            </header>
            <p class="reader-actions">
                {single && checked
                    ? (
                        <span class="choice-picked">
                            <Icon name="check" />
                            {t("Your choice")}
                        </span>
                    )
                    : (
                        <button
                            type="button"
                            class="button"
                            aria-disabled={shut ? true : undefined}
                            onClick={() => !shut && onPick(single ? [option.text] : checked ? item.answer.filter((one) => one !== option.text) : [...item.answer, option.text])}
                        >
                            <Icon name={checked ? "minus" : "plus"} />
                            {checked ? t("Take {item} off", { item: option.label }) : t("Choose {name}", { name: option.label })}
                        </button>
                    )}
            </p>
            {pages.length > 1 && (
                <nav class="filter-chips choices-pages" aria-label={t("The pages this option names")}>
                    {pages.map((one) => (
                        <a key={one.name} href={choicesAddress(set.who, one.name)} aria-current={one.name === page.name ? "page" : undefined}>
                            <bdi>{one.title}</bdi>
                        </a>
                    ))}
                </nav>
            )}
            <div class="reader-text">
                {text === undefined && !problem && page.opening !== "" && <p>{page.opening}</p>}
                {text !== undefined && text.trim() !== "" && <Markdown text={text} link={link} />}
                {text !== undefined && text.trim() === "" && <p>{page.opening}</p>}
                {problem && <p class="choices-none">{t("This page could not be read now: try again in a moment.")}</p>}
            </div>
        </article>
    );
}

/** Whether a choice is answered as it allows: options enough, and the roll made when its option rolls. */
function answered(item: ShownChoice): boolean
{
    const rolls = item.answer.some((text) => item.options.find((option) => option.text === text)?.notation !== undefined);
    return item.answer.length >= item.least && (!rolls || item.rolled !== undefined);
}

/** Whether a choice is done: answered with something picked; an optional one left empty is not, nor missing. */
function settled(item: ShownChoice): boolean
{
    return answered(item) && item.answer.length > 0;
}

/** A choice's state in words: done, how many of how many, optional, or to choose. */
function stateWords(item: ShownChoice): string
{
    if (settled(item)) {
        return t("Done");
    }

    if (item.least === 0 && item.answer.length === 0) {
        return t("Optional");
    }

    return item.most > 1 ? t("{count} of {most}", { count: item.answer.length, most: item.most }) : t("To choose");
}

/** The option of a set whose page is open, by the page's name, with its choice and that page; none when no option names it. */
function openOption(set: ShownChoices, name: string): { item: number; option: ShownOption; page: OptionPage; } | undefined
{
    const named = (exact: boolean) =>
        set.items.flatMap((item, index) =>
            item.options.flatMap((option) => (option.pages ?? []).filter((page) => (exact ? page.name === name : foldedText(page.name) === foldedText(name))).map((page) => ({ item: index, option, page })))
        )[0];
    return named(true) ?? named(false);
}

/** Where a link of an option's page leads: to a page an option of the set names; any other stays words. */
function optionLinks(set: ShownChoices): LinkTo
{
    const pages = new Map(set.items.flatMap((item) => item.options.flatMap((option) => (option.pages ?? []).map((page) => [foldedText(page.name), page.name] as const))));

    return (name) => {
        const page = pages.get(foldedText(name));
        return page === undefined ? undefined : choicesAddress(set.who, page);
    };
}

/** A set's id as the start of its elements' ids. */
function idOf(set: ShownChoices): string
{
    return `choices-${set.id.replace(/[^\w-]/g, "")}`;
}
