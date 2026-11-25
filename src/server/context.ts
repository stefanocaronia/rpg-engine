// The context of a server on this computer: a chat's own `rpg mcp`, or its campaign's table (D-582), which serves one chat after another.
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { chosenPictureMaker } from "../campaign/index.ts";
import { chatFolders } from "../chats/index.ts";
import { libraryRunner } from "../commands/shared/books/library-reader.ts";
import { systemConfirm } from "../confirm/index.ts";
import { type Context, defaultContext, packagesFolder } from "../core/context.ts";
import { downloadBytes } from "../core/download.ts";
import { SessionStore } from "../core/session-store.ts";
import { systemPageReader } from "../documents/index.ts";
import { computerHelpers, hostPictures, hostReader, hostWriter } from "../helpers/index.ts";
import { npmEngine, npmPackages } from "../packages/index.ts";
import { loadSystemCode } from "../systems/index.ts";

/** The chat a server serves now, as its context reads it: the name its client gives itself, none before it says it, and the environment it started in. */
export interface ChatSide
{
    host(): string | undefined;
    environment(): Record<string, string | undefined>;
}

/**
 * The context of a server of the campaign of `folder`, a chat's own or its campaign's table, with the session of its files (D-137, D-193): what reaches the
 * player's computer, and what follows the chat it serves.
 */
export async function servedContext(chat: ChatSide, folder = process.cwd()): Promise<{ context: Context; session: SessionStore; }>
{
    // The pictures, by the campaign's choice, else by the chat in use, which names itself as the session starts (D-308, D-572).
    const context: Context = {
        ...defaultContext(folder),
        pictures: hostPictures(chat.host, () => chosenPictureMaker(context.folder)),
        writer: hostWriter(chat.host),
        reader: hostReader(chat.host),
        // The command line that started this server runs the import apart, `rpg import` in the campaign's folder, with the chat's own helper.
        importRunner: (root) => spawn(process.execPath, [process.argv[1] ?? "", "import"], { cwd: root, detached: true, stdio: "ignore", windowsHide: true, env: importEnvironment(chat) }).unref(),
        helpers: computerHelpers(),
        packages: npmPackages(packagesFolder()),
        engine: npmEngine(),
        confirm: systemConfirm(process.platform, process.env),
        ocr: systemPageReader(process.platform, process.env),
        readLibrary: libraryRunner(),
        download: downloadBytes,
        host: chat.host,
        chat: { calls: 0 },
        chatFolders: chatFolders(chat.environment(), homedir()),
    };
    // The systems' code, loaded once for the session, as the engine's own: a system changed since needs the server started again (D-448).
    context.systemCode = await loadSystemCode(context.systemFolders);
    // The game systems, and what this computer translated of them, written only through the session (D-539).
    const session = new SessionStore({ systemFolders: [...context.systemFolders, ...(context.home === undefined ? [] : [join(context.home, "systems")])] });
    return { context: { ...context, files: session }, session };
}

/**
 * The environment of an import a server runs apart: its own, with what the chat it serves adds, as a chat at a table gives a few names of its own, and the
 * chat's host, whose helper it uses (D-582).
 */
export function importEnvironment(chat: ChatSide, own: Record<string, string | undefined> = process.env): Record<string, string | undefined>
{
    return { ...own, ...chat.environment(), RPG_HOST: chat.host() ?? "" };
}
