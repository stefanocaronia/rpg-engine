// Looks at the dashboard in Chrome as a player would (D-272): a screenshot, what the console said (errors of the page and of its policy included), and with --aria
// the page as a screen reader reads it. `npm run build`, then, for one:
//   node --experimental-strip-types test/demo/look.ts --width 360 --theme light --click "text=Combat" --click ".rows >> text=insight" --out tmp/look/combat.png
// --click takes a Playwright selector, --press a key (Tab, ArrowRight), --wait milliseconds, in the order given; --full takes the whole page, --still reduces
// motion; --ask 1 has the demo ask the page the first of its questions (D-279), as with --ask 1 --click ".asked-check" --wait 900 for a die in the air.
// Without --url it serves the demo campaign of tmp/dashboard-demo on a free port. It uses the Chrome installed. Not part of the tests.
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";
import { demoQuestions, serveDemo } from "./demo.ts";

const { values, tokens } = parseArgs({
    options: {
        url: { type: "string" },
        width: { type: "string", default: "1280" },
        height: { type: "string", default: "900" },
        theme: { type: "string", default: "dark" },
        click: { type: "string", multiple: true },
        press: { type: "string", multiple: true },
        wait: { type: "string", multiple: true },
        out: { type: "string", default: "tmp/look/page.png" },
        full: { type: "boolean" },
        still: { type: "boolean" },
        aria: { type: "boolean" },
        ask: { type: "string" },
    },
    tokens: true,
});

const steps = tokens.flatMap((token) => (token.kind === "option" && ["click", "press", "wait"].includes(token.name) ? [{ name: token.name, value: token.value ?? "" }] : []));
const demo = values.url === undefined ? await serveDemo([0]) : undefined;
const browser = await chromium.launch({ channel: "chrome" });

try {
    const page = await browser.newPage({
        viewport: { width: Number(values.width), height: Number(values.height) },
        colorScheme: values.theme === "light" ? "light" : "dark",
        reducedMotion: values.still ? "reduce" : "no-preference",
    });
    const said: string[] = [];
    page.on("console", (message) => said.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => said.push(`error: ${error.message}`));
    await page.goto(values.url ?? demo?.url ?? "");
    // The page has read view when it shows a sheet, or says why not.
    await page.waitForSelector(".band, .notice, .setup", { timeout: 10_000 });

    // The demo asks on the page, and the call waits for the click of the steps: what it said comes at the end.
    const question = values.ask === undefined ? undefined : demoQuestions[(Number(values.ask) - 1) % demoQuestions.length];
    const asking = question === undefined ? undefined : demo?.ask(question.question, question.options);

    if (asking !== undefined) {
        await page.waitForSelector(".asked", { timeout: 5_000 });
    }

    for (const step of steps) {
        if (step.name === "click") {
            await page.locator(step.value).first().click();
        } else if (step.name === "press") {
            await page.keyboard.press(step.value);
        } else {
            await page.waitForTimeout(Number(step.value));
        }

        // What a click asks the server for, and a flash, take a moment.
        await page.waitForTimeout(400);
    }

    await page.waitForFunction(() => [...document.images].every((image) => image.complete));
    mkdirSync(dirname(resolve(values.out)), { recursive: true });
    await page.screenshot({ path: values.out, fullPage: values.full === true });
    console.log(`Screenshot: ${resolve(values.out)}`);
    console.log(said.length === 0 ? "Console: nothing." : `Console:\n${said.join("\n")}`);

    if (values.aria) {
        console.log(`\n${await page.locator("body").ariaSnapshot()}`);
    }

    if (asking !== undefined) {
        await page.close();
        console.log(`The master heard: ${await asking}`);
    }
} finally {
    await browser.close();
    await demo?.close();
}
