// Roads (D-256, ROA-1): places with stops, the places they join in order, and the lengths between them.
import { lengthHelp, readLength } from "../core/length.ts";
import { comparableText } from "../core/text.ts";
import { links } from "./markdown.ts";

/** A road's stops, by the names their links give, and the length in metres of each stretch between two of them (ROA-1). */
export interface Stops
{
    stops: string[];
    lengths: number[];
}

/** How a road's stops are written, for messages. */
export const stopsHelp = "its stops in order, with the length of each stretch between them, such as [[Guadoscuro]], 8 km, [[Bivio]], 4 km, [[Rocca]]";

/** A road's stops and the lengths between them (ROA-1), or why the field cannot be read: links and lengths taking turns, a link first and last, at least two, never the same twice in a row. */
export function readStops(value: unknown): Stops | { problem: string; }
{
    if (!Array.isArray(value) || value.length === 0) {
        return { problem: `must be a list of ${stopsHelp}.` };
    }

    const stops: string[] = [];
    const lengths: number[] = [];

    for (const [index, item] of value.entries()) {
        const text = typeof item === "string" ? item.trim() : String(item);

        // [[Rocca]] written without quotes is, in YAML, a list inside a list.
        if (Array.isArray(item)) {
            return { problem: `has a link written without quotes, which YAML reads as a list: write each stop in quotes, such as "[[Rocca]]".` };
        }

        if (index % 2 === 0) {
            const link = /^\[\[[^\]]+\]\]$/.test(text) ? links(text) : [];

            if (link.length !== 1) {
                return { problem: `has ${JSON.stringify(item)} where a stop goes: give ${stopsHelp}.` };
            }

            stops.push(link[0].page);
        } else {
            const length = readLength(text);

            if (length === undefined) {
                return { problem: `has ${JSON.stringify(item)} where the length of a stretch goes: write ${lengthHelp}.` };
            }

            lengths.push(length);
        }
    }

    if (value.length % 2 === 0 || stops.length < 2) {
        return { problem: `must start and end with a stop and have at least two: give ${stopsHelp}.` };
    }

    const repeated = stops.findIndex((stop, index) => index > 0 && comparableText(stop) === comparableText(stops[index - 1]));
    return repeated === -1 ? { stops, lengths } : { problem: `has ${stops[repeated]} twice in a row: a stretch joins two different stops.` };
}
