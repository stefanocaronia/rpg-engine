// Codex's chats (T-225): a .jsonl for each, in folders by the day it started, its first line saying the folder it started in.
import { resolve } from "node:path";
import { type Chat, type ChatMessage, type ChatSource, joinedMessages } from "./chat.ts";
import { chatFiles, firstJsonLine, jsonLines } from "./read.ts";

/** The chats Codex keeps of the campaign in `root`, in its folder of sessions: those started in the campaign's folder, its subagents' left out. */
export function codexChats(sessions: string, root: string, platform: string): ChatSource[]
{
    return chatFiles(sessions, true).flatMap((path) => {
        const id = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i.exec(path)?.[1];
        return id === undefined ? [] : [{ host: "codex", id, path, read: () => codexChat(path, id, root, platform) }];
    });
}

function codexChat(path: string, id: string, root: string, platform: string): Chat | undefined
{
    const meta = firstJsonLine(path) as { type?: unknown; payload?: { cwd?: unknown; parent_thread_id?: unknown; }; } | undefined;
    const cwd = meta?.type === "session_meta" ? meta.payload?.cwd : undefined;

    if (typeof cwd !== "string" || !samePlace(cwd, root, platform) || meta?.payload?.parent_thread_id !== undefined) {
        return undefined;
    }

    return { host: "codex", id, messages: joinedMessages(jsonLines(path).flatMap(message)) };
}

/** The player's words or the master's of an item; none for a tool, the master's reasoning, or the instructions Codex sends as the player's. */
function message(line: unknown): ChatMessage[]
{
    const item = line as { type?: unknown; timestamp?: unknown; payload?: { type?: unknown; role?: unknown; content?: unknown; }; };
    const role = item.payload?.role;

    if (item.type !== "response_item" || item.payload?.type !== "message" || (role !== "user" && role !== "assistant") || typeof item.timestamp !== "string") {
        return [];
    }

    const kind = role === "user" ? "input_text" : "output_text";
    const content = Array.isArray(item.payload.content) ? item.payload.content as { type?: unknown; text?: unknown; }[] : [];
    const at = item.timestamp;
    return content
        .flatMap((block) => (block.type === kind && typeof block.text === "string" ? [block.text.trim()] : []))
        .filter((text) => text !== "" && !(role === "user" && isInstructions(text)))
        .map((text) => ({ who: role === "user" ? "player" : "master", at, text }));
}

/** What Codex sends as the player's but is not: the campaign's AGENTS.md, and its tags such as <environment_context>. */
function isInstructions(text: string): boolean
{
    return text.startsWith("<") || text.startsWith("# AGENTS.md instructions");
}

function samePlace(one: string, other: string, platform: string): boolean
{
    const key = (path: string): string => (platform === "win32" ? resolve(path).toLowerCase() : resolve(path));
    return key(one) === key(other);
}
