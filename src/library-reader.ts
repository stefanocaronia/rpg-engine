// The reading of the player's books apart from the chat (D-491, LIB-3): rules and config start a process of its own, `rpg --read-library <entries>`, which
// reads each book still to read, its PDF pages without readable text by the system's OCR, and writes its index; one at a time on a computer.
import { spawn } from "node:child_process";
import { libraryScope } from "./commands/game-library.ts";
import { defaultContext } from "./core/context.ts";
import { readDocument, systemPageReader } from "./documents/index.ts";
import { claimLibrary, readLibrary, releaseLibrary } from "./library/index.ts";

// The argument of the command line that reads the library, as cli.ts takes it: not a command, only what rules starts.
const readLibraryArgument = "--read-library";

/** Starts the reading of the library apart, by the command line this process runs, outliving the chat: what Context.readLibrary is where a player sits. */
export function libraryRunner(): (entries: string[]) => void
{
    // A process that cannot start leaves the books unread, never the server down.
    return (entries) => spawn(process.execPath, [process.argv[1] ?? "", readLibraryArgument, ...entries], { detached: true, stdio: "ignore", windowsHide: true }).on("error", () => undefined).unref();
}

/** Reads the library's books still to read, here, unless another process does already; the player's local data folder holds their index. */
export async function readLibraryHere(entries: string[]): Promise<void>
{
    const folder = defaultContext().bookIndex;

    if (folder === undefined || !claimLibrary(folder)) {
        return;
    }

    const ocr = systemPageReader(process.platform, process.env);

    try {
        await readLibrary(folder, entries, libraryScope, async (path) => {
            const read = await readDocument(path, { ocr, pictures: false });
            return { parts: read.parts, unreadable: read.unreadable, recognized: read.recognized };
        });
    } finally {
        releaseLibrary(folder);
    }
}
