// The page's one tooltip (T-228): what a control's `data-tip` says, shown in the top layer over every card, list and dialog, so that no box that scrolls or
// clips cuts it, and placed beside its control inside the window. After a moment under a pointer, at once when the keyboard reaches it, never at a touch;
// Escape or a press hides it. It is for the eye: what it says is already the control's name for a screen reader. It reaches into the packages' shadow roots.

// How far from its control, and from the window's edges.
const gap = 8;
const margin = 8;
// Moving from one tip to the next within this time shows the next at once.
const followTime = 300;

type Side = "above" | "below" | "start";

let tip: HTMLElement | undefined;
// Whose tip shows, or waits for its moment, and how it was reached.
let target: Element | undefined;
let reachedBy: "pointer" | "focus" | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
// A control pressed or dismissed with Escape shows no tip until the pointer leaves it.
let quiet: Element | undefined;
let hiddenAt = 0;
const watcher = typeof MutationObserver === "undefined" ? undefined : new MutationObserver(() => follow());

/** Starts the page's tooltips, once, at the page's start. */
export function startTooltips(): void
{
    document.addEventListener("pointerover", onPointerOver, true);
    document.addEventListener("pointerout", onPointerOut, true);
    document.addEventListener("pointerdown", onPress, true);
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
}

function onPointerOver(event: PointerEvent): void
{
    if (event.pointerType === "touch") {
        return;
    }

    const found = tipped(event.composedPath());

    if (found !== quiet) {
        quiet = undefined;
    }

    if (found === undefined || found === quiet) {
        if (reachedBy !== "focus") {
            hide();
        }

        return;
    }

    if (found !== target || reachedBy !== "pointer") {
        const shownNow = tip?.classList.contains("shown") === true || performance.now() - hiddenAt < followTime;
        wait(found, shownNow ? 0 : waitTime());
    }
}

// The pointer leaving the window.
function onPointerOut(event: PointerEvent): void
{
    if (event.relatedTarget === null && reachedBy === "pointer") {
        hide();
    }
}

function onPress(event: PointerEvent): void
{
    const found = tipped(event.composedPath());

    if (found !== undefined) {
        quiet = found;
    }

    hide();
}

function onFocusIn(event: FocusEvent): void
{
    const focused = event.composedPath()[0];

    if (focused instanceof Element && hasTip(focused) && focused !== quiet && focused.matches(":focus-visible")) {
        show(focused, "focus");
    } else if (reachedBy === "focus") {
        hide();
    }
}

function onFocusOut(event: FocusEvent): void
{
    // Dismissed with Escape, it shows again when the keyboard comes back to it.
    if (quiet === event.composedPath()[0]) {
        quiet = undefined;
    }

    if (reachedBy === "focus") {
        hide();
    }
}

// Escape hides the tip shown (WCAG 1.4.13), and lets the key go on to what else it closes.
function onKey(event: KeyboardEvent): void
{
    if (event.key === "Escape" && target !== undefined) {
        quiet = target;
        hide();
    }
}

// The tip follows its control as the page or a list scrolls, and goes with it out of sight; the pointer, left behind, shows the next as it goes over it.
function onScroll(): void
{
    place();
}

/** The nearest control with a tip along an event's path, across shadow roots. */
function tipped(path: EventTarget[]): Element | undefined
{
    return path.find((step): step is Element => step instanceof Element && hasTip(step));
}

function hasTip(element: Element): boolean
{
    return (element.getAttribute("data-tip") ?? "") !== "";
}

function wait(element: Element, time: number): void
{
    clearTimeout(timer);

    if (time === 0) {
        show(element, "pointer");
        return;
    }

    hide();
    target = element;
    reachedBy = "pointer";
    timer = setTimeout(() => show(element, "pointer"), time);
}

function show(element: Element, how: "pointer" | "focus"): void
{
    clearTimeout(timer);
    const shown = tipElement();
    target = element;
    reachedBy = how;
    shown.textContent = element.getAttribute("data-tip");
    shown.dir = getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
    watcher?.disconnect();
    watcher?.observe(element, { attributes: true, attributeFilter: ["data-tip"] });

    // Shown again, so that it stands over a dialog opened since; its side and state set before, as showing it reads its style, which it comes from.
    if (shown.classList.contains("shown")) {
        closeLayer(shown);
    }

    shown.dataset.side = askedSide(element);
    shown.classList.add("shown");
    openLayer(shown);
    place();
}

function hide(): void
{
    clearTimeout(timer);
    watcher?.disconnect();
    target = undefined;
    reachedBy = undefined;

    if (tip?.classList.contains("shown") === true) {
        tip.classList.remove("shown");
        closeLayer(tip);
        hiddenAt = performance.now();
    }
}

// Its control's words changed while it shows, as a picture's while it is sent; or went.
function follow(): void
{
    if (target === undefined || tip === undefined) {
        return;
    }

    if (!hasTip(target)) {
        hide();
        return;
    }

    tip.textContent = target.getAttribute("data-tip");
    place();
}

/** Over its control, or under it (`.tip-below`), or on its start side (`.tip-left`), as asked; where there is no room, the other way; inside the window. */
function place(): void
{
    if (target === undefined || tip === undefined || !tip.classList.contains("shown")) {
        return;
    }

    const box = target.getBoundingClientRect();

    const windowWidth = document.documentElement.clientWidth;
    const windowHeight = window.innerHeight;

    // Its control gone, or scrolled out of sight.
    if (!target.isConnected || (box.width === 0 && box.height === 0) || box.bottom < 0 || box.top > windowHeight) {
        hide();
        return;
    }

    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    const rtl = tip.dir === "rtl";
    const asked = askedSide(target);
    const startLeft = rtl ? box.right + gap : box.left - gap - width;
    const roomAbove = box.top - gap - height >= margin;
    const roomBelow = box.bottom + gap + height <= windowHeight - margin;
    const roomStart = startLeft >= margin && startLeft + width <= windowWidth - margin;
    const side: Side = asked === "start" && roomStart ? "start" : asked === "below" ? (roomBelow || !roomAbove ? "below" : "above") : roomAbove || !roomBelow ? "above" : "below";
    const left = side === "start" ? startLeft : box.left + box.width / 2 - width / 2;
    const top = side === "start" ? box.top + box.height / 2 - height / 2 : side === "above" ? box.top - gap - height : box.bottom + gap;
    tip.dataset.side = side;
    tip.style.setProperty("--tip-left", `${Math.round(within(left, margin, windowWidth - margin - width))}px`);
    tip.style.setProperty("--tip-top", `${Math.round(within(top, margin, windowHeight - margin - height))}px`);
}

function askedSide(element: Element): Side
{
    return element.classList.contains("tip-left") ? "start" : element.classList.contains("tip-below") ? "below" : "above";
}

function within(value: number, low: number, high: number): number
{
    return Math.max(low, Math.min(value, high));
}

// The one tip of the page, made at its first need, hidden from a screen reader: the control says it already.
function tipElement(): HTMLElement
{
    if (tip === undefined) {
        tip = document.createElement("div");
        tip.className = "page-tip";
        tip.setAttribute("aria-hidden", "true");

        if (supportsPopover(tip)) {
            tip.popover = "manual";
        } else {
            tip.hidden = true;
        }

        document.body.append(tip);
    }

    return tip;
}

function openLayer(element: HTMLElement): void
{
    if (supportsPopover(element)) {
        element.showPopover();
    } else {
        element.hidden = false;
    }
}

function closeLayer(element: HTMLElement): void
{
    if (!supportsPopover(element)) {
        element.hidden = true;
    } else if (element.matches(":popover-open")) {
        element.hidePopover();
    }
}

function supportsPopover(element: HTMLElement): boolean
{
    return typeof element.showPopover === "function";
}

// The moment a pointer rests on a control before its tip shows: the page's --wait.
function waitTime(): number
{
    const value = getComputedStyle(document.documentElement).getPropertyValue("--wait").trim();
    const time = Number.parseFloat(value);
    return Number.isNaN(time) ? 500 : value.endsWith("ms") ? time : time * 1000;
}
