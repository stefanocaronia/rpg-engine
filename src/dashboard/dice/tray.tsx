// The dice tray (D-278, D-279): the dice of a roll the master asked land on the numbers the engine rolled, and a plate says the check and its total. The player
// can also always throw a d20 for fun: it counts for nothing, the engine does not hear of it, and the die fades away after a while.
import { useEffect, useRef, useState } from "preact/hooks";
import type { ShownRoll, ThrownDie } from "../data.ts";
import { faceNumbers, icosahedron, landingOn, type Shape } from "./shapes.ts";
import { makeStage, type Stage } from "./stage.ts";
import { throwDice } from "./throw.ts";

// After a throw, how long the dice stay before they fade: a roll the master asked stays longer, to be read.
const lingers = { free: 2600, asked: 4200 };
const fadeLength = 600;

// The dice the page can draw, by their sides: the prototype has the d20; the others show in the plate alone until the dice of the step come.
const shapes = new Map<ThrownDie["sides"], Shape>([[20, icosahedron()]]);

/** What the plate under the dice says: the check and its total, or the number of a free throw. */
interface Plate
{
    free: boolean;
    title: string;
    total: number;
    text?: string;
    shown: boolean;
}

export function DiceTray({ requested }: { requested?: ShownRoll; })
{
    const canvas = useRef<HTMLCanvasElement>(null);
    const stage = useRef<Stage | null>(null);
    const noWebGL = useRef(false);
    // The number of the throw shown now: a newer throw ends an older one's animation and timers.
    const throwing = useRef(0);
    const skipping = useRef(false);
    const [plate, setPlate] = useState<Plate>();
    const [rolling, setRolling] = useState(false);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        const onResize = (): void => stage.current?.resize();

        // Escape lets the dice land at once.
        const onKey = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                skipping.current = true;
            }
        };

        window.addEventListener("resize", onResize);
        window.addEventListener("keydown", onKey);

        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("keydown", onKey);
        };
    }, []);

    /** Throws these dice, each landing on its number, then shows the plate, and fades it all after a while. */
    const throwAndShow = (dice: ThrownDie[], shown: Omit<Plate, "shown">, linger: number): void => {
        const number = ++throwing.current;
        const drawn = dice.filter((die) => shapes.has(die.sides));
        skipping.current = false;
        setFading(false);

        const settle = (): void => {
            setRolling(false);
            setPlate({ ...shown, shown: true });
            window.setTimeout(() => number === throwing.current && setFading(true), linger);
            window.setTimeout(() => {
                if (number === throwing.current) {
                    stage.current?.hide();
                    setPlate(undefined);
                    setFading(false);
                }
            }, linger + fadeLength);
        };

        try {
            stage.current ??= canvas.current === null || drawn.length === 0 || noWebGL.current ? null : makeStage(canvas.current);
        } catch {
            // No WebGL: the plate alone, from now on.
            noWebGL.current = true;
        }

        if (stage.current === null || drawn.length === 0) {
            stage.current?.hide();
            settle();
            return;
        }

        const dieShapes = drawn.map((die) => shapes.get(die.sides) as Shape);
        const thrown = throwDice(dieShapes, stage.current.tray);
        // A die that exploded shows its first face: its next throws come with the dice of the step.
        stage.current.place(drawn.map((die, index) => ({ shape: dieShapes[index], numbers: landingOn(faceNumbers(dieShapes[index]), thrown.faces[index], die.faces?.[0] ?? die.value) })));
        const frames = matchMedia("(prefers-reduced-motion: reduce)").matches ? thrown.frames.slice(-1) : thrown.frames;
        setRolling(true);
        setPlate({ ...shown, shown: false });
        const started = performance.now();

        const play = (now: number): void => {
            if (number !== throwing.current) {
                return;
            }

            // The first frame of the animation may begin a moment before the throw did.
            const at = skipping.current ? frames.length - 1 : Math.min(frames.length - 1, Math.max(0, Math.floor((now - started) / (1000 / 60))));
            stage.current?.show(frames[at]);

            if (at < frames.length - 1) {
                requestAnimationFrame(play);
                return;
            }

            drawn.forEach((die, index) => die.dropped === true && stage.current?.dim(index));
            settle();
        };

        requestAnimationFrame(play);
    };

    // A roll the master asked, as the engine rolled it: its dice land on its numbers.
    useEffect(() => {
        if (requested !== undefined) {
            throwAndShow(requested.dice, { free: false, title: requested.check ?? requested.notation, total: requested.total, text: requested.text }, lingers.asked);
        }
    }, [requested?.id]);

    const throwFree = (): void => {
        // A free throw: the page decides it, as fairly as the browser can.
        const value = 1 + (crypto.getRandomValues(new Uint32Array(1))[0] % 20);
        throwAndShow([{ sides: 20, value }], { free: true, title: "d20", total: value }, lingers.free);
    };

    return (
        <>
            <canvas ref={canvas} class={fading ? "dice-stage fading" : "dice-stage"} aria-hidden="true" />
            <p class={["dice-result", plate?.free ? "free" : "", plate?.shown && !fading ? "shown" : ""].filter((name) => name !== "").join(" ")} role="status" aria-live="polite">
                {plate?.shown && (
                    <>
                        <span class="dice-kind">{plate.title}</span> <span class="dice-number">{plate.total}</span>
                        <span class="dice-text">{plate.free ? "free roll · not logged" : plate.text}</span>
                    </>
                )}
            </p>
            <button type="button" class="dice-button" onClick={throwFree} disabled={rolling} aria-label="Throw a d20, for fun: it counts for nothing">
                d20
            </button>
        </>
    );
}
