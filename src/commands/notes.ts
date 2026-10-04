// Lines that several commands add to their plain-text output.

/** Says which settings are missing and how to set them; empty when none is. */
export function missingSettingsNote(missing: string[]): string
{
    if (missing.length === 0) {
        return "";
    }

    return `Still missing: ${missing.join(", ")}. Ask the player, then set ${missing.length === 1 ? "it" : "each one"} with the config command (setting and value).`;
}

// The pages that change with a base are listed up to this many; the rest are counted.
const listedFollowers = 10;

/** "Changed with it, since they read hp from Lupo: Zanna (hp 13/13)…", or nothing when no page changed with it; `command` is the one that changes a single page. */
export function followersNote(followers: string[], why: string, command: "change" | "write", value?: string): string
{
    if (followers.length === 0) {
        return "";
    }

    const listed = followers.slice(0, listedFollowers).map((name) => (value === undefined ? name : `${name} (${value})`));
    const more = followers.length > listedFollowers ? `, and ${followers.length - listedFollowers} more` : "";
    return `Changed with it, ${why}: ${listed.join(", ")}${more}. To change only one of them, ${command} that page instead.`;
}

/** "Not changed, since they hold their own hp: Grigio (hp 5/11)", ten at most, or nothing when no page keeps its own. */
export function keepersNote(keepers: string[], field: string): string
{
    if (keepers.length === 0) {
        return "";
    }

    const more = keepers.length > listedFollowers ? `, and ${keepers.length - listedFollowers} more` : "";
    return `Not changed, since they hold their own ${field}: ${keepers.slice(0, listedFollowers).join(", ")}${more}.`;
}

/** Lists the files of the world that could not be read as pages; empty when there are none. */
export function skippedPagesNote(problems: string[]): string
{
    if (problems.length === 0) {
        return "";
    }

    return `These files could not be read as pages and were left out:\n${problems.map((problem) => `- ${problem}`).join("\n")}`;
}
