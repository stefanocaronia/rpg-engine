// The campaign's last chat with the master opened at its table on this computer: the host, model and effort chosen, the host's chat to take up again, the
// campaign's file of its flow, and whether the player closed it; a file beside the table's place, never in the campaign.
import { readDataFile } from "../../core/data-file.ts";
import { type HostId, hostIds } from "../../core/hosts.ts";
import { samePath } from "../../core/paths.ts";
import { isHostName } from "../../master/index.ts";
import { isFlowName } from "./flow.ts";
import { tableFile, writeTableFile } from "./place.ts";

/** The last chat's choice, the host's own id of that chat once it said it, the file of its flow in the campaign, and whether the player closed it. */
export interface LastChat
{
    root: string;
    host: HostId;
    model: string;
    effort?: string;
    session?: string;
    flow?: string;
    closed?: true;
}

/**
 * The campaign's last chat; undefined where there is none, the file does not read, names a host the engine does not know, is another campaign's, or names a
 * model or a session no host's program may take.
 */
export function readLastChat(home: string, root: string): LastChat | undefined
{
    const read = (readDataFile(chatFile(home, root)) ?? {}) as Partial<Record<keyof LastChat, unknown>>;
    const { host, model, effort, session, flow, closed } = read;
    const known = typeof read.root === "string" && samePath(read.root, root) && hostIds.includes(host as HostId);

    if (!known || typeof model !== "string" || !isHostName(model) || !optionalText(effort) || !(session === undefined || (typeof session === "string" && isHostName(session)))) {
        return undefined;
    }

    return {
        root,
        host: host as HostId,
        model,
        ...(effort === undefined ? {} : { effort }),
        ...(session === undefined ? {} : { session }),
        // A flow's name that is not one of ours, or a closed that is not true, is as none: the chat is otherwise the same.
        ...(isFlowName(flow) ? { flow } : {}),
        ...(closed === true ? { closed } : {}),
    };
}

/** Writes the campaign's last chat; a file that cannot be written is let be: the next chat starts new. */
export function writeLastChat(home: string, root: string, last: LastChat): void
{
    try {
        writeTableFile(home, chatFile(home, root), last);
    } catch {
        // Nothing the player can do here: the chat goes on.
    }
}

function chatFile(home: string, root: string): string
{
    return tableFile(home, root, ".chat.json");
}

function optionalText(value: unknown): value is string | undefined
{
    return value === undefined || (typeof value === "string" && value !== "");
}
