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
    // The world map's tools and ways (D-318), drawn by Joseph.
    locate: "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10Z M12 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2Z",
    fit: "M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5",
    list: "M8 6h12 M8 12h12 M8 18h12 M4 6h.01 M4 12h.01 M4 18h.01",
    road: "M4 20 10 4 M20 20 14 4 M12 6v2 M12 11v2 M12 16v2",
    path: "M5 20c4-3 10-3 8-8s-4-6 2-8",
    river: "M3 8c3 2 6-2 9 0s6-2 9 0 M3 14c3 2 6-2 9 0s6-2 9 0",
    close: "M6 6l12 12 M18 6 6 18",
    clock: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 7.5V12l3 2",
    place: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z M12 7.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5Z",
    aside: "M6 6l6 6-6 6 M12 6l6 6-6 6",
    send: "M5 12h13 M13 6l6 6-6 6",
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
    rules: "M12 7c-1.8-1.5-4.8-2.2-8.5-2v13c3.7-.2 6.7.5 8.5 2c1.8-1.5 4.8-2.2 8.5-2V5c-3.7-.2-6.7.5-8.5 2Z M12 7v13",
    menu: "M4 6.5h16 M4 12h16 M4 17.5h16",
    saves: "M5 3.5h11l3 3V20.5H5Z M8 3.5v5h7v-5 M8 20.5v-6h8v6",
    settings:
        "M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z M19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7 7 0 0 1-2 1.2L15 20.5h-3.6l-.3-2.2a7 7 0 0 1-2-1.2l-1.9.7-1.8-3.1 1.6-1.2a7 7 0 0 1 0-2.3L5.4 9.8l1.8-3.1 1.9.7a7 7 0 0 1 2-1.2l.3-2.2H15l.3 2.2a7 7 0 0 1 2 1.2l1.9-.7 1.8 3.1-1.6 1.2a7 7 0 0 1 0 2.3Z",
    about: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z M12 11v6 M12 7.6v.3",
    // A place without a picture, and someone the character does not know (D-309).
    house: "M3 20.5h18 M5 20.5V10.5l7-6 7 6v10 M10 20.5v-5a2 2 0 0 1 4 0v5",
    stranger: "M12 3c-4 0-6.5 3.5-6.5 8v3.5L4 20.5h16l-1.5-6V11c0-4.5-2.5-8-6.5-8Z M8.8 11.8c.8-1.7 1.9-2.6 3.2-2.6s2.4.9 3.2 2.6c-.7 1.7-1.8 2.6-3.2 2.6s-2.5-.9-3.2-2.6Z",
};

/** The pictures of the page's own cards, and the plain one of a card whose system gives none (D-284). */
export const cardIcons = {
    description: "M6.5 3H14l4 4v14H6.5Z M14 3v4h4 M9.5 11h5 M9.5 14.5h5 M9.5 18h3",
    rolls: diePaths[20],
    here: "M9 4.5a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z M3 19.5c.5-3.3 2.8-5.5 6-5.5s5.5 2.2 6 5.5 M16 4.8a3 3 0 0 1 0 5.4 M17.5 14.3c2 .7 3.2 2.6 3.5 5.2",
    plain: "M5 5.5a1 1 0 1 1 0 2a1 1 0 1 1 0-2Z M5 11a1 1 0 1 1 0 2a1 1 0 1 1 0-2Z M5 16.5a1 1 0 1 1 0 2a1 1 0 1 1 0-2Z M9 6.5h10.5 M9 12h10.5 M9 17.5h10.5",
};

/** The name of a control's picture. */
export type IconName = keyof typeof iconPaths;

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

/** A control's picture, such as the bin that clears the dice. */
export function Icon({ name }: { name: IconName; })
{
    return (
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d={iconPaths[name]} />
        </svg>
    );
}
