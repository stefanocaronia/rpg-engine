import { describe, expect, it } from "vitest";
import { inside } from "../src/master/paths.ts";

describe("a path held to the campaign's folder", () => {
    it("takes, on Windows, a path written as a URL's, with a slash before the drive, as the path after it", () => {
        expect(inside("/F:/games/campaign/world/characters/Ettore.md", "F:/games/campaign", "win32")).toBe(true);
        expect(inside("\\F:\\games\\campaign\\world", "F:/games/campaign", "win32")).toBe(true);
        expect(inside("/F:/games/other/secret.md", "F:/games/campaign", "win32")).toBe(false);
        expect(inside("/C:/Users/player/.ssh/id_rsa", "F:/games/campaign", "win32")).toBe(false);
        expect(inside("/F:/games/campaign/../other/secret.md", "F:/games/campaign", "win32")).toBe(false);
    });

    it("holds a path on Windows whatever the case of its letters, and keeps out another drive", () => {
        expect(inside("f:\\GAMES\\Campaign\\world\\page.md", "F:\\games\\campaign", "win32")).toBe(true);
        expect(inside("C:\\Windows\\win.ini", "F:\\games\\campaign", "win32")).toBe(false);
    });

    it("keeps out, off Windows, a path written the Windows way: no file of the folder is meant by it", () => {
        expect(inside("C:\\Windows\\win.ini", "/home/player/campaign", "linux")).toBe(false);
        expect(inside("C:/Windows/win.ini", "/home/player/campaign", "darwin")).toBe(false);
        expect(inside("world\\page.md", "/home/player/campaign", "linux")).toBe(false);
        expect(inside("world/page.md", "/home/player/campaign", "linux")).toBe(true);
        expect(inside("/home/player/campaign/world/page.md", "/home/player/campaign", "linux")).toBe(true);
        expect(inside("/home/player/.ssh/id_rsa", "/home/player/campaign", "linux")).toBe(false);
    });

    it("keeps out a path of the home and one that climbs out, on every platform", () => {
        for (const platform of ["win32", "linux", "darwin"]) {
            const folder = platform === "win32" ? "F:/games/campaign" : "/home/player/campaign";
            expect(inside("~/notes.md", folder, platform)).toBe(false);
            expect(inside("../outside.md", folder, platform)).toBe(false);
            expect(inside("world/page.md", folder, platform)).toBe(true);
        }
    });
});
