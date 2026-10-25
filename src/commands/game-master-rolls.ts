// The master's rolls for anyone outside the party (D-287): hidden behind the screen, as the master-rolls setting has them when unset too, or in view.
import { readTextSetting } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import type { LogEntry } from "../core/log.ts";
import { createProof, fingerprint } from "../dice/index.ts";
import { isPartyMember, pagesWithNameOrAlias } from "../pages/index.ts";
import { campaignWorld } from "./game-world.ts";

/**
 * Whether the master-rolls setting hides a roll of who: one for anyone the party does not hold, by name or alias, as a foe's copy in the scene or a name of
 * no page; never a roll of no one, as an oracle's.
 */
export function behindTheScreen(root: string, context: Context, who: string | undefined): boolean
{
    if (who === undefined || readTextSetting(root, "master-rolls") === "in view") {
        return false;
    }

    return !pagesWithNameOrAlias(campaignWorld(root, context), who).some(isPartyMember);
}

/** Seals a hidden roll's line with its proof, kept for a reveal, and gives the fingerprint the player may ask for. */
export function sealHiddenRoll(entry: LogEntry, text: string, context: Context): string
{
    const proof = createProof(entry.id, text, context.newSalt());
    const shown = fingerprint(proof);
    Object.assign(entry.data, { proof, fingerprint: shown });
    return shown;
}
