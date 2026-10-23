// Where the page is (D-276, D-309): a section by its address, as #/scene, and for the sheet whom it shows, as #/party/Ettore; the sheet when the address says
// nothing. #/character/Ettore, the sheet's first address, still leads there (D-310), and #/combat to the Scene, which shows the turns now (D-444). The page
// never changes section by itself.
import { t } from "./text.ts";

/** The sections, in the order the page shows them. */
export const sections = ["party", "scene", "journal", "world"] as const;

/** The pages at the row's end, as icons, in the menu on a phone: the saves, played with, then what is read, as Help and the settings are, and the packages (D-356, D-409, D-475). */
export const menuPages = ["saves", "help", "settings", "packages", "about"] as const;

export type Section = (typeof sections)[number] | (typeof menuPages)[number];

/** A place in the page: its section, for the sheet whom it shows, a page's tab, as #/packages/add, and what is open in the tab, as #/world/lore/Bertoldo. */
export interface Address
{
    section: Section;
    name?: string;
    tab?: string;
}

/** The address a hash says, as #/party/Ettore; the sheet for none or one the page does not know. */
export function readAddress(hash: string): Address
{
    const [, written = "", ...rest] = hash.replace(/^#/, "").split("/");
    const first = written === "combat" ? "scene" : written;
    const section = [...sections, ...menuPages].find((candidate) => candidate === first) ?? "party";
    const sheet = first === "party" || first === "character";
    const known = section === first;
    const tab = sheet || !known ? "" : decoded(rest[0] ?? "");
    const name = sheet ? decoded(rest.join("/")) : tab === "" ? "" : decoded(rest.slice(1).join("/"));
    return { section, ...(name === "" ? {} : { name }), ...(tab === "" ? {} : { tab }) };
}

/** A section's address, as #/scene, one of its tabs', as #/packages/add, or what is open in a tab, as #/world/lore/Bertoldo. */
export function sectionAddress(section: Section, tab?: string, name?: string): string
{
    return [`#/${section}`, ...(tab === undefined ? [] : [encodeURIComponent(tab)]), ...(tab === undefined || name === undefined ? [] : [encodeURIComponent(name)])].join("/");
}

/** A section's name as the page writes it, in its language: Scene. */
export function sectionLabel(section: Section): string
{
    const labels: Record<Section, string> = {
        party: t("Party"),
        scene: t("Scene"),
        journal: t("Journal"),
        world: t("World"),
        help: t("Help"),
        saves: t("Saves"),
        settings: t("Settings"),
        packages: t("Packages"),
        about: t("About"),
    };
    return labels[section];
}

/** A part of an address as written, nothing when it is not well encoded. */
function decoded(part: string): string
{
    try {
        return decodeURIComponent(part);
    } catch {
        return "";
    }
}
