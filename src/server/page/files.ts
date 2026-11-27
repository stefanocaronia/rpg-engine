// The built page that every server of the player's pages serves: its shell, with the policy and the import map, its own files and the modules it imports
// from packages, each only from its own folder.
import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { files, type FileStore, isInside, withFiles } from "../../core/store.ts";
import { decoded, securityHeaders, send, sendTagged } from "./http.ts";

// From src/ and from dist/ alike, the built page is in dist/dashboard, one level up.
export const builtPage = fileURLToPath(new URL("../../../dist/dashboard/", import.meta.url));

// A picture runs nothing, even an SVG opened by itself.
export const picturePolicy = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

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

// The modules the page imports from packages, by the names the import map gives them: a package, and a file in it. three.module.js imports three.core.js
// beside it; three's loader of the dice's models imports two of its utilities beside it; the room the metal dice mirror is three's too; Rapier's module
// moves the dice.
const vendorModules: Record<string, [string, string]> = {
    "preact.js": ["preact", "dist/preact.mjs"],
    "hooks.js": ["preact", "hooks/dist/hooks.mjs"],
    "jsx-runtime.js": ["preact", "jsx-runtime/dist/jsxRuntime.mjs"],
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
        // The kit the extensions' page code is drawn with.
        "rpg-engine/page": "/kit.js",
    },
});

// The page runs only its own files and the import map written in it, known by its hash; and the physics of the dice, which Rapier's module carries as
// WebAssembly and compiles. No page frames it: a second guard behind the refusal of a frame's request.
export const pagePolicy = `default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'sha256-${createHash("sha256").update(importMap).digest("base64")}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`;

/** A campaign's page. */
export const pageHtml = pageShell("/app.js");

/** The launcher's page: the same shell, its own entry. */
export const launcherHtml = pageShell("/launcher/main.js");

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

/** A script, a style sheet or a picture of the page, as it is on the disk: read through the server's session where it keeps one. */
export function sendFile(file: string | undefined, path: string, request: IncomingMessage, response: ServerResponse, session?: FileStore): void
{
    const type = file === undefined ? undefined : pageTypes[extname(file)];
    const read = (): Uint8Array | undefined => (file === undefined ? undefined : files().bytes(file));
    const bytes = session === undefined ? read() : withFiles(session, read);

    if (bytes === undefined || type === undefined) {
        send(response, 404, "text/plain; charset=utf-8", `Nothing at ${path}.`);
        return;
    }

    sendTagged(request, response, bytes, { "Content-Type": type, "Content-Security-Policy": type.startsWith("image/") ? picturePolicy : securityHeaders["Content-Security-Policy"] });
}

/** The page's shell, with its policy's import map and style, loading the entry given. */
function pageShell(entry: string): string
{
    return [
        "<!doctype html>",
        // The page writes in the player's language, and the story in the campaign's: never a browser's translation over them.
        '<html lang="en" translate="no">',
        '<meta charset="utf-8">',
        '<meta name="google" content="notranslate">',
        // A phone's keyboard shortens the page, as the window does, rather than covering its foot: the chat's words stay over it (Chrome on Android).
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">',
        '<meta name="color-scheme" content="light dark">',
        "<title>RPG Engine</title>",
        '<link rel="icon" href="/assets/icon-16.png" sizes="16x16">',
        '<link rel="icon" href="/assets/icon-32.png" sizes="32x32">',
        '<link rel="icon" href="/assets/icon.png" sizes="512x512">',
        '<link rel="apple-touch-icon" href="/assets/icon-180.png">',
        '<link rel="stylesheet" href="/style.css">',
        `<script type="importmap">${importMap}</script>`,
        `<script type="module" src="${entry}"></script>`,
        '<div id="app"></div>',
        "",
    ].join("\n");
}
