// Who makes the pictures, by the chat in use (D-390): in Codex, Codex; elsewhere Codex where it is ready, else Claude's SVG, a Gemini chat too, as Gemini's
// own pictures cost by the picture. Without any, the page shows its own picture all the same (D-389).
import type { DocumentReader, PictureMaker, TextWriter } from "../core/context.ts";
import { claudePictures, claudeReader, claudeWriter } from "./claude.ts";
import { codexPictures, codexReader, codexWriter } from "./codex.ts";

/** The chat whose own pictures are Codex's, as its MCP client names itself. */
const codexClient = "codex-mcp-client";

/** The pictures of this computer for the chat `host` names, read when a picture is asked, as the MCP client said it at its start; Codex first, then Claude. */
export function hostPictures(host: () => string | undefined, codex: PictureMaker = codexPictures(), claude: PictureMaker = claudePictures()): PictureMaker
{
    const makers = (): PictureMaker[] => (host() === codexClient ? [codex] : [codex, claude]);
    const chosen = (again?: boolean): PictureMaker | undefined => makers().find((maker) => maker.ready(again).ready);
    return {
        ready: (again) => chosen(again)?.ready(again) ?? codex.ready(again),
        make: (subject) => (chosen() ?? codex).make(subject),
    };
}

/** The writer of text of this computer for the chat `host` names (D-406), chosen as the pictures are: Codex first, then Claude. */
export function hostWriter(host: () => string | undefined, codex: TextWriter = codexWriter(), claude: TextWriter = claudeWriter()): TextWriter
{
    const writers = (): TextWriter[] => (host() === codexClient ? [codex] : [codex, claude]);
    return {
        ready: () => writers().some((writer) => writer.ready()),
        write: (brief) => (writers().find((writer) => writer.ready()) ?? codex).write(brief),
    };
}

/** The importer of this computer for the chat `host` names (D-489 (1)): Codex in Codex, else Claude first, which Elena's probe measured, then Codex. */
export function hostReader(host: () => string | undefined, codex: DocumentReader = codexReader(), claude: DocumentReader = claudeReader()): DocumentReader
{
    const readers = (): DocumentReader[] => (host() === codexClient ? [codex] : [claude, codex]);
    return {
        ready: () => readers().some((reader) => reader.ready()),
        read: (folder, brief, writable) => (readers().find((reader) => reader.ready()) ?? claude).read(folder, brief, writable),
    };
}
