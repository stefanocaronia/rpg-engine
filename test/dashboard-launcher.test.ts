// The launcher's page and the windows (D-582): where a window goes on a screen, what an address asks of the page it opens, how a listed campaign stands and
// when it was last opened, the new campaign as its form asks for it, what the page asks the launcher, and the way from a campaign's page back to the campaigns.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { addCampaign, createCampaign, forgetCampaign, type ListedCampaign, openCampaign, pickFolder, readLauncher } from "../src/dashboard/launcher/api.ts";
import { campaignMeta, campaignState, firstForm, folderName, inUsualFolder, listedAt, openedLabel, opens, wishOf } from "../src/dashboard/launcher/campaigns.ts";
import { reachHome, readHome, reopenAddress } from "../src/dashboard/shell/home.ts";
import { addressAsks, braveSize, markedAddress, windowPlace } from "../src/dashboard/shell/window.ts";
import { setLanguage } from "../src/dashboard/text.ts";
import { pageFolder } from "./i18n/phrases.ts";

const italian = (): Promise<Record<string, string>> => Promise.resolve(JSON.parse(readFileSync(join(pageFolder, "i18n", "it.json"), "utf8")) as Record<string, string>);

const claude = { id: "claudeCode", name: "Claude Code", found: true, model: "sonnet", efforts: ["low", "medium", "high"] };
const codex = { id: "codex", name: "Codex", found: false, model: "gpt", efforts: ["low", "high"] };

/** A campaign as the launcher lists it, ready to open unless told. */
function listed(changes: Partial<ListedCampaign> = {}): ListedCampaign
{
    return { root: "C:\\Users\\ada\\RPG Engine\\Guadoscuro", name: "Guadoscuro", open: false, missing: false, ...changes };
}

describe("the windows of the launcher and of a campaign (D-582)", () => {
    it("puts the launcher's window small in the middle of its screen's free room, never larger than it, on the screen it is on", () => {
        expect(windowPlace("launcher", { width: 1920, height: 1040 })).toEqual({ width: 960, height: 680, left: 480, top: 180 });
        expect(windowPlace("launcher", { width: 2560, height: 1400 })).toEqual({ width: 960, height: 680, left: 800, top: 360 });
        // A screen smaller than the window: all of it.
        expect(windowPlace("launcher", { width: 800, height: 600 })).toEqual({ width: 800, height: 600, left: 0, top: 0 });
        expect(windowPlace("launcher", { width: 1280, height: 640 })).toEqual({ width: 960, height: 640, left: 160, top: 0 });
        // A second screen beside the first, and one over it: the window stays there.
        expect(windowPlace("launcher", { width: 1920, height: 1040, left: 1920, top: 0 })).toEqual({ width: 960, height: 680, left: 2400, top: 180 });
        expect(windowPlace("launcher", { width: 1920, height: 1040, left: -1920, top: -1080 })).toEqual({ width: 960, height: 680, left: -1440, top: -900 });
    });

    it("gives a campaign's window nine tenths of the screen's free room, centred, and no more than 1920 by 1200 on a large screen", () => {
        expect(windowPlace("campaign", { width: 1920, height: 1040 })).toEqual({ width: 1728, height: 936, left: 96, top: 52 });
        expect(windowPlace("campaign", { width: 1366, height: 728 })).toEqual({ width: 1229, height: 655, left: 69, top: 37 });
        expect(windowPlace("campaign", { width: 2560, height: 1400 })).toEqual({ width: 1920, height: 1200, left: 320, top: 100 });
        expect(windowPlace("campaign", { width: 3840, height: 2120 })).toEqual({ width: 1920, height: 1200, left: 960, top: 460 });
        // A wide and low screen: the width at its most, the height its share.
        expect(windowPlace("campaign", { width: 3440, height: 1400 })).toEqual({ width: 1920, height: 1200, left: 760, top: 100 });
        expect(windowPlace("campaign", { width: 2560, height: 1040, left: 1920, top: 40 })).toEqual({ width: 1920, height: 936, left: 2240, top: 92 });
    });

    it("marks an address for its page to size the window, and reads what an address asks, giving it back without", () => {
        expect(markedAddress("http://127.0.0.1:4747")).toBe("http://127.0.0.1:4747/?opened=1");
        expect(markedAddress("http://127.0.0.1:4747/?open=x#/chat")).toBe("http://127.0.0.1:4747/?open=x&opened=1#/chat");
        expect(addressAsks("http://127.0.0.1:4747/?opened=1#/scene")).toEqual({ opened: true, rest: "/#/scene" });
        expect(addressAsks("http://127.0.0.1:4747/")).toEqual({ opened: false, rest: "/" });
        // The campaign to open at once, by its folder, as the system writes it; with nothing named, nothing asked.
        expect(addressAsks(reopenAddress("http://127.0.0.1:5000", "C:\\Users\\ada\\RPG Engine\\Il Guado & co"))).toEqual({ opened: false, open: "C:\\Users\\ada\\RPG Engine\\Il Guado & co", rest: "/" });
        expect(addressAsks("http://127.0.0.1:5000/?open=&other=1")).toEqual({ opened: false, rest: "/?other=1" });
        expect(reopenAddress("http://127.0.0.1:5000", "/home/ada/RPG Engine/Guado")).toBe("http://127.0.0.1:5000/?open=%2Fhome%2Fada%2FRPG+Engine%2FGuado");
    });

    it("in Brave, whose screen is made up, sizes the launcher's window to its own size and a campaign's within a screen larger than the window, else leaves it", () => {
        // Brave's made-up screen, whatever the monitor.
        const madeUp = { width: 1280, height: 800 };
        expect(braveSize("launcher", madeUp, { width: 1265, height: 1372 })).toEqual({ width: 960, height: 680 });
        expect(braveSize("campaign", madeUp, { width: 1265, height: 1372 })).toBeUndefined();
        expect(braveSize("campaign", madeUp, { width: 800, height: 600 })).toEqual({ width: 1280, height: 800 });
        expect(braveSize("campaign", { width: 2560, height: 1400 }, { width: 960, height: 680 })).toEqual({ width: 1920, height: 1200 });
    });
});

describe("the campaigns as the launcher's page lists them (D-582)", () => {
    afterAll(async () => {
        await setLanguage("en");
    });

    it("says how each stands: gone before unreadable, its table answering, or ready; only the last two open", () => {
        expect([campaignState(listed()), campaignState(listed({ open: true })), campaignState(listed({ problem: "It does not read." })), campaignState(listed({ missing: true, problem: "It does not read." }))])
            .toEqual(["ready", "open", "unreadable", "missing"]);
        expect([opens(listed()), opens(listed({ open: true })), opens(listed({ problem: "x" })), opens(listed({ missing: true }))]).toEqual([true, true, false, false]);
    });

    it("says when one was last opened as a game does, in the page's language: today, yesterday, days and weeks ago, then its day, the year when it is another", () => {
        const now = new Date(2026, 10, 25, 9, 30);
        const at = (year: number, month: number, day: number, hour = 12): string => new Date(year, month, day, hour).toISOString();
        expect([openedLabel(at(2026, 10, 25, 1), now, "en"), openedLabel(at(2026, 10, 24, 23), now, "en"), openedLabel(at(2026, 10, 22), now, "en")]).toEqual(["today", "yesterday", "3 days ago"]);
        expect([openedLabel(at(2026, 10, 18), now, "en"), openedLabel(at(2026, 10, 9), now, "en"), openedLabel(at(2026, 9, 27), now, "en")]).toEqual(["last week", "2 weeks ago", "4 weeks ago"]);
        expect([openedLabel(at(2026, 8, 12), now, "en"), openedLabel(at(2025, 8, 12), now, "en")]).toEqual(["Sep 12", "Sep 12, 2025"]);
        expect([openedLabel(at(2026, 10, 25, 1), now, "it"), openedLabel(at(2026, 10, 24), now, "it"), openedLabel(at(2026, 10, 22), now, "it"), openedLabel(at(2026, 10, 9), now, "it")])
            .toEqual(["oggi", "ieri", "3 giorni fa", "2 settimane fa"]);
        // Never opened, a date that does not read, and a moment ahead of the clock.
        expect([openedLabel(undefined, now, "en"), openedLabel("soon", now, "en"), openedLabel(at(2026, 10, 27), now, "en")]).toEqual([undefined, undefined, "today"]);
    });

    it("writes under a campaign's name its game system and when it was last opened, whichever it has; and a folder's own name from either system's path", () => {
        const now = new Date(2026, 10, 25, 9, 30);
        const opened = new Date(2026, 10, 22, 12).toISOString();
        expect(campaignMeta(listed({ system: "free", opened }), now, "en")).toBe("free · 3 days ago");
        expect([campaignMeta(listed({ system: "5e" }), now, "en"), campaignMeta(listed({ opened }), now, "en"), campaignMeta(listed(), now, "en")]).toEqual(["5e", "3 days ago", ""]);
        expect([folderName("C:\\Users\\ada\\RPG Engine\\Guadoscuro"), folderName("/home/ada/RPG Engine/Guado/"), folderName("Guado")]).toEqual(["Guadoscuro", "Guado", "Guado"]);
    });

    it("opens from its address only a campaign of the list, its folder compared as the launcher compares it; any other folder is no campaign to open", () => {
        const guado = listed();
        const rocca = listed({ root: "/home/ada/RPG Engine/Rocca", name: "Rocca" });
        const campaigns = [guado, rocca];

        expect(listedAt(campaigns, "C:\\Users\\ada\\RPG Engine\\Guadoscuro")).toBe(guado);
        expect(listedAt(campaigns, "c:\\users\\ADA\\rpg engine\\guadoscuro\\")).toBe(guado);
        expect(listedAt(campaigns, "/home/ada/RPG Engine/Rocca/")).toBe(rocca);
        expect(listedAt(campaigns, "/home/ada/rpg engine/rocca")).toBeUndefined();
        expect(listedAt(campaigns, "\\\\server\\share\\Guadoscuro")).toBeUndefined();
        expect(listedAt(campaigns, "C:\\Users\\ada\\RPG Engine\\Guadoscuro\\..\\Other")).toBeUndefined();
        expect(listedAt([], "C:\\Users\\ada\\RPG Engine\\Guadoscuro")).toBeUndefined();
    });

    it("opens the form of a new campaign in the page's language where the launcher offers it, with the first game system and the first app on this computer", () => {
        const launcher = { languages: ["en", "de", "it"], systems: [{ name: "free", title: "Free play" }, { name: "5e", title: "The fifth edition" }], hosts: [codex, claude] };
        expect(firstForm(launcher, "it")).toEqual({ name: "", language: "it", system: "free", chat: { host: "claudeCode", model: "sonnet" } });
        expect(firstForm(launcher, "ja").language).toBe("en");
        expect(firstForm({ languages: ["de"], systems: [], hosts: [codex] }, "it")).toEqual({ name: "", language: "de", system: "" });
    });

    it("asks the launcher for a campaign only once it has a name and a game system: the folder only when chosen, the chat's app only when it is on this computer", () => {
        const hosts = [claude, codex];
        const form = { name: "  La Brughiera ", language: "it", system: "free", chat: { host: "claudeCode", model: " opus ", effort: "high" } };
        expect(wishOf(form, hosts)).toEqual({ name: "La Brughiera", language: "it", system: "free", host: "claudeCode", model: "opus", effort: "high" });
        expect(wishOf({ ...form, folder: "D:\\Giochi\\Brughiera" }, hosts)).toMatchObject({ folder: "D:\\Giochi\\Brughiera" });
        expect(inUsualFolder({ ...form, folder: "D:\\Giochi\\Brughiera" })).toEqual(form);
        // The model left empty: the one the app proposes; an effort the app does not know, none.
        expect(wishOf({ ...form, chat: { host: "claudeCode", model: " ", effort: "max" } }, hosts)).toEqual({ name: "La Brughiera", language: "it", system: "free", host: "claudeCode", model: "sonnet" });
        // An app that is not on this computer, or none chosen: the campaign with no chat proposed.
        expect(wishOf({ ...form, chat: { host: "codex", model: "gpt" } }, hosts)).toEqual({ name: "La Brughiera", language: "it", system: "free" });
        expect(wishOf({ name: "Guado", language: "en", system: "5e" }, [])).toEqual({ name: "Guado", language: "en", system: "5e" });
        expect([wishOf({ ...form, name: "  " }, hosts), wishOf({ ...form, system: "" }, hosts)]).toEqual([undefined, undefined]);
    });
});

describe("what the pages ask of the launcher and of the way back to it (D-582)", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    afterAll(async () => {
        await setLanguage("en");
    });

    /** The server's answers by address and method, and what the page sent. */
    function answering(answers: Record<string, { status: number; body: unknown; }>): { sent: { address: string; method: string; body?: unknown; }[]; }
    {
        const sent: { address: string; method: string; body?: unknown; }[] = [];
        vi.stubGlobal("fetch", (address: string, request?: { method?: string; body?: string; }) => {
            const method = request?.method ?? "GET";
            sent.push({ address, method, ...(request?.body === undefined ? {} : { body: JSON.parse(request.body) as unknown }) });
            const answer = answers[`${method} ${address}`] ?? { status: 404, body: "Not found" };
            return Promise.resolve(new Response(typeof answer.body === "string" ? answer.body : JSON.stringify(answer.body), { status: answer.status }));
        });
        return { sent };
    }

    it("reads the launcher, and says in the page's words that it does not answer", async () => {
        const now = { launcher: true, version: "1.0.0", folder: "C:\\Users\\ada\\RPG Engine", campaigns: [listed()], hosts: [claude], systems: [{ name: "free", title: "Free play" }], languages: ["en", "it"] };
        answering({ "GET /api/launcher": { status: 200, body: now } });
        expect(await readLauncher()).toEqual(now);
        await setLanguage("it", italian);
        answering({});
        await expect(readLauncher()).rejects.toThrow("Non è arrivato al gioco: riprova.");
        vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
        await expect(readLauncher()).rejects.toThrow("Non è arrivato al gioco: riprova.");
        expect(await openCampaign("C:\\x")).toEqual({ error: "Non è arrivato al gioco: riprova." });
    });

    it("opens, makes, adds, picks and forgets, each one request of its shape, and gives a refusal in the launcher's own words, with the folder of a campaign made", async () => {
        const root = "C:\\Users\\ada\\RPG Engine\\Guadoscuro";
        const { sent } = answering({ "POST /api/launcher": { status: 200, body: { url: "http://127.0.0.1:4747", root, campaigns: [listed()], folder: root } } });
        expect(await openCampaign(root)).toMatchObject({ url: "http://127.0.0.1:4747" });
        expect(await createCampaign({ name: "Guadoscuro", language: "it", system: "free" })).toMatchObject({ url: "http://127.0.0.1:4747", root });
        expect(await addCampaign(root)).toMatchObject({ campaigns: [listed()] });
        expect(await pickFolder()).toMatchObject({ folder: root });
        expect(await forgetCampaign(root)).toMatchObject({ campaigns: [listed()] });
        expect(sent.map((one) => one.body)).toEqual([{ open: { root } }, { create: { name: "Guadoscuro", language: "it", system: "free" } }, { add: { root } }, { pick: true }, { forget: { root } }]);
        expect(sent.every((one) => one.address === "/api/launcher" && one.method === "POST")).toBe(true);
        answering({ "POST /api/launcher": { status: 409, body: { error: "The table did not start within fifteen seconds.", root } } });
        expect(await createCampaign({ name: "Guadoscuro", language: "it", system: "free" })).toEqual({ error: "The table did not start within fifteen seconds.", root });
        answering({ "POST /api/launcher": { status: 200, body: { cancelled: true } } });
        expect(await pickFolder()).toEqual({ cancelled: true });
    });

    it("knows the launcher's link while it answers and the campaign's own folder, and starts the launcher from the page where none answers", async () => {
        const root = "C:\\Users\\ada\\RPG Engine\\Guadoscuro";
        const asked = answering({ "GET /api/home": { status: 200, body: { url: "http://127.0.0.1:5000", root } } });
        expect(await readHome()).toEqual({ url: "http://127.0.0.1:5000", root });
        // The campaign's folder comes with the launcher's link: the page asks nothing else.
        expect(asked.sent.map((one) => one.address)).toEqual(["/api/home"]);
        // Reached, started first where none answers, and opened by the table in a window of its own, or not; a campaign's folder the server could not
        // tell stays unknown.
        const { sent } = answering({ "GET /api/home": { status: 200, body: { root: null } }, "POST /api/home": { status: 200, body: { url: "http://127.0.0.1:5001", window: true } } });
        expect(await readHome()).toEqual({});
        expect(await reachHome()).toEqual({ url: "http://127.0.0.1:5001", window: true });
        expect(sent.at(-1)).toEqual({ address: "/api/home", method: "POST", body: { start: true } });
        answering({ "POST /api/home": { status: 200, body: { url: "http://127.0.0.1:5001", window: false } } });
        expect(await reachHome()).toEqual({ url: "http://127.0.0.1:5001", window: false });
        answering({ "GET /api/home": { status: 200, body: {} }, "POST /api/home": { status: 409, body: { error: "Only a campaign's table starts the launcher: start it with rpg open." } } });
        expect(await reachHome()).toEqual({ error: "Only a campaign's table starts the launcher: start it with rpg open." });
        // A page whose server is gone knows nothing, and says so in its own words.
        await setLanguage("it", italian);
        vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
        expect(await readHome()).toEqual({});
        expect(await reachHome()).toEqual({ error: "Non è arrivato al gioco: riprova." });
    });
});
