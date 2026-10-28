// A game system's code with the extensions' contract (D-514), on the fake system: its command, which the player may run from the page too, its widget declared
// in system.yaml, a line when time passes, and asking in the card of its widget; an extension's hooks after the system's, and what its code may write (D-511).
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCommandLine } from "../src/command-line.ts";
import { ask } from "../src/commands/ask.ts";
import { packageCommands } from "../src/commands/game-package-code.ts";
import { campaignWidgets } from "../src/commands/game-widgets.ts";
import type { Context, Rows } from "../src/core/context.ts";
import { SessionStore } from "../src/core/session-store.ts";
import { startDashboard } from "../src/server/dashboard/index.ts";
import { findSystem } from "../src/systems/index.ts";
import { inPlay, makeTempFolder, readLogFile, removeFolder, testContext } from "./support.ts";

let folder: string;
let context: Context;

beforeEach(async () => {
    folder = makeTempFolder();
    context = testContext(folder);
    await ok("init", "--name", "Fenmoor", "--language", "en", "--system", "fake", "--difficulty", "normal", "--lethality", "dice");
    await ok("config", "harshness", "gentle");
    inPlay(folder);
    await ok("write", "Tamsin", "--type", "character", "--set", "role=pc", "--set", "vocations=[[Warden]] 1", "--set", "might=5");
});

afterEach(() => removeFolder(folder));

describe("a game system's code, as a package's (D-514)", () => {
    it("gives its command beside the core's, named as the system, which the player may run from the page too", async () => {
        expect(await ok("fake-fading", "Tamsin")).toBe("Tamsin is not Down.");
        await ok("change", "Tamsin", "grit", "--to=0");
        expect(await ok("fake-fading", "Tamsin")).toBe("Tamsin is Down: fading 0/3.");
        const { commands, sources, problems } = await packageCommands(folder, context, []);
        expect(commands.map((command) => [command.name, command.forPlayer])).toEqual([["fake-fading", true]]);
        expect(sources["fake-fading"]).toMatch(/^@rpgengine\/system-fake@1\.0\.0#/);
        expect(problems).toEqual([]);

        const session = new SessionStore({ systemFolders: context.systemFolders, watchFolder: () => ({ close: () => undefined }) });
        const dashboard = await startDashboard({ ...context, files: session }, session, { ports: [0], page: folder });

        try {
            const port = Number(new URL(dashboard?.url ?? "").port);
            const answer = await post(port, "/api/run", { command: "fake-fading", input: { who: "Tamsin" } });
            expect(JSON.parse(answer)).toEqual({ text: "Tamsin is Down: fading 0/3." });
        } finally {
            await dashboard?.close();
            session.close();
        }
    });

    it("shows the widget its system.yaml declares, in its words, and says a new day to who is Down, keeping it in its state", async () => {
        expect(findSystem(context.systemFolders, "fake")?.widgets).toEqual([
            { name: "rally", title: "Rally", icon: "fade", place: "side", order: 0 },
            { name: "down", title: "Down", icon: "fade", place: "person", order: 0 },
        ]);
        const [quiet] = await campaignWidgets(folder, context);
        expect(quiet).toMatchObject({ id: "fake.rally", extension: "fake", title: "Rally", place: "side", icon: "M4 12h16 M12 4v16" });
        expect(quiet.shows).toBeUndefined();
        expect(quiet).not.toHaveProperty("problem");

        await ok("change", "Tamsin", "grit", "--to=0");
        await ok("config", "language", "it");
        const [down] = await campaignWidgets(folder, context);
        expect(down).toMatchObject({ title: "Riscossa", shows: { says: "Tamsin is Down", parts: [{ who: "Tamsin", does: "fades" }, { track: { label: "Svanisce", value: 0, max: 3 } }] } });

        await ok("advance", "--to", "day 1, 08:00");
        expect(await ok("advance", "--by", "1d")).toContain("Tamsin is still Down on day 2.");
        expect(readFileSync(join(folder, "extensions", "fake", "state.yaml"), "utf8")).toBe("# The state of the game system @rpgengine/system-fake, kept by its code.\nday: 2\ndown:\n  - Tamsin\n");
    });

    it("shows its widget in place person on each of the party it gives something for, by name, and keeps it there or off (D-514)", async () => {
        await ok("write", "Odo", "--type", "character", "--set", "role=companion", "--set", "vocations=[[Warden]] 1");
        const none = (await campaignWidgets(folder, context))[1];
        expect(none).toMatchObject({ id: "fake.down", place: "person", own: { place: "person" } });
        expect(none).not.toHaveProperty("people");
        expect(none).not.toHaveProperty("shows");

        await ok("change", "Tamsin", "grit", "--to=0");
        await ok("change", "Tamsin", "fading", "--to=2");
        await ok("config", "language", "it");
        const down = (await campaignWidgets(folder, context))[1];
        expect(Object.keys(down.people ?? {})).toEqual(["Tamsin"]);
        expect(down.people?.Tamsin).toEqual({
            icon: "M4 12h16 M12 4v16",
            chip: "A terra",
            says: { text: "{who} è a terra, svanisce {marked} su {most}", values: { who: "Tamsin", marked: 2, most: 3 } },
            parts: [{ lead: "A terra", tone: "bad" }, { track: { label: "Svanisce", value: 2, max: 3, tone: "bad", stage: "end", field: "fading" } }],
        });

        // Only there or nowhere; nothing else comes there.
        expect((await runCommandLine(["config", "widgets", "fake.down: side"], context)).output).toBe("fake.down stands on each of the party: write fake.down: off, or fake.down: person. Nothing changed.");
        // Another comes there too, a small card on each (D-516), its hook given who.
        await ok("config", "widgets", "fake.rally: person");
        expect((await campaignWidgets(folder, context))[0]).toMatchObject({ place: "person", people: { Tamsin: { parts: [{ who: "Tamsin" }, { track: { label: "Svanisce", value: 2 } }] } } });
        await ok("config", "widgets", "--remove", "fake.rally");
        await ok("config", "widgets", "fake.down: off");
        expect((await campaignWidgets(folder, context))[1]).toMatchObject({ place: "off" });
        expect((await campaignWidgets(folder, context))[1]).not.toHaveProperty("people");
    });

    it("asks a rally in the card of its widget, with no button to turn it down, and the card read once the call ends (D-507)", async () => {
        await ok("change", "Tamsin", "grit", "--to=0");
        const asked: { labels: string[]; rows?: Rows | undefined; }[] = [];
        const ended: unknown[] = [];
        const page: Context["page"] = {
            choose: async (_question, _title, labels, _signal, rows) => (asked.push({ labels, rows }), 0),
            cardEnded: (card) => void card.shows().then((shows) => ended.push({ widget: card.widget, key: card.key, shows })),
        };
        const rising = { ...context, page, random: () => 6 };
        expect(ask.format(await ask.run(ask.input.parse({ question: "Tamsin tries to rise", options: ["Rally 2d6"] }), rising))).toContain("Tamsin rallies: grit 1, fading 0.");
        expect(asked[0]).toMatchObject({ labels: ["Roll: Rally (2d6)"], rows: { who: "Tamsin", rule: "10 or more rallies", card: { widget: "fake.rally", key: "Tamsin" } } });
        // Risen, the card still shows who it asked for.
        await vi.waitFor(() => expect(ended).toMatchObject([{ widget: "fake.rally", key: "Tamsin", shows: { parts: [{ who: "Tamsin" }, { track: { value: 0 } }] } }]));

        // Another roll, or one not Down, is asked as always.
        await ok("change", "Tamsin", "grit", "--to=0");
        await ask.run(ask.input.parse({ question: "Tamsin lifts the gate", options: ["Might 2d6+1"] }), { ...context, page });
        expect(asked[1].labels).toEqual(["Roll: Might (2d6+1)", "Change my mind"]);
        expect(asked[1].rows).not.toHaveProperty("card");
    });
});

describe("what a system.yaml declares for the dashboard (D-514)", () => {
    it("has the keys and limits of an extension.yaml", () => {
        const systems = makeTempFolder();

        const write = (name: string, parts: string): void => {
            mkdirSync(join(systems, name));
            writeFileSync(join(systems, name, "system.yaml"), `title: ${name}\nlanguage: en\n${parts}`);
        };

        write("strayicon", "widgets:\n  luck: {title: Luck, icon: clover, place: top}\n");
        write("nopage", "widgets:\n  luck: {title: Luck, place: page}\n");
        write("many", `figures:\n${Array.from({ length: 9 }, (_, index) => `  f${index}: {width: 20, height: 20}\n`).join("")}`);
        expect(() => findSystem([systems], "strayicon")).toThrow(/is not valid: widgets\.luck\.icon: the icon clover is not among the icons: add it there\.$/);
        expect(() => findSystem([systems], "nopage")).toThrow(/widgets\.luck: a widget in place page names its page/);
        expect(() => findSystem([systems], "many")).toThrow(/is not valid: a game system declares at most 40 icons, 8 widgets and 8 figures\.$/);
    });
});

/** A folder of packages with the extension @rpgengine/<name>, whose code is given, made for this API or the one given; the campaign lists it. */
function extension(name: string, code: string, api = 5): void
{
    const own = join(folder, "packages", name);
    mkdirSync(join(own, "src"), { recursive: true });
    writeFileSync(join(own, "package.json"), JSON.stringify({ name: `@rpgengine/${name}`, version: "1.0.0", main: "dist/index.js", "rpg-engine": { kind: "extension", api } }));
    writeFileSync(join(own, "extension.yaml"), `title: ${name}\nabout: a test extension\nlanguage: en\n`);
    writeFileSync(join(own, "src", "index.ts"), code);
    const listed = context.extensionFolders?.[0] === join(folder, "packages");
    context = { ...context, extensionFolders: [join(folder, "packages")] };
    appendFileSync(join(folder, "campaign.yaml"), `${listed ? "" : "extensions:\n"}  "@rpgengine/${name}": 1.0.0\n`);
}

describe("the drawings of effects by their names (D-516)", () => {
    it("are the system's for any effect, with its extensions' and then the campaign's over them", async () => {
        extension("halos", "export default () => ({});\n");
        appendFileSync(join(folder, "packages", "halos", "extension.yaml"), 'condition-icons:\n  Steadied: "M4 12h16"\n  Down: "M1 1h2"\n');
        await ok("effect", "add", "Tamsin", "Steadied");
        await ok("effect", "add", "Tamsin", "Asleep");
        await ok("effect", "add", "Tamsin", "Lucky");
        const icons = async () => Object.fromEntries((JSON.parse(await ok("view", "--json")).party[0].effects as { name: string; icon?: string; }[]).map((effect) => [effect.name, effect.icon]));
        // Asleep the system's, a condition; Steadied the extension's, an effect that is none; Lucky none.
        expect(await icons()).toEqual({ Steadied: "M4 12h16", Asleep: "M4.5 7.5h5l-5 6h5", Lucky: undefined });
        await ok("config", "condition-icons", 'Lucky: "M12 3v18"');
        await ok("config", "condition-icons", 'Steadied: "M3 3h18"');
        expect(await icons()).toEqual({ Steadied: "M3 3h18", Asleep: "M4.5 7.5h5l-5 6h5", Lucky: "M12 3v18" });
    });
});

describe("an extension's code under the same contract (D-511, D-514)", () => {
    beforeEach(() => {
        extension(
            "echoes",
            [
                "export default ({ z }) => ({",
                '    commands: [{ name: "echoes", description: "Pins someone.", input: z.object({ who: z.string() }), positionals: ["who"],',
                '        run: ({ who }, game) => { const notes = game.addEffect(who, "Pinned", "an echo"); game.set(who, { RESOLVE: 0 }, "an echo"); return JSON.stringify(notes); } }],',
                '    counterChanged: (change) => (change.field === "grit" ? [`An echo hears ${change.page}: grit ${change.after}.`] : []),',
                '    turnStarted: () => { throw new Error("broken: on purpose"); },',
                '    asking: ({ checks, notations }) => (notations.length > 0 ? { decline: false, rule: `The echo asks ${checks.join(", ")}` } : undefined),',
                "});",
                "",
            ].join("\n"),
        );
    });

    it("is called after the system's hooks, in order, its failure a line of its own, the change made all the same", async () => {
        expect(await ok("validate")).not.toContain("echoes");
        const fell = await ok("change", "Tamsin", "grit", "--to=0");
        expect(fell.indexOf("Tamsin falls")).toBeGreaterThan(-1);
        expect(fell.indexOf("An echo hears Tamsin: grit 0.")).toBeGreaterThan(fell.indexOf("Tamsin falls"));
        await ok("scene", "open", "--title", "The causeway", "--type", "combat", "--with", "Tamsin", "--creatures", "Bog Hound=1");
        await ok("scene", "order", "--order", "Bog Hound 1", "--order", "Tamsin");
        const turn = await ok("scene", "next");
        expect(turn).toContain("Tamsin fades: fading 1/3.");
        expect(turn).toContain("The extension echoes failed after this turn began: broken: on purpose. It is done all the same;");
    });

    it("words the core's ask when the system does not, the system first", async () => {
        const asked: (Rows | undefined)[] = [];
        const page: Context["page"] = { choose: async (_question, _title, _labels, _signal, rows) => (asked.push(rows), 0) };
        // An entry loads the extensions' code as it starts, as the command line does.
        await ok("validate");
        await ask.run(ask.input.parse({ question: "Tamsin lifts the gate", options: ["Might 2d6+1"] }), { ...context, page });
        await ok("change", "Tamsin", "grit", "--to=0");
        await ask.run(ask.input.parse({ question: "Tamsin tries to rise", options: ["Rally 2d6"] }), { ...context, page });
        expect(asked.map((rows) => rows?.rule)).toEqual(["The echo asks Might", "10 or more rallies"]);
    });

    it("adds and ends effects and sets any field of any page, under the system's name for it, each with its line in the log", async () => {
        expect(await ok("echoes", "Tamsin")).toBe("[]");
        expect(readFileSync(join(folder, "world", "characters", "Tamsin.md"), "utf8")).toContain("Pinned");
        expect(await ok("view", "Tamsin")).toContain("resolve 0/");
        expect(readLogFile(folder).slice(-2)).toMatchObject([{ type: "effect-added", data: { page: "Tamsin", effect: "Pinned", why: "an echo" } }, {
            type: "counter-changed",
            data: { field: "resolve", after: expect.stringMatching(/^0/) },
        }]);
    });

    it("may not have the name of the campaign's game system: validate leaves it out, and it is not added (D-514)", async () => {
        extension("fake", "export default () => ({});\n");
        expect(await ok("validate")).toContain("The extension @rpgengine/fake has the name of the game system the campaign plays, fake: it is left out.");
        const npm = { describe: () => Promise.resolve({ name: "@rpgengine/fake", version: "1.0.0", kind: "extension", api: 5 }), install: () => Promise.resolve(undefined) };
        const added = await runCommandLine(["package", "install", "fake"], { ...context, packages: npm as unknown as Context["packages"] });
        expect(added.output).toContain("fake is installed on this computer, but it has the name of the game system the campaign plays: the campaign does not use it.");
    });
});

describe("a game system's own lines and problems (D-514)", () => {
    it("logs its lines as a system's, and says to install it again with package for code that does not load", async () => {
        await ok("change", "Tamsin", "grit", "--to=0");
        await ok("advance", "--to", "day 1, 08:00");
        await ok("advance", "--by", "1d");
        expect(readLogFile(folder).find((entry) => entry.type === "system")).toMatchObject({ visibility: "hidden", data: { system: "fake", text: "a new day with Tamsin Down" } });

        const other = makeTempFolder();
        const own = { ...testContext(other), systemCode: { ...context.systemCode, fake: { problem: "broken on purpose" } } };
        await runCommandLine(["init", "--name", "Altra", "--language", "en", "--system", "fake", "--difficulty", "normal", "--lethality", "dice"], own);
        expect((await runCommandLine(["validate"], own)).output).toContain(
            "The code of the game system @rpgengine/system-fake cannot be used: broken on purpose. Its commands are left out. Fix: install it again, or another version, with package install fake.",
        );
    });
});

/** A POST to the dashboard, as its page sends it: the body of the answer. */
function post(port: number, path: string, body: unknown): Promise<string>
{
    return new Promise((done, fail) => {
        const headers = { origin: `http://127.0.0.1:${port}`, "content-type": "application/json" };
        request({ host: "127.0.0.1", port, path, method: "POST", headers }, (response) => {
            let text = "";
            response.setEncoding("utf8");
            response.on("data", (chunk: string) => (text += chunk));
            response.on("end", () => done(text));
        }).on("error", fail).end(JSON.stringify(body));
    });
}

async function ok(...args: string[]): Promise<string>
{
    const result = await runCommandLine(args, context);
    expect(result.exitCode, result.output).toBe(0);
    return result.output;
}
