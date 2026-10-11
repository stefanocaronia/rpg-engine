// The demo campaign of the dashboard (D-272), in tmp/dashboard-demo: made the first time, then kept, so that rpg can change it from its folder. Not part of the tests.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { runCommandLine } from "../../src/command-line.ts";
import { ask } from "../../src/commands/ask.ts";
import { makeSave } from "../../src/commands/game-saves.ts";
import { type Context, defaultContext } from "../../src/core/context.ts";
import { SessionStore } from "../../src/core/session-store.ts";
import { withFiles } from "../../src/core/store.ts";
import { type Dashboard, startDashboard } from "../../src/dashboard-server.ts";
import { codexPictures } from "../../src/pictures/index.ts";
import { inPlay } from "../support.ts";

export const demoFolder = join(import.meta.dirname, "..", "..", "tmp", "dashboard-demo");

/** The checks and the choice the demo asks in turn, of Ettore, a cleric of the third level: one die, two with advantage, an answer, dice rerolled. */
export const demoQuestions: { question: string; options: string[]; }[] = [
    { question: "Il guado è gonfio di pioggia: se scivoli, la corrente ti porta verso le rapide", options: ["Atletica 1d20+athletics", "Acrobazia 1d20+acrobatics"] },
    { question: "Lo spettro ti stringe la gola: se cedi, il gelo ti toglie le forze", options: ["Tiro salvezza Saggezza 2d20kh1+wis-save"] },
    { question: "Il mercante giura che il sigillo è autentico: se sbagli, perdi l'unico indizio", options: ["Intuizione 1d20+insight"] },
    { question: "La passerella si spezza sotto di te: da che parte salti?", options: ["Verso la riva", "Verso la barca"] },
    { question: "La mazza cala sullo scheletro: quanto fa male?", options: ["Danni, rilanciando 1 e 2 una volta 2d6ro<=2+2"] },
];

/**
 * The demo's dashboard, which can also ask the player on its page, as the master does with ask (D-279), where Ettore goes on the map (ASK-11), and roll as the
 * master: what they say to the master.
 */
export interface DemoDashboard extends Dashboard
{
    ask(question: string, options: string[]): Promise<string>;
    askSquare(question: string): Promise<string>;
    roll(...args: string[]): Promise<string>;
}

/** Serves the built dashboard of the demo campaign, making the campaign first when it is not there; on the dashboard's ports unless others are given. */
export async function serveDemo(ports?: number[]): Promise<DemoDashboard>
{
    // Codex as the chat has it, for Settings to say whether pictures can be made here (D-341); the demo never has one made.
    const context: Context = { ...defaultContext(demoFolder), pictures: codexPictures() };

    if (!existsSync(join(demoFolder, "campaign.yaml"))) {
        await makeDemo(context);
    }

    const session = new SessionStore({ systemFolders: context.systemFolders });
    const dashboard = await startDashboard({ ...context, files: session }, session, { ports });

    if (dashboard === undefined) {
        throw new Error(
            ports === undefined
                ? "No port is free for the dashboard: close a chat that serves one, or the demo."
                : `The demo cannot have port ${ports.join(", ")}: another program has it, or Windows keeps it (netsh int ipv4 show excludedportrange protocol=tcp). Give another with --port.`,
        );
    }

    return {
        ...dashboard,
        ask: async (question, options) => {
            await session.ready();
            return withFiles(session, async () => ask.format(await ask.run(ask.input.parse({ question, options }), { ...context, files: session, page: dashboard.player })));
        },
        askSquare: async (question) => {
            await session.ready();
            return withFiles(session, async () => ask.format(await ask.run(ask.input.parse({ question, square: true }), { ...context, files: session, page: dashboard.player })));
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

/** The inn's map as the master writes it (GRD-1, GRD-2). */
const innMap = [
    "##############",
    "#CC....#SS...#",
    "#CC.t..#....k#",
    "#......+....k#",
    "#.t..t.#BBBB.#",
    "#............#",
    "#..t...t.....#",
    "######+#######",
    "",
    "C camino: hearth, blocks",
    "t tavolo: table, difficult",
    "B bancone: counter, blocks",
    "S scala per le stanze: stairs",
    "k botti di vino: barrel, blocks",
    "G8 → [[Guadoscuro]]",
];

/** A square of Guadoscuro (D-325): blocks of houses as roofs, doors into other places, stalls, a fountain, a well; paved, as the village is. */
const squareMap = [
    "HHHHHH..HHHHHHHHHH",
    "HHHHHH..HHHHHHHHHH",
    "HHHH+H..HHHHH+HHHH",
    "..................",
    "......ss....ss....",
    "HHH.........FF..HH",
    "HHH+........FF..+H",
    "HHH.....ss......HH",
    "..................",
    "HHHHHHH...o...HHHH",
    "HHHHHHH......HHHHH",
    "HHHHHHH......HHHHH",
    "",
    "H case: building, blocks",
    "s bancarelle: stall, blocks",
    "F fontana: fountain, blocks",
    "o pozzo: well, blocks",
    "E3 → [[Locanda del Guado]]",
    "N3 → [[Bottega di Bertoldo]]",
    "G1 → [[Porta nord]]",
    "A4 → [[Strada del Re]]",
    "J12 → [[Ponte di Pietra]]",
];

/** A clearing on a road in the fairies' wood (D-325): no walls, the ground of the forest it is in; trees, brush, a boulder, a pond, an overturned cart. */
const clearingMap = [
    "TT..TT...==....TT.TT",
    "T....,,..==..^...TTT",
    "..TT,~~,.==......T..",
    "...T,~~,..==.bbb....",
    ".T..,,,...==.bbb..T.",
    "...TT......==......T",
    "...........==..OO...",
    "TT...bb....==.....TT",
    "T...bbb.....==.TT...",
    "..T.........==.TT.T.",
    "TT...T......==....TT",
    ".TT.........==...TT.",
    "",
    "T alberi: tree, blocks",
    "b sottobosco: brush, difficult",
    "^ masso: rocks, blocks",
    "O carro rovesciato: vehicle, blocks",
    ", riva dello stagno: shallow-water, difficult",
    "~ stagno: deep-water, difficult",
    "= Strada del Re: road",
    "J1 → [[Ponte di Pietra]]",
    "M12 → [[Guadoscuro]]",
];

/** The dragon's cave (D-325): rock for walls, drawn round; water shallow and deep, rubble, pillars, a well, stalagmites, two passages out. */
const caveMap = [
    "  ##########",
    " ##...rr...###",
    "##..O..rr....##",
    "#.......,,,...##",
    "+......,,~~,,..#",
    "#...^..,~~~~,..#",
    "##.....,,~~,,..#",
    " #..o....,,....#",
    " ##.......O..###",
    "  ####.....###",
    "     ###+###",
    "",
    "# parete di roccia: rock",
    "+ cunicolo: opening",
    "O colonna: pillar, blocks",
    "r macerie: rubble, difficult",
    ", acqua bassa: shallow-water, difficult",
    "~ acqua profonda: deep-water, difficult",
    "o pozzo: well, blocks",
    "^ stalagmiti: rocks, blocks",
    "A5 → [[Gallerie Profonde]]",
    "I11 → [[Palude dei Lamenti]]",
];

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
    // Its map (GRD-1, D-324): the hall with the hearth and the tables, the back room with the counter, the stairs and the barrels, the door to the village.
    await rpg("write", "Locanda del Guado#Pianta", "--text", ["```map", ...innMap, "```"].join("\n"));
    // Its picture (D-308), made once by Codex for the demo.
    mkdirSync(join(demoFolder, "images"), { recursive: true });
    copyFileSync(join(import.meta.dirname, "locanda-del-guado.webp"), join(demoFolder, "images", "Locanda del Guado.webp"));
    await rpg("write", "Locanda del Guado", "--set", "image=[[Locanda del Guado.webp]]");
    // Before session zero, the point to start over from with a new character (D-361).
    makeSave(demoFolder, context, "session zero", "session zero");
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
    await makeDemoWorld(rpg, (label, why) => makeSave(demoFolder, context, label, why));
    await rpg("effect", "add", "Ettore", "Benedizione", "--for", "1m");
}

/**
 * The world around the inn, for the World map (D-318): Guadoscuro at the centre in its hills, a castle in the mountains to the north, a forest with a tower, a
 * marsh hiding a cave, a temple and a port heard of; the king's road, a path, and a river from a spring in the forest under the bridge to the port, with a
 * towpath along it from the bridge to the mill. Ettore
 * and Lupa came down the road from the castle, with a night at a camp: the trail, and a save at the castle, the start, at the camp and at the inn (D-359). The
 * cave and the spring stay unknown.
 */
async function makeDemoWorld(rpg: (...args: string[]) => Promise<void>, save: (label: string, why: string) => void): Promise<void>
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
    await place("Alzaia del Mulino", "kind=path", "stops=[[Ponte di Pietra]], 7 km, [[Mulino Rosso]]");
    // Under the land, the Sottosuolo, with its own city and lake, which a well under the mill reaches; the Selva Fatata mirrors the land, and a ring of
    // mushrooms at the tower opens on it (D-320).
    await place("Città delle Radici", "position=14 km SE of [[Guadoscuro]]", "kind=city");
    await place("Forte del Fungo", "position=6 km W of [[Guadoscuro]]", "kind=castle");
    await place("Lago Nero", "position=8 km S of [[Guadoscuro]]", "radius=6 km", "environment=biome: water");
    await place("Gallerie Profonde", "position=4 km SE of [[Guadoscuro]]", "radius=14 km", "environment=biome: mountains", "contains=[[Città delle Radici]]", "contains=[[Forte del Fungo]]");
    await place("Sottosuolo", "map=under [[Guadoscuro]]", "contains=[[Gallerie Profonde]]", "contains=[[Lago Nero]]");
    await place("Strada Buia", "stops=[[Forte del Fungo]], 23 km, [[Città delle Radici]]");
    // The maps of a square, of a clearing on the road and of the cave (D-325): the village's square with the shop and the north gate it leads to.
    await place("Bottega di Bertoldo");
    await place("Porta nord");
    await place("Piazza del Pozzo", "contains=[[Bottega di Bertoldo]]", "contains=[[Porta nord]]");
    await rpg("write", "Piazza del Pozzo", "--text", ["```map", ...squareMap, "```"].join("\n"));
    await rpg("write", "Guadoscuro", "--add", "contains=[[Piazza del Pozzo]]");
    await place("Radura sulla Strada del Re");
    await rpg("write", "Radura sulla Strada del Re", "--text", ["```map", ...clearingMap, "```"].join("\n"));
    await rpg("write", "Bosco delle Fate", "--add", "contains=[[Radura sulla Strada del Re]]");
    await rpg("write", "Grotta del Drago", "--text", ["```map", ...caveMap, "```"].join("\n"));
    await place("Pozzo del Mulino", "kind=portal", "stops=[[Mulino Rosso]], 1 km, [[Città delle Radici]]");
    await place("Radura Splendente", "position=16 km NE of [[Guadoscuro]]", "kind=shrine");
    await place("Corte delle Lucciole", "position=24 km NNE of [[Guadoscuro]]", "kind=castle");
    await place("Bosco Incantato", "position=18 km NE of [[Guadoscuro]]", "radius=12 km", "environment=biome: forest", "contains=[[Radura Splendente]]", "contains=[[Corte delle Lucciole]]");
    await place("Selva Fatata", "map=mirror of [[Guadoscuro]]", "contains=[[Bosco Incantato]]");
    await place("Via delle Lucciole", "kind=path", "stops=[[Radura Splendente]], 13 km, [[Corte delle Lucciole]]");
    await place("Cerchio di Funghi", "kind=portal", "stops=[[Torre dei Sussurri]], 100 m, [[Radura Splendente]]");
    const known = [
        ...["Santuario della Luce", "Bosco delle Fate", "Torre dei Sussurri", "Sentiero della Torre", "Fiume Scuro", "Alzaia del Mulino", "Mulino Rosso", "Palude dei Lamenti", "Ponte di Pietra", "Porto Salso"],
        ...["Sottosuolo", "Gallerie Profonde", "Città delle Radici", "Forte del Fungo", "Lago Nero", "Strada Buia", "Pozzo del Mulino"],
        ...["Selva Fatata", "Bosco Incantato", "Radura Splendente", "Corte delle Lucciole", "Via delle Lucciole", "Cerchio di Funghi"],
    ];
    await rpg("write", "Ettore", ...known.flatMap((name) => ["--add", `knows=[[${name}]]`]));
    await rpg("write", "Rocca di Vetta", "--add", "contains=[[Ettore]]", "--add", "contains=[[Lupa]]");
    save("start", "start");
    await makeDemoQuests(rpg);

    // Three scenes on the way, each a chapter of the story and a save at its end (D-367).
    const scene = async (title: string, type: string, summary: string): Promise<void> => {
        await rpg("scene", "open", "--title", title, "--type", type);
        await rpg("scene", "close", "--summary", summary);
    };

    await scene("Il commiato del castellano", "social", "Il castellano affida a Ettore i pellegrini scomparsi sulla Strada del Re, e gli dà tre giorni.");

    for (const stop of ["Strada del Re", "Campo del Viandante", "Strada del Re", "Guadoscuro", "Locanda del Guado"]) {
        await rpg("move", "Ettore", "Lupa", "--to", stop);

        if (stop === "Campo del Viandante") {
            await scene("La notte al campo", "exploration", "Tracce di carri e un sigillo spezzato accanto al fuoco spento; Lupa fiuta qualcosa verso nord-est.");
        }
    }

    await scene("Arrivo alla locanda", "social", "Bertoldo parla di luci sulla Torre dei Sussurri e di un mercante che compra sigilli.");

    // In from the village by the door, then by the fire.
    await rpg("move", "Ettore", "--at", "E6");
    await rpg("move", "Lupa", "--at", "F6");
}

/** The quests of the demo (D-367): the main one with goals, a counter, a clock and a deadline; one on the side; one done and one failed. */
async function makeDemoQuests(rpg: (...args: string[]) => Promise<void>): Promise<void>
{
    const quest = (name: string, fields: string[], text: string): Promise<void> => rpg("write", name, "--type", "quest", ...fields.flatMap((field) => ["--set", field]), "--text", text);
    await quest(
        "Ritrovare i pellegrini",
        ["status=open", "kind=main", "giver=Il castellano di Rocca di Vetta", "place=[[Torre dei Sussurri]]", "sigilli=1/3", "clock=2/6", "deadline=day 3, 06:00"],
        [
            "Sei pellegrini sono spariti sulla Strada del Re, fra la Rocca e Guadoscuro. Chi li ha presi lascia sigilli spezzati.",
            "",
            "- [x] Ascoltare il castellano",
            "- [x] Cercare tracce al Campo del Viandante",
            "- [ ] Seguire le luci della Torre dei Sussurri",
            "- [ ] Riportare i pellegrini alla Rocca",
        ].join("\n"),
    );
    await quest(
        "Il vino di Bertoldo",
        ["status=open", "giver=Bertoldo", "place=[[Locanda del Guado]]", "botti=1/3"],
        [
            "Il vino buono di Bertoldo è finito, e le botti del mulino non arrivano.",
            "",
            "- [ ] Trovare tre botti al Mulino Rosso",
        ].join("\n"),
    );
    await quest("La scorta al mercato", ["status=done", "giver=Mastro Ivo"], "Ettore ha scortato il carro di Mastro Ivo fino al mercato della Rocca.\n\n- [x] Arrivare al mercato");
    await quest("Il carro rovesciato", ["status=failed"], "Il carro nella radura era vuoto quando Ettore è arrivato.\n\n- [ ] Trovare il carrettiere");
}
