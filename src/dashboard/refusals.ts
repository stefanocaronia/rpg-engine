// What the engine turned down, in the page's language (T-162): the server gives a refusal's code and values beside the engine's own words, which the master
// reads; the page says each code it knows in its words, and the engine's for one it does not know. npm's reasons stay npm's.
import { t } from "./text.ts";

/** What the server answered of a refusal: the engine's words, and a code with its values when it has one. */
export interface Refused
{
    error?: string | undefined;
    code?: string | undefined;
    values?: Record<string, string> | undefined;
}

/** A refusal in the page's words by its code and values; the engine's words for a code the page does not know, or `otherwise` without any. */
export function refusalText(refused: Refused, otherwise: string): string
{
    const values = refused.values ?? {};
    const say = refused.code === undefined || !Object.hasOwn(phrases, refused.code) ? undefined : phrases[refused.code](values);
    return say ?? refused.error ?? otherwise;
}

type Values = Record<string, string>;

const phrases: Record<string, (values: Values) => string> = {
    "not-on-computer": (values) => t("There is no {name} on this computer: give its full path.", values),
    "not-found": (values) => t("npm has no package {name}: check its name.", values),
    "npm-failed": (values) => t("npm did not answer about {name}: {why}", values),
    "not-ours": (values) => t("{name} is not a package for RPG Engine.", values),
    "other-kind": (values) => t("{name} is a kind of package that is not added this way.", values),
    "engine-too-old": (values) => t("{name} {version} needs a newer RPG Engine: update it in Installed.", values),
    "package-too-old": (values) => t("{name} {version} was made for an older RPG Engine: look for a newer version of it.", values),
    "install-failed": (values) => t("npm could not install {name}: {why}", values),
    "taken-off": (values) => t("RPG Engine cannot use {name}, and took it off this computer again.", values),
    "other-system": (values) => values.plays === "" ? t("{name} is for {system}, and this campaign has no game system yet.", values) : t("{name} is for {system}, and this campaign plays {plays}: it does not use it.", values),
    "system-name": (values) => t("{name} has the name of the game system this campaign plays: it does not use it.", values),
    "same-name": (values) => t("This campaign uses {other}, with the same name as {name}: take it out first.", values),
    "code-broken": (values) => t("The code of {name} does not work: {why}", values),
    "system-taken": (values) => t("There is already a game system called {system} on this computer: {name} would take its name.", values),
    "system-unread": (values) => t("{name} was installed, but it does not read as a game system: uninstall it.", values),
    "language-code": (values) => t("{name} says it is a language, but brings code: a language is texts only.", values),
    "language-refused": (values) => t("{name} cannot be used, and was taken off this computer: {why}", values),
    "language-kept": (values) => t("{name} cannot be used, and version {version} stays: {why}", values),
    "not-used": (values) => t("This campaign does not use {name}.", values),
    "system-played": (values) => t("This campaign plays {name}: it stays on this computer.", values),
    "uninstall-failed": (values) => t("npm could not take {name} off this computer: {why}", values),
    "not-here": (values) => t("{name} is not on this computer.", values),
    "document": (values) => t("{name} is a document, not a package: ask the master to import it.", values),
    "adventure-played": (values) => t("This campaign has {name} {version}, already in play: an adventure in play is not updated.", values),
    "adventure-halfway": (values) => t("Adding {name} stopped halfway: add it again first.", values),
    "adventure-names": (values) => t("{name} has pages with names this campaign already uses: {names}", values),
    "adventure-in-story": (values) => t("{name} is part of the story now: it stays.", values),
    "adventure-needs": (values) => t("{name} needs the extension {needs}: add it first.", values),
    "adventure-needs-newer": (values) => t("{name} needs {needs} {version} or later, and this campaign has {has}: update it first.", values),
    "export-played": () => t("The campaign has been played and has no save of its start: keep it as a save of the whole game instead."),
    "archive-big": (values) => t("{name} unpacks to more than {size} MB, more than a package may.", values),
    "archive-unread": (values) => t("{name} does not read: it is not a package's .zip or .tgz.", values),
    "archive-link": (values) => t("{name} holds {entry}, which is not a plain file: it is refused whole.", values),
    "archive-accents": (values) => t("{name} names files with accents in another encoding: make the zip again with 7-Zip.", values),
    "not-adventure": (values) => t("{name} is not an adventure: it has no adventure.yaml at its top. A document is imported by the master.", values),
    "adventure-file": (values) => t("{name} holds {file}, which an adventure may not hold: it is refused whole.", values),
    "not-a-name": (values) => t("{name} is not the name of an npm package.", values),
    "folder-characters": (values) => t("The folder {name} has characters npm cannot take: move it to another path.", values),
    "not-a-book": (values) => t("{name} is no book RPG Engine reads: give a {kinds} file, or a folder of them.", values),
    "books-in-campaign": (values) => t("{name} is inside a campaign: your books stay outside every campaign.", values),
    "books-crowded": (values) => t("{name} holds more than {count} documents: give the folder with this game's books.", values),
    "not-full-path": (values) => t("{name} is no full path: write it from its drive or its root.", values),
    "engine-offline": () => t("npm cannot be reached: update RPG Engine once this computer is online."),
    "engine-latest": (values) => t("RPG Engine {version} is the latest: there is nothing to update.", values),
    "engine-installed": (values) => t("RPG Engine {version} is installed already: it comes with a new chat.", values),
    "engine-link": (values) => t("This RPG Engine is a development link to {name}: update it there.", values),
    "engine-elsewhere": (values) => t("This RPG Engine runs from {name}: update it the way it was installed.", values),
    "engine-failed": (values) => t("npm could not update RPG Engine: {why}", values),
    "file-big": (values) => t("The file is more than {size} MB: no package is that big.", values),
    "file-kind": (values) => t("{name} is neither a .zip nor a .tgz.", values),
};
