// The sound of the dice (D-278, D-283, D-357): one touch of a die in a felt-lined tray, recorded by the maintainer and equalized low, and the click of two dice
// hitting each other, recorded too, played at every knock of the physics, so the bounces of each throw make its pattern; as loud as the die hit, duller when
// softly, barely higher or lower each time. Until they load, the browser makes a knock of its own. Browsers let a page make sounds only after the player's
// first click or key.
let audio: AudioContext | undefined;
let output: AudioNode | undefined;
let touch: AudioBuffer | undefined;
let click: AudioBuffer | undefined;
// How loud the click is beside the touch: all of it where the ear hears best, it would cover the felt's thud. Dice clicking span less than they thud, some
// 18 dB from the softest to the hardest in a recording of five real dice, where their gain alone would make 37.
const clickLevel = 0.07;
const clickSpan = 0.75;

/** Lets the page make sounds, from a click or a key of the player's; the first time, it loads the samples. */
export function wakeSound(): void
{
    try {
        if (audio === undefined) {
            audio = new AudioContext();
            // Many dice together never clip: a compressor before the speakers.
            const compressor = audio.createDynamicsCompressor();
            compressor.connect(audio.destination);
            output = compressor;
            void loadSample(audio, "dice-touch.wav").then((loaded) => {
                touch = loaded;
            });
            void loadSample(audio, "dice-collision.wav").then((loaded) => {
                click = loaded;
            });
        }

        void audio.resume();
    } catch {
        // No sound in this browser.
    }
}

/** A die's knock on the floor or on another die, as hard as given. */
export function knock(strength: number, onDie: boolean): void
{
    if (audio === undefined || output === undefined || audio.state !== "running") {
        return;
    }

    // Two dice meet each at half the speed between them, as two equal bodies do.
    const loudness = Math.min(1, (onDie ? strength / 2 : strength) / 25);

    if (touch === undefined) {
        madeKnock(audio, output, loudness);
        return;
    }

    // Two dice click, resin on resin, where the felt muffles a die's touch.
    const hard = onDie && click !== undefined;
    const source = audio.createBufferSource();
    source.buffer = (hard ? click : undefined) ?? touch;
    // The same die rings at the same pitch: a few hundredths up or down, only so that the same touch never sounds twice alike.
    source.playbackRate.value = 0.97 + Math.random() * 0.06;
    // A soft knock is a duller one: the felt lets less of the click through, from 300 Hz for the softest to some 12 kHz for the hardest, the touch's body
    // being all below 1 kHz; two dice, from 5 kHz to 16 kHz, a click being all above 1 kHz.
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = hard ? 5000 * 3.2 ** loudness : 300 * 40 ** loudness;
    filter.Q.value = Math.SQRT1_2;
    // Each bounce, slower, is much softer than the one before, as a real die's on felt.
    const gain = audio.createGain();
    gain.gain.value = hard ? clickLevel * Math.max(0.05, loudness) ** clickSpan : Math.max(0.02, loudness ** 1.5);
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

/** Loads and decodes a sample; undefined when it cannot, and the browser's own knock stays. */
async function loadSample(context: AudioContext, file: string): Promise<AudioBuffer | undefined>
{
    try {
        const response = await fetch(`/assets/sounds/${file}`);
        return await context.decodeAudioData(await response.arrayBuffer());
    } catch {
        return undefined;
    }
}
