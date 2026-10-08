import { unzipSync, zipSync } from "fflate";

/** A save of the campaign: its number, from 1, and what names it, as its file says it, such as "day 2, 06.10 - Scontro all'ossario". */
export interface Save
{
    number: number;
    label: string;
    file: string;
}

// "003 - day 2, 06.10 - Scontro all'ossario.zip": the number, then what names it.
const saveFilePattern = /^(\d{3,}) - (.+)\.zip$/;
// What a file name cannot hold on any system: a dot stands for it, as for the colon of a time; white space, a tab or a line break too, is one space.
const notInFileNames = /[\\/:*?"<>|\u0000-\u0008\u000e-\u001f]/g;
// The longest label a file name takes, in characters, never cutting one in two.
const longestLabel = 120;

/** A zip of files, given by their paths inside it with forward slashes, such as world/characters/Kira.md. */
export function packFiles(files: Record<string, Uint8Array>): Uint8Array
{
    return zipSync(files, { level: 6 });
}

/** The files a zip holds, by their paths inside it; folders are left out. */
export function unpackFiles(zip: Uint8Array): Record<string, Uint8Array>
{
    return Object.fromEntries(Object.entries(unzipSync(zip)).filter(([path]) => !path.endsWith("/")));
}

/** The file name of a save: its number, then the game date and the label it has, such as "003 - day 2, 06.10 - Scontro all'ossario.zip". */
export function saveFileName(number: number, parts: (string | undefined)[]): string
{
    const label = parts.filter((part): part is string => part !== undefined && part.trim() !== "").map((part) => part.replace(/\s+/g, " ").replace(notInFileNames, ".").trim());
    return `${String(number).padStart(3, "0")} - ${label.length === 0 ? "save" : [...label.join(" - ")].slice(0, longestLabel).join("").trim()}.zip`;
}

/** The saves among the names of the files of a folder, in the order of their numbers; other files are left out. */
export function readSaves(names: string[]): Save[]
{
    return names.flatMap((file) => {
        const match = saveFilePattern.exec(file);
        return match === null ? [] : [{ number: Number(match[1]), label: match[2], file }];
    }).sort((first, second) => first.number - second.number);
}
