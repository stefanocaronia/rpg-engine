// The shapes of input several commands take, as a command line and an MCP client send them.
import { z } from "zod";

/** A list, or one text, as an MCP client may send it. */
export const textList = z.union([z.string(), z.array(z.string())]);

/** A whole number, as text from a command line or as a number through MCP. */
export const wholeNumber = z.preprocess((value) => (typeof value === "string" && /^[+-]?\d+$/.test(value.trim()) ? Number(value) : value), z.number().int());

/** Fields and their values, as field=value strings from a command line or as an object through MCP; one field=value, or an object sent as JSON text, is read too. */
export const fieldValues = z.union([z.array(z.string()), z.record(z.string(), z.unknown()), z.string().transform((text) => objectInText(text) ?? [text])]);

/** The texts of a textList: one text as a list of one, blank ones left out. */
export function textsOf(value: string | string[] | undefined): string[]
{
    return (value === undefined ? [] : typeof value === "string" ? [value] : value).filter((text) => text.trim() !== "");
}

/** The object an MCP client sent as JSON text, such as {"bonus-ac": 5}; undefined when the text is not one. */
function objectInText(text: string): Record<string, unknown> | undefined
{
    if (!text.trim().startsWith("{")) {
        return undefined;
    }

    try {
        const value: unknown = JSON.parse(text);
        return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
    } catch {
        return undefined;
    }
}
