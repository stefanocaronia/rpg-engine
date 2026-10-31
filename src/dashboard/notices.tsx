// The page's own messages, not the master's (D-298): over the page, under its top, each in its kind's colour and with its icon: a problem, the game away, a
// word to know. The master's questions keep the robot.
import type { ShownImport } from "./data.ts";
import { Icon } from "./icons.tsx";
import { languageName } from "./languages.ts";
import { pageLocale, pageTranslation, t } from "./text.ts";

/**
 * A message of the page: a problem, the game away from the page, or a word to know; one that stays while it changes, as an import's, has its own key, and a
 * count beside it with a bar under it, which a screen reader reads where it is without hearing it at every step.
 */
export interface Notice
{
    kind: "problem" | "away" | "info";
    text: string;
    key?: string;
    count?: { done: number; of: number; };
}

export function Notices({ notices }: { notices: Notice[]; })
{
    return notices.length === 0 ? null : (
        <div class="notices">
            {notices.map((notice) => {
                // The role on the words alone, always the same node: a count beside them is read where it is, never heard at each step.
                return (
                    <p key={notice.key ?? notice.text} class={`notice ${notice.kind}`}>
                        <Icon name={notice.kind === "info" ? "info" : "alert"} />
                        <span role={notice.kind === "problem" ? "alert" : "status"}>{notice.text}</span>
                        {notice.count !== undefined && (
                            <>
                                <span class="count" dir="ltr">{`${notice.count.done}/${notice.count.of}`}</span>
                                <span class="bar" aria-hidden="true" style={{ "--done": `${Math.round((100 * notice.count.done) / Math.max(notice.count.of, 1))}%` }} />
                            </>
                        )}
                    </p>
                );
            })}
        </div>
    );
}

/** What the page says of an import under way (D-491 (11)): what it is doing, and how far; nothing without one. */
export function importNotices(importing: ShownImport | undefined): Notice[]
{
    if (importing === undefined) {
        return [];
    }

    const words = { title: importing.title };
    const texts: Record<ShownImport["step"], string> = {
        opening: t("Importing “{title}”: opening the document", words),
        pictures: t("Importing “{title}”: reading its pages from their pictures", words),
        reading: t("Importing “{title}”: reading its parts", words),
        chat: t("Importing “{title}” in the chat", words),
        choosing: t("“{title}” is read: the master asks you where to start", words),
        writing: t("Importing “{title}”: writing the world", words),
        waiting: t("The import of “{title}” is paused: the master takes it up again", words),
        stopped: t("The import of “{title}” stopped: the master can try it again", words),
    };
    const count = importing.done !== undefined && importing.of !== undefined && importing.of > 0 ? { count: { done: importing.done, of: importing.of } } : {};
    return [{ kind: importing.step === "stopped" ? "problem" : "info", text: texts[importing.step], key: "import", ...count }];
}

/** What the page has to say of the game: the campaign's files that do not read, which the master fixes; the page being translated, or out of reach (D-406). */
export function gameNotices(problems: number | undefined): Notice[]
{
    const translation = pageTranslation();
    const language = translation === undefined ? "" : languageName(translation.language, pageLocale()) ?? translation.language;
    return [
        ...(problems === undefined || problems === 0
            ? []
            : [{
                kind: "problem" as const,
                text: problems === 1 ? t("The campaign has a problem in its files: the master sees it and fixes it.") : t("The campaign has {count} problems in its files: the master sees them and fixes them.", { count: problems }),
            }]),
        ...(translation?.state === "translating" ? [{ kind: "info" as const, text: t("This computer is translating the page into {language}: until then it stays in English.", { language }) }] : []),
        ...(translation?.state === "unable" ? [{ kind: "info" as const, text: t("The page stays in English: Codex or Claude Code would translate it into {language} on this computer.", { language }) }] : []),
    ];
}
