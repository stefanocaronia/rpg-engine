// What the engine says by a code, in the page's language (T-267, T-325): every code the server tells has the page's words, with the values it comes with and
// without those it may leave out; a code the page does not know says the engine's words; and the table's log is named where something went wrong to report.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { changeMaster, changePhone, changeSaves, changeSetting, sendNote, sendSetupWord, sendStory, unshareNote } from "../src/dashboard/api.ts";
import { chatNews, endedLog, endedWords, tableWords } from "../src/dashboard/chat/chat.ts";
import type { ChatSaid, MasterShown } from "../src/dashboard/data.ts";
import { openCampaign } from "../src/dashboard/launcher/api.ts";
import { campaignWhy, failureText, installWhy, refusalText, signInWhy, tableLineText } from "../src/dashboard/parts/refusals.ts";
import { appRefusals } from "../src/dashboard/parts/refusals/apps.ts";
import { chatRefusals } from "../src/dashboard/parts/refusals/chat.ts";
import { gameRefusals } from "../src/dashboard/parts/refusals/game.ts";
import { launcherRefusals } from "../src/dashboard/parts/refusals/launcher.ts";
import { packageRefusals } from "../src/dashboard/parts/refusals/packages.ts";
import { reachHome } from "../src/dashboard/shell/home.ts";
import { setLanguage } from "../src/dashboard/text.ts";
import type { InstallCode, SignInCode } from "../src/helpers/index.ts";
import type { EndCode } from "../src/master/index.ts";
import { pageFolder } from "./i18n/phrases.ts";

const italian = (): Promise<Record<string, string>> => Promise.resolve(JSON.parse(readFileSync(join(pageFolder, "i18n", "it.json"), "utf8")) as Record<string, string>);

// Every code the server tells, with the values it comes with, one with a question mark where it may be left out. The three first lists name every code of
// the server's own types: a code added there, or taken away, stops the tests' types from checking until this list says it too.

/** Why a turn failed, a chat ended or cannot open, as the drivers tell it (`EndCode`); `host`, where a driver does not give it, is the page's. */
const endCodes: Record<EndCode, string> = {
    "signin": "why?",
    "program-ended": "reason why?",
    "not-stopped": "",
    "not-ready": "model seconds",
    "no-protocol": "why?",
    "chat-not-opened": "why?",
    "chat-not-resumed": "why?",
    "no-resume": "",
    "model-not-taken": "model why?",
    "model-not-confirmed": "model seconds",
    "model-stayed": "asked model",
    "model-other": "asked model?",
    "model-switched": "asked model?",
    "effort-not-taken": "effort why?",
    "effort-other": "asked effort?",
    "effort-switched": "effort asked",
    "host-said": "why",
    "model-failed": "why",
    "words-not-taken": "why",
    "turn-stopped": "why",
    "answer-too-long": "",
    "too-many-steps": "",
    "model-refused": "",
    "tool-unasked": "tool",
    "read-outside": "tool path",
    "read-unsaid": "tool",
    "agent-unknown": "",
    "agent-other": "",
    "agent-unasked": "",
    "no-server-file": "file host",
    "effort-unknown": "host effort efforts",
    "effort-none": "model host",
    "effort-not-of-model": "model effort host efforts",
};

/** Why an app's last sign-in did not finish (`SignInCode`). */
const signInCodes: Record<SignInCode, string> = {
    "elsewhere": "host",
    "signin-ending": "host",
    "app-missing": "host",
    "signin-timeout": "",
    "signin-stopped": "",
    "signin-said": "why",
    "signin-failed": "why",
};

/** Why an app's last install failed (`InstallCode`). */
const installCodes: Record<InstallCode, string> = {
    "elsewhere": "",
    "app-install-stopped": "package",
    "app-install-said": "why",
    "app-install-failed": "why",
};

/** The lines the table writes among the chat's messages, besides why a turn failed. */
const tableLineCodes: Record<string, string> = { "turn-silent": "", "turn-silent-tool": "tool", "turn-failed": "" };

/** Why a listed campaign does not read. */
const campaignCodes: Record<string, string> = {
    "campaign-file-is-folder": "root",
    "campaign-not-allowed": "root",
    "campaign-path-long": "root",
    "campaign-path-invalid": "root",
    "campaign-away": "root",
    "campaign-unread": "why",
};

/** What the table, the launcher and the campaign's own page refuse; the opening refused as the player is not signed in is not here, as the page shows the app to set up. */
const refusalCodes: Record<string, string> = {
    // The chat: the player's words, opening, another model.
    "no-table": "",
    "master-answering": "",
    "question-waits": "",
    "no-chat": "",
    "chat-open": "",
    "chat-by-hand": "",
    "host-not-yet": "host hosts",
    "app-missing": "host",
    "model-needed": "host",
    "model-no-name": "model host",
    "host-not-started": "host why",
    "model-while-answering": "",
    "no-model-change": "host",
    "no-model-change-page": "",
    "master-getting-ready": "",
    // The AI apps.
    "no-access-table": "",
    "no-access-page": "",
    "no-access-launcher": "",
    "app-here": "host",
    "signin-in-app-account": "host account",
    "signin-not-needed": "host",
    "signin-in-app": "host",
    "signin-not-installed": "host",
    "signin-none-to-cancel": "host",
    "install-from-page": "host page",
    // The launcher: a campaign opened, made or added.
    "campaign-gone": "root",
    "launcher-closing": "",
    "table-other-engine": "root version ours pid",
    "table-silent": "root pid",
    "table-ending": "root",
    "table-not-started": "root seconds",
    "page-kept-by-chat": "",
    "no-port": "root",
    "socket-taken": "socket root",
    "socket-failed": "root socket why",
    "campaign-file-is-folder": "root",
    "campaign-not-allowed": "root",
    "campaign-path-long": "root",
    "campaign-path-invalid": "root",
    "campaign-away": "root",
    "host-first": "",
    "host-not-yet-new": "host",
    "folder-not-empty": "folder",
    "make-path-file": "folder",
    "make-not-allowed": "folder",
    "make-disk-full": "folder",
    "make-read-only": "folder",
    "make-path-long": "folder",
    "make-disk-gone": "folder",
    "make-away": "folder",
    "launcher-failed": "",
    "path-too-long": "most",
    "not-full-path": "name",
    "campaign-name-length": "most",
    "campaign-name-line": "",
    "folder-ends-dot": "folder part",
    "folder-ends-space": "folder part",
    "folder-device-name": "folder part",
    "not-a-campaign": "root",
    "folder-window-open": "",
    "folder-window-failed": "why?",
    "folder-window-missing": "",
    "folder-window-none": "",
    // From a campaign's page back to the campaigns.
    "no-launcher-way": "",
    "home-on-computer": "",
    "launcher-not-started": "seconds",
    "launcher-silent": "url pid",
    "launcher-not-quit": "version url pid",
    // The campaign's own page: the saves, the settings, the notes, the story, the phone.
    "go-back-question": "",
    "go-back-working": "",
    "masters-setting": "setting",
    "no-setting": "setting settings",
    "start-over-name": "name",
    "note-not-whole": "",
    "no-note": "",
    "story-not-whole": "",
    "no-character": "",
    "story-whose": "names",
    "no-setup-question": "question questions",
    "listen": "address why",
};

/** The values of a code as its line names them, each filled with its own name: all of them, or without those that may be left out. */
function valuesOf(names: string, whole: boolean): Record<string, string>
{
    const given = names.split(" ").filter((name) => name !== "" && (whole || !name.endsWith("?")));
    return Object.fromEntries(given.map((name) => [name.replace("?", ""), `<${name.replace("?", "")}>`]));
}

/** Each code of a list said both ways, with every value and without those that may be left out: the codes whose words are missing, or keep a name unfilled. */
function unsaid(codes: Record<string, string>, say: (code: string, values: Record<string, string>) => string | undefined): string[]
{
    return Object.entries(codes).filter(([code, names]) =>
        [true, false].some((whole) => {
            const said = say(code, valuesOf(names, whole));
            return said === undefined || said.trim() === "" || /\{\w+\}/.test(said);
        })
    ).map(([code]) => code);
}

/** A chat as the table shows it, with Claude Code alone. */
function shown(changes: Partial<MasterShown> = {}): MasterShown
{
    return { hosts: [{ id: "claudeCode", name: "Claude Code", ready: true, found: true, model: "sonnet", efforts: [], models: [] }], messages: [], elsewhere: false, ...changes };
}

/** The server answers every request with this status and body. */
function answering(status: number, body: unknown): void
{
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

describe("what the engine says by a code, in the page's words (T-267, T-325)", () => {
    beforeEach(async () => {
        await setLanguage("it", italian);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    afterAll(async () => {
        await setLanguage("en");
    });

    it("has words for every code the server tells, with its values and without those it may leave out", async () => {
        await setLanguage("en");
        const opening = ["no-server-file", "effort-unknown", "effort-none", "effort-not-of-model"];
        // Why a turn failed or a chat ended is said with the app's name, which the page gives; what keeps a chat from opening is a refusal.
        expect(unsaid(endCodes, (code, values) => (opening.includes(code) ? refusalText({ code, values }, "") : failureText(code, values, "Claude Code")))).toEqual([]);
        expect(unsaid(tableLineCodes, (code, values) => tableLineText(code, values, "Claude Code"))).toEqual([]);
        expect(unsaid(refusalCodes, (code, values) => refusalText({ code, values }, ""))).toEqual([]);
        expect(unsaid(campaignCodes, campaignWhy)).toEqual([]);
        // One under way in another window is no failure, and has no why: the app's row says it in its own line.
        expect(unsaid(signInCodes, (code, values) => signInWhy(code, values, "Codex"))).toEqual(["elsewhere"]);
        expect(unsaid(installCodes, installWhy)).toEqual(["elsewhere"]);
    });

    it("keeps each refusal's code to one part of the page's words", () => {
        const parts = [packageRefusals, gameRefusals, chatRefusals, appRefusals, launcherRefusals];
        const codes = parts.flatMap((part) => Object.keys(part));
        expect(codes.filter((code, index) => codes.indexOf(code) !== index)).toEqual([]);
    });

    it("says the table's lines in the chat: a turn without a word, one that failed with why, and the table's own words for a code it does not know", () => {
        const line = (mark: Partial<ChatSaid>): ChatSaid => ({ id: 9, from: "table", text: "The table's English.", ...mark });
        expect(tableWords(line({ code: "turn-silent" }), "Claude Code")).toBe("Il master ha chiuso il turno senza scrivere niente: scrivigli di nuovo.");
        expect(tableWords(line({ code: "turn-silent-tool", values: { tool: "Bash" } }), "Claude Code"))
            .toBe("Il master ha chiuso il turno senza scrivere niente, dopo aver provato a usare Bash, che qui non può usare: scrivigli di nuovo.");
        expect(tableWords(line({ code: "words-not-taken", values: { why: "upstream reset" } }), "Claude Code")).toBe("Claude Code non ha preso le tue parole. Claude Code ha detto: upstream reset");
        expect(tableWords(line({ code: "host-said", values: { why: "Rate limit exceeded" } }), "Codex")).toBe("Codex ha detto: Rate limit exceeded");
        // A value that may be left out, left out: the sentence without it.
        expect(tableWords(line({ code: "model-not-taken", values: { model: "opus" } }), "Claude Code")).toBe("Claude Code non ha preso il modello opus.");
        expect(tableWords(line({ code: "model-other", values: { asked: "opus" } }), "Claude Code")).toBe("Claude Code doveva giocare con il modello opus, e gioca con un altro.");
        expect(tableWords(line({ code: "model-switched", values: { asked: "opus", model: "" } }), "Claude Code")).toBe("Claude Code non gioca più con il modello opus.");
        // A code the page does not know, a line with none, and why a turn failed with no app to name: the table's own words.
        expect(tableWords(line({ code: "tomorrow's", values: { why: "x" } }), "Claude Code")).toBe("The table's English.");
        expect(tableWords(line({}), "Claude Code")).toBe("The table's English.");
        expect(tableWords(line({ code: "not-stopped" }), undefined)).toBe("The table's English.");
        // A screen reader hears the line as the page says it.
        const turn = shown({ chat: { host: "claudeCode", model: "sonnet", state: "turn" } });
        expect(chatNews(turn, { ...turn, chat: { host: "claudeCode", model: "sonnet", state: "idle" }, messages: [line({ code: "turn-failed" })] })).toBe("Il turno del master non è andato a buon fine: scrivigli di nuovo.");
    });

    it("says why the chat ended by its code, with what the app said after it, and names the table's log for a report", () => {
        const ended = (chat: Partial<NonNullable<MasterShown["chat"]>>, log?: string): MasterShown =>
            shown({ chat: { host: "claudeCode", model: "sonnet", state: "ended", why: "the host's program ended (exit code 1)", ...chat }, ...(log === undefined ? {} : { log }) });
        expect(endedWords(ended({ code: "program-ended", values: { reason: "exit code 1" } }))).toBe("La chat si è chiusa: Claude Code ha smesso di funzionare (exit code 1).");
        expect(endedWords(ended({ code: "program-ended", values: { reason: "exit code 1", why: "ECONNRESET" } })))
            .toBe("La chat si è chiusa: Claude Code ha smesso di funzionare (exit code 1). Claude Code ha detto: ECONNRESET");
        // The app by the id the chat has, where the page does not know it; a code it does not know, in the table's words.
        expect(endedWords(ended({ host: "other", code: "no-resume" }))).toBe("La chat si è chiusa: other non sa riprendere una chat. Aprine una nuova.");
        expect(endedWords(ended({ code: "tomorrow's" }))).toBe("La chat si è chiusa: the host's program ended (exit code 1)");
        // The log's file with a chat that ended by something that went wrong; never with one that is open, nor where the sign-in ran out.
        const log = "C:\\Users\\ada\\AppData\\Roaming\\rpg-engine\\tables\\9f2c.log";
        expect(endedLog(ended({ code: "program-ended" }, log))).toBe(log);
        expect(endedLog(ended({ code: "program-ended" }))).toBeUndefined();
        expect(endedLog(ended({ code: "signin" }, log))).toBeUndefined();
        expect(endedLog(shown({ chat: { host: "claudeCode", model: "sonnet", state: "idle" }, log }))).toBeUndefined();
        expect(endedLog(shown({ log }))).toBeUndefined();
    });

    it("says what the table refuses of the chat in the page's words, keeps the code of a sign-in, and the table's words for a code it does not know", async () => {
        const chat = { table: true, hosts: [], messages: [], elsewhere: false };
        answering(409, { error: "Claude Code could not start: spawn claude ENOENT.", code: "host-not-started", values: { host: "Claude Code", why: "spawn claude ENOENT" }, ...chat });
        expect(await changeMaster({ open: { host: "claudeCode", model: "opus", fresh: true } })).toEqual({ shown: chat, error: "Non è stato possibile avviare Claude Code: spawn claude ENOENT", code: "host-not-started" });
        answering(409, { error: "The master is still answering: wait, or stop the turn.", code: "master-answering", ...chat });
        expect((await changeMaster({ say: "Again." })).error).toBe("Il master sta ancora rispondendo: aspetta, o ferma il turno.");
        answering(409, { error: "A chat opened by hand plays this campaign: close it, then open the chat here.", code: "chat-by-hand", ...chat });
        expect((await changeMaster({ open: { host: "claudeCode", model: "opus", fresh: true } })).error).toBe("Una chat aperta da te sta giocando questa campagna: continua lì, oppure chiudila per giocare qui.");
        answering(409, { error: "Codex is not signed in on this computer: sign in here, then open the chat.", code: "signin", values: { host: "Codex" }, ...chat });
        expect(await changeMaster({ open: { host: "codex", model: "gpt", fresh: true } })).toMatchObject({ code: "signin" });
        answering(409, { error: "Something new.", code: "tomorrow's", ...chat });
        expect((await changeMaster({ say: "Again." })).error).toBe("Something new.");
    });

    it("says why an app's sign-in or install failed: by its code, what the app or npm said quoted as it came, and nothing for a code it does not know", () => {
        expect(signInWhy("signin-timeout", undefined, "Codex")).toBe("sono passati dieci minuti senza che tu lo finissi.");
        expect(signInWhy("signin-said", { why: "Device code expired" }, "Codex")).toBe("Codex ha risposto «Device code expired».");
        expect(signInWhy("app-missing", { host: "Claude Code" }, "Claude Code")).toBe("Claude Code non è su questo computer.");
        expect(signInWhy("signin-failed", { why: "spawn codex EACCES" }, "Codex")).toBe("spawn codex EACCES");
        expect(installWhy("app-install-stopped", { package: "@openai/codex" })).toBe("npm si è fermato senza installare @openai/codex.");
        expect(installWhy("app-install-said", { why: "npm error ETIMEDOUT" })).toBe("npm ha risposto «npm error ETIMEDOUT».");
        expect([signInWhy("tomorrow's", { why: "x" }, "Codex"), signInWhy(undefined, undefined, "Codex"), installWhy("tomorrow's", undefined)]).toEqual([undefined, undefined, undefined]);
        expect(refusalText({ error: "Antigravity signs in from its own app…", code: "signin-in-app-account", values: { host: "Antigravity", account: "Google" } }, ""))
            .toBe("A Antigravity si accede dalla sua app, non da qui: apri Antigravity, accedi lì col tuo account Google, poi controlla di nuovo.");
    });

    it("says what the launcher refuses in the page's words, keeps the file of the table's log, and why a listed campaign does not read", async () => {
        const root = "C:\\Users\\ada\\RPG Engine\\Torre";
        const log = "C:\\Users\\ada\\AppData\\Roaming\\rpg-engine\\tables\\c0ff.log";
        answering(409, { error: `The table of ${root} did not start within 15 seconds: run rpg table in that folder to see why.`, code: "table-not-started", values: { root, seconds: "15" }, log });
        expect(await openCampaign(root)).toMatchObject({ error: "Questa campagna non è partita entro 15 secondi: riprova.", log });
        answering(409, { error: "Something new of the launcher's.", code: "tomorrow's" });
        expect(await openCampaign(root)).toMatchObject({ error: "Something new of the launcher's." });
        // The window that chooses a folder, with what its program said and without.
        expect(refusalText({ code: "folder-window-failed" }, "")).toBe("La finestra per scegliere una cartella non si è aperta: riprova.");
        expect(refusalText({ code: "folder-window-failed", values: { why: "Access denied" } }, "")).toBe("La finestra per scegliere una cartella non si è aperta. Ha detto: Access denied");
        // A listed campaign that does not read, and the same folder opened or added.
        expect(campaignWhy("campaign-away", { root })).toBe("il suo disco o la sua cartella di rete non risponde.");
        expect(campaignWhy("campaign-unread", { why: "bad indentation at line 3" })).toBe("bad indentation at line 3");
        expect(campaignWhy("tomorrow's", { root })).toBeUndefined();
        expect(refusalText({ code: "campaign-away", values: { root } }, "")).toBe(`${root} non si legge: il suo disco o la sua cartella di rete non risponde.`);
        // The way back from a campaign's page.
        answering(409, { error: "RPG Engine's launcher did not start within ten seconds…", code: "launcher-not-started", values: { seconds: "10" } });
        expect(await reachHome()).toEqual({ error: "RPG Engine non è partito entro 10 secondi: riprova. Se succede ancora, scrivi rpg launcher in un terminale per vedere perché." });
    });

    it("says what the game refuses its own page: a setting by its label, the saves, a note, the story, the questions at the start, the phone", async () => {
        answering(403, { error: "difficulty is the master's to change, in the chat.", code: "masters-setting", values: { setting: "difficulty" } });
        expect(await changeSetting({ setting: "difficulty", value: "easy" })).toBe("L'impostazione «Difficoltà» la cambia il master: chiediglielo in chat.");
        answering(400, { error: "Write the campaign's name, Guadoscuro, to start it over. Nothing changed.", code: "start-over-name", values: { name: "Guadoscuro" } });
        expect(await changeSaves({ action: "reset", campaign: "x" })).toBe("Per ricominciarla scrivi il nome della campagna, Guadoscuro. Non è cambiato niente.");
        answering(409, { error: "With saves permadeath, the game never goes back." });
        expect(await changeSaves({ action: "load", save: 1 })).toBe("With saves permadeath, the game never goes back.");
        answering(400, { error: "The note did not come whole: it may be too long, so shorten it.", code: "note-not-whole" });
        expect(await sendNote({ id: "a", title: "A", text: "…" })).toBe("La nota non è arrivata intera: forse è troppo lunga, accorciala.");
        answering(400, { error: "Give who, whose story it is: Ettore or Mira.", code: "story-whose", values: { names: "Ettore, Mira" } });
        expect(await sendStory("Figlia del mugnaio.", "Ada")).toBe("Ora i tuoi personaggi sono Ettore, Mira: ricarica la pagina.");
        answering(400, { error: "pace is no question of the setup: leave one of difficulty.", code: "no-setup-question", values: { question: "pace", questions: "difficulty" } });
        expect(await sendSetupWord({ leave: "pace" })).toBe("Le domande iniziali non lo chiedono più: ricarica la pagina.");
        // A note taken back too late, by the answer's status alone.
        answering(409, { error: "The master has read it already: it can no longer be taken back." });
        expect(await unshareNote("a")).toBe("read");
        answering(200, { notes: [] });
        expect(await unshareNote("a")).toBe("done");
        // The way in for the phone: said by its code, the page's own words for any other.
        answering(409, { error: "The door to the phone could not open…", code: "listen", values: { address: "192.168.1.20", why: "EADDRNOTAVAIL" } });
        expect(await changePhone(true)).toEqual({ problem: "L'accesso dal telefono non si è aperto su 192.168.1.20 (EADDRNOTAVAIL): controlla la rete di questo computer, poi riprova." });
        answering(403, { error: "Only the computer's own page opens or closes the door to the phone." });
        expect(await changePhone(true)).toEqual({ problem: "Non è arrivato al gioco: riprova." });
    });
});
