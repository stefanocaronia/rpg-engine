import { McpServer, type RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { CallToolResult, ClientCapabilities, ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Readable } from "node:stream";
import { z } from "zod";
import { chosenPictureMaker, findCampaign, hasCharacterAgent, readTextSetting, refreshHostFiles, refreshUserHostFiles } from "../campaign/index.ts";
import { chatFolders } from "../chats/index.ts";
import { commands } from "../commands/index.ts";
import { installCampaignSystem } from "../commands/package/install.ts";
import { libraryRunner } from "../commands/shared/books/library-reader.ts";
import { pagePhrase } from "../commands/shared/books/words.ts";
import { commitSessionStart } from "../commands/shared/campaign/git.ts";
import { outsideNews, whileClosedNews } from "../commands/shared/campaign/outside.ts";
import { newChatText, wentBackTo } from "../commands/shared/campaign/saves.ts";
import { campaignWorld } from "../commands/shared/campaign/world.ts";
import { campaignExamples } from "../commands/shared/examples.ts";
import { packageCommands } from "../commands/shared/packages/code.ts";
import { systemConfirm } from "../confirm/index.ts";
import { type Context, defaultContext, type LaterLines, packagesFolder, type Player, playerWait } from "../core/context.ts";
import { downloadBytes } from "../core/download.ts";
import { type Examples, neutralExamples, withExamples } from "../core/examples.ts";
import type { Command } from "../core/registry.ts";
import { SessionStore } from "../core/session-store.ts";
import { FileStore, withFiles } from "../core/store.ts";
import { getVersion } from "../core/version.ts";
import { systemPageReader } from "../documents/index.ts";
import { computerHelpers, hostPictures, hostReader, hostWriter } from "../helpers/index.ts";
import { hostInstructions, startInstructions } from "../instructions/index.ts";
import { npmEngine, npmPackages } from "../packages/index.ts";
import type { World } from "../pages/index.ts";
import { loadSystemCode } from "../systems/index.ts";
import { chatKeeper } from "./chats.ts";
import { answers, campaignPageElsewhere, campaignPorts, type Dashboard, dashboardAt, isCampaignPage, startDashboard } from "./dashboard/index.ts";
import { fromSubagent, subagentRefusal } from "./subagent.ts";

type AnyCommand = Command<any, any>;
type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

// While the player decides, the call reports progress this often, so that a host does not take it for a call that hangs.
const progressEvery = 20 * 1000;

// A form closed faster than anyone could read it was never shown: the host declares forms it does not show (ASK-6).
const tooFastForPerson = 1500;

// Hosts that declare forms but do not show them, by the entry point Claude Code gives its servers: inside the desktop app a form is closed at once,
// or stays stuck while it renders (tried on 5 October 2026). There the master asks in words (ASK-1).
// A claude started from inside the desktop app inherits its entry point, so its servers leave out the forms too.
const entryPointsWithoutForms = ["claude-desktop"];

// Hosts ask for the tools tens of milliseconds after initialized: the world, which takes a second or more to read in a large campaign, is read after that.
const preloadAfter = 250;
// How often a chat asks after its campaign's page, which another chat serves, to serve it once that one closes (D-577).
const heldAskEvery = 3000;

/** The line that closes every answer of a tool, a phrase of the page's, so that its languages have it. */
export const masterScreenLine = "The text above lies behind the master's screen, forbidden to the players' eyes.";

/**
 * The MCP server: every command becomes a tool with the same name, description and parameters, and answers with the same text as the command line, closed by a line for the player's eyes (T-176). Its instructions send
 * the host to instructions, then status. The commands that ask the player appear for a host that shows forms, through which they ask (D-148), and wherever the
 * dashboard runs, whose page asks first (D-279).
 */
export function createMcpServer(context: Context = defaultContext(), environment: Record<string, string | undefined> = process.env, beforeCall?: () => Promise<void>): McpServer
{
    // The descriptions change together, after a call: hosts hear one list_changed for all of them.
    const server = new McpServer({ name: "rpg", version: getVersion() }, { instructions: startInstructions(), debouncedNotificationMethods: ["notifications/tools/list_changed"] });
    const askingTools: RegisteredTool[] = [];
    // A server lives as long as its chat: it gives each part of the instructions once (D-97).
    context.told ??= new Set();
    context.chat ??= { calls: 0 };
    // What came after a call answered, as a picture made in its place or none, for the next (D-572).
    context.later ??= laterLines();
    // What changed outside the chat's commands, at the head of each call (OUT-1–OUT-4).
    const outside = context.files instanceof SessionStore ? watchOutside(context, context.files) : { take: () => [], giveBack: () => undefined };
    // The campaign's game system, one of ours, installed by itself when it is not on this computer, and said once (SYS-10).
    const installer = systemInstaller(context);

    // Before each call, once the files are read again: the dashboard opens, and its page asks the player too, so the asking tools are there, forms or not (ASK-1, D-279).
    const prepare = async (): Promise<void> => {
        // The campaign's game system first, when it is one of ours missing here, so that the dashboard reads it with its code (SYS-10).
        await installer.install();
        await beforeCall?.();

        if (context.page !== undefined) {
            askingTools.filter((tool) => !tool.enabled).forEach((tool) => tool.enable());
        }
    };

    // The examples of the descriptions in the names of the campaign's system, read without the session's store before the host asks for the tools (D-518).
    const examples = { shown: examplesFor(context, new FileStore(context.systemFolders)) };
    const coreTools = new Map<AnyCommand, RegisteredTool>();
    // The chats copied into the campaign, the first time as the server starts, once its world is read (T-225).
    const keepChats = chatKeeper(context);

    // After every call the descriptions follow the campaign's system, as after init or config system, and the extensions' tools follow campaign.yaml.
    const afterCall = (): Promise<void> => {
        keepChats();
        refreshExamples(coreTools, examples, examplesFor(context, context.files ?? new FileStore(context.systemFolders)));
        return extensions();
    };

    // The tools of the campaign's extensions, kept in step after every call, as one that installs an extension or makes the campaign (D-63).
    const extensions = extensionTools(server, context, (command) => (input: unknown, extra: ToolExtra) => runTool(command, input, context, extra, prepare, installer, outside, examples).finally(afterCall));
    firstExtensions.set(server, extensions());

    for (const command of commands) {
        const tool = server.registerTool(command.name, toolConfig(command, examples.shown), (input: unknown, extra: ToolExtra) => runTool(command, input, context, extra, prepare, installer, outside, examples).finally(afterCall));
        coreTools.set(command, tool);

        if (command.needsPlayer && context.player === undefined) {
            tool.disable();
            askingTools.push(tool);
        }
    }

    server.server.oninitialized = () => {
        const hidesForms = entryPointsWithoutForms.includes(environment.CLAUDE_CODE_ENTRYPOINT ?? "");

        if (context.player === undefined && !hidesForms && showsForms(server.server.getClientCapabilities())) {
            context.player = formPlayer(server, () => {
                context.player = undefined;

                if (context.page === undefined) {
                    askingTools.forEach((tool) => tool.disable());
                }
            });
            askingTools.forEach((tool) => tool.enable());
        }

        // The world is read once the host has the tools, never before: initialize and the list of tools answer at once (D-194). The campaign's system, one of
        // ours missing here, starts to install then, while the player writes: the first call waits for the same install and says it (SYS-10, D-520).
        const installing = (): void => void installer.install().then(afterCall).catch(() => undefined);

        if (context.files instanceof SessionStore) {
            // The campaign's page too, as the chat starts, never waiting for the player's first words (D-577).
            setTimeout(() =>
                void preload(context, context.files as SessionStore).then(() => {
                    void beforeCall?.().catch(() => undefined);
                    installing();
                }), preloadAfter);
        } else {
            installing();
        }
    };

    return server;
}

/**
 * Serves the tools over standard input and output, as AI hosts expect, with the files kept for the whole session (D-137, D-193). It ends when the host
 * goes and its input closes: its watchers, or a player's form still waiting, never keep it alive. `input` is the process's own, or what the router passes on.
 */
export async function startMcpServer(input: Readable = process.stdin): Promise<void>
{
    const leave = (): never => process.exit(0);
    input.on("end", leave);
    input.on("close", leave);
    // The pictures, by the campaign's choice, else by the chat in use, which names itself as the session starts (D-308, D-572).
    let server: ReturnType<typeof createMcpServer> | undefined;
    const host = (): string | undefined => server?.server.getClientVersion()?.name;
    const context: Context = {
        ...defaultContext(),
        pictures: hostPictures(host, () => chosenPictureMaker(context.folder)),
        writer: hostWriter(host),
        reader: hostReader(host),
        // The command line that started this server runs the import apart, `rpg import` in the campaign's folder, with the chat's own helper.
        importRunner: (root) => spawn(process.execPath, [process.argv[1] ?? "", "import"], { cwd: root, detached: true, stdio: "ignore", windowsHide: true, env: { ...process.env, RPG_HOST: host() ?? "" } }).unref(),
        helpers: computerHelpers(),
        packages: npmPackages(packagesFolder()),
        engine: npmEngine(),
        confirm: systemConfirm(process.platform, process.env),
        ocr: systemPageReader(process.platform, process.env),
        readLibrary: libraryRunner(),
        download: downloadBytes,
        host,
        chat: { calls: 0 },
        chatFolders: chatFolders(process.env, homedir()),
    };
    // The systems' code, loaded once for the session, as the engine's own: a system changed since needs the server started again (D-448).
    context.systemCode = await loadSystemCode(context.systemFolders);
    // The game systems, and what this computer translated of them, written only through the session (D-539).
    const session = new SessionStore({ systemFolders: [...context.systemFolders, ...(context.home === undefined ? [] : [join(context.home, "systems")])] });
    const served: Context = { ...context, files: session };
    server = createMcpServer(served, process.env, dashboardOpener(served, session).open);
    // The extensions' tools are there in the first list the host asks for.
    await firstExtensions.get(server);
    await server.connect(new StdioServerTransport(input));
}

/**
 * Opens the player's dashboard as the chat starts and before the first call that finds a campaign in the server's folder, as after init, and lets that call
 * wait for it, so that its status gives the link (D-270, D-277, D-577); never in a folder without a campaign. Where another chat of the campaign serves its
 * page, the link is that page's, and this chat asks after it every few seconds, to serve it at the same port once that chat closes. The game goes on without it.
 */
export function dashboardOpener(context: Context, session: SessionStore, ports?: number[]): { open(): Promise<void>; close(): Promise<void>; }
{
    let opening: Promise<Dashboard | undefined> | undefined;
    // The page another chat serves, and the wait for it to go.
    let held: string | undefined;
    let waiting: NodeJS.Timeout | undefined;
    let closed = false;

    const open = async (): Promise<void> => {
        const root = withFiles(session, () => findCampaign(context.folder));
        opening ??= root === undefined ? undefined : startDashboard(context, session, { ports }).catch(() => undefined);
        const dashboard = await opening;

        if (dashboard === undefined && root !== undefined && held === undefined && waiting === undefined && !closed) {
            const elsewhere = await campaignPageElsewhere(root, ports ?? campaignPorts(root));

            if (elsewhere !== undefined && !closed && waiting === undefined) {
                held = elsewhere.url;
                waitFor(root, elsewhere.port);
            }
        }

        context.dashboard = dashboard?.url ?? held;
        context.dashboardHeld = dashboard === undefined && held !== undefined;
        context.page = dashboard?.player;
        context.news = dashboard?.news;
    };

    // Asks after the page, saying this chat waits there, so that the doorbell does not take that chat's for this one's; once it goes, serves it. A page
    // that does not answer while its port still takes calls is a chat busy with its world: it is still there.
    const waitFor = (root: string, port: number): void => {
        waiting = setInterval(() => {
            void dashboardAt(port, process.env.CLAUDE_CODE_SESSION_ID).then(async (there) => {
                const gone = there === undefined ? !(await answers(port)) : !isCampaignPage(there, root);

                if (closed || waiting === undefined || !gone) {
                    return;
                }

                clearInterval(waiting);
                waiting = undefined;
                held = undefined;
                opening = undefined;
                void open().catch(() => undefined);
            });
        }, heldAskEvery);
        waiting.unref();
    };

    return {
        open,
        close: async () => {
            closed = true;
            clearInterval(waiting);
            await (await opening)?.close();
        },
    };
}

/** What a host reads of each of the core's tools in the campaign of this context's folder: its description, then its parameters', with the examples of its system (D-518). */
export function toolDescriptions(context: Context): Record<string, string>
{
    const examples = examplesFor(context, new FileStore(context.systemFolders));
    return Object.fromEntries(commands.map((command) => {
        const fields = Object.values(shownInput(command, examples).properties ?? {}).map((field) => field.description ?? "");
        return [command.name, [withExamples(command.description, examples), ...fields].join("\n")];
    }));
}

/**
 * Reads the campaign of the server's folder, if there is one, before the first call needs it; a campaign that does not read waits for that call to say why.
 * Its start lines in AGENTS.md follow the engine, as after an update (D-97).
 */
async function preload(context: Context, session: SessionStore): Promise<void>
{
    try {
        await session.ready(true);
        withFiles(session, () => {
            const root = findCampaign(context.folder);

            if (root !== undefined) {
                session.track(root);
                // An agent written now reaches only the chats after this one (D-490).
                context.characterAgents = hasCharacterAgent(root);
                refreshHostFiles(root, hostInstructions(), context.platform);

                if (context.userHome !== undefined) {
                    refreshUserHostFiles(context.userHome, context.platform);
                }

                campaignWorld(root, context);
                // What the last session left, committed as this one starts, where the campaign keeps itself in git (D-576).
                void commitSessionStart(root, context);
            }
        });
    } catch {
        // The call that needs the campaign reads it again, and says what is wrong.
    }
}

// The first loading of each server's extension tools, which the server started for a host waits for.
const firstExtensions = new WeakMap<McpServer, Promise<void>>();

/**
 * Keeps the tools of the campaign's extensions in step with campaign.yaml (D-63, D-428): a tool is registered once its code is loaded, and enabled only while
 * the campaign uses its extension; hosts hear the list changed. What does not load stays out: status and validate say why.
 */
function extensionTools(server: McpServer, context: Context, handler: (command: AnyCommand) => (input: unknown, extra: ToolExtra) => Promise<CallToolResult>): () => Promise<void>
{
    // Each tool with the package and version that give it: another one in its place is registered anew.
    const registered = new Map<string, { tool: RegisteredTool; source: string; }>();
    let running = Promise.resolve();

    const sync = async (): Promise<void> => {
        const store = context.files ?? new FileStore(context.systemFolders);
        const own = await withFiles(store, async () => {
            const root = findCampaign(context.folder);
            return root === undefined ? { commands: [], sources: {} as Record<string, string> } : await packageCommands(root, context);
        });

        for (const command of own.commands) {
            const kept = registered.get(command.name);
            const source = own.sources[command.name] ?? "";

            if (kept !== undefined && kept.source !== source) {
                kept.tool.remove();
            }

            if (kept === undefined || kept.source !== source) {
                // A command that does not register leaves the others theirs: validate names what is wrong with it.
                try {
                    registered.set(command.name, { tool: server.registerTool(command.name, toolConfig(command, neutralExamples), handler(command)), source });
                } catch {
                    registered.delete(command.name);
                }
            } else if (!kept.tool.enabled) {
                kept.tool.enable();
            }
        }

        for (const [name, kept] of registered) {
            if (kept.tool.enabled && !own.commands.some((command) => command.name === name)) {
                kept.tool.disable();
            }
        }
    };

    // One at a time, and never failing the call it follows.
    return () => (running = running.then(sync).catch(() => undefined));
}

/**
 * The host is shown each tool's parameters as they are, strict; the SDK lets any object through, so that runTool checks it and says how to call the tool:
 * a master who calls one without loading its schema reads its parameters in the answer, not zod's words before our handler.
 */
function toolConfig(command: AnyCommand, examples: Examples)
{
    const annotations = command.readOnly ? { readOnlyHint: true } : undefined;
    const meta = command.alwaysLoad ? { "anthropic/alwaysLoad": true } : undefined;
    return { description: withExamples(command.description, examples), inputSchema: shownSchema(command, examples), annotations, _meta: meta };
}

/** The examples for the campaign of the server's folder, read through a store; neutral where it has none, or where it does not read. */
function examplesFor(context: Context, store: FileStore): Examples
{
    try {
        return withFiles(store, () => campaignExamples(findCampaign(context.folder), context));
    } catch {
        return neutralExamples;
    }
}

/** Gives the core's tools the examples of a system other than the one shown, as after config system: the host hears that the list changed. */
function refreshExamples(tools: Map<AnyCommand, RegisteredTool>, examples: { shown: Examples; }, now: Examples): void
{
    if (JSON.stringify(now) === JSON.stringify(examples.shown)) {
        return;
    }

    examples.shown = now;

    for (const [command, tool] of tools) {
        tool.inputSchema = shownSchema(command, now);
        tool.update({ description: withExamples(command.description, now) });
    }
}

function shownSchema(command: AnyCommand, examples: Examples)
{
    return z.looseObject({}).meta(shownInput(command, examples));
}

// The JSON schema of each command's input, as the SDK would write it from the strict schema.
const shownInputs = new WeakMap<AnyCommand, ShownInput>();

type ShownInput = z.core.JSONSchema.BaseSchema & { properties?: Record<string, { description?: string; }>; required?: string[]; };

function shownInput(command: AnyCommand, examples: Examples): ShownInput
{
    let shown = shownInputs.get(command);

    if (shown === undefined) {
        shown = z.toJSONSchema(command.input.strict(), { target: "draft-7", io: "input" }) as ShownInput;
        shownInputs.set(command, shown);
    }

    const fields: Record<string, { description?: string; }> = shown.properties ?? {};
    const properties = Object.entries(fields).map(([name, field]) => [name, field.description === undefined ? field : { ...field, description: withExamples(field.description, examples) }]);
    return shown.properties === undefined ? shown : { ...shown, properties: Object.fromEntries(properties) as ShownInput["properties"] };
}

/** The command's input, checked as its schema says; what is wrong comes with every parameter the tool takes, for a call made without the schema. */
function checkedInput(command: AnyCommand, input: unknown, examples: Examples): unknown
{
    const parsed = (command.input as z.ZodObject).strict().safeParse(input ?? {});

    if (parsed.success) {
        return parsed.data;
    }

    const given = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
    const wrong = parsed.error.issues.map((issue) => inputIssue(command.name, issue, given));
    const shown = shownInput(command, examples);
    const required = shown.required ?? [];
    const parameters = Object.entries(shown.properties ?? {}).map(([name, field]) => `- ${name}${required.includes(name) ? "" : " (optional)"}${field.description === undefined ? "" : `: ${field.description}`}`);
    const takes = parameters.length === 0 ? `${command.name} takes no parameters.` : `${command.name} takes:\n${parameters.join("\n")}`;
    throw new Error(`${wrong.join(" ")} Nothing changed: call it again with its parameters.\n${takes}`);
}

function inputIssue(tool: string, issue: z.core.$ZodIssue, given: Record<string, unknown>): string
{
    const path = issue.path.map(String).join(".");

    if (issue.code === "unrecognized_keys") {
        const keys = issue.keys.join(", ");
        return path === "" ? `${tool} has no parameter ${keys}.` : `${path} has no ${keys}.`;
    }

    // A parameter left out, whatever zod calls it: a missing word of a list is an invalid option to it.
    if (issue.path.length === 1 && given[path] === undefined) {
        return `${tool} needs ${path}.`;
    }

    return path === "" ? `${issue.message}.` : `${path}: ${issue.message}.`;
}

async function runTool(
    command: AnyCommand,
    input: unknown,
    context: Context,
    extra: ToolExtra,
    prepare: () => Promise<void>,
    installer: Installer,
    outside: Told,
    examples: { shown: Examples; },
): Promise<CallToolResult>
{
    // A character's subagent only looks, and takes none of the master's lines (D-580).
    if (fromSubagent(extra._meta)) {
        // Only view, and only as a character: without `as` it would be the player's own view, which is not theirs.
        const as = (input as { as?: unknown; } | null)?.as;
        const looks = command.name === "view" && typeof as === "string" && as.trim() !== "";
        return looks ? subagentView(command, input, context, extra, prepare, examples) : { content: [{ type: "text", text: subagentRefusal }], isError: true };
    }

    const keepAlive = command.needsPlayer || command.waitsForPlayer
        ? reportProgress(extra, () => (context.page?.asking?.() === true ? "waiting for the player's click on the dashboard" : "waiting for the player"))
        : command.slow === true
        ? reportProgress(extra, () => "still working")
        : undefined;
    // Any call that waits for the campaign's system to install, as on a slow network, says so too (SYS-10).
    const installing = keepAlive === undefined ? reportProgress(extra, () => "installing the campaign's game system", installer.busy) : undefined;
    let news: { lines: string[]; restore(): void; } | undefined;
    let changedOutside: string[] = [];
    let installed: string[] = [];
    let later: string[] = [];
    // The call tells its parts on a copy of what the chat was told, given back at its end: an answer that never goes tells nothing, so its parts are told again
    // (D-97), and what a call beside it told stays told.
    const before = new Set(context.told);
    const told = new Set(context.told);
    const chat = context.chat;
    const offered = chat?.dashboardOffered;
    // Codex names its thread at each call: the player's sentences go to it (D-495).
    const thread = extra._meta?.threadId;

    if (chat !== undefined) {
        chat.calls++;
        chat.thread = typeof thread === "string" && thread !== "" ? thread : chat.thread;
        chat.beforeCall?.();
    }

    try {
        // In a session, the files that changed since the last call are read again; instructions starts a chat, or follows a summary: everything is checked (D-193).
        if (context.files instanceof SessionStore) {
            await context.files.ready(command.name === "instructions");
        }

        await prepare();
        // The campaign's system installed by itself, said first (SYS-10); a call stopped while it installed leaves the line to the next.
        installed = extra.signal.aborted ? [] : installer.take();
        // What came after the last calls answered, as a picture Claude drew in another's place, right after (D-572).
        later = extra.signal.aborted ? [] : (context.later?.take() ?? []);
        // After a load the chat going on remembers what is gone: nothing runs in it, until a new chat begins with instructions (D-361).
        const back = chatAfterLoad(context, command.name, input);

        if (back.refused !== undefined) {
            news = context.news?.(told);
            return { content: [{ type: "text", text: [...installed, ...later, ...(news?.lines ?? []), back.refused].join("\n\n") }, masterOnly(context)], isError: true };
        }

        const checked = checkedInput(command, input, examples.shown);

        // Stopped while the call was made ready, as while the system installed: the command never runs, so that calling it again does it once.
        if (extra.signal.aborted) {
            throw new Error("The call was stopped before it ran: nothing changed.");
        }

        // What changed outside the chat comes before the command runs on it, its events fired (OUT-3).
        changedOutside = outside.take();
        // The call's own context, with its cancel, as the user stopping it (ASK-9).
        const text = command.format(await command.run(checked, { ...context, told, signal: extra.signal }));
        // What the player changed on the dashboard comes first, once, what they changed while the call waited included (D-341).
        news = context.news?.(told);
        return { content: [{ type: "text", text: [...installed, ...later, ...(news?.lines ?? []), ...changedOutside, ...back.begun, text].join("\n\n") }, masterOnly(context)] };
    } catch (error) {
        news ??= context.news?.(told);
        const said = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: [...installed, ...later, ...(news?.lines ?? []), ...changedOutside, said].join("\n\n") }, masterOnly(context)], isError: true };
    } finally {
        clearInterval(keepAlive);
        clearInterval(installing);

        // An answer that never goes, as for a call the user stopped, gives what the player changed back to the next one, and its parts.
        if (extra.signal.aborted) {
            news?.restore();
            installer.giveBack(installed);
            context.later?.giveBack(later);
            outside.giveBack(changedOutside);

            if (chat !== undefined) {
                chat.dashboardOffered = offered;
            }
        }

        if (!extra.signal.aborted) {
            keepTold(context.told, before, told);
        }

        if (chat !== undefined) {
            chat.calls--;
            chat.afterCall?.();
        }
    }
}

/**
 * A view of a character's subagent (D-580): it runs as any call, but takes none of the lines meant for the master, as what the player changed or what changed
 * outside the chat, counts in none of the chat's calls, and tells the master's chat nothing.
 */
async function subagentView(command: AnyCommand, input: unknown, context: Context, extra: ToolExtra, prepare: () => Promise<void>, examples: { shown: Examples; }): Promise<CallToolResult>
{
    try {
        if (context.files instanceof SessionStore) {
            await context.files.ready(false);
        }

        await prepare();
        const checked = checkedInput(command, input, examples.shown);
        const text = command.format(await command.run(checked, { ...context, told: new Set(context.told), signal: extra.signal }));
        return { content: [{ type: "text", text }, masterOnly(context)] };
    } catch (error) {
        return { content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }, masterOnly(context)], isError: true };
    }
}

/** Lines for the master at the head of a call, once: taken by the call, given back by one whose answer never goes. */
interface Told
{
    take(): string[];
    giveBack(lines: string[]): void;
}

/** The campaign's system installed by itself, and whether an install is under way or waited for. */
interface Installer extends Told
{
    install(): Promise<void>;
    busy(): boolean;
}

/**
 * The campaign's game system installed by itself when it is one of ours not on this computer (SYS-10, D-514 (3)): tried once for each system a campaign of
 * the server's folder names, before a call; its line, that it was installed or why not, for the call that answers.
 */
function systemInstaller(context: Context): Installer
{
    const tried = new Set<string>();
    let untold: string[] = [];
    let installing = Promise.resolve();
    let waiting = 0;

    return {
        // One at a time: two calls at once wait for the same install.
        install: () => {
            waiting++;
            installing = installing.then(async () => {
                // A campaign that does not read installs nothing: the call says why.
                const line = await installCampaignSystem(context, tried).catch(() => undefined);
                untold = line === undefined ? untold : [...untold, line];
            }).finally(() => waiting--);
            return installing;
        },
        busy: () => waiting > 0,
        take: () => {
            const lines = untold;
            untold = [];
            return lines;
        },
        giveBack: (lines) => {
            untold = [...lines, ...untold];
        },
    };
}

/** Lines a command leaves for the master's next call, as of a picture that came after its call answered (D-572). */
function laterLines(): LaterLines
{
    let untold: string[] = [];
    return {
        add: (line) => {
            untold = [...untold, line];
        },
        take: () => {
            const lines = untold;
            untold = [];
            return lines;
        },
        giveBack: (lines) => {
            untold = [...lines, ...untold];
        },
    };
}

/**
 * What changed outside the chat's commands since its last call (OUT-1–OUT-4): the world as it was is read before the session lets the changes in, so that the
 * events they set off fire; at the server's first call, the files changed while no chat was open.
 */
function watchOutside(context: Context, session: SessionStore): Told
{
    let before: World | undefined;
    let first = true;
    // What an answer that never went told, for the next call; and when the chat began, for what changed while no chat was open.
    let untold: string[] = [];
    const began = Date.now();

    const inCampaign = <T>(work: (root: string) => T, none: T): T => {
        try {
            return withFiles(session, () => {
                const root = findCampaign(context.folder);
                return root === undefined ? none : work(root);
            });
        } catch {
            // A campaign that does not read now: the command says why.
            return none;
        }
    };

    session.beforeOutsideChanges(() => {
        before ??= inCampaign((root) => campaignWorld(root, context), undefined);
    });

    return {
        take: () => {
            const lines = [...untold, ...inCampaign((root) => [...(first ? whileClosedNews(root, context, began) : []), ...outsideNews(root, context, session.takeOutsideChanges(), before)], [])];
            untold = [];
            first = false;
            before = undefined;
            return lines;
        },
        giveBack: (lines) => {
            untold = [...lines, ...untold];
        },
    };
}

/**
 * The chat after a load (SAV-5, D-361, D-362): one going on when the game went back remembers what is gone, so every call is refused but instructions, which
 * begins a chat, and save new chat, once the player confirms the chat began after it; or until the player confirms it on the dashboard.
 */
function chatAfterLoad(context: Context, command: string, input: unknown): { refused?: string; begun: string[]; }
{
    const run = <T>(work: () => T): T => (context.files === undefined ? work() : withFiles(context.files, work));
    return run(() => {
        const root = findCampaign(context.folder);
        const save = root === undefined ? undefined : wentBackTo(root);

        if (root === undefined || save === undefined) {
            return { begun: [] };
        }

        const confirmed = command === "save" && (input as { action?: unknown; } | undefined)?.action === "new chat";

        if (command !== "instructions" && !confirmed) {
            return {
                refused: `The game went back to save ${save}. If this chat went on before that: ${newChatText} If it began after: ask the player to confirm it, `
                    + "here or on the dashboard, then call save with action new chat.",
                begun: [],
            };
        }

        return {
            begun: confirmed ? [] : [
                `The game went back to save ${save}. Before going on, ask the player to confirm this chat began after it, here or on the dashboard (Saves), then call save `
                + `with action new chat; if it went on before, ${newChatText.charAt(0).toLowerCase()}${newChatText.slice(1)}`,
            ],
        };
    });
}

/** Whether the host shows forms (MCP elicitation): before the url mode existed, a capability without modes meant forms. */
function showsForms(capabilities: ClientCapabilities | undefined): boolean
{
    const elicitation = capabilities?.elicitation as { form?: unknown; url?: unknown; } | undefined;
    return elicitation !== undefined && (elicitation.form !== undefined || elicitation.url === undefined);
}

/**
 * The player through the host's forms: one question, one choice among the labels, required; undefined when no one answered or the form failed.
 * A form refused or failed faster than a person could read it was never shown: `unavailable` takes the buttons away for the rest of the session.
 */
function formPlayer(server: McpServer, unavailable: () => void): Player
{
    return {
        async choose(question, title, labels, signal)
        {
            const started = Date.now();

            const notShown = (): "unavailable" | undefined => {
                if (Date.now() - started >= tooFastForPerson) {
                    return undefined;
                }

                unavailable();
                return "unavailable";
            };

            try {
                const requestedSchema = { type: "object" as const, properties: { choice: { type: "string" as const, title, enum: labels } }, required: ["choice"] };
                // A stop of the call closes the form too (ASK-9).
                const reply = await server.server.elicitInput({ mode: "form", message: question, requestedSchema }, { timeout: playerWait, signal });

                if (reply.action !== "accept") {
                    return notShown();
                }

                const index = labels.indexOf(String(reply.content?.choice));
                return index === -1 ? undefined : index;
            } catch {
                return signal?.aborted === true ? undefined : notShown();
            }
        },
    };
}

/**
 * Progress notifications while the player decides or a slow command works, when the host asked for them, saying what it waits for; only while `now` holds,
 * when given. Undefined when the host asked for none.
 */
function reportProgress(extra: ToolExtra, saying: () => string, now: () => boolean = () => true): ReturnType<typeof setInterval> | undefined
{
    const progressToken = extra._meta?.progressToken;

    if (progressToken === undefined) {
        return undefined;
    }

    let progress = 0;
    return setInterval(() => {
        if (!now()) {
            return;
        }

        void extra.sendNotification({ method: "notifications/progress", params: { progressToken, progress: ++progress, message: saying() } }).catch(() => undefined);
    }, progressEvery);
}

/** What a call told, and what it took back as no longer so, brought into what the chat was told: never what another call beside it changed. */
function keepTold(chat: Set<string> | undefined, before: Set<string>, after: Set<string>): void
{
    after.forEach((name) => (before.has(name) ? undefined : chat?.add(name)));
    before.forEach((name) => (after.has(name) ? undefined : chat?.delete(name)));
}

/**
 * The block that closes every answer (T-176): Codex shows the player the last three lines of a tool's answer, blank ones too, and these tell nothing of the
 * game; in the campaign's language, English before it has one.
 */
function masterOnly(context: Context): { type: "text"; text: string; }
{
    const read = (): string | undefined => {
        const root = findCampaign(context.folder);
        return root === undefined ? undefined : readTextSetting(root, "language");
    };

    const language = context.files === undefined ? read() : withFiles(context.files, read);
    return { type: "text", text: `\n\n${pagePhrase(context, language, masterScreenLine)}` };
}
