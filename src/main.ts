import { parseArgs } from "node:util";
import { z } from "zod";
import { commands } from "./commands/index.js";
import { defaultContext, type Context } from "./context.js";
import type { Command } from "./registry.js";
import { getVersion } from "./version.js";

export interface CliResult {
  output: string;
  exitCode: number;
}

/** The `rpg` command line: finds the command, validates its input, runs it and renders the result. */
export async function main(argv: string[], ctx: Context = defaultContext()): Promise<CliResult> {
  const [name, ...args] = argv;
  if (name === undefined || name === "--help" || name === "-h") return { output: help(), exitCode: 0 };
  if (name === "--version" || name === "-v") return { output: getVersion(), exitCode: 0 };

  const command = commands.find((candidate) => candidate.name === name);
  if (!command) return { output: `Unknown command "${name}".\n\n${help()}`, exitCode: 1 };
  if (args.includes("--help") || args.includes("-h")) return { output: commandHelp(command), exitCode: 0 };

  try {
    const { input, json } = readArgs(command, args);
    const parsed = command.input.safeParse(input);
    if (!parsed.success) return { output: `Invalid input for "${name}":\n${z.prettifyError(parsed.error)}`, exitCode: 1 };
    const result = await command.run(parsed.data, ctx);
    return { output: json ? JSON.stringify(result, null, 2) : command.format(result), exitCode: 0 };
  } catch (error) {
    return { output: error instanceof Error ? error.message : String(error), exitCode: 1 };
  }
}

function readArgs(command: Command<any, any>, args: string[]): { input: Record<string, unknown>; json: boolean } {
  const positionals = command.positionals ?? [];
  const options: Record<string, { type: "string" | "boolean" }> = { json: { type: "boolean" } };
  for (const [key, field] of fields(command)) {
    if (!positionals.includes(key)) options[key] = { type: isBoolean(field) ? "boolean" : "string" };
  }
  const parsed = parseArgs({ args, options, allowPositionals: true, strict: true });
  if (parsed.positionals.length > positionals.length) {
    throw new Error(`Unexpected argument: ${parsed.positionals.slice(positionals.length).join(" ")}`);
  }
  const input: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.values)) if (key !== "json") input[key] = value;
  positionals.forEach((key, i) => {
    if (parsed.positionals[i] !== undefined) input[key] = parsed.positionals[i];
  });
  return { input, json: parsed.values.json === true };
}

function fields(command: Command<any, any>): [string, z.ZodType][] {
  return Object.entries(command.input.shape as Record<string, z.ZodType>);
}

function isBoolean(field: z.ZodType): boolean {
  let def = field.def as { type: string; innerType?: z.ZodType };
  while (def.innerType && ["optional", "default", "nullable"].includes(def.type)) def = def.innerType.def as typeof def;
  return def.type === "boolean";
}

function help(): string {
  const lines = commands.map((command) => `  ${command.name.padEnd(8)} ${command.description}`);
  return [`rpg-engine ${getVersion()}`, "", "Commands:", ...lines, "", "Run `rpg <command> --help` for its options."].join("\n");
}

function commandHelp(command: Command<any, any>): string {
  const positionals = command.positionals ?? [];
  const usage = ["rpg", command.name, ...positionals.map((key) => `<${key}>`), "[options]"].join(" ");
  const lines = fields(command).map(([key, field]) => {
    const flag = positionals.includes(key) ? `<${key}>` : `--${key}${isBoolean(field) ? "" : " <value>"}`;
    return `  ${flag.padEnd(20)} ${field.description ?? ""}`;
  });
  return [usage, "", command.description, "", ...lines, `  ${"--json".padEnd(20)} print the result as JSON`].join("\n");
}
