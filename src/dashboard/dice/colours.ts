// The colours of the dice the player rolls (D-279, D-348): the theme's, or one of the sets chosen in Settings, each a body and the ink of its numbers, as
// a set of real dice. Kept in this browser alone.
import { type Choice, readChoice } from "../prefs.ts";
import { shownTheme } from "../theme.ts";

/** A die's body and the ink of its numbers. */
export interface DiceColours
{
    body: string;
    ink: string;
}

/** A set of dice to choose: its name in Settings, and its colours; the theme's has none of its own. */
export interface DiceSet
{
    value: string;
    label: string;
    colours?: DiceColours;
}

/** The sets, the theme's first: dark numbers on light bodies and light numbers on dark ones, to be read at a glance. */
export const diceSets: DiceSet[] = [
    { value: "theme", label: "Theme" },
    { value: "ivory", label: "Ivory", colours: { body: "#ece3cf", ink: "#1f1d1b" } },
    { value: "obsidian", label: "Obsidian", colours: { body: "#222227", ink: "#e0b84c" } },
    { value: "ruby", label: "Ruby", colours: { body: "#8f1d2e", ink: "#f2c75a" } },
    { value: "emerald", label: "Emerald", colours: { body: "#1c6b4b", ink: "#f4f0e6" } },
    { value: "sapphire", label: "Sapphire", colours: { body: "#1f4c9c", ink: "#f4f0e6" } },
    { value: "amethyst", label: "Amethyst", colours: { body: "#5d3590", ink: "#dcdce6" } },
];

/** Which set the player rolls. */
export const diceSetPref: Choice = { key: "rpg-engine.dice-set", initial: "theme", values: diceSets.map((set) => set.value) };

/** The colours of a set, by default the one chosen; the theme's by the theme shown: yellow with navy numbers on the dark page, navy with yellow on the light. */
export function diceColours(value = readChoice(diceSetPref)): DiceColours
{
    const chosen = diceSets.find((set) => set.value === value)?.colours;

    if (chosen !== undefined) {
        return chosen;
    }

    return shownTheme() === "dark" ? { body: "#f5c63e", ink: "#182c4c" } : { body: "#182c4c", ink: "#f5c63e" };
}
