// The kinds of window the engine opens and their sizes: the launcher's small and centred on its screen, as a chooser; a campaign's large, a share of its
// screen's free room, centred too. The page keeps the same sizes where it sizes its own window (src/dashboard/shell/window.ts): change both together.

/** What a window shows: the campaigns to choose from, or a campaign being played. */
export type WindowKind = "launcher" | "campaign";

/** How large a window of a kind is, in device-independent pixels: the most it takes, and the share of its screen's free room it takes at most. */
export interface WindowSize
{
    width: number;
    height: number;
    share: number;
}

/** The size of each kind of window. */
export const windowSizes: Readonly<Record<WindowKind, WindowSize>> = {
    launcher: { width: 960, height: 680, share: 1 },
    campaign: { width: 1920, height: 1200, share: 0.9 },
};

/** The free room of a screen, and where it starts among the screens: a second monitor's starts beside the first. */
export interface ScreenRoom
{
    width: number;
    height: number;
    left?: number;
    top?: number;
}

/** Where a window goes: its corner and its size. */
export interface WindowPlace
{
    width: number;
    height: number;
    left: number;
    top: number;
}

/** Where a window of a kind goes on a screen with this much free room: centred on it, never larger than it. */
export function windowPlace(kind: WindowKind, room: ScreenRoom): WindowPlace
{
    const size = windowSizes[kind];
    const width = Math.max(0, Math.min(size.width, Math.round(room.width * size.share), Math.floor(room.width)));
    const height = Math.max(0, Math.min(size.height, Math.round(room.height * size.share), Math.floor(room.height)));
    return { width, height, left: (room.left ?? 0) + Math.round((room.width - width) / 2), top: (room.top ?? 0) + Math.round((room.height - height) / 2) };
}
