import type { z } from "zod";
import type { Context } from "./context.ts";

/** A command is defined once: the CLI, and later the MCP server and the dashboard API, are generated from it. */
export interface Command<Schema extends z.ZodObject = z.ZodObject, Result = unknown>
{
    name: string;
    description: string;
    input: Schema;
    /** Fields the CLI takes as positional arguments, in order. */
    positionals?: string[];
    run(input: z.infer<Schema>, context: Context): Result | Promise<Result>;
    /** Plain-text rendering of the result. */
    format(result: Result): string;
}

export function defineCommand<Schema extends z.ZodObject, Result>(command: Command<Schema, Result>): Command<Schema, Result>
{
    return command;
}
