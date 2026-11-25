// The master: a chat with the AI host's own program, driven by its protocol so that the table can show it.
import { type HostId, hosts } from "../core/hosts.ts";
import type { MasterChat, MasterDriver, MasterOptions } from "./chat.ts";
import { claudeCode } from "./claude-code/index.ts";

export { isHostName } from "./chat.ts";
export type { MasterChat, MasterDriver, MasterEvent, MasterOptions, ToolKind } from "./chat.ts";

/** A host's program on this computer: the command, and the arguments before the host's own. */
export interface HostProgram
{
    command: string;
    args: string[];
}

/** Where a host's program is looked for: the environment, the platform and the player's home; and npm's install, which a driver does not look in. */
export interface ProgramPlaces
{
    environment: NodeJS.ProcessEnv;
    platform: string;
    userHome: string;
    npmProgram?: (host: HostId) => HostProgram | undefined;
}

/** A host a chat with the master may open in: its name, whether its program is on this computer, the model a new chat proposes, the efforts it knows. */
export interface HostOffered
{
    id: HostId;
    name: string;
    found: boolean;
    model: string;
    efforts: string[];
}

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

/** A host's program on this computer, as its driver finds it, else as npm installed it; undefined where neither has it. */
export function hostProgram(host: HostId, places: ProgramPlaces, driverOf: (host: HostId) => MasterDriver | undefined = masterDriver): HostProgram | undefined
{
    return driverOf(host)?.program(places.environment, places.platform, places.userHome) ?? places.npmProgram?.(host);
}

/** The hosts a chat with the master may open in, those with a driver, each with whether `found` finds its program. */
export function hostsOffered(found: (host: HostId) => boolean, driverOf: (host: HostId) => MasterDriver | undefined = masterDriver): HostOffered[]
{
    return masterHosts().flatMap((id) => {
        const driver = driverOf(id);
        return driver === undefined ? [] : [{ id, name: hosts[id].name, found: found(id), model: driver.model, efforts: driver.efforts }];
    });
}
