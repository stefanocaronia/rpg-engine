import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("architecture", () => {
    it("keeps the dice module independent from the rest of rpg-engine", () => {
        const diceFolder = new URL("../src/dice/", import.meta.url);
        for (const fileName of readdirSync(diceFolder)) {
            const source = readFileSync(new URL(fileName, diceFolder), "utf8");
            for (const [, imported] of source.matchAll(/from\s+"([^"]+)"/g)) {
                expect(imported.startsWith("./") || imported.startsWith("node:"), `${fileName} imports ${imported}`).toBe(true);
            }
        }
    });
});
