// The player's dashboard in a playtest with the page open (--dashboard): the page the rpg server serves, in the Chrome installed, as the player keeps it beside
// the chat. What the master asks there the AI player answers, and the answer is clicked on the real page; the scenario's moments are done on it; after each
// master turn, what the page showed is kept. How to run it: README.md in this folder.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { parse } from "yaml";

// How often the question the master asks is looked for, while the master plays its turn, in milliseconds.
const askedPoll = 250;
// How long a question may take to show on the page before the run answers it through the page's own request and says so.
const bannerWait = 10_000;
// How long the page is given to draw a section after its address changes.
const drawWait = 1200;

/** The scenario's moments on the page (--moments): before the player's message `before`, a setting changed or a note written, and what the player is told. */
export function readMoments(file)
{
    const moments = file === undefined ? [] : parse(readFileSync(file, "utf8")) ?? [];

    if (!Array.isArray(moments) || moments.some((moment) => !(Number.isInteger(moment?.before) && moment.before > 1))) {
        throw new Error(`${file}: write a list of moments, each with before, the number of a player's message from 2, and a setting, a note or tell.`);
    }

    return moments;
}

/**
 * The page and its player for one session: `heard` takes each event of the master's turn, which gives the dashboard's link and the master's words so far;
 * `askPlayer(prompt, schema)` is a turn of the player's chat, answered as `schema` says. Everything it does goes to the session's dialogue and to page/.
 */
export function pagePlayer({ folder, askPlayer, moments })
{
    const pageFolder = join(folder, "page");
    mkdirSync(pageFolder, { recursive: true });
    const state = { link: undefined, browser: undefined, page: undefined, opening: undefined, said: [], answered: new Set(), busy: false, timer: undefined, turn: 0 };

    const note = (line) => appendFileSync(join(pageFolder, "console.txt"), `M${state.turn} ${line}\n`);

    const open = async (link) => {
        state.browser = await chromium.launch({ channel: "chrome" });
        state.page = await state.browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
        state.page.on("console", (message) => ["error", "warning"].includes(message.type()) && note(`${message.type()}: ${message.text()}`));
        state.page.on("pageerror", (error) => note(`pageerror: ${error.message}`));
        await state.page.goto(link);
        record(folder, "Page", `The dashboard is open at ${link}.`);
    };

    const poll = async () => {
        if (state.busy || state.page === undefined) {
            return;
        }

        state.busy = true;

        try {
            const asked = (await getJson(`${state.link}api/asked`))?.asked;

            if (asked && !state.answered.has(asked.id)) {
                state.answered.add(asked.id);
                await answer(asked, Date.now());
            }
        } catch (error) {
            note(`run: ${error.message}`);
        } finally {
            state.busy = false;
        }
    };

    // A question the run cannot play as the player would is still answered, through the page's request and said, so that the master's turn never waits half
    // an hour: with the player's reply, or the first button when the player gave none.
    const answer = async (asked, seen) => {
        const banner = state.page.locator("section.asked:not(.leaving)");
        const shown = await banner.waitFor({ state: "visible", timeout: bannerWait }).then(() => Date.now()).catch(() => undefined);

        if (shown === undefined) {
            note(`run: the question "${asked.question}" did not show on the page within ${bannerWait / 1000} s`);
        }

        const reply = await (asked.square ? pickSquare(asked) : pickButton(asked)).catch((error) => {
            note(`run: the player gave no answer (${error.message}); the first button instead`);
            return { index: 0, label: asked.labels[0], fallback: true };
        });
        const clicked = shown === undefined ? await answerWithoutBanner(asked, reply) : await click(banner, asked, reply).catch((error) => {
            note(`run: the click failed (${error.message})`);
            return answerWithoutBanner(asked, reply);
        });
        const timing = { asked: asked.id, title: asked.title, question: asked.question, labels: asked.labels, square: asked.square === true, reply, shownMs: shown === undefined ? null : shown - seen, answeredMs: Date.now() - seen, clicked };
        appendFileSync(join(pageFolder, "asked.jsonl"), JSON.stringify(timing) + "\n");
        const choices = asked.labels.join(" · ") + (asked.square ? " · a square of the map" : "");
        record(folder, "Page", `(${asked.title}: ${asked.question})\n\n${choices} → ${reply.square ?? reply.label ?? `«${reply.words}»`}${clicked ? "" : " (not on the page: see page/console.txt)"}`);
    };

    // The buttons, as a chat that shows them would: the player reads the master's words so far, then presses one or writes what they do.
    const pickButton = async (asked) => {
        const prompt = [
            mastersWords(state.said),
            `(The dashboard shows the master's question: «${asked.question}», with these buttons: ${asked.labels.join(" · ")}. Press one, giving its text exactly, or write what you do instead.)`,
        ].filter(Boolean).join("\n\n");
        const schema = { type: "object", required: ["answer"], properties: { answer: { type: "string", description: "one button's text exactly, or your own words" } } };
        const given = (await askPlayer(prompt, schema)).answer.trim();
        const index = asked.labels.findIndex((label) => label.trim() === given);
        return index >= 0 ? { index, label: asked.labels[index] } : { words: given };
    };

    // Where the character goes: the map as the page draws it, in words, and the squares it can still reach in a fight.
    const pickSquare = async (asked) => {
        const map = (await getJson(`${state.link}api/view`))?.place?.map;
        const prompt = [
            mastersWords(state.said),
            `(The dashboard shows the master's question on the map: «${asked.question}». ${mapInWords(map)} Give the square where your character goes, such as E4, or press ${
                asked.labels.map((label) => `«${label}»`).join(" or ")
            }.)`,
        ].filter(Boolean).join("\n\n");
        const reach = map?.reach ?? [];
        const schema = { type: "object", required: ["answer"], properties: { answer: { type: "string", description: "a square such as E4, or the button's text exactly" } } };
        const given = (await askPlayer(prompt, schema)).answer.trim();
        const index = asked.labels.findIndex((label) => label.trim() === given);

        if (index >= 0) {
            return { index, label: asked.labels[index] };
        }

        const square = given.toUpperCase().replace(/\s+/g, "");
        return /^[A-Z]{1,3}\d{1,3}$/.test(square) && (reach.length === 0 || reach.includes(square)) ? { square } : { index: 0, label: asked.labels[0], refused: given };
    };

    const click = async (banner, asked, reply) => {
        const buttons = banner.locator(".asked-buttons > button");
        // A question on the map has its button first, before those of its labels.
        const first = (await buttons.count()) - asked.labels.length;

        if (reply.words !== undefined) {
            await banner.locator("form.asked-own input").fill(reply.words);
            await banner.locator("form.asked-own button[type=submit]").click();
            return true;
        }

        if (reply.square !== undefined && first > 0) {
            await buttons.nth(0).click();
            const sheet = state.page.locator("dialog.map-sheet");
            await sheet.locator("input").fill(reply.square);
            const go = sheet.locator("button.map-sheet-go");

            if (await go.isEnabled()) {
                await go.click();
                return true;
            }

            note(`run: ${reply.square} cannot be chosen on the map; the first button instead`);
            await sheet.locator("header button").click();
            reply.refused = reply.square;
            delete reply.square;
            reply.index = 0;
            reply.label = asked.labels[0];
        }

        await buttons.nth(first + (reply.index ?? 0)).click();
        return true;
    };

    const answerWithoutBanner = async (asked, reply) => {
        note(`run: the question "${asked.question}" answered through /api/answer, not on the page`);
        const body = reply.words !== undefined ? { asked: asked.id, text: reply.words } : reply.square !== undefined ? { asked: asked.id, square: reply.square } : { asked: asked.id, choice: reply.index };
        await fetch(`${state.link}api/answer`, { method: "POST", headers: { "Content-Type": "application/json", Origin: state.link.replace(/\/$/, "") }, body: JSON.stringify(body) });
        return false;
    };

    const show = async (section) => {
        await state.page.evaluate((address) => {
            window.location.hash = address;
        }, `#/${section}`);
        await state.page.waitForTimeout(drawWait);
    };

    const keep = async (name) => {
        await state.page.screenshot({ path: join(pageFolder, `${name}.png`) });
        writeFileSync(join(pageFolder, `${name}.aria.yaml`), await state.page.locator("body").ariaSnapshot().catch((error) => `(no snapshot: ${error.message})`));
    };

    return {
        /** Each event of the master's turn as Claude Code streams it: the first link to the dashboard opens it; the master's words are kept for the buttons. */
        heard(event)
        {
            if (event.type === "assistant" && !event.parent_tool_use_id) {
                state.said.push(...(event.message?.content ?? []).filter((block) => block.type === "text").map((block) => block.text.trim()));
            }

            const link = state.link === undefined && event.type === "user" ? /http:\/\/127\.0\.0\.1:\d+/.exec(JSON.stringify(event.message?.content ?? ""))?.[0] : undefined;

            if (link !== undefined) {
                state.link = `${link}/`;
                state.opening = open(state.link).catch((error) => note(`run: the page did not open: ${error.message}`));
            }
        },
        /** The master's turn `count` begins: the page is watched for its questions. */
        turnBegins(count)
        {
            state.turn = count;
            state.said = [];
            state.timer = setInterval(() => void poll(), askedPoll);
        },
        /** The master's turn ended: what the page shows now, in the sections the game has, is kept. */
        async turnEnds(count)
        {
            clearInterval(state.timer);
            await state.opening;

            if (state.page === undefined) {
                return;
            }

            const fight = (await getJson(`${state.link}api/view`).catch(() => undefined))?.openScene?.type === "combat";

            for (const section of ["party", "scene", ...(fight ? ["combat"] : [])]) {
                await show(section);
                await keep(`M${count}-${section}`);
            }
        },
        /** Before the player's message `count`: the scenario's moments for it, done on the page; returns what the player is told of them. */
        async momentsBefore(count)
        {
            const told = [];

            for (const moment of moments.filter((one) => one.before === count)) {
                if (state.page !== undefined && (moment.setting || moment.note)) {
                    const done = await act(moment);
                    record(folder, "Page", `Before P${count}: ${done}`);
                }

                if (moment.tell) {
                    told.push(`(Organizer: ${moment.tell})`);
                }
            }

            return told;
        },
        async close()
        {
            clearInterval(state.timer);
            await state.opening;
            await state.browser?.close();
        },
    };

    // A moment as the page's own sections do it: a setting by the request Settings sends, a note by the one Notes sends, shared when the moment says so.
    async function act(moment)
    {
        const send = (path, body) =>
            state.page.evaluate(async ([address, sent]) => {
                const response = await fetch(address, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sent) });
                return `${response.status} ${await response.text()}`;
            }, [path, body]);

        if (moment.setting) {
            await show("settings");
            const answer = await send("/api/config", { setting: moment.setting.name, value: String(moment.setting.value) });
            await keep(`P${moment.before}-settings`);
            return `${moment.setting.name} set to ${moment.setting.value} in Settings (${answer.trim()})`;
        }

        await show("journal");
        const id = `${Date.now().toString(36)}-playtest`;
        const written = await send("/api/notes", { id, title: moment.note.title, text: moment.note.text });
        const shared = moment.note.share ? await send("/api/notes", { share: id }) : "";
        await keep(`P${moment.before}-journal`);
        return `a note «${moment.note.title}» written (${written.trim()})${moment.note.share ? `, shared with the master (${shared.trim()})` : ""}`;
    }
}

/** The master's words of this turn before the question, as the player has read them in the chat. */
function mastersWords(said)
{
    return said.filter(Boolean).join("\n\n");
}

/** The map of the place as the page draws it, in words: its rows with their letters and numbers, its legend, who stands where, and the squares in reach. */
function mapInWords(map)
{
    if (!map) {
        return "The page shows no map.";
    }

    const letters = Array.from({ length: map.columns }, (_, index) => String.fromCharCode(65 + index));
    const rows = map.lines.map((line, index) => `${String(index + 1).padStart(2)} ${[...line.padEnd(map.columns)].join(" ")}`);
    const legend = map.legend.map((entry) => `${entry.symbol} ${entry.name}`).join(", ");
    const standing = map.at.map((one) => `${one.name} ${one.square}`).join(", ");
    return [
        `The map, a square each (# a wall, . the floor, + a door):\n   ${letters.join(" ")}\n${rows.join("\n")}`,
        legend && `Legend: ${legend}.`,
        standing && `Who stands where: ${standing}.`,
        map.reach?.length ? `Squares you can still reach this turn: ${map.reach.join(", ")}.` : "",
    ].filter(Boolean).join("\n");
}

async function getJson(address)
{
    const response = await fetch(address);
    return response.ok ? await response.json() : undefined;
}

function record(folder, label, text)
{
    appendFileSync(join(folder, "dialogue.md"), `**${label}**\n\n${text}\n\n`);
}
