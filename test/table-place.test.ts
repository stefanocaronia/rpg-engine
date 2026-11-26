import { describe, expect, it } from "vitest";
import { tableSocket } from "../src/server/table/place.ts";

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
