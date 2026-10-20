// A package given as a .tgz (D-452): read and unpacked with Node alone, refused whole when an entry would leave the package, is not a plain file or folder, or
// the archive does not read to its end; installed beside the copy it replaces, which comes back when npm fails.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { npmPackages, type NpmRun } from "../src/extensions/packages.ts";
import { isTarball, tarballText, unpackTarball } from "../src/extensions/tarball.ts";
import { makeTempFolder, removeFolder } from "./support.ts";

interface TestEntry
{
    name: string;
    text?: string;
    /** The tar type: 0 a file, 5 a folder, 2 a link, x a pax header. */
    type?: string;
    /** The size field as written, when it is not the text's. */
    size?: string;
}

/** A .tgz as npm pack writes it, with these entries: ustar headers, each file in blocks of 512 bytes; `cut` bytes taken off its end. */
function tarball(path: string, entries: TestEntry[], cut = 0): string
{
    const blocks = entries.flatMap(({ name, text = "", type = "0", size }) => {
        const data = Buffer.from(text, "utf8");
        const header = Buffer.alloc(512);
        header.write(name, 0, 100, "utf8");
        header.write("0000644\0", 100);
        header.write(size ?? `${data.length.toString(8).padStart(11, "0")}\0`, 124);
        header.write(type, 156);
        header.write("ustar\0" + "00", 257);
        return [header, data, Buffer.alloc((512 - (data.length % 512)) % 512)];
    });
    const tar = Buffer.concat([...blocks, Buffer.alloc(1024)]);
    writeFileSync(path, gzipSync(tar.subarray(0, tar.length - cut)));
    return path;
}

const manifest = (version = "1.0.0", name = "secret-notes"): string => JSON.stringify({ name, version, "rpg-engine": { kind: "extension", api: 1 } });
let folder: string;

beforeEach(() => (folder = makeTempFolder()));
afterEach(() => removeFolder(folder));

describe("a package's .tgz (D-452)", () => {
    it("is told by its name, and gives the text of one of its files", () => {
        const archive = tarball(join(folder, "notes.tgz"), [{ name: "package/package.json", text: manifest() }]);
        expect(isTarball(archive)).toBe(true);
        expect(isTarball(join(folder, "notes"))).toBe(false);
        expect(tarballText(archive, "package.json")).toBe(manifest());
        expect(tarballText(archive, "README.md")).toBeUndefined();
    });

    it("unpacks without the package/ npm puts first, a long path from its pax header", () => {
        const long = `deep/${"a".repeat(120)}.md`;
        const archive = tarball(join(folder, "notes.tgz"), [
            { name: "package/package.json", text: manifest() },
            { name: "package/manuals", type: "5" },
            { name: "package/manuals/rules.md", text: "# Rules" },
            { name: "PaxHeader", type: "x", text: `${`path=package/${long}`.length + 5} path=package/${long}\n` },
            { name: "package/cut-short", text: "long" },
        ]);
        const target = join(folder, "local", "secret-notes");
        unpackTarball(archive, target);
        expect(readFileSync(join(target, "manuals", "rules.md"), "utf8")).toBe("# Rules");
        expect(readFileSync(join(target, long), "utf8")).toBe("long");
    });

    it("is refused whole, writing nothing, for a path that climbs out, starts at a root or a drive, a name Windows keeps, a link, a file twice, or an archive cut short", () => {
        const target = join(folder, "local", "secret-notes");
        const bad: [TestEntry[], number, RegExp][] = [
            [[{ name: "package/../../escape.md", text: "x" }], 0, /refused whole/],
            [[{ name: "/etc/escape", text: "x" }], 0, /refused whole/],
            [[{ name: "package/C:escape.md", text: "x" }], 0, /cannot write .*: it is refused whole/],
            [[{ name: "package/con/aux.js", text: "x" }], 0, /cannot write/],
            [[{ name: "package/notes. ", text: "x" }], 0, /cannot write/],
            [[{ name: "package/link", type: "2" }], 0, /not a plain file or folder/],
            [[{ name: "package/package.json", text: manifest("9.9.9") }], 0, /holds package.json twice/],
            [[{ name: "package/index.js", text: "x".repeat(3000) }], 2000, /cut short/],
            [[{ name: "package/index.js", text: "x", size: "\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x01" }], 0, /cut short/],
        ];

        for (const [entries, cut, why] of bad) {
            const archive = tarball(join(folder, "bad.tgz"), [{ name: "package/package.json", text: manifest() }, ...entries], cut);
            expect(() => unpackTarball(archive, target)).toThrow(why);
            expect(existsSync(target)).toBe(false);
        }

        expect(existsSync(join(folder, "escape.md"))).toBe(false);
    });

    it("says what is wrong with a file that is no .tgz", () => {
        writeFileSync(join(folder, "broken.tgz"), "not gzip");
        expect(() => tarballText(join(folder, "broken.tgz"), "package.json")).toThrow(/is not a package's \.tgz that reads/);
    });
});

describe("npm's packages with a .tgz (D-452)", () => {
    /** npm as a fake: what it was asked, and whether it fails. */
    function fakeRun(fails = false): ((args: string) => Promise<NpmRun>) & { asked: string[]; }
    {
        const asked: string[] = [];
        return Object.assign((args: string) => {
            asked.push(args);
            return Promise.resolve({ code: fails ? 1 : 0, out: fails ? JSON.stringify({ error: { code: "ENOTCACHED", summary: "no network" } }) : "", errors: "" });
        }, { asked });
    }

    it("describes it from its package.json, before any npm run, refusing a missing file, a name npm would not take and an archive refused whole", async () => {
        const packages = npmPackages(join(folder, "packages"), fakeRun());
        const archive = tarball(join(folder, "notes.tgz"), [{ name: "package/package.json", text: manifest() }]);
        expect(await packages.describe(archive)).toEqual({ name: "secret-notes", version: "1.0.0", kind: "extension", api: 1, code: false, dependencies: false });
        expect(await packages.describe(join(folder, "missing.tgz"))).toEqual({ failed: `There is no file ${join(folder, "missing.tgz")} on this computer (${join(folder, "missing.tgz")}): give its full path` });
        const upper = tarball(join(folder, "upper.tgz"), [{ name: "package/package.json", text: manifest("1.0.0", "Notes") }]);
        expect(await packages.describe(upper)).toEqual({ failed: `${upper} is named "Notes", which is not an npm package's name, such as notes or @me/notes` });
        const refused = tarball(join(folder, "bad.tgz"), [{ name: "package/package.json", text: manifest() }, { name: "package/link", type: "2" }]);
        expect(await packages.describe(refused)).toEqual({ failed: `${refused} holds package/link, which is not a plain file or folder (a link or a device): it is refused whole.` });
    });

    it("unpacks it into local/<name>, links it there with npm whatever the .npmrc says, and keeps no file of the swap", async () => {
        const run = fakeRun();
        const packages = npmPackages(join(folder, "packages"), run);
        const archive = tarball(join(folder, "notes.tgz"), [{ name: "package/package.json", text: manifest() }, { name: "package/index.js", text: "v1" }]);
        await packages.describe(archive);
        expect(await packages.install(archive)).toBeUndefined();
        const target = join(folder, "packages", "local", "secret-notes");
        expect(readFileSync(join(target, "index.js"), "utf8")).toBe("v1");
        expect(run.asked[0]).toContain(`"${target}" --install-links=false --ignore-scripts`);
        expect(readdirSync(join(folder, "packages", "local"))).toEqual(["secret-notes"]);
    });

    it("keeps the copy before when npm fails, and refuses a file changed since the player was asked", async () => {
        const target = join(folder, "packages", "local", "secret-notes");
        const first = tarball(join(folder, "v1.tgz"), [{ name: "package/package.json", text: manifest() }, { name: "package/index.js", text: "v1" }]);
        await npmPackages(join(folder, "packages"), fakeRun()).install(first);

        const failing = npmPackages(join(folder, "packages"), fakeRun(true));
        const second = tarball(join(folder, "v2.tgz"), [{ name: "package/package.json", text: manifest("2.0.0") }, { name: "package/index.js", text: "v2" }]);
        await failing.describe(second);
        expect(await failing.install(second)).toBe("npm said: ENOTCACHED, no network");
        expect(readFileSync(join(target, "index.js"), "utf8")).toBe("v1");
        expect(readdirSync(join(folder, "packages", "local"))).toEqual(["secret-notes"]);

        const run = fakeRun();
        const packages = npmPackages(join(folder, "packages"), run);
        await packages.describe(second);
        tarball(second, [{ name: "package/package.json", text: manifest("6.6.6") }]);
        expect(await packages.install(second)).toBe(`${second} is no longer the package that was asked about: install it again`);
        expect(run.asked).toEqual([]);
        expect(readFileSync(join(target, "index.js"), "utf8")).toBe("v1");
    });

    it("on uninstall takes away what it was unpacked to, and its scope's folder left empty", async () => {
        const packages = npmPackages(join(folder, "packages"), fakeRun());
        await packages.install(tarball(join(folder, "scoped.tgz"), [{ name: "package/package.json", text: manifest("1.0.0", "@me/notes") }]));
        expect(existsSync(join(folder, "packages", "local", "@me", "notes", "package.json"))).toBe(true);
        expect(await packages.uninstall("@me/notes")).toBeUndefined();
        expect(readdirSync(join(folder, "packages", "local"))).toEqual([]);
    });
});
