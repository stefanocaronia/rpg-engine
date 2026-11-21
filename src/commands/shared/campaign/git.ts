// The campaign in its git repository (D-576): a commit at the start of a session, at each save and at each end of a scene, then a push, as the settings say.
import { join, resolve } from "node:path";
import { hostFileNames, inboxFolderName, portFileName, readSettings, sessionsFolderName } from "../../../campaign/index.ts";
import type { Context } from "../../../core/context.ts";
import { files } from "../../../core/store.ts";
import { commitFolder, isRepository, push, repositoryRoot, withIgnoreBlock } from "../../../git/index.ts";
import { importsFolderName } from "../../../importer/index.ts";
import { installMarkName } from "../books/adventures.ts";
import { copyChats } from "./chats.ts";
import { exportsFolderName, savesFolderName } from "./saves.ts";

/** What went wrong the last time git ran for a campaign, which the dashboard tells the player until a commit and a push go right (D-576). */
export interface GitProblem
{
    act: "commit" | "push";
    why: string;
}

/** Whether the campaign's folder is in a git repository: only then the settings of git count, and the dashboard shows them. */
export function isCampaignRepository(root: string): boolean
{
    return isRepository(root);
}

/** Whether the campaign's repository holds more than the campaign, its .git in a folder above: a push sends the player's other commits too. */
export function isInLargerRepository(root: string): boolean
{
    const found = repositoryRoot(root);
    return found !== undefined && found !== resolve(root);
}

/**
 * Commits the campaign's changes with `message`, then pushes them, as its settings of git say (D-576); nothing where they are off or the folder is no
 * repository. It never throws: what fails is kept for the dashboard. The commits of a campaign run one after the other.
 */
export function commitCampaign(root: string, message: string): Promise<void>
{
    const next = (running.get(root) ?? Promise.resolve()).then(() => commitNow(root, message)).finally(() => {
        if (running.get(root) === next) {
            running.delete(root);
        }
    });
    running.set(root, next);
    return next;
}

/** The commits still running, by campaign, and whether each pushes: what the command line waits for before it ends, saying so (D-576). */
export function gitUnderWay(): { root: string; pushes: boolean; done: Promise<void>; }[]
{
    return [...running].map(([root, done]) => ({ root, pushes: pushesTo(root), done }));
}

/** The commit at the start of a session: what the last one left, with its chats copied first when they go into the repository. */
export function commitSessionStart(root: string, context: Context): Promise<void>
{
    try {
        if (readSettings(root)["git-sessions"] === "in") {
            copyChats(root, context);
        }
    } catch {
        // The commit goes on with the chats already copied.
    }

    return commitCampaign(root, `rpg: start of a session, ${context.now().toISOString().slice(0, 16).replace("T", " ")} UTC`);
}

/** What went wrong the last time git ran for the campaign; undefined when it went right, or has not run. */
export function gitProblem(root: string): GitProblem | undefined
{
    return problems.get(root);
}

// The commits under way, by campaign, and what went wrong with the last.
const running = new Map<string, Promise<void>>();
const problems = new Map<string, GitProblem>();

/** What the engine writes again whenever it likes, or the player keeps on this computer alone: never in the repository. */
function alwaysIgnored(): string[]
{
    // .gemini/ of the campaigns made before D-493, which it leaves on the disk.
    return [".agents/", ".claude/", ".codex/", ".gemini/", ".opencode/", ".mcp.json", ...hostFileNames, `${inboxFolderName}/`, `${exportsFolderName}/`, `${importsFolderName}/`, installMarkName, `${savesFolderName}/*.txt`, portFileName];
}

function pushesTo(root: string): boolean
{
    try {
        return readSettings(root).git === "push";
    } catch {
        return false;
    }
}

async function commitNow(root: string, message: string): Promise<void>
{
    let settings: ReturnType<typeof readSettings>;

    try {
        settings = readSettings(root);
    } catch {
        return;
    }

    if ((settings.git ?? "off") === "off" || !isRepository(root)) {
        return;
    }

    const chosen = [...(settings["git-saves"] === "in" ? [] : [`${savesFolderName}/`]), ...(settings["git-sessions"] === "in" ? [] : [`${sessionsFolderName}/`])];
    const left = [...alwaysIgnored(), ...chosen];
    let act: GitProblem["act"] = "commit";

    try {
        writeIgnore(root, left.map((path) => `/${path}`));
        // What the .gitignore leaves out goes out of the repository too, had the player committed it before.
        await commitFolder(root, message, left.map((path) => path.replace(/\/$/, "")));

        if (settings.git === "push") {
            act = "push";
            await push(root);
        }

        problems.delete(root);
    } catch (error) {
        problems.set(root, { act, why: error instanceof Error ? error.message : String(error) });
    }
}

/** Writes the engine's block of the campaign's .gitignore, when it changes. */
function writeIgnore(root: string, lines: string[]): void
{
    const file = join(root, ".gitignore");
    const text = files().text(file);
    const written = withIgnoreBlock(text, lines);

    if (written !== text) {
        files().write(file, written);
    }
}
