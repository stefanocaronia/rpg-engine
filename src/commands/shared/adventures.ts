// The adventures of a campaign (D-476, D-483): installed from a package whole or not at all, taken out while the story has not touched them, and exported as
// they were at the start (ADV-1–ADV-7).
import { basename, join, relative, resolve, sep } from "node:path";
import { parse, parseDocument, Scalar, stringify, visit } from "yaml";
import { type AdventureFiles, adventureFolderName, type AdventureManifest, adventureTarget, isAdventureFolder, largestAdventure, manifestLine, packAdventure, readAdventureFolder, readAdventureZip } from "../../adventures/index.ts";
import { houseRulesFolderName, readSettings } from "../../campaign/index.ts";
import type { Context } from "../../core/context.ts";
import { appendLogEntry, type LogEntry, readLog } from "../../core/log.ts";
import { Refusal } from "../../core/refusal.ts";
import { files } from "../../core/store.ts";
import { comparableText, linkTargetName } from "../../core/text.ts";
import { isNewerVersion } from "../../core/version.ts";
import { shortName } from "../../extensions/index.ts";
import { findImage, imageFileName, largestImage } from "../../images/index.ts";
import { locate, type Page, pageNamed, pageNamedQuietly, readFields, splitPageFile, textsIn, type World, worldFolderName } from "../../pages/index.ts";
import { readRuleBook, ruleSections } from "../../rules/index.ts";
import { unpackFiles } from "../../saves/index.ts";
import { formatGameDate, readGameDate } from "../../time/index.ts";
import { campaignMode } from "./mode.ts";
import { listedExtensions } from "./packages/extensions.ts";
import { houseRules, systemRuleBook } from "./rules.ts";
import { campaignSaves, exportsFolderName, resetSave, savesFolderName, savesWhy } from "./saves.ts";
import { newDatedLogEntry, readPresent } from "./time.ts";
import { campaignSystem, campaignWorld } from "./world.ts";

/** An adventure the campaign has installed and not taken out (ADV-6). */
export interface InstalledAdventure
{
    title: string;
    version: string;
    /** The game date it came in on, when the game had one. */
    since?: string;
    /** The files it wrote, from the campaign's folder. */
    files: string[];
    /** The days its dates were moved by. */
    shift: number;
    /** The line of the log that installed it. */
    entry: string;
}

/** What installing an adventure did (ADV-5), as the master reads it. */
export interface AdventureInstalled
{
    manifest: AdventureManifest;
    already: boolean;
    /** How many pages of each type, by their folder, and how many rules and pictures. */
    counts: Record<string, number>;
    shift: number;
    firstDate?: { page: string; date: string; };
    textDates: number;
    shadows: string[];
    covers: string[];
    ignored: string[];
    /** The starting place, and whether the world already holds it in a place. */
    start?: { name: string; placed: boolean; };
}

/** What an export wrote (ADV-7). */
export interface AdventureExported
{
    file: string;
    from: string;
    pages: number;
    leftOut: { characters: string[]; adventures: string[]; };
    opening?: string;
    /** The pages written from the player's documents (source:), when no license was given: the zip keeps them to the player. */
    sourced?: string[];
}

// The mark of an install under way, with its title and the days it moves dates by: while it is there, installing the same adventure finishes it (ADV-5).
const installMarkName = ".adventure-install.yaml";
// The documents a master imports, never a package: their pages are written by the master (D-483 (10)).
const documentPattern = /\.(pdf|docx?|odt|rtf|txt|md|epub)$/i;

/** Whether what was given to package install is an adventure: a .zip, a link, or a folder with adventure.yaml; a document says it is imported instead. */
export function isAdventureSpec(spec: string): boolean
{
    if (documentPattern.test(spec)) {
        throw new Refusal(
            `${spec} is a document, not a package: make an adventure from it with import; package install takes only what has adventure.yaml. Nothing changed.`,
            "document",
            { name: spec },
        );
    }

    return /\.zip$/i.test(spec) || /^https:\/\//i.test(spec) || isAdventureFolder(resolve(spec));
}

/** The adventure a .zip, a folder or an https link gives (ADV-1): a GitHub repository is read as the zip of its branch. */
export async function readAdventureSpec(spec: string, context: Context): Promise<AdventureFiles>
{
    if (/^https:\/\//i.test(spec)) {
        if (context.download === undefined) {
            throw new Error("Only the game's server and the command line download an adventure: give a .zip or a folder of this computer.");
        }

        const repository = /^https:\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?(?:\/tree\/([^#?]+))?\/?$/i.exec(spec);
        const url = repository === null ? spec : `https://codeload.github.com/${repository[1]}/${repository[2]}/zip/${repository[3] === undefined ? "HEAD" : `refs/heads/${repository[3]}`}`;
        return readAdventureZip(await context.download(url, largestAdventure, context.signal), spec);
    }

    const path = resolve(spec);

    if (/\.zip$/i.test(spec)) {
        const bytes = files().bytes(path);

        if (bytes === undefined) {
            throw new Refusal(`There is no file ${path}: give the path of the adventure's .zip. Nothing changed.`, "not-on-computer", { name: path });
        }

        return readAdventureZip(bytes, basename(path));
    }

    return readAdventureFolder(path);
}

/** The adventures the log says are installed and not taken out, in the order they came (ADV-6): they go back with a save. */
export function installedAdventures(root: string): InstalledAdventure[]
{
    return adventuresOfLog(readLog(root));
}

/** Installs an adventure in the campaign (ADV-2–ADV-5): checked whole, then written, or nothing at all; installed again, it finishes what stopped. */
export function installAdventure(root: string, context: Context, adventure: AdventureFiles, from: string): AdventureInstalled
{
    const { manifest } = adventure;
    const there = installedAdventures(root).find((one) => comparableText(one.title) === comparableText(manifest.title));

    if (there !== undefined) {
        if (there.version !== manifest.version) {
            throw new Refusal(`The campaign has ${manifest.title} ${there.version}: a played adventure is not updated. Nothing changed.`, "adventure-played", {
                name: manifest.title,
                version: there.version,
            });
        }

        return { ...describe(root, context, adventure, there.shift, [], []), already: true };
    }

    const stopped = installMark(root);

    if (stopped !== undefined && comparableText(stopped.title) !== comparableText(manifest.title)) {
        throw new Refusal(`The install of ${stopped.title} stopped halfway: finish it first with package install ${stopped.from}. Nothing changed.`, "adventure-halfway", {
            name: stopped.title,
        });
    }

    checkNeeds(root, context, manifest);
    const shift = stopped?.shift ?? Math.max(0, (readPresent(root).date?.day ?? 1) - 1);
    const plan = planInstall(root, context, adventure, shift);

    if (plan.problems.length > 0) {
        const listed = plan.problems.slice(0, 10).join("; ");
        const more = plan.problems.length > 10 ? `; and ${plan.problems.length - 10} more` : "";
        throw new Refusal(
            `${manifest.title} cannot be installed: ${listed}${more}. Rename the adventure's pages in its folder, or the campaign's with rename if the player has not met them, `
                + "and install it again. Nothing changed.",
            "adventure-names",
            { name: manifest.title, names: `${listed}${more}` },
        );
    }

    const mark = join(root, installMarkName);
    files().write(mark, stringify({ title: manifest.title, shift, from }));

    for (const write of plan.writes) {
        files().writeBytes(join(root, ...write.path.split("/")), write.bytes);
    }

    appendLogEntry(root, newDatedLogEntry(root, context, "adventure-installed", "public", { title: manifest.title, version: manifest.version, from, shift, files: plan.paths }));
    files().remove(mark);
    return { ...describe(root, context, adventure, shift, plan.shadows, plan.covers), already: false };
}

/** Takes an adventure out (ADV-6), with the files it wrote, while no line of the log after it names one of its pages; else it throws, saying it stays. */
export function removeAdventure(root: string, context: Context, adventure: InstalledAdventure): void
{
    const touching = storyTouching(root, adventure);

    if (touching !== undefined) {
        throw new Refusal(
            `${adventure.title} is part of the story now: the log names its pages${touching.date === undefined ? "" : ` on ${touching.date}`}. It stays; nothing changed.`,
            "adventure-in-story",
            { name: adventure.title },
        );
    }

    // A file already gone, by hand or by a remove that stopped, is no reason to stop.
    for (const path of adventure.files.map((one) => join(root, ...one.split("/"))).filter((one) => files().exists(one))) {
        files().remove(path);
    }

    appendLogEntry(root, newDatedLogEntry(root, context, "adventure-removed", "public", { title: adventure.title }));
}

/** The first line of the log after an adventure came in that names one of its pages (ADV-6): it can no longer be taken out; undefined while none does. */
export function storyTouching(root: string, adventure: InstalledAdventure): LogEntry | undefined
{
    const log = readLog(root);
    const names = new Set(adventure.files.filter((path) => path.startsWith(`${worldFolderName}/`)).flatMap((path) => pageNames(root, path)).map(comparableText));
    const after = log.slice(log.findIndex((entry) => entry.id === adventure.entry) + 1);
    return after.find((entry) => textsIn(entry.data).some((text) => names.has(comparableText(linkTargetName(unlinked(text))))));
}

/**
 * Exports the campaign's world as an adventure (ADV-7), as it was at its start: the save before session zero, else that of the start, else the world now while no
 * scene was ever opened; without the player characters and the adventures it installed. Written in exports/, by the campaign's name.
 */
export function exportAdventure(root: string, context: Context, credits: { author?: string; license?: string; }): AdventureExported
{
    const { held, from } = startingFiles(root, context);
    const settings = readSettings(root);
    const log = held["log.jsonl"] === undefined ? [] : new TextDecoder().decode(held["log.jsonl"]).split("\n").filter((line) => line.trim() !== "").map((line) => JSON.parse(line) as LogEntry);
    const installed = new Set(adventuresOfLog(log).flatMap((adventure) => adventure.files));
    const pages = Object.entries(held).filter(([path]) => path.startsWith(`${worldFolderName}/`) && path.endsWith(".md")).map(([path, bytes]) => ({ path, fields: fieldsOf(path, bytes) }));
    const players = pages.filter((page) => page.fields.role === "pc");
    const playerImages = new Set(players.map((page) => imageFileName(page.fields.image)?.toLowerCase()).filter((name) => name !== undefined));
    const kept: Record<string, Uint8Array> = {};

    for (const [path, bytes] of Object.entries(held)) {
        const top = path.split("/")[0];
        const out = !["world", "images", "rules"].includes(top) || installed.has(path) || players.some((page) => page.path === path)
            || (top === "images" && playerImages.has(basename(path).toLowerCase()));

        if (!out) {
            kept[path] = bytes;
        }
    }

    const opening = pages.find((page) => !installed.has(page.path) && textsIn(page.fields.tags).some((tag) => comparableText(tag) === "opening"));
    const start = opening === undefined ? undefined : textsIn(opening.fields.start)[0]?.replace(/^\[\[|\]\]$/g, "");
    const system = campaignSystem(root, context);
    // The system is needed, with its credits, only where a page uses it (D-489 (6)); pages from the player's documents keep it to the player unless they say otherwise.
    const usesSystem = settings.system !== undefined && systemUsed(kept, campaignWorld(root, context), system?.fields ?? {});
    const sourced = pages.filter((page) => kept[page.path] !== undefined && page.fields.source !== undefined).map((page) => basename(page.path, ".md"));
    const license = credits.license ?? (sourced.length > 0 ? "personal use only" : undefined);
    const manifest: AdventureManifest = {
        title: manifestLine(settings.name, "title"),
        about: manifestLine(settings.premise ?? settings.name, "about"),
        language: settings.language ?? "en",
        version: "1.0.0",
        ...(credits.author === undefined ? {} : { author: credits.author }),
        ...(license === undefined ? {} : { license }),
        ...(system?.attribution === undefined || !usesSystem ? {} : { attribution: system.attribution }),
        needs: { ...(usesSystem ? { system: settings.system } : {}), extensions: listedExtensions(root) },
        content: [],
        ...(start === undefined ? {} : { start }),
        ...(opening === undefined ? {} : { opening: basename(opening.path, ".md") }),
    };
    const file = join(root, exportsFolderName, `${settings.name.replace(/[\\/:*?"<>|]/g, "").trim()}.adventure.zip`);
    files().writeBytes(file, packAdventure(manifest, kept));
    const adventures = adventuresOfLog(log).map((adventure) => adventure.title);
    return {
        file,
        from,
        pages: Object.keys(kept).filter((path) => path.startsWith(`${worldFolderName}/`)).length,
        leftOut: { characters: players.map((page) => basename(page.path, ".md")), adventures },
        ...(sourced.length > 0 && credits.license === undefined ? { sourced } : {}),
        ...(opening === undefined ? {} : { opening: basename(opening.path, ".md") }),
    };
}

/** Whether the pages kept use the game system: a link to one of its pages, or a number in a field it declares. */
function systemUsed(kept: Record<string, Uint8Array>, world: World, fields: Record<string, string>): boolean
{
    const declared = new Set(Object.keys(fields).map(comparableText));

    return Object.entries(kept).some(([path, bytes]) => {
        if (!path.startsWith(`${worldFolderName}/`) || !path.endsWith(".md")) {
            return false;
        }

        const text = new TextDecoder().decode(bytes);
        const linked = [...text.matchAll(/\[\[([^\]]+)\]\]/g)].some((link) => pageNamedQuietly(world, linkTargetName(link[1] ?? ""))?.system !== undefined);
        return linked || Object.entries(fieldsOf(path, bytes)).some(([key, value]) => declared.has(comparableText(key)) && /\d/.test(String(value)));
    });
}

/** The adventures of a log: those installed, less those taken out after. */
function adventuresOfLog(log: LogEntry[]): InstalledAdventure[]
{
    const found: InstalledAdventure[] = [];

    for (const entry of log) {
        const data = entry.data as { title?: unknown; version?: unknown; files?: unknown; };
        const title = String(data.title ?? "");

        if (entry.type === "adventure-installed") {
            const shift = Number((entry.data as { shift?: unknown; }).shift ?? 0);
            found.push({ title, version: String(data.version ?? ""), ...(entry.date === undefined ? {} : { since: entry.date }), files: textsIn(data.files), shift, entry: entry.id });
        } else if (entry.type === "adventure-removed") {
            const removed = found.findIndex((one) => comparableText(one.title) === comparableText(title));

            if (removed !== -1) {
                found.splice(removed, 1);
            }
        }
    }

    return found;
}

/** What the adventure needs (D-163): the campaign's game system and its extensions, at their lowest versions; it throws, saying what to install. */
function checkNeeds(root: string, context: Context, manifest: AdventureManifest): void
{
    const settings = readSettings(root);

    if (manifest.needs.system !== undefined && comparableText(manifest.needs.system) !== comparableText(settings.system ?? "")) {
        throw new Refusal(
            `${manifest.title} is for the game system ${manifest.needs.system}, and the campaign plays ${settings.system ?? "none yet"}: it cannot be installed here. Nothing changed.`,
            "other-system",
            { name: manifest.title, system: manifest.needs.system, plays: settings.system ?? "" },
        );
    }

    const listed = listedExtensions(root);

    for (const [name, lowest] of Object.entries(manifest.needs.extensions)) {
        const found = Object.keys(listed).find((one) => one === name || comparableText(shortName(one)) === comparableText(shortName(name)));

        if (found === undefined) {
            throw new Refusal(`${manifest.title} needs the extension ${name}: install it with package install ${shortName(name)} first. Nothing changed.`, "adventure-needs", {
                name: manifest.title,
                needs: shortName(name),
            });
        }

        if (isNewerVersion(lowest, listed[found])) {
            throw new Refusal(
                `${manifest.title} needs ${name} ${lowest} or later, and the campaign has ${listed[found]}: install the newer with package install ${shortName(name)}. Nothing changed.`,
                "adventure-needs-newer",
                { name: manifest.title, needs: shortName(name), version: lowest, has: listed[found] },
            );
        }
    }

    if (manifest.levels !== undefined && campaignSystem(root, context)?.progression?.level === undefined) {
        throw new Error(`${manifest.title} says the levels it is for, and the game system ${settings.system ?? "of the campaign"} has no levels: take levels out of its adventure.yaml. Nothing changed.`);
    }
}

interface InstallPlan
{
    writes: { path: string; bytes: Uint8Array; }[];
    /** Every file the adventure has in the campaign, written now or already there. */
    paths: string[];
    problems: string[];
    shadows: string[];
    covers: string[];
}

/** The whole install worked out before a file is written (ADV-2–ADV-4): where each file goes, its dates moved, and every name already taken. */
function planInstall(root: string, context: Context, adventure: AdventureFiles, shift: number): InstallPlan
{
    const world = campaignWorld(root, context);
    const folder = adventureFolderName(adventure.manifest.title);
    const plan: InstallPlan = { writes: [], paths: [], problems: [], shadows: [], covers: [] };
    const ownNames = new Map<string, string>();
    const houseTitles = new Set(readRuleBook(join(root, houseRulesFolderName), houseRules).map((section) => comparableText(section.path.at(-1) ?? "")));
    const system = campaignSystem(root, context);
    const systemTitles = new Map((system === undefined ? [] : systemRuleBook(system)).map((section) => [comparableText(section.path.at(-1) ?? ""), section.path.at(-1) ?? ""]));

    for (const [path, original] of Object.entries(adventure.files)) {
        const target = adventureTarget(path, folder);
        const bytes = path.startsWith(`${worldFolderName}/`) ? movedDates(original, shift) : original;
        const existing = files().bytes(join(root, ...target.split("/")));
        const same = existing !== undefined && sameBytes(existing, bytes);

        if (path.startsWith(`${worldFolderName}/`)) {
            const name = basename(path, ".md").normalize("NFC");

            for (const named of [name, ...textsIn(fieldsOf(path, original).aliases)]) {
                const key = comparableText(named);
                const taken = namedPage(world, named);

                if (ownNames.has(key)) {
                    plan.problems.push(`${named} names two of its pages, ${ownNames.get(key) ?? ""} and ${path}`);
                } else if (taken !== undefined && taken.system === undefined && !(same && taken.path === target)) {
                    plan.problems.push(`${named} is already a page of the campaign, ${taken.path}`);
                } else if (taken?.system !== undefined) {
                    plan.shadows.push(named);
                }

                ownNames.set(key, path);
            }
        } else if (path.startsWith("rules/")) {
            for (const section of ruleSections(new TextDecoder().decode(original), path, "adventure").filter((one) => one.level > 0)) {
                const title = section.path.at(-1) ?? "";

                if (houseTitles.has(comparableText(title)) && !same) {
                    plan.problems.push(`the rule ${title} is already a house rule of the campaign`);
                } else if (systemTitles.has(comparableText(title))) {
                    plan.covers.push(systemTitles.get(comparableText(title)) ?? title);
                }
            }
        } else {
            const image = findImage([root], basename(path));
            const imageBytes = image === undefined ? undefined : files().bytes(image);

            if (bytes.length > largestImage) {
                plan.problems.push(`the picture ${basename(path)} is more than ${largestImage / 1024 / 1024} MB`);
            } else if (imageBytes !== undefined && !sameBytes(imageBytes, bytes)) {
                plan.problems.push(`the picture ${basename(path)} is already in the campaign, and differs`);
            }

            // A picture the campaign has already, the same, is no file of the adventure's.
            if (imageBytes !== undefined && image !== join(root, ...target.split("/"))) {
                continue;
            }
        }

        if (existing !== undefined && !same && path.startsWith("rules/")) {
            plan.problems.push(`${target} is already in the campaign`);
        }

        plan.paths.push(target);

        if (!same) {
            plan.writes.push({ path: target, bytes });
        }
    }

    return plan;
}

/** What the master hears of an install: the counts by kind, the dates, and where it starts. */
function describe(root: string, context: Context, adventure: AdventureFiles, shift: number, shadows: string[], covers: string[]): Omit<AdventureInstalled, "already">
{
    const counts: Record<string, number> = {};
    let firstDate: { page: string; date: string; day: number; } | undefined;
    let textDates = 0;

    for (const [path, bytes] of Object.entries(adventure.files)) {
        const parts = path.split("/");
        const kind = parts[0] === worldFolderName ? (parts.length > 2 ? parts[1] : "other pages") : parts[0];
        counts[kind] = (counts[kind] ?? 0) + 1;

        if (parts[0] === worldFolderName) {
            const file = splitPageFile(new TextDecoder().decode(bytes));
            textDates += (file.body.match(/\bday\s+\d+/gi) ?? []).length;

            for (const value of datesIn(fieldsOf(path, bytes))) {
                if (firstDate === undefined || value.day < firstDate.day) {
                    const date = formatGameDate({ ...value, day: value.day + shift });
                    firstDate = { page: basename(path, ".md"), date, day: value.day };
                }
            }
        }
    }

    const start = adventure.manifest.start;
    const startPage = start === undefined ? undefined : pageNamed(campaignWorld(root, context), start);
    return {
        manifest: adventure.manifest,
        counts,
        shift,
        ...(firstDate === undefined ? {} : { firstDate: { page: firstDate.page, date: firstDate.date } }),
        textDates,
        shadows: [...new Set(shadows)],
        covers: [...new Set(covers)],
        ignored: adventure.ignored,
        ...(start === undefined ? {} : { start: { name: start, placed: startPage !== undefined && isPlaced(campaignWorld(root, context), startPage) } }),
    };
}

/** The game's files as the adventure was at its start (ADV-7), with the save they come from; it throws when the game went on with none of its start. */
function startingFiles(root: string, context: Context): { held: Record<string, Uint8Array>; from: string; }
{
    const saves = campaignSaves(root);
    const why = savesWhy(root);
    const save = resetSave(saves, why, "session zero") ?? saves.find((one) => why.get(one.number) === "start");

    if (save !== undefined) {
        return { held: unpackFiles(files().bytes(join(root, savesFolderName, save.file)) ?? new Uint8Array()), from: `the save ${save.number} - ${save.label}` };
    }

    const played = readLog(root).some((entry) => entry.type === "scene-opened") || campaignMode(root, campaignWorld(root, context)) === "play";

    if (played) {
        throw new Refusal(
            "The campaign has been played, and has no save of its start: what it is now goes on as a save of the whole game, not as an adventure. Nothing was written.",
            "export-played",
        );
    }

    const held: Record<string, Uint8Array> = {};
    const log = files().bytes(join(root, "log.jsonl"));

    for (const file of ["world", "images", "rules"].flatMap((top) => files().files(join(root, top), () => true))) {
        held[relative(root, file).split(sep).join("/")] = files().bytes(file) ?? new Uint8Array();
    }

    if (log !== undefined) {
        held["log.jsonl"] = log;
    }

    return { held, from: "the world as it is, before play" };
}

/** A page's text with every date of its frontmatter moved forward by `shift` days (ADV-4); the text below it stays. */
function movedDates(bytes: Uint8Array, shift: number): Uint8Array
{
    const text = new TextDecoder().decode(bytes);
    const file = splitPageFile(text);

    if (shift === 0 || file.frontmatter === undefined) {
        return bytes;
    }

    const document = parseDocument(file.frontmatter);
    let moved = false;
    visit(document, {
        Scalar(_key, node: Scalar)
        {
            const date = readGameDate(node.value);

            if (date !== undefined) {
                node.value = formatGameDate({ ...date, day: date.day + shift });
                moved = true;
            }
        },
    });

    if (!moved) {
        return bytes;
    }

    return new TextEncoder().encode(`---\n${document.toString({ lineWidth: 0 }).trimEnd()}\n---\n\n${file.body}\n`);
}

/** Every game date a page's fields hold, in lists and objects too. */
function datesIn(value: unknown): { day: number; minute?: number; }[]
{
    if (Array.isArray(value)) {
        return value.flatMap(datesIn);
    }

    if (value !== null && typeof value === "object") {
        return Object.values(value).flatMap(datesIn);
    }

    const date = readGameDate(value);
    return date === undefined ? [] : [date];
}

/** A page's fields; it throws, naming the file, when its frontmatter does not read. */
function fieldsOf(path: string, bytes: Uint8Array): Record<string, unknown>
{
    return readFields(splitPageFile(new TextDecoder().decode(bytes)).frontmatter, path);
}

/** The campaign's or the system's page by this name or alias; one an alias names twice counts as taken. */
function namedPage(world: ReturnType<typeof campaignWorld>, name: string): Page | undefined
{
    try {
        return pageNamed(world, name);
    } catch {
        return world.pages.find((page) => textsIn(page.fields.aliases).some((alias) => comparableText(alias) === comparableText(name)));
    }
}

/** Whether a page is held by a place of the world. */
function isPlaced(world: ReturnType<typeof campaignWorld>, page: Page): boolean
{
    return locate(world, page).chain.length > 0;
}

/** The install that stopped halfway, with its title, the days it moves dates by and where it came from (ADV-5); undefined when none did. */
function installMark(root: string): { title: string; shift: number; from: string; } | undefined
{
    const text = files().text(join(root, installMarkName));
    const read = text === undefined ? undefined : (parse(text) as { title?: unknown; shift?: unknown; from?: unknown; } | null);
    return read === undefined || read === null || typeof read.title !== "string" ? undefined : { title: read.title, shift: Number(read.shift ?? 0), from: String(read.from ?? read.title) };
}

/** A page's name and its aliases, as its file in the campaign has them now. */
function pageNames(root: string, path: string): string[]
{
    const text = files().text(join(root, ...path.split("/")));
    let aliases: string[] = [];

    try {
        aliases = text === undefined ? [] : textsIn(readFields(splitPageFile(text).frontmatter, path).aliases);
    } catch {
        // A frontmatter that does not read names no alias.
    }

    return [basename(path, ".md"), ...aliases];
}

/** A text as the page it may name: [[Oste#Segreto|lui]] as Oste. */
function unlinked(text: string): string
{
    const match = /^\s*\[\[([^\]#|]*)[^\]]*\]\]\s*$/.exec(text);
    return match === null ? text : match[1];
}

function sameBytes(first: Uint8Array, second: Uint8Array): boolean
{
    return first.length === second.length && first.every((byte, index) => byte === second[index]);
}
