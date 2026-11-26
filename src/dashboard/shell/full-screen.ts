// On a phone the page takes the whole screen by itself, the browser's bars put away, at the player's first touch: a browser lets a page ask for it only
// then. Android's Chrome does; Safari on an iPhone lets no page do it. Never with a mouse, as on a computer and in the launcher's window. The player who
// leaves it keeps the browser's bars until the page has been away and comes back, as from another app.

// A phone, upright or on its side, and a page that is not already an app of its own on the home screen.
const phone = "(pointer: coarse) and (max-width: 600px), (pointer: coarse) and (max-height: 600px)";
const installed = "(display-mode: standalone), (display-mode: fullscreen)";

/** Asks for the whole screen at the next touch on a phone, and again at the first touch after the page comes back. */
export function fullScreenOnTouch(): void
{
    if (!document.fullscreenEnabled) {
        return;
    }

    let armed = true;

    // A touch lifted is what lets a page ask; a mouse, a pen or a page already on the whole screen asks nothing.
    const touched = (event: PointerEvent): void => {
        if (!armed || event.pointerType !== "touch" || !matchMedia(phone).matches || matchMedia(installed).matches) {
            return;
        }

        armed = false;

        if (document.fullscreenElement === null) {
            document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
        }
    };

    document.addEventListener("pointerup", touched, true);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            armed = true;
        }
    });
}
