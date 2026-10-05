import { randomBytes, randomInt, randomUUID } from "node:crypto";

/** What a command needs from the outside world: tests replace it to get repeatable results. */
export interface Context
{
    /** Folder the command runs in: commands look for the campaign here and in the folders above. */
    folder: string;
    /** Rolls one digital die: an integer from 1 to `sides`. */
    random(sides: number): number;
    now(): Date;
    /** A new short id for a line of the log. */
    newId(): string;
    /** A new random salt for a hidden roll. */
    newSalt(): string;
    /** Who acts: the master, the player or a companion. For now always the master. */
    actor: string;
    /** The operating system, as Node names it (win32, linux, darwin): some files differ by it. */
    platform: string;
    /** The player, where the surface can ask them directly, as an AI host that shows forms does (D-148); missing elsewhere. */
    player?: Player;
}

/** Asks the player one question with buttons: the index of the label they chose, or undefined when no one answered. */
export interface Player
{
    choose(question: string, title: string, labels: string[]): Promise<number | undefined>;
}

export function defaultContext(folder = process.cwd()): Context
{
    return {
        folder,
        random: (sides) => randomInt(1, sides + 1),
        now: () => new Date(),
        newId: () => randomUUID().replaceAll("-", "").slice(0, 8),
        newSalt: () => randomBytes(16).toString("hex"),
        actor: "master",
        platform: process.platform,
    };
}
