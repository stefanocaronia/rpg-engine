import { describe, expect, it } from "vitest";
import { sameName } from "../src/core/text.ts";
import { copyNames, nextTurn, readScene } from "../src/scene/index.ts";

describe("scenes", () => {
    it("numbers copies after those already taken, ignoring case", () => {
        expect(copyNames("Annegato", 2, [])).toEqual(["Annegato 1", "Annegato 2"]);
        expect(copyNames("Annegato", 1, ["annegato 1", "Annegato 2", "Lupo 7", "Annegato capo"])).toEqual(["Annegato 3"]);
        expect(copyNames("Lupo", 1, ["Annegato 1"])).toEqual(["Lupo 1"]);
    });

    it("passes the turn, and starts a new round after the last", () => {
        const order = ["Ennio", "Annegato 1", "Lena"];
        expect(nextTurn(order, undefined, 1)).toEqual({ turn: "Ennio", round: 1 });
        expect(nextTurn(order, "annegato 1", 1)).toEqual({ turn: "Lena", round: 1 });
        expect(nextTurn(order, "Lena", 1)).toEqual({ turn: "Ennio", round: 2 });
    });

    it("reads a scene, keeps keys written by hand, and says what is wrong in one", () => {
        expect(readScene({ title: "Al guado", type: "social", note: "piove" })).toEqual({ title: "Al guado", type: "social", note: "piove", with: [], copies: {} });
        expect(() => readScene({ type: "social", round: 0 })).toThrow("title: Invalid input");
        expect(() => readScene({ title: "X", type: "duel" })).toThrow("type:");
        expect(() => readScene({ title: "X", type: "combat", order: [] })).toThrow("order:");
        expect(() => readScene({ title: "X", type: "combat", copies: { "Annegato 1": { hp: "22/22" } } })).toThrow("copies.Annegato 1.creature");
    });

    it("finds a name however it is written", () => {
        expect(sameName(["Annegato 1", "Lena"], " LENA ")).toBe("Lena");
        expect(sameName(["Annegato 1"], "Annegato 2")).toBeUndefined();
    });
});
