// The importer's work (D-483 (10), D-484, D-489): the helper outside the chat reads the document piece after piece, then sets the world at the starting point
// the player chose; the engine keeps the mark, so that a run that stops goes on from there.
import { join } from "node:path";
import { readAdventureFolder } from "../adventures/index.ts";
import type { DocumentReader } from "../core/context.ts";
import { claimImport, dropDocumentText, finishAdventure, importedPages, importStarts, type ImportState, pieceName, readImportState, releaseImport, writeImportState } from "../importer/index.ts";
import { coreSection } from "../instructions/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { partText } from "./parts.ts";

// The imports running in this process, by their folder, each with what stops it: a second call never starts a second reader on the same files.
const running = new Map<string, { work: Promise<void>; stop: AbortController; }>();

/** Whether a run of this import's helper is going on now, in this process. */
export function isImportRunning(folder: string): boolean
{
    return running.has(folder);
}

/** The import's runs, one after the other, until it waits for the player, is done or stops; started once however often it is asked. */
export function runImport(folder: string, reader: DocumentReader, system: GameSystem | undefined, language: string): Promise<void>
{
    const going = running.get(folder);

    if (going !== undefined) {
        return going.work;
    }

    // Another process, a command line beside the MCP server, runs it already: its runs go on there.
    if (!claimImport(folder)) {
        return Promise.resolve();
    }

    const stop = new AbortController();
    const work = steps(folder, reader, system, language, stop.signal).finally(() => {
        running.delete(folder);
        releaseImport(folder);
    });
    running.set(folder, { work, stop });
    return work;
}

/** Stops the import's helper, if this process runs it, and waits for it to end, so that its folder can go. */
export async function stopImport(folder: string): Promise<void>
{
    const going = running.get(folder);
    going?.stop.abort();
    await going?.work.catch(() => undefined);
}

async function steps(folder: string, reader: DocumentReader, system: GameSystem | undefined, language: string, signal: AbortSignal): Promise<void>
{
    for (;;) {
        const state = readImportState(folder);

        if (signal.aborted || state === undefined || state.failed !== undefined || state.phase === "choosing" || state.phase === "done") {
            return;
        }

        if (state.phase === "writing" && state.done >= (state.steps?.length ?? 0)) {
            finishImport(folder, state, language);
            continue;
        }

        const read = await reader.read(folder, brief(folder, state, system, language), ["adventure", "notes"], signal);

        if (signal.aborted) {
            return;
        }

        if ("failed" in read) {
            writeImportState(folder, { ...state, failed: read.failed });
            return;
        }

        const done = state.done + 1;

        if (state.phase === "reading" && done >= state.pieces) {
            const starts = importStarts(folder);
            // A module or notes have their own start: nothing to choose. No start at all, and the last piece is read again.
            writeImportState(
                folder,
                starts.length === 0
                    ? { ...state, failed: "the reading gave no starting points (notes/starts.md): call import to read the last piece again" }
                    : starts.length === 1
                    ? writingState(folder, state, 1)
                    : { ...state, phase: "choosing", done },
            );
        } else {
            writeImportState(folder, { ...state, done });
        }
    }
}

/** The import set to write the world at the start chosen: a step for each folder of pages, then the opening. */
export function writingState(folder: string, state: ImportState, start: number, character?: string): ImportState
{
    const steps = [...Object.keys(importedPages(folder)), "opening"];
    const { failed: _, ...kept } = state;
    return { ...kept, phase: "writing", done: 0, start, steps, ...(character === undefined ? {} : { character }) };
}

/**
 * The import done: the adventure finished and checked as an install checks it. One that fails the check has its opening written again once, told what was
 * wrong; failing again, it stops, for the master to say.
 */
function finishImport(folder: string, state: ImportState, language: string): void
{
    finishAdventure(folder, state.title, language);

    try {
        readAdventureFolder(join(folder, "adventure"));
    } catch (error) {
        const why = (error as Error).message.replace(/\.$/, "");
        const last = (state.steps?.length ?? 1) - 1;
        writeImportState(
            folder,
            state.fix === undefined
                ? { ...state, done: last, fix: why }
                : { ...state, done: last, failed: `the adventure is not right: ${why}. Call import to write its opening again, or cancel` },
        );
        return;
    }

    const { fix: _, ...kept } = state;
    writeImportState(folder, { ...kept, phase: "done" });
    dropDocumentText(folder, true);
}

// What the helper reads at each run: the importer's part of the instructions, the pages as the core writes them, and what to do now.
function brief(folder: string, state: ImportState, system: GameSystem | undefined, language: string): string
{
    // Filled by parts, never with replaceAll's own marks: a title with $& in it stays as it is.
    const instructions = (partText("import", system) ?? "").split("{title}").join(state.title).split("{language}").join(language);
    const pagesSection = coreSection("The world's pages");
    const written = Object.entries(importedPages(folder)).map(([type, names]) => `- ${type}: ${names.join(", ")}`);
    const pages = written.length === 0 ? "No pages yet." : `The pages written so far (read one before you add to it; never write a page twice):\n${written.join("\n")}`;
    return [instructions, helperFolder, `## Pages\n\n${pagesSection}`, `## Now\n\n${task(folder, state)}`, pages].join("\n\n");
}

// Where the helper finds the document and writes, which the master in a chat never needs.
const helperFolder = "## This folder\n\n"
    + '- `document/` holds the document\'s pieces (`01.md`, `02.md`, …) and its pictures in `document/pictures/`. A picture of a page is `image: "[[p012-1.png]]"` '
    + "on it, the file's name as the text marks it: look at the picture first if you are unsure.\n"
    + "- `notes/` is yours: `notes.md`, what the next run must know, under 600 words: what each piece held, what is uncertain or invented, the dates you chose.\n"
    + "- The pages go in `adventure/world/<type folder>/<Name>.md`, one file each, a markdown file with a YAML frontmatter; the type folders are `characters`, "
    + "`places`, `factions`, `items`, `events`, `topics`, `quests`, `creatures`.";

function task(folder: string, state: ImportState): string
{
    if (state.phase === "reading") {
        const piece = `document/${pieceName(state.done)}`;
        const last = state.done + 1 >= state.pieces;
        return [
            `Read notes/notes.md if it is there, then ${piece}, piece ${state.done + 1} of ${state.pieces} of "${state.title}", and no other piece: the next runs read them. `
            + "Write the pages for what it tells, as the document tells them, and add to the pages already written what it adds. Then update notes/notes.md.",
            last
                ? "This is the last piece. Then write notes/starts.md. For a book, three or four starting points spread over the story, each just before a choice of it, "
                    + "never its end; for a module or notes, its own start alone. Each as `## 1. A short name`, then: who could be played there, the characters who act "
                    + "in the story first, and the part's label; "
                    + "`Back cover:` two lines for a player who has not read it, telling nothing that comes after; `Reader:` one line by chapter and event. "
                    + "Last, for a novel or a story, notes/style.yaml with author, its author's name as readers know it, and story, one word of these four for how it "
                    + "is built: arcs, episodes, mystery or situations; for a module or notes, no such file."
                : "",
        ].filter((line) => line !== "").join(" ");
    }

    const start = importStarts(folder).find((one) => one.number === state.start);
    // Who the player plays is theirs from the start: nothing written decides what they do (playtest 18).
    const played = state.character === undefined
        ? ""
        : `\n\nThe player plays ${state.character}. On their page keep their past, bonds, nature and plans, and in knows what they knew there; never what they `
            + `will do, choose or suffer after it, their death included. Remove the events after the start that ${state.character} makes happen, and let no event `
            + `decide their acts: the player does.`;
    const chosen = `The player chose to start at ${state.start}. ${start?.title ?? ""}:\n${start?.text ?? ""}${played}`;
    const step = state.steps?.[state.done] ?? "opening";

    if (step !== "opening") {
        return `${chosen}\n\nNow set the pages of adventure/world/${step}/ as the world stands there: day 1 is that moment. An event before it is happened, `
            + "with no date and when it happened said in its text; an event after it stays planned, its date moved so that day 1 is the start; "
            + "whoever is dead by then is dead; knows is what each knew there; what comes after is secret on the pages it touches. Read notes/notes.md first, "
            + "and the pieces of document/ around the start where you need them.";
    }

    // The opening is named after the adventure, so that two imported adventures never share its name (ADV-2).
    const opening = `Opening of ${state.title}`;
    const fix = state.fix === undefined ? "" : `\n\nThe adventure you wrote failed the engine's check: ${state.fix}. Correct what it says, in the opening, adventure.yaml or the pages.`;
    return `${chosen}${fix}\n\nLast, write the adventure's opening: a page adventure/world/topics/${opening}.md with tags: [opening], all of it secret, in four parts: `
        + "the situation at the start, the hooks (one tied to the character who will be played), what happens if no one acts, the pages to read first. "
        + "Then adventure/adventure.yaml with title, about (one line, no secret), version: 1.0.0, author (the document's), start (the place it starts in) "
        + `and opening: ${opening}. Then notes/start.yaml with date, the day of the world's calendar the start falls on, as the document gives or suggests it, `
        + "such as 14 April 1885, or none if it gives none. Then notes/source.yaml with the document's title, author, license as the document states it (or unknown) and link if it gives one, "
        + "and notes/invented.md, a short list of what you invented to fill gaps, with no secret in it.";
}
