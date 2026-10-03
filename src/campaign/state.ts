import { existsSync } from "node:fs";
import { join } from "node:path";
import { Document, visit } from "yaml";
import { z } from "zod";
import { readYamlFile, readYamlValues, writeYamlFile } from "../core/yaml-file.ts";

const stateFileName = "state.yaml";
const holds = 'the present of the game, such as "date: day 1, 18:00"';

/** The present of the game, kept in state.yaml. Other keys are kept: the scene will add its own. An empty date is no date. */
const stateSchema = z.object({
    date: z.string({ error: "write the game date as text, such as day 1, 18:00" }).nullish(),
}).loose();

export type CampaignState = z.infer<typeof stateSchema>;

/** The present of the game; empty before it has one, or when state.yaml is missing. */
export function readState(root: string): CampaignState
{
    const parsed = stateSchema.safeParse(readStateValues(root));

    if (!parsed.success) {
        throw new Error(`${stateFileName} is not valid: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}. Fix it by hand.`);
    }

    return parsed.data;
}

/** The values of state.yaml as they are written, without checking the game date: what the scene reads, so that a wrong date does not hide it. */
export function readStateValues(root: string): Record<string, unknown>
{
    const path = join(root, stateFileName);
    const values = existsSync(path) ? readYamlValues(path, holds) : {};
    return values !== null && typeof values === "object" ? (values as Record<string, unknown>) : {};
}

/** Changes the present, keeping the rest of state.yaml, comments included, as it is; an undefined value removes its key. */
export function changeState(root: string, values: Partial<CampaignState>): void
{
    changeStateAt(root, Object.entries(values).map(([key, value]) => [[key], value]));
}

/** Changes values inside state.yaml, each at its path, such as ["scene", "round"]; the rest, comments included, stays as it is. An undefined value removes its key. */
export function changeStateAt(root: string, changes: [string[], unknown][]): void
{
    const path = join(root, stateFileName);
    const document = existsSync(path) ? readYamlFile(path, holds) : new Document({});

    for (const [keys, value] of changes) {
        if (value === undefined) {
            document.deleteIn(keys);
        } else {
            document.setIn(keys, value);
        }
    }

    // Collections written from empty ones, such as {}, would stay on one line: state.yaml is written by the engine, in blocks.
    visit(document, {
        Map: (_, node) => {
            node.flow = false;
        },
        Seq: (_, node) => {
            node.flow = false;
        },
    });
    writeYamlFile(path, document);
}
