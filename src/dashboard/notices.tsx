// The page's own messages, not the master's (D-298): over the page, under its top, each in its kind's colour and with its icon: a problem, the game away, a
// word to know. The master's questions keep the robot.
import { Icon } from "./icons.tsx";

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
