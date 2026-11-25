// What the launcher answers at each address: first the gate, which lets in only its own page at its own address; then its API, a table by path, whose writes
// come only from the page itself; then its page and the page's files.
import type { IncomingMessage, ServerResponse } from "node:http";
import { isAbsolute, join, resolve } from "node:path";
import { z } from "zod";
import type { ChosenFolder } from "../../confirm/index.ts";
import { files, FileStore, withFiles } from "../../core/store.ts";
import type { WindowOpener } from "../../desktop/index.ts";
import type { HostOffered } from "../../master/index.ts";
import { readableSystems } from "../../systems/index.ts";
import { fromOwnPage, launcherHtml, pageFile, pagePolicy, pageWrites, readBody, refusedAt, securityHeaders, send, sendFile, sendJson, vendorModule } from "../page/index.ts";
import { campaignsFolder, type CampaignShown, forgetCampaign, holdsCampaign, rememberCampaign } from "./campaigns.ts";
import { makeCampaign, type MakeWhere, windowsNameProblem } from "./make.ts";
import { openCampaign } from "./open.ts";

/** What the launcher keeps while it runs, shared by its routes. */
export interface LauncherServed
{
    port: number;
    version: string;
    /** The folder of the built page. */
    page: string;
    /** The place's token, which alone asks the launcher to quit. */
    token: string;
    userHome: string;
    /** The engine's data folder, where the list of campaigns is. */
    home: string;
    /** The pages open, which wait for notices. */
    pages: Set<ServerResponse>;
    campaigns(): Promise<CampaignShown[]>;
    hosts(): HostOffered[];
    pick(): Promise<ChosenFolder>;
    /** Whether the window to choose a folder is open now: one at a time. */
    picking: boolean;
    /** Whether the launcher looked for one started beside it and kept its place: until then, who looks for the launcher reads that it is starting. */
    settled: boolean;
    making: MakeWhere;
    /** Opens a campaign's page in an application window of its own, once its table answers: whether one opened, else the page goes there itself. */
    openWindow: WindowOpener;
    /** Tells the pages that the list changed. */
    notify(): void;
    quit(): void;
}

/** What an address of the launcher's API does when read, and when its page writes to it. */
interface Route
{
    get?: (request: IncomingMessage, response: ServerResponse, served: LauncherServed) => Promise<void> | void;
    post?: (request: IncomingMessage, response: ServerResponse, served: LauncherServed) => Promise<void> | void;
}

// The launcher's API by exact path: the campaigns and what the page asks of them; and the launcher's engine alone, from memory, which reads no disk, for
// whoever looks for the launcher to tell one that is there from one that is gone; a 503 while it is starting, as it may still give way to another.
const routes: Record<string, Route> = {
    "/api/launcher": { get: async (request, response, served) => sendJson(response, 200, await launcherNow(served)), post: changeLauncher },
    "/api/ping": {
        get: (request, response, served) => sendJson(response, served.settled ? 200 : 503, { launcher: true, version: served.version, ...(served.settled ? {} : { starting: true }) }),
    },
};

/** The launcher's API by exact path, with what each takes. */
export const launcherRoutes: readonly { path: string; get: boolean; post: boolean; }[] = Object.entries(routes).map(([path, route]) => ({
    path,
    get: route.get !== undefined,
    post: route.post !== undefined,
}));

/** Answers a request to the launcher: refused unless it comes from its own page at its own address; then by its API, else by its page's files. */
export async function answerLauncher(request: IncomingMessage, response: ServerResponse, served: LauncherServed): Promise<void>
{
    const base = `http://127.0.0.1:${served.port}`;
    const url = URL.parse(request.url ?? "/", base) ?? new URL("/404", base);
    const path = url.pathname;
    const reads = request.method === "GET" || request.method === "HEAD";
    const route = routes[path];

    if (!fromOwnPage(request, path, served.port)) {
        send(response, 403, "text/plain; charset=utf-8", refusedAt("The launcher", served.port));
    } else if (pageWrites(request) && route?.post !== undefined) {
        await route.post(request, response, served);
    } else if (reads && route?.get !== undefined) {
        await route.get(request, response, served);
    } else if (!reads) {
        send(response, 405, "text/plain; charset=utf-8", "The launcher only gives the campaigns of this computer, and takes what its own page asks.");
    } else if (path === "/") {
        send(response, 200, "text/html; charset=utf-8", launcherHtml, pagePolicy);
    } else if (path === "/favicon.ico") {
        response.writeHead(204, securityHeaders).end();
    } else if (path === "/events") {
        listen(response, served);
    } else if (path.startsWith("/vendor/")) {
        sendFile(vendorModule(path.slice("/vendor/".length)), path, request, response);
    } else {
        sendFile(pageFile(served.page, path), path, request, response);
    }
}

// A folder the page names: a whole path, of a reasonable length, in one form however it is written, so that the list, the tables' places and their keys see
// the same folder. Any such path opens, adds or forgets a campaign, so that whatever is in the list can be opened and taken off it.
const folderPath = z.string()
    .refine((path) => path.length <= 1000, "The folder's path is too long: give one of at most 1000 characters.")
    .refine((path) => !path.includes("\0") && isAbsolute(path), "Give the folder's whole path, from the root of its disk.")
    .transform((path) => resolve(path));
// The folder a campaign is made in: on Windows, one that Windows can use as written.
const newFolder = folderPath
    .transform((folder, context) => {
        const problem = process.platform === "win32" ? windowsNameProblem(folder) : undefined;

        if (problem !== undefined) {
            context.addIssue({ code: "custom", message: problem });
            return z.NEVER;
        }

        return folder;
    });
const word = (what: string): z.ZodType<string> => z.string().refine((text) => text.length >= 1 && text.length <= 200, `Give ${what} in 1 to 200 characters.`);

const openAsked = z.object({ root: folderPath }).strict();
const createAsked = z.object({
    name: z.string()
        .trim()
        .refine((name) => name.length >= 1 && name.length <= 80, "Give the campaign a name of 1 to 80 characters.")
        .refine((name) => !/[\u0000-\u001f\u007f]/.test(name), "Give the campaign a name on one line, without tabs or other control characters."),
    folder: newFolder.optional(),
    language: z.string().refine((code) => /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(code), "Give the campaign's language by its code, such as en or pt-BR."),
    system: word("the game system's name"),
    host: word("the host's name").optional(),
    model: word("the model's name").optional(),
    effort: word("the effort").optional(),
}).strict();
const quitAsked = z.object({ token: z.string().max(200) }).strict();

const asked = z.union([
    z.object({ open: openAsked }).strict(),
    z.object({ create: createAsked }).strict(),
    z.object({ add: openAsked }).strict(),
    z.object({ pick: z.literal(true) }).strict(),
    z.object({ forget: openAsked }).strict(),
    z.object({ quit: quitAsked }).strict(),
]);

// Each part a body may have, to say what is wrong in one of the right shape.
const parts: Record<string, z.ZodType> = { open: openAsked, create: createAsked, add: openAsked, pick: z.literal(true), forget: openAsked, quit: quitAsked };

const shapes = "Send one of { open: { root } }, { create: { name, folder?, language, system, host?, model?, effort? } }, { add: { root } }, { pick: true }, "
    + "{ forget: { root } } or { quit: { token } }.";

/** What the page shows: the launcher's engine, the folder of new campaigns, the campaigns, and what a new one may be made with. */
async function launcherNow(served: LauncherServed): Promise<object>
{
    return {
        launcher: true,
        version: served.version,
        folder: campaignsFolder(served.userHome),
        campaigns: await served.campaigns(),
        hosts: served.hosts(),
        systems: withFiles(new FileStore(), () => readableSystems(served.making.context.systemFolders).map((system) => ({ name: system.name, title: system.title }))),
        languages: pageLanguages(served.page),
    };
}

/** What the page asks of the launcher: a campaign opened, made, added or forgotten, a folder chosen, or the launcher's end. */
async function changeLauncher(request: IncomingMessage, response: ServerResponse, served: LauncherServed): Promise<void>
{
    const body = await readBody(request, 16_000);
    const parsed = asked.safeParse(body);

    if (!parsed.success) {
        sendJson(response, 400, { error: refusal(body) });
        return;
    }

    const wish = parsed.data;

    if ("open" in wish) {
        const opened = await openCampaign(wish.open.root, served.making.tables);

        if (!("url" in opened)) {
            sendJson(response, 409, opened);
            return;
        }

        rememberCampaign(served.home, wish.open.root, served.making.now());
        served.notify();
        sendJson(response, 200, { url: opened.url, window: await served.openWindow(opened.url, "campaign") });
    } else if ("create" in wish) {
        const made = await makeCampaign(wish.create, served.making);

        if (made.root !== undefined) {
            served.notify();
        }

        sendJson(response, "url" in made ? 200 : 409, "url" in made ? { ...made, window: await served.openWindow(made.url, "campaign") } : made);
    } else if ("add" in wish) {
        await addCampaign(wish.add.root, response, served);
    } else if ("pick" in wish) {
        await pickFolder(response, served);
    } else if ("forget" in wish) {
        forgetCampaign(served.home, wish.forget.root);
        served.notify();
        sendJson(response, 200, { campaigns: await served.campaigns() });
    } else if (wish.quit.token === served.token) {
        sendJson(response, 200, {});
        served.quit();
    } else {
        sendJson(response, 403, { error: "Only who reads the launcher's place may ask it to quit." });
    }
}

/** Why a body was refused: what is wrong with a part of the right shape, else the shapes. */
function refusal(body: unknown): string
{
    const keys = typeof body === "object" && body !== null && !Array.isArray(body) ? Object.keys(body) : [];
    const part = keys.length === 1 ? parts[keys[0] ?? ""] : undefined;
    const issue = part?.safeParse((body as Record<string, unknown>)[keys[0] ?? ""]).error?.issues[0];
    return issue?.code === "custom" ? issue.message : shapes;
}

/** A folder the player names as a campaign of theirs: remembered when it holds one, refused when not, or when it cannot be read now. */
async function addCampaign(root: string, response: ServerResponse, served: LauncherServed): Promise<void>
{
    const holds = holdsCampaign(root);

    if (holds !== true) {
        const why = holds === false ? `${root} is no campaign: a campaign's folder holds its campaign.yaml. Choose that folder, or make a new campaign.` : holds.unreadable;
        sendJson(response, 409, { error: why });
        return;
    }

    rememberCampaign(served.home, root);
    served.notify();
    sendJson(response, 200, { campaigns: await served.campaigns() });
}

/** The system's window to choose a folder, one at a time: the folder chosen, a cancel, or why there is no window. */
async function pickFolder(response: ServerResponse, served: LauncherServed): Promise<void>
{
    if (served.picking) {
        sendJson(response, 409, { error: "The window to choose a folder is open already: choose the folder there, or close it first." });
        return;
    }

    served.picking = true;

    try {
        const chosen = await served.pick();
        sendJson(response, chosen !== undefined && typeof chosen === "object" ? 409 : 200, chosen === undefined ? { cancelled: true } : typeof chosen === "string" ? { folder: chosen } : { error: chosen.refused });
    } finally {
        served.picking = false;
    }
}

/** A page that listens for the list's changes, until it closes. */
function listen(response: ServerResponse, served: LauncherServed): void
{
    response.writeHead(200, { ...securityHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-store" });
    response.write(": listening\n\n");
    served.pages.add(response);
    response.on("close", () => served.pages.delete(response));
}

/** The languages the page is written in: English, and each its built page ships. */
function pageLanguages(page: string): string[]
{
    const shipped = withFiles(new FileStore(), () => files().entries(join(page, "i18n")).filter((entry) => !entry.isFolder && entry.name.endsWith(".json")).map((entry) => entry.name.slice(0, -".json".length)));
    return ["en", ...shipped.filter((code) => code !== "en").sort()];
}
