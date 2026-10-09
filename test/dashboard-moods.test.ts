// The moods on the dashboard (D-305): the page knows the engine's moods, the robot and the badges draw each, and the robot's reaction to a roll follows where the
// kept dice fall in their range, as a master at the table.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { moods as engineMoods } from "../src/core/mood.ts";
import { moods, type ShownRoll, type ThrownDie } from "../src/dashboard/data.ts";
import { moodFaces } from "../src/dashboard/mood-faces.ts";
import { rollReach, rollReaction } from "../src/dashboard/reactions.ts";

const d20 = (value: number, dropped?: boolean): ThrownDie => ({ sides: 20, value, ...(dropped === undefined ? {} : { dropped }) });

function roll(dice: ThrownDie[], who?: string, by: ShownRoll["by"] = "master"): ShownRoll
{
    return { id: "r1", at: "2026-10-09T18:00:00Z", by, ...(who === undefined ? {} : { who }), notation: "1d20", total: 0, text: "", dice };
}

describe("the moods on the dashboard", () => {
    it("MOOD-1: the page knows the engine's moods, and the robot and the badges draw each", () => {
        expect(moods).toEqual(engineMoods);
        const robot = readFileSync(new URL("../src/dashboard/assets/master.svg", import.meta.url), "utf8");
        const drawn = [...robot.matchAll(/class="robot-mood robot-mood-([a-z]+)"/g)].map((match) => match[1]);
        expect([...drawn].sort()).toEqual([...moods].sort());
        expect(Object.keys(moodFaces).sort()).toEqual([...moods].sort());
    });

    it("D-305 (7): where the kept dice fall, without what is added: 20 and 1 at the ends of a d20, 18–19 high, 2–3 low", () => {
        const reach = Object.fromEntries([1, 2, 3, 4, 10, 17, 18, 19, 20].map((value) => [value, rollReach([d20(value)]) ?? "middle"]));
        expect(reach).toEqual({ 1: "bottom", 2: "low", 3: "low", 4: "middle", 10: "middle", 17: "middle", 18: "high", 19: "high", 20: "top" });
        // Advantage keeps one die; two six-sided dice reach 12 and 2; fate dice go from -1 to 1 each; an exploded die goes past the top.
        expect(rollReach([d20(20), d20(3, true)])).toBe("top");
        expect(rollReach([d20(1), d20(15, true)])).toBe("bottom");
        expect(rollReach([{ sides: 6, value: 6 }, { sides: 6, value: 5 }])).toBe("high");
        expect(rollReach([{ sides: 6, value: 1 }, { sides: 6, value: 1 }])).toBe("bottom");
        expect(rollReach([{ sides: "F", value: 1 }, { sides: "F", value: 1 }, { sides: "F", value: 1 }, { sides: "F", value: 1 }])).toBe("top");
        expect(rollReach([{ sides: 6, value: 9, faces: [6, 3] }])).toBe("top");
        expect(rollReach([])).toBeUndefined();
        expect(rollReach([d20(20, true)])).toBeUndefined();
    });

    it("D-305 (7): for the party the robot marvels, smiles, worries, is sorry; for anyone else it grins and is disappointed, surprised by the bottom", () => {
        const party = ["Ettore", "Lupa"];
        const faces = (who: string | undefined, by: ShownRoll["by"]) => [20, 19, 2, 1].map((value) => rollReaction(roll([d20(value)], who, by), party)?.mood);
        expect(faces("Ettore", "player")).toEqual(["surprised", "happy", "worried", "sad"]);
        // A companion's roll that the master makes is the party's all the same.
        expect(faces("Lupa", "master")).toEqual(["surprised", "happy", "worried", "sad"]);
        expect(faces(undefined, "player")).toEqual(["surprised", "happy", "worried", "sad"]);
        expect(faces("a creature", "master")).toEqual(["mischievous", "mischievous", "sad", "surprised"]);
        expect(faces(undefined, "master")).toEqual(["mischievous", "mischievous", "sad", "surprised"]);
        expect(rollReaction(roll([d20(11)], "Ettore", "player"), party)).toBeUndefined();
        expect(rollReaction(roll([d20(20)], "Ettore", "player"), party)?.id).toBe("roll-r1");
    });
});
