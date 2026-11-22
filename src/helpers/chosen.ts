// Who makes the pictures (D-572), as the campaign chose: the chat in use, by its own means, as by default: in Codex, Codex; in Antigravity, the chat itself
// with its own tool, which the engine never starts (its terms); in Claude Code and on the command line, Claude's SVG, always on the player's own plan, never an
// API key (D-493); in any other chat, as OpenCode, the chat draws the SVG itself and hands it back with image, svg. Or Codex,
// which, where it cannot or refuses, leaves the picture to the chat in use, saying why; or an image tool of the master's own, as ElevenLabs, from the same
// brief as Antigravity's. Without any, the page shows its own picture all the same (D-389).
import type { DocumentReader, MadePicture, PictureFallback, PictureMaker, PicturesReady, PictureSubject, TextWriter } from "../core/context.ts";
import { antigravityBrief, chatBrief, drawnBrief } from "./briefs.ts";
import { claudePictures, claudeReader, claudeWriter } from "./claude.ts";
import { codexPictures, codexReader, codexWriter } from "./codex.ts";
import { openCodeReader, openCodeWriter } from "./opencode.ts";

/** The chat whose own pictures are Codex's, as its MCP client names itself. */
export const codexClient = "codex-mcp-client";

/** Antigravity's chat, as its MCP client names itself: it makes its pictures itself. */
export const antigravityClient = "antigravity-client";

/** OpenCode's chat, as its MCP client names itself: its master draws the pictures, and OpenCode does the work outside the chat there, and nowhere else (D-578 (3)). */
export const openCodeClient = "opencode";

/**
 * The pictures of this computer, by the campaign's choice, which `choice` reads when a picture is asked: unset or chat, the chat `host` names, by its own
 * means; codex; elevenlabs, or the name of another image tool of the master's, from the brief. Codex, where it cannot or refuses, leaves the picture to the chat
 * in use; once it refused, it is not asked again while the server lives, until the choice changes.
 */
export function hostPictures(host: () => string | undefined, choice: () => string | undefined = () => undefined, codex: PictureMaker = codexPictures(), claude: PictureMaker = claudePictures()): PictureMaker
{
    let refused: string | undefined;
    let lastChoice: string | undefined;

    // The chat in use, by its own means: Claude's drawing in Claude Code, whose clients' names start with claude, and where no chat names itself.
    const chat = (): PictureMaker => {
        const name = host() ?? "";

        if (name === "" || name.toLowerCase().startsWith("claude")) {
            return claude;
        }

        return name === codexClient ? codex : name === antigravityClient ? antigravityPictures : chatDrawing(chatNames[name] ?? name);
    };

    // The maker the campaign chose, and whether it is Codex apart from the chat in use, which leaves the picture to it where it cannot.
    const chosen = (): { maker: PictureMaker; codexApart: boolean; } => {
        const said = choice()?.trim();

        // The player chose again: Codex is asked again.
        if (said !== lastChoice) {
            refused = undefined;
            lastChoice = said;
        }

        const key = said?.toLowerCase();

        if (key === undefined || key === "" || key === chatChoice) {
            return { maker: chat(), codexApart: false };
        }

        if (key === codexChoice) {
            return { maker: codex, codexApart: chat() !== codex };
        }

        return { maker: key === otherChoice ? unnamedTool : masterTool(key === elevenlabsChoice ? "ElevenLabs" : said ?? ""), codexApart: false };
    };

    // Codex's own answer, or its refusal remembered; in Codex, the chat's own.
    const codexReady = (again?: boolean): PicturesReady => (refused === undefined ? codex.ready(again) : { ready: false, why: refused });

    const madeInstead = async (subject: PictureSubject, instead: PictureFallback): Promise<MadePicture | { refused: string; }> => {
        const other = chat();

        if (!other.ready().ready) {
            return { refused: instead.why };
        }

        // A chat that paints or draws itself gets no picture to make after its call answered: the next ones are its own.
        if (other.brief !== undefined) {
            return { refused: `${instead.why}; the next pictures are yours to ${drawsItself(other) ? "draw as SVG code and give with image, svg" : "make with your own image tool"}` };
        }

        const made = await other.make(subject);
        return "refused" in made ? { refused: `${instead.why}; ${instead.by} made none either: ${made.refused}` } : { ...made, instead };
    };

    const fallbackOf = (said: { why: string; fix?: string; }, refusedPicture = refused !== undefined): PictureFallback | undefined => {
        const other = chat().ready();
        const by = other.ready ? other.maker : undefined;
        return by === undefined ? undefined : { maker: "Codex", by, why: said.why, ...(said.fix === undefined ? {} : { fix: said.fix }), ...(refusedPicture ? { refused: true as const } : {}) };
    };

    return {
        ready: (again) => {
            const { maker, codexApart } = chosen();

            if (!codexApart) {
                return maker === codex ? codexReady(again) : maker.ready(again);
            }

            const said = codexReady(again);
            const instead = said.ready ? undefined : fallbackOf(said);
            return said.ready || instead === undefined ? said : { ready: true, maker: instead.by, ...(drawsItself(chat()) ? { draws: true as const } : {}), instead };
        },
        make: async (subject) => {
            const { maker, codexApart } = chosen();
            const said = maker === codex ? codexReady() : maker.ready();

            if (!said.ready) {
                const instead = codexApart ? fallbackOf(said) : undefined;
                return instead === undefined ? { refused: said.why } : madeInstead(subject, instead);
            }

            const made = await maker.make(subject);

            if (!("refused" in made) || maker !== codex) {
                return made;
            }

            // A refusal of this one picture, as the safety check's, leaves Codex asked for the next.
            if (made.onlyThis !== true) {
                refused = made.refused;
            }

            const instead = codexApart ? fallbackOf({ why: made.refused }, true) : undefined;
            return instead === undefined ? made : madeInstead(subject, instead);
        },
        brief: (subject) => {
            const { maker, codexApart } = chosen();

            if (!codexApart) {
                return maker.ready().ready ? maker.brief?.(subject) : undefined;
            }

            // Codex not ready: a chat that paints itself makes it in its place.
            return codexReady().ready ? undefined : chat().brief?.(subject);
        },
    };
}

// The values of the campaign's pictures-by setting the engine knows: the chat in use, Codex, ElevenLabs, another tool not named yet; any other names an
// image tool of the master's.
const chatChoice = "chat";
const codexChoice = "codex";
const elevenlabsChoice = "elevenlabs";
const otherChoice = "other";

// Another image tool of the master's, which the player has not named yet: the master asks them which, from the same brief.
const unnamedTool: PictureMaker = {
    ready: () => ({ ready: true, maker: "another tool", askTool: true }),
    make: () => Promise.resolve({ refused: "the master makes the pictures with another tool, which the player has not named yet" }),
    brief: chatBrief,
};

// Antigravity paints in its own chat, from the brief the image command gives it, or draws the SVG where its tool fails: the engine starts nothing.
const antigravityPictures: PictureMaker = {
    ready: () => ({ ready: true, maker: "Antigravity" }),
    make: () => Promise.resolve({ refused: "Antigravity makes its pictures in its own chat" }),
    brief: antigravityBrief,
};

// The chats' names for the player, by the names their MCP clients give themselves; any other is shown as it comes.
const chatNames: Record<string, string> = { [openCodeClient]: "OpenCode" };

/** A chat that draws its pictures itself as SVG code (D-572), as OpenCode: from the SVG brief image gives it, handed back with image, svg; the engine starts nothing. */
export function chatDrawing(name: string): PictureMaker
{
    return {
        ready: () => ({ ready: true, maker: name, draws: true }),
        make: () => Promise.resolve({ refused: `${name} draws its pictures in its own chat` }),
        brief: drawnBrief,
    };
}

// Whether a maker is a chat that draws itself; one with no brief never is, and is not asked.
function drawsItself(maker: PictureMaker): boolean
{
    const said = maker.brief === undefined ? undefined : maker.ready();
    return said?.ready === true && said.draws === true;
}

// An image tool of the master's own, by its name, as ElevenLabs's: the same brief, and the engine starts nothing.
function masterTool(name: string): PictureMaker
{
    return {
        ready: () => ({ ready: true, maker: name, tool: name }),
        make: () => Promise.resolve({ refused: `the master makes the pictures with ${name}` }),
        brief: chatBrief,
    };
}

/** The writer of text of this computer for the chat `host` names (D-406): Codex first, then Claude; in OpenCode, OpenCode before them. */
export function hostWriter(host: () => string | undefined, codex: TextWriter = codexWriter(), claude: TextWriter = claudeWriter(), openCode: TextWriter = openCodeWriter()): TextWriter
{
    const writers = (): TextWriter[] => (host() === codexClient ? [codex] : host() === openCodeClient ? [openCode, codex, claude] : [codex, claude]);
    return {
        ready: () => writers().some((writer) => writer.ready()),
        write: (brief) => (writers().find((writer) => writer.ready()) ?? codex).write(brief),
    };
}

/** The importer of this computer for the chat `host` names (D-489 (1)): Codex in Codex, else Claude first, which Elena's probe measured, then Codex; in OpenCode, OpenCode before them. */
export function hostReader(host: () => string | undefined, codex: DocumentReader = codexReader(), claude: DocumentReader = claudeReader(), openCode: DocumentReader = openCodeReader()): DocumentReader
{
    const readers = (): DocumentReader[] => (host() === codexClient ? [codex] : host() === openCodeClient ? [openCode, claude, codex] : [claude, codex]);
    return {
        ready: () => readers().some((reader) => reader.ready()),
        program: () => readers().find((reader) => reader.ready())?.program?.(),
        read: (folder, brief, writable, signal) => (readers().find((reader) => reader.ready()) ?? claude).read(folder, brief, writable, signal),
    };
}
