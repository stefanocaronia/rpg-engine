// A file from the web, as an adventure's link gives it (ADV-1): https only, cut off past a size, and stopped after a while.
const longestWait = 2 * 60 * 1000;

/** The bytes at an https address, at most `most`; it throws, saying why, when the address is not https, does not answer, or gives more. */
export async function downloadBytes(url: string, most: number, signal?: AbortSignal): Promise<Uint8Array>
{
    if (!/^https:\/\//i.test(url)) {
        throw new Error(`${url} is not an https address: only those are downloaded.`);
    }

    const response = await fetch(url, { signal: signal === undefined ? AbortSignal.timeout(longestWait) : AbortSignal.any([signal, AbortSignal.timeout(longestWait)]), redirect: "follow" })
        .catch((error: unknown) => {
            throw new Error(`${url} did not answer (${error instanceof Error ? error.message : String(error)}): check the address, or download it and give the file.`);
        });

    if (!response.ok || response.body === null) {
        throw new Error(`${url} answered ${response.status}: check the address, or download it and give the file.`);
    }

    const chunks: Uint8Array[] = [];
    let size = 0;

    for await (const chunk of response.body) {
        size += chunk.length;

        if (size > most) {
            throw new Error(`${url} is more than ${most / 1024 / 1024} MB, more than an adventure may.`);
        }

        chunks.push(chunk);
    }

    const bytes = new Uint8Array(size);
    let at = 0;

    for (const chunk of chunks) {
        bytes.set(chunk, at);
        at += chunk.length;
    }

    return bytes;
}
