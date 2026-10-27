// npm without its registry (D-452, D-514): a package described by npm itself, then from what it keeps on this computer, and installed from there, with the two
// ways to have it when it keeps nothing; and the newest version this engine reads, beside a latest made for a newer API, with the engine that reads that one
// (D-515 (2)). npm and its registry are fakes here.
import { afterEach, describe, expect, it, vi } from "vitest";
import { npmPackages } from "../src/extensions/index.ts";
import type { NpmRun } from "../src/extensions/packages.ts";
import { makeTempFolder } from "./support.ts";

afterEach(() => vi.unstubAllGlobals());

const refused: NpmRun = { code: 1, out: JSON.stringify({ error: { code: "ECONNREFUSED", summary: "FetchError: request to https://registry.npmjs.org/x failed, reason: connect ECONNREFUSED" } }), errors: "" };
const uncached: NpmRun = { code: 1, out: JSON.stringify({ error: { code: "ENOTCACHED", summary: "cache mode is 'only-if-cached' but no cached response is available." } }), errors: "" };
const manifest = { name: "@rpgengine/system-5e", version: "1.0.0", main: "dist/index.js", "rpg-engine": { kind: "system", api: 5 } };

/** npm answering each command by how it begins, and saying what it was asked. */
function npmAnswering(answers: [RegExp, NpmRun][], asked: string[]): (args: string) => Promise<NpmRun>
{
    return (args) => {
        asked.push(args.replace(/"[^"]*"/g, "<folder>"));
        return Promise.resolve(answers.find(([pattern]) => pattern.test(args))?.[1] ?? { code: 0, out: "{}", errors: "" });
    };
}

describe("npm without its registry", () => {
    it("describes a package by npm, then from its cache, and installs it from there when the registry does not answer", async () => {
        vi.stubGlobal("fetch", () => Promise.reject(new TypeError("fetch failed")));
        const asked: string[] = [];
        const run = npmAnswering([
            [/^view .* --offline/, { code: 0, out: JSON.stringify(manifest), errors: "" }],
            [/^view /, refused],
            [/^install .* --offline$/, { code: 0, out: "{}", errors: "" }],
            [/^install /, refused],
        ], asked);
        const packages = npmPackages(makeTempFolder(), run);
        expect(await packages.describe("@rpgengine/system-5e")).toEqual({ name: "@rpgengine/system-5e", version: "1.0.0", kind: "system", api: 5, code: true, dependencies: false });
        expect(await packages.install("@rpgengine/system-5e@1.0.0")).toBeUndefined();
        expect(asked).toEqual([
            "view @rpgengine/system-5e --json --loglevel=error",
            "view @rpgengine/system-5e --json --offline --loglevel=error",
            "install --prefix <folder> @rpgengine/system-5e@1.0.0 --install-links=true --ignore-scripts --save-exact --no-audit --no-fund --json --loglevel=error",
            "install --prefix <folder> @rpgengine/system-5e@1.0.0 --install-links=true --ignore-scripts --save-exact --no-audit --no-fund --json --loglevel=error --offline",
        ]);
    });

    it("says the two ways to have a package npm keeps no copy of: online once, or a .tgz or a folder", async () => {
        vi.stubGlobal("fetch", () => Promise.reject(new TypeError("fetch failed")));
        const advice = "npm cannot reach its registry from this computer, and has no copy of @rpgengine/system-5e from before: connect the computer to the internet once and install it again, "
            + "or give the package as a .tgz file or a folder of this computer, such as package install D:/Downloads/rpgengine-system-5e-<version>.tgz";
        const packages = npmPackages(makeTempFolder(), npmAnswering([[/^view .* --offline/, uncached], [/^view /, refused], [/--offline$/, uncached], [/^install /, refused]], []));
        expect(await packages.describe("@rpgengine/system-5e")).toEqual({ failed: advice });
        expect(await packages.install("@rpgengine/system-5e@1.0.0")).toBe(advice);
        // A package npm has no such name for is no network's fault.
        const missing = npmPackages(makeTempFolder(), npmAnswering([[/^view /, { code: 1, out: JSON.stringify({ error: { code: "E404", summary: "Not Found" } }), errors: "" }]], []));
        expect(await missing.describe("@rpgengine/nothing")).toEqual({ failed: "npm has no package @rpgengine/nothing", missing: true });
    });
});

describe("the newest version this engine reads (D-515 (2))", () => {
    it("offers it by the package's name alone, with its latest and the first rpg-engine on npm that reads that one; a version asked is as it is", async () => {
        const versions = {
            "1.0.0": { ...manifest, version: "1.0.0" },
            "1.1.0": { ...manifest, version: "1.1.0" },
            "2.0.0-beta": { ...manifest, version: "2.0.0-beta", "rpg-engine": { kind: "system", api: 99 } },
            "2.0.0": { ...manifest, version: "2.0.0", "rpg-engine": { kind: "system", api: 99 } },
        };
        const engines = {
            "0.6.0": { name: "rpg-engine", version: "0.6.0", "rpg-engine": { kind: "engine", api: 5 } },
            "0.9.0": { name: "rpg-engine", version: "0.9.0", "rpg-engine": { kind: "engine", api: 99 } },
            "1.0.0": { name: "rpg-engine", version: "1.0.0", "rpg-engine": { kind: "engine", api: 100 } },
        };
        const pages: Record<string, unknown> = {
            "https://registry.npmjs.org/@rpgengine%2fsystem-5e/latest": versions["2.0.0"],
            "https://registry.npmjs.org/@rpgengine%2fsystem-5e/2.0.0": versions["2.0.0"],
            "https://registry.npmjs.org/@rpgengine%2fsystem-5e": { versions },
            "https://registry.npmjs.org/rpg-engine": { versions: engines },
        };
        vi.stubGlobal("fetch", (url: string) => Promise.resolve(pages[url] === undefined ? new Response("", { status: 404 }) : Response.json(pages[url])));
        const packages = npmPackages(makeTempFolder(), npmAnswering([], []));
        expect(await packages.describe("@rpgengine/system-5e")).toMatchObject({ version: "1.1.0", api: 5, newer: { version: "2.0.0", engine: "0.9.0" } });
        expect(await packages.describe("@rpgengine/system-5e@2.0.0")).toMatchObject({ version: "2.0.0", api: 99 });
        expect(await packages.describe("@rpgengine/system-5e@2.0.0")).not.toHaveProperty("newer");
    });
});
