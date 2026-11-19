// The campaign's chats copied as text into its sessions folder (T-225): as the server starts, then at most every few minutes, after a call and apart from it.
import { findCampaign } from "../campaign/index.ts";
import { copyChats } from "../commands/shared/campaign/chats.ts";
import type { Context } from "../core/context.ts";

// How often the chats are copied while the game goes on: the chat going on is the master's own, so a few minutes behind is enough; chats copies them at once.
const keepEvery = 5 * 60_000;

/** What copies the chats, called after every call: it copies them now and then, never in the call's way; nothing where the context has no chat folders. */
export function chatKeeper(context: Context): () => void
{
    let last: number | undefined;

    return () => {
        const now = context.now().getTime();

        if (context.chatFolders === undefined || (last !== undefined && now - last < keepEvery)) {
            return;
        }

        last = now;
        setTimeout(() => {
            try {
                const root = findCampaign(context.folder);

                if (root !== undefined) {
                    copyChats(root, context);
                }
            } catch {
                // The chats are copied again the next time.
            }
        }, 0);
    };
}
