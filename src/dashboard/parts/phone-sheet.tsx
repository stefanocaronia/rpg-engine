// A sheet from the window's foot on a phone, as the card of an action is there (acts/sheet.tsx): the chat's own commands, the page's menu.
import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { ActHead } from "../acts/head.tsx";

/**
 * A modal sheet named by its title, with Close in its head: Close, Escape, the phone's way back and a touch on the page behind it close it, and the focus
 * goes back to what opened it. `kind` is its own class, for what it holds.
 */
export function PhoneSheet({ title, kind, onClose, children }: { title: string; kind: string; onClose(): void; children: ComponentChildren; })
{
    const dialog = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        dialog.current?.showModal();
    }, []);

    const close = (): void => dialog.current?.close();
    return (
        <dialog
            ref={dialog}
            class={`map-sheet act-sheet ${kind}`}
            aria-labelledby="act-sheet-title"
            onClose={onClose}
            onClick={(event) => {
                // The sheet's own box is all its parts': a touch that reaches the dialog itself fell on the page behind it.
                if (event.target === event.currentTarget) {
                    close();
                }
            }}
        >
            <ActHead title={title} onClose={close} />
            {children}
        </dialog>
    );
}
