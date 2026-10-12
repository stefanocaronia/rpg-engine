// `npm run betasim`: betasim on the dashboard beside the chat (1280×800), then on a phone (375×812), each with its report in test/betasim/report/. Arguments
// go to both runs, as --only answer or --headed. Not part of the tests.
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const here = import.meta.dirname;
const betasim = join(here, "..", "..", "node_modules", "betasim", "bin", "betasim.mjs");
let worst = 0;

for (const config of ["betasim.yaml", "betasim-phone.yaml"]) {
    const run = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", betasim, "--config", join(here, config), ...process.argv.slice(2)], { stdio: "inherit" });
    worst = Math.max(worst, run.status ?? 1);
}

process.exit(worst);
