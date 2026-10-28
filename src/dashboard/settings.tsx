// The Settings section (D-341): the player's settings of the campaign in groups, each with what it is and its values, which the page changes as config does,
// the master hearing of it at their next call; then the page's own, kept in this browser: the theme, the dice's sound, set and edges, the coins, rolling by hand.
import type { ComponentChildren } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";
import { sectionLabel } from "./address.ts";
import { changeSetting, readSettings, type SettingChange } from "./api.ts";
import type { PlayerSetting, ShownWidget, WidgetPage, WidgetSpot } from "./data.ts";
import { coinDesignPref, coinDesigns, coinLook, coinMetals, coinPref, diceEdgesPref, diceLook, diceSetPref, diceSets, texturePath } from "./dice/sets.ts";
import { WidgetsContext } from "./extension-widgets.tsx";
import { CoinFace } from "./faces.tsx";
import { DieSwatch, Icon } from "./icons.tsx";
import { phraseLabel, settingLabel, valueLabel } from "./labels.ts";
import { LanguageChoice, languageLine } from "./language-choice.tsx";
import { PageHead } from "./pages.tsx";
import { byHandPref, conditionsPref, readChoice, soundPref, tokenSymbolsPref, useChoice, usePref, usePrefChange, writeChoice } from "./prefs.ts";
import { Confirm } from "./saves.tsx";
import { applyGameStyle, gameStyle, systemStylePref } from "./system-style.ts";
import { arrowStep, t } from "./text.ts";
import { pickTheme, shownTheme } from "./theme.ts";

// The groups of the campaign's settings, in order; a setting the game system adds goes with the dice, as whether the master's rolls are shown (D-287). How the
// master plays holds who voices the characters (D-490) and how much the master thinks (D-462) too.
const groups: { names: string[]; system?: true; }[] = [
    { names: ["ruleset", "difficulty", "lethality", "saves", "rigor"] },
    { names: ["mentor", "learned"] },
    { names: ["prose", "story", "author", "style", "voices", "effort"] },
    { names: ["dice", "master-rolls", "units"], system: true },
    { names: ["lines", "veils"] },
    { names: ["pictures", "language"] },
];

/** The Settings section; with `several` player characters, what a value means says so where it speaks of one character (D-480 (2)). */
export function SettingsView({ version, several = false }: { version: number; several?: boolean; })
{
    const [settings, setSettings] = useState<PlayerSetting[]>();
    const [problem, setProblem] = useState<string>();
    const reads = useRef(0);

    // Only the last reading counts, as after quick changes.
    const read = (): void => {
        const reading = ++reads.current;
        void readSettings().then(
            (read) => reading === reads.current && setSettings(read),
            (error: unknown) => setProblem(error instanceof Error ? error.message : String(error)),
        );
    };

    // Read again whenever the campaign changes, as after a change made here or by the master.
    useEffect(read, [version]);

    // While a setting says how to have what this computer lacks, as pictures without Codex, read again each minute: the engine asks again.
    const waiting = settings?.some((setting) => setting.note?.fix === true) === true;

    useEffect(() => {
        const timer = waiting ? setInterval(read, 60_000) : undefined;
        return () => clearInterval(timer);
    }, [waiting]);

    const change = async (body: SettingChange): Promise<string | undefined> => {
        const said = await changeSetting(body);
        read();
        return said;
    };

    const known = new Set(groups.flatMap((group) => group.names));
    return (
        <section class="settings" aria-labelledby="settings-title">
            <PageHead section="settings" id="settings-title" />
            <p class="settings-lead">{t("A change counts at once, from now on: what is already in play stays as it is. The master hears of it at their next move, and of nothing you put back as it was.")}</p>
            {problem !== undefined && <p class="settings-problem" role="alert">{problem}</p>}
            {settings !== undefined && groups.map((group, index) => {
                const shown = [
                    ...group.names.flatMap((name) => settings.filter((setting) => setting.name === name)),
                    ...(group.system ? settings.filter((setting) => !known.has(setting.name)) : []),
                ];
                return (
                    <section key={group.names[0]} class="settings-group">
                        <h3>{groupTitle(index)}</h3>
                        {shown.map((setting) => <SettingRow key={setting.name} setting={setting} off={offBy(setting, settings)} several={several} onChange={change} />)}
                    </section>
                );
            })}
            <WidgetSettings onChange={change} />
            <PageSettings />
        </section>
    );
}

/**
 * What a value of a setting means, in the page's language; with more than one player character, checkpoint goes back when all die, or when one does and the
 * table chooses it (D-480 (2)), in place of the words for one.
 */
function meansText(setting: string, value: string, means: string, several: boolean): string
{
    return several && setting === "saves" && value === "checkpoint" ? t("if they all die, or if the table chooses it when one dies: back to the end of the last scene") : t(means);
}

/** Why a setting counts for nothing now, as the prose while an author is written (D-395); undefined for one that counts. */
function offBy(setting: PlayerSetting, settings: PlayerSetting[]): string | undefined
{
    const author = settings.find((one) => one.name === "author")?.value;
    return setting.name === "prose" && author !== undefined ? t("The author you wrote takes its place: this counts again once you clear the author.") : undefined;
}

/**
 * One setting: its name and what it is, its values to choose from, a list's items to add and take off, the player's own words, or the language; what the chosen
 * value means; why it counts for nothing now, its values still to choose.
 */
function SettingRow({ setting, off, several = false, onChange }: { setting: PlayerSetting; off?: string; several?: boolean; onChange(change: SettingChange): Promise<string | undefined>; })
{
    // The value just picked shows at once, until the setting is read again.
    const [picked, setPicked] = useState<string>();
    const resting = useRef<{ choice: string; timer: ReturnType<typeof setTimeout>; }>();
    const said = useSaid();
    const value = picked ?? setting.value;
    const id = `setting-${idOf(setting.name)}`;
    // The version of the rules changes the game's rules: it asks first (D-514 (2)).
    const [asking, setAsking] = useState<string>();
    const rules = setting.name === rulesetSetting;

    useEffect(() => setPicked(undefined), [setting]);

    // A choice the arrows left still resting goes when the section closes.
    useEffect(() => () => {
        if (resting.current !== undefined) {
            clearTimeout(resting.current.timer);

            // Never the rules without the player's yes.
            if (!rules) {
                void onChange({ setting: setting.name, value: resting.current.choice });
            }
        }
    }, []);

    const row = useRef<HTMLDivElement>(null);

    // The focus on the value chosen, once the dialog that asked is gone.
    const focusChosen = (): void => {
        requestAnimationFrame(() => row.current?.querySelector<HTMLElement>("[role=radio][aria-checked=true]")?.focus());
    };

    const send = (change: SettingChange): void => {
        // The arrows that rest back on the rules played change nothing, and ask nothing.
        if (rules && "value" in change) {
            if (change.value === setting.value) {
                setPicked(undefined);
            } else {
                setAsking(change.value);
            }

            return;
        }

        void onChange(change).then(said.show);
    };

    // Not changed after all: the rules played show again, with the focus.
    const keep = (): void => {
        setAsking(undefined);
        setPicked(undefined);
        focusChosen();
    };

    // A click chooses at once; the arrows show each value and send the one they rest on, so that the game is changed once.
    const choose = (choice: string, byKey: boolean): void => {
        setPicked(choice);
        clearTimeout(resting.current?.timer);
        resting.current = undefined;

        if (!byKey) {
            send({ setting: setting.name, value: choice });
            return;
        }

        const timer = setTimeout(() => {
            resting.current = undefined;
            send({ setting: setting.name, value: choice });
        }, 700);
        resting.current = { choice, timer };
    };

    const chosen = setting.choices?.find((choice) => choice.value === value);
    const unset = setting.most === undefined && (setting.choices === undefined ? setting.items === undefined && setting.value === undefined : chosen === undefined);
    const described = [`${id}-about`, ...(chosen?.means === undefined ? [] : [`${id}-means`]), ...(off === undefined ? [] : [`${id}-off`])].join(" ");
    return (
        <div ref={row} class={off === undefined ? "setting" : "setting off"}>
            <div class="setting-what">
                <span class="setting-name" id={id}>{settingLabel(setting.name)}</span>
                <span class="setting-about" id={`${id}-about`}>{t(setting.about)}</span>
            </div>
            {setting.choices !== undefined
                ? (
                    <Segmented
                        label={id}
                        described={described}
                        options={setting.choices.map((choice) => ({ value: choice.value, label: choiceLabel(setting.name, choice) }))}
                        value={value}
                        onPick={choose}
                    />
                )
                : setting.name === "language"
                ? <LanguageChoice value={value} labelledBy={id} describedBy={`${id}-about`} onPick={(code) => choose(code, false)} />
                : setting.most !== undefined
                ? <TextSetting setting={setting} label={id} onChange={send} />
                : <ListSetting setting={setting} label={id} onChange={send} />}
            <div class="setting-after">
                {off !== undefined && <p class="setting-off" id={`${id}-off`}>{off}</p>}
                {chosen?.means !== undefined && !rules && (
                    <p class="setting-means" id={`${id}-means`}>
                        <strong>{valueLabel(chosen.value)}:</strong> {meansText(setting.name, chosen.value, chosen.means, several)}
                    </p>
                )}
                {setting.name === "language" && value !== undefined && <p class="setting-means">{languageLine(value)}</p>}
                {unset && <p class="setting-unset">{setting.choices === undefined ? t("Not answered yet: add them here, or the master asks you.") : t("Not chosen yet: choose here, or the master asks you.")}</p>}
                {setting.note !== undefined && <SettingNote note={setting.note} />}
                <p class={said.now?.problem ? "setting-said problem" : "setting-said"} role="status">{said.now?.text}</p>
            </div>
            {asking !== undefined && (
                <Confirm title={t("Play by {rules}?", { rules: choiceLabel(setting.name, setting.choices?.find((choice) => choice.value === asking) ?? { value: asking }, false) })} onClose={keep}>
                    <p>{t("The game follows these rules from the master's next move: the sheets are worked out with them, and the master reads them.")}</p>
                    <p class="confirm-note">{t("What is already in play stays as it is, and you can go back whenever you want.")}</p>
                    <div class="confirm-buttons">
                        <button type="button" class="button" autoFocus onClick={keep}>{t("Cancel")}</button>
                        <button
                            type="button"
                            class="button gold"
                            onClick={() => {
                                setAsking(undefined);
                                focusChosen();
                                void onChange({ setting: setting.name, value: asking }).then(said.show);
                            }}
                        >
                            {t("Change the rules")}
                        </button>
                    </div>
                </Confirm>
            )}
        </div>
    );
}

// The engine's setting of the version of a game system's rules, whatever the system (VER-1).
const rulesetSetting = "ruleset";

/**
 * A value of a setting on its button: a version of the rules by what it is to the player ("The 2014 rules"), as its name says little; any other by its label.
 * `capital` false keeps it as written, for inside a sentence.
 */
function choiceLabel(setting: string, choice: { value: string; means?: string; }, capital = true): string
{
    if (setting !== rulesetSetting || choice.means === undefined) {
        return valueLabel(choice.value);
    }

    const means = t(choice.means);
    return capital ? phraseLabel(means) : means;
}

/** What a change said, in its row: saved for a few seconds, what went wrong until the next change. */
function useSaid(): { now?: { problem: boolean; text: string; }; show(problem: string | undefined): void; }
{
    const [now, setNow] = useState<{ problem: boolean; text: string; }>();
    const timer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => () => clearTimeout(timer.current), []);

    const show = (problem: string | undefined): void => {
        clearTimeout(timer.current);
        setNow(problem === undefined ? { problem: false, text: `✓ ${t("Saved")}` } : { problem: true, text: problem });

        if (problem === undefined) {
            timer.current = setTimeout(() => setNow(undefined), 4000);
        }
    };

    return { now, show };
}

/** A list's items, each to take off, and a field to add one; the focus goes on to the next item when one is taken off. */
function ListSetting({ setting, label, onChange }: { setting: PlayerSetting; label: string; onChange(change: SettingChange): void; })
{
    const [item, setItem] = useState("");
    const [focusAt, setFocusAt] = useState<number>();
    const list = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (focusAt !== undefined) {
            const buttons = list.current?.querySelectorAll<HTMLElement>("li button") ?? [];
            (buttons[Math.min(focusAt, buttons.length - 1)] ?? list.current?.querySelector<HTMLElement>("input"))?.focus();
            setFocusAt(undefined);
        }
    }, [setting.items]);

    return (
        <div class="setting-list" ref={list}>
            <ul aria-labelledby={label}>
                {(setting.items ?? []).map((one, index) => (
                    <li key={one}>
                        {one}
                        <button
                            type="button"
                            class="icon-button"
                            aria-label={t("Take {item} off", { item: one })}
                            data-tip={t("Take off")}
                            onClick={() => {
                                setFocusAt(index);
                                onChange({ setting: setting.name, remove: one });
                            }}
                        >
                            <Icon name="close" />
                        </button>
                    </li>
                ))}
            </ul>
            <form
                onSubmit={(event) => {
                    event.preventDefault();

                    if (item.trim() !== "") {
                        onChange({ setting: setting.name, add: item.trim() });
                        setItem("");
                    }
                }}
            >
                <input
                    type="text"
                    value={item}
                    maxLength={200}
                    placeholder={exampleOf(setting.name) ?? t("Add…")}
                    aria-label={t("Add to {setting}", { setting: settingLabel(setting.name) })}
                    onInput={(event) => setItem(event.currentTarget.value)}
                />
                <button type="submit" class="button" disabled={item.trim() === ""}>{t("Add")}</button>
            </form>
        </div>
    );
}

/**
 * The player's own words, as the author the master writes like (D-395): sent with Enter or Save, back as they were with Escape, cleared with Clear or by
 * saving them empty; the focus stays in the field.
 */
function TextSetting({ setting, label, onChange }: { setting: PlayerSetting; label: string; onChange(change: SettingChange): void; })
{
    const saved = setting.value ?? "";
    const [text, setText] = useState(saved);
    const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
    const form = useRef<HTMLFormElement>(null);
    // As the engine keeps them: on one line, without spaces around.
    const said = text.replace(/\s+/g, " ").trim();

    useEffect(() => setText(saved), [saved]);

    const send = (words: string): void => {
        onChange({ setting: setting.name, value: words === "" ? "none" : words });
    };

    const keys = (event: KeyboardEvent): void => {
        if (event.key === "Escape" && text !== saved) {
            event.preventDefault();
            setText(saved);
        } else if (event.key === "Enter" && !event.isComposing && field.current instanceof HTMLTextAreaElement) {
            // A line break would be folded anyway: Enter sends, as in the field of one line; not while it picks a word of a script, as Japanese.
            event.preventDefault();
            form.current?.requestSubmit();
        }
    };

    const attributes = {
        ref: field,
        value: text,
        maxLength: setting.most,
        placeholder: exampleOf(setting.name),
        "aria-labelledby": label,
        "aria-describedby": `${label}-about`,
        onInput: (event: Event) => setText((event.currentTarget as HTMLInputElement).value),
        onKeyDown: keys,
    };
    return (
        <form
            class="setting-text"
            ref={form}
            onSubmit={(event) => {
                event.preventDefault();

                if (said !== saved) {
                    send(said);
                }
            }}
        >
            {(setting.most ?? 0) > 100 ? <textarea rows={2} {...attributes} /> : <input type="text" {...attributes} />}
            <span class="setting-text-buttons">
                <button type="submit" class="button" disabled={said === saved}>{t("Save")}</button>
                {saved !== "" && (
                    <button
                        type="button"
                        class="button"
                        aria-label={t("Clear {setting}", { setting: settingLabel(setting.name) })}
                        onClick={() => {
                            setText("");
                            send("");
                            field.current?.focus();
                        }}
                    >
                        {t("Clear")}
                    </button>
                )}
            </span>
        </form>
    );
}

/** What the player should know of a setting on this computer, as how to have pictures: its lines, its steps in order, and the commands to copy. */
function SettingNote({ note }: { note: { text: string; fix?: true; }; })
{
    const blocks = noteBlocks(t(note.text));
    return (
        <div class={note.fix ? "setting-note fix" : "setting-note"}>
            <Icon name="info" />
            <div class="setting-note-text">
                {blocks.map((block, index) =>
                    typeof block === "string" ? <p key={index}>{withCommands(block)}</p> : (
                        <ol key={index}>
                            {block.map((step) => <li key={step}>{withCommands(step)}</li>)}
                        </ol>
                    )
                )}
            </div>
        </div>
    );
}

/** A note's lines, those numbered as steps together. */
function noteBlocks(text: string): (string | string[])[]
{
    const blocks: (string | string[])[] = [];

    for (const line of text.split("\n")) {
        const step = /^\d+\.\s+(.+)$/.exec(line)?.[1];
        const last = blocks.at(-1);

        if (step === undefined) {
            blocks.push(line);
        } else if (Array.isArray(last)) {
            last.push(step);
        } else {
            blocks.push([step]);
        }
    }

    return blocks;
}

/** A line with its commands, written between backticks, as code with a button that copies them. */
function withCommands(line: string)
{
    return line.split(/(`[^`]+`)/).map((part, index) => part.startsWith("`") && part.endsWith("`") && part.length > 2 ? <Command key={index} text={part.slice(1, -1)} /> : part);
}

/** A command to type in a terminal, and a button that copies it. */
export function Command({ text }: { text: string; })
{
    const [copied, setCopied] = useState(false);

    const copy = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Where the browser keeps the clipboard, the command stays there to select.
        }
    };

    return (
        <span class="setting-command">
            {/* Its words wrap only between them, never at a hyphen of a package's name; one wider than the line wraps within. */}
            <code>{text.split(" ").flatMap((word, index) => [index === 0 ? "" : " ", <span key={index} class="command-word">{word}</span>])}</code>
            <button type="button" class="setting-copy" aria-label={t("Copy {command}", { command: text })} onClick={() => void copy()}>{copied ? t("Copied") : t("Copy")}</button>
        </span>
    );
}

/**
 * Under the theme, the game's style, when the campaign's system has one, a theme or a page style (D-528): its own or the page's, kept in this browser for that
 * system; the page's alone when its theme does not pass the check of legibility.
 */
function gameStyleRows(): PageRow[]
{
    const style = gameStyle();

    if (style.system === undefined || (!style.shows && !style.refused)) {
        return [];
    }

    const choice = systemStylePref(style.system);
    const name = t("Game style");

    if (!style.shows) {
        const means = t("This game's style does not pass the page's check of legibility: the page keeps its own.");
        return [{ name, about: t("the colours, faces and pictures of the game system"), options: [{ value: "page", label: t("The page's"), means }], value: "page", pick: () => undefined }];
    }

    return [{
        name,
        about: style.name === undefined ? t("the colours, faces and pictures of the game system") : t("the colours, faces and pictures of {name}, from the game system", { name: style.name }),
        options: [{ value: "game", label: t("The game's") }, { value: "page", label: t("The page's") }],
        value: readChoice(choice),
        pick: (value) => {
            writeChoice(choice, value);
            applyGameStyle();
        },
    }];
}

/** A name as a part of an element's id, without spaces: "dice sound" is dice-sound. */
function idOf(name: string): string
{
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** A row of the page's own settings: its name, what it is, its values, the one chosen; a row with many values has them under its name. */
interface PageRow
{
    name: string;
    about: string;
    options: Option[];
    value: string;
    pick(value: string): void;
    under?: boolean;
}

/** The page's own settings, in this browser alone: the theme, the game's style, the tokens' symbols and conditions, the dice's sound, set and edges, the coins, rolling by hand. */
function PageSettings()
{
    usePrefChange();
    const [sound, setSound] = usePref(soundPref);
    const [diceSet, setDiceSet] = useChoice(diceSetPref);
    const [edges, setEdges] = useChoice(diceEdgesPref);
    const [coin, setCoin] = useChoice(coinPref);
    const [design, setDesign] = useChoice(coinDesignPref);
    const [byHand, setByHand] = usePref(byHandPref);
    const [symbols, setSymbols] = usePref(tokenSymbolsPref);
    const [conditions, setConditions] = useChoice(conditionsPref);
    const rows: PageRow[] = [
        {
            name: t("Theme"),
            about: t("the page's look"),
            options: [{ value: "light", label: t("Light") }, { value: "dark", label: t("Dark") }],
            value: shownTheme(),
            pick: (value) => pickTheme(value === "dark" ? "dark" : "light"),
        },
        ...gameStyleRows(),
        {
            name: t("Token symbols"),
            about: t("a mark on each token: you, your companions, your foes"),
            options: [{ value: "on", label: t("On") }, { value: "off", label: t("Off") }],
            value: symbols ? "on" : "off",
            pick: (value) => setSymbols(value === "on"),
        },
        {
            name: t("Conditions on tokens"),
            about: t("a mark on each token: what is on them, who is down"),
            options: [{ value: "always", label: t("Always") }, { value: "hover", label: t("On hover") }, { value: "never", label: t("Never") }],
            value: conditions,
            pick: setConditions,
        },
        { name: t("Dice sound"), about: t("the dice as they roll"), options: [{ value: "on", label: t("On") }, { value: "off", label: t("Off") }], value: sound ? "on" : "off", pick: (value) => setSound(value === "on") },
        {
            name: t("Dice set"),
            about: t("what your dice are made of"),
            options: diceSets.map((set) => ({ value: set.value, label: diceSetLabel(set.value) ?? set.label, picture: <SetSwatch value={set.value} /> })),
            value: diceSet,
            pick: setDiceSet,
            under: true,
        },
        // Beside the dice, the coins: of the dice's material, the initial choice, which follows the set chosen, or of a metal (D-526 (1)).
        {
            name: t("Coins"),
            about: t("what your coins are made of"),
            options: [
                { value: "dice", label: t("Like the dice"), picture: <CoinFace side="heads" look={coinLook("dice")} /> },
                ...coinMetals.map((metal) => ({ value: metal.value, label: coinMetalLabel(metal.value) ?? metal.label, picture: <CoinFace side="heads" look={coinLook(metal.value)} /> })),
            ],
            value: coin,
            pick: setCoin,
            under: true,
        },
        // Under them, their design, heads and tails side by side, of the material chosen (D-526 (2)).
        {
            name: t("Coin design"),
            about: t("the pictures on your coins, heads first"),
            options: coinDesigns.map((one) => ({ value: one.value, label: coinDesignLabel(one.value) ?? one.label, picture: <CoinPair design={one.value} /> })),
            value: design,
            pick: setDesign,
            under: true,
        },
        {
            name: t("Dice edges"),
            about: t("how the dice's edges are cut"),
            options: [{ value: "rounded", label: t("Rounded") }, { value: "sharp", label: t("Sharp") }],
            value: edges,
            pick: setEdges,
        },
        {
            name: t("Checks"),
            about: t("what the master asks you to roll"),
            options: [
                { value: "ready", label: t("Ready buttons"), means: t("a button for each roll the master asks") },
                { value: "hand", label: t("By hand"), means: t("you find the row on your sheet, or roll from the tray, as at the table") },
            ],
            value: byHand ? "hand" : "ready",
            pick: (value) => setByHand(value === "hand"),
        },
    ];
    return (
        <section class="settings-group">
            <h3>{t("This page")}</h3>
            <p class="setting-about">{t("Kept in this browser alone.")}</p>
            {rows.map((row) => {
                const id = `page-${idOf(row.name)}`;
                const chosen = row.options.find((option) => option.value === row.value);
                return (
                    <div key={row.name} class={row.under === true ? "setting under" : "setting"}>
                        <div class="setting-what">
                            <span class="setting-name" id={id}>{row.name}</span>
                            <span class="setting-about" id={`${id}-about`}>{row.about}</span>
                        </div>
                        <Segmented label={id} described={chosen?.means === undefined ? `${id}-about` : `${id}-about ${id}-means`} options={row.options} value={row.value} onPick={row.pick} />
                        {chosen?.means !== undefined && (
                            <div class="setting-after">
                                <p class="setting-means" id={`${id}-means`}>
                                    <strong>{chosen.label}:</strong> {chosen.means}
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </section>
    );
}

/**
 * Where the page shows the extensions' widgets (D-502), for the campaign: each in the top, the table's column, a page, or nowhere, and which page; the place its
 * extension gives it sends it back there. None without a widget; never one on each of the party.
 */
function WidgetSettings({ onChange }: { onChange(change: SettingChange): Promise<string | undefined>; })
{
    // One on each of the party stands where its package puts it: there is nowhere else for it (D-514).
    const widgets = useContext(WidgetsContext).filter((widget) => widget.own.place !== "person" && widget.own.place !== "card");

    if (widgets.length === 0) {
        return null;
    }

    return (
        <section class="settings-group">
            <h3>{t("Extensions on the page")}</h3>
            <p class="setting-about">{t("Where the page shows what the extensions add, in this campaign.")}</p>
            {widgets.map((widget) => <WidgetRow key={widget.id} widget={widget} onChange={onChange} />)}
        </section>
    );
}

// The pages a widget's card may stand in, in the order of the sections.
const widgetPages: WidgetPage[] = ["sheet", "scene", "journal", "world"];

function WidgetRow({ widget, onChange }: { widget: ShownWidget; onChange(change: SettingChange): Promise<string | undefined>; })
{
    const [picked, setPicked] = useState<WidgetSpot>();
    const said = useSaid();
    const spot = picked ?? widget;
    const id = `widget-setting-${idOf(widget.id)}`;

    useEffect(() => setPicked(undefined), [widget.place, widget.page]);

    // The extension's own place takes the campaign's away; another is written as a word: top, side, a page's name, off.
    const choose = (next: WidgetSpot): void => {
        setPicked(next);
        const own = next.place === widget.own.place && (next.place !== "page" || next.page === widget.own.page);
        const word = next.place === "page" ? next.page ?? "scene" : next.place;
        void onChange(own ? { setting: "widgets", remove: widget.id } : { setting: "widgets", value: `${widget.id}: ${word}` }).then((problem) => {
            // Already where its extension puts it: nothing to take away.
            said.show(own && problem !== undefined && /has no entry/.test(problem) ? undefined : problem);
        });
    };

    const moved = widget.own.place !== spot.place || (spot.place === "page" && widget.own.page !== spot.page);
    return (
        <div class="setting">
            <div class="setting-what">
                <span class="setting-name" id={id}>{widget.title}</span>
                <span class="setting-about" id={`${id}-about`}>{widget.from}</span>
            </div>
            <div class="widget-spot">
                <Segmented
                    label={id}
                    described={`${id}-about`}
                    options={[
                        { value: "top", label: t("Top bar") },
                        { value: "side", label: t("Column") },
                        { value: "page", label: t("A page") },
                        { value: "off", label: t("Hidden") },
                    ]}
                    value={spot.place}
                    onPick={(place) => choose({ place: place as WidgetSpot["place"], ...(place === "page" ? { page: spot.page ?? widget.own.page ?? "scene" } : {}), order: widget.order })}
                />
                <span class="visually-hidden" id={`${id}-which`}>{t("Which page")}</span>
                {spot.place === "page" && (
                    <Segmented
                        label={`${id} ${id}-which`}
                        described={`${id}-page`}
                        options={widgetPages.map((page) => ({ value: page, label: sectionLabel(page === "sheet" ? "party" : page) }))}
                        value={spot.page}
                        onPick={(page) => choose({ place: "page", page: page as WidgetPage, order: widget.order })}
                    />
                )}
            </div>
            <div class="setting-after">
                <p class="setting-means" id={`${id}-page`}>{moved ? t("Its extension puts it: {place}.", { place: spotLabel(widget.own) }) : t("Where its extension puts it.")}</p>
                <p class={said.now?.problem ? "setting-said problem" : "setting-said"} role="status">{said.now?.text}</p>
            </div>
        </div>
    );
}

/** Where a widget stands, in words: the top bar, the column, a page by its name, hidden. */
function spotLabel(spot: WidgetSpot): string
{
    return spot.place === "top"
        ? t("the top bar")
        : spot.place === "side"
        ? t("the column")
        : spot.place === "off"
        ? t("hidden")
        : sectionLabel(spot.page === "sheet" ? "party" : spot.page ?? "scene");
}

/** A set of dice's d20, in its colours or its grain. */
function SetSwatch({ value }: { value: string; })
{
    const look = diceLook(value);
    return <DieSwatch body={look.swatch ?? look.body} ink={look.ink} picture={look.finish.texture === undefined ? undefined : texturePath(look.finish.texture)} />;
}

/** A value to choose, with what it means when chosen, and a picture before its name. */
interface Option
{
    value: string;
    label: string;
    means?: string;
    picture?: ComponentChildren;
}

/** Values to choose one of, as a radio group: the arrows move among them and choose, one stop of Tab; the chosen one in gold. */
function Segmented({ label, described, options, value, onPick }: {
    label: string;
    described: string;
    options: Option[];
    value?: string;
    onPick(value: string, byKey: boolean): void;
})
{
    const at = options.findIndex((option) => option.value === value);

    const move = (event: KeyboardEvent): void => {
        const step = arrowStep(event.key);

        if (step === 0) {
            return;
        }

        event.preventDefault();
        // From the value the focus is on, which a quick key reaches before the page draws the last choice.
        const buttons = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("button")];
        const from = buttons.indexOf(event.target as HTMLElement);
        const next = ((from >= 0 ? from : Math.max(at, 0)) + step + options.length) % options.length;
        onPick(options[next].value, true);
        buttons[next]?.focus();
    };

    return (
        <span class="segmented" role="radiogroup" aria-labelledby={label} aria-describedby={described} onKeyDown={move}>
            {options.map((option, index) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={option.value === value}
                    tabIndex={index === Math.max(at, 0) ? 0 : -1}
                    onClick={() => option.value !== value && onPick(option.value, false)}
                >
                    {option.picture}
                    {option.label}
                </button>
            ))}
        </span>
    );
}

/** A group of the campaign's settings by its place, in the page's language. */
function groupTitle(index: number): string
{
    return [t("The game"), t("Learning the game"), t("The master's style"), t("Dice and measures"), t("Limits"), t("Pictures and language")][index] ?? "";
}

/** What a list's field suggests, as an example. */
function exampleOf(name: string): string | undefined
{
    const examples: Record<string, string> = {
        lines: t("Add, e.g. spiders"),
        veils: t("Add, e.g. torture"),
        learned: t("Add what you know, e.g. Initiative"),
        author: t("An author's name"),
        style: t("e.g. third person, past tense; more dialogue"),
    };
    return examples[name];
}

/** A design's heads and tails, one before the other, as the player's coins are. */
function CoinPair({ design }: { design: string; })
{
    return (
        <span class="coin-pair">
            <CoinFace side="heads" design={design} />
            <CoinFace side="tails" design={design} />
        </span>
    );
}

/** A coin's design by its name in the page's language; undefined for one the page does not name. */
function coinDesignLabel(value: string): string | undefined
{
    const labels: Record<string, string> = {
        sun: t("Sun and moon"),
        crown: t("Crown and tower"),
        rose: t("Rose and skull"),
        planet: t("Planet and comet"),
        gear: t("Gear and lightning"),
        eye: t("Eye and star"),
    };
    return labels[value];
}

/** A coin's metal by its name in the page's language; undefined for one the page does not name. */
function coinMetalLabel(value: string): string | undefined
{
    const labels: Record<string, string> = { gold: t("Gold"), silver: t("Silver"), copper: t("Copper"), bronze: t("Bronze"), iron: t("Burnished iron") };
    return labels[value];
}

/** A set of dice by its name in the page's language; undefined for one the page does not name. */
function diceSetLabel(value: string): string | undefined
{
    const labels: Record<string, string> = {
        theme: t("Theme"),
        ivory: t("Ivory"),
        obsidian: t("Obsidian"),
        ruby: t("Ruby"),
        emerald: t("Emerald"),
        sapphire: t("Sapphire"),
        amethyst: t("Amethyst"),
        "ruby-crystal": t("Crystal ruby"),
        "sapphire-crystal": t("Crystal sapphire"),
        "amethyst-crystal": t("Crystal amethyst"),
        glass: t("Glass"),
        ice: t("Ice"),
        steel: t("Steel"),
        brass: t("Brass"),
        walnut: t("Walnut"),
        ash: t("Ash"),
        marble: t("Marble"),
        onyx: t("Onyx"),
        granite: t("Granite"),
    };
    return labels[value];
}
