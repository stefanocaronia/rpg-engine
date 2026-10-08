// The laws of links (MECCANICHE, LNK-1–LNK-5): texts made at random from the pieces of links, code and comments, read against a model that scans them character by
// character; backlinks and the link checks of validate on worlds made at random.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { backlinks, checkWorld, type Link, links, type Page, sectionTitles, type World } from "../src/pages/index.ts";

const runs = { numRuns: 3000 };
// The pieces a text is made of: links and their parts, attachments, code and comments, line breaks.
const pieces = [
    "[[",
    "]]",
    "[",
    "]",
    "Lupo",
    "ombra",
    "#Tana",
    "#",
    "|",
    "|il lupo",
    "^b1",
    "cartella/",
    ".md",
    ".png",
    "!",
    "\\",
    "`",
    "%%",
    " ",
    "\n",
    "\n```\n",
    "\n````\n",
    "\n~~~\n",
    "\n## Tana\n",
];
const texts = fc.array(fc.constantFrom(...pieces), { maxLength: 30 }).map((parts) => parts.join(""));

// The table of cases of links (LNK-1, LNK-2): each way a link is written, and each place it does not count.
const cases: [string, Link[]][] = [
    ["[[Lupo]]", [{ page: "Lupo" }]],
    ["[[Lupo#Tana]]", [{ page: "Lupo", section: "Tana" }]],
    ["[[Lupo|il lupo]] e [[Lupo#Tana|la tana]]", [{ page: "Lupo" }, { page: "Lupo", section: "Tana" }]],
    ["[[creature/Lupo.md]] [[Lupo.MD]]", [{ page: "Lupo" }, { page: "Lupo" }]],
    ["| [[Lupo\\|il lupo]] | [[Lupo#Tana\\|tana]] |", [{ page: "Lupo" }, { page: "Lupo", section: "Tana" }]],
    ["[[Lupo#^b1]] [[Lupo#]] [[ Lupo ]]", [{ page: "Lupo" }, { page: "Lupo" }, { page: "Lupo" }]],
    ["![[mappa.png]] ![[Lupo]]", [{ page: "Lupo" }]],
    ["[[]] [[#Tana]] [[|x]] [[Lupo]", []],
    ["`[[Lupo]]` e ``[[Ombra]]``", []],
    ["```\n[[Lupo]]\n```\n[[Ombra]]", [{ page: "Ombra" }]],
    ["````\n```\n[[Lupo]]\n```\n````\n[[Ombra]]", [{ page: "Ombra" }]],
    ["~~~\n```\n[[Lupo]]\n~~~\n[[Ombra]]", [{ page: "Ombra" }]],
    ["```js\n[[Lupo]]\n``` fine\n[[Ombra]]\n```", []],
    ["%% [[Lupo]] %% [[Ombra]]", [{ page: "Ombra" }]],
    ["[[Ombra]] %%\n[[Lupo]]\n%% [[Tana]]", [{ page: "Ombra" }, { page: "Tana" }]],
    ["[[Ombra]]\n%% fino alla fine\n[[Lupo]]", [{ page: "Ombra" }]],
    ["%%\n```\n%%\n[[Lupo]]", [{ page: "Lupo" }]],
];

describe("the table of cases of links", () => {
    it("LNK-1, LNK-2: reads each way a link is written, and none in code or in a comment", () => {
        for (const [text, expected] of cases) {
            expect(links(text), JSON.stringify(text)).toEqual(expected);
        }

        expect(sectionTitles("## Uno\n%%\n## Due\n%%\n````\n```\n## Tre\n```\n````\n## Quattro %% nota %%")).toEqual(["Uno", "Quattro %% nota %%"]);
    });
});

describe("the laws of links, on texts made at random", () => {
    it("LNK-1, LNK-2: a text links to what the model finds outside code and comments, comments and fenced blocks spanning lines too", () => {
        fc.assert(
            fc.property(texts, (text) => {
                expect(links(text), JSON.stringify(text)).toEqual(linksByModel(text));
            }),
            runs,
        );
    });

    it("LNK-2: a title in code or in a comment is no section, as the model finds", () => {
        fc.assert(
            fc.property(texts, (text) => {
                expect(sectionTitles(text), JSON.stringify(text)).toEqual(titlesByModel(text));
            }),
            runs,
        );
    });
});

// Worlds of four pages, each with a section or not, linking to one another in a field and in the text, in any case, to a section or not.
const names = ["Lupo", "Tana", "Bosco", "Ombra"];
const linkTexts = fc.tuple(fc.constantFrom(...names, "Nessuno"), fc.boolean(), fc.constantFrom(undefined, "Covo", "Radura")).map(([name, lower, section]) =>
    `[[${lower ? name.toLowerCase() : name}${section === undefined ? "" : `#${section}`}]]`
);
const worlds = fc.tuple(...names.map(() => fc.record({ section: fc.constantFrom(undefined, "Covo"), field: fc.array(linkTexts, { maxLength: 2 }), text: fc.array(linkTexts, { maxLength: 2 }) })))
    .map((made): World => ({
        root: "",
        problems: [],
        pages: names.map((name, index): Page => ({
            name,
            type: "place",
            path: `world/places/${name}.md`,
            fields: made[index].field.length === 0 ? {} : { vicini: made[index].field },
            body: [made[index].text.join(" "), made[index].section === undefined ? "" : `## ${made[index].section}\n\nUn covo.`].filter((part) => part !== "").join("\n\n"),
        })),
    }));

describe("the laws of backlinks and broken links, on worlds made at random", () => {
    it("LNK-4: a page's backlinks are the other pages that link to it, by name in any case, with the fields and the text that do", () => {
        fc.assert(
            fc.property(worlds, (world) => {
                for (const page of world.pages) {
                    const model = world.pages.filter((other) => other !== page).flatMap((other) => {
                        const pointsHere = (written: string[]): boolean => written.some((link) => linkName(link) === page.name.toLowerCase());
                        const places = [...(pointsHere((other.fields.vicini as string[] | undefined) ?? []) ? ["vicini"] : []), ...(pointsHere(other.body.match(/\[\[[^\]]*\]\]/g) ?? []) ? ["text"] : [])];
                        return places.length === 0 ? [] : [{ page: other.name, places }];
                    });
                    expect(backlinks(world, page).map((backlink) => ({ page: backlink.page.name, places: backlink.places })), page.name).toEqual(model);
                }
            }),
            runs,
        );
    });

    it("LNK-5: validate reports each link to a page that does not exist, or to a section the page does not have, and no other", () => {
        fc.assert(
            fc.property(worlds, (world) => {
                const reported = checkWorld(world).filter((problem) => / links to /.test(problem.message)).map((problem) => `${problem.path} ${/links to (\[\[.*?\]\])/.exec(problem.message)?.[1]}`);
                const model = world.pages.flatMap((page) =>
                    [...((page.fields.vicini as string[] | undefined) ?? []), ...(page.body.match(/\[\[[^\]]*\]\]/g) ?? [])].flatMap((link) => {
                        const target = world.pages.find((candidate) => candidate.name.toLowerCase() === linkName(link));
                        const section = /#([^\]]*)\]\]/.exec(link)?.[1];
                        const broken = target === undefined || (section !== undefined && !target.body.includes(`## ${section}`));
                        // The problem names the link as it is written.
                        return broken ? [`${page.path} ${link}`] : [];
                    })
                );
                expect(reported.sort()).toEqual(model.sort());
            }),
            runs,
        );
    });
});

/** The name a link written by these tests points to, in lower case. */
function linkName(link: string): string
{
    return link.replace(/^\[\[/, "").replace(/(#.*)?\]\]$/, "").toLowerCase();
}

/**
 * The lines of a text with what is code or comment taken out: a fence opens a block that only a fence of the same character, at least as long and with nothing after
 * it, closes; outside blocks, inline code goes first, then what lies between %% marks, also across lines. Undefined for a line of a block or a fence.
 */
function proseByModel(text: string): { prose: string | undefined; commented: boolean; }[]
{
    let fence: string | undefined;
    let comment = false;
    return text.split("\n").map((line) => {
        const leading = line.length - line.trimStart().length;
        const marks = line.slice(leading);
        const character = marks[0];
        const run = character === "`" || character === "~" ? marks.length - marks.replace(new RegExp(`^\\${character}+`), "").length : 0;

        if (!comment && run >= 3) {
            const closes = fence !== undefined && character === fence[0] && run >= fence.length && marks.slice(run).trim() === "";

            if (fence === undefined || closes) {
                fence = fence === undefined ? marks.slice(0, run) : undefined;
                return { prose: undefined, commented: false };
            }
        }

        if (fence !== undefined) {
            return { prose: undefined, commented: false };
        }

        const commented = comment;
        let withoutCode = "";
        let index = 0;

        // A run of backticks opens inline code that the next run of the same length closes; without one, it is text.
        const runAt = (at: number): number => {
            let end = at;

            while (line[end] === "`") {
                end++;
            }

            return end - at;
        };

        while (index < line.length) {
            const run = runAt(index);
            let close = -1;

            for (let at = index + run; run > 0 && close === -1 && at < line.length; at += Math.max(1, runAt(at))) {
                close = runAt(at) === run ? at : -1;
            }

            withoutCode += close === -1 ? line.slice(index, index + Math.max(1, run)) : "";
            index = close === -1 ? index + Math.max(1, run) : close + run;
        }

        let prose = "";

        for (let at = 0; at < withoutCode.length; at++) {
            if (withoutCode.startsWith("%%", at)) {
                comment = !comment;
                at++;
            } else if (!comment) {
                prose += withoutCode[at];
            }
        }

        return { prose, commented };
    });
}

/** The links of a text by the model: from each [[ to the first ], which must be followed by another, with a name before any | # ^, and no file of another kind. */
function linksByModel(text: string): Link[]
{
    return proseByModel(text).flatMap(({ prose }) => {
        const found: Link[] = [];

        // A link read takes its characters with it: the next one starts after it.
        for (let at = prose?.indexOf("[[") ?? -1; prose !== undefined && at !== -1; at = prose.indexOf("[[", at)) {
            const end = prose.indexOf("]", at + 2);
            const inner = end === -1 ? "" : prose.slice(at + 2, end);
            const nameEnd = [...inner].findIndex((character) => "|#^".includes(character));
            const name = nameEnd === -1 ? inner : inner.slice(0, nameEnd);

            if (end === -1 || prose[end + 1] !== "]" || name === "") {
                at++;
                continue;
            }

            at = end + 2;

            const page = (name.endsWith("\\") ? name.slice(0, -1) : name).split("/").at(-1)?.replace(/\.md$/i, "").trim() ?? "";
            const attachment = /\.[a-z0-9]+$/i.test(name.trim()) && !/\.md$/i.test(name.trim());
            const rest = inner.slice(name.length);
            const sectionText = rest.startsWith("#") ? rest.slice(1).split(/[|^]/)[0] : undefined;
            const section = sectionText?.replace(/\\$/, "").trim();

            if (!attachment) {
                found.push(section === undefined || section === "" ? { page } : { page, section });
            }
        }

        return found;
    });
}

/** The section titles of a text by the model: headings on lines that are neither code nor begun inside a comment. */
function titlesByModel(text: string): string[]
{
    const lines = text.split("\n");
    return proseByModel(text).flatMap(({ prose, commented }, index) => {
        const match = prose === undefined || commented ? null : /^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(lines[index]);
        return match === null ? [] : [match[2].trim()];
    });
}
