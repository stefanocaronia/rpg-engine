// A test extension's code for the API 4: a knot the player ties from the page, and a widget whose page code draws it, with data only the page reads.
import type { PackageEntry } from "rpg-engine";

const charms: PackageEntry = ({ z }) => ({
    commands: [
        {
            name: "charms",
            description: "The knots of the charm. Read-only.",
            input: z.object({}),
            readOnly: true,
            run: (_input, game) => `Knots: ${(game.state.read() as { knots?: number; } | null)?.knots ?? 0}.`,
        },
        {
            name: "charms-tie",
            description: "Tie a knot on the charm.",
            input: z.object({ knot: z.string().min(1) }),
            player: true,
            run: (input, game) => {
                const knots = ((game.state.read() as { knots?: number; } | null)?.knots ?? 0) + 1;
                game.state.write({ knots });
                game.log(`knot tied: ${input.knot}`);
                return `A ${input.knot} knot: ${knots} in all.`;
            },
        },
    ],
    widgets: {
        charm: (game) => {
            const knots = (game.state.read() as { knots?: number; } | null)?.knots ?? 0;
            return {
                data: { knots, secret: "only-the-page-reads-this" },
                body: "braid",
                parts: [{ who: "Kira", does: "ties" }, { track: { label: "Knots", value: knots, max: 5, figure: "knot" } }],
            };
        },
    },
});

export default charms;
