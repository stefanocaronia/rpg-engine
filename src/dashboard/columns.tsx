// Cards in columns that stay (D-383): each card is placed once in the shortest column, by the heights the cards have then, and placed again only when the
// number of columns changes or cards come and go; opening or closing one moves only what is under it, never the other columns.
import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { columnsByHeight } from "./layout.ts";

// The narrowest a column gets, and the room between two, in pixels: the page's one room, --gap in the style sheet.
const columnWidth = 300;
const columnGap = 16;

/** A card to place, by a key unique among the cards. */
export interface Placed
{
    key: string;
    node: ComponentChildren;
}

export function FixedColumns({ cards }: { cards: Placed[]; })
{
    const holder = useRef<HTMLDivElement>(null);
    const [count, setCount] = useState(1);
    const [placed, setPlaced] = useState<{ count: number; keys: string; columns: Map<string, number>; }>();
    const keys = cards.map((card) => card.key).join("\n");
    const current = placed !== undefined && placed.count === count && placed.keys === keys ? placed : undefined;

    // As many columns as fit the width.
    useLayoutEffect(() => {
        const element = holder.current;

        if (element === null) {
            return;
        }

        const measure = (): void => setCount(Math.max(1, Math.floor((element.clientWidth + columnGap) / (columnWidth + columnGap))));
        measure();
        const watcher = new ResizeObserver(measure);
        watcher.observe(element);
        return () => watcher.disconnect();
    }, []);

    // Placed again only when the columns or the cards change: each card in its order into the shortest column, by the heights the cards have now.
    useLayoutEffect(() => {
        if (current !== undefined || holder.current === null) {
            return;
        }

        const heights = new Map([...holder.current.querySelectorAll<HTMLElement>("[data-card]")].map((slot) => [slot.dataset.card ?? "", slot.offsetHeight]));
        const columns = columnsByHeight(cards.map((card) => heights.get(card.key) ?? 0), count);
        setPlaced({ count, keys, columns: new Map(cards.map((card, index) => [card.key, columns[index]])) });
    });

    // Until they are measured, the cards go round the columns in their order.
    const columnOf = (key: string, index: number): number => current?.columns.get(key) ?? index % count;
    return (
        <div ref={holder} class="fixed-columns">
            {Array.from({ length: count }, (_, column) => (
                <div key={column} class="fixed-column">
                    {cards.map((card, index) =>
                        columnOf(card.key, index) === column && (
                            <div key={card.key} data-card={card.key}>
                                {card.node}
                            </div>
                        )
                    )}
                </div>
            ))}
        </div>
    );
}
