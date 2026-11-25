// What the package command gives back
import type { Extension } from "../../extensions/index.ts";
import type { AdventureExported, AdventureInstalled, AdventureRemoved } from "../shared/books/adventures.ts";
import type { InstalledLanguage, InstalledSystem } from "./here.ts";

export type PackageResult =
    | { kind: "list"; installed: Installed[]; missing: string[]; adventures: { title: string; version: string; since?: string; removable: boolean; }[]; systems: InstalledSystem[]; languages: InstalledLanguage[]; themes: ListedTheme[]; }
    | { kind: "available"; packages: Available[]; failed?: string; }
    | { kind: "installed"; extension: Extension; verified: boolean; commands: string[]; codeLeftOut: boolean; already: boolean; part?: string; tools: string; }
    | { kind: "removed"; name: string; }
    | { kind: "uninstalled"; name: string; wasUsed: boolean; extension: boolean; }
    | { kind: "system-installed"; system: InstalledSystem; plays?: string; loaded?: { runs: true; } | { why: string; }; }
    | { kind: "language-installed"; language: InstalledLanguage; replaced?: string; missing: number; }
    | {
        kind: "theme-installed";
        theme: { id: string; name: string; version?: string; };
        replaced?: { name: string; version?: string; };
        /** The author's folder a linked theme is read from, with what keeps it from being offered, and whether package new just made it. */
        linked?: string;
        problems?: string[];
        made?: true;
    }
    | ({ kind: "adventure-installed"; } & AdventureInstalled)
    | ({ kind: "adventure-removed"; } & AdventureRemoved)
    | ({ kind: "exported"; } & AdventureExported);

/** A package on this computer, as list gives it to the master and to the dashboard; broken when it does not read (D-442); with where its problems are reported. */
export type Installed =
    | { name: string; package: string; version: string; title: string; about: string; verified: boolean; used: boolean; issues?: string; }
    | { name: string; package: string; broken: string; issues?: string; };

/** A package on npm for this rpg-engine, with the version installed here, if any, and whether it is newer (D-442). */
export interface Available
{
    name: string;
    package: string;
    version: string;
    description?: string;
    author?: string;
    verified: boolean;
    installed?: string;
    update: boolean;
    /** Its latest version, which needs a newer rpg-engine (D-515 (2)). */
    newer?: { version: string; engine?: string; };
}

/** A theme of the dashboard on this computer, for every campaign: its id, its name, the folder a linked one is read from, and why it is not offered while it fails a check. */
export interface ListedTheme
{
    id: string;
    name: string;
    version?: string;
    linked?: string;
    problems?: string[];
}
