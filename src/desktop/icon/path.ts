// The PATH the icon runs `rpg open` with on macOS and Linux: an application and a desktop entry start with the desktop's own, without the folders a shell
// adds, as Homebrew's or a Node manager's, where the hosts' programs are; so the icon carries the one of the terminal that made it, where there was one.
import type { IconCommand } from "./index.ts";

/** What goes before Node on the icon's command line: env with the PATH, or nothing where the terminal had none. */
export function withPath(command: IconCommand): string[]
{
    return command.path === "" ? [] : ["env", `PATH=${command.path}`];
}
