/** A name as it is compared: any case, and accents written either way (NFC), so that "Città" from any system matches "città". */
export function comparableText(text: string): string
{
    return text.normalize("NFC").toLowerCase();
}
