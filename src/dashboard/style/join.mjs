// Joins the dashboard's style sheet into one file (D-524 (3)): index.css with each of its imports in its place, in its order, as the page and the shadow roots
// of packages' drawings read it, since a constructed sheet takes no @import. The build runs it: node src/dashboard/style/join.mjs dist/dashboard/style.css
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const folder = import.meta.dirname;
const index = readFileSync(join(folder, "index.css"), "utf8");
writeFileSync(process.argv[2], index.replace(/^@import "([^"]+)";$/gm, (_line, file) => readFileSync(join(folder, file), "utf8").trimEnd()));
