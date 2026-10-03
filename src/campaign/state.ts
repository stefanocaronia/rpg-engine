import { existsSync } from "node:fs";
import { join } from "node:path";
import { Document } from "yaml";
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
    const path = join(root, stateFileName);
    const parsed = stateSchema.safeParse(existsSync(path) ? readYamlValues(path, holds) : {});

    if (!parsed.success) {
        throw new Error(`${stateFileName} is not valid: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}. Fix it by hand.`);
    }

    return parsed.data;
}

/** Changes the present, keeping the rest of state.yaml, comments included, as it is. */
export function changeState(root: string, values: Partial<CampaignState>): void
{
    const path = join(root, stateFileName);
    const document = existsSync(path) ? readYamlFile(path, holds) : new Document({});

    for (const [key, value] of Object.entries(values)) {
        document.set(key, value);
    }

    writeYamlFile(path, document);
}
