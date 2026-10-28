// The player through the page (D-279): the master's question on every page open, the click, the words or the square that settle it, and the pages it
// waits on, seen or not (D-455).
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { findCampaign, readTextSetting } from "../../campaign/index.ts";
import { campaignSystem } from "../../commands/shared/world.ts";
import type { CardAsked, Picked, Player, Rows, Said, SpendAsked, Spending } from "../../core/context.ts";
import { withFiles } from "../../core/store.ts";
import { rollName } from "../../systems/index.ts";
import { mostSaid, readBody, securityHeaders, sendJson } from "./files.ts";
import type { Served } from "./index.ts";

// How long the page waits for the player's click: as long as a host waits for a call that keeps reporting progress, as ask does with a form.
const playerWait = 30 * 60 * 1000;

/** A question of ask on the page: its buttons, whether it asks for a square of the map (ASK-11), and what settles it: a click, a stop or a timeout, or the pages gone. */
export interface Asked
{
    id: string;
    question: string;
    title: string;
    labels: string[];
    square?: true;
    /** Whose sheet the checks read and the field of each, for the page to light its row (ASK-12). */
    rows?: Rows;
    /** The dice of a rest the player spends one at a time, until its one button (ASK-14). */
    spending?: Spending;
    /** The card it is asked in, as it shows before the dice, once its package's widget answers (D-507). */
    card?: ShownCard;
    settle(choice: number | Said | Picked | undefined | "absent"): void;
}

/** A package's card as the page draws it (D-507): its widget, the attempt, what it shows; ended, once the call that asked in it is over. */
export interface ShownCard
{
    widget: string;
    key: string;
    shows?: unknown;
    ended?: true;
}

/**
 * The player through the page (D-279): the question shows on every page open, and the first click settles it; with no page open, "absent", so that ask turns to
 * the form or to words. A stop of the call takes the question away and nothing is logged (ASK-9).
 */
export function pagePlayer(served: Served): Player
{
    // The card the last question on the page was asked in, which the call that asked it leaves as it ends, and how many were put (D-507).
    let cardKey: string | undefined;
    let questions = 0;

    const put = (question: string, title: string, labels: string[], signal?: AbortSignal, more: Pick<Asked, "square" | "rows" | "spending"> = {}): Promise<number | Said | Picked | undefined | "absent"> => {
        if (served.pages.size === 0) {
            return Promise.resolve("absent");
        }

        // A call stopped before its question was put on the page asks nothing (ASK-9).
        if (signal?.aborted === true) {
            return Promise.resolve(undefined);
        }

        // A question asked again, as after a summary, takes the place of the one before; and of a card left from before.
        served.asked?.settle(undefined);
        served.card = undefined;
        return new Promise((done) => {
            const timer = setTimeout(() => settle(undefined), playerWait).unref();

            const settle = (choice: number | Said | Picked | undefined | "absent"): void => {
                clearTimeout(timer);
                signal?.removeEventListener("abort", stop);

                if (served.asked?.id === asked.id) {
                    served.asked = undefined;
                    served.notify();
                }

                done(choice);
            };

            const stop = (): void => settle(undefined);
            const asked: Asked = { id: randomUUID(), question, title, labels, ...more, settle };
            served.asked = asked;
            questions += 1;
            cardKey = more.rows?.card?.key ?? cardKey;
            readCard(served, more.rows?.card, (card) => {
                if (served.asked === asked) {
                    asked.card = card;
                    served.notify();
                }
            });
            signal?.addEventListener("abort", stop);
            served.notify();
            watchHidden(served);
        });
    };

    return {
        asking: () => served.asked !== undefined,
        cardEnded(card)
        {
            // Only a card its questions were asked in on the page.
            if (card.key !== cardKey) {
                return;
            }

            const at = questions;
            readCard(served, card, (read) => {
                // Only while no other question came meanwhile, answered or not.
                if (served.asked === undefined && questions === at) {
                    served.card = { ...read, ended: true };
                    served.notify();
                }
            });
        },
        async choose(question, title, labels, signal, rows)
        {
            const chosen = await put(question, title, labels, signal, rows === undefined ? {} : { rows });
            return typeof chosen === "object" && "square" in chosen ? undefined : chosen;
        },
        async chooseSquare(question, title, change, who, signal)
        {
            // Whose move it is, for the page to show the map of where they stand (D-480 (7)).
            const chosen = await put(question, title, [change], signal, { square: true, rows: { who, fields: [] } });
            return typeof chosen === "number" ? (chosen === 0 ? 0 : undefined) : chosen;
        },
        async spendDice(question, title, done, spending, signal, card)
        {
            const chosen = await put(question, title, [done], signal, { spending, ...(card === undefined ? {} : { rows: { who: spending.shown().who, fields: [], card } }) });
            // The call stopped, its answer never goes: the dice spent reach the master at the next one, as the player's other news (ASK-14).
            const told = signal?.aborted === true ? spending.spent() : undefined;

            if (told !== undefined) {
                served.events.push(told);
            }

            return chosen === 0 || chosen === "absent" ? chosen : undefined;
        },
    };
}

/** By button, the name the campaign's game gives its roll, in the campaign's language (D-399): a check's dice of one kind, as (2d20kh1+5); else null. */
export function rollNamesOf(labels: string[], served: Served): (string | null)[]
{
    return withFiles(served.session, () => {
        const root = findCampaign(served.context.folder);
        const system = root === undefined ? undefined : campaignSystem(root, served.context);
        const language = (root === undefined ? undefined : readTextSetting(root, "language")) ?? system?.language ?? "en";
        return labels.map((label) => {
            const dice = (/\(([^()]+)\)$/.exec(label)?.[1] ?? "").split(/[+-]/).filter((term) => /d/i.test(term));
            return system === undefined || dice.length !== 1 ? null : (rollName(system, dice[0] ?? "", language) ?? null);
        });
    });
}

/** The dice of a rest as the page draws them now (ASK-14); undefined when the campaign does not read, as the question then waits for nothing to show. */
export function spendShown(spending: Spending, served: Served): SpendAsked | undefined
{
    try {
        return withFiles(served.session, () => spending.shown());
    } catch {
        return undefined;
    }
}

/**
 * The page's answer to what the master asks: which button, by its place, or the player's own words (ASK-10); refused for a question no longer asked, so that a
 * late click counts for nothing.
 */
export async function answerAsked(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const body = await readBody(request);
    const parsed = z.union([
        z.object({ asked: z.string(), choice: z.number().int().min(0) }).strict(),
        z.object({ asked: z.string(), text: z.string().trim().min(1).max(mostSaid) }).strict(),
        z.object({ asked: z.string(), square: z.string().regex(/^[A-Za-z]{1,3}\d{1,3}$/) }).strict(),
        z.object({ asked: z.string(), spend: z.string().trim().min(1).max(100) }).strict(),
    ]).safeParse(body);
    const asked = served.asked;

    if (!parsed.success) {
        sendJson(response, 400, {
            error: `Send which button was clicked, { asked, choice }, the player's words, { asked, text }, up to ${mostSaid} characters, a square of the map, { asked, square }, or a die of a rest to spend, { asked, spend }.`,
        });
    } else if ("spend" in parsed.data) {
        await spendOne(response, served, parsed.data.asked, parsed.data.spend);
    } else if (
        asked === undefined || asked.id !== parsed.data.asked || ("choice" in parsed.data && parsed.data.choice >= asked.labels.length) || ("square" in parsed.data && asked.square !== true)
        // The dice of a rest take no words, which the master would never hear (ASK-14).
        || ("text" in parsed.data && asked.spending !== undefined)
    ) {
        sendJson(response, 409, { error: "The master no longer asks this." });
    } else {
        asked.settle("choice" in parsed.data ? parsed.data.choice : "square" in parsed.data ? { square: parsed.data.square.toUpperCase() } : { said: parsed.data.text });
        sendJson(response, 202, {});
    }
}

/** Whether a page is seen now, as it says when it comes in sight or goes out of it (D-455): a question on pages no one sees goes to the chat. */
/** The player closed a package's card that its call left (D-507): it is gone on every page and every device, and after a reload. */
export async function closeCard(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const parsed = z.object({ close: z.string().min(1).max(200) }).strict().safeParse(await readBody(request));

    if (!parsed.success) {
        sendJson(response, 400, { error: "Send the key of the card to close: { close }." });
        return;
    }

    if (served.card?.key === parsed.data.close) {
        served.card = undefined;
        served.notify();
    }

    sendJson(response, 202, {});
}

export async function pageSeen(request: IncomingMessage, response: ServerResponse, served: Served): Promise<void>
{
    const parsed = z.object({ page: z.string().min(1).max(64), seen: z.boolean() }).strict().safeParse(await readBody(request));

    if (!parsed.success) {
        sendJson(response, 400, { error: "Send the page's id and whether it is seen: { page, seen }." });
        return;
    }

    served.seen.set(parsed.data.page, parsed.data.seen);
    watchHidden(served);
    sendJson(response, 202, {});
}

/**
 * Keeps the page's request open, to tell it "changed" whenever a file of the campaign changes; the page reads again, and comes back by itself after a pause.
 * When the last page closes while the master asks and none comes back soon, the question goes to the form or to words (ASK-1).
 */
export function listenForChanges(request: IncomingMessage, response: ServerResponse, served: Served): void
{
    response.writeHead(200, { ...securityHeaders, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store" });
    response.write("retry: 2000\n\n");
    served.pages.add(response);
    const id = new URL(request.url ?? "/", "http://localhost").searchParams.get("page");

    if (id !== null && id !== "") {
        served.pageIds.set(response, id);
    }

    clearTimeout(served.returning);
    request.on("close", () => {
        served.pages.delete(response);
        served.pageIds.delete(response);
        served.seen.delete(id ?? "");
        watchHidden(served);
        const asked = served.asked;

        if (served.pages.size === 0 && asked !== undefined) {
            clearTimeout(served.returning);
            served.returning = setTimeout(() => served.pages.size === 0 && served.asked === asked && asked.settle("absent"), served.pageReturn).unref();
        }
    });
}

/** Reads what a package's card shows, never in the way of its question: given once it answers, with nothing to show when it fails or is late (D-507). */
function readCard(served: Served, card: CardAsked | undefined, read: (card: ShownCard) => void): void
{
    if (card === undefined) {
        return;
    }

    void card.shows().then((shows) => read({ widget: card.widget, key: card.key, ...(shows === undefined ? {} : { shows }) }), () => read({ widget: card.widget, key: card.key }));
}

/** A die of a rest spent from the page (ASK-14): the engine rolls it and the question stays, read again; refused for a question that asks no dice, or no longer. */
async function spendOne(response: ServerResponse, served: Served, id: string, field: string): Promise<void>
{
    const asked = served.asked;

    if (asked?.spending === undefined || asked.id !== id) {
        sendJson(response, 409, { error: "The master no longer asks this." });
        return;
    }

    await served.session.ready();

    // The question may have ended while the files were read again, as with the button that ends it from another page.
    if (served.asked !== asked) {
        sendJson(response, 409, { error: "The master no longer asks this." });
        return;
    }

    const refused = withFiles(served.session, () => asked.spending?.spend(field));
    served.notify();

    if (refused === undefined) {
        sendJson(response, 202, {});
    } else {
        sendJson(response, 409, { error: refused });
    }
}

/**
 * While a question waits and every open page says no one sees it, as in a tab behind, it goes to the form or to words after a short while (D-455); a page
 * seen again, or one that says nothing of itself, keeps it on the page.
 */
function watchHidden(served: Served): void
{
    const asked = served.asked;
    const unseen = served.pages.size > 0 && [...served.pages].every((page) => served.seen.get(served.pageIds.get(page) ?? "") === false);

    if (asked === undefined || !unseen) {
        clearTimeout(served.hiding);
        served.hiding = undefined;
        return;
    }

    served.hiding ??= setTimeout(() => {
        served.hiding = undefined;
        const still = served.pages.size > 0 && [...served.pages].every((page) => served.seen.get(served.pageIds.get(page) ?? "") === false);

        if (still && served.asked === asked) {
            asked.settle("absent");
        }
    }, served.pageHidden).unref();
}
