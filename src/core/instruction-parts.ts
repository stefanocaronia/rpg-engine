import { basename, join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { files } from "./store.ts";

/** A part of the master's instructions as a layer gives it: its text, and whether it takes the place of the layers below instead of adding to them (D-121). */
export interface InstructionPart
{
    text: string;
    replace: boolean;
}

/**
 * The parts of the master's instructions a package gives, a game system or an extension, from the files of its instructions folder: a part is named after its
 * file (D-121). `owner` names the package in the error of a part that does not read, such as "The game system 5e".
 */
export function readParts(folder: string, owner: string): Record<string, InstructionPart>
{
    const parts: Record<string, InstructionPart> = {};

    for (const path of files().files(join(folder, "instructions"), (file) => file.endsWith(".md"))) {
        parts[basename(path, ".md")] = partOf(files().text(path) ?? "", owner, path);
    }

    return parts;
}

/** A part from its file: the text after its frontmatter, which says only whether it takes the place of the core's part, replace: true (D-121). */
function partOf(file: string, owner: string, path: string): InstructionPart
{
    const text = file.replace(/^﻿/, "").replace(/\r\n/g, "\n");
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    let settings: unknown;

    try {
        settings = frontmatter === null ? {} : (parse(frontmatter[1]) ?? {});
    } catch {
        settings = undefined;
    }

    const parsed = z.object({ replace: z.boolean().optional() }).strict().safeParse(settings);

    if (!parsed.success) {
        throw new Error(`${owner} cannot be read, because ${path} is not valid: a part's frontmatter says only replace: true, for a part that takes the place of the core's.`);
    }

    return { text: (frontmatter === null ? text : text.slice(frontmatter[0].length)).trim(), replace: parsed.data.replace === true };
}
