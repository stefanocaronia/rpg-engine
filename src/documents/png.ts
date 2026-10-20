// Pixels as a PNG file, for the pictures a PDF holds as raw pixels (D-489 (8)): RGB or RGBA, at most a size on its longer side.
import { zlibSync } from "fflate";

/** Raw pixels: one, three or four bytes for each, row after row. */
export interface Pixels
{
    data: Uint8Array | Uint8ClampedArray;
    width: number;
    height: number;
    channels: 1 | 3 | 4;
}

/** The pixels as a PNG, made smaller when their longer side passes `longest`. */
export function pngOf(pixels: Pixels, longest: number): Uint8Array
{
    const { data, width, height, channels } = smaller(pixels, longest);
    const kind = channels === 4 ? 6 : channels === 3 ? 2 : 0;
    const row = width * channels;
    const raw = new Uint8Array((row + 1) * height);

    for (let y = 0; y < height; y++) {
        raw.set(data.subarray(y * row, (y + 1) * row), y * (row + 1) + 1);
    }

    const header = new Uint8Array(13);
    const view = new DataView(header.buffer);
    view.setUint32(0, width);
    view.setUint32(4, height);
    header.set([8, kind, 0, 0, 0], 8);
    return joined([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", zlibSync(raw, { level: 6 })), chunk("IEND", new Uint8Array(0))]);
}

// The pixels shrunk by a whole step, each new one the mean of the square it covers, until the longer side fits.
function smaller(pixels: Pixels, longest: number): Pixels
{
    const step = Math.ceil(Math.max(pixels.width, pixels.height) / longest);

    if (step <= 1) {
        return pixels;
    }

    const width = Math.floor(pixels.width / step);
    const height = Math.floor(pixels.height / step);
    const { channels } = pixels;
    const data = new Uint8Array(width * height * channels);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            for (let c = 0; c < channels; c++) {
                let sum = 0;

                for (let dy = 0; dy < step; dy++) {
                    for (let dx = 0; dx < step; dx++) {
                        sum += pixels.data[((y * step + dy) * pixels.width + x * step + dx) * channels + c] ?? 0;
                    }
                }

                data[(y * width + x) * channels + c] = Math.round(sum / (step * step));
            }
        }
    }

    return { data, width, height, channels };
}

function chunk(type: string, body: Uint8Array): Uint8Array
{
    const out = new Uint8Array(body.length + 12);
    const view = new DataView(out.buffer);
    view.setUint32(0, body.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(body, 8);
    view.setUint32(body.length + 8, crc(out.subarray(4, body.length + 8)));
    return out;
}

function joined(parts: Uint8Array[]): Uint8Array
{
    const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let at = 0;

    for (const part of parts) {
        out.set(part, at);
        at += part.length;
    }

    return out;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;

    for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    return c >>> 0;
});

function crc(bytes: Uint8Array): number
{
    let c = 0xffffffff;

    for (const byte of bytes) {
        c = (crcTable[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
    }

    return (c ^ 0xffffffff) >>> 0;
}
