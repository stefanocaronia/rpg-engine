// The party's strip (D-276): a link to each one's sheet, with their token and its mood's badge (D-305), their name, the first counter of their line and their
// effects; the dead go last.
import type { Member } from "./data.ts";
import { fieldLabel, initials, nameHue } from "./labels.ts";
import { stripCounter } from "./layout.ts";
import { MoodBadge, moodLabel } from "./mood.tsx";
import { tokenSymbolsPref, usePref } from "./prefs.ts";
import { t } from "./text.ts";
import { Bar, Effects } from "./widgets.tsx";

/** The address of someone's sheet, which the AI can give the player too (D-276). */
export function sheetAddress(name: string): string
{
    return `#/party/${encodeURIComponent(name)}`;
}

export function PartyStrip({ party, chosen }: { party: Member[]; chosen?: string; })
{
    const ordered = [...party.filter((member) => !member.dead), ...party.filter((member) => member.dead)];
    return (
        <nav class="party" aria-label={t("Party")}>
            {ordered.map((member) => {
                const counter = stripCounter(member);
                // One name for a screen reader, which the drawing inside would say twice.
                const said = [
                    member.name,
                    member.mood === undefined ? "" : moodLabel(member.mood),
                    counter === undefined ? "" : `${fieldLabel(counter.field)} ${counter.text}`,
                    member.dead ? t("dead") : "",
                    ...member.effects.map((effect) => effect.name),
                ];
                return (
                    <a
                        key={member.name}
                        href={sheetAddress(member.name)}
                        class={`member${member.dead ? " dead" : ""}`}
                        aria-current={member.name === chosen ? "page" : undefined}
                        aria-label={said.filter((part) => part !== "").join(", ")}
                    >
                        <MemberToken member={member} />
                        <span class="name">{member.name}</span>
                        {member.dead ? <span class="dead-mark">{t("dead")}</span> : counter && <Bar value={counter} label={fieldLabel(counter.field)} />}
                        <Effects effects={member.effects} most={2} />
                    </a>
                );
            })}
        </nav>
    );
}

/** A party member's token with the badge of their mood (D-305), in the strip and the sheet's band; never in the rolls. */
export function MemberToken({ member, large }: { member: Member; large?: boolean; })
{
    return (
        <span class="token-holder" data-tip={member.headline === undefined ? undefined : `${member.name} · ${member.headline}`}>
            <Token member={member} large={large} side={sideOf(member.role)} />
            <MoodBadge mood={member.mood} large={large} />
        </span>
    );
}

/** Whom a token shows: someone of the party, or anyone else a roll is for (D-286). */
export type Tokened = Pick<Member, "name" | "image" | "icon"> & { role: Member["role"] | "other"; dead?: boolean; };

/** The side a token's pip says (D-414): the player's character or a companion; a foe has no pip, only its glow (D-415). */
export type Side = "you" | "ally";

/** The side of one of the party by their role; anyone else has none. */
export function sideOf(role: Tokened["role"]): Side | undefined
{
    return role === "pc" ? "you" : role === "companion" ? "ally" : undefined;
}

/** The symbol of each side, for one whose class the view does not give: a star, a shield (D-414); the d of a path on a grid of 24, centred on 12, 12, drawn as a line. */
export const sideIcons: Record<Side, string> = {
    you: "M12 3.75l2.6 5.3 5.9 .9-4.3 4.1 1 5.8L12 17.15l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z",
    ally: "M12 3.25 19 5.75V11.25c0 4.6-3 8.1-7 9.5-4-1.4-7-4.9-7-9.5V5.75Z",
};

/**
 * Someone's round token, as a coin (D-267, D-409): their picture, or their initials on a colour of their own; in a fight a foe the master marked glows red a little (D-415).
 * With a side, the pip of that side at the start of its lower edge, with their class's symbol or the side's (D-414).
 */
export function Token({ member, large, hostile, side }: { member: Tokened; large?: boolean; hostile?: boolean; side?: Side; })
{
    const classes = ["token", member.role, member.dead ? "dead" : "", large ? "large" : "", hostile ? "hostile" : ""].filter((name) => name !== "").join(" ");
    return (
        <span class={classes} aria-hidden="true">
            {member.image === undefined
                ? <span class="initials" style={{ "--hue": String(nameHue(member.name)) }}>{initials(member.name)}</span>
                // A new address when the picture changes; the same one comes back as not modified on a reload (D-277).
                : <img src={`/images/${encodeURIComponent(member.image.file)}?v=${member.image.version}`} alt="" />}
            {side !== undefined && <TokenPip side={side} icon={member.icon} />}
        </span>
    );
}

/** A token's pip (D-414): a small disc in the side's colour with a symbol, their class's or the side's; none while the player keeps them off. */
export function TokenPip({ side, icon }: { side: Side; icon?: string | undefined; })
{
    const [shown] = usePref(tokenSymbolsPref);
    return shown
        ? (
            <span class={`side-pip ${side}`}>
                {/* The symbol's 24 within the pip's 34, the same box: no half pixel between them to snap (D-415). */}
                <svg viewBox="-5 -5 34 34">
                    <path d={icon ?? sideIcons[side]} />
                </svg>
            </span>
        )
        : null;
}
