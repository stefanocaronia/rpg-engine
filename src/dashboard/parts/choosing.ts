// Moving among the values of a choice with the keys, where some cannot be chosen now.

/** The next value that can be chosen from one, a step forward or back, round the ends; none when no other can. */
export function nextOn(options: { off?: boolean; }[], from: number, step: number): number | undefined
{
    for (let count = 1; count < options.length; count++) {
        const next = (((from + step * count) % options.length) + options.length) % options.length;

        if (options[next].off !== true) {
            return next;
        }
    }

    return undefined;
}
