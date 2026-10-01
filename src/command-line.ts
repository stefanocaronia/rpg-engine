import { parseArgs } from "node:util";
import { z } from "zod";
import { commands } from "./commands/index.js";
import { defaultContext, type Context } from "./core/context.js";
import type { Command } from "./core/registry.js";
import { getVersion } from "./core/version.js";

export interface CommandLineResult {
    output: string;
    exitCode: number;
}

type AnyCommand = Command<any, any>;

/** The `rpg` command line: finds the command, validates its input, runs it and renders the result. */
export async function runCommandLine(argv: string[], context: Context = defaultContext()): Promise<CommandLineResult> {
    const [commandName, ...args] = argv;
    if (commandName === undefined || commandName === "--help" || commandName === "-h") {
        return success(generalHelp());
    }
    if (commandName === "--version" || commandName === "-v") {
        return success(getVersion());
    }
    const command = commands.find((candidate) => candidate.name === commandName);
    if (!command) {
        return failure(`Unknown command "${commandName}".\n\n${generalHelp()}`);
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

async function runCommand(command: AnyCommand, args: string[], context: Context): Promise<string> {
    const { input, asJson } = readArguments(command, args);
    const parsed = command.input.safeParse(input);
    if (!parsed.success) {
        throw new Error(`Invalid input for "${command.name}":\n${z.prettifyError(parsed.error)}`);
    }
    const result = await command.run(parsed.data, context);
    return asJson ? JSON.stringify(result, null, 2) : command.format(result);
}

function readArguments(command: AnyCommand, args: string[]): { input: Record<string, unknown>; asJson: boolean } {
    const positionals = command.positionals ?? [];
    const options: Record<string, { type: "string" | "boolean" }> = { json: { type: "boolean" } };
    for (const [name, field] of inputFields(command)) {
        if (!positionals.includes(name)) {
            options[name] = { type: isBoolean(field) ? "boolean" : "string" };
        }
    }
    const parsed = parseArgs({ args, options, allowPositionals: true, strict: true });
    if (parsed.positionals.length > positionals.length) {
        throw new Error(`Unexpected argument: ${parsed.positionals.slice(positionals.length).join(" ")}`);
    }
    const input: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(parsed.values)) {
        if (name !== "json") {
            input[name] = value;
        }
    }
    positionals.forEach((name, index) => {
        if (parsed.positionals[index] !== undefined) {
            input[name] = parsed.positionals[index];
        }
    });
    return { input, asJson: parsed.values.json === true };
}

function inputFields(command: AnyCommand): [string, z.ZodType][] {
    return Object.entries(command.input.shape as Record<string, z.ZodType>);
}

function isBoolean(field: z.ZodType): boolean {
    let definition = field.def as { type: string; innerType?: z.ZodType };
    while (definition.innerType && ["optional", "default", "nullable"].includes(definition.type)) {
        definition = definition.innerType.def as typeof definition;
    }
    return definition.type === "boolean";
}

function generalHelp(): string {
    const commandLines = commands.map((command) => `  ${command.name.padEnd(8)} ${command.description}`);
    return [`rpg-engine ${getVersion()}`, "", "Commands:", ...commandLines, "", "Run `rpg <command> --help` for its options."].join("\n");
}

function commandHelp(command: AnyCommand): string {
    const positionals = command.positionals ?? [];
    const usage = ["rpg", command.name, ...positionals.map((name) => `<${name}>`), "[options]"].join(" ");
    const optionLines = inputFields(command).map(([name, field]) => {
        const flag = positionals.includes(name) ? `<${name}>` : `--${name}${isBoolean(field) ? "" : " <value>"}`;
        return `  ${flag.padEnd(20)} ${field.description ?? ""}`;
    });
    return [usage, "", command.description, "", ...optionLines, `  ${"--json".padEnd(20)} print the result as JSON`].join("\n");
}

function success(output: string): CommandLineResult {
    return { output, exitCode: 0 };
}

function failure(output: string): CommandLineResult {
    return { output, exitCode: 1 };
}
