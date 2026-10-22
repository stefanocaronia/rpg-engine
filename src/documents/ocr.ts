// The text of a PDF's pages read from how they look (D-491 (10), LIB-4): Windows draws each page and reads it with its own OCR, both built into Windows 10
// and 11; nothing to install. Mac and Linux have none yet.
import { spawn } from "node:child_process";

/**
 * Reads some pages of a PDF from their pictures: the text of each it could read, by page number from 1; `onPage` hears those read so far. Stopped before its
 * last page, as by its time or `signal` running out or its process failing, it fails with the code EINTR and those it read as `read`.
 */
export type PageReader = (pdf: string, pages: number[], signal?: AbortSignal, onPage?: (read: Map<number, string>) => void) => Promise<Map<number, string>>;

// Windows' own PowerShell: Windows.Data.Pdf draws a page, Windows.Media.Ocr reads it in the languages of the user's profile. Each page read is written as its
// number and its text in base64, so that no console code page changes a letter; a page that fails is left out. No OCR language installed ends it with 3.
const windowsScript = [
    "Add-Type -AssemblyName System.Runtime.WindowsRuntime",
    "$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]",
    "$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]",
    "$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]",
    "$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]",
    "$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]",
    "$methods = [System.WindowsRuntimeSystemExtensions].GetMethods()",
    "$asTask = ($methods | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]",
    "$asTaskAction = ($methods | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' })[0]",
    "function Await($op, [Type]$type) { $task = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }",
    "function AwaitAction($op) { $task = $asTaskAction.Invoke($null, @($op)); $task.Wait(-1) | Out-Null }",
    "$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()",
    "if ($null -eq $engine) { exit 3 }",
    "$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($env:RPG_OCR_PDF)) ([Windows.Storage.StorageFile])",
    "$document = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])",
    "foreach ($number in $env:RPG_OCR_PAGES.Split(',')) {",
    "  try {",
    "    $page = $document.GetPage([int]$number - 1)",
    "    $stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream",
    "    $options = New-Object Windows.Data.Pdf.PdfPageRenderOptions",
    "    $options.DestinationWidth = 2000",
    "    AwaitAction ($page.RenderToStreamAsync($stream, $options))",
    "    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])",
    "    $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])",
    "    $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])",
    '    $text = ($result.Lines | ForEach-Object { $_.Text }) -join "`n"',
    "    [Console]::Out.WriteLine($number + ' ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($text)))",
    "    $page.Dispose(); $stream.Dispose()",
    "  } catch { }",
    "}",
].join("\n");

// About what a page takes, with room to spare: a book of 400 pages in under an hour.
const secondsAPage = 8;

/** The OCR of the player's operating system, where there is one: Windows' own; none elsewhere, for now. */
export function systemPageReader(platform: string, env: Record<string, string | undefined>): PageReader | undefined
{
    if (platform !== "win32") {
        return undefined;
    }

    const shell = `${env.SystemRoot ?? "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
    return (pdf, pages, signal, onPage) => windowsPages(shell, pdf, pages, signal, onPage);
}

/** The pages Windows' script wrote, by number: a line for each, its number and its text in base64. */
export function pagesWritten(out: string): Map<number, string>
{
    const pages = new Map<number, string>();
    out.split(/\r?\n/).forEach((line) => pageLine(line, pages));
    return pages;
}

/** Adds to `pages` the page a line of Windows' script wrote, if it is one. */
function pageLine(line: string, pages: Map<number, string>): void
{
    // A page read empty is its number alone.
    const match = /^(\d+)(?: ([A-Za-z0-9+/=]*))?$/.exec(line.trim());

    if (match !== null) {
        pages.set(Number(match[1]), Buffer.from(match[2] ?? "", "base64").toString("utf8"));
    }
}

function windowsPages(shell: string, pdf: string, pages: number[], signal?: AbortSignal, onPage?: (read: Map<number, string>) => void): Promise<Map<number, string>>
{
    if (pages.length === 0) {
        return Promise.resolve(new Map());
    }

    return new Promise((done, fail) => {
        const env = { ...process.env, RPG_OCR_PDF: pdf, RPG_OCR_PAGES: pages.join(",") };
        const child = spawn(shell, ["-NoProfile", "-NonInteractive", "-Command", windowsScript], { env, stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
        const read = new Map<number, string>();
        let rest = "";
        let stopped = false;

        const stop = (): void => {
            stopped = true;
            child.kill();
        };

        const timer = setTimeout(stop, (30 + pages.length * secondsAPage) * 1000);
        signal?.addEventListener("abort", stop, { once: true });
        child.stdout.setEncoding("utf8");
        // Each line whole is a page read, heard at once; a line cut in two waits for its end.
        child.stdout.on("data", (chunk: string) => {
            const lines = (rest + chunk).split("\n");
            rest = lines.pop() ?? "";
            lines.forEach((line) => pageLine(line, read));
            onPage?.(read);
        });

        // What it read before it stopped or failed still counts. No OCR language (3), or no PowerShell, is no OCR at all.
        const end = (code: number | null | "no shell"): void => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", stop);
            pageLine(rest, read);

            if (stopped || (code !== 0 && code !== 3 && code !== "no shell")) {
                fail(Object.assign(new Error("The OCR stopped before its last page."), { code: "EINTR", read }));
            } else {
                done(read);
            }
        };

        child.on("error", () => end("no shell"));
        child.on("close", end);
    });
}
