// What a chat with the master plays with, to choose: the AI app among those on this computer, the model, how much the master thinks. Where a chat is opened,
// and where the launcher makes a campaign, whose first chat proposes them.
import type { ChatChoice, MasterShown } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { Segmented } from "../parts/segmented.tsx";
import { t } from "../text.ts";
import { choiceOf, hostsFound } from "./chat.ts";

// How long a model's name may be, as the table takes it.
const mostModel = 100;

/** The app, the model and the effort, each its label before its control; an app that is not on this computer is only named, with what to do. */
export function ChoiceFields({ shown, choice, onChoice }: { shown: MasterShown; choice: ChatChoice | undefined; onChoice(choice: ChatChoice): void; })
{
    const { found, missing } = hostsFound(shown);
    const host = found.find((one) => one.id === choice?.host);
    return (
        <>
            {choice !== undefined && host !== undefined && (
                <div class="chat-fields">
                    <span id="chat-host-label" class="chat-label">{t("Your AI app")}</span>
                    {found.length === 1
                        ? <span class="chat-value">{host.name}</span>
                        : <Segmented label="chat-host-label" options={found.map((one) => ({ value: one.id, label: one.name }))} value={choice.host} onPick={(value) => onChoice(choiceOf(shown, value))} />}
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
                        onInput={(event) => onChoice({ ...choice, model: event.currentTarget.value })}
                    />
                    <span id="chat-effort-label" class="chat-label">{t("Master's thinking")}</span>
                    <Segmented
                        label="chat-effort-label"
                        options={[{ value: "", label: t("Default") }, ...host.efforts.map((effort) => ({ value: effort, label: effort }))]}
                        value={choice.effort ?? ""}
                        onPick={(value) => onChoice({ host: choice.host, model: choice.model, ...(value === "" ? {} : { effort: value }) })}
                    />
                </div>
            )}
            {missing.map((one) => (
                <p key={one.id} class="chat-note">
                    <Icon name="info" />
                    {t("{name} is not on this computer: install it to play with it here.", { name: one.name })}
                </p>
            ))}
        </>
    );
}
