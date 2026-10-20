import { basename, extname, join, relative, resolve } from "node:path";
import { z } from "zod";
import { adventureFolderName } from "../adventures/index.ts";
import { readSettings, requireCampaign } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { documentAt, readDocument } from "../documents/index.ts";
import { doneImports, dropImport, hasImport, importedPages, importFile, importFolder, type ImportStart, importStarts, type ImportState, openImport, prepareImport, readImportState, writeImportState } from "../importer/index.ts";
import { installedAdventures } from "./game-adventures.ts";
import { forgetImport, isImportRunning, runImport, writingState } from "./game-import.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignSystem } from "./game-world.ts";

interface ImportResult
{
    title: string;
    state: ImportState;
    /** The adventure's folder, from the campaign's. */
    adventure: string;
    running: boolean;
    pictures?: number;
    starts: ImportStart[];
    pages: Record<string, number>;
    /** What the importer invented to fill the document's gaps, for the player. */
    invented?: string;
    cancelled?: boolean;
}

export const importCommand = defineCommand({
    name: "import",
    description: "Make an adventure from the player's own document: a book, a game module or notes, as a PDF, Word, OpenDocument, EPUB, HTML, RTF, text or markdown file, "
        + "or a folder of them. A helper on this computer reads it outside the chat, piece after piece, and writes the pages; it takes minutes, and goes on by itself. "
        + "From a book it proposes three or four starting points: ask the player whether they have read it, let them choose, then give start; the world is then written "
        + "as it stands there. When it is done, install it with package install. Call import alone to see how far it is. Example: document C:\\Users\\me\\Books\\novel.pdf.",
    group: "game",
    positionals: ["document"],
    input: z.object({
        document: z.string().optional().describe("the document's file or folder: its full path, or one from the folder the command runs in"),
        title: z.string().optional().describe("the adventure's title; the document's name when left out"),
        start: z.preprocess((value) => (typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : value), z.number().int().positive()).optional().describe("the starting point the player chose, by its number"),
        cancel: z.boolean().optional().describe("drop the import under way, and what it wrote; the player's document stays as it is"),
    }),

    async run(input, context): Promise<ImportResult>
    {
        const root = requireCampaign(context.folder);
        const open = openImport(root);

        if (input.cancel === true) {
            if (open === undefined) {
                throw new Error("No import is under way. Nothing changed.");
            }

            forgetImport(open.folder);
            dropImport(open.folder);
            appendLogEntry(root, newDatedLogEntry(root, context, "import-cancelled", "hidden", { title: open.state.title }));
            return { ...resultOf(root, open.folder, open.state), cancelled: true };
        }

        if (input.document !== undefined && input.document.trim() !== "") {
            if (open !== undefined) {
                throw new Error(`The import of ${open.state.title} is under way: finish it, or drop it with cancel, before another. Nothing changed.`);
            }

            return startImport(root, context, resolve(context.folder, input.document.trim()), input.title?.trim());
        }

        if (open === undefined) {
            const installed = new Set(installedAdventures(root).map((adventure) => adventure.title));
            const ready = doneImports(root).find((title) => !installed.has(title));

            if (ready === undefined || input.start !== undefined) {
                throw new Error("No import is under way: give the player's document with document. Nothing changed.");
            }

            const folder = importFolder(root, adventureFolderName(ready));
            return resultOf(root, folder, readImportState(folder)!);
        }

        if (input.start !== undefined) {
            chooseStart(root, context, open.folder, open.state, input.start);
        }

        // A run stopped by a failure, or by a server that was restarted, goes on from where it stopped; the command line waits for it.
        const going = goOn(root, context, open.folder);

        if (context.files === undefined) {
            await going;
        }

        return resultOf(root, open.folder, readImportState(open.folder) ?? open.state);
    },

    format: importText,
});

async function startImport(root: string, context: Context, document: string, title: string | undefined): Promise<ImportResult>
{
    const found = documentAt(document);

    if (found === undefined) {
        throw new Error(`There is no ${document}: give the full path of the player's document. Nothing changed.`);
    }

    if (context.reader?.ready() !== true) {
        throw new Error(
            "No helper on this computer reads documents: the import needs Claude Code or Codex, logged in with the player's plan. Read the document with your own tools, "
                + "a short one only, and write its pages with write; or ask the player to log in, then import again. Nothing changed.",
        );
    }

    const name = title === undefined || title === "" ? basename(document, found === "folder" ? "" : extname(document)) : title;
    const folder = importFolder(root, adventureFolderName(name));

    if (hasImport(folder)) {
        throw new Error(`An import called ${name} is already in the campaign: give another title. Nothing changed.`);
    }

    const text = await readDocument(document);

    if (text.parts.every((part) => part.text.trim() === "")) {
        throw new Error(`${basename(document)} has no text the engine can read: a scan is pictures of pages, which it does not read. Nothing changed.`);
    }

    const state = prepareImport(folder, name, document, text);
    appendLogEntry(root, newDatedLogEntry(root, context, "import-started", "hidden", { title: name, document, pieces: state.pieces }));
    const going = goOn(root, context, folder);

    if (context.files === undefined) {
        await going;
    }

    return { ...resultOf(root, folder, readImportState(folder) ?? state), pictures: text.pictures.length };
}

function chooseStart(root: string, context: Context, folder: string, state: ImportState, start: number): void
{
    const starts = importStarts(folder);

    if (state.phase !== "choosing") {
        throw new Error(`The import of ${state.title} is ${state.phase}, not waiting for a start. Nothing changed.`);
    }

    if (!starts.some((one) => one.number === start)) {
        throw new Error(`There is no starting point ${start}: choose one of ${starts.map((one) => one.number).join(", ")}. Nothing changed.`);
    }

    writeImportState(folder, writingState(folder, state, start));
    appendLogEntry(root, newDatedLogEntry(root, context, "import-start-chosen", "hidden", { title: state.title, start }));
}

// The helper's runs, in the background while the MCP server lives on; the command line waits for them.
function goOn(root: string, context: Context, folder: string): Promise<void>
{
    const state = readImportState(folder);

    if (context.reader === undefined || state === undefined || state.phase === "choosing" || state.phase === "done") {
        return Promise.resolve();
    }

    if (state.failed !== undefined && !isImportRunning(folder)) {
        const { failed: _, ...kept } = state;
        writeImportState(folder, kept);
    }

    const language = readSettings(root).language ?? "en";
    const going = runImport(folder, context.reader, context, campaignSystem(root, context), language).then(() => {
        if (readImportState(folder)?.phase === "done") {
            appendLogEntry(root, newDatedLogEntry(root, context, "import-done", "hidden", { title: state.title }));
        }
    });
    going.catch(() => undefined);
    return going;
}

function resultOf(root: string, folder: string, state: ImportState): ImportResult
{
    const invented = state.phase === "done" ? importFile(folder, "notes/invented.md") : undefined;
    return {
        title: state.title,
        state,
        adventure: relative(root, join(folder, "adventure")),
        running: isImportRunning(folder),
        starts: state.phase === "choosing" ? importStarts(folder) : [],
        pages: Object.fromEntries(Object.entries(importedPages(folder)).map(([type, names]) => [type, names.length])),
        ...(invented === undefined || invented === "" ? {} : { invented }),
    };
}

/** The import as the master reads it: how far it is, what to tell the player, and what comes next. */
export function importText(result: ImportResult): string
{
    const { state } = result;
    const pages = Object.entries(result.pages).map(([type, count]) => `${count} ${type}`).join(", ");

    if (result.cancelled === true) {
        return `The import of ${state.title} is dropped, with what it wrote.`;
    }

    if (state.failed !== undefined && !result.running) {
        return `The import of ${state.title} stopped: ${state.failed.replace(/\.$/, "")}. Call import to try again from there.`;
    }

    if (state.phase === "reading") {
        const minutes = Math.max(1, (state.pieces - state.done) * 4);
        return `Importing ${state.title}: piece ${Math.min(state.done + 1, state.pieces)} of ${state.pieces} being read${result.pictures === undefined ? "" : `, ${result.pictures} pictures found`}; `
            + `about ${minutes} minutes more, by itself${pages === "" ? "" : `; pages so far: ${pages}`}. Tell the player, and go on with them meanwhile; status says when it is ready.`;
    }

    if (state.phase === "choosing") {
        const starts = result.starts.map((start) => `${start.number}. ${start.title}\n${start.text}`).join("\n\n");
        return `${state.title} is read (${pages}). Ask the player whether they have read it; give each start its Back cover lines if not, its Reader line if so, `
            + `and the character they would play; then call import with the start they choose.\n\n${starts}`;
    }

    if (state.phase === "writing") {
        return `Setting ${state.title} at start ${state.start}: step ${Math.min(state.done + 1, state.steps?.length ?? 1)} of ${state.steps?.length ?? 1}, by itself; `
            + "status says when it is ready.";
    }

    return `${state.title} is ready: ${pages}, in ${result.adventure}. Install it with package install ${result.adventure} when the story reaches it, at the setup if it is the start.`
        + (result.invented === undefined ? "" : `\nTell the player what was invented to fill the gaps:\n${result.invented}`);
}

/** The line status gives while an import is under way, waits for the player, or is ready and not installed yet. */
export function importLine(root: string): string
{
    const open = openImport(root);

    if (open === undefined) {
        const installed = new Set(installedAdventures(root).map((adventure) => adventure.title));
        const ready = doneImports(root).filter((title) => !installed.has(title));
        return ready.length === 0 ? "" : `Imported and not installed: ${ready.join(", ")}; import says where, package install adds one.`;
    }

    const { state } = open;

    if (state.failed !== undefined && !isImportRunning(open.folder)) {
        return `Import of ${state.title} stopped: call import to try again.`;
    }

    return state.phase === "choosing"
        ? `Import of ${state.title}: its starting points are ready, call import to see them.`
        : `Import of ${state.title}: ${state.phase}, ${state.done} of ${state.phase === "reading" ? state.pieces : (state.steps?.length ?? 1)} done.`;
}
