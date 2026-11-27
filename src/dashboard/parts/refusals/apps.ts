// The AI apps (T-267, T-325): what the table or the launcher refuses when the page asks to sign in to one or to install it, and why the last sign-in or
// install of one failed. The whys stand after «The sign-in did not finish:» and «It did not install:», so they start small and hold no colon; what the
// app or npm said itself is quoted as it came.
import { t } from "../../text.ts";
import type { Phrases } from "./phrases.ts";

export const appRefusals: Phrases = {
    "signin-in-app-account": (values) => t("{host} signs in from its own app, not from here: open {host}, sign in there with your {account} account, then check again.", values),
    "signin-not-needed": (values) => t("{host} plays without signing in. To use a provider's account, sign in from {host} itself, then check again.", values),
    "signin-in-app": (values) => t("{host} signs in from its own app, not from here: sign in there, then check again.", values),
    "signin-not-installed": (values) => t("{host} is not on this computer: install it first, then sign in.", values),
    "signin-none-to-cancel": (values) => t("{host} signs in from its own app: there is no sign-in to cancel here.", values),
    "install-from-page": (values) => t("RPG Engine does not install {host}: install it from {page}, then check again.", values),
    "app-here": (values) => t("{host} is already on this computer: you can choose it.", values),
    "no-access-table": () => t("From this page you cannot sign in to the AI apps or install them now: close the campaign and open it again from RPG Engine, then try again."),
    "no-access-page": () => t("From this page you cannot sign in to the AI apps or install them: open the campaign from RPG Engine, then try again."),
    "no-access-launcher": () => t("RPG Engine cannot sign in to the AI apps or install them now: close it and open it again, then try again."),
};

/** Why an app's last sign-in did not finish; `host`, the app's name, is the page's. One under way in another window is no failure: the app's row says it. */
export const signInReasons: Phrases = {
    "signin-ending": () => t("the one you just stopped is still closing, try again in a few seconds."),
    "app-missing": (values) => t("{name} is not on this computer.", { name: values.host }),
    "signin-timeout": () => t("ten minutes went by without you finishing it."),
    "signin-stopped": () => t("it stopped before the end."),
    "signin-said": (values) => t("{host} answered “{why}”.", values),
    "signin-failed": (values) => values.why,
};

/** Why an app's last install failed. One under way in another window is no failure: the app's row says it. */
export const installReasons: Phrases = {
    "app-install-stopped": (values) => t("npm stopped without installing {package}.", values),
    "app-install-said": (values) => t("npm answered “{why}”.", values),
    "app-install-failed": (values) => values.why,
};
