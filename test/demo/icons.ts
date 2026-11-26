// Makes the icon's images from its two drawings in src/dashboard/assets, the robot behind the master's screen as the page's logo has it: icon.svg, and
// icon-small.svg, the same with fewer parts and no die on a grid of 16, for 16 and 24 pixels. It writes icon.png at 512, the page's icon-16.png, icon-32.png and
// icon-180.png, icon.ico with seven sizes for Windows and icon.icns with three for macOS, beside them. It draws with the Chrome installed, through Playwright, and writes the two containers by hand: each is a
// small header around PNG data. Run it again when a drawing changes:
//   node --experimental-strip-types test/demo/icons.ts
// Not part of the tests.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const assets = fileURLToPath(new URL("../../src/dashboard/assets/", import.meta.url));
const drawing = readFileSync(`${assets}icon.svg`, "utf8");
const smallDrawing = readFileSync(`${assets}icon-small.svg`, "utf8");
const smallUpTo = 24;
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const icnsSizes: [string, number][] = [["ic07", 128], ["ic08", 256], ["ic09", 512]];

const browser = await chromium.launch({ channel: "chrome" });

try {
    const page = await browser.newPage();
    const drawn = new Map<number, Buffer>();

    for (const size of new Set([512, ...icoSizes, ...icnsSizes.map(([, one]) => one)])) {
        drawn.set(size, await draw(page, size));
    }

    const at = (size: number): Buffer => drawn.get(size) ?? Buffer.alloc(0);
    writeFileSync(`${assets}icon.png`, at(512));

    // The page's own icons, which the window and its button in the taskbar show: 16 and 32 for the browser, 180 for a phone's home screen.
    for (const size of [16, 32, 180]) {
        writeFileSync(`${assets}icon-${size}.png`, drawn.get(size) ?? (await draw(page, size)));
    }

    writeFileSync(`${assets}icon.ico`, ico(icoSizes.map((size) => ({ size, png: at(size) }))));
    writeFileSync(`${assets}icon.icns`, icns(icnsSizes.map(([type, size]) => ({ type, png: at(size) }))));
    console.log(`Wrote icon.png, icon-16.png, icon-32.png, icon-180.png, icon.ico and icon.icns in ${assets}`);
} finally {
    await browser.close();
}

/** The icon drawn at a size, square, on a clear background, as PNG: the small drawing up to 24 pixels. */
async function draw(page: import("playwright-core").Page, size: number): Promise<Buffer>
{
    await page.setViewportSize({ width: size, height: size });
    const sized = (size <= smallUpTo ? smallDrawing : drawing).replace("<svg ", `<svg width="${size}" height="${size}" `);
    await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${sized}</body></html>`);
    return await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

/** An ICO: its directory, an entry of sixteen bytes for each size, then each PNG. A size of 256 is written as 0. */
function ico(images: { size: number; png: Buffer; }[]): Buffer
{
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(images.length, 4);
    let offset = 6 + 16 * images.length;
    const entries = images.map(({ size, png }) => {
        const entry = Buffer.alloc(16);
        entry.writeUInt8(size >= 256 ? 0 : size, 0);
        entry.writeUInt8(size >= 256 ? 0 : size, 1);
        entry.writeUInt8(0, 2);
        entry.writeUInt8(0, 3);
        entry.writeUInt16LE(1, 4);
        entry.writeUInt16LE(32, 6);
        entry.writeUInt32LE(png.length, 8);
        entry.writeUInt32LE(offset, 12);
        offset += png.length;
        return entry;
    });
    return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

/** An ICNS: "icns" and the file's length, then each image with its type and its length, header included, big-endian. */
function icns(images: { type: string; png: Buffer; }[]): Buffer
{
    const parts = images.map(({ type, png }) => {
        const head = Buffer.alloc(8);
        head.write(type, 0, "ascii");
        head.writeUInt32BE(png.length + 8, 4);
        return Buffer.concat([head, png]);
    });
    const head = Buffer.alloc(8);
    head.write("icns", 0, "ascii");
    head.writeUInt32BE(8 + parts.reduce((sum, part) => sum + part.length, 0), 4);
    return Buffer.concat([head, ...parts]);
}
