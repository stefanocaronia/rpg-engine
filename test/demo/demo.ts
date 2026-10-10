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

/** The demo's dashboard, which can also ask the player on its page, as the master does with ask (D-279), and roll as the master: what they say to the master. */
export interface DemoDashboard extends Dashboard
{
    ask(question: string, options: string[]): Promise<string>;
    roll(...args: string[]): Promise<string>;
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
        roll: async (...args) => {
            await session.ready();
            return (await runCommandLine(["roll", ...args], { ...context, files: session })).output;
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
    await rpg(
        "write",
        "Locanda del Guado",
        "--type",
        "place",
        "--text",
        "Una locanda bassa di pietra sul guado, col tetto che gocciola e un camino che non si spegne mai. Bertoldo tiene il vino buono sotto il bancone e le chiavi delle stanze al collo.",
    );
    const ettore = [
        "role=pc",
        "creature=[[Hill Dwarf]]",
        "classes=[[Cleric]] 3",
        "subclasses=[[Life Domain]]",
        "xp=1500",
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
    await makeDemoWorld(rpg);
    await rpg("effect", "add", "Ettore", "Benedizione", "--for", "1m");
}

/**
 * The world around the inn, for the World map (D-318): Guadoscuro at the centre in its hills, a castle in the mountains to the north, a forest with a tower, a
 * marsh hiding a cave, a temple and a port heard of; the king's road, a path, and a river from a spring in the forest under the bridge to the port. Ettore
 * and Lupa came down the road from the castle, with a night at a camp: the trail. The cave and the spring stay unknown.
 */
async function makeDemoWorld(rpg: (...args: string[]) => Promise<void>): Promise<void>
{
    const place = (name: string, ...fields: string[]): Promise<void> => rpg("write", name, "--type", "place", ...fields.flatMap((field) => [field.startsWith("environment=") || field.startsWith("contains=") ? "--add" : "--set", field]));
    await place("Guadoscuro", "kind=village", "contains=[[Locanda del Guado]]");
    await place("Rocca di Vetta", "position=21 km N of [[Guadoscuro]]", "kind=castle");
    await place("Campo del Viandante", "kind=camp");
    await place("Ponte di Pietra", "position=12 km E of [[Guadoscuro]]", "kind=bridge");
    await place("Santuario della Luce", "position=26 km E of [[Guadoscuro]]", "kind=temple");
    await place("Torre dei Sussurri", "position=15 km NE of [[Guadoscuro]]", "kind=tower");
    await place("Mulino Rosso", "position=16 km ESE of [[Guadoscuro]]", "kind=mill");
    await place("Porto Salso", "position=40 km SE of [[Guadoscuro]]", "kind=port");
    await place("Grotta del Drago", "position=17 km SW of [[Guadoscuro]]", "kind=cave");
    await place("Sorgente del Bosco", "position=20 km NE of [[Guadoscuro]]");
    await place("Colli del Guado", "position=2 km W of [[Guadoscuro]]", "radius=10 km", "environment=biome: hills", "contains=[[Guadoscuro]]");
    await place("Monti del Corvo", "position=33 km N of [[Guadoscuro]]", "radius=15 km", "environment=biome: mountains", "contains=[[Rocca di Vetta]]");
    await place("Bosco delle Fate", "position=15 km NE of [[Guadoscuro]]", "radius=8 km", "environment=biome: forest", "contains=[[Torre dei Sussurri]]", "contains=[[Sorgente del Bosco]]");
    await place("Palude dei Lamenti", "position=16 km SW of [[Guadoscuro]]", "radius=7 km", "environment=biome: swamp", "environment=terrain: difficult", "contains=[[Grotta del Drago]]");
    await place("Strada del Re", "stops=[[Rocca di Vetta]], 9 km, [[Campo del Viandante]], 13 km, [[Guadoscuro]], 12 km, [[Ponte di Pietra]], 15 km, [[Santuario della Luce]]");
    await place("Sentiero della Torre", "kind=path", "stops=[[Guadoscuro]], 17 km, [[Torre dei Sussurri]]");
    await place("Fiume Scuro", "kind=river", "stops=[[Sorgente del Bosco]], 15 km, [[Ponte di Pietra]], 7 km, [[Mulino Rosso]], 28 km, [[Porto Salso]]");
    const known = ["Santuario della Luce", "Bosco delle Fate", "Torre dei Sussurri", "Sentiero della Torre", "Fiume Scuro", "Mulino Rosso", "Palude dei Lamenti", "Ponte di Pietra", "Porto Salso"];
    await rpg("write", "Ettore", ...known.flatMap((name) => ["--add", `knows=[[${name}]]`]));
    await rpg("write", "Rocca di Vetta", "--add", "contains=[[Ettore]]", "--add", "contains=[[Lupa]]");

    for (const stop of ["Strada del Re", "Campo del Viandante", "Strada del Re", "Guadoscuro", "Locanda del Guado"]) {
        await rpg("move", "Ettore", "Lupa", "--to", stop);
    }
}
