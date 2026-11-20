// The port of the campaign's page on this computer (D-577): chosen once, kept in campaign.yaml, changed only when another program or campaign holds it.
import { join } from "node:path";
import { parseDocument } from "yaml";
import { files } from "../core/store.ts";
import { readYamlFile, writeYamlFile } from "../core/yaml-file.ts";
import { campaignFileName } from "./find-campaign.ts";

// Not one of the player's settings: the config command neither shows nor changes it.
const portKey = "dashboard-port";

/** The port campaign.yaml keeps for the campaign's page; undefined when it keeps none, or one that is no port. */
export function savedPort(root: string): number | undefined
{
    try {
        const value: unknown = parseDocument(files().text(join(root, campaignFileName)) ?? "").get(portKey);
        return typeof value === "number" && Number.isInteger(value) && value > 0 && value < 65536 ? value : undefined;
    } catch {
        return undefined;
    }
}

/** Keeps the port of the campaign's page in campaign.yaml, the rest of the file as it is; nothing when the file does not read, as the page works all the same. */
export function savePort(root: string, port: number): void
{
    const path = join(root, campaignFileName);

    try {
        const document = readYamlFile(path, 'settings, such as "name: ..."');

        if (document.get(portKey) !== port) {
            document.set(portKey, port);
            writeYamlFile(path, document);
        }
    } catch {
        // A campaign.yaml that does not read keeps no port: the next chat chooses one again.
    }
}
