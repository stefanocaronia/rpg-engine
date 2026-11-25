// The table of a campaign (D-582): `rpg table` serves its page with no chat open and runs its chats' commands; `rpg mcp` pipes a chat to it when it is on.
// The table itself, with the MCP server and the page, loads only when asked for: a chat's pipe starts without them.
import type { Opened, RunOptions, TableOptions } from "./serve.ts";

export { type Probed, probeTable } from "./hello.ts";
export { type LastChat, readLastChat, writeLastChat } from "./last-chat.ts";
export { pipeHere, type PipeOptions, pipeToTable, tableEnded } from "./pipe.ts";
export { readPlace, removePlace, type TablePlace, tablePlaces } from "./place.ts";
export type { Opened, RunOptions, Table, TableOptions } from "./serve.ts";

/** `rpg table` in the process's folder, as serve.ts says it. */
export async function runTable(folder?: string, given?: RunOptions): Promise<number>
{
    const table = await import("./serve.ts");
    return table.runTable(folder, given);
}

/** Opens the table of the campaign of `options.folder`, as serve.ts says it. */
export async function openTable(options: TableOptions): Promise<Opened>
{
    const table = await import("./serve.ts");
    return table.openTable(options);
}
