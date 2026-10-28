// The tests of our packages' own repositories, beside this one, run against this engine (D-506, D-514): the 5e's, Ironsworn's and the extensions', each in
// ../rpg-engine-<name>, with the engine built here installed in it without saving, and the 5e's repository in those of another package, as the
// devDependency their tests play (D-513 (1)); one that is not there is skipped, and says so.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const engine = fileURLToPath(new URL("../../", import.meta.url));
const repositories = ["rpg-engine-5e", "rpg-engine-ironsworn", "rpg-engine-weather", "rpg-engine-lockpicking"].map((name) => ({ name, folder: resolve(engine, "..", name) }));
const present = repositories.filter((repository) => existsSync(join(repository.folder, "package.json")));

for (const repository of repositories.filter((one) => !present.includes(one))) {
    console.log(`${repository.name}: not beside the engine (${repository.folder}), skipped.`);
}

if (present.length === 0) {
    console.log("No repository of a package to test.");
    process.exit(0);
}

/** Runs npm in a folder, as the command line shows it; whether it succeeded. */
function npm(folder: string, args: string[]): boolean
{
    // On Windows npm is a .cmd, which only a shell runs.
    return spawnSync("npm", args, { cwd: folder, stdio: "inherit", shell: process.platform === "win32" }).status === 0;
}

if (!npm(engine, ["run", "build"])) {
    console.log("The engine did not build: nothing tested.");
    process.exit(1);
}

const failed = present.filter((repository) => {
    console.log(`\n${repository.name}: its tests, against the engine in ${engine}`);
    // The 5e beside, for a package whose tests play it: the engine brings free alone.
    const fifth = repository.name !== "rpg-engine-5e" && present.some((one) => one.name === "rpg-engine-5e") ? [resolve(engine, "..", "rpg-engine-5e")] : [];
    return !npm(repository.folder, ["install", "--no-save", "--install-links=false", engine, ...fifth]) || !npm(repository.folder, ["test"]);
});

console.log(failed.length === 0 ? "\nEvery package's tests passed." : `\nFailed: ${failed.map((repository) => repository.name).join(", ")}.`);
process.exit(failed.length === 0 ? 0 : 1);
