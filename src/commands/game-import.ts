// The importer's work (D-483 (10), D-484, D-489): the helper outside the chat reads the document piece after piece, then sets the world at the starting point
// the player chose; the engine keeps the mark, so that a run that stops goes on from there.
import { join } from "node:path";
import { readAdventureFolder } from "../adventures/index.ts";
import type { Context, DocumentReader } from "../core/context.ts";
import { finishAdventure, importedPages, importStarts, type ImportState, readImportState, writeImportState } from "../importer/index.ts";
import { masterInstructions } from "../instructions/index.ts";
import type { GameSystem } from "../systems/index.ts";
import { partText } from "./parts.ts";

// The imports running in this process, by their folder: a second call never starts a second reader on the same files.
const running = new Map<string, Promise<void>>();

/** Whether a run of this import's helper is going on now. */
export function isImportRunning(folder: string): boolean
{
    return running.has(folder);
}

/** The import's runs, one after the other, until it waits for the player, is done or stops; started once however often it is asked. */
export function runImport(folder: string, reader: DocumentReader, context: Context, system: GameSystem | undefined, language: string): Promise<void>
{
    const going = running.get(folder);

    if (going !== undefined) {
        return going;
    }

    const work = steps(folder, reader, context, system, language).finally(() => running.delete(folder));
    running.set(folder, work);
    return work;
}

async function steps(folder: string, reader: DocumentReader, context: Context, system: GameSystem | undefined, language: string): Promise<void>
{
    for (;;) {
        const state = readImportState(folder);

        if (state === undefined || state.phase === "choosing" || state.phase === "done") {
            return;
        }

        if (state.phase === "writing" && state.done >= (state.steps?.length ?? 0)) {
            finishImport(folder, state, language);
            return;
        }

        const read = await reader.read(folder, brief(folder, state, system), ["adventure", "notes"]);

        if ("failed" in read) {
            writeImportState(folder, { ...state, failed: read.failed });
            return;
        }

        const done = state.done + 1;
        const { failed: _, ...kept } = state;

        if (state.phase === "reading" && done >= state.pieces) {
            const starts = importStarts(folder);
            // A module or notes have their own start: nothing to choose.
            writeImportState(folder, starts.length === 1 ? writingState(folder, kept, 1) : { ...kept, phase: "choosing", done });
        } else {
            writeImportState(folder, { ...kept, done });
        }

        if (context.signal?.aborted === true) {
            return;
        }
    }
}

/** The import set to write the world at the start chosen: a step for each folder of pages, then the opening. */
export function writingState(folder: string, state: ImportState, start: number): ImportState
{
    const steps = [...Object.keys(importedPages(folder)), "opening"];
    const { failed: _, ...kept } = state;
    return { ...kept, phase: "writing", done: 0, start, steps };
}

/** The import done: the adventure finished and checked as an install checks it; the mark at its end, or why it is not. */
function finishImport(folder: string, state: ImportState, language: string): void
{
    finishAdventure(folder, state.title, language);

    try {
        readAdventureFolder(join(folder, "adventure"));
    } catch (error) {
        writeImportState(folder, { ...state, failed: `the adventure is not right yet: ${(error as Error).message}` });
        return;
    }

    writeImportState(folder, { ...state, phase: "done" });
}

/** Forgets a run of an import that is dropped. */
export function forgetImport(folder: string): void
{
    running.delete(folder);
}

// What the helper reads at each run: the importer's part of the instructions, the pages as the core writes them, and what to do now.
function brief(folder: string, state: ImportState, system: GameSystem | undefined): string
{
    const instructions = (partText("import", system) ?? "").replaceAll("{title}", state.title);
    const pagesSection = /## 3\. The world's pages\n([\s\S]*?)\n## /.exec(masterInstructions())?.[1]?.trim() ?? "";
    const written = Object.entries(importedPages(folder)).map(([type, names]) => `- ${type}: ${names.join(", ")}`);
    const pages = written.length === 0 ? "No pages yet." : `The pages written so far (read one before you add to it; never write a page twice):\n${written.join("\n")}`;
    return [instructions, `## Pages\n\n${pagesSection}`, `## Now\n\n${task(folder, state)}`, pages].join("\n\n");
}

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
                    + "`Back cover:` two lines for a player who has not read it, telling nothing that comes after; `Reader:` one line by chapter and event."
                : "",
        ].filter((line) => line !== "").join(" ");
    }

    const start = importStarts(folder).find((one) => one.number === state.start);
    const chosen = `The player chose to start at ${state.start}. ${start?.title ?? ""}:\n${start?.text ?? ""}`;
    const step = state.steps?.[state.done] ?? "opening";

    if (step !== "opening") {
        return `${chosen}\n\nNow set the pages of adventure/world/${step}/ as the world stands there: day 1 is that moment. An event before it is happened, `
            + "with no date and when it happened said in its text; an event after it stays planned, its date moved so that day 1 is the start; "
            + "whoever is dead by then is dead; knows is what each knew there; what comes after is secret on the pages it touches. Read notes/notes.md first, "
            + "and the pieces of document/ around the start where you need them.";
    }

    // The opening is named after the adventure, so that two imported adventures never share its name (ADV-2).
    const opening = `Opening of ${state.title}`;
    return `${chosen}\n\nLast, write the adventure's opening: a page adventure/world/topics/${opening}.md with tags: [opening], all of it secret, in four parts: `
        + "the situation at the start, the hooks (one tied to the character who will be played), what happens if no one acts, the pages to read first. "
        + "Then adventure/adventure.yaml with title, about (one line, no secret), version: 1.0.0, author (the document's), start (the place it starts in) "
        + `and opening: ${opening}. Then notes/source.yaml with the document's title, author, license as the document states it (or unknown) and link if it gives one, `
        + "and notes/invented.md, a short list of what you invented to fill gaps, with no secret in it.";
}

function pieceName(index: number): string
{
    return `${String(index + 1).padStart(2, "0")}.md`;
}
