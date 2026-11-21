// Which campaign each conversation of Antigravity's app plays: its hook, run in the campaign's folder, notes it as it approves an rpg tool, and the router
// reads it, since the app starts one rpg server for all its folders and names only the conversation (D-578). A small file per conversation, in the engine's
// data folder on this computer, never in a campaign; those not written for a month go as the router starts.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { campaignFileName } from "../../campaign/index.ts";

// How long a note is kept after it was last written: each call of an rpg tool writes it again.
const keptFor = 30 * 24 * 60 * 60 * 1000;

/** Notes that the conversation plays the campaign at `root`; a note that cannot be written leaves the conversation to the server's own folder. */
export function noteConversation(home: string, conversation: string, root: string): void
{
    try {
        mkdirSync(notesFolder(home), { recursive: true });
        writeFileSync(notePath(home, conversation), `${root}\n`);
    } catch {
        // The game goes on where the server runs.
    }
}

/** The campaign a conversation plays, as its note says; undefined without one, or once the folder is no campaign. */
export function notedCampaign(home: string, conversation: string): string | undefined
{
    try {
        const root = readFileSync(notePath(home, conversation), "utf8").trim();
        return root !== "" && existsSync(join(root, campaignFileName)) ? root : undefined;
    } catch {
        return undefined;
    }
}

/** Takes away the notes not written for a month, as of `now`. */
export function pruneNotes(home: string, now: Date): void
{
    try {
        for (const name of readdirSync(notesFolder(home))) {
            const path = join(notesFolder(home), name);

            if (now.getTime() - statSync(path).mtimeMs > keptFor) {
                rmSync(path, { force: true });
            }
        }
    } catch {
        // No notes yet, or none that can go: they stay.
    }
}

/** The folder of the notes, in the engine's data folder. */
export function notesFolder(home: string): string
{
    return join(home, "antigravity-conversations");
}

// A conversation's id as a file name: only letters, digits, dashes and underscores.
function notePath(home: string, conversation: string): string
{
    return join(notesFolder(home), `${conversation.replace(/[^\w-]/g, "_").slice(0, 120)}.txt`);
}
