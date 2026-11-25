// A question that asks first, as before something is lost: a modal dialog over the whole page.
import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";

/** A modal question over the whole page, the dice too, which Escape closes. */
export function Confirm({ title, onClose, children }: { title: string; onClose(): void; children: ComponentChildren; })
{
    const dialog = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        dialog.current?.showModal();
    }, []);

    return (
        <dialog ref={dialog} class="confirm" aria-labelledby="confirm-title" onClose={onClose}>
            <h2 id="confirm-title">{title}</h2>
            {children}
        </dialog>
    );
}
