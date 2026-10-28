// The extensions installed beside the engine (D-427, D-428): which they are and what each declares. Depends on nothing else in rpg-engine.
export { dropConsent, hasConsent, packageFingerprint, recordConsent } from "../core/consents.ts";
export { type CodePackage, type Extension, findExtension, installedExtensions, readExtension, shortName, type SystemAdditions } from "./extension.ts";
export { type ExtensionWords, extensionWords, wordIn } from "./words.ts";
