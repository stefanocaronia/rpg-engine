// The table's chat with the master as the page reads it (D-582): what its place shows, the choice a chat opens with, what is told as it changes, and when its
// list follows what comes. No drawing here: the page's parts draw what these say.
import type { ChatAsked, ChatChoice, ChatHost, ChatMessage, ChatModel, ChatSaid, MasterShown } from "../data.ts";
import { t } from "../text.ts";

/** What the chat's place shows: where a chat is opened, a chat opened by hand in its place, the open chat, or one whose program ended. */
export type ChatView = "start" | "elsewhere" | "open" | "ended";

/**
 * Where the chat stands: its own section, from the page's top; beside the setup's questions, in sight as they scroll; under them, far down the page; or in
 * its panel beside the page, which gives it its room.
 */
export type ChatPlace = "section" | "beside" | "under" | "dock";

// The least room the open chat takes, however little the window leaves it, and the room it leaves under itself.
const leastRoom = 320;
const footRoom = 16;

/** How far from its end, in pixels, a list still counts as showing it: a line or so. */
export const endSlack = 32;

/** What the chat's place shows now. A chat that ended leaves its place to start another, unless one opened by hand plays meanwhile. */
export function chatView(shown: MasterShown): ChatView
{
    if (shown.chat !== undefined && shown.chat.state !== "ended") {
        return "open";
    }

    if (shown.elsewhere) {
        return "elsewhere";
    }

    return shown.chat === undefined ? "start" : "ended";
}

/**
 * The apps of a chat: those it can open in, which the page drives and are on this computer; those the page drives that are not on this computer; and those
 * the page cannot drive yet, wherever they are.
 */
export function hostsFound(shown: Pick<MasterShown, "hosts">): { found: ChatHost[]; missing: ChatHost[]; later: ChatHost[]; }
{
    const ready = shown.hosts.filter((host) => host.ready);
    return { found: ready.filter((host) => host.found), missing: ready.filter((host) => !host.found), later: shown.hosts.filter((host) => !host.ready) };
}

/** A model of an app's list, by its id; none for a name the list does not have, or while the app has not answered. */
export function modelOf(host: ChatHost, id: string): ChatModel | undefined
{
    return host.models.find((model) => model.id === id);
}

/**
 * The model chosen before the player chooses: the one wanted, as the campaign's last, when the app lists it; else the one the app proposes, when it lists
 * it; else its first. While the app has not answered there is no list: the one wanted, else the one it proposes.
 */
export function listedModel(host: ChatHost, wanted: string | undefined): string
{
    if (host.models.length === 0) {
        return wanted ?? host.model;
    }

    return [wanted, host.model].find((id) => id !== undefined && modelOf(host, id) !== undefined) ?? host.models[0].id;
}

/** The efforts a model takes: its own, none for one that takes none; the app's for a model its list does not have, as a name written by hand. */
export function effortsOf(host: ChatHost, model: string): string[]
{
    return modelOf(host, model)?.efforts ?? host.efforts;
}

/** A choice with another model of the same app: the effort stays only while that model takes it. */
export function withModel(host: ChatHost, choice: ChatChoice, model: string): ChatChoice
{
    const effort = choice.effort !== undefined && effortsOf(host, model).includes(choice.effort) ? choice.effort : undefined;
    return { host: choice.host, model, ...(effort === undefined ? {} : { effort }) };
}

/**
 * The choice as the app's list of models arrives, or changes, after the form: a model the list has stays, and so does a name the player wrote by hand
 * (`written`); any other gives way to the one the list chooses. The effort stays only while the model takes it.
 */
export function settledChoice(host: ChatHost, choice: ChatChoice, written: boolean): ChatChoice
{
    const stays = host.models.length === 0 || written || modelOf(host, choice.model) !== undefined;
    return withModel(host, choice, stays ? choice.model : listedModel(host, choice.model));
}

/** The choice a chat opens with before the player changes it: the campaign's last, when its app is on this computer, else the first app found; none with no app. */
export function firstChoice(shown: Pick<MasterShown, "hosts" | "last">): ChatChoice | undefined
{
    const { found } = hostsFound(shown);
    const host = found.find((one) => one.id === shown.last?.host) ?? found[0];
    return host === undefined ? undefined : choiceOf(shown, host.id);
}

/**
 * The choice as an app is picked: the model the campaign last played with in it, when the app still lists it, else the one it proposes, else its first; and
 * the effort it last played with, while that model takes it.
 */
export function choiceOf(shown: Pick<MasterShown, "hosts" | "last">, id: string): ChatChoice
{
    const host = shown.hosts.find((one) => one.id === id);
    const last = shown.last?.host === id ? shown.last : undefined;

    if (host === undefined) {
        return { host: id, model: last?.model ?? "" };
    }

    return withModel(host, { host: id, model: "", ...(last?.effort === undefined ? {} : { effort: last.effort }) }, listedModel(host, last?.model));
}

/** Whether a chat in this app takes up the campaign's last one. */
export function resumes(shown: MasterShown, host: string): boolean
{
    return shown.last?.resumable === true && shown.last.host === host;
}

/** What the master is doing in their turn, as the player sees it: asking them something, which they answer on the page; rolling the dice; or answering. */
export type TurnDoing = "asks" | "rolls" | "answers";

/**
 * What the master is doing in their turn: asking, while a question of theirs waits (`waiting`) or the command they use now is `ask`; rolling, with `roll`;
 * with any other command, and none, answering. A command is told by its own name, whatever a host puts before it. Nothing out of a turn.
 */
export function turnDoing(chat: MasterShown["chat"], waiting = false): TurnDoing | undefined
{
    if (chat?.state !== "turn") {
        return undefined;
    }

    const command = chat.tool?.toLowerCase().split(/__|[.:/\s]/).at(-1);
    return waiting || command === "ask" ? "asks" : command === "roll" ? "rolls" : "answers";
}

/** What the master does in their turn, in the player's words, never a command's name; nothing out of a turn. */
export function turnWords(chat: MasterShown["chat"], waiting = false): string | undefined
{
    const doing = turnDoing(chat, waiting);
    return doing === undefined ? undefined : doing === "asks" ? t("The master is waiting for your answer…") : doing === "rolls" ? t("The master is rolling the dice…") : t("The master is answering…");
}

// How far a message's own length counts in the mark of what was heard: under a million characters, as the table keeps far fewer.
const mostLength = 1_000_000;

/**
 * How far what the master or the table said has come, as one number that only grows: the last message that is not the player's own, by its number, and
 * within it by how long it is, as the master's message grows while they answer; 0 with none.
 */
export function lastHeard(shown: MasterShown | undefined): number
{
    const last = shown?.messages.findLast((message) => message.from !== "player");
    return last === undefined ? 0 : last.id * mostLength + Math.min(last.text.length, mostLength - 1);
}

/**
 * Whether the master said something the player has not seen: more than they had said when the player last saw the chat. The messages there when the
 * page is opened count as seen, and so does everything when their numbers start again, as with a table started anew.
 */
export function unseenWords(seen: number | undefined, heard: number, inChat: boolean): { seen: number; unseen: boolean; }
{
    return seen === undefined || inChat || heard < seen ? { seen: heard, unseen: false } : { seen, unseen: heard > seen };
}

/** The master's question that waits in the chat: one at a time, the last asked. */
export function waitingQuestion(messages: ChatMessage[]): ChatAsked | undefined
{
    const last = messages.findLast((message) => message.from === "asked");
    return last?.from === "asked" && last.state === "waiting" ? last : undefined;
}

/** Where the page shows the question that waits: over the page as a bar or a card, in the chat with its buttons, or as a notice that leads to the chat. */
export type QuestionPlace = "page" | "chat" | "notice";

/**
 * Where the question that waits is answered, in one place alone. On the page, as ever, with no chat of the table's that keeps it (`kept`), as when a chat
 * opened by hand asks, and when the question has a place of its own (`own`): the dice of a rest, a package's card, a square of the map. Else in the chat
 * when it is in sight; when it is in its tab and another section shows, a notice leads there; and on the page where nothing leads to the chat.
 */
export function questionPlace(question: { own: boolean; kept: boolean; }, chat: "shown" | "tab" | "away"): QuestionPlace
{
    if (question.own || !question.kept || chat === "away") {
        return "page";
    }

    return chat === "shown" ? "chat" : "notice";
}

/**
 * The answer a question of the chat shows once it has one: none when the player's own words are the answer and stand right after it, as their message says
 * them already.
 */
export function answerShown(messages: ChatMessage[], index: number): string | undefined
{
    const asked = messages[index];
    const next = messages[index + 1];

    if (asked?.from !== "asked" || asked.state !== "answered" || asked.answer === undefined) {
        return undefined;
    }

    return next?.from === "player" && next.text.trim() === asked.answer.trim() ? undefined : asked.answer;
}

/** Whose words a message is, for whoever cannot see where it stands. */
export function speaker(from: ChatSaid["from"]): string
{
    return from === "player" ? t("You") : from === "master" ? t("The master") : t("The table");
}

/**
 * The app, model and effort of a chat in one line, as its foot says them: the model by the name its app lists it with; with none in the list, by the
 * app's own name for the one it runs (`runs`), once it said it; else as it was chosen.
 */
export function choiceLine(shown: MasterShown, choice: ChatChoice & { runs?: string; }): string
{
    const host = shown.hosts.find((one) => one.id === choice.host);
    const model = (host === undefined ? undefined : modelOf(host, choice.model)?.name) ?? choice.runs ?? choice.model;
    return [host?.name ?? choice.host, model, ...(choice.effort === undefined ? [] : [choice.effort])].join(" · ");
}

/**
 * What a screen reader hears as the chat changes, once: that the master answers, then that they answered, or the table's word when the turn failed, or that
 * the chat ended; nothing while the master's words only grow.
 */
export function chatNews(before: MasterShown | undefined, now: MasterShown): string | undefined
{
    const was = before?.chat?.state;
    const state = now.chat?.state;

    if (state === "ended" && was !== "ended") {
        return endedWords(now.chat?.why);
    }

    if (state === "turn" && was !== "turn") {
        return t("The master is answering…");
    }

    if (was === "turn" && state === "idle") {
        const seen = Math.max(0, ...(before?.messages ?? []).map((message) => message.id));
        const told = now.messages.findLast((message) => message.from === "table" && message.id > seen);
        return told?.text ?? t("The master answered.");
    }

    return undefined;
}

/** That the chat ended, with why when the table says it. */
export function endedWords(why: string | undefined): string
{
    return why === undefined || why.trim() === "" ? t("The chat ended.") : t("The chat ended: {why}", { why });
}

/**
 * How tall the open chat is, in pixels: from where it starts in the page to the window's foot, or to the bar of the sections where one stands there, less
 * the room under it. Under the setup's questions it starts wherever they end: the window's height, less its own title and what the page keeps clear at
 * its foot on a phone, where a field that takes the focus is scrolled over the dice's button, so that the chat stands whole over it and stays put. Never
 * less than the least, however little the window leaves.
 */
export function chatRoom(place: ChatPlace, measures: { foot: number; top: number; title: number; clear: number; }): number
{
    const top = place === "under" ? measures.title + footRoom + measures.clear : measures.top;
    return Math.max(leastRoom, Math.floor(measures.foot - top - footRoom));
}

/** Whether a list scrolled so shows its end, within a line or so: then it follows what comes; farther up the player is reading, and it stays where it is. */
export function atEnd(list: { scrollTop: number; clientHeight: number; scrollHeight: number; }, slack = endSlack): boolean
{
    return list.scrollHeight - list.scrollTop - list.clientHeight <= slack;
}

/** Whether a key pressed in the player's words sends them: Enter alone; with Shift it starts a new line, and an input method composing a word keeps it. */
export function sendsWords(event: { key: string; shiftKey: boolean; isComposing: boolean; }): boolean
{
    return event.key === "Enter" && !event.shiftKey && !event.isComposing;
}

/**
 * The player's words as they go: trimmed, none when they are empty or the master cannot take them now. In the master's turn they go only while they answer
 * the question that waits (`answers`).
 */
export function wordsToSend(text: string, state: "idle" | "turn" | "ended" | undefined, answers = false): string | undefined
{
    const words = text.trim();
    return words === "" || !(state === "idle" || (state === "turn" && answers)) ? undefined : words;
}
