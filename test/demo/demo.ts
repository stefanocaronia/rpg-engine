// The demo campaign of the dashboard (D-272), in tmp/dashboard-demo: made the first time, then kept, so that rpg can change it from its folder. Not part of the tests.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { runCommandLine } from "../../src/command-line.ts";
import { type Context, defaultContext } from "../../src/core/context.ts";
import { SessionStore } from "../../src/core/session-store.ts";
import { type Dashboard, startDashboard } from "../../src/dashboard-server.ts";
import { inPlay } from "../support.ts";

export const demoFolder = join(import.meta.dirname, "..", "..", "tmp", "dashboard-demo");

/** Serves the built dashboard of the demo campaign, making the campaign first when it is not there; on the dashboard's ports unless others are given. */
export async function serveDemo(ports?: number[]): Promise<Dashboard>
{
    const context = defaultContext(demoFolder);

    if (!existsSync(join(demoFolder, "campaign.yaml"))) {
        await makeDemo(context);
    }

    const session = new SessionStore({ systemFolders: context.systemFolders });
    const dashboard = await startDashboard({ ...context, files: session }, session, { ports });

    if (dashboard === undefined) {
        throw new Error("No port is free for the dashboard: close a chat that serves one, or the demo.");
    }

    return {
        url: dashboard.url,
        close: async () => {
            await dashboard.close();
            session.close();
        },
    };
}

/** Ettore, a cleric of the third level hurt and with a blessing, and Lupa, a wolf at his side, at the inn. */
async function makeDemo(context: Context): Promise<void>
{
    const rpg = async (...args: string[]): Promise<void> => {
        const result = await runCommandLine(args, context);

        if (result.exitCode !== 0) {
            throw new Error(`rpg ${args.join(" ")}: ${result.output}`);
        }
    };

    await rpg("init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    inPlay(demoFolder);
    await rpg("advance", "--to", "day 1, 18:00");
    await rpg("write", "Locanda del Guado", "--type", "place");
    const ettore = [
        "role=pc",
        "creature=[[Hill Dwarf]]",
        "classes=[[Cleric]] 3",
        "subclasses=[[Life Domain]]",
        "xp=900",
        "str=14",
        "dex=8",
        "con=15",
        "int=10",
        "wis=16",
        "cha=12",
        "hp-base=18",
        "hp=14/27",
        "hit-dice-d8=2/3",
        "save-proficiencies=[wis, cha]",
        "skill-proficiencies=[Insight, Religion]",
        "languages=[Common, Dwarvish]",
        "personality-traits=Cito le scritture a ogni pasto, e trovo sempre il versetto giusto per farmi passare il vino.",
    ];
    await rpg("write", "Ettore", "--type", "character", ...ettore.flatMap((field) => ["--set", field]));
    await rpg("write", "Ettore", "--set", "prepared=[[Healing Word]], [[Guiding Bolt]]");
    await rpg("write", "Lupa", "--type", "character", "--set", "role=companion", "--set", "creature=[[Wolf]]");
    await rpg("write", "Locanda del Guado", "--add", "contains=[[Ettore]]", "--add", "contains=[[Lupa]]");
    await rpg("effect", "add", "Ettore", "Benedizione", "--for", "1m");
}
