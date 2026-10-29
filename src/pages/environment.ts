// What holds inside a place, for everything it contains (D-119, D-153, ENV-1–ENV-4).
import { comparableText } from "../core/text.ts";
import { isEmptyField, isFieldName } from "./standard-fields.ts";
import { locate, type Page, type World } from "./world.ts";

/** One entry of a place's environment, as light: dark. */
export interface EnvironmentEntry
{
    name: string;
    value: string;
}

/** What holds at a page, entry by entry, from the nearest place of its chain that has it, the page itself first when it is a place (ENV-2). */
export function environmentAt(world: World, page: Page): { entry: EnvironmentEntry; place: Page; }[]
{
    const found: { entry: EnvironmentEntry; place: Page; }[] = [];

    for (const place of placesAround(world, page)) {
        for (const entry of readableEntries(place.fields.environment)) {
            if (!found.some((other) => sameName(other.entry.name, entry.name))) {
                found.push({ entry, place });
            }
        }
    }

    return found;
}

/** The places whose environment holds at a page, nearest first: the page itself when it is a place, then the places of its chain (ENV-2). */
export function placesAround(world: World, page: Page): Page[]
{
    return [page, ...locate(world, page).chain].filter((holder) => holder.type === "place");
}

/** The entries a place's environment holds (ENV-1); or why it cannot be read. A line written without quotes, which YAML reads as a map of one key, is the line it was. */
export function readEnvironment(value: unknown): { entries: EnvironmentEntry[]; } | { problem: string; }
{
    if (isEmptyField(value)) {
        return { entries: [] };
    }

    if (!Array.isArray(value)) {
        return { problem: 'environment must be a list of lines, one for each entry, such as ["light: dark"].' };
    }

    const entries: EnvironmentEntry[] = [];

    for (const item of value) {
        const read = readItem(item);

        if ("problem" in read) {
            return read;
        }

        if (entries.some((entry) => sameName(entry.name, read.entry.name))) {
            return { problem: `The environment entry ${read.entry.name} is written twice: keep one.` };
        }

        entries.push(read.entry);
    }

    return { entries };
}

/** An entry as its line is written: light: dark. */
export function formatEnvironmentEntry(entry: EnvironmentEntry): string
{
    return `${entry.name}: ${entry.value}`;
}

/**
 * The lines of a place's environment after a write (ENV-4): `remove` takes entries out by name, `add` puts one in, or in place of the one with its name.
 * `place` names the place in messages.
 */
export function changedEnvironment(current: unknown, add: unknown[], remove: unknown[], place: string): string[]
{
    const read = readEnvironment(current);

    if ("problem" in read) {
        throw new Error(`${read.problem} Set it whole on ${place}, such as set environment=["light: dark"], or unset it.`);
    }

    let entries = read.entries;

    for (const item of remove) {
        const name = String(item).split(":")[0].trim();

        if (!entries.some((entry) => sameName(entry.name, name))) {
            const listed = entries.length === 0 ? "It has none." : `Its entries: ${entries.map((entry) => entry.name).join(", ")}.`;
            throw new Error(`${place} has no environment entry ${name}. ${listed}`);
        }

        entries = entries.filter((entry) => !sameName(entry.name, name));
    }

    for (const item of add) {
        const added = readItem(item);

        if ("problem" in added) {
            throw new Error(added.problem);
        }

        const index = entries.findIndex((entry) => sameName(entry.name, added.entry.name));
        entries = index === -1 ? [...entries, added.entry] : entries.map((entry, position) => (position === index ? added.entry : entry));
    }

    return entries.map(formatEnvironmentEntry);
}

/**
 * The entries a place's environment holds, read line by line, so that nothing else falls with a line that does not read (ENV-1): such a line is left out,
 * one without a value counts as missing (INH-6), and of a name written twice the last line with a value holds (INH-5). validate reports them.
 */
function readableEntries(value: unknown): EnvironmentEntry[]
{
    const items = Array.isArray(value) ? value : isEmptyField(value) ? [] : [value];
    let entries: EnvironmentEntry[] = [];

    for (const item of items) {
        const read = readItem(item);

        if ("entry" in read) {
            entries = [...entries.filter((entry) => !sameName(entry.name, read.entry.name)), read.entry];
        }
    }

    return entries;
}

/** The entry an item of the field writes: a line, or the map of one key that YAML makes of a line without quotes. */
function readItem(item: unknown): { entry: EnvironmentEntry; } | { problem: string; }
{
    const line = asLine(item);

    if (line === undefined) {
        return { problem: `${JSON.stringify(item)} is not a line of environment: write it as name: value, in quotes, such as "light: dark".` };
    }

    const separator = line.indexOf(":");
    const name = separator === -1 ? "" : line.slice(0, separator).trim();
    const value = separator === -1 ? "" : line.slice(separator + 1).trim();

    if (!isFieldName(name) || value === "") {
        return { problem: `"${line}" is not an entry of environment: write a name as a field's, a colon and a value, such as light: dark.` };
    }

    return { entry: { name, value } };
}

/** A line as text; from a map of one key, as YAML reads light: dark or encounters: [[Swamp#Encounters]] written without quotes. */
function asLine(item: unknown): string | undefined
{
    if (typeof item === "string") {
        return item;
    }

    const entries = item !== null && typeof item === "object" && !Array.isArray(item) ? Object.entries(item) : [];

    if (entries.length !== 1) {
        return undefined;
    }

    const [name, value] = entries[0];
    const link = Array.isArray(value) && value.length === 1 && Array.isArray(value[0]) && value[0].length === 1 && typeof value[0][0] === "string" ? `[[${value[0][0]}]]` : undefined;
    return link !== undefined ? `${name}: ${link}` : value !== null && typeof value !== "object" ? `${name}: ${String(value)}` : undefined;
}

function sameName(first: string, second: string): boolean
{
    return comparableText(first) === comparableText(second);
}
