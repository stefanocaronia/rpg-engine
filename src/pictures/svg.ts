// An SVG picture drawn by a model (D-342, D-390), never trusted: rebuilt from a white list of elements and attributes, everything else dropped with all it
// holds, as Elena's probe proved it on scripts, events, styles, outer links, foreign objects, nested roots, animation, use and text.

const elements = new Set(["svg", "g", "defs", "path", "rect", "circle", "ellipse", "polygon", "polyline", "line", "lineargradient", "radialgradient", "stop", "clippath", "mask", "filter", "fegaussianblur"]);
const attributes = new Set([
    "xmlns",
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

// The largest SVG taken, in bytes: the largest of the probe weighed 16 KB.
const largest = 100 * 1024;
const token = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\?[\s\S]*?\?>|<\/?([A-Za-z][\w:.-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|[^<]+|</g;
const attribute = /([^\s=>/]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;

/** The SVG rebuilt from what is allowed; undefined when it has no single allowed root, does not close, or is too large. */
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

        const name = rawName.toLowerCase();

        if (whole.startsWith("</")) {
            if (open.at(-1)?.name === name) {
                const closed = open.pop();

                if (closed?.skipped === true) {
                    skipping--;
                } else {
                    kept.push(`</${rawName}>`);
                }
            }

            continue;
        }

        const allowed = elements.has(name) && (name !== "svg" || (open.length === 0 && roots === 0));

        if (skipping > 0 || !allowed) {
            if (selfClosing !== "/") {
                open.push({ name, skipped: true });
                skipping++;
            }

            continue;
        }

        roots += name === "svg" ? 1 : 0;
        kept.push(`<${rawName}${keptAttributes(rawAttributes)}${selfClosing === "/" ? "/" : ""}>`);

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

/** An element's allowed attributes, with no outer url(), no markup in a value, and the SVG namespace only. */
function keptAttributes(rawAttributes: string): string
{
    return [...rawAttributes.matchAll(attribute)].flatMap(([, rawKey, rawValue = '""']) => {
        const key = rawKey.toLowerCase();
        const value = rawValue.replace(/^["']|["']$/g, "");
        const urls = [...value.matchAll(/url\s*\(([^)]*)\)/gi)].map((found) => found[1].trim().replace(/^["']|["']$/g, ""));
        const unsafe = !attributes.has(key) || (key === "xmlns" && value !== "http://www.w3.org/2000/svg") || urls.some((url) => !/^#[\w-]+$/.test(url)) || /[<>&]/.test(value);
        return unsafe ? [] : [` ${key === "viewbox" ? "viewBox" : rawKey}="${value}"`];
    }).join("");
}
