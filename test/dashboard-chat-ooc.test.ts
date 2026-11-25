// The words out of the game in the chat with the master, told from the story's: the master's, *[OOC: like this]*, and the player's, [OOC: like this] or in
// plain brackets; never the brackets of a link, of a page's name or of code.
import { describe, expect, it } from "vitest";
import { masterBlocks, playerRuns } from "../src/dashboard/chat/ooc.ts";

const story = (text: string): { ooc: boolean; text: string; } => ({ ooc: false, text });
const off = (text: string): { ooc: boolean; text: string; } => ({ ooc: true, text });

describe("the words out of the game in the chat", () => {
    it("leaves the master's text whole where nothing in it is out of the game", () => {
        const text = "The rain beats on the shutters.\n\n- a list\n- of two\n\nWhat do you do?";
        expect(masterBlocks(text)).toEqual([{ kind: "text", text }]);
        expect(masterBlocks("")).toEqual([{ kind: "text", text: "" }]);
        // The master's plain brackets are the story's: only those marked OOC are out of the game.
        expect(masterBlocks("The sign says [keep out].")).toEqual([{ kind: "text", text: "The sign says [keep out]." }]);
        // Brackets with the mark and nothing after it say nothing.
        expect(masterBlocks("Empty [OOC: ] here.")).toEqual([{ kind: "text", text: "Empty [OOC: ] here." }]);
    });

    it("takes a paragraph of the master's that is all out of the game apart, without its brackets, its mark and its italics", () => {
        expect(masterBlocks("*[OOC: shall I roll for the monsters?]*")).toEqual([{ kind: "ooc", text: "shall I roll for the monsters?" }]);
        expect(masterBlocks("[OOC: plain]")).toEqual([{ kind: "ooc", text: "plain" }]);
        expect(masterBlocks("  _[ooc : lower, with spaces]_  ")).toEqual([{ kind: "ooc", text: "lower, with spaces" }]);
        expect(masterBlocks("***[OOC: bold and italic]***")).toEqual([{ kind: "ooc", text: "bold and italic" }]);
        // Over two lines of one paragraph.
        expect(masterBlocks("*[OOC: one line\nand another]*")).toEqual([{ kind: "ooc", text: "one line\nand another" }]);
        // Among the story's paragraphs, which stay together where they follow each other.
        expect(masterBlocks("First.\n\nSecond.\n\n*[OOC: a word]*\n\nThird.")).toEqual([
            { kind: "text", text: "First.\n\nSecond." },
            { kind: "ooc", text: "a word" },
            { kind: "text", text: "Third." },
        ]);
    });

    it("tells the words out of the game inside a paragraph of the master's from the story's around them, several of them too", () => {
        expect(masterBlocks("The innkeeper looks at you *[OOC: a check comes]* and turns away.")).toEqual([
            { kind: "mixed", runs: [story("The innkeeper looks at you "), off("a check comes"), story(" and turns away.")] },
        ]);
        expect(masterBlocks("One [OOC: first] two [OOC: second] three.")).toEqual([
            { kind: "mixed", runs: [story("One "), off("first"), story(" two "), off("second"), story(" three.")] },
        ]);
        // Two of them with only space between: no run of nothing.
        expect(masterBlocks("[OOC: first] [OOC: second]")).toEqual([{ kind: "mixed", runs: [off("first"), off("second")] }]);
        // Emphasis on one side alone is the story's.
        expect(masterBlocks("So *[OOC: half] it goes.")).toEqual([{ kind: "mixed", runs: [story("So *"), off("half"), story(" it goes.")] }]);
    });

    it("counts the brackets opened inside those out of the game, and leaves those that never close as they are", () => {
        expect(masterBlocks("[OOC: the roll [2d6] is yours]")).toEqual([{ kind: "ooc", text: "the roll [2d6] is yours" }]);
        expect(playerRuns("I wait [is it [really] night?] here")).toEqual({ runs: [story("I wait "), off("is it [really] night?"), story(" here")], whole: false });
        // Plain ones that never close are the story's, and so is what follows.
        expect(playerRuns("I open [the door")).toEqual({ runs: [story("I open [the door")], whole: false });
        expect(masterBlocks("The sign says [keep out.")).toEqual([{ kind: "text", text: "The sign says [keep out." }]);
        // One that never closes before one that does.
        expect(playerRuns("[ and then [aside]")).toEqual({ runs: [story("[ and then "), off("aside")], whole: false });
        // Never across a blank line.
        expect(playerRuns("[one\n\ntwo]")).toEqual({ runs: [story("[one\n\ntwo]")], whole: false });
        // A bracket written after a backslash is a character.
        expect(playerRuns("a \\[plain\\] bracket")).toEqual({ runs: [story("a \\[plain\\] bracket")], whole: false });
    });

    it("takes marked brackets that never close as out of the game to their paragraph's end, so that the master's mark never shows while they write", () => {
        expect(masterBlocks("An open [OOC: bracket and no end.")).toEqual([{ kind: "mixed", runs: [story("An open "), off("bracket and no end.")] }]);
        expect(masterBlocks("*[OOC: still being")).toEqual([{ kind: "ooc", text: "still being" }]);
        expect(masterBlocks("[OOC: one\n\ntwo]")).toEqual([{ kind: "ooc", text: "one" }, { kind: "text", text: "two]" }]);
        expect(masterBlocks("[OOC: the roll [2d6] is\nyours\n")).toEqual([{ kind: "ooc", text: "the roll [2d6] is\nyours" }]);
        expect(playerRuns("[OOC: sorry, I have to go")).toEqual({ runs: [off("sorry, I have to go")], whole: true });
        // The mark alone, with no word yet, is not.
        expect(masterBlocks("*[OOC:")).toEqual([{ kind: "text", text: "*[OOC:" }]);
        // The italics that close them not written yet, at the text's end; elsewhere, emphasis on one side alone is the story's.
        expect(masterBlocks("**[OOC: a word]*")).toEqual([{ kind: "ooc", text: "a word" }]);
        expect(masterBlocks("*[OOC: a word]\n\nAnd then.")).toEqual([{ kind: "mixed", runs: [story("*"), off("a word")] }, { kind: "text", text: "And then." }]);
        // As the master writes a message, piece by piece: once a word out of the game is there, never its brackets, its mark or its italics.
        const whole = "The rain beats.\n\n*[OOC: shall I roll for them?]*\n\nThe innkeeper *[OOC: a check comes]* turns away.";

        for (let length = 1; length <= whole.length; length++) {
            const written = masterBlocks(whole.slice(0, length)).map((block) => (block.kind === "mixed" ? block.runs.map((run) => run.text).join("") : block.text)).join("\n");
            // Only what opens them may show, at the text's end, until their first word comes.
            const marks = written.replace(/\*?(\[(O(O(C:?)?)?)?)?\s*$/i, "");
            expect(marks, whole.slice(0, length)).not.toMatch(/[[\]*]|OOC/);
        }

        expect(masterBlocks(whole)).toEqual([
            { kind: "text", text: "The rain beats." },
            { kind: "ooc", text: "shall I roll for them?" },
            { kind: "mixed", runs: [story("The innkeeper "), off("a check comes"), story(" turns away.")] },
        ]);
    });

    it("never takes the brackets of a link, of a picture, of a page's name or of code for words out of the game", () => {
        const link = "Read [OOC: the rules](https://example.org/rules) first.";
        expect(masterBlocks(link)).toEqual([{ kind: "text", text: link }]);
        expect(playerRuns("see [the map](maps/town.png) and ![a picture] and [[Whispering Tower]]")).toEqual({
            runs: [story("see [the map](maps/town.png) and ![a picture] and [[Whispering Tower]]")],
            whole: false,
        });
        expect(playerRuns("[[Page]] [aside] [[Never closed")).toEqual({ runs: [story("[[Page]] "), off("aside"), story(" [[Never closed")], whole: false });
        // Inline code, with one backtick or more, and a fenced block, with blank lines in it.
        expect(playerRuns("type `[OOC: this]` or ``[that]`` then [aside]")).toEqual({ runs: [story("type `[OOC: this]` or ``[that]`` then "), off("aside")], whole: false });
        const fenced = "Before.\n\n```\n[OOC: in a block]\n\n[still in it]\n```\n\n*[OOC: after it]*";
        expect(masterBlocks(fenced)).toEqual([{ kind: "text", text: "Before.\n\n```\n[OOC: in a block]\n\n[still in it]\n```" }, { kind: "ooc", text: "after it" }]);
        expect(playerRuns("```\n[in a block]\n```")).toEqual({ runs: [story("```\n[in a block]\n```")], whole: false });
        // A backtick that never closes on its line is a character.
        expect(playerRuns("a ` alone [aside]")).toEqual({ runs: [story("a ` alone "), off("aside")], whole: false });
    });

    it("reads the player's brackets, marked or plain, as out of the game, and says when a message is all of them", () => {
        expect(playerRuns("[OOC: can we stop at ten?]")).toEqual({ runs: [off("can we stop at ten?")], whole: true });
        expect(playerRuns("  [a break?]  ")).toEqual({ runs: [off("a break?")], whole: true });
        expect(playerRuns("[one] [two]")).toEqual({ runs: [off("one"), off("two")], whole: true });
        expect(playerRuns("*[OOC: as the master writes]*")).toEqual({ runs: [off("as the master writes")], whole: true });
        expect(playerRuns("I draw my sword [softly] and wait [ooc: brb]")).toEqual({ runs: [story("I draw my sword "), off("softly"), story(" and wait "), off("brb")], whole: false });
        expect(playerRuns("I draw my sword.")).toEqual({ runs: [story("I draw my sword.")], whole: false });
        expect(playerRuns("[] and [ ]")).toEqual({ runs: [story("[] and [ ]")], whole: false });
        expect(playerRuns("")).toEqual({ runs: [], whole: false });
    });
});
