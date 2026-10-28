// The window of the player's computer (D-478): which program shows it on each system, the package's words kept out of the script and cleaned, and how its
// end reads; a copy of a folder at the yes, which a later change to the folder never reaches.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dialogAnswer, dialogCommands, plainText, systemConfirm } from "../src/confirm/index.ts";
import { npmPackages } from "../src/extensions/index.ts";
import { makeTempFolder } from "./support.ts";

describe("the window of the player's computer (D-478)", () => {
    it("is PowerShell on Windows, osascript on macOS, zenity then kdialog on a Linux desktop, and none without one", () => {
        const [windows] = dialogCommands("win32", { SystemRoot: "C:\\Windows" }, "A package", "Install it?");
        expect(windows.file).toBe("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
        expect(windows.env).toEqual({ RPG_CONFIRM_TITLE: "A package", RPG_CONFIRM_TEXT: "Install it?" });
        expect(dialogCommands("darwin", {}, "A package", "Install it?")[0].file).toBe("/usr/bin/osascript");
        expect(dialogCommands("linux", { DISPLAY: ":0" }, "A package", "Install it?").map((one) => one.file)).toEqual(["zenity", "kdialog"]);
        expect(dialogCommands("linux", {}, "A package", "Install it?")).toEqual([]);
    });

    it("never puts the package's words inside a script, and takes out what could hide or turn them", () => {
        const sly = "Safe'; Remove-Item C:\\ -Recurse; '\u202Eexe.txt";
        const [windows] = dialogCommands("win32", {}, "t", sly);
        expect(windows.args.join(" ")).not.toContain("Remove-Item");
        expect(windows.env.RPG_CONFIRM_TEXT).toBe("Safe'; Remove-Item C:\\ -Recurse; 'exe.txt");
        expect(dialogCommands("darwin", {}, "t", sly)[0].args.slice(0, -4).join(" ")).not.toContain("Remove-Item");
        expect(plainText("a".repeat(700), 600)).toHaveLength(600);
    });

    it("reads yes, no, and none when no window could be shown", () => {
        const [windows] = dialogCommands("win32", {}, "t", "x");
        expect([10, 11, 12, 1].map((code) => dialogAnswer(windows, { code, out: "" }))).toEqual(["yes", "no", "none", "none"]);
        const [mac] = dialogCommands("darwin", {}, "t", "x");
        // macOS: the player's no ends with -128; a window that never showed, as with no desktop, with another error.
        expect([dialogAnswer(mac, { code: 0, out: "yes\n" }), dialogAnswer(mac, { code: 1, out: "", err: "execution error: User canceled. (-128)" })]).toEqual(["yes", "no"]);
        expect(dialogAnswer(mac, { code: 1, out: "", err: "execution error: No user interaction allowed. (-1713)" })).toBe("none");
        const [zenity] = dialogCommands("linux", { DISPLAY: ":0" }, "t", "x");
        expect([dialogAnswer(zenity, { code: 0, out: "" }), dialogAnswer(zenity, { code: 1, out: "" })]).toEqual(["yes", "no"]);
    });

    it("tries kdialog when zenity is missing, and says none when neither is there", async () => {
        const tried: string[] = [];
        const kdialogOnly = systemConfirm("linux", { DISPLAY: ":0" }, (command) => {
            tried.push(command.file);
            return Promise.resolve(command.file === "kdialog" ? { code: 0, out: "" } : "missing");
        });
        expect(await kdialogOnly.ask("t", "x")).toBe("yes");
        expect(tried).toEqual(["zenity", "kdialog"]);
        expect(await systemConfirm("linux", { DISPLAY: ":0" }, () => Promise.resolve("missing")).ask("t", "x")).toBe("none");
    });

    it("asks nothing for a call already stopped, so that no yes comes after the stop", async () => {
        const tried: string[] = [];
        const confirm = systemConfirm("linux", { DISPLAY: ":0" }, (command) => {
            tried.push(command.file);
            return Promise.resolve({ code: 0, out: "" });
        });
        expect(await confirm.ask("t", "x", AbortSignal.abort())).toBe("none");
        expect(tried).toEqual([]);
    });
});

describe("a folder installed at the yes (D-478)", () => {
    it("is copied, so that a change to the folder after the yes never runs", async () => {
        const source = join(makeTempFolder(), "presagi");
        mkdirSync(join(source, "node_modules", "dep"), { recursive: true });
        writeFileSync(join(source, "package.json"), JSON.stringify({ name: "presagi", version: "1.0.0", "rpg-engine": { kind: "extension", api: 1 } }));
        writeFileSync(join(source, "index.js"), "export default 1;");
        const folder = makeTempFolder();
        const packages = npmPackages(folder, () => Promise.resolve({ code: 0, out: "", errors: "" }));
        await packages.describe(source);
        expect(await packages.install(source)).toBeUndefined();
        writeFileSync(join(source, "index.js"), "export default 2;");
        expect(readFileSync(join(folder, "local", "presagi", "index.js"), "utf8")).toBe("export default 1;");
        expect(() => readFileSync(join(folder, "local", "presagi", "node_modules", "dep"))).toThrow();
    });

    it("is refused when it changed between the question and the install", async () => {
        const source = join(makeTempFolder(), "presagi");
        mkdirSync(source, { recursive: true });
        writeFileSync(join(source, "package.json"), JSON.stringify({ name: "presagi", version: "1.0.0", "rpg-engine": { kind: "extension", api: 1 } }));
        const packages = npmPackages(makeTempFolder(), () => Promise.resolve({ code: 0, out: "", errors: "" }));
        await packages.describe(source);
        writeFileSync(join(source, "package.json"), JSON.stringify({ name: "presagi", version: "1.0.1", "rpg-engine": { kind: "extension", api: 1 } }));
        expect(await packages.install(source)).toContain("is no longer the package that was asked about");
    });
});

describe("a package npm installs again (D-510)", () => {
    it("keeps the copy npm installed when the new one cannot even be asked for, or npm cannot run", async () => {
        const folder = makeTempFolder();
        const installed = join(folder, "node_modules", "@rpgengine", "weather");
        mkdirSync(installed, { recursive: true });
        writeFileSync(join(installed, "package.json"), "{}");
        const asked: string[] = [];
        const packages = npmPackages(folder, (args) => {
            asked.push(args);
            return Promise.reject(new Error("npm is not there"));
        });
        await expect(packages.install("@rpgengine/x/../weather")).rejects.toThrow();
        expect(asked).toEqual([]);
        expect(readFileSync(join(installed, "package.json"), "utf8")).toBe("{}");
        await expect(packages.install("@rpgengine/weather@0.3.0")).rejects.toThrow("npm is not there");
        expect(readFileSync(join(installed, "package.json"), "utf8")).toBe("{}");
    });
});
