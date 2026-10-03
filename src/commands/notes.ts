// Lines that several commands add to their plain-text output.

/** Says which settings are missing and how to set them; empty when none is. */
export function missingSettingsNote(missing: string[]): string
{
    if (missing.length === 0) {
        return "";
    }

    return `Still missing: ${missing.join(", ")}. Ask the player, then set ${missing.length === 1 ? "it" : "each one"} with the config command (setting and value).`;
}

/** Lists the files of the world that could not be read as pages; empty when there are none. */
export function skippedPagesNote(problems: string[]): string
{
    if (problems.length === 0) {
        return "";
    }

    return `These files could not be read as pages and were left out:\n${problems.map((problem) => `- ${problem}`).join("\n")}`;
}
