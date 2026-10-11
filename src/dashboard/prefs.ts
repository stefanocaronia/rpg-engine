// The page's own preferences, kept in this browser alone (D-341): the dice's sound and rolling by hand, and the theme's change. A change, from Settings or
// from where the switch is, reaches every part of the page that shows it at once.
import { useEffect, useState } from "preact/hooks";

/** A preference of the page, on or off, by where the browser keeps it. */
export interface Pref
{
    key: string;
    /** Its value when the browser keeps none. */
    on: boolean;
}

/** Whether the dice make a sound (D-284). */
export const soundPref: Pref = { key: "rpg-engine.dice-sound", on: true };

/** Whether the player rolls by hand, the checks with no button (D-330 (2)). */
export const byHandPref: Pref = { key: "rpg-engine.rolls-by-hand", on: false };

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
const kept = new Map<string, boolean>();

function readPref(pref: Pref): boolean
{
    const known = kept.get(pref.key);

    if (known !== undefined) {
        return known;
    }

    try {
        const kept = localStorage.getItem(pref.key);
        return kept === null ? pref.on : kept === "on";
    } catch {
        return pref.on;
    }
}

function writePref(pref: Pref, on: boolean): void
{
    kept.set(pref.key, on);

    try {
        localStorage.setItem(pref.key, on ? "on" : "off");
    } catch {
        // The page keeps it until it is closed.
    }

    announcePref();
}
