// Work done once for each text while the server runs, and what is read never changed in place (step 11, D-194).
import { describe, expect, it } from "vitest";
import { frozen } from "../src/core/frozen.ts";
import { rememberedByText } from "../src/core/memo.ts";

describe("work remembered by text", () => {
    it("computes once for each text, gives it frozen, and forgets all at once past its limit", () => {
        const computed: string[] = [];
        const lengthOf = rememberedByText((text) => (computed.push(text), { length: text.length }), 2);
        expect(lengthOf("uno")).toEqual({ length: 3 });
        expect(lengthOf("uno")).toBe(lengthOf("uno"));
        expect(Object.isFrozen(lengthOf("uno"))).toBe(true);
        lengthOf("due");
        lengthOf("uno");
        expect(computed).toEqual(["uno", "due"]);
        lengthOf("tre");
        lengthOf("due");
        expect(computed).toEqual(["uno", "due", "tre", "due"]);
    });
});

describe("frozen", () => {
    it("freezes a value with all it holds, and takes values that hold nothing or themselves", () => {
        const value = { name: "Ennio", hp: { now: 5 }, tags: ["pc", { tag: "eroe" }], none: null };
        expect(frozen(value)).toBe(value);
        expect(Object.isFrozen(value.hp)).toBe(true);
        expect(Object.isFrozen(value.tags[1])).toBe(true);
        const looped: { self?: unknown; } = {};
        looped.self = looped;
        expect(frozen(looped)).toBe(looped);
        expect(Object.isFrozen(looped)).toBe(true);
        expect(frozen("testo")).toBe("testo");
    });
});
