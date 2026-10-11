// The look of the dice the player rolls (D-279, D-348, D-352): the theme's, or one of the sets chosen in Settings, as sets of real dice, each a material, a
// body and the ink of its numbers: resin, metal, wood or stone, the wood and the stone from CC0 pictures of ambientCG (assets/dice/textures). Kept in this
// browser alone.
import { type Choice, readChoice } from "../prefs.ts";
import { shownTheme } from "../theme.ts";

/** What a die is made of: how rough and how metallic it is, how much it mirrors the room, and the picture of its grain, if any. */
export interface Finish
{
    roughness: number;
    metalness: number;
    /** How much of the room around it the die reflects, from 0: the metals and the polished stones. */
    shine: number;
    texture?: string;
}

/** A die's look: its material, its body, which tints the picture of a grain, and the ink of its numbers. */
export interface DiceLook
{
    finish: Finish;
    body: string;
    ink: string;
}

/** A set of dice to choose: its name in Settings, and its look; the theme's has none of its own. */
export interface DiceSet
{
    value: string;
    label: string;
    look?: DiceLook;
}

const resin: Finish = { roughness: 0.35, metalness: 0.05, shine: 0 };
const metal: Finish = { roughness: 0.3, metalness: 1, shine: 1 };

/** The sets, the theme's first, then by material: dark numbers on light bodies and light numbers on dark ones, to be read at a glance. */
export const diceSets: DiceSet[] = [
    { value: "theme", label: "Theme" },
    { value: "ivory", label: "Ivory", look: { finish: resin, body: "#ece3cf", ink: "#1f1d1b" } },
    { value: "obsidian", label: "Obsidian", look: { finish: resin, body: "#222227", ink: "#e0b84c" } },
    { value: "ruby", label: "Ruby", look: { finish: resin, body: "#8f1d2e", ink: "#f2c75a" } },
    { value: "emerald", label: "Emerald", look: { finish: resin, body: "#1c6b4b", ink: "#f4f0e6" } },
    { value: "sapphire", label: "Sapphire", look: { finish: resin, body: "#1f4c9c", ink: "#f4f0e6" } },
    { value: "amethyst", label: "Amethyst", look: { finish: resin, body: "#5d3590", ink: "#dcdce6" } },
    { value: "steel", label: "Steel", look: { finish: metal, body: "#c9ccd2", ink: "#16171a" } },
    { value: "brass", label: "Brass", look: { finish: { ...metal, roughness: 0.35 }, body: "#d2a64a", ink: "#2a1c08" } },
    { value: "walnut", label: "Walnut", look: { finish: { roughness: 0.6, metalness: 0, shine: 0, texture: "walnut" }, body: "#ffffff", ink: "#ecd29a" } },
    { value: "ash", label: "Ash", look: { finish: { roughness: 0.6, metalness: 0, shine: 0, texture: "ash" }, body: "#ffffff", ink: "#2e1c0e" } },
    { value: "marble", label: "Marble", look: { finish: { roughness: 0.15, metalness: 0, shine: 0.4, texture: "marble" }, body: "#ffffff", ink: "#1d1e24" } },
    { value: "onyx", label: "Onyx", look: { finish: { roughness: 0.15, metalness: 0, shine: 0.4, texture: "onyx" }, body: "#ffffff", ink: "#e7c46a" } },
    { value: "granite", label: "Granite", look: { finish: { roughness: 0.25, metalness: 0, shine: 0.3, texture: "granite" }, body: "#ffffff", ink: "#141416" } },
];

/** Which set the player rolls. */
export const diceSetPref: Choice = { key: "rpg-engine.dice-set", initial: "theme", values: diceSets.map((set) => set.value) };

/** Whether the dice's edges are rounded or sharp, as a precision die's (D-354). */
export const diceEdgesPref: Choice = { key: "rpg-engine.dice-edges", initial: "rounded", values: ["rounded", "sharp"] };

/** The look of a set, by default the one chosen; the theme's by the theme shown: yellow resin with navy numbers on the dark page, navy with yellow on the light. */
export function diceLook(value = readChoice(diceSetPref)): DiceLook
{
    const chosen = diceSets.find((set) => set.value === value)?.look;

    if (chosen !== undefined) {
        return chosen;
    }

    return shownTheme() === "dark" ? { finish: resin, body: "#f5c63e", ink: "#182c4c" } : { finish: resin, body: "#182c4c", ink: "#f5c63e" };
}

/** Where the picture of a grain is. */
export function texturePath(texture: string): string
{
    return `/assets/dice/textures/${texture}.jpg`;
}
