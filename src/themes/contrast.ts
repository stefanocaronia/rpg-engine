// Colours as the style guide measures them: WCAG's contrast of two colours, a mix of two, how far two are, whether one is light.

/** WCAG's contrast of two colours written #rrggbb, from 1 to 21. */
export function contrast(first: string, second: string): number
{
    const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
}

/** The colour of the first over the second, the first at this share from 0 to 1, as color-mix in srgb. */
export function mix(top: string, under: string, share: number): string
{
    const [above, below] = [channels(top), channels(under)];
    return `#${above.map((value, index) => Math.round(value * share + below[index] * (1 - share)).toString(16).padStart(2, "0")).join("")}`;
}

/** How far two colours are, in the steps of their channels: friends and foes must not look alike. */
export function distance(first: string, second: string): number
{
    const [one, other] = [channels(first), channels(second)];
    return Math.hypot(...one.map((value, index) => value - other[index]));
}

/** Whether a colour is light, as a light page's ground is. */
export function isLight(colour: string): boolean
{
    return luminance(colour) > 0.5;
}

function channels(colour: string): number[]
{
    return [1, 3, 5].map((at) => Number.parseInt(colour.slice(at, at + 2), 16));
}

function luminance(colour: string): number
{
    const linear = channels(colour).map((value) => value / 255).map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
