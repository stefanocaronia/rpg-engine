// What any server of the player's pages on this computer needs, and no campaign: the gate, the page's shell and files, and how a request is read and
// answered. The dashboard's server and the launcher's both stand on it.
export { builtPage, launcherHtml, pageFile, pageHtml, pagePolicy, picturePolicy, sendFile, vendorModule } from "./files.ts";
export { fromOwnPage, pageWrites, refusedAt } from "./gate.ts";
export { answers, decoded, readBody, readBytes, securityHeaders, send, sendJson, sendTagged } from "./http.ts";
