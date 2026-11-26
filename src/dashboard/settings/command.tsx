// Words to copy as they are, as a command to type in a terminal or the address a phone opens: as code, with a button that copies them.
import { useState } from "preact/hooks";
import { t } from "../text.ts";

/** A command to type in a terminal, and a button that copies it, named by `name` where the words are too long to be said, as an address. */
export function Command({ text, name }: { text: string; name?: string; })
{
    const [copied, setCopied] = useState(false);

    const copy = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Where the browser keeps the clipboard, the command stays there to select.
        }
    };

    return (
        <span class="setting-command">
            {/* Its words wrap only between them, never at a hyphen of a package's name; one wider than the line wraps within. */}
            <code>{text.split(" ").flatMap((word, index) => [index === 0 ? "" : " ", <span key={index} class="command-word">{word}</span>])}</code>
            <button type="button" class="setting-copy" aria-label={name ?? t("Copy {command}", { command: text })} onClick={() => void copy()}>{copied ? t("Copied") : t("Copy")}</button>
        </span>
    );
}
