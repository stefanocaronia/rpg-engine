// A test extension's code for the API 3 (D-505): it reads a page, the party and the scene, sets the fields its extension.yaml adds, rolls for someone and asks
// the player, each command giving back what the engine gave it.
import type { GameView, PackageEntry } from "rpg-engine";

const wards: PackageEntry = ({ z }) => ({
    commands: [
        {
            name: "wards",
            description: "Read a page's ward, the party and the scene. Read-only.",
            input: z.object({ page: z.string(), field: z.string().optional(), formula: z.string().optional(), effect: z.string().optional(), carries: z.string().optional() }),
            readOnly: true,
            positionals: ["page"],
            run: (input, game) => JSON.stringify(readOf(game, input)),
        },
        {
            name: "wards-mark",
            description: "Mark a ward on a page.",
            input: z.object({ page: z.string(), field: z.string(), value: z.string() }),
            positionals: ["page"],
            run: (input, game) => {
                game.set(input.page, { [input.field]: /^-?\d+$/.test(input.value) ? Number(input.value) : input.value }, "a ward marked");
                return "Marked.";
            },
        },
        {
            name: "wards-change",
            description: "Change a counter of a page, as change does.",
            input: z.object({ page: z.string(), field: z.string(), to: z.string() }),
            positionals: ["page"],
            run: (input, game) => game.change(input.page, input.field, { to: Number(input.to) }, "a ward changed"),
        },
        {
            name: "wards-roll",
            description: "Test a ward, for who.",
            input: z.object({ who: z.string(), notation: z.string(), values: z.string().optional() }),
            run: (input, game) => {
                const values = input.values === undefined ? {} : { values: input.values.split(",").map(Number) };
                return JSON.stringify(game.roll(input.notation, { who: input.who, why: "a ward tested", check: "Ward", ...values }));
            },
        },
        {
            name: "wards-ask",
            description: "Ask the player to raise a ward, then mark its strength.",
            input: z.object({ question: z.string(), notation: z.string().optional(), forced: z.boolean().optional(), card: z.boolean().optional(), widget: z.string().optional() }),
            needsPlayer: true,
            run: async (input, game) => {
                // Forced, it has no button to turn it down; in a card, the ward's, with a rule under the buttons and a roll's own words (D-507).
                const card = input.card === true ? { card: { widget: input.widget ?? "ward", key: "ward-1" }, rule: "A 1 breaks the ward", roll: { label: "Raise it", note: "now" } } : {};
                const asked = await game.ask({
                    question: input.question,
                    check: "Ward",
                    notation: input.notation ?? "1d6+wit-bonus",
                    ...(input.forced === true ? { decline: false } : {}),
                    ...card,
                    tones: (faces) => faces.map((face) => (face === 1 ? "bad" : undefined)),
                });
                const pc = game.party()?.members.find((member) => member.pc)?.name;

                if ("rolled" in asked && pc !== undefined) {
                    game.set(pc, { "ward-strength": asked.rolled.total }, "the ward raised");
                }

                // Written whatever the answer: never once the call is stopped.
                game.log(`ward asked: ${Object.keys(asked)[0] ?? ""}`);
                return JSON.stringify(asked);
            },
        },
    ],
    widgets: {
        ward: (game) => {
            const pc = game.party()?.members.find((member) => member.pc)?.name;
            const strength = pc === undefined ? undefined : game.page(pc)?.value("ward-strength");
            return typeof strength !== "number" ? undefined : { parts: [{ track: { label: "Ward", value: strength, max: 10 } }] };
        },
    },
});

export default wards;

/** What the game gives of a page, the party and the scene. */
function readOf(game: GameView, input: { page: string; field?: string; formula?: string; effect?: string; carries?: string; }): unknown
{
    const page = game.page(input.page);
    return {
        page: page === undefined ? null : {
            name: page.name,
            pc: page.pc,
            party: page.party,
            ...(input.field === undefined ? {} : { value: page.value(input.field) ?? null, counter: page.counter(input.field) ?? null }),
            ...(input.formula === undefined ? {} : { formula: page.formula(input.formula) ?? null }),
            ...(input.effect === undefined ? {} : { has: page.has(input.effect) }),
            ...(input.carries === undefined ? {} : { carries: page.carries(input.carries) }),
        },
        members: game.party()?.members ?? null,
        scene: game.scene() ?? null,
    };
}
