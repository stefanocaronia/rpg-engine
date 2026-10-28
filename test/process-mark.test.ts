// The mark of the process that does a piece of work alone (LIB-3), as reading the library or running an import: taken once, refused while another live
// process holds it, taken over from one that is gone.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { claimMark, markHolder, releaseMark } from "../src/core/process-mark.ts";
import { makeTempFolder } from "./support.ts";

describe("the mark of a process", () => {
    it("is taken, held again by the same process, and let go", () => {
        const file = join(makeTempFolder(), "work", ".running");
        expect(claimMark(file)).toBe(true);
        expect(claimMark(file)).toBe(true);
        expect(markHolder(file)).toBe(process.pid);
        releaseMark(file);
        expect(markHolder(file)).toBeUndefined();
    });

    it("is refused while another live process holds it, and taken over from one that is gone", () => {
        const file = join(makeTempFolder(), ".running");
        writeFileSync(file, String(process.ppid));
        expect(claimMark(file)).toBe(false);
        releaseMark(file);
        expect(readFileSync(file, "utf8")).toBe(String(process.ppid));
        // A process number no process has.
        writeFileSync(file, "2147483646");
        expect(claimMark(file)).toBe(true);
        expect(markHolder(file)).toBe(process.pid);
    });
});
