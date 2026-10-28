// The look of the dice the player rolls (D-279, D-348, D-352): the theme's, or one of the sets chosen in Settings, as sets of real dice, each a material, a
// body and the ink of its numbers: resin, metal, wood, stone or crystal, the wood and the stone from CC0 pictures of ambientCG (assets/dice/textures). Kept in
// this browser alone. The coins of the dice's material or of a metal, also chosen there (D-526).
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
    /** How much of the page shows through the die, as through a crystal, from 0. */
    clarity?: number;
    /** Whether the numbers on its far faces, seen through it, show only as engravings, faint and colourless: a clear glass's. */
    engraved?: boolean;
    /** Whether the die is all its reflections, as a glass: they add to the page in full, which shows through it but at its edges, seen aslant. */
    glassy?: boolean;
    /** Whether its surface is rough with frost, as ice. */
    frosted?: boolean;
    /** How much its reflections split into the colours of the rainbow, as through a prism, from 0. */
    prism?: number;
}

/** A die's look: its material, its body, which tints the picture of a grain, and the ink of its numbers. */
export interface DiceLook
{
    finish: Finish;
    body: string;
    ink: string;
    /** The colour of its picture in Settings, when its body's would mislead: a clear die's, all reflections. */
    swatch?: string;
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
// The gems and the glass: the page and their far faces seen through them (D-418).
const crystal: Finish = { roughness: 0.02, metalness: 0, shine: 1.5, clarity: 0.3 };

/** The sets, the theme's first, then by material: dark numbers on light bodies and light numbers on dark ones, to be read at a glance. */
export const diceSets: DiceSet[] = [
    { value: "theme", label: "Theme" },
    { value: "ivory", label: "Ivory", look: { finish: resin, body: "#ece3cf", ink: "#1f1d1b" } },
    { value: "obsidian", label: "Obsidian", look: { finish: resin, body: "#222227", ink: "#e0b84c" } },
    { value: "ruby", label: "Ruby", look: { finish: resin, body: "#8f1d2e", ink: "#f2c75a" } },
    { value: "emerald", label: "Emerald", look: { finish: resin, body: "#1c6b4b", ink: "#f4f0e6" } },
    { value: "sapphire", label: "Sapphire", look: { finish: resin, body: "#1f4c9c", ink: "#f4f0e6" } },
    { value: "amethyst", label: "Amethyst", look: { finish: resin, body: "#5d3590", ink: "#dcdce6" } },
    { value: "ruby-crystal", label: "Crystal ruby", look: { finish: crystal, body: "#8c0a1e", ink: "#f2c75a" } },
    { value: "sapphire-crystal", label: "Crystal sapphire", look: { finish: crystal, body: "#173aa6", ink: "#f4f0e6" } },
    { value: "amethyst-crystal", label: "Crystal amethyst", look: { finish: crystal, body: "#5e22b0", ink: "#f6f1ff" } },
    // Clear as a drinking glass, and ice, frosted: their far numbers only engraved, so that the near ones are read.
    { value: "glass", label: "Glass", look: { finish: { roughness: 0, metalness: 0, shine: 0.8, clarity: 0.92, engraved: true, glassy: true, prism: 0.5 }, body: "#0b0d10", ink: "#c9971c", swatch: "#d8e9f0" } },
    { value: "ice", label: "Ice", look: { finish: { roughness: 0.5, metalness: 0, shine: 0.7, clarity: 0.55, engraved: true, glassy: true, frosted: true }, body: "#3f6276", ink: "#2c6fb5", swatch: "#c4e2f0" } },
    { value: "steel", label: "Steel", look: { finish: metal, body: "#c9ccd2", ink: "#16171a" } },
    { value: "brass", label: "Brass", look: { finish: { ...metal, roughness: 0.35 }, body: "#d2a64a", ink: "#2a1c08" } },
    { value: "walnut", label: "Walnut", look: { finish: { roughness: 0.6, metalness: 0, shine: 0, texture: "walnut" }, body: "#ffffff", ink: "#ecd29a" } },
    { value: "ash", label: "Ash", look: { finish: { roughness: 0.6, metalness: 0, shine: 0, texture: "ash" }, body: "#ffffff", ink: "#2e1c0e" } },
    { value: "marble", label: "Marble", look: { finish: { roughness: 0.15, metalness: 0, shine: 0.4, texture: "marble" }, body: "#ffffff", ink: "#1d1e24" } },
    // Black onyx, polished, its bands barely seen (D-418).
    { value: "onyx", label: "Onyx", look: { finish: { roughness: 0.06, metalness: 0, shine: 0.7, texture: "onyx" }, body: "#3a3a3f", ink: "#e7c46a" } },
    { value: "granite", label: "Granite", look: { finish: { roughness: 0.25, metalness: 0, shine: 0.3, texture: "granite" }, body: "#ffffff", ink: "#141416" } },
];

// A struck coin's metal, a little rougher than a die's, so that its pictures are read in its reflections.
const struck: Finish = { roughness: 0.32, metalness: 1, shine: 1 };

/** The metals a coin may be struck in, in place of its dice's material (D-526 (1)): each its body and the dark patina in its pictures, as an old coin's. */
export const coinMetals: DiceSet[] = [
    { value: "gold", label: "Gold", look: { finish: struck, body: "#d9a93f", ink: "#1c1206" } },
    { value: "silver", label: "Silver", look: { finish: { ...struck, roughness: 0.26 }, body: "#cfd3da", ink: "#16181c" } },
    { value: "copper", label: "Copper", look: { finish: struck, body: "#a9532e", ink: "#1e0b04" } },
    { value: "bronze", label: "Bronze", look: { finish: { ...struck, roughness: 0.42 }, body: "#745528", ink: "#120a02" } },
    // Iron is dark: its pictures inlaid in silver, as on a blade.
    { value: "iron", label: "Burnished iron", look: { finish: { ...struck, roughness: 0.4 }, body: "#262a31", ink: "#b9bec6" } },
];

/** Which set the player rolls. */
export const diceSetPref: Choice = { key: "rpg-engine.dice-set", initial: "theme", values: diceSets.map((set) => set.value) };

/** What the player's coins are made of: their dice's material, as the initial choice, or a metal (D-526 (1)). */
export const coinPref: Choice = { key: "rpg-engine.coin", initial: "dice", values: ["dice", ...coinMetals.map((metal) => metal.value)] };

/** The coins' designs (D-526 (2)), as make-coin.py makes them, each its heads first: their names in Settings. */
export const coinDesigns: { value: string; label: string; }[] = [
    { value: "sun", label: "Sun and moon" },
    { value: "crown", label: "Crown and tower" },
    { value: "rose", label: "Rose and skull" },
    { value: "planet", label: "Planet and comet" },
    { value: "gear", label: "Gear and lightning" },
    { value: "eye", label: "Eye and star" },
];

/** Which design the player's coins bear, and the master's too: Sun and moon, as the initial choice (D-526 (2), (3)). */
export const coinDesignPref: Choice = { key: "rpg-engine.coin-design", initial: "sun", values: coinDesigns.map((design) => design.value) };

/** Whether the dice's edges are rounded or sharp, as a precision die's (D-354). */
export const diceEdgesPref: Choice = { key: "rpg-engine.dice-edges", initial: "rounded", values: ["rounded", "sharp"] };

/**
 * The look of a set, by default the one chosen; the theme's by the theme shown: yellow resin with navy numbers on the dark page, navy with yellow on the light,
 * or the game's style's colours while it is on.
 */
export function diceLook(value = readChoice(diceSetPref)): DiceLook
{
    const chosen = diceSets.find((set) => set.value === value)?.look;

    if (chosen !== undefined) {
        return chosen;
    }

    return themedDice() ?? (shownTheme() === "dark" ? { finish: resin, body: "#f5c63e", ink: "#182c4c" } : { finish: resin, body: "#182c4c", ink: "#f5c63e" });
}

/** The set Theme in the game's style, when it is on (D-528 (5)): its strong colour with its text, as the page shows them now. */
function themedDice(): DiceLook | undefined
{
    if (typeof document === "undefined") {
        return undefined;
    }

    const style = getComputedStyle(document.documentElement);
    const [body, ink] = ["--dice-body", "--dice-ink"].map((token) => style.getPropertyValue(token).trim());
    return /^#[0-9a-f]{6}$/i.test(body) && /^#[0-9a-f]{6}$/i.test(ink) ? { finish: resin, body, ink } : undefined;
}

/**
 * The look of the coins, by default the player's (D-526 (1)): a metal's, or as the dice given, their body the coin's and their ink its pictures'. The master's
 * are as their dice, whatever the player chose: coinLook("dice", their look).
 */
export function coinLook(value = readChoice(coinPref), dice?: DiceLook): DiceLook
{
    return coinMetals.find((one) => one.value === value)?.look ?? dice ?? diceLook();
}

/**
 * The set the master throws with in a campaign (D-525 (3)): one of the sets drawn once by the campaign's name, the same in every browser and chat, never the
 * player's; when the player takes it, the next one the draw gives.
 */
export function masterSet(campaign: string, playerSet: string = readChoice(diceSetPref)): DiceSet
{
    const sets = diceSets.filter((set) => set.look !== undefined);
    // FNV-1a of the name: a draw that repeats, spread over the sets.
    const drawn = [...campaign].reduce((hash, character) => Math.imul(hash ^ (character.codePointAt(0) ?? 0), 16_777_619) >>> 0, 2_166_136_261);
    // A step prime to the sets' number goes through all of them, far apart.
    const stride = [7, 5, 11, 13, 1].find((step) => greatestDivisor(step, sets.length) === 1) ?? 1;
    const order = sets.map((_, index) => sets[(drawn + index * stride) % sets.length]);
    return order.find((set) => set.value !== playerSet) ?? order[0];
}

/** The coins of a throw (D-526): the player's as chosen, the master's of their dice's material, given; the design always the player's. */
export function coinOf(master?: DiceLook): { look: DiceLook; design: string; }
{
    return { look: master === undefined ? coinLook() : coinLook("dice", master), design: readChoice(coinDesignPref) };
}

/** The master's dice for a roll of theirs for no one of the party, as a foe's or one of the people's (D-525 (3)); the party rolls with the player's. */
export function mastersDice(roll: { by: string; who?: string; }, party: readonly { name: string; }[], campaign: string | undefined): DiceLook | undefined
{
    const ours = roll.by === "player" || party.some((member) => member.name === roll.who);
    return ours || campaign === undefined ? undefined : masterSet(campaign).look;
}

/** Where the picture of a grain is. */
export function texturePath(texture: string): string
{
    return `/assets/dice/textures/${texture}.jpg`;
}

function greatestDivisor(first: number, second: number): number
{
    return second === 0 ? first : greatestDivisor(second, first % second);
}
