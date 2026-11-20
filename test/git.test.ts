// The campaign kept in git (D-576): the engine's block of the .gitignore, then commits and pushes with the git of this computer, on a repository of its own.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCommandLine } from "../src/cli/command-line.ts";
import { gitQuestions, setupQuestions, shownPlayerSettings } from "../src/commands/config/dashboard.ts";
import { commitCampaign, gitProblem, gitUnderWay } from "../src/commands/shared/campaign/git.ts";
import type { Context } from "../src/core/context.ts";
import { isRepository, withIgnoreBlock } from "../src/git/index.ts";
import { makeTempFolder, removeMadeFolders, testContext } from "./support.ts";

afterEach(removeMadeFolders);

describe("the engine's block of a .gitignore", () => {
    it("is the whole file where there was none", () => {
        expect(withIgnoreBlock(undefined, ["/.saves/"])).toBe("# rpg-engine: begin (written by rpg-engine; your own lines go outside this block)\n/.saves/\n# rpg-engine: end\n");
    });

    it("goes after the player's own lines, which stay", () => {
        expect(withIgnoreBlock("notes.txt\n", ["/.saves/"]).split("\n").slice(0, 3)).toEqual(["notes.txt", "", "# rpg-engine: begin (written by rpg-engine; your own lines go outside this block)"]);
    });

    it("is written again in its place, the lines around it kept, with the file's own line ends", () => {
        const first = withIgnoreBlock("a\r\nb\r\n", ["/.saves/", "/sessions/"]).concat("c\r\n");
        const again = withIgnoreBlock(first, ["/.saves/"]);
        expect(again).toBe("a\r\nb\r\n\r\n# rpg-engine: begin (written by rpg-engine; your own lines go outside this block)\r\n/.saves/\r\n# rpg-engine: end\r\nc\r\n");
        expect(withIgnoreBlock(again, ["/.saves/"])).toBe(again);
    });
});

describe("whether a folder is in a repository", () => {
    it("looks for a .git in it and the folders above it", () => {
        const folder = makeTempFolder();
        mkdirSync(join(folder, "campaign", "world"), { recursive: true });
        expect(isRepository(join(folder, "campaign"))).toBe(false);
        mkdirSync(join(folder, ".git"));
        expect(isRepository(join(folder, "campaign", "world"))).toBe(true);
    });
});

const hasGit = (() => {
    try {
        execFileSync("git", ["--version"], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
})();

describe.runIf(hasGit)("the campaign's commits and pushes", () => {
    /** A campaign in a repository of its own, with a remote it pushes to, and its context. */
    async function repository(): Promise<{ root: string; remote: string; context: Context; }>
    {
        const folder = makeTempFolder();
        const root = join(folder, "campaign");
        const remote = join(folder, "remote.git");
        mkdirSync(root);
        git(folder, "init", "--quiet", "--bare", remote);
        git(root, "init", "--quiet");
        git(root, "config", "user.name", "Test");
        git(root, "config", "user.email", "test@example.com");
        git(root, "config", "commit.gpgsign", "false");
        const context = { ...testContext(root), folder: root };
        await runCommandLine(["init", "--language", "it"], context);
        return { root, remote, context };
    }

    function git(folder: string, ...args: string[]): string
    {
        return execFileSync("git", args, { cwd: folder, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    }

    function commits(root: string): string[]
    {
        try {
            return git(root, "log", "--format=%s").trim().split("\n").filter((line) => line !== "");
        } catch {
            return [];
        }
    }

    it("commits nothing while git is off, as it is unset", async () => {
        const { root } = await repository();
        await commitCampaign(root, "rpg: test");
        expect(commits(root)).toEqual([]);
        expect(existsSync(join(root, ".gitignore"))).toBe(false);
    });

    it("commits the campaign, its saves and chats left out, with the engine's .gitignore", async () => {
        const { root, context } = await repository();
        await runCommandLine(["config", "git", "commit"], context);
        mkdirSync(join(root, "sessions"), { recursive: true });
        writeFileSync(join(root, "sessions", "chat.md"), "what the player wrote");
        mkdirSync(join(root, ".saves"), { recursive: true });
        writeFileSync(join(root, ".saves", "001 - start.zip"), "zip");
        // This computer's port of the page stays on it (D-577).
        writeFileSync(join(root, ".dashboard-port"), "4751\n");
        await commitCampaign(root, "rpg: test");
        expect(commits(root)).toEqual(["rpg: test"]);
        const kept = git(root, "ls-files").split("\n");
        expect(kept).toContain("campaign.yaml");
        expect(kept).toContain(".gitignore");
        expect(kept.some((path) => path.startsWith("sessions/") || path.startsWith(".saves/") || path === "AGENTS.md" || path === ".dashboard-port")).toBe(false);
        expect(readFileSync(join(root, ".gitignore"), "utf8")).toContain("/sessions/\n");
        // Nothing changed since: no empty commit.
        await commitCampaign(root, "rpg: again");
        expect(commits(root)).toEqual(["rpg: test"]);
    });

    it("puts the saves and the chats in when the player asks, and takes them out again when they change their mind", async () => {
        const { root, context } = await repository();
        await runCommandLine(["config", "git", "commit"], context);
        await runCommandLine(["config", "git-sessions", "in"], context);
        mkdirSync(join(root, "sessions"), { recursive: true });
        writeFileSync(join(root, "sessions", "chat.md"), "what the player wrote");
        await commitCampaign(root, "rpg: in");
        expect(git(root, "ls-files", "sessions")).toContain("sessions/chat.md");
        await runCommandLine(["config", "git-sessions", "out"], context);
        await commitCampaign(root, "rpg: out");
        expect(git(root, "ls-files", "sessions")).toBe("");
        expect(existsSync(join(root, "sessions", "chat.md"))).toBe(true);
    });

    it("pushes after the commit, and keeps for the dashboard a push that failed until one goes right", async () => {
        const { root, remote, context } = await repository();
        await runCommandLine(["config", "git", "push"], context);
        await commitCampaign(root, "rpg: no remote");
        expect(gitProblem(root)?.act).toBe("push");
        expect(shownPlayerSettings(root, context).find((setting) => setting.name === "git")?.note?.text).toBe(
            "The last push failed: the campaign is safe on this computer, only its copy online is behind. Ask the master to look at it. ({why})",
        );
        // The master reads it too, where the player sends them.
        expect((await runCommandLine(["config", "git"], context)).output).toContain("The last push failed: ");
        // A remote with no upstream yet: the push sets it.
        git(root, "remote", "add", "origin", remote);
        writeFileSync(join(root, "state.yaml"), "date: day 2, 08:00\n");
        await commitCampaign(root, "rpg: pushed");
        expect(gitProblem(root)).toBeUndefined();
        expect(git(remote, "log", "--format=%s").split("\n")[0]).toBe("rpg: pushed");
    });

    it("commits only the campaign's folder of a larger repository, what the player staged elsewhere left staged", async () => {
        const folder = makeTempFolder();
        const root = join(folder, "campaigns", "first");
        mkdirSync(root, { recursive: true });
        git(folder, "init", "--quiet");
        git(folder, "config", "user.name", "Test");
        git(folder, "config", "user.email", "test@example.com");
        git(folder, "config", "commit.gpgsign", "false");
        const context = { ...testContext(root), folder: root };
        await runCommandLine(["init", "--language", "it"], context);
        await runCommandLine(["config", "git", "commit"], context);
        writeFileSync(join(folder, "elsewhere.txt"), "the player's");
        git(folder, "add", "elsewhere.txt");
        await commitCampaign(root, "rpg: first");
        expect(git(folder, "show", "--name-only", "--format=", "HEAD")).not.toContain("elsewhere.txt");
        expect(git(folder, "diff", "--cached", "--name-only").trim()).toBe("elsewhere.txt");
        expect(readFileSync(join(root, ".gitignore"), "utf8")).toContain("/.saves/\n");
        // The chats taken out again with something staged elsewhere: out of the commit all the same.
        await runCommandLine(["config", "git-sessions", "in"], context);
        mkdirSync(join(root, "sessions"), { recursive: true });
        writeFileSync(join(root, "sessions", "chat.md"), "what the player wrote");
        await commitCampaign(root, "rpg: in");
        expect(git(folder, "ls-files", "campaigns/first/sessions")).toContain("chat.md");
        await runCommandLine(["config", "git-sessions", "out"], context);
        writeFileSync(join(root, "sessions", "chat.md"), "what the player wrote next");
        await commitCampaign(root, "rpg: out");
        expect(git(folder, "ls-tree", "-r", "--name-only", "HEAD")).not.toContain("sessions/chat.md");
        expect(git(folder, "ls-files", "campaigns/first/sessions")).toBe("");
        expect(git(folder, "diff", "--cached", "--name-only").trim()).toBe("elsewhere.txt");
    });

    it("takes out of the repository the engine's files the player had committed", async () => {
        const { root, context } = await repository();
        git(root, "add", "--all");
        git(root, "commit", "--quiet", "--message", "by hand");
        expect(git(root, "ls-files")).toContain("AGENTS.md");
        await runCommandLine(["config", "git", "commit"], context);
        await commitCampaign(root, "rpg: tidy");
        expect(git(root, "ls-files")).not.toContain("AGENTS.md");
        expect(existsSync(join(root, "AGENTS.md"))).toBe(true);
    });

    it("commits as a save is made, through the command", async () => {
        const { root, context } = await repository();
        await runCommandLine(["config", "git", "commit"], context);
        await runCommandLine(["config", "saves", "free"], context);
        const made = await runCommandLine(["save", "make", "--label", "before the duel"], context);
        expect(made.exitCode).toBe(0);
        // Still running as the command ends: what the command line waits for, a commit alone with no push to say.
        expect(gitUnderWay().map(({ root: running, pushes }) => ({ running, pushes }))).toEqual([{ running: root, pushes: false }]);
        // The commit runs once the command has ended: the next one in the queue waits for it.
        await commitCampaign(root, "rpg: after");
        expect(commits(root)[0]).toMatch(/^rpg: .*before the duel/);
    });

    it("says how to fix a push with no remote, and who commits when git does not know", async () => {
        const { root, context } = await repository();
        await runCommandLine(["config", "git", "push"], context);
        await commitCampaign(root, "rpg: first");
        expect(gitProblem(root)?.why).toContain("git remote add origin");
        // No identity of its own, and none guessed: the global one of this computer kept out.
        const global = process.env.GIT_CONFIG_GLOBAL;
        process.env.GIT_CONFIG_GLOBAL = join(root, "no-global-config");

        try {
            git(root, "config", "--unset", "user.name");
            git(root, "config", "--unset", "user.email");
            git(root, "config", "user.useConfigOnly", "true");
            writeFileSync(join(root, "notes.txt"), "more");
            await commitCampaign(root, "rpg: who");
        } finally {
            if (global === undefined) {
                delete process.env.GIT_CONFIG_GLOBAL;
            } else {
                process.env.GIT_CONFIG_GLOBAL = global;
            }
        }

        expect(gitProblem(root)).toEqual({ act: "commit", why: expect.stringContaining("git config user.name") as string });
    });
});

describe("the settings of git on the dashboard", () => {
    it("show only where the campaign's folder is a repository", async () => {
        const root = join(makeTempFolder(), "campaign");
        mkdirSync(root);
        const context = { ...testContext(root), folder: root };
        await runCommandLine(["init", "--language", "it"], context);
        const names = (): string[] => shownPlayerSettings(root, context).map((setting) => setting.name).filter((name) => name.startsWith("git"));
        expect(names()).toEqual([]);
        // The master, who may set it anyway, hears that nothing is committed yet.
        expect((await runCommandLine(["config", "git"], context)).output).toContain("This folder is not a git repository yet");
        mkdirSync(join(root, ".git"));
        expect(names()).toEqual(["git", "git-saves", "git-sessions"]);
        expect(shownPlayerSettings(root, context).find((setting) => setting.name === "git")?.value).toBe("off");
    });

    it("warn in the setup's question where the repository holds more than the campaign, as a push sends the player's other commits", async () => {
        const folder = makeTempFolder();
        const root = join(folder, "campaigns", "first");
        mkdirSync(root, { recursive: true });
        const context = { ...testContext(root), folder: root };
        await runCommandLine(["init", "--language", "it"], context);
        const question = (): string | undefined => setupQuestions(root, context, false).find((setting) => setting.name === "git")?.question;
        mkdirSync(join(root, ".git"));
        expect(question()).toBe(gitQuestions[0]);
        rmSync(join(root, ".git"), { recursive: true });
        mkdirSync(join(folder, ".git"));
        expect(question()).toBe(gitQuestions[1]);
    });
});
