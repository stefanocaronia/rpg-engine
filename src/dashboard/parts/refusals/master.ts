// Why a turn of the master's failed or their chat ended, as the AI app's driver tells it by a code (T-267): said for who plays, the app by its name
// (`host`, which the page gives where the driver does not), never in the driver's words. Whole sentences, which stand alone as a line of the table and after
// «The chat ended:». What the app said itself stays as it came, in a sentence of its own after the page's.
import { t } from "../../text.ts";
import type { Phrases, Values } from "./phrases.ts";

export const failures: Phrases = {
    // The app's program, and how the table talks with it.
    "signin": (values) => withSaid(t("{host} asks you to sign in again.", values), values),
    "program-ended": (values) => withSaid(t("{host} stopped working ({reason}).", values), values),
    "not-stopped": (values) => t("{host} did not stop the turn when asked, so the chat was closed.", values),
    "not-ready": (values) => t("{host} took more than {seconds} seconds to get ready to play with {model}.", values),
    "no-protocol": (values) => withSaid(t("{host} did not answer as RPG Engine expects.", values), values),
    "chat-not-opened": (values) => withSaid(t("{host} did not open the chat.", values), values),
    "chat-not-resumed": (values) => withSaid(t("{host} did not take up the chat again.", values), values),
    "no-resume": (values) => t("{host} cannot take up a chat again. Open a new one.", values),
    // The model and the level of thinking asked.
    "model-not-taken": (values) => withSaid(t("{host} did not take the model {model}.", values), values),
    "model-not-confirmed": (values) => t("{host} did not confirm the model {model} within {seconds} seconds.", values),
    "model-stayed": (values) => t("{host} was asked for the model {asked}, and kept {model}.", values),
    "model-other": (values) => named(values.model) ? t("{host} was asked for the model {asked}, and plays with {model}.", values) : t("{host} was asked for the model {asked}, and plays with another.", values),
    "model-switched": (values) => named(values.model) ? t("{host} plays with the model {model} instead of {asked}.", values) : t("{host} no longer plays with the model {asked}.", values),
    "effort-not-taken": (values) => withSaid(t("{host} did not take the level of thinking {effort}.", values), values),
    "effort-other": (values) => named(values.effort) ? t("{host} was asked for the level of thinking {asked}, and plays with {effort}.", values) : t("{host} was asked for the level of thinking {asked}, and plays with another.", values),
    "effort-switched": (values) => t("{host} plays with the level of thinking {effort} instead of {asked}.", values),
    // A turn the app ended.
    "host-said": (values) => t("{host} said: {why}", values),
    "model-failed": (values) => t("The model of {host} did not answer ({why}).", values),
    "words-not-taken": (values) => withSaid(t("{host} did not take your words.", values), values),
    "turn-stopped": (values) => t("{host} ended the turn without finishing it ({why}).", values),
    "answer-too-long": () => t("The master's answer reached the longest its model can write. Ask them to go on."),
    "too-many-steps": () => t("The master took more steps than one turn allows. Ask them to go on."),
    "model-refused": () => t("The model refused to go on. Try saying it another way."),
    // What the master may not use at the table.
    "tool-unasked": (values) => t("The master used {tool}, which they may not use here, so the turn was stopped.", values),
    "read-outside": (values) => t("The master read {path} with {tool}, and here they read only the campaign's folder, so the turn was stopped.", values),
    "read-unsaid": (values) => t("The master read a file with {tool} without saying which, and here they read only the campaign's folder, so the turn was stopped.", values),
    "agent-unknown": () => t("The master started a helper without saying which, and here they may start only the one that plays a character, so the turn was stopped."),
    "agent-other": () => t("The master started a helper of their own, and here they may start only the one that plays a character, so the turn was stopped."),
    "agent-unasked": () => t("The master started a helper they may not start here, so the turn was stopped."),
};

/** A sentence, then what the app said itself, where it said something. */
function withSaid(sentence: string, values: Values): string
{
    return named(values.why) ? `${sentence} ${t("{host} said: {why}", values)}` : sentence;
}

/** Whether a value that may be left out came with something in it. */
function named(value: string | undefined): boolean
{
    return value !== undefined && value !== "";
}
