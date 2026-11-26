// A new campaign: its name, the language the master plays in, its game system and where its folder goes; folded under them, what its first chat with the
// master proposes: the AI app, the model, how much the master thinks. The master makes the rest with the player, in the campaign.
import { useEffect, useRef, useState } from "preact/hooks";
import type { HostWish } from "../api.ts";
import { anyHostReady, firstChoice, hostState } from "../chat/chat.ts";
import { ChoiceFields } from "../chat/fields.tsx";
import { Segmented } from "../parts/segmented.tsx";
import { languageName } from "../settings/languages.ts";
import { browserLanguage, t } from "../text.ts";
import type { CampaignWish, LauncherNow } from "./api.ts";
import { firstForm, inUsualFolder, wishOf } from "./campaigns.ts";

// How long a campaign's name may be, as the launcher takes it.
const mostName = 80;

export function NewCampaignForm({ launcher, busy, problem, onCreate, onBack, onPick, onWish }: {
    launcher: LauncherNow;
    /** What is said while the campaign is made; nothing while it is not. */
    busy: string | undefined;
    problem: string | undefined;
    onCreate(wish: CampaignWish): void;
    onBack(): void;
    /** Has the player choose a folder in a window titled with these words: the folder, or none. */
    onPick(words: string): Promise<string | undefined>;
    /** What the player asks of an AI app: to install it, to sign in to it. */
    onWish(wish: HostWish): void;
})
{
    const [form, setForm] = useState(() => firstForm(launcher, browserLanguage() ?? "en"));
    const [picking, setPicking] = useState(false);
    const name = useRef<HTMLInputElement>(null);
    const wish = wishOf(form, launcher.hosts);
    const ready = wish !== undefined && busy === undefined && !picking;
    const system = launcher.systems.find((one) => one.name === form.system);
    // The master's part opens by itself only as it first shows, while no app is ready: then the player opens and closes it, never an app ready since.
    const masterOpen = useRef<boolean>(undefined);
    masterOpen.current ??= launcher.hosts.length > 0 ? !anyHostReady(launcher.hosts) : undefined;

    useEffect(() => name.current?.focus(), []);

    // An app that becomes ready, or one to sign in to, while none was chosen: the first choice, as the form would have opened with it.
    useEffect(() => {
        if (form.chat === undefined) {
            const chat = firstChoice({ hosts: launcher.hosts });

            if (chat !== undefined) {
                setForm((before) => ({ ...before, chat }));
            }
        }
    }, [launcher.hosts.map((one) => hostState(one)).join()]);

    const pick = async (): Promise<void> => {
        setPicking(true);
        const folder = await onPick(t("Choose another folder…"));
        setPicking(false);

        if (folder !== undefined) {
            setForm((before) => ({ ...before, folder }));
        }
    };

    return (
        <form
            class="launcher-form"
            aria-labelledby="launcher-new"
            onSubmit={(event) => {
                event.preventDefault();

                if (ready) {
                    onCreate(wish);
                }
            }}
            onKeyDown={(event) => {
                if (event.key === "Escape" && busy === undefined) {
                    onBack();
                }
            }}
        >
            <h2 id="launcher-new">{t("New campaign")}</h2>
            <div class="launcher-fields">
                <label for="launcher-name" class="launcher-label">{t("Name")}</label>
                <input
                    ref={name}
                    id="launcher-name"
                    class="launcher-field"
                    type="text"
                    dir="auto"
                    value={form.name}
                    maxLength={mostName}
                    autocomplete="off"
                    spellcheck={false}
                    onInput={(event) => setForm({ ...form, name: event.currentTarget.value })}
                />
                <label for="launcher-language" class="launcher-label">{t("Language")}</label>
                <select id="launcher-language" class="launcher-field" value={form.language} onChange={(event) => setForm({ ...form, language: event.currentTarget.value })}>
                    {launcher.languages.map((code) => <option key={code} value={code} lang={code}>{ownName(code)}</option>)}
                </select>
                <span id="launcher-system" class="launcher-label">{t("Game system")}</span>
                <div class="launcher-choice">
                    <Segmented
                        label="launcher-system"
                        described="launcher-system-is"
                        options={launcher.systems.map((one) => ({ value: one.name, label: one.name }))}
                        value={form.system}
                        onPick={(value) => setForm({ ...form, system: value })}
                    />
                    <p id="launcher-system-is" class="launcher-hint" dir="auto">{system?.title ?? ""}</p>
                </div>
                <span id="launcher-folder" class="launcher-label">{t("Folder")}</span>
                <div class="launcher-choice">
                    <p class="launcher-hint" aria-live="polite">
                        {form.folder === undefined
                            ? t("It goes in {folder}, in a folder with its name.", { folder: launcher.folder })
                            : t("It goes in {folder}, which must be empty.", { folder: form.folder })}
                    </p>
                    <div class="launcher-folder-buttons">
                        <button type="button" class="button quiet" aria-describedby="launcher-folder" aria-disabled={picking || busy !== undefined} onClick={() => !picking && busy === undefined && void pick()}>
                            {t("Choose another folder…")}
                        </button>
                        {form.folder !== undefined && <button type="button" class="button quiet" onClick={() => setForm(inUsualFolder)}>{t("Use the usual folder")}</button>}
                    </div>
                </div>
            </div>
            {launcher.hosts.length > 0 && (
                <details class="launcher-master" open={masterOpen.current}>
                    <summary>{t("The master")}</summary>
                    <ChoiceFields
                        shown={{ hosts: launcher.hosts }}
                        choice={form.chat}
                        onChoice={(chat) => setForm((before) => ({ ...before, chat }))}
                        onWish={onWish}
                    />
                </details>
            )}
            {problem !== undefined && <p class="launcher-problem" role="alert" dir="auto">{problem}</p>}
            <p class="launcher-busy" role="status">{busy ?? ""}</p>
            <div class="launcher-buttons">
                <button type="button" class="button" aria-disabled={busy !== undefined} onClick={() => busy === undefined && onBack()}>{t("Back")}</button>
                <button type="submit" class="button gold" aria-disabled={!ready} aria-busy={busy !== undefined}>{t("Create")}</button>
            </div>
        </form>
    );
}

/** A language in its own words, its first letter a capital as a list writes it; its code where the browser cannot name it. */
function ownName(code: string): string
{
    const name = languageName(code, code);
    return name === undefined ? code : name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
}
