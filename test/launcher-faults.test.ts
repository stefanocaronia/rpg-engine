// The launcher where things go wrong: campaigns that cannot be read, a launcher that does not answer, two started at once, several writers of one file, paths
// written another way or that Windows cannot use, a route that throws. Everything from outside is the test's own: folders, tables, hosts, folder window.
import { execFile, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { createServer, request, type Server } from "node:http";
import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { readDataFile } from "../src/core/data-file.ts";
import { samePath } from "../src/core/paths.ts";
import { guardProcess } from "../src/core/process.ts";
import { lookUntil } from "../src/core/wait.ts";
import {
    findLauncher,
    folderName,
    holdsCampaign,
    type Launcher,
    type LauncherOptions,
    type LauncherPlace,
    type LauncherProbed,
    listCampaigns,
    makeCampaign,
    openCampaign,
    openLauncher,
    probeLauncher,
    reachLauncher,
    readLauncher,
    runLauncher,
    type TableStarter,
    windowsNameProblem,
    writeLauncher,
} from "../src/server/launcher/index.ts";
import { type Probed, readRefusal, type TablePlace, writeRefusal } from "../src/server/table/index.ts";
import { readPlace, writePlace } from "../src/server/table/place.ts";
import { pageFolder } from "./i18n/phrases.ts";
import { makeTempFolder, testContext } from "./support.ts";

const version = "1.2.3";

let home: string;
let userHome: string;
let launchers: Launcher[];
let servers: Server[];

beforeEach(() => {
    home = makeTempFolder();
    userHome = makeTempFolder();
    launchers = [];
    servers = [];
});

afterEach(async () => {
    for (const launcher of launchers) {
        await launcher.end("the test is over");
    }

    for (const server of servers) {
        server.closeAllConnections();
        await new Promise((done) => server.close(done));
    }
});

describe("campaigns that cannot be read", () => {
    it("lists each with why, in words, and every other campaign as well", async () => {
        const good = await campaignIn(join(makeTempFolder(), "good"), "Rocca");
        const folderFile = join(makeTempFolder(), "folder file");
        mkdirSync(join(folderFile, "campaign.yaml"), { recursive: true });
        writeFileSync(join(home, "campaigns.json"), JSON.stringify({ campaigns: [{ root: good }, { root: folderFile }, { root: `${userHome}${sep}bad\0name` }] }));

        const listed = await listCampaigns({ home, userHome, answers: () => Promise.resolve(false) });

        expect(listed.map((one) => one.root).sort()).toEqual([good, folderFile, `${userHome}${sep}bad\0name`].sort());
        expect(listed.find((one) => one.root === good)).toMatchObject({ name: "Rocca", missing: false });
        expect(listed.find((one) => one.root === folderFile)?.problem).toContain("its campaign.yaml is a folder, not a file. Bring it back");
        expect(listed.find((one) => one.root.endsWith("name"))?.problem).toContain("cannot be read now");
        expect(listed.map((one) => one.problem ?? "").join(" ")).not.toMatch(/EISDIR|ERR_INVALID_ARG/);
    });

    it.runIf(process.platform === "win32")("keeps one on a disk that is not there, as missing", async () => {
        const letter = [..."QRSTUVWXYZ"].find((one) => !existsSync(`${one}:\\`)) ?? "Q";
        const away = `${letter}:\\Games\\Rocca`;
        writeFileSync(join(home, "campaigns.json"), JSON.stringify({ campaigns: [{ root: away }] }));

        expect(await listCampaigns({ home, userHome, answers: () => Promise.resolve(false) })).toEqual([{ root: away, name: "Rocca", open: false, missing: true }]);
    });

    it("refuses to add one, and to open one, in words, never with a failure of the server", async () => {
        const folderFile = join(makeTempFolder(), "folder file");
        mkdirSync(join(folderFile, "campaign.yaml"), { recursive: true });
        const launcher = await startLauncher();

        expect(holdsCampaign(folderFile)).toEqual({ unreadable: expect.stringContaining("is a folder, not a file") });
        expect(await call(launcher.url, "POST", "/api/launcher", { add: { root: folderFile } })).toMatchObject({ status: 409, body: { error: expect.stringContaining("is a folder, not a file") } });
        expect(await call(launcher.url, "POST", "/api/launcher", { open: { root: folderFile } })).toMatchObject({ status: 409, body: { error: expect.stringContaining("is a folder, not a file") } });
    });

    it("reads a list written with a mark of order at its start, and drops a root that is empty or no whole path", async () => {
        const good = await campaignIn(join(makeTempFolder(), "good"), "Rocca");
        writeFileSync(join(home, "campaigns.json"), `\uFEFF${JSON.stringify({ campaigns: [{ root: good }, { root: "" }, { root: "relative/folder" }], forgotten: ["", "elsewhere"] })}`);

        expect((await listCampaigns({ home, userHome, answers: () => Promise.resolve(false) })).map((one) => one.root)).toEqual([good]);
    });
});

describe("a route that fails", () => {
    it("answers in one sentence that says what to do, never in Node's words, and the launcher goes on", async () => {
        const logged: string[] = [];
        const launcher = await startLauncher({
            hosts: () => {
                throw new Error("ENOENT: no such file or directory, open 'C:\\secret'");
            },
            log: (line) => logged.push(line),
        });
        const failed = await call(launcher.url, "GET", "/api/launcher");

        expect(failed).toMatchObject({ status: 500, body: { error: expect.stringContaining("run rpg launcher in a terminal and read what it says") } });
        expect(failed.text).not.toContain("ENOENT");
        expect(logged.join("\n")).toContain("ENOENT");
        expect(await call(launcher.url, "GET", "/api/ping")).toMatchObject({ status: 200, body: { launcher: true, version } });
    });

    it("refuses a request from elsewhere naming the launcher's own address", async () => {
        const launcher = await startLauncher();
        const refused = await call(launcher.url, "GET", "/api/launcher", undefined, { host: "evil.example" });

        expect(refused.status).toBe(403);
        expect(refused.text).toBe(`The launcher answers only its own page, at ${launcher.url}.`);
    });

    it("makes no campaign where a part of the folder's path is a file, and says so in words", async () => {
        const file = join(makeTempFolder(), "a file");
        writeFileSync(file, "mine");
        const tables = fakeTables({});
        const made = await makeCampaign({ name: "Rocca", folder: join(file, "Rocca"), language: "it", system: "fake" }, { userHome, context: testContext(userHome), now: () => new Date(0), tables });

        expect(made).toEqual({ error: expect.stringContaining(`The campaign could not be made in ${join(file, "Rocca")}`) });
        expect("error" in made && made.error).toMatch(/Choose another folder/);
        expect("error" in made && made.error).not.toMatch(/ENOTDIR|EEXIST|ENOENT|mkdir/);
        expect(tables.starts).toEqual([]);
    });
});

describe("a launcher that does not answer", () => {
    it("answers who looks for it at an address that reads no disk", async () => {
        const launcher = await startLauncher();

        expect(await call(launcher.url, "GET", "/api/ping")).toMatchObject({ status: 200, body: { launcher: true, version } });
        expect(await findLauncher(home)).toEqual({ ...launcher.place, answered: version });
    });

    it("keeps its place when it is slow or answers wrong: it is there", async () => {
        for (const answer of ["slow", "500", "not a launcher"] as const) {
            const url = await serveFake(answer);
            writeLauncher(home, { pid: process.pid, version, url, token: answer });

            expect(await findLauncher(home), answer).toEqual({ pid: process.pid, version, url, token: answer });
            expect(readLauncher(home)?.token, answer).toBe(answer);
        }
    });

    it("loses its place once nothing listens at its address, or its process is gone", async () => {
        const closed = await serveFake("500");
        servers.pop()?.close();
        writeLauncher(home, { pid: process.pid, version, url: closed, token: "closed" });
        expect(await findLauncher(home)).toBeUndefined();
        expect(readLauncher(home)).toBeUndefined();

        const ended = spawnSync(process.execPath, ["-e", ""]).pid;
        writeLauncher(home, { pid: ended, version, url: await serveFake("slow"), token: "ended" });
        expect(await findLauncher(home)).toBeUndefined();
        expect(readLauncher(home)).toBeUndefined();
    });

    it("is never doubled: reaching it says its process and how to end it, and starts none", async () => {
        writeLauncher(home, { pid: 4321, version, url: "http://127.0.0.1:5750", token: "silent" });
        let now = 0;
        let starts = 0;
        const reached = await reachLauncher(home, version, {
            probe: () => Promise.resolve("silent"),
            start: () => void starts++,
            now: () => now,
            wait: (milliseconds) => Promise.resolve(void (now += milliseconds)),
        });

        expect(reached).toEqual({ error: "RPG Engine's launcher, at http://127.0.0.1:5750, is there but does not answer: end its process, 4321, then try again." });
        expect(starts).toBe(0);
        expect(readLauncher(home)?.token).toBe("silent");
    });

    it("keeps rpg launcher from starting a second one beside it", async () => {
        const url = await serveFake("slow");
        writeLauncher(home, { pid: process.pid, version, url, token: "slow" });
        const logged: string[] = [];

        expect(await openLauncher(launcherOptions())).toEqual({ refused: expect.stringContaining(`at ${url} (process ${process.pid}) is there but does not answer`) });
        expect(await runLauncher({ ...launcherOptions(), log: (line) => logged.push(line) })).toBe(1);
        expect(logged.join("\n")).toContain("end that process, then run rpg launcher again");
        expect(readLauncher(home)?.token).toBe("slow");
    });
});

describe("a launcher that is starting", () => {
    it("answers who looks for it 503 until it looked around and kept its place, then as the launcher", async () => {
        const opening = openLauncher({ ...launcherOptions(), lookAgainFor: 1500 });
        const place = await lookUntil(async () => readLauncher(home), () => undefined, { within: 5000, every: 10 });

        expect(place).toBeDefined();
        expect(await call(place?.url ?? "", "GET", "/api/ping")).toMatchObject({ status: 503, body: { launcher: true, version, starting: true } });
        expect(await probeLauncher(place ?? launcherPlace())).toBe("starting");
        expect(await findLauncher(home)).toEqual({ ...place, starting: true });

        const opened = await opening;
        launchers.push(opened as Launcher);
        expect(await call(place?.url ?? "", "GET", "/api/ping")).toMatchObject({ status: 200, body: { launcher: true, version } });
        expect(await findLauncher(home)).toEqual({ ...place, answered: version });
    }, 20_000);

    it("is asked again by who reaches it until it answers: never asked to quit, never taken away, and no other started", async () => {
        writeLauncher(home, launcherPlace());
        const answers: LauncherProbed[] = ["starting", "starting", "starting", { version }];
        let now = 0;
        const done = { starts: 0, quits: 0 };
        const reached = await reachLauncher(home, version, {
            probe: () => Promise.resolve(answers.shift() ?? { version }),
            start: () => void done.starts++,
            quit: () => Promise.resolve(void done.quits++),
            now: () => now,
            wait: (milliseconds) => Promise.resolve(void (now += milliseconds)),
        });

        expect(reached).toEqual({ url: launcherPlace().url });
        expect(done).toEqual({ starts: 0, quits: 0 });
        expect(readLauncher(home)?.token).toBe("starting");
    });

    it("is waited for by a launcher started beside it, which then gives its link", async () => {
        writeLauncher(home, launcherPlace());
        const answers: LauncherProbed[] = ["starting", "starting", { version }];

        expect(await openLauncher(launcherOptions({ probe: () => Promise.resolve(answers.shift() ?? { version }) }))).toEqual({ running: launcherPlace().url });
        expect(answers).toEqual([]);
    });
});

describe("a place whose link is no page of this computer", () => {
    it("is read as no place, for the launcher and for a table", () => {
        for (const url of ['http://127.0.0.1:5750/" --x', "http://example.com:5750", "https://127.0.0.1:5750", "http://127.0.0.1:99999"]) {
            writeLauncher(home, { ...launcherPlace(), url });
            expect(readLauncher(home), url).toBeUndefined();
            const root = join(userHome, "Rocca");
            writePlace(home, { ...placeOf(root, "x"), url });
            expect(readPlace(home, root), url).toBeUndefined();
        }

        writeLauncher(home, launcherPlace());
        expect(readLauncher(home)).toEqual(launcherPlace());
    });
});

describe("campaigns whose folder does not answer", () => {
    it("are listed within about a second as ones that cannot be reached now, never read, beside every other campaign", async () => {
        const good = await campaignIn(join(makeTempFolder(), "good"), "Rocca");
        const away = [1, 2, 3].map((index) => join(makeTempFolder(), `away ${index}`));
        writeFileSync(join(home, "campaigns.json"), JSON.stringify({ campaigns: [good, ...away].map((root) => ({ root })) }));
        const asked = Date.now();

        const listed = await listCampaigns({ home, userHome, answers: () => Promise.resolve(false), reach: (root) => (away.includes(root) ? new Promise(() => undefined) : Promise.resolve()) });

        expect(Date.now() - asked).toBeLessThan(3000);
        expect(listed.find((one) => one.root === good)).toMatchObject({ name: "Rocca", missing: false });
        expect(listed.find((one) => one.root === good)?.problem).toBeUndefined();

        for (const root of away) {
            expect(listed.find((one) => one.root === root)).toMatchObject({ missing: false, problem: expect.stringContaining(`${root} cannot be reached now: its disk or its network share does not answer`) });
        }
    });

    it("never keep the launcher from answering: its list comes in about a second, and who looks for it is answered at once meanwhile", async () => {
        const away = [1, 2, 3, 4, 5, 6].map((index) => join(makeTempFolder(), `share ${index}`));
        writeFileSync(join(home, "campaigns.json"), JSON.stringify({ campaigns: away.map((root) => ({ root })) }));
        const launcher = await startLauncher({ reach: () => new Promise(() => undefined) });
        const asked = Date.now();
        const list = call(launcher.url, "GET", "/api/launcher");

        expect(await call(launcher.url, "GET", "/api/ping")).toMatchObject({ status: 200 });
        expect(Date.now() - asked).toBeLessThan(500);
        const listed = (await list).body as { campaigns: { root: string; problem?: string; }[]; };
        expect(Date.now() - asked).toBeLessThan(3000);
        expect(listed.campaigns.map((one) => one.root).sort()).toEqual([...away].sort());
        expect(listed.campaigns.every((one) => one.problem?.includes("cannot be reached now") === true)).toBe(true);
    });
});

describe("two launchers started at once", () => {
    it("end as one: the other gives its link and ends", async () => {
        const options = { ...launcherOptions(), lookAgainFor: 1000 };
        const opened = await Promise.all([openLauncher(options), openLauncher(options)]);
        const kept = opened.filter((one): one is Launcher => "url" in one);
        launchers.push(...kept);

        expect(kept).toHaveLength(1);
        expect(opened.filter((one) => !("url" in one))).toEqual([{ running: kept[0]?.url }]);
        expect(readLauncher(home)?.token).toBe(kept[0]?.place.token);
        expect(await call(kept[0]?.url ?? "", "GET", "/api/ping")).toMatchObject({ status: 200 });
    }, 20_000);

    it("write the list whole whatever the others write at the same moment", async () => {
        const file = join(makeTempFolder(), "campaigns.json");
        const script = join(makeTempFolder(), "writer.ts");
        writeFileSync(
            script,
            `import { writeDataFile } from ${JSON.stringify(pathToFileURL(join(import.meta.dirname, "..", "src", "core", "data-file.ts")).href)};
for (let count = 0; count < 100; count++) {
    writeDataFile(process.argv[2], { writer: process.argv[3], count, campaigns: Array.from({ length: 50 }, (_, index) => ({ root: "/games/" + index })) });
}
`,
        );
        const writers = ["a", "b", "c", "d"].map((writer) => new Promise<number>((done) => execFile(process.execPath, [script, file, writer], (error) => done(error === null ? 0 : 1))));

        expect(await Promise.all(writers)).toEqual([0, 0, 0, 0]);
        expect(readDataFile(file)).toMatchObject({ writer: expect.stringMatching(/^[abcd]$/), campaigns: expect.any(Array) });
        expect(readdirSync(join(file, "..")).filter((name) => name !== "campaigns.json")).toEqual([]);
    }, 60_000);
});

describe("a folder however it is written", () => {
    it("finds the table already there for a folder written with a separator at its end, and remembers it once", async () => {
        const root = await campaignIn(join(makeTempFolder(), "Rocca"), "Rocca");
        const tables = fakeTables({ there: { version, seated: false } });
        writePlace(home, placeOf(root, "there"));
        const launcher = await startLauncher({ tables });

        expect(await call(launcher.url, "POST", "/api/launcher", { open: { root: `${root}${sep}` } })).toMatchObject({ status: 200, body: { url: placeOf(root, "there").url } });
        expect(await call(launcher.url, "POST", "/api/launcher", { open: { root: join(root, ".", "") } })).toMatchObject({ status: 200 });
        expect(tables.starts).toEqual([]);
        const listed = await listCampaigns({ home, userHome, answers: () => Promise.resolve(true) });
        expect(listed.map((one) => one.root)).toEqual([root]);

        expect(await call(launcher.url, "POST", "/api/launcher", { forget: { root: `${root}${sep}` } })).toMatchObject({ status: 200, body: { campaigns: [] } });
    });

    it("compares paths as the system does: in any case on Windows", () => {
        expect(samePath("/games/rocca/", "/games/rocca")).toBe(true);
        expect(samePath("/games/./rocca", "/games/rocca")).toBe(true);
        expect(samePath("/games/Rocca", "/games/rocca")).toBe(process.platform === "win32");
    });
});

describe("a folder Windows cannot use as written", () => {
    it("names the part that ends with a dot or a space, or is a name kept for a device", () => {
        expect(windowsNameProblem("C:\\Games\\Rocca.")).toBe('C:\\Games\\Rocca.: the folder "Rocca." ends with a dot, which Windows takes off a folder\'s name. Choose a name without it.');
        expect(windowsNameProblem("C:\\Games \\Rocca")).toContain('the folder "Games " ends with a space');
        expect(windowsNameProblem("D:\\con\\Rocca")).toContain('"con" is a name Windows keeps for a device');
        expect(windowsNameProblem("D:\\Games\\COM1.txt")).toContain('"COM1.txt" is a name Windows keeps for a device');
        expect(windowsNameProblem("\\\\server\\share\\LPT9")).toContain('"LPT9" is a name Windows keeps for a device');
        expect(windowsNameProblem("D:\\Games\\console\\COM0\\Rocca 2\\.hidden")).toBeUndefined();
    });

    it.runIf(process.platform === "win32")("is refused as a new campaign's folder before anything is made, in a sentence; opened, added and forgotten as any other", async () => {
        const parent = makeTempFolder();
        const launcher = await startLauncher();

        for (const [folder, why] of [[join(parent, "Rocca."), "ends with a dot"], [join(parent, "aux"), "a name Windows keeps for a device"], [join(parent, "Rocca "), "ends with a space"]] as const) {
            expect(await call(launcher.url, "POST", "/api/launcher", { create: { name: "Rocca", folder, language: "it", system: "fake" } }), folder).toMatchObject({ status: 400, body: { error: expect.stringContaining(why) } });
            expect(await call(launcher.url, "POST", "/api/launcher", { add: { root: folder } }), folder).toMatchObject({ status: 409, body: { error: expect.stringContaining("is no campaign") } });
            expect(await call(launcher.url, "POST", "/api/launcher", { open: { root: folder } }), folder).toMatchObject({ status: 409 });
            expect(await call(launcher.url, "POST", "/api/launcher", { forget: { root: folder } }), folder).toMatchObject({ status: 200 });
        }

        expect(readdirSync(parent)).toEqual([]);
    });
});

describe("a campaign whose name looks like a device's", () => {
    const names = ["Con. Man", "Aux. Legions", "Con.txt", "NUL.tar.gz", "LPT1.5", "Prn.x", "con", "Rocca."];

    it("gives a folder's name Windows takes, by the one rule of the folders the page gives", () => {
        for (const name of [...names, `${"a".repeat(79)}.b`, " ... "]) {
            expect(windowsNameProblem(join("C:\\Games", folderName(name))), name).toBeUndefined();
        }

        expect(names.map(folderName)).toEqual(["Campaign", "Campaign", "Campaign", "Campaign", "Campaign", "Campaign", "Campaign", "Rocca"]);
    });

    it("is made, then opened again and taken off the list through the launcher, by the folder the list gives", async () => {
        const tables = fakeTables({ there: { version, seated: false } });
        tables.start = (root) => writePlace(home, placeOf(root, "there"));
        const launcher = await startLauncher({ tables });

        for (const name of names) {
            const made = await call(launcher.url, "POST", "/api/launcher", { create: { name, language: "it", system: "fake" } });
            const root = (made.body as { root?: string; }).root ?? "";

            expect(made, name).toMatchObject({ status: 200, body: { url: placeOf(root, "there").url } });
            expect(root.startsWith(join(userHome, "RPG Engine")), root).toBe(true);
            expect(await call(launcher.url, "POST", "/api/launcher", { open: { root } }), name).toMatchObject({ status: 200 });
            expect(await call(launcher.url, "POST", "/api/launcher", { forget: { root } }), name).toMatchObject({ status: 200 });
            expect(await listCampaigns({ home, userHome, answers: () => Promise.resolve(true) }), name).toEqual([]);
        }
    }, 60_000);

    it("takes off the list a folder that Windows would not take as written, as one kept with a space at its end", async () => {
        const kept = `${join(makeTempFolder(), "Old")} `;
        writeFileSync(join(home, "campaigns.json"), JSON.stringify({ campaigns: [{ root: kept }] }));
        const launcher = await startLauncher();

        expect((await call(launcher.url, "GET", "/api/launcher")).body).toMatchObject({ campaigns: [{ root: kept }] });
        expect(await call(launcher.url, "POST", "/api/launcher", { forget: { root: kept } })).toMatchObject({ status: 200, body: { campaigns: [] } });
    });
});

describe("the folder window and the launcher's end", () => {
    it("opens one folder window at a time", async () => {
        const windows: ((folder: string) => void)[] = [];
        const opened = (count: number): Promise<true | undefined> => lookUntil(async () => (windows.length >= count ? true : undefined), () => undefined, { within: 2000, every: 10 });
        const launcher = await startLauncher({ pick: () => new Promise((done) => windows.push(done)) });
        const first = call(launcher.url, "POST", "/api/launcher", { pick: true });
        await opened(1);

        expect(await call(launcher.url, "POST", "/api/launcher", { pick: true })).toMatchObject({ status: 409, body: { error: expect.stringContaining("open already") } });
        windows[0]?.(join(userHome, "Chosen"));
        expect(await first).toMatchObject({ status: 200, body: { folder: join(userHome, "Chosen") } });

        // Once it closed, another may open.
        const again = call(launcher.url, "POST", "/api/launcher", { pick: true });
        await opened(2);
        windows[1]?.(join(userHome, "Other"));
        expect(await again).toMatchObject({ status: 200, body: { folder: join(userHome, "Other") } });
        expect(windows).toHaveLength(2);
    });

    it("stops looking for a campaign's table once the launcher is quitting", async () => {
        const root = await campaignIn(join(makeTempFolder(), "Rocca"), "Rocca");
        let looks = 0;
        const tables = { ...fakeTables({}), quitting: () => looks++ > 0 };

        expect(await openCampaign(root, tables)).toEqual({ error: "RPG Engine's launcher is closing: open your campaigns again with rpg open, then this one." });
        expect(tables.starts).toEqual([root]);
        expect(tables.clock.now).toBeLessThan(1000);
    });

    it("gives at once why the table it started could not, as the table writes it, and none a table left from an earlier start", async () => {
        const root = await campaignIn(join(makeTempFolder(), "Rocca"), "Rocca");
        writeRefusal(home, root, "rpg table: an old refusal.");
        const refusal = "rpg table: a chat of this campaign that is still open, started by an older RPG Engine, serves its page: close that chat's app.";
        const tables = fakeTables({});

        tables.start = (started) => {
            tables.starts.push(started);
            expect(readRefusal(home, started)).toBeUndefined();
            writeRefusal(home, started, refusal);
        };

        expect(await openCampaign(root, tables)).toEqual({ error: refusal.replace("rpg table: ", "") });
        expect(tables.starts).toEqual([root]);
        expect(tables.clock.now).toBeLessThan(1000);
        // And the tests' own reading.
        expect(await openCampaign(root, { ...fakeTables({}), refused: () => "rpg table: no port is free." })).toEqual({ error: "no port is free." });
    });
});

describe("the guard of what nobody caught", () => {
    it("lets a process go on after a failed promise, and ends it after an error, its place taken away first and its programs waited for", async () => {
        const logged: string[] = [];
        const done: string[] = [];
        const unguard = guardProcess("rpg launcher", "the launcher", (line) => logged.push(line), () => done.push("cleaned"), (code) => done.push(`exit ${code}`), 5000);

        try {
            process.emit("unhandledRejection", new Error("lost"), Promise.resolve());
            expect(done).toEqual([]);
            process.emit("uncaughtException", new Error("broken"));
            expect(done).toEqual(["cleaned"]);
            await vi.waitFor(() => expect(done).toEqual(["cleaned", "exit 1"]), { timeout: 6000 });
            expect(logged[0]).toContain("rpg launcher: a promise failed with nobody to catch it; the launcher goes on.");
            expect(logged[1]).toContain("rpg launcher: an error nobody caught; the launcher ends.");
            expect(logged[2]).toMatch(/Z The programs the launcher started ended by themselves in \d+ ms\.$/);
        } finally {
            unguard();
        }
    });
});

/** A campaign made as rpg init makes it, in `folder`, with the fake system. */
async function campaignIn(folder: string, name: string): Promise<string>
{
    mkdirSync(folder, { recursive: true });
    const made = await runCommandLine(["init", "--name", name, "--language", "it", "--system", "fake"], testContext(folder));
    expect(made.exitCode, made.output).toBe(0);
    return folder;
}

/** A launcher's place, of this engine, that the test's probe answers for. */
function launcherPlace(): LauncherPlace
{
    return { pid: 4321, version, url: "http://127.0.0.1:5750", token: "starting" };
}

/** A table's place, as a table writes it once it serves. */
function placeOf(root: string, token: string): TablePlace
{
    return { root, pid: 4242, version, socket: join(home, "socket"), token, url: "http://127.0.0.1:6500" };
}

/** Tables that answer as the test says, by their place's token; a start is only counted; the clock moves only as they wait. */
function fakeTables(answers: Record<string, Probed>): TableStarter & { starts: string[]; clock: { now: number; }; }
{
    const clock = { now: 0 };
    const starts: string[] = [];
    return {
        home,
        version,
        starts,
        clock,
        start: (root) => void starts.push(root),
        probe: (place) => Promise.resolve(answers[place.token] ?? "nobody"),
        now: () => clock.now,
        wait: (milliseconds) => Promise.resolve(void (clock.now += milliseconds)),
    };
}

/** The options of a launcher in the test's folders, with fake tables, hosts and folder window. */
function launcherOptions(options: Partial<LauncherOptions> = {}): LauncherOptions
{
    return {
        home,
        userHome,
        platform: "linux",
        version,
        context: testContext(userHome),
        ports: [0],
        lookAgainFor: 0,
        page: pageFolder,
        tables: fakeTables({}),
        answers: () => Promise.resolve(false),
        pick: () => Promise.resolve(undefined),
        hosts: () => [],
        log: () => undefined,
        // No window of the system is opened in a test: the page goes to the campaign itself.
        openWindow: () => Promise.resolve(false),
        ...options,
    };
}

async function startLauncher(options: Partial<LauncherOptions> = {}): Promise<Launcher>
{
    const opened = await openLauncher(launcherOptions(options));

    if (!("url" in opened)) {
        throw new Error(`The launcher did not start: ${JSON.stringify(opened)}`);
    }

    launchers.push(opened);
    return opened;
}

/** A server at a launcher's place that is no launcher: one that never answers, one that fails, one that answers something else. Its link. */
async function serveFake(answer: "slow" | "500" | "not a launcher"): Promise<string>
{
    const server = createServer((_request, response) => {
        if (answer === "500") {
            response.writeHead(500).end("{}");
        } else if (answer === "not a launcher") {
            response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ table: true }));
        }
    });
    servers.push(server);
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const address = server.address();
    return `http://127.0.0.1:${typeof address === "object" && address !== null ? address.port : 0}`;
}

/** A request as the launcher's page sends it, with its origin on a POST: its status, its JSON and its text. */
function call(url: string, method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: unknown; text: string; }>
{
    const address = new URL(path, url);
    const own = method === "POST" ? { origin: address.origin } : {};
    return new Promise((done, fail) => {
        request(address, { method, headers: { ...own, ...headers } }, (response) => {
            let text = "";
            response.setEncoding("utf8");
            response.on("data", (chunk: string) => (text += chunk));
            response.on("end", () => done({ status: response.statusCode ?? 0, body: parsed(text), text }));
        }).on("error", fail).end(body === undefined ? undefined : JSON.stringify(body));
    });
}

function parsed(text: string): unknown
{
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return undefined;
    }
}
