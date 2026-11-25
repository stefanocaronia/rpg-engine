// A new theme's files: theme.yaml with its colours set and every other key it may give shown in a comment, an empty style sheet and a README for its author.
import { stringify } from "yaml";
import { themeFileName } from "./theme.ts";

/** The files of a new theme by this name, for this rpg-engine's version, each with its path from the theme's folder. */
export function themeTemplate(name: string, engineVersion: string): [string, string][]
{
    const engine = engineVersion.split(".").slice(0, 2).join(".");
    return [[themeFileName, themeYaml(name, engine)], ["style.css", styleSheet], ["README.md", readme(name)]];
}

/** theme.yaml: the keys every theme gives, set, and the others in comments, each saying what it changes and the values it takes. */
function themeYaml(name: string, engine: string): string
{
    return `# A theme of RPG Engine's dashboard. Every key a theme may give is here: take the # off a line to use it.
# Each file it names is one of this folder, written from it; pictures as svg, png, webp or jpg, each at most 1000 KB.
${stringify({ name }).trim()}
version: 0.1.0
engine: "${engine}"               # the lowest rpg-engine that reads this theme, in quotes

# Faces: woff2, woff, ttf or otf files of this folder, each naming the file of its licence beside it, .txt or .md.
# A face under the SIL Open Font License (most of Google Fonts) may be shared with its OFL.txt; any other, only as its own licence says.
# fonts:
#   - {family: Alegreya, file: fonts/Alegreya.woff2, weight: 400 900, license: fonts/OFL.txt}   # weight: one, or two for a variable face
# text-font: Alegreya            # the face of the text: the family of one of fonts
# title-font: Alegreya           # the face of the titles
# story-font: Alegreya           # the face of the story the master tells
# number-font: text              # the big numbers in the text's face or the titles': text, title

# corners: 6                     # a card's corner in pixels, 0 to 16; the page's other corners follow it
# titles:
#   case: as-written             # as-written, capitals, small-capitals
#   spacing: 0.01                # the titles' letter spacing in em, -0.02 to 0.15
# cards:
#   inner-line: none             # a second line inside the cards: none, solid, dashed, dotted
#   ornament: images/corner.svg  # an SVG in a card's lower corner, drawn in currentColor, in the cards' edge colour
#   corner: round                # round, cut, notch, scoop, as large as corners
#   texture: {picture: images/grain.svg, fit: tile}   # an SVG under the cards in currentColor alone, drawn in card-grain; fit: tile, cover
# buttons:
#   shape: rounded               # the buttons of words: rounded, square, pill, cut
# tabs:
#   shape: underline             # the chosen tab: underline, rounded, square, pill, cut
# shadows: soft                  # soft, sharp, none, glow
# papers:
#   documents: "#efe2c2"         # the paper of the documents found, the same in both modes: the page writes dark ink on it
#   maps: "#ecdfc0"              # the paper of the maps
# portraits:
#   shape: round                 # round, rounded, square, cut
#   frame: none                  # a frame inside their edge: none, thin, thick, double
# style: style.css               # a style sheet of its own, added over the page's rules; see style.css
# icons:                         # the page's icons drawn anew: SVGs of paths alone on a grid of 24
#   party: icons/party.svg       # party, scene, combat, journal, world, saves, help, settings, about, packages, menu

# The light page. Required: paper, panel, rule, ink, muted, accent, gold, on-gold, ally, low; the page checks that each reads on what it sits on.
light:
  paper: "#f3f1ec"               # the page's ground
  panel: "#fdfcf9"               # the cards
  rule: "#d6d1c4"                # lines and edges
  ink: "#1e2430"                 # the text
  muted: "#545d6b"               # softer text
  accent: "#2f5d8a"              # links, the focus ring, what is chosen
  gold: "#7a4f12"                # the strong colour: the main button, the player's turn
  on-gold: "#ffffff"             # the words on gold
  ally: "#2e6b3f"                # friends, what is gained
  low: "#a8321f"                 # foes, danger, what is lost
  # panel-2: "#f6f4ef"           # the cards' second tone; else derived from ink and panel
  # float: "#ffffff"             # what floats over the page, menus and tooltips; else derived
  # gold-ink: "#7a4f12"          # gold as text on the cards; else gold, or the accent when gold does not read
  # warn: "#7a4f12"              # warnings; else gold-ink
  # on-low: "#ffffff"            # the words on the danger's button; else the first colour that reads
  # title-glow: none             # a glow round the titles: a colour, or none
  # card-edge: "#d6d1c4"         # the cards' edge; else rule
  # bar-edge: none               # a line under the top: a colour, or none
  # page-texture: {picture: images/paper.svg, fit: tile}   # a picture under the page; fit: tile, cover
  # bar-texture: {picture: images/band.svg, fit: tile}     # a picture under the top
  # head-picture: {picture: images/crest.svg, fit: cover}  # a picture beside the campaign's name, under no words; not on a phone
  # card-grain: "#d6d1c4"        # the colour of the cards' texture; else card-edge
  # shadow: "#1e2430"            # the shadows' colour; else the page's, the accent for glow
  # portrait-frame: "#7a4f12"    # the portraits' frame; else gold; never like low, a foe's ring

# The dark page: the same keys, its own colours.
dark:
  paper: "#14171d"
  panel: "#1c2129"
  rule: "#343b47"
  ink: "#eceff3"
  muted: "#a7b0bd"
  accent: "#8fb8e3"
  gold: "#e0b45c"
  on-gold: "#14171d"
  ally: "#8fd0a0"
  low: "#ff9580"
  # panel-2: "#21262e"
  # float: "#2a3039"
  # gold-ink: "#e0b45c"
  # warn: "#e0b45c"
  # on-low: "#14171d"
  # title-glow: none
  # card-edge: "#343b47"
  # bar-edge: none
  # page-texture: {picture: images/paper-dark.svg, fit: tile}
  # bar-texture: {picture: images/band-dark.svg, fit: tile}
  # head-picture: {picture: images/crest-dark.svg, fit: cover}
  # card-grain: "#343b47"
  # shadow: "#000000"
  # portrait-frame: "#e0b45c"
`;
}

const styleSheet = `/* This theme's own style sheet, added over the dashboard's rules: name it in theme.yaml, style: style.css, to use it.
   Its url() name pictures of this folder, written from this file; it never uses @import, and its faces go in theme.yaml's fonts. */
`;

/** The README of a new theme: what it is, how its author sees it, how it is shared. */
function readme(name: string): string
{
    return `# ${name}

A theme of RPG Engine's dashboard: its colours in \`theme.yaml\`, and, if you want, its faces, pictures, icons and a style sheet of its own.

## See it

\`\`\`
rpg package install <this folder> --link
\`\`\`

Then choose it in the Settings of the dashboard of any campaign on this computer. Linked, it is read from this folder: the dashboard shows each change you save.
While it fails a check it is not offered, and \`rpg package list\` says why.

## Share it

Put this folder in a GitHub repository with the topic \`rpg-engine-theme\`: the dashboard's Packages page finds it there. Add a licence for the theme, and keep
each face's own licence beside it.
`;
}
