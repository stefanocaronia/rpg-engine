// Help (D-409, D-413): the complete guide, in the page's language, as its markdown file has it (guide/<code>.md): what it is, an index of chips, and each of
// its parts a card that folds, the first two open. Its anchors are the English guide's, so that a link finds its heading in every language. At its end, how to
// tell us what went wrong: the page's own words, so that the guide's translations stay as they are.
import { useEffect, useMemo, useState } from "preact/hooks";
import { CardHead, CardHeader } from "../card.tsx";
import { Icon, type IconName, iconPath, isIconName } from "../icons.tsx";
import { PageHead } from "../pages.tsx";
import { pageLanguageOf, t } from "../text.ts";
import { anchorOf, type Block, markdownBlocks, plainText } from "./blocks.ts";
import { Blocks, Inline } from "./markdown.tsx";

/** A part of the guide: its heading, with its icon, and its blocks. */
interface Part
{
    heading: Extract<Block, { kind: "heading"; }>;
    blocks: Block[];
}

/** How to play with RPG Engine: the guide, from installing it to the campaign's folder. */
export function Help()
{
    const language = pageLanguageOf(document.documentElement.lang);
    const guide = useGuide(language);
    const [open, setOpen] = useState(() => new Set([0, 1]));
    const [sought, setSought] = useState<string>();
    const { lead, parts, anchors } = useMemo(() => guideParts(guide.own, guide.english), [guide]);

    const toggle = (index: number, event: MouseEvent): void => {
        event.preventDefault();
        setOpen((before) => new Set(before.has(index) ? [...before].filter((one) => one !== index) : [...before, index]));
    };

    // A chip of the index, or a link to a heading, opens its card and brings the heading into sight.
    const go = (anchor: string): void => {
        const index = parts.findIndex((part) => [part.heading, ...part.blocks].some((block) => anchors.get(block) === anchor));

        if (index >= 0) {
            setOpen((before) => new Set([...before, index]));
            setSought(anchor);
        }
    };

    useEffect(() => {
        if (sought === undefined) {
            return;
        }

        const target = document.getElementById(sought);
        setSought(undefined);

        if (target === null) {
            return;
        }

        // Under the top, drawn together down the page, as tall as the style sheet says; the focus where the eye goes.
        const above = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--top-space")) + 16;
        const to = target.getBoundingClientRect().top + window.scrollY - above;
        window.scrollTo({ top: to, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        const focused = target instanceof HTMLDetailsElement ? target.querySelector("summary") : target;

        if (focused !== null && focused.tagName !== "SUMMARY") {
            focused.tabIndex = -1;
        }

        focused?.focus({ preventScroll: true });
    }, [sought]);

    return (
        <section class="page-stack help" aria-labelledby="help-title">
            <PageHead section="help" id="help-title" />
            <div class="help-lead">
                <Blocks blocks={lead} anchors={anchors} go={go} />
            </div>
            <nav class="help-index" aria-label={t("Contents")}>
                {parts.map((part) => (
                    <button key={part.heading.text} type="button" class="help-chip" onClick={() => go(anchors.get(part.heading) ?? "")}>
                        <Icon name={iconOf(part.heading)} />
                        <Inline text={part.heading.text} go={go} />
                    </button>
                ))}
            </nav>
            <div class="help-cards">
                {parts.map((part, index) => (
                    <details key={part.heading.text} id={anchors.get(part.heading)} class="group help-card" open={open.has(index)}>
                        <CardHeader
                            icon={iconPath(iconOf(part.heading))}
                            title={<h3>{part.heading.text}</h3>}
                            preview={plainText(part.blocks.find((block) => block.kind === "paragraph")?.text ?? "")}
                            open={open.has(index)}
                            onToggle={(event) => toggle(index, event)}
                        />
                        <div class="guide">
                            <Blocks blocks={part.blocks} anchors={anchors} go={go} />
                        </div>
                    </details>
                ))}
            </div>
            <ReportCard />
        </section>
    );
}

/** Where the issues of RPG Engine are reported, as its README says. */
export const issuesLink = "https://github.com/stefanocaronia/rpg-engine/issues";

/** The invitation to report what went wrong, said to one who may never have seen GitHub: what to write there, and that it is a public page. */
export function ReportCard()
{
    return (
        <section class="card help-report" aria-labelledby="help-report-title">
            <CardHead icon={iconPath("chat")} title={<h3 id="help-report-title">{t("Tell us")}</h3>} />
            <div class="card-body">
                <p>{t("Something doesn't work, confuses you or could be better? Tell us what you did, what you expected and what happened: every report helps.")}</p>
                <p class="help-report-note">{t("GitHub is the site where RPG Engine is made: you write there with a free account, as in a forum, and anyone can read it.")}</p>
                <a class="about-link" href={issuesLink} target="_blank" rel="noreferrer">
                    <Icon name="github" />
                    {t("Open a report on GitHub")}
                </a>
            </div>
        </section>
    );
}

/** The guide in a language, and in English for its anchors; empty until they are read. */
function useGuide(language: string): { own: string; english: string; }
{
    const [guide, setGuide] = useState({ own: "", english: "" });

    useEffect(() => {
        let current = true;
        const read = (code: string): Promise<string> => fetch(`/guide/${code}.md`).then((response) => (response.ok ? response.text() : "")).catch(() => "");
        void Promise.all([read("en"), language === "en" ? Promise.resolve(undefined) : read(language)]).then(([english, own]) => {
            if (current) {
                setGuide({ own: own === undefined || own === "" ? english : own, english });
            }
        });

        return () => {
            current = false;
        };
    }, [language]);

    return guide;
}

/** The guide's lead, the lines before its first part, its title aside; its parts; and each heading's anchor, the English one at its place. */
function guideParts(own: string, english: string): { lead: Block[]; parts: Part[]; anchors: Map<Block, string>; }
{
    const blocks = markdownBlocks(own);
    const headings = blocks.filter((block) => block.kind === "heading");
    const englishHeadings = markdownBlocks(english).filter((block) => block.kind === "heading");
    const sameShape = headings.length === englishHeadings.length && headings.every((heading, index) => heading.level === englishHeadings[index]?.level);
    const anchors = new Map<Block, string>(headings.map((heading, index) => [heading, anchorOf((sameShape ? englishHeadings[index] : heading)?.text ?? heading.text)]));
    const first = blocks.findIndex((block) => block.kind === "heading" && block.level === 2);
    const lead = (first < 0 ? blocks : blocks.slice(0, first)).filter((block) => !(block.kind === "heading" && block.level === 1));
    const parts: Part[] = [];

    for (const block of first < 0 ? [] : blocks.slice(first)) {
        if (block.kind === "heading" && block.level === 2) {
            parts.push({ heading: block, blocks: [] });
        } else {
            parts.at(-1)?.blocks.push(block);
        }
    }

    return { lead, parts, anchors };
}

/** A part's icon, as its heading names it; a book when it names none the page has. */
function iconOf(heading: Part["heading"]): IconName
{
    return heading.icon !== undefined && isIconName(heading.icon) ? heading.icon : "help";
}
