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

export function SettingsView({ version }: { version: number; })
{
    const [settings, setSettings] = useState<PlayerSetting[]>();
    const [said, setSaid] = useState<{ problem: boolean; text: string; }>();
    const reads = useRef(0);

    // Only the last reading counts, as after quick changes.
    const read = (): void => {
        const reading = ++reads.current;
        void readSettings().then(
            (read) => reading === reads.current && setSettings(read),
            (error: unknown) => setSaid({ problem: true, text: error instanceof Error ? error.message : String(error) }),
        );
    };

    // Read again whenever the campaign changes, as after a change made here or by the master.
    useEffect(read, [version]);

    const change = async (body: SettingChange): Promise<void> => {
        const problem = await changeSetting(body);
        setSaid(problem === undefined ? { problem: false, text: "Saved: the master hears of it at their next move." } : { problem: true, text: problem });
        read();
    };

    const known = new Set(groups.flatMap((group) => group.names));
    return (
        <section class="settings" aria-labelledby="settings-title">
            <div class="settings-head">
                <h2 id="settings-title">Settings</h2>
                <p class={said?.problem ? "settings-said problem" : "settings-said"} role="status" aria-live="polite">{said?.text}</p>
            </div>
            {settings !== undefined && groups.map((group) => {
                const shown = [
                    ...group.names.flatMap((name) => settings.filter((setting) => setting.name === name)),
                    ...(group.system ? settings.filter((setting) => !known.has(setting.name)) : []),
                ];
                return (
                    <section key={group.title} class="settings-group">
                        <h3>{group.title}</h3>
                        {shown.map((setting) => <SettingRow key={setting.name} setting={setting} onChange={(body) => void change(body)} />)}
                    </section>
                );
            })}
            <PageSettings />
        </section>
    );
}

/** One setting: its name and what it is, then its values to choose from, a list's items to add and take off, or a text. */
function SettingRow({ setting, onChange }: { setting: PlayerSetting; onChange(change: SettingChange): void; })
{
    // The value just picked shows at once, until the setting is read again.
    const [picked, setPicked] = useState<string>();
    const value = picked ?? setting.value;

    useEffect(() => setPicked(undefined), [setting]);

    const means = setting.choices?.find((choice) => choice.value === value)?.means ?? (setting.name === "language" ? languageName(value) : undefined);
    return (
        <div class="setting">
            <div class="setting-what">
                <span class="setting-name" id={`setting-${setting.name}`}>{phraseLabel(setting.name)}</span>
                <span class="setting-about">{setting.about}</span>
            </div>
            {setting.choices !== undefined
                ? (
                    <Segmented
                        label={`setting-${setting.name}`}
                        options={setting.choices.map((choice) => ({ value: choice.value, label: itemLabel(choice.value) }))}
                        value={value}
                        onPick={(chosen) => {
                            setPicked(chosen);
                            onChange({ setting: setting.name, value: chosen });
                        }}
                    />
                )
                : setting.name === "lines" || setting.name === "veils"
                ? <ListSetting setting={setting} onChange={onChange} />
                : <TextSetting setting={setting} onChange={onChange} />}
            {means !== undefined && <p class="setting-means">{means}</p>}
            {setting.note !== undefined && (
                <p class="setting-note">
                    <Icon name="info" />
                    {setting.note}
                </p>
            )}
        </div>
    );
}

/** A list's items, each to take off, and a field to add one. */
function ListSetting({ setting, onChange }: { setting: PlayerSetting; onChange(change: SettingChange): void; })
{
    const [item, setItem] = useState("");
    return (
        <div class="setting-list">
            <ul aria-labelledby={`setting-${setting.name}`}>
                {(setting.items ?? []).map((one) => (
                    <li key={one}>
                        {one}
                        <button type="button" class="icon-button" aria-label={`Take ${one} off`} data-tip="Take off" onClick={() => onChange({ setting: setting.name, remove: one })}>
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
                <input type="text" value={item} maxLength={200} placeholder="Add…" aria-label={`Add to ${setting.name}`} onInput={(event) => setItem(event.currentTarget.value)} />
                <button type="submit" class="setting-button" disabled={item.trim() === ""}>Add</button>
            </form>
        </div>
    );
}

/** A setting written as text, as the language's code. */
function TextSetting({ setting, onChange }: { setting: PlayerSetting; onChange(change: SettingChange): void; })
{
    const [text, setText] = useState(setting.value ?? "");

    useEffect(() => setText(setting.value ?? ""), [setting.value]);

    return (
        <form
            class="setting-text"
            onSubmit={(event) => {
                event.preventDefault();

                if (text.trim() !== "" && text.trim() !== setting.value) {
                    onChange({ setting: setting.name, value: text.trim() });
                }
            }}
        >
            <input type="text" value={text} maxLength={20} aria-labelledby={`setting-${setting.name}`} onInput={(event) => setText(event.currentTarget.value)} />
            <button type="submit" class="setting-button" disabled={text.trim() === "" || text.trim() === setting.value}>Save</button>
        </form>
    );
}

/** A language's name in the page's language, as Italian for it; undefined for a code no language has. */
function languageName(code: string | undefined): string | undefined
{
    try {
        const name = code === undefined ? undefined : new Intl.DisplayNames([document.documentElement.lang || "en"], { type: "language" }).of(code);
        return name === code ? undefined : name;
    } catch {
        return undefined;
    }
}

/** The page's own settings, in this browser alone: the theme, the dice's sound, rolling by hand. */
function PageSettings()
{
    usePrefChange();
    const [sound, setSound] = usePref(soundPref);
    const [byHand, setByHand] = usePref(byHandPref);
    const rows: { name: string; about: string; options: { value: string; label: string; }[]; value: string; pick(value: string): void; }[] = [
        { name: "Theme", about: "the page's look", options: [{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }], value: shownTheme(), pick: (value) => pickTheme(value === "dark" ? "dark" : "light") },
        { name: "Dice sound", about: "the dice as they roll", options: [{ value: "on", label: "On" }, { value: "off", label: "Off" }], value: sound ? "on" : "off", pick: (value) => setSound(value === "on") },
        {
            name: "Checks",
            about: "what the master asks you to roll",
            options: [{ value: "ready", label: "Ready buttons" }, { value: "hand", label: "By hand" }],
            value: byHand ? "hand" : "ready",
            pick: (value) => setByHand(value === "hand"),
        },
    ];
    return (
        <section class="settings-group">
            <h3>This page</h3>
            <p class="setting-about">Kept in this browser alone.</p>
            {rows.map((row) => (
                <div key={row.name} class="setting">
                    <div class="setting-what">
                        <span class="setting-name" id={`page-${row.name}`}>{row.name}</span>
                        <span class="setting-about">{row.about}</span>
                    </div>
                    <Segmented label={`page-${row.name}`} options={row.options} value={row.value} onPick={row.pick} />
                </div>
            ))}
        </section>
    );
}

/** Values to choose one of, as a radio group: the arrows move among them and choose, one stop of Tab; the chosen one in gold. */
function Segmented({ label, options, value, onPick }: { label: string; options: { value: string; label: string; }[]; value?: string; onPick(value: string): void; })
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
        onPick(options[next].value);
        buttons[next]?.focus();
    };

    return (
        <span class="segmented" role="radiogroup" aria-labelledby={label} onKeyDown={move}>
            {options.map((option, index) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={option.value === value}
                    tabIndex={index === Math.max(at, 0) ? 0 : -1}
                    onClick={() => option.value !== value && onPick(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </span>
    );
}
