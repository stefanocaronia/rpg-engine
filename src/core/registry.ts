import type { z } from "zod";
import type { Context } from "./context.ts";
import { FileStore, withFiles } from "./store.ts";

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
    /** The command asks the player directly: it exists only where the surface can (Context.player), never on the command line. */
    needsPlayer?: boolean;
    /** The player may run it too, from an extension's code in the dashboard's page (D-510): only an extension's command says so. */
    forPlayer?: boolean;
    /** The command may wait for the player's answer, as an extension's that asks (D-505): the MCP server reports so meanwhile, and it runs everywhere. */
    waitsForPlayer?: boolean;
    /** The command may take minutes, as an installation: the MCP server reports its progress meanwhile, so that a host does not give up on it. */
    slow?: boolean;
    run(input: z.infer<Schema>, context: Context): Result | Promise<Result>;
    /** Plain-text rendering of the result. */
    format(result: Result): string;
}

export function defineCommand<Schema extends z.ZodObject, Result>(command: Command<Schema, Result>): Command<Schema, Result>
{
    // Each call reads and writes through a store of its own, which reads each file once, or through the session's that the MCP server keeps (D-137).
    return { ...command, run: (input, context) => withFiles(context.files ?? new FileStore(context.systemFolders), () => command.run(input, context)) };
}

/**
 * What keeps a field of a command's input from being given on the command line: one named no-x, read as turning x off, or json, read as answering in JSON
 * (review of 25 and 28 October); undefined for any other. A positional is never an option, so json is its name freely.
 */
export function commandLineFieldProblem(command: string, name: string, positional: boolean): string | undefined
{
    if (name.startsWith("no-")) {
        return `${command} has a field named ${name}, and none may start with no-, which the command line reads as turning ${name.slice(3)} off: rename it.`;
    }

    return name === "json" && !positional ? `${command} has a field named json, which the command line reads as answering in JSON: rename it.` : undefined;
}

/** Whether a field of a command's input is a flag, true or false, as --hidden. */
export function isBoolean(field: z.ZodType): boolean
{
    return baseType(field) === "boolean";
}

/** A list option can be given more than once, as in --set a=1 --set b=2; a field that also takes an object, through MCP, is a list here. */
export function isList(field: z.ZodType): boolean
{
    const definition = baseDefinition(field);
    return definition.type === "array" || (definition.type === "union" && (definition.options ?? []).some(isList));
}

/** The type of a field of a command's input, past optional, default and nullable: string, boolean, array… */
export function baseType(field: z.ZodType): string
{
    return baseDefinition(field).type;
}

function baseDefinition(field: z.ZodType): { type: string; innerType?: z.ZodType; options?: z.ZodType[]; }
{
    let definition = field.def as { type: string; innerType?: z.ZodType; options?: z.ZodType[]; };

    while (definition.innerType && ["optional", "default", "nullable"].includes(definition.type)) {
        definition = definition.innerType.def as typeof definition;
    }

    return definition;
}
