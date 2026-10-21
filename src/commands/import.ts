import { basename, extname, join, relative, resolve, sep } from "node:path";
import { z } from "zod";
import { adventureFolderName } from "../adventures/index.ts";
import { changeSetting, readSettings, requireCampaign, storyWays } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { documentAt, readDocument } from "../documents/index.ts";
import {
    doneImports,
    dropImport,
    hasImport,
    importedPages,
    importFile,
    importFolder,
    importPiece,
    type ImportStart,
    importStarts,
    type ImportState,
    importStyle,
    openImport,
    prepareImport,
    readImportState,
    runElsewhere,
    writeImportState,
} from "../importer/index.ts";
import { stopProcess } from "../pictures/index.ts";
import { installedAdventures } from "./game-adventures.ts";
import { isImportRunning, runImport, stopImport, writingState } from "./game-import.ts";
import { newDatedLogEntry } from "./game-time.ts";
import { campaignSystem } from "./game-world.ts";
import { situationPart } from "./parts.ts";

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
    /** In the chat, the piece given now, with the importer's part of the instructions once in a chat. */
    piece?: { number: number; text: string; instructions: string; pictures: string; };
}

export const importCommand = defineCommand({
    name: "import",
    description: "Make an adventure from the player's own document: a book, a game module or notes, as a PDF, Word, OpenDocument, EPUB, HTML, RTF, text or markdown file, "
        + "or a folder of them. A helper on this computer reads it outside the chat, piece after piece, and writes the pages; it takes minutes, and goes on by itself. "
        + "From a book it proposes three or four starting points: ask the player whether they have read it, let them choose, then give start; the world is then written "
        + "as it stands there. When it is done, install it with package install. Where no helper is on this computer, it gives you the document a piece at each call, to write its pages with write. Call import alone to see how far it is. Example: document C:\\Users\\me\\Books\\novel.pdf.",
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

            await stopRunner(open.folder);
            await stopImport(open.folder);
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

        if (open.state.inChat === true) {
            return nextPiece(root, context, open.folder, open.state);
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
    // Without a helper, the master reads it here, a piece at each call (D-489 (1)).
    const inChat = context.reader?.ready() !== true;
    appendLogEntry(root, newDatedLogEntry(root, context, "import-started", "hidden", { title: name, document, pieces: state.pieces, ...(inChat ? { inChat } : {}) }));

    if (inChat) {
        writeImportState(folder, { ...state, inChat });
        return nextPiece(root, context, folder, { ...state, inChat });
    }

    const going = goOn(root, context, folder);

    if (context.files === undefined) {
        await going;
    }

    return { ...resultOf(root, folder, readImportState(folder) ?? state), pictures: text.pictures.length };
}

/** The next piece for the master to read in the chat, with the importer's instructions once in a chat; the last one ends the import. */
function nextPiece(root: string, context: Context, folder: string, state: ImportState): ImportResult
{
    const text = importPiece(folder, state.done);
    const done = state.done + 1;
    const next: ImportState = { ...state, done, ...(done >= state.pieces ? { phase: "done" as const } : {}) };
    writeImportState(folder, next);
    const instructions = situationPart("import", context, campaignSystem(root, context)).replaceAll("{title}", state.title).replaceAll("{language}", readSettings(root).language ?? "en");
    return { ...resultOf(root, folder, next), piece: { number: done, text, instructions, pictures: join(folder, "document", "pictures") } };
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

    // An import.yaml changed by hand has nothing to go on from: only cancel drops it.
    if (state.pieces === 0) {
        return Promise.resolve();
    }

    const elsewhere = runElsewhere(folder) !== undefined;

    if (state.failed !== undefined && !isImportRunning(folder) && !elsewhere) {
        const { failed: _, ...kept } = state;
        writeImportState(folder, kept);
    }

    // In the MCP server the runs go on in a process of their own, which outlives the chat (playtest 18); one at a time.
    if (context.files !== undefined && context.importRunner !== undefined) {
        if (!elsewhere) {
            context.importRunner(root);
        }

        return Promise.resolve();
    }

    const language = readSettings(root).language ?? "en";
    const going = runImport(folder, context.reader, campaignSystem(root, context), language).then(() => {
        const done = readImportState(folder);

        if (done?.phase === "done") {
            appendLogEntry(root, newDatedLogEntry(root, context, "import-done", "hidden", { title: state.title }));
            writeImportState(folder, { ...done, ...followBook(root, context, folder) });
        }
    });
    going.catch(() => undefined);
    return going;
}

/** Stops the process that runs the import apart, if one does, and waits for it to end, so that its folder can go. */
async function stopRunner(folder: string): Promise<void>
{
    const pid = runElsewhere(folder);

    if (pid === undefined) {
        return;
    }

    stopProcess(pid);

    for (let waited = 0; waited < 15_000 && runElsewhere(folder) !== undefined; waited += 200) {
        await new Promise((done) => setTimeout(done, 200));
    }
}

function resultOf(root: string, folder: string, state: ImportState): ImportResult
{
    const invented = state.phase === "done" ? importFile(folder, "notes/invented.md") : undefined;
    return {
        title: state.title,
        state,
        adventure: relative(root, join(folder, "adventure")),
        running: isImportRunning(folder) || runElsewhere(folder) !== undefined,
        starts: state.phase === "choosing" ? importStarts(folder) : [],
        pages: Object.fromEntries(Object.entries(importedPages(folder)).map(([type, names]) => [type, names.length])),
        ...(invented === undefined || invented === "" ? {} : { invented }),
    };
}

/**
 * The narration as the book is told (Stefano, 21 October; D-395): its author and how it is built, set when the player has chosen nothing of how the master
 * writes, else left for the master to ask; of the author only their way, never their sentences, as the author setting says.
 */
function followBook(root: string, context: Context, folder: string): Pick<ImportState, "followed">
{
    const { author, story } = importStyle(folder);

    if (author === undefined) {
        return {};
    }

    const settings = readSettings(root);
    const built = story !== undefined && (storyWays as readonly string[]).includes(story) ? story : undefined;
    const chosen = settings.author !== undefined || settings.style !== undefined || (settings.prose !== undefined && settings.prose !== "plain") || settings.story !== undefined;

    if (chosen) {
        return { followed: { author, ...(built === undefined ? {} : { story: built }), set: false } };
    }

    for (const [setting, value] of [["author", author], ["story", built]] as const) {
        if (value !== undefined && changeSetting(root, setting, value)) {
            appendLogEntry(root, newDatedLogEntry(root, context, "config-changed", "public", { setting, value }));
        }
    }

    return { followed: { author, ...(built === undefined ? {} : { story: built }), set: true } };
}

/** The import as the master reads it: how far it is, what to tell the player, and what comes next. */
export function importText(result: ImportResult): string
{
    const { state } = result;
    const pages = Object.entries(result.pages).map(([type, count]) => `${count} ${type}`).join(", ");

    if (result.cancelled === true) {
        return `The import of ${state.title} is dropped, with what it wrote.`;
    }

    if (result.piece !== undefined) {
        return chatPieceText(state, result.piece);
    }

    if (state.failed !== undefined && !result.running) {
        const said = state.failed.replace(/\.$/, "");
        return `The import of ${state.title} stopped: ${said}.${/call import|cancel/i.test(said) ? "" : " Call import to try again from there."}`;
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

    return `${state.title} is ready: ${pages}, in ${result.adventure}. Install it with package install "${result.adventure}" when the story reaches it, at the setup if it is the start.`
        + (result.invented === undefined ? "" : `\nTell the player what was invented to fill the gaps:\n${result.invented}`)
        + followedText(state.followed);
}

// What the narration became, or what to ask, as the book is told.
function followedText(followed: ImportState["followed"]): string
{
    if (followed === undefined) {
        return "";
    }

    const way = `like ${followed.author}${followed.story === undefined ? "" : `, story ${followed.story}`}`;
    return followed.set
        ? `\nYou now write ${way}, as the book is told: tell the player, who changes it in Settings.`
        : `\nThe player chose how you write: ask whether to write ${way}, as the book is told; if so, config author ${followed.author}`
            + `${followed.story === undefined ? "" : ` and story ${followed.story}`}.`;
}

// A piece for the master to read in the chat, and what to do with it.
function chatPieceText(state: ImportState, piece: NonNullable<ImportResult["piece"]>): string
{
    const last = piece.number >= state.pieces;
    const then = last
        ? "This is the last piece. For a book, ask the player whether they have read it, then propose three or four starting points spread over the story, each just "
            + "before a choice of it, never its end, with who could be played there: as its back cover would to one who has not read it. Once they choose, set the "
            + "world as it stands there with write: day 1 is that moment; an event before it is happened, one after stays planned with its date moved; whoever is "
            + "dead by then is dead; knows is what each knew there; what comes after is secret. A module keeps its own start. Then write the opening, a topic tagged "
            + "opening, all secret: the situation, the hooks, what happens if no one acts, the pages to read first; and tell the player the gaps you filled. "
            + "A novel or a story is told as its author tells it: unless the player chose how you write, config author with the author's name and story with how "
            + "it is built (arcs, episodes, mystery or situations), and tell them; if they chose, ask whether to switch."
        : "Then call import for the next piece.";
    return [
        `Importing ${state.title} here in the chat, piece ${piece.number} of ${state.pieces}: write its pages with write, and add what it adds to the pages you `
        + `wrote before, which find shows. A picture marked [picture: name] is the file "${piece.pictures}${sep}name": give it to its page with image. ${then}`,
        piece.instructions,
        piece.text,
    ].filter((part) => part !== "").join("\n\n");
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

    if (state.inChat === true) {
        return `Import of ${state.title} in the chat: ${state.done} of ${state.pieces} pieces read; call import for the next.`;
    }

    const running = isImportRunning(open.folder) || runElsewhere(open.folder) !== undefined;

    if (state.failed !== undefined && !running) {
        return `Import of ${state.title} stopped: call import to try again.`;
    }

    if (state.phase === "choosing") {
        return `Import of ${state.title}: its starting points are ready, call import to see them.`;
    }

    // After the MCP server started again, nothing runs it until import is called.
    const told = `Import of ${state.title}: ${state.phase}, ${state.done} of ${state.phase === "reading" ? state.pieces : (state.steps?.length ?? 1)} done`;
    return running ? `${told}.` : `${told}; call import to go on.`;
}
