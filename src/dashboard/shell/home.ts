// The way from a campaign's page back to the campaigns of this computer (D-582), the launcher's page, at a campaign's table alone: the launcher reached, and
// started from the page where none answers; and, once the page has lost its table for good, the way to have the launcher open the campaign again.
import { useEffect, useRef, useState } from "preact/hooks";
import { refusalText, type Refused } from "../parts/refusals.ts";
import { t } from "../text.ts";
import { markedAddress } from "./window.ts";

/** What the page knows of the way back: the launcher's link while it answers, and the campaign's own folder, which the launcher opens it by. */
export interface Home
{
    url?: string;
    root?: string;
    /** The page is the phone's (T-317): the campaigns open on the computer. */
    phone?: boolean;
}

// How often the page asks after the launcher while its table answers: less than the launcher waits before it ends by itself with no page and no request,
// so that it is still there when the table goes. And how long the page is without its table before it offers to open the campaign again: a table that
// starts anew is back sooner.
const askEvery = 4 * 60_000;
const lostAfter = 10_000;

/** The launcher's link where it answers, and the campaign's folder; nothing where the page cannot ask. */
export async function readHome(): Promise<Home>
{
    const home = await readJson<{ url?: unknown; root?: unknown; phone?: unknown; }>("/api/home");
    const url = typeof home.url === "string" ? home.url : undefined;
    const root = typeof home.root === "string" && home.root !== "" ? home.root : undefined;
    return { ...(url === undefined ? {} : { url }), ...(root === undefined ? {} : { root }), ...(home.phone === true ? { phone: true } : {}) };
}

/**
 * The launcher reached, started first where none answers, which takes some seconds, and its page opened by the table in a window of its own: the link, and
 * whether that window opened; or why not, in the page's words by its code, else in the table's.
 */
export async function reachHome(): Promise<{ url: string; window: boolean; } | { error: string; }>
{
    try {
        const response = await fetch("/api/home", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start: true }) });
        const body = await response.json().catch(() => ({})) as { url?: unknown; window?: unknown; } & Refused;
        return response.ok && typeof body.url === "string" ? { url: body.url, window: body.window === true } : { error: refusalText(body, t("It did not reach the game: try again.")) };
    } catch {
        return { error: t("It did not reach the game: try again.") };
    }
}

/** The launcher's address that opens a campaign at once, by its folder: where a page that lost its table sends its window. */
export function reopenAddress(url: string, root: string): string
{
    const address = new URL(url);
    address.searchParams.set("open", root);
    return address.href;
}

/** The way back as the page holds it. */
export interface HomeWays
{
    /** Goes to the campaigns: the launcher's page in a window of its own, else this window sent there, sized as the launcher's. */
    go(): void;
    /** The launcher is being reached. */
    busy: boolean;
    /** Why it could not be reached. */
    problem: string | undefined;
    /** The launcher's address that opens this campaign again, once the page has lost its table and knows the launcher. */
    reopen: string | undefined;
}

/**
 * The way back to the campaigns, at a campaign's table alone (`table`): the launcher asked after as the page opens, each time the game comes back and now
 * and then, and what the page offers once its table is gone (`live` false for a while).
 */
export function useHome(table: boolean, live: boolean): HomeWays | undefined
{
    const [home, setHome] = useState<Home>({});
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState<string>();
    const [lost, setLost] = useState(false);
    const asked = useRef(0);

    useEffect(() => {
        if (!table || !live) {
            return;
        }

        const ask = (): void => {
            const number = ++asked.current;
            void readHome().then((read) => {
                if (number === asked.current) {
                    // The folder never changes while the page is open: one reading that missed it keeps the one known.
                    setHome((before) => ({ ...read, ...(read.root === undefined && before.root !== undefined ? { root: before.root } : {}) }));
                }
            });
        };

        ask();
        const timer = window.setInterval(ask, askEvery);
        return () => window.clearInterval(timer);
    }, [table, live]);

    useEffect(() => {
        setLost(false);

        if (!table || live) {
            return;
        }

        const timer = window.setTimeout(() => setLost(true), lostAfter);
        return () => window.clearTimeout(timer);
    }, [table, live]);

    // The player came back to the page with the browser's Back: the button waits no more.
    useEffect(() => {
        const back = (event: PageTransitionEvent): void => {
            if (event.persisted) {
                setBusy(false);
            }
        };

        window.addEventListener("pageshow", back);
        return () => window.removeEventListener("pageshow", back);
    }, []);

    if (!table || home.phone === true) {
        return undefined;
    }

    const go = (): void => {
        if (busy) {
            return;
        }

        // Its table gone, the page can ask nothing: the launcher where it last answered.
        if (!live && home.url !== undefined) {
            window.location.assign(markedAddress(home.url));
            return;
        }

        setBusy(true);
        setProblem(undefined);
        void reachHome().then((reached) => {
            if ("url" in reached && reached.window) {
                // The launcher's window opened beside this one: the page stays.
                setBusy(false);
            } else if ("url" in reached) {
                // The page leaves: the button waits until it has.
                window.location.assign(markedAddress(reached.url));
            } else {
                setBusy(false);
                setProblem(reached.error);
            }
        });
    };

    return { go, busy, problem, reopen: lost && home.url !== undefined && home.root !== undefined ? reopenAddress(home.url, home.root) : undefined };
}

/** What the page's own server answers at an address, as JSON; nothing where it does not answer. */
async function readJson<Answer extends object>(address: string): Promise<Partial<Answer>>
{
    try {
        const response = await fetch(address);
        return response.ok ? await response.json() as Partial<Answer> : {};
    } catch {
        return {};
    }
}
