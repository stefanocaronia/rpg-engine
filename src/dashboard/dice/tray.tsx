// The dice tray (D-278, D-279): the dice of a roll the master asked land on the numbers the engine rolled, and a plate says the check and its total. The player
// can also always throw dice for fun, as many as they like and a modifier: the throw counts for nothing, the engine does not hear of it, and the dice fade
// away. The dice and their physics load at the first throw.
import { useEffect, useRef, useState } from "preact/hooks";
import type { SheetRoll, ShownRoll, ThrownDie } from "../data.ts";
import { diceToThrow, type RareFace, rareFace } from "./models.ts";
import type { Roller } from "./roller.ts";
import { wakeSound } from "./sounds.ts";

// After a throw, how long the dice stay before they fade: a roll the master asked stays longer, to be read, then flies into its line of the rolls.
const lingers = { free: 3200, asked: 4200 };
// As --long and --flight in the style sheet.
const fadeLength = 600;
const flight = 450;

// The dice of the free tray, by their sides: 100 is the d%, thrown as its tens and its units; at most so many at once, which the page throws in a moment.
const freeDice = [4, 6, 8, 10, 12, 20, 100];
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

/** What the plate under the dice says: the check, or the dice of a free throw, its total, and its dice as the chat writes them. */
interface Plate
{
    free: boolean;
    title: string;
    total: number;
    text: string;
    shown: boolean;
    /** The roll of the log it shows, whose line of the rolls it flies into. */
    roll?: string;
    /** The rare face of a die that counts, and its words, as natural 20 (D-281). */
    rare?: { face: RareFace; words: string; };
}

export function DiceTray({ requested, sheetThrow }: { requested?: ShownRoll; sheetThrow?: SheetThrow; })
{
    const canvas = useRef<HTMLCanvasElement>(null);
    const shownPlate = useRef<HTMLParagraphElement>(null);
    const button = useRef<HTMLButtonElement>(null);
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

                if (tray.current?.contains(document.activeElement) === true) {
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

    /** The dice and their stage, loaded once; undefined when the browser cannot draw them, and then the plate comes alone. */
    const loadRoller = (): Promise<Roller | undefined> => {
        const surface = canvas.current;
        roller.current ??= surface === null ? Promise.resolve(undefined) : import("./roller.ts").then((module) => module.makeRoller(surface)).catch(() => undefined);
        return roller.current;
    };

    /** Throws these dice, each landing on its value, then shows the plate, and fades it all after a while; the plate alone when the dice cannot be thrown. */
    const throwAndShow = async (dice: ThrownDie[], given: Omit<Plate, "shown" | "rare">, linger: number): Promise<void> => {
        const shown = { ...given, ...rareOf(dice) };
        const number = ++throwing.current;
        const current = (): boolean => number === throwing.current;
        skipping.current = false;
        setFading(false);
        setRolling(true);
        setPlate({ ...shown, shown: false });
        const loaded = await loadRoller();

        try {
            const toThrow = loaded === undefined ? [] : diceToThrow(dice, loaded.kinds);

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
            void throwAndShow(requested.dice, { free: false, title: requested.check ?? requested.notation, total: requested.total, text: requested.text, roll: requested.id }, lingers.asked);
        }
    }, [requested?.id]);

    // A number of the sheet, rolled for fun: its dice and its number, which counts for nothing (D-280).
    useEffect(() => {
        if (sheetThrow !== undefined) {
            const { roll, label } = sheetThrow;
            const dice = roll.dice.map((sides): ThrownDie => ({ sides, value: fairDie(sides) }));
            const total = dice.reduce((sum, die) => sum + die.value, roll.modifier);
            void throwAndShow(dice, { free: true, title: `${label} ${roll.notation}`, total, text: diceText(dice, roll.modifier) }, lingers.free);
        }
    }, [sheetThrow?.number]);

    const throwPool = (): void => {
        // A free throw: the page decides it, as fairly as the browser can. The tray closes, so as to leave the dice in sight; it keeps them for the next.
        const dice = pool.map((sides): ThrownDie => ({ sides, value: fairDie(sides) }));
        setOpen(false);
        const total = dice.reduce((sum, die) => sum + die.value, modifier);
        void throwAndShow(dice, { free: true, title: notation(pool, modifier), total, text: diceText(dice, modifier) }, lingers.free);
    };

    const toggleSound = (): void => {
        setSound(!sound);
        writeSound(!sound);
    };

    const clear = (): void => {
        setPool([]);
        setModifier(0);
    };

    const counts = freeDice.map((sides) => pool.filter((chosen) => chosen === sides).length);
    return (
        <>
            <canvas ref={canvas} class={fading ? "dice-stage fading" : "dice-stage"} aria-hidden="true" />
            <p
                ref={shownPlate}
                class={["dice-result", plate?.free ? "free" : "", plate?.shown && !fading ? "shown" : "", plate?.rare === undefined ? "" : `rare ${plate.rare.face}`].filter((name) => name !== "").join(" ")}
                role="status"
                aria-live="polite"
            >
                {plate?.shown && (
                    <>
                        <span class={plate.free ? "dice-kind notation" : "dice-kind"}>{plate.title}</span> <span class="dice-number">{plate.total}</span>
                        {plate.rare && <span class="dice-rare">{plate.rare.words}</span>}
                        <span class="dice-text">{plate.free ? `${plate.text} · free roll, not logged` : plate.text}</span>
                    </>
                )}
            </p>
            <button type="button" ref={button} class="dice-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Dice for fun">
                <svg viewBox="0 0 32 32" aria-hidden="true">
                    <path d="M16 2 28 9v14l-12 7-12-7V9Z M16 2 9.5 13h13Z M4 9l5.5 4L16 30l6.5-17L28 9 M9.5 13 4 23 M22.5 13 28 23 M4 23h24" />
                </svg>
            </button>
            {open && (
                <div ref={tray} class="dice-tray" role="group" aria-label="Dice for fun: they count for nothing">
                    <div class="dice-pick">
                        {freeDice.map((sides, index) => (
                            <button
                                key={sides}
                                type="button"
                                class="dice-pick-die"
                                disabled={pool.length >= mostDice}
                                onClick={() => setPool([...pool, sides])}
                                aria-label={`Add a ${dieName(sides)}${counts[index] > 0 ? `: ${counts[index]} chosen` : ""}`}
                            >
                                {dieName(sides)}
                                {counts[index] > 0 && <span class="dice-count" aria-hidden="true">{counts[index]}</span>}
                            </button>
                        ))}
                    </div>
                    <div class="dice-modifier">
                        <span>Modifier</span>
                        <button type="button" onClick={() => setModifier(modifier - 1)} aria-label="One less">−</button>
                        <span class="num" aria-live="polite">{signed(modifier)}</span>
                        <button type="button" onClick={() => setModifier(modifier + 1)} aria-label="One more">+</button>
                    </div>
                    <div class="dice-actions">
                        <button type="button" class="dice-roll" disabled={pool.length === 0 || rolling} onClick={throwPool}>
                            {pool.length === 0 ? "Choose the dice" : `Roll ${notation(pool, modifier)}`}
                        </button>
                        <button type="button" class="dice-clear" disabled={pool.length === 0 && modifier === 0} onClick={clear}>Clear</button>
                        <button type="button" class="dice-sound" aria-pressed={sound} onClick={toggleSound}>{sound ? "Sound on" : "Sound off"}</button>
                    </div>
                </div>
            )}
        </>
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

/** Whether an element is in sight in the window. */
function inSight(element: Element): boolean
{
    const box = element.getBoundingClientRect();
    return box.top >= 0 && box.bottom <= window.innerHeight;
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
