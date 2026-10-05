import { Document, isMap, isScalar, isSeq, parseDocument, stringify } from "yaml";
import { comparableText } from "../core/text.ts";
import { links, trimBlankLines } from "./markdown.ts";
import { isEmptyField } from "./standard-fields.ts";

const singleLink = /^\[\[[^\]]+\]\]$/;
const linkList = /^\[\[[^\]]+\]\](?:\s*,\s*\[\[[^\]]+\]\])+$/;
const anyLink = /\[\[[^\]]+\]\]/g;
// Lists in brackets stay as [a, b], the way people write them, and long values stay on one line.
const yamlStyle = { flowCollectionPadding: false, lineWidth: 0 };
// A value that appears twice, such as the same list read from two fields, is written twice: never as an anchor and an alias, which is no list.
const nodeOptions = { aliasDuplicateObjects: false };

/** A page file: its YAML frontmatter, if any, and its markdown text. */
export interface PageFile
{
    frontmatter?: string;
    body: string;
}

/** Fields to set or remove, and items to add to lists or remove from them. */
export interface FieldChange
{
    set?: Record<string, unknown>;
    unset?: string[];
    add?: Record<string, unknown[]>;
    remove?: Record<string, unknown[]>;
}

export function splitPageFile(text: string): PageFile
{
    const lines = text.replace(/^﻿/, "").replaceAll("\r\n", "\n").split("\n");
    const end = isSeparator(lines[0]) ? lines.findIndex((line, index) => index > 0 && isSeparator(line)) : -1;

    if (end === -1) {
        return { body: trimBlankLines(lines.join("\n")) };
    }

    return { frontmatter: lines.slice(1, end).join("\n"), body: trimBlankLines(lines.slice(end + 1).join("\n")) };
}

export function joinPageFile(file: PageFile): string
{
    return [frontmatterBlock(file), file.body].filter((block) => block !== "").join("\n\n") + "\n";
}

/** The fields of a frontmatter; `path` names the file in error messages. */
export function readFields(frontmatter: string | undefined, path: string): Record<string, unknown>
{
    if (frontmatter === undefined) {
        return {};
    }

    const document = parseFrontmatter(frontmatter, path);
    let fields: unknown;

    try {
        fields = document.toJS() ?? {};
    } catch (error) {
        // Such as an alias to an anchor that is not there.
        throw new Error(`The frontmatter of ${path} is not valid YAML; fix it by hand: ${String(error instanceof Error ? error.message : error).split("\n")[0]}`);
    }

    if (typeof fields !== "object" || Array.isArray(fields)) {
        throw new Error(`The frontmatter of ${path} must hold fields, such as "name: value". Fix it by hand.`);
    }

    return fields as Record<string, unknown>;
}

/** Applies a change to the fields and keeps the rest of the frontmatter, comments included, as it is. With no fields left, the frontmatter goes. */
export function changeFields(frontmatter: string | undefined, change: FieldChange, path: string): string
{
    const document = frontmatter === undefined ? new Document({}) : parseFrontmatter(frontmatter, path);
    applyChange(document, change);
    return isMap(document.contents) && document.contents.items.length === 0 ? "" : document.toString(yamlStyle);
}

/** Fields with a change applied, for fields kept outside a page file, such as a copy's in the scene. */
export function changedFields(fields: Record<string, unknown>, change: FieldChange): Record<string, unknown>
{
    const document = new Document(fields, nodeOptions);
    applyChange(document, change);
    return (document.toJS() ?? {}) as Record<string, unknown>;
}

function applyChange(document: Document, change: FieldChange): void
{
    for (const [name, value] of Object.entries(change.set ?? {})) {
        // As a node, so that items can be added to or removed from it in the same change.
        document.set(name, document.createNode(value, nodeOptions));
    }

    for (const name of change.unset ?? []) {
        document.delete(name);
    }

    for (const [name, values] of Object.entries(change.add ?? {})) {
        addToList(document, name, values);
    }

    for (const [name, values] of Object.entries(change.remove ?? {})) {
        removeFromList(document, name, values);
    }
}

/** Fields written as YAML, to show them. */
export function formatFields(fields: Record<string, unknown>): string
{
    return stringify(fields, yamlStyle).trimEnd();
}

/** Reads a field value written as text: a link [[Page]], links separated by commas, a number, true or false, a YAML list, map or quoted text, or else plain text. */
export function readFieldValue(text: string): unknown
{
    const value = text.trim();

    if (singleLink.test(value)) {
        return value;
    }

    if (linkList.test(value)) {
        return [...value.matchAll(anyLink)].map((match) => match[0]);
    }

    if (/^-?\d+(\.\d+)?$/.test(value)) {
        return Number(value);
    }

    if (value === "true" || value === "false") {
        return value === "true";
    }

    // What does not read as YAML stays plain text, as in "[[La cripta]], piano inferiore".
    const document = /^["'[{]/.test(value) ? parseDocument(value) : undefined;
    const parsed: unknown = document === undefined || document.errors.length > 0 ? value : document.toJS();

    if (holdsNestedList(parsed)) {
        throw new Error(`${value} would be a list inside a list, which a field cannot hold. For a list of links write [[A]], [[B]]; to add one item to a list, use add.`);
    }

    return parsed;
}

function addToList(document: Document, name: string, values: unknown[]): void
{
    const list = document.get(name);

    if (isEmptyField(list)) {
        document.set(name, [...new Set(values)]);
        return;
    }

    if (!isSeq(list)) {
        throw new Error(`"${name}" is not a list, so nothing can be added to it.`);
    }

    for (const value of values.filter((candidate) => !list.items.some((item) => sameValue(item, candidate)))) {
        list.add(document.createNode(value, nodeOptions));
    }
}

/** Removes every item that is the value, a link however it is written (CON-7). */
function removeFromList(document: Document, name: string, values: unknown[]): void
{
    const list = document.get(name);

    if (!isSeq(list)) {
        throw new Error(isEmptyField(list) ? `There is no "${name}" to remove from.` : `"${name}" is not a list, so nothing can be removed from it.`);
    }

    for (const value of values) {
        const kept = list.items.filter((item) => !sameValue(item, value));

        if (kept.length === list.items.length) {
            throw new Error(`"${name}" does not hold ${String(value)}.`);
        }

        list.items = kept;
    }
}

/** Whether a list's item is the value: the same, or the same link however written, as [[bruna]] and [[Bruna]], or [[items/Lanterna.md|la lanterna]] and [[Lanterna]]. */
function sameValue(item: unknown, value: unknown): boolean
{
    const written = isScalar(item) ? item.value : item;
    return written === value || sameLink(written, value);
}

function sameLink(first: unknown, second: unknown): boolean
{
    if (typeof first !== "string" || typeof second !== "string" || !singleLink.test(first.trim()) || !singleLink.test(second.trim())) {
        return false;
    }

    const [one] = links(first);
    const [other] = links(second);
    return one !== undefined && other !== undefined && comparableText(one.page) === comparableText(other.page) && comparableText(one.section ?? "") === comparableText(other.section ?? "");
}

/** Whether a value holds a list inside a list, which a field cannot hold. */
export function holdsNestedList(value: unknown): boolean
{
    if (Array.isArray(value)) {
        return value.some((item) => Array.isArray(item) || holdsNestedList(item));
    }

    if (value !== null && typeof value === "object") {
        return Object.values(value).some(holdsNestedList);
    }

    return false;
}

function parseFrontmatter(frontmatter: string, path: string): Document
{
    const document = parseDocument(frontmatter);

    if (document.errors.length > 0) {
        // Only the first line of the parser's message: the rest quotes the file, which may hold secrets.
        throw new Error(`The frontmatter of ${path} is not valid YAML; fix it by hand: ${document.errors[0].message.split("\n")[0]}`);
    }

    return document;
}

/** The frontmatter between --- lines. A text that starts with --- gets an empty one, or it would be read back as a frontmatter. */
function frontmatterBlock(file: PageFile): string
{
    const fields = file.frontmatter?.trimEnd() ?? "";

    if (fields.trim() !== "") {
        return `---\n${fields}\n---`;
    }

    return isSeparator(file.body.split("\n")[0]) ? "---\n---" : "";
}

function isSeparator(line: string | undefined): boolean
{
    return line?.trimEnd() === "---";
}
