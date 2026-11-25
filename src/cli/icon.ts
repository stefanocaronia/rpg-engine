// The icon from the command line: `rpg open` in a terminal asks once a machine whether to put it on the desktop and in the menu; `rpg icon` puts it there
// whenever the player wants it, and `rpg icon --remove` takes it away.
import { createInterface } from "node:readline/promises";
import { iconAsked, iconCommand, type IconPlaces, iconToRemake, makeIcons, noteIconAsked, noteIconMade, removeIcons } from "../desktop/index.ts";

/** Where the question is asked: an input and an output, which ask only when both are a terminal, and the environment. The tests give their own. */
export interface Terminal
{
    readonly input: NodeJS.ReadableStream & { readonly isTTY?: boolean; };
    readonly output: NodeJS.WritableStream & { readonly isTTY?: boolean; };
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
 * Asks once a machine, in a terminal on a screen, whether to put the icon on the desktop and in the menu, and puts it there on a yes: what to tell the
 * player, if anything. Once asked, an icon made by another Node or script is made again, without a word.
 */
export async function offerIcon(where: IconWhere, terminal: Terminal = processTerminal()): Promise<string | undefined>
{
    if (iconAsked(where.home)) {
        if (iconToRemake(where.home, iconCommand(where.userHome))) {
            await iconsMade(where);
        }

        return undefined;
    }

    if (!onScreen(where.platform, terminal)) {
        return undefined;
    }

    const words = wordsFor(where.platform);
    const reader = createInterface({ input: terminal.input, output: terminal.output });
    const answer = await reader.question(words.question).finally(() => reader.close());
    noteIconAsked(where.home);
    return yes(answer) ? (await iconsMade(where)).said : words.later;
}

/** Puts the icon on the desktop and in the menu, and asks no more on this machine: what to tell the player, the files made or why there are none. */
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
    return { input: process.stdin, output: process.stdout, env: process.env };
}

// A terminal the player sees: on Linux, one of a desktop, not one reached through SSH or WSL, where there is no desktop to put the icon on.
function onScreen(platform: string, terminal: Terminal): boolean
{
    const desktop = platform !== "linux" || Boolean(terminal.env.DISPLAY || terminal.env.WAYLAND_DISPLAY);
    return terminal.input.isTTY === true && terminal.output.isTTY === true && desktop;
}

// Yes unless it says no: Enter, "ok" and "sure" are yes, since the question is not asked again.
function yes(answer: string): boolean
{
    return !answer.trim().toLowerCase().startsWith("n");
}

/** The words for the player, with the menu as their system names it. */
function wordsFor(platform: string): { question: string; made: string; later: string; failed: (reason: string) => string; removed: string; noneRemoved: string; }
{
    const where = platform === "win32" ? "your Start menu" : platform === "darwin" ? "Applications" : "your applications menu";
    return {
        question: `Add an RPG Engine icon to your desktop and ${where}? Double-click it to see your campaigns. [Y/n] `,
        made: `Done: RPG Engine is on your desktop and in ${where}.`,
        later: "All right, no icon. To add it later, type rpg icon.",
        failed: (reason) => `RPG Engine could not add its icon (${reason}). Try again with rpg icon.`,
        removed: `Done: RPG Engine's icon is gone from your desktop and ${where}. To remove RPG Engine: npm uninstall -g rpg-engine. Your campaigns stay where they are.`,
        noneRemoved: "RPG Engine found no icon of its own on this computer.",
    };
}
