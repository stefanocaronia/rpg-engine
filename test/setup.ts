// Run by vitest before each test file: the temporary folders its tests made go when the file's tests end, those that failed included.
import { afterAll } from "vitest";
import { removeMadeFolders } from "./support.ts";

afterAll(removeMadeFolders);
