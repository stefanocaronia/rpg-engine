// The dice thrown on the page (D-278): the models loaded once, the stage, and each throw: all the dice together, then again those rerolled or exploded, past
// those that lie still; each shown turned by one of its symmetries so that it lands on its value, with its knocks. The tray loads it, with three.js and
// Rapier, at its first throw.
import { readChoice } from "../prefs.ts";
import { loadDice } from "./load.ts";
import { combine, type DieModel, type DieThrow, landingTurn, symmetries } from "./models.ts";
import { diceEdgesPref } from "./sets.ts";
import { knock } from "./sounds.ts";
import { makeStage, type Pose } from "./stage.ts";
import { type Frame, loadPhysics, type Lying, type Throw, throwDice } from "./throw.ts";

// How long the face before a reroll stays in sight, in milliseconds.
const beforeReroll = 300;
// How many frames late a knock may still sound.
const lateKnock = 4;

/** How a throw is shown: at once, with reduced motion; with its sound or not; cut short when the tray says so; and stopped by a newer throw. */
export interface Showing
{
    instant: boolean;
    sound: boolean;
    skipping(): boolean;
    current(): boolean;
}

/** The dice of the page: the kinds it has, a throw shown landing on the values given, true when it ended and false when a newer throw stopped it. */
export interface Roller
{
    kinds: ReadonlySet<string>;
    roll(dice: DieThrow[], showing: Showing): Promise<boolean>;
    /** Leaves the window's foot, this many pixels tall, to the plate of the next throws, and its head to the page's header: no die lies under them (D-366). */
    cover(foot: number, head: number): void;
    hide(): void;
    resize(): void;
}

/** Loads the dice and their physics and makes the stage on the canvas; throws when the browser has no WebGL, or cannot run the physics' WebAssembly. */
export async function makeRoller(canvas: HTMLCanvasElement): Promise<Roller>
{
    const [loaded] = await Promise.all([loadDice(readChoice(diceEdgesPref)), loadPhysics()]);
    const stage = makeStage(canvas);
    const turns = new Map([...loaded.models].map(([kind, model]) => [kind, symmetries(model.shape)]));
    const model = (die: DieThrow): DieModel => loaded.models.get(die.kind) as DieModel;

    return {
        kinds: new Set(loaded.models.keys()),
        async roll(dice, showing)
        {
            // The edges chosen in Settings, rounded or sharp (D-354).
            stage.place(dice.map((die) => die.kind), await loaded.looks(readChoice(diceEdgesPref)));
            const poses: (Pose | undefined)[] = dice.map(() => undefined);
            const lying: (Frame | undefined)[] = dice.map(() => undefined);
            const throws = Math.max(0, ...dice.map((die) => die.values.length));

            for (let round = 0; round < throws; round++) {
                const rolling = dice.flatMap((die, index) => (die.values.length > round ? [index] : []));
                const lyingDice = dice.flatMap((die, index): Lying[] => {
                    const frame = lying[index];
                    return frame === undefined || rolling.includes(index) ? [] : [{ shape: model(die).shape, frame }];
                });
                const thrown = throwDice(rolling.map((index) => model(dice[index]).shape), stage.tray, Math.random, lyingDice);
                const last = thrown.frames.at(-1) ?? [];
                const landing = rolling.map((index, at) => landingTurn(model(dice[index]), turns.get(dice[index].kind) ?? [], last[at].quaternion, dice[index].values[round]));
                // A die stops as it fell, its number at whatever angle (D-285).
                const ended = await play(thrown, (frame) => {
                    rolling.forEach((index, at) => {
                        poses[index] = { position: frame[at].position, quaternion: combine(frame[at].quaternion, landing[at]) };
                    });
                    stage.show(poses);
                }, showing);

                if (!ended) {
                    return false;
                }

                rolling.forEach((index, at) => {
                    lying[index] = last[at];
                });

                // The face before a reroll stays in sight a moment.
                if (round + 1 < throws && !showing.instant && !showing.skipping()) {
                    await new Promise((done) => setTimeout(done, beforeReroll));
                }
            }

            const instant = showing.instant || showing.skipping();
            // A die that does not count burns away, or fades with reduced motion (D-358).
            dice.forEach((die, index) => die.dropped && stage.dim(index, showing.instant));
            // A rare face is celebrated, still when the throw was shown at once or cut short; at most 80 sparks or puffs in all, fewer on a phone.
            const rares = dice.filter((die) => die.rare !== undefined).length;
            const particles = Math.min(matchMedia("(max-width: 600px)").matches ? 24 : 40, Math.floor(80 / Math.max(1, rares)));
            dice.forEach((die, index) => die.rare !== undefined && stage.celebrate(index, die.rare, { instant, particles }));
            return true;
        },
        cover: (foot, head) => stage.cover(foot, head),
        hide: () => stage.hide(),
        resize: () => stage.resize(),
    };
}

/** Shows a throw's frames, sixty to a second, with its knocks; its last frame alone with reduced motion; its end at once when the tray cuts it short. */
function play(thrown: Throw, show: (frame: Frame[]) => void, showing: Showing): Promise<boolean>
{
    const frames = showing.instant ? thrown.frames.slice(-1) : thrown.frames;
    const started = performance.now();
    let heard = 0;

    return new Promise((done) => {
        const step = (now: number): void => {
            if (!showing.current()) {
                done(false);
                return;
            }

            // The first frame of the animation may begin a moment before the throw did.
            const at = showing.skipping() ? frames.length - 1 : Math.min(frames.length - 1, Math.max(0, Math.floor((now - started) / (1000 / 60))));
            show(frames[at]);

            // The knocks up to this frame: none when the throw is shown at once or cut short, nor those left behind when the page stalled a moment, which would
            // sound late, all together, the dice already still.
            while (heard < thrown.knocks.length && thrown.knocks[heard].frame <= at) {
                if (showing.sound && !showing.instant && !showing.skipping() && at - thrown.knocks[heard].frame <= lateKnock) {
                    knock(thrown.knocks[heard].strength, thrown.knocks[heard].onDie);
                }

                heard++;
            }

            if (at < frames.length - 1) {
                requestAnimationFrame(step);
            } else {
                done(true);
            }
        };

        requestAnimationFrame(step);
    });
}
