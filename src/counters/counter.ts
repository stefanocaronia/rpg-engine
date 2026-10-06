/** A number kept on a page: the current value and, for current/max fields such as 5/12, the maximum. The limits are the minimum, 0 unless given, and the maximum. */
export interface Counter
{
    value: number;
    /** Undefined for a plain number, which goes from its minimum up. */
    max?: number;
    /** The lowest value a change by an amount reaches, when it is not 0, as a game system works it out (FOR-6); never written in the field. */
    min?: number;
}

/** A change to a counter: by an amount (damage, healing), spending what is there, or to a value. */
export type CounterChange = { by: number; } | { spend: number; } | { to: Counter; };

// "5/12", or "-3/10" after a value was set outside the limits.
const currentAndMax = /^(-?\d+)\s*\/\s*(\d+)$/;
const wholeNumber = /^[+-]?\d+$/;

/** The counter a field holds: a whole number, or "current/max" text. Undefined for anything else. */
export function readCounter(field: unknown): Counter | undefined
{
    if (typeof field === "number") {
        return safeCounter({ value: field });
    }

    return typeof field === "string" ? readCurrentAndMax(field) : undefined;
}

/** A counter given as text: current/max such as 15/15, or a whole number such as -3. */
export function readCounterText(text: string): Counter | undefined
{
    const trimmed = text.trim();
    return wholeNumber.test(trimmed) ? safeCounter({ value: Number(trimmed) }) : readCurrentAndMax(trimmed);
}

/** The counter as its field is written: 5/12, or 20; the minimum is never written. */
export function formatCounter(counter: Counter): number | string
{
    return counter.max === undefined ? counter.value : `${counter.value}/${counter.max}`;
}

/** Whether there is enough to spend: what is spent cannot be what is not there. */
export function canSpend(counter: Counter, amount: number): boolean
{
    return amount > 0 && counter.value >= amount;
}

/**
 * Applies a change. `by` stops at a limit and says how far it went beyond; it never pushes a value further outside its limits.
 * `spend` takes what is there: check `canSpend` first. `to` sets the value, outside the limits too.
 */
export function changeCounter(counter: Counter, change: CounterChange): { counter: Counter; beyond: number; }
{
    if ("to" in change) {
        return { counter: change.to, beyond: 0 };
    }

    const target = counter.value + ("by" in change ? change.by : -change.spend);
    const lowest = Math.min(counter.min ?? 0, counter.value);
    const highest = counter.max === undefined ? Number.POSITIVE_INFINITY : Math.max(counter.max, counter.value);
    const value = Math.min(Math.max(target, lowest), highest) || 0;
    return { counter: { ...counter, value }, beyond: target - value };
}

/** Where a counter stands against its limits: at 0, at another minimum, at its maximum, outside them, or within. */
export function counterLimit(counter: Counter): "at 0" | "at min" | "at max" | "outside" | undefined
{
    const lowest = counter.min ?? 0;

    if (counter.value < lowest || (counter.max !== undefined && counter.value > counter.max)) {
        return "outside";
    }

    if (counter.value === lowest) {
        return lowest === 0 ? "at 0" : "at min";
    }

    return counter.value === counter.max ? "at max" : undefined;
}

/** Whether a counter's numbers are whole and small enough to count with exactly. */
export function isSafeCounter(counter: Counter): boolean
{
    return Number.isSafeInteger(counter.value) && (counter.max === undefined || Number.isSafeInteger(counter.max));
}

function readCurrentAndMax(text: string): Counter | undefined
{
    const match = currentAndMax.exec(text.trim());
    return match === null ? undefined : safeCounter({ value: Number(match[1]), max: Number(match[2]) });
}

function safeCounter(counter: Counter): Counter | undefined
{
    return isSafeCounter(counter) ? { ...counter, value: counter.value || 0 } : undefined;
}
