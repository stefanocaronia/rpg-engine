// The player's notes (D-371), a tab of the Journal: free notes, a title and a text each, saved by themselves as the player writes, kept outside the game; one may
// be shared with the master, who hears it at their next call, and taken back until then (D-381).
import { useEffect, useRef, useState } from "preact/hooks";
import { type Note, readNotes, sendNote } from "./api.ts";
import { Icon } from "./icons.tsx";
import { realTimeLabel } from "./labels.ts";
import { t } from "./text.ts";

// How long the page waits after the last key before it saves a note, in milliseconds.
const savePause = 800;

export function Notes({ version }: { version: number; })
{
    const [notes, setNotes] = useState<Note[]>();
    // The notes shared that the master has not heard yet, as the game says them: read again whenever the campaign changes.
    const [pending, setPending] = useState<Set<string>>(new Set());
    const [problem, setProblem] = useState<string>();
    // The note whose title takes the focus, a new one or the one after a note taken away, each time anew.
    const [focus, setFocus] = useState<{ id: string; }>();
    // The notes just made here and still empty: New note goes back to one rather than making another.
    const empty = useRef(new Set<string>());
    const newNote = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        void readNotes().then(
            (read) => {
                setNotes((before) => before ?? read.notes);
                setPending(new Set(read.pending));
            },
            (error: unknown) => setProblem(error instanceof Error ? error.message : String(error)),
        );
    }, [version]);

    const add = (): void => {
        const waiting = notes?.find((note) => empty.current.has(note.id));

        if (waiting !== undefined) {
            setFocus({ id: waiting.id });
            return;
        }

        const note = { id: newNoteId(), title: "", text: "", at: new Date().toISOString() };
        empty.current.add(note.id);
        setNotes((all) => [note, ...(all ?? [])]);
        setFocus({ id: note.id });
    };

    const removed = (id: string): void => {
        const at = notes?.findIndex((note) => note.id === id) ?? -1;
        const rest = notes?.filter((note) => note.id !== id) ?? [];
        const next = rest[Math.min(at, rest.length - 1)];
        empty.current.delete(id);
        setNotes(rest);

        if (next === undefined) {
            newNote.current?.focus();
        } else {
            setFocus({ id: next.id });
        }
    };

    const waiting = (id: string, still: boolean): void => {
        setPending((before) => new Set(still ? [...before, id] : [...before].filter((one) => one !== id)));
    };

    if (problem !== undefined) {
        return <p class="journal-problem" role="alert">{problem}</p>;
    }

    return (
        <div class="player-notes">
            <div class="player-notes-head">
                <p class="player-notes-about">{t("Names, clues, what you suspect. The master does not read them: share one when you want them to know.")}</p>
                <button ref={newNote} type="button" class="save-button gold" onClick={add} disabled={notes === undefined}>
                    <Icon name="plus" /> {t("New note")}
                </button>
            </div>
            {notes?.length === 0 && <p class="journal-none">{t("No notes yet.")}</p>}
            {notes !== undefined && notes.length > 0 && (
                <div class="note-cards">
                    {notes.map((note) => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            pending={pending.has(note.id)}
                            focus={focus?.id === note.id ? focus : undefined}
                            onWritten={() => empty.current.delete(note.id)}
                            onPending={(still) => waiting(note.id, still)}
                            onRemoved={() => removed(note.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * A note as its card shows it, to write in: its title and text saved a moment after the last key, when the card is left, before it is shared, and when the page
 * is hidden or closed; when it was written; Share, then Shared with Undo until the master hears it, then Read.
 */
function NoteCard({ note, pending, focus, onWritten, onPending, onRemoved }: {
    note: Note;
    pending: boolean;
    focus?: { id: string; };
    onWritten(): void;
    onPending(still: boolean): void;
    onRemoved(): void;
})
{
    const [title, setTitle] = useState(note.title);
    const [text, setText] = useState(note.text);
    const [at, setAt] = useState(note.at);
    const [shared, setShared] = useState(note.shared);
    const [saved, setSaved] = useState(false);
    // Told to a screen reader too: what went wrong.
    const [said, setSaid] = useState<string>();
    const [removing, setRemoving] = useState(false);
    const titleField = useRef<HTMLInputElement>(null);
    const trash = useRef<HTMLButtonElement>(null);
    const keepButton = useRef<HTMLButtonElement>(null);
    // What is written and not saved yet, and whether the note was ever sent to be saved: an empty new note is never written, and one sent is taken away there too.
    const unsaved = useRef<{ title: string; text: string; } | undefined>(undefined);
    const sent = useRef(note.title !== "" || note.text !== "");
    const timer = useRef<number | undefined>(undefined);

    // What is waiting to be saved, as it goes; undefined when nothing needs to go.
    const take = (): { id: string; title: string; text: string; } | undefined => {
        window.clearTimeout(timer.current);
        const written = unsaved.current;
        unsaved.current = undefined;

        if (written === undefined || (!sent.current && written.title.trim() === "" && written.text.trim() === "")) {
            return undefined;
        }

        sent.current = true;
        return { id: note.id, ...written };
    };

    const save = async (): Promise<boolean> => {
        const change = take();

        if (change === undefined) {
            return true;
        }

        const problem = await sendNote(change);
        setAt(new Date().toISOString());

        // Written again, a note is no longer shared: the master would hear the words before.
        if (problem === undefined) {
            setShared(undefined);
            onPending(false);
        }

        setSaved(problem === undefined);
        setSaid(problem);
        return problem === undefined;
    };

    const write = (change: { title?: string; text?: string; }): void => {
        const next = { title: change.title ?? title, text: change.text ?? text };
        setTitle(next.title);
        setText(next.text);
        unsaved.current = next;
        setSaved(false);
        onWritten();
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void save(), savePause);
    };

    const share = async (): Promise<void> => {
        if (!(await save())) {
            return;
        }

        const problem = await sendNote({ share: note.id });
        setSaid(problem);

        if (problem === undefined) {
            setShared(new Date().toISOString());
            onPending(true);
        }
    };

    const unshare = async (): Promise<void> => {
        const problem = await sendNote({ unshare: note.id });
        setSaid(problem);
        onPending(false);

        if (problem === undefined) {
            setShared(undefined);
        }
    };

    const keep = (): void => {
        setRemoving(false);
        // The trash comes back after the question: the focus goes to it once it is drawn.
        window.setTimeout(() => trash.current?.focus());
    };

    const remove = async (): Promise<void> => {
        window.clearTimeout(timer.current);
        unsaved.current = undefined;
        const problem = sent.current ? await sendNote({ remove: note.id }) : undefined;

        if (problem === undefined) {
            onPending(false);
            onRemoved();
        } else {
            setSaid(problem);
            keep();
        }
    };

    useEffect(() => {
        if (focus !== undefined) {
            titleField.current?.focus();
        }
    }, [focus]);

    // Asked whether to delete it, Keep takes the focus.
    useEffect(() => {
        if (removing) {
            keepButton.current?.focus();
        }
    }, [removing]);

    // A page hidden or closed saves what is waiting at once, the request outliving the page; leaving the tab saves it too.
    useEffect(() => {
        const leave = (): void => {
            const change = take();

            if (change !== undefined) {
                void sendNote(change, true);
            }
        };

        const hidden = (): void => {
            if (document.visibilityState === "hidden") {
                leave();
            }
        };

        window.addEventListener("pagehide", leave);
        document.addEventListener("visibilitychange", hidden);

        return () => {
            window.removeEventListener("pagehide", leave);
            document.removeEventListener("visibilitychange", hidden);
            void save();
        };
    }, []);

    const written = realTimeLabel(at);
    const empty = title.trim() === "" && text.trim() === "";
    const waiting = shared !== undefined && pending;
    return (
        <article class="note-card" aria-label={title.trim() === "" ? t("Note") : title.trim()} onFocusOut={(event) => !event.currentTarget.contains(event.relatedTarget as Node | null) && void save()}>
            <input
                ref={titleField}
                class="note-title"
                type="text"
                value={title}
                maxLength={200}
                placeholder={t("Title")}
                aria-label={t("The note's title")}
                onInput={(event) => write({ title: event.currentTarget.value })}
            />
            <textarea
                class="note-text"
                value={text}
                maxLength={20_000}
                rows={4}
                placeholder={t("Write here…")}
                aria-label={title.trim() === "" ? t("The note") : t("The note {title}", { title: title.trim() })}
                onInput={(event) => write({ text: event.currentTarget.value })}
            />
            <p class="note-said" role="alert">{said}</p>
            <footer class="note-foot">
                <span class="note-when">
                    {written !== undefined && sent.current ? written.short : ""}
                    {saved && <span aria-hidden="true">{`· ${t("Saved")}`}</span>}
                </span>
                {removing
                    ? (
                        <span
                            class="note-remove"
                            onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                    keep();
                                }
                            }}
                        >
                            {t("Delete it?")}
                            <button ref={keepButton} type="button" class="save-button" onClick={keep}>{t("Keep")}</button>
                            <button type="button" class="save-button danger" onClick={() => void remove()}>{t("Delete")}</button>
                        </span>
                    )
                    : (
                        <>
                            <span class="note-state" role="status">
                                {waiting && (
                                    <span class="note-chip" data-tip={t("The master hears it at their next call")}>
                                        <Icon name="send" /> {t("Shared")}
                                    </span>
                                )}
                                {shared !== undefined && !pending && (
                                    <span class="note-chip read" data-tip={t("The master has read it")}>
                                        <Icon name="check" /> {t("Read")}
                                    </span>
                                )}
                            </span>
                            {waiting
                                ? (
                                    <button type="button" class="icon-button" aria-label={t("Take it back from the master")} data-tip={t("Take it back")} onClick={() => void unshare()}>
                                        <Icon name="undo" />
                                    </button>
                                )
                                : shared !== undefined
                                ? (
                                    <button type="button" class="icon-button" aria-label={t("Share it again with the master")} data-tip={t("Share again")} disabled={empty} onClick={() => void share()}>
                                        <Icon name="send" />
                                    </button>
                                )
                                : (
                                    <button type="button" class="save-button note-share" aria-label={t("Share with the master")} data-tip={t("Share with the master")} disabled={empty} onClick={() => void share()}>
                                        <Icon name="send" /> {t("Share")}
                                    </button>
                                )}
                            <button ref={trash} type="button" class="icon-button note-trash tip-left" aria-label={t("Delete the note")} data-tip={t("Delete")} onClick={() => setRemoving(true)}>
                                <Icon name="clear" />
                            </button>
                        </>
                    )}
            </footer>
        </article>
    );
}

/** A new note's id: the time and a few random letters, unique enough for one player's notes. */
function newNoteId(): string
{
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
