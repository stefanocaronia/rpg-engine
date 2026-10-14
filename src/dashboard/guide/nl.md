<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb f4fdeebb 80a7cfb9 23c5f59b b8f80c05 8c9f41da 0b4a6ef8 338535a6 728ca4a5 e2839149. Change the English, then run it again. -->
# RPG Engine: de complete handleiding

**RPG Engine** laat je een tafelrollenspel spelen met een **AI als spelleider**. Je praat met de spelleider in een **chat**; RPG Engine werkt op de achtergrond: het **onthoudt de wereld**, **gooit de dobbelstenen** en **houdt de cijfers bij**. Naast de chat houd je een pagina open in je browser, het **dashboard**, met je karakterblad, de dobbelstenen, de kaarten en je dagboek.

Deze handleiding is voor spelers: je hoeft niet te kunnen programmeren.

## Snelstart <!-- icon: send -->

1. Installeer **Node.js** vanaf [nodejs.org](https://nodejs.org) (de LTS-versie).
2. Installeer een **AI-agent**, het programma waarin de spelleider draait, en log in: bijvoorbeeld Claude Code of Codex ([2.4](#24-connect-your-ai)).
3. Installeer RPG Engine in een terminal: `npm install -g rpg-engine`.
4. Maak een campagne: `rpg init "The Salt Isles"`.
5. Ga naar de nieuwe map, `cd "The Salt Isles"`, en start daar je agent: `claude` voor Claude Code, `codex` voor Codex. Zeg ja als er wordt gevraagd of je de map vertrouwt ([2.4](#24-connect-your-ai)) en schrijf dan *Hoi! Laten we beginnen.* De spelleider antwoordt met de link naar je dashboard.

## 1. Wat RPG Engine is <!-- icon: about -->

| Wie | Wat doet die |
|---|---|
| **Jij** | Je speelt je personage: wat het doet, zegt en probeert. |
| **De spelleider** (de AI) | Vertelt het verhaal, speelt alle anderen, beslist wat er gebeurt en vraagt om worpen. |
| **RPG Engine** | Bewaart de wereld in bestanden, gooit de dobbelstenen, telt levenspunten, geld, tijd en afstanden en houdt geheimen verborgen tot je ze ontdekt. |

De wereld blijft van de ene avond op de andere hetzelfde, ook in een nieuwe chat, ook met een andere AI:

- **Wat gezegd is, blijft waar.** Een dode schurk blijft dood.
- **De dobbelstenen zijn echt.** De spelleider kan ze niet buigen, behalve bij de makkelijkste moeilijkheid, als je die kiest.
- **Geheimen blijven geheim.** De spelleider vertelt je nooit wat je personage niet weet.
- **De wereld beweegt mee.** Dreigingen rukken op terwijl je rust of reist, en je ziet er de tekenen van.
- **Een campagne is een map** op je computer: stop wanneer je wilt en pak het later weer op.

Op dit moment speelt RPG Engine één spelsysteem, de **vijfde editie**, uit het vrije System Reference Document 5.1. Andere volgen ([Komt later](#9-coming-later)).

---

## 2. Aan de slag <!-- icon: path -->

### 2.1 Wat je nodig hebt

- Een computer met Windows, macOS of Linux en een webbrowser.
- **Node.js 22** of nieuwer, van [nodejs.org](https://nodejs.org). Daarbij zit `npm`, waarmee je RPG Engine installeert.
- Een **terminal**: op Windows Terminal of PowerShell, op macOS Terminal. Om er een in een map te openen, klik je met de rechtermuisknop op de map en kies je **Openen in Terminal** (Windows) of **Services > Nieuwe Terminal bij map** (macOS).
- Een **AI-agent** voor de spelleider ([2.4](#24-connect-your-ai)), met het **grootste model** dat die biedt: een klein model laat zich makkelijker verleiden om geheimen te verklappen of regels te buigen.

### 2.2 Installeren

```text
npm install -g rpg-engine
```

Met `rpg --version` controleer je of het gelukt is. Je gebruikt `rpg` één keer per campagne, om die te maken; daarna start je agent RPG Engine zelf.

### 2.3 Een campagne maken

Open een terminal in de map waar je je spellen bewaart ([2.1](#21-what-you-need) legt uit hoe):

```text
rpg init "The Salt Isles"
```

Dit maakt de map `The Salt Isles` met daarin een nieuwe campagne; ga erheen met `cd "The Salt Isles"`. Onthoud waar die staat: je keert er elke keer naar terug als je speelt. Al het andere kies je later, in de chat of op het dashboard; `rpg init --help` toont de opties om nu al iets te kiezen, zoals `--language it` of `--difficulty hard`.

De spelleider kan geen campagne voor je maken: vóór `init` vertelt niets je agent waar RPG Engine is.

### 2.4 Je AI verbinden

De spelleider draait in een **AI-agent**: een AI-app, in de terminal of op het bureaublad, die met de bestanden op je computer kan werken, zoals Claude Code of Codex. Een gewone chat zoals claude.ai of ChatGPT, of een app op je telefoon, is niet genoeg: de spelleider moet bij de bestanden van de campagne op je computer kunnen. Elke agent heeft een eigen abonnement en login nodig: Claude Code een betaald Claude-abonnement, Codex een ChatGPT-login. Je installeert de agent één keer, vanaf de eigen pagina: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: schrijf in de campagnemap `claude`. Als er wordt gevraagd of je de map vertrouwt, kies dan **Yes, I trust this folder**; let op, het antwoord dat al is geselecteerd is *No, exit*.
- **Codex**: schrijf in de campagnemap `codex` en zeg ja als er wordt gevraagd of je de map vertrouwt. Controleer in de desktop-app bij de instellingen dat het geheugen uit staat voor de chats van het spel.
- **Een andere agent**: start die in de campagnemap en geef hem de MCP-server `rpg mcp`. RPG Engine is een standaard MCP-server: elke agent die MCP ondersteunt kan de spelleider zijn, ook lokale.

Wij spelen en testen met **Claude Code**; **Codex** is gekoppeld en gecontroleerd, maar er is nog geen hele campagne mee gespeeld; `init` richt ook **Gemini CLI** in. De campagne zet het eigen geheugen van de agent uit: het spel leeft in de bestanden, zodat teruggaan naar een opgeslagen spel echt teruggaat.

### 2.5 De eerste chat

Schrijf iets, bijvoorbeeld *Hoi! Laten we beginnen.* In zijn eerste antwoord van elke chat geeft de spelleider je de **link naar je dashboard**, zoiets als `http://127.0.0.1:4750`: open die en houd de pagina naast de chat.

Tussen de berichten van de spelleider toont je agent de hulpmiddelen die hij gebruikt: open de details daarvan niet (in Claude Code, ctrl+o), ze kunnen geheimen tonen.

Een nieuwe campagne doorloopt drie stappen, bovenaan het dashboard te zien: **1 Instellingen** (hoe je wilt spelen), **2 Sessie nul** (je maakt je personage, al spelend), **3 Spelen**.

### 2.6 Instellingen: kiezen hoe je speelt

De spelleider vraagt alleen wat nog ontbreekt, een paar vragen per keer; de stap **Instellingen** op het dashboard toont dezelfde vragen als kaarten. Schrijf "jij beslist" en de spelleider kiest. Alles kan later veranderen, in de chat of bij **Instellingen**.

| Instelling | Wat het bepaalt | Waarden |
|---|---|---|
| **Mentor** | Hoeveel de spelleider je over de regels leert | uit, hints, tutorial |
| **Moeilijkheid** | Hoe zwaar de wereld speelt | verhaal, makkelijk, normaal, moeilijk, meedogenloos |
| **Dodelijkheid** | Wat neergaan in een gevecht betekent | verhalend (nooit doodgaan), episch (alleen als het ertoe doet), dobbelstenen |
| **Opgeslagen spellen** | Wanneer je terug mag | permadeath, checkpoint, vrij ([3.8](#38-saves-and-going-back)) |
| **Strengheid** | Hoe strak eten, licht en reizen de regels volgen | soepel, regels, simulatie |
| **Dobbelstenen** | Wie je dobbelstenen gooit | digitaal, fysiek |
| **Eenheden** | Afstanden en gewichten | metrisch, imperiaal |
| **Metgezellen** | Wie met je meereist | geen, met jou gemaakt, door de spelleider gemaakt, ontmoet tijdens het spel |
| **Afbeeldingen** | Afbeeldingen van plaatsen, missies en wie je ontmoet | geen, op verzoek, nieuwe plaatsen, missies en wie je ontmoet ([3.11](#311-pictures)) |
| **Grenzen** en **Sluiers** | Wat nooit voorkomt, en wat alleen buiten beeld gebeurt | lijsten |
| **Taal** | De taal van het spel en van het dashboard | elke taal |

De vijfde editie voegt **voortgang** toe: ervaringspunten of mijlpalen.

Zonder een uitgeschreven wereld vraagt de spelleider ook om een **uitgangspunt** (genre, toon, een paar elementen, in je eigen woorden) en om de **voorbereiding**: de wereld al doende bouwen, terwijl je speelt, of alles aan het begin.

**De stijl van de spelleider** wordt nooit gevraagd, maar je kunt hem veranderen in de chat of bij **Instellingen**: het **proza** (sober, literair, pulp, droog), de **verhalen** die de spelleider verzint (situaties, bogen, afleveringen, mysterie), een auteur om **als te schrijven**, of iets anders **in je eigen woorden**.

### 2.7 Sessie nul: je personage

Je maakt je personage samen met de spelleider, zoals aan een tafel. Elke keuze is aan jou, tenzij je de spelleider vraagt die te maken: kom met een volledig idee, een vaag idee of met niets. De spelleider vertelt je hoe de waarden van de vaardigheden worden bepaald voordat er een dobbelsteen wordt gegooid. Een achtergrondverhaal is nooit verplicht; als je er een geeft, schrijft de spelleider het in jouw woorden. Daarna vraagt de spelleider om een afbeelding van je personage ([3.7](#37-your-characters-story-and-picture)). RPG Engine rekent het karakterblad uit: je hoeft nooit zelf te rekenen.

---

## 3. Spelen <!-- icon: chat -->

### 3.1 Praten met de spelleider

Schrijf in je eigen woorden wat je personage doet of zegt:

> Ik vraag de herbergier wie er vanavond nog meer langskwam.

Wil je buiten het verhaal om iets zeggen, schrijf dan tussen vierkante haken: *[Hoe werkt grijpen?]* De spelleider antwoordt ook tussen haken.

Jij zegt wat je probeert; de spelleider zegt wat er gebeurt. De spelleider beslist nooit voor je personage en praat nooit over de engine. Je kunt de spelleider vragen hoe je het dashboard gebruikt.

### 3.2 Worpen

De spelleider vraagt alleen om een worp als de uitkomst onzeker is en ertoe doet, en zegt eerst wat er op het spel staat. Daarna:

- **Op het dashboard** toont een banner een knop voor elke proef, zoals *Acrobatiek +4 · met voordeel*. Klik erop: de dobbelstenen vallen op de pagina en de spelleider hoort de uitkomst. Je kunt ook op de regel van je karakterblad klikken die oplicht, de dobbelstenen uit de dobbelbak gooien, of iets anders in de banner schrijven.
- **Met de hand**, in de hoek van de banner of bij **Instellingen**: de banner zegt wat je moet gooien, en je gooit het vanaf je karakterblad of uit de dobbelbak.
- **Fysieke dobbelstenen**, als de dobbelstenen-instelling op fysiek staat: je schrijft de ogen die je gooide, *[Ik gooide een 14.]*, en RPG Engine telt je modifiers erbij.

**Vrije worpen**: klik op een willekeurig getal op je karakterblad, of open de dobbelbak, om voor de lol te gooien. Ze tellen nooit mee en de spelleider ziet ze nooit.

**De worpen van de spelleider** staan in je worpenkolom, behalve de geheime. Je kunt altijd vragen *[Was die worp echt?]*: bij een geheime worp geeft de spelleider een vingerafdruk die bewijst dat de worp is gedaan vóór je het vroeg.

### 3.3 Scènes en gevechten

Het verhaal loopt in **scènes**: een gevecht, een gesprek, verkennen, reizen, een rustpauze. Aan het eind van elke scène slaat het spel zichzelf op, en de scène komt in je dagboek.

In een gevecht vertelt de spelleider elke beurt die niet van jou is, en stopt waar jij kunt beslissen. De sectie **Gevecht** toont de volgorde van de beurten, de levenspunten van je groep en hoe gewond de vijanden eruitzien, in woorden. Als je personage neergaat, verschijnen de redworpen tegen de dood groot op de pagina.

### 3.4 Tijd, reizen en de wereld die beweegt

RPG Engine houdt de datum bij; tussen sessies verstrijkt geen tijd. Zeg dat je rust, *We nemen een lange rust*, en de rust herstelt wat hij moet herstellen. Zeg waarheen je gaat, *We nemen de weg naar het noorden, naar Rocca*, en RPG Engine rekent de route, de afstand en de dagen uit, en stopt als er onderweg iets gebeurt. Geld wordt geteld in de munten van het spel, wisselgeld inbegrepen.

Schurken hebben plannen met deadlines. Elke nieuwe dag laat de spelleider de dreigingen opschuiven die de tijd heeft vooruitgebracht, en jij ziet de tekenen daarvan, nooit de klok zelf.

### 3.5 Kaarten

**Wereld** toont de plaatsen die je personage kent, de wegen ertussen en het pad dat je liep, met mist over de rest. **Scène** toont de kaart van de plek waar je bent, als die er is, met wie waar staat; in een gevecht zijn op jouw beurt de vakjes die je niet kunt bereiken verhuld. Als de spelleider vraagt waarheen je gaat, tik je op een vakje, of schrijf je het, zoals *E4*.

### 3.6 Missies, dagboek en notities

Een taak die je personage aanneemt wordt een missie in het **Dagboek**, met de doelen, de deadline en wat die meet; geef er een ster aan om haar bovenaan bij Scène in beeld te houden. Het Dagboek vertelt ook je **verhaal**, scène voor scène, en bewaart je **notities**: privé, tenzij je er een **Deelt**; de spelleider hoort die als wat jij denkt, nooit als een feit.

### 3.7 Het verhaal en de afbeelding van je personage

Op je karakterblad heeft de kaart **Beschrijving** een vak voor het verhaal van je personage: de spelleider schrijft het erin, nadat je ja hebt gezegd. Voor een afbeelding geef je de spelleider een bestand (PNG, JPEG, WebP of SVG, tot 5 MB) met de plek waar het op je computer staat, of laat je een portret maken ([3.11](#311-pictures)): *[Maak een portret van me: grijs haar in een vlecht, een litteken op de kin.]*

### 3.8 Opgeslagen spellen en teruggaan

RPG Engine slaat de hele campagne op aan het eind van elke scène. De instelling **Opgeslagen spellen** bepaalt de rest:

| Opgeslagen spellen | Opslaan wanneer je wilt | Teruggaan |
|---|---|---|
| **permadeath** | nee | nooit |
| **checkpoint** | nee | naar het laatste opgeslagen spel, alleen als je personage doodgaat |
| **vrij** | ja | naar elk opgeslagen spel |

In elke modus kun je **opnieuw beginnen**, vanaf het begin van het spel of vanaf sessie nul. Doe dat in de chat of bij **Opgeslagen spellen**.

Open na het teruggaan **een nieuwe chat**: de oude onthoudt wat ongedaan is gemaakt. Schrijf *verder* in de nieuwe chat en druk dan bij Opgeslagen spellen op **Ik heb een nieuwe chat geopend**.

### 3.9 Sessies: stoppen en terugkomen

Stop wanneer je wilt: *[Laten we hier voor vanavond stoppen.]* Alles is al opgeslagen in de bestanden. Om terug te komen start je je agent in de campagnemap en schrijf je *verder*: de spelleider geeft een korte samenvatting en gaat door.

### 3.10 De stemming van de spelleider

De robot bovenaan het dashboard is de spelleider: het gezicht volgt de toon van het verhaal en verraadt nooit wat je nog niet weet. Als de chat gesloten is, slaapt de robot.

### 3.11 Afbeeldingen

RPG Engine kan afbeeldingen laten maken van de plaatsen die je bereikt, de missies die je aanneemt en wie je ontmoet, zoals de instelling **Afbeeldingen** zegt, en van het portret van je personage als je erom vraagt. Het gebruikt wat op je computer staat, met je eigen login: **Codex** schildert ze, anders tekent **Claude Code** ze. **Instellingen** zegt of deze computer ze kan maken, en hoe je dat instelt als het niet kan. Je kunt de spelleider altijd een eigen afbeelding geven.

### 3.12 Veiligheid: grenzen, sluiers en stop

**Grenzen** komen nooit in het spel voor; **sluiers** gebeuren alleen buiten beeld. Schrijf op elk moment *[stop]*: de spelleider laat die inhoud meteen vallen en voegt haar toe aan je grenzen.

### 3.13 Van gedachten veranderen

Elke instelling kan veranderen, in de chat of bij **Instellingen**. Een uitspraak die de spelleider doet zonder het boek wordt een **precedent**, zodat dezelfde vraag de volgende keer hetzelfde antwoord krijgt.

---

## 4. Het dashboard <!-- icon: party -->

Een pagina op je eigen computer, alleen te openen in de browser van die computer, actief zolang de chat open is. Als de chat sluit, staat er *Not connected*; bij de volgende chat komt de pagina vanzelf terug.

- **Groep**: jouw karakterblad en dat van je metgezellen. Klik op een getal om het te gooien; houd de muis erboven om te zien waar het vandaan komt. Ernaast staan de worpen.
- **Scène**: waar je bent, de afbeelding en kaart ervan, wie er is, wat er gebeurt.
- **Gevecht**: alleen in een gevecht: de beurten, de vechters, wat je bij de hand hebt.
- **Dagboek**: missies, het verhaal, je notities.
- **Wereld**: de wereldkaart zoals je personage die kent.
- **De dobbelbak**: kies dobbelstenen en een modifier, en gooi.
- **Opgeslagen spellen**, **Help**, **Instellingen** en **Over**, als pictogrammen aan het eind van de rij. Instellingen bevat ook de eigen voorkeuren van de pagina: thema, dobbelgeluid, dobbelsteenset.

Als de spelleider je iets vraagt, blijft de banner bovenaan staan, in welke sectie je ook zit.

---

## 5. Spelsystemen en huisregels <!-- icon: dice -->

### 5.1 Wat een spelsysteem is

De gegevens van één spel: het karakterblad, de getallen, de wezens, voorwerpen, spreuken en regeltekst. Elke campagne speelt één systeem. RPG Engine rekent het karakterblad uit en wat er wordt uitgegeven en terugkomt; hoe een eigenschap werkt, leest de spelleider in de regels en beslist die, zoals aan een tafel.

### 5.2 Vijfde editie, inbegrepen

De rassen, klassen, subklassen, een achtergrond en een talent van de SRD 5.1; de 319 spreuken, de wapens, wapenrustingen, magische voorwerpen en monsters; de hoofdstukken met regels, die de spelleider op hun exacte tekst leest; het volledige karakterblad, uitgerekend.

Je kunt ook inhoud spelen die de SRD mist, uit een boek dat je bezit: de spelleider schrijft die uit als pagina's van je campagne, en RPG Engine behandelt ze als de zijne. RPG Engine levert alleen open inhoud mee; wat je spelleider weet, is niet beperkt.

### 5.3 Huisregels en je eigen toevoegingen

Vraag het de spelleider: *[Huisregel: een natuurlijke 1 bij een aanval betekent dat je je wapen laat vallen.]* De spelleider bewaart die als afspraak van de tafel, of schrijft een pagina of een getal van het karakterblad als dat nodig is. Huisregels die al uitgeschreven zijn, kunnen als tekstbestanden in de map `rules` van de campagne.

### 5.4 Je eigen spelsysteem toevoegen of importeren

Nog niet: op dit moment speelt RPG Engine alleen de vijfde editie ([Komt later](#9-coming-later)).

---

## 6. Extensies <!-- icon: plus -->

Nog niet. Een extensie voegt iets toe aan een campagne, bovenop het spelsysteem: een wereld, een avontuur, een functie zoals het weer, huisregels om te delen.

---

## 7. Waar een campagne vandaan komt, en de taal ervan <!-- icon: world -->

### 7.1 Drie manieren om een wereld te hebben

- **Al doende gemaakt**: uit je uitgangspunt bouwt de spelleider elke plaats, persoon en intrige vlak voordat je ze nodig hebt, en bewaart ze.
- **Aan het begin voorbereid**: hetzelfde, met de wereld gebouwd vóór het spel.
- **Uit je eigen avontuur**: geef de spelleider een tekst of een pdf en vraag het in te richten, *[Richt dit avontuur in als onze campagne. Vertel me niets van wat erin staat.]* De spelleider schrijft de plaatsen, de personages en de geheimen uit. Er is nog geen importknop.

Een campagne wordt één keer gespeeld: om hetzelfde avontuur opnieuw te spelen, maak je een nieuwe campagne.

### 7.2 Talen

Eén taal per campagne, die van de spelleider, die het dashboard volgt. Het dashboard wordt geleverd in 26 talen. Elke andere taal wordt op je computer vertaald door Codex of Claude Code, of, zonder die twee, door de spelleider in de chat. De termen van de vijfde editie in het Italiaans komen uit de officiële Italiaanse SRD; de regeltekst blijft Engels, en de spelleider vertelt hem in jouw taal.

---

## 8. Voor de nieuwsgierigen: de campagnemap <!-- icon: list -->

Je hoeft hem nooit te openen, en hij bevat de geheimen van je campagne. Hierin staan `campaign.yaml` (je instellingen), `state.yaml` (waar het spel nu staat), `world/` (één markdownpagina voor elk personage, elke plaats, elke missie en de rest), `rules/` (je huisregels), `images/`, `log.jsonl` (elke wijziging), `.saves/`, `.player/` (je notities) en de kleine bestanden die AI-agents vertellen waar RPG Engine staat. De pagina's gebruiken het formaat van Obsidian. Pas je een pagina met de hand aan? Dan merkt de spelleider dat bij het volgende antwoord.

RPG Engine blijft in deze map: het leest en schrijft het spel alleen hier en raakt je andere bestanden nooit aan. Buiten de map bewaart het alleen een eigen gegevensmap (de vertalingen van het dashboard, en Codex of Claude Code als je toestaat dat het die installeert) en tijdelijke mappen terwijl er een afbeelding wordt getekend. Wil je agent iets anders op je computer doen, dan vraagt die eerst om jouw toestemming.

Elke opdracht die de spelleider gebruikt, kun je ook zelf in de campagnemap uitvoeren: `rpg --help` toont ze allemaal. Veel opdrachten tonen de geheimen van de campagne.

---

## 9. Komt later <!-- icon: hourglass -->

- **Jij als spelleider**, met de AI die de groep speelt.
- **Auteursmodus**: schrijf een avontuur met de AI, exporteer het en deel het.
- **Meerdere spelers op dezelfde computer**, elk met een eigen personage, om de beurt in dezelfde chat.
- **Extensies**: instellingen, avonturen, functies en huisregels.
- **Importeren** van je handboeken en avonturen.
- **Andere spellen**: meer spelsystemen, en je eigen.

---

## 10. Vragen en problemen <!-- icon: info -->

### Vragen

**Moet ik de regels kennen?** Nee. Kies de mentor tutorial en stel je vragen tussen haken wanneer je wilt.

**Kan de spelleider valsspelen?** De spelleider kan een worp die RPG Engine deed niet veranderen, behalve bij de moeilijkheid verhaal, en ook geen feiten die al vastliggen.

**Kost het iets?** RPG Engine is gratis. De spelleider draait op het abonnement van je agent, of op je eigen computer met een lokaal model. Een speelavond is een lange chat: bij de kleinste abonnementen kun je de limiet van het abonnement bereiken voordat de avond om is. Afbeeldingen en vertalingen gebruiken hetzelfde abonnement.

**Kan ik op mijn telefoon spelen?** Nee: de spelleider draait op je computer en het dashboard opent alleen daar.

**Kan ik met vrienden spelen?** Nog niet: op dit moment één speler, één personage, plus metgezellen ([Komt later](#9-coming-later)).

**Kan ik de volgende keer een andere AI gebruiken?** Ja: open de campagne in een andere agent en schrijf *verder*.

### Problemen

**Het dashboard opent niet.** Vraag het de spelleider: `[Wat is de link naar het dashboard?]`. Het werkt alleen zolang er een chat open is in die campagne, na het eerste antwoord van de spelleider.

**De spelleider lijkt het spel niet te kennen.** Je agent heeft RPG Engine niet geladen. Controleer of je hem in de campagnemap hebt gestart en de map hebt vertrouwd. Schrijf in Claude Code `/mcp` en verbind `rpg` opnieuw. In Codex moet `codex mcp list` in de campagnemap `rpg` tonen. Als `rpg --version` niet wordt gevonden, installeer RPG Engine dan opnieuw ([2.2](#22-install)).

**Bijwerken.** Voer `npm install -g rpg-engine` opnieuw uit en open dan een nieuwe chat: een spelleider die al draait, houdt de versie waarmee hij begon.

**De spelleider herinnert zich iets wat ik ongedaan heb gemaakt.** Open een nieuwe chat en druk bij Opgeslagen spellen op **Ik heb een nieuwe chat geopend**.

**Er verschijnen geen afbeeldingen.** Instellingen > Afbeeldingen zegt of deze computer ze kan maken, en hoe.

**Installeren mislukt, of `rpg` start niet.** `node --version` moet 22 of nieuwer tonen. Houd op Windows RPG Engine en je campagnes uit paden met een `&`.

**De link naar het dashboard is veranderd.** Een ander programma nam het gebruikelijke adres in; de spelleider geeft je de nieuwe link.
