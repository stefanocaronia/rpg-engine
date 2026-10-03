/** The types of page the core knows, each with its folder in the world. Systems will add their own. */
export const pageTypes = {
    character: "characters",
    place: "places",
    faction: "factions",
    quest: "quests",
    item: "items",
    event: "events",
    topic: "topics",
    creature: "creatures",
} as const;

export type PageType = keyof typeof pageTypes;

export const pageTypeNames = Object.keys(pageTypes) as [PageType, ...PageType[]];

/** The campaign folder that holds the world's pages. */
export const worldFolderName = "world";

/** The type whose pages live in `folder`, if any. */
export function typeOfFolder(folder: string): PageType | undefined
{
    return pageTypeNames.find((type) => pageTypes[type] === folder);
}
