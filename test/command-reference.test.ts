import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { commands } from "../src/commands/index.ts";
import { commandReference } from "../src/core/command-reference.ts";
import { defineCommand } from "../src/core/registry.ts";

describe("commandReference", () => {
    it("matches docs/commands.md, so that the reference never goes stale", () => {
        const written = readFileSync(new URL("../docs/commands.md", import.meta.url), "utf8");
        expect(written, "docs/commands.md is out of date: run npm run docs and commit it").toBe(commandReference(commands));
    });

    it("gives each command in its group with the first sentence of its description, read-only or not, its positional parameters and each parameter's type, whether it is optional and its description", () => {
        const pick = defineCommand({
            name: "pick",
            description: "Pick something. Use it when the player cannot choose.",
            group: "game",
            readOnly: true,
            positionals: ["what"],
            input: z.object({
                what: z.union([z.string(), z.array(z.string())]).describe("what to pick"),
                how: z.enum(["fast", "slow"]).optional().describe("how to pick it"),
                count: z.preprocess((value) => value, z.number().int()).optional().describe("how many"),
                weights: z.record(z.string(), z.number()).optional().describe("weight of each"),
            }),
            run: () => "",
            format: (result) => result,
        });
        const start = defineCommand({ name: "start", description: "Start.", group: "campaign", input: z.object({}), run: () => "", format: (result) => result });

        expect(commandReference([start, pick])).toBe(
            [
                "<!-- Generated from the definitions of the commands: do not edit it by hand. After changing a command, run npm run docs. -->",
                "",
                "# Commands",
                "",
                "## Campaign",
                "",
                "### start",
                "",
                "Start.",
                "",
                "Read-only: no.",
                "",
                "No parameters.",
                "",
                "## Game",
                "",
                "### pick",
                "",
                "Pick something.",
                "",
                "Read-only: yes. Positional parameters: `what`.",
                "",
                "- `what` (`string | string[]`, required): what to pick",
                '- `how` (`"fast" | "slow"`, optional): how to pick it',
                "- `count` (`integer`, optional): how many",
                "- `weights` (`{ [key]: number }`, optional): weight of each",
                "",
            ].join("\n"),
        );
    });
});
