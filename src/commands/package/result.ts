// What the package command gives back
import type { Extension } from "../../extensions/index.ts";
import type { AdventureExported, AdventureInstalled } from "../shared/books/adventures.ts";
import type { InstalledLanguage, InstalledSystem } from "./here.ts";

export type PackageResult =
    | { kind: "list"; installed: Installed[]; missing: string[]; adventures: { title: string; version: string; since?: string; removable: boolean; }[]; systems: InstalledSystem[]; languages: InstalledLanguage[]; }
    | { kind: "available"; packages: Available[]; failed?: string; }
    | { kind: "installed"; extension: Extension; verified: boolean; commands: string[]; codeLeftOut: boolean; already: boolean; part?: string; tools: string; }
    | { kind: "removed"; name: string; }
    | { kind: "uninstalled"; name: string; wasUsed: boolean; extension: boolean; }
    | { kind: "system-installed"; system: InstalledSystem; plays?: string; loaded?: { runs: true; } | { why: string; }; }
    | { kind: "language-installed"; language: InstalledLanguage; replaced?: string; missing: number; }
    | ({ kind: "adventure-installed"; } & AdventureInstalled)
    | { kind: "adventure-removed"; title: string; }
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
