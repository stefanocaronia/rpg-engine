// Where `rpg mcp` reads its client (D-578): in a campaign, straight from its input, as always; started outside one, as Antigravity's app does, which
// starts one server for all its folders, it becomes the router, with a child `rpg mcp` for each campaign a call plays and one in its own folder.
import type { Readable } from "node:stream";
import { findCampaign } from "../../campaign/index.ts";
import { userDataFolder } from "../../core/context.ts";
import { readLines, startLineProcess } from "../../core/process.ts";
import { notedCampaign, notesFolder, pruneNotes } from "./notes.ts";
import { type ChildServer, mcpRouter } from "./router.ts";

// Set for the router's children, which serve as any server does and never route.
const routedMark = "RPG_ROUTED";

/** The input the MCP server reads; undefined when the router took it, and serves until the client goes. */
export function serverInput(folder = process.cwd(), environment = process.env): Readable | undefined
{
    if (environment[routedMark] === "1" || findCampaign(folder) !== undefined) {
        return process.stdin;
    }

    // Outside a campaign every client gets the router, which passes the lines through to its own folder's child until a call names a conversation: Antigravity's
    // app speaks before its initialize, so its name comes too late to choose by.
    route(process.stdin, folder);
    return undefined;
}

/** The router at work on the process's input and output, its children `rpg mcp` started as this one was; what it does goes to stderr. */
function route(input: Readable, folder: string): void
{
    const log = (line: string): boolean => process.stderr.write(`${line}\n`);
    const home = userDataFolder();
    pruneNotes(home, new Date());
    const router = mcpRouter({
        folder,
        start: startChild,
        campaignOf: (conversation) => notedCampaign(home, conversation),
        toClient: (line) => process.stdout.write(`${line}\n`),
        log,
    });
    log(`rpg mcp router: serving from ${folder}, outside any campaign; the campaigns of the app's conversations are noted in ${notesFolder(home)}`);
    // The client is gone: every child ends with it.
    readLines(input, (line) => void router.fromClient(line), () => {
        router.stop();
        process.exit(0);
    });
}

/** A child `rpg mcp` in a folder, as this process was started; its end, as when its folder is gone, is told to the router. */
function startChild(folder: string): ChildServer
{
    return startLineProcess(process.execPath, [...process.execArgv, process.argv[1] ?? "", "mcp"], { cwd: folder, env: { ...process.env, [routedMark]: "1" } });
}
