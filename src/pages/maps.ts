// Maps (D-320, POS-8): a place that holds a map of its own, with coordinates of its own, or aligned with another place's map, under it or as its mirror.

/** How a place holds its map: with coordinates of its own, or with those of another place's map, under it or as its mirror. */
export type MapField = { how: "own"; } | { how: "under" | "mirror"; of: string; };

/** How the map field is written, for messages. */
export const mapHelp = "own, for coordinates of its own, or under [[Place]] or mirror of [[Place]], for those of that place's map";

/** A place's map field as written (POS-8): own, under [[Place]] or mirror of [[Place]]; undefined for anything else. */
export function readMapField(value: unknown): MapField | undefined
{
    if (typeof value !== "string") {
        return undefined;
    }

    if (/^\s*own\s*$/i.test(value)) {
        return { how: "own" };
    }

    const match = /^\s*(under|mirror of)\s+\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]\s*$/i.exec(value);
    return match === null ? undefined : { how: match[1].toLowerCase() === "under" ? "under" : "mirror", of: match[2].trim() };
}
