// What the launcher answers at each address: first the gate, which lets in only its own page at its own address; then its API, a table by path, whose writes
// come only from the page itself; then its page and the page's files.
import type { IncomingMessage, ServerResponse } from "node:http";
import { isAbsolute, join, resolve } from "node:path";
import { z } from "zod";
import type { ChosenFolder, FolderAsked } from "../../confirm/index.ts";
import { type HostId, hostIds, hosts } from "../../core/hosts.ts";
import { type RefusalBody, refusalWords } from "../../core/refusal.ts";
import { files, FileStore, withFiles } from "../../core/store.ts";
import type { WindowOpener } from "../../desktop/index.ts";
import type { AccessKeeper, HostAccess } from "../../helpers/index.ts";
import { type ImageExtension, readImage } from "../../images/index.ts";
import type { HostOffered } from "../../master/index.ts";
import { readableSystems } from "../../systems/index.ts";
import { fromOwnPage, launcherHtml, pageFile, pagePolicy, pageWrites, picturePolicy, readBody, refusedAt, securityHeaders, send, sendFile, sendJson, sendTagged, vendorModule } from "../page/index.ts";
import { campaignsFolder, type CampaignShown, forgetCampaign, holdsCampaign, portraitsAddress, rememberCampaign } from "./campaigns.ts";
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
    /** The portraits of the campaigns listed, by the names their addresses give them: the files they stand for. */
    portraits: Map<string, string>;
    hosts(): HostShown[];
    /** Each host's account, its sign-in and its installation; none where the launcher was given no programs to ask. */
    access?: AccessKeeper;
    /** The system's window that chooses a folder, with the page's title and the folder it opens in. */
    pick(asked: FolderAsked): Promise<ChosenFolder>;
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

/** A host as the page offers it: with its account, and how its sign-in and installation are reached, where the launcher knows them. */
export type HostShown = HostOffered & Partial<HostAccess>;

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
    } else if (path.startsWith(portraitsAddress)) {
        sendPortrait(path.slice(portraitsAddress.length), request, response, served);
    } else if (path.startsWith("/vendor/")) {
        sendFile(vendorModule(path.slice("/vendor/".length)), path, request, response);
    } else {
        sendFile(pageFile(served.page, path), path, request, response);
    }
}

// A folder the page names: a whole path, of a reasonable length, in one form however it is written, so that the list, the tables' places and their keys see
// the same folder. Any such path opens, adds or forgets a campaign, so that whatever is in the list can be opened and taken off it.
// What is wrong with what the player wrote travels with its code and values, as the issue's own: the page says it in its language. What only a page that
// does not work could send, as a host it does not list, has words alone.
const longestPath = 1000;
const folderPath = z.string()
    .refine((path) => path.length <= longestPath, { message: `The folder's path is too long: give one of at most ${longestPath} characters.`, params: { code: "path-too-long", values: { most: String(longestPath) } } })
    .transform((path, context) => {
        if (path.includes("\0") || !isAbsolute(path)) {
            context.addIssue({ code: "custom", message: "Give the folder's whole path, from the root of its disk.", params: { code: "not-full-path", values: { name: path.replaceAll("\0", "") } } });
            return z.NEVER;
        }

        return resolve(path);
    });
// The folder a campaign is made in: on Windows, one that Windows can use as written.
const newFolder = folderPath
    .transform((folder, context) => {
        const problem = process.platform === "win32" ? windowsNameProblem(folder) : undefined;

        if (problem !== undefined) {
            context.addIssue({ code: "custom", message: problem.error, params: { code: problem.code, values: problem.values } });
            return z.NEVER;
        }

        return folder;
    });
const word = (what: string): z.ZodType<string> => z.string().refine((text) => text.length >= 1 && text.length <= 200, `Give ${what} in 1 to 200 characters.`);

const openAsked = z.object({ root: folderPath }).strict();
const createAsked = z.object({
    name: z.string()
        .trim()
        .refine((name) => name.length >= 1 && name.length <= 80, { message: "Give the campaign a name of 1 to 80 characters.", params: { code: "campaign-name-length", values: { most: "80" } } })
        .refine((name) => !/[\u0000-\u001f\u007f]/.test(name), {
            message: "Give the campaign a name on one line, without tabs or other control characters.",
            params: { code: "campaign-name-line" },
        }),
    folder: newFolder.optional(),
    language: z.string().refine((code) => /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(code), "Give the campaign's language by its code, such as en or pt-BR."),
    system: word("the game system's name"),
    host: word("the host's name").optional(),
    model: word("the model's name").optional(),
    effort: word("the effort").optional(),
}).strict();
const quitAsked = z.object({ token: z.string().max(200) }).strict();
// The folder window: its title, in the page's words, and the folder it opens in; or true, the system's own of both.
const windowAsked = z.object({
    title: z.string()
        .refine((title) => title.length >= 1 && title.length <= 120, "Give the window's title in 1 to 120 characters.")
        .refine((title) => !/[\u0000-\u001f\u007f]/.test(title), "Give the window's title on one line, without tabs or other control characters.")
        .optional(),
    start: folderPath.optional(),
}).strict();
const pickAsked = z.union([z.literal(true), windowAsked]);
// A host the engine knows, by its id.
const hostAsked = z.custom<HostId>((host) => typeof host === "string" && (hostIds as string[]).includes(host), `Give a host the launcher knows: ${hostIds.join(", ")}.`);
const signInAsked = z.object({ host: hostAsked, cancel: z.literal(true).optional() }).strict();
const installAsked = z.object({ host: hostAsked }).strict();

const asked = z.union([
    z.object({ open: openAsked }).strict(),
    z.object({ create: createAsked }).strict(),
    z.object({ add: openAsked }).strict(),
    z.object({ pick: pickAsked }).strict(),
    z.object({ forget: openAsked }).strict(),
    z.object({ quit: quitAsked }).strict(),
    z.object({ signIn: signInAsked }).strict(),
    z.object({ install: installAsked }).strict(),
    z.object({ hosts: z.literal(true) }).strict(),
]);

// Each part a body may have, to say what is wrong in one of the right shape.
const parts: Record<string, z.ZodType> = {
    open: openAsked,
    create: createAsked,
    add: openAsked,
    pick: windowAsked,
    forget: openAsked,
    quit: quitAsked,
    signIn: signInAsked,
    install: installAsked,
};

const shapes = "Send one of { open: { root } }, { create: { name, folder?, language, system, host?, model?, effort? } }, { add: { root } }, { pick: true | { title?, start? } }, "
    + "{ forget: { root } }, { quit: { token } }, { signIn: { host, cancel? } }, { install: { host } } or { hosts: true }.";

// What the page reads where the launcher was given no programs to ask, as a launcher started by a test.
const noAccess = refusalWords("This launcher cannot sign in to or install the AI apps: close it, start it again with rpg launcher, then try again.", "no-access-launcher");

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

/** What the page asks of the launcher: a campaign opened, made, added or forgotten, a folder chosen, the launcher's end, or what the AI apps need. */
async function changeLauncher(request: IncomingMessage, response: ServerResponse, served: LauncherServed): Promise<void>
{
    const body = await readBody(request, 16_000);
    const parsed = asked.safeParse(body);

    if (!parsed.success) {
        sendJson(response, 400, refusal(body));
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
        await pickFolder(wish.pick === true ? {} : wish.pick, response, served);
    } else if ("forget" in wish) {
        forgetCampaign(served.home, wish.forget.root);
        served.notify();
        sendJson(response, 200, { campaigns: await served.campaigns() });
    } else if ("quit" in wish) {
        if (wish.quit.token === served.token) {
            sendJson(response, 200, {});
            served.quit();
        } else {
            sendJson(response, 403, { error: "Only who reads the launcher's place may ask it to quit." });
        }
    } else {
        changeAccess(wish, response, served);
    }
}

/**
 * What the page asks of the AI apps: a sign-in started or cancelled, an installation, or a look again at each one's account. Each answers at once with the
 * hosts as they stand; how it goes on reaches the pages as a notice.
 */
function changeAccess(wish: { signIn: z.infer<typeof signInAsked>; } | { install: z.infer<typeof installAsked>; } | { hosts: true; }, response: ServerResponse, served: LauncherServed): void
{
    const access = served.access;

    if (access === undefined) {
        sendJson(response, 409, noAccess);
        return;
    }

    let refused: RefusalBody | undefined;

    if ("signIn" in wish) {
        refused = wish.signIn.cancel === true ? access.tryCancelSignIn(wish.signIn.host) : access.trySignIn(wish.signIn.host);
    } else if ("install" in wish) {
        const host = wish.install.host;
        const name = hosts[host].name;
        const there = served.hosts().find((one) => one.id === host)?.found === true;
        refused = there ? refusalWords(`${name} is on this computer already: choose it for a campaign, and play.`, "app-here", { host: name }) : access.tryInstall(host);
    } else {
        access.lookAgain();
    }

    sendJson(response, refused === undefined ? 200 : 409, refused ?? { hosts: served.hosts() });
}

/**
 * Why a body was refused: what is wrong with a part of the right shape, with the code and values its issue carries, where it says something the player
 * wrote; else the shapes, which only a page that does not work is told.
 */
function refusal(body: unknown): RefusalBody
{
    const keys = typeof body === "object" && body !== null && !Array.isArray(body) ? Object.keys(body) : [];
    const part = keys.length === 1 ? parts[keys[0] ?? ""] : undefined;
    const issue = part?.safeParse((body as Record<string, unknown>)[keys[0] ?? ""]).error?.issues[0];

    if (issue?.code !== "custom") {
        return { error: shapes };
    }

    const { code, values } = (issue.params ?? {}) as { code?: string; values?: Record<string, string>; };
    return code === undefined ? { error: issue.message } : refusalWords(issue.message, code, values);
}

/** A folder the player names as a campaign of theirs: remembered when it holds one, refused when not, or when it cannot be read now. */
async function addCampaign(root: string, response: ServerResponse, served: LauncherServed): Promise<void>
{
    const holds = holdsCampaign(root);

    if (holds !== true) {
        const words = `${root} is no campaign: a campaign's folder holds its campaign.yaml. Choose that folder, or make a new campaign.`;
        sendJson(response, 409, holds === false ? refusalWords(words, "not-a-campaign", { root }) : holds.unreadable);
        return;
    }

    rememberCampaign(served.home, root);
    served.notify();
    sendJson(response, 200, { campaigns: await served.campaigns() });
}

/** The system's window to choose a folder, one at a time: the folder chosen, a cancel, or why there is no window. */
async function pickFolder(asked: FolderAsked, response: ServerResponse, served: LauncherServed): Promise<void>
{
    if (served.picking) {
        sendJson(response, 409, refusalWords("The window to choose a folder is open already: choose the folder there, or close it first.", "folder-window-open"));
        return;
    }

    served.picking = true;

    try {
        const chosen = await served.pick(asked);

        if (chosen !== undefined && typeof chosen === "object") {
            const { refused, code, values } = chosen;
            sendJson(response, 409, { error: refused, ...(code === undefined ? {} : { code }), ...(values === undefined ? {} : { values }) });
        } else {
            sendJson(response, 200, chosen === undefined ? { cancelled: true } : { folder: chosen });
        }
    } finally {
        served.picking = false;
    }
}

/**
 * The portrait of a listed campaign's player character, by the name its address gives it: only a file the list named, read as a picture by what its bytes
 * are, and running nothing, even an SVG opened by itself.
 */
function sendPortrait(name: string, request: IncomingMessage, response: ServerResponse, served: LauncherServed): void
{
    const file = served.portraits.get(name);
    const picture = file === undefined ? undefined : withFiles(new FileStore(), () => readImage(file));

    if (picture === undefined || "problem" in picture) {
        send(response, 404, "text/plain; charset=utf-8", "There is no such portrait: the list names the portraits of its campaigns.");
        return;
    }

    sendTagged(request, response, Buffer.from(picture.bytes), { "Content-Type": pictureTypes[picture.extension], "Content-Security-Policy": picturePolicy });
}

const pictureTypes: Record<ImageExtension, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml" };

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
