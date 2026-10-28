// A file from the web, as an adventure's link gives it (ADV-1): https only, a redirect too, cut off past a size, and a stop half way said with what to do; and the
// player's data folder, never one relative to where the engine runs.
import { isAbsolute } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultContext } from "../src/core/context.ts";
import { downloadBytes } from "../src/core/download.ts";

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

/** A fetch that answers with this body, from this address after a redirect when it is given. */
function answering(body: BodyInit | ReadableStream<Uint8Array>, redirectedTo?: string): void
{
    vi.stubGlobal("fetch", () => {
        const response = new Response(body as BodyInit);
        return Promise.resolve(redirectedTo === undefined ? response : Object.defineProperties(response, { redirected: { value: true }, url: { value: redirectedTo } }));
    });
}

describe("a download", () => {
    it("gives the bytes of an https address", async () => {
        answering(new Uint8Array([1, 2, 3]));
        expect(await downloadBytes("https://example.org/a.zip", 10)).toEqual(new Uint8Array([1, 2, 3]));
    });

    it("refuses an address that is not https, and a redirect to one", async () => {
        await expect(downloadBytes("http://example.org/a.zip", 10)).rejects.toThrow("is not an https address");
        answering(new Uint8Array([1]), "http://example.org/a.zip");
        await expect(downloadBytes("https://example.org/a.zip", 10)).rejects.toThrow("led to http://example.org/a.zip, which is not https");
    });

    it("stops past its size", async () => {
        answering(new Uint8Array(2048));
        await expect(downloadBytes("https://example.org/a.zip", 1024)).rejects.toThrow("is more than");
    });

    it("says what to do when the answer stops half way", async () => {
        const broken = new ReadableStream<Uint8Array>({
            start: (controller) => {
                controller.enqueue(new Uint8Array([1]));
                controller.error(new Error("socket hang up"));
            },
        });
        answering(broken);
        await expect(downloadBytes("https://example.org/a.zip", 10)).rejects.toThrow("stopped half way (socket hang up): check the address, or download it and give the file.");
    });
});

describe("the player's data folder", () => {
    it("is never a folder relative to where the engine runs, when the system's variable is empty", () => {
        vi.stubEnv("APPDATA", "");
        vi.stubEnv("XDG_DATA_HOME", "");
        expect(isAbsolute(defaultContext().home ?? "")).toBe(true);
    });
});
