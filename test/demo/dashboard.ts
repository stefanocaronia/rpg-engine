// Serves the dashboard of the demo campaign until it is stopped (D-272): `npm run build`, then `node --experimental-strip-types test/demo/dashboard.ts`, open the link
// it prints, and change the campaign with rpg from its folder, such as rpg change Ettore hp --by=-5, to see the page follow. With --ask, the demo asks the page
// a check or a choice again and again, a few seconds after each answer, as the master does with ask (D-279), and rolls Lupa's bite, which the player sees.
// With --port, on that port alone, as `npm run demo` does on 4760 for the app's browser pane, apart from the dashboards of the chats. Not part of the tests.
import { demoFolder, demoQuestions, serveDemo } from "./demo.ts";

const portAt = process.argv.indexOf("--port");
const dashboard = await serveDemo(portAt === -1 ? undefined : [Number(process.argv[portAt + 1])]);
console.log(`${dashboard.url}\nChange the campaign from ${demoFolder}, as with: rpg change Ettore hp --by=-5`);
// The server never keeps a process alive by itself: this one waits until it is stopped.
setInterval(() => undefined, 60_000);

if (process.argv.includes("--ask")) {
    for (let turn = 0;; turn++) {
        const { question, options } = demoQuestions[turn % demoQuestions.length];
        const said = await dashboard.ask(question, options);
        console.log(said);
        // With no page open the question goes back: it comes again when a page is there.
        const absent = said.startsWith("The player has no buttons open");
        turn -= absent ? 1 : 0;

        // A roll of the master's that the player sees: in the list, with the robot and for whom.
        if (!absent) {
            console.log(await dashboard.roll("1d20+4", "--who", "Lupa", "--why", "il morso di Lupa"));
        }

        await new Promise((done) => setTimeout(done, absent ? 1500 : 5000));
    }
}
