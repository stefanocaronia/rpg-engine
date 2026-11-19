// Who makes the pictures (D-572), as the campaign chose: the chat in use, by its own means, as by default: in Codex, Codex; in Antigravity, the chat itself
// with its own tool, which the engine never starts (its terms); elsewhere Claude's SVG, always on the player's own plan, never an API key (D-493). Or Codex,
// which, where it cannot or refuses, leaves the picture to the chat in use, saying why; or an image tool of the master's own, as ElevenLabs, from the same
// brief as Antigravity's. Without any, the page shows its own picture all the same (D-389).
import type { DocumentReader, MadePicture, PictureFallback, PictureMaker, PicturesReady, PictureSubject, TextWriter } from "../core/context.ts";
import { chatBrief } from "./briefs.ts";
import { claudePictures, claudeReader, claudeWriter } from "./claude.ts";
import { codexPictures, codexReader, codexWriter } from "./codex.ts";

/** The chat whose own pictures are Codex's, as its MCP client names itself. */
export const codexClient = "codex-mcp-client";

/** Antigravity's chat, as its MCP client names itself: it makes its pictures itself. */
export const antigravityClient = "antigravity-client";

/**
 * The pictures of this computer, by the campaign's choice, which `choice` reads when a picture is asked: unset or chat, the chat `host` names, by its own
 * means; codex; elevenlabs, or the name of another image tool of the master's, from the brief. Codex, where it cannot or refuses, leaves the picture to the chat
 * in use; once it refused, it is not asked again while the server lives, until the choice changes.
 */
export function hostPictures(host: () => string | undefined, choice: () => string | undefined = () => undefined, codex: PictureMaker = codexPictures(), claude: PictureMaker = claudePictures()): PictureMaker
{
    let refused: string | undefined;
    let lastChoice: string | undefined;
    // The chat in use, by its own means.
    const chat = (): PictureMaker => (host() === codexClient ? codex : host() === antigravityClient ? antigravityPictures : claude);

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

        // A chat that paints itself gets no picture to make after its call answered: the next ones are its own.
        if (other.brief !== undefined) {
            return { refused: `${instead.why}; the next pictures are yours to make with your own image tool` };
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
            return said.ready || instead === undefined ? said : { ready: true, maker: instead.by, instead };
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

// Antigravity paints in its own chat, from the brief the image command gives it: the engine starts nothing.
const antigravityPictures: PictureMaker = {
    ready: () => ({ ready: true, maker: "Antigravity" }),
    make: () => Promise.resolve({ refused: "Antigravity makes its pictures in its own chat" }),
    brief: chatBrief,
};

// An image tool of the master's own, by its name, as ElevenLabs's: the same brief, and the engine starts nothing.
function masterTool(name: string): PictureMaker
{
    return {
        ready: () => ({ ready: true, maker: name, tool: name }),
        make: () => Promise.resolve({ refused: `the master makes the pictures with ${name}` }),
        brief: chatBrief,
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
        program: () => readers().find((reader) => reader.ready())?.program?.(),
        read: (folder, brief, writable, signal) => (readers().find((reader) => reader.ready()) ?? claude).read(folder, brief, writable, signal),
    };
}
