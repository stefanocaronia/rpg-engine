// Serves the dashboard of the demo campaign until it is stopped (D-272): `npm run build`, then `node --experimental-strip-types test/demo/dashboard.ts`, open the link
// it prints, and change the campaign with rpg from its folder, such as rpg change Ettore hp --by=-5, to see the page follow. Not part of the tests.
import { demoFolder, serveDemo } from "./demo.ts";

const dashboard = await serveDemo();
console.log(`${dashboard.url}\nChange the campaign from ${demoFolder}, as with: rpg change Ettore hp --by=-5`);
// The server never keeps a process alive by itself: this one waits until it is stopped.
setInterval(() => undefined, 60_000);
