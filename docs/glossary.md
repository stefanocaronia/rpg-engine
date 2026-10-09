# Glossary

The maintainer's design documents and the talks with the colleagues are in Italian; the code, its comments and messages, the commands and the public docs are in English. This table gives the English name of each Italian term the project uses. Names in `code` are commands, fields, keys, files or functions.

## The campaign and its pages

| Italian | English | In the code |
|---|---|---|
| campagna | campaign | a folder with `campaign.yaml` and `world/` |
| impostazioni | settings | the keys of `campaign.yaml`, changed with `config` |
| mondo | world | the `world/` folder and its pages |
| pagina | page | one markdown file in `world/` |
| pagina libera | free page | a file directly in `world/`, with no type |
| tipo | type | given by the page's folder |
| personaggio, luogo, fazione, missione | character, place, faction, quest | `characters/`, `places/`, `factions/`, `quests/` |
| oggetto, evento, argomento, creatura | item, event, topic, creature | `items/`, `events/`, `topics/`, `creatures/` |
| campo | field | a key of a page's frontmatter |
| campo fisso | standard field | a field the core gives a type, such as `role` or `contains` |
| genere (di un campo) | kind | `counter`, `number`, `modifier`, `bonus`, `text`, `list`, `rolls`, declared in `fields` |
| sezione, introduzione | section, introduction | a heading and its text; the text before the first heading |
| segreto | secret | a `> [!secret] Name` block |
| alias | alias | `aliases` |
| immagine, ritratto, token | picture, image | the `image` field, a link to a file in `images/`; the dashboard will show it as a round token |
| base | base | the page a page derives from, through `creature` or `item` |
| derivare, ereditare | derive, inherit | `baseChain`, `inheritedFields` |
| contenitore | container | a page whose `contains` or `inventory` lists others |
| conosce, rivelare | knows, reveal | the `knows` field; the `reveal` command |
| ambiente | environment | a place's `environment` lines |
| registro | log | `log.jsonl`, a line for each change |
| problema | problem | what `validate` reports, with its fix |

## Game systems

| Italian | English | In the code |
|---|---|---|
| sistema (di gioco) | game system | a folder with `system.yaml`; see [game-systems.md](game-systems.md) |
| pagina del sistema | page of the system | read-only, in no place (`page.system`) |
| scheda | sheet | `sheet`, `sheet-notes` |
| riga di stato | status line | `status-line` |
| contatore | counter | a field such as `11/11`, changed with `change` |
| numero col segno, modificatore | modifier | `modifier` |
| bonus | bonus | `bonus`: effects add it up |
| campo calcolato | computed field | `computed` |
| formula, tabella | formula, table | `computed`, `counters`, `tables`; [core/formula.ts](../src/core/formula.ts) |
| soglia | threshold | `thresholds` |
| ricetta | recipe | `recipes`; `change recipe "long rest"` |
| occasione | occasion | what a recipe `ends`, such as long rest |
| uso | use | a counter that comes back with a rest: `refill`, or named by a recipe |
| equipaggiato | equipped | the `equipped` list of a character: what it wears and wields, among what it carries |
| formule delle voci | item formulas | `item-formulas`: formulas the pages of a list's items give, worked out on who lists them |
| dadi da un campo | dice from a field | `dice(…)` at the start of an item's formula: the largest of dice, numbers and fields, as a monk's `martial-arts` |
| ciò che tutti hanno | always in | `always-in`: the pages every character with a sheet has in a list, as the unarmed strike in `equipped` |
| colpo senz'armi | unarmed strike | the system page `Unarmed Strike` |
| creazione del personaggio | character creation | the system's `creation` note, which `status` says until there is a player character, and while its sheet lacks fields before the first scene |
| impostazioni del sistema | system settings | `settings` in system.yaml: what the setup asks for the system, as advancement |
| punti esperienza, PE | experience points, xp | the points a character gains; `progression.experience` counts the level they reach |
| premi della scena | rewards | `rewards`: what the creatures overcome in a scene give the party |
| traguardi | milestones | the value of advancement where the story says when the characters rise |
| tiri tenuti | kept rolls | a field of kind `rolls`, written by `roll keep` and taken by `roll use` |
| classe, riga della classe | class, the class's row | an item of the system's `progression` list; the row of its table at its level |
| privilegi | features | the `features` list the rows and parts give |
| sottoclasse | subclass | a part of `progression`, naming its class |
| salita di livello | level up | `level-up` under `progression`: what `write` says |
| aggiunte della campagna | campaign additions | `fields`, `tables`, `computed`, `counters`, `recipes`, `status-line`, `travel` in `campaign.yaml` |
| condizione | condition | `conditions` of a system; also what an event waits for in `when` |
| regole, capitolo | rules, chapter | the `rules/` folder and its files; the `rules` command |
| regole di casa | house rules | the campaign's own `rules/` folder |
| precedenti | precedents | the `precedents` setting |
| attribuzione, licenza | attribution, license | `attribution`, `LICENSE.md` |

## Play

| Italian | English | In the code |
|---|---|---|
| master | game master | the AI that runs the game; `actor: "master"` |
| giocatore | player | who plays the player character |
| PG | player character | `role: pc` |
| compagno | companion | `role: companion` |
| PNG | non-player character | `role: npc` |
| gruppo | party | the living player character and companions (`isInParty`) |
| effetto | effect | the `effects` field; the `effect` command |
| stato d'animo, emozione | mood | one of the closed list `moods`: the master's in `state.yaml` (`master-mood`), a character's in its `mood` field; the `mood` command |
| momento | moment | `mood master … --moment`: a reaction the dashboard's robot shows for a few seconds, logged as `mood-moment` |
| strato | layer | how a page is read: bases, page, effects, formulas |
| scena | scene | the open scene; the `scene` command |
| copia | copy | a numbered copy of a creature in the scene, such as `Wolf 2` |
| round, turno | round, turn | a scene with turns; `round` in `system.yaml` |
| data di gioco, durata | game date, duration | `date` in `state.yaml`, `advance`; `for` in `effect` |
| orologio | clock | an event's `clock` |
| moneta, borsa, resto | coin, purse, change | `coins`; a field written in coins; what `change … spend` gives back |
| tiro, tiro nascosto | roll, hidden roll | `roll`, `hidden` |
| dadi fisici | physical dice | `values` in `roll` |
| difficoltà, letalità | difficulty, lethality | settings |
| linee, veli | lines, veils | settings |
| tavolo | table | the `table` setting: what the master promised about how the game is played (not a system's `tables`) |
| istruzioni | instructions | `instructions/`, the `instructions` command |
| parte (delle istruzioni), istruzioni di situazione | part (of the instructions) | `instructions/<part>.md` of the core and of a system, given when its situation opens, such as `combat` |
| modalità: setup, sessione zero, gioco | mode: setup, session zero, play | `mode` in `state.yaml`, the `mode` command |
| salvataggio; permadeath, checkpoint, libero | save; permadeath, checkpoint, free | a zip in `.saves/`, the `save` command, the `saves` setting |
| vista del giocatore, diario | player's view, diary | the `view` command; the public lines of the log as facts |
| checklist (del setup, della sessione zero) | checklist | what a mode needs before the campaign leaves it: `unansweredSettings`, `blockingMode` |
| righe d'avvio | start lines | `instructions/start.md`: the MCP server's instructions and the start of the campaign's `AGENTS.md` |
| partita di prova | playtest | `playtests/` |

## The world map

| Italian | English | In the code |
|---|---|---|
| mappa del mondo | world map | the roads and, later, the positions of places; the `map` module |
| strada, tappa, tratto | road, stop, stretch | a place with `stops`; a place in them; two stops next to each other, with the length between them |
| incrocio | crossroads | a stop of several roads |
| tipo di strada | kind of road | a road's `kind`: road, path, river, sea, as the system's `travel.kinds` says |
| viaggio, viaggio in corso | journey, journey under way | the `travel` command; `journey` in `state.yaml` |
| andatura, velocità | pace, speed | `travel.paces` of a system; a distance of an hour |
| ore del giorno, marcia forzata | the day's hours, forced march | `travel.hours`; the rule `travel.beyond` |
| terreno | terrain | the `terrain` entry of the environment, and the factor the system gives it |
| veicolo, corrente | vehicle, current | the item a kind of road is travelled in; `current`, added downstream |
| unità, metrico, imperiale | units, metric, imperial | the `units` setting; measures are written in metric, outputs follow `units` with the system's `imperial` |
| posizione, centro della mappa | position, the map's centre | a place's `position`, km east and north of the first place given one |
| relazione | relation | how a position is written: `12 km NE of [[Guadoscuro]]` |
| regione, raggio | region, radius | a place with a position and a `radius`, which covers the circle |
| fuori strada, attraverso i campi, verso | off the roads, across, toward | `travel` with `across` or `toward` |
| all'aperto | in the open | in no place: a journey stopped where no region covers the point |
| qui | here | `write … here`: a new place where the journey stopped |

## Development

| Italian | English | In the code |
|---|---|---|
| colleghi | colleagues | the reviewers of [AGENTS.md](../AGENTS.md), in `.claude/agents/` |
| giro | round | the colleagues' review at a milestone |
| comando | command | `defineCommand` in [core/registry.ts](../src/core/registry.ts) |
| meccaniche | core mechanics | the rules cited as `INH-4`, `FOR-7`… |
| decisione | decision | the codes `D-137`… |
| estensione | extension | named in AGENTS.md; no `extensions/` folder in the code yet |
| ambientazione, avventura | setting, adventure | kinds of extension; not the settings of `campaign.yaml` (impostazioni) |
