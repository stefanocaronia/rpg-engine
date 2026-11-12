// What scene takes and gives back: the actions, its input as read, each action's result

export const actions = ["open", "add", "leave", "order", "next", "use", "now", "hostile", "calm", "close"] as const;

export type Action = (typeof actions)[number];

export interface SceneInput
{
    action: Action;
    title?: string;
    type?: string;
    place?: string;
    with?: string[];
    creatures?: string[] | Record<string, number>;
    who?: string[];
    order?: string[];
    uses?: string;
    by?: string;
    now?: string;
    summary?: string;
    seen?: string[] | Record<string, string>;
}

export type SceneResult =
    | ({ action: "open"; title: string; type: string; opened?: string; place?: string; members: Member[]; around: string; part: string; } & Brought)
    | ({ action: "add"; title: string; place?: string; members: Member[]; ordered: boolean; seen?: Record<string, string>; } & Brought)
    | { action: "leave"; left: Member[]; turns?: Turns; noTurns: boolean; ended: string[]; acting?: string; }
    | ({ action: "order" | "next"; noTurn: string[]; ended: string[]; acting?: string; } & Turns)
    | { action: "now"; title: string; now: string; members: string[]; }
    | { action: "use"; line: string; }
    | { action: "hostile" | "calm"; title: string; marked: string[]; hostile: string[]; }
    | ({ action: "close"; title?: string; rounds?: number; copies: Member[]; gone?: Member[]; unreadable?: string; ended: string[]; endless: string[]; rewards?: string[]; fallen?: string; afterPeak?: string; quests: string[]; } & Saved);

/** The order of turns, where the scene has one, and whether the turn is the player's character's. */
export interface Turns
{
    order: string[];
    round: number;
    turn: string;
    player: boolean;
    /** More than one living player character, each handed their turn by name (D-480 (5)). */
    several?: true;
}

/** Someone in the scene, with their counters. */
export interface Member
{
    name: string;
    counters: Record<string, unknown>;
    /** A character's effects with their end, such as "Poisoned until day 1, 19:00". */
    effects?: string[];
}

/** Who of the party a scene brought into its place, and what that set off (CON-6). */
export interface Brought
{
    moved: string[];
    notes: string[];
}

/** The save the end of a scene made, or why it made none (SAV-3). */
export interface Saved
{
    saved?: string;
    unsaved?: string;
}
