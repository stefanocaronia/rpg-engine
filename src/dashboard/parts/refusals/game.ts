// What the game refuses its own page (T-267): a setting, the saves, a note, the character's story, the questions at the start, the way in for the phone.
import { t } from "../../text.ts";
import { settingLabel } from "../labels.ts";
import type { Phrases } from "./phrases.ts";

export const gameRefusals: Phrases = {
    // The settings and the questions at the start; a setting by the name the page shows it with.
    "masters-setting": (values) => t("{setting} is the master's to change: ask them in the chat.", { setting: settingLabel(values.setting) }),
    "no-setting": (values) => t("The setting “{setting}” is no longer there: reload the page.", { setting: settingLabel(values.setting) }),
    "no-setup-question": () => t("The questions at the start no longer ask that: reload the page."),
    // The saves.
    "start-over-name": (values) => t("Write the campaign's name, {name}, to start it over. Nothing changed.", values),
    "go-back-question": () => t("The master is asking you something: answer it first, then go back."),
    "go-back-working": () => t("The master is working on the game now: go back once they have answered."),
    // The player's notes and their character's story.
    "note-not-whole": () => t("The note did not arrive whole: it may be too long, so shorten it."),
    "no-note": () => t("That note is no longer there: reload the page."),
    "story-not-whole": () => t("The story did not arrive whole: it may be too long, so shorten it."),
    "no-character": () => t("There is no player character yet: make one with the master first."),
    "story-whose": (values) => t("Your characters are now {names}: reload the page.", values),
    // The way in for the phone.
    "listen": (values) => t("Phone access could not open at {address} ({why}): check this computer's network, then try again.", values),
};
