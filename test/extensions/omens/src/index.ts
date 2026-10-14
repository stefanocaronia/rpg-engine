// A test extension's code: a command that reads an omen, rolled with the engine's dice and kept in its state, and an omen at each dawn time passes (D-436).
import type { ExtensionEntry, Game, GameMoment } from "rpg-engine";

const omens = ["a crow", "a broken wheel", "clear water", "a white stag", "smoke", "a falling star"];

const omensAtDawn: ExtensionEntry = ({ z }) => ({
    commands: [
        {
            name: "omens",
            description: "Read an omen now, for a question. Example: omens, question will the bridge hold.",
            input: z.object({ question: z.string().min(1).describe("what the omen answers") }),
            run: (input, game) => `${input.question}: ${read(game, "asked")}.`,
        },
        {
            name: "omens-last",
            description: "The last omen read. Read-only.",
            input: z.object({}),
            readOnly: true,
            run: (_input, game) => {
                const state = game.state.read() as { last?: string; } | null;
                return state?.last === undefined ? "No omen yet." : `The last omen: ${state.last}.`;
            },
        },
    ],
    timePassed: ({ from, to }, game) => {
        const dawns = dawnsBetween(from, to);

        if (from.date === to.date) {
            return [`Omens begin: ${read(game, "the game starts")}.`];
        }

        return dawns === 0 ? [] : [`Omen of ${dawns === 1 ? "the dawn" : `${dawns} dawns`}: ${Array.from({ length: dawns }, () => read(game, "dawn")).at(-1) ?? ""}.`];
    },
});

export default omensAtDawn;

/** An omen rolled, kept as the last one, and logged where only the master sees it. */
function read(game: Game, why: string): string
{
    const omen = omens[game.roll("1d6").total - 1];
    const place = game.party()?.places[0];
    game.state.write({ last: omen, why, ...(place === undefined ? {} : { place }) });
    game.log(`omen: ${omen}`);
    return omen;
}

/** How many dawns, at 06:00, come after one moment and up to another. */
function dawnsBetween(from: GameMoment, to: GameMoment): number
{
    const minutes = (moment: GameMoment): number => (moment.day - 1) * 1440 + (moment.minute ?? 0);
    const dawn = (minute: number): number => Math.floor((minute - 360) / 1440);
    return dawn(minutes(to)) - dawn(minutes(from));
}
