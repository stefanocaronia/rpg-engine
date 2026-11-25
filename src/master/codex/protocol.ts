// Codex's app-server protocol as the table speaks it: JSON-RPC, one JSON object a line each way; Codex leaves out the version on its own lines.
import { getVersion } from "../../core/version.ts";
import type { Message } from "../lines.ts";

/** The table's first request: who it is, and the protocol's experimental fields, which the thread's options are among. */
export function initializeParams(): Message
{
    return { clientInfo: { name: "rpg-engine", title: "RPG Engine", version: getVersion() }, capabilities: { experimentalApi: true } };
}
