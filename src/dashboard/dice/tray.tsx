// The dice tray (D-278, D-279, D-284): the dice of a roll the master asked land on the numbers the engine rolled, and a plate says the check, each die and the
// total. The player can also always throw dice for fun from the column of dice over the button, as many as they like and a modifier: the throw counts for
// nothing, the engine does not hear of it, and the dice fade away. The dice and their physics load at the first throw.
import { useEffect, useRef, useState } from "preact/hooks";
import type { Member, SheetRoll, ShownRoll, ThrownDie } from "../data.ts";
import { DieIcon, Icon } from "../icons.tsx";
import { shownText } from "../labels.ts";
import { Token } from "../party.tsx";
import { diceToThrow, type RareFace, rareFace } from "./models.ts";
import type { Roller } from "./roller.ts";
import { wakeSound } from "./sounds.ts";

// After a throw, how long the dice stay before they fade: a roll the master asked stays longer, to be read, then flies into its line of the rolls.
const lingers = { free: 3200, asked: 4200 };
// As --long and --flight in the style sheet.
const fadeLength = 600;
const flight = 450;

// The dice of the free tray, by their sides, from the top of the column: 100 is the d%, thrown as its tens and its units; the d20, the most thrown, is the
// nearest to the button. At most so many at once, which the page throws in a moment.
const freeDice = [100, 4, 6, 8, 10, 12, 20];
const mostDice = 20;

// Where the page remembers whether the dice make a sound, in this browser alone.
const soundKey = "rpg-engine.dice-sound";

/** A number of the sheet rolled for fun from its explanation (D-280): the roll, the number's label, and which throw it is. */
export interface SheetThrow
{
    number: number;
    roll: SheetRoll;
    label: string;
}

/** What the plate under the dice says: the check or the dice of a free throw, the notation, the dice one by one, the total, and its dice as the chat writes them. */
interface Plate
{
    free: boolean;
    title: string;
    /** The notation under the title, when the title is not already the notation. */
    notation?: string;
    dice: ThrownDie[];
    modifier: number;
    total: number;
    text: string;
    shown: boolean;
    /** Whose roll the master asked: their token beside the title. */
    member?: Member;
    /** The roll of the log it shows, whose line of the rolls it flies into. */
    roll?: string;
    /** The rare face of a die that counts, and its words, as natural 20 (D-281). */
    rare?: { face: RareFace; words: string; };
}

export function DiceTray({ requested, sheetThrow, party }: { requested?: ShownRoll; sheetThrow?: SheetThrow; party: Member[]; })
{
    const canvas = useRef<HTMLCanvasElement>(null);
    const shownPlate = useRef<HTMLDivElement>(null);
    const button = useRef<HTMLButtonElement>(null);
    const controls = useRef<HTMLDivElement>(null);
    const tray = useRef<HTMLDivElement>(null);
    const roller = useRef<Promise<Roller | undefined>>();
    // The number of the throw shown now: a newer throw ends an older one's animation and timers.
    const throwing = useRef(0);
    const skipping = useRef(false);
    const [plate, setPlate] = useState<Plate>();
    const [rolling, setRolling] = useState(false);
    const [fading, setFading] = useState(false);
    const [open, setOpen] = useState(false);
    const [pool, setPool] = useState<number[]>([]);
    const [modifier, setModifier] = useState(0);
    const [sound, setSound] = useState(readSound);

    useEffect(() => {
        const onResize = (): void => void roller.current?.then((loaded) => loaded?.resize());

        // Escape lets the dice land at once, and closes the tray, giving the focus back to its button.
        const onKey = (event: KeyboardEvent): void => {
            wakeSound();

            if (event.key === "Escape") {
                skipping.current = true;
                setOpen(false);

                if (controls.current?.contains(document.activeElement) === true) {
                    button.current?.focus();
                }
            }
        };

        window.addEventListener("resize", onResize);
        window.addEventListener("keydown", onKey);
        window.addEventListener("pointerdown", wakeSound);

        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("pointerdown", wakeSound);
        };
    }, []);

    // The open tray takes the focus to the d20, and closes at a click elsewhere on the page, keeping the dice chosen.
    useEffect(() => {
        if (!open) {
            return;
        }

        tray.current?.querySelector<HTMLElement>(`[data-sides="20"]`)?.focus();

        const onPointer = (event: PointerEvent): void => {
            if (!(event.target instanceof Node && controls.current?.contains(event.target) === true)) {
                setOpen(false);
            }
        };

        window.addEventListener("pointerdown", onPointer);
        return () => window.removeEventListener("pointerdown", onPointer);
    }, [open]);

    /** The dice and their stage, loaded once; undefined when the browser cannot draw them, and then the plate comes alone. */
    const loadRoller = (): Promise<Roller | undefined> => {
        const surface = canvas.current;
        roller.current ??= surface === null ? Promise.resolve(undefined) : import("./roller.ts").then((module) => module.makeRoller(surface)).catch(() => undefined);
        return roller.current;
    };

    /** Throws these dice, each landing on its value, then shows the plate, and fades it all after a while; the plate alone when the dice cannot be thrown. */
    const throwAndShow = async (given: Omit<Plate, "shown" | "rare">, linger: number): Promise<void> => {
        const shown = { ...given, ...rareOf(given.dice) };
        const number = ++throwing.current;
        const current = (): boolean => number === throwing.current;
        skipping.current = false;
        setFading(false);
        setRolling(true);
        setPlate({ ...shown, shown: false });
        const loaded = await loadRoller();

        try {
            const toThrow = loaded === undefined ? [] : diceToThrow(given.dice, loaded.kinds);

            if (toThrow.length === 0) {
                loaded?.hide();
            } else if (await loaded?.roll(toThrow, { instant: matchMedia("(prefers-reduced-motion: reduce)").matches, sound, skipping: () => skipping.current, current }) !== true) {
                return;
            }
        } catch {
            // Dice written by hand in the log, which the page cannot throw: the plate says the roll all the same.
            loaded?.hide();
        }

        if (!current()) {
            return;
        }

        setRolling(false);
        setPlate({ ...shown, shown: true });

        const done = (): void => {
            if (current()) {
                loaded?.hide();
                setPlate(undefined);
                setFading(false);
            }
        };

        window.setTimeout(() => {
            if (!current()) {
                return;
            }

            setFading(true);
            const row = shown.roll === undefined ? null : document.querySelector(`[data-roll="${CSS.escape(shown.roll)}"]`);

            // On a wide screen the plate of a roll the master asked flies into its line of the rolls (D-281); elsewhere it fades.
            if (row !== null && shownPlate.current !== null && matchMedia("(min-width: 1100px) and (prefers-reduced-motion: no-preference)").matches && inSight(row)) {
                flyInto(shownPlate.current, row, done);
            } else {
                window.setTimeout(done, fadeLength);
            }
        }, linger);
    };

    // A roll the master asked, as the engine rolled it: its dice land on its numbers.
    useEffect(() => {
        if (requested !== undefined) {
            const title = requested.check ?? requested.notation;
            const member = party.find((candidate) => candidate.name === requested.who) ?? party.find((candidate) => candidate.role === "pc");
            void throwAndShow({
                free: false,
                title,
                ...(title === requested.notation ? {} : { notation: requested.notation }),
                dice: requested.dice,
                modifier: notationModifier(requested.notation),
                total: requested.total,
                text: requested.text,
                ...(member === undefined ? {} : { member }),
                roll: requested.id,
            }, lingers.asked);
        }
    }, [requested?.id]);

    // A number of the sheet, rolled for fun: its dice and its number, which counts for nothing (D-280).
    useEffect(() => {
        if (sheetThrow !== undefined) {
            const { roll, label } = sheetThrow;
            const dice = roll.dice.map((sides): ThrownDie => ({ sides, value: fairDie(sides) }));
            const total = dice.reduce((sum, die) => sum + die.value, roll.modifier);
            void throwAndShow({ free: true, title: label, notation: roll.notation, dice, modifier: roll.modifier, total, text: diceText(dice, roll.modifier) }, lingers.free);
        }
    }, [sheetThrow?.number]);

    const throwPool = (): void => {
        // A free throw: the page decides it, as fairly as the browser can. The tray closes, so as to leave the dice in sight; it keeps them for the next.
        const dice = pool.map((sides): ThrownDie => ({ sides, value: fairDie(sides) }));
        setOpen(false);
        const total = dice.reduce((sum, die) => sum + die.value, modifier);
        void throwAndShow({ free: true, title: notation(pool, modifier), dice, modifier, total, text: diceText(dice, modifier) }, lingers.free);
    };

    const toggleSound = (): void => {
        setSound(!sound);
        writeSound(!sound);
    };

    // One die of a kind less; when none is left, the focus goes to the die itself, as its minus goes away.
    const less = (sides: number): void => {
        const at = pool.lastIndexOf(sides);
        setPool(pool.filter((_, index) => index !== at));

        if (pool.filter((chosen) => chosen === sides).length === 1) {
            tray.current?.querySelector<HTMLElement>(`[data-sides="${sides}"]`)?.focus();
        }
    };

    const clear = (): void => {
        setPool([]);
        setModifier(0);
        button.current?.focus();
    };

    // The button opens the tray; open, it closes it while no die is chosen, and throws the dice chosen.
    const press = (): void => {
        if (!open) {
            setOpen(true);
        } else if (pool.length === 0) {
            setOpen(false);
        } else if (!rolling) {
            throwPool();
        }
    };

    const chosen = open && pool.length > 0;
    return (
        <>
            <canvas ref={canvas} class={fading ? "dice-stage fading" : "dice-stage"} aria-hidden="true" />
            <div
                ref={shownPlate}
                class={["dice-result", plate?.free ? "free" : "", plate?.shown && !fading ? "shown" : "", plate?.rare === undefined ? "" : plate.rare.face].filter((name) => name !== "").join(" ")}
                role="status"
                aria-live="polite"
            >
                {plate?.shown && <PlateContent plate={plate} />}
            </div>
            {open && <div class="tray-scrim" aria-hidden="true" />}
            <div ref={controls} class="dice-controls">
                {open && (
                    <div ref={tray} class="dice-tray" role="group" aria-label="Free roll: it counts for nothing">
                        <p class="tray-note">
                            Free roll · not logged
                            <button type="button" class="icon-button" aria-label="Dice sound" aria-pressed={sound} data-tip={sound ? "Sound: on" : "Sound: off"} onClick={toggleSound}>
                                <Icon name={sound ? "soundOn" : "soundOff"} />
                            </button>
                        </p>
                        <ul class="tray-dice">
                            {freeDice.map((sides) => {
                                const count = pool.filter((one) => one === sides).length;
                                return (
                                    <li key={sides} class={count > 0 ? "chosen" : undefined}>
                                        {count > 0 && (
                                            <button key="less" type="button" class="tray-less" aria-label={`One ${dieName(sides)} less`} data-tip="One less" onClick={() => less(sides)}>
                                                <Icon name="minus" />
                                            </button>
                                        )}
                                        <button
                                            key="die"
                                            type="button"
                                            class="tray-die"
                                            data-sides={sides}
                                            disabled={pool.length >= mostDice}
                                            aria-label={`Add a ${dieName(sides)}${count > 0 ? `: ${count} chosen` : ""}`}
                                            onClick={() => setPool([...pool, sides])}
                                        >
                                            <span class="tray-die-name">
                                                {count > 0 && <span class="tray-count">{count}</span>}
                                                {dieName(sides)}
                                            </span>
                                            <DieIcon sides={sides} />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        <div class="tray-modifier">
                            <button type="button" aria-label="Modifier: one less" data-tip="−1" onClick={() => setModifier(modifier - 1)}>
                                <Icon name="minus" />
                            </button>
                            <span class="tray-modifier-value">
                                <span class="tray-modifier-label">Mod</span>
                                <output aria-live="polite">{signed(modifier)}</output>
                            </span>
                            <button type="button" aria-label="Modifier: one more" data-tip="+1" onClick={() => setModifier(modifier + 1)}>
                                <Icon name="plus" />
                            </button>
                        </div>
                    </div>
                )}
                <div class="dice-fab">
                    {open && (pool.length > 0 || modifier !== 0) && (
                        <button type="button" class="icon-button tonal" aria-label="Clear the dice" data-tip="Clear" onClick={clear}>
                            <Icon name="clear" />
                        </button>
                    )}
                    <button
                        type="button"
                        ref={button}
                        class={chosen ? "dice-button extended" : "dice-button tip-left"}
                        aria-expanded={open}
                        aria-disabled={chosen && rolling}
                        {...(chosen ? {} : { "aria-label": open ? "Close the free roll" : "Free roll", "data-tip": open ? "Close" : "Free roll" })}
                        onClick={press}
                    >
                        {open && !chosen ? <Icon name="close" /> : <DieIcon sides={20} />}
                        {chosen && (
                            <span>
                                Roll <span class="notation">{notation(pool, modifier)}</span>
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}

/** What the plate says: whose roll and which, the dice one by one with the modifier, the total large, a rare face's words, and for a screen reader the chat's text. */
function PlateContent({ plate }: { plate: Plate; })
{
    return (
        <>
            <div class="plate-head">
                {plate.member && <Token member={plate.member} />}
                <span class="plate-what">
                    <span class="plate-title">{plate.title}</span>
                    {(plate.notation !== undefined || plate.free) && (
                        <span class="plate-under">
                            {plate.notation !== undefined && <span class="plate-notation">{shownText(plate.notation)}</span>}
                            {plate.free && <span class="plate-tag">Free roll · not logged</span>}
                        </span>
                    )}
                </span>
            </div>
            <ol class="plate-dice" aria-hidden="true">
                {plate.dice.map((die, index) => <PlateDie key={index} die={die} />)}
                {plate.modifier !== 0 && <li class="plate-modifier">{signed(plate.modifier)}</li>}
            </ol>
            <span class="plate-total num">{shownText(String(plate.total))}</span>
            {plate.rare && <p class="plate-rare">{plate.rare.words}</p>}
            <span class="visually-hidden">{plate.free ? `${plate.text}, free roll, not logged` : plate.text}</span>
        </>
    );
}

/** A die of the plate: its picture and its face, empty when dropped; a reroll's first face struck out, an explosion's faces added, a dF as −, 0 or +. */
function PlateDie({ die }: { die: ThrownDie; })
{
    const rare = rareFace(die);
    const faces = die.faces !== undefined && die.faces.length > 1 ? die.faces.map((value) => faceText(die.sides, value)).join("+") : faceText(die.sides, die.value);
    return (
        <li class={["plate-die", die.dropped === true ? "dropped" : "", rare === undefined ? "" : `rare-${rare}`].filter((name) => name !== "").join(" ")}>
            <DieIcon sides={die.sides} />
            <span>
                {die.rerolledFrom !== undefined && (
                    <>
                        <s>{faceText(die.sides, die.rerolledFrom)}</s>→
                    </>
                )}
                {faces}
            </span>
        </li>
    );
}

/** The rare face of the dice that count, the highest first, with its words: natural 20, natural 1 (D-281). */
function rareOf(dice: ThrownDie[]): Pick<Plate, "rare">
{
    const rare = dice.flatMap((die) => {
        const face = rareFace(die);
        return face === undefined ? [] : [{ face, words: `natural ${face === "highest" ? die.value : 1}` }];
    }).sort((first, second) => (first.face === second.face ? 0 : first.face === "highest" ? -1 : 1))[0];
    return rare === undefined ? {} : { rare };
}

/** Whether an element is in sight in the window: drawn, as it is not in a closed card, and all of it within the window. */
function inSight(element: Element): boolean
{
    const box = element.getBoundingClientRect();
    return box.height > 0 && box.top >= 0 && box.bottom <= window.innerHeight;
}

/** Flies the plate into a line of the rolls, small, and lights the line as it lands; then what comes after. */
function flyInto(plate: HTMLElement, row: Element, then: () => void): void
{
    const from = plate.getBoundingClientRect();
    const to = row.getBoundingClientRect();
    const across = to.left + to.width / 2 - (from.left + from.width / 2);
    const down = to.top + to.height / 2 - (from.top + from.height / 2);
    plate.style.transition = "transform var(--flight) var(--ease), opacity var(--flight) var(--ease-in)";
    plate.style.transform = `translate(calc(-50% + ${across}px), ${down}px) scale(${Math.min(1, to.height / from.height)})`;
    plate.style.opacity = "0.25";
    window.setTimeout(() => {
        plate.style.visibility = "hidden";
        row.classList.add("arrived");
        window.setTimeout(() => row.classList.remove("arrived"), 900);
        then();
        // Once gone, the plate takes back its own place, unseen.
        requestAnimationFrame(() => {
            plate.style.transition = "";
            plate.style.transform = "";
            plate.style.opacity = "";
            plate.style.visibility = "";
        });
    }, flight);
}

/** The number added at the end of a notation, as the 5 of 2d20kh1+5; none, 0. */
function notationModifier(notation: string): number
{
    const match = /([+-]\d+)$/.exec(notation.replace(/\s+/g, ""));
    return match === null ? 0 : Number(match[1]);
}

/** A face as the plate shows it: a number, or a dF's −, 0 and +. */
function faceText(sides: number | "F", value: number): string
{
    return sides === "F" ? (value < 0 ? "−" : value > 0 ? "+" : "0") : String(value);
}

/** A die's name, as the tray shows it: d20, and d% for the percentile. */
function dieName(sides: number): string
{
    return sides === 100 ? "d%" : `d${sides}`;
}

/** The dice chosen as a notation, the biggest first, with the modifier: 2d20+1d6+3. */
function notation(pool: number[], modifier: number): string
{
    const kinds = [...new Set(pool)].sort((first, second) => second - first);
    const dice = kinds.map((sides) => `${pool.filter((chosen) => chosen === sides).length}${dieName(sides)}`).join("+");
    return modifier === 0 ? dice : `${dice}${signed(modifier)}`;
}

/** The dice thrown as the chat writes them: each kind's faces in brackets, the biggest first, then the modifier. */
function diceText(dice: ThrownDie[], modifier: number): string
{
    const kinds = [...new Set(dice.map((die) => die.sides))].sort((first, second) => Number(second) - Number(first));
    const faces = kinds.map((sides) => `[${dice.filter((die) => die.sides === sides).map((die) => die.value).join(", ")}]`).join(" + ");
    return modifier === 0 ? faces : `${faces} ${modifier > 0 ? "+" : "−"} ${Math.abs(modifier)}`;
}

function signed(value: number): string
{
    return value < 0 ? `−${-value}` : `+${value}`;
}

/** A die's face, as fairly as the browser can: a random number of the system's, without the bias of a remainder. */
function fairDie(sides: number): number
{
    const limit = Math.floor(0x1_0000_0000 / sides) * sides;
    const draw = new Uint32Array(1);

    do {
        crypto.getRandomValues(draw);
    } while (draw[0] >= limit);

    return 1 + (draw[0] % sides);
}

function readSound(): boolean
{
    try {
        return localStorage.getItem(soundKey) !== "off";
    } catch {
        return true;
    }
}

function writeSound(on: boolean): void
{
    try {
        localStorage.setItem(soundKey, on ? "on" : "off");
    } catch {
        // The page forgets it at the next reload.
    }
}
