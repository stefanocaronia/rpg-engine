// A campaign to look at the dashboard with (D-272), in tmp/dashboard-demo: `npm run build`, then `node --experimental-strip-types test/demo/dashboard.ts`,
// open the link it prints, and change the campaign with rpg from that folder, such as rpg change Ettore hp --by=-5, to see the page follow. Not part of the tests.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { runCommandLine } from "../../src/command-line.ts";
import { defaultContext } from "../../src/core/context.ts";
import { SessionStore } from "../../src/core/session-store.ts";
import { startDashboard } from "../../src/dashboard-server.ts";
import { inPlay } from "../support.ts";

const folder = join(import.meta.dirname, "..", "..", "tmp", "dashboard-demo");
const context = defaultContext(folder);

if (!existsSync(join(folder, "campaign.yaml"))) {
    await rpg("init", "--name", "Guadoscuro", "--language", "it", "--system", "5e", "--difficulty", "normal", "--lethality", "dice");
    inPlay(folder);
    await rpg("advance", "--to", "day 1, 18:00");
    await rpg("write", "Locanda del Guado", "--type", "place");
    await rpg(
        "write",
        "Ettore",
        "--type",
        "character",
        ...[
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
        ].flatMap((field) => ["--set", field]),
    );
    await rpg("write", "Ettore", "--set", "prepared=[[Healing Word]], [[Guiding Bolt]]");
    await rpg("write", "Lupa", "--type", "character", "--set", "role=companion", "--set", "creature=[[Wolf]]");
    await rpg("write", "Locanda del Guado", "--add", "contains=[[Ettore]]", "--add", "contains=[[Lupa]]");
    await rpg("effect", "add", "Ettore", "Benedizione", "--for", "1m");
}

const session = new SessionStore({ systemFolders: context.systemFolders });
const dashboard = await startDashboard({ ...context, files: session }, session);
console.log(dashboard === undefined ? "No port free for the dashboard." : `${dashboard.url}\nChange the campaign from ${folder}, as with: rpg change Ettore hp --by=-5`);
// The server never keeps a process alive by itself: this one waits until it is stopped.
setInterval(() => undefined, 60_000);

async function rpg(...args: string[]): Promise<void>
{
    const result = await runCommandLine(args, context);

    if (result.exitCode !== 0) {
        throw new Error(`rpg ${args.join(" ")}: ${result.output}`);
    }
}
