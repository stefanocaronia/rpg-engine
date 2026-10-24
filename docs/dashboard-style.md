# The dashboard's style

How the player's dashboard looks, moves and speaks: the tokens and parts of [src/dashboard/style.css](../src/dashboard/style.css) and when to use each. Use what is here before adding anything; a new part is described here when it is added. Where the page does not follow this guide yet, the guide wins: the list at the end says what to bring in line.

The dashboard is the table beside the chat where the game is played. It reads like a video game's interface, not an office app: clear first, then good to look at, then a little delight. It is generic: it never names a game's concepts; a game system brings its words and its layout as data.

## 1. Tokens

Every colour, corner, shadow and duration is a custom property of `:root`. A raw value outside `:root` is a bug, except inside the own palettes of the things drawn: the maps, the dice, the tokens and coins, the robot; white and black only as light and shade, a little of them over a colour. A paler or darker tone of a token is `color-mix()` of it.

### Colour

Two seeds, the robot's navy and gold. Each token is `light-dark()`, so both themes come from one rule; `light-dark()` takes colours only, never a shadow or a length.

| Token | Use |
|---|---|
| `--paper` | The page's ground |
| `--panel` | A card |
| `--panel-2` | A tone above the card: something nested, or the dark theme's raised parts |
| `--float` | Controls that stand on a card: buttons, fields, segmented controls |
| `--cell` | The label's cell in a card's lines |
| `--rule` | Borders and dividing lines |
| `--ink` | Text |
| `--muted` | Secondary text, inactive tabs, icons of quiet controls |
| `--accent` | What can be pressed and what is chosen: links, the focus ring, the chosen tab, the cards' icons, a page's head. Navy on the light page, gold on the dark one |
| `--gold`, `--on-gold` | The robot's gold, the same in both themes: the one main action of a view, a chosen value, the player's turn, a main quest, the highest roll. Text on it is `--on-gold` |
| `--gold-ink` | Gold as text or a line, readable on the light page |
| `--ally` | The party's side, a success, something gained |
| `--low`, `--on-low` | Danger: a problem, a failure, a foe the master marked, death; text on it |
| `--warn` | A warning, as the game being away. On the dark page it is the gold: never beside gold that means "chosen" |
| `--disc` | The dark disc under a token, in both themes |
| `--veil`, `--on-veil`, `--on-veil-muted`, `--veil-low` | Over a picture, the same in both themes: its dark veil, the words on it, a deadline near |
| `--cover`, `--cover-deep`, `--cover-main`, `--cover-main-deep` | A quest's cover without a picture, a main quest's in gold |
| `--m-*`, `--l-*`, `--bio-*`, `--doc-*` | The paper of the maps and of documents, and their inks, the same in both themes (see Paper) |
| `--season-*` | The four seasons, in the calendar alone and always beside their word |

- A tinted ground is `color-mix(in srgb, var(--tone) 10%, var(--panel))` with a border at 45% toward `--rule`, as a notice; a chosen chip is the accent at 14%.
- Colour never says a thing alone: a shape, an icon or a word goes with it (the foe's ring and the word, the failure's square and its colour).
- Text 4.5:1 and controls 3:1 against their ground, in both themes. Check the light theme too: gold on cream is the usual failure.

### Type

The system's sans for everything (`body`: 15px/1.4). The serif (`--serif`) is the story's voice only: the campaign's name, the master's question, what is happening now in a scene, the names on the maps, and the text of documents found in the world.

| Size | Weight | Use |
|---|---|---|
| `0.72rem`, uppercase, `letter-spacing: 0.08em` | 700 | An eyebrow: the small label over a title or a group (`.eyebrow`), muted; `.eyebrow.accent` when it says "now" |
| `0.8rem` | 400–650 | Small: counts, tooltips, footnotes |
| `0.85rem` | 400–650 | Secondary: a row's meta, a closed card's preview, chips |
| body (inherit, 15px) | 400 | Text |
| `1.125rem` | 700 | A card's title (`h3`) |
| `1.25rem` | 700 | A title over a picture or in a dialog: a banner, the master's question, a quest's cover |
| `1.4rem` | 700 | A page's title (`h2` in `PageHead`) |
| `1.6rem` and up | 700, 800 for the player's two moments | One number that is the point of its box: a total, a modifier; at 800 the roll's total and the death save's word |

Weights: 400 text, 600 a word that stands out in a line (a chip, a filter, a notice, a name in a row) and the serif titles, 650 controls (buttons, tabs), 700 titles, names and numbers. The maps draw their labels in px, in the map's own units. Numbers that line up are `.num` (tabular figures). Items of a list start with a capital; a field's abbreviation (AC, WIS) is all capitals.

### Room, corners, depth

- Room in steps of 2 px up to 12, then 16 (`--gap`, between cards and stacks and around the page) and 24. A card's padding is 16 px inline; its header is at least 52 px tall.
- Corners: `--radius-xs` 4 (tooltips), `--radius-s` 6 (list chips, controls inside controls), `--radius-m` 8 (buttons, fields, icon buttons), `--radius-l` 12 (cards, notices), `--radius-xl` 16 (banners, dialogs). Round (`50%`) only tokens and dots. A pill (`999px`) only for a choice among peers (filter chips, verbs, the maps' tabs) and a switch's track; never a button or a card. A thin bar has `--radius-xs`, its ends round; a mark that is square to tell it from a round one, `calc(var(--radius-xs) / 2)`.
- Depth: on the light page a card has `--lift, --raise`; what floats over the page (dialogs, sheets, the dice's button, tonal buttons) has `--overlay`; the phone's bar at the window's foot `--raise-up`; a little drawn edge `--shade`. On the dark page depth is the surface's tone; only what floats casts a shadow. The page's light from above is `--glow`.

### Motion

| Token | Use |
|---|---|
| `--quick` 100 ms | State layers, tooltips, a press |
| `--short` 250 ms | Most transitions: a card opening, a colour changing, a tab |
| `--medium` 350 ms | A panel or sheet coming in |
| `--flight` 450 ms | Something that travels: the result plate flying to its row |
| `--long` 600 ms, `--linger` 900 ms | A mark that fades after it is seen |
| `--wait` 500 ms | The moment a pointer rests on a control before its tooltip shows |

`--ease` for most, `--ease-out` for what comes in, `--ease-in` for what leaves, `--ease-bounce` for one pop. A loop (breathing, pulsing) only for what waits for the player: their turn, a check asked, the robot; its period, in seconds, is its own, as is how long a fresh mark stays. A short step between things that come one after the other is a share of `--quick`. Motion never makes the player wait to act; script that times a motion of its own uses the same token's length.

Motion is added inside `@media (prefers-reduced-motion: no-preference)`, so that with reduced motion the state is simply there; script checks `matchMedia("(prefers-reduced-motion: reduce)")` before a smooth scroll or an animation. Only what leaves keeps its animation with reduced motion, run at once (`animation-duration: 0.01s`), so that it reaches its end.

## 2. Parts

**Page.** A section is a `PageHead` (its icon and title in the accent) over a `.page-stack` of cards, with room at the bottom for the dice's button. The page never changes section by itself.

**Tabs.** Parts of one section are tabs under its head (`PageTabs`, `.page-tabs`): words in `--muted`, the chosen one in the accent with a 3 px bar under it, 40 px tall (44 on touch). On a phone they close up, and when they still do not fit the row scrolls sideways; it never wraps and never widens the page. The tab is in the address (`#/world/lore`), changed with `location.replace`; an item opened inside it is too (`#/world/lore/Bertoldo`), pushed, so that Back returns to it and the master can give a link. Arrows move along the tabs, Home and End go to the ends, and one Tab stop reaches the row. A tab may carry a mark after its name (`.tab-mark`): a count in the accent, or what is missing in `--low`, with its tip and in the tab's name for a screen reader.

**Card.** `<details class="group">` with `CardHeader`: its icon (20 px, stroked in the accent), its title, a preview while closed, the chevron. It stays as the player left it (`useOpen`); on a phone cards start closed but the first. A card that is always open is a `<section class="card">` with `CardHead` and its `.card-body`. No card inside a card: inside one, sections under small headings.

**Buttons.** A button of words is `.button`, 38 px tall (44 on touch): `.gold` for the one main action of a view, `.quiet` (accent words, no border) for a secondary one, `.danger` (red edge) for one that loses something, full red at its last step. A button of an icon is `.icon-button` (40 px), always with `aria-label` and the same words in `data-tip`; `.tonal` (48 px, raised) when it floats over the page. What goes somewhere is a link (`<a href>`); what does something is a button.

**Chips.** A thing in a list is a chip (`.chips li`: the accent at 11%, `--radius-s`). A filter is a row of pill chips (`.filter-chips`, `aria-pressed`, a muted count after the name): one Tab stop, arrows, Home and End along it. A search is a field with its magnifier inside (`.search`) that filters as it is typed. Two to five values of one setting are a `.segmented` control.

**Rows.** A list of things to open is a column of rows, each one button the row's width: the name in bold, its meta in `--muted` at 0.85rem, a number or distance at the end in `.num`. Sentences are lines, not chips. On the sheet a number the system rolls better or worse has an arrow beside its die, up in `--ally`, down in `--low`, both muted when they cancel out, and its tooltip says why; a load past a stage has the stage's word in `--warn` before it; a thing in a list of bonds has two rings after its name, and the list how many it holds of its most.

**List and reader.** Many things of a kind to browse and read, as what the character knows or the documents found: a list (a search field, filter chips, the rows grouped under eyebrows) and the open one in a reader beside it from 900 px; under that the reader takes the list's place, with a Back link at its top. Each row is a link to its item, named by its name and described by its meta (`aria-describedby`); the open one is `aria-current`, lit with a bar of the accent at its start. The open item is in the address; opening it moves the focus to the reader's title, Back returns it to its row. On a wide screen with nothing open the reader shows the list's first. An empty search says so in a line, with the way out.

**Strips.** A compact summary that leads to its whole view, as the party's tokens or a followed quest: the whole strip is one link, lit as one.

**Notices.** The page's own messages, over the page under its top (`.notice`): `.problem` in `--low`, the game away in `--warn`, a word to know in the accent, each with its icon. The master's words never go in a notice.

**The master's question.** What the master asks stays over the page, in sight while it scrolls, with the robot and the question in the serif. With more than one player character, the portrait of the one it asks takes the robot's place, the robot small on its edge, and their name is said over the title ("For Mira") and before the folded question. A card that belongs to a question (a death save, a rest) stands in its frame, edged in the accent. Nothing else uses that frame.

**More than one player character.** Each is named, never "you", and the page with one stays as it is. A fight's card at hand has the tokens of those fighting in its head, a pressed toggle each (one Tab stop, arrows), the one shown ringed in the accent; it follows whose turn it is again at the next turn. The map's list puts the one the distances are from first, "from here". What the character knows has a chip with each one's token after the kinds, what that one knows; only a secret says who alone knows it, after its title. Documents carried are grouped by who carries them ("With Mira"). The tray's free dice are no one's: a die on the coin, "Free roll". An action's sentence starts with who acts ("Mira: …").

**Dialogs and sheets.** `role="dialog"` named by its title. It opens with the focus on its first control or its Close; Esc closes it and the focus returns to what opened it. On a wide screen a card beside its thing; on a phone a sheet from the bottom. A modal `<dialog>` that is not full is `height: fit-content`.

**Tooltips.** `data-tip` draws one over the control (`::before`), after a moment under a pointer and at once with the keyboard, never at a touch. `.tip-left` and `.tip-below` keep it inside the window near an edge. Every control without words has one.

**State layer.** Every `button`, `summary` and `a[href]` lights by itself under the pointer, the focus and a press (`::after`). So `::after` of those is taken, and `::before` is the tooltip's: draw other marks with an element.

**Tokens.** A picture of someone is a coin: round, on `--disc`, under glass, with the pip of its side; the picture is never tinted. A place without a picture shows the mark of its kind on the map's paper.

**Paper.** Things of the world are paper, light in both themes, ink dark: the maps, and the documents found. A document looks like what it is with drawing alone: a letter folded and sealed, a notice nailed up, a torn page, a diary's ruled lines, a scroll's rolled ends, an inscription's stone; a kind the page does not know is plain paper. Its text stays text: the serif at 1rem or more, lines up to 65 characters, no script faces, tilted a degree at most, every ornament `aria-hidden`. A secret the character discovered in it reads as a note in its margin.

**Days.** A calendar is drawn from its months alone: the days in rows of ten (five on a phone), never seven, which would say weeks the game does not have. Today is ringed in the accent, the day chosen filled with it, the story's days tinted, a dot for each scene and the hourglass in `--low` for a deadline; a key under the days says so. The arrows move by a day, up and down by a row, into the next month.

**Empty and waiting.** One sentence in `--muted` that says what will fill the place and who fills it ("it grows as the master writes…"). Never a blank, never a spinner alone.

## 3. Words

- To the player, in the second person: "your character", "the master". With more than one player character the page names each one where it would say "you" of a character: "It's Mira's turn", never "Your turn" or a "You" chip; with one, nothing changes. Short, plain, in the game's words; never the machine's (no "error", "server", "load", "API"). What happened, then a colon and what to do.
- Buttons and tabs in one or two words, an action's verb first ("Roll", "Show on the map"). Sentence case.
- Every phrase through `t()`, written in English in the code, with `{placeholders}`, never glued from pieces; Italian is curated by hand in `i18n/it.json`. A game's words come from its system (`systemWord`, `labels.ts`).
- The page shows only what the character knows: a page it does not know is never a link, never hinted, never counted.

## 4. Right to left, the phone, access

- **Right to left** (Arabic, Hebrew): logical properties only (`margin-inline`, `inset-inline-start`); the page mirrors by itself. Maps and dice stay left to right. Numbers, notations and names inside sentences are isolated (`isolated()`, `<bdi>`, `.num`); text from the game has `dir="auto"`. Chevrons and arrows that point a way turn; the arrow keys follow the reading (`arrowStep`).
- **Widths**: a phone up to 600 px (one column, the sections in a bar at the bottom, cards closed), wide from 900 px (the table's column beside the page). Check 360 and 1280 px, both themes. At 360 nothing widens the page: grids are `minmax(0, 1fr)`, long names break (`overflow-wrap: anywhere`), a row that cannot fit scrolls by itself.
- **Touch**: under `(pointer: coarse)` every control is at least `--target` (44 px).
- **Keyboard**: everything is reached; a group (tabs, chips, radios, a grid of days) is one Tab stop with arrows inside; Esc closes; after a change the focus moves somewhere sensible, never to the page's body. The focus ring is the accent, 2 px, offset 2 px (−2 px inside a row that scrolls).
- **Screen readers**: each part a landmark named by its heading; icons `aria-hidden` and the control named; what changes by itself in a polite `role="status"`, said once, short.
- Text zoomed to 200% still fits; nothing depends on hover alone.

## 5. Not in line yet

- Titles between a card's and a page's (1.1 to 1.5rem: dialogs, banners, the master's question, a quest's cover), to come to 1.25rem; labels under 0.72rem in tight tiles (0.55 to 0.68rem).
