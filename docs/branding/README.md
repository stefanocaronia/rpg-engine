# Robot DM branding assets

These reference drafts live here, outside the npm package.
The production assets are `src/dashboard/assets/master.svg`, `src/dashboard/assets/favicon.svg`, `src/dashboard/assets/icon-32.png`, `src/dashboard/assets/icon-180.png` and `docs/logo.png`.

Original vector reconstruction of the selected yellow robot and blue game-master screen. The PNG reference retains the earlier white sticker border; the SVG variants have no border and a transparent background. The nine individual SVGs and preview below are preserved drafts, not the production avatar.

- `robot-dm-neutral.svg`: primary mark.
- `robot-dm-smile.svg`: welcoming smile.
- `robot-dm-surprised.svg`: surprise.
- `robot-dm-curious.svg`: curiosity, with a seven-degree head tilt.
- `robot-dm-focused.svg`: concentration.
- `robot-dm-concerned.svg`: concern.
- `robot-dm-sad.svg`: sadness.
- `robot-dm-mischievous.svg`: playful complicity.
- `robot-dm-delighted.svg`: delight.
- `preview.html`: comparison on light and dark backgrounds, with icon-size samples.

All variants use a `512 × 512` viewBox and the same screen geometry. The head, antenna, ears, housing, display, expression and screen have separate groups or identifiers. Rotating the head around `(256, 275)` moves the face, ears and antenna together; the screen remains in front. The compact solid hexagon is the approved die motif.

## Palette

The production SVGs use literal hex fills and classes, with no IDs, embedded styles or animations. The dashboard can recolor the inline avatar through these classes. The reference drafts retain their original CSS variables.

| Class | Hex | Use |
|---|---|---|
| `robot-housing` | `#F4C84C` | Yellow housing |
| `robot-antenna`, `robot-ears` | `#DCAA32` | Ears and antenna |
| `robot-display` | `#192D4D` | Face display |
| `robot-eyes`, `robot-mouth`, `robot-brows` | `#FFF4D5` | Face fills and strokes |
| `robot-screen-front` | `#4268B2` | Central screen panel |
| `robot-screen-side`, `robot-die` | `#29477F` | Side panels and die motif |

## Production avatar

`master.svg` contains all nine expressions. Only `robot-mood-neutral` is visible by default; the other mood groups have `display="none"`. Each mood separates `robot-eyes` and `robot-mouth`; concern also has `robot-brows`. `robot-can-blink` marks only the open eyes of neutral, smile, surprised, curious and concerned. Eye centers are at y = 208, with larger eyes and mouth strokes for the 44 px avatar.

The production `robot-head` has no transform. The dashboard applies curiosity's seven-degree tilt around `(256, 275)` through CSS, and manages blinking and reduced motion. Colors and mood changes require inline SVG; an SVG loaded through an `<img>` does not inherit the page's CSS.

Use `favicon.svg` or its transparent 32 px PNG for very small icons: they show only the head, eyes and antenna stub. `icon-180.png` shows the neutral full mascot on a solid `#192D4D` background with 18 px margins. `docs/logo.png` is the transparent 512 px neutral full mascot for the README.
