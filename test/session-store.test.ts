// The store of a session of the MCP server (D-137, D-193): what a call read stays for the next ones until a watcher names it; a full check when a watcher
// fails or names nothing, and at instructions; a write starts from the disk's text. A warm session answers as a new process would.
import fc from "fast-check";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { campaignWorld } from "../src/commands/game-world.ts";
import type { Context } from "../src/core/context.ts";
import { SessionStore, type WatchFolder } from "../src/core/session-store.ts";
import { files, withFiles } from "../src/core/store.ts";
import { checkWorld, type World } from "../src/pages/index.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

/** A watcher of the tests: the folder it watches, what it tells the store, and whether it is still open. */
interface FakeWatcher
{
    folder: string;
    changed: (name: string | undefined) => void;
    failed: () => void;
    open: boolean;
}

let folder: string;
let context: Context;
let watchers: FakeWatcher[];
let unwatchable: string | undefined;
let session: SessionStore;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    watchers = [];
    unwatchable = undefined;
    session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: fakeWatcher });
    await fresh("init", "--name", "Guadoscuro", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    await fresh("write", "Locanda", "--type", "place");
    await fresh("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "grit=12/12");
    await fresh("write", "Locanda", "--add", "contains=[[Ennio]]");
});

afterEach(() => {
    session.close();
    removeFolder(folder);
});

/** A watcher of one folder that reports what the test tells it, as Node's would: a name in the folder, or none; it fails on the folder the test says. */
const fakeWatcher: WatchFolder = (watchedFolder, changed, failed) => {
    if (resolve(watchedFolder) === unwatchable) {
        throw new Error(`EPERM: operation not permitted, watch '${watchedFolder}'`);
    }

    const watcher = { folder: resolve(watchedFolder), changed, failed, open: true };
    watchers.push(watcher);
    return { close: () => (watcher.open = false) };
};

/** A command in a new process, which reads every file afresh. */
async function fresh(...args: string[]): Promise<string>
{
    return (await runCommandLine(args, context)).output;
}

/** A command in the session, made ready first as the MCP server does before every call. */
async function warm(...args: string[]): Promise<string>
{
    await session.ready(args[0] === "instructions");
    return (await runCommandLine(args, { ...context, files: session })).output;
}

/** Writes a file by hand, and has the watcher of its folder name it unless told not to. */
function byHand(relativePath: string, text: string | undefined, report = true): void
{
    const path = join(folder, relativePath);

    if (text === undefined) {
        rmSync(path);
    } else {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, text);
    }

    if (report) {
        tell(dirname(path), relativePath.split("/").at(-1));
    }
}

function tell(watchedFolder: string, name: string | undefined): void
{
    openWatcher(watchedFolder)?.changed(name);
}

function openWatcher(watchedFolder: string): FakeWatcher | undefined
{
    return watchers.find((watcher) => watcher.open && watcher.folder === resolve(watchedFolder));
}

/** The folders watched now, from the campaign's, once for each watcher open. */
function watchedFolders(): string[]
{
    return watchers.filter((watcher) => watcher.open).map((watcher) => watcher.folder.slice(resolve(folder).length).replaceAll("\\", "/")).sort();
}

function sessionWorld(): World
{
    return withFiles(session, () => campaignWorld(folder, context));
}

const ennio = (grit: string): string => `---\nrole: pc\ngrit: ${grit}\n---\n`;

describe("the store of a session", () => {
    it("keeps what a call read for the next calls, until a watcher names the file", async () => {
        expect(await warm("status")).toContain("grit 12/12");
        byHand("world/characters/Ennio.md", ennio("5/12"), false);
        expect(await warm("status")).toContain("grit 12/12");
        tell(join(folder, "world", "characters"), "Ennio.md");
        expect(await warm("status")).toContain("grit 5/12");
    });

    it("reads again only the files its watchers name, and builds nothing again for what changes nothing", async () => {
        await warm("status");
        byHand("world/places/Locanda.md", "Una locanda nuova.\n", false);
        byHand("world/characters/Ennio.md", ennio("8/12"));
        expect(await warm("status")).toContain("grit 8/12");
        expect(await warm("show", "Locanda")).not.toContain("Una locanda nuova.");
        // A write that finds its file as the store kept it trusts the watchers too.
        await warm("change", "Ennio", "grit", "--by=-1");
        expect(await warm("show", "Locanda")).not.toContain("Una locanda nuova.");
        // A file saved as it was, a file no call reads, and a full check after it, each build nothing again at the next call.
        const first = sessionWorld();
        byHand("world/characters/Ennio.md", readFileSync(join(folder, "world", "characters", "Ennio.md"), "utf8"));
        await session.ready();
        expect(sessionWorld()).toBe(first);
        byHand("world/places/appunti.txt", "Da rivedere.\n");
        await session.ready();
        const second = sessionWorld();
        await session.ready();
        expect(sessionWorld()).toBe(second);
        byHand("world/places/appunti.txt", "Rivisto.\n");
        await session.ready(true);
        const third = sessionWorld();
        await session.ready();
        expect(sessionWorld()).toBe(third);
    });

    it("sees a new page, a page gone, and a folder renamed, from the names the watchers give", async () => {
        await warm("status");
        byHand("world/places/Valle/Mulino.md", "Il mulino.\n");
        tell(join(folder, "world", "places"), "Valle");
        expect(await warm("show", "Mulino")).toContain("Il mulino.");
        renameSync(join(folder, "world", "places", "Valle"), join(folder, "world", "places", "Piana"));
        tell(join(folder, "world", "places"), "Valle");
        tell(join(folder, "world", "places"), "Piana");
        // A page left behind under the old name would make two pages named Mulino.
        expect(await warm("show", "Mulino")).toContain("Il mulino.");
        byHand("world/places/Piana/Mulino.md", undefined);
        expect(await warm("show", "Mulino")).toContain("There is no page named Mulino");
    });

    it("forgets a folder removed by hand, with its pages, and stops watching it", async () => {
        byHand("world/places/Valle/Mulino.md", "Il mulino.\n", false);
        expect(await warm("show", "Mulino")).toContain("Il mulino.");
        rmSync(join(folder, "world", "places", "Valle"), { recursive: true });
        tell(join(folder, "world", "places"), "Valle");
        expect(await warm("show", "Mulino")).toContain("There is no page named Mulino");
        expect(watchedFolders()).toContain("/world/places");
        expect(watchedFolders()).not.toContain("/world/places/Valle");
        // The same folder made again is watched again.
        byHand("world/places/Valle/Mulino.md", "Il mulino nuovo.\n", false);
        tell(join(folder, "world", "places"), "Valle");
        expect(await warm("show", "Mulino")).toContain("Il mulino nuovo.");
        expect(watchedFolders()).toContain("/world/places/Valle");
    });

    it("sees house rules in a rules folder made by hand", async () => {
        expect(await warm("rules", "veleno ragni")).not.toContain("(house rule)");
        byHand("rules/Veleni.md", "# Veleni\n\nIl veleno dei ragni dura un'ora.\n", false);
        tell(folder, "rules");
        expect(await warm("rules", "veleno ragni")).toContain("Veleni (house rule)");
    });

    it("checks everything when a watcher names nothing, and at instructions", async () => {
        await warm("status");
        byHand("world/characters/Ennio.md", ennio("4/12"), false);
        tell(join(folder, "world", "characters"), undefined);
        expect(await warm("status")).toContain("grit 4/12");
        byHand("world/characters/Ennio.md", ennio("3/12"), false);
        await warm("instructions");
        expect(await warm("status")).toContain("grit 3/12");
    });

    it("checks everything when a watcher fails, or names its own folder, an empty name or nothing", async () => {
        const characters = join(folder, "world", "characters");
        const ways = [(watcher: FakeWatcher) => watcher.failed(), (watcher: FakeWatcher) => watcher.changed(characters), (watcher: FakeWatcher) => watcher.changed(""), (watcher: FakeWatcher) => watcher.changed(undefined)];

        for (const [index, lose] of ways.entries()) {
            await warm("status");
            byHand("world/places/Locanda.md", `La locanda, ${index}.\n`, false);
            const watcher = openWatcher(characters)!;
            lose(watcher);
            // Node may still give events that were on their way to a watcher lost.
            lose(watcher);
            expect(await warm("show", "Locanda")).toContain(`La locanda, ${index}.`);
        }
    });

    it("checks everything at every call while a folder of the campaign cannot be watched", async () => {
        unwatchable = resolve(folder, "world", "places");
        await warm("status");
        byHand("world/places/Locanda.md", "Una locanda nuova.\n", false);
        expect(await warm("show", "Locanda")).toContain("Una locanda nuova.");
    });

    it("checks everything at the next call when a write finds a file changed by hand", async () => {
        await warm("status");
        byHand("world/characters/Ennio.md", "---\nrole: pc\ngrit: 12/12\numore: teso\n---\n", false);
        byHand("world/places/Locanda.md", "Una locanda nuova.\n", false);
        await warm("change", "Ennio", "grit", "--by=-1");
        expect(await warm("show", "Locanda")).toContain("Una locanda nuova.");
    });

    it("writes nothing over a file changed by hand that it missed, and the command repeated starts from it (D-196)", async () => {
        const path = join(folder, "world", "characters", "Ennio.md");
        await warm("status");
        byHand("world/characters/Ennio.md", "---\nrole: pc\ngrit: 5/12\numore: teso\n---\n", false);
        expect(await warm("change", "Ennio", "grit", "--by=-1")).toBe(
            "world/characters/Ennio.md was changed by hand since this call read it, so the command wrote nothing: look at it again, as with show or status, and repeat the command if it still fits.",
        );
        expect(readFileSync(path, "utf8")).toBe("---\nrole: pc\ngrit: 5/12\numore: teso\n---\n");
        expect(await warm("change", "Ennio", "grit", "--by=-1")).toBe("Ennio: grit 5/12 → 4/12.");
        expect(readFileSync(path, "utf8")).toBe("---\nrole: pc\ngrit: 4/12\numore: teso\n---\n");
    });

    it("says so when a command stops there after it wrote other files, which repeating it would change twice (D-196)", async () => {
        const ennioPath = join(folder, "world", "characters", "Ennio.md");
        await session.ready();

        withFiles(session, () => {
            files().text(ennioPath);
            writeFileSync(ennioPath, ennio("2/12"));
            session.write(join(folder, "world", "places", "Locanda.md"), "La locanda.\n");
            expect(() => session.fresh(ennioPath)).toThrow("so the command stopped before writing it, after other files: look at them again with status and validate");
        });
    });

    it("tells each call whether it wrote itself, though the page's requests come between its steps (D-196)", async () => {
        const ennioPath = join(folder, "world", "characters", "Ennio.md");
        const campaignFile = join(folder, "campaign.yaml");
        await warm("status");
        let resume = (): void => undefined;
        const paused = new Promise<void>((done) => (resume = done));

        // The master's call writes, then waits for the player, as a package's command that asks.
        const master = withFiles(session, async () => {
            files().text(ennioPath);
            session.write(join(folder, "world", "places", "Locanda.md"), "La locanda.\n");
            await paused;
            expect(() => session.fresh(ennioPath)).toThrow("so the command stopped before writing it, after other files");
        });

        // Meanwhile a request of the page, which writes nothing.
        await session.ready();

        withFiles(session, () => {
            files().text(campaignFile);
            writeFileSync(campaignFile, readFileSync(campaignFile, "utf8").replace("Guadoscuro", "Guadochiaro"));
            expect(() => session.fresh(campaignFile)).toThrow("so the command wrote nothing");
        });

        writeFileSync(ennioPath, ennio("2/12"));
        resume();
        await master;
    });

    it("reads again what it kept of a campaign before it started watching it", async () => {
        const campaignFile = join(folder, "campaign.yaml");
        await session.ready();
        withFiles(session, () => files().text(campaignFile));
        writeFileSync(campaignFile, readFileSync(campaignFile, "utf8").replace("Guadoscuro", "Guadochiaro"));
        expect(await warm("status")).toContain("Guadochiaro");
    });

    it("reads at every call what is not of a campaign it watches: a campaign made meanwhile by another process, which init then leaves alone", async () => {
        const empty = makeTempFolder();
        const there = { ...testContext(empty), files: session };
        const init = ["init", "--name", "Rocca", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"];

        const call = async (...args: string[]): Promise<string> => {
            await session.ready();
            return (await runCommandLine(args, there)).output;
        };

        try {
            expect(await call("status")).toContain("There is no campaign here");
            await runCommandLine(init, testContext(empty));
            await runCommandLine(["advance", "--to", "day 3, 18:00"], testContext(empty));
            expect(await call(...init)).toContain("is already a campaign");
            expect(await call("status")).toContain("Rocca");
            expect(await call("status")).toContain("day 3, 18:00");
        } finally {
            removeFolder(empty);
        }
    });

    it("lets a call that comes during a full check wait for it", async () => {
        await warm("status");
        byHand("world/characters/Ennio.md", ennio("5/12"), false);
        openWatcher(join(folder, "world", "characters"))!.failed();
        const [status, show] = await Promise.all([warm("status"), warm("show", "Ennio")]);
        expect(status).toContain("grit 5/12");
        expect(show).toContain("Struggle: grit 5/12");
    });

    it("checks everything after more changes than a watcher on Linux keeps", async () => {
        await warm("status");
        byHand("world/places/Locanda.md", "Una locanda nuova.\n", false);

        for (let change = 0; change <= 10_000; change++) {
            tell(join(folder, "world", "characters"), `scarto-${change}.tmp`);
        }

        expect(await warm("show", "Locanda")).toContain("Una locanda nuova.");
    });

    it("watches again a folder that went and came back, as Linux tells it: only its name, and nothing more from its own watcher", async () => {
        mkdirSync(join(folder, "world", "places", "Senza titolo"));
        await warm("status");
        const untitled = join(folder, "world", "places", "Senza titolo");
        rmSync(untitled, { recursive: true });
        const gone = openWatcher(untitled)!;
        gone.changed("Senza titolo");
        gone.changed = () => undefined;
        tell(join(folder, "world", "places"), "Senza titolo");
        await warm("status");
        byHand("world/places/Senza titolo/Pozzo.md", "Il pozzo.\n", false);
        tell(join(folder, "world", "places"), "Senza titolo");
        expect(await warm("show", "Pozzo")).toContain("Il pozzo.");
        byHand("world/places/Senza titolo/Pozzo.md", "Il pozzo secco.\n");
        expect(await warm("show", "Pozzo")).toContain("Il pozzo secco.");
    });

    it("gives the calls the same world while nothing changes, and a new one after a page or campaign.yaml changes", async () => {
        await warm("status");
        const first = sessionWorld();
        await session.ready();
        expect(sessionWorld()).toBe(first);
        byHand("appunti.txt", "Da rivedere.\n");
        await session.ready();
        expect(sessionWorld()).toBe(first);
        byHand("world/characters/Ennio.md", ennio("6/12"));
        await session.ready();
        const second = sessionWorld();
        expect(second).not.toBe(first);
        byHand("campaign.yaml", readFileSync(join(folder, "campaign.yaml"), "utf8").replace("language: it", "language: en"));
        await session.ready();
        expect(sessionWorld()).not.toBe(second);
    });

    it("gives each campaign its own world", async () => {
        const other = makeTempFolder();

        try {
            await runCommandLine(["init", "--name", "Rocca", "--language", "it", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], testContext(other));
            await runCommandLine(["write", "Rosa", "--type", "character"], testContext(other));
            expect(withFiles(session, () => campaignWorld(other, testContext(other))).pages.map((page) => page.name)).toEqual(["Rosa"]);
            expect(sessionWorld().pages.map((page) => page.name).sort()).toEqual(["Ennio", "Locanda"]);
        } finally {
            removeFolder(other);
        }
    });

    it("finds the problems of a world once, and those of a page alone once, in each world the page is in", async () => {
        byHand("world/places/Torre.md", "## Sala\n\nUna sala.\n\n## Sala\n\nUn'altra.\n", false);
        await warm("status");
        const first = sessionWorld();
        expect(checkWorld(first)).toBe(checkWorld(first));
        await warm("instructions");
        const second = sessionWorld();
        const repeated = (world: World): unknown => checkWorld(world).find((problem) => problem.message.includes('"Sala"'));
        expect(second).not.toBe(first);
        expect(second.pages.find((page) => page.name === "Torre")).toBe(first.pages.find((page) => page.name === "Torre"));
        expect(repeated(second)).toBeDefined();
        expect(repeated(second)).toBe(repeated(first));
    });

    it("watches the campaign's folders that hold its pages and rules, and those that come, each once, until it closes", async () => {
        mkdirSync(join(folder, "rules", "casa"), { recursive: true });
        mkdirSync(join(folder, "appunti"));
        await warm("status");
        expect(watchedFolders()).toEqual(expect.arrayContaining(["", "/rules", "/rules/casa", "/world", "/world/characters", "/world/places"]));
        expect(watchedFolders()).not.toContain("/appunti");
        byHand("world/places/Valle/Mulino.md", "Il mulino.\n", false);
        tell(join(folder, "world", "places"), "Valle");
        await warm("status");
        await warm("instructions");
        expect(watchedFolders()).toContain("/world/places/Valle");
        expect(new Set(watchedFolders()).size).toBe(watchedFolders().length);
        session.close();
        expect(watchedFolders()).toEqual([]);
    });

    it("answers as a new process would, through changes by hand that its watchers name, or lose (law)", async () => {
        const steps = fc.array(
            fc.oneof(
                fc.record({ kind: fc.constant("grit"), grit: fc.integer({ min: 0, max: 12 }), lost: fc.boolean() }),
                fc.record({ kind: fc.constant("page"), name: fc.constantFrom("Rosa", "Varro", "Lena"), lost: fc.boolean() }),
                fc.record({ kind: fc.constant("gone"), name: fc.constantFrom("Rosa", "Varro", "Lena"), lost: fc.boolean() }),
                fc.record({ kind: fc.constant("change"), by: fc.integer({ min: -3, max: 3 }) }),
                fc.record({ kind: fc.constant("mute"), grit: fc.integer({ min: 0, max: 12 }) }),
            ),
            { minLength: 1, maxLength: 8 },
        );
        await fc.assert(
            fc.asyncProperty(steps, async (run) => {
                await warm("status");

                for (const [index, step] of run.entries()) {
                    if (step.kind === "change") {
                        expect(await warm("change", "Ennio", "grit", `--by=${step.by}`)).toBeDefined();
                    } else if (step.kind === "mute") {
                        // Changed by hand without a word from the watchers, then written: refused, unless the text is the same (D-196).
                        byHand("world/characters/Ennio.md", ennio(`${step.grit}/12`), false);
                        expect(await warm("write", "Ennio", "--set", `nota=passo ${index}`)).toBeDefined();
                    } else {
                        const path = step.kind === "grit" ? "world/characters/Ennio.md" : `world/characters/${step.name}.md`;
                        const text = step.kind === "grit" ? ennio(`${step.grit}/12`) : step.kind === "page" ? "---\nrole: npc\n---\n" : undefined;

                        if (text !== undefined || readFileSyncOrUndefined(join(folder, path)) !== undefined) {
                            byHand(path, text, false);
                            // A watcher names the file, or loses track of its folder.
                            tell(join(folder, "world", "characters"), step.lost ? undefined : path.split("/").at(-1));
                        }
                    }

                    for (const call of [["status"], ["find", "role"], ["show", "Ennio"], ["validate"]]) {
                        expect(await warm(...call)).toBe(await fresh(...call));
                    }
                }
            }),
            { numRuns: 15 },
        );
    }, 120000);
});

describe("the store of a session, with Node's watchers", () => {
    let real: SessionStore;

    beforeEach(() => {
        real = new SessionStore({ systemFolders: context.systemFolders });
    });

    afterEach(() => real.close());

    const call = async (...args: string[]): Promise<string> => {
        await real.ready();
        return (await runCommandLine(args, { ...context, files: real })).output;
    };

    /** Whether a call answers with `text` within a second and a half, as the watchers tell the store. */
    const answers = async (args: string[], text: string): Promise<boolean> => {
        for (let attempt = 0; attempt < 60; attempt++) {
            if ((await call(...args)).includes(text)) {
                return true;
            }

            await new Promise((done) => setTimeout(done, 25));
        }

        return false;
    };

    it("sees a page changed by hand, saved in place or through a file renamed over it", async () => {
        expect(await call("status")).toContain("grit 12/12");
        writeFileSync(join(folder, "world", "characters", "Ennio.md"), ennio("7/12"));
        expect(await answers(["status"], "grit 7/12")).toBe(true);
        writeFileSync(join(folder, "world", "characters", "Ennio.md.tmp"), ennio("2/12"));
        renameSync(join(folder, "world", "characters", "Ennio.md.tmp"), join(folder, "world", "characters", "Ennio.md"));
        expect(await answers(["status"], "grit 2/12")).toBe(true);
    });

    // Linux's watchers drop without a word what overflows the system's queue; on Windows a burst like this one loses nothing.
    it.runIf(process.platform === "linux")("sees a page changed after a burst of files made and removed while the server was busy", async () => {
        expect(await call("status")).toContain("grit 12/12");
        const characters = join(folder, "world", "characters");

        // Done in one go, as while a call keeps the server busy: the events wait in the system's queue, and overflow it.
        for (let index = 0; index < 9000; index++) {
            writeFileSync(join(characters, `scarto-${index}.tmp`), "x");
            rmSync(join(characters, `scarto-${index}.tmp`));
        }

        writeFileSync(join(characters, "Ennio.md"), ennio("3/12"));
        expect(await answers(["status"], "grit 3/12")).toBe(true);
    }, 60000);

    it("sees a folder removed by hand, whose watcher Windows floods with its own path", async () => {
        byHand("world/places/Valle/Mulino.md", "Il mulino.\n", false);
        expect(await call("show", "Mulino")).toContain("Il mulino.");
        rmSync(join(folder, "world", "places", "Valle"), { recursive: true });
        expect(await answers(["show", "Mulino"], "There is no page named Mulino")).toBe(true);
    });

    it("never keeps the process alive by itself", async () => {
        const script = `import { SessionStore } from ${JSON.stringify(new URL("../src/core/session-store.ts", import.meta.url).href)};\nnew SessionStore().track(${JSON.stringify(folder)});`;
        const child = spawn(process.execPath, ["--input-type=module", "--eval", script], { stdio: "ignore" });
        const ended = await new Promise<number | string | null>((done) => {
            const timer = setTimeout(() => (child.kill(), done("still running")), 10000);
            child.on("exit", (code) => (clearTimeout(timer), done(code)));
        });
        expect(ended).toBe(0);
    }, 15000);
});

function readFileSyncOrUndefined(path: string): string | undefined
{
    try {
        return readFileSync(path, "utf8");
    } catch {
        return undefined;
    }
}
