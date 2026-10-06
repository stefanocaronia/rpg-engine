// The store of a session of the MCP server (D-137, D-193): what a call read stays for the next ones until a watcher names it; a full check when a watcher
// fails or names nothing, and at instructions; a write starts from the disk's text. A warm session answers as a new process would.
import fc from "fast-check";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { campaignWorld } from "../src/commands/game-world.ts";
import type { Context } from "../src/core/context.ts";
import { SessionStore, type WatchFolder } from "../src/core/session-store.ts";
import { withFiles } from "../src/core/store.ts";
import { makeTempFolder, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;
let watched: Map<string, (name: string | undefined) => void>;
let session: SessionStore;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    watched = new Map();
    session = new SessionStore(fakeWatcher);
    await fresh("init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    await fresh("write", "Locanda", "--type", "place");
    await fresh("write", "Ennio", "--type", "character", "--set", "role=pc", "--set", "hp=12/12");
    await fresh("write", "Locanda", "--add", "contains=[[Ennio]]");
});

afterEach(() => {
    session.close();
    removeFolder(folder);
});

/** A watcher of one folder that reports what the test tells it, as Node's would: a name in the folder, or none. */
const fakeWatcher: WatchFolder = (watchedFolder, changed) => {
    watched.set(resolve(watchedFolder), changed);
    return { close: () => watched.delete(resolve(watchedFolder)) };
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
    watched.get(resolve(watchedFolder))?.(name);
}

const ennio = (hp: string): string => `---\nrole: pc\nhp: ${hp}\n---\n`;

describe("the store of a session", () => {
    it("keeps what a call read for the next calls, until a watcher names the file", async () => {
        expect(await warm("status")).toContain("hp 12/12");
        byHand("world/characters/Ennio.md", ennio("5/12"), false);
        expect(await warm("status")).toContain("hp 12/12");
        tell(join(folder, "world", "characters"), "Ennio.md");
        expect(await warm("status")).toContain("hp 5/12");
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

    it("checks everything when a watcher names nothing, and at instructions", async () => {
        await warm("status");
        byHand("world/characters/Ennio.md", ennio("4/12"), false);
        tell(join(folder, "world", "characters"), undefined);
        expect(await warm("status")).toContain("hp 4/12");
        byHand("world/characters/Ennio.md", ennio("3/12"), false);
        await warm("instructions");
        expect(await warm("status")).toContain("hp 3/12");
    });

    it("writes from the disk's text when it missed a change, losing nothing written by hand", async () => {
        await warm("status");
        byHand("world/characters/Ennio.md", "---\nrole: pc\nhp: 12/12\numore: teso\n---\n", false);
        expect(await warm("change", "Ennio", "hp", "--by=-2")).toBe("Ennio: hp 12/12 → 10/12.");
        expect(readFileSync(join(folder, "world", "characters", "Ennio.md"), "utf8")).toBe("---\nrole: pc\nhp: 10/12\numore: teso\n---\n");
        expect(await warm("show", "Ennio")).toContain("umore: teso");
    });

    it("gives the calls the same world while nothing changes, and a new one after a page changes", async () => {
        await warm("status");
        const world = (): unknown => withFiles(session, () => campaignWorld(folder, context));
        const first = world();
        await session.ready();
        expect(world()).toBe(first);
        byHand("world/characters/Ennio.md", ennio("6/12"));
        await session.ready();
        expect(world()).not.toBe(first);
    });

    it("watches the campaign's folders that hold its files, and those that come", async () => {
        await warm("status");
        const names = (): string[] => [...watched.keys()].map((path) => path.slice(resolve(folder).length).replaceAll("\\", "/")).sort();
        expect(names()).toEqual(expect.arrayContaining(["", "/world", "/world/characters", "/world/places"]));
        byHand("world/places/Valle/Mulino.md", "Il mulino.\n", false);
        tell(join(folder, "world", "places"), "Valle");
        await warm("status");
        expect(names()).toContain("/world/places/Valle");
    });

    it("answers as a new process would, through changes by hand that its watchers name, or lose (law)", async () => {
        const steps = fc.array(
            fc.oneof(
                fc.record({ kind: fc.constant("hp"), hp: fc.integer({ min: 0, max: 12 }), lost: fc.boolean() }),
                fc.record({ kind: fc.constant("page"), name: fc.constantFrom("Rosa", "Varro", "Lena"), lost: fc.boolean() }),
                fc.record({ kind: fc.constant("gone"), name: fc.constantFrom("Rosa", "Varro", "Lena"), lost: fc.boolean() }),
                fc.record({ kind: fc.constant("change"), by: fc.integer({ min: -3, max: 3 }) }),
            ),
            { minLength: 1, maxLength: 8 },
        );
        await fc.assert(
            fc.asyncProperty(steps, async (run) => {
                await warm("status");

                for (const step of run) {
                    if (step.kind === "change") {
                        expect(await warm("change", "Ennio", "hp", `--by=${step.by}`)).toBeDefined();
                    } else {
                        const path = step.kind === "hp" ? "world/characters/Ennio.md" : `world/characters/${step.name}.md`;
                        const text = step.kind === "hp" ? ennio(`${step.hp}/12`) : step.kind === "page" ? "---\nrole: npc\n---\n" : undefined;

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
    it("sees a page changed by hand, saved in place or through a file renamed over it", async () => {
        const real = new SessionStore();

        const call = async (...args: string[]): Promise<string> => {
            await real.ready();
            return (await runCommandLine(args, { ...context, files: real })).output;
        };

        const seen = async (hp: string): Promise<boolean> => {
            for (let attempt = 0; attempt < 60; attempt++) {
                if ((await call("status")).includes(`hp ${hp}`)) {
                    return true;
                }

                await new Promise((done) => setTimeout(done, 25));
            }

            return false;
        };

        try {
            expect(await call("status")).toContain("hp 12/12");
            writeFileSync(join(folder, "world", "characters", "Ennio.md"), ennio("7/12"));
            expect(await seen("7/12")).toBe(true);
            writeFileSync(join(folder, "world", "characters", "Ennio.md.tmp"), ennio("2/12"));
            renameSync(join(folder, "world", "characters", "Ennio.md.tmp"), join(folder, "world", "characters", "Ennio.md"));
            expect(await seen("2/12")).toBe(true);
        } finally {
            real.close();
        }
    });
});

function readFileSyncOrUndefined(path: string): string | undefined
{
    try {
        return readFileSync(path, "utf8");
    } catch {
        return undefined;
    }
}
