// A launcher of the demo's own, for its page (D-582) with no process started, no folder made and no window of the system's opened: it serves the built
// launcher's page with a list of campaigns kept in memory, and answers what the page asks after a moment, as the real one (src/server/launcher/routes.ts):
//   open     the demo's campaign and Le Isole del Sale open the demo's own page, after a second and a half; La Torre Rotta never opens, and says why
//   create   a campaign of any name opens the demo's page; a name with "fail" is refused, one with "half" is made but its page does not open
//   pick     in turn: a folder that holds a campaign, no folder chosen, a folder that holds none
//   add      a folder whose name starts with a capital B is a campaign; another is refused
//   forget   takes one off the list
// Not part of the tests.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { builtPage, fromOwnPage, launcherHtml, pageFile, pagePolicy, pageWrites, readBody, securityHeaders, send, sendFile, sendJson, vendorModule } from "../../src/server/page/index.ts";
import { demoModels, hostsNotReady } from "./master.ts";

/** The demo's launcher: its page's link, the campaign's page it opens once that is served, and its end. */
export interface DemoLauncher
{
    url: string;
    /** The version it says, as a launcher's place names it. */
    version: string;
    setCampaign(url: string): void;
    close(): Promise<void>;
}

/** A campaign as the demo's launcher lists it. */
interface Listed
{
    root: string;
    name: string;
    system?: string;
    language?: string;
    opened?: string;
    open: boolean;
    missing: boolean;
    problem?: string;
}

// How long the demo's launcher takes to open a campaign, to make one and to have a folder chosen.
const openTime = 1500;
const pickTime = 600;
const version = "0.0.0-demo";
const day = 86_400_000;

/** Serves the demo's launcher on a free port: `campaign` is the folder of the demo's own campaign, the first of its list; `empty`, with no campaign at all. */
export async function serveDemoLauncher(campaign: string, empty = false, page = builtPage): Promise<DemoLauncher>
{
    const home = join(campaign, "..");
    const folder = join(home, "RPG Engine");
    const ago = (days: number): string => new Date(Date.now() - days * day).toISOString();
    const tower = join(folder, "La Torre Rotta");
    let campaigns: Listed[] = empty ? [] : [
        { root: campaign, name: "Guadoscuro", system: "free", language: "it", opened: ago(0), open: true, missing: false },
        { root: join(folder, "Le Isole del Sale"), name: "Le Isole del Sale", system: "5e", language: "it", opened: ago(3), open: false, missing: false },
        { root: tower, name: "La Torre Rotta", system: "free", language: "en", opened: ago(16), open: false, missing: false },
        { root: join(home, "Vecchie", "Il Passo del Corvo"), name: "Il Passo del Corvo", opened: ago(140), open: false, missing: true },
        { root: join(folder, "Cripta"), name: "Cripta", open: false, missing: false, problem: "campaign.yaml does not read: bad indentation of a mapping entry at line 3." },
    ];
    const pages = new Set<ServerResponse>();
    let campaignUrl = "";
    let picks = 0;
    let port = 0;

    const notify = (): void => pages.forEach((page) => page.write("event: changed\ndata: {}\n\n"));
    const later = (time: number): Promise<void> => new Promise((done) => setTimeout(done, time));

    const now = (): object => ({
        launcher: true,
        version,
        folder,
        campaigns,
        hosts: [
            { id: "claudeCode", name: "Claude Code", ready: true, found: true, model: "sonnet", efforts: ["low", "medium", "high", "xhigh", "max"], models: demoModels },
            { id: "codex", name: "Codex", ready: false, found: false, model: "", efforts: [], models: [] },
            ...hostsNotReady,
        ],
        systems: [{ name: "free", title: "Free play, without a game system" }, { name: "5e", title: "The fifth edition, from the SRD 5.1" }],
        languages: ["en", "ar", "de", "es", "fr", "he", "it", "ja", "pt", "zh"],
    });

    const remember = (root: string, name: string, changes: Partial<Listed> = {}): void => {
        campaigns = [{ root, name, system: "free", language: "it", opened: ago(0), open: false, missing: false, ...changes }, ...campaigns.filter((one) => one.root !== root)];
        notify();
    };

    const change = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
        const wish = await readBody(request, 16_000) as { open?: { root: string; }; create?: { name: string; folder?: string; system: string; language: string; }; add?: { root: string; }; pick?: true; forget?: { root: string; }; };

        if (wish.open !== undefined) {
            await later(openTime);
            const listed = campaigns.find((one) => one.root === wish.open?.root);

            if (wish.open.root === tower) {
                sendJson(response, 409, { error: `The table of ${tower} did not start within 15 seconds: look at table.log in the engine's data folder, then open the campaign again.` });
            } else {
                remember(wish.open.root, listed?.name ?? wish.open.root, { ...listed, opened: ago(0), open: true });
                sendJson(response, 200, { url: campaignUrl });
            }
        } else if (wish.create !== undefined) {
            await later(openTime);
            const root = wish.create.folder ?? join(folder, wish.create.name);

            if (/fail/i.test(wish.create.name)) {
                sendJson(response, 409, { error: `${root} already holds files: choose an empty folder, or a new one.` });
            } else if (/half/i.test(wish.create.name)) {
                remember(root, wish.create.name, { system: wish.create.system, language: wish.create.language });
                sendJson(response, 409, { root, error: `The table of ${root} did not start within 15 seconds: look at table.log in the engine's data folder, then open the campaign again.` });
            } else {
                remember(root, wish.create.name, { system: wish.create.system, language: wish.create.language, open: true });
                sendJson(response, 200, { url: campaignUrl, root });
            }
        } else if (wish.add !== undefined) {
            const name = wish.add.root.split(/[\\/]/).at(-1) ?? wish.add.root;

            if (/^B/.test(name)) {
                remember(wish.add.root, name);
                sendJson(response, 200, { campaigns });
            } else {
                sendJson(response, 409, { error: `${wish.add.root} is no campaign: a campaign's folder holds its campaign.yaml. Choose that folder, or make a new campaign.` });
            }
        } else if (wish.pick !== undefined) {
            await later(pickTime);
            const turn = picks++ % 3;
            sendJson(response, 200, turn === 0 ? { folder: join(home, "Giochi", "Brughiera") } : turn === 1 ? { cancelled: true } : { folder: join(home, "Documenti") });
        } else if (wish.forget !== undefined) {
            campaigns = campaigns.filter((one) => one.root !== wish.forget?.root);
            notify();
            sendJson(response, 200, { campaigns });
        } else {
            sendJson(response, 400, { error: "Send one of { open }, { create }, { add }, { pick } or { forget }." });
        }
    };

    const server = createServer((request, response) => {
        const path = (URL.parse(request.url ?? "/", `http://127.0.0.1:${port}`) ?? new URL(`http://127.0.0.1:${port}/404`)).pathname;

        if (!fromOwnPage(request, path, port)) {
            send(response, 403, "text/plain; charset=utf-8", "The demo's launcher answers only its own page.");
        } else if (path === "/api/launcher" && pageWrites(request)) {
            change(request, response).catch((error: unknown) => send(response, 500, "text/plain; charset=utf-8", String(error)));
        } else if (path === "/api/launcher") {
            sendJson(response, 200, now());
        } else if (path === "/") {
            send(response, 200, "text/html; charset=utf-8", launcherHtml, pagePolicy);
        } else if (path === "/favicon.ico") {
            response.writeHead(204, securityHeaders).end();
        } else if (path === "/events") {
            response.writeHead(200, { ...securityHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-store" });
            response.write(": listening\n\n");
            pages.add(response);
            response.on("close", () => pages.delete(response));
        } else if (path.startsWith("/vendor/")) {
            sendFile(vendorModule(path.slice("/vendor/".length)), path, request, response);
        } else {
            sendFile(pageFile(page, path), path, request, response);
        }
    });

    port = await new Promise<number>((done, fail) => {
        server.once("error", fail);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            done(typeof address === "object" && address !== null ? address.port : 0);
        });
    });

    return {
        url: `http://127.0.0.1:${port}`,
        version,
        setCampaign: (url) => (campaignUrl = url),
        close: async () => {
            pages.forEach((page) => page.end());
            await new Promise((done) => {
                server.close(done);
                server.closeAllConnections();
            });
        },
    };
}
