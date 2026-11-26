// What a chat with the master plays with, to choose: the AI app among all the page knows, a row each, saying how it stands; the model among those the app
// offers, with how much the master thinks at the foot of its list, always a level of the model's own. An app that is not ready shows, in the model's place,
// what it needs and what does it (T-290); with no app on this computer, the apps to install. Where a chat is opened, and where the launcher makes a
// campaign, whose first chat proposes them.
import { useEffect, useRef } from "preact/hooks";
import type { HostWish } from "../api.ts";
import type { ChatChoice, MasterShown } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { Segmented } from "../parts/segmented.tsx";
import { listText, t } from "../text.ts";
import { AppChoice } from "./app-choice.tsx";
import { ChatNeed, HostRows, Independent } from "./apps.tsx";
import { choiceOf, effortsOf, hostFacts, type HostState, hostState, modelOf, settledChoice, withModel } from "./chat.ts";
import { ModelPicker } from "./models.tsx";

// How long a model's name may be, as the table takes it.
const mostModel = 100;

/**
 * The app, the model and the effort, each its label before its control. Every app is there to see, with the words that say how it stands where it is not
 * ready; one the page cannot open yet is dimmed, with a line that says so. Under the model, that it is paid apart where it is, and always the page's advice
 * to play with a capable one. With no app installed, the apps to install in their place. While an app has not said its models, the one it proposes is a
 * name in a field.
 */
export function ChoiceFields({ shown, choice, onChoice, onWish }: {
    shown: Pick<MasterShown, "hosts" | "last">;
    choice: ChatChoice | undefined;
    onChoice(choice: ChatChoice): void;
    onWish(wish: HostWish): void;
})
{
    const states = new Map(shown.hosts.map((one) => [one.id, hostState(one)]));
    const later = shown.hosts.filter((one) => states.get(one.id) === "later");
    const host = shown.hosts.find((one) => one.id === choice?.host && states.get(one.id) !== "later");
    const state = host === undefined ? undefined : states.get(host.id);
    const signedIn = useSignedIn(host?.id, state);
    const installed = shown.hosts.some((one) => !["install", "installing", "later"].includes(states.get(one.id) ?? "later"));

    // The app's list arrives a moment after the form, and may change, as the levels of a model do: the choice follows it, a model it does not list giving
    // way to one it does, and a level the model does not take to the one proposed for it.
    useEffect(() => {
        if (host !== undefined && choice !== undefined) {
            const settled = settledChoice(host, choice, false);

            if (settled.model !== choice.model || settled.effort !== choice.effort) {
                onChoice(settled);
            }
        }
    }, [host?.id, host?.models.map((model) => `${model.id}:${model.efforts.join()}`).join()]);

    if (shown.hosts.length === 0) {
        return null;
    }

    // Nothing installed yet: the apps to install, each with what it needs.
    if (!installed) {
        return (
            <div class="chat-fields alone">
                <p class="chat-about">{t("The master is an AI that plays in an app on your computer, with your account. To play here you need one of these:")}</p>
                <HostRows hosts={shown.hosts} onWish={onWish} />
                <LaterNote names={later.map((one) => one.name)} />
                <Independent />
            </div>
        );
    }

    const listed = host !== undefined && choice !== undefined ? modelOf(host, choice.model) : undefined;
    const efforts = host !== undefined && choice !== undefined ? effortsOf(host, choice.model) : [];
    const trial = host === undefined ? undefined : hostFacts(host.id)?.trial;
    return (
        <div class="chat-fields">
            <span id="chat-host-label" class="chat-label">{t("Your AI app")}</span>
            <AppChoice hosts={shown.hosts} value={host?.id} label="chat-host-label" described="chat-host-notes" onPick={(value) => onChoice(choiceOf(shown, value))} />
            {host !== undefined && state !== "ready" && <ChatNeed host={host} onWish={onWish} />}
            {/* An app on trial at the table, said as soon as it is chosen; while it is not ready, its needs say it already. */}
            {trial !== undefined && state === "ready" && (
                <p class="chat-note chat-trial">
                    <Icon name="info" />
                    {trial}
                </p>
            )}
            {/* Who pays each answer: an app on an API key in place of a plan, said as soon as it is chosen. */}
            {host?.metered === true && state === "ready" && (
                <p class="chat-note chat-paid">
                    <Icon name="info" />
                    {t("{name} uses an API key: each answer of the master is paid for separately.", { name: host.name })}
                </p>
            )}
            {host !== undefined && state === "ready" && choice !== undefined && (
                <>
                    {signedIn && (
                        <p class="chat-signed" role="status">
                            <Icon name="check" />
                            {t("You are signed in to {name}.", { name: host.name })}
                        </p>
                    )}
                    <span id="chat-model-label" class="chat-label">{t("Model")}</span>
                    <div class="chat-choice">
                        {host.models.length > 0
                            ? (
                                <ModelPicker
                                    host={host}
                                    id="chat-model"
                                    labelledBy="chat-model-label"
                                    describedBy="chat-model-cost chat-model-advice"
                                    model={choice.model}
                                    effort={choice.effort}
                                    onPick={(model) => onChoice(withModel(host, choice, model))}
                                    onEffort={(value) => onChoice({ host: choice.host, model: choice.model, effort: value })}
                                />
                            )
                            : (
                                <input
                                    id="chat-model"
                                    class="chat-model"
                                    type="text"
                                    dir="ltr"
                                    aria-labelledby="chat-model-label"
                                    aria-describedby="chat-model-advice"
                                    value={choice.model}
                                    maxLength={mostModel}
                                    spellcheck={false}
                                    autocomplete="off"
                                    autocapitalize="off"
                                    onInput={(event) => onChoice(withModel(host, choice, event.currentTarget.value))}
                                />
                            )}
                        {/* That the model chosen is paid apart, where it is. */}
                        <p id="chat-model-cost" class="chat-hint">{listed?.metered === true ? t("Pay per use: it may cost extra; whoever provides the model decides.") : ""}</p>
                    </div>
                    {/* The page's own advice, whatever the app and the model: a master's craft asks for a capable one. */}
                    <p id="chat-model-advice" class="chat-note chat-advice">
                        <Icon name="info" />
                        {t("The master plays best with one of the most capable models: lighter ones sometimes skip parts of the story.")}
                    </p>
                    {/* With no list from the app, the levels of thinking stand on their own, as the list's foot is not there. */}
                    {host.models.length === 0 && efforts.length > 0 && (
                        <>
                            <span id="chat-effort-label" class="chat-label">{t("Master's thinking")}</span>
                            <Segmented
                                label="chat-effort-label"
                                options={efforts.map((effort) => ({ value: effort, label: effort }))}
                                value={choice.effort}
                                onPick={(value) => onChoice({ host: choice.host, model: choice.model, effort: value })}
                            />
                        </>
                    )}
                </>
            )}
            <div id="chat-host-notes" class="chat-notes">
                <LaterNote names={later.map((one) => one.name)} />
                {host !== undefined && state !== "ready" && <Independent />}
            </div>
        </div>
    );
}

/** The apps the page cannot open a chat in yet, named in a line. */
function LaterNote({ names }: { names: string[]; })
{
    return names.length === 0 ? null : (
        <p class="chat-note">
            <Icon name="info" />
            {t("Not from here yet: {names}.", { names: listText(names) })}
        </p>
    );
}

/** Whether the app chosen has just become ready after the player signed in to it: said once, until another app is chosen. */
function useSignedIn(host: string | undefined, state: HostState | undefined): boolean
{
    const before = useRef<{ host: string | undefined; state: HostState | undefined; signed: boolean; }>({ host, state, signed: false });
    const was = before.current;
    const signed = host === was.host && (was.signed || (state === "ready" && (was.state === "signIn" || was.state === "signingIn")));
    before.current = { host, state, signed: signed && state === "ready" };
    return signed && state === "ready";
}
