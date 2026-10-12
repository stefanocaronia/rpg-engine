// Where the page is (D-276, D-309): a section by its address, as #/scene, and for the sheet whom it shows, as #/party/Ettore; the sheet when the address says
// nothing. #/character/Ettore, the sheet's first address, still leads there (D-310). The page never changes section by itself.
import { t } from "./text.ts";

/** The sections, in the order the page shows them. */
// Combat is there only while a fight is open (D-314).
export const sections = ["party", "scene", "combat", "journal", "world"] as const;

/** The pages at the row's end, as icons, in the menu on a phone: the saves, played with, then what is read, as Help and the settings are (D-356, D-409). */
export const menuPages = ["saves", "help", "settings", "about"] as const;

export type Section = (typeof sections)[number] | (typeof menuPages)[number];

/** A place in the page: its section, and for the sheet whom it shows. */
export interface Address
{
    section: Section;
    name?: string;
}

/** The address a hash says, as #/party/Ettore; the sheet for none or one the page does not know. */
export function readAddress(hash: string): Address
{
    const [, first = "", ...rest] = hash.replace(/^#/, "").split("/");
    const section = [...sections, ...menuPages].find((candidate) => candidate === first) ?? "party";
    const name = first === "party" || first === "character" ? decoded(rest.join("/")) : "";
    return name === "" ? { section } : { section, name };
}

/** A section's address, as #/scene. */
export function sectionAddress(section: Section): string
{
    return `#/${section}`;
}

/** A section's name as the page writes it, in its language: Scene. */
export function sectionLabel(section: Section): string
{
    const labels: Record<Section, string> = {
        party: t("Party"),
        scene: t("Scene"),
        combat: t("Combat"),
        journal: t("Journal"),
        world: t("World"),
        help: t("Help"),
        saves: t("Saves"),
        settings: t("Settings"),
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
