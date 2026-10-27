// The test kit of a package's repository (D-506, D-514): a campaign on a game system whose folder it is given, beside the engine's, as the 5e's repository,
// the lockpicking's and the weather's run theirs; its code loaded from there, its versions of the rules read, its own widgets, the core's ask, the tools' descriptions, and the
// checks of a system's folder.
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { systemChecks, type TestCampaign, testCampaign } from "../src/testing.ts";
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

    it("plays a system the package's repository installs, as a devDependency in its node_modules, after the folders given (D-513 (1))", async () => {
        const repository = makeTempFolder();
        const installed = join(repository, "node_modules", "@rpgengine", "system-fake");
        cpSync(fake, installed, { recursive: true });
        const settings = join(installed, "system.yaml");
        writeFileSync(settings, readFileSync(settings, "utf8").replace(/^title: .*$/m, "title: the fake as the repository installs it"));
        const here = process.cwd();
        process.chdir(repository);

        try {
            campaign = await testCampaign({ system: "fake" });
            expect(await campaign.ok("config", "system")).toMatch(/^system: fake, the fake as the repository installs it/);
            await campaign.close();
            campaign = await testCampaign({ system: "fake", systems: [fake] });
            expect(await campaign.ok("config", "system")).toMatch(/^system: fake, the fake system of the core's tests/);
        } finally {
            process.chdir(here);
        }
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

describe("testCampaign for a game system's own tests", () => {
    it("gives the widgets of one package, its game system's too, beside the extensions' alone", async () => {
        campaign = await testCampaign({ system: "fake", systems: [fake] });
        expect(await campaign.widgets()).toEqual([]);
        expect((await campaign.widgets("fake")).map((widget) => widget.id)).toEqual(["fake.rally", "fake.down"]);
    });

    it("asks the player with the core's ask, which the command line asks in words, answered by the page the test gives", async () => {
        campaign = await testCampaign({ system: "fake", systems: [fake] });
        expect(await campaign.ask({ question: "Which way?", options: ["Left", "Right"] })).toMatchObject({ exitCode: 1, output: expect.stringContaining("cannot be asked with buttons here") });
        const shown: string[][] = [];
        campaign.context = { ...campaign.context, page: { choose: async (_question, _title, labels) => (shown.push(labels), 1) } };
        expect(await campaign.ask({ question: "Which way?", options: ["Left", "Right"] })).toEqual({ exitCode: 0, output: "The player chose: Right." });
        expect(shown).toEqual([["Left", "Right"]]);
    });

    it("gives the core's tools as a host reads them in the campaign, with the examples of its system (D-518)", async () => {
        campaign = await testCampaign({ system: "fake", systems: [fake] });
        const tools = campaign.descriptions();
        expect(tools.change).toContain('field grit, by -3, why "bitten by the wolf"; or recipe "night\'s sleep".');
        expect(tools.roll).toContain("Example: notation 2d6+notice, why");
        expect(Object.values(tools).join("\n")).not.toMatch(/\{\{\w+\}\}/);
    });

    it("checks a system's own folder as every installed system is checked, by its package's name (SYS-2, SYS-8, D-267)", () => {
        const checks = systemChecks(fake);
        expect(checks).toMatchObject({ name: "fake", unread: [], names: [], declarations: [], values: [], undeclared: [], pictures: [], theme: [] });
        expect(checks.pages).toBeGreaterThan(20);
    });
});
