// What the dashboard serves: its page, the modules it imports from packages, a package's page code, the theme's files, the pictures and the page's words,
// each only from its own folder; and what every route of the server uses to read a request and to send its answer.
import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { findCampaign } from "./campaign/index.ts";
import { campaignPageModules, type PageModule } from "./commands/game-extension-list.ts";
import { imageFolders } from "./commands/game-images.ts";
import { campaignPackages } from "./commands/game-package-code.ts";
import { campaignTheme } from "./commands/game-theme.ts";
import { campaignSystem } from "./commands/game-world.ts";
import { realPath } from "./core/files.ts";
import { files, isInside, withFiles } from "./core/store.ts";
import type { Served } from "./dashboard-server.ts";
import { findHiddenImage, findImage } from "./images/index.ts";
import { languagePackFor, packGuide, packPhrases } from "./languages/index.ts";
import { drawnOrnament, themeCss, themeFile } from "./themes/index.ts";

const imageTypes: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const pageTypes: Record<string, string> = {
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".glb": "model/gltf-binary",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".wav": "audio/wav",
};

// Where the page finds the theme's files, and what they may be: faces and pictures.
export const themeAddress = "/theme";
const themeTypes: Record<string, string> = { ...imageTypes, ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf" };

// A picture runs nothing, even an SVG opened by itself.
const picturePolicy = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

// From src/ and from dist/ alike, the built page is in dist/dashboard, one level up.
export const builtPage = fileURLToPath(new URL("../dist/dashboard/", import.meta.url));

// The modules the page imports from packages, by the names the import map gives them: a package, and a file in it. three.module.js imports three.core.js
// beside it; three's loader of the dice's models imports two of its utilities beside it; the room the metal dice mirror is three's too; Rapier's module
// moves the dice.
const vendorModules: Record<string, [string, string]> = {
    "preact.js": ["preact", "dist/preact.module.js"],
    "hooks.js": ["preact", "hooks/dist/hooks.module.js"],
    "jsx-runtime.js": ["preact", "jsx-runtime/dist/jsxRuntime.module.js"],
    "three.module.js": ["three", "build/three.module.js"],
    "three.core.js": ["three", "build/three.core.js"],
    "three/addons/loaders/GLTFLoader.js": ["three", "examples/jsm/loaders/GLTFLoader.js"],
    "three/addons/utils/BufferGeometryUtils.js": ["three", "examples/jsm/utils/BufferGeometryUtils.js"],
    "three/addons/utils/SkeletonUtils.js": ["three", "examples/jsm/utils/SkeletonUtils.js"],
    "three/addons/environments/RoomEnvironment.js": ["three", "examples/jsm/environments/RoomEnvironment.js"],
    "rapier.mjs": ["@dimforge/rapier3d-compat", "dist/rapier.mjs"],
};
const importMap = JSON.stringify({
    imports: {
        "preact": "/vendor/preact.js",
        "preact/hooks": "/vendor/hooks.js",
        "preact/jsx-runtime": "/vendor/jsx-runtime.js",
        "three": "/vendor/three.module.js",
        "three/addons/": "/vendor/three/addons/",
        "@dimforge/rapier3d-compat": "/vendor/rapier.mjs",
        // The kit the extensions' page code is drawn with (D-510).
        "rpg-engine/page": "/kit.js",
    },
});

// The page runs only its own files and the import map written in it, known by its hash; and the physics of the dice, which Rapier's module carries as
// WebAssembly and compiles.
export const pagePolicy = `default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'sha256-${createHash("sha256").update(importMap).digest("base64")}'; base-uri 'none'; form-action 'none'`;

export const pageHtml = [
    "<!doctype html>",
    '<html lang="en">',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    "<title>RPG Engine</title>",
    '<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">',
    '<link rel="icon" href="/assets/icon-32.png" sizes="32x32">',
    '<link rel="apple-touch-icon" href="/assets/icon-180.png">',
    '<link rel="stylesheet" href="/style.css">',
    `<script type="importmap">${importMap}</script>`,
    '<script type="module" src="/app.js"></script>',
    '<div id="app"></div>',
    "",
].join("\n");

// How many characters the player's own words may have, in place of a button (ASK-10).
export const mostSaid = 500;

export const securityHeaders = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'self'" };

/**
 * A language package's phrases over those the page ships, or its Guide, for a language one is installed for (D-485 (3)); false where none is, and the
 * page's own file is sent.
 */
export function sendPacked(path: string, response: ServerResponse, served: Served): boolean
{
    const match = /^\/(i18n|guide)\/([a-z]{2,3}(?:-[a-z0-9]{2,8})*)\.(json|md)$/i.exec(path);
    const pack = match === null ? undefined : languagePackFor(served.context.extensionFolders ?? [], match[2]);

    if (match === null || pack === undefined) {
        return false;
    }

    if (match[1] === "i18n") {
        const shipped = JSON.parse(files().text(join(served.page, "i18n", `${match[2]}.json`)) ?? "{}") as Record<string, string>;
        sendJson(response, 200, { ...shipped, ...packPhrases(pack) });
        return true;
    }

    const guide = packGuide(pack);

    if (guide === undefined) {
        return false;
    }

    send(response, 200, "text/markdown; charset=utf-8", guide);
    return true;
}

/** A file of the built page, by its path in the address: only a script, a style sheet or a picture inside its folder, such as its logo. */
export function pageFile(folder: string, path: string): string | undefined
{
    const relative = decoded(path);
    const file = relative === undefined ? undefined : resolve(folder, `.${relative}`);
    return file !== undefined && isInside(folder, file) && pageTypes[extname(file)] !== undefined ? file : undefined;
}

/** A module the page imports from a package, as a file of the package; undefined for another name, or when the package is missing. */
export function vendorModule(name: string): string | undefined
{
    const module = vendorModules[name];

    try {
        // The package's folder, from where its main file is: node_modules/<package>.
        const main = module === undefined ? undefined : createRequire(import.meta.url).resolve(module[0]);
        const folder = main === undefined || module === undefined ? undefined : main.slice(0, main.lastIndexOf(join("node_modules", module[0])) + join("node_modules", module[0]).length);
        return folder === undefined || module === undefined ? undefined : join(folder, module[1]);
    } catch {
        return undefined;
    }
}

/** A script, a style sheet or a picture of the page, as it is on the disk. */
export function sendFile(file: string | undefined, path: string, request: IncomingMessage, response: ServerResponse, served: Served): void
{
    const type = file === undefined ? undefined : pageTypes[extname(file)];
    const bytes = file === undefined ? undefined : withFiles(served.session, () => files().bytes(file));

    if (bytes === undefined || type === undefined) {
        send(response, 404, "text/plain; charset=utf-8", `Nothing at ${path}.`);
        return;
    }

    sendTagged(request, response, bytes, { "Content-Type": type, "Content-Security-Policy": type.startsWith("image/") ? picturePolicy : securityHeaders["Content-Security-Policy"] });
}

/**
 * A file of a package's page code (D-510, D-511), at pkg/<package>/<version>/<path>: only of the campaign's system or one of its extensions, at the version
 * installed, whose code runs, and only beside its page module, by real paths, links included; a script, a style sheet or a picture. Undefined for anything else.
 */
export function packagePageFile(path: string, served: Served): string | undefined
{
    let parts: string[];

    try {
        parts = path.split("/").map((part) => decodeURIComponent(part));
    } catch {
        return undefined;
    }

    const [name, version, ...rest] = parts;
    const root = findCampaign(served.context.folder);
    const module = root === undefined ? undefined : withFiles(served.session, () => pageModulesOf(root, served).find((one) => one.package === name && one.version === version));

    if (module === undefined || rest.length === 0 || ![".js", ".mjs", ".css", ".svg"].includes(extname(rest.at(-1) ?? ""))) {
        return undefined;
    }

    const folder = realPath(dirname(module.file));
    const file = realPath(resolve(folder, ...rest));
    return isInside(folder, file) ? file : undefined;
}

/** The page modules of the campaign's packages whose code runs: its system's and its extensions'. */
export function pageModulesOf(root: string, served: Served): PageModule[]
{
    return campaignPageModules(root, served.context, campaignSystem(root, served.context));
}

/**
 * The theme of the campaign's game system (D-528): its CSS of custom properties, its icons and its name, which the page uses while the player keeps the game's
 * style on; refused when it does not pass its checks, which validate says; the system's name alone when it names none.
 */
export async function themeNow(response: ServerResponse, served: Served): Promise<void>
{
    const root = findCampaign(served.context.folder);
    await served.session.ready();
    const system = root === undefined ? undefined : withFiles(served.session, () => campaignSystem(root, served.context));
    const reading = root === undefined ? undefined : withFiles(served.session, () => campaignTheme(root, served.context));

    if (system === undefined) {
        sendJson(response, 200, {});
    } else if (reading === undefined) {
        // No theme, but the system's name, which keeps the player's switch of its page style, if its page module gives one.
        sendJson(response, 200, { system: system.name });
    } else if (reading.theme === undefined) {
        sendJson(response, 200, { system: reading.system, refused: true });
    } else {
        sendJson(response, 200, { system: reading.system, name: reading.theme.name, css: themeCss(reading.theme, themeAddress), icons: reading.theme.icons });
    }
}

/**
 * A file of the theme of the campaign's game system, at theme/<path>, only from its folder, by real paths, and only while the theme passes its checks: a face
 * or a picture. Its ornament comes in the colour asked, ?ink=#rrggbb, and turned for a page that reads right to left, &mirrored.
 */
export async function sendThemeFile(name: string, query: URLSearchParams, request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const root = findCampaign(served.context.folder);
    await served.session.ready();
    const folder = root === undefined ? undefined : withFiles(served.session, () => campaignTheme(root, served.context))?.theme?.folder;
    let file: string | undefined;

    try {
        file = folder === undefined ? undefined : themeFile(folder, decodeURIComponent(name));
    } catch {
        file = undefined;
    }

    const type = file === undefined ? undefined : themeTypes[extname(file).toLowerCase()];

    if (file === undefined || type === undefined) {
        send(response, 404, "text/plain; charset=utf-8", `Nothing at ${themeAddress}/${name}.`);
        return;
    }

    const ink = query.get("ink");
    const tinted = type === imageTypes[".svg"] && ink !== null && /^#[0-9a-f]{6}$/i.test(ink);
    const bytes = withFiles(served.session, () => (tinted ? Buffer.from(drawnOrnament(files().text(file) ?? "", ink, query.has("mirrored"))) : files().bytes(file)));

    if (bytes === undefined) {
        send(response, 404, "text/plain; charset=utf-8", `Nothing at ${themeAddress}/${name}.`);
        return;
    }

    sendTagged(request, response, bytes, { "Content-Type": type, "Content-Security-Policy": type.startsWith("image/") ? picturePolicy : securityHeaders["Content-Security-Policy"] });
}

/**
 * A picture of the campaign or of its game system, by the name of its file (D-267): only a file an images folder has, looked for by name, never by a path. It
 * runs nothing, even an SVG opened by itself.
 */
export function sendImage(name: string, request: IncomingMessage, response: ServerResponse, served: Served): void
{
    // A package's own, which its widgets show, at an address of its own, ext/<package>/<file>, never mistaken for the campaign's (D-502, D-514).
    const [, extensionName, extensionFile] = /^ext\/([^/]+)\/([^/]+)$/.exec(name) ?? [];
    const fileName = decoded(extensionFile ?? name);
    const ownerName = extensionName === undefined ? undefined : decoded(extensionName);
    const file = fileName === undefined || /[\\/]/.test(fileName) ? undefined : withFiles(served.session, () => {
        const root = findCampaign(served.context.folder);

        if (root === undefined) {
            return undefined;
        }

        if (extensionName !== undefined) {
            const owner = campaignPackages(root, served.context).find((extension) => extension.name === ownerName);
            return owner === undefined ? undefined : findImage([owner.folder], fileName);
        }

        // A stranger's picture comes by a name of its bytes, from the campaign's own (D-420).
        return findImage(imageFolders(root, served.context), fileName) ?? findHiddenImage([root], fileName);
    });
    const type = file === undefined ? undefined : imageTypes[extname(file).toLowerCase()];
    const bytes = file === undefined ? undefined : withFiles(served.session, () => files().bytes(file));

    if (bytes === undefined || type === undefined) {
        send(response, 404, "text/plain; charset=utf-8", `There is no picture ${fileName ?? name}.`);
        return;
    }

    // The page asks for a picture by its name and when it last changed (D-277): a new address when it changes, and the same one comes back as not modified on a reload.
    sendTagged(request, response, bytes, { "Content-Type": type, "Content-Security-Policy": picturePolicy });
}

/**
 * The page's words in a language the package does not ship (D-406): what this computer has translated so far, and whether it is translating them, with the
 * game system's; the phrases the page lacks now, sent to go first.
 */
export async function pageWords(request: IncomingMessage, response: ServerResponse, served: Served, url: URL): Promise<void>
{
    const code = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i;

    if (request.method === "POST") {
        const parsed = z.object({ language: z.string().regex(code), first: z.array(z.string().max(500)).max(1000) }).strict().safeParse(await readBody(request, 64_000));

        if (!parsed.success) {
            sendJson(response, 400, { error: "Send the language and the phrases the page lacks now, { language, first }." });
            return;
        }

        served.words.ask(parsed.data.language.toLowerCase(), parsed.data.first);
        sendJson(response, 202, {});
        return;
    }

    const language = url.searchParams.get("language") ?? "";

    if (!code.test(language)) {
        sendJson(response, 400, { error: "Give the language by its code, such as vi or pt-BR." });
        return;
    }

    const system = withFiles(served.session, () => {
        const root = findCampaign(served.context.folder);
        const found = root === undefined ? undefined : campaignSystem(root, served.context);
        return found === undefined ? undefined : { name: found.name, folder: found.folder };
    });
    sendJson(response, 200, served.words.read(language.toLowerCase(), system));
}

/** A request's body as bytes, up to `most`; undefined when it is more. */
export async function readBytes(request: IncomingMessage, most: number): Promise<Uint8Array | undefined>
{
    const chunks: Buffer[] = [];
    let size = 0;

    for await (const chunk of request) {
        size += (chunk as Buffer).length;

        if (size > most) {
            return undefined;
        }

        chunks.push(chunk as Buffer);
    }

    return Buffer.concat(chunks);
}

/** A request's body as JSON, up to `most` characters; undefined when it is more, or no JSON. */
export async function readBody(request: IncomingMessage, most = 4096): Promise<unknown>
{
    let text = "";
    // Whole characters, never a letter cut in two between the pieces of a long body.
    request.setEncoding("utf8");

    for await (const chunk of request) {
        text += String(chunk);

        if (text.length > most) {
            return undefined;
        }
    }

    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

export function sendJson(response: ServerResponse, status: number, body: unknown): void
{
    send(response, status, "application/json; charset=utf-8", JSON.stringify(body));
}

export function send(response: ServerResponse, status: number, type: string, body: string, policy = securityHeaders["Content-Security-Policy"]): void
{
    if (response.headersSent) {
        response.end();
        return;
    }

    response.writeHead(status, { ...securityHeaders, "Content-Security-Policy": policy, "Content-Type": type, "Cache-Control": "no-store" }).end(body);
}

/** Bytes with a tag of what they hold, read again at each load: the same bytes come back as not modified, as three.js and the dice after the first load. */
function sendTagged(request: IncomingMessage, response: ServerResponse, bytes: Uint8Array, headers: Record<string, string>): void
{
    const tag = `"${createHash("sha1").update(bytes).digest("base64url")}"`;
    const all = { ...securityHeaders, ...headers, "Cache-Control": "no-cache", "ETag": tag };

    if (request.headers["if-none-match"] === tag) {
        response.writeHead(304, all).end();
        return;
    }

    response.writeHead(200, all).end(request.method === "HEAD" ? undefined : bytes);
}

/** A part of an address as written, without its percent signs; undefined when they do not decode. */
function decoded(part: string): string | undefined
{
    try {
        return decodeURIComponent(part);
    } catch {
        return undefined;
    }
}
