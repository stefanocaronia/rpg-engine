// The port of the campaign's page on this computer (D-577): chosen once, kept in a file of the campaign's own that git leaves out, so that it moves with
// the folder and never to another computer, and changed only when another program or campaign holds it.
import { join } from "node:path";
import { files } from "../core/store.ts";

/** The file that keeps the port of the campaign's page, in its folder: this computer's, which the engine's .gitignore leaves out. */
export const portFileName = ".dashboard-port";

/** The port kept for the campaign's page; undefined when none is, or one that is no port. */
export function savedPort(root: string): number | undefined
{
    const text = files().text(join(root, portFileName))?.trim() ?? "";
    const port = /^\d+$/.test(text) ? Number(text) : Number.NaN;
    return Number.isInteger(port) && port > 0 && port < 65536 ? port : undefined;
}

/** Keeps the port of the campaign's page; nothing when it cannot be written, as the page works all the same and the next chat chooses again. */
export function savePort(root: string, port: number): void
{
    if (savedPort(root) === port) {
        return;
    }

    try {
        files().write(join(root, portFileName), `${port}\n`);
    } catch {
        // A folder that cannot be written keeps no port.
    }
}
