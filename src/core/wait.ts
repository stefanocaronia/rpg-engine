// A look repeated until it finds what it looks for or its time is up, as a process does that waits for another one to answer.

/** How long to look, how often, and the clock and the wait between looks, which the tests give. */
export interface Looking
{
    /** How long to look, in ms. */
    within: number;
    /** How long between looks, in ms. */
    every: number;
    now?: (() => number) | undefined;
    wait?: ((milliseconds: number) => Promise<void>) | undefined;
}

/** What `look` found, looked for every `looking.every` ms; what `late` says once `looking.within` ms passed and it found nothing. */
export async function lookUntil<Found, Late = Found>(look: () => Promise<Found | undefined>, late: () => Late, looking: Looking): Promise<Found | Late>
{
    const now = looking.now ?? Date.now;
    const wait = looking.wait ?? pauseFor;
    const deadline = now() + looking.within;

    for (;;) {
        const found = await look();

        if (found !== undefined) {
            return found;
        }

        if (now() >= deadline) {
            return late();
        }

        await wait(looking.every);
    }
}

/** A pause of `milliseconds`. */
export function pauseFor(milliseconds: number): Promise<void>
{
    return new Promise((done) => setTimeout(done, milliseconds));
}
