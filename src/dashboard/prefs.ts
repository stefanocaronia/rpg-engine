// The page's own preferences, kept in this browser alone (D-341): the dice's sound, their colours and rolling by hand, the tokens' symbols and conditions, and the theme's change. A change,
// from Settings or from where the switch is, reaches every part of the page that shows it at once.
import { useEffect, useState } from "preact/hooks";

/** A preference of the page, on or off, by where the browser keeps it. */
export interface Pref
{
    key: string;
    /** Its value when the browser keeps none. */
    on: boolean;
}

/** A preference of the page that is one of some names, by where the browser keeps it. */
export interface Choice
{
    key: string;
    /** Its value when the browser keeps none, or one the page no longer offers. */
    initial: string;
    values: readonly string[];
}

/** Whether the dice make a sound (D-284). */
export const soundPref: Pref = { key: "rpg-engine.dice-sound", on: true };

/** Whether the player rolls by hand, the checks with no button (D-330 (2)). */
export const byHandPref: Pref = { key: "rpg-engine.rolls-by-hand", on: false };

/** Whether the tokens show the pip of their side, or their class (D-414). */
export const tokenSymbolsPref: Pref = { key: "rpg-engine.token-symbols", on: true };

/** When the tokens show the pip of their state, the conditions on them and who is down (D-419): always, only under the mouse, or never. */
export const conditionsPref: Choice = { key: "rpg-engine.token-conditions", initial: "always", values: ["always", "hover", "never"] };

// The event that tells the page a preference changed.
const changed = "rpg-engine:pref";

/** A preference's value, and what changes it, on every part of the page that uses it. */
export function usePref(pref: Pref): [boolean, (on: boolean) => void]
{
    const [value, setValue] = useState(() => readPref(pref));

    useEffect(() => {
        const follow = (): void => setValue(readPref(pref));
        window.addEventListener(changed, follow);
        return () => window.removeEventListener(changed, follow);
    }, [pref.key]);

    return [value, (on) => writePref(pref, on)];
}

/** A choice's value, and what changes it, on every part of the page that uses it. */
export function useChoice(choice: Choice): [string, (value: string) => void]
{
    const [value, setValue] = useState(() => readChoice(choice));

    useEffect(() => {
        const follow = (): void => setValue(readChoice(choice));
        window.addEventListener(changed, follow);
        return () => window.removeEventListener(changed, follow);
    }, [choice.key]);

    return [value, (picked) => writeKept(choice.key, picked)];
}

/** A choice's value now, for what reads it once, as the dice when they are thrown. */
export function readChoice(choice: Choice): string
{
    const value = readKept(choice.key);
    return value !== undefined && choice.values.includes(value) ? value : choice.initial;
}

/** Keeps a choice's value, for what changes it outside a component, as the game's style for one system. */
export function writeChoice(choice: Choice, value: string): void
{
    writeKept(choice.key, value);
}

/**
 * A text the page keeps by its key, as the quest the player follows, and what changes it, on every part of the page that uses it: undefined while the player
 * never chose, empty once they chose none.
 */
export function useKeptText(key: string): [string | undefined, (value: string) => void]
{
    const read = (): string | undefined => readKept(key);

    const [value, setValue] = useState(read);

    useEffect(() => {
        setValue(read());
        const follow = (): void => setValue(read());
        window.addEventListener(changed, follow);
        return () => window.removeEventListener(changed, follow);
    }, [key]);

    return [value, (text) => writeKept(key, text)];
}

/** Tells every part of the page that a preference changed, as the theme does. */
export function announcePref(): void
{
    window.dispatchEvent(new Event(changed));
}

/** Draws again what shows a preference kept elsewhere, as the theme, when one changes. */
export function usePrefChange(): void
{
    const [, setChanges] = useState(0);

    useEffect(() => {
        const follow = (): void => setChanges((changes) => changes + 1);
        window.addEventListener(changed, follow);
        return () => window.removeEventListener(changed, follow);
    }, []);
}

// What the page keeps of each preference while it is open, for a browser that keeps nothing.
const kept = new Map<string, string>();

function readPref(pref: Pref): boolean
{
    const value = readKept(pref.key);
    return value === undefined ? pref.on : value === "on";
}

function writePref(pref: Pref, on: boolean): void
{
    writeKept(pref.key, on ? "on" : "off");
}

function readKept(key: string): string | undefined
{
    const known = kept.get(key);

    if (known !== undefined) {
        return known;
    }

    try {
        return localStorage.getItem(key) ?? undefined;
    } catch {
        return undefined;
    }
}

function writeKept(key: string, value: string): void
{
    kept.set(key, value);

    try {
        localStorage.setItem(key, value);
    } catch {
        // The page keeps it until it is closed.
    }

    announcePref();
}
