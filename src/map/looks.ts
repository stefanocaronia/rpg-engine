// What the dashboard's map draws (D-318, POS-7): a symbol for each kind of place, a colour and marks for each biome of a region; any other value is drawn neutral.

/** The kinds of place the map has a symbol for, the largest first. */
export const placeKinds = ["city", "town", "village", "castle", "tower", "ruin", "temple", "shrine", "inn", "farm", "mill", "port", "bridge", "ford", "crossroads", "cave", "mine", "peak", "camp"] as const;

/** The biomes the map colours a region with. */
export const biomes = ["forest", "swamp", "moor", "hills", "mountains", "plains", "desert", "snow", "water"] as const;
