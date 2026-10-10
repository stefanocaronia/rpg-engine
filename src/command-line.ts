import { parseArgs } from "node:util";
import { z } from "zod";
import { commands } from "./commands/index.ts";
import { type Context, defaultContext } from "./core/context.ts";
import { baseType, type Command, isBoolean, isList } from "./core/registry.ts";
import { getVersion } from "./core/version.ts";
import { codexPictures } from "./pictures/index.ts";

export interface CommandLineResult
{
    output: string;
    exitCode: number;
}

type AnyCommand = Command<any, any>;

// The one command that exists only on the command line: cli.ts starts the server when it comes alone.
const mcpDescription = "Start the MCP server for an AI host. Through it the host uses these commands as tools; the host starts it, with no options.";

/** The `rpg` command line: finds the command, validates its input, runs it and renders the result. */
export async function runCommandLine(argv: string[], context: Context = { ...defaultContext(), pictures: codexPictures() }): Promise<CommandLineResult>
{
    const [commandName, ...args] = argv;

    if (commandName === undefined || commandName === "--help" || commandName === "-h") {
        return success(generalHelp());
    }

    if (commandName === "--version" || commandName === "-v") {
        return success(getVersion());
    }

    if (commandName === "mcp") {
        return success(`rpg mcp\n\n${mcpDescription}`);
    }

    const command = commands.find((candidate) => candidate.name === commandName);

    if (!command) {
        return failure(`Unknown command "${commandName}".\n\n${generalHelp()}`);
    }

    if (command.needsPlayer) {
        return failure(`${command.name} works only in an AI app that shows the player a form; here, ask the player in words.`);
    }

    if (args.includes("--help") || args.includes("-h")) {
        return success(commandHelp(command));
    }

    try {
        return success(await runCommand(command, args, context));
    } catch (error) {
        return failure(error instanceof Error ? error.message : String(error));
    }
}

async function runCommand(command: AnyCommand, args: string[], context: Context): Promise<string>
{
    const { input, asJson } = readArguments(command, args);
    const parsed = command.input.safeParse(input);

    if (!parsed.success) {
        throw new Error(`Invalid input for "${command.name}":\n${z.prettifyError(parsed.error)}\nUsage: ${usage(command)}`);
    }

    const result = await command.run(parsed.data, context);
    return asJson ? JSON.stringify(result, null, 2) : command.format(result);
}

function readArguments(command: AnyCommand, args: string[]): { input: Record<string, unknown>; asJson: boolean; }
{
    const positionals = command.positionals ?? [];
    const options: Record<string, { type: "string" | "boolean"; multiple?: boolean; }> = { json: { type: "boolean" } };

    for (const [name, field] of inputFields(command)) {
        if (!positionals.includes(name)) {
            options[name] = { type: isBoolean(field) ? "boolean" : "string", multiple: isList(field) };
        }
    }

    const parsed = parseArgs({ args, options, allowPositionals: true, strict: true, tokens: true });
    // The last positional, when it is a list, takes the arguments left before the first option, as in rpg move Ettore Lena --to Ossario.
    const last = positionals.at(-1);
    const takesRest = last !== undefined && isList(command.input.shape[last] as z.ZodType);
    const firstOption = parsed.tokens.findIndex((token) => token.kind === "option");
    const valuesOf = (tokens: typeof parsed.tokens): string[] => tokens.flatMap((token) => (token.kind === "positional" ? [token.value] : []));
    const given = takesRest && firstOption !== -1 ? valuesOf(parsed.tokens.slice(0, firstOption)) : parsed.positionals;
    const extra = takesRest ? valuesOf(parsed.tokens.slice(firstOption === -1 ? parsed.tokens.length : firstOption)) : parsed.positionals.slice(positionals.length);

    if (extra.length > 0) {
        const quoted = [...given.slice(positionals.length - 1, positionals.length), ...extra].join(" ");
        // A text given in several words: quote it. A word from a list, such as open, is not a text.
        const freeText = last !== undefined && baseType(command.input.shape[last] as z.ZodType) === "string";
        const how = takesRest
            ? ` Give the ${last} before the options, and repeat an option for each of its values, such as --to A --to B.`
            : freeText
            ? ` Put a value with spaces in quotes, such as "${quoted}".`
            : "";
        throw new Error(`Unexpected argument: ${extra.join(" ")}.${how}`);
    }

    checkRepeatedOptions(parsed.tokens, options);

    const input: Record<string, unknown> = {};

    for (const [name, value] of Object.entries(parsed.values)) {
        if (name !== "json") {
            input[name] = value;
        }
    }

    positionals.forEach((name, index) => {
        if (given[index] !== undefined) {
            input[name] = takesRest && name === last ? given.slice(index) : given[index];
        }
    });
    return { input, asJson: parsed.values.json === true };
}

/** An option that takes one value must not be given twice: the first value would be lost without a word. */
function checkRepeatedOptions(tokens: { kind: string; name?: string; }[], options: Record<string, { multiple?: boolean; }>): void
{
    const given: string[] = [];

    for (const token of tokens) {
        if (token.kind !== "option" || token.name === undefined || options[token.name]?.multiple === true) {
            continue;
        }

        if (given.includes(token.name)) {
            throw new Error(`Give --${token.name} only once.`);
        }

        given.push(token.name);
    }
}

function inputFields(command: AnyCommand): [string, z.ZodType][]
{
    return Object.entries(command.input.shape as Record<string, z.ZodType>);
}

/** The commands in two groups, each with the first sentence of its description. */
function generalHelp(): string
{
    const width = Math.max(...commands.map((command) => command.name.length));
    const line = (name: string, description: string): string => `  ${name.padEnd(width)} ${firstSentence(description)}`;
    const groupLines = (group: string): string[] => commands.filter((command) => command.group === group && !command.needsPlayer).map((command) => line(command.name, command.description));
    return [
        `rpg-engine ${getVersion()}`,
        "",
        "Campaign:",
        ...groupLines("campaign"),
        line("mcp", mcpDescription),
        "",
        "Game:",
        ...groupLines("game"),
        "",
        "Run `rpg <command> --help` for its options.",
    ].join("\n");
}

function firstSentence(text: string): string
{
    const end = text.indexOf(". ");
    return end === -1 ? text : text.slice(0, end + 1);
}

function commandHelp(command: AnyCommand): string
{
    const positionals = command.positionals ?? [];
    const optionLines = inputFields(command).map(([name, field]) => {
        const flag = positionals.includes(name) ? `<${name}>${isList(field) ? "..." : ""}` : `--${name}${isBoolean(field) ? "" : " <value>"}${isList(field) ? "..." : ""}`;
        return `  ${flag.padEnd(20)} ${field.description ?? ""}`;
    });
    return [usage(command), "", command.description, "", ...optionLines, `  ${"--json".padEnd(20)} print the result as JSON`].join("\n");
}

function usage(command: AnyCommand): string
{
    return ["rpg", command.name, ...(command.positionals ?? []).map((name) => `<${name}>${isList(command.input.shape[name] as z.ZodType) ? "..." : ""}`), "[options]"].join(" ");
}

function success(output: string): CommandLineResult
{
    return { output, exitCode: 0 };
}

function failure(output: string): CommandLineResult
{
    return { output, exitCode: 1 };
}
