// The demo campaign of the dashboard (D-272), in tmp/dashboard-demo: made the first time, then kept, so that rpg can change it from its folder. Not part of the tests.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { runCommandLine } from "../../src/command-line.ts";
import { ask } from "../../src/commands/ask.ts";
import { type Context, defaultContext } from "../../src/core/context.ts";
import { SessionStore } from "../../src/core/session-store.ts";
import { withFiles } from "../../src/core/store.ts";
import { type Dashboard, startDashboard } from "../../src/dashboard-server.ts";
import { inPlay } from "../support.ts";

export const demoFolder = join(import.meta.dirname, "..", "..", "tmp", "dashboard-demo");

/** The checks and the choice the demo asks in turn, of Ettore, a cleric of the third level: one die, two with advantage, an answer, dice rerolled. */
export const demoQuestions: { question: string; options: string[]; }[] = [
    { question: "Il guado è gonfio di pioggia: se scivoli, la corrente ti porta verso le rapide", options: ["Atletica 1d20+2", "Acrobazia 1d20-1"] },
    { question: "Lo spettro ti stringe la gola: se cedi, il gelo ti toglie le forze", options: ["Tiro salvezza Saggezza 2d20kh1+5"] },
    { question: "Il mercante giura che il sigillo è autentico: se sbagli, perdi l'unico indizio", options: ["Intuizione 1d20+5"] },
    { question: "La passerella si spezza sotto di te: da che parte salti?", options: ["Verso la riva", "Verso la barca"] },
    { question: "La mazza cala sullo scheletro: quanto fa male?", options: ["Danni, rilanciando 1 e 2 una volta 2d6ro<=2+2"] },
];

/** The demo's dashboard, which can also ask the player on its page, as the master does with ask (D-279): what ask says to the master. */
export interface DemoDashboard extends Dashboard
{
    ask(question: string, options: string[]): Promise<string>;
}

/** Serves the built dashboard of the demo campaign, making the campaign first when it is not there; on the dashboard's ports unless others are given. */
export async function serveDemo(ports?: number[]): Promise<DemoDashboard>
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
        ...dashboard,
        ask: async (question, options) => {
            await session.ready();
            return withFiles(session, async () => ask.format(await ask.run(ask.input.parse({ question, options }), { ...context, files: session, page: dashboard.player })));
        },
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
