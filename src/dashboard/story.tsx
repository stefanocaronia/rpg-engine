// The player character's story in the player's words (D-373): the opening text of its page, in the sheet's Description, written here and saved with Save;
// the master's secrets stay as they are, and the master hears it at their next call.
import { useEffect, useId, useRef, useState } from "preact/hooks";
import { sendStory } from "./api.ts";
import { Icon } from "./icons.tsx";

export function StoryBox({ story }: { story: string; })
{
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(story);
    const [status, setStatus] = useState<string>();
    const [busy, setBusy] = useState(false);
    const id = useId();
    const field = useRef<HTMLTextAreaElement>(null);
    const pencil = useRef<HTMLButtonElement>(null);
    const wasEditing = useRef(false);

    // Opened, the field takes the focus; closed, the button that opens it.
    useEffect(() => {
        if (editing) {
            field.current?.focus();
        } else if (wasEditing.current) {
            pencil.current?.focus();
        }

        wasEditing.current = editing;
    }, [editing]);

    const save = async (event: Event): Promise<void> => {
        event.preventDefault();
        setBusy(true);
        const problem = await sendStory(draft);
        setBusy(false);
        setStatus(problem ?? "Saved: the master reads it at their next call.");
        setEditing(problem !== undefined);
    };

    if (!editing) {
        return (
            <div class="story-box">
                <button
                    ref={pencil}
                    type="button"
                    class="save-button"
                    onClick={() => {
                        setDraft(story);
                        setStatus(undefined);
                        setEditing(true);
                    }}
                >
                    <Icon name="pencil" /> {story === "" ? "Write your character's story" : "Edit your story"}
                </button>
                <span class="story-status" role="status">{status}</span>
            </div>
        );
    }

    return (
        <form class="story-box editing" onSubmit={(event) => void save(event)}>
            <label for={id}>Your character's story and look, in your words. The master reads it, and may propose changes in the chat if it leaves the world.</label>
            <textarea ref={field} id={id} value={draft} rows={10} maxLength={20_000} onInput={(event) => setDraft(event.currentTarget.value)} />
            <div class="story-buttons">
                <span class="story-status" role="status">{status}</span>
                <button type="button" class="save-button" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" class="save-button gold" disabled={busy || draft.trim() === story.trim()}>Save</button>
            </div>
        </form>
    );
}
