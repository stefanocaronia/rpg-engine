// The shapes of input several commands take, as a command line and an MCP client send them.
import { z } from "zod";

/** A list, or one text, as an MCP client may send it. */
export const textList = z.union([z.string(), z.array(z.string())]);

/** A whole number, as text from a command line or as a number through MCP. */
export const wholeNumber = z.preprocess((value) => (typeof value === "string" && /^[+-]?\d+$/.test(value.trim()) ? Number(value) : value), z.number().int());

/** Fields and their values, as field=value strings from a command line or as an object through MCP. */
export const fieldValues = z.union([z.array(z.string()), z.record(z.string(), z.unknown())]);

/** The texts of a textList: one text as a list of one, blank ones left out. */
export function textsOf(value: string | string[] | undefined): string[]
{
    return (value === undefined ? [] : typeof value === "string" ? [value] : value).filter((text) => text.trim() !== "");
}
