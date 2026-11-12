// What the page shows as last read, held back while a card's dice fly, and whose sheet it reads when the address names no one.
import type { Asked, CalendarDay, ChoicesNow, Member, Mood, SheetCards, SheetGroup, ShownImport, ShownPlace, ShownRoll, ShownScene } from "../data.ts";
import type { PackCard } from "../packages/card.ts";
import { hasTurns } from "../play/turns.tsx";

/** What the page shows: the campaign, its system and its time, the party, whom the address names and their sheet, the rolls and what the master asks, as of when it was read. */
export interface Shown
{
    campaign?: string;
    system?: { name: string; title: string; attribution?: string; };
    now?: string;
    calendar?: CalendarDay;
    party: Member[];
    /** With more than one player character, the one in the foreground, whose place the page shows (VIEW-12). */
    foreground?: string;
    chosen?: string;
    /** The line under the chosen one's name, such as Level 3 Cleric. */
    headline?: string;
    sheet: SheetGroup[];
    cards?: SheetCards;
    text: string;
    /** The text's secrets that only some of the player characters discovered, each with who (D-480 (7)). */
    knownBy?: { secret: string; who: string[]; }[] | undefined;
    /** The player character's opening text, when the player may write it (D-373). */
    story?: string;
    rolls: ShownRoll[];
    /** How many public rolls the log has, past those read. */
    rollsTotal: number;
    /** The master's mood, on the robot (D-305). */
    masterMood?: Mood;
    /** Where the party is, and the open scene (VIEW-6). */
    place?: ShownPlace;
    openScene?: ShownScene;
    asked?: Asked;
    /** The card of a package's question, which stays through the questions of its attempt and after them, until closed (D-507). */
    pack?: PackCard | undefined;
    /** How many times it was read: what was explained is told again after each. */
    version: number;
    readAt?: Date;
    noCharacter?: boolean;
    /** How many problems the campaign's files have, which the master fixes (validate). */
    problems?: number;
    /** An import under way (D-491 (11)). */
    importing?: ShownImport;
    /** The campaign's language, when this computer is translating the game system's pages into it (D-539). */
    textsTranslating?: string;
    problem?: string;
    /** What a roll from a card, or a die of a rest, changed, kept back while its dice are in the air (D-461, D-492). */
    pending?: Steady;
    /** The choices the master prepared for the party, and whether the player rolls their own dice (D-556). */
    choices?: ChoicesNow;
}

/** The page as read now; while a card's dice fly, with the sheet and the fight as they were, what the roll changed kept until they land (D-461). */
export function withHeld(before: Shown, next: Shown, hold: boolean): Shown
{
    if (!hold) {
        return { ...next, pending: undefined };
    }

    const steady = (shown: Shown): Steady => ({
        party: shown.party,
        chosen: shown.chosen,
        headline: shown.headline,
        sheet: shown.sheet,
        cards: shown.cards,
        text: shown.text,
        knownBy: shown.knownBy,
        story: shown.story,
        openScene: shown.openScene,
        pack: shown.pack,
    });
    return { ...next, ...steady(before), pending: steady(next) };
}

/** The player character of the party by their name; undefined for anyone else, or none. */
export function playerNamed(party: Member[], name: string | undefined): Member | undefined
{
    return name === undefined ? undefined : party.find((member) => member.role === "pc" && member.name === name);
}

/**
 * Whose sheet the page reads when the address names no one (D-480 (7)): in the Party section the player character the master asks, then whose turn it is;
 * elsewhere whose turn it is first, for the card at hand in a fight; else the one in the foreground, else the first.
 */
export function calledOf(party: Member[], section: string, asked: Asked | undefined, scene: ShownScene | undefined, foreground: string | undefined): Member | undefined
{
    const asking = playerNamed(party, asked?.who);
    const acting = hasTurns(scene) ? playerNamed(party, scene.turn) : undefined;
    return (section === "party" ? asking ?? acting : acting ?? asking) ?? playerNamed(party, foreground) ?? party[0];
}

/** The turn of a scene that goes by them, as the round and who acts; empty outside turns. */
export function turnKey(scene: ShownScene | undefined): string
{
    return hasTurns(scene) ? `${scene.title} ${scene.since ?? ""} ${scene.round ?? ""} ${scene.turn ?? ""}` : "";
}

/** What a roll changes of the sheet and the fight, which the page shows only once its dice land. */
type Steady = Pick<Shown, "party" | "chosen" | "headline" | "sheet" | "cards" | "text" | "knownBy" | "story" | "openScene" | "pack">;
