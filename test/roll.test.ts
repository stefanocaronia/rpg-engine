import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Context } from "../src/context.js";
import { main } from "../src/main.js";

let dir: string;
let ctx: Context;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "rpg-test-"));
  let ids = 0;
  ctx = {
    cwd: dir,
    random: () => 4,
    now: () => new Date("2026-10-02T10:00:00Z"),
    newId: () => `id${++ids}`,
    newSalt: () => "salt",
  };
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

function events() {
  return readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
}

describe("rpg roll", () => {
  it("rolls digital dice and logs the roll", async () => {
    const result = await main(["roll", "2d6+1", "--why", "damage", "--who", "Galdrak"], ctx);
    expect(result).toEqual({ exitCode: 0, output: "id1 Galdrak, damage: 2d6+1 = 9 [4, 4] + 1" });
    expect(events()).toEqual([
      {
        id: "id1",
        at: "2026-10-02T10:00:00.000Z",
        type: "roll",
        visibility: "public",
        data: { notation: "2d6+1", total: 9, result: "2d6+1 = 9 [4, 4] + 1", why: "damage", who: "Galdrak", physical: false },
      },
    ]);
  });

  it("uses the faces of physical dice and refuses impossible ones", async () => {
    const good = await main(["roll", "1d20+5", "--values", "14"], ctx);
    expect(good.output).toBe("id1 1d20+5 = 19 [14] + 5 (physical dice)");

    const impossible = await main(["roll", "1d6", "--values", "9"], ctx);
    expect(impossible.exitCode).toBe(1);
    expect(impossible.output).toContain("Impossible value 9 on a d6");

    const missing = await main(["roll", "2d20kh1", "--values", "14"], ctx);
    expect(missing.output).toContain("needs at least 2 values");

    // PowerShell passes 14,7 as "14 7"
    const spaced = await main(["roll", "2d20kh1", "--values", "14 7"], ctx);
    expect(spaced.output).toBe("id2 2d20kh1 = 14 [14, (7)] (physical dice)");

    expect(events()).toHaveLength(2);
  });

  it("hides a roll behind a fingerprint and reveals it", async () => {
    const hidden = await main(["roll", "1d20", "--hidden", "--why", "ambush"], ctx);
    expect(hidden.output).toContain("only for the master: 1d20 = 4 [4]");
    const shown = /fingerprint: ([0-9a-f]{16})/.exec(hidden.output)![1];

    const revealed = await main(["roll", "--reveal", "id1"], ctx);
    const proof = /Proof: (.*)/.exec(revealed.output)![1];
    expect(proof).toBe("id1|1d20 = 4 [4]|salt");
    expect(createHash("sha256").update(proof).digest("hex").startsWith(shown)).toBe(true);

    await main(["roll", "--reveal", "id1"], ctx);
    expect(events().map((event) => [event.type, event.visibility])).toEqual([
      ["roll", "hidden"],
      ["reveal", "public"],
    ]);
  });

  it("refuses to hide physical dice or reveal unknown rolls", async () => {
    expect((await main(["roll", "1d20", "--hidden", "--values", "3"], ctx)).exitCode).toBe(1);
    expect((await main(["roll", "--reveal", "nope"], ctx)).output).toContain("no hidden roll with id nope");
  });

  it("prints JSON on request", async () => {
    const result = await main(["roll", "1d4", "--json"], ctx);
    expect(JSON.parse(result.output)).toMatchObject({ kind: "roll", id: "id1", total: 4 });
  });
});

describe("rpg", () => {
  it("lists the commands and explains each one", async () => {
    expect((await main([], ctx)).output).toContain("roll");
    expect((await main(["roll", "--help"], ctx)).output).toContain("--hidden");
  });

  it("rejects unknown commands and options", async () => {
    expect((await main(["fly"], ctx)).exitCode).toBe(1);
    expect((await main(["roll", "1d6", "--loud"], ctx)).exitCode).toBe(1);
  });
});
