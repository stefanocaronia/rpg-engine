// The Settings section (D-341): the player's settings of the campaign in groups, each with what it is and its values, which the page changes as config does,
// the master hearing of it at their next call; then the page's own, kept in this browser: the theme, the dice's sound, rolling by hand.
import { useEffect, useRef, useState } from "preact/hooks";
import { changeSetting, readSettings, type SettingChange } from "./api.ts";
import type { PlayerSetting } from "./data.ts";
import { Icon } from "./icons.tsx";
import { itemLabel, phraseLabel } from "./labels.ts";
import { byHandPref, soundPref, usePref, usePrefChange } from "./prefs.ts";
import { pickTheme, shownTheme } from "./theme.ts";

// The groups of the campaign's settings, in order; a setting the game system adds goes with the dice.
const groups: { title: string; names: string[]; system?: true; }[] = [
    { title: "The game", names: ["difficulty", "lethality", "saves", "rigor"] },
    { title: "Dice and measures", names: ["dice", "units"], system: true },
    { title: "Limits", names: ["lines", "veils"] },
    { title: "Pictures and language", names: ["pictures", "language"] },
];

// What a list's field suggests, as an example.
const examples: Record<string, string> = { lines: "Add, e.g. spiders", veils: "Add, e.g. torture" };

export function SettingsView({ version }: { version: number; })
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
            <h2 id="settings-title">Settings</h2>
            <p class="settings-lead">A change counts at once, from now on: what is already in play stays as it is. The master hears of it at their next move, and of nothing you put back as it was.</p>
            {problem !== undefined && <p class="settings-problem" role="alert">{problem}</p>}
            {settings !== undefined && groups.map((group) => {
                const shown = [
                    ...group.names.flatMap((name) => settings.filter((setting) => setting.name === name)),
                    ...(group.system ? settings.filter((setting) => !known.has(setting.name)) : []),
                ];
                return (
                    <section key={group.title} class="settings-group">
                        <h3>{group.title}</h3>
                        {shown.map((setting) => <SettingRow key={setting.name} setting={setting} onChange={change} />)}
                    </section>
                );
            })}
            <PageSettings />
        </section>
    );
}

/** One setting: its name and what it is, its values to choose from, a list's items to add and take off, or the language; what the chosen value means. */
function SettingRow({ setting, onChange }: { setting: PlayerSetting; onChange(change: SettingChange): Promise<string | undefined>; })
{
    // The value just picked shows at once, until the setting is read again.
    const [picked, setPicked] = useState<string>();
    const resting = useRef<{ choice: string; timer: ReturnType<typeof setTimeout>; }>();
    const said = useSaid();
    const value = picked ?? setting.value;
    const id = `setting-${idOf(setting.name)}`;

    useEffect(() => setPicked(undefined), [setting]);

    // A choice the arrows left still resting goes when the section closes.
    useEffect(() => () => {
        if (resting.current !== undefined) {
            clearTimeout(resting.current.timer);
            void onChange({ setting: setting.name, value: resting.current.choice });
        }
    }, []);

    const send = (change: SettingChange): void => {
        void onChange(change).then(said.show);
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
    const unset = setting.choices === undefined ? setting.items === undefined && setting.value === undefined : chosen === undefined;
    return (
        <div class="setting">
            <div class="setting-what">
                <span class="setting-name" id={id}>{phraseLabel(setting.name)}</span>
                <span class="setting-about" id={`${id}-about`}>{setting.about}</span>
            </div>
            {setting.choices !== undefined
                ? (
                    <Segmented
                        label={id}
                        described={chosen?.means === undefined ? `${id}-about` : `${id}-about ${id}-means`}
                        options={setting.choices.map((choice) => ({ value: choice.value, label: itemLabel(choice.value) }))}
                        value={value}
                        onPick={choose}
                    />
                )
                : setting.name === "language"
                ? <LanguageSetting setting={setting} label={id} onChange={send} />
                : <ListSetting setting={setting} label={id} onChange={send} />}
            <div class="setting-after">
                {chosen?.means !== undefined && (
                    <p class="setting-means" id={`${id}-means`}>
                        <strong>{itemLabel(chosen.value)}:</strong> {chosen.means}
                    </p>
                )}
                {unset && <p class="setting-unset">{setting.choices === undefined ? "Not answered yet: add them here, or the master asks you." : "Not chosen yet: choose here, or the master asks you."}</p>}
                {setting.note !== undefined && <SettingNote note={setting.note} />}
                <p class={said.now?.problem ? "setting-said problem" : "setting-said"} role="status">{said.now?.text}</p>
            </div>
        </div>
    );
}

/** What a change said, in its row: saved for a few seconds, what went wrong until the next change. */
function useSaid(): { now?: { problem: boolean; text: string; }; show(problem: string | undefined): void; }
{
    const [now, setNow] = useState<{ problem: boolean; text: string; }>();
    const timer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => () => clearTimeout(timer.current), []);

    const show = (problem: string | undefined): void => {
        clearTimeout(timer.current);
        setNow(problem === undefined ? { problem: false, text: "✓ Saved" } : { problem: true, text: problem });

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
                            aria-label={`Take ${one} off`}
                            data-tip="Take off"
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
                    placeholder={examples[setting.name] ?? "Add…"}
                    aria-label={`Add to ${setting.name}`}
                    onInput={(event) => setItem(event.currentTarget.value)}
                />
                <button type="submit" class="setting-button" disabled={item.trim() === ""}>Add</button>
            </form>
        </div>
    );
}

/** The language as its code, with its name as it is written, and Save only for a code a language has. */
function LanguageSetting({ setting, label, onChange }: { setting: PlayerSetting; label: string; onChange(change: SettingChange): void; })
{
    const [text, setText] = useState(setting.value ?? "");
    const typed = text.trim();
    const name = languageName(typed);

    useEffect(() => setText(setting.value ?? ""), [setting.value]);

    return (
        <form
            class="setting-text"
            onSubmit={(event) => {
                event.preventDefault();

                if (name !== undefined && typed !== setting.value) {
                    onChange({ setting: setting.name, value: typed });
                }
            }}
        >
            <span class="setting-text-row">
                <input type="text" value={text} maxLength={20} aria-labelledby={label} aria-describedby={`${label}-name`} onInput={(event) => setText(event.currentTarget.value)} />
                <button type="submit" class="setting-button" disabled={name === undefined || typed === setting.value}>Save</button>
            </span>
            <span id={`${label}-name`} class={name === undefined && typed !== "" ? "setting-text-name problem" : "setting-text-name"}>
                {typed === "" ? "" : name ?? "No language has this code: try it, en or pt-BR."}
            </span>
        </form>
    );
}

/** What the player should know of a setting on this computer, as how to have pictures: its lines, its steps in order, and the commands to copy. */
function SettingNote({ note }: { note: { text: string; fix?: true; }; })
{
    const blocks = noteBlocks(note.text);
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
function Command({ text }: { text: string; })
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
            <code>{text}</code>
            <button type="button" class="setting-copy" aria-label={`Copy ${text}`} onClick={() => void copy()}>{copied ? "Copied" : "Copy"}</button>
        </span>
    );
}

/** A language's name in the page's language, as Italian for it; undefined for a code no language has. */
function languageName(code: string): string | undefined
{
    try {
        return code === "" ? undefined : new Intl.DisplayNames([document.documentElement.lang || "en"], { type: "language", fallback: "none" }).of(code);
    } catch {
        return undefined;
    }
}

/** A name as a part of an element's id, without spaces: "dice sound" is dice-sound. */
function idOf(name: string): string
{
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** The page's own settings, in this browser alone: the theme, the dice's sound, rolling by hand. */
function PageSettings()
{
    usePrefChange();
    const [sound, setSound] = usePref(soundPref);
    const [byHand, setByHand] = usePref(byHandPref);
    const rows: { name: string; about: string; options: { value: string; label: string; means?: string; }[]; value: string; pick(value: string): void; }[] = [
        { name: "Theme", about: "the page's look", options: [{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }], value: shownTheme(), pick: (value) => pickTheme(value === "dark" ? "dark" : "light") },
        { name: "Dice sound", about: "the dice as they roll", options: [{ value: "on", label: "On" }, { value: "off", label: "Off" }], value: sound ? "on" : "off", pick: (value) => setSound(value === "on") },
        {
            name: "Checks",
            about: "what the master asks you to roll",
            options: [
                { value: "ready", label: "Ready buttons", means: "a button for each roll the master asks" },
                { value: "hand", label: "By hand", means: "you find the row on your sheet, or roll from the tray, as at the table" },
            ],
            value: byHand ? "hand" : "ready",
            pick: (value) => setByHand(value === "hand"),
        },
    ];
    return (
        <section class="settings-group">
            <h3>This page</h3>
            <p class="setting-about">Kept in this browser alone.</p>
            {rows.map((row) => {
                const id = `page-${idOf(row.name)}`;
                const chosen = row.options.find((option) => option.value === row.value);
                return (
                    <div key={row.name} class="setting">
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

/** Values to choose one of, as a radio group: the arrows move among them and choose, one stop of Tab; the chosen one in gold. */
function Segmented({ label, described, options, value, onPick }: {
    label: string;
    described: string;
    options: { value: string; label: string; }[];
    value?: string;
    onPick(value: string, byKey: boolean): void;
})
{
    const at = options.findIndex((option) => option.value === value);

    const move = (event: KeyboardEvent): void => {
        const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;

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
                    {option.label}
                </button>
            ))}
        </span>
    );
}
