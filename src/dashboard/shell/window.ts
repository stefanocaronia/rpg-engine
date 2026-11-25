// The window the icon opens (D-582): the launcher's small and centred on its screen, as a chooser; a campaign's large, a share of the screen's free room,
// centred too. The page that opens marked sizes its window once and takes the mark off its address, so that a reload keeps the size the player gave it.
// A browser gives every application window of one address the size the last had, whatever page it shows: the page says its own. On Windows the process
// that opens a window places it from outside, with the same sizes (src/desktop/window/index.ts: change both together), and marks nothing.

/** The mark on the address of a page whose window is to be sized: what `rpg open` puts on the launcher's, and each page on the address it sends the window to. */
export const openedMark = "opened";

/** What a window shows: the campaigns to choose from, or a campaign being played. */
export type WindowKind = "launcher" | "campaign";

/** The free room of a screen, and where it starts among the screens: a second monitor's starts beside the first. */
export interface ScreenRoom
{
    width: number;
    height: number;
    left?: number;
    top?: number;
}

/** Where a window goes, by its outer size. */
export interface WindowPlace
{
    width: number;
    height: number;
    left: number;
    top: number;
}

// The launcher's window; the share of the screen's free room a campaign's takes, and the most it takes on a large screen, where the page past it is empty room.
const launcherSize = { width: 960, height: 680 };
const campaignShare = 0.9;
const campaignMost = { width: 1920, height: 1200 };

/** Where a window of a kind goes on a screen with this much free room: centred on it, never larger than it. */
export function windowPlace(kind: WindowKind, room: ScreenRoom): WindowPlace
{
    const wanted = kind === "launcher"
        ? launcherSize
        : { width: Math.min(Math.round(room.width * campaignShare), campaignMost.width), height: Math.min(Math.round(room.height * campaignShare), campaignMost.height) };
    const width = Math.max(0, Math.min(wanted.width, Math.floor(room.width)));
    const height = Math.max(0, Math.min(wanted.height, Math.floor(room.height)));
    return { width, height, left: (room.left ?? 0) + Math.round((room.width - width) / 2), top: (room.top ?? 0) + Math.round((room.height - height) / 2) };
}

/**
 * The size of a window in Brave, which shows a page a made-up screen and moves a window elsewhere than asked: never moved there, only sized. The launcher's
 * fixed size; a campaign's the most it takes, within the screen only where the screen is larger than the window, as a real one would be: a made-up screen
 * smaller than the window leaves it as it is.
 */
export function braveSize(kind: WindowKind, screen: { width: number; height: number; }, outer: { width: number; height: number; }): { width: number; height: number; } | undefined
{
    if (kind === "launcher") {
        return launcherSize;
    }

    if (screen.width <= outer.width || screen.height <= outer.height) {
        return undefined;
    }

    return { width: Math.min(campaignMost.width, screen.width), height: Math.min(campaignMost.height, screen.height) };
}

/** An address with the mark that has its page size its window. */
export function markedAddress(url: string): string
{
    const address = new URL(url);
    address.searchParams.set(openedMark, "1");
    return address.href;
}

/** What an address asks of the page it opens, and the address without it: whether to size the window, and the campaign to open at once. */
export function addressAsks(href: string): { opened: boolean; open?: string; rest: string; }
{
    const address = new URL(href);
    const opened = address.searchParams.has(openedMark);
    const open = address.searchParams.get("open") ?? "";
    address.searchParams.delete(openedMark);
    address.searchParams.delete("open");
    return { opened, ...(open === "" ? {} : { open }), rest: `${address.pathname}${address.search}${address.hash}` };
}

/**
 * Sizes and centres the window of a page opened with the mark, on the screen it is on, and takes what the address asked off it: the campaign to open at
 * once, when it named one. A page opened without the mark keeps the window as it is.
 */
export function fitOpenedWindow(kind: WindowKind): { open?: string; }
{
    const asks = addressAsks(window.location.href);

    if (!asks.opened && asks.open === undefined) {
        return {};
    }

    window.history.replaceState(window.history.state, "", asks.rest);

    if (asks.opened && "brave" in window.navigator) {
        const size = braveSize(kind, { width: window.screen.availWidth, height: window.screen.availHeight }, { width: window.outerWidth, height: window.outerHeight });

        try {
            if (size !== undefined) {
                window.resizeTo(size.width, size.height);
            }
        } catch {
            // A browser that lets no page size its window: it stays as it is.
        }
    } else if (asks.opened) {
        // Chrome and Edge say where the window's screen starts: on a second screen the window stays there.
        const { availLeft = 0, availTop = 0 } = window.screen as Screen & { availLeft?: number; availTop?: number; };
        const place = windowPlace(kind, { width: window.screen.availWidth, height: window.screen.availHeight, left: availLeft, top: availTop });

        try {
            // To its corner first, so that a window that grows never grows past the screen's edge; again after, as a browser may have kept it inside the screen.
            window.moveTo(place.left, place.top);
            window.resizeTo(place.width, place.height);
            window.moveTo(place.left, place.top);
        } catch {
            // A browser that lets no page size its window: it stays as it is.
        }
    }

    return asks.open === undefined ? {} : { open: asks.open };
}
