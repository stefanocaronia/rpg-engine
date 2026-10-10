// Where the player's character goes when the master asks (D-332, ASK-11): the map of the place over the whole page, its squares at least 44 px, those the
// character can still reach in gold; a square touched is chosen, then sent. A square can also be written, such as E4, from the keyboard.
import { useEffect, useRef, useState } from "preact/hooks";
import type { ShownGrid } from "./data.ts";
import { Icon } from "./icons.tsx";
import { PlaceMap } from "./place-map-view.tsx";
import { isStandable, squareOf } from "./place-map.ts";

export function MapSheet({ map, place, question, onPick, onClose }: { map: ShownGrid; place: string; question: string; onPick(square: string): void; onClose(): void; })
{
    const [selected, setSelected] = useState<string>();
    const [typed, setTyped] = useState("");
    const dialog = useRef<HTMLDialogElement>(null);
    const written = typed.trim().toUpperCase();
    const chosen = written !== "" ? written : selected;
    const square = chosen === undefined ? undefined : squareOf(chosen);
    const standable = square !== undefined && isStandable(map, square);

    // A modal dialog lies over everything on the page, the bars and the dice too, and closes with Escape by itself.
    useEffect(() => {
        dialog.current?.showModal();
    }, []);

    const pick = (name: string): void => {
        setSelected(name);
        setTyped("");
    };

    const send = (event: Event): void => {
        event.preventDefault();

        if (chosen !== undefined && standable) {
            onPick(chosen);
        }
    };

    return (
        <dialog ref={dialog} class="map-sheet" aria-labelledby="map-sheet-title" onClose={onClose}>
            <header class="map-sheet-head">
                <h2 id="map-sheet-title">{question}</h2>
                <button type="button" class="icon-button" aria-label="Close" data-tip="Close" onClick={() => dialog.current?.close()}>
                    <Icon name="close" />
                </button>
            </header>
            <div class="map-sheet-body">
                <PlaceMap map={map} place={place} picking={{ selected: written === "" ? selected : undefined, onSelect: pick }} />
            </div>
            <form class="map-sheet-bar" onSubmit={send}>
                <input type="text" value={typed} maxLength={5} placeholder={selected ?? "E4"} aria-label="The square, such as E4" onInput={(event) => setTyped(event.currentTarget.value)} />
                <button type="submit" class="map-sheet-go" disabled={!standable}>
                    {chosen === undefined ? "Touch a square" : standable ? `Move to ${chosen}` : `${chosen}: no one stands there`}
                </button>
            </form>
        </dialog>
    );
}
