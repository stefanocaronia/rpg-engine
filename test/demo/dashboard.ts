// Serves the dashboard of a demo campaign until it is stopped (D-272): `npm run build`, then `node --experimental-strip-types test/demo/dashboard.ts`, open the link
// it prints, and change the campaign with rpg from its folder, such as rpg change Ettore --recipe "night's rest", to see the page follow. The demo plays free,
// the engine's own system; with --system 5e, the 5e of its repository beside this one, for its cards. With --ask, the demo asks the page a check, a choice,
// the dice of a rest or an attempt on a lock again and again, a few seconds after each answer, as the master does with ask (D-279), and rolls Lupa's bite,
// which the player sees. With --chat, the page has the chat with a master of the demo's own, which answers each sentence with a prose of its own and shows the
// other states by a word in the sentence (test/demo/master.ts); with --resumed, --taken-up or --taken-up-empty in its place, a chat the campaign takes up. With --setup, the campaign is one just made, still in its setup, made anew at each start. With --launcher, the launcher's page is served too, by a launcher of the demo's own with a few campaigns in its list, or none with --empty (test/demo/launcher.ts): open its link, which is printed first. With --port, on that port alone, as `npm run demo` does on 5760 for the app's browser pane, apart from the dashboards of the chats;
// the PORT the app gives, when another chat's pane holds 5760, comes first. Not part of the tests.
import { serveDemo } from "./demo.ts";

const portAt = process.argv.indexOf("--port");
const port = process.env.PORT ?? (portAt === -1 ? undefined : process.argv[portAt + 1]);
const systemAt = process.argv.indexOf("--system");
const system = systemAt !== -1 && process.argv[systemAt + 1] === "5e" ? "5e" : "free";
const dashboard = await serveDemo(port === undefined ? undefined : [Number(port)], system, {
    chat: process.argv.includes("--resumed") ? "resumed" : process.argv.includes("--taken-up") ? "taken-up" : process.argv.includes("--taken-up-empty") ? "taken-up-empty" : process.argv.includes("--chat"),
    setup: process.argv.includes("--setup"),
    launcher: process.argv.includes("--launcher") ? (process.argv.includes("--empty") ? "empty" : true) : false,
});

if (dashboard.launcher !== undefined) {
    console.log(`The launcher: ${dashboard.launcher}`);
}

console.log(`${dashboard.url}\nChange the campaign from ${dashboard.folder}, as with: rpg effect add Ettore Stanco --for 1h`);
// The server never keeps a process alive by itself: this one waits until it is stopped.
setInterval(() => undefined, 60_000);

if (process.argv.includes("--ask")) {
    const questions = dashboard.questions;

    for (let turn = 0;; turn++) {
        const said = await dashboard.ask(questions[turn % questions.length]);
        console.log(said);
        // With no page open the question goes back: it comes again when a page is there.
        const absent = said.startsWith("The player has no buttons open");
        turn -= absent ? 1 : 0;

        // A roll of the master's that the player sees: in the list, with the robot and for whom.
        if (!absent) {
            console.log(await dashboard.roll(dashboard.system === "5e" ? "1d20+4" : "1d6", "--who", "Lupa", "--check", "Morso", "--why", "il morso di Lupa"));
        }

        await new Promise((done) => setTimeout(done, absent ? 1500 : 5000));
    }
}
