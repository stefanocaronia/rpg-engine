// The player character's story in the player's words (D-373, D-386): a proposal from the sheet's Description, which the master hears quoted and writes in the
// page in their own words, with the player's yes; until then the box says it was sent.
import { useEffect, useId, useRef, useState } from "preact/hooks";
import { readStory, sendStory } from "./api.ts";
import { Icon } from "./icons.tsx";
import { t } from "./text.ts";

export function StoryBox({ story }: { story: string; })
{
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(story);
    // The proposal the master has not written yet, as the game keeps it: read again whenever the page's story changes.
    const [proposed, setProposed] = useState<string>();
    const [problem, setProblem] = useState<string>();
    const [busy, setBusy] = useState(false);
    const id = useId();
    const field = useRef<HTMLTextAreaElement>(null);
    const pencil = useRef<HTMLButtonElement>(null);
    const wasEditing = useRef(false);

    useEffect(() => {
        void readStory().then(setProposed, () => setProposed(undefined));
    }, [story]);

    // Opened, the field takes the focus; closed, the button that opens it.
    useEffect(() => {
        if (editing) {
            field.current?.focus();
        } else if (wasEditing.current) {
            pencil.current?.focus();
        }

        wasEditing.current = editing;
    }, [editing]);

    const send = async (event: Event): Promise<void> => {
        event.preventDefault();
        setBusy(true);
        const refused = await sendStory(draft);
        setBusy(false);
        setProblem(refused);

        if (refused === undefined) {
            setProposed(draft.trim());
            setEditing(false);
        }
    };

    if (!editing) {
        return (
            <div class="story-box">
                {proposed !== undefined && (
                    <p class="story-sent">
                        <Icon name="send" /> {t("Sent to the master: they write it in your page once you agree in the chat.")}
                    </p>
                )}
                <button
                    ref={pencil}
                    type="button"
                    class="button"
                    onClick={() => {
                        setDraft(proposed ?? story);
                        setProblem(undefined);
                        setEditing(true);
                    }}
                >
                    <Icon name="pencil" /> {proposed !== undefined ? t("Change what you sent") : story === "" ? t("Write your character's story") : t("Propose changes to your story")}
                </button>
            </div>
        );
    }

    return (
        <form class="story-box editing" onSubmit={(event) => void send(event)}>
            <label for={id}>{t("Your character's story and look, in your words. It goes to the master, who writes it in your page with you.")}</label>
            <textarea ref={field} id={id} value={draft} rows={10} maxLength={20_000} onInput={(event) => setDraft(event.currentTarget.value)} />
            <div class="story-buttons">
                <span class="story-status" role="alert">{problem}</span>
                <button type="button" class="button" onClick={() => setEditing(false)}>{t("Cancel")}</button>
                <button type="submit" class="button gold" disabled={busy || draft.trim() === "" || draft.trim() === (proposed ?? story).trim()}>
                    <Icon name="send" /> {t("Send to the master")}
                </button>
            </div>
        </form>
    );
}
