// The icon from the command line: the first `rpg` run in a terminal of a machine puts it on the desktop and in the menu, and says so; `rpg icon` puts it
// there whenever the player wants it, and `rpg icon --remove` takes it away for good.
import { iconCommand, type IconPlaces, iconSettled, iconToRemake, makeIcons, noteIconMade, noteIconSettled, removeIcons } from "../desktop/index.ts";

/** Where the command line runs: its output, which puts the icon there only when it is a terminal, and the environment. The tests give their own. */
export interface Terminal
{
    readonly output: { readonly isTTY?: boolean; };
    readonly env: NodeJS.ProcessEnv;
}

/** Where the icon is noted and what it runs in: the engine's data folder, the player's home, the system; and, in the tests, the folders it goes in. */
export interface IconWhere
{
    home: string;
    userHome: string;
    platform: string;
    places?: IconPlaces;
}

/**
 * Puts the icon on the desktop and in the menu the first time the command line runs in a terminal on a screen of this machine, without asking: the line
 * that says so, or why it could not, once. Then never again here, so one the player took away stays away; an icon made by another Node or script is made
 * again, without a word.
 */
export async function iconOnFirstRun(where: IconWhere, terminal: Terminal = processTerminal()): Promise<string | undefined>
{
    if (iconSettled(where.home)) {
        if (iconToRemake(where.home, iconCommand(where.userHome))) {
            await iconsMade(where);
        }

        return undefined;
    }

    if (!onScreen(where.platform, terminal)) {
        return undefined;
    }

    const made = await iconsMade(where);
    // A failure too, said once: not at every command, and rpg icon tries again.
    noteIconSettled(where.home);
    return made.failed ? made.said : wordsFor(where.platform).first;
}

/** Puts the icon on the desktop and in the menu, which settles it on this machine: what to tell the player, the files made or why there are none. */
export async function iconsMade(where: IconWhere): Promise<{ said: string; failed: boolean; }>
{
    const words = wordsFor(where.platform);

    try {
        const command = iconCommand(where.userHome);
        const made = await makeIcons(where.platform, command, where.places);
        noteIconMade(where.home, command, made);
        return { said: [words.made, ...made.map((file) => `  ${file}`)].join("\n"), failed: false };
    } catch (error) {
        return { said: words.failed(error instanceof Error ? error.message : String(error)), failed: true };
    }
}

/** Takes the icon off the desktop and the menu, as before RPG Engine is uninstalled: what to tell the player. */
export function iconsRemoved(where: IconWhere): string
{
    const words = wordsFor(where.platform);
    const removed = removeIcons(where.home);
    return removed.length === 0 ? words.noneRemoved : [words.removed, ...removed.map((file) => `  ${file}`)].join("\n");
}

function processTerminal(): Terminal
{
    return { output: process.stdout, env: process.env };
}

// A terminal the player sees, not a CI run: on Linux, one of a desktop, not one reached through SSH or WSL, where there is no desktop to put the icon on.
function onScreen(platform: string, terminal: Terminal): boolean
{
    const desktop = platform !== "linux" || Boolean(terminal.env.DISPLAY || terminal.env.WAYLAND_DISPLAY);
    return terminal.output.isTTY === true && !terminal.env.CI && desktop;
}

/** The words for the player, with the menu as their system names it. */
function wordsFor(platform: string): { first: string; made: string; failed: (reason: string) => string; removed: string; noneRemoved: string; }
{
    const where = platform === "win32" ? "your Start menu" : platform === "darwin" ? "Applications" : "your applications menu";
    return {
        first: `RPG Engine's icon is on your desktop and in ${where}: double-click it to see your campaigns. To take it away: rpg icon --remove.`,
        made: `Done: RPG Engine is on your desktop and in ${where}.`,
        failed: (reason) => `RPG Engine could not add its icon (${reason}). Try again with rpg icon.`,
        removed: `Done: RPG Engine's icon is gone from your desktop and ${where}. To remove RPG Engine: npm uninstall -g rpg-engine. Your campaigns stay where they are.`,
        noneRemoved: "RPG Engine found no icon of its own on this computer.",
    };
}
