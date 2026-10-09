# Robot DM branding assets

Original vector reconstruction of the selected yellow robot and blue game-master screen. These assets are design drafts, not wired into the dashboard. The PNG reference retains the earlier white sticker border; the SVG variants have no border and a transparent background.

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

SVG fills use CSS custom properties with built-in fallback colors. To recolor an inline SVG, set these properties on the SVG or an ancestor. SVGs loaded through an `<img>` do not inherit the page's CSS properties; edit their fallback values or embed them inline instead.

| Property | Default | Use |
|---|---|---|
| `--robot-body` | `#F4C84C` | Yellow housing |
| `--robot-accent` | `#DCAA32` | Ears and antenna |
| `--robot-display` | `#192D4D` | Face display |
| `--robot-face` | `#FFF4D5` | Eyes and mouth |
| `--screen-front` | `#4268B2` | Central screen panel |
| `--screen-side` | `#29477F` | Side panels and die motif |

Prefer the neutral mark at very small sizes: expressions are intended primarily for larger mascot placements. Verify the intended display size before using an emotional variant.
