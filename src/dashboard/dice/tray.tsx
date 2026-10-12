// The dice tray (D-278, D-279, D-284): the dice of a roll the master asked land on the numbers the engine rolled, and a plate says the check, each die and the
// total. The player can also always throw dice from the column of dice over the button, as many as they like and a modifier: dice that make a check the master
// asks answer it, and the engine rolls it (D-330); any other throw is free, the engine does not hear of it, the dice fade away and its line stays in this
// browser's rolls alone. With two dice or more of a kind, which count: all, the highest one or the lowest one (D-337, D-397). The dice show as pictures, never as their
// notation. The dice and their physics load at the first throw.
import { useEffect, useRef, useState } from "preact/hooks";
import type { Member, SheetRoll, ShownRoll, ThrownDie } from "../data.ts";
import { DiceFaces } from "../faces.tsx";
import type { PageRoll } from "../free-rolls.ts";
import { DieIcon, Icon } from "../icons.tsx";
import { notationModifier, shownText, signed } from "../labels.ts";
import { Token } from "../party.tsx";
import { soundPref, useChoice, usePref } from "../prefs.ts";
import { trayCheck, useRequested } from "../requested.ts";
import { arrowStep, t } from "../text.ts";
import { diceToThrow, type RareFace, rareFace } from "./models.ts";
import { diceText, dieName, type Keep, keptOf, notation, trayDice, withDropped } from "./pool.ts";
import type { Roller } from "./roller.ts";
import { diceEdgesPref, diceSetPref } from "./sets.ts";
import { wakeSound } from "./sounds.ts";

// After a throw, how long the dice stay before they fade: a roll the master asked stays longer, to be read, then flies into its line of the rolls.
const lingers = { free: 3200, asked: 4200 };
// As --long and --flight in the style sheet.
const fadeLength = 600;
const flight = 450;

// At most so many dice at once, which the page throws in a moment.
const mostDice = 20;

// The choices of what counts, as the tray says them.
const keepModes = ["sum", "highest", "lowest"] as const;

/** A number of the sheet rolled for fun from its explanation (D-280): the roll, the number's label, whose sheet it is, and which throw it is. */
export interface SheetThrow
{
    number: number;
    roll: SheetRoll;
    label: string;
    who?: string;
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
    /** Whose sheet a free roll of a number is from. */
    who?: string;
}

export function DiceTray({ requested, sheetThrow, party, onShown, onFree }: {
    requested?: ShownRoll;
    sheetThrow?: SheetThrow;
    party: Member[];
    onShown?: (roll: string) => void;
    onFree?: (roll: PageRoll) => void;
})
{
    const asked = useRequested();
    const canvas = useRef<HTMLCanvasElement>(null);
    const shownPlate = useRef<HTMLDivElement>(null);
    const measuredPlate = useRef<HTMLDivElement>(null);
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
    const [keeps, setKeeps] = useState<Partial<Record<number, Keep>>>({});
    const [modifier, setModifier] = useState(0);
    const [sound, setSound] = usePref(soundPref);
    const [diceSet] = useChoice(diceSetPref);
    const [edges] = useChoice(diceEdgesPref);
    const shownSet = useRef(`${diceSet} ${edges}`);

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
        // The plate is measured, unseen, before the dice fly: they land above it, however many rows its dice take (D-366).
        await new Promise((painted) => requestAnimationFrame(painted));
        const plateTop = measuredPlate.current?.getBoundingClientRect().top;

        if (plateTop !== undefined && plateTop > 0) {
            loaded?.cover(window.innerHeight - plateTop);
        }

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

            // The roll's line comes into the rolls only now, as its dice go (D-300); a free throw's into this browser's rolls (D-330 (4)). The plate waits for
            // its place to open, then flies into it, wherever the rolls are, out of the window on a phone; into the rolls' title when their card is closed, or
            // their tab when they are put away (D-281, D-303, D-366). It fades with reduced motion.
            if (shown.roll !== undefined) {
                onShown?.(shown.roll);
            }

            const free = shown.free ? pageRoll(shown, number) : undefined;

            if (free !== undefined) {
                onFree?.(free);
            }

            const line = shown.roll ?? free?.id;
            const flies = line !== undefined && matchMedia("(prefers-reduced-motion: no-preference)").matches;

            window.setTimeout(() => {
                if (!current()) {
                    return;
                }

                const row = [line === undefined ? null : document.querySelector(`[data-roll="${CSS.escape(line)}"]`), document.querySelector(".rolls-card > summary"), document.querySelector(".rolls-tab")]
                    .find((target) => target !== null && target.getBoundingClientRect().height > 0);
                setFading(true);

                if (flies && row !== undefined && row !== null && shownPlate.current !== null) {
                    flyInto(shownPlate.current, row, done);
                } else {
                    window.setTimeout(done, fadeLength);
                }
            }, flies ? flight : 0);
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

    // A set of dice or their edges chosen in Settings: a d20 of them rolls, to be seen, with no plate and no line in the rolls, then goes (D-352, D-354).
    useEffect(() => {
        if (`${diceSet} ${edges}` === shownSet.current) {
            return;
        }

        shownSet.current = `${diceSet} ${edges}`;
        const number = ++throwing.current;
        const current = (): boolean => number === throwing.current;
        skipping.current = false;
        setPlate(undefined);
        setRolling(false);
        void loadRoller().then(async (loaded) => {
            const showing = { instant: matchMedia("(prefers-reduced-motion: reduce)").matches, sound, skipping: () => skipping.current, current };

            if (await loaded?.roll([{ kind: "d20", values: [fairDie(20)], dropped: false }], showing) === true) {
                window.setTimeout(() => current() && loaded?.hide(), lingers.free);
            }
        });
    }, [diceSet, edges]);

    // A number of the sheet, rolled for fun: its dice and its number, which counts for nothing (D-280).
    useEffect(() => {
        if (sheetThrow !== undefined) {
            const { roll, label, who } = sheetThrow;
            const dice = roll.dice.map((sides): ThrownDie => ({ sides, value: fairDie(sides) }));
            const total = dice.reduce((sum, die) => sum + die.value, roll.modifier);
            void throwAndShow(
                { free: true, title: label, notation: roll.notation, dice, modifier: roll.modifier, total, text: diceText(dice, roll.modifier), ...(who === undefined ? {} : { who }) },
                lingers.free,
            );
        }
    }, [sheetThrow?.number]);

    // Only the kinds with two dice or more keep a choice of which count.
    const shownKeeps = keptOf(pool, keeps);
    // The check the master asks whose dice and number the tray's dice are, when one alone is (D-330).
    const answering = pool.length === 0 ? undefined : asked?.checks.find((check) => check.index === trayCheck(asked, notation(pool, modifier, shownKeeps)));

    const throwPool = (): void => {
        // Dice that make a check the master asks answer it: the engine rolls it, and its dice land as for its button. The tray closes, keeping its dice for the
        // next throw until the player clears them (D-405).
        setOpen(false);

        if (answering !== undefined) {
            asked?.answer(answering.index);
            return;
        }

        // A free throw: the page decides it, as fairly as the browser can, leaving the dice in sight.
        const dice = withDropped(pool.map((sides): ThrownDie => ({ sides, value: fairDie(sides) })), shownKeeps);
        const total = dice.reduce((sum, die) => sum + (die.dropped === true ? 0 : die.value), modifier);
        void throwAndShow({ free: true, title: t("Dice"), notation: notation(pool, modifier, shownKeeps), dice, modifier, total, text: diceText(dice, modifier) }, lingers.free);
    };

    const toggleSound = (): void => {
        setSound(!sound);
    };

    // One die of a kind less; when none is left, the focus goes to the die itself, as its minus goes away.
    const less = (sides: number): void => {
        const at = pool.lastIndexOf(sides);
        setPool(pool.filter((_, index) => index !== at));

        if (pool.filter((chosen) => chosen === sides).length === 1) {
            tray.current?.querySelector<HTMLElement>(`[data-sides="${sides}"]`)?.focus();
        }
    };

    // The arrows choose among what counts, the focus going with the choice, as in a radio group.
    const moveKeep = (event: KeyboardEvent, sides: number): void => {
        const step = arrowStep(event.key);

        if (step === 0) {
            return;
        }

        event.preventDefault();
        const next = keepModes[(keepModes.indexOf(shownKeeps[sides] ?? "sum") + step + keepModes.length) % keepModes.length];
        setKeeps({ ...keeps, [sides]: next === "sum" ? undefined : next });
        const buttons = (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("button");
        buttons[keepModes.indexOf(next)]?.focus();
    };

    const clear = (): void => {
        setPool([]);
        setKeeps({});
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
    // The dice kept from the last throw, the tray closed: their throw and their clearing beside its button, a click away (D-410).
    const kept = !open && pool.length > 0;
    // What a throw of the dice chosen says: their pictures, or the check of the master's they answer.
    const rollWords = answering === undefined
        ? (
            <span class="tray-roll">
                {t("Roll")}
                <PoolIcons pool={pool} keeps={shownKeeps} />
                {modifier !== 0 && <span class="notation">{signed(modifier)}</span>}
                <span class="visually-hidden">{notation(pool, modifier, shownKeeps)}</span>
            </span>
        )
        : t("Answer: {check}", { check: answering.check });
    return (
        <>
            <canvas ref={canvas} class={fading ? "dice-stage fading" : "dice-stage"} aria-hidden="true" />
            <div
                ref={shownPlate}
                class={["dice-result", plate?.free ? "free" : "", plate?.shown && !fading ? "shown" : "", plate?.shown && fading ? "going" : "", plate?.rare === undefined ? "" : plate.rare.face].filter((name) => name !== "").join(" ")}
                role="status"
                aria-live="polite"
            >
                {plate?.shown && <PlateContent plate={plate} />}
            </div>
            <div ref={measuredPlate} class={["dice-result", "measured", plate?.free ? "free" : "", plate?.rare === undefined ? "" : plate.rare.face].filter((name) => name !== "").join(" ")} aria-hidden="true">
                {plate !== undefined && !plate.shown && <PlateContent plate={plate} />}
            </div>
            {open && <div class="tray-scrim" aria-hidden="true" />}
            <div ref={controls} class="dice-controls">
                {open && (
                    <div ref={tray} class="dice-tray" role="group" aria-label={asked === undefined ? t("Free roll: it counts for nothing") : t("Dice: a check the master asks, or a free roll")}>
                        <p class="tray-note">
                            <button type="button" class="icon-button" aria-label={t("Dice sound")} aria-pressed={sound} data-tip={sound ? t("Sound: on") : t("Sound: off")} onClick={toggleSound}>
                                <Icon name={sound ? "soundOn" : "soundOff"} />
                            </button>
                        </p>
                        <ul class="tray-dice">
                            {trayDice.map((sides) => {
                                const count = pool.filter((one) => one === sides).length;
                                return (
                                    <li key={sides} class={count > 0 ? "chosen" : undefined}>
                                        {/* With two dice or more of a kind, which count (D-337), left of its minus. */}
                                        {count >= 2 && sides !== 100 && (
                                            <span class="tray-keep" role="radiogroup" aria-label={t("Of the {die}, which count", { die: dieName(sides) })} onKeyDown={(event) => moveKeep(event, sides)}>
                                                {keepModes.map((mode) => (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        role="radio"
                                                        aria-checked={(shownKeeps[sides] ?? "sum") === mode}
                                                        aria-label={keepWords(mode, dieName(sides))}
                                                        data-tip={keepWords(mode, dieName(sides))}
                                                        tabIndex={(shownKeeps[sides] ?? "sum") === mode ? 0 : -1}
                                                        onClick={() => setKeeps({ ...keeps, [sides]: mode === "sum" ? undefined : mode })}
                                                    >
                                                        {mode === "sum" ? t("All") : mode === "highest" ? t("High") : t("Low")}
                                                    </button>
                                                ))}
                                            </span>
                                        )}
                                        {count > 0 && (
                                            <button key="less" type="button" class="tray-less" aria-label={t("One {die} less", { die: dieName(sides) })} data-tip={t("One less")} onClick={() => less(sides)}>
                                                <Icon name="minus" />
                                            </button>
                                        )}
                                        <button
                                            key="die"
                                            type="button"
                                            class="tray-die"
                                            data-sides={sides}
                                            disabled={pool.length >= mostDice}
                                            aria-label={count > 0 ? t("Add a {die}: {count} chosen", { die: dieName(sides), count }) : t("Add a {die}", { die: dieName(sides) })}
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
                            <button type="button" aria-label={t("Modifier: one less")} data-tip="−1" onClick={() => setModifier(modifier - 1)}>
                                <Icon name="minus" />
                            </button>
                            <span class="tray-modifier-value">
                                <span class="tray-modifier-label">{t("Mod")}</span>
                                <output aria-live="polite">{signed(modifier)}</output>
                            </span>
                            <button type="button" aria-label={t("Modifier: one more")} data-tip="+1" onClick={() => setModifier(modifier + 1)}>
                                <Icon name="plus" />
                            </button>
                        </div>
                    </div>
                )}
                <div class="dice-fab">
                    {(open || kept) && (pool.length > 0 || modifier !== 0) && (
                        <button type="button" class="icon-button tonal" aria-label={t("Clear the dice")} data-tip={t("Clear")} onClick={clear}>
                            <Icon name="clear" />
                        </button>
                    )}
                    {kept && (
                        <button type="button" class="dice-button extended" aria-disabled={rolling} onClick={() => !rolling && throwPool()}>
                            <DieIcon sides={20} />
                            <span>{rollWords}</span>
                        </button>
                    )}
                    <button
                        type="button"
                        ref={button}
                        class={chosen ? "dice-button extended" : "dice-button tip-left"}
                        aria-expanded={open}
                        aria-disabled={chosen && rolling}
                        {...(chosen ? {} : { "aria-label": open ? t("Close the free roll") : t("Free roll"), "data-tip": open ? t("Close") : t("Free roll") })}
                        onClick={press}
                    >
                        {open && !chosen ? <Icon name="close" /> : <DieIcon sides={20} />}
                        {chosen && <span>{rollWords}</span>}
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
                    {/* The dice say themselves as pictures, never as their notation. */}
                    {plate.free && (
                        <span class="plate-under">
                            <span class="plate-tag">Free roll · not logged</span>
                        </span>
                    )}
                </span>
            </div>
            <DiceFaces dice={plate.dice} modifier={plate.modifier} className="plate-dice" />
            <span class="plate-total num">{shownText(String(plate.total))}</span>
            {plate.rare && <p class="plate-rare">{plate.rare.words}</p>}
            <span class="visually-hidden">{plate.free ? t("{dice}, free roll, not logged", { dice: plate.text }) : plate.text}</span>
        </>
    );
}

/** A free throw as this browser's rolls keep it (D-330 (4)): whose sheet it is from, the number's label as its check, its dice and total. */
function pageRoll(plate: Omit<Plate, "shown">, number: number): PageRoll
{
    return {
        id: `free-${Date.now()}-${number}`,
        at: new Date().toISOString(),
        by: "player",
        // A number of the sheet keeps its label as its check; the tray's dice have none.
        ...(plate.who === undefined ? {} : { who: plate.who, check: plate.title }),
        notation: (plate.notation ?? plate.title).replaceAll("−", "-"),
        total: plate.total,
        text: plate.text,
        dice: plate.dice,
        free: true,
    };
}

/** The rare face of the dice that count, the highest first, with its words: natural 20, natural 1 (D-281). */
function rareOf(dice: ThrownDie[]): Pick<Plate, "rare">
{
    const rare = dice.flatMap((die) => {
        const face = rareFace(die);
        return face === undefined ? [] : [{ face, words: t("natural {value}", { value: face === "highest" ? die.value : 1 }) }];
    }).sort((first, second) => (first.face === second.face ? 0 : first.face === "highest" ? -1 : 1))[0];
    return rare === undefined ? {} : { rare };
}

/** Flies the plate into a line of the rolls, small, as the line appears; then what comes after. */
function flyInto(plate: HTMLElement, row: Element, then: () => void): void
{
    const from = plate.getBoundingClientRect();
    const to = row.getBoundingClientRect();
    const across = to.left + to.width / 2 - (from.left + from.width / 2);
    const down = to.top + to.height / 2 - (from.top + from.height / 2);
    // On its way it closes the side it came out of, a card again: its border all round, its corners rounded below (D-374).
    const drawn = getComputedStyle(plate);
    plate.style.transition = ["transform", "border-radius", "border-bottom-width"].map((property) => `${property} var(--flight) var(--ease)`).concat("opacity var(--flight) var(--ease-in)").join(", ");
    plate.style.borderBottom = `${drawn.borderTopWidth} ${drawn.borderTopStyle} ${drawn.borderTopColor}`;
    plate.style.borderRadius = drawn.borderTopLeftRadius;
    plate.style.transform = `translate(calc(var(--plate-x) + ${across}px), ${down}px) scale(${Math.min(1, to.height / from.height)})`;
    plate.style.opacity = "0.25";
    window.setTimeout(() => {
        plate.style.visibility = "hidden";
        then();
        // Once gone, the plate takes back its own place, unseen.
        requestAnimationFrame(() => {
            plate.style.transition = "";
            plate.style.transform = "";
            plate.style.opacity = "";
            plate.style.borderBottom = "";
            plate.style.borderRadius = "";
            plate.style.visibility = "";
        });
    }, flight);
}

/** The dice chosen as pictures, the biggest first: of a kind its die once or twice, the one that may not count faded, or once with how many past two. */
function PoolIcons({ pool, keeps }: { pool: number[]; keeps: Partial<Record<number, Keep>>; })
{
    const kinds = [...new Set(pool)].sort((first, second) => second - first);
    return (
        <>
            {kinds.map((sides) => {
                const count = pool.filter((chosen) => chosen === sides).length;
                return (
                    <span key={sides} class="die-icons">
                        {Array.from({ length: Math.min(count, 2) }, (_, index) => <DieIcon key={index} sides={sides} faded={index === 1 && keeps[sides] !== undefined && count === 2} />)}
                        {count > 2 && <span class="die-more">×{count}</span>}
                    </span>
                );
            })}
        </>
    );
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

/** Which of a kind count, in full, as a screen reader says the short choice and its tooltip shows it (D-396, D-397). */
function keepWords(mode: Keep | "sum", die: string): string
{
    return mode === "sum" ? t("Every {die} counts", { die }) : mode === "highest" ? t("Only the highest {die} counts", { die }) : t("Only the lowest {die} counts", { die });
}
