// An SVG picture drawn by a model (D-342, D-390), never trusted: rebuilt from a white list of elements and attributes, everything else dropped with all it
// holds, as probes proved it on scripts, events, styles, outer links, foreign objects, nested roots, animation, use, text and quotes.

// The elements kept, by their names in any case, each written as SVG names it.
const elements = new Map(
    ["svg", "g", "defs", "path", "rect", "circle", "ellipse", "polygon", "polyline", "line", "linearGradient", "radialGradient", "stop", "clipPath", "mask", "filter", "feGaussianBlur"]
        .map((name) => [name.toLowerCase(), name]),
);
const attributes = new Set([
    "viewbox",
    "preserveaspectratio",
    "id",
    "d",
    "x",
    "y",
    "x1",
    "y1",
    "x2",
    "y2",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "fx",
    "fy",
    "width",
    "height",
    "points",
    "transform",
    "fill",
    "fill-opacity",
    "fill-rule",
    "stroke",
    "stroke-width",
    "stroke-opacity",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-dasharray",
    "stroke-miterlimit",
    "opacity",
    "offset",
    "stop-color",
    "stop-opacity",
    "gradientunits",
    "gradienttransform",
    "spreadmethod",
    "clip-path",
    "clip-rule",
    "clippathunits",
    "mask",
    "maskunits",
    "maskcontentunits",
    "filter",
    "filterunits",
    "primitiveunits",
    "stddeviation",
    "in",
    "result",
    "edgemode",
    "mix-blend-mode",
    "vector-effect",
]);
// Attributes SVG writes in camel case, which the browser reads only so.
const camel = new Map(
    ["viewBox", "preserveAspectRatio", "gradientUnits", "gradientTransform", "spreadMethod", "clipPathUnits", "maskUnits", "maskContentUnits", "filterUnits", "primitiveUnits", "stdDeviation", "edgeMode"].map((
        name,
    ) => [name.toLowerCase(), name]),
);

// The largest SVG taken, in bytes: the largest of the probe weighed 16 KB.
const largest = 100 * 1024;
const token = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\?[\s\S]*?\?>|<\/?([A-Za-z][\w:.-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|[^<]+|</g;
const attribute = /([^\s=>/]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;

/** The SVG rebuilt from what is allowed, its root always in the SVG namespace; undefined when it has no single allowed root, does not close, or is too large. */
export function cleanSvg(svg: string): string | undefined
{
    if (Buffer.byteLength(svg) > largest) {
        return undefined;
    }

    const kept: string[] = [];
    const open: { name: string; skipped: boolean; }[] = [];
    let skipping = 0;
    let roots = 0;

    for (const [whole, rawName, rawAttributes = "", selfClosing] of svg.matchAll(token)) {
        if (rawName === undefined) {
            continue;
        }

        const name = elements.get(rawName.toLowerCase());

        if (whole.startsWith("</")) {
            if (open.at(-1)?.name === (name ?? rawName.toLowerCase())) {
                const closed = open.pop();

                if (closed?.skipped === true) {
                    skipping--;
                } else {
                    kept.push(`</${closed?.name}>`);
                }
            }

            continue;
        }

        if (skipping > 0 || name === undefined || (name === "svg" && (open.length > 0 || roots > 0))) {
            if (selfClosing !== "/") {
                open.push({ name: name ?? rawName.toLowerCase(), skipped: true });
                skipping++;
            }

            continue;
        }

        roots += name === "svg" ? 1 : 0;
        const namespace = name === "svg" ? ' xmlns="http://www.w3.org/2000/svg"' : "";
        kept.push(`<${name}${namespace}${keptAttributes(rawAttributes)}${selfClosing === "/" ? "/" : ""}>`);

        if (selfClosing !== "/") {
            open.push({ name, skipped: false });
        }
    }

    return roots === 1 && open.length === 0 ? kept.join("") : undefined;
}

/** The SVG in a model's answer, from <svg to </svg>, whatever came around it; undefined when there is none. */
export function svgIn(answer: string): string | undefined
{
    const start = answer.indexOf("<svg");
    const end = answer.lastIndexOf("</svg>");
    return start < 0 || end < start ? undefined : answer.slice(start, end + "</svg>".length);
}

/** An element's allowed attributes, each once, with no outer url(), no markup in a value, and no double quote, which could close the value and open another. */
function keptAttributes(rawAttributes: string): string
{
    const seen = new Set<string>();
    return [...rawAttributes.matchAll(attribute)].flatMap(([, rawKey, rawValue = '""']) => {
        const key = rawKey.toLowerCase();
        const quoted = rawValue.length >= 2 && (rawValue[0] === '"' || rawValue[0] === "'") && rawValue.at(-1) === rawValue[0];
        const value = (quoted ? rawValue.slice(1, -1) : rawValue).replaceAll('"', "'");
        const urls = [...value.matchAll(/url\s*\(([^)]*)\)/gi)].map((found) => found[1].trim().replace(/^'|'$/g, ""));

        if (!attributes.has(key) || seen.has(key) || urls.some((url) => !/^#[\w-]+$/.test(url)) || /[<>&]/.test(value)) {
            return [];
        }

        seen.add(key);
        return [` ${camel.get(key) ?? key}="${value}"`];
    }).join("");
}
