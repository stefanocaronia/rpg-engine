import { describe, expect, it } from "vitest";
import { inside } from "../src/master/paths.ts";

describe("a path held to the campaign's folder", () => {
    it.runIf(process.platform === "win32")("takes a path written as a URL's, with a slash before the drive, as the path after it", () => {
        expect(inside("/F:/games/campaign/world/characters/Ettore.md", "F:/games/campaign")).toBe(true);
        expect(inside("\\F:\\games\\campaign\\world", "F:/games/campaign")).toBe(true);
        expect(inside("/F:/games/other/secret.md", "F:/games/campaign")).toBe(false);
        expect(inside("/C:/Users/player/.ssh/id_rsa", "F:/games/campaign")).toBe(false);
        expect(inside("/F:/games/campaign/../other/secret.md", "F:/games/campaign")).toBe(false);
    });

    it("keeps out a path of the home and one that climbs out", () => {
        expect(inside("~/notes.md", process.cwd())).toBe(false);
        expect(inside("../outside.md", process.cwd())).toBe(false);
        expect(inside("world/page.md", process.cwd())).toBe(true);
    });
});
