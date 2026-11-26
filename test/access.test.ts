// How each AI host's account stands and how the player gets there: looked at in the background, never waited for; the sign-in started once, ended, failed or
// cancelled; the installation started once, done or failed; and the hosts that sign in and install from their own app refused in words that say where.
import { describe, expect, it } from "vitest";
import type { HostId } from "../src/core/hosts.ts";
import { accessKeeper } from "../src/helpers/index.ts";
import { drivenHelpers } from "./fake-helpers.ts";

/** A keeper over driven programs, its notices counted, its clock the test's, and the hosts whose chat is open. */
function keeperOver(helpers = drivenHelpers()): { keeper: ReturnType<typeof accessKeeper>; notices: () => number; clock: { now: number; }; open: Set<HostId>; }
{
    let notices = 0;
    const clock = { now: 0 };
    const open = new Set<HostId>();
    const keeper = accessKeeper({ helpers, changed: () => notices++, busy: (host) => open.has(host), now: () => clock.now });
    return { keeper, notices: () => notices, clock, open };
}

/** Lets the promises settled so far run their callbacks. */
async function settle(): Promise<void>
{
    await new Promise((done) => setTimeout(done, 0));
}

describe("each host's account", () => {
    it("says signed in, out or unknown from how each program stands, an API key paid by the answer, and how each host signs in and installs", async () => {
        for (const [state, account] of [["missing", "unknown"], ["logged out", "out"], ["api key", "in"], ["ready", "in"]] as const) {
            const { keeper } = keeperOver(drivenHelpers({ claude: state }, true));
            keeper.access("claudeCode");
            await settle();
            const metered = state === "api key" ? { metered: true } : {};
            expect(keeper.access("claudeCode")).toEqual({ account, ...metered, signIn: "page", install: { page: "https://code.claude.com/docs/en/setup", engine: true } });
        }

        const { keeper } = keeperOver();
        expect(keeper.access("codex")).toEqual({ account: "unknown", signIn: "page", install: { page: "https://learn.chatgpt.com/docs/codex/cli", engine: true } });
        expect(keeper.access("antigravity")).toEqual({ account: "unknown", install: { page: "https://antigravity.google/download" } });
        expect(keeper.access("openCode")).toEqual({ account: "unknown", install: { page: "https://opencode.ai/download" } });
    });

    it("never waits for a program's status: the last known at once, the new one told by a notice", async () => {
        const helpers = drivenHelpers({ codex: "ready" });
        const { keeper, notices } = keeperOver(helpers);

        expect(keeper.access("codex").account).toBe("unknown");
        expect(keeper.access("codex").account).toBe("unknown");
        expect(helpers.asked).toEqual(["look codex"]);
        helpers.answerLooks();
        await settle();
        expect(notices()).toBe(1);
        expect(keeper.access("codex").account).toBe("in");
    });

    it("looks once, never again by itself however long the page reads, and knows without looking", async () => {
        const helpers = drivenHelpers({ claude: "logged out", codex: "logged out" }, true);
        const { keeper, notices, clock } = keeperOver(helpers);
        expect(keeper.known("claudeCode").account).toBe("unknown");
        expect(helpers.asked).toEqual([]);
        keeper.access("claudeCode");
        await settle();

        for (const minutes of [1, 10, 60]) {
            clock.now = minutes * 60_000 + 1;
            keeper.access("claudeCode");
            keeper.known("claudeCode");
            await settle();
        }

        expect(helpers.asked).toEqual(["look claude"]);
        expect(notices()).toBe(1);
    });

    it("looks again when asked, a host or every one, at most every fifteen seconds each, and tells only what changed", async () => {
        const helpers = drivenHelpers({ claude: "logged out", codex: "logged out" }, true);
        const { keeper, notices, clock } = keeperOver(helpers);
        keeper.access("claudeCode");
        await settle();

        // Asked again and again, as each time the page's window comes back to the front: nothing within the fifteen seconds.
        for (let times = 0; times < 10; times++) {
            clock.now += 300;
            keeper.lookAgain();
            await settle();
        }

        expect(helpers.asked).toEqual(["look claude", "look codex"]);

        clock.now = 16_000;
        helpers.states.claude = "ready";
        keeper.lookAgain("claudeCode");
        keeper.lookAgain("claudeCode");
        await settle();
        expect(helpers.asked).toEqual(["look claude", "look codex", "look claude"]);
        expect(keeper.access("claudeCode").account).toBe("in");
        expect(notices()).toBe(3);
    });

    it("sees a player signed out outside the page, in a terminal, once the page asks again as its window comes back: the app is no longer shown ready", async () => {
        const helpers = drivenHelpers({ claude: "ready", codex: "ready" }, true);
        const { keeper, notices, clock } = keeperOver(helpers);
        keeper.access("claudeCode");
        keeper.access("codex");
        await settle();
        expect(keeper.known("codex").account).toBe("in");

        // Signed out since, the page still open: read as often as it may, nothing says so until it asks.
        helpers.states.codex = "logged out";
        keeper.access("codex");
        await settle();
        expect(keeper.known("codex").account).toBe("in");

        clock.now = 16_000;
        const before = notices();
        keeper.lookAgain();
        await settle();
        expect(keeper.known("codex")).toMatchObject({ account: "out", signIn: "page" });
        expect(notices()).toBe(before + 1);
    });

    it("never looks while a chat of the host is open, keeping the last known; the other hosts it does", async () => {
        const helpers = drivenHelpers({ claude: "ready", codex: "logged out" }, true);
        const { keeper, clock, open } = keeperOver(helpers);
        open.add("claudeCode");
        keeper.access("claudeCode");
        keeper.access("codex");
        await settle();
        clock.now = 120_000;
        keeper.lookAgain();
        await settle();
        expect(helpers.asked).toEqual(["look codex", "look codex"]);
        expect(keeper.access("claudeCode").account).toBe("unknown");

        // The chat ended: the first look comes with the next read.
        open.delete("claudeCode");
        keeper.access("claudeCode");
        await settle();
        expect(helpers.asked).toEqual(["look codex", "look codex", "look claude"]);
        expect(keeper.access("claudeCode").account).toBe("in");
    });

    it("never looks while the host's sign-in runs: its end looks, whatever the minute", async () => {
        const helpers = drivenHelpers({ codex: "logged out" }, true);
        const { keeper, clock } = keeperOver(helpers);
        keeper.access("codex");
        await settle();
        clock.now = 61_000;
        keeper.signIn("codex");
        keeper.lookAgain("codex");
        await settle();
        expect(helpers.asked).toEqual(["look codex", "login codex"]);

        helpers.states.codex = "ready";
        helpers.endLogin("codex", { state: "done" });
        await settle();
        expect(helpers.asked).toEqual(["look codex", "login codex", "look codex"]);
        expect(keeper.access("codex").account).toBe("in");
    });

    it("keeps what it knew where a look says nothing, as a status too slow or unreadable: never signed out for it", async () => {
        const helpers = drivenHelpers({ claude: "ready" }, true);
        const { keeper, clock } = keeperOver(helpers);
        keeper.access("claudeCode");
        await settle();
        expect(keeper.access("claudeCode").account).toBe("in");

        helpers.look = () => Promise.reject(new Error("claude did not say how it stands"));
        clock.now = 61_000;
        keeper.lookAgain("claudeCode");
        await settle();
        expect(keeper.access("claudeCode").account).toBe("in");
    });

    it("tells a change of the account, as after a sign-in or an installation, before the pages read again; never the first look, which finds how it stood", async () => {
        const helpers = drivenHelpers({ codex: "logged out" }, true);
        const told: string[] = [];
        const keeper = accessKeeper({ helpers, changed: () => told.push("changed"), accountChanged: (host) => told.push(`account ${host}`), now: () => 0 });
        keeper.access("codex");
        await settle();
        expect(told).toEqual(["changed"]);

        keeper.signIn("codex");
        helpers.states.codex = "ready";
        helpers.endLogin("codex", { state: "done" });
        await settle();
        expect(told.slice(-2)).toEqual(["account codex", "changed"]);
        expect(told.filter((one) => one.startsWith("account"))).toHaveLength(1);
    });

    it("says a sign-in under way in another window as such, and forgets it once a look finds the account changed", async () => {
        const helpers = drivenHelpers({ claude: "logged out" }, true);
        const { keeper, clock } = keeperOver(helpers);
        keeper.access("claudeCode");
        await settle();
        keeper.signIn("claudeCode");
        const why = "a sign-in to Claude Code is already under way in another window of RPG Engine: finish it there, or close that window, then try again";
        helpers.endLogin("claude", { state: "failed", why });
        await settle();
        expect(keeper.known("claudeCode")).toMatchObject({ account: "out", signInWhy: why, signInCode: "elsewhere" });

        // A failure of its own has no code; the other window's ends, and a look finds the player signed in there.
        helpers.states.claude = "ready";
        clock.now = 61_000;
        keeper.lookAgain("claudeCode");
        await settle();
        expect(keeper.known("claudeCode")).toEqual({ account: "in", signIn: "page", install: expect.any(Object) as unknown });
    });

    it("says each look in the log with its time, as it starts and how it ended, and nothing of what the program printed", async () => {
        const helpers = drivenHelpers({ claude: "ready", codex: "logged out" }, true);
        const logged: string[] = [];
        let clock = Date.UTC(2026, 10, 26, 0, 30);
        const keeper = accessKeeper({ helpers, changed: () => undefined, log: (line) => logged.push(line), now: () => clock });
        keeper.access("claudeCode");
        keeper.access("codex");
        await settle();
        helpers.look = () => Promise.reject(new Error("Error: token sk-secret for ada@example.org"));
        clock += 61_000;
        keeper.lookAgain("claudeCode");
        await settle();
        expect(logged).toEqual([
            "2026-11-26T00:30:00.000Z claude is asked how its account stands.",
            "2026-11-26T00:30:00.000Z codex is asked how its account stands.",
            "2026-11-26T00:30:00.000Z claude said how its account stands: in.",
            "2026-11-26T00:30:00.000Z codex said how its account stands: out.",
            "2026-11-26T00:31:01.000Z claude is asked how its account stands.",
            "2026-11-26T00:31:01.000Z claude said how its account stands: not known.",
        ]);
    });
});

describe("the sign-in from the page", () => {
    it("starts once however often it is asked, and once the player finished it says signed in", async () => {
        const helpers = drivenHelpers({ codex: "logged out" }, true);
        const { keeper, notices } = keeperOver(helpers);
        keeper.access("codex");
        await settle();

        expect(keeper.signIn("codex")).toBeUndefined();
        expect(keeper.signIn("codex")).toBeUndefined();
        expect(helpers.asked.filter((one) => one.startsWith("login"))).toEqual(["login codex"]);
        expect(keeper.access("codex")).toMatchObject({ account: "out", signingIn: true });
        const before = notices();

        helpers.states.codex = "ready";
        helpers.endLogin("codex", { state: "done" });
        await settle();
        expect(keeper.access("codex")).toEqual({ account: "in", signIn: "page", install: expect.any(Object) });
        expect(notices()).toBe(before + 2);
    });

    it("says why it failed, and a new one starts afresh", async () => {
        const helpers = drivenHelpers({ claude: "logged out" }, true);
        const { keeper } = keeperOver(helpers);
        keeper.signIn("claudeCode");
        helpers.endLogin("claude", { state: "failed", why: "it said: address already in use" });
        await settle();
        expect(keeper.access("claudeCode")).toMatchObject({ account: "out", signInWhy: "it said: address already in use" });
        expect(keeper.access("claudeCode").signingIn).toBeUndefined();

        keeper.signIn("claudeCode");
        expect(keeper.access("claudeCode")).toMatchObject({ signingIn: true });
        expect(keeper.access("claudeCode").signInWhy).toBeUndefined();
    });

    it("cancels one under way, stopping its program, and does not hear its end", async () => {
        const helpers = drivenHelpers({ codex: "logged out" }, true);
        const { keeper } = keeperOver(helpers);
        keeper.signIn("codex");
        expect(keeper.cancelSignIn("codex")).toBeUndefined();
        expect(helpers.asked).toContain("cancel codex");
        expect(keeper.access("codex").signingIn).toBeUndefined();

        helpers.endLogin("codex", { state: "failed", why: "stopped" });
        await settle();
        expect(keeper.access("codex").signInWhy).toBeUndefined();
    });

    it("refuses, saying where to go, a host that signs in from its own app, and one not on this computer", async () => {
        const helpers = drivenHelpers({ codex: "missing" }, true);
        const { keeper } = keeperOver(helpers);
        expect(keeper.signIn("antigravity")).toBe("Antigravity signs in from its own app, not from here: open Antigravity, sign in with your Google account there, then look again.");
        expect(keeper.signIn("openCode")).toContain("OpenCode plays without signing in.");
        expect(keeper.cancelSignIn("openCode")).toContain("there is no sign-in here to cancel");
        keeper.access("codex");
        await settle();
        expect(keeper.signIn("codex")).toBe("Codex is not on this computer: install it first, then sign in.");
        expect(helpers.asked.filter((one) => one.startsWith("login"))).toEqual([]);
    });
});

describe("the installation from the page", () => {
    it("starts once however often it is asked, and once done looks at the program again", async () => {
        const helpers = drivenHelpers({ claude: "missing" }, true);
        const { keeper } = keeperOver(helpers);
        keeper.access("claudeCode");
        await settle();

        expect(keeper.install("claudeCode")).toBeUndefined();
        expect(keeper.install("claudeCode")).toBeUndefined();
        expect(helpers.asked.filter((one) => one.startsWith("install"))).toEqual(["install claude"]);
        expect(keeper.access("claudeCode")).toMatchObject({ installing: true });

        helpers.states.claude = "logged out";
        helpers.endInstall("claude", undefined);
        await settle();
        expect(keeper.access("claudeCode")).toEqual({ account: "out", signIn: "page", install: { page: expect.any(String), engine: true } });
        expect(helpers.asked.filter((one) => one.startsWith("look"))).toHaveLength(2);
    });

    it("says why it failed", async () => {
        const helpers = drivenHelpers({}, true);
        const { keeper } = keeperOver(helpers);
        keeper.install("codex");
        helpers.endInstall("codex", "npm said: EACCES");
        await settle();
        expect(keeper.access("codex")).toMatchObject({ installWhy: "npm said: EACCES" });
        expect(keeper.access("codex").installing).toBeUndefined();
    });

    it("refuses a host the engine does not install, with its own page", () => {
        const { keeper } = keeperOver();
        expect(keeper.install("openCode")).toBe("RPG Engine does not install OpenCode: install it from https://opencode.ai/download, then look again.");
        expect(keeper.install("antigravity")).toContain("https://antigravity.google/download");
    });
});

describe("the sign-in's own link", () => {
    it("is shown while the sign-in waits, for a browser that did not open, and gone once it ends or is cancelled", async () => {
        const helpers = drivenHelpers({ codex: "logged out" }, true);
        const { keeper } = keeperOver(helpers);
        keeper.signIn("codex");
        await settle();
        expect(keeper.access("codex")).toMatchObject({ signingIn: true, signInLink: "https://auth.example/codex" });

        helpers.states.codex = "ready";
        helpers.endLogin("codex", { state: "done" });
        await settle();
        expect(keeper.access("codex")).not.toHaveProperty("signInLink");

        keeper.signIn("codex");
        keeper.cancelSignIn("codex");
        await settle();
        // The link of the sign-in cancelled, which came after, is never shown.
        expect(keeper.access("codex")).not.toHaveProperty("signInLink");
    });
});
