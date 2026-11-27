import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { readRefusal, removeRefusal, tableFile, tableSocket, writeRefusal } from "../src/server/table/place.ts";
import { makeTempFolder } from "./support.ts";

// The paths are joined as this computer joins them: read here with one kind of slash.
const slashed = (path: string): string => path.replaceAll("\\", "/");

describe("the socket of a campaign's table", () => {
    it("is a named pipe on Windows, whatever the home", () => {
        const socket = slashed(tableSocket("C:/Users/player/AppData/Roaming/rpg-engine", "C:/games/campaign", "win32"));
        expect(socket).toMatch(/^\/\/[.]\/pipe\/rpg-table-[0-9a-f]{16}$/);
    });

    it("is a file beside the table's place off Windows, and one of the temporary folder where that path is longer than a socket's may be", () => {
        const short = slashed(tableSocket("/home/player/.local/share/rpg-engine", "/home/player/campaign", "linux", "/tmp"));
        expect(short).toMatch(/^\/home\/player\/[.]local\/share\/rpg-engine\/tables\/[0-9a-f]{16}[.]sock$/);

        const temporary = "/var/folders/q2/p1t6rgxj5fj32g1dc7dmd49r0000gn/T";
        const long = slashed(tableSocket(`${temporary}/rpg-test-abcdef/Library/Application Support/rpg-engine`, "/Users/player/campaign", "darwin", temporary));
        expect(long.startsWith(`${temporary}/rpg-table-`)).toBe(true);
        expect(long.endsWith(".sock")).toBe(true);
        expect(Buffer.byteLength(long)).toBeLessThanOrEqual(100);
    });

    it("is the same for the same campaign, and another for another", () => {
        const home = "/home/player/.local/share/rpg-engine";
        expect(tableSocket(home, "/home/player/campaign", "linux", "/tmp")).toBe(tableSocket(home, "/home/player/campaign", "linux", "/tmp"));
        expect(tableSocket(home, "/home/player/other", "linux", "/tmp")).not.toBe(tableSocket(home, "/home/player/campaign", "linux", "/tmp"));
    });
});

describe("why a campaign's table could not start, beside its place", () => {
    it("is kept with its code and values, and read back as written; words alone stay words alone", () => {
        const home = makeTempFolder();
        const root = makeTempFolder();
        expect(readRefusal(home, root)).toBeUndefined();
        writeRefusal(home, root, { refused: "rpg table: no port is free.", code: "no-port", values: { root } });
        expect(readRefusal(home, root)).toEqual({ refused: "rpg table: no port is free.", code: "no-port", values: { root } });
        writeRefusal(home, root, { refused: "rpg table: a chat keeps the page.", code: "page-kept-by-chat" });
        expect(readRefusal(home, root)).toEqual({ refused: "rpg table: a chat keeps the page.", code: "page-kept-by-chat" });
        writeRefusal(home, root, { refused: "rpg table: words alone." });
        expect(readRefusal(home, root)).toEqual({ refused: "rpg table: words alone." });
        removeRefusal(home, root);
        expect(readRefusal(home, root)).toBeUndefined();
    });

    it("leaves out a code or values that are not well formed, as in a file written by hand, and keeps the words", () => {
        const home = makeTempFolder();
        const root = makeTempFolder();
        const file = tableFile(home, root, ".refused.json");
        mkdirSync(dirname(file), { recursive: true });

        const read = (content: unknown): unknown => {
            writeFileSync(file, JSON.stringify(content));
            return readRefusal(home, root);
        };

        expect(read({ refused: "words", code: 3, values: { root } })).toEqual({ refused: "words" });
        expect(read({ refused: "words", code: "no-port", values: { root: 3 } })).toEqual({ refused: "words", code: "no-port" });
        expect(read({ refused: "words", code: "no-port", values: ["root"] })).toEqual({ refused: "words", code: "no-port" });
        expect(read({ refused: 3, code: "no-port" })).toBeUndefined();
        expect(read("words")).toBeUndefined();
    });
});
