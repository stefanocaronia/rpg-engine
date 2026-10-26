// A test extension's code for the API 2: a sky rolled with the engine's dice, told and set by its commands.
import type { PackageEntry } from "rpg-engine";

const skies = ["storm", "rain", "clouds", "haze", "clear", "bright"];

const skiesAtDawn: PackageEntry = ({ z }) => ({
    commands: [
        {
            name: "skies",
            description: "The sky now. Read-only.",
            input: z.object({}),
            readOnly: true,
            run: (_input, game) => `The sky: ${(game.state.read() as { sky?: string; } | null)?.sky ?? skies[game.roll("1d6").total - 1]}.`,
        },
        {
            name: "skies-set",
            description: "Set the sky, as a spell does.",
            input: z.object({ sky: z.enum(skies) }),
            positionals: ["sky"],
            run: (input, game) => {
                game.state.write({ sky: input.sky });
                return `The sky: ${input.sky}.`;
            },
        },
    ],
});

export default skiesAtDawn;
