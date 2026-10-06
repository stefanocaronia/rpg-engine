// The files of a folder and of the folders inside it, listed one folder at a time: listing a whole tree at once looks at every file again on Windows (D-194).
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** The full paths of `folder` and of the folders inside it, however deep; none when there is no such folder. */
export function foldersIn(folder: string): string[]
{
    const folders = existsSync(folder) && statSync(folder).isDirectory() ? [folder] : [];

    for (let index = 0; index < folders.length; index++) {
        for (const entry of readdirSync(folders[index], { withFileTypes: true }).filter((candidate) => candidate.isDirectory())) {
            folders.push(join(folders[index], entry.name));
        }
    }

    return folders;
}

/** The full paths of the files in `folder` and in the folders inside it whose names `keep` takes; none when there is no such folder. */
export function filesIn(folder: string, keep: (name: string) => boolean): string[]
{
    const files: string[] = [];
    const folders = existsSync(folder) && statSync(folder).isDirectory() ? [folder] : [];

    for (let index = 0; index < folders.length; index++) {
        for (const entry of readdirSync(folders[index], { withFileTypes: true })) {
            const path = join(folders[index], entry.name);

            if (entry.isDirectory()) {
                folders.push(path);
            } else if (entry.isFile() && keep(entry.name)) {
                files.push(path);
            }
        }
    }

    return files;
}
