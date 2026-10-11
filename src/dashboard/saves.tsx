// The Saves section (D-359): the campaign's saves as a video game shows them, newest first, each with the picture of the place the party was in, the place and
// when it was made; saving now, going back to a save and starting the campaign over, as the mode of saves allows, each confirmed; the master hears of it at
// their next move.
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { sectionAddress } from "./address.ts";
import { changeSaves, readSaves, type SavesChange, type SavesView as Saves } from "./api.ts";
import type { ShownSave } from "./data.ts";
import { Icon } from "./icons.tsx";
import { phraseLabel } from "./labels.ts";

// What each mode of saves lets the player do, in their words.
const modeTexts: Record<string, string> = {
    free: "Saves free: save when you like, and go back to any save.",
    checkpoint: "Saves checkpoint: the game saves at the end of each scene, and goes back to the last save only if your character dies.",
    permadeath: "Saves permadeath: the game saves at the end of each scene, but never goes back: what happens stays.",
};

// What the master does once the game went back, which the player sets going by writing to them.
const tellMaster = "Write to the master in the chat: they tell the story again from there.";

export function SavesView({ version, campaign }: { version: number; campaign?: string; })
{
    const [saves, setSaves] = useState<Saves>();
    const [problem, setProblem] = useState<string>();
    const [said, setSaid] = useState<{ problem: boolean; text: string; }>();
    const [asking, setAsking] = useState<ShownSave | "reset">();
    const [busy, setBusy] = useState(false);
    const reads = useRef(0);

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

    const send = async (change: SavesChange, done: string): Promise<void> => {
        setBusy(true);
        const refused = await changeSaves(change);
        setBusy(false);
        setAsking(undefined);
        setSaid(refused === undefined ? { problem: false, text: done } : { problem: true, text: refused });
        read();
    };

    const start = saves?.saves.find((save) => save.start);
    return (
        <section class="saves" aria-labelledby="saves-title">
            <h2 id="saves-title">Saves</h2>
            {saves !== undefined && (
                <p class="saves-lead">
                    {modeTexts[saves.mode] ?? saves.rule} <a href={sectionAddress("settings")}>Change it in Settings.</a>
                </p>
            )}
            {problem !== undefined && <p class="saves-said problem" role="alert">{problem}</p>}
            {said !== undefined && <p class={said.problem ? "saves-said problem" : "saves-said"} role="status">{said.text}</p>}
            {saves?.make === true && <SaveNow busy={busy} onSave={(label) => void send({ action: "make", ...(label === "" ? {} : { label }) }, "✓ Saved.")} />}
            {saves !== undefined && saves.saves.length === 0 && <p class="saves-none">No saves yet: the game saves its start when play begins, then at the end of each scene.</p>}
            {saves !== undefined && saves.saves.length > 0 && (
                <ol class="save-cards">
                    {saves.saves.map((save) => (
                        <li key={save.number} class="save-card">
                            <SaveFace save={save} />
                            {save.load && (
                                <button type="button" class="save-button" disabled={busy} onClick={() => setAsking(save)}>
                                    Go back here
                                </button>
                            )}
                        </li>
                    ))}
                </ol>
            )}
            {saves?.reset === true && start !== undefined && (
                <section class="saves-over" aria-labelledby="saves-over-title">
                    <h3 id="saves-over-title">Start over</h3>
                    <p>Back to the campaign's start, after session zero: everything that happened since is gone, and every save but the start.</p>
                    <button type="button" class="save-button danger" disabled={busy} onClick={() => setAsking("reset")}>Start the campaign over…</button>
                </section>
            )}
            {asking !== undefined && asking !== "reset" && saves !== undefined && (
                <GoBack
                    save={asking}
                    later={saves.saves.filter((save) => save.number > asking.number).length}
                    busy={busy}
                    onClose={() => setAsking(undefined)}
                    onConfirm={() => void send({ action: "load", save: asking.number }, `Back to ${saveTitle(asking)}. ${tellMaster}`)}
                />
            )}
            {asking === "reset" && start !== undefined && (
                <StartOver
                    start={start}
                    campaign={campaign}
                    busy={busy}
                    onClose={() => setAsking(undefined)}
                    onConfirm={(name) => void send({ action: "reset", campaign: name }, `The campaign starts over. ${tellMaster}`)}
                />
            )}
        </section>
    );
}

/** A save as its card shows it: the picture of the place, or its mark; its name, the start's badge, the place and when it was made. */
function SaveFace({ save }: { save: ShownSave; })
{
    return (
        <>
            <div class="save-picture">
                {save.picture === undefined
                    ? <Icon name="place" />
                    : <img src={`/images/${encodeURIComponent(save.picture.file)}?v=${save.picture.version}`} alt="" loading="lazy" />}
                {save.start && <span class="save-badge">Start</span>}
            </div>
            <div class="save-what">
                <span class="save-title">{saveTitle(save)}</span>
                {(save.place !== undefined || save.date !== undefined) && <span class="save-place">{[save.place, save.date === undefined ? undefined : phraseLabel(save.date)].filter((part) => part !== undefined).join(" · ")}</span>}
                {save.at !== undefined && <time class="save-at" dateTime={save.at}>Saved {madeAt(save.at)}</time>}
            </div>
        </>
    );
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
            <input type="text" value={label} maxLength={80} placeholder="A name, if you like, e.g. before the duel" aria-label="The save's name" onInput={(event) => setLabel(event.currentTarget.value)} />
            <button type="submit" class="save-button gold" disabled={busy}>Save now</button>
        </form>
    );
}

/** Going back to a save, once confirmed: what is lost said first. */
function GoBack({ save, later, busy, onClose, onConfirm }: { save: ShownSave; later: number; busy: boolean; onClose(): void; onConfirm(): void; })
{
    const lost = later === 0 ? "" : later === 1 ? ", and so is the save after it" : `, and so are the ${later} saves after it`;
    return (
        <Confirm title="Go back to this save?" onClose={onClose}>
            <div class="save-card shown">
                <SaveFace save={save} />
            </div>
            <p>The game goes back to how it was then. What happened after it is gone from the story{lost}.</p>
            <p class="confirm-note">A copy of the game as it is now stays in the campaign's .saves folder.</p>
            <div class="confirm-buttons">
                <button type="button" class="save-button" autoFocus onClick={onClose}>Cancel</button>
                <button type="button" class="save-button danger" disabled={busy} onClick={onConfirm}>Go back</button>
            </div>
        </Confirm>
    );
}

/** Starting the campaign over, in two steps: what is lost, then the campaign's name written, as for anything that cannot be taken back from the page. */
function StartOver({ start, campaign, busy, onClose, onConfirm }: { start: ShownSave; campaign?: string; busy: boolean; onClose(): void; onConfirm(name: string): void; })
{
    const [sure, setSure] = useState(false);
    const [name, setName] = useState("");
    const field = useRef<HTMLInputElement>(null);
    const matches = campaign !== undefined && comparable(name) === comparable(campaign);

    // The second step takes the focus to the name, which the dialog gave the first step's Cancel.
    useEffect(() => {
        if (sure) {
            field.current?.focus();
        }
    }, [sure]);
    return (
        <Confirm title="Start the campaign over?" onClose={onClose}>
            {!sure && (
                <>
                    <div class="save-card shown">
                        <SaveFace save={start} />
                    </div>
                    <p>
                        The game goes back to its start, after session zero, your character as they began. <strong>Everything that happened since is gone from the story</strong>, and so is every save but the start.
                    </p>
                    <p class="confirm-note">A copy of the game as it is now stays in the campaign's .saves folder.</p>
                    <div class="confirm-buttons">
                        <button type="button" class="save-button" autoFocus onClick={onClose}>Cancel</button>
                        <button type="button" class="save-button danger" onClick={() => setSure(true)}>Continue</button>
                    </div>
                </>
            )}
            {sure && (
                <form
                    class="confirm-name"
                    onSubmit={(event) => {
                        event.preventDefault();

                        if (matches) {
                            onConfirm(name);
                        }
                    }}
                >
                    <label for="start-over-name">
                        To start it over, write the campaign's name{campaign === undefined ? "" : (
                            <>
                                : <strong>{campaign}</strong>
                            </>
                        )}
                    </label>
                    <input ref={field} id="start-over-name" type="text" value={name} autoComplete="off" spellcheck={false} onInput={(event) => setName(event.currentTarget.value)} />
                    <div class="confirm-buttons">
                        <button type="button" class="save-button" onClick={onClose}>Cancel</button>
                        <button type="submit" class="save-button danger" disabled={!matches || busy}>Start over</button>
                    </div>
                </form>
            )}
        </Confirm>
    );
}

/** A modal question over the whole page, the dice too, which Escape closes. */
function Confirm({ title, onClose, children }: { title: string; onClose(): void; children: ComponentChildren; })
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

/** The words that name a save, else its label; the start that the game saved when play began, as the start. */
function saveTitle(save: ShownSave): string
{
    return save.start && save.name === "start" ? "The start" : phraseLabel(save.name ?? save.label);
}

/** When a save was made, in real time, as the page's language writes it. */
function madeAt(at: string): string
{
    const date = new Date(at);
    return Number.isNaN(date.getTime()) ? at : new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** A name as the game compares it: its case and its curly quotes aside. */
function comparable(text: string): string
{
    return text.trim().normalize("NFC").toLowerCase().replace(/[‘’]/g, "'");
}
