// A section's tabs under its head: the chosen one in the accent, in the address, which the arrows, Home and End move along; on a phone the row scrolls sideways.
import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { type Section, sectionAddress } from "./address.ts";
import { arrowStep } from "./text.ts";

/** A tab: its key in the address, its name, what a screen reader says when its marks say more, and the marks after its name. */
export interface PageTab
{
    key: string;
    name: string;
    label?: string;
    marks?: ComponentChildren;
}

/** A section's tabs: their keys in order, the first one's address the section's own, and their names in the page's language; onChoose hears each choice. */
export function PageTabs({ section, tabs, chosen, label, onChoose }: { section: Section; tabs: PageTab[]; chosen: string; label: string; onChoose?: (key: string) => void; })
{
    const row = useRef<HTMLDivElement>(null);

    const choose = (key: string): void => {
        onChoose?.(key);
        location.replace(sectionAddress(section, key === tabs[0]?.key ? undefined : key));
    };

    // The chosen tab brought into the row, the page itself never moved.
    useEffect(() => {
        const box = row.current;
        const tab = box?.querySelector<HTMLElement>(`[aria-selected="true"]`);

        if (box === null || tab === null || tab === undefined) {
            return;
        }

        const rowBox = box.getBoundingClientRect();
        const tabBox = tab.getBoundingClientRect();
        box.scrollLeft += Math.min(0, tabBox.left - rowBox.left) + Math.max(0, tabBox.right - rowBox.right);
    }, [chosen, tabs.length]);

    const move = (event: KeyboardEvent): void => {
        const at = tabs.findIndex((tab) => tab.key === chosen);
        const step = arrowStep(event.key, true);
        const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1) : step === 0 ? undefined : tabs[(at + step + tabs.length) % tabs.length];

        if (next !== undefined) {
            event.preventDefault();
            choose(next.key);
            row.current?.querySelector<HTMLElement>(`#${section}-tab-${next.key}`)?.focus();
        }
    };

    return (
        <div class="page-tabs" role="tablist" aria-label={label} ref={row} onKeyDown={move}>
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    id={`${section}-tab-${tab.key}`}
                    aria-label={tab.label}
                    aria-selected={tab.key === chosen}
                    aria-controls={tab.key === chosen ? `${section}-panel` : undefined}
                    tabIndex={tab.key === chosen ? 0 : -1}
                    onClick={() => choose(tab.key)}
                >
                    {tab.name}
                    {tab.marks}
                </button>
            ))}
        </div>
    );
}
