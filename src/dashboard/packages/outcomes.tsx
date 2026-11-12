// What a change of the Packages page came to, in the player's words: what went wrong, what was added or done, what uninstalling does.
import type { PackageAction, PackageKind, PackageOutcome, PackageWork } from "../api.ts";
import { t } from "../text.ts";
import type { Said } from "./rows.tsx";

/** What went wrong, in the page's words, with the engine's under them: the no, a computer with no window for the yes, the work of another package. */
export function failure(at: string, action: PackageWork["action"], name: string, outcome: Extract<PackageOutcome, { done: false; }>): Said
{
    if (outcome.code === "declined") {
        return { at, problem: true, text: t("You said no: nothing changed.") };
    }

    if (outcome.code === "no-window") {
        const command = action === "library" ? `rpg config library --add "${name}"` : `rpg package install ${/\s/.test(name) ? `"${name}"` : name}`;
        return { at, problem: true, text: t("No window for your yes opens on this computer: add it from your terminal, in the campaign's folder."), command };
    }

    if (outcome.code === "busy") {
        return { at, problem: true, text: action === "library" ? t("One change at a time: wait for the one under way, then try again.") : t("One package at a time: wait for the one under way, then try again.") };
    }

    return { at, problem: true, text: action === "add" ? t("Nothing was added.") : t("Nothing changed."), why: outcome.error };
}

/** What an addition did, by the kind the engine recognized. */
export function addedText(kind: PackageKind | undefined): string
{
    const texts: Record<PackageKind, string> = {
        adventure: t("The adventure is in the campaign: the master brings it into the story when you want it."),
        extension: t("The extension is in the campaign: it counts from now on."),
        system: t("The game system is on this computer, for a new campaign."),
        language: t("The language is on this computer, for every campaign."),
    };
    return kind === undefined ? t("Done.") : texts[kind];
}

/** What a change did, once done. */
export function doneText(action: PackageAction, name: string): string
{
    const texts: Record<PackageAction, string> = {
        update: t("{name} is updated.", { name }),
        remove: t("{name} is out of the campaign: it stays on this computer.", { name }),
        uninstall: t("{name} is off this computer.", { name }),
    };
    return texts[action];
}

/** What uninstalling does, by kind. */
export function uninstallText(what: "system" | "extension" | "language")
{
    if (what === "system") {
        return <p>{t("It goes off this computer: a new campaign can no longer choose it. This campaign does not change.")}</p>;
    }

    if (what === "language") {
        return <p>{t("It goes off this computer: the dashboard goes back to its own words in this language.")}</p>;
    }

    return (
        <>
            <p>{t("It goes off this computer, and out of this campaign. Another campaign that uses it asks to install it again.")}</p>
            <p class="confirm-note">{t("What it wrote in the campaign stays, and comes back if you install it again.")}</p>
        </>
    );
}
