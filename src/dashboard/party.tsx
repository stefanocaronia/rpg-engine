// The party's strip (D-276): a link to each one's sheet, with their token and the pip of their state (D-419), their name, the first counter of their line and
// their effects; the dead go last.
import { useContext } from "preact/hooks";
import type { Member, ShownScene } from "./data.ts";
import { WidgetsContext } from "./extension-widgets.tsx";
import { fieldLabel, initials, nameHue } from "./labels.ts";
import { stripCounter } from "./layout.ts";
import { personShown, PersonStrip } from "./person-panel.tsx";
import { tokenSymbolsPref, usePref } from "./prefs.ts";
import { besideWord, type DownTint, downTint, memberStatus, StatusPip, statusWords, type TokenStatus } from "./status.tsx";
import { t } from "./text.ts";
import { Bar, Effects } from "./widgets.tsx";

/** The address of someone's sheet, which the AI can give the player too (D-276). */
export function sheetAddress(name: string): string
{
    return `#/party/${encodeURIComponent(name)}`;
}

export function PartyStrip({ party, chosen, scene }: { party: Member[]; chosen?: string; scene?: ShownScene; })
{
    const widgets = useContext(WidgetsContext);
    const ordered = [...party.filter((member) => !member.dead), ...party.filter((member) => member.dead)];
    return (
        <nav class="party" aria-label={t("Party")}>
            {ordered.map((member) => {
                const counter = stripCounter(member);
                const status = memberStatus(member, scene, widgets);
                const person = personShown(widgets, member.name)[0];
                // One name for a screen reader, which the drawing inside would say twice.
                const said = [member.name, counter === undefined ? "" : `${fieldLabel(counter.field)} ${counter.text}`, ...statusWords(status)];
                return (
                    <a
                        key={member.name}
                        href={sheetAddress(member.name)}
                        class={`member${member.dead ? " dead" : ""}`}
                        aria-current={member.name === chosen ? "page" : undefined}
                        aria-label={said.filter((part) => part !== "").join(", ")}
                    >
                        <MemberToken member={member} status={status} />
                        <span class="name">{member.name}</span>
                        {member.dead
                            ? <span class="dead-mark">{t("dead")}</span>
                            : person !== undefined
                            ? <PersonStrip shown={person} />
                            : counter && <Bar value={counter} label={fieldLabel(counter.field)} />}
                        <Effects effects={besideWord(member.effects, status.person)} most={2} />
                    </a>
                );
            })}
        </nav>
    );
}

/** A party member's token with the pip of their state (D-419), in the strip and the sheet's band; never in the rolls. Their class in its tooltip (D-409). */
export function MemberToken({ member, large, status }: { member: Member; large?: boolean; status: TokenStatus; })
{
    return (
        <span class="token-holder" data-tip={member.headline === undefined ? undefined : `${member.name} · ${member.headline}`}>
            <Token member={member} large={large} side={sideOf(member.role)} status={status} dying={downTint(status)} />
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
 * With a side, the pip of that side at the start of its lower edge, with their class's symbol or the side's (D-414); with a state, its pip at the end (D-419); with a
 * number, a stranger's as Creature 2's or B1's, a small dark coin at the end of its upper edge, off the face (D-420).
 */
export function Token({ member, large, hostile, side, status, number, dying }: {
    member: Tokened;
    large?: boolean;
    hostile?: boolean;
    side?: Side;
    status?: TokenStatus;
    number?: string | undefined;
    /** At 0, the picture greyed, tinted as a package's widget on them says, a foe down too; dead, greyer and faded (D-461). */
    dying?: DownTint | undefined;
})
{
    const fallen = dying === "dead" || member.dead === true ? "dead" : dying === undefined ? "" : `fallen ${dying}`;
    const classes = ["token", member.role, fallen, large ? "large" : "", hostile ? "hostile" : ""].filter((name) => name !== "").join(" ");
    return (
        <span class={classes} aria-hidden="true">
            {member.image === undefined
                ? <span class="initials" style={{ "--hue": String(nameHue(member.name)) }}>{initials(member.name)}</span>
                // A new address when the picture changes; the same one comes back as not modified on a reload (D-277).
                : <img src={`/images/${encodeURIComponent(member.image.file)}?v=${member.image.version}`} alt="" />}
            {side !== undefined && <TokenPip side={side} icon={member.icon} />}
            <StatusPip status={status} />
            {number !== undefined && <TokenNumber number={number} />}
        </span>
    );
}

/**
 * A stranger's number on their token (D-420), drawn as on the map: HTML text snaps to whole pixels and sits half a pixel off in so small a coin, a drawing does
 * not. On a coin 13 high, wider for B1.
 */
function TokenNumber({ number }: { number: string; })
{
    const width = Math.max(13, number.length * 6 + 4);
    return (
        <span class="token-number" style={{ "--wide": String(width / 13) }}>
            <svg viewBox={`0 0 ${width} 13`}>
                <text x={width / 2 + opticalShift(number)} y={7.25} text-anchor="middle" dominant-baseline="middle">{number}</text>
            </svg>
        </span>
    );
}

/** How far right a number's figures sit from their middle to look centred: a final 1 has its ink left of its box, measured on the page (D-420). */
function opticalShift(number: string): number
{
    return number.endsWith("1") ? 0.35 : 0;
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
