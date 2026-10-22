import { z } from "zod";
import { requireCampaign } from "../campaign/index.ts";
import type { HelperName } from "../core/context.ts";
import { appendLogEntry } from "../core/log.ts";
import { defineCommand } from "../core/registry.ts";
import { newDatedLogEntry } from "./game-time.ts";

type InstallResult =
    | { kind: "ready"; program: HelperName; installed: boolean; }
    | { kind: "waiting"; program: HelperName; installed: boolean; link?: string; }
    | { kind: "failed"; program: HelperName; why: string; };

// What each program is called, and the account its sign-in asks for.
const programs: Record<HelperName, { name: string; account: string; gives: string; }> = {
    codex: { name: "Codex", account: "ChatGPT account", gives: "the dashboard is translated in the background from now on, and pictures are made where their plan allows (Plus and up)" },
    claude: { name: "Claude Code", account: "Claude account, Pro or Max", gives: "the dashboard is translated in the background from now on, and pictures are drawn" },
};

export const install = defineCommand({
    name: "install",
    description: "Install Codex or Claude Code on the player's computer, and open their sign-in. "
        + "Once the player says yes as status offers it. It may take half a minute; the sign-in opens in the player's browser. "
        + "Call it again once the player says they signed in.",
    group: "campaign",
    positionals: ["program"],
    slow: true,
    input: z.object({
        program: z.enum(["codex", "claude"]).describe("codex for a ChatGPT account, any plan; claude for Claude Pro or Max"),
    }),

    async run(input, context): Promise<InstallResult>
    {
        const root = requireCampaign(context.folder);
        const helpers = context.helpers;
        const program = input.program;

        if (helpers === undefined) {
            throw new Error(
                `Only the game's server installs programs, in a chat. In a terminal: npm install -g ${program === "codex" ? "@openai/codex, then codex login" : "@anthropic-ai/claude-code, then claude auth login"}.`,
            );
        }

        const before = helpers.state(program);

        // Ready, as once the player signed in: the page reads its words again when the campaign changes, and this line tells it they can be translated now.
        if (before === "ready") {
            appendLogEntry(root, newDatedLogEntry(root, context, "helper-ready", "hidden", { program }));
            return { kind: "ready", program, installed: false };
        }

        const missing = before === "missing";
        const why = missing ? await helpers.install(program) : undefined;

        if (why !== undefined) {
            return { kind: "failed", program, why: `it could not be installed: ${why}` };
        }

        if (missing) {
            appendLogEntry(root, newDatedLogEntry(root, context, "helper-installed", "hidden", { program }));
        }

        const login = await helpers.login(program);

        if (login.state === "failed") {
            return { kind: "failed", program, why: login.why };
        }

        if (login.state === "waiting") {
            return { kind: "waiting", program, installed: missing, ...(login.link === undefined ? {} : { link: login.link }) };
        }

        // Signed in: with the account the engine uses, or one it never uses, such as an API key.
        if (helpers.state(program) !== "ready") {
            return { kind: "failed", program, why: `the sign-in ended, but not with a ${programs[program].account}` };
        }

        appendLogEntry(root, newDatedLogEntry(root, context, "helper-ready", "hidden", { program }));
        return { kind: "ready", program, installed: missing };
    },

    format(result)
    {
        const { name, account, gives } = programs[result.program];

        if (result.kind === "ready") {
            return `${name} is ready on this computer with the player's ${account}: ${gives}. Tell the player in a few words, and that it runs on their own plan and its limits, `
                + "imports of their documents too; then go on.";
        }

        if (result.kind === "waiting") {
            return `${result.installed ? `${name} is installed. Its` : `${name}'s`} sign-in is open in the player's browser: tell them to sign in with their ${account} and to tell you when they are done, `
                + `then call install again; it waits ten minutes.${result.link === undefined ? "" : ` If no page opened, give them this link: ${result.link}`}`;
        }

        return `${name} is not ready: ${result.why}. Offer the player instead to translate the dashboard now, in the chat, with translate.`;
    },
});
