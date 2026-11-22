// The importer's soft fence in Antigravity (D-579 (1)): rpg --fence refuses commands, the web, and files outside the folders to read and to write, by path
// segments; a tool it does not know is refused too, and a fence that does not read lets nothing through.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Fence, fenceDecision, isInside, readFence } from "../src/server/fence.ts";
import { makeTempFolder, removeFolder } from "./support.ts";

let folder: string;
let fence: Fence;

beforeEach(() => {
    folder = makeTempFolder();
    const work = join(folder, "alpha");
    fence = { read: [work, join(work, "adventure")], write: [join(work, "adventure")] };
});

afterEach(() => {
    removeFolder(folder);
});

/** A hook's input for a tool call, from the working folder `cwd` when given. */
function call(name: string, args: Record<string, unknown> = {}, cwd?: string): string
{
    return JSON.stringify({ toolCall: { name, args }, ...(cwd === undefined ? {} : { cwd }) });
}

describe("rpg --fence (D-579 (1))", () => {
    it("lets reading in the import's folder and writing in a writable one through, and refuses the rest", () => {
        const work = join(folder, "alpha");
        expect(fenceDecision(call("read_file", { Path: join(work, "document", "01.md") }), fence)).toEqual({ decision: "allow" });
        expect(fenceDecision(call("read_file", { Path: join(folder, "secret.txt") }), fence).decision).toBe("deny");
        expect(fenceDecision(call("write_file", { Path: join(work, "adventure", "world", "a.md"), Content: "x" }), fence)).toEqual({ decision: "allow" });
        expect(fenceDecision(call("write_file", { Path: join(work, "document", "01.md"), Content: "x" }), fence).decision).toBe("deny");
        // A sibling whose name only begins the same is outside.
        expect(fenceDecision(call("read_file", { Path: join(folder, "alphabet", "a.md") }), fence).decision).toBe("deny");
        expect(isInside(join(folder, "al"), join(folder, "alpha"))).toBe(false);
    });

    it("refuses commands and the web, saying what can be done", () => {
        const refused = fenceDecision(call("run_command", { CommandLine: "dir" }), fence);
        expect(refused).toEqual({ decision: "deny", reason: expect.stringContaining(join(folder, "alpha")) as string });
        expect(fenceDecision(call("search_web", { query: "the book" }), fence).decision).toBe("deny");
        expect(fenceDecision(call("read_url_content", { Url: "https://example.com" }), fence).decision).toBe("deny");
    });

    it("refuses a tool it does not know, takes the path whatever its argument is called, and resolves a relative one from the hook's folder", () => {
        expect(fenceDecision(call("task_boundary", { Summary: "reading" }), fence).decision).toBe("deny");
        expect(fenceDecision(call("list_dir", { DirectoryPath: join(folder, "alpha", "document") }), fence)).toEqual({ decision: "allow" });
        expect(fenceDecision(call("replace_file_content", { TargetFile: join(folder, "alpha", "document", "01.md") }), fence).decision).toBe("deny");
        expect(fenceDecision(call("view_file", { Path: join("document", "01.md") }, join(folder, "alpha")), fence)).toEqual({ decision: "allow" });
        expect(fenceDecision(call("view_file", { Path: join("..", "secret.txt") }, join(folder, "alpha")), fence).decision).toBe("deny");
    });

    it("lets nothing through when its fence file does not read", () => {
        const broken = join(folder, "fence.json");
        writeFileSync(broken, "{ not json");
        expect(readFence(broken)).toBeUndefined();
        expect(readFence(join(folder, "missing.json"))).toBeUndefined();
        expect(fenceDecision(call("read_file", { Path: join(folder, "alpha", "a.md") }), readFence(broken)).decision).toBe("deny");
        writeFileSync(broken, JSON.stringify(fence));
        expect(readFence(broken)).toEqual(fence);
    });

    it("is inside by path segments, without regard to case on Windows", () => {
        expect(isInside(join(folder, "alpha", "x"), join(folder, "alpha"))).toBe(true);
        expect(isInside(join(folder, "alpha"), join(folder, "alpha"))).toBe(true);
        expect(isInside(join(folder, "alpha", "..", "beta"), join(folder, "alpha"))).toBe(false);

        if (process.platform === "win32") {
            expect(isInside(join(folder, "ALPHA", "x"), join(folder, "alpha"))).toBe(true);
        }
    });
});
