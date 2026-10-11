// A roll the master asks now (D-330, ASK-12), for the sheet and the dice: the row of the sheet whose field a check names lights up and answers it, as do the
// tray's dice when they are a check's own; every other roll of the page is free.
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Asked } from "./data.ts";
import { checkOf, sameDice } from "./labels.ts";

/** What the master asks: whose sheet the checks read, by field the place of the check it answers, each check with its dice, and what answers one. */
export interface Requested
{
    who?: string;
    rows: Map<string, number>;
    checks: { index: number; check: string; dice: string; }[];
    answer(index: number): void;
}

export const RequestedRoll = createContext<Requested | undefined>(undefined);

/** The roll the master asks now, when it is one, and what answers its checks. */
export function requestedOf(asked: Asked | undefined, answer: (index: number) => void): Requested | undefined
{
    const checks = asked?.labels.flatMap((label, index) => {
        const check = checkOf(label, asked.title);
        return check === undefined ? [] : [{ index, ...check }];
    }) ?? [];

    if (asked === undefined || checks.length === 0) {
        return undefined;
    }

    // A field two checks name answers neither, as the tray's dice do not.
    const fields = asked.fields?.map((field) => field?.toLowerCase() ?? null) ?? [];
    const rows = new Map(fields.flatMap((field, index): [string, number][] => (field === null || fields.indexOf(field) !== fields.lastIndexOf(field) ? [] : [[field, index]])));
    return { ...(asked.who === undefined ? {} : { who: asked.who }), rows, checks, answer };
}

export function useRequested(): Requested | undefined
{
    return useContext(RequestedRoll);
}

/** The check a row of someone's sheet answers, by its place: only on the sheet of whom the master asks. */
export function requestedRow(requested: Requested | undefined, member: string, field: string): number | undefined
{
    return requested === undefined || requested.who !== member ? undefined : requested.rows.get(field.toLowerCase());
}

/** The check the tray's dice answer, by its place: the one whose dice and number they are, when one alone is. */
export function trayCheck(requested: Requested | undefined, notation: string): number | undefined
{
    const matching = requested?.checks.filter((check) => sameDice(check.dice, notation)) ?? [];
    return matching.length === 1 ? matching[0].index : undefined;
}
