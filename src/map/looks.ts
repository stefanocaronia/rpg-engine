// What the dashboard's map draws (D-318, POS-7): a symbol for each kind of place, a colour and marks for each biome of a region; any other value is drawn neutral.

/** The kinds of place the map has a symbol for, the largest first. */
export const placeKinds = ["city", "town", "village", "castle", "tower", "ruin", "temple", "shrine", "inn", "farm", "mill", "port", "bridge", "ford", "crossroads", "cave", "mine", "peak", "camp"] as const;

/**
 * The kinds of things a place's map draws, each its own way (D-325, GRD-2): walls and ground, ways and passages, water and rough ground, nature, furniture,
 * the town; any other is drawn neutral.
 */
export const squareKinds = [
    "wall",
    "rock",
    "floor",
    "ground",
    "road",
    "door",
    "open-door",
    "secret-door",
    "opening",
    "window",
    "low-wall",
    "hedge",
    "stairs",
    "ladder",
    "trapdoor",
    "pit",
    "cliff",
    "bridge",
    "shallow-water",
    "deep-water",
    "mud",
    "rubble",
    "brush",
    "tree",
    "rocks",
    "pillar",
    "statue",
    "fire",
    "hearth",
    "well",
    "fountain",
    "table",
    "seat",
    "counter",
    "bed",
    "shelf",
    "barrel",
    "crate",
    "altar",
    "machine",
    "vehicle",
    "tent",
    "stall",
    "building",
    "hazard",
    "mark",
] as const;

/** The biomes the map colours a region with. */
export const biomes = ["forest", "swamp", "moor", "hills", "mountains", "plains", "desert", "snow", "water"] as const;
