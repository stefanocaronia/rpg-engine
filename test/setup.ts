// Run by vitest before each test file: the temporary folders its tests made go when the file's tests end, those that failed included; and no test starts an
// AI host's real program, which would act on the player's own accounts.
import { afterAll, afterEach, expect } from "vitest";
import { refuseRealHosts, takeRefused } from "./no-real-hosts.ts";
import { removeMadeFolders } from "./support.ts";

refuseRealHosts();

afterEach(() => {
    expect(takeRefused(), "a test started an AI host's real program").toEqual([]);
});

afterAll(() => {
    removeMadeFolders();
    expect(takeRefused(), "an AI host's real program was started after a test ended").toEqual([]);
});
