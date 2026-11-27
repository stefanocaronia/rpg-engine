// The table's chat with the master (T-267): the table's own lines among its messages, and what it refuses the page, as a chat that does not open, the
// player's words while the master answers, another model. An opening refused as the player is not signed in has no words here: the page shows the app to
// set up in their place.
import { t } from "../../text.ts";
import type { Phrases } from "./phrases.ts";

/** The lines the table writes among the chat's messages. */
export const tableLines: Phrases = {
    "turn-silent": () => t("The master ended their turn without writing anything: write to them again."),
    "turn-silent-tool": (values) => t("The master ended their turn without writing anything, after trying to use {tool}, which they may not use here: write to them again.", values),
    "turn-failed": () => t("The master's turn failed: write to them again."),
};

export const chatRefusals: Phrases = {
    // The player's words.
    "no-table": () => t("The chat with the master is here only when the campaign is opened from RPG Engine: open it from there."),
    "master-answering": () => t("The master is still answering: wait, or stop the turn."),
    "question-waits": () => t("The master's question has its own buttons: answer it there."),
    "no-chat": () => t("No chat with the master is open: open one first."),
    // Opening a chat.
    "chat-open": () => t("A chat with the master is already open: close it first."),
    "chat-by-hand": () => t("A chat you opened yourself is playing this campaign: go on there, or close it to play here."),
    "host-not-yet": (values) => t("The page cannot open a chat with {host} yet: choose another app.", values),
    "app-missing": (values) => t("{host} is not on this computer: install it, then try again.", values),
    "model-needed": (values) => t("Choose the model {host} plays the master with.", values),
    "model-no-name": (values) => t("{model} is not the name of a model: choose one from the list of {host}.", values),
    "host-not-started": (values) => t("{host} could not be started: {why}", values),
    "no-server-file": (values) => t("This campaign lacks {file}, the file that tells {host} how to reach the game: open a terminal in the campaign's folder and type rpg init, then try again.", values),
    "effort-unknown": (values) => t("{host} has no level of thinking {effort}: choose one of {efforts}.", values),
    "effort-none": (values) => t("{model} takes no level of thinking in {host}: choose the model again.", values),
    "effort-not-of-model": (values) => t("{model} has no level of thinking {effort} in {host}: choose one of {efforts}.", values),
    // Another model for the open chat.
    "model-while-answering": () => t("The master is answering: change the model when they have finished."),
    "no-model-change": (values) => t("{host} cannot change model in an open chat: close the chat, then open it with another model.", values),
    "no-model-change-page": () => t("The model cannot be changed in an open chat here: close the chat, then open it with another model."),
    "master-getting-ready": () => t("The master is getting ready: change the model in a moment."),
};
