// The table's chat with the master as the page reads it (D-582): what its place shows, the choice a chat opens with, what is told as it changes, when its
// list follows what comes, which key sends the player's words, its address, and what the page asks the server of it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { readAddress, sectionAddress, sectionLabel } from "../src/dashboard/address.ts";
import { changeMaster, readMaster } from "../src/dashboard/api.ts";
import { atEnd, chatNews, chatRoom, chatView, choiceLine, choiceOf, endedWords, firstChoice, hostsFound, lastHeard, resumes, sendsWords, speaker, turnWords, unseenWords, wordsToSend } from "../src/dashboard/chat/chat.ts";
import type { MasterShown } from "../src/dashboard/data.ts";
import { setLanguage } from "../src/dashboard/text.ts";
import { pageFolder } from "./i18n/phrases.ts";

const italian = (): Promise<Record<string, string>> => Promise.resolve(JSON.parse(readFileSync(join(pageFolder, "i18n", "it.json"), "utf8")) as Record<string, string>);

const claude = { id: "claudeCode", name: "Claude Code", found: true, model: "sonnet", efforts: ["low", "medium", "high", "xhigh", "max"] };
const codex = { id: "codex", name: "Codex", found: true, model: "gpt", efforts: ["low", "high"] };

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
        expect(firstChoice(shown())).toEqual({ host: "claudeCode", model: "sonnet" });
        expect(firstChoice(shown({ last: { host: "claudeCode", model: "claude-sonnet-5", effort: "high", resumable: true } }))).toEqual({ host: "claudeCode", model: "claude-sonnet-5", effort: "high" });
        expect(firstChoice(shown({ hosts: [claude, codex], last: { host: "codex", model: "gpt-x", resumable: false } }))).toEqual({ host: "codex", model: "gpt-x" });
        // The last app gone from this computer: the first one found, with its own model, never the other's.
        const gone = shown({ hosts: [{ ...claude, found: false }, codex], last: { host: "claudeCode", model: "claude-sonnet-5", effort: "max", resumable: true } });
        expect(firstChoice(gone)).toEqual({ host: "codex", model: "gpt" });
        expect(hostsFound(gone)).toEqual({ found: [codex], missing: [{ ...claude, found: false }] });
        expect(firstChoice(shown({ hosts: [{ ...claude, found: false }] }))).toBeUndefined();
        expect(firstChoice(shown({ hosts: [] }))).toBeUndefined();
    });

    it("takes an app's last model and effort when it is picked, an effort only if the app knows it, and takes up the last chat only in its own app", () => {
        const two = shown({ hosts: [claude, codex], last: { host: "claudeCode", model: "opus", effort: "max", resumable: true } });
        expect(choiceOf(two, "claudeCode")).toEqual({ host: "claudeCode", model: "opus", effort: "max" });
        expect(choiceOf(two, "codex")).toEqual({ host: "codex", model: "gpt" });
        expect(choiceOf(shown({ hosts: [codex], last: { host: "codex", model: "gpt", effort: "max", resumable: true } }), "codex")).toEqual({ host: "codex", model: "gpt" });
        expect([resumes(two, "claudeCode"), resumes(two, "codex"), resumes(shown(), "claudeCode")]).toEqual([true, false, false]);
        expect(resumes(shown({ last: { host: "claudeCode", model: "opus", resumable: false } }), "claudeCode")).toBe(false);
    });

    it("says what the master does in their turn, the command they use when the table tells one, whose words a message is and what a chat plays with, in Italian too", async () => {
        await setLanguage("en");
        expect(turnWords({ host: "claudeCode", model: "sonnet", state: "turn" })).toBe("The master is answering…");
        expect(turnWords({ host: "claudeCode", model: "sonnet", state: "turn", tool: "roll" })).toBe("The master is using roll…");
        expect(turnWords({ host: "claudeCode", model: "sonnet", state: "idle", tool: "roll" })).toBeUndefined();
        expect(turnWords(undefined)).toBeUndefined();
        expect(choiceLine(shown(), { host: "claudeCode", model: "sonnet", effort: "high" })).toBe("Claude Code · sonnet · high");
        expect(choiceLine(shown(), { host: "other", model: "m" })).toBe("other · m");
        await setLanguage("it", italian);
        expect(turnWords({ host: "claudeCode", model: "sonnet", state: "turn" })).toBe("Il master sta rispondendo…");
        expect([speaker("player"), speaker("master"), speaker("table")]).toEqual(["Tu", "Il master", "Il tavolo"]);
        expect([endedWords(undefined), endedWords("  "), endedWords("It closed.")]).toEqual(["La chat si è chiusa.", "La chat si è chiusa.", "La chat si è chiusa: It closed."]);
        expect(sectionLabel("chat")).toBe("Chat");
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
        expect(wordsToSend("  I open the door.\n", "idle")).toBe("I open the door.");
        expect([wordsToSend(" \n ", "idle"), wordsToSend("Wait.", "turn"), wordsToSend("Wait.", "ended"), wordsToSend("Wait.", undefined)]).toEqual([undefined, undefined, undefined, undefined]);
    });

    it("has its own address, #/chat, as a section", () => {
        expect(readAddress("#/chat")).toEqual({ section: "chat" });
        expect(sectionAddress("chat")).toBe("#/chat");
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
    });

    it("marks the chat's tab when the master said something new while the player was in another section, never for the player's own words nor what was there at first", () => {
        const told = shown({ messages: [{ id: 3, from: "player", text: "I open the door." }, { id: 4, from: "master", text: "It creaks." }, { id: 5, from: "player", text: "I go in." }] });
        expect([lastHeard(told), lastHeard(shown()), lastHeard(undefined)]).toEqual([4, 0, 0]);
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
