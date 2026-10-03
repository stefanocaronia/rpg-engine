import type { z } from "zod";
import type { Context } from "./context.ts";

/** A command is defined once: the command line, the MCP server and later the dashboard API are generated from it. */
export interface Command<Schema extends z.ZodObject = z.ZodObject, Result = unknown>
{
    name: string;
    /** Written for an AI: what the command does (the first sentence, shown in the list of commands), when to use it, an example. */
    description: string;
    /** Commands that set up the campaign, or that are used while playing. */
    group: "campaign" | "game";
    input: Schema;
    /** The command changes nothing: hosts may run it without asking. */
    readOnly?: boolean;
    /** Hosts load the tool at once instead of on demand: for the ones the AI calls at the start of every chat. */
    alwaysLoad?: boolean;
    /** Fields the command line takes as positional arguments, in order. */
    positionals?: string[];
    run(input: z.infer<Schema>, context: Context): Result | Promise<Result>;
    /** Plain-text rendering of the result. */
    format(result: Result): string;
}

export function defineCommand<Schema extends z.ZodObject, Result>(command: Command<Schema, Result>): Command<Schema, Result>
{
    return command;
}
