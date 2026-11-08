// A language's code and the base it falls back to: never from a script to another, as traditional Chinese to zh, which is simplified.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translationFolder } from "../src/core/files.ts";
import { codeAndBase } from "../src/core/language.ts";
import { makeTempFolder } from "./support.ts";

describe("a language's code and its base", () => {
    it("falls back to the base in the same script, never from traditional Chinese to simplified", () => {
        expect(codeAndBase("pt-BR")).toEqual(["pt-br", "pt"]);
        expect(codeAndBase(" it ")).toEqual(["it"]);
        expect(codeAndBase("zh-TW")).toEqual(["zh-tw"]);
        expect(codeAndBase("zh-Hant-HK")).toEqual(["zh-hant-hk"]);
        expect(codeAndBase("zh-CN")).toEqual(["zh-cn", "zh"]);
        expect(codeAndBase("")).toEqual([]);
    });

    it("gives a system's translation by the code or its base, not simplified Chinese for traditional", () => {
        const system = makeTempFolder();
        mkdirSync(join(system, "translations", "zh"), { recursive: true });
        mkdirSync(join(system, "translations", "pt"), { recursive: true });
        expect(translationFolder(system, "pt-BR")).toBe(join(system, "translations", "pt"));
        expect(translationFolder(system, "zh-CN")).toBe(join(system, "translations", "zh"));
        expect(translationFolder(system, "zh-TW")).toBeUndefined();
    });
});
