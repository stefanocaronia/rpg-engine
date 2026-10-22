// The reading of the player's books apart from the chat (D-491, LIB-3): rules and config start a process of its own, `rpg --read-library`, which reads each
// book of this computer's library still to read, its PDF pages without readable text by the system's OCR, and writes its index; one at a time on a computer.
import { spawn } from "node:child_process";
import { libraryScope } from "./commands/game-library.ts";
import { defaultContext } from "./core/context.ts";
import { readDocument, systemPageReader } from "./documents/index.ts";
import { claimLibrary, dropUnlisted, libraryFolders, readLibrary, releaseLibrary } from "./library/index.ts";

// The argument of the command line that reads the library, as cli.ts takes it: not a command, only what rules starts.
const readLibraryArgument = "--read-library";

/** Starts the reading of the library apart, by the command line this process runs, outliving the chat: what Context.readLibrary is where a player sits. */
export function libraryRunner(): () => void
{
    // A process that cannot start leaves the books unread, never the server down.
    return () => spawn(process.execPath, [process.argv[1] ?? "", readLibraryArgument], { detached: true, stdio: "ignore", windowsHide: true }).on("error", () => undefined).unref();
}

/**
 * Reads the books of this computer's library still to read, here, unless another process does already; the player's local data folder holds their index, unless
 * another is given. The text of a folder taken off the computer is dropped first, and once more at the end.
 */
export async function readLibraryHere(folder = defaultContext().bookIndex): Promise<void>
{
    if (folder === undefined || !claimLibrary(folder)) {
        return;
    }

    const ocr = systemPageReader(process.platform, process.env);

    try {
        // The text left by a reader stopped after its folder was taken off the computer.
        dropUnlisted(folder, libraryFolders(folder));
        await readLibrary(folder, () => libraryFolders(folder), libraryScope, async (path, resume) => {
            const read = await readDocument(path, { ocr, pictures: false, resume });
            return { parts: read.parts, unreadable: read.unreadable, recognized: read.recognized };
        });
        dropUnlisted(folder, libraryFolders(folder));
    } finally {
        releaseLibrary(folder);
    }
}
