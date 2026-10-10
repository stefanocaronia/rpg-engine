// Lengths and speeds (D-262, ROA-1, TRV-1): always written in metric and read in metres; told in the units of the story, imperial with the game's factors.

/** The units of measure of the story (D-33). */
export const unitSystems = ["metric", "imperial"] as const;

export type UnitSystem = (typeof unitSystems)[number];

/** How many metres a game's mile and foot are worth (D-262), as 1.5 km and 0.3 m in the fifth edition; the true ones when the game says nothing. */
export interface ImperialUnits
{
    mile: number;
    foot: number;
}

export const trueImperialUnits: ImperialUnits = { mile: 1609.344, foot: 0.3048 };

/** How to write a length, for messages. */
export const lengthHelp = "in km or m, such as 8 km, 1.5 km or 500 m: the engine keeps every measure in metric, and its outputs give them in the player's units";

/** How to write a speed, for messages. */
export const speedHelp = "the distance of an hour in metric, such as 4.5 km or 4.5 km/h";

const metresIn: Record<string, number> = { km: 1000, m: 1 };
const lengthPattern = /^(\d+(?:\.\d+)?)\s*([a-z]+)$/i;

/** A length in metres from a number and its metric unit, such as 8 km, 1.5 km or 500 m; undefined for anything else, miles, a number without a unit and 0 among them. */
export function readLength(value: unknown): number | undefined
{
    const match = typeof value === "string" ? lengthPattern.exec(value.trim()) : null;
    const unit = match === null ? undefined : metresIn[match[2].toLowerCase()];
    const metres = match === null || unit === undefined ? 0 : Number(match[1]) * unit;
    return metres > 0 ? metres : undefined;
}

/** A speed in metres an hour (TRV-1): the distance of an hour, with or without /h, such as 4.5 km or 4.5 km/h; undefined for anything else. */
export function readSpeed(value: unknown): number | undefined
{
    return readLength(typeof value === "string" ? value.trim().replace(/\s*\/\s*h$/i, "") : undefined);
}

/** A length in the units of the story, with one decimal at most: 12 km, 800 m; in imperial with the game's units, 8 miles, 300 feet. */
export function formatLength(metres: number, units: UnitSystem, imperial: ImperialUnits = trueImperialUnits): string
{
    if (units === "imperial") {
        const miles = oneDecimal(metres / imperial.mile);
        return miles >= 1 ? `${miles} ${miles === 1 ? "mile" : "miles"}` : `${Math.round(metres / imperial.foot)} feet`;
    }

    return metres >= 999.5 ? `${oneDecimal(metres / 1000)} km` : `${Math.round(metres)} m`;
}

/** A speed in the units of the story: 4.5 km an hour, 3 miles an hour. */
export function formatSpeed(metresAnHour: number, units: UnitSystem, imperial: ImperialUnits = trueImperialUnits): string
{
    return `${formatLength(metresAnHour, units, imperial)} an hour`;
}

/** A short length, as on the map of a place (GRD-5), in the units of the story: 7.5 m; in imperial with the game's foot, 25 feet. */
export function formatStep(metres: number, units: UnitSystem, imperial: ImperialUnits = trueImperialUnits): string
{
    return units === "imperial" ? `${Math.round(metres / imperial.foot)} feet` : `${oneDecimal(metres)} m`;
}

/** A text with the lengths it writes in feet told in the units of the story, as a speed of the sheet (D-328): 30 ft., fly 60 ft. is 9 m, fly 18 m in metric. */
export function lengthsInUnits(text: string, units: UnitSystem, imperial: ImperialUnits = trueImperialUnits): string
{
    return units === "imperial" ? text : text.replace(/(\d+(?:\.\d+)?)\s*(?:ft\.?|feet|foot)(?![a-z])/gi, (_, number: string) => formatStep(Number(number) * imperial.foot, units, imperial));
}

/** The first length a text gives, in metres, as a sheet writes a speed: 30 ft., 30 feet, 9 m; undefined when it gives none, or a number without its unit. */
export function readFirstLength(value: unknown, imperial: ImperialUnits = trueImperialUnits): number | undefined
{
    const match = typeof value === "string" ? /(\d+(?:\.\d+)?)\s*(ft|feet|foot|m)(?![a-z])/i.exec(value) : null;
    return match === null ? undefined : Number(match[1]) * (match[2].toLowerCase() === "m" ? 1 : imperial.foot);
}

function oneDecimal(value: number): number
{
    return Math.round(value * 10) / 10;
}
