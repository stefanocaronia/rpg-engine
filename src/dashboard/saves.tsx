// The Saves section (D-359): the campaign's saves as a video game shows them, newest first, each with the picture of the place the party was in, the place and
// when it was made; saving now, going back to a save and starting the campaign over, from the start of play or from before session zero (D-361), as the mode
// of saves allows, each confirmed; then a new chat with the master, since the one going on remembers what is gone.
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { sectionAddress } from "./address.ts";
import { changeSaves, readSaves, type SavesChange, type SavesView as Saves } from "./api.ts";
import type { ResetPoint, ShownSave } from "./data.ts";
import { gameDateLabel } from "./game-words.ts";
import { Icon } from "./icons.tsx";
import { phraseLabel, realTimeLabel, valueLabel } from "./labels.ts";
import { placeKinds } from "./map-symbols.ts";
import { PageHead } from "./pages.tsx";
import { t } from "./text.ts";

/** The Saves section; with `several` player characters, checkpoint goes back when all die, or when one does and the table chooses it (D-480 (2)). */
export function SavesView({ version, campaign, several = false }: { version: number; campaign?: string; several?: boolean; })
{
    const [saves, setSaves] = useState<Saves>();
    const [problem, setProblem] = useState<string>();
    const [said, setSaid] = useState<{ problem: boolean; text: string; went: boolean; }>();
    const [asking, setAsking] = useState<ShownSave | "reset">();
    const [busy, setBusy] = useState(false);
    const reads = useRef(0);
    const saying = useRef<HTMLParagraphElement>(null);

    // Only the last reading counts, as after a change made here and the one the game sends.
    const read = (): void => {
        const reading = ++reads.current;
        void readSaves().then(
            (read) => {
                if (reading === reads.current) {
                    setSaves(read);
                    setProblem(undefined);
                }
            },
            (error: unknown) => setProblem(error instanceof Error ? error.message : String(error)),
        );
    };

    useEffect(read, [version]);

    // After going back the button pressed is gone with its card: what happened takes the focus, in view.
    useEffect(() => {
        if (said?.went === true) {
            saying.current?.focus({ preventScroll: true });
            saying.current?.scrollIntoView({ block: "nearest" });
        }
    }, [said]);

    const send = async (change: SavesChange, done: string): Promise<void> => {
        setBusy(true);
        const refused = await changeSaves(change);
        setBusy(false);
        setAsking(undefined);
        const went = change.action === "load" || change.action === "reset";
        setSaid(refused === undefined ? { problem: false, text: done, went } : { problem: true, text: refused, went });
        read();
    };

    const points = saves?.reset ?? [];
    return (
        <section class="saves" aria-labelledby="saves-title">
            <PageHead section="saves" id="saves-title" />
            {saves !== undefined && (
                <p class="saves-lead">
                    <strong>{valueLabel(saves.mode)}:</strong> {modeText(saves.mode, several) ?? saves.rule} <a href={sectionAddress("settings")}>{t("Change it in Settings.")}</a>
                </p>
            )}
            {problem !== undefined && <p class="saves-said problem" role="alert">{problem}</p>}
            {said !== undefined && <p ref={saying} tabIndex={-1} class={said.problem ? "saves-said problem" : "saves-said"} role="status">{said.text}</p>}
            {saves?.wentBack !== undefined && (
                <NewChat
                    back={wentBackTitle(saves.wentBack, saves.saves)}
                    busy={busy}
                    onConfirm={() => void send({ action: "new chat" }, `✓ ${t("The game goes on in the new chat: write «continua» there.")}`)}
                />
            )}
            {saves?.make === true && <SaveNow busy={busy} onSave={(label) => void send({ action: "make", ...(label === "" ? {} : { label }) }, `✓ ${t("Saved.")}`)} />}
            {saves !== undefined && saves.saves.length === 0 && <p class="saves-none">{t("No saves yet: the game saves its start when play begins, then at the end of each scene.")}</p>}
            {saves !== undefined && saves.saves.length > 0 && (
                <ol class="save-cards">
                    {saves.saves.map((save, index) => (
                        <li key={save.number} class="save-card">
                            <SaveFace save={save} />
                            {save.load && (
                                <button type="button" class="save-button" aria-label={t("Go back here: {save}", { save: saveTitle(save) })} disabled={busy} onClick={() => setAsking(save)}>
                                    {t("Go back here")}
                                </button>
                            )}
                            {/* Under checkpoint, where the death of the character would take the game (D-361). */}
                            {saves.mode === "checkpoint" && index === 0 && !save.load && save.point === undefined && (
                                <p class="save-note">{several ? t("Back here if they all die, or if the table chooses it when one dies") : t("Back here if your character dies")}</p>
                            )}
                        </li>
                    ))}
                </ol>
            )}
            {points.length > 0 && (
                <section class="saves-over" aria-labelledby="saves-over-title">
                    <h3 id="saves-over-title">{t("Start over")}</h3>
                    <p>
                        {points.length > 1
                            ? t("Back to the campaign's start: everything that happened since is gone from the story, with the same character or a new one.")
                            : t("Back to the campaign's start: everything that happened since is gone from the story.")}
                    </p>
                    <button type="button" class="save-button danger" disabled={busy} onClick={() => setAsking("reset")}>{t("Start the campaign over…")}</button>
                </section>
            )}
            {asking !== undefined && asking !== "reset" && saves !== undefined && (
                <GoBack
                    save={asking}
                    later={saves.saves.filter((save) => save.number > asking.number).length}
                    busy={busy}
                    onClose={() => setAsking(undefined)}
                    onConfirm={() => void send({ action: "load", save: asking.number }, t("Back to {save}.", { save: saveTitle(asking) }))}
                />
            )}
            {asking === "reset" && saves !== undefined && points.length > 0 && (
                <StartOver
                    saves={saves.saves}
                    points={points}
                    campaign={campaign}
                    busy={busy}
                    onClose={() => setAsking(undefined)}
                    onConfirm={(name, to) => void send({ action: "reset", campaign: name, to }, to === "session zero" ? t("The campaign starts over, your character to make again.") : t("The campaign starts over."))}
                />
            )}
        </section>
    );
}

/** A save as its card shows it: the picture of the place, or the mark of its kind; its name, the badge of a point to start over from, the place and the time. */
function SaveFace({ save }: { save: ShownSave; })
{
    const kind = save.kind === undefined ? undefined : placeKinds[save.kind];
    const when = save.at === undefined ? undefined : realTimeLabel(save.at);
    return (
        <>
            <div class={save.picture === undefined && kind !== undefined ? "save-picture kind" : "save-picture"}>
                {save.picture !== undefined
                    ? <img src={`/images/${encodeURIComponent(save.picture.file)}?v=${save.picture.version}`} alt="" loading="lazy" />
                    : kind !== undefined
                    ? (
                        <svg class="save-kind" viewBox="0 0 24 24" aria-hidden="true">
                            <path d={kind.glyph} />
                        </svg>
                    )
                    : <Icon name="place" />}
                {save.point !== undefined && <span class="save-badge" aria-hidden={save.name === save.point ? "true" : undefined}>{pointLabel(save.point)}</span>}
            </div>
            <div class="save-what">
                <h3 class="save-title">{saveTitle(save)}</h3>
                {(save.place !== undefined || save.date !== undefined) && (
                    <span class="save-place">
                        {save.place !== undefined && <span>{save.place}</span>}
                        {save.place !== undefined && save.date !== undefined && " · "}
                        {save.date !== undefined && <span>{phraseLabel(gameDateLabel(save.date))}</span>}
                    </span>
                )}
                {when !== undefined && <time class="save-at" dateTime={save.at} title={when.full}>{t("Saved {when}", { when: when.short })}</time>}
            </div>
        </>
    );
}

/**
 * After going back, until the player confirms it (D-361, D-362): the chat they played in remembers what is gone, so the master goes on only in a new one, which
 * the player opens and confirms here, or tells the master there.
 */
function NewChat({ back, busy, onConfirm }: { back: string; busy: boolean; onConfirm(): void; })
{
    return (
        <div class="saves-chat">
            <p>
                <strong>{t("Open a new chat with the master.")}</strong> {t(
                    "The game went back to {save}, and the chat you were playing in remembers what is gone: the master goes on only in a new one (/clear in Claude Code, a new conversation elsewhere). Once it is open, press here, or tell the master there.",
                    { save: back },
                )}
            </p>
            <button type="button" class="save-button gold" disabled={busy} onClick={onConfirm}>{t("I opened a new chat")}</button>
        </div>
    );
}

/** The save the game went back to, by its card's title when it is still there. */
function wentBackTitle(back: string, saves: ShownSave[]): string
{
    const save = saves.find((one) => back.startsWith(`${one.number} - `));
    return save === undefined ? back : saveTitle(save);
}

/** Saving now, with a name if the player likes. */
function SaveNow({ busy, onSave }: { busy: boolean; onSave(label: string): void; })
{
    const [label, setLabel] = useState("");
    return (
        <form
            class="saves-make"
            onSubmit={(event) => {
                event.preventDefault();
                onSave(label.trim());
                setLabel("");
            }}
        >
            <input type="text" value={label} maxLength={80} placeholder={t("Name (optional)")} aria-label={t("The save's name, if you like")} onInput={(event) => setLabel(event.currentTarget.value)} />
            <button type="submit" class="save-button gold" disabled={busy}>{t("Save now")}</button>
        </form>
    );
}

/** Going back to a save, once confirmed: what is lost said first. */
function GoBack({ save, later, busy, onClose, onConfirm }: { save: ShownSave; later: number; busy: boolean; onClose(): void; onConfirm(): void; })
{
    const lost = later === 0
        ? t("The game goes back to how it was then. What happened after it is gone from the story.")
        : later === 1
        ? t("The game goes back to how it was then. What happened after it is gone from the story, and so is the save after it.")
        : t("The game goes back to how it was then. What happened after it is gone from the story, and so are the {count} saves after it.", { count: later });
    return (
        <Confirm title={t("Go back to this save?")} onClose={onClose}>
            <div class="save-card shown">
                <SaveFace save={save} />
            </div>
            <p>{lost}</p>
            <p class="confirm-note">{t("Your settings stay as they are. A copy of the game as it is now stays in the campaign's .saves folder.")}</p>
            <div class="confirm-buttons">
                <button type="button" class="save-button" autoFocus onClick={onClose}>{t("Cancel")}</button>
                <button type="button" class="save-button danger final" disabled={busy} onClick={onConfirm}>{t("Go back")}</button>
            </div>
        </Confirm>
    );
}

/**
 * Starting the campaign over, in two steps: from where, with the same character or a new one, and what is lost; then the campaign's name written, as for
 * anything that cannot be taken back from the page.
 */
function StartOver({ saves, points, campaign, busy, onClose, onConfirm }: {
    saves: ShownSave[];
    points: ResetPoint[];
    campaign?: string;
    busy: boolean;
    onClose(): void;
    onConfirm(name: string, to: ResetPoint): void;
})
{
    const [to, setTo] = useState<ResetPoint>(points[0]);
    const [sure, setSure] = useState(false);
    const [name, setName] = useState("");
    const field = useRef<HTMLInputElement>(null);
    const matches = campaign !== undefined && comparable(name) === comparable(campaign);
    const target = saves.find((save) => save.point === to);

    // The second step takes the focus to the name, which the dialog gave the first step's Cancel.
    useEffect(() => {
        if (sure) {
            field.current?.focus();
        }
    }, [sure]);

    return (
        <Confirm title={t("Start the campaign over?")} onClose={onClose}>
            {!sure && (
                <>
                    {points.length > 1 && (
                        <fieldset class="over-choice">
                            <legend>{t("From where")}</legend>
                            {points.map((point) => (
                                <label key={point}>
                                    <input type="radio" name="start-over-from" checked={to === point} onChange={() => setTo(point)} />
                                    <span>
                                        <strong>{pointTexts(point).title}</strong>
                                        <span>{pointTexts(point).about}</span>
                                    </span>
                                </label>
                            ))}
                        </fieldset>
                    )}
                    {target !== undefined && (
                        <div class="save-card shown">
                            <SaveFace save={target} />
                        </div>
                    )}
                    <p>
                        {to === "session zero"
                            ? t("Everything that happened since is gone from the story, and so is every save after it, your character too.")
                            : t("Everything that happened since is gone from the story, and so is every save after it.")}
                    </p>
                    <p class="confirm-note">{t("Your settings stay as they are. A copy of the game as it is now stays in the campaign's .saves folder.")}</p>
                    <div class="confirm-buttons">
                        <button type="button" class="save-button" autoFocus onClick={onClose}>{t("Cancel")}</button>
                        <button type="button" class="save-button danger" onClick={() => setSure(true)}>{t("Continue")}</button>
                    </div>
                </>
            )}
            {sure && (
                <form
                    class="confirm-name"
                    onSubmit={(event) => {
                        event.preventDefault();

                        if (matches) {
                            onConfirm(name, to);
                        }
                    }}
                >
                    <label for="start-over-name">
                        {t("To start it over, write the campaign's name")}
                        {campaign === undefined ? "" : (
                            <>
                                : <strong>{campaign}</strong>
                            </>
                        )}
                    </label>
                    <input ref={field} id="start-over-name" type="text" value={name} autoComplete="off" spellcheck={false} onInput={(event) => setName(event.currentTarget.value)} />
                    <div class="confirm-buttons">
                        <button type="button" class="save-button" onClick={onClose}>{t("Cancel")}</button>
                        <button type="submit" class="save-button danger final" disabled={!matches || busy}>{t("Start over")}</button>
                    </div>
                </form>
            )}
        </Confirm>
    );
}

/** A modal question over the whole page, the dice too, which Escape closes. */
export function Confirm({ title, onClose, children }: { title: string; onClose(): void; children: ComponentChildren; })
{
    const dialog = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        dialog.current?.showModal();
    }, []);

    return (
        <dialog ref={dialog} class="confirm" aria-labelledby="confirm-title" onClose={onClose}>
            <h2 id="confirm-title">{title}</h2>
            {children}
        </dialog>
    );
}

/** The words that name a save, else its label; the points the game saved by itself, by what they are. */
function saveTitle(save: ShownSave): string
{
    if (save.point !== undefined && save.name === save.point) {
        return pointLabel(save.point);
    }

    return phraseLabel(save.name ?? save.label);
}

/** A name as the game compares it: its case and its curly quotes aside. */
function comparable(text: string): string
{
    return text.trim().normalize("NFC").toLowerCase().replace(/[‘’]/g, "'");
}

/** What a mode of saves lets the player do, in their words; undefined for one the page does not know. */
function modeText(mode: string, several: boolean): string | undefined
{
    const texts: Record<string, string> = {
        free: t("save when you like, and go back to any save."),
        checkpoint: several
            ? t("the game saves at the end of each scene, and goes back to the last save only if they all die, or if the table chooses it when one dies.")
            : t("the game saves at the end of each scene, and goes back to the last save only if your character dies."),
        permadeath: t("the game saves at the end of each scene, but never goes back: what happens stays. You can only start the campaign over."),
    };
    return texts[mode];
}

/** A point the campaign starts over from, by name: the start, or before session zero. */
function pointLabel(point: ResetPoint): string
{
    return point === "start" ? t("The start") : t("Before session zero");
}

/** The two ways to start over, when the campaign has both. */
function pointTexts(point: ResetPoint): { title: string; about: string; }
{
    return point === "start"
        ? { title: t("With the same character"), about: t("Back to the start of play, after session zero.") }
        : { title: t("With a new character"), about: t("Back to before session zero: the world and your settings stay, your character is made again.") };
}
