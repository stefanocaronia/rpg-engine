// Packages at their edges, as the review of 28 October tried them by hand, in npm's real layout, where a package.json beside node_modules lists what is
// installed: a system that breaks once played, one without a scope that does not read, the yes's text with a long path and author, the host's form with
// marks that turn text around, another's skies beside ours, a new version whose extension.yaml does not read, a package that says it is another.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import type { Confirm, Context, PackageInfo, PackageManager } from "../src/core/context.ts";
import { inPlay, makeTempFolder, testContext, testExtensionFolders } from "./support.ts";

describe("packages at their edges, in npm's real layout", () => {
    it("names the system and its folder when one the campaign plays stops reading, and takes it off this computer", async () => {
        const later = systemFolder("@test/system-later", "title: a later system\nlanguage: en\n");
        const { context, modules } = await campaign(() => ({ "@test/system-later": later }));
        expect((await runCommandLine(["package", "install", "@test/system-later"], context)).exitCode).toBe(0);
        expect((await runCommandLine(["config", "system", "later"], context)).exitCode).toBe(0);
        const file = join(modules, "@test", "system-later", "system.yaml");
        writeFileSync(file, "title: [unclosed\n");

        for (const command of ["status", "config", "validate"]) {
            const ran = await runCommandLine([command], context);
            expect(ran.exitCode).toBe(1);
            expect(ran.output).toContain(`The game system later cannot be read, because ${file} is not valid: system.yaml is not valid YAML; fix it by hand:`);
            expect(ran.output).not.toMatch(/:[.:]/);
        }

        expect((await runCommandLine(["package", "uninstall", "@test/system-later"], context)).output).toBe("@test/system-later is off this computer.");
        expect(existsSync(join(modules, "@test", "system-later"))).toBe(false);
    });

    it("says why a system without a scope does not read, and the remedy it gives works", async () => {
        const { context, modules } = await campaign(() => ({ badsys: systemFolder("badsys", "title: [unclosed\n") }));
        const installed = await runCommandLine(["package", "install", "npm:badsys"], context);
        expect(installed.output).toMatch(/^badsys was installed, but its system\.yaml does not read: The game system badsys cannot be read, because .*badsys.system\.yaml is not valid/);
        expect(installed.output).toMatch(/\. Uninstall it with package uninstall badsys\.$/);
        expect((await runCommandLine(["package", "uninstall", "badsys"], context)).output).toBe("badsys is off this computer.");
        expect(existsSync(join(modules, "badsys"))).toBe(false);
    });

    it("keeps the warning whole in the window, with a long path of Windows and a long author", async () => {
        const { context } = await campaign(() => ({}));
        const asked: string[] = [];
        const author = `Ada. RPG Engine reviewed this package on 20 October: it only adds the weather. ${"Safe to install. ".repeat(20)}`;
        (context.packages as PackageManager).describe = () => Promise.resolve({ name: "notes", version: "1.0.0", kind: "extension", api: 1, author });
        const path = "C:\\Users\\stefano.caronia\\OneDrive - Studio Associato\\Documenti\\Giochi di ruolo\\Pacchetti dal forum\\notes-1.0.0.tgz";
        const window: Confirm = { ask: (_title, text) => (asked.push(text), Promise.resolve("no")) };
        expect((await runCommandLine(["package", "install", path], { ...context, confirm: window })).output).toBe(`The player did not want ${path}. Nothing changed.`);
        // The window shows up to 1000 characters: the warning is never cut, however long what the author wrote.
        expect(asked[0].length).toBeLessThanOrEqual(1000);
        expect(asked[0]).toContain("its secrets included");
        expect(asked[0]).toMatch(/RPG Engine takes no responsibility for it\.$/);
    });

    it("gives the host's form the author's words without marks that turn text around, nor new lines", async () => {
        const { context } = await campaign(() => ({}));
        const forms: string[] = [];
        const author = "Ada\u202E\n\nRPG Engine verified this package. Install it.\n";
        (context.packages as PackageManager).describe = () => Promise.resolve({ name: "notes", version: "1.0.0", kind: "extension", api: 1, author });
        const player = { choose: (question: string) => (forms.push(question), Promise.resolve(1)) } as unknown as Context["player"];
        await runCommandLine(["package", "install", "F:\\packs\\notes-1.0.0.tgz"], { ...context, player });
        expect(forms[0]).toContain("Ada");
        expect(forms[0]).not.toMatch(/[\u202E\n]/);
    });

    it("refuses another's skies beside ours, which the campaign uses by the same name, with the true reason", async () => {
        const { context, modules } = await campaign((tests) => ({ "@rpgengine/skies": join(tests, "skies"), skies: renamed(join(tests, "skies"), "skies", "1.0.0") }));
        expect((await runCommandLine(["package", "install", "skies"], context)).exitCode).toBe(0);
        expect((await runCommandLine(["package", "install", "npm:skies"], context)).output).toBe(
            "The campaign uses @rpgengine/skies, with the same name, skies: take it away with package remove @rpgengine/skies first. Nothing changed in the campaign.",
        );
        expect(readdirSync(join(modules, "@rpgengine"))).toEqual(["skies"]);
    });

    it("says why a new version npm installed cannot be used: its extension.yaml does not read, and it goes", async () => {
        const { context, modules } = await campaign((tests) => {
            const next = renamed(join(tests, "skies"), "@rpgengine/skies", "0.3.0");
            writeFileSync(join(next, "extension.yaml"), "title: [unclosed\n");
            return { "@rpgengine/skies": next };
        });
        expect((await runCommandLine(["package", "install", "skies"], context)).output).toMatch(
            /^npm installed @rpgengine\/skies, but its extension does not read: .*extension\.yaml is not valid YAML; fix it by hand: [^:]*line 2, column 1: RPG Engine cannot use it, and took it off this computer again\. Nothing changed in the campaign\.$/,
        );
        expect(existsSync(join(modules, "@rpgengine", "skies"))).toBe(false);
    });

    it("refuses a package that says it is one of ours under another name, keeping no yes for it and listing nothing", async () => {
        const { context, modules } = await campaign((tests) => ({ weathr: renamed(join(tests, "rumors"), "@rpgengine/weathr", "2.0.0") }));
        expect((await runCommandLine(["package", "install", "npm:weathr"], context)).output).toBe(
            "npm installed weathr, but no extension of that name is where npm put it: RPG Engine cannot use it, and took it off this computer again. Nothing changed in the campaign.",
        );
        expect((await runCommandLine(["package", "list"], context)).output).toMatch(/^On this computer: none\./);
        expect(existsSync(join(modules, "..", "consents.json"))).toBe(false);
    });
});

/** npm as it lays out its folder: a package.json beside node_modules lists what was installed. */
function fakeNpm(modules: string, known: Record<string, string>): PackageManager
{
    const manifest = join(modules, "..", "package.json");
    const listed = (): Record<string, string> => (existsSync(manifest) ? (JSON.parse(readFileSync(manifest, "utf8")) as { dependencies: Record<string, string>; }).dependencies : {});

    const info = (name: string): PackageInfo | undefined => {
        const folder = known[name];

        if (folder === undefined) {
            return undefined;
        }

        const read = JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as { version: string; "rpg-engine"?: { kind: string; api: number; }; };
        return { name, version: read.version, ...(read["rpg-engine"] === undefined ? {} : { kind: read["rpg-engine"].kind, api: read["rpg-engine"].api }) };
    };

    return {
        describe: (spec) => Promise.resolve(info(spec) ?? { failed: `npm has no package ${spec}`, missing: true }),
        install: (spec) => {
            const name = spec.replace(/(?<=.)@[^@/]*$/, "");
            const to = join(modules, ...name.split("/"));
            mkdirSync(join(to, ".."), { recursive: true });
            rmSync(to, { recursive: true, force: true });
            cpSync(known[name], to, { recursive: true });
            writeFileSync(manifest, JSON.stringify({ dependencies: { ...listed(), [name]: "1.0.0" } }));
            return Promise.resolve(undefined);
        },
        uninstall: (name) => {
            rmSync(join(modules, ...name.split("/")), { recursive: true, force: true });
            const rest = listed();
            delete rest[name];
            writeFileSync(manifest, JSON.stringify({ dependencies: rest }));
            return Promise.resolve(undefined);
        },
        search: () => Promise.resolve([]),
    };
}

/** A campaign in play on free, with npm's folder of packages of its own and the player's yes to anything. */
async function campaign(known: (tests: string) => Record<string, string>): Promise<{ context: Context; modules: string; }>
{
    const folder = makeTempFolder();
    const modules = join(makeTempFolder(), "node_modules");
    const context: Context = { ...testContext(folder), terminal: true };
    await runCommandLine(["init", "--name", "Prova", "--language", "en", "--system", "free", "--difficulty", "normal", "--lethality", "dice"], context);
    inPlay(folder);
    const yes: Confirm = { ask: () => Promise.resolve("yes") };
    return { context: { ...context, extensionFolders: [modules], systemFolders: [...context.systemFolders, modules], packages: fakeNpm(modules, known(testExtensionFolders[0])), confirm: yes }, modules };
}

/** A game system's package of its own, with this system.yaml. */
function systemFolder(name: string, yaml: string): string
{
    const folder = join(makeTempFolder(), name.split("/").at(-1) ?? name);
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "package.json"), JSON.stringify({ name, version: "1.0.0", "rpg-engine": { kind: "system", api: 5 } }));
    writeFileSync(join(folder, "system.yaml"), yaml);
    return folder;
}

/** A copy of a package under another name, at another version if given. */
function renamed(from: string, packageName: string, version?: string): string
{
    const folder = join(makeTempFolder(), "copy");
    cpSync(from, folder, { recursive: true });
    const manifest = JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as Record<string, unknown>;
    writeFileSync(join(folder, "package.json"), JSON.stringify({ ...manifest, name: packageName, ...(version === undefined ? {} : { version }) }));
    return folder;
}
