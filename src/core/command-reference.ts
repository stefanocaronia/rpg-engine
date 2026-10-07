import { z } from "zod";
import type { Command } from "./registry.ts";

type Schema = z.core.JSONSchema._JSONSchema;

const generatedNotice = "<!-- Generated from the definitions of the commands: do not edit it by hand. After changing a command, run npm run docs. -->";

/** The reference of the commands in markdown, grouped as the registry groups them, with each parameter as the MCP server offers it: npm run docs writes it to docs/commands.md. */
export function commandReference(commands: Command<any, any>[]): string
{
    const groups = [...new Set(commands.map((command) => command.group))];
    const sections = groups.map((group) => [`## ${group[0].toUpperCase()}${group.slice(1)}`, ...commands.filter((command) => command.group === group).map(commandSection)].join("\n\n"));
    return `${[generatedNotice, "# Commands", ...sections].join("\n\n")}\n`;
}

function commandSection(command: Command<any, any>): string
{
    const schema = z.toJSONSchema(command.input, { io: "input" });
    const required = schema.required ?? [];
    const parameters = Object.entries(schema.properties ?? {}).map(([name, field]) => parameterLine(name, field, required.includes(name)));
    const positionals = command.positionals?.length ? ` Positional parameters: ${command.positionals.map(code).join(", ")}.` : "";
    return [`### ${command.name}`, command.description, `Read-only: ${command.readOnly ? "yes" : "no"}.${positionals}`, parameters.length > 0 ? parameters.join("\n") : "No parameters."].join("\n\n");
}

function parameterLine(name: string, field: Schema, required: boolean): string
{
    const description = typeof field === "object" && field.description ? `: ${field.description}` : "";
    return `- ${code(name)} (${code(typeText(field))}, ${required ? "required" : "optional"})${description}`;
}

/** The type of a parameter from its JSON Schema, such as string | string[]. */
function typeText(schema: Schema | undefined): string
{
    if (schema === undefined || typeof schema === "boolean") {
        return "any";
    }

    if (schema.enum) {
        return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
    }

    if (schema.anyOf) {
        return schema.anyOf.map(typeText).join(" | ");
    }

    if (schema.type === "array") {
        const items = Array.isArray(schema.items) ? "any" : typeText(schema.items);
        return items.includes(" ") ? `(${items})[]` : `${items}[]`;
    }

    if (schema.type === "object") {
        const values = typeText(schema.additionalProperties);
        return values === "any" ? "object" : `{ [key]: ${values} }`;
    }

    return typeof schema.type === "string" ? schema.type : "any";
}

function code(text: string): string
{
    return `\`${text}\``;
}
