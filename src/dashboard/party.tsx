// The party's strip (D-276): a link to each one's sheet, with their token and its mood's badge (D-305), their name, the first counter of their line and their
// effects; the dead go last.
import type { Member } from "./data.ts";
import { fieldLabel, initials, nameHue } from "./labels.ts";
import { stripCounter } from "./layout.ts";
import { MoodBadge, moodLabel } from "./mood.tsx";
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
        <span class="token-holder">
            <Token member={member} large={large} />
            <MoodBadge mood={member.mood} large={large} />
        </span>
    );
}

/** Whom a token shows: someone of the party, or anyone else a roll is for (D-286). */
export type Tokened = Pick<Member, "name" | "image"> & { role: Member["role"] | "other"; dead?: boolean; };

/** Someone's round token: their picture, or their initials on a colour of their own; the ring tells the role by its shape too (D-267, D-273). */
export function Token({ member, large }: { member: Tokened; large?: boolean; })
{
    const classes = ["token", member.role, member.dead ? "dead" : "", large ? "large" : ""].filter((name) => name !== "").join(" ");
    return (
        <span class={classes} aria-hidden="true">
            {member.image === undefined
                ? <span class="initials" style={{ "--hue": String(nameHue(member.name)) }}>{initials(member.name)}</span>
                // A new address when the picture changes; the same one comes back as not modified on a reload (D-277).
                : <img src={`/images/${encodeURIComponent(member.image.file)}?v=${member.image.version}`} alt="" />}
        </span>
    );
}
