// The dice thrown on the page (D-278): the models loaded once, the stage, and each throw: all the dice together, then again those rerolled or exploded, past
// those that lie still; each shown turned by one of its symmetries so that it lands on its value, with its knocks. The tray loads it, with three.js and
// cannon-es, at its first throw.
import { loadDice } from "./load.ts";
import { aboutVertical, combine, type DieModel, type DieThrow, landingTurn, symmetries, uprightAngle } from "./models.ts";
import { knock } from "./sounds.ts";
import { makeStage, type Pose } from "./stage.ts";
import { type Frame, type Lying, type Throw, throwDice } from "./throw.ts";

// Over how many last frames a die turns its number upright, as it stops; how long the face before a reroll stays in sight, in milliseconds.
const uprightFrames = 20;
const beforeReroll = 300;

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
    hide(): void;
    resize(): void;
}

/** Loads the dice and makes the stage on the canvas; throws when the browser has no WebGL. */
export async function makeRoller(canvas: HTMLCanvasElement): Promise<Roller>
{
    const loaded = await loadDice();
    const stage = makeStage(canvas, loaded.looks);
    const turns = new Map([...loaded.models].map(([kind, model]) => [kind, symmetries(model.shape)]));
    const model = (die: DieThrow): DieModel => loaded.models.get(die.kind) as DieModel;

    return {
        kinds: new Set(loaded.models.keys()),
        async roll(dice, showing)
        {
            stage.place(dice.map((die) => die.kind));
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
                const spins = rolling.map((index, at) => uprightAngle(model(dice[index]), combine(last[at].quaternion, landing[at]), dice[index].values[round]));
                const ended = await play(thrown, (frame, share) => {
                    rolling.forEach((index, at) => {
                        poses[index] = { position: frame[at].position, quaternion: combine(aboutVertical(spins[at] * share), combine(frame[at].quaternion, landing[at])) };
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

            dice.forEach((die, index) => die.dropped && stage.dim(index));
            return true;
        },
        hide: () => stage.hide(),
        resize: () => stage.resize(),
    };
}

/**
 * Shows a throw's frames, sixty to a second, with its knocks; its last frame alone with reduced motion; its end at once when the tray cuts it short. With each
 * frame, how far the dice have turned their numbers upright, from nothing to all over the last frames.
 */
function play(thrown: Throw, show: (frame: Frame[], share: number) => void, showing: Showing): Promise<boolean>
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
            const share = Math.min(1, Math.max(0, 1 - (frames.length - 1 - at) / uprightFrames));
            show(frames[at], share * share * (3 - 2 * share));

            // The knocks up to this frame: none when the throw is shown at once or cut short.
            while (heard < thrown.knocks.length && thrown.knocks[heard].frame <= at) {
                if (showing.sound && !showing.instant && !showing.skipping()) {
                    knock(thrown.knocks[heard].strength);
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
