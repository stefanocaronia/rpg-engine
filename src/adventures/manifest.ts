import { parse, stringify } from "yaml";
import { z } from "zod";

/** The manifest of an adventure, by which a package is known as one (D-372). */
export const manifestFileName = "adventure.yaml";

// The most words the master and the dashboard read of an adventure's own lines, as an extension's (D-441 (3)).
const aboutWords = 40;
const titleWords = 12;

/** What an adventure says of itself (D-483 (4)): what it is, what it needs, for whom, and where it starts. */
export interface AdventureManifest
{
    title: string;
    /** One line for the master and the dashboard: never a secret. */
    about: string;
    language: string;
    version: string;
    author?: string;
    /** The author's own, free: without one, all rights are reserved. */
    license?: string;
    /** The credits the author gives; the game system's own is the engine's to add. */
    attribution?: string;
    needs: { system?: string; extensions: Record<string, string>; };
    /** The levels it is written for, when the game system has levels. */
    levels?: { from: number; to: number; };
    /** Its strong themes, for the player's lines and veils. */
    content: string[];
    /** How long it lasts, in the author's words: 3 sessions. */
    length?: string;
    /** For how many characters it is written, in the author's words. */
    party?: string;
    /** The place it starts in, and its opening page for the master. */
    start?: string;
    opening?: string;
}

const words = (most: number) => z.string().trim().min(1).refine((text) => text.split(/\s+/).length <= most, `at most ${most} words`);
const versionPattern = /^\d+(\.\d+){0,2}$/;

const manifestSchema = z.object({
    title: words(titleWords),
    about: words(aboutWords),
    language: z.string().trim().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "a language code, such as en, it or pt-BR"),
    version: z.union([z.string(), z.number()]).transform(String).refine((version) => versionPattern.test(version), "a version such as 1.0.0"),
    author: z.string().trim().min(1).optional(),
    license: z.string().trim().min(1).optional(),
    attribution: z.string().trim().min(1).optional(),
    needs: z.object({
        system: z.string().trim().min(1).optional(),
        extensions: z.record(z.string().min(1), z.union([z.string(), z.number()]).transform(String).refine((version) => versionPattern.test(version), "a lowest version, such as 0.1.0"))
            .optional(),
    }).strict().optional(),
    levels: z.union([z.string(), z.number()]).transform(String).refine((levels) => /^\d+(\s*-\s*\d+)?$/.test(levels.trim()), "levels such as 1-3, or 5").optional(),
    content: z.array(z.string().trim().min(1)).optional(),
    length: z.string().trim().min(1).optional(),
    party: z.union([z.string(), z.number()]).transform(String).optional(),
    start: z.string().trim().min(1).optional(),
    opening: z.string().trim().min(1).optional(),
}).strict();

/** A text as the manifest takes it for a title or an about: its first sentence, at most so many words, for an export to read again. */
export function manifestLine(text: string, field: "title" | "about"): string
{
    const sentence = text.trim().split(/(?<=[.!?])\s/)[0];
    const most = field === "title" ? titleWords : aboutWords;
    const words = sentence.split(/\s+/);
    return words.length <= most ? sentence : `${words.slice(0, most - 1).join(" ")}…`;
}

/** The manifest as `label` writes it; it throws, saying what to fix, when it is not one. */
export function readManifest(text: string, label: string): AdventureManifest
{
    let read: unknown;

    try {
        read = parse(text);
    } catch (error) {
        throw new Error(`${label} is not YAML that reads: ${error instanceof Error ? error.message : String(error)}.`);
    }

    const checked = manifestSchema.safeParse(read);

    if (!checked.success) {
        const issue = checked.error.issues[0];
        throw new Error(`${label}: ${issue.path.length === 0 ? "" : `${issue.path.join(".")}, `}${issue.message}. Fix ${manifestFileName} and give it again.`);
    }

    const { needs, levels, content, start, opening, ...rest } = checked.data;
    return {
        ...rest,
        needs: { ...(needs?.system === undefined ? {} : { system: needs.system }), extensions: needs?.extensions ?? {} },
        ...(levels === undefined ? {} : { levels: levelRange(levels) }),
        content: content ?? [],
        ...(start === undefined ? {} : { start: linkName(start) }),
        ...(opening === undefined ? {} : { opening: linkName(opening) }),
    };
}

/** The manifest as adventure.yaml writes it, in the same order every time. */
export function writeManifest(manifest: AdventureManifest): string
{
    const { needs, levels, content, ...rest } = manifest;
    const written = {
        title: rest.title,
        about: rest.about,
        language: rest.language,
        version: rest.version,
        ...(rest.author === undefined ? {} : { author: rest.author }),
        ...(rest.license === undefined ? {} : { license: rest.license }),
        ...(rest.attribution === undefined ? {} : { attribution: rest.attribution }),
        needs: { ...(needs.system === undefined ? {} : { system: needs.system }), ...(Object.keys(needs.extensions).length === 0 ? {} : { extensions: needs.extensions }) },
        ...(levels === undefined ? {} : { levels: levels.from === levels.to ? String(levels.from) : `${levels.from}-${levels.to}` }),
        ...(content.length === 0 ? {} : { content }),
        ...(rest.length === undefined ? {} : { length: rest.length }),
        ...(rest.party === undefined ? {} : { party: rest.party }),
        ...(rest.start === undefined ? {} : { start: `[[${rest.start}]]` }),
        ...(rest.opening === undefined ? {} : { opening: `[[${rest.opening}]]` }),
    };
    return stringify(written, { lineWidth: 0 });
}

function levelRange(levels: string): { from: number; to: number; }
{
    const [from, to] = levels.split("-").map((part) => Number(part.trim()));
    return { from: Math.min(from, to ?? from), to: Math.max(from, to ?? from) };
}

/** A page's name, written as a link or alone. */
function linkName(text: string): string
{
    return /^\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/.exec(text)?.[1].trim() ?? text;
}
