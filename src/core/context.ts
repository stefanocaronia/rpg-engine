import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { FileStore } from "./store.ts";

/** What a command needs from the outside world: tests replace it to get repeatable results. */
export interface Context
{
    /** Folder the command runs in: commands look for the campaign here and in the folders above. */
    folder: string;
    /** Rolls one digital die: an integer from 1 to `sides`. */
    random(sides: number): number;
    now(): Date;
    /** A new short id for a line of the log. */
    newId(): string;
    /** A new random salt for a hidden roll. */
    newSalt(): string;
    /** Who acts: the master, the player or a companion. For now always the master. */
    actor: string;
    /** The operating system, as Node names it (win32, linux, darwin): some files differ by it. */
    platform: string;
    /** The player, where the surface can ask them directly, as an AI host that shows forms does (D-148); missing elsewhere. */
    player?: Player;
    /** The player through the dashboard's page, when the MCP server serves one (D-279): it comes before the form, while a page is open. */
    page?: Player;
    /** The call's cancel, as the host sends it when the user stops the call (ASK-9); MCP only. */
    signal?: AbortSignal;
    /** The folders that hold the installed game systems, nearest first (SYS-1). */
    systemFolders: string[];
    /** The files as the MCP server keeps them for a whole session (D-137, D-193); without it, each call reads them afresh. */
    files?: FileStore;
    /** The parts of the instructions already given in this chat, which the MCP server keeps until instructions starts over (D-97); without it, every call gives them. */
    told?: Set<string>;
    /** The link of the player's dashboard, when the MCP server serves one (D-270); status gives it. */
    dashboard?: string;
}

/**
 * Asks the player one question with buttons: the index of the label they chose; undefined when no one answered; "unavailable" when the surface turned out
 * unable to show the buttons, so that from then on the master asks in words; "absent" when no one is there to see them now, as a dashboard with no page open.
 */
export interface Player
{
    choose(question: string, title: string, labels: string[], signal?: AbortSignal): Promise<number | undefined | "unavailable" | "absent">;
}

export function defaultContext(folder = process.cwd()): Context
{
    return {
        folder,
        random: (sides) => randomInt(1, sides + 1),
        now: () => new Date(),
        newId: () => randomUUID().replaceAll("-", "").slice(0, 8),
        newSalt: () => randomBytes(16).toString("hex"),
        actor: "master",
        platform: process.platform,
        // From src/core/ and from dist/core/ alike, the package's systems/ folder is two levels up.
        systemFolders: [fileURLToPath(new URL("../../systems/", import.meta.url))],
    };
}
