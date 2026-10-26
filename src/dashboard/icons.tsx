// The page's pictures (D-284): each die that is thrown, and the controls that have no words; lines on a grid of 24, in the colour of the text around them.
import { drawnDiceOf, drawnDie } from "./labels.ts";

// The dice by their sides: the d% as two d10, one behind the other; the coin as 2.
const diePaths: Record<number, string> = {
    2: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10Z",
    4: "M12 2.5 21.8 19.5H2.2Z M12 2.5 14.2 19.5",
    6: "M12 2 20.7 7v10L12 22l-8.7-5V7Z M3.3 7 12 12l8.7-5 M12 12v10",
    8: "M12 2 21 12 12 22 3 12Z M12 2 7.5 15.5h9Z M3 12l4.5 3.5 M21 12l-4.5 3.5 M7.5 15.5 12 22l4.5-6.5",
    10: "M12 2 21.5 10.5v3L12 22l-9.5-8.5v-3Z M12 2 6.8 12.6 12 15.4l5.2-2.8Z M2.5 13.5l4.3-.9 M21.5 13.5l-4.3-.9 M12 15.4V22",
    12: "M12 2 17.9 3.9 21.5 8.9v6.2L17.9 20.1 12 22 6.1 20.1 2.5 15.1V8.9L6.1 3.9Z M12 7 16.8 10.5 14.9 16.1H9.1L7.2 10.5Z M12 7V2 M16.8 10.5 21.5 8.9 M14.9 16.1 17.9 20.1 M9.1 16.1 6.1 20.1 M7.2 10.5 2.5 8.9",
    20: "M12 2 20.7 7v10L12 22l-8.7-5V7Z M12 6.7 16.6 14.7H7.4Z M12 2v4.7 M3.3 7l8.7-.3 8.7.3 M3.3 7 7.4 14.7 3.3 17 M20.7 7l-4.1 7.7 4.1 2.3 M7.4 14.7 12 22l4.6-7.3",
    100: "M8.5 6 14.5 12.4v2.2L8.5 21l-6-6.4v-2.2Z M8.5 6 5.2 13.95 8.5 16.05 11.8 13.95Z M8.5 16.05V21 M10.36 7.98 15.5 2.5l6 6.4v2.2l-6 6.4-1.86-1.98",
};

const iconPaths = {
    clear: "M4 7h16 M10 4h4 M6.5 7l.9 12.2a1 1 0 0 0 1 .8h7.2a1 1 0 0 0 1-.8L17.5 7 M10 11v5.5 M14 11v5.5",
    clearAll: "M7 8h14 M5 12h14 M3 16h14",
    soundOn: "M4 9.5h3.5L12 5.5v13l-4.5-4H4Z M15.5 9a4 4 0 0 1 0 6 M18 6.5a7.5 7.5 0 0 1 0 11",
    soundOff: "M4 9.5h3.5L12 5.5v13l-4.5-4H4Z M16 9.5l5 5 M21 9.5l-5 5",
    minus: "M6 12h12",
    plus: "M12 6v12 M6 12h12",
    // The world map's tools and ways (D-318).
    locate: "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10Z M12 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2Z",
    fit: "M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5",
    list: "M8 6h12 M8 12h12 M8 18h12 M4 6h.01 M4 12h.01 M4 18h.01",
    road: "M4 20 10 4 M20 20 14 4 M12 6v2 M12 11v2 M12 16v2",
    path: "M5 20c4-3 10-3 8-8s-4-6 2-8",
    river: "M3 8c3 2 6-2 9 0s6-2 9 0 M3 14c3 2 6-2 9 0s6-2 9 0",
    close: "M6 6l12 12 M18 6 6 18",
    clock: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 7.5V12l3 2",
    calendar: "M4 6h16v14H4Z M4 10h16 M8 3v4 M16 3v4",
    hourglass: "M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9",
    place: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z M12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5Z",
    aside: "M6 6l6 6-6 6 M12 6l6 6-6 6",
    send: "M5 12h13 M13 6l6 6-6 6",
    // The doorbell that called the master for the player's sentence (D-495).
    bell: "M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z M10 20.5a2 2 0 0 0 4 0",
    copy: "M9 9h10.5v11.5H9Z M15 9V3.5H4.5V15H9",
    // The page's foot: the code, the package, a heart for support.
    github:
        "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4 M9 18c-4.51 2-5-2-7-2",
    npm: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73Z M12 22V12 M3.29 7 12 12l8.71-5 M7.5 4.27l9 5.15",
    heart: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
    check: "M5 12.5l4.5 4.5L19 7.5",
    // What opens and closes the things a container holds, pointing at them (D-431).
    fold: "M9.5 6.5l5.5 5.5-5.5 5.5",
    // Any thing carried that the game has no drawing for: a parcel tied with string (D-431).
    thing: "M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4Z M3.5 7.5 12 11.5l8.5-4 M12 11.5v9 M7.8 5.5l8.4 4v3",
    undo: "M9 14 4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 0 11H11",
    pencil: "M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3 M13.5 8.5l3 3",
    alert: "M12 3.5 21.5 20h-19Z M12 9.5v5 M12 17.2v.3",
    info: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 11v6 M12 7.6v.3",
    sun: "M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9Z M12 2.5v2 M12 19.5v2 M4.6 4.6 6 6 M18 18l1.4 1.4 M2.5 12h2 M19.5 12h2 M4.6 19.4 6 18 M18 6l1.4-1.4",
    moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z",
    // The sections and the menu (D-309); the scene's is the place's pin, as its chip.
    party: "M12 3.5a4 4 0 1 0 0 8a4 4 0 1 0 0-8Z M4.5 20.5c.6-4 3.6-6.5 7.5-6.5s6.9 2.5 7.5 6.5",
    // Two blades crossed, for the fight (D-314).
    combat: "M4 4l11 11 M4 4v3l9.5 9.5 M4 4h3l9.5 9.5 M14 17l3-3 M15.5 15.5 20 20 M20 4 9 15 M20 4v3l-2.5 2.5 M20 4h-3l-2.5 2.5 M10 17l-3-3 M8.5 15.5 4 20",
    scene: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z M12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5Z",
    journal: "M6.5 3.5H18v17H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z M9.5 3.5v7.5l2-1.5 2 1.5V3.5 M5 17h13",
    world: "M3.5 6.5 9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5-5.5 2.5Z M9 4v13.5 M15 6.5V20",
    help: "M12 7c-1.8-1.5-4.8-2.2-8.5-2v13c3.7-.2 6.7.5 8.5 2c1.8-1.5 4.8-2.2 8.5-2V5c-3.7-.2-6.7.5-8.5 2Z M12 7v13",
    menu: "M4 6.5h16 M4 12h16 M4 17.5h16",
    saves: "M5 3.5h11l3 3V20.5H5Z M8 3.5v5h7v-5 M8 20.5v-6h8v6",
    // A gear standing straight, a tooth at the top (D-409).
    settings:
        "M10.33 5.3L10.42 2.53L13.58 2.53L13.67 5.3A6.9 6.9 0 0 1 15.55 6.09L17.57 4.18L19.82 6.43L17.91 8.45A6.9 6.9 0 0 1 18.7 10.33L21.47 10.42L21.47 13.58L18.7 13.67A6.9 6.9 0 0 1 17.91 15.55L19.82 17.57L17.57 19.82L15.55 17.91A6.9 6.9 0 0 1 13.67 18.7L13.58 21.47L10.42 21.47L10.33 18.7A6.9 6.9 0 0 1 8.45 17.91L6.43 19.82L4.18 17.57L6.09 15.55A6.9 6.9 0 0 1 5.3 13.67L2.53 13.58L2.53 10.42L5.3 10.33A6.9 6.9 0 0 1 6.09 8.45L4.18 6.43L6.43 4.18L8.45 6.09A6.9 6.9 0 0 1 10.33 5.3Z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z",
    about: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 11v6 M12 7.6v.3",
    // The packages (D-475): a box, as npm draws it; what is done with one, and the system that stays.
    packages: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73Z M12 22V12 M3.29 7 12 12l8.71-5 M7.5 4.27l9 5.15",
    // A package's own page, as the packages.
    pkg: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73Z M12 22V12 M3.29 7 12 12l8.71-5 M7.5 4.27l9 5.15",
    download: "M12 4v11 M7 10.5l5 5 5-5 M5 20h14",
    update: "M20 12a8 8 0 1 1-2.3-5.6 M20 4v4.5h-4.5",
    lock: "M6.5 10.5h11v10h-11Z M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3",
    verified: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6Z M8.8 12.2l2.2 2.2 4.4-4.6",
    unverified: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6Z M12 8v5 M12 16v.3",
    offline: "M3 3l18 18 M8.5 16.5a5 5 0 0 1 7 0 M5 12.5a10 10 0 0 1 4.5-2.4 M14.5 10.2A10 10 0 0 1 19 12.5 M2 8.8a15 15 0 0 1 4.3-2.6 M10.5 5.1A15 15 0 0 1 22 8.8 M12 20h.01",
    terminal: "M3.5 4.5h17v15h-17Z M7 9l3 3-3 3 M12.5 15H17",
    // The campaign shared as an adventure (D-483): out of the box.
    share: "M12 15V3.5 M7.5 8 12 3.5 16.5 8 M8 11H5v9.5h14V11h-3",
    // Help's parts (D-409): the chat with the master, and the dice.
    chat: "M4.5 5h15v10.5H10l-4.5 3.5v-3.5h-1Z M8 9h8 M8 12h5",
    dice: diePaths[20],
    // A place without a picture, and someone the character does not know (D-309).
    house: "M3 20.5h18 M5 20.5V10.5l7-6 7 6v10 M10 20.5v-5a2 2 0 0 1 4 0v5",
    stranger: "M12 3c-4 0-6.5 3.5-6.5 8v3.5L4 20.5h16l-1.5-6V11c0-4.5-2.5-8-6.5-8Z M8.8 11.8c.8-1.7 1.9-2.6 3.2-2.6s2.4.9 3.2 2.6c-.7 1.7-1.8 2.6-3.2 2.6s-2.5-.9-3.2-2.6Z",
    // Rolling by hand, from the sheet or the tray (D-330).
    hand: "M8 12.5V5.5a1.5 1.5 0 0 1 3 0V11 M11 11V4a1.5 1.5 0 0 1 3 0v7 M14 11V5.5a1.5 1.5 0 0 1 3 0V13 M17 10.5a1.5 1.5 0 0 1 3 0V14a6.5 6.5 0 0 1-6.5 6.5H12c-2 0-3.3-.7-4.5-1.9l-3.3-3.4a1.5 1.5 0 0 1 2.1-2.1L8 14.8",
    licence: "M6.5 3H14l4 4v14H6.5Z M14 3v4h4 M9.5 14l2 2 3.5-4",
    // The Packages page (D-486): a file to add, the catalog's search, a language, the window of the computer where the yes is given, more rows.
    file: "M6 3h8l4 4v14H6Z M14 3v4h4 M9 13h6 M9 16.5h6",
    folder: "M3 5h6.5l2 2.5H21V20H3Z",
    library: "M4 6h3.5v14.5H4Z M9 3.5h3.5v17H9Z M9 7.5h3.5 M16.5 20.5l3.3-.9-3.4-12.5-3.3.9Z",
    search: "M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13Z M15.5 15.5 20 20",
    language: "M4 5h9 M8.5 3v2 M6 5c.5 3 2.8 5.5 6 7 M11 5c-.6 3-2.5 5.6-5.5 7.3 M12.5 21l4-9 4 9 M14 17.5h5",
    window: "M3 5h18v14H3Z M3 9h18 M6 7h.01 M8.5 7h.01",
    more: "M6 9l6 6 6-6",
    // A thing in a list of bonds, as attuned: two rings linked.
    bond: "M9 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9Z M15 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9Z",
    // A roll the sheet makes better, worse, or both, which cancel out.
    better: "M12 19.5V5 M6 11l6-6 6 6",
    worse: "M12 4.5V19 M6 13l6 6 6-6",
    even: "M8 19.5V4.5 M4 8.5l4-4 4 4 M16 4.5v15 M12 15.5l4 4 4-4",
};

/**
 * The engine's states on a token and in Combat (D-419), for any game: dead, one of the party at 0 (a heartbeat), anyone else down (fallen to the ground), kept
 * from acting; and the mark of a condition the system draws no picture for. The conditions' own pictures are the system's (`condition-icons`). The skull of
 * the dead is filled, its eyes, nose and teeth holes, to read on a pip of 12 pixels (D-461).
 */
export const statusIcons = {
    dead:
        "M12 2.5C7 2.5 3.5 6 3.5 10.6c0 2.7 1.2 4.8 3.2 6.1V19.5c0 1.1.9 2 2 2h6.6c1.1 0 2-.9 2-2v-2.8c2-1.3 3.2-3.4 3.2-6.1C20.5 6 17 2.5 12 2.5Z M8.6 8.8a2.3 2.4 0 1 0 0 4.8a2.3 2.4 0 1 0 0-4.8Z M15.4 8.8a2.3 2.4 0 1 0 0 4.8a2.3 2.4 0 1 0 0-4.8Z M12 13.8l-1.4 2.5h2.8Z M10.1 18.4h1.1v3.4h-1.1Z M12.8 18.4h1.1v3.4h-1.1Z",
    down: "M3 12.5h4.5l2-5 3 10 2.5-5H21",
    fallen: "M12 4v10.5 M7.5 10l4.5 4.5 4.5-4.5 M4.5 19.5h15",
    inactive: "M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17Z M10 9v6 M14 9v6",
    condition: "M12 4l1.8 6.2L20 12l-6.2 1.8L12 20l-1.8-6.2L4 12l6.2-1.8Z",
};

/** The pictures of the page's own cards, and the plain one of a card whose system gives none (D-284). */
export const cardIcons = {
    description: "M6.5 3H14l4 4v14H6.5Z M14 3v4h4 M9.5 11h5 M9.5 14.5h5 M9.5 18h3",
    backstory: "M20 3.5c-6.5 1-11.5 6-13.5 13.5L5.5 20.5l3.5-1C16.5 17.5 19 12.5 20 3.5Z M6.5 17 12 11.5 M4 20.5h16",
    rolls: diePaths[20],
    here: "M9 4.5a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z M3 19.5c.5-3.3 2.8-5.5 6-5.5s5.5 2.2 6 5.5 M16 4.8a3 3 0 0 1 0 5.4 M17.5 14.3c2 .7 3.2 2.6 3.5 5.2",
    plain: "M5 5.5a1 1 0 1 1 0 2a1 1 0 1 1 0-2Z M5 11a1 1 0 1 1 0 2a1 1 0 1 1 0-2Z M5 16.5a1 1 0 1 1 0 2a1 1 0 1 1 0-2Z M9 6.5h10.5 M9 12h10.5 M9 17.5h10.5",
};

/** The name of a control's picture. */
export type IconName = keyof typeof iconPaths;

// The icons that point a way, which turn in a language written from right to left.
const turning = new Set<IconName>(["send", "undo", "aside", "fold"]);

/** A die's picture, by its sides; nothing for a die the page does not draw. */
export function DieIcon({ sides, faded }: { sides: number | "F"; faded?: boolean; })
{
    const drawn = drawnDie(sides);
    return drawn === undefined ? null : (
        <svg class={faded ? "die faded" : "die"} viewBox="0 0 24 24" aria-hidden="true">
            <path d={diePaths[drawn]} />
        </svg>
    );
}

/** The colours of a set of dice, as a picture draws them: its body, or the picture of its grain, and the ink of its numbers. */
export interface SwatchLook
{
    body: string;
    ink: string;
    picture?: string;
}

/**
 * A die of a set, by its sides, a d20 by default: its body filled with its colour or the picture of its grain, its edges in the ink of its numbers, as Settings
 * shows the sets (D-348); every other picture of a die is in the page's accent (D-374). Nothing for a die the page does not draw.
 */
export function DieSwatch({ sides = 20, body, ink, picture }: SwatchLook & { sides?: number | "F"; })
{
    const drawn = drawnDie(sides);

    if (drawn === undefined) {
        return null;
    }

    const outline = diePaths[drawn].split(" M")[0];
    const pattern = picture === undefined ? undefined : `grain-${picture.replace(/[^a-z0-9]+/gi, "-")}`;
    return (
        <svg class={pattern === undefined ? "die die-swatch" : "die die-swatch grained"} viewBox="0 0 24 24" aria-hidden="true">
            {pattern !== undefined && (
                <defs>
                    <pattern id={pattern} patternUnits="userSpaceOnUse" width="24" height="24">
                        <image href={picture} width="48" height="48" x="-12" y="-12" />
                    </pattern>
                </defs>
            )}
            <path d={outline} fill={pattern === undefined ? body : `url(#${pattern})`} stroke="none" />
            <path d={diePaths[drawn]} fill="none" stroke={ink} />
        </svg>
    );
}

/** The dice of a notation as pictures, two at most, one in front of the other, with how many past two of one kind. */
export function NotationIcons({ notation }: { notation: string; })
{
    const drawn = drawnDiceOf(notation);
    return drawn.sides.length === 0 ? null : (
        <span class="die-icons" aria-hidden="true">
            {drawn.sides.map((sides, index) => <DieIcon key={index} sides={sides} faded={drawn.faded === true && index === 1} />)}
            {drawn.count !== undefined && <span class="die-more">×{drawn.count}</span>}
        </span>
    );
}

/** A picture's drawing, for a card's header. */
export function iconPath(name: IconName): string
{
    return iconPaths[name];
}

/** Whether a name, as a text names it, is one of the page's pictures. */
export function isIconName(name: string): name is IconName
{
    return Object.hasOwn(iconPaths, name);
}

/** A control's picture, such as the bin that clears the dice. */
export function Icon({ name }: { name: IconName; })
{
    return (
        <svg class={turning.has(name) ? "icon turns" : "icon"} viewBox="0 0 24 24" aria-hidden="true">
            <path d={iconPaths[name]} />
        </svg>
    );
}
