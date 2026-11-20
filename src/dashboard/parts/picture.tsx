// A picture of the player's own for a page they see (D-572 (3)): a file of their computer, sent to the game, which makes it the page's picture in place of the
// one it has. Over the corner of a page's pictures, a small square on the veil, seen under the pointer and with the keyboard, always on touch (PictureSpot for a
// coin, a .picture-host for a picture that fills its box); as words in the open page of the World. Its look is this file's and picture.css's alone.
import type { ComponentChildren } from "preact";
import { useRef, useState } from "preact/hooks";
import { givePicture } from "../api.ts";
import { t } from "../text.ts";
import { Icon } from "./icons.tsx";

// What the game takes, as image takes it: the browser's chooser shows these first.
const pictureTypes = "image/png,image/jpeg,image/webp,image/svg+xml";

// How long a picture stays darkened, at most, waiting for the new one to reach the page.
const longestWait = 8000;

/** A page's picture as a coin, with the control that gives it one of the player's own on its rim, across from the pip of its side. */
export function PictureSpot({ page, has = true, children, class: extra }: { page: string; has?: boolean; children: ComponentChildren; class?: string; })
{
    return (
        <span class={extra === undefined ? "picture-spot" : `picture-spot ${extra}`}>
            {children}
            <PictureButton page={page} has={has} icon rim />
        </span>
    );
}

/**
 * The control that gives `page` a picture of the player's own: "Change the picture…", or "Add a picture…" while it shows none; as words, or as an icon over a
 * picture's corner, its tip towards the picture's start, or on a coin's rim, its tip over it. In a list's row it is on its thumb's rim, no stop of Tab, and no
 * button on touch, as the page it opens has one.
 */
export function PictureButton({ page, has, icon = false, rim = false, row = false }: { page: string; has: boolean; icon?: boolean; rim?: boolean; row?: boolean; })
{
    const own = useRef<HTMLSpanElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const [sending, setSending] = useState(false);
    const [problem, setProblem] = useState<string>();
    const [said, setSaid] = useState("");
    const words = has ? t("Change the picture…") : t("Add a picture…");
    const named = has ? t("Change the picture: {page}", { page }) : t("Add a picture: {page}", { page });

    const send = async (file: File | undefined): Promise<void> => {
        if (file === undefined) {
            return;
        }

        const host = own.current?.parentElement ?? null;
        const before = shownPicture(host);
        setSending(true);
        setProblem(undefined);
        setSaid("");
        const refused = await givePicture(page, file);

        if (input.current !== null) {
            input.current.value = "";
        }

        if (refused !== undefined) {
            setSending(false);
            setProblem(refused);
            return;
        }

        setSaid(t("{page} has your picture now.", { page }));

        // Over a picture, it stays darkened until the new one is on the page, and clears into it.
        if (icon && host !== null) {
            await newPicture(host, before);
        }

        setSending(false);
    };

    const choose = (event: MouseEvent): void => {
        // Over a picture that opens something, the click is the control's alone.
        event.preventDefault();
        event.stopPropagation();

        if (!sending) {
            input.current?.click();
        }
    };

    const classes = ["picture-give", icon ? "icon" : "", sending ? "sending" : "", problem === undefined ? "" : "refused"].filter((name) => name !== "");
    return (
        <span ref={own} class={classes.join(" ")}>
            <input ref={input} type="file" accept={pictureTypes} hidden tabIndex={-1} onChange={(event) => void send(event.currentTarget.files?.[0])} />
            <button
                type="button"
                class={icon ? (rim || row ? "icon-button" : "icon-button tip-left") : "button package-button"}
                aria-label={named}
                data-tip={icon ? (sending ? t("Sending…") : words) : undefined}
                aria-busy={sending}
                aria-disabled={sending ? "true" : undefined}
                tabIndex={row ? -1 : undefined}
                onClick={choose}
            >
                {icon ? <span class="picture-plate">{sending ? <Waiting /> : <Icon name="picture" />}</span> : sending ? <Waiting /> : <Icon name="picture" />}
                {!icon && (sending ? t("Sending…") : words)}
            </button>
            {problem !== undefined && <span class="picture-problem" role="alert">{problem}</span>}
            <span class="visually-hidden" role="status">{said}</span>
        </span>
    );
}

/** The ring that turns while the picture is sent, in place of the icon. */
function Waiting()
{
    return <span class="picture-wait" aria-hidden="true" />;
}

/** The address of the picture a host shows now, or "" for none. */
function shownPicture(host: Element | null): string
{
    return host?.querySelector("img")?.src ?? "";
}

/** Settles once the host shows a picture other than `before`, loaded, or after the longest wait, if the page does not change. */
function newPicture(host: Element, before: string): Promise<void>
{
    return new Promise((resolve) => {
        const done = (): void => {
            watch.disconnect();
            clearTimeout(timer);
            resolve();
        };

        const watch = new MutationObserver(() => {
            const image = host.querySelector("img");

            if (image !== null && image.src !== before) {
                watch.disconnect();
                void image.decode().catch(() => undefined).then(done);
            }
        });
        const timer = setTimeout(done, longestWait);
        watch.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });
    });
}
