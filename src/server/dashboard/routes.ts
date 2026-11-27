// What the dashboard answers at each address: first the gate, which lets in only its own page at its own address; then the page's API, a table by path,
// whose writes come only from the page itself; then the page and its files.
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { findCampaign } from "../../campaign/index.ts";
import type { PlayerSetting } from "../../commands/config/dashboard.ts";
import { campaignWidgets, packageWidget } from "../../commands/shared/packages/widgets.ts";
import { view } from "../../commands/view/view.ts";
import { type Command, isBoolean } from "../../core/registry.ts";
import { withFiles } from "../../core/store.ts";
import { notationParts } from "../../dice/index.ts";
import { fromOwnPage, pageFile, pageHtml, pagePolicy, pageWrites, refusedAt, securityHeaders, send, sendFile, sendJson, vendorModule } from "../page/index.ts";
import { choicesRequest } from "./choices.ts";
import { packagePageFile, pageModulesOf, pageWords, sendImage, sendInstalledThemeFile, sendPacked, sendThemeFile, themeAddress, themeNow, themesAddress } from "./files.ts";
import { homeNow, startHome } from "./home.ts";
import type { Served } from "./index.ts";
import { changeMaster, masterNow } from "./master.ts";
import { act, keepProblems, listenForBell, notes, setupWord, story } from "./news.ts";
import { changePhone, fromPhone, phoneNow, sendPhoneCode } from "./phone.ts";
import { givePicture } from "./pictures.ts";
import { answerAsked, closeCard, listenForChanges, pageSeen, rollNamesOf, spendShown } from "./player.ts";
import { addPackage, catalogNow, changeLibrary, changePackage, changeSaves, changeSetting, engineNow, exportCampaign, exportedFile, libraryNow, packagesNow, runForPlayer, takeLayerOff } from "./writes.ts";

/** Answers a request to the dashboard: refused unless it comes from its own page at its own address; then by the page's API, else by the page's files. */
export async function answer(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    // An address that does not read, as //, is no page of the dashboard's.
    const base = `http://localhost:${served.port}`;
    const url = URL.parse(request.url ?? "/", base) ?? new URL("/404", base);
    const path = url.pathname;

    if (!fromOwnPage(request, path, served.port)) {
        send(response, 403, "text/plain; charset=utf-8", refusedAt("The dashboard", served.port));
        return;
    }

    await answerAdmitted(request, response, served);
}

/** Answers a request the gate let in, at the computer's own address or at the door to the phone (T-317): the page's API, else the page's files. */
async function answerAdmitted(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const base = `http://localhost:${served.port}`;
    const url = URL.parse(request.url ?? "/", base) ?? new URL("/404", base);
    const path = url.pathname;
    const route: Route | undefined = routes[path];
    const call = { request, response, served, url };
    // HEAD is answered as GET, on every route.
    const reads = request.method === "GET" || request.method === "HEAD";

    // The page writes only from itself, which says its origin, already checked as ours.
    if (pageWrites(request) && route?.post !== undefined) {
        await route.post(call);
    } else if (reads && route?.get !== undefined) {
        await route.get(call);
    } else if (!reads) {
        send(response, 405, "text/plain; charset=utf-8", "The dashboard only gives what the player may see, and takes a click on what the master asks, the player's settings and their saves.");
    } else {
        await answerPage(call);
    }
}

/** A request the dashboard answers, with its address read. */
interface PageCall
{
    request: IncomingMessage;
    response: ServerResponse;
    served: Served;
    url: URL;
}

type Handler = (call: PageCall) => Promise<void> | void;

/** What an address of the page's API does when read, and when the page writes to it. */
interface Route
{
    get?: Handler;
    post?: Handler;
}

// The page's API by exact path: what it reads, and what the page sends from itself, as a click on what the master asks or a change of the player's settings.
const routes: Record<string, Route> = {
    "/api/run": { post: ({ request, response, served }) => runForPlayer(request, response, served) },
    "/api/answer": { post: ({ request, response, served }) => answerAsked(request, response, served) },
    "/api/choices": { get: ({ request, response, served }) => choicesRequest(request, response, served), post: ({ request, response, served }) => choicesRequest(request, response, served) },
    "/api/act": { get: ({ request, response, served }) => act(request, response, served), post: ({ request, response, served }) => act(request, response, served) },
    // The table's own chat with the master, in the page.
    "/api/master": { get: ({ response, served }) => masterNow(response, served), post: ({ request, response, served }) => changeMaster(request, response, served) },
    // The launcher, the way back to the campaigns of this computer; started from the page at a table alone.
    "/api/home": {
        get: ({ request, response, served }) => (fromPhone(request, served) ? sendJson(response, 200, { phone: true }) : homeNow(response, served)),
        post: ({ request, response, served }) =>
            fromPhone(request, served)
                ? sendJson(response, 403, { error: "The campaigns open on the computer: go back to them there." })
                : startHome(request, response, served),
    },
    // Claude Code's hook waits here for the player's next sentence, from this computer (D-495).
    "/api/bell": { get: ({ request, response, served, url }) => listenForBell(request, response, served, url.searchParams) },
    "/api/card": { post: ({ request, response, served }) => closeCard(request, response, served) },
    "/api/seen": { post: ({ request, response, served }) => pageSeen(request, response, served) },
    "/api/package": { post: ({ request, response, served }) => changePackage(request, response, served) },
    "/api/library": { get: ({ response, served }) => libraryNow(response, served), post: ({ request, response, served }) => changeLibrary(request, response, served) },
    // An adventure the player adds from a .zip of their computer, and the campaign exported as one (D-483): files, never code.
    "/api/add": { post: ({ request, response, served }) => addPackage(request, response, served) },
    // A picture of the player's own for a page (D-572 (3)).
    "/api/picture": { post: ({ request, response, served, url }) => givePicture(request, response, served, url.searchParams.get("page") ?? "") },
    "/api/export": {
        get: ({ response, served, url }) => exportedFile(response, served, url.searchParams.get("file") ?? ""),
        post: ({ request, response, served }) => exportCampaign(request, response, served),
    },
    "/api/config": { post: ({ request, response, served }) => changeSetting(request, response, served) },
    "/api/notes": { get: ({ request, response, served }) => notes(request, response, served), post: ({ request, response, served }) => notes(request, response, served) },
    "/api/story": { get: ({ request, response, served }) => story(request, response, served), post: ({ request, response, served }) => story(request, response, served) },
    "/api/setup": { post: ({ request, response, served }) => setupWord(request, response, served) },
    "/api/saves": { post: ({ request, response, served }) => changeSaves(request, response, served) },
    "/api/layer": { post: ({ request, response, served }) => takeLayerOff(request, response, served) },
    "/api/words": { get: ({ request, response, served, url }) => pageWords(request, response, served, url), post: ({ request, response, served, url }) => pageWords(request, response, served, url) },
    // rpg-engine itself (D-515 (3)): what it is and what npm has, for the page; its update, from the page alone, never by the master.
    "/api/engine": { get: ({ request, response, served }) => engineNow(request, response, served), post: ({ request, response, served }) => engineNow(request, response, served) },
    "/api/asked": { get: ({ response, served }) => askedNow(response, served) },
    "/api/packages": { get: ({ response, served, url }) => packagesNow(response, served, url.searchParams.get("npm") === "true") },
    "/api/theme": { get: ({ response, served }) => themeNow(response, served) },
    "/api/modules": { get: ({ response, served }) => modulesNow(response, served) },
    "/api/widgets": { get: ({ response, served }) => widgetsNow(response, served) },
    "/api/widget": { get: ({ response, served, url }) => widgetForCard(response, served, url.searchParams) },
    // The door to the player's phone on the home network (T-317): opened and closed from the computer's page alone.
    "/api/phone": {
        get: ({ request, response, served }) => sendJson(response, 200, phoneNow(request, served)),
        post: ({ request, response, served }) => changePhone(request, response, served, (admitted, answered) => answerAdmitted(admitted, answered, served)),
    },
    "/api/phone/code": { get: ({ request, response, served }) => sendPhoneCode(request, response, served) },
    "/api/catalog": { get: ({ response, served, url }) => catalogNow(response, served, url.searchParams.get("fresh") === "true") },
    // The campaign's table asks a chat's own server for the page, from this computer: one page for each campaign.
    "/api/yield": { post: ({ request, response, served }) => yieldPage(request, response, served) },
};

/** The page's API, address by address, with what each takes: for the tests. */
export const pageRoutes: readonly { path: string; get: boolean; post: boolean; }[] = Object.entries(routes).map(([path, route]) => ({
    path,
    get: route.get !== undefined,
    post: route.post !== undefined,
}));

// The commands the page may run: what the player may see, never the master's (VIEW-1). Roles will say more (phase 2).
const playerCommands: Command<z.ZodObject, unknown>[] = [view];

// What the page may never ask of these commands: another character's view, which is the character agent's (VIEW-10).
const masterParameters = ["as"];

/** What the dashboard reads at an address that is no route of its API: the page, the notices, the page's commands, pictures, themes and the page's files. */
async function answerPage({ request, response, served, url }: PageCall): Promise<void>
{
    const path = url.pathname;

    if (path === "/") {
        send(response, 200, "text/html; charset=utf-8", pageHtml, pagePolicy);
    } else if (path === "/favicon.ico") {
        // Browsers ask for it by themselves; the page's icon comes with its logo.
        response.writeHead(204, securityHeaders).end();
    } else if (path === "/events") {
        listenForChanges(request, response, served);
    } else if (path.startsWith("/api/")) {
        await runCommand(path.slice("/api/".length), url.searchParams, response, served);
    } else if (path.startsWith("/images/")) {
        sendImage(path.slice("/images/".length), request, response, served);
    } else if (sendPacked(path, response, served)) {
        // A language package's phrases or Guide, before the page's own (D-485 (3)).
    } else if (path.startsWith(`${themesAddress}/`)) {
        await sendInstalledThemeFile(path.slice(themesAddress.length + 1), url.searchParams, request, response, served);
    } else if (path.startsWith(`${themeAddress}/`)) {
        await sendThemeFile(path.slice(themeAddress.length + 1), url.searchParams, request, response, served);
    } else if (path.startsWith("/vendor/")) {
        sendFile(vendorModule(path.slice("/vendor/".length)), path, request, response, served.session);
    } else if (path.startsWith("/pkg/")) {
        sendFile(packagePageFile(path.slice("/pkg/".length), served), path, request, response, served.session);
    } else {
        sendFile(pageFile(served.page, path), path, request, response, served.session);
    }
}

/** The master's question as the page shows it, with its buttons' dice and names; or how the card of a package's last question was left. */
function askedNow(response: ServerResponse, served: Served): void
{
    const asked = served.asked;
    // Each button's dice, for the page to say in words in its tooltip: the notation at a check's end, as "(2d20kh1+5)" (D-297).
    const words = asked?.labels.map((label) => notationParts(/\(([^()]+)\)$/.exec(label)?.[1] ?? "") ?? null);
    // And the name the game gives its roll, in the campaign's language, as "with advantage" (D-399).
    const names = asked === undefined ? undefined : rollNamesOf(asked.labels, served);
    // Whose roll it is, always, for the page to show who is asked (D-480 (7)); the fields of the sheet only when a check rolls one.
    const rows = asked?.rows === undefined ? {} : { who: asked.rows.who, ...(asked.rows.fields.some((field) => field !== null) ? { fields: asked.rows.fields } : {}) };
    // The dice of a rest as they are now, read again at each look (ASK-14).
    const spend = asked?.spending === undefined ? undefined : spendShown(asked.spending, served);
    sendJson(response, 200, {
        // How the card of a package's last question was left, while no other question is asked (D-507).
        ...(asked === undefined && served.card !== undefined ? { card: served.card } : {}),
        asked: asked === undefined
            ? null
            : {
                id: asked.id,
                question: asked.question,
                title: asked.title,
                labels: asked.labels,
                words,
                names,
                ...rows,
                ...(asked.rows?.forced === true ? { forced: true } : {}),
                ...(asked.rows?.toss === true ? { toss: true } : {}),
                ...(asked.rows?.buttons === undefined ? {} : { buttons: asked.rows.buttons }),
                ...(asked.rows?.rule === undefined ? {} : { rule: asked.rows.rule }),
                // Its card, or that one comes, until its widget answers: the page waits for it rather than show the question twice (D-507).
                ...(asked.card !== undefined ? { card: asked.card } : asked.rows?.card === undefined ? {} : { card: { widget: asked.rows.card.widget, key: asked.rows.card.key, coming: true } }),
                ...(asked.square ? { square: true } : {}),
                ...(spend === undefined ? {} : { who: spend.who, spend }),
            },
    });
}

/**
 * Gives the page to the campaign's table that asks for it, once this answer is sent: only a chat's own server that was told how, once; never a table's,
 * nor from the phone.
 */
function yieldPage(request: IncomingMessage, response: ServerResponse, served: Served): void
{
    const giveWay = served.giveWay;

    if (fromPhone(request, served) || served.master !== undefined || giveWay === undefined) {
        sendJson(response, 409, { error: "This page stays here: it is a table's, or its chat cannot give it away. Close that chat's app, then open the campaign again." });
        return;
    }

    served.giveWay = undefined;
    response.once("finish", giveWay);
    sendJson(response, 200, { yielded: true });
}

/** The page code of the campaign's packages, as the page loads it; none without a campaign. */
async function modulesNow(response: ServerResponse, served: Served): Promise<void>
{
    const root = findCampaign(served.context.folder);
    await served.session.ready();
    const modules = root === undefined ? [] : withFiles(served.session, () => pageModulesOf(root, served));
    sendJson(response, 200, { modules: modules.map((one) => ({ package: one.package, kind: one.kind, version: one.version, address: one.address, figures: one.figures, ...(one.words === undefined ? {} : { words: one.words }) })) });
}

/** Runs a command the page may run, with its parameters from the query, as the MCP server runs a tool; its result, or the error, in JSON. */
async function runCommand(name: string, parameters: URLSearchParams, response: ServerResponse, served: Served): Promise<void>
{
    const command = playerCommands.find((candidate) => candidate.name === name);

    if (command === undefined) {
        sendJson(response, 404, { error: `The dashboard has no command ${name}: it has ${playerCommands.map((candidate) => candidate.name).join(", ")}.` });
        return;
    }

    const masters = [...parameters.keys()].filter((key) => masterParameters.includes(key));

    if (masters.length > 0) {
        sendJson(response, 400, { error: `The dashboard gives only what the player may see: ${masters.join(", ")} is the master's.` });
        return;
    }

    // A flag of the command comes in the address as true or false, as view's map.
    const shape = command.input.shape as Record<string, z.ZodType>;
    const given = [...parameters].map(([name, value]) => [name, shape[name] !== undefined && isBoolean(shape[name]) ? value === "true" : value]);
    const parsed = command.input.strict().safeParse(Object.fromEntries(given));

    if (!parsed.success) {
        sendJson(response, 400, { error: z.prettifyError(parsed.error) });
        return;
    }

    try {
        await served.session.ready();
        const result = await command.run(parsed.data, { ...served.context, texts: served.texts });
        keepProblems(served, result);
        sendJson(
            response,
            200,
            isSetup(result) ? { ...result, left: result.questions.filter((question) => served.left.has(question.name) && question.value === undefined && question.items === undefined).map((question) => question.name) } : result,
        );
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}

/** Whether a command's result is the setup, as view gives it with setup. */
function isSetup(result: unknown): result is { kind: "setup"; questions: PlayerSetting[]; }
{
    return typeof result === "object" && result !== null && (result as { kind?: unknown; }).kind === "setup";
}

/** What one widget of a package shows for a card or a page of its page code, for the character it shows (D-514): its data, or nothing. */
async function widgetForCard(response: ServerResponse, served: Served, query: URLSearchParams): Promise<void>
{
    const [owner, name, who] = [query.get("package") ?? "", query.get("widget") ?? "", query.get("who") ?? undefined];

    try {
        await served.session.ready();
        const shows = await withFiles(served.session, async () => {
            const root = findCampaign(served.context.folder);
            return root === undefined ? undefined : await packageWidget(root, served.context, owner, name, who === "" ? undefined : who);
        });
        sendJson(response, 200, shows === undefined ? {} : { shows });
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}

/** The widgets of the campaign's extensions as the page shows them (D-502): where each stands, and what it shows now; none without a campaign. */
async function widgetsNow(response: ServerResponse, served: Served): Promise<void>
{
    try {
        await served.session.ready();
        const widgets = await withFiles(served.session, async () => {
            const root = findCampaign(served.context.folder);
            return root === undefined ? [] : await campaignWidgets(root, served.context);
        });
        sendJson(response, 200, { widgets });
    } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
}
