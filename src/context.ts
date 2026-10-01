import { randomBytes, randomInt, randomUUID } from "node:crypto";

/** What a command needs from the outside world. Tests replace it to get repeatable results. */
export interface Context {
  /** Folder of the campaign the command works on. */
  cwd: string;
  /** Rolls one digital die: an integer from 1 to `sides`. */
  random(sides: number): number;
  now(): Date;
  /** A new short id for an event. */
  newId(): string;
  /** A new random salt for a hidden roll. */
  newSalt(): string;
}

export function defaultContext(cwd = process.cwd()): Context {
  return {
    cwd,
    random: (sides) => randomInt(1, sides + 1),
    now: () => new Date(),
    newId: () => randomUUID().replaceAll("-", "").slice(0, 8),
    newSalt: () => randomBytes(16).toString("hex"),
  };
}
