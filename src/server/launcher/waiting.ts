// The window `rpg open` shows at once, as the icon is clicked: a page that says RPG Engine is opening, served by `rpg open` itself while it reaches the
// launcher, which then sends the window to the launcher's page, or says why it could not.
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { join } from "node:path";
import { files } from "../../core/store.ts";
import { builtPage, send, sendJson } from "../page/index.ts";

/** The page of the wait, served until its window took what it waited for. */
export interface WaitingPage
{
    url: string;
    /** The launcher's link, or why it was not reached: the window goes there, or says it. */
    reached(answer: { url: string; } | { error: string; }): void;
    /** Done once the window took the answer, or after `keep` ms where none asked for it, as where no window opened; the page's server closed. */
    ended: Promise<void>;
}

// The window asks every fifth of a second; the server waits that long for it after the answer, at most.
const askEvery = 200;
const keepWait = 15_000;

/** Serves the page of the wait on a port of this machine, in the language given, as the launcher's page would speak it. */
export async function serveWaitingPage(language: string = systemLanguage(), keep = keepWait): Promise<WaitingPage>
{
    const words = waitingWords(language);
    const page = waitingHtml(words.text, words.language);
    let answer: { url: string; } | { error: string; } | undefined;
    let taken = (): void => undefined;
    const ended = new Promise<void>((done) => (taken = done));

    const server = createServer((request, response) => {
        if (request.url === "/ready") {
            sendJson(response, 200, answer ?? { waiting: true });

            if (answer !== undefined) {
                taken();
            }
        } else if (request.url === "/" || request.url?.startsWith("/?") === true) {
            send(response, 200, "text/html; charset=utf-8", page.html, page.policy);
        } else {
            send(response, 404, "text/plain; charset=utf-8", "Nothing here.");
        }
    });
    const port = await new Promise<number>((done, failed) => {
        server.once("error", failed);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            done(typeof address === "object" && address !== null ? address.port : 0);
        });
    });
    server.unref();

    const closed = ended.then(() => new Promise<void>((done) => server.close(() => done())));
    return {
        url: `http://127.0.0.1:${String(port)}/`,
        reached: (given) => {
            answer = given;
            setTimeout(taken, keep).unref();
        },
        ended: closed,
    };
}

/** The words of the wait in a language the page ships, its base language's, else English: the launcher's own phrase for a campaign being opened. */
export function waitingWords(language: string): { text: string; language: string; }
{
    const phrase = "Opening {name}: it can take a few seconds…";
    const asked = language.toLowerCase();

    for (const code of [asked, asked.split("-")[0]]) {
        try {
            const phrases = JSON.parse(files().text(join(builtPage, "i18n", `${code}.json`)) ?? "{}") as Record<string, string>;
            const own = phrases[phrase];

            if (own !== undefined && /^[a-z]{2,3}$/.test(code)) {
                return { text: own.replace("{name}", "RPG Engine"), language: code };
            }
        } catch {
            // A language the page does not ship: the next, else English.
        }
    }

    return { text: phrase.replace("{name}", "RPG Engine"), language: "en" };
}

// The language this computer speaks, as the browser would take it.
function systemLanguage(): string
{
    return Intl.DateTimeFormat().resolvedOptions().locale;
}

// The page: the launcher's colours and title, its words, and the few lines that ask whether the launcher was reached, then go there with what the
// address asked, or say why not. Its policy runs only that script, by its hash.
function waitingHtml(text: string, language: string): { html: string; policy: string; }
{
    const script = [
        `const ask = () => fetch("/ready").then((r) => r.json()).then((a) => {`,
        `  if (a.url) { location.replace(a.url.replace(/\\/$/, "") + "/" + location.search); }`,
        `  else if (a.error) { document.querySelector("p").textContent = a.error; document.body.classList.add("failed"); }`,
        `  else { setTimeout(ask, ${String(askEvery)}); }`,
        `}, () => setTimeout(ask, ${String(askEvery)}));`,
        "ask();",
    ].join("\n");
    const hash = createHash("sha256").update(script).digest("base64");
    const rightToLeft = ["ar", "he"].includes(language);
    const html = [
        "<!doctype html>",
        `<html lang="${language}" translate="no"${rightToLeft ? ' dir="rtl"' : ""}>`,
        '<meta charset="utf-8">',
        '<meta name="color-scheme" content="light dark">',
        "<title>RPG Engine</title>",
        "<style>",
        "html { height: 100%; }",
        "body { margin: 0; height: 100%; display: grid; place-content: center; gap: 1.5rem; justify-items: center; font: 1.05rem system-ui, sans-serif;",
        "  color: light-dark(#182c4c, #eff0fa); background: light-dark(#f3ede2, #06132b); }",
        ".die { width: 3.5rem; height: 3.5rem; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linejoin: round; animation: roll 1.6s ease-in-out infinite; }",
        ".failed .die { display: none; }",
        "p { margin: 0; max-width: 32rem; text-align: center; padding: 0 1.5rem; }",
        // A die that tumbles, a short hop at each turn, and rests a moment.
        "@keyframes roll { 0% { transform: rotate(0) translateY(0); } 35% { transform: rotate(200deg) translateY(-0.4rem); }",
        "  70%, 100% { transform: rotate(360deg) translateY(0); } }",
        "@media (prefers-reduced-motion: reduce) { .die { animation-duration: 4s; } }",
        "</style>",
        // A twenty-sided die as seen from above: its outline, the face in front and the edges to its corners.
        '<body><svg class="die" viewBox="0 0 24 24" aria-hidden="true">',
        '<path d="M12 2 20.7 7v10L12 22 3.3 17V7Z"/><path d="M12 7.5 16.5 15h-9Z"/>',
        '<path d="M12 2v5.5M20.7 7 16.5 15M20.7 17 16.5 15M12 22l4.5-7M12 22l-4.5-7M3.3 17l4.2-2M3.3 7l4.2 8M3.3 7 12 7.5l8.7-.5"/></svg>',
        `<p role="status">${escaped(text)}</p>`,
        `<script>${script}</script>`,
        "",
    ].join("\n");
    return { html, policy: `default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'` };
}

function escaped(text: string): string
{
    return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
