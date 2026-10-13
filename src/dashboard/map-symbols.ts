// What the world map draws (D-318, POS-7): a symbol for each kind of place, in four sizes, and for each biome of a region a colour, from the style sheet, and a
// mark; the same names as the engine's map/looks.ts, which a test checks. A kind or a biome the page does not know is drawn neutral. Drawn for
// rpg-engine: lines on a grid of 24, a biome's marks around 0.
import { t } from "./text.ts";

/** A kind of place: its name in the key, its size from 0 (a shrine) to 3 (a city), and its picture. */
export interface PlaceKind
{
    label: string;
    size: number;
    glyph: string;
}

export const placeKinds: Record<string, PlaceKind> = {
    city: { label: "City", size: 3, glyph: "M2 21V11h3V8.5h3V11h3V6.5h2V11h3V8.5h3V11h3v10Z M10 21v-3.5a2 2 0 0 1 4 0V21 M5 15h1 M18 15h1" },
    town: { label: "Town", size: 2, glyph: "M3 20V12l5-4 5 4v8 M13 20V9l4-4 4 4v11 M2 20h20 M6.5 20v-3h3v3 M16 13h2" },
    village: { label: "Village", size: 1, glyph: "M3 20v-6l3.5-3 3.5 3v6 M10 20V10l3-3.5 3 3.5v10 M13 2.5v3 M11.8 3.6h2.4 M16 20v-5l2.5-2 2.5 2v5 M2 20h20" },
    castle: { label: "Castle", size: 2, glyph: "M5 21V9h2V7h2.5v2h5V7H17v2h2v12Z M10 21v-4a2 2 0 0 1 4 0v4 M12 3v4 M12 3l4 1.4L12 6" },
    tower: { label: "Tower", size: 1, glyph: "M8 21V9h8v12 M7 9V5h2v1.5h2V5h2v1.5h2V5h2v4 M11 21v-4h2v4 M5 21h14" },
    ruin: { label: "Ruin", size: 1, glyph: "M7 21V9h3l1 2 1.5-3.5L14 9h3v12 M10.5 21v-3.5h3V21 M4 21h16 M18.5 18.5h2.5v2.5" },
    temple: { label: "Temple", size: 1, glyph: "M3 9 12 4l9 5Z M6 9v9 M10 9v9 M14 9v9 M18 9v9 M3 20h18" },
    shrine: { label: "Shrine", size: 0, glyph: "M12 3v18 M6.5 8.5h11 M8 21h8" },
    inn: { label: "Inn", size: 1, glyph: "M5 8h10v12H5Z M15 10.5h2.5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H15 M5 8c0-2 1.5-3.3 3-2.7C8.8 3.6 11 3.4 12 5c1.6-.6 3.3.8 3 3 M8.5 11v6 M11.5 11v6" },
    farm: { label: "Farm", size: 0, glyph: "M3 20V10l5-4.5h8l5 4.5v10Z M9 20v-6h6v6 M9 14l6 6 M15 14l-6 6 M10 9.5h4" },
    mill: { label: "Mill", size: 1, glyph: "M9.5 21l1.2-9h2.6l1.2 9 M12 10 6 4 M12 10l6-6 M12 10l-6 6 M12 10l6 6 M7 21h10" },
    port: { label: "Port", size: 1, glyph: "M12 6v15 M8 9h8 M5 15c0 4 3 6 7 6s7-2 7-6 M12 3a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2Z" },
    bridge: { label: "Bridge", size: 0, glyph: "M2 10h20 M4 10v9 M20 10v9 M4 19c2-6 14-6 16 0 M2 7h20" },
    ford: { label: "Ford", size: 0, glyph: "M3 10c3 2 6-2 9 0s6-2 9 0 M3 16c3 2 6-2 9 0s6-2 9 0" },
    crossroads: { label: "Crossroads", size: 0, glyph: "M12 3v18 M12 5h7l2 2.5-2 2.5h-7 M12 12H5l-2 2.5 2 2.5h7" },
    cave: { label: "Cave", size: 1, glyph: "M2 20c1-8 4.5-13 10-13s9 5 10 13Z M8.5 20c0-4 1.6-6.5 3.5-6.5s3.5 2.5 3.5 6.5" },
    mine: { label: "Mine", size: 1, glyph: "M5 20 15 10 M10 5c4-1.5 8 .5 10 5 M19 20 9 10 M14 5c-4-1.5-8 .5-10 5" },
    peak: { label: "Peak", size: 1, glyph: "M2 20 9.5 6l3.5 5 2.5-3.5L22 20Z M7.2 10.3 9 12l1.8-1.6 1.2 1.5" },
    camp: { label: "Camp", size: 0, glyph: "M3 20 12 5l9 15Z M9 20l3-6 3 6" },
};

/** A biome: its name in the key, and the mark scattered over its land, so that colour is never the only sign. */
export const biomes: Record<string, { label: string; mark: string; }> = {
    forest: { label: "Forest", mark: "M0-6 4.5 1.5h-9Z M0 1.5V4.5" },
    swamp: { label: "Swamp", mark: "M-6 3.5h12 M-2.5 3.5V-3 M.5 3.5V-5 M3.5 3.5V-2" },
    moor: { label: "Moor", mark: "M-4 2.5Q-3-1-1.5-3 M0 2.5V-4 M4 2.5Q3-1 1.5-3 M-6 2.5H6" },
    hills: { label: "Hills", mark: "M-8 3Q-3-5 2 3 M-1-1Q3-6 8 3" },
    mountains: { label: "Mountains", mark: "M-8 4-1.5-6 2-1 4-4 9 4 M-3.4-3.2-1.5-1.6.3-3" },
    plains: { label: "Plains", mark: "M-6 2h4 M2 2h4 M-2-2h4" },
    desert: { label: "Desert", mark: "M-6 1q3-3 6 0t6 0" },
    snow: { label: "Snow", mark: "M0-4.5V4.5 M-3.9-2.2 3.9 2.2 M-3.9 2.2 3.9-2.2" },
    water: { label: "Water", mark: "M-7 0q1.75-2.5 3.5 0t3.5 0 3.5 0 3.5 0" },
};

/** The radius of a symbol's disc, by its size, in pixels. */
export const symbolRadius = [9, 11.5, 13.5, 15.5];

/** A kind of place by its name in the page's language; undefined for one the page does not know. */
export function placeKindLabel(kind: string | undefined): string | undefined
{
    const labels: Record<string, string> = {
        city: t("City"),
        town: t("Town"),
        village: t("Village"),
        castle: t("Castle"),
        tower: t("Tower"),
        ruin: t("Ruin"),
        temple: t("Temple"),
        shrine: t("Shrine"),
        inn: t("Inn"),
        farm: t("Farm"),
        mill: t("Mill"),
        port: t("Port"),
        bridge: t("Bridge"),
        ford: t("Ford"),
        crossroads: t("Crossroads"),
        cave: t("Cave"),
        mine: t("Mine"),
        peak: t("Peak"),
        camp: t("Camp"),
    };
    return kind === undefined ? undefined : labels[kind];
}

/** A biome by its name in the page's language; undefined for one the page does not know. */
export function biomeLabel(biome: string | undefined): string | undefined
{
    const labels: Record<string, string> = {
        forest: t("Forest"),
        swamp: t("Swamp"),
        moor: t("Moor"),
        hills: t("Hills"),
        mountains: t("Mountains"),
        plains: t("Plains"),
        desert: t("Desert"),
        snow: t("Snow"),
        water: t("Water"),
    };
    return biome === undefined ? undefined : labels[biome];
}
