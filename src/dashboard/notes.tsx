// The player's notes (D-371), a tab of the Journal: free notes, a title and a text each, saved by themselves as the player writes, kept outside the game; one may
// be shared with the master, who hears it at their next call.
import { useEffect, useRef, useState } from "preact/hooks";
import { type Note, readNotes, sendNote } from "./api.ts";
import { Icon } from "./icons.tsx";
import { realTimeLabel } from "./labels.ts";

// How long the page waits after the last key before it saves a note, in milliseconds.
const savePause = 800;

export function Notes()
{
    const [notes, setNotes] = useState<Note[]>();
    const [problem, setProblem] = useState<string>();
    const [made, setMade] = useState<string>();

    useEffect(() => {
        void readNotes().then(setNotes, (error: unknown) => setProblem(error instanceof Error ? error.message : String(error)));
    }, []);

    const add = (): void => {
        const note = { id: newNoteId(), title: "", text: "", at: new Date().toISOString() };
        setNotes((all) => [note, ...(all ?? [])]);
        setMade(note.id);
    };

    if (problem !== undefined) {
        return <p class="journal-problem" role="alert">{problem}</p>;
    }

    return (
        <div class="notes">
            <div class="notes-head">
                <p class="notes-about">Names, clues, what you suspect. The master does not read them: share one when you want them to know.</p>
                <button type="button" class="save-button gold" onClick={add} disabled={notes === undefined}>
                    <Icon name="plus" /> New note
                </button>
            </div>
            {notes?.length === 0 && <p class="journal-none">No notes yet.</p>}
            {notes !== undefined && notes.length > 0 && (
                <div class="note-cards">
                    {notes.map((note) => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            fresh={note.id === made}
                            onRemoved={() => setNotes((all) => all?.filter((one) => one.id !== note.id))}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/** A note as its card shows it, to write in: its title and text saved a moment after the last key, when the card is left, and before it is shared. */
function NoteCard({ note, fresh, onRemoved }: { note: Note; fresh: boolean; onRemoved(): void; })
{
    const [title, setTitle] = useState(note.title);
    const [text, setText] = useState(note.text);
    const [at, setAt] = useState(note.at);
    const [status, setStatus] = useState<string>();
    const [removing, setRemoving] = useState(false);
    const titleField = useRef<HTMLInputElement>(null);
    // What is written and not saved yet, and whether the note was ever sent to be saved: an empty new note is never written, and one sent is taken away there too.
    const pending = useRef<{ title: string; text: string; } | undefined>(undefined);
    const saved = useRef(note.title !== "" || note.text !== "");
    const timer = useRef<number | undefined>(undefined);

    const save = async (): Promise<boolean> => {
        window.clearTimeout(timer.current);
        const written = pending.current;
        pending.current = undefined;

        if (written === undefined || (!saved.current && written.title.trim() === "" && written.text.trim() === "")) {
            return true;
        }

        saved.current = true;
        const problem = await sendNote({ id: note.id, title: written.title, text: written.text });
        setAt(new Date().toISOString());
        setStatus(problem ?? "Saved");
        return problem === undefined;
    };

    const write = (change: { title?: string; text?: string; }): void => {
        const next = { title: change.title ?? title, text: change.text ?? text };
        setTitle(next.title);
        setText(next.text);
        pending.current = next;
        setStatus(undefined);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void save(), savePause);
    };

    const share = async (): Promise<void> => {
        if (!(await save())) {
            return;
        }

        const problem = await sendNote({ share: note.id });
        setStatus(problem ?? "Shared: the master hears it at their next call.");
    };

    const remove = async (): Promise<void> => {
        window.clearTimeout(timer.current);
        pending.current = undefined;
        const problem = saved.current ? await sendNote({ remove: note.id }) : undefined;

        if (problem === undefined) {
            onRemoved();
        } else {
            setStatus(problem);
            setRemoving(false);
        }
    };

    useEffect(() => {
        if (fresh) {
            titleField.current?.focus();
        }

        // Leaving the tab or the page saves what is still pending.
        return () => void save();
    }, []);

    const when = realTimeLabel(at);
    const empty = title.trim() === "" && text.trim() === "";
    return (
        <article class="note-card" aria-label={title.trim() === "" ? "Note" : title.trim()} onFocusOut={(event) => !event.currentTarget.contains(event.relatedTarget as Node | null) && void save()}>
            <input
                ref={titleField}
                class="note-title"
                type="text"
                value={title}
                maxLength={200}
                placeholder="Title"
                aria-label="The note's title"
                onInput={(event) => write({ title: event.currentTarget.value })}
            />
            <textarea
                class="note-text"
                value={text}
                maxLength={20_000}
                rows={4}
                placeholder="Write here…"
                aria-label={title.trim() === "" ? "The note" : `The note ${title.trim()}`}
                onInput={(event) => write({ text: event.currentTarget.value })}
            />
            <footer class="note-foot">
                {when !== undefined && saved.current && <time class="note-when" dateTime={at} data-tip={when.full}>{when.short}</time>}
                <span class="note-status" role="status">{status}</span>
                {removing
                    ? (
                        <span class="note-remove">
                            Delete it?
                            <button type="button" class="save-button" autoFocus onClick={() => setRemoving(false)}>Keep</button>
                            <button type="button" class="save-button danger" onClick={() => void remove()}>Delete</button>
                        </span>
                    )
                    : (
                        <>
                            <button type="button" class="save-button" disabled={empty} onClick={() => void share()}>
                                <Icon name="send" /> Share with the master
                            </button>
                            <button type="button" class="icon-button tip-left" aria-label="Delete the note" data-tip="Delete" onClick={() => setRemoving(true)}>
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
