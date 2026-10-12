<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 b69f95b1 5738adad 781d8fc0 89c84229 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: de complete handleiding

**RPG Engine** laat je een tafelrollenspel spelen met een **AI als spelleider**.

Je praat met de spelleider in een **chat**: de spelleider vertelt het verhaal, speelt alle anderen en beslist wat er gebeurt.

RPG Engine werkt achter de schermen: het **onthoudt de wereld**, **gooit de dobbelstenen** en **houdt de score bij**.

Naast de chat houd je een pagina open in je browser, het **dashboard**, met het karakterblad van je personage, de dobbelstenen, de kaarten en je dagboek.

Deze handleiding is voor spelers: je hoeft niet te kunnen programmeren.

## Snel starten <!-- icon: send -->

1. Installeer **Node.js** van [nodejs.org](https://nodejs.org) (de LTS-versie).
2. Installeer **Claude Code** of **Codex**, de AI-app waarin de spelleider draait, en log in ([2.4](#24-connect-your-ai)).
3. Open een terminal en installeer RPG Engine: `npm install -g rpg-engine`.
4. Maak in de terminal een campagne aan: `rpg init "The Salt Isles"`.
5. Open Claude Code of Codex in de nieuwe map en schrijf *Hoi! Laten we beginnen.* De spelleider antwoordt met de link naar je dashboard. Open die naast de chat.

De rest van deze handleiding legt elke stap uit en daarna hoe je speelt.

## 1. Wat RPG Engine is <!-- icon: about -->

### Wie doet wat

| Wie | Wat doet die |
|---|---|
| **Jij** | Je speelt je personage. Je zegt wat het doet, zegt en probeert. |
| **De spelleider** (de AI) | Vertelt het verhaal, speelt alle andere personages, beslist wat er gebeurt en vraagt om worpen. |
| **RPG Engine** | Onthoudt alles in bestanden, gooit de dobbelstenen, telt hitpoints, geld, tijd en afstanden en houdt geheimen verborgen tot jij ze ontdekt. |

Een AI is goed in verhalen vertellen en slecht in onthouden. Aan zijn lot overgelaten vergeet die wie jou geld schuldig is, hoeveel pijlen je hebt, of dat de brug twee sessies geleden is afgebrand. RPG Engine houdt dat allemaal bij. Zo blijft de wereld van de ene avond op de andere hetzelfde, zelfs in een nieuwe chat, zelfs met een andere AI.

### Hoe het voelt

Je schrijft in de chat, zoals je aan tafel zou praten:

> Ik duw de deur langzaam open en kijk naar binnen.

De spelleider antwoordt met wat je ziet en stopt als het jouw beurt is om te kiezen. Is iets onzeker en belangrijk, dan zegt de spelleider wat er op het spel staat en vraagt om een worp. De knoppen voor die worp verschijnen op je dashboard. Je klikt, de dobbelstenen vallen op de pagina en de spelleider vertelt wat er gebeurt.

### Wat het bijzonder maakt

- **De wereld is blijvend.** Wat gezegd is, blijft waar. Een dode schurk blijft dood.
- **De dobbelstenen zijn echt.** De spelleider kan ze niet buigen (behalve bij de makkelijkste moeilijkheid, als je die kiest).
- **Geheimen blijven geheim.** De spelleider vertelt nooit wat jouw personage niet weet, ook niet als je blijft aandringen.
- **De wereld beweegt zonder jou.** Dreigingen rukken op terwijl je rust of reist, en je ziet de sporen ervan.
- **Veel avonden, één verhaal.** Een campagne is een map op je computer. Je kunt stoppen wanneer je wilt en later verdergaan.

### Het spel dat het nu speelt

RPG Engine is gemaakt voor elk tafelrollenspel. Nu levert het één spelsysteem mee: **vijfde editie** (uit het gratis System Reference Document 5.1). Andere spellen volgen; zie [Spelsystemen](#5-game-systems-and-house-rules) en [Komt later](#9-coming-later).

---

## 2. Aan de slag <!-- icon: path -->

### 2.1 Wat je nodig hebt

- Een computer met Windows, macOS of Linux.
- **Node.js 22** of nieuwer. Haal het op [nodejs.org](https://nodejs.org): de "LTS"-versie is prima. Het wordt geleverd met `npm`, waarmee je RPG Engine installeert.
- Een **terminal**, het venster waarin je commando's schrijft: op Windows de Terminal-app of PowerShell, op macOS Terminal. Je gebruikt die om RPG Engine te installeren, om elke campagne aan te maken en om Claude Code of Codex te starten.
- Een **AI-host**, de app waarin de spelleider draait: **Claude Code** of **Codex**, met bijbehorend abonnement en inlog. Zie [2.4](#24-connect-your-ai).
- Het **grootste model** dat je host aanbiedt. Een klein model laat zich om de tuin leiden: in onze tests vertelde het geheimen aan een speler die beweerde de echte spelleider te zijn.
- Een webbrowser, voor het dashboard.

De inlog van je host doet meer: RPG Engine gebruikt die, op je computer, om afbeeldingen van plaatsen te maken en om het dashboard te vertalen naar talen die het niet meelevert. Zie [Afbeeldingen](#311-pictures) en [Talen](#72-languages).

**Een terminal in een map openen.** Bij veel stappen staat "in de campagnemap". Klik op Windows met de rechtermuisknop op de map in Verkenner en kies **Openen in Terminal**. Klik op macOS met de rechtermuisknop op de map in Finder en kies **Services > Nieuwe terminal bij map**. Of schrijf in een terminal die al open is `cd` en het pad van de map, zoals `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Installeren

Open een terminal en schrijf:

```text
npm install -g rpg-engine
```

Hiermee krijg je het commando `rpg`. Controleer of het gelukt is:

```text
rpg --version
```

Je gebruikt `rpg` één keer per campagne, om die aan te maken. Daarna praat je alleen nog met de spelleider: je AI-host start RPG Engine zelf, met hetzelfde commando `rpg`.

### 2.3 Een campagne aanmaken

Een campagne is een map. Open een terminal in de map waar je je spellen bewaart en schrijf:

```text
rpg init "The Salt Isles"
```

Dit maakt de map `The Salt Isles` met een nieuwe campagne erin en vertelt je wat je daarna moet doen:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

De regels na *For the master* zijn voor de spelleider, die ze in de chat leest: jij hoeft er niets mee te doen. Onthoud waar de map staat: je komt er elke keer naar terug als je speelt. Zonder mapnaam maakt `rpg init` van de map waarin je zit de campagne.

`init` maakt alles wat de campagne nodig heeft: de instellingen, de wereldmappen en de kleine bestanden die je AI-host vertellen dat die RPG Engine moet gebruiken en buiten de campagne geen eigen geheugen moet bijhouden.

Je hoeft nu niets te kiezen. De spelleider vraagt je de rest in de chat, of je kiest het op het dashboard. Weet je al een paar keuzes, dan kun je ze hier meegeven:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Dit maakt de map `salt-isles` met daarin de campagne *The Salt Isles*: een mapnaam zonder spaties en de naam van de campagne zoals je wilt.

| Optie | Wat het instelt | Waarden |
|---|---|---|
| `--name` | De naam van de campagne | alles; de naam van de map als je het weglaat |
| `--language` | De taal van het spel | een code, zoals `en`, `it`, `fr` |
| `--system` | Het spelsysteem | `5e`, nu het enige |
| `--difficulty` | Hoe zwaar de wereld speelt | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Wat neergaan in een gevecht betekent | `narrative`, `epic`, `dice` |

`rpg init --help` toont ze ook. Een campagne kan niet in de map van een andere campagne staan.

Je kunt de spelleider niet vragen een campagne aan te maken: vóór `init` staat er in de map niets dat je AI-host vertelt waar RPG Engine is.

### 2.4 Je AI verbinden

RPG Engine werkt met **Claude Code** en **Codex**. Andere AI-apps die MCP-tools gebruiken werken misschien ook, maar dat garanderen we niet.

**Je host installeren.** Claude Code en Codex draaien in de terminal: het zijn niet de Claude- of ChatGPT-app op je telefoon. Elk heeft een eigen abonnement en inlog nodig: Claude Code een betaald Claude-abonnement, Codex een ChatGPT-login. Volg hun eigen pagina's om ze te installeren en in te loggen: [Claude Code](https://code.claude.com/docs/en/setup) en [Codex](https://learn.chatgpt.com/docs/codex/cli). Dit doe je één keer, voor al je campagnes.

**Claude Code.** Open een terminal in de campagnemap en schrijf `claude`. De eerste keer vraagt het of je de map vertrouwt, en meldt het dat de map de tools van het spel toestaat (`mcp__rpg`): kies **Yes, I trust this folder**. Pas op: het antwoord dat al is geselecteerd is *No, exit*, dus meteen op Enter drukken sluit Claude Code. Verder hoef je niets te doen: de campagne heeft Claude Code al verteld RPG Engine en zijn tools te gebruiken en het eigen geheugen uit te laten.

**Codex.** Open een terminal in de campagnemap en schrijf `codex`. Als het vraagt of je de map vertrouwt, zeg dan ja: de eigen instellingen van de campagne vertellen Codex waar RPG Engine is, staan de tools toe en houden het geheugen uit, en Codex leest ze alleen in een map die je vertrouwt. Controleer in de desktop-app dat het geheugen uit staat voor de chats van het spel.

**Waarom geheugen ertoe doet.** De campagne leeft in haar bestanden. Onthoudt de host daarnaast zelf dingen, dan zou teruggaan naar een opgeslagen spel niet echt teruggaan zijn: de spelleider zou nog weten wat ongedaan is gemaakt.

### 2.5 De eerste chat

Schrijf maar iets, bijvoorbeeld:

> Hoi! Laten we beginnen.

De spelleider leest waar het spel staat en antwoordt. In het eerste antwoord van elke chat geeft de spelleider je de **link naar je dashboard** (iets als `http://127.0.0.1:4750`). Open die in je browser en houd hem het hele spel naast de chat open. Elke campagne houdt dezelfde link van de ene chat tot de volgende, tenzij een ander programma hem heeft ingenomen: dan geeft de spelleider je de nieuwe.

Tussen de berichten van de spelleider toont je host de tools die de spelleider gebruikt, in korte regels. Open de details ervan niet (in Claude Code: ctrl+o): daarin kan staan wat de spelleider schrijft, geheimen inbegrepen.

Een nieuwe campagne doorloopt drie fasen, zoals een spel met een menselijke spelleider. Het dashboard toont ze bovenaan als *1 Instellingen · 2 Sessie nul · 3 Spelen*:

1. **Instellingen**: je kiest hoe je wilt spelen. Buiten het verhaal.
2. **Sessie nul**: je maakt je personage, al spelend.
3. **Spelen**: het verhaal.

### 2.6 Instellingen: kiezen hoe je speelt

De spelleider vraagt alleen wat nog ontbreekt, een paar vragen tegelijk. Schrijf je "jij beslist", dan kiest de spelleider en vertelt wat er gekozen is. Met het dashboard open toont de eerste stap, **Instellingen**, dezelfde vragen als kaarten: één vraag tegelijk, elke waarde met wat die betekent, de gebruikelijke gemarkeerd met **Aanbevolen**. Kies daar, dan vraagt de spelleider het niet nog eens in de chat; met **Overslaan** bewaar je een vraag voor later. De chat regelt wat alleen met woorden kan: het uitgangspunt van een nieuwe wereld, de taal en de afbeeldingen, waar de spelleider alleen naar vraagt als je computer ze kan maken. Daarom stelt de pagina minder vragen dan de tabel hieronder opsomt.

Je hoeft de tabel niet te bestuderen: hij is om iets in op te zoeken. Je kunt al deze instellingen later wijzigen, in de chat of in de **Instellingen** van het dashboard. Een wijziging geldt vanaf het volgende antwoord van de spelleider.

| Instelling | Wat het bepaalt | Waarden | Aanbevolen |
|---|---|---|---|
| **Mentor** (gevraagd als "Hoe goed ken je dit spel?") | Hoeveel de spelleider je de regels leert, buiten het verhaal | **uit** (alleen het verhaal; vraag tussen haakjes wanneer je wilt), **hints** (een korte tip voor belangrijke keuzes en wanneer een regel gemist wordt), **tutorial** (elke regel de eerste keer uitgelegd, de hele som van elke worp, een korte nabespreking na gevechten) | uit je antwoord: nooit gespeeld → tutorial, een beetje → hints, ik ken het → uit |
| **Moeilijkheid** | Hoe zwaar de wereld speelt: gevechten, tactieken van vijanden, aanwijzingen, schatten, hoe snel dreigingen oprukken | story, easy, normal, hard, brutal | |
| **Dodelijkheid** | Wat neergaan in een gevecht betekent | **narrative** (je personage sterft nooit), **epic** (sterft alleen als het ertoe doet voor het verhaal), **dice** (de dobbelstenen beslissen) | volgt de moeilijkheid: story → narrative, easy → epic, normal en hoger → dice |
| **Opgeslagen spellen** | Wanneer je terug mag gaan | **permadeath** (nooit; alleen de campagne opnieuw beginnen), **checkpoint** (terug naar het laatste einde van een scène, alleen als je personage sterft), **free** (terug naar elk opgeslagen spel, en opslaan wanneer je erom vraagt) | checkpoint |
| **Strengheid** | Hoe nauw eten, licht, vermoeidheid, draaggewicht, spreukcomponenten en reizen de regels volgen | **smooth** (de spelleider gaat er luchtig overheen), **rules** (zoals geschreven: fakkels doven, rantsoenen raken op), **simulation** (voorbij de regels: slijtage, bederf, weer) | smooth |
| **Dobbelstenen** | Wie de dobbelstenen van je personage gooit | **digital** (RPG Engine gooit ze, op de pagina), **physical** (je gooit zelf en zegt de uitkomsten) | |
| **Eenheden** | Afstanden en gewichten in het verhaal | metrisch, imperiaal | |
| **Metgezellen** | Wie met je meereist | geen, gemaakt met jou in sessie nul, gemaakt door de spelleider, ontmoet tijdens het spel | |
| **Afbeeldingen** | Afbeeldingen van plaatsen en missies | geen, op verzoek, nieuwe plaatsen en missies | eenmaal gevraagd, alleen als je computer ze kan maken |
| **Grenzen** | Wat nooit in het spel voorkomt | een lijst, of geen | |
| **Sluiers** | Wat mag gebeuren, maar alleen buiten beeld | een lijst, of geen | |
| **Taal** | De taal van het spel en het dashboard | elke | gehaald uit hoe je schrijft, en bevestigd |

Het spelsysteem kan eigen instellingen toevoegen. De vijfde editie voegt **voortgang** toe: hoe je personage een niveau stijgt, met **ervaringspunten** of bij **mijlpalen** van het verhaal.

**Wat de moeilijkheid in het spel betekent.** Story: zwakke, naïeve tegenstanders, duidelijke aanwijzingen, alles in overvloed; de spelleider mag de eigen worpen verzachten. Easy: simpele tegenstanders, ruime middelen. Normal: verstandige tegenstanders, drie aanwijzingen bij elke conclusie, standaardprijzen en -schatten. Hard: slimme tegenstanders, subtiele aanwijzingen, schaarse middelen, dreigingen die snel oprukken. Brutal: tegenstanders die een hinderlaag leggen, zich terugtrekken en gevallenen afmaken, zeer schaarse middelen, de strengste rustperiodes. Gevechten zijn altijd afgestemd op je groep zoals die nu is.

**Zonder een uitgeschreven wereld** vraagt de installatie nog twee dingen:

- **Uitgangspunt**: het genre, de toon en een paar elementen van de wereld, in je eigen woorden. Bijvoorbeeld: *"Low fantasy, grimmig maar met hoop. Een rivierstadje, een spookachtige doorwaadbare plaats, een sekte in de heuvels."*
- **Voorbereiding**: **on the fly** (de spelleider bouwt elk deel van de wereld vlak voordat je het nodig hebt; aanbevolen) of **all at the start**.

Daarna stelt de spelleider een naam voor de campagne voor. Als er niets meer ontbreekt en jij zegt dat je klaar bent, gaat het spel naar sessie nul.

### 2.7 Sessie nul: je personage

Sessie nul is spelen: je maakt je personage samen met de spelleider, zoals aan tafel.

- **Elke keuze is aan jou**, tenzij je de spelleider vraagt die te maken. Je kunt komen met een volledig idee ("een halfelf-cleric die haar tempel verliet"), een vaag idee ("iemand die heelt, maar er niet aardig bij is") of niets ("verras me, en laat me dan dingen aanpassen").
- **Eigenschapswaarden.** De spelleider vertelt je de methode en het vangnet voordat er een dobbelsteen wordt gegooid. In de vijfde editie: de standaardreeks, point buy of 4d6 met weglating van de laagste. De methode waarover je het eens wordt, blijft bij de afspraken van de tafel.
- **Je verhaal** is nooit verplicht. Geef je er een, dan schrijft de spelleider het in jouw woorden, leest het je eenmaal terug en verbindt de mensen en plaatsen ervan met de wereld. Je kunt het ook op het dashboard schrijven (zie [Groep](#party)).
- **Persoonlijkheid** (vijfde editie): een eigenschap, een ideaal, een band en een gebrek, uit de tabellen van je achtergrond of van jezelf.
- **Een afbeelding.** Zodra je personage klaar is, vraagt de spelleider je om een afbeelding ervan: een bestand op je computer. Kan je AI-host zelf afbeeldingen maken, dan kan de spelleider aanbieden er een te maken.

De getallen op het karakterblad rekent RPG Engine uit je keuzes uit: je hoeft nooit te rekenen. Als de personages klaar zijn en jij bevestigt, begint het verhaal.

---

## 3. Spelen <!-- icon: chat -->

### 3.1 Praten met de spelleider

Schrijf wat je personage doet of zegt, in je eigen woorden. Kort is prima.

> Ik vraag de herbergier wie er vanavond nog meer langskwam.
>
> "We komen niet voor problemen," zeg ik, mijn hand weg van mijn zwaard.
>
> Ik klim op het dak en wacht.

**Buiten het verhaal** schrijf je tussen vierkante haken:

> [Hoe werkt grijpen?]
>
> [Kan ik mijn reactie deze ronde nog gebruiken?]
>
> [Laten we hier stoppen voor vanavond.]

De spelleider antwoordt ook tussen haken en gaat dan terug naar het verhaal.

**Jij zegt wat je probeert; de spelleider zegt wat er gebeurt.** Iets wat de logica van de wereld of reeds vastgelegde feiten schendt, gebeurt niet: de spelleider vertelt je dat, binnen het verhaal, en biedt aan wat wel kan.

**De spelleider beslist nooit voor je personage.** Die laat je niet spreken, voelen of kiezen. Bij twijfel vraagt de spelleider het.

**De spelleider praat nooit over de motor.** Vraag of de spelleider dingen bijhoudt en je krijgt een antwoord als van een spelleider: "Ik houd alles bij: de volgende keer gaan we hier verder."

**Je kunt de spelleider vragen hoe je het dashboard gebruikt.** Die kent de pagina: "Waar zie ik mijn spreuken?", "Hoe gooi ik met de hand?"

### 3.2 Worpen

**Wanneer er een worp is.** De spelleider vraagt alleen om een worp als de uitkomst onzeker is en ertoe doet. Anders zegt de spelleider ja, of "ja, maar". Vóór je worp zegt de spelleider wat er op het spel staat en welke proeven passen, en stopt dan. Jij gooit, of bedenkt je:

> **Spelleider:** De richel is smal en nat. Als je uitglijdt, is het een lange val naar de rivier. Een proef Behendigheid (Acrobatiek), of je kunt teruggaan en de trap zoeken.
>
> **Jij:** Ik probeer het.

**Gooien op het dashboard.** Als de spelleider erom vraagt, verschijnt bovenaan de pagina een banner met een knop voor elke proef, bijvoorbeeld *Acrobatiek +4 · met voordeel*. Klik erop: de dobbelstenen vallen op de pagina en de spelleider hoort de uitkomst. Je kunt ook:

- op de bijbehorende regel van je karakterblad klikken, die goud oplicht;
- de juiste dobbelstenen uit de dobbelbak gooien;
- in plaats daarvan je eigen woorden in de banner schrijven, als je iets anders wilt doen.

**Met de hand gooien.** Als je de dobbelstenen liever zelf kiest, zet dan **Met de hand** aan in de hoek van de banner (of in **Instellingen**). De knop van de proef verdwijnt en de banner zegt wat je moet gooien, zoals een spelleider dat zou doen: *Gooi Acrobatiek zelf, op je karakterblad of met de dobbelstenen.* Klik op de regel van je karakterblad die oplicht, of gooi de juiste dobbelstenen uit de dobbelbak: RPG Engine gooit ze, telt je bonus erbij op en de spelleider hoort de uitkomst. Een proef die noch je karakterblad noch de dobbelbak kan doen, zoals schade waarbij je 1'en opnieuw gooit, houdt zijn knop. Met de hand blijft aan in deze browser tot je het uitzet.

**Fysieke dobbelstenen voor het hele spel.** Staat de instelling **Dobbelstenen** op physical, dan vraagt de spelleider je worpen in woorden en schrijf jij de uitkomsten die je gooide:

> [Ik gooide een 14.]

RPG Engine telt je modifiers erbij op en weigert een uitkomst die je dobbelstenen niet kunnen tonen.

**Vrije worpen.** Klik op een willekeurig getal op je karakterblad, of open de dobbelbak, om voor de lol te gooien. Vrije worpen tellen nooit mee, worden nooit vastgelegd en de spelleider ziet ze nooit. Een vrije 20 wordt later nooit een echte.

**De worpen van de spelleider.** De spelleider gooit ook voor vijanden en anderen met RPG Engine. De meeste worpen verschijnen in je worpenkolom. Als je een uitkomst niet mag zien, gooit de spelleider in het geheim. Je kunt het altijd vragen:

> [Was die worp echt?]

Bij een getoonde worp geeft de spelleider de getallen en de reden. Bij een geheime een vingerafdruk die bewijst dat de worp is gedaan voordat je het vroeg.

**Worpen in de chat** verschijnen tussen haken, direct na het moment dat ze beslissen: *[Overtuigen 14 + 3 = 17]*. Daarna vertelt het verhaal de uitkomst.

### 3.3 Scènes en gevechten

De spelleider leidt het verhaal in **scènes**: een gevecht, een gesprek, verkennen, reizen, een rustperiode, een uitdaging (een achtervolging, een race, een puzzel). Jij hoeft ze niet te beheren: zo houdt RPG Engine de hoofdstukken van het verhaal bij. Aan het einde van elke scène slaat het spel vanzelf op, en de scène komt in het verhaal van je dagboek.

**In een gevecht** vertelt de spelleider alle beurten die niet de jouwe zijn, na elkaar, met elke worp, en **stopt waar jij kunt beslissen**: jouw beurt, een reactie, een keuze. Zeg op je beurt wat je doet:

> Ik werp Sacred Flame op degene bij de deur.

Het onderdeel **Gevecht** van het dashboard toont de volgorde van de beurten, wie aan de beurt is, de hitpoints van je groep en hoe gewond de vijanden eruitzien (ongedeerd, gewond, bloedend, neergegaan: in woorden, nooit in getallen). Valt je personage neer, dan verschijnen de dodelijke-redding-worpen groot op de pagina.

**Als het gevecht al beslist is**, kan de spelleider aanbieden de rest in één bericht te vertellen.

### 3.4 Tijd, reizen en de wereld die beweegt

**Tijd.** Elke actie kost tijd in het verhaal, en RPG Engine houdt de datum bij: dag 3, vroege ochtend. De spelleider vertelt de tijd zoals de wereld die meet: dageraad, de derde klok, vallende avond. Tussen sessies verstrijkt geen tijd: je gaat verder waar je stopte.

**Rust.** Zeg dat je rust, en de spelleider past toe wat een rustperiode teruggeeft, zoals hitpoints en spreukplaatsen:

> We slaan ons kamp op en nemen een lange rust.

**Reizen.** Zeg waarheen je wilt:

> We nemen de weg naar het noorden, naar Rocca.

RPG Engine rekent de route, de afstand en de dagen uit op jouw tempo en brengt je erheen. Een reis stopt wanneer er onderweg iets geplands gebeurt, aan het eind van de reis van elke dag en bij aankomst. Je kunt vragen hoe ver een plaats weg is voordat je vertrekt:

> [Hoe ver is Rocca, en hoe lang duurt het te voet?]

**De wereld beweegt zonder jou.** Schurken hebben plannen met deadlines en klokken. Elke nieuwe dag laat de spelleider de dreigingen opschuiven die de tijd heeft laten oprukken, en je ziet de tekenen: een gerucht, een spoor, een verandering in de stad. De klok zelf zie je nooit, alleen wat die achterlaat.

**Geld** wordt geteld in de munten van het spel. Betalen, verkopen, betaald krijgen: RPG Engine geeft het wisselgeld.

### 3.5 Kaarten

**De wereldkaart** (dashboard: **Wereld**) toont alleen de plaatsen die je personage kent, met de wegen ertussen, het pad dat je hebt gelopen en de mist over al het andere. Klik op een plaats om te zien wat je ervan weet en hoe ver het is.

**De kaart van een plaats** (dashboard: **Scène**, en **Gevecht** in een gevecht) verschijnt wanneer de spelleider er een tekent voor waar je bent: muren, deuren, de grond en wie waar staat, als pionnen. In een gevecht zijn op jouw beurt de vakjes die je niet kunt bereiken versluierd, zodat je in één oogopslag ziet waar je heen kunt. Vraagt de spelleider waarheen je personage zich verplaatst, dan opent de pagina de kaart en tik je op een vakje, of schrijf je het, zoals *E4*.

### 3.6 Missies, dagboek en notities

**Missies.** Als je personage een taak aanneemt, wordt dat een missie in je **Dagboek**: wie hem gaf, waar, tegen wanneer, de doelen als lijst en wat hij meet (een deadline met de resterende tijd, een klok, een telling). Markeer er een met de ster om hem te volgen: hij blijft klein bovenaan bij Scène staan, met het volgende doel. De missie eindigt wanneer het verhaal hem beëindigt, nooit vanzelf.

**Het verhaal.** Het tabblad Verhaal van het Dagboek is je campagne als tijdlijn: elke scène een hoofdstuk, met plaats, datum en een korte samenvatting, de laatste eerst.

**Je notities.** In het tabblad Notities van het Dagboek schrijf je je eigen notities: theorieën, namen, plannen. Ze blijven op je computer en de spelleider leest ze niet, tenzij je er een **Delen** laat. Een gedeelde notitie bereikt de spelleider bij het volgende antwoord als wat jij denkt, nooit als een feit. Jouw theorie wordt niet waar doordat je haar opschreef. Een notitie die vraagt om bepaalde inhoud te stoppen of te vermijden, telt alsof je het aan tafel had gezegd.

### 3.7 Het verhaal en de afbeelding van je personage

Op het karakterblad van je personage heeft de kaart **Beschrijving** een vak om het verhaal van je personage te schrijven. Verstuur het, en de spelleider schrijft het in eigen woorden in het personage, nadat jij ja hebt gezegd.

Voor de afbeelding van je personage geef je de spelleider in de chat een afbeeldingsbestand, met waar het op je computer staat (PNG, JPEG, WebP of SVG, tot 5 MB):

> [Hier is het portret van mijn personage: C:\Users\me\Pictures\mira.png]

De spelleider kopieert het naar de campagne en het verschijnt op de pion van je personage op het dashboard. Je kunt het op dezelfde manier wijzigen wanneer je wilt. RPG Engine zelf tekent alleen plaatsen en missies (zie [Afbeeldingen](#311-pictures)).

### 3.8 Opgeslagen spellen en teruggaan

RPG Engine slaat de hele campagne **aan het einde van elke scène** vanzelf op. Wat je met die opgeslagen spellen kunt doen, hangt af van de instelling **Opgeslagen spellen**:

| Opgeslagen spellen | Opslaan wanneer je wilt | Teruggaan |
|---|---|---|
| **permadeath** | nee | nooit; je kunt de campagne alleen opnieuw beginnen |
| **checkpoint** | nee | naar het laatste opgeslagen spel, alleen als je personage sterft |
| **free** | ja | naar elk opgeslagen spel, wanneer je wilt |

In elke modus kun je **opnieuw beginnen**: vanaf het begin van het spel met hetzelfde personage, of vanaf sessie nul met een nieuw personage.

Dit alles kun je in de chat doen ("[Laten we teruggaan naar voor het duel.]") of in het onderdeel **Opgeslagen spellen** van het dashboard.

**Open na het teruggaan een nieuwe chat.** De chat waarin je speelde, onthoudt wat ongedaan is gemaakt. Open een nieuwe chat met de spelleider (`/clear` in Claude Code, `/new` in Codex), schrijf *verder*, en druk dan bij Opgeslagen spellen op **Ik heb een nieuwe chat geopend**, of vertel het de spelleider in de nieuwe chat. Hervat de oude chat nooit. Tot je het bevestigt, gaat de spelleider niet verder.

### 3.9 Sessies: stoppen en terugkomen

**Jij beëindigt de sessie** wanneer je wilt:

> [Laten we hier stoppen voor vanavond.]

Er is geen "opslaan en afsluiten": alles staat al in de bestanden.

**Om de chat te sluiten** schrijf je `/exit` in Claude Code of `/quit` in Codex. Het dashboard wordt stil tot de volgende chat.

**Om terug te komen** open je een terminal in de campagnemap (die `init` heeft getoond), start je je host daar en schrijf je *verder*. De spelleider leest waar het spel staat, geeft een korte samenvatting en begint met iets dat gebeurt. Een nieuwe chat verliest niets: de campagne leeft in haar bestanden, niet in de chat.

De spelleider stelt aan het einde geen routinevragen. Alleen als de spelleider merkte dat iets niet werkte, vraagt die het kort.

### 3.10 De stemming van de spelleider

Bovenaan het dashboard staat de avatar van de spelleider, een klein robotje. Zijn gezicht volgt de toon van het verhaal: bezorgd als het gevaar groeit, verrukt bij een gedurfd idee, verrast bij een wending. Het reageert even op een natuurlijke 20 of een natuurlijke 1. Het toont nooit wat je nog niet weet: geen grijns voordat de val is dichtgeklapt. De pionnen van je groep tonen ook hun stemming. Als de chat gesloten is, slaapt het robotje.

### 3.11 Afbeeldingen

RPG Engine kan voor elke plaats die je bereikt en elke missie die je aanneemt een afbeelding laten maken, zoals de instelling **Afbeeldingen** zegt. Het gebruikt wat er al op je computer staat:

- **Codex**, met je ChatGPT-login: een geschilderde afbeelding.
- Anders **Claude Code**, met je Claude-login: een tekening.

De afbeelding gebruikt je eigen abonnement, niet het onze. Het onderdeel **Instellingen** vertelt je of er op je computer afbeeldingen gemaakt kunnen worden, en zo niet, welke stappen je moet nemen om het in te richten. Zonder afbeeldingen toont de pagina in plaats daarvan het teken van elk soort plaats. Je kunt de spelleider ook een eigen afbeelding geven voor elke plaats of elk personage.

### 3.12 Veiligheid: grenzen, sluiers en stop

- **Grenzen**: wat nooit in het spel voorkomt.
- **Sluiers**: wat mag gebeuren, maar alleen buiten beeld.
- **Stop**: op elk moment kun je een inhoud stoppen, zonder uitleg. Schrijf het buiten het verhaal:

> [stop]

De spelleider laat het meteen vallen en voegt het toe aan je grenzen, voor alle sessies die komen. Je kunt je grenzen en sluiers bekijken en wijzigen in **Instellingen**.

### 3.13 Van gedachten veranderen

Elke instelling kan tijdens de campagne veranderen: in de chat ("[Laten we het moeilijker maken.]") of in **Instellingen**. De spelleider hoort van een wijziging bij het volgende antwoord. Een uitspraak die de spelleider deed zonder het boek wordt een **precedent** en blijft bewaard, zodat dezelfde vraag de volgende keer hetzelfde antwoord krijgt.

---

## 4. Het dashboard, onderdeel voor onderdeel <!-- icon: party -->

Het dashboard is een pagina op je eigen computer. De spelleider geeft je de link aan het begin van elke chat. Het volgt het spel live: als de spelleider iets verandert, verandert de pagina mee.

Alleen de browser van de computer waarop je speelt kan hem openen: geen telefoon of tablet, ook niet op hetzelfde wifi. De pagina past ook in een smal venster: dan verhuizen de onderdelen naar een balk onderaan en de pictogrammen naar een menu.

De pagina leeft zolang de chat. Sluit je de chat, dan toont een geopend gelaten pagina *Niet verbonden* met het karakterblad zoals het was, en valt het robotje van de spelleider in slaap; open je weer een chat in de campagne, dan komt de pagina vanzelf terug zodra de spelleider heeft geantwoord.

### Bovenaan

- De **avatar van de spelleider**, met zijn stemming.
- De naam van de campagne, het spelsysteem, de **speltijd** en of het spel **verbonden** is (de chat verbonden).
- De onderdelen: **Groep**, **Scène**, **Gevecht** (alleen tijdens een gevecht), **Dagboek**, **Wereld**; aan het eind van de rij, als pictogrammen: **Opgeslagen spellen**, **Help**, **Instellingen**, **Over**.
- Het lichte en donkere thema, rechtsboven.

Als de spelleider je iets vraagt, blijft de banner bovenaan de pagina staan, in welk onderdeel je ook bent.

### Groep

Het karakterblad van je personage en dat van je metgezellen. Elk deel van het karakterblad is een kaart die je kunt openen en sluiten.

- **Klik op een getal** om er voor de lol mee te gooien. Wijs een getal aan om te zien hoe het is opgebouwd ("+5: Wijsheid +3, bekwaamheid +2").
- **Hitpoints, plaatsen en gebruiken** worden getoond als balken en stipjes.
- **Toestanden en effecten** worden getoond met hoe lang ze duren.
- **Beschrijving** bevat de tekst van je personage en het vak om de spelleider het verhaal van je personage te sturen.
- Bij 0 hitpoints verschijnen de **dodelijke-redding-worpen** groot onder de naam.
- Naast het karakterblad (eronder op een smal scherm): **de worpen**, nieuwste eerst, die van jou en die van de spelleider die je mag zien. **Wissen** maakt de lijst leeg; **Herstellen** brengt hem terug. Vrije worpen staan gestippeld en gedimd.

Een metgezel met een stat block, zoals een wolf, toont zijn stat block in plaats van een volledig karakterblad.

### Scène

Waar je groep is: de afbeelding en naam van de plaats, de plaatsen eromheen, de kaart van de plaats als die er is, wie er zijn, en de open scène met wat er nu gebeurt. De missie die je volgt staat bovenaan.

### Gevecht

Alleen tijdens een gevecht. Bovenaan: de ronde, wie er handelt, wie er daarna komt. Daaronder: de volgorde van de beurten, elke strijder met zijn toestand, je groep in getallen en de vijanden in woorden; wat je personage bij de hand heeft (Classe Armatura, hitpoints, aanvallen); de kaart van de plaats, met degene die aan de beurt is omcirkeld. Op jouw beurt pulseert de link naar Gevecht goud, waar je ook bent.

### Dagboek

Drie tabbladen:

- **Missies**: actief, voltooid en mislukt, elk als kaart met zijn doelen, zijn deadline als timer en zijn klokken. De ster volgt een missie.
- **Verhaal**: de hoofdstukken van de campagne, scène voor scène, de laatste eerst.
- **Notities**: je eigen notities, privé tot je er een deelt.

### Wereld

De wereldkaart zoals je personage hem kent, met de mist over de rest. Sleep om te verplaatsen, gebruik het wiel of knijp om te zoomen. Klik op een plaats voor de kaart ervan. Een lijst van de plaatsen, de dichtstbijzijnde eerst, staat ernaast. Bij meer dan één kaart (een stad, een continent, een ander vlak) schakel je er met tabbladen tussen.

### De dobbelbak

De dobbelknop opent de dobbelbak: kies dobbelstenen en een modifier, en gooi. Bij twee of meer dobbelstenen van een soort kies je welke tellen: **Alle**, **Hoogste** (alleen de hoogste) of **Laagste** (alleen de laagste). De dobbelstenen die je koos blijven staan tot je op **Wissen** drukt, zodat dezelfde schadeworp elke ronde één klik is. Terwijl de spelleider om een worp vraagt, vertelt de dobbelbak welke dobbelstenen daarop antwoorden.

### Opgeslagen spellen

Je opgeslagen spellen, nieuwste eerst, elk met zijn plaats, de speldatum en wanneer het is gemaakt. **Nu opslaan** (bij vrij opslaan), **Ga hierheen terug** en **Opnieuw beginnen**, in rood, in twee stappen. Zie [Opgeslagen spellen en teruggaan](#38-saves-and-going-back).

### Instellingen

Je instellingen, in groepen: het spel, het spel leren (de mentor en de regels die je al zijn uitgelegd), dobbelstenen en maten, beperkingen (grenzen en sluiers), afbeeldingen, taal. Klik op een waarde om te kiezen; eronder staat wat ze betekent. Daarna de eigen voorkeuren van de pagina, alleen in deze browser bewaard: het thema, het geluid van de dobbelstenen, de **dobbelsteenset** (hars, metaal, hout, steen), afgeronde of scherpe randen, met de hand gooien.

De eigen instellingen van de spelleider, zoals huisregels en precedenten, staan hier niet: die blijven in de chat.

### Help en Over

**Help**: deze handleiding. **Over**: wat RPG Engine is, de links, de licenties en de credits van het spelsysteem.

### Vóór het spel: Instellingen en sessie nul

Zolang een nieuwe campagne in de eerste stap, **Instellingen**, zit, stelt de hele pagina haar vragen: één tegelijk, elk met wat de waarden betekenen en de aanbevolen. Met **Jij beslist** laat je een vraag aan de spelleider over, behalve grenzen en sluiers, die altijd van jou zijn; met **Overslaan** bewaar je hem voor later. Aan het eind: **Ik ben klaar**.

### Berichten van de pagina

Soms toont de pagina een melding over zichzelf heen: een probleem in de bestanden van de campagne (de spelleider lost het op), het spel is weg (de chat is gesloten), de pagina wordt vertaald.

---

## 5. Spelsystemen en huisregels <!-- icon: dice -->

### 5.1 Wat een spelsysteem is

Een spelsysteem is de data van één spel: het karakterblad, de getallen, de wezens, voorwerpen, spreuken en regeltekst. Elke campagne speelt één systeem.

RPG Engine rekent je karakterblad uit en wat er wordt uitgegeven en terugkomt, zoals hitpoints en spreukplaatsen, zoals een digitaal karakterblad dat doet. Hoe een eigenschap of een spreuk werkt, leest de spelleider in de regels en beslist die, zoals aan tafel.

### 5.2 Vijfde editie, meegeleverd

RPG Engine levert **5e** mee, uit het System Reference Document 5.1 (de regels van 2014, gratis onder Creative Commons). Het bevat:

- de rassen, klassen, subklassen, een achtergrond en een feat uit de SRD;
- de 319 spreuken, de wapens, pantsers en uitrusting, de magische voorwerpen en de monsters uit de SRD;
- de regelhoofdstukken, die de spelleider opzoekt op hun exacte tekst;
- het volledige karakterblad, uitgerekend: eigenschapsmodifiers, tiro salvezza, vaardigheden, Classe Armatura, aanvallen, spreukredding-DC, plaatsen, hit dice, eigenschappen per niveau, ervaring en niveaustijging;
- rustperiodes die teruggeven wat ze moeten; toestanden met hun regeltekst; herinneringen voor concentratie.

**Inhoud voorbij de SRD.** Je kunt de vijfde editie spelen met inhoud die de SRD mist, zoals een klasse of een monster uit een boek dat je bezit. De spelleider kent het spel, kan je handboeken lezen en kan op het web zoeken. Die schrijft wat nodig is als pagina's van je campagne, en RPG Engine werkt er op dezelfde manier mee. Wat wij meeleveren is beperkt door zijn licentie; wat jouw spelleider weet niet.

RPG Engine is compatibel met de vijfde editie.

### 5.3 Huisregels en je eigen toevoegingen

Je hoeft geen bestand aan te raken. Vraag het de spelleider:

> [Huisregel: een natuurlijke 1 bij een aanval betekent dat je je wapen laat vallen.]
>
> [Ik wil graag een Blood Hunter spelen. Ik heb het boek: hier zijn de klasse-eigenschappen.]
>
> [In deze campagne duurt een korte rust 10 minuten.]

De spelleider legt ze vast in je campagne, op een van deze manieren:

- **Een afspraak van de tafel**, in woorden, zoals het laten vallen van het wapen of de korte rust hierboven. De spelleider bewaart die bij de instellingen van de campagne en speelt er vanaf dan naar. Een uitspraak die de spelleider zonder het boek doet, wordt op dezelfde manier bewaard, als **precedent**.
- **Een nieuwe pagina**, zoals een klasse, een ras of een voorwerp. Een nieuwe klasse werkt zoals die van het systeem: je niveau, hit dice en eigenschappen tellen mee. Een nieuw ras kan voortbouwen op een bestaand ("zoals de Elf, plus…"); een zwaard met een naam kan voortbouwen op het Longsword.
- **Nieuwe getallen voor het karakterblad**: een veld, een tabel, een formule, een teller die een rustperiode terugbrengt. Bijvoorbeeld de superiority dice van een Battle Master, die bij een korte rust terugkomen. Een huisregel kan ook een van de formules van het systeem vervangen.

Heb je huisregels al uitgeschreven, dan kun je ze ook als tekstbestanden in de map `rules` van de campagne zetten (zie [de campagnemap](#8-for-the-curious-the-campaign-folder)): de spelleider leest ze vóór de regel van het boek met dezelfde naam.

### 5.4 Je eigen spelsysteem toevoegen of importeren

Nu speelt RPG Engine alleen de vijfde editie. Andere spelsystemen volgen, en ook een manier om je eigen toe te voegen, of om een spel dat je bezit om te zetten naar een systeem aan de hand van de handboeken. Zie [Komt later](#9-coming-later).

---

## 6. Extensies <!-- icon: plus -->

**Extensies zijn er nog niet.** Een extensie voegt iets toe aan een campagne bovenop het spelsysteem: een wereld, een avontuur, een functie zoals het weer of een tarotspel, huisregels om te delen. Jij kiest welke elke campagne gebruikt. De eerste die voor de vijfde editie gepland zijn, zijn weer en sloten openen.

---

## 7. Waar een campagne vandaan komt, en haar taal <!-- icon: world -->

### 7.1 Drie manieren om een wereld te hebben

**Onderweg gemaakt.** Je geeft bij de installatie een uitgangspunt, en de spelleider bouwt de wereld al spelend: elke plaats, persoon en intrige vlak voordat je ze nodig hebt, en vanaf dan bewaard. Dit is de snelste manier om te spelen: installeren, aanmaken, en binnen een paar minuten maak je je personage. Niets wat verzonnen is gaat verloren: eenmaal gezegd wordt het opgeschreven en blijft het waar.

**Vooraf voorbereid.** Hetzelfde uitgangspunt, maar met **voorbereiding: all at the start** bouwt de spelleider de plaatsen, facties, dreigingen en hun plannen van de wereld voordat het spel begint. De eerste sessie begint later, met meer klaar achter de schermen.

**Uit een bestaande campagne of een bestaand avontuur.** Nu is er geen importknop. Geef de spelleider je avontuur (een tekst of een pdf die je host kan lezen) en vraag het in te richten:

> [Ik heb dit avontuur als pdf. Richt het in als onze campagne: lees het en schrijf de plaatsen, personages en geheimen ervan uit. Vertel me niets van wat erin staat.]

De spelleider leest het met de tools van je AI-host en schrijft het uit als pagina's van de campagne, geheimen inbegrepen, die jij al spelend zult ontdekken. Claude Code leest pdf's; met Codex is een tekst- of markdownbestand de veiligere keuze. Doe dit tijdens de installatie, vóór sessie nul.

Terwijl de spelleider werkt, open je de details van wat die leest of schrijft niet (in Claude Code: ctrl+o): ze tonen de tekst van het avontuur, geheimen en al. De spelleider zelf houdt de geheimen, zoals altijd.

Zodra de campagne eigen pagina's heeft, vraagt de installatie niet meer om een uitgangspunt en een voorbereiding. Ook in een uitgeschreven campagne maakt de spelleider, als je ergens heen gaat dat de tekst niet dekt, aan wat nodig is en legt het vast.

**Een campagne speel je eenmaal.** Wil je hetzelfde avontuur opnieuw spelen, maak dan een nieuwe campagne aan. Binnen een campagne kun je nog steeds teruggaan naar een opgeslagen spel of opnieuw beginnen, zoals de instelling Opgeslagen spellen toestaat.

### 7.2 Talen

**Eén taal per campagne**: die van de spelleider. De spelleider schrijft erin en het dashboard volgt. De spelleider haalt haar uit hoe je schrijft en bevestigt haar.

**Het dashboard** wordt geleverd in het Engels en Italiaans (verzorgd) en in 24 andere talen: Frans, Duits, Spaans, Portugees (Braziliaans), Nederlands, Zweeds, Noors, Deens, Fins, IJslands, Russisch, Oekraïens, Pools, Tsjechisch, Roemeens, Hongaars, Grieks, Turks, Arabisch, Hebreeuws, Hindi, Chinees, Japans, Koreaans. Arabisch en Hebreeuws lezen van rechts naar links: de pagina spiegelt, terwijl de kaarten en de dobbelstenen blijven zoals getekend.

**Elke andere taal** die je in Instellingen kiest, wordt op je computer op de achtergrond vertaald door Codex of Claude Code met je eigen login, te beginnen met het onderdeel dat je open hebt. Het gebeurt één keer per taal, voor al je campagnes. Tot het klaar is, staat de pagina in het Engels. Instellingen vertelt je of de vertaling bezig is, klaar is, of niet mogelijk is op je computer.

**De woorden van het spel.** De vijfde editie brengt haar eigen termen in het Italiaans mee uit de officiële Italiaanse SRD, zodat Italiaanse spelers *Classe Armatura*, *tiro salvezza*, *vantaggio* lezen. Andere talen krijgen de termen van het systeem vertaald.

**De eigen tekst van het spelsysteem** (de spreuken, de monsters, de regelhoofdstukken) blijft Engels. De spelleider leest hem en vertelt hem je in jouw taal.

**Van taal wisselen halverwege de campagne** laat de al geschreven pagina's zoals ze zijn; de spelleider schrijft nieuwe in de nieuwe taal.

---

## 8. Voor de nieuwsgierigen: de campagnemap <!-- icon: list -->

Je hoeft hem nooit te openen. Doe je het toch, weet dan dat **hij de geheimen** van je campagne bevat: hem lezen bederft het spel.

Een campagnemap bevat:

- `campaign.yaml`: je instellingen;
- `state.yaml`: waar het spel nu staat: de fase, de datum, de open scène;
- `world/`: één pagina per personage, plaats, factie, missie, voorwerp, gebeurtenis, onderwerp of wezen, als markdownbestanden;
- `rules/`: je huisregels als tekstbestanden, als je er toevoegt (`init` maakt hem niet aan);
- `images/`: de afbeeldingen, zodra er zijn;
- `log.jsonl`: elke wijziging, op volgorde;
- `.saves/`: de opgeslagen spellen, vanaf de eerste;
- `.player/`: je eigen notities uit het Dagboek, die de spelleider niet leest;
- `sessions/`: bijgehouden door RPG Engine;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: de kleine bestanden die AI-hosts vertellen waar RPG Engine is en hun geheugen uit houden. RPG Engine houdt ze up-to-date; laat ze zoals ze zijn.

De pagina's zijn gewone markdown met links als `[[Rocca]]`, het formaat van Obsidian: het notitieboek van de spelleider kan daar worden geopend. **Als je een pagina met de hand wijzigt**, hoort de spelleider bij het volgende antwoord wat er veranderd is.

**De opdrachtregel.** Alles wat de spelleider doet gaat via commando's die jij ook kunt uitvoeren, in de campagnemap. Om te spelen heb je ze nooit nodig, en veel ervan tonen de geheimen van de campagne, zoals `rpg status` en `rpg show`. `rpg --help` somt ze allemaal op en `rpg roll --help` legt er een uit. Een commando dat iets wijzigt terwijl er een chat open is, is prima: de spelleider hoort ervan bij het volgende antwoord, net als bij een pagina die met de hand is gewijzigd.

---

## 9. Komt later <!-- icon: hourglass -->

Wat gepland is, maar er nog niet is:

- **Jij als spelleider**: jij leidt het spel en de AI speelt de groep.
- **Meerdere mensen aan tafel**, elk met een eigen rol.
- **Extensies**: instellingen, avonturen, functies en huisregels, per campagne gekozen.
- **Importeren** van je handboeken en avonturen.
- **Andere spellen**: meer spelsystemen, en je eigen.
- **Auteursmodus**: maak met de AI een campagne of een avontuur en deel het zodat anderen het kunnen spelen.

---

## 10. Vragen en problemen <!-- icon: info -->

### Vragen

**Moet ik de regels kennen?** Nee. Kies de mentor tutorial en de spelleider leert je het al spelend, één regel tegelijk. Je kunt altijd tussen haakjes vragen.

**Kan de spelleider valsspelen?** Die kan een worp die RPG Engine deed niet wijzigen, behalve bij moeilijkheid story, en verandert nooit feiten die al vaststaan. Je kunt vragen of een worp echt was.

**Kan ik valsspelen?** Je kunt het proberen. De spelleider neemt je niet op je woord voor feiten: een regel in je bericht die op een spelbericht lijkt, is nog steeds gewoon jouw tekst, en de spelleider bevestigt je gissingen over geheimen nooit.

**Kost het iets?** RPG Engine is gratis. De spelleider draait op je eigen Claude- of ChatGPT-abonnement, en een speelavond is een lange chat: bij de kleinste abonnementen bereik je misschien de limiet van het abonnement voordat de avond voorbij is. Afbeeldingen en vertalingen gebruiken hetzelfde abonnement.

**Kan ik op mijn telefoon spelen?** Nee. De spelleider draait op je computer en het dashboard opent alleen in de browser van die computer.

**Kan ik met vrienden spelen?** Nog niet: nu één speler, één personage, plus metgezellen. Meerdere mensen aan tafel komen met rollen.

**Kan ik de volgende keer een andere AI gebruiken?** Ja. De campagne leeft in haar bestanden: open haar in een andere host en schrijf *verder*.

**Wat als ik de browser sluit?** Er gaat niets verloren. Open de link opnieuw zolang de chat open is; de pagina komt terug waar het spel is.

**Kan ik D&D-inhoud spelen die ik bezit?** Ja. De spelleider kan je boeken, zijn eigen kennis en het web gebruiken. Wat RPG Engine meelevert is beperkt tot gratis inhoud; wat jouw spel gebruikt is aan jou.

### Problemen

**Het dashboard gaat niet open.** Vraag de spelleider om de link: `[Wat is de link naar het dashboard?]`. De pagina werkt alleen zolang er een chat met de spelleider open is in die campagne, en pas na het eerste antwoord van de spelleider in die chat. Met de chat gesloten kan de browser de pagina niet bereiken; een open gelaten pagina zegt *Niet verbonden*.

**De spelleider lijkt het spel niet te kennen, of verzint tools.** Je AI-host heeft RPG Engine niet geladen.

- Controleer eerst of je de host **in de campagnemap** hebt gestart en hebt gezegd dat je hem vertrouwt.
- **Claude Code**: schrijf `/mcp`. Staat `rpg` er maar is het mislukt, kies het dan en dan **Reconnect**. Ontbreekt het, sluit dan Claude Code, schrijf `claude mcp reset-project-choices` in de campagnemap en start het opnieuw.
- **Codex**: schrijf `codex mcp list` in een terminal, in de campagnemap. Ontbreekt `rpg`, dan vertrouwt Codex de map niet: start het daar opnieuw en zeg ja als het erom vraagt.
- In beide gevallen: als `rpg --version` in een terminal zegt dat het commando niet gevonden is, installeer RPG Engine dan opnieuw ([2.2](#22-install)) en open een nieuwe terminal.

**Na een update is er niets veranderd.** Een draaiende spelleider houdt de versie waarmee die gestart is. Open een nieuwe chat, of verbind in Claude Code de server opnieuw (`/mcp`, dan `rpg`, dan **Reconnect**).

**De spelleider herinnert zich iets wat ik ongedaan heb gemaakt.** Je ging terug naar een opgeslagen spel maar speelde door in dezelfde chat. Open een nieuwe chat en druk bij Opgeslagen spellen op **Ik heb een nieuwe chat geopend**.

**De spelleider stelt installatievragen die ik al op de pagina heb beantwoord.** Zeg het: `[Die heb ik op het dashboard gekozen.]`

**Er verschijnen geen afbeeldingen.** Open Instellingen > Afbeeldingen: daar staat of deze computer ze kan maken, en zo niet de stappen, elk commando met een knop om het te kopiëren.

**De pagina staat in het Engels maar ik koos een andere taal.** Hij wordt op de achtergrond vertaald; Instellingen laat zien hoe ver het is. Zonder Codex of Claude Code op deze computer blijft hij Engels.

**De spelleider zegt dat de campagne problemen heeft.** Die lost ze zelf op. Als je bestanden met de hand hebt bewerkt, vraagt de spelleider misschien wat je bedoelde.

**Windows: `npm` mislukt in mijn map.** Bewaar de campagne, of RPG Engine, niet onder een pad dat `&` bevat.

**Installeren mislukt, of `rpg` start niet.** Controleer je Node.js-versie met `node --version`: die moet 22 of nieuwer zijn. Is die ouder, installeer dan de LTS-versie van [nodejs.org](https://nodejs.org) en installeer daarna RPG Engine opnieuw.

**De link naar het dashboard is veranderd.** Een ander programma gebruikte het gebruikelijke adres van de campagne, of Windows had het gereserveerd. RPG Engine nam een ander; de spelleider geeft je de nieuwe link. Verder verandert er niets.
