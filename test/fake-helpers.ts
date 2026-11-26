// Codex and Claude Code as a test drives them: how each stands, its look held until the test answers it, and its sign-in and installation ended when the test says.
import type { HelperLogin, HelperName, Helpers, HelperState } from "../src/core/context.ts";

/** Fake programs and their controls: what was asked, the looks waiting, and the ends of the sign-ins and installations under way. */
export interface DrivenHelpers extends Helpers
{
    states: Partial<Record<HelperName, HelperState>>;
    asked: string[];
    /** Answers every look waiting, as the programs stand now. */
    answerLooks(): void;
    /** Ends the sign-in of a program under way, as the player finishes it or it fails. */
    endLogin(name: HelperName, login: HelperLogin): void;
    /** Ends the installation of a program under way: undefined once it is there, else why not. */
    endInstall(name: HelperName, why: string | undefined): void;
}

/** Programs that stand as `states` say, whose looks wait for the test unless `answerAtOnce`; their status asked the blocking way throws, as a server must never ask it. */
export function drivenHelpers(states: Partial<Record<HelperName, HelperState>> = {}, answerAtOnce = false): DrivenHelpers
{
    const asked: string[] = [];
    const looks: (() => void)[] = [];
    const logins = new Map<HelperName, (login: HelperLogin) => void>();
    const installs = new Map<HelperName, (why: string | undefined) => void>();

    return {
        states,
        asked,
        state: () => {
            throw new Error("the blocking status was asked");
        },
        look: (name) => {
            asked.push(`look ${name}`);
            return new Promise((done) => {
                const answer = (): void => done(states[name] ?? "missing");

                if (answerAtOnce) {
                    answer();
                } else {
                    looks.push(answer);
                }
            });
        },
        install: (name) => {
            asked.push(`install ${name}`);
            return new Promise((done) => installs.set(name, done));
        },
        login: (name, ended) => {
            asked.push(`login ${name}`);
            logins.set(name, (login) => ended?.(login));
            return Promise.resolve({ state: "waiting", link: `https://auth.example/${name}` });
        },
        cancel: (name) => void asked.push(`cancel ${name}`),
        answerLooks: () => looks.splice(0).forEach((answer) => answer()),
        endLogin: (name, login) => logins.get(name)?.(login),
        endInstall: (name, why) => installs.get(name)?.(why),
    };
}
