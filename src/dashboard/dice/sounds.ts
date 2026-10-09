// The sound of the dice (D-278, D-283): one touch of a resin die on felt, made with ElevenLabs, played at every knock of the physics, so the bounces of each
// throw make its pattern; as loud as the die hit, duller when softly, a little higher or lower each time. Until it loads, the browser makes a knock of its
// own. Browsers let a page make sounds only after the player's first click or key.
let audio: AudioContext | undefined;
let output: AudioNode | undefined;
let touch: AudioBuffer | undefined;

/** Lets the page make sounds, from a click or a key of the player's; the first time, it loads the touch. */
export function wakeSound(): void
{
    try {
        if (audio === undefined) {
            audio = new AudioContext();
            // Many dice together never clip: a compressor before the speakers.
            const compressor = audio.createDynamicsCompressor();
            compressor.connect(audio.destination);
            output = compressor;
            void loadTouch(audio);
        }

        void audio.resume();
    } catch {
        // No sound in this browser.
    }
}

/** A die's knock on the floor or on another die, as hard as given. */
export function knock(strength: number): void
{
    if (audio === undefined || output === undefined || audio.state !== "running") {
        return;
    }

    const loudness = Math.min(1, strength / 25);

    if (touch === undefined) {
        madeKnock(audio, output, loudness);
        return;
    }

    const source = audio.createBufferSource();
    source.buffer = touch;
    source.playbackRate.value = 0.9 + Math.random() * 0.22;
    // A soft knock is a duller one.
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2500 + loudness * 9000;
    const gain = audio.createGain();
    gain.gain.value = 0.2 + loudness * 0.8;
    source.connect(filter).connect(gain).connect(output);
    source.start();
}

/** The browser's own knock: a short noise through a filter, with a short tone beneath it. */
function madeKnock(audio: AudioContext, output: AudioNode, loudness: number): void
{
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

/** Loads and decodes the touch; when it cannot, the browser's own knock stays. */
async function loadTouch(context: AudioContext): Promise<void>
{
    try {
        const response = await fetch("/assets/sounds/dice-touch.wav");
        touch = await context.decodeAudioData(await response.arrayBuffer());
    } catch {
        touch = undefined;
    }
}
