// The extensions installed beside the engine (D-427, D-428): which they are and what each declares. Depends on nothing else in rpg-engine.
export { dropConsent, hasConsent, packageFingerprint, recordConsent } from "../core/consents.ts";
export { npmEngine } from "./engine.ts";
export { type CodePackage, type Extension, extensionFileName, findExtension, installedExtensions, readExtension, shortName, systemAdditionNames, type SystemAdditions } from "./extension.ts";
export { isLocalSpec, issuesPage, isVerified, npmPackages, packageKeyword, verifiedScope } from "./packages.ts";
export { isTarball } from "./tarball.ts";
export { type ExtensionWords, extensionWords, wordIn } from "./words.ts";
