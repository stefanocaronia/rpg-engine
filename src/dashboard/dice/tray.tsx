// The dice tray (D-278): the player can always throw a die; a free throw counts for nothing, the engine does not hear of it, and the die fades away after a
// while. The number is decided before the throw, and the die, thrown by the physics, lands on it. The prototype throws a d20.
import { useEffect, useRef, useState } from "preact/hooks";
import { faceNumbers, icosahedron, landingOn } from "./shapes.ts";
import { makeStage, type Stage } from "./stage.ts";
import { throwDie } from "./throw.ts";

// After a free throw, how long the die stays before it fades.
const lingers = 2600;

const d20 = icosahedron();

export function DiceTray()
{
    const canvas = useRef<HTMLCanvasElement>(null);
    const stage = useRef<Stage | null>(null);
    const [result, setResult] = useState<{ number: number; shown: boolean; }>();
    const [rolling, setRolling] = useState(false);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        const onResize = (): void => stage.current?.resize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const roll = (): void => {
        if (rolling || canvas.current === null) {
            return;
        }

        // A free throw: the page decides it, as fairly as the browser can.
        const number = 1 + (crypto.getRandomValues(new Uint32Array(1))[0] % 20);

        try {
            stage.current ??= makeStage(canvas.current, d20, { die: "#f4c84c", numbers: "#192d4d" });
        } catch {
            // No WebGL: the number alone.
            setResult({ number, shown: true });
            return;
        }

        const thrown = throwDie(d20, stage.current.tray);
        const numbers = landingOn(faceNumbers(d20), thrown.face, number);
        const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const frames = still ? thrown.frames.slice(-1) : thrown.frames;
        setRolling(true);
        setFading(false);
        setResult({ number, shown: false });
        const started = performance.now();

        const play = (now: number): void => {
            // The first frame of the animation may begin a moment before the throw did.
            const at = Math.min(frames.length - 1, Math.max(0, Math.floor((now - started) / (1000 / 60))));
            stage.current?.show(frames[at], numbers);

            if (at < frames.length - 1) {
                requestAnimationFrame(play);
                return;
            }

            setRolling(false);
            setResult({ number, shown: true });
            window.setTimeout(() => setFading(true), lingers);
            window.setTimeout(() => {
                stage.current?.hide();
                setResult(undefined);
                setFading(false);
            }, lingers + 600);
        };

        requestAnimationFrame(play);
    };

    return (
        <>
            <canvas ref={canvas} class={fading ? "dice-stage fading" : "dice-stage"} aria-hidden="true" />
            <p class={result?.shown && !fading ? "dice-result shown" : "dice-result"} role="status" aria-live="polite">
                {result?.shown
                    ? (
                        <>
                            <span class="dice-kind">d20</span> <span class="dice-number">{result.number}</span>
                        </>
                    )
                    : ""}
            </p>
            <button type="button" class="dice-button" onClick={roll} disabled={rolling} aria-label="Throw a d20, for fun: it counts for nothing">
                d20
            </button>
        </>
    );
}
