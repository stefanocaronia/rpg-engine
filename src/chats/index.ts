// The chats of the game as the AI hosts keep them on this computer, copied into the campaign as text (T-225): the player's words and the master's, never the
// master's reasoning nor its tools, which the log and the host's own chat keep.
import { join } from "node:path";
import type { ChatFolders } from "../core/context.ts";

export { type Chat, type ChatMessage, chatText, undoneAt, type UndoneStretch } from "./chat.ts";
export { keepChats, keptChats } from "./keep.ts";

/** Where Claude Code and Codex keep their chats, in the player's home unless the environment moves them. */
export function chatFolders(environment: Record<string, string | undefined>, home: string): ChatFolders
{
    return {
        claudeCode: join(environment.CLAUDE_CONFIG_DIR || join(home, ".claude"), "projects"),
        codex: join(environment.CODEX_HOME || join(home, ".codex"), "sessions"),
    };
}
