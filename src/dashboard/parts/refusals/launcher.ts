// The campaigns of this computer (T-325): what the launcher refuses when a campaign is opened, made or added, when a folder is chosen, and when a
// campaign's page goes back to it; and why a listed campaign does not read. To who plays the launcher is RPG Engine, and a campaign's table is its game.
import { t } from "../../text.ts";
import type { Phrases, Values } from "./phrases.ts";

/** Why a listed campaign does not read: after «Cannot be read:», so it starts small and holds no colon. What read its file said stays as it came. */
export const campaignReasons: Phrases = {
    "campaign-file-is-folder": () => t("its campaign.yaml is a folder, not a file."),
    "campaign-not-allowed": () => t("this computer does not let RPG Engine read it."),
    "campaign-path-long": () => t("its path is too long for this computer."),
    "campaign-path-invalid": () => t("its path holds a character no folder may have."),
    "campaign-away": () => t("its disk or its network share does not answer."),
    "campaign-unread": (values) => values.why,
};

export const launcherRefusals: Phrases = {
    // Opening a campaign.
    "campaign-gone": (values) => t("{root} no longer holds a campaign: its campaign.yaml file is gone. Take it off the list, or open the folder where it is now.", values),
    "launcher-closing": () => t("RPG Engine is closing: open it again, then open this campaign."),
    "table-other-engine": (values) => t("This campaign is still open with RPG Engine {version}, and this is {ours}: close its page and its chats, wait a few minutes (or end its process, {pid}), then open it again.", values),
    "table-silent": (values) => t("This campaign's game is running but does not answer: end its process, {pid}, or restart the computer, then open the campaign again.", values),
    "table-ending": () => t("This campaign is still closing: open it again in a moment."),
    "table-not-started": (values) => t("This campaign did not start within {seconds} seconds: try again.", values),
    "page-kept-by-chat": () => t("A chat of this campaign, opened before RPG Engine was updated, still holds its page: close that chat's app (Claude Code, Codex, a terminal), or restart the computer, then open the campaign again."),
    "no-port": () => t("This computer has no free port for this campaign's page: close the programs you do not need, or restart it, then open the campaign again."),
    "socket-taken": (values) => t("Another program holds the place where this campaign's game listens ({socket}): restart the computer, then open the campaign again.", values),
    "socket-failed": (values) => t("This campaign's game could not start listening at {socket} ({why}).", values),
    // A folder opened or added that does not read, with the same whys as a listed campaign's.
    "campaign-file-is-folder": unread("campaign-file-is-folder"),
    "campaign-not-allowed": unread("campaign-not-allowed"),
    "campaign-path-long": unread("campaign-path-long"),
    "campaign-path-invalid": unread("campaign-path-invalid"),
    "campaign-away": unread("campaign-away"),
    // Making a campaign.
    "host-first": () => t("Choose the AI app first, then its model and level of thinking."),
    "host-not-yet-new": (values) => t("A chat with the master cannot open in {host} yet: choose another app, or none, and open the chat from the campaign's page later.", values),
    "folder-not-empty": (values) => t("{folder} already holds files: choose an empty folder, or a new one.", values),
    "make-path-file": (values) => t("The campaign could not be created in {folder}: a part of that path is a file, not a folder. Choose another folder, such as one in your home.", values),
    "make-not-allowed": (values) => t("The campaign could not be created in {folder}: this computer does not let RPG Engine write there. Choose another folder, such as one in your home.", values),
    "make-disk-full": (values) => t("The campaign could not be created in {folder}: its disk is full. Choose another folder, such as one in your home.", values),
    "make-read-only": (values) => t("The campaign could not be created in {folder}: its disk cannot be written. Choose another folder, such as one in your home.", values),
    "make-path-long": (values) => t("The campaign could not be created in {folder}: its path is too long for this computer. Choose another folder, such as one in your home.", values),
    "make-disk-gone": (values) => t("The campaign could not be created in {folder}: its disk is not there. Choose another folder, such as one in your home.", values),
    "make-away": (values) => t("The campaign could not be created in {folder}: its disk or its network share does not answer. Choose another folder, such as one in your home.", values),
    "launcher-failed": () => t("RPG Engine could not do that: try again. If it happens again, close RPG Engine and open it again."),
    // What the player wrote.
    "path-too-long": (values) => t("The folder's path is too long: give one of at most {most} characters.", values),
    "campaign-name-length": (values) => t("Give the campaign a name of 1 to {most} characters.", values),
    "campaign-name-line": () => t("Give the campaign a name on one line, without tabs or other control characters."),
    "folder-ends-dot": (values) => t("In {folder}, the folder “{part}” ends with a dot, which Windows takes off a folder's name: choose a name without it.", values),
    "folder-ends-space": (values) => t("In {folder}, the folder “{part}” ends with a space, which Windows takes off a folder's name: choose a name without it.", values),
    "folder-device-name": (values) => t("In {folder}, “{part}” is a name Windows keeps for a device, never a folder's: choose another name.", values),
    // A folder added, and the window that chooses one.
    "not-a-campaign": (values) => t("{root} is no campaign: a campaign's folder holds its campaign.yaml file. Choose that folder, or create a new campaign.", values),
    "folder-window-open": () => t("The window to choose a folder is already open: choose the folder there, or close it first."),
    "folder-window-failed": (values) => values.why === undefined || values.why === "" ? t("The window to choose a folder did not open: try again.") : t("The window to choose a folder did not open. It said: {why}", values),
    "folder-window-missing": () => t("This computer has no window to choose a folder: install zenity or kdialog, then try again."),
    "folder-window-none": () => t("This computer cannot show a window to choose a folder."),
    // From a campaign's page back to the campaigns.
    "no-launcher-way": () => t("RPG Engine does not open from this page: open it from its icon, or type rpg open in a terminal."),
    "home-on-computer": () => t("The campaigns open on the computer: go back to them there."),
    "launcher-not-started": (values) => t("RPG Engine did not start within {seconds} seconds: try again. If it happens again, type rpg launcher in a terminal to see why.", values),
    "launcher-silent": (values) => t("RPG Engine is already running, at {url}, but does not answer: end its process, {pid}, or restart the computer, then try again.", values),
    "launcher-not-quit": (values) => t("RPG Engine {version} is still running, at {url}, and did not close: end its process, {pid}, or restart the computer, then try again.", values),
};

/** What says that a folder does not read, by the code of why. */
function unread(code: string): (values: Values) => string
{
    return (values) => t("{root} cannot be read: {why}", { root: values.root, why: campaignReasons[code](values) });
}
