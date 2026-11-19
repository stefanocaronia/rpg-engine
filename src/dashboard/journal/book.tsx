// The story told as a book (T-227): the master's prose, a chapter for each closed scene, set as a book's pages: one chapter at a time on paper, its paragraphs
// justified and indented, a capital at its start; the chapters listed beside it, closing to the left, the last with its bookmark; downloaded as Markdown or as a
// web page that prints as the book.
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { sectionAddress } from "../address.ts";
import type { BookChapter } from "../data.ts";
import { Icon } from "../parts/icons.tsx";
import { InlineText } from "../parts/markdown.tsx";
import { useChoice } from "../shell/prefs.ts";
import { t } from "../text.ts";

// Whether the list of chapters is open beside the page, kept in this browser; on a narrow screen it is above the page, closed until asked for.
const indexChoice = { key: "rpg-engine.book-index", initial: "open", values: ["open", "closed"] } as const;

/** The book: the chapter the address asks for, or the last; the list of chapters beside it, and the pages turned by chapter, each a link to its address. */
export function Book({ chapters, asked, campaign }: { chapters: BookChapter[]; asked?: string | undefined; campaign?: string | undefined; })
{
    const [index, setIndex] = useChoice(indexChoice);
    const page = useRef<HTMLElement>(null);
    const title = useRef<HTMLHeadingElement>(null);
    const shown = useRef(false);
    const [above, setAbove] = useState(false);
    const narrow = window.matchMedia("(max-width: 760px)").matches;
    const open = narrow ? above : index === "open";
    const toggle = (): void => (narrow ? setAbove(!open) : setIndex(open ? "closed" : "open"));

    // A chapter turned to, from the list or the page's foot, as #/journal/story/3: the focus on its title, its start in view; the book as opened keeps both.
    useEffect(() => {
        if (!shown.current) {
            shown.current = true;
            return;
        }

        setAbove(false);
        title.current?.focus({ preventScroll: true });

        // Its start hidden over the window or under the top: brought just under them.
        if (page.current !== null && page.current.getBoundingClientRect().top < Number.parseFloat(getComputedStyle(page.current).scrollMarginTop)) {
            page.current?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        }
    }, [asked]);

    if (chapters.length === 0) {
        return (
            <div class="book-empty">
                <p>{t("Here the master writes the story as a book: a chapter for each scene, once it ends.")}</p>
                <p>{t("In a campaign begun before, ask the master to write the story so far.")}</p>
            </div>
        );
    }

    const last = chapters[chapters.length - 1];
    const current = chapters.find((chapter) => String(chapter.number) === asked) ?? last;
    const at = chapters.indexOf(current);
    const before = chapters[at - 1];
    const after = chapters[at + 1];

    return (
        <div class={open ? "book" : "book index-closed"}>
            <nav class="book-index" aria-label={t("Chapters")}>
                <button type="button" class="button quiet book-index-toggle" aria-expanded={open} onClick={toggle}>
                    <Icon name="list" />
                    <span>{t("Chapters")}</span>
                </button>
                {open && (
                    <ol>
                        {chapters.map((chapter) => (
                            <li key={chapter.number}>
                                <a
                                    href={chapterAddress(chapter)}
                                    aria-current={chapter === current ? "page" : undefined}
                                    aria-describedby={chapter === last ? `book-line-${chapter.number} book-last` : `book-line-${chapter.number}`}
                                >
                                    <span class="book-index-title">
                                        <span class="book-index-number">{chapter.number}</span> {chapter.title}
                                    </span>
                                    <span class="book-index-line" id={`book-line-${chapter.number}`} aria-hidden="true">{openingWords(chapter.text)}</span>
                                    {chapter === last && <span class="book-mark" aria-hidden="true" />}
                                    {chapter === last && <span class="visually-hidden" id="book-last">{t("The last chapter")}</span>}
                                </a>
                            </li>
                        ))}
                    </ol>
                )}
            </nav>
            <article class={current === last ? "book-page marked" : "book-page"} ref={page} aria-labelledby="book-chapter-title">
                <header class="book-head">
                    <p class="book-number">{t("Chapter {number}", { number: current.number })}</p>
                    <h3 id="book-chapter-title" ref={title} tabIndex={-1}>{current.title}</h3>
                    <span class="book-ornament" aria-hidden="true">❦</span>
                </header>
                <BookText text={current.text} />
                <footer class="book-turn">
                    {before === undefined ? <span /> : (
                        <a href={chapterAddress(before)}>
                            <span class="book-arrow" aria-hidden="true">←</span>
                            <span class="visually-hidden">{t("Chapter {number}", { number: before.number })}:</span> {before.title}
                        </a>
                    )}
                    <span class="book-folio">{t("{number} of {count}", { number: at + 1, count: chapters.length })}</span>
                    {after === undefined ? <span /> : (
                        <a href={chapterAddress(after)} class="book-on">
                            <span class="visually-hidden">{t("Chapter {number}", { number: after.number })}:</span> {after.title} <span class="book-arrow" aria-hidden="true">→</span>
                        </a>
                    )}
                </footer>
            </article>
            <div class="book-export">
                <button type="button" class="button quiet" onClick={() => download(fileName(campaign, "md"), "text/markdown", bookMarkdown(chapters, campaign))}>
                    <Icon name="download" />
                    {t("Download as Markdown")}
                </button>
                <button type="button" class="button quiet" onClick={() => download(fileName(campaign, "html"), "text/html", bookPage(chapters, campaign))}>
                    <Icon name="download" />
                    {t("Download as a web page")}
                </button>
            </div>
        </div>
    );
}

/** A chapter's prose: paragraphs apart by a blank line, a line of three marks alone a break within it, italics and bold as written. */
function BookText({ text }: { text: string; })
{
    return (
        <div class="book-text">
            {text.split(/\n\s*\n/).map((block) => block.trim()).filter((block) => block !== "").map((block, index) =>
                isBreak(block)
                    ? <p key={index} class="book-break" aria-hidden="true">⁂</p>
                    : (
                        <p key={index}>
                            <InlineText text={block.replace(/^#+\s*/, "").replace(/\s*\n\s*/g, " ")} />
                        </p>
                    )
            )}
        </div>
    );
}

/** A chapter's address, as #/journal/story/3: pushed, so that Back turns the page back. */
function chapterAddress(chapter: BookChapter): string
{
    return sectionAddress("journal", "story", String(chapter.number));
}

function isBreak(block: string): boolean
{
    return /^(?:[*\-_]\s*){3,}$|^⁂$/.test(block);
}

/** The first words of a chapter, for its line in the list. */
function openingWords(text: string): string
{
    const first = text.split(/\n\s*\n/).map((block) => block.trim()).find((block) => block !== "" && !isBreak(block)) ?? "";
    const plain = first.replace(/[*_#]/g, "").replace(/\s+/g, " ");
    return plain.length <= 60 ? plain : `${plain.slice(0, plain.lastIndexOf(" ", 60) > 30 ? plain.lastIndexOf(" ", 60) : 60)}…`;
}

/** The book as one Markdown file: the campaign's name, then each chapter under its number and title. */
function bookMarkdown(chapters: BookChapter[], campaign: string | undefined): string
{
    const head = campaign === undefined ? "" : `# ${campaign}\n\n`;
    return `${head}${chapters.map((chapter) => `## ${t("Chapter {number}", { number: chapter.number })}: ${chapter.title}\n\n${chapter.text}`).join("\n\n")}\n`;
}

/** The book as a web page of its own, set as the page sets it, each chapter starting a new sheet when printed. */
function bookPage(chapters: BookChapter[], campaign: string | undefined): string
{
    const holder = document.createElement("div");
    render(
        <>
            {campaign !== undefined && <h1>{campaign}</h1>}
            {chapters.map((chapter) => (
                <section key={chapter.number} class="chapter">
                    <p class="number">{t("Chapter {number}", { number: chapter.number })}</p>
                    <h2>{chapter.title}</h2>
                    <p class="ornament" aria-hidden="true">❦</p>
                    <BookText text={chapter.text} />
                </section>
            ))}
        </>,
        holder,
    );
    const language = document.documentElement.lang || "en";
    const title = (campaign ?? t("Story")).replace(/[<&]/g, (mark) => (mark === "<" ? "&lt;" : "&amp;"));
    return `<!doctype html>\n<html lang="${language}" dir="${
        document.documentElement.dir || "ltr"
    }">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title}</title>\n<style>${exportStyle}</style>\n</head>\n<body>\n${holder.innerHTML}\n</body>\n</html>\n`;
}

// The exported page's own style: the book's setting, with no font of its own, and a sheet for each chapter in print.
const exportStyle = `
body { margin: 0 auto; padding: 3rem 1.5rem; max-width: 36rem; background: #f6eedb; color: #2f261b; font: 1.125rem/1.65 "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif; }
h1 { text-align: center; font-weight: normal; font-size: 2.2rem; margin: 2rem 0 4rem; }
.chapter { margin-bottom: 4rem; }
.number { text-align: center; letter-spacing: .15em; text-transform: uppercase; font-size: .8rem; margin: 0; }
h2 { text-align: center; font-weight: normal; font-size: 1.6rem; margin: .3rem 0 0; }
.ornament { text-align: center; margin: .4rem 0 1.6rem; }
.book-text p { margin: 0; text-indent: 1.5em; text-align: justify; hyphens: auto; text-wrap: pretty; orphans: 2; widows: 2; }
.book-text p:first-child, .book-text .book-break + p { text-indent: 0; }
.book-text p:first-child:not(:lang(ar), :lang(hi), :lang(ja), :lang(zh), :lang(ko))::first-letter { float: inline-start; font-size: 3.2em; line-height: .85; padding-block-start: .05em; padding-inline-end: .08em; }
.book-text .book-break { text-align: center; text-indent: 0; margin: .8rem 0; }
@media (max-width: 30rem) { body { padding: 2rem 1.25rem; } .book-text p { text-align: start; } }
@media print { body { background: none; padding: 0; } .chapter { break-before: page; } h1 + .chapter { break-before: auto; } }
`;

function fileName(campaign: string | undefined, extension: string): string
{
    const name = (campaign ?? t("Story")).replace(/[\\/:*?"<>|]+/g, " ").trim();
    return `${name === "" ? "story" : name}.${extension}`;
}

/** Gives the browser a file to save. */
function download(name: string, type: string, text: string): void
{
    const address = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
    const link = document.createElement("a");
    link.href = address;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(address), 1000);
}
