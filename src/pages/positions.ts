// Where a place is on the world map (D-259, POS-1): a point in km east and north of the map's centre, as the engine writes it, such as 8.5 km E, 3 km S.
import { readLength } from "../core/length.ts";

/** A point in metres east and north of the map's centre; west and south are negative. */
export interface Position
{
    east: number;
    north: number;
}

/** How the engine writes a position, for messages. */
export const positionHelp = "km east or west, then km north or south of the map's centre, such as 8.5 km E, 3 km S";

const partPattern = /^(.+?)\s+([EWNS])$/i;

/** A position as the engine writes it (POS-1), such as 8.5 km E, 3 km S; undefined for anything else, a relation among them. */
export function readPosition(value: unknown): Position | undefined
{
    const parts = typeof value === "string" ? value.split(",").map((part) => partPattern.exec(part.trim())) : [];

    if (parts.length !== 2 || parts[0] === null || parts[1] === null) {
        return undefined;
    }

    const [[, eastText, eastWay], [, northText, northWay]] = [parts[0], parts[1]];
    const [east, north] = [readLength(eastText) ?? (/^0(\s*k?m)?$/i.test(eastText.trim()) ? 0 : undefined), readLength(northText) ?? (/^0(\s*k?m)?$/i.test(northText.trim()) ? 0 : undefined)];

    if (east === undefined || north === undefined || !/^[EW]$/i.test(eastWay) || !/^[NS]$/i.test(northWay)) {
        return undefined;
    }

    return { east: /^W$/i.test(eastWay) ? -east : east, north: /^S$/i.test(northWay) ? -north : north };
}

/** A position as the engine writes it, to the ten metres: 8.5 km E, 3 km S; 0 km E, 0 km N at the centre. */
export function formatPosition(position: Position): string
{
    const km = (metres: number): string => `${Math.round(Math.abs(metres) / 10) / 100} km`;
    return `${km(position.east)} ${position.east < -5 ? "W" : "E"}, ${km(position.north)} ${position.north < -5 ? "S" : "N"}`;
}
