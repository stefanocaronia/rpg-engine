// The page's own messages, not the master's (D-298): over the page, under its top, each in its kind's colour and with its icon: a problem, the game away, a
// word to know. The master's questions keep the robot.
import { Icon } from "./icons.tsx";
import { languageName } from "./languages.ts";
import { pageTranslation, t } from "./text.ts";

/** A message of the page: a problem, the game away from the page, or a word to know. */
export interface Notice
{
    kind: "problem" | "away" | "info";
    text: string;
}

export function Notices({ notices }: { notices: Notice[]; })
{
    return notices.length === 0 ? null : (
        <div class="notices">
            {notices.map((notice) => (
                <p key={notice.text} class={`notice ${notice.kind}`} role={notice.kind === "problem" ? "alert" : "status"}>
                    <Icon name={notice.kind === "info" ? "info" : "alert"} />
                    <span>{notice.text}</span>
                </p>
            ))}
        </div>
    );
}

/** What the page has to say of the game: the campaign's files that do not read, which the master fixes; the page being translated, or out of reach (D-406). */
export function gameNotices(problems: number | undefined): Notice[]
{
    const translation = pageTranslation();
    const language = translation === undefined ? "" : languageName(translation.language, document.documentElement.lang || "en") ?? translation.language;
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
