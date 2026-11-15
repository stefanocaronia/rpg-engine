// Who makes the pictures, by the chat in use (D-390): in Codex, Codex; in Antigravity, the chat itself with its own tool, which the engine never starts (its
// terms); elsewhere Codex where it is ready, else Claude's SVG, always on the player's own plan, never an API key (D-493). Without any, the page shows its own
// picture all the same (D-389).
import type { DocumentReader, PictureMaker, TextWriter } from "../core/context.ts";
import { chatBrief } from "./briefs.ts";
import { claudePictures, claudeReader, claudeWriter } from "./claude.ts";
import { codexPictures, codexReader, codexWriter } from "./codex.ts";

/** The chat whose own pictures are Codex's, as its MCP client names itself. */
export const codexClient = "codex-mcp-client";

/** Antigravity's chat, as its MCP client names itself: it makes its pictures itself. */
export const antigravityClient = "antigravity-client";

/** The pictures of this computer for the chat `host` names, read when a picture is asked, as the MCP client said it at its start; Codex first, then Claude. */
export function hostPictures(host: () => string | undefined, codex: PictureMaker = codexPictures(), claude: PictureMaker = claudePictures()): PictureMaker
{
    const makers = (): PictureMaker[] => (host() === codexClient ? [codex] : host() === antigravityClient ? [antigravityPictures] : [codex, claude]);
    const chosen = (again?: boolean): PictureMaker | undefined => makers().find((maker) => maker.ready(again).ready);
    return {
        ready: (again) => chosen(again)?.ready(again) ?? codex.ready(again),
        make: (subject) => (chosen() ?? codex).make(subject),
        brief: (subject) => chosen()?.brief?.(subject),
    };
}

// Antigravity paints in its own chat, from the brief the image command gives it: the engine starts nothing.
const antigravityPictures: PictureMaker = {
    ready: () => ({ ready: true, maker: "Antigravity" }),
    make: () => Promise.resolve({ refused: "Antigravity makes its pictures in its own chat" }),
    brief: chatBrief,
};

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
        program: () => readers().find((reader) => reader.ready())?.program?.(),
        read: (folder, brief, writable, signal) => (readers().find((reader) => reader.ready()) ?? claude).read(folder, brief, writable, signal),
    };
}
