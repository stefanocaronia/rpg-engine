// The address of a page the engine serves on this computer, as its servers write it: what the launcher and the tables keep in their places, and what a
// browser is started with. Anything else is no page of ours.

// http on 127.0.0.1 at a port; then a path and a query of the characters our addresses use: never a quote, a space or a control character.
const pageAddressForm = /^http:\/\/127\.0\.0\.1:(\d{1,5})(\/[\w\-.~%/?&=+:@!$,;*]*)?$/;

/** Whether an address is one of a page the engine serves on this computer: `http://127.0.0.1:<port>`, with a path and a query of plain characters. */
export function isPageAddress(url: string): boolean
{
    const port = Number(pageAddressForm.exec(url)?.[1] ?? 0);
    return port >= 1 && port <= 65_535;
}
