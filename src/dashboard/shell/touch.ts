// Under a finger the page's own links are controls, as an app's: one held down opens no menu of the browser's ("Open in a new tab"), which Android's Chrome
// shows for every link. A link that leaves the page keeps its menu, to copy or to share; so do the story's words, a picture and a field. The style sheet
// does the rest of a touch's manners (style/base.css).

/** Keeps the browser's menu away from a link of the page's own that a finger holds down. */
export function noMenuOnHeldLinks(): void
{
    document.addEventListener("contextmenu", (event) => {
        const held = event.target instanceof Element ? event.target.closest("a[href]") : null;

        // The menu a held finger opens comes as a touch's; a mouse's right button keeps its menu.
        if (held !== null && (event as PointerEvent).pointerType === "touch" && held.getAttribute("href")?.startsWith("#") === true) {
            event.preventDefault();
        }
    });
}
