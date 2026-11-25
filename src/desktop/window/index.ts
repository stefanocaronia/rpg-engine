// The application windows the engine opens: their kinds and sizes, how one is known for ours by its title, and one window for an address at a time.
import type { WindowKind } from "./sizes.ts";
import type { WindowTitles } from "./windows.ts";

export { type ScreenRoom, type WindowKind, type WindowPlace, windowPlace, type WindowSize, windowSizes } from "./sizes.ts";
export { type PlaceCommand, placeCommand, readPlaced, type WindowTitles } from "./windows.ts";

/**
 * The title of the engine's pages: their shell's (src/server/page/files.ts), which the launcher's page keeps and a campaign's page ends with
 * (src/dashboard/shell/product.ts). Change them together.
 */
export const pageTitle = "RPG Engine";

/** The titles a window of a kind may have as it opens: its address while its page loads, then its page's title; a campaign's puts its name before it. */
export function windowTitles(kind: WindowKind, url: string): WindowTitles
{
    return { address: new URL(url).host, exact: [pageTitle], endings: kind === "campaign" ? [` · ${pageTitle}`] : [] };
}

/** Opens an address in an application window of a kind: whether one opened. */
export type WindowOpener = (url: string, kind: WindowKind) => Promise<boolean>;

// How long an address stays being opened once the browser was started: a browser that hands it to one running already answers before the window is there.
const settleWait = 2000;

/** An opener that opens one window for an address at a time: asked again meanwhile, as by two quick clicks, it answers as the first does and opens none. */
export function oneWindowAtATime(open: WindowOpener, settle = settleWait): WindowOpener
{
    const opening = new Map<string, Promise<boolean>>();

    return (url, kind) => {
        const pending = opening.get(url);

        if (pending !== undefined) {
            return pending;
        }

        const opened = open(url, kind).catch(() => false);
        opening.set(url, opened);
        void opened.then(() => setTimeout(() => opening.delete(url), settle).unref());
        return opened;
    };
}
