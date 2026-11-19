// The campaign's chats as text (T-225): copied from the AI hosts into its sessions folder, with what a load undid marked, as the log says.
import { join } from "node:path";
import { sessionsFolderName } from "../../../campaign/index.ts";
import { type Chat, keepChats, keptChats, type UndoneStretch } from "../../../chats/index.ts";
import type { Context } from "../../../core/context.ts";
import { readLog } from "../../../core/log.ts";

/**
 * The stretches of real time the loads undid, by the log as it stands: each from when its save was made to when it was loaded. A load the save undid in
 * its turn is no longer in the log, and the later load's stretch holds it. A load logged before its save's time was written starts at the line before it.
 */
export function undoneStretches(root: string): UndoneStretch[]
{
    const log = readLog(root);
    return log.flatMap((entry, index) => {
        if (entry.type !== "save-loaded") {
            return [];
        }

        const data = entry.data as { save?: unknown; made?: unknown; };
        return [{ from: typeof data.made === "string" ? data.made : log[index - 1]?.at ?? entry.at, to: entry.at, save: Number(data.save) }];
    });
}

/** Copies the campaign's chats from the hosts into its sessions folder, where the context knows the hosts' folders. */
export function copyChats(root: string, context: Context): void
{
    if (context.chatFolders !== undefined) {
        keepChats(root, join(root, sessionsFolderName), context.chatFolders, context.platform, undoneStretches(root));
    }
}

/** The campaign's chats as it keeps them, a few minutes behind the chat going on, which is the master's own. */
export function campaignChats(root: string): Chat[]
{
    return keptChats(join(root, sessionsFolderName));
}
