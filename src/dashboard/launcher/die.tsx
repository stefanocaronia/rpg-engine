// A campaign's sign in the launcher's list: a d20 drawn flat, as an icon, in the strong colour of its theme, else in the page's gold; on its bottom corner,
// small and round, the portrait of its player character, where they have one, as an avatar on a group. Seen, never heard: the card says both.
import { useState } from "preact/hooks";
import type { ListedCampaign } from "./api.ts";

export function CampaignDie({ campaign }: { campaign: ListedCampaign; })
{
    const [lost, setLost] = useState<string | undefined>(undefined);
    const portrait = campaign.character?.portrait;
    const theme = campaign.colours;
    const colour = theme === undefined ? undefined : { "--die-body": `light-dark(${theme.light.body}, ${theme.dark.body})` };
    return (
        <span class="launcher-die" style={colour} aria-hidden="true">
            <svg viewBox="0 0 100 100" focusable="false">
                <polygon class="die-body" points={outline} />
                <path class="die-lines" d={lines} />
            </svg>
            {portrait !== undefined && portrait !== lost && <img class="launcher-portrait" src={portrait} alt="" onError={() => setLost(portrait)} />}
        </span>
    );
}

// The d20 seen face on: a hexagon, the face of the 20 in its middle, and the edges from its corners to the hexagon's.
const outline = "50,4 90,27 90,73 50,96 10,73 10,27";
const lines = "M50 26L27 66H73Z M50 4V26 M10 27L50 26L90 27 M10 73L27 66 M90 73L73 66 M27 66L50 96L73 66";
