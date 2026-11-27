// The table's chat with the master as the page reads it (D-582): what its place shows, the choice a chat opens with, what is told as it changes, when its
// list follows what comes, which key sends the player's words, its address, and what the page asks the server of it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { readAddress, sectionAddress, sectionLabel, sectionTabs } from "../src/dashboard/address.ts";
import { changeMaster, readMaster } from "../src/dashboard/api.ts";
import {
    aboutModel,
    answerShown,
    anyHostReady,
    atEnd,
    chatApp,
    chatBefore,
    chatNews,
    chatOffer,
    chatRoom,
    chatView,
    choiceLine,
    choiceOf,
    effortsOf,
    endedWords,
    expiredHost,
    firstAnswerDue,
    firstChoice,
    hostFacts,
    hostsFound,
    hostState,
    hostStateWords,
    installSiteWords,
    lastHeard,
    listedModel,
    modelSearchAt,
    modelSections,
    proposedEffort,
    questionPlace,
    resumes,
    sendsWords,
    settledChoice,
    speaker,
    tableWords,
    takesSignBack,
    turnDoing,
    turnWords,
    typedSign,
    typesKey,
    unseenWords,
    waitingQuestion,
    withModel,
    wordsToSend,
} from "../src/dashboard/chat/chat.ts";
import type { ChatMessage, ChatSaid, MasterShown } from "../src/dashboard/data.ts";
import { nextOn } from "../src/dashboard/parts/choosing.ts";
import { setLanguage } from "../src/dashboard/text.ts";
import { pageFolder } from "./i18n/phrases.ts";

const italian = (): Promise<Record<string, string>> => Promise.resolve(JSON.parse(readFileSync(join(pageFolder, "i18n", "it.json"), "utf8")) as Record<string, string>);

const claude = { id: "claudeCode", name: "Claude Code", ready: true, found: true, model: "sonnet", efforts: ["low", "medium", "high", "xhigh", "max"], models: [] };
const codex = { id: "codex", name: "Codex", ready: true, found: true, model: "gpt", efforts: ["low", "high"], models: [] };
// Claude Code once it has answered with its models: one of them takes no effort, and the one it proposes is among them.
const listing = {
    ...claude,
    models: [
        { id: "opus", name: "Opus 5.5", about: "For complex work", efforts: ["low", "high", "max"] },
        { id: "sonnet", name: "Sonnet 5.5", efforts: ["low", "high"] },
        { id: "haiku", name: "Haiku 4.5", about: "Fastest", efforts: [] },
    ],
};

/** A chat as the table shows it, closed and empty unless told. */
function shown(changes: Partial<MasterShown> = {}): MasterShown
{
    return { hosts: [claude], messages: [], elsewhere: false, ...changes };
}

describe("the chat with the master on the page (D-582)", () => {
    afterAll(async () => {
        await setLanguage("en");
    });

    it("shows where a chat is opened, the open chat, one that ended with the way to open another, or the line of a chat opened by hand, never buttons with it", () => {
        expect(chatView(shown())).toBe("start");
        expect(chatView(shown({ chat: { host: "claudeCode", model: "sonnet", state: "idle" } }))).toBe("open");
        expect(chatView(shown({ chat: { host: "claudeCode", model: "sonnet", state: "turn", tool: "roll" } }))).toBe("open");
        expect(chatView(shown({ chat: { host: "claudeCode", model: "sonnet", state: "ended", why: "It closed." } }))).toBe("ended");
        expect(chatView(shown({ elsewhere: true }))).toBe("elsewhere");
        expect(chatView(shown({ elsewhere: true, chat: { host: "claudeCode", model: "sonnet", state: "ended" } }))).toBe("elsewhere");
        // The table's own chat still open stays in its place, whatever sits elsewhere.
        expect(chatView(shown({ elsewhere: true, chat: { host: "claudeCode", model: "sonnet", state: "idle" } }))).toBe("open");
    });

    it("starts from the campaign's last choice when its app is on this computer, else from the first app found with the model it proposes; none with no app", () => {
        expect(firstChoice(shown())).toEqual({ host: "claudeCode", model: "sonnet", effort: "medium" });
        expect(firstChoice(shown({ last: { host: "claudeCode", model: "claude-sonnet-5", effort: "high", resumable: true } }))).toEqual({ host: "claudeCode", model: "claude-sonnet-5", effort: "high" });
        expect(firstChoice(shown({ hosts: [claude, codex], last: { host: "codex", model: "gpt-x", resumable: false } }))).toEqual({ host: "codex", model: "gpt-x", effort: "low" });
        // The last app gone from this computer: the first one found, with its own model, never the other's.
        const gone = shown({ hosts: [{ ...claude, found: false }, codex], last: { host: "claudeCode", model: "claude-sonnet-5", effort: "max", resumable: true } });
        expect(firstChoice(gone)).toEqual({ host: "codex", model: "gpt", effort: "low" });
        expect(hostsFound(gone)).toEqual({ found: [codex], missing: [{ ...claude, found: false }], later: [] });
        expect(firstChoice(shown({ hosts: [{ ...claude, found: false }] }))).toBeUndefined();
        expect(firstChoice(shown({ hosts: [] }))).toBeUndefined();
    });

    it("takes an app's last model and effort when it is picked, the effort proposed where the app does not know the last, and takes up the last chat only in its own app", () => {
        const two = shown({ hosts: [claude, codex], last: { host: "claudeCode", model: "opus", effort: "max", resumable: true } });
        expect(choiceOf(two, "claudeCode")).toEqual({ host: "claudeCode", model: "opus", effort: "max" });
        expect(choiceOf(two, "codex")).toEqual({ host: "codex", model: "gpt", effort: "low" });
        expect(choiceOf(shown({ hosts: [codex], last: { host: "codex", model: "gpt", effort: "max", resumable: true } }), "codex")).toEqual({ host: "codex", model: "gpt", effort: "low" });
        expect([resumes(two, "claudeCode"), resumes(two, "codex"), resumes(shown(), "claudeCode")]).toEqual([true, false, false]);
        expect(resumes(shown({ last: { host: "claudeCode", model: "opus", resumable: false } }), "claudeCode")).toBe(false);
    });

    it("opens only in an app the page can drive that is on this computer: one that is not there is missing, one the page cannot drive yet comes later, wherever it is", () => {
        const later = { ...codex, ready: false };
        const absent = { ...codex, id: "openCode", name: "OpenCode", ready: false, found: false };
        const all = shown({ hosts: [claude, later, { ...listing, id: "other", found: false }, absent] });
        expect(hostsFound(all)).toEqual({ found: [claude], missing: [{ ...listing, id: "other", found: false }], later: [later, absent] });
        // The campaign's last app, which the page can no longer drive: the first it can.
        expect(firstChoice({ hosts: [later, claude], last: { host: "codex", model: "gpt", resumable: true } })).toEqual({ host: "claudeCode", model: "sonnet", effort: "medium" });
        expect(firstChoice({ hosts: [later, absent] })).toBeUndefined();
    });

    it("chooses a model of the app's list: the last used when the list has it, else the one the app proposes, else its first; with no list yet, the last or the proposed", () => {
        expect([listedModel(listing, "opus"), listedModel(listing, "claude-sonnet-5"), listedModel(listing, undefined)]).toEqual(["opus", "sonnet", "sonnet"]);
        expect(listedModel({ ...listing, model: "gone" }, "claude-sonnet-5")).toBe("opus");
        expect([listedModel(claude, "claude-sonnet-5"), listedModel(claude, undefined)]).toEqual(["claude-sonnet-5", "sonnet"]);
        const last = shown({ hosts: [listing], last: { host: "claudeCode", model: "opus", effort: "max", resumable: true } });
        expect(firstChoice(last)).toEqual({ host: "claudeCode", model: "opus", effort: "max" });
        // The last model gone from the list: the proposed one, with the last effort if that one takes it, else the one proposed for it.
        expect(choiceOf({ hosts: [listing], last: { host: "claudeCode", model: "claude-sonnet-5", effort: "max", resumable: true } }, "claudeCode")).toEqual({ host: "claudeCode", model: "sonnet", effort: "low" });
        expect(choiceOf({ hosts: [listing], last: { host: "claudeCode", model: "claude-sonnet-5", effort: "high", resumable: true } }, "claudeCode")).toEqual({ host: "claudeCode", model: "sonnet", effort: "high" });
    });

    it("offers the efforts of the model chosen, none for one that takes none, the app's for a model its list lacks; an effort the model does not take gives way to the one proposed", () => {
        expect([effortsOf(listing, "opus"), effortsOf(listing, "haiku"), effortsOf(listing, "my-model"), effortsOf(claude, "sonnet")]).toEqual([["low", "high", "max"], [], claude.efforts, claude.efforts]);
        const chosen = { host: "claudeCode", model: "opus", effort: "max" };
        expect(withModel(listing, chosen, "sonnet")).toEqual({ host: "claudeCode", model: "sonnet", effort: "low" });
        expect(withModel(listing, { ...chosen, effort: "high" }, "sonnet")).toEqual({ host: "claudeCode", model: "sonnet", effort: "high" });
        expect(withModel(listing, chosen, "haiku")).toEqual({ host: "claudeCode", model: "haiku" });
        // A model the list lacks: the app's own efforts.
        expect(withModel(listing, chosen, "")).toEqual({ host: "claudeCode", model: "", effort: "max" });
    });

    it("always proposes a level of the model's own (T-307): the one wanted where the model takes it, else medium, else the middle of its list, the lower of two; none where it lists none", () => {
        expect([proposedEffort(claude.efforts, "max"), proposedEffort(claude.efforts, "ultra"), proposedEffort(claude.efforts, undefined)]).toEqual(["max", "medium", "medium"]);
        expect([proposedEffort(["low", "high", "max"], undefined), proposedEffort(["low", "high"], undefined), proposedEffort(["low", "high", "xhigh", "max"], "medium")]).toEqual(["high", "low", "high"]);
        expect([proposedEffort(["only"], undefined), proposedEffort([], "high"), proposedEffort([], undefined)]).toEqual(["only", undefined, undefined]);
        // An app that says a model's efforts only once it is chosen lists none: no level is shown, and none is sent.
        const acp = { ...listing, id: "openCode", efforts: [], models: [{ id: "a/b", name: "B", efforts: [] }] };
        expect(withModel(acp, { host: "openCode", model: "x", effort: "high" }, "a/b")).toEqual({ host: "openCode", model: "a/b" });
    });

    it("goes back to the last chat as it was (T-307): where it can be taken up, its app is ready, and what is chosen now is not the same", () => {
        const last = { host: "claudeCode", model: "opus", effort: "max", resumable: true };
        const two = { hosts: [listing, codex], last };
        expect(chatBefore(two, { host: "codex", model: "gpt", effort: "low" })).toEqual({ host: "claudeCode", model: "opus", effort: "max" });
        expect(chatBefore(two, { host: "claudeCode", model: "sonnet", effort: "low" })).toEqual({ host: "claudeCode", model: "opus", effort: "max" });
        expect(chatBefore(two, { host: "claudeCode", model: "opus", effort: "high" })).toEqual({ host: "claudeCode", model: "opus", effort: "max" });
        expect(chatBefore(two, undefined)).toEqual({ host: "claudeCode", model: "opus", effort: "max" });
        // The same choice: the button that takes the chat up goes back to it.
        expect(chatBefore(two, { host: "claudeCode", model: "opus", effort: "max" })).toBeUndefined();
        // Nothing to take up, no chat yet, or its app not ready any more.
        expect(chatBefore({ hosts: [listing, codex], last: { ...last, resumable: false } }, { host: "codex", model: "gpt" })).toBeUndefined();
        expect(chatBefore({ hosts: [listing, codex] }, { host: "codex", model: "gpt" })).toBeUndefined();
        expect(chatBefore({ hosts: [{ ...listing, account: "out" as const, signIn: "page" as const }, codex], last }, { host: "codex", model: "gpt" })).toBeUndefined();
        expect(chatBefore({ hosts: [codex], last }, { host: "codex", model: "gpt" })).toBeUndefined();
        // A last chat with no effort kept goes back with none.
        expect(chatBefore({ hosts: [listing, codex], last: { host: "claudeCode", model: "opus", resumable: true } }, { host: "codex", model: "gpt" })).toEqual({ host: "claudeCode", model: "opus" });
    });

    it("follows the app's list as it arrives after the form: a model it has stays, any other gives way to the list's choice, each with a level it takes", () => {
        // Before the list, the form holds the last model, or the proposed one: neither written by the player.
        expect(settledChoice(listing, { host: "claudeCode", model: "claude-sonnet-5", effort: "max" }, false)).toEqual({ host: "claudeCode", model: "sonnet", effort: "low" });
        expect(settledChoice(listing, { host: "claudeCode", model: "sonnet", effort: "high" }, false)).toEqual({ host: "claudeCode", model: "sonnet", effort: "high" });
        expect(settledChoice(listing, { host: "claudeCode", model: "opus" }, false)).toEqual({ host: "claudeCode", model: "opus", effort: "high" });
        // A name written by hand, even an empty one being written, is the player's.
        expect(settledChoice(listing, { host: "claudeCode", model: "my-model", effort: "xhigh" }, true)).toEqual({ host: "claudeCode", model: "my-model", effort: "xhigh" });
        expect(settledChoice(listing, { host: "claudeCode", model: "" }, true)).toEqual({ host: "claudeCode", model: "", effort: "medium" });
        // No list yet: nothing to follow.
        expect(settledChoice(claude, { host: "claudeCode", model: "claude-sonnet-5", effort: "max" }, false)).toEqual({ host: "claudeCode", model: "claude-sonnet-5", effort: "max" });
    });

    it("moves along a choice's values past those that cannot be chosen, round the ends, and stays where no other can", () => {
        const apps = [{}, { off: true }, { off: true }, {}];
        expect([nextOn(apps, 0, 1), nextOn(apps, 3, 1), nextOn(apps, 0, -1), nextOn(apps, 3, -1)]).toEqual([3, 0, 3, 0]);
        expect([nextOn([{}, { off: true }], 0, 1), nextOn([{ off: true }, { off: true }], 0, 1), nextOn([{}, {}, {}], 2, 1)]).toEqual([undefined, undefined, 0]);
    });

    it("says what the master does in their turn in the player's words, never a command's name, whose words a message is and what a chat plays with, in Italian too", async () => {
        await setLanguage("en");
        expect(turnWords({ host: "claudeCode", model: "sonnet", state: "turn" })).toBe("The master is answering…");
        expect(turnWords({ host: "claudeCode", model: "sonnet", state: "turn", tool: "roll" })).toBe("The master is rolling the dice…");
        expect(turnWords({ host: "claudeCode", model: "sonnet", state: "turn", tool: "ask" })).toBe("The master is waiting for your answer…");
        // Any other command is the master answering: its name is never shown.
        expect(turnWords({ host: "claudeCode", model: "sonnet", state: "turn", tool: "view" })).toBe("The master is answering…");
        // A command by its own name, whatever a host puts before it; one that only holds the name is another.
        const doing = (tool?: string): string | undefined => turnDoing({ host: "claudeCode", model: "sonnet", state: "turn", ...(tool === undefined ? {} : { tool }) });
        expect([doing(), doing("ask"), doing("mcp__rpg__ask"), doing("rpg.roll"), doing("rpg ask"), doing("Roll"), doing("task"), doing("reroll"), doing("")]).toEqual([
            "answers",
            "asks",
            "asks",
            "rolls",
            "asks",
            "rolls",
            "answers",
            "answers",
            "answers",
        ]);
        expect([turnDoing({ host: "claudeCode", model: "sonnet", state: "idle", tool: "ask" }), turnDoing({ host: "claudeCode", model: "sonnet", state: "ended" }), turnDoing(undefined)]).toEqual([undefined, undefined, undefined]);
        expect(turnWords({ host: "claudeCode", model: "sonnet", state: "idle", tool: "roll" })).toBeUndefined();
        expect(turnWords(undefined)).toBeUndefined();
        expect(choiceLine(shown(), { host: "claudeCode", model: "sonnet", effort: "high" })).toBe("Claude Code · sonnet · high");
        expect(choiceLine(shown(), { host: "other", model: "m" })).toBe("other · m");
        // A model the app lists, by the name it lists it with.
        expect(choiceLine(shown({ hosts: [listing] }), { host: "claudeCode", model: "opus", effort: "max" })).toBe("Claude Code · Opus 5.5 · max");
        // The app's own name for the model it runs, once it said it, only where its list has no name for the one chosen.
        expect(choiceLine(shown(), { host: "claudeCode", model: "sonnet", runs: "claude-sonnet-5-5", effort: "high" })).toBe("Claude Code · claude-sonnet-5-5 · high");
        expect(choiceLine(shown({ hosts: [listing] }), { host: "claudeCode", model: "sonnet", runs: "claude-sonnet-5-5" })).toBe("Claude Code · Sonnet 5.5");
        expect(choiceLine(shown(), { host: "other", model: "m", runs: "m-2" })).toBe("other · m-2");
        await setLanguage("it", italian);
        expect(turnWords({ host: "claudeCode", model: "sonnet", state: "turn" })).toBe("Il master sta rispondendo…");
        expect(turnWords({ host: "claudeCode", model: "sonnet", state: "turn", tool: "ask" })).toBe("Il master aspetta la tua risposta…");
        expect(turnWords({ host: "claudeCode", model: "sonnet", state: "turn", tool: "roll" })).toBe("Il master sta tirando i dadi…");
        expect([speaker("player"), speaker("master"), speaker("table")]).toEqual(["Tu", "Il master", "Il tavolo"]);
        const ended = (why?: string): string => endedWords(shown({ chat: { host: "claudeCode", model: "sonnet", state: "ended", ...(why === undefined ? {} : { why }) } }));
        expect([ended(), ended("  "), ended("It closed.")]).toEqual(["La chat si è chiusa.", "La chat si è chiusa.", "La chat si è chiusa: It closed."]);
        expect(sectionLabel("chat")).toBe("Gioco");
    });

    it("tells a screen reader once that the master answers, that they answered, the table's word when the turn failed, and that the chat ended; nothing while the words grow", async () => {
        await setLanguage("en");
        const idle = shown({ chat: { host: "claudeCode", model: "sonnet", state: "idle" }, messages: [{ id: 1, from: "player", text: "I open the door." }] });
        const turn = { ...idle, chat: { ...idle.chat!, state: "turn" as const } };
        const growing = { ...turn, messages: [...turn.messages, { id: 2, from: "master" as const, text: "The door" }] };
        const answered = { ...idle, messages: [...idle.messages, { id: 2, from: "master" as const, text: "The door creaks open." }] };
        const failed = { ...idle, messages: [...idle.messages, { id: 2, from: "table" as const, text: "The master's turn failed." }] };
        const ended = { ...idle, chat: { ...idle.chat!, state: "ended" as const, why: "It closed." } };
        expect(chatNews(idle, turn)).toBe("The master is answering…");
        expect(chatNews(turn, growing)).toBeUndefined();
        expect(chatNews(growing, { ...growing, chat: { ...growing.chat, tool: "roll" } })).toBeUndefined();
        expect(chatNews(growing, answered)).toBe("The master answered.");
        expect(chatNews(turn, failed)).toBe("The master's turn failed.");
        // A word of the table's from an earlier turn is not said again.
        expect(chatNews({ ...turn, messages: failed.messages }, { ...failed, messages: [...failed.messages, { id: 3, from: "master", text: "Now it works." }] })).toBe("The master answered.");
        expect(chatNews(turn, ended)).toBe("The chat ended: It closed.");
        expect(chatNews(ended, ended)).toBeUndefined();
        expect(chatNews(undefined, idle)).toBeUndefined();
        expect(chatNews(idle, shown())).toBeUndefined();
    });

    it("follows what comes only while the list shows its end, within a line or so; farther up it stays", () => {
        expect(atEnd({ scrollTop: 600, clientHeight: 400, scrollHeight: 1000 })).toBe(true);
        expect(atEnd({ scrollTop: 570, clientHeight: 400, scrollHeight: 1000 })).toBe(true);
        expect(atEnd({ scrollTop: 560, clientHeight: 400, scrollHeight: 1000 })).toBe(false);
        expect(atEnd({ scrollTop: 0, clientHeight: 400, scrollHeight: 300 })).toBe(true);
        // A fraction of a pixel short of the end, as a zoomed page scrolls, is the end.
        expect(atEnd({ scrollTop: 599.4, clientHeight: 400, scrollHeight: 1000 }, 1)).toBe(true);
    });

    it("sends the player's words with Enter alone, never with Shift nor while a word is composed, and only words, while the master can take them", () => {
        expect(sendsWords({ key: "Enter", shiftKey: false, isComposing: false })).toBe(true);
        expect(sendsWords({ key: "Enter", shiftKey: true, isComposing: false })).toBe(false);
        expect(sendsWords({ key: "Enter", shiftKey: false, isComposing: true })).toBe(false);
        expect(sendsWords({ key: "a", shiftKey: false, isComposing: false })).toBe(false);
        // On a phone's keyboard Enter starts a new line: the button alone sends.
        expect(sendsWords({ key: "Enter", shiftKey: false, isComposing: false }, true)).toBe(false);
        expect(wordsToSend("  I open the door.\n", "idle")).toBe("I open the door.");
        expect([wordsToSend(" \n ", "idle"), wordsToSend("Wait.", "turn"), wordsToSend("Wait.", "ended"), wordsToSend("Wait.", undefined)]).toEqual([undefined, undefined, undefined, undefined]);
        // In the master's turn they go only while they answer the question that waits.
        expect([wordsToSend(" I jump. ", "turn", true), wordsToSend("  ", "turn", true), wordsToSend("I jump.", "idle", true), wordsToSend("I jump.", "ended", true)]).toEqual(["I jump.", undefined, "I jump.", undefined]);
    });

    it("turns << >> and -- into the signs of a story's dialogue as they are typed, wherever in the words, and Backspace right after gives the two keys back (T-326)", () => {
        // The words as each key is typed at the caret, which starts between what is there before it and after it.
        const typing = (keys: string, before = "", after = ""): string => {
            let text = before + after;
            let caret = before.length;

            for (const key of keys) {
                const typed = typedSign(text.slice(0, caret) + key + text.slice(caret), caret + 1);
                text = typed?.text ?? text.slice(0, caret) + key + text.slice(caret);
                caret = typed === undefined ? caret + 1 : typed.start + typed.sign.length;
            }

            return text;
        };

        expect(typing("<<ciao>> -- sì")).toBe("«ciao» — sì");
        expect(typing("a < b, c > d, e - f, <>, ->, <-")).toBe("a < b, c > d, e - f, <>, ->, <-");
        // At the second key of the two: a third starts another pair.
        expect([typing("<<<"), typing("---"), typing("----"), typing("-->")]).toEqual(["«<", "—-", "——", "—>"]);
        // In the middle of the words, which stay as they are around the sign, the caret right after it.
        expect(typing("<<", "He said ", "no, never.")).toBe("He said «no, never.");
        expect(typedSign("He said <<no, never.", 10)).toEqual({ start: 8, sign: "«", keys: "<<", text: "He said «no, never." });
        // A key typed after a character that was there makes the pair too; a pair that is not right before the caret is left alone.
        expect(typing("-", "well -", " then")).toBe("well — then");
        expect([typedSign("<<ciao", 6), typedSign("<<ciao", 1), typedSign("<", 1), typedSign("", 0)]).toEqual([undefined, undefined, undefined, undefined]);

        // One key typed alone counts: what is pasted, dropped, put by a keyboard's suggestion or composed by an input method stays as it is.
        expect(typesKey({ inputType: "insertText", data: "<", isComposing: false })).toBe(true);
        expect([
            typesKey({ inputType: "insertFromPaste", data: "<", isComposing: false }),
            typesKey({ inputType: "insertFromDrop", data: "<", isComposing: false }),
            typesKey({ inputType: "insertReplacementText", data: "-", isComposing: false }),
            typesKey({ inputType: "insertCompositionText", data: "-", isComposing: true }),
            typesKey({ inputType: "insertText", data: "-", isComposing: true }),
            typesKey({ inputType: "insertText", data: "--", isComposing: false }),
            typesKey({ inputType: "insertText", data: null, isComposing: false }),
            typesKey({ inputType: "insertLineBreak", data: null, isComposing: false }),
        ]).toEqual([false, false, false, false, false, false, false, false]);

        // Backspace gives the keys back only while the words and the caret are as the sign left them.
        const typed = typedSign("go --", 5);
        expect(typed).toEqual({ start: 3, sign: "—", keys: "--", text: "go —" });
        expect(takesSignBack(typed, "go —", 4)).toBe(true);
        expect([takesSignBack(typed, "go — on", 7), takesSignBack(typed, "go —", 2), takesSignBack(typed, "no —", 4), takesSignBack(undefined, "go —", 4)]).toEqual([false, false, false, false]);
    });

    it("finds the master's question that waits, the last asked, and says the master asks while it does", () => {
        const asked = (id: number, state: "waiting" | "answered" | "left", answer?: string): ChatMessage => ({ id, from: "asked", text: "Which way?", options: ["Left", "Right"], state, ...(answer === undefined ? {} : { answer }) });
        const words = (id: number, from: "player" | "master" | "table", text: string): ChatMessage => ({ id, from, text });
        expect(waitingQuestion([])).toBeUndefined();
        expect(waitingQuestion([words(1, "master", "A door."), asked(2, "waiting")])?.id).toBe(2);
        expect(waitingQuestion([asked(1, "left"), words(2, "master", "Then."), asked(3, "waiting"), words(4, "player", "Hm.")])?.id).toBe(3);
        expect(waitingQuestion([asked(1, "answered", "Left")])).toBeUndefined();
        // One at a time: an older one still marked waiting under a newer that ended does not wait.
        expect(waitingQuestion([asked(1, "waiting"), asked(2, "left")])).toBeUndefined();
        const turn = { host: "claudeCode", model: "sonnet", state: "turn" as const };
        expect([turnDoing(turn, true), turnDoing({ ...turn, tool: "view" }, true), turnDoing({ ...turn, tool: "roll" }, false), turnDoing({ ...turn, state: "idle" }, true)]).toEqual(["asks", "asks", "rolls", undefined]);
        expect(turnWords(turn, true)).toBe("The master is waiting for your answer…");
    });

    it("answers the question that waits in one place alone: the chat when it keeps it and is in sight, a notice from another section, else the page", () => {
        const chat = { own: false, kept: true };
        expect([questionPlace(chat, "shown"), questionPlace(chat, "tab"), questionPlace(chat, "away")]).toEqual(["chat", "notice", "page"]);
        // No chat of the table's keeps it, as when a chat opened by hand asks, or the page is served by a chat: on the page, as ever.
        expect([questionPlace({ own: false, kept: false }, "shown"), questionPlace({ own: false, kept: false }, "tab"), questionPlace({ own: false, kept: false }, "away")]).toEqual(["page", "page", "page"]);
        // The dice of a rest, a package's card and a square of the map keep their own place, whatever the chat.
        expect([questionPlace({ own: true, kept: true }, "shown"), questionPlace({ own: true, kept: true }, "tab"), questionPlace({ own: true, kept: false }, "away")]).toEqual(["page", "page", "page"]);
    });

    it("shows what a question was answered with, unless the player's own words right after it say it", () => {
        const asked = (state: "waiting" | "answered" | "left", answer?: string): ChatMessage => ({ id: 1, from: "asked", text: "Which way?", options: ["Left"], state, ...(answer === undefined ? {} : { answer }) });
        const player = (text: string): ChatMessage => ({ id: 2, from: "player", text });
        expect(answerShown([asked("answered", "Left")], 0)).toBe("Left");
        expect(answerShown([asked("answered", "Left"), { id: 2, from: "master", text: "You go left." }], 0)).toBe("Left");
        expect(answerShown([asked("answered", "I climb the wall."), player("I climb the wall.")], 0)).toBeUndefined();
        expect(answerShown([asked("answered", "I climb the wall."), player("  I climb the wall.\n")], 0)).toBeUndefined();
        // A button's answer, then other words of the player's: both show.
        expect(answerShown([asked("answered", "Left"), player("And then I run.")], 0)).toBe("Left");
        expect([answerShown([asked("waiting")], 0), answerShown([asked("left")], 0), answerShown([player("Hm.")], 0), answerShown([], 3)]).toEqual([undefined, undefined, undefined, undefined]);
    });

    it("has its own address, #/chat, as a section, whose tab stands right after the party's", () => {
        expect(readAddress("#/chat")).toEqual({ section: "chat" });
        expect(sectionAddress("chat")).toBe("#/chat");
        expect(sectionTabs(true)).toEqual(["party", "chat", "scene", "journal", "world"]);
        expect(sectionTabs(false)).toEqual(["party", "scene", "journal", "world"]);
        // On a phone the table is a section too, after the Scene.
        expect(sectionTabs(true, true)).toEqual(["party", "chat", "scene", "table", "journal", "world"]);
        expect(readAddress("#/table")).toEqual({ section: "table" });
    });

    it("offers to begin in a new chat with nothing said, and nothing once there are words, in a turn or when it ended", () => {
        const chat = { host: "claudeCode", model: "sonnet", state: "idle" as const };
        const said: ChatMessage[] = [{ id: 1, from: "player", text: "I open the door." }, { id: 2, from: "master", text: "It creaks." }];
        expect(chatOffer({ chat, messages: [] })).toBe("begin");
        expect(chatOffer({ chat, messages: said })).toBeUndefined();
        expect([chatOffer({ chat: { ...chat, state: "turn" }, messages: [] }), chatOffer({ chat: { ...chat, state: "ended" }, messages: [] }), chatOffer({ messages: [] })]).toEqual([undefined, undefined, undefined]);
    });

    it("offers to take up the story the master remembers, with the flow the campaign kept or with none, and to pick up one cut as the game was closed", () => {
        const chat = { host: "claudeCode", model: "sonnet", state: "idle" as const };
        const kept: ChatMessage[] = [{ id: 1, from: "player", text: "I open the door." }, { id: 2, from: "master", text: "It creaks." }];
        expect(chatOffer({ chat: { ...chat, takenUp: true }, messages: kept })).toBe("take-up");
        // An old chat, with no flow kept: taken up all the same, never begun anew.
        expect(chatOffer({ chat: { ...chat, takenUp: true }, messages: [] })).toBe("take-up");
        expect(chatOffer({ chat: { ...chat, cutShort: true }, messages: kept })).toBe("pick-up");
        // Gone as a turn begins.
        expect([chatOffer({ chat: { ...chat, takenUp: true, state: "turn" }, messages: kept }), chatOffer({ chat: { ...chat, cutShort: true, state: "turn" }, messages: kept })]).toEqual([undefined, undefined]);
    });

    it("is as tall as the window leaves it from where it starts; under the setup's questions, as the window less its title and what the page keeps clear at its foot", () => {
        // Its section on a desktop, from under the page's top to the window's foot; on a phone, to the bar of the sections.
        expect(chatRoom("section", { foot: 900, top: 289, title: 43, clear: 0 })).toBe(595);
        expect(chatRoom("section", { foot: 672, top: 210, title: 43, clear: 152 })).toBe(446);
        // Beside the setup's questions, the same from where it starts.
        expect(chatRoom("beside", { foot: 900, top: 115.4, title: 43, clear: 0 })).toBe(768);
        // Under them it starts far down the page: the window's own height, over the dice's button on a phone.
        expect(chatRoom("under", { foot: 740, top: 1135, title: 43, clear: 152 })).toBe(513);
        expect(chatRoom("under", { foot: 800, top: 1135, title: 43, clear: 0 })).toBe(725);
        // Never less than a chat can do with, however little the window leaves.
        expect(chatRoom("section", { foot: 450, top: 290, title: 43, clear: 0 })).toBe(320);
        expect(chatRoom("under", { foot: 400, top: 900, title: 43, clear: 152 })).toBe(320);
        // Writing on a phone, the whole window over the keyboard from under the page's top, the chat scrolled there; less than the least if that is all there is.
        expect(chatRoom("section", { foot: 440, top: 52, title: 43, clear: 16, typing: true })).toBe(372);
        expect(chatRoom("section", { foot: 150, top: 52, title: 43, clear: 16, typing: true })).toBe(120);
        // In its section on a phone the chat is the window's own: down to the bar, or to the keyboard, with no room under it.
        expect(chatRoom("section", { foot: 672, top: 96, title: 0, clear: 152, flush: true })).toBe(576);
        expect(chatRoom("section", { foot: 420, top: 52, title: 0, clear: 16, typing: true, flush: true })).toBe(368);
    });

    it("marks the chat's tab when the master said something new while the player was in another section, never for the player's own words nor what was there at first", () => {
        const told = shown({ messages: [{ id: 3, from: "player", text: "I open the door." }, { id: 4, from: "master", text: "It creaks." }, { id: 5, from: "player", text: "I go in." }] });
        expect([lastHeard(told), lastHeard(shown()), lastHeard(undefined)]).toEqual([4_000_010, 0, 0]);
        // The same message, grown as the master answers, is more heard; a newer one, however short, more still.
        const grown = shown({ messages: [{ id: 4, from: "master", text: "It creaks, and opens." }] });
        expect(lastHeard(grown)).toBeGreaterThan(lastHeard(told));
        expect(lastHeard(shown({ messages: [{ id: 5, from: "table", text: "" }] }))).toBeGreaterThan(lastHeard(grown));
        // What the page finds as it opens is seen; then a newer message of the master's, or of the table's, is not, until the player is in the chat.
        expect(unseenWords(undefined, 4, false)).toEqual({ seen: 4, unseen: false });
        expect(unseenWords(4, 4, false)).toEqual({ seen: 4, unseen: false });
        expect(unseenWords(4, 6, false)).toEqual({ seen: 4, unseen: true });
        expect(unseenWords(4, 6, true)).toEqual({ seen: 6, unseen: false });
        // The numbers start again, as with a table started anew: nothing unseen, and counting from there.
        expect(unseenWords(6, 2, false)).toEqual({ seen: 2, unseen: false });
    });
});

describe("what the page asks the server of the chat (D-582)", () => {
    const open = { table: true, hosts: [claude], messages: [], elsewhere: false, chat: { host: "claudeCode", model: "sonnet", state: "idle" } };

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    afterAll(async () => {
        await setLanguage("en");
    });

    /** The server's answer to the next request, and what the page sent. */
    function answering(status: number, body: unknown): { sent: { address: string; method?: string; body?: unknown; }[]; }
    {
        const sent: { address: string; method?: string; body?: unknown; }[] = [];
        vi.stubGlobal("fetch", (address: string, request?: { method?: string; body?: string; }) => {
            sent.push({ address, ...(request?.method === undefined ? {} : { method: request.method }), ...(request?.body === undefined ? {} : { body: JSON.parse(request.body) as unknown }) });
            return Promise.resolve(new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));
        });
        return { sent };
    }

    it("reads the chat, no table where the server keeps none or does not know the address, as an older one", async () => {
        answering(200, open);
        expect(await readMaster()).toEqual(open);
        answering(200, { table: false });
        expect(await readMaster()).toEqual({ table: false });
        answering(404, "Not found");
        expect(await readMaster()).toEqual({ table: false });
    });

    it("opens a chat, says the player's words, stops and closes, each as the server takes it, and gives the chat as it is after", async () => {
        const { sent } = answering(202, open);
        expect(await changeMaster({ say: "I open the door." })).toEqual({ shown: open });
        expect(await changeMaster({ open: { host: "claudeCode", model: "sonnet", effort: "high", fresh: false } })).toEqual({ shown: open });
        expect(await changeMaster({ stop: true })).toEqual({ shown: open });
        expect(await changeMaster({ close: true })).toEqual({ shown: open });
        expect(sent).toEqual([
            { address: "/api/master", method: "POST", body: { say: "I open the door." } },
            { address: "/api/master", method: "POST", body: { open: { host: "claudeCode", model: "sonnet", effort: "high", fresh: false } } },
            { address: "/api/master", method: "POST", body: { stop: true } },
            { address: "/api/master", method: "POST", body: { close: true } },
        ]);
    });

    it("gives a refusal in the table's words with the chat as it is, and says in the page's words that the game is away", async () => {
        await setLanguage("it", italian);
        answering(409, { error: "The master is still answering: wait, or stop the turn.", ...open });
        expect(await changeMaster({ say: "Again." })).toEqual({ shown: open, error: "The master is still answering: wait, or stop the turn." });
        // A refusal with no words and no chat, as a body the server does not read.
        answering(400, "broken");
        expect(await changeMaster({ say: "Again." })).toEqual({ error: "Non è arrivato al gioco: riprova." });
        vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
        expect(await changeMaster({ stop: true })).toEqual({ error: "Non è arrivato al gioco: riprova." });
    });
});

describe("the first access to an app, and the model for who does not know them (T-290)", () => {
    const signedOut = { ...codex, account: "out" as const, signIn: "page" as const };
    const toInstall = { ...codex, id: "openCode", name: "OpenCode", found: false, install: { page: "https://example.org/opencode", engine: true as const } };
    const later = { ...codex, id: "antigravity", name: "Antigravity", ready: false };

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    afterAll(async () => {
        await setLanguage("en");
    });

    it("says how each app stands: ready, to set up or signing in, to install or installing, or not from here yet; an account not known is ready", () => {
        expect(hostState(claude)).toBe("ready");
        expect(hostState({ ...claude, account: "unknown" })).toBe("ready");
        expect(hostState({ ...claude, account: "in", signIn: "page" })).toBe("ready");
        expect(hostState(signedOut)).toBe("signIn");
        expect(hostState({ ...signedOut, signingIn: true })).toBe("signingIn");
        // Out, but with no way to sign in said: the page cannot help, and lets the chat say it.
        expect(hostState({ ...claude, account: "out" })).toBe("ready");
        expect(hostState(toInstall)).toBe("install");
        expect(hostState({ ...toInstall, installing: true })).toBe("installing");
        expect(hostState(later)).toBe("later");
        expect(hostState({ ...later, found: false })).toBe("later");
        expect([hostStateWords("ready"), hostStateWords("signIn"), hostStateWords("install")]).toEqual([undefined, "to set up", "to install"]);
        expect([anyHostReady([signedOut, toInstall, later]), anyHostReady([signedOut, claude])]).toEqual([false, true]);
    });

    it("starts from the last app if ready, else the first ready, else the first to set up; none while every app is to install", () => {
        const last = { host: "codex", model: "gpt", resumable: true };
        expect(firstChoice({ hosts: [claude, codex], last })).toEqual({ host: "codex", model: "gpt", effort: "low" });
        expect(firstChoice({ hosts: [claude, signedOut], last })).toEqual({ host: "claudeCode", model: "sonnet", effort: "medium" });
        expect(firstChoice({ hosts: [toInstall, signedOut, later] })).toEqual({ host: "codex", model: "gpt", effort: "low" });
        expect(firstChoice({ hosts: [{ ...signedOut, signingIn: true }] })).toEqual({ host: "codex", model: "gpt", effort: "low" });
        expect(firstChoice({ hosts: [toInstall, later] })).toBeUndefined();
    });

    it("chooses the advised model at first, never one paid apart while the list has another; the last used stays whatever it is", () => {
        const advised = { ...listing, models: [...listing.models, { id: "fable", name: "Fable", efforts: [], advised: true as const }] };
        expect(listedModel(advised, undefined)).toBe("fable");
        expect(listedModel(advised, "haiku")).toBe("haiku");
        const paid = { id: "zen", name: "Zen", efforts: [], metered: true as const };
        const metered = { ...listing, model: "zen", models: [{ ...paid, advised: true as const }, ...listing.models.map((one) => ({ ...one, metered: true as const })), { id: "free", name: "Free", efforts: [] }] };
        expect(listedModel(metered, undefined)).toBe("free");
        expect(listedModel(metered, "zen")).toBe("zen");
        // All paid apart: the advised one.
        const allPaid = { ...listing, model: "opus", models: [{ ...paid, advised: true as const }, { ...paid, id: "opus" }] };
        expect(listedModel(allPaid, undefined)).toBe("zen");
        expect(firstChoice({ hosts: [metered] })).toEqual({ host: "claudeCode", model: "free" });
    });

    it("lists every model the app has, each provider's under its title, then the rest, none marked as advised (T-307); paid apart is said once per provider; finds by name, id or provider", () => {
        expect(modelSections(listing.models)).toEqual([{ metered: false, models: listing.models }]);
        // The advised one stands where the app lists it, with no part of its own.
        const opus = { ...listing.models[0], advised: true as const };
        expect(modelSections([...listing.models.slice(1), opus])).toEqual([{ metered: false, models: [...listing.models.slice(1), opus] }]);
        const many = [
            ...Array.from(
                { length: 20 },
                (_, index) => ({ id: `p/${index}`, name: `Model ${index}`, efforts: [], ...(index < 12 ? { group: "Paid", metered: true as const } : { group: "Zen" }), ...(index === 3 ? { advised: true as const } : {}) }),
            ),
            { id: "lonely", name: "Lonely", efforts: [] },
        ];
        // Every model is there, with no cut.
        expect(modelSections(many).map((section) => [section.title, section.metered, section.models.length])).toEqual([["Paid", true, 12], ["Zen", false, 8], ["Other models", false, 1]]);
        expect(modelSections(many, "zen").map((section) => [section.title, section.models.length])).toEqual([["Zen", 8]]);
        expect(modelSections(many, "model 1").flatMap((section) => section.models.map((one) => one.id))).toEqual(["p/1", "p/10", "p/11", "p/12", "p/13", "p/14", "p/15", "p/16", "p/17", "p/18", "p/19"]);
        // What a search leaves of a provider keeps its title's word.
        expect(modelSections(many, "model 3").map((section) => [section.title, section.metered])).toEqual([["Paid", true]]);
        // One free model among a provider's: the title says nothing, each row says its own.
        expect(modelSections([...many, { id: "p/free", name: "Free", efforts: [], group: "Paid" }])[0].metered).toBe(false);
        expect(modelSections(many, "nothing")).toEqual([]);
        expect(modelSearchAt).toBe(8);
    });

    it("says what each app needs with its plans, the maker's terms before an install and its site where the engine cannot install it; nothing for an app it does not know", async () => {
        expect(hostFacts("codex")).toEqual({
            maker: "OpenAI",
            needs: "With a ChatGPT account, free or paid; limits depend on the plan.",
            plans: "https://learn.chatgpt.com/docs/pricing",
            terms: "https://openai.com/policies/",
        });
        expect(hostFacts("antigravity")?.terms).toBeUndefined();
        expect(hostFacts("somethingElse")).toBeUndefined();
        expect(hostFacts("toString")).toBeUndefined();
        expect(installSiteWords({ id: "antigravity", name: "Antigravity" })).toBe("Google's site opens, in English: install Antigravity from there, then come back here.");
        expect(installSiteWords({ id: "other", name: "Other" })).toBe("Other's site opens: install it from there, then come back here.");
        await setLanguage("it", italian);
        expect(hostStateWords("signIn")).toBe("da attivare");
        expect(hostStateWords("install")).toBe("da installare");
    });

    it("says that the sign-in ran out in the page's words, and that the first answer is due until the master says something", async () => {
        await setLanguage("en");
        const ended = shown({ hosts: [codex], chat: { host: "codex", model: "gpt", state: "ended", why: "401 Unauthorized", code: "signin" } });
        expect(expiredHost(ended)).toBe("Codex");
        expect(expiredHost(shown({ chat: { host: "codex", model: "gpt", state: "ended", why: "It closed." } }))).toBeUndefined();
        expect(endedWords(ended)).toBe("Your access to Codex has expired: sign in again to continue.");
        expect(chatNews(shown({ hosts: [codex], chat: { host: "codex", model: "gpt", state: "idle" } }), ended)).toBe("Your access to Codex has expired: sign in again to continue.");
        const turn = { host: "claudeCode", model: "sonnet", state: "turn" as const };
        expect(firstAnswerDue(shown({ chat: turn, messages: [{ id: 1, from: "player", text: "Begin." }] }))).toBe(true);
        expect(firstAnswerDue(shown({ chat: turn, messages: [{ id: 1, from: "player", text: "Begin." }, { id: 2, from: "master", text: "The rain…" }] }))).toBe(false);
        expect(firstAnswerDue(shown({ chat: { ...turn, state: "idle" } }))).toBe(false);
    });

    it("says the table's lines about the model in the page's words by their mark, quiet, and any other as the table wrote it", async () => {
        await setLanguage("en");
        const line = (mark: Partial<ChatSaid>): ChatSaid => ({ id: 9, from: "table", text: "The table's English.", ...mark });
        expect(tableWords(line({ code: "model", model: "Opus 5.5" }), "Claude Code")).toBe("From now on the master plays with Opus 5.5.");
        expect(tableWords(line({ code: "model", model: "Opus 5.5", effort: "high" }), "Claude Code")).toBe("From now on the master plays with Opus 5.5, thinking high.");
        expect(tableWords(line({ code: "model", model: "Haiku 4.5", dropped: true }), "Claude Code")).toBe(
            "From now on the master plays with Haiku 4.5, which does not take the level of thinking chosen: the app chooses its own.",
        );
        expect(tableWords(line({ code: "model", model: "Opus 5.5", effort: "high", dropped: true }), "Claude Code")).toBe(
            "From now on the master plays with Opus 5.5, which did not take the level of thinking chosen: it stays high.",
        );
        expect(tableWords(line({ code: "model-kept", model: "Haiku 4.5", asked: "Fable 5.2" }), "Claude Code")).toBe("Claude Code did not take Fable 5.2: the master goes on with Haiku 4.5.");
        // A mark the page does not know, or one with a part missing: the table's own words.
        expect(tableWords(line({ code: "model-kept", model: "Haiku 4.5" }), "Claude Code")).toBe("The table's English.");
        expect(tableWords(line({ code: "model-kept", model: "Haiku 4.5", asked: "Fable 5.2" }), undefined)).toBe("The table's English.");
        expect(tableWords(line({ code: "other", model: "x" }), "Claude Code")).toBe("The table's English.");
        expect([aboutModel(line({ code: "model", model: "x" })), aboutModel(line({ code: "model-kept" })), aboutModel(line({}))]).toEqual([true, true, false]);
        const open = { host: "claudeCode", model: "opus", state: "turn" as const };
        const changed = shown({ chat: { ...open, state: "idle" }, messages: [line({ code: "model", model: "Opus 5.5" })] });
        expect(chatApp(changed)).toBe("Claude Code");
        expect(chatNews(shown({ chat: open }), changed)).toBe("From now on the master plays with Opus 5.5.");
        await setLanguage("it", italian);
        expect(tableWords(line({ code: "model", model: "Opus 5.5", effort: "high" }), "Claude Code")).toBe("Da qui il master gioca con Opus 5.5, ragionamento high.");
        expect(tableWords(line({ code: "model-kept", model: "Haiku 4.5", asked: "Fable 5.2" }), "Claude Code")).toBe("Claude Code non ha preso Fable 5.2: il master continua con Haiku 4.5.");
        await setLanguage("en");
    });

    it("asks the server to sign in, to stop waiting, to install, to look at the apps again and to change the open chat's model, and gives a refusal's code", async () => {
        const sent: unknown[] = [];
        const answer = { table: true, hosts: [claude], messages: [], elsewhere: false };
        vi.stubGlobal("fetch", (_address: string, request?: { body?: string; }) => {
            sent.push(JSON.parse(request?.body ?? "null"));
            return Promise.resolve(new Response(JSON.stringify(answer), { status: 200 }));
        });
        await changeMaster({ signIn: { host: "codex" } });
        await changeMaster({ signIn: { host: "codex", cancel: true } });
        await changeMaster({ install: { host: "openCode" } });
        await changeMaster({ hosts: true });
        expect(await changeMaster({ model: { model: "opus", effort: "high" } })).toEqual({ shown: answer });
        expect(sent).toEqual([{ signIn: { host: "codex" } }, { signIn: { host: "codex", cancel: true } }, { install: { host: "openCode" } }, { hosts: true }, { model: { model: "opus", effort: "high" } }]);
        vi.stubGlobal("fetch", () => Promise.resolve(new Response(JSON.stringify({ error: "Codex asks to sign in.", code: "signin", ...answer }), { status: 409 })));
        expect(await changeMaster({ open: { host: "codex", model: "gpt", fresh: true } })).toEqual({ shown: answer, error: "Codex asks to sign in.", code: "signin" });
    });
});
