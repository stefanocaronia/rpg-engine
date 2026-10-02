import { Document, parseDocument, stringify } from "yaml";
import { trimBlankLines } from "./markdown.ts";

const singleLink = /^\[\[[^\]]+\]\]$/;
const linkList = /^\[\[[^\]]+\]\](?:\s*,\s*\[\[[^\]]+\]\])+$/;
// Lists in brackets stay as [a, b], the way people write them.
const yamlStyle = { flowCollectionPadding: false };

/** A page file: its YAML frontmatter, if any, and its markdown text. */
export interface PageFile
{
    frontmatter?: string;
    body: string;
}

export function splitPageFile(text: string): PageFile
{
    const lines = text.replaceAll("\r\n", "\n").split("\n");
    const end = lines[0] === "---" ? lines.findIndex((line, index) => index > 0 && line.trimEnd() === "---") : -1;

    if (end === -1) {
        return { body: trimBlankLines(lines.join("\n")) };
    }

    return { frontmatter: lines.slice(1, end).join("\n"), body: trimBlankLines(lines.slice(end + 1).join("\n")) };
}

export function joinPageFile(file: PageFile): string
{
    const frontmatter = file.frontmatter?.trim() ? `---\n${file.frontmatter.trimEnd()}\n---` : "";
    return [frontmatter, file.body].filter((block) => block !== "").join("\n\n") + "\n";
}

/** The fields of a frontmatter; `path` names the file in error messages. */
export function readFields(frontmatter: string | undefined, path: string): Record<string, unknown>
{
    if (frontmatter === undefined) {
        return {};
    }

    const fields: unknown = parseFrontmatter(frontmatter, path).toJS() ?? {};

    if (typeof fields !== "object" || Array.isArray(fields)) {
        throw new Error(`The frontmatter of ${path} must hold fields, such as "name: value". Fix it by hand.`);
    }

    return fields as Record<string, unknown>;
}

/** Sets and removes fields, and keeps the rest of the frontmatter, comments included, as it is. */
export function changeFields(frontmatter: string | undefined, set: Record<string, unknown>, unset: string[], path: string): string
{
    const document = frontmatter === undefined ? new Document({}) : parseFrontmatter(frontmatter, path);

    for (const [name, value] of Object.entries(set)) {
        document.set(name, value);
    }

    for (const name of unset) {
        document.delete(name);
    }

    const text = document.toString(yamlStyle);
    return text.trim() === "{}" ? "" : text;
}

/** Fields written as YAML, to show them. */
export function formatFields(fields: Record<string, unknown>): string
{
    return stringify(fields, yamlStyle).trimEnd();
}

/** Reads a field value written as text: a link [[Page]], links separated by commas, a number, true or false, a YAML list or map in [ ] or { }, or else plain text. */
export function readFieldValue(text: string): unknown
{
    const value = text.trim();

    if (singleLink.test(value)) {
        return value;
    }

    if (linkList.test(value)) {
        return value.split(",").map((link) => link.trim());
    }

    if (/^-?\d+(\.\d+)?$/.test(value)) {
        return Number(value);
    }

    if (value === "true" || value === "false") {
        return value === "true";
    }

    if (!/^["'[{]/.test(value)) {
        return value;
    }

    const document = parseDocument(value);

    if (document.errors.length > 0) {
        throw new Error(`Cannot read the value ${value}: ${document.errors[0].message}`);
    }

    return document.toJS();
}

function parseFrontmatter(frontmatter: string, path: string): Document
{
    const document = parseDocument(frontmatter);

    if (document.errors.length > 0) {
        throw new Error(`The frontmatter of ${path} is not valid YAML: ${document.errors[0].message}. Fix it by hand.`);
    }

    return document;
}
