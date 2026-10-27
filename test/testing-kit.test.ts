// The test kit of a package's repository (D-506, D-514): a campaign on a game system whose folder it is given, beside the engine's, as the 5e's repository,
// the lockpicking's and the weather's run theirs; its code loaded from there, its versions of the rules read.
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { type TestCampaign, testCampaign } from "../src/testing.ts";
import { makeTempFolder } from "./support.ts";

const fake = fileURLToPath(new URL("./systems/fake/", import.meta.url));
let campaign: TestCampaign | undefined;

afterEach(async () => {
    await campaign?.close();
    campaign = undefined;
});

describe("testCampaign with the folders of game systems", () => {
    it("plays a system from its folder, by its package's name, with its code and the version of its rules asked", async () => {
        campaign = await testCampaign({ system: "fake", systems: [fake], settings: { ruleset: "second" } });
        expect(await campaign.ok("config", "system")).toMatch(/^system: fake, the fake system of the core's tests, the second rules \(@rpgengine\/system-fake 1\.0\.0\)/);
        expect(campaign.context.systemCode?.fake).toMatchObject({ version: "1.0.0" });
        expect("code" in (campaign.context.systemCode?.fake ?? {})).toBe(true);
        expect(await campaign.ok("rules", "Night's Sleep")).toContain("Every stamina die comes back.");
        await campaign.close();
        campaign = undefined;
        // Taken away, the link goes and the system's own folder stays.
        expect(existsSync(join(fake, "system.yaml"))).toBe(true);
    });

    it("takes a system of data alone by its folder's name, and refuses a folder that is no system", async () => {
        const copy = join(makeTempFolder(), "marsh");
        cpSync(fake, copy, { recursive: true });
        rmSync(join(copy, "package.json"));
        campaign = await testCampaign({ system: "marsh", systems: [copy] });
        expect(await campaign.ok("config", "system")).toMatch(/^system: marsh, the fake system of the core's tests, the version of its rules still to ask\n/);
        await expect(testCampaign({ system: "fake", systems: [join(fake, "world")] })).rejects.toThrow(/world has no system\.yaml: give the folder of a game system\.$/);
    });
});
