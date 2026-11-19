// Claude Code's chats (T-225): a folder for each folder a chat started in, named after its path, and a .jsonl for each chat, a JSON line for each event.
import { basename, join, resolve } from "node:path";
import { type Chat, type ChatMessage, type ChatSource, joinedMessages } from "./chat.ts";
import { chatFiles, jsonLines } from "./read.ts";

/** The chats Claude Code keeps of the campaign in `root`, in its folder of projects: those started in the campaign's folder, its subagents' left out. */
export function claudeCodeChats(projects: string, root: string): ChatSource[]
{
    return chatFiles(join(projects, projectName(root)), false).map((path) => {
        const id = basename(path, ".jsonl");
        return { host: "claude-code", id, path, read: () => claudeCodeChat(path, id) };
    });
}

/** Claude Code names a project's folder after its path, each character but a letter or a digit made a hyphen. */
export function projectName(root: string): string
{
    return resolve(root).replace(/[^a-zA-Z0-9]/g, "-");
}

function claudeCodeChat(path: string, id: string): Chat
{
    return { host: "claude-code", id, messages: joinedMessages(jsonLines(path).flatMap(message)) };
}

/** The player's words or the master's of an event; none for a tool's call or result, the master's reasoning, a subagent's, or what Claude Code adds itself. */
function message(line: unknown): ChatMessage[]
{
    const event = line as { type?: unknown; isSidechain?: unknown; isMeta?: unknown; timestamp?: unknown; message?: { content?: unknown; }; };

    if ((event.type !== "user" && event.type !== "assistant") || event.isSidechain === true || event.isMeta === true || typeof event.timestamp !== "string") {
        return [];
    }

    const content = event.message?.content;
    const texts = typeof content === "string"
        ? [content]
        : Array.isArray(content)
        ? content.flatMap((block: { type?: unknown; text?: unknown; }) => (block.type === "text" && typeof block.text === "string" ? [block.text] : []))
        : [];
    const who = event.type === "user" ? "player" : "master";
    const at = event.timestamp;
    return texts.map((text) => (who === "player" ? playerText(text) : text.trim())).filter((text) => text !== "").map((text) => ({ who, at, text }));
}

/** What the player wrote, without the reminders Claude Code adds to it; none for a command's output or an interruption, which Claude Code writes as the player's. */
function playerText(text: string): string
{
    const own = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "").trim();
    return own.startsWith("<") || own.startsWith("[Request interrupted") ? "" : own;
}
