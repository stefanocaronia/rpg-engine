// The party's strip (D-273): a tab for each, with their token, their name, the first counter of their line and their effects; the dead go last.
import type { Member } from "./data.ts";
import { fieldLabel, initials, nameHue } from "./labels.ts";
import { stripCounter } from "./layout.ts";
import { Bar, Effects } from "./widgets.tsx";

export function PartyStrip({ party, chosen, version, onChoose }: { party: Member[]; chosen?: string; version: number; onChoose: (name: string) => void; })
{
    const ordered = [...party.filter((member) => !member.dead), ...party.filter((member) => member.dead)];

    // The arrows move along the tabs, as in any tab list.
    const onKeyDown = (event: KeyboardEvent): void => {
        const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        const index = ordered.findIndex((member) => member.name === chosen);

        if (step !== 0 && index >= 0) {
            const next = ordered[(index + step + ordered.length) % ordered.length];
            onChoose(next.name);
            (event.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-name="${CSS.escape(next.name)}"]`)?.focus();
        }
    };

    return (
        <nav class="party" role="tablist" aria-label="Party" onKeyDown={onKeyDown}>
            {ordered.map((member) => {
                const counter = stripCounter(member);
                const selected = member.name === chosen;
                return (
                    <button
                        key={member.name}
                        type="button"
                        role="tab"
                        class={`member${member.dead ? " dead" : ""}`}
                        data-name={member.name}
                        aria-selected={selected}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => onChoose(member.name)}
                    >
                        <Token member={member} version={version} />
                        <span class="name">{member.name}</span>
                        {member.dead ? <span class="dead-mark">dead</span> : counter && <Bar value={counter} label={fieldLabel(counter.field)} />}
                        <Effects effects={member.effects} most={2} />
                    </button>
                );
            })}
        </nav>
    );
}

/** Someone's round token: their picture, or their initials on a colour of their own; the ring tells the role by its shape too (D-267, D-273). */
export function Token({ member, version, large }: { member: Member; version: number; large?: boolean; })
{
    const classes = ["token", member.role, member.dead ? "dead" : "", large ? "large" : ""].filter((name) => name !== "").join(" ");
    return (
        <span class={classes} aria-hidden="true">
            {member.image === undefined
                ? <span class="initials" style={{ "--hue": String(nameHue(member.name)) }}>{initials(member.name)}</span>
                // A picture given again keeps its name: the version asks for it again after every change, and the server answers "not modified" when it is the same.
                : <img src={`/images/${encodeURIComponent(member.image)}?v=${version}`} alt="" />}
        </span>
    );
}
