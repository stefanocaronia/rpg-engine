// The master: a chat with the AI host's own program, driven by its protocol so that the table can show it.
import type { HostId } from "../core/hosts.ts";
import type { MasterChat, MasterDriver, MasterOptions } from "./chat.ts";
import { claudeCode } from "./claude-code/index.ts";

export { isHostName } from "./chat.ts";
export type { MasterChat, MasterDriver, MasterEvent, MasterOptions, ToolKind } from "./chat.ts";

// The hosts that have a driver.
const drivers: Partial<Record<HostId, MasterDriver>> = { claudeCode };

/** Opens a chat with the master in a host, or takes one up again; undefined for a host that has no driver yet. */
export function openMaster(host: HostId, options: MasterOptions): MasterChat | undefined
{
    return drivers[host]?.open(options);
}

/** The driver of a host: its program, environment, model and efforts; undefined for a host that has none yet. */
export function masterDriver(host: HostId): MasterDriver | undefined
{
    return drivers[host];
}

/** The hosts that have a driver. */
export function masterHosts(): HostId[]
{
    return Object.keys(drivers) as HostId[];
}
