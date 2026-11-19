import { join } from "node:path";
import type { ChatFolders } from "../core/context.ts";
import { files } from "../core/store.ts";
import { type Chat, chatText, readChatText, type UndoneStretch } from "./chat.ts";
import { claudeCodeChats } from "./claude-code.ts";
import { codexChats } from "./codex.ts";
import { modifiedAt } from "./read.ts";

/**
 * Copies into `target` each chat of the campaign in `root` that the hosts keep in `folders`, as text, when it is new, changed since it was copied, or copied
 * before the last of the loads that undid a stretch of it; a chat that does not read now is tried again the next time. Each is a file named by the day it
 * began, its host and its id. How many it wrote.
 */
export function keepChats(root: string, target: string, folders: ChatFolders, platform: string, undone: UndoneStretch[]): number
{
    const written = keptNames(target);
    const lastLoad = Math.max(0, ...undone.map((stretch) => Date.parse(stretch.to)));
    let count = 0;

    for (const source of [...claudeCodeChats(folders.claudeCode, root), ...codexChats(folders.codex, root, platform)]) {
        try {
            const suffix = ` ${source.host} ${shortId(source.id)}.md`;
            const before = written.find((name) => name.endsWith(suffix));

            if (before !== undefined && (files().modified(join(target, before)) ?? 0) >= Math.max(modifiedAt(source.path), lastLoad)) {
                continue;
            }

            const chat = source.read();
            const first = chat?.messages[0];

            if (chat === undefined || first === undefined) {
                continue;
            }

            files().write(join(target, `${first.at.slice(0, 10)}${suffix}`), chatText(chat, undone));
            count++;
        } catch {
            // Tried again the next time.
        }
    }

    return count;
}

/** The chats the campaign keeps as text in `target`, read back; a file rpg did not write is left out. Their host's own copy may be gone by now. */
export function keptChats(target: string): Chat[]
{
    return keptNames(target).flatMap((name) => {
        const chat = readChatText(files().text(join(target, name)) ?? "");
        return chat === undefined ? [] : [chat];
    });
}

function keptNames(target: string): string[]
{
    return files().entries(target).filter((entry) => !entry.isFolder && entry.name.endsWith(".md")).map((entry) => entry.name);
}

/** The end of a chat's id, which differs between chats started in the same minute, as the beginning of Codex's does not. */
function shortId(id: string): string
{
    return id.replaceAll("-", "").slice(-8);
}
