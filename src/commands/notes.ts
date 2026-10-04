// Lines that several commands add to their plain-text output.

/** Says which settings are missing and how to set them; empty when none is. */
export function missingSettingsNote(missing: string[]): string
{
    if (missing.length === 0) {
        return "";
    }

    return `Still missing: ${missing.join(", ")}. Ask the player, then set ${missing.length === 1 ? "it" : "each one"} with the config command (setting and value).`;
}

// Long lists in outputs show this many names; the rest are counted.
const listedNames = 10;

/** The first names of a long list, joined, and how many more there are: "A · B, and 3 more". */
export function shortList(names: string[], separator: string): string
{
    const more = names.length > listedNames ? `, and ${names.length - listedNames} more` : "";
    return `${names.slice(0, listedNames).join(separator)}${more}`;
}

/** "Changed with it, since they read hp from Lupo: Zanna (hp 13/13)…", or nothing when no page changed with it; `command` is the one that changes a single page. */
export function followersNote(followers: string[], why: string, command: "change" | "write", value?: string): string
{
    if (followers.length === 0) {
        return "";
    }

    const listed = followers.map((name) => (value === undefined ? name : `${name} (${value})`));
    return `Changed with it, ${why}: ${shortList(listed, ", ")}. To change only one of them, ${command} that page instead.`;
}

/** "Not changed, since they hold their own hp: Grigio (hp 5/11)", ten at most, or nothing when no page keeps its own. */
export function keepersNote(keepers: string[], field: string): string
{
    if (keepers.length === 0) {
        return "";
    }

    return `Not changed, since they hold their own ${field}: ${shortList(keepers, ", ")}.`;
}

/** Lists the files of the world that could not be read as pages; empty when there are none. */
export function skippedPagesNote(problems: string[]): string
{
    if (problems.length === 0) {
        return "";
    }

    return `These files could not be read as pages and were left out:\n${problems.map((problem) => `- ${problem}`).join("\n")}`;
}
