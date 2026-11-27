// The table's chat with the master as the page reads it (D-582): what its place shows, the choice a chat opens with, what is told as it changes, and when its
// list follows what comes. No drawing here: the page's parts draw what these say.
import type { ChatAsked, ChatChoice, ChatHost, ChatMessage, ChatModel, ChatSaid, MasterShown, ShownRoll } from "../data.ts";
import { rollText } from "../parts/labels.ts";
import { failureText, tableLineText } from "../parts/refusals.ts";
import { t } from "../text.ts";

/** What the chat's place shows: where a chat is opened, a chat opened by hand in its place, the open chat, or one whose program ended. */
export type ChatView = "start" | "elsewhere" | "open" | "ended";

/**
 * Where the chat stands: its own section, from the page's top; beside the setup's questions, in sight as they scroll; under them, far down the page; or in
 * its panel beside the page, which gives it its room.
 */
export type ChatPlace = "section" | "beside" | "under" | "dock";

// The least room the open chat takes, however little the window leaves it, and while the player writes in it over a phone's keyboard; the room it leaves
// under itself.
const leastRoom = 320;
const leastTyping = 120;
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

/**
 * How an app stands for the player (T-290): ready to play; to sign in to, or waiting for the browser where the player signs in; to install, or being
 * installed; or one the page cannot drive yet. An account not known counts as signed in: if it is not, opening the chat says so.
 */
export type HostState = "ready" | "signIn" | "signingIn" | "install" | "installing" | "later";

export function hostState(host: ChatHost): HostState
{
    if (!host.ready) {
        return "later";
    }

    if (!host.found) {
        return host.installing === true ? "installing" : "install";
    }

    if (host.account === "out" && host.signIn !== undefined) {
        return host.signingIn === true ? "signingIn" : "signIn";
    }

    return "ready";
}

/** Whether the player can play with an app now. */
export function hostReady(host: ChatHost): boolean
{
    return hostState(host) === "ready";
}

/** An app's state in two words after its name, for the eye and a screen reader alike; none for one that is ready. */
export function hostStateWords(state: HostState): string | undefined
{
    const words: Record<HostState, string | undefined> = {
        ready: undefined,
        signIn: t("to set up"),
        signingIn: t("signing in…"),
        install: t("to install"),
        installing: t("installing…"),
        later: t("not yet"),
    };

    return words[state];
}

/**
 * What the page says of an app it knows, by its id, in its own words and never the app's: who makes it, what it needs, written to stay true, the page of
 * its plans and prices, and the terms its maker sets.
 */
export interface HostFacts
{
    maker: string;
    needs: string;
    plans: string;
    terms?: string;
    /** An app still on trial at the table: why, and what to play with instead; the page marks it wherever it is chosen. */
    trial?: string;
}

/** The facts of an app, by its id; none for an app the page does not know, which has no line. */
export function hostFacts(id: string): HostFacts | undefined
{
    const facts: Record<string, () => HostFacts> = {
        claudeCode: () => ({
            maker: "Anthropic",
            needs: t("Needs a paid Claude plan (Pro or higher)."),
            plans: "https://claude.com/pricing",
            terms: "https://code.claude.com/docs/en/legal-and-compliance",
        }),
        codex: () => ({
            maker: "OpenAI",
            needs: t("With a ChatGPT account, free or paid; limits depend on the plan."),
            plans: "https://learn.chatgpt.com/docs/pricing",
            terms: "https://openai.com/policies/",
        }),
        antigravity: () => ({
            maker: "Google",
            needs: t("With a Google account; free use has weekly limits."),
            plans: "https://antigravity.google/docs/plans.md",
            trial: t("On trial: it can step out of the game and ask questions its own way. To play, Claude Code, Codex or OpenCode are better."),
        }),
        openCode: () => ({
            maker: t("the OpenCode team"),
            needs: t("Some free models for a limited time, or your own provider's."),
            plans: "https://opencode.ai/docs/zen/",
            terms: "https://github.com/anomalyco/opencode",
        }),
    };

    return Object.hasOwn(facts, id) ? facts[id]() : undefined;
}

/** What opens where the engine cannot install an app, said before the click: its maker's site, where the page knows the maker. */
export function installSiteWords(host: Pick<ChatHost, "id" | "name">): string
{
    const maker = hostFacts(host.id)?.maker;
    return maker === undefined
        ? t("{name}'s site opens: install it from there, then come back here.", { name: host.name })
        : t("{maker}'s site opens, in English: install {name} from there, then come back here.", { maker, name: host.name });
}

/** Whether any app is ready to play: until one is, the launcher puts the apps first. */
export function anyHostReady(hosts: ChatHost[]): boolean
{
    return hosts.some(hostReady);
}

/** A model of an app's list, by its id; none for a name the list does not have, or while the app has not answered. */
export function modelOf(host: ChatHost, id: string): ChatModel | undefined
{
    return host.models.find((model) => model.id === id);
}

/**
 * The model chosen before the player chooses: the one wanted, as the campaign's last, when the app lists it; else the one the app advises; else the one it
 * proposes; else its first. Never one paid apart for each answer while the list has another. While the app has not answered there is no list: the one
 * wanted, else the one it proposes.
 */
export function listedModel(host: ChatHost, wanted: string | undefined): string
{
    if (host.models.length === 0) {
        return wanted ?? host.model;
    }

    if (wanted !== undefined && modelOf(host, wanted) !== undefined) {
        return wanted;
    }

    const free = host.models.filter((model) => model.metered !== true);
    const pool = free.length > 0 ? free : host.models;
    return (pool.find((model) => model.advised === true) ?? pool.find((model) => model.id === host.model) ?? pool[0]).id;
}

/** How many models a list shows whole: with more it scrolls, and offers a search. */
export const modelSearchAt = 8;

/** A part of the list of models: those of one provider, or the rest. `metered`, every model of the provider is paid apart. */
export interface ModelSection
{
    title?: string;
    metered: boolean;
    models: ChatModel[];
}

/**
 * The list of models in its parts, as the player looks for one: those matching what they wrote, by name, id or provider; each provider's under its title,
 * in the order the app lists them, then the rest, titled only after a provider's. Every model the app lists is there, and none is marked as advised.
 */
export function modelSections(models: ChatModel[], query = ""): ModelSection[]
{
    const wanted = query.trim().toLocaleLowerCase();
    const matching = wanted === "" ? models : models.filter((model) => [model.name, model.id, model.group ?? ""].some((word) => word.toLocaleLowerCase().includes(wanted)));
    const groups = [...new Set(matching.flatMap((model) => (model.group === undefined ? [] : [model.group])))];
    const others = matching.filter((model) => model.group === undefined);
    // Said once on a provider's title, whatever the search leaves of it: all it offers is paid apart.
    const paid = (group: string): boolean => models.filter((model) => model.group === group).every((model) => model.metered === true);
    const parts: ModelSection[] = [
        ...groups.map((group) => ({ title: group, metered: paid(group), models: matching.filter((model) => model.group === group) })),
        { ...(groups.length > 0 ? { title: t("Other models") } : {}), metered: false, models: others },
    ];
    return parts.filter((part) => part.models.length > 0);
}

// The level of thinking proposed where the player chose none a model takes.
const usualEffort = "medium";

/**
 * The level of thinking a model is played with before the player chooses: the one wanted, as the last they chose, where the model takes it; else medium
 * where it lists it; else the middle one of its list, the lower of two. None for a model that lists no level: none is shown, and none is sent.
 */
export function proposedEffort(efforts: string[], wanted: string | undefined): string | undefined
{
    if (wanted !== undefined && efforts.includes(wanted)) {
        return wanted;
    }

    return efforts.includes(usualEffort) ? usualEffort : efforts[Math.floor((efforts.length - 1) / 2)];
}

/**
 * The campaign's last chat, to go back to as it was, with its app, model and effort: where it can be taken up, its app is ready, and what is chosen now
 * is not the same, as then the button that takes the chat up goes back to it.
 */
export function chatBefore(shown: Pick<MasterShown, "hosts" | "last">, choice: ChatChoice | undefined): ChatChoice | undefined
{
    const last = shown.last;
    const host = shown.hosts.find((one) => one.id === last?.host);

    if (last === undefined || !last.resumable || host === undefined || !hostReady(host)) {
        return undefined;
    }

    const same = choice !== undefined && choice.host === last.host && choice.model === last.model && choice.effort === last.effort;
    return same ? undefined : { host: last.host, model: last.model, ...(last.effort === undefined ? {} : { effort: last.effort }) };
}

/** The efforts a model takes: its own, none for one that takes none; the app's for a model its list does not have, as a name written by hand. */
export function effortsOf(host: ChatHost, model: string): string[]
{
    return modelOf(host, model)?.efforts ?? host.efforts;
}

/** A choice with another model of the same app: the level of thinking stays while that model takes it, else the one proposed for it; never none where it lists some. */
export function withModel(host: ChatHost, choice: ChatChoice, model: string): ChatChoice
{
    const effort = proposedEffort(effortsOf(host, model), choice.effort);
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

/**
 * The choice a chat opens with before the player changes it: the campaign's last app, when it is ready; else the first ready; else the first to sign in to.
 * None while every app is still to install: the page lists them to install.
 */
export function firstChoice(shown: Pick<MasterShown, "hosts" | "last">): ChatChoice | undefined
{
    const ready = shown.hosts.filter(hostReady);
    const host = ready.find((one) => one.id === shown.last?.host) ?? ready[0] ?? shown.hosts.find((one) => ["signIn", "signingIn"].includes(hostState(one)));
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

/**
 * What the open chat offers the player in place of writing: to pick up a story cut as the game was closed, to take up one the master remembers, or to
 * begin a new one.
 */
export type ChatOffer = "pick-up" | "take-up" | "begin";

/**
 * What the chat offers now: only while it is open and still, never in a turn nor once it ended. To pick up, where the chat taken up was cut short; to
 * take up, where the master remembers a story and the player has said nothing yet, whatever of it the campaign kept; to begin, where nothing was said
 * at all. With words there and nothing to take up, nothing.
 */
export function chatOffer(shown: Pick<MasterShown, "chat" | "messages">): ChatOffer | undefined
{
    const chat = shown.chat;

    if (chat?.state !== "idle") {
        return undefined;
    }

    if (chat.cutShort === true) {
        return "pick-up";
    }

    return chat.takenUp === true ? "take-up" : shown.messages.length === 0 ? "begin" : undefined;
}

/**
 * A roll the player may see, in one line of the chat: for whom and what it is, as "Ettore · Athletics"; its result, the total unless its faces say
 * something else, as an extension's words or a toss's coins (`toss`, in words); and the whole of it, for a tooltip and a screen reader.
 */
export function rollLine(roll: Pick<ShownRoll, "check" | "total" | "says" | "text">, name: string, toss?: string): { what: string; result: string; detail: string; }
{
    const what = [name, roll.check ?? ""].filter((part) => part !== "").join(" · ");
    return { what, result: toss ?? roll.says ?? String(roll.total), detail: toss ?? rollText(roll.text) };
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
 * A word of the table's as the page says it, by its code: a line about the master's model, a turn that ended without a word or that failed, with why; one
 * with no code, or whose code the page does not know, as the table wrote it. `app`, the name of the chat's app, which the page's words name.
 */
export function tableWords(message: ChatSaid, app: string | undefined): string
{
    const model = message.model;

    if (message.code === "model" && model !== undefined) {
        if (message.dropped === true) {
            return message.effort === undefined
                ? t("From now on the master plays with {model}, which does not take the level of thinking chosen: the app chooses its own.", { model })
                : t("From now on the master plays with {model}, which did not take the level of thinking chosen: it stays {effort}.", { model, effort: message.effort });
        }

        return message.effort === undefined
            ? t("From now on the master plays with {model}.", { model })
            : t("From now on the master plays with {model}, thinking {effort}.", { model, effort: message.effort });
    }

    if (message.code === "model-kept" && model !== undefined && message.asked !== undefined && app !== undefined) {
        return t("{name} did not take {asked}: the master goes on with {model}.", { name: app, asked: message.asked, model });
    }

    return tableLineText(message.code, message.values, app) ?? message.text;
}

/** Whether a word of the table's only says what became of the master's model: no trouble, drawn quietly. */
export function aboutModel(message: ChatSaid): boolean
{
    return message.from === "table" && (message.code === "model" || message.code === "model-kept");
}

/** The name of the app the chat plays in, open or ended; none before a chat. */
export function chatApp(shown: Pick<MasterShown, "hosts" | "chat">): string | undefined
{
    const host = shown.chat?.host;
    return host === undefined ? undefined : (shown.hosts.find((one) => one.id === host)?.name ?? host);
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
        return endedWords(now);
    }

    if (state === "turn" && was !== "turn") {
        return t("The master is answering…");
    }

    if (was === "turn" && state === "idle") {
        const seen = Math.max(0, ...(before?.messages ?? []).map((message) => message.id));
        const told = now.messages.findLast((message) => message.from === "table" && message.id > seen);
        return told?.from === "table" ? tableWords(told, chatApp(now)) : t("The master answered.");
    }

    return undefined;
}

/**
 * That the chat ended, with why when the table says it: in the page's words by its code, else as the table wrote it; where the app's sign-in ran out, what
 * to do in the page's own words.
 */
export function endedWords(shown: Pick<MasterShown, "hosts" | "chat">): string
{
    const expired = expiredHost(shown);

    if (expired !== undefined) {
        return expiredWords(expired);
    }

    const chat = shown.chat;
    const why = failureText(chat?.code, chat?.values, chatApp(shown)) ?? chat?.why;
    return why === undefined || why.trim() === "" ? t("The chat ended.") : t("The chat ended: {why}", { why });
}

/**
 * The file of the table's log to name with a chat that ended, for who reports it: where the table keeps one and the chat ended by something that went wrong,
 * never as the app's sign-in ran out, which the player sets right from the page.
 */
export function endedLog(shown: Pick<MasterShown, "chat" | "log">): string | undefined
{
    return shown.chat?.state === "ended" && shown.chat.code !== "signin" ? shown.log : undefined;
}

/** That an app's sign-in ran out, and what to do. */
export function expiredWords(name: string): string
{
    return t("Your access to {name} has expired: sign in again to continue.", { name });
}

/** The name of the app whose sign-in ended the chat; none for a chat that ended otherwise. */
export function expiredHost(shown: Pick<MasterShown, "hosts" | "chat">): string | undefined
{
    const chat = shown.chat;
    return chat?.code === "signin" ? shown.hosts.find((one) => one.id === chat.host)?.name ?? chat.host : undefined;
}

/**
 * Whether the master is in the first turn of a chat with nothing of theirs said yet: the app is still starting and setting the scene, which can take a
 * couple of minutes, and the page says that it is normal.
 */
export function firstAnswerDue(shown: Pick<MasterShown, "chat" | "messages">): boolean
{
    return shown.chat?.state === "turn" && !shown.messages.some((message) => message.from === "master");
}

/**
 * How tall the open chat is, in pixels: from where it starts in the page to the window's foot, or to the bar of the sections where one stands there, less
 * the room under it. Under the setup's questions it starts wherever they end: the window's height, less its own title and what the page keeps clear at
 * its foot on a phone, where a field that takes the focus is scrolled over the dice's button, so that the chat stands whole over it and stays put. While the
 * player writes in it on a phone (`typing`), the whole window over the keyboard from under the page's top (`top` then), the page scrolled to the chat's top.
 * In its section on a phone it is the window's own (`flush`): down to the bar of the sections, or to the keyboard, with no room under it.
 * Never less than the least, however little the window leaves.
 */
export function chatRoom(place: ChatPlace, measures: { foot: number; top: number; title: number; clear: number; typing?: boolean; flush?: boolean; }): number
{
    const under = measures.flush === true ? 0 : footRoom;

    if (measures.typing === true) {
        return Math.max(leastTyping, Math.floor(measures.foot - measures.top - under));
    }

    const top = place === "under" ? measures.title + footRoom + measures.clear : measures.top;
    return Math.max(leastRoom, Math.floor(measures.foot - top - under));
}

/** Whether a list scrolled so shows its end, within a line or so: then it follows what comes; farther up the player is reading, and it stays where it is. */
export function atEnd(list: { scrollTop: number; clientHeight: number; scrollHeight: number; }, slack = endSlack): boolean
{
    return list.scrollHeight - list.scrollTop - list.clientHeight <= slack;
}

/**
 * Whether a key pressed in the player's words sends them: Enter alone; with Shift it starts a new line, and an input method composing a word keeps it.
 * On a phone's keyboard (`touch`) Enter starts a new line too, as it has no Shift to hold: the button alone sends.
 */
export function sendsWords(event: { key: string; shiftKey: boolean; isComposing: boolean; }, touch = false): boolean
{
    return !touch && event.key === "Enter" && !event.shiftKey && !event.isComposing;
}

// The signs of a story's dialogue that a keyboard lacks, by the two keys typed for each.
const storySigns: Record<string, string> = { "<<": "«", ">>": "»", "--": "—" };

/**
 * A sign that took the place of the two keys typed for it: where it starts in the player's words, the sign, the keys, which Backspace gives back, and the
 * words with the sign in them.
 */
export interface TypedSign
{
    start: number;
    sign: string;
    keys: string;
    text: string;
}

/** Whether what entered the player's words is one key typed: never what is pasted, dropped or put by a keyboard's suggestion, nor a word an input method composes. */
export function typesKey(event: { inputType: string; data: string | null; isComposing: boolean; }): boolean
{
    return event.inputType === "insertText" && event.data?.length === 1 && !event.isComposing;
}

/**
 * The sign the player's words take as a key is typed in them, the caret right after that key: `<<` becomes «, `>>` » and `--` —, at the second key of
 * the two, wherever in the words. None where the two characters before the caret are no such pair.
 */
export function typedSign(text: string, caret: number): TypedSign | undefined
{
    const keys = text.slice(Math.max(0, caret - 2), caret);

    if (!Object.hasOwn(storySigns, keys)) {
        return undefined;
    }

    const start = caret - keys.length;
    const sign = storySigns[keys];
    return { start, sign, keys, text: text.slice(0, start) + sign + text.slice(caret) };
}

/** Whether Backspace gives back the two keys of a sign, as a writing program does: only right after it took their place, the words and the caret as it left them. */
export function takesSignBack(typed: TypedSign | undefined, text: string, caret: number): typed is TypedSign
{
    return typed !== undefined && text === typed.text && caret === typed.start + typed.sign.length;
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
