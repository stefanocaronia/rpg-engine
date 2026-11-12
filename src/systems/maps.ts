// The plain maps of system.yaml data: whether a value is one, and which name it holds a key under
import { sameName } from "../core/text.ts";

export function isMap(value: unknown): value is Record<string, unknown>
{
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** The name under which a map holds this one, as names are compared. */
export function nameIn(map: Record<string, unknown>, name: string): string | undefined
{
    return sameName(Object.keys(map), name);
}
