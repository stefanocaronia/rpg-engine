// The roads of the world as a graph (ROA-4) and the quickest way across them (TRV-4). Knows no page and no game: stops are names, lengths are metres.

/** A stretch of a road between two stops next to each other: the road, its place in the road, its ends in the road's order and its length in metres. */
export interface Stretch
{
    road: string;
    index: number;
    from: string;
    to: string;
    length: number;
}

/** A step of a way along a stretch, forward (from its from to its to) or back, over `length` metres: all of it, but where a way starts halfway along it. */
export interface Step
{
    stretch: Stretch;
    forward: boolean;
    length: number;
}

/** Where a way starts: at a stop, or on a stretch, `done` metres after its from. */
export type Start = { stop: string; } | { stretch: Stretch; done: number; };

/** A way: its steps in order, how long it takes and how long it is. */
export interface Way
{
    steps: Step[];
    minutes: number;
    length: number;
}

/** How many metres a minute along a stretch in a direction; undefined where one cannot go. */
export type Speed = (stretch: Stretch, forward: boolean) => number | undefined;

/** The stretches of a road from its stops, in order, and the lengths between them (ROA-1). */
export function stretchesOf(road: string, stops: string[], lengths: number[]): Stretch[]
{
    return lengths.map((length, index) => ({ road, index, from: stops[index], to: stops[index + 1], length }));
}

/**
 * The quickest way from a start to a stop (TRV-4): the least time, then the least length, then the first by the order of the stretches; a way from the goal
 * itself has no steps. Undefined when no way leads there.
 */
export function quickestWay(stretches: Stretch[], start: Start, goal: string, speed: Speed): Way | undefined
{
    const order = new Map(stretches.map((stretch, position) => [stretch, position]));
    const labels = new Map<string, Label>();
    const settled = new Set<string>();

    const offer = (stop: string, label: Label): void => {
        const known = labels.get(stop);

        if (!settled.has(stop) && (known === undefined || before(label, known))) {
            labels.set(stop, label);
        }
    };

    for (const [stop, label] of startLabels(start, speed, order)) {
        offer(stop, label);
    }

    for (;;) {
        const next = [...labels].filter(([stop]) => !settled.has(stop)).reduce<[string, Label] | undefined>((best, entry) => (best === undefined || before(entry[1], best[1]) ? entry : best), undefined);

        if (next === undefined) {
            return undefined;
        }

        const [stop, label] = next;

        if (stop === goal) {
            return { steps: label.steps, minutes: label.minutes, length: label.length };
        }

        settled.add(stop);

        for (const stretch of stretches) {
            for (const forward of [true, false]) {
                if ((forward ? stretch.from : stretch.to) === stop) {
                    const step = stepAlong(stretch, forward, stretch.length, speed, order);

                    if (step !== undefined) {
                        offer(forward ? stretch.to : stretch.from, extended(label, step));
                    }
                }
            }
        }
    }
}

/** What reaches a stop: the steps, their time and length, and the order of their stretches, which decides between ways as quick and as long. */
interface Label
{
    steps: Step[];
    minutes: number;
    length: number;
    keys: number[];
}

// Times and lengths that differ by less than this are the same: sums of fractions are not exact.
const tolerance = 1e-9;

function startLabels(start: Start, speed: Speed, order: Map<Stretch, number>): [string, Label][]
{
    if ("stop" in start) {
        return [[start.stop, { steps: [], minutes: 0, length: 0, keys: [] }]];
    }

    const { stretch, done } = start;
    const ends: [string, boolean, number][] = [[stretch.to, true, stretch.length - done], [stretch.from, false, done]];
    return ends.flatMap(([stop, forward, length]) => {
        if (length <= 0) {
            return [[stop, { steps: [], minutes: 0, length: 0, keys: [] }]];
        }

        const step = stepAlong(stretch, forward, length, speed, order);
        return step === undefined ? [] : [[stop, extended({ steps: [], minutes: 0, length: 0, keys: [] }, step)]];
    });
}

function stepAlong(stretch: Stretch, forward: boolean, length: number, speed: Speed, order: Map<Stretch, number>): { step: Step; minutes: number; key: number; } | undefined
{
    const metresAMinute = speed(stretch, forward);
    return metresAMinute === undefined || metresAMinute <= 0 ? undefined : { step: { stretch, forward, length }, minutes: length / metresAMinute, key: (order.get(stretch) ?? 0) * 2 + (forward ? 0 : 1) };
}

function extended(label: Label, { step, minutes, key }: { step: Step; minutes: number; key: number; }): Label
{
    return { steps: [...label.steps, step], minutes: label.minutes + minutes, length: label.length + step.length, keys: [...label.keys, key] };
}

/** Whether a label comes before another: quicker, then shorter, then first by the order of its stretches. */
function before(label: Label, other: Label): boolean
{
    if (Math.abs(label.minutes - other.minutes) > tolerance * Math.max(1, other.minutes)) {
        return label.minutes < other.minutes;
    }

    if (Math.abs(label.length - other.length) > tolerance * Math.max(1, other.length)) {
        return label.length < other.length;
    }

    const differs = label.keys.findIndex((key, index) => key !== other.keys[index]);
    return differs === -1 ? label.keys.length < other.keys.length : other.keys[differs] === undefined ? false : label.keys[differs] < other.keys[differs];
}
