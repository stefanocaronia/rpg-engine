// The player's dashboard in a playtest with the page open (--dashboard): the page the rpg server serves, in the Chrome installed, as the player keeps it beside
// the chat. What the master asks there the AI player answers, and the answer is clicked on the real page; the scenario's moments are done on it; after each
// master turn, what the page showed is kept. How to run it: README.md in this folder.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { parse } from "yaml";
import { notYetRead, oneAnswer } from "./one-answer.mjs";

// How often the question the master asks is looked for, while the master plays its turn, in milliseconds.
const askedPoll = 250;
// How long a question may take to show on the page before the run answers it through the page's own request and says so.
const bannerWait = 10_000;
// How long the page is given to draw a section after its address changes.
const drawWait = 1200;

/** The scenario's moments on the page (--moments): before the player's message `before`, a setting changed, a note written, a library folder turned on or someone talked to, and what the player is told. */
export function readMoments(file)
{
    const moments = file === undefined ? [] : parse(readFileSync(file, "utf8")) ?? [];

    if (!Array.isArray(moments) || moments.some((moment) => !(Number.isInteger(moment?.before) && moment.before > 1))) {
        throw new Error(`${file}: write a list of moments, each with before, the number of a player's message from 2, and a setting, a note, a library folder, talk or tell.`);
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
        // A question shows in the banner, or, a death save of the player's character, on the heartbeat card with its one button (D-461).
        const banner = state.page.locator("section.asked:not(.leaving), section:has(button.dying-roll)").first();
        const shown = await banner.waitFor({ state: "visible", timeout: bannerWait }).then(() => Date.now()).catch(() => undefined);

        if (shown === undefined) {
            note(`run: the question "${asked.question}" did not show on the page within ${bannerWait / 1000} s`);
        }

        // The dice of a rest only the page shows (ASK-14): the player says how many, and they are rolled one at a time.
        if (asked.spend !== undefined) {
            await spendDice(asked, banner, shown !== undefined, seen);
            return;
        }

        // One answer for the page and the chat's form (one-answer.mjs): the form's, when it asked the player first, is the same choice by its index.
        const reply = await oneAnswer({ folder, question: asked.question, side: "page", ask: () => (asked.square ? pickSquare(asked) : pickButton(asked)) })
            .then((given) => (given.index !== undefined && given.label === undefined ? { ...given, label: asked.labels[given.index] } : given))
            .catch((error) => {
                note(`run: the player gave no answer (${error.message}); the first button instead`);
                return { index: 0, label: asked.labels[0], fallback: true };
            });
        // The form's answer has already reached the master: the page has nothing to click.
        const clicked = reply.from === "form" ? "answered in the chat's form" : shown === undefined ? await answerWithoutBanner(asked, reply) : await click(banner, asked, reply).catch((error) => {
            note(`run: the click failed (${error.message})`);
            return answerWithoutBanner(asked, reply);
        });
        const timing = { asked: asked.id, title: asked.title, question: asked.question, labels: asked.labels, square: asked.square === true, reply, shownMs: shown === undefined ? null : shown - seen, answeredMs: Date.now() - seen, clicked };
        appendFileSync(join(pageFolder, "asked.jsonl"), JSON.stringify(timing) + "\n");
        const choices = asked.labels.join(" · ") + (asked.square ? " · a square of the map" : "");
        // What reached the master: a click, an answer sent around the page, or one the server refused, as when the question had already changed.
        const how = clicked === true ? "" : clicked === false ? " (not on the page: see page/console.txt)" : reply.from === "form" ? ` (${clicked})` : ` (not delivered: ${clicked}; the master got another answer or none)`;
        record(folder, "Page", `(${asked.title}: ${asked.question})\n\n${choices} → ${reply.square ?? reply.label ?? `«${reply.words}»`}${how}`);
    };

    // The buttons, as a chat that shows them would: the player reads the master's words so far, then presses one or writes what they do.
    const pickButton = async (asked) => {
        const prompt = [
            notYetRead(folder, mastersWords(state.said)),
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
            notYetRead(folder, mastersWords(state.said)),
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
        const roll = banner.locator("button.dying-roll");

        if (await roll.count() > 0) {
            await roll.click();
            return true;
        }

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

    // A rest's dice: the player reads the master's words and the dice left, says how many to spend, and each is rolled on the card, its roll awaited.
    const spendDice = async (asked, banner, onPage, seen) => {
        const dice = asked.spend.dice.map((one) => `${one.value} of ${one.max} d${one.sides}${one.adds === 0 ? "" : ` (+${one.adds} each)`}`).join(", ");
        const { gives } = asked.spend;
        const prompt = [
            notYetRead(folder, mastersWords(state.said)),
            `(The dashboard shows the master's question: «${asked.question}». ${asked.spend.who} has ${gives.field} ${gives.value}${gives.max === undefined ? "" : ` of ${gives.max}`}, and hit dice to spend: ${dice}. You roll them one at a time on the page and stop when you like. How many do you spend? 0 for none.)`,
        ].filter(Boolean).join("\n\n");
        const schema = { type: "object", required: ["dice"], properties: { dice: { type: "integer", minimum: 0, description: "how many dice you spend, one at a time" } } };
        const wanted = await askPlayer(prompt, schema).then((given) => Math.max(0, Math.trunc(Number(given.dice) || 0))).catch((error) => {
            note(`run: the player gave no answer (${error.message}); no dice spent`);
            return 0;
        });
        const spent = [];

        for (let count = 0; count < wanted; count++) {
            const now = (await getJson(`${state.link}api/asked`))?.asked;
            const die = now?.spend?.dice.find((one) => one.value > 0);

            if (now?.id !== asked.id || die === undefined) {
                break;
            }

            const rolls = now.spend.rolls.length;
            const roll = banner.locator("button.spend-roll:not([aria-disabled=true])").first();
            const clicked = onPage && await roll.click({ timeout: 2000 }).then(() => true, () => false);

            if (!clicked) {
                const sent = await post("/api/answer", { asked: asked.id, spend: die.field });

                if (!sent.startsWith("2")) {
                    note(`run: a die of "${asked.question}" not spent through /api/answer: ${sent}`);
                }
            }

            spent.push(await rolled(asked.id, rolls) ?? "no roll came back");
        }

        const done = banner.locator("button.spend-done");
        const ended = onPage && await done.click({ timeout: 2000 }).then(() => true, () => false);

        if (!ended) {
            note(`run: the rest of "${asked.question}" ended through /api/answer, not on the page`);
            await post("/api/answer", { asked: asked.id, choice: 0 });
        }

        appendFileSync(join(pageFolder, "asked.jsonl"), JSON.stringify({ asked: asked.id, title: asked.title, question: asked.question, spend: { wanted, spent }, answeredMs: Date.now() - seen }) + "\n");
        record(folder, "Page", `(${asked.title}: ${asked.question})\n\n${wanted === 0 ? "No dice spent" : `${wanted} dice to spend → ${spent.join("; ")}`}${ended ? "" : " (not on the page: see page/console.txt)"}`);
    };

    // A roll of a rest's die once the server has it: its face and total, or undefined after a few seconds.
    const rolled = async (id, before) => {
        for (let tries = 0; tries < 40; tries++) {
            const now = (await getJson(`${state.link}api/asked`))?.asked;

            // Another question in its place: this die's roll will never come.
            if (now?.id !== id) {
                return undefined;
            }

            const roll = now.spend?.rolls?.[before];

            if (roll !== undefined) {
                // The dice land on the page before the next is rolled.
                await state.page.waitForTimeout(drawWait);
                return `${roll.face} +${roll.adds} = ${roll.total}`;
            }

            await state.page.waitForTimeout(askedPoll);
        }

        return undefined;
    };

    const post = async (path, body) => {
        const response = await fetch(`${state.link}${path.replace(/^\//, "")}`, { method: "POST", headers: { "Content-Type": "application/json", Origin: state.link.replace(/\/$/, "") }, body: JSON.stringify(body) });
        return `${response.status} ${await response.text()}`;
    };

    const answerWithoutBanner = async (asked, reply) => {
        note(`run: the question "${asked.question}" answered through /api/answer, not on the page`);
        const body = reply.words !== undefined ? { asked: asked.id, text: reply.words } : reply.square !== undefined ? { asked: asked.id, square: reply.square } : { asked: asked.id, choice: reply.index };
        const response = await fetch(`${state.link}api/answer`, { method: "POST", headers: { "Content-Type": "application/json", Origin: state.link.replace(/\/$/, "") }, body: JSON.stringify(body) });
        return response.ok ? false : `HTTP ${response.status}`;
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
        /**
         * Before the player's message `count`: the scenario's moments for it, done on the page; returns what the player is told of them, and whether the
         * player said a sentence to the master on the page (D-495), which may wake the master by itself.
         */
        async momentsBefore(count)
        {
            const told = [];
            let said = false;

            for (const moment of moments.filter((one) => one.before === count)) {
                if (state.page !== undefined && (moment.setting || moment.note || moment.library)) {
                    const done = await act(moment);
                    record(folder, "Page", `Before P${count}: ${done}`);
                }

                if (state.page !== undefined && moment.talk) {
                    const done = await talk(moment);
                    record(folder, "Page", `Before P${count}: ${done.text}`);
                    said ||= done.said;
                }

                if (moment.tell) {
                    told.push(`(Organizer: ${moment.tell})`);
                }
            }

            return { told, said };
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

        // A folder already on this computer, turned on for the campaign as the Library tab does (D-491 (13)): no window asks again.
        if (moment.library) {
            await show("packages/library");
            const answer = await send("/api/library", { action: "add", path: moment.library });
            await state.page.waitForTimeout(drawWait);
            await keep(`P${moment.before}-library`);
            return `${moment.library} turned on in the Library of Packages (${answer.trim()})`;
        }

        await show("journal");
        const id = `${Date.now().toString(36)}-playtest`;
        const written = await send("/api/notes", { id, title: moment.note.title, text: moment.note.text });
        const shared = moment.note.share ? await send("/api/notes", { share: id }) : "";
        await keep(`P${moment.before}-journal`);
        return `a note «${moment.note.title}» written (${written.trim()})${moment.note.share ? `, shared with the master (${shared.trim()})` : ""}`;
    }

    // Talking to someone from the page (D-495): their name in Scene opens the sentence, the player writes the rest, and the page sends it as it does.
    async function talk(moment)
    {
        await show("scene");
        const name = state.page.locator(`button.act.talk[data-name="${moment.talk.replaceAll('"', '\\"')}"]`).first();

        if (!(await name.isVisible().catch(() => false))) {
            note(`run: no «Talk to ${moment.talk}» on the page`);
            return { text: `no way to talk to ${moment.talk} on the page`, said: false };
        }

        await name.click();
        const sheet = state.page.locator("dialog.act-sheet");
        const field = sheet.locator("textarea.act-words");
        const start = await field.inputValue();
        const prompt = [
            notYetRead(folder, mastersWords(state.said)),
            `(${moment.ask ?? `On the dashboard you click ${moment.talk}'s name to talk to them.`} The page has written «${start.trim()}»: write what you say, as you would in the chat; it goes to the master as your words.)`,
        ].filter(Boolean).join("\n\n");
        const schema = { type: "object", required: ["words"], properties: { words: { type: "string", description: `what you say to ${moment.talk}` } } };
        const words = await askPlayer(prompt, schema).then((given) => String(given.words).trim()).catch(() => "");

        if (words === "") {
            await sheet.locator("button.act-cancel").click();
            return { text: `talking to ${moment.talk} on the page: the player said nothing`, said: false };
        }

        await field.fill(`${start}${words}`);
        const go = sheet.locator("button.act-go");
        // Without the doorbell the page copies the sentence for the chat instead: the master would never hear it, so the run says so and waits for no turn.
        const button = (await go.textContent())?.trim() ?? "";
        const bell = (await getJson(`${state.link}api/act`))?.bell === true;
        await go.click();
        await state.page.waitForTimeout(drawWait);
        await keep(`P${moment.before}-said`);
        const strip = (await state.page.locator(".act-strip").textContent().catch(() => ""))?.trim() ?? "";
        return { text: `«${start}${words}» said to the master on the page (${button}; ${strip || "no strip"})`, said: bell };
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
