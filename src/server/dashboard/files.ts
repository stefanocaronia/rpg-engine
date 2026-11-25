// What the dashboard serves besides the page's own files: a package's page code, the theme's files, the pictures and the page's words, each only from its
// own folder.
import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { z } from "zod";
import { findCampaign } from "../../campaign/index.ts";
import { imageFolders } from "../../commands/shared/campaign/images.ts";
import { campaignTheme } from "../../commands/shared/campaign/theme.ts";
import { campaignSystem } from "../../commands/shared/campaign/world.ts";
import { campaignPackages } from "../../commands/shared/packages/code.ts";
import { campaignPageModules, type PageModule } from "../../commands/shared/packages/extensions.ts";
import { languageFolders, themesFolder, themesHere } from "../../commands/shared/packages/unpacked.ts";
import { realPath } from "../../core/files.ts";
import { files, isInside, withFiles } from "../../core/store.ts";
import { findHiddenImage, findImage } from "../../images/index.ts";
import { languagePackFor, packGuide, packPhrases } from "../../languages/index.ts";
import { drawnOrnament, drawnTexture, folderPrint, installedTheme, isThemeId, type Theme, themeCss, themeFile } from "../../themes/index.ts";
import { decoded, picturePolicy, readBody, securityHeaders, send, sendJson, sendTagged } from "../page/index.ts";
import type { Served } from "./index.ts";

const imageTypes: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };

// Where the page finds the theme's files, the system's and those installed on their own by their id, and what they may be: faces and pictures.
export const themeAddress = "/theme";
export const themesAddress = "/themes";
const themeTypes: Record<string, string> = { ...imageTypes, ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf" };
// A theme's own style sheet, served only as the one its theme.yaml names.
const styleType = "text/css; charset=utf-8";

// How many characters the player's own words may have, in place of a button (ASK-10).
export const mostSaid = 500;

/**
 * A language package's phrases over those the page ships, or its Guide, for a language one is installed for (D-485 (3)); false where none is, and the
 * page's own file is sent.
 */
export function sendPacked(path: string, response: ServerResponse, served: Served): boolean
{
    const match = /^\/(i18n|guide)\/([a-z]{2,3}(?:-[a-z0-9]{2,8})*)\.(json|md)$/i.exec(path);
    const pack = match === null ? undefined : languagePackFor(languageFolders(served.context), match[2]);

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

/**
 * A file of a package's page code (D-510, D-511), at pkg/<package>/<version>/<path>: only of the campaign's system or one of its extensions, at the version
 * installed, whose code runs, and only beside its page module, by real paths, links included; a script, a style sheet or a picture. Undefined for anything else.
 */
export function packagePageFile(path: string, served: Served): string | undefined
{
    const parts = path.split("/").map(decoded);

    if (parts.some((part) => part === undefined)) {
        return undefined;
    }

    const [name, version, ...rest] = parts as string[];
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
 * A theme's own style sheet, when it names one: the address of a sheet of one line, which the page links and which brings the theme's into the layer
 * theme-style, so that none of its braces leaves that layer and its url() come from its own folder; it changes with what the sheet holds.
 */
function styleOf(theme: Theme, address: string): { style?: string; }
{
    const sheet = sheetAddress(theme, address);
    return sheet === undefined ? {} : { style: `${sheet}&layer` };
}

/** The address of a theme's own style sheet, which changes with what it holds; undefined when it names none. */
function sheetAddress(theme: Theme, address: string): string | undefined
{
    const bytes = theme.style === undefined ? undefined : files().bytes(join(theme.folder, theme.style));
    const at = `${address}/${(theme.style ?? "").split("/").map(encodeURIComponent).join("/")}`;
    return bytes === undefined ? undefined : `${at}?v=${createHash("sha1").update(bytes).digest("base64url").slice(0, 12)}`;
}

/**
 * The theme of the campaign's game system (D-528): its CSS of custom properties, its icons and its name, which the page uses while the player keeps the game's
 * style on; refused when it does not pass its checks, which validate says; the system's name alone when it names none. Beside it, the themes installed on
 * their own that pass their checks, for any system, each with its CSS at its own address, which the player chooses in Settings; none when there are none.
 */
export async function themeNow(response: ServerResponse, served: Served): Promise<void>
{
    const root = findCampaign(served.context.folder);
    await served.session.ready();
    const system = root === undefined ? undefined : withFiles(served.session, () => campaignSystem(root, served.context));
    const reading = root === undefined ? undefined : withFiles(served.session, () => campaignTheme(root, served.context));
    const installed = withFiles(served.session, () =>
        themesHere(served.context).flatMap(({ id, theme, linked }) => {
            // A linked theme's address changes with its files, so that the page takes a picture or a face its author changed, not the one it holds.
            const address = linked === true && theme !== undefined ? `${themesAddress}/${id}.${folderPrint([theme.folder])}` : `${themesAddress}/${id}`;
            return theme === undefined ? [] : [{ id, name: theme.name, css: themeCss(theme, address), icons: theme.icons, ...styleOf(theme, address) }];
        }));
    const themes = installed.length === 0 ? {} : { themes: installed };

    if (system === undefined) {
        sendJson(response, 200, themes);
    } else if (reading === undefined) {
        // No theme, but the system's name, which keeps the player's switch of its page style, if its page module gives one.
        sendJson(response, 200, { system: system.name, ...themes });
    } else if (reading.theme === undefined) {
        sendJson(response, 200, { system: reading.system, refused: true, ...themes });
    } else {
        const style = withFiles(served.session, () => (reading.theme === undefined ? {} : styleOf(reading.theme, themeAddress)));
        sendJson(response, 200, { system: reading.system, name: reading.theme.name, css: themeCss(reading.theme, themeAddress), icons: reading.theme.icons, ...style, ...themes });
    }
}

/**
 * A file of the theme of the campaign's game system, at theme/<path>, only from its folder, by real paths, and only while the theme passes its checks: a face,
 * a picture or its style sheet. Its ornament comes in the colour asked, ?ink=#rrggbb, and turned for a page that reads right to left, &mirrored; its cards'
 * texture in the colour asked, &texture.
 */
export async function sendThemeFile(name: string, query: URLSearchParams, request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const root = findCampaign(served.context.folder);
    await served.session.ready();
    const theme = root === undefined ? undefined : withFiles(served.session, () => campaignTheme(root, served.context))?.theme;
    sendFileOfTheme(theme, name, themeAddress, query, request, response, served);
}

/**
 * A file of a theme installed on its own, at themes/<id>/<path>, as the system's theme sends its files: only from its folder, by real paths, and only while it
 * passes its checks; a picture runs nothing, whoever made it. A linked theme's id may carry a print of its files after a dot, themes/<id>.<print>/<path>.
 */
export async function sendInstalledThemeFile(path: string, query: URLSearchParams, request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const [named, ...rest] = path.split("/");
    const id = named.split(".")[0];
    const themes = themesFolder(served.context);
    await served.session.ready();
    const theme = themes === undefined || !isThemeId(id) ? undefined : withFiles(served.session, () => installedTheme(themes, id)?.theme);
    sendFileOfTheme(theme, rest.join("/"), `${themesAddress}/${named}`, query, request, response, served);
}

/**
 * A face or a picture of this theme, by its name in the address after the theme's, or the style sheet it names, &layer the line that brings it into its
 * layer; its ornament in the colour asked, ?ink=#rrggbb, and turned, &mirrored; its cards' texture, &texture, all it fills in that colour.
 */
function sendFileOfTheme(theme: Theme | undefined, name: string, base: string, query: URLSearchParams, request: IncomingMessage, response: ServerResponse, served: Served): void
{
    const address = `${base}/${name}`;
    const given = decoded(name)?.replaceAll("\\", "/");
    const file = theme === undefined || given === undefined ? undefined : themeFile(theme.folder, given);
    const style = theme !== undefined && given === theme.style;
    const type = file === undefined ? undefined : style ? styleType : themeTypes[extname(file).toLowerCase()];

    if (file === undefined || type === undefined) {
        send(response, 404, "text/plain; charset=utf-8", `Nothing at ${address}.`);
        return;
    }

    const sheet = theme !== undefined && style && query.has("layer") ? withFiles(served.session, () => sheetAddress(theme, base)) : undefined;

    if (sheet !== undefined) {
        sendTagged(request, response, Buffer.from(`@import url("${sheet}") layer(theme-style);\n`), { "Content-Type": styleType, "Content-Security-Policy": securityHeaders["Content-Security-Policy"] });
        return;
    }

    const ink = query.get("ink");
    const tinted = type === imageTypes[".svg"] && ink !== null && /^#[0-9a-f]{6}$/i.test(ink);
    const drawn = (svg: string, colour: string): string => (query.has("texture") ? drawnTexture(svg, colour) : drawnOrnament(svg, colour, query.has("mirrored")));
    const bytes = withFiles(served.session, () => (tinted ? Buffer.from(drawn(files().text(file) ?? "", ink)) : files().bytes(file)));

    if (bytes === undefined) {
        send(response, 404, "text/plain; charset=utf-8", `Nothing at ${address}.`);
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

        // Through the session, which keeps the system's words translated on this computer (D-539).
        withFiles(served.session, () => served.words.ask(parsed.data.language.toLowerCase(), parsed.data.first));
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
    sendJson(response, 200, withFiles(served.session, () => served.words.read(language.toLowerCase(), system)));
}
