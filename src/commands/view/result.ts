// The shapes of what view returns
import type { Mood } from "../../core/mood.ts";
import type { CoinSide, NotationPart, ThrownDie } from "../../dice/index.ts";
import type { ActVerb, SheetVerb, SystemWords } from "../../systems/index.ts";
import type { CalendarDay } from "../../time/index.ts";
import type { PlayerSetting } from "../config/dashboard.ts";
import type { ShownImport } from "../import/import.ts";
import type { Mode } from "../shared/campaign/mode.ts";
import type { ResetPoint, SaveMode } from "../shared/campaign/saves.ts";
import type { MoodMoment } from "../shared/characters/moods.ts";
import type { SeenEffect } from "../shared/scene/effects.ts";
import type { SheetGroupData, SheetValue } from "../shared/sheet/sheet.ts";
import type { ShownChapter, ShownQuest, ShownThought } from "./journal.ts";
import type { ShownMap } from "./map.ts";
import type { ShownPlace, ShownScene } from "./place.ts";
import type { KnownEntry, ShownCalendar, ShownDocument } from "./world.ts";

/** What the player may see: the party, the open quests and scene and the diary; a page as the player character knows it, whole or one section; or nothing. */
export type ViewResult =
    | { kind: "none"; language?: string; importing?: ShownImport; }
    | {
        kind: "overview";
        campaign: string;
        /** The campaign's language, in which the dashboard writes its own words (D-394). */
        language?: string;
        /** The game system's words in the campaign's language, when it has them (D-403). */
        words?: SystemWords;
        /** The game system's own verbs of the sheet, beside the engine's, which its words translate (D-514). */
        verbs?: Record<string, SheetVerb>;
        /** The game system the campaign plays, for the dashboard: its name, what it is, and what its source asks a work that uses it to say (D-284). */
        system?: { name: string; title: string; attribution?: string; };
        now?: string;
        /** The day of the calendar it is now, when the campaign has one (TIM-8). */
        calendar?: CalendarDay;
        /** The master's mood, which the robot shows, and their last moment, which the dashboard shows for a few seconds when it is new (MOOD-4, MOOD-6). */
        master: { mood: Mood; moment?: MoodMoment; };
        party: PartyMember[];
        /** With more than one living player character, the one in the foreground, whose place the view gives (VIEW-12). */
        foreground?: string;
        /** Where the player character is, and the open scene, as data for the dashboard (VIEW-6). */
        place?: ShownPlace;
        openScene?: ShownScene;
        quests: string[];
        scene?: string;
        diary: string[];
        total: number;
        rolls: ShownRoll[];
        /** How many public rolls the log has, for the dashboard to offer more (D-302). */
        rollsTotal: number;
        /** How many problems the campaign's files have, which the dashboard tells the player the master fixes (validate). */
        problems: number;
        /** An import under way, which the dashboard tells the player (D-491 (11)). */
        importing?: ShownImport;
        /** The campaign's language, when this computer is translating the game system's pages into it, which the dashboard tells the player (D-539). */
        textsTranslating?: string;
    }
    | {
        kind: "page";
        title: string;
        /** The line under the character's name on the dashboard (D-288). */
        headline?: string;
        sheet: SheetGroupData[];
        /** Where the dashboard puts the groups of the sheet, as the system says (D-295), and those at hand in a fight (D-315). */
        cards?: { rail: string[]; order: string[]; atHand: string[]; };
        /** The fields whose items the player acts with, each with its verbs, as the system says (D-495). */
        actions?: Record<string, ActVerb[]>;
        text: string;
        /** With more than one player character, the secrets the text shows that only some of them discovered, by the name the text gives them, and who (VIEW-12). */
        knownBy?: { secret: string; who: string[]; }[];
        /** With more than one player character, who knows the page, when not all of them do (VIEW-12). */
        whoKnows?: string[];
        /** With who knows, the living player characters who do not, played as not knowing it. */
        unaware?: string[];
        /** The player character's opening text, which the player may propose on the dashboard (D-373, D-386); left out on other pages. */
        story?: string;
    }
    | {
        kind: "section";
        title: string;
        lines: string[];
        text: string;
        /** With more than one player character, who knows it, when not all of them do (VIEW-12). */
        knownBy?: string[];
    }
    /** What another character knows and lived, for the character agent voicing them (VIEW-10): their own page as they know it, now, the pages they know, the secrets, the scenes. */
    | {
        kind: "memory";
        title: string;
        sheet: SheetGroupData[];
        text: string;
        now?: string;
        /** The places that hold them, the nearest first, those they know. */
        place: string[];
        /** The open scene, when they are in it, as they see it. */
        scene?: string;
        /** "Marta (character): A shepherd's widow of Whitecrag.": each page they know, in a line. */
        known: string[];
        /** "Piet#Fate: Killed by orcs.": the secrets of other pages they discovered. */
        discovered: string[];
        /** "day 3, 19:05 · Ambush at Mill Ford: Four orcs ambushed the party.": the scenes they were in. */
        lived: string[];
        /** A companion's last lines of their diary, with their dates (DIA-3); none for anyone else. */
        thoughts?: string[];
        /** For a living player character played while their player is away (D-480 (4)), the prudence it is played with. */
        away?: string;
        /** For a living companion, or a player character played while its player is away, the player's standing orders to the companions (D-563). */
        orders?: string[];
    }
    /** The world map as the player character knows it (VIEW-7). */
    | ({ kind: "map"; } & ShownMap)
    /** The player's settings, which the dashboard changes (D-341). */
    | { kind: "settings"; settings: PlayerSetting[]; }
    /** The setup (D-370): the mode, the campaign's name and whether it is still its folder's, what the next mode still needs, and the setup's questions. */
    | { kind: "setup"; mode: Mode; name: string; folderName: boolean; missing: string[]; questions: PlayerSetting[]; }
    /** The journal (D-367): the quests the player character knows, and the story by scenes. */
    | { kind: "journal"; now?: string; quests: ShownQuest[]; chapters: ShownChapter[]; thoughts: ShownThought[]; }
    /** The World section but the map (VIEW-11): the pages the character knows, each as it knows it, the documents it has or read, and the calendar. */
    | { kind: "world"; known: KnownEntry[]; documents: ShownDocument[]; calendar: ShownCalendar; }
    /** The saves and what the mode allows (D-359): make one, go back to some, start over from the first. */
    | { kind: "saves"; mode: SaveMode; rule: string; saves: ShownSave[]; make: boolean; reset: ResetPoint[]; wentBack?: string; }
    | { kind: "unknown"; text: string; };

/** Someone of the party as the player sees them (VIEW-1): the dashboard draws them (D-272), the chat reads them as a line. */
export interface PartyMember
{
    name: string;
    role: "pc" | "companion";
    dead: boolean;
    /** Their picture, their own or from a base the player character knows (D-267, D-277): its file, and when it last changed. */
    image?: { file: string; version: number; };
    /** The icon on their token, as their class, when the system gives one (D-414). */
    icon?: string;
    /** Where they are, as far as the player character knows the places: the places that hold them, the nearest first; elsewhere, or in the open (D-254, TRV-13). */
    place?: string[] | "elsewhere" | "open";
    /** The numbers of their line, in its order (DAT-2). */
    counters: SheetValue[];
    /** Their effects, each with its end when it has one, and as the line writes it. */
    effects: SeenEffect[];
    /** Their mood (MOOD-6); none when neutral, or dead. */
    mood?: Mood;
    /** What they are, as the line under a sheet's name says it in the campaign's language: Level 3 Cleric (D-288, D-409). */
    headline?: string;
    /** At the system's down point, as hp 0 (D-516). */
    down?: true;
}

/** A roll the player may see (D-279): theirs, or one the master showed; never a hidden one. */
export interface ShownRoll
{
    id: string;
    /** The game date, when there is one. */
    date?: string;
    /** When it was rolled, in real time: ISO 8601 (D-299). */
    at: string;
    /** Who rolled it: the player, or the master. */
    by: "player" | "master";
    /** For whom, as the player character knows them: Ettore, Lupa; creature or someone for one it does not know. */
    who?: string;
    /** What the roll is, as the player sees it: the check the master asked, or what the master names a roll of theirs, such as Bite (D-292). */
    check?: string;
    /** The picture of whom it is for, when the player character knows them and they have one (D-286). */
    image?: { file: string; version: number; };
    /** Whom it is for is someone the player character does not know by name: a creature, someone (D-286). */
    stranger?: true;
    /** The notation in parts, for the dashboard to say in words when it does more than add its dice, as 2d20 keeping the highest, +5 (D-292). */
    words?: NotationPart[];
    notation: string;
    total: number;
    /** What the faces mean, in place of the total, when an extension's roll says it: 4 pins, no 1 (D-505). */
    says?: string;
    /** How each die turned out, by its face in order, when an extension's roll says it: good, bad or none (D-507). */
    tones?: ("good" | "bad" | null)[];
    /** The coins of a toss, each face in order, which the page says in its language in place of the total; a toss shows no dice (COIN-3). */
    toss?: CoinSide[];
    /** Whether the page throws it in its tray too, or keeps it in the list alone, when the master says so (VIEW-13). */
    tray?: boolean;
    text: string;
    dice: ThrownDie[];
}

/**
 * A save as the dashboard shows it (D-359): its number and label, the words that name it and the game date, when it was made in real time, the place the party
 * was in with its kind and picture, the point of a reset it is, and whether the player may go back to it, never to such a point, which is a reset's (D-361).
 */
export interface ShownSave
{
    number: number;
    label: string;
    name?: string;
    date?: string;
    at?: string;
    place?: string;
    kind?: string;
    picture?: { file: string; version: number; };
    point?: ResetPoint;
    load: boolean;
}
