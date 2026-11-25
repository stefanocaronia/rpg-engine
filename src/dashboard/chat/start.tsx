// Where a chat with the master is opened: the AI app among those on this computer, the model, how much the master thinks, then the last chat taken up or a
// new one. An app that is not on this computer is only named, with what to do.
import { useEffect, useState } from "preact/hooks";
import type { ChatChoice, MasterShown } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { Segmented } from "../parts/segmented.tsx";
import { t } from "../text.ts";
import { choiceOf, firstChoice, hostsFound, resumes } from "./chat.ts";

// How long a model's name may be, as the table takes it.
const mostModel = 100;

export function ChatStart({ shown, sending, onOpen }: { shown: MasterShown; sending: boolean; onOpen(choice: ChatChoice, fresh: boolean): void; })
{
    const [choice, setChoice] = useState(() => firstChoice(shown));
    const { found, missing } = hostsFound(shown);
    const host = found.find((one) => one.id === choice?.host);

    // An app found since, as one just installed, or the one chosen gone: the first choice anew.
    useEffect(() => {
        if (host === undefined) {
            setChoice(firstChoice(shown));
        }
    }, [found.map((one) => one.id).join()]);

    const ready = choice !== undefined && host !== undefined && choice.model.trim() !== "" && !sending;

    const open = (fresh: boolean): void => {
        if (ready) {
            onOpen({ ...choice, model: choice.model.trim() }, fresh);
        }
    };

    const again = choice !== undefined && resumes(shown, choice.host);
    return (
        <form
            class="chat-start"
            onSubmit={(event) => {
                event.preventDefault();
                open(!again);
            }}
        >
            {/* What this place is, until a chat has been played in it. */}
            {shown.messages.length === 0 && <p class="chat-about">{t("The master answers here, in your AI app on this computer: open the chat to play.")}</p>}
            {choice !== undefined && host !== undefined && (
                <div class="chat-fields">
                    <span id="chat-host-label" class="chat-label">{t("Your AI app")}</span>
                    {found.length === 1
                        ? <span class="chat-value">{host.name}</span>
                        : (
                            <Segmented
                                label="chat-host-label"
                                options={found.map((one) => ({ value: one.id, label: one.name }))}
                                value={choice.host}
                                onPick={(value) => setChoice(choiceOf(shown, value))}
                            />
                        )}
                    <label for="chat-model" class="chat-label">{t("Model")}</label>
                    <input
                        id="chat-model"
                        class="chat-model"
                        type="text"
                        dir="ltr"
                        value={choice.model}
                        maxLength={mostModel}
                        spellcheck={false}
                        autocomplete="off"
                        autocapitalize="off"
                        onInput={(event) => setChoice({ ...choice, model: event.currentTarget.value })}
                    />
                    <span id="chat-effort-label" class="chat-label">{t("Master's thinking")}</span>
                    <Segmented
                        label="chat-effort-label"
                        options={[{ value: "", label: t("Default") }, ...host.efforts.map((effort) => ({ value: effort, label: effort }))]}
                        value={choice.effort ?? ""}
                        onPick={(value) => setChoice({ host: choice.host, model: choice.model, ...(value === "" ? {} : { effort: value }) })}
                    />
                </div>
            )}
            {missing.map((one) => (
                <p key={one.id} class="chat-note">
                    <Icon name="info" />
                    {t("{name} is not on this computer: install it to play with it here.", { name: one.name })}
                </p>
            ))}
            {choice !== undefined && host !== undefined && (
                <div class="chat-buttons">
                    {again && <button type="button" class="button" aria-disabled={!ready} onClick={() => open(true)}>{t("New chat")}</button>}
                    <button type="submit" class="button gold" aria-disabled={!ready} aria-busy={sending}>{again ? t("Resume the chat") : t("Open the chat")}</button>
                </div>
            )}
        </form>
    );
}
