// Looks at the dashboard in Chrome as a player would (D-272): a screenshot, what the console said (errors of the page and of its policy included), and with --aria
// the page as a screen reader reads it. `npm run build`, then, for one:
//   node --experimental-strip-types test/demo/look.ts --system 5e --width 360 --theme light --click "text=Combat" --click ".rows >> text=insight" --out tmp/look/combat.png
// --click takes a Playwright selector, --press a key (Tab, ArrowRight), --type words for what has the focus, --wait milliseconds, in the order given; --full takes the whole page, --still reduces
// motion; --ask 1 has the demo ask the page the first of its questions (D-279), as with --ask 1 --click ".asked-check" --wait 900 for a die in the air.
// --chat gives the page the chat with a master of the demo's own (test/demo/master.ts), which answers each sentence typed; --resumed, a chat the campaign
// takes up, cut as the game was closed; --taken-up, one taken up whole, and --taken-up-empty, one with no flow kept; --section opens the page at a
// section, as --chat --section chat, or --section world/lore; --setup serves a campaign just made, still in its setup, anew each time;
// --launcher opens the launcher's page, served by a launcher of the demo's own (test/demo/launcher.ts) with a few campaigns, or none with --empty: opening
// one leads to the demo's campaign, whose page leads back; --query adds what the address asks, as --query "opened=1"; --locale sets the browser's language, which the launcher's page writes in, as --locale it-IT; --page serves a page built apart, in that folder, in place of dist/dashboard.
// --hosts none or --hosts out starts the AI apps not installed, or not signed in to (test/demo/hosts.ts), which the page installs and signs in to;
// --hosts key, Claude Code signed in with an API key; --hosts busy, as none, with Claude Code's first install and sign-in under way in another window,
// which looking again finds done. --touch looks under a finger, as a phone does: the page's manners of a touch screen, with --width 375.
// Without --url it serves the demo campaign of tmp/dashboard-demo on a free port, of free play, or with --system 5e the 5e's of tmp/dashboard-demo-5e, with
// the 5e's repository beside this one. It uses the Chrome installed. Not part of the tests.
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";
import { serveDemo } from "./demo.ts";
import { hostsState } from "./hosts.ts";

const { values, tokens } = parseArgs({
    options: {
        url: { type: "string" },
        width: { type: "string", default: "1280" },
        height: { type: "string", default: "900" },
        theme: { type: "string", default: "dark" },
        click: { type: "string", multiple: true },
        press: { type: "string", multiple: true },
        type: { type: "string", multiple: true },
        wait: { type: "string", multiple: true },
        out: { type: "string", default: "tmp/look/page.png" },
        full: { type: "boolean" },
        still: { type: "boolean" },
        aria: { type: "boolean" },
        ask: { type: "string" },
        system: { type: "string", default: "free" },
        chat: { type: "boolean" },
        resumed: { type: "boolean" },
        "taken-up": { type: "boolean" },
        "taken-up-empty": { type: "boolean" },
        setup: { type: "boolean" },
        launcher: { type: "boolean" },
        empty: { type: "boolean" },
        query: { type: "string" },
        locale: { type: "string" },
        page: { type: "string" },
        section: { type: "string" },
        hosts: { type: "string" },
        touch: { type: "boolean" },
    },
    tokens: true,
});

const steps = tokens.flatMap((token) => (token.kind === "option" && ["click", "press", "type", "wait"].includes(token.name) ? [{ name: token.name, value: token.value ?? "" }] : []));
const demo = values.url === undefined
    ? await serveDemo([0], values.system === "5e" ? "5e" : "free", {
        chat: values.resumed === true ? "resumed" : values["taken-up"] === true ? "taken-up" : values["taken-up-empty"] === true ? "taken-up-empty" : values.chat === true,
        setup: values.setup === true,
        launcher: values.launcher === true ? (values.empty === true ? "empty" : true) : false,
        ...(values.page === undefined ? {} : { page: resolve(values.page) }),
        hosts: hostsState(values.hosts),
    })
    : undefined;
const browser = await chromium.launch({ channel: "chrome" });

try {
    const page = await browser.newPage({
        viewport: { width: Number(values.width), height: Number(values.height) },
        colorScheme: values.theme === "light" ? "light" : "dark",
        reducedMotion: values.still ? "reduce" : "no-preference",
        ...(values.locale === undefined ? {} : { locale: values.locale }),
        ...(values.touch === true ? { hasTouch: true } : {}),
    });
    const said: string[] = [];
    page.on("console", (message) => said.push(`${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => said.push(`error: ${error.message}`));
    const start = values.url ?? (values.launcher === true ? demo?.launcher : demo?.url) ?? "";
    await page.goto(`${start}${values.query === undefined ? "" : `/?${values.query}`}${values.section === undefined ? "" : `#/${values.section}`}`);
    // The page has read view when it shows a sheet, or the section asked, or says why not.
    await page.waitForSelector(".band, .notice, .setup, main > *", { timeout: 10_000 });

    // The demo asks on the page, and the call waits for the click of the steps: what it said comes at the end.
    const question = values.ask === undefined || demo === undefined ? undefined : demo.questions[(Number(values.ask) - 1) % demo.questions.length];
    const asking = question === undefined ? undefined : demo?.ask(question);

    if (asking !== undefined) {
        await page.waitForSelector(".asked", { timeout: 5_000 });
    }

    for (const step of steps) {
        if (step.name === "click") {
            await page.locator(step.value).first().click();
        } else if (step.name === "press") {
            await page.keyboard.press(step.value);
        } else if (step.name === "type") {
            await page.keyboard.type(step.value);
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
