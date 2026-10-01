import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getVersion } from "../src/core/version.js";

describe("getVersion", () => {
    it("returns the version from package.json", () => {
        const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
        expect(getVersion()).toBe(packageJson.version);
    });
});
