// The knock of a die (D-278): made by the browser, a short noise through a filter, as loud as the die hit; no sound file. Browsers let a page make sounds only
// after the player's first click.
let audio: AudioContext | undefined;

/** Lets the page make sounds, from a click of the player's. */
export function wakeSound(): void
{
    try {
        audio ??= new AudioContext();
        void audio.resume();
    } catch {
        // No sound in this browser.
    }
}

/** A die's knock on the floor or on another die, as hard as given: softer ones are quieter and duller. */
export function knock(strength: number): void
{
    if (audio === undefined || audio.state !== "running") {
        return;
    }

    const loudness = Math.min(1, strength / 25);
    const samples = Math.floor(audio.sampleRate * 0.06);
    const noise = audio.createBuffer(1, samples, audio.sampleRate);
    const data = noise.getChannelData(0);

    for (let index = 0; index < samples; index++) {
        data[index] = (Math.random() * 2 - 1) * Math.exp(-index / (samples / 7));
    }

    const source = audio.createBufferSource();
    source.buffer = noise;
    const filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400 + loudness * 1800 + Math.random() * 600;
    filter.Q.value = 1.4;
    const gain = audio.createGain();
    gain.gain.value = 0.15 + loudness * 0.55;
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start();
}
