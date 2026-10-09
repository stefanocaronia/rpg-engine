// The knock of a die (D-278): made by the browser, a short noise through a filter with a short tone beneath it, as loud as the die hit; no sound file. Browsers
// let a page make sounds only after the player's first click or key.
let audio: AudioContext | undefined;
let output: AudioNode | undefined;

/** Lets the page make sounds, from a click or a key of the player's. */
export function wakeSound(): void
{
    try {
        if (audio === undefined) {
            audio = new AudioContext();
            // Many knocks together never clip: a compressor before the speakers.
            const compressor = audio.createDynamicsCompressor();
            compressor.connect(audio.destination);
            output = compressor;
        }

        void audio.resume();
    } catch {
        // No sound in this browser.
    }
}

/** A die's knock on the floor or on another die, as hard as given: softer ones are quieter and duller. */
export function knock(strength: number): void
{
    if (audio === undefined || output === undefined || audio.state !== "running") {
        return;
    }

    const loudness = Math.min(1, strength / 25);
    const now = audio.currentTime;
    const samples = Math.floor(audio.sampleRate * 0.06);
    const noise = audio.createBuffer(1, samples, audio.sampleRate);
    const data = noise.getChannelData(0);

    for (let index = 0; index < samples; index++) {
        data[index] = (Math.random() * 2 - 1) * Math.exp(-index / (samples / 7));
    }

    const click = audio.createBufferSource();
    click.buffer = noise;
    const filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1400 + loudness * 1800 + Math.random() * 600;
    filter.Q.value = 1.4;
    const clickGain = audio.createGain();
    clickGain.gain.value = 0.15 + loudness * 0.45;
    click.connect(filter).connect(clickGain).connect(output);
    click.start(now);

    // The body of the knock: a short tone, lower for a harder hit.
    const tone = audio.createOscillator();
    tone.type = "sine";
    tone.frequency.value = 900 - loudness * 300 + Math.random() * 80;
    const toneGain = audio.createGain();
    toneGain.gain.setValueAtTime(0.08 + loudness * 0.22, now);
    toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    tone.connect(toneGain).connect(output);
    tone.start(now);
    tone.stop(now + 0.1);
}
