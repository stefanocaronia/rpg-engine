// What a chat with the master plays with, to choose: the AI app among all the page knows, those it cannot open now dimmed with why; the model among those
// the app offers, or another written by hand; and how much the master thinks, among the levels that model takes. Where a chat is opened, and where the
// launcher makes a campaign, whose first chat proposes them.
import { useEffect, useRef } from "preact/hooks";
import type { ChatChoice, MasterShown } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { Segmented } from "../parts/segmented.tsx";
import { listText, t } from "../text.ts";
import { choiceOf, effortsOf, hostsFound, modelOf, settledChoice, withModel } from "./chat.ts";

// How long a model's name may be, as the table takes it.
const mostModel = 100;

/**
 * The app, the model and the effort, each its label before its control. Every app is there to see: one that is not on this computer, or that the page cannot
 * open yet, is dimmed, with a line that says which and why. The model is one of the app's list, with what the app says of it, or Other, a name written by
 * hand, as it is while the app has not answered with its list. The effort's row is there only for a model that takes one.
 */
export function ChoiceFields({ shown, choice, onChoice }: { shown: Pick<MasterShown, "hosts" | "last">; choice: ChatChoice | undefined; onChoice(choice: ChatChoice): void; })
{
    const { found, missing, later } = hostsFound(shown);
    const host = found.find((one) => one.id === choice?.host);
    // Whether the model's name is the player's own, written by hand or asked for with Other: the app's list, as it arrives, leaves it alone.
    const written = useRef(false);
    const name = useRef<HTMLInputElement>(null);
    const listed = host !== undefined && choice !== undefined ? modelOf(host, choice.model) : undefined;
    const efforts = host !== undefined && choice !== undefined ? effortsOf(host, choice.model) : [];

    // The app's list arrives a moment after the form, and may change: the choice follows it, but a name the player wrote.
    useEffect(() => {
        if (host !== undefined && choice !== undefined) {
            const settled = settledChoice(host, choice, written.current);

            if (settled.model !== choice.model || settled.effort !== choice.effort) {
                onChoice(settled);
            }
        }
    }, [host?.id, host?.models.map((model) => model.id).join()]);

    const pick = (model: string): void => {
        if (host === undefined || choice === undefined) {
            return;
        }

        // Other: a name to write, the field for it with the focus.
        written.current = model === "";
        onChoice(withModel(host, choice, model));

        if (model === "") {
            requestAnimationFrame(() => name.current?.focus());
        }
    };

    return (
        <>
            {shown.hosts.length > 0 && (
                <div class="chat-fields">
                    <span id="chat-host-label" class="chat-label">{t("Your AI app")}</span>
                    <Segmented
                        label="chat-host-label"
                        described="chat-host-notes"
                        options={shown.hosts.map((one) => ({ value: one.id, label: one.name, off: !found.includes(one) }))}
                        value={host?.id}
                        onPick={(value) => {
                            written.current = false;
                            onChoice(choiceOf(shown, value));
                        }}
                    />
                    {choice !== undefined && host !== undefined && (
                        <>
                            <label id="chat-model-label" for="chat-model" class="chat-label">{t("Model")}</label>
                            <div class="chat-choice">
                                {host.models.length > 0 && (
                                    <select
                                        id="chat-model"
                                        class="chat-model"
                                        aria-describedby="chat-model-about"
                                        value={listed === undefined ? "" : choice.model}
                                        onChange={(event) => pick(event.currentTarget.value)}
                                    >
                                        {host.models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                                        <option value="">{t("Other")}</option>
                                    </select>
                                )}
                                {listed === undefined && (
                                    <input
                                        ref={name}
                                        id={host.models.length > 0 ? "chat-model-name" : "chat-model"}
                                        class="chat-model"
                                        type="text"
                                        dir="ltr"
                                        aria-labelledby="chat-model-label"
                                        value={choice.model}
                                        maxLength={mostModel}
                                        spellcheck={false}
                                        autocomplete="off"
                                        autocapitalize="off"
                                        onInput={(event) => {
                                            written.current = true;
                                            onChoice(withModel(host, choice, event.currentTarget.value));
                                        }}
                                    />
                                )}
                                {/* What the app says of the model, in its own words. */}
                                <p id="chat-model-about" class="chat-hint" dir="auto">{listed?.about ?? ""}</p>
                            </div>
                            {efforts.length > 0 && (
                                <>
                                    <span id="chat-effort-label" class="chat-label">{t("Master's thinking")}</span>
                                    <Segmented
                                        label="chat-effort-label"
                                        options={[{ value: "", label: t("Default") }, ...efforts.map((effort) => ({ value: effort, label: effort }))]}
                                        value={choice.effort ?? ""}
                                        onPick={(value) => onChoice({ host: choice.host, model: choice.model, ...(value === "" ? {} : { effort: value }) })}
                                    />
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
            <div id="chat-host-notes" class="chat-notes">
                {missing.map((one) => (
                    <p key={one.id} class="chat-note">
                        <Icon name="info" />
                        {t("{name} is not on this computer: install it to play with it here.", { name: one.name })}
                    </p>
                ))}
                {later.length > 0 && (
                    <p class="chat-note">
                        <Icon name="info" />
                        {t("Not from here yet: {names}.", { names: listText(later.map((one) => one.name)) })}
                    </p>
                )}
            </div>
        </>
    );
}
