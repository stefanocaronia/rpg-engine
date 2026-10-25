// The master's rolls for anyone outside the party (D-287): hidden behind the screen, as the master-rolls setting has them when unset too, or in view.
import { readTextSetting } from "../campaign/index.ts";
import type { Context } from "../core/context.ts";
import type { LogEntry } from "../core/log.ts";
import { sameName } from "../core/text.ts";
import { createProof, fingerprint } from "../dice/index.ts";
import { isPartyMember, pagesWithNameOrAlias } from "../pages/index.ts";
import { readOpenScene } from "./game-scene.ts";
import { campaignWorld } from "./game-world.ts";

/**
 * Whether the master-rolls setting hides a roll of who: one for anyone the party does not hold, by name or alias, as a foe's copy in the scene or a name of
 * no page; never a roll of no one, as an oracle's.
 */
export function behindTheScreen(root: string, context: Context, who: string | undefined): boolean
{
    return who !== undefined && screenUp(root) && !ofTheParty(root, context, who);
}

/** Whether who is the player character or a companion, by name or alias, dead ones too. */
export function ofTheParty(root: string, context: Context, who: string): boolean
{
    return pagesWithNameOrAlias(campaignWorld(root, context), who).some(isPartyMember);
}

/** Whether the campaign keeps the master's own rolls, as a table's or the oracle's, behind the screen: unless master-rolls says in view. */
export function screenUp(root: string): boolean
{
    return readTextSetting(root, "master-rolls") !== "in view";
}

/** Whether who names no page and no copy in the open scene: a stranger named in words, or a party member named wrongly. */
export function namesNoOne(root: string, context: Context, who: string): boolean
{
    const copies = Object.keys(readOpenScene(root).scene?.copies ?? {});
    return pagesWithNameOrAlias(campaignWorld(root, context), who).length === 0 && sameName(copies, who) === undefined;
}

/** Seals a hidden roll's line with its proof, kept for a reveal, and gives the fingerprint the player may ask for. */
export function sealHiddenRoll(entry: LogEntry, text: string, context: Context): string
{
    const proof = createProof(entry.id, text, context.newSalt());
    const shown = fingerprint(proof);
    Object.assign(entry.data, { proof, fingerprint: shown });
    return shown;
}
