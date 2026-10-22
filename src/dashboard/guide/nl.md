<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb 63d60934 16d08ee1 75985e6d ece214f0 8c9f41da 90f04271 f699a840 241f6611 e2839149. Change the English, then run it again. -->
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

- Een computer met Windows, macOS of Linux, en een webbrowser.
- **Node.js 22** of nieuwer, van [nodejs.org](https://nodejs.org). Dit bevat `npm`, waarmee je RPG Engine installeert.
- Een **terminal**: op Windows Terminal of PowerShell; op macOS Terminal. Om er een in een map te openen, klik je met de rechtermuisknop op de map en kies je **Openen in Terminal** (Windows) of **Services > Nieuwe Terminal in map** (macOS).
- Een **AI-agent** voor de spelleider ([2.4](#24-connect-your-ai)), met het **grootste model** dat de agent biedt: een klein model laat zich makkelijker overhalen om geheimen te verklappen of de regels te buigen.

### 2.2 Installeren

```text
npm install -g rpg-engine
```

Met `rpg --version` controleer je of het gelukt is. Je gebruikt `rpg` één keer per campagne, om die aan te maken. Daarna start je agent RPG Engine zelf.

### 2.3 Een campagne aanmaken

Open een terminal in de map waarin je je spellen bewaart ([2.1](#21-what-you-need) legt uit hoe):

```text
rpg init "The Salt Isles"
```

Dit maakt de map `The Salt Isles` met daarin een nieuwe campagne. Ga erheen met `cd "The Salt Isles"`. Onthoud waar de map staat: je komt er elke keer naar terug als je speelt. Al het andere kies je later, in de chat of op het dashboard. Met `rpg init --help` zie je de opties om er nu al een paar te kiezen, zoals `--language it` of `--difficulty hard`.

De spelleider kan geen campagne voor je aanmaken: vóór `init` weet je agent nergens waar RPG Engine is.

### 2.4 Je AI verbinden

De spelleider draait in een **AI-agent**: een AI-app, in de terminal of op het bureaublad, die met de bestanden op je computer kan werken, zoals Claude Code of Codex. Een gewone chat zoals claude.ai of ChatGPT, of een app op je telefoon, is niet genoeg: de spelleider moet bij de bestanden van de campagne op je computer kunnen. Elke agent heeft een eigen abonnement en een eigen login: Claude Code een betaald Claude-abonnement, Codex een ChatGPT-login. Je installeert de agent één keer, vanaf de eigen pagina: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: typ `claude` in de campagnemap. Als Claude Code vraagt of je de map vertrouwt, kies dan **Yes, I trust this folder**. Let op: het antwoord dat al geselecteerd is, is *No, exit*.
- **Codex**: typ `codex` in de campagnemap en antwoord ja als Codex vraagt of je de map vertrouwt. Controleer in de desktop-app bij de instellingen dat het geheugen uit staat voor de chats van het spel.
- **Een andere agent**: start de agent in de campagnemap en geef hem de MCP-server `rpg mcp`. RPG Engine is een standaard MCP-server: elke agent die MCP ondersteunt kan de spelleider zijn, ook lokale agents.

Wij spelen en testen met **Claude Code**. **Codex** is gekoppeld en gecontroleerd, maar daarmee is nog geen hele campagne gespeeld. `init` richt ook **Gemini CLI** in. De campagne zet het eigen geheugen van de agent uit: het spel leeft in de bestanden, zodat teruggaan naar een opgeslagen spel echt teruggaan is.

### 2.5 De eerste chat

Schrijf iets, bijvoorbeeld *Hoi! Laten we beginnen.* In het eerste antwoord van elke chat geeft de spelleider je de **link naar je dashboard**, zoiets als `http://127.0.0.1:4750`. Open die en laat de pagina naast de chat staan.

Tussen de berichten van de spelleider toont je agent de tools die hij gebruikt. Open de details daarvan niet (in Claude Code met ctrl+o): ze kunnen geheimen tonen.

Een nieuwe campagne doorloopt drie stappen, die bovenaan het dashboard staan: **1 Instellingen** (hoe je wilt spelen), **2 Sessie nul** (je maakt je personage, al spelend), **3 Spelen**.

### 2.6 Instellingen: kiezen hoe je speelt

De spelleider vraagt alleen wat nog ontbreekt, een paar vragen tegelijk. De stap **Instellingen** op het dashboard toont dezelfde vragen als kaarten. Schrijf "jij beslist" en de spelleider kiest. Alles kan later veranderen, in de chat of bij **Instellingen**.

| Instelling | Wat het bepaalt | Waarden |
|---|---|---|
| **Mentor** | Hoeveel de spelleider je over de regels leert | off, hints, tutorial |
| **Moeilijkheid** | Hoe zwaar de wereld speelt | story, easy, normal, hard, brutal |
| **Dodelijkheid** | Wat neergaan in een gevecht betekent | narrative (nooit doodgaan), epic (alleen als het ertoe doet), dice |
| **Opgeslagen spellen** | Wanneer je terug mag gaan | permadeath, checkpoint, free ([3.8](#38-saves-and-going-back)) |
| **Strengheid** | Hoe strikt eten, licht en reizen de regels volgen | smooth, rules, simulation |
| **Dobbelstenen** | Wie jouw dobbelstenen gooit | digital, physical |
| **Eenheden** | Afstanden en gewichten | metric, imperial |
| **Voices** | Wie spreekt voor de personages die je ontmoet: op sleutelmomenten het personage zelf, dat alleen weet wat het zelf weet, naar keuze van de spelleider; altijd de spelleider; of altijd het personage, voor de belangrijkste of voor iedereen, langzamer en duurder, waar je AI-app dat kan | auto, master, important, always |
| **Metgezellen** | Wie met je meereist | none, made with you, made by the master, met in play |
| **Afbeeldingen** | Afbeeldingen van plaatsen, missies en wie je ontmoet | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Grenzen** en **Sluiers** | Wat nooit voorkomt, en wat alleen buiten beeld gebeurt | lijsten |
| **Taal** | De taal van het spel en van het dashboard | elke taal |

De vijfde editie voegt **voortgang** toe: ervaringspunten of mijlpalen.

Zonder een uitgeschreven wereld vraagt de spelleider ook om een **uitgangspunt** (genre, toon, een paar elementen, in je eigen woorden) en om de **voorbereiding**: de wereld al spelend opbouwen, of alles aan het begin.

**De stijl van de spelleider** wordt nooit gevraagd, maar je kunt hem veranderen in de chat of bij **Instellingen**: het **proza** (plain, literary, pulp, wry), de **verhalen** die de spelleider bedenkt (situations, arcs, episodes, mystery), een auteur om **als te schrijven**, of iets anders **in je eigen woorden**.

### 2.7 Sessie nul: je personage

Je maakt je personage samen met de spelleider, zoals aan een tafel. Elke keuze is aan jou, tenzij je de spelleider vraagt om te kiezen. Kom met een volledig idee, een vaag idee of met niets. De spelleider vertelt hoe de ability scores worden bepaald voordat er een dobbelsteen wordt gegooid. Een verhaal van je personage is nooit verplicht. Geef je er een, dan schrijft de spelleider het in jouw woorden. Daarna vraagt de spelleider om een afbeelding van je personage ([3.7](#37-your-characters-story-and-picture)). RPG Engine werkt het karakterblad uit: je hoeft nooit zelf te rekenen.

---

## 3. Spelen <!-- icon: chat -->

### 3.1 Praten met de spelleider

Schrijf wat je personage doet of zegt, in je eigen woorden:

> Ik vraag de herbergier wie er vanavond nog meer langskwam.

Wil je buiten het verhaal om iets zeggen? Zet het dan tussen rechte haken: *[Hoe werkt grappelen?]* De spelleider antwoordt ook tussen haken.

Jij zegt wat je probeert; de spelleider zegt wat er gebeurt. De spelleider beslist nooit voor je personage en praat nooit over de engine. Je kunt de spelleider vragen hoe je het dashboard gebruikt.

### 3.2 Worpen

De spelleider vraagt alleen om een worp als de uitkomst onzeker is en ertoe doet. Eerst zegt de spelleider wat er op het spel staat. Dan:

- **Op het dashboard** toont een banner voor elke proef een knop, zoals *Acrobatica +4 · met vantaggio*. Klik erop: de dobbelstenen vallen op de pagina en de spelleider hoort de uitkomst. Je kunt ook klikken op de regel van je karakterblad die oplicht, de dobbelstenen gooien uit de dobbelbak, of iets anders in de banner schrijven.
- **Met de hand**, in de hoek van de banner of in **Instellingen**: de banner zegt wat je moet gooien, en je gooit het vanaf je karakterblad of uit de dobbelbak.
- **Echte dobbelstenen**, als de dobbelstenen-instelling op fysiek staat: je schrijft de ogen die je gooide, *[Ik gooide een 14.]*, en RPG Engine telt je modifiers erbij op.

**Vrije worpen**: klik op een willekeurig getal op je karakterblad, of open de dobbelbak, om voor de lol te gooien. Ze tellen nooit mee en de spelleider ziet ze nooit.

**De worpen van de spelleider** staan in je worpenkolom, behalve de geheime. Je kunt altijd vragen: *[Was die worp echt?]* Bij een geheime worp geeft de spelleider een vingerafdruk. Die bewijst dat de worp is gedaan voordat je het vroeg.

### 3.3 Scènes en gevechten

Het verhaal verloopt in **scènes**: een gevecht, een gesprek, verkennen, reizen, een rust. Aan het eind van elke scène slaat het spel vanzelf op, en de scène komt in je dagboek.

In een gevecht vertelt de spelleider elke beurt die niet van jou is, en stopt waar jij kunt beslissen. De **Scène** toont bovenaan wie aan de beurt is en wie daarna komt, en de kaart van je personage naast de kaart. De volgorde van de beurten, de hitpoints van je groep en hoe gewond de vijanden eruitzien, in woorden, blijven naast de pagina staan. Als je personage neervalt, verschijnen de death saves groot op de pagina.

### 3.4 Tijd, reizen en de wereld die verder beweegt

RPG Engine houdt de datum bij; tussen sessies verstrijkt geen tijd. Zeg dat je rust, *We nemen een lange rust*, en de rust geeft terug wat het moet teruggeven. Zeg waarheen je gaat, *We nemen de weg naar het noorden, naar Rocca*, en RPG Engine rekent de route, de afstand en de dagen uit. Onderweg stopt het als er iets gebeurt. Geld wordt geteld in de munten van het spel, wisselgeld inbegrepen.

Schurken hebben plannen met deadlines. Elke nieuwe dag laat de spelleider de dreigingen opschuiven die de tijd heeft vooruitgeholpen. Jij ziet hun tekenen, nooit de klok zelf.

### 3.5 Kaarten

**Wereld** toont de plaatsen die je personage kent, de wegen ertussen en het pad dat je liep, met mist over de rest. **Scène** toont de kaart van de plaats waar je bent, als die er is, met wie waar staat. In een gevecht zijn op jouw beurt de vakjes die je niet kunt bereiken verhuld. Vraagt de spelleider waarheen je gaat? Tik dan op een vakje, of schrijf het, zoals *E4*.

### 3.6 Missies, dagboek en notities

Een taak die je personage aanneemt, wordt een missie in het **Dagboek**, met de doelen, de deadline en wat de missie meet. Geef de missie een ster om hem bovenaan in Scène in beeld te houden. Het Dagboek vertelt ook je **verhaal**, scène voor scène, en bewaart je **notities**: privé, tenzij je er een **Deelt**. De spelleider hoort die als wat jij denkt, nooit als een feit.

### 3.7 Het verhaal en de afbeelding van je personage

Op je karakterblad heeft de kaart **Beschrijving** een vak voor het verhaal van je personage: de spelleider schrijft het erin, nadat jij ja hebt gezegd. Wil je een afbeelding? Geef de spelleider een bestand (PNG, JPEG, WebP of SVG, tot 5 MB) met de plek waar het op je computer staat, of laat een portret maken ([3.11](#311-pictures)): *[Maak een portret voor me: grijs haar in een vlecht, een litteken op de kin.]*

### 3.8 Opgeslagen spellen en teruggaan

RPG Engine slaat de hele campagne op aan het eind van elke scène. De instelling **Opgeslagen spellen** bepaalt de rest:

| Opgeslagen spellen | Opslaan wanneer je wilt | Teruggaan |
|---|---|---|
| **permadeath** | nee | nooit |
| **checkpoint** | nee | naar de laatste save, alleen als je personage sterft |
| **free** | ja | naar elke save |

In elke modus kun je **opnieuw beginnen**, vanaf het begin van het spel of vanaf sessie nul. Doe dat in de chat of bij **Opgeslagen spellen**.

Open na het teruggaan **een nieuwe chat**: de oude onthoudt wat ongedaan is gemaakt. Schrijf *verder* in de nieuwe chat en druk dan bij Opgeslagen spellen op **Ik heb een nieuwe chat geopend**.

### 3.9 Sessies: stoppen en terugkomen

Stop wanneer je wilt: *[Laten we er voor vanavond mee ophouden.]* Alles is al opgeslagen in de bestanden. Om terug te komen start je je agent in de campagnemap en schrijf je *verder*. De spelleider geeft een korte samenvatting en gaat door.

### 3.10 De stemming van de spelleider

De robot bovenaan het dashboard is de spelleider. Zijn gezicht volgt de toon van het verhaal en verraadt nooit wat je nog niet weet. Als de chat gesloten is, slaapt hij.

### 3.11 Afbeeldingen

RPG Engine kan afbeeldingen laten maken van de plaatsen die je bereikt, de missies die je aanneemt en de mensen die je ontmoet, zoals de instelling **afbeeldingen** bepaalt. Ook maakt het het portret van je personage als je erom vraagt. Het gebruikt wat op je computer staat, met je eigen login: **Codex** schildert ze, anders tekent **Claude Code** ze. **Instellingen** laat zien of deze computer ze kan maken, en zo niet, hoe je dat instelt. Je kunt de spelleider altijd een eigen afbeelding geven.

### 3.12 Veiligheid: grenzen, sluiers en stop

**Grenzen** komen nooit in het spel voor; **sluiers** gebeuren alleen buiten beeld. Schrijf op elk moment *[stop]*: de spelleider laat die inhoud meteen vallen en voegt haar toe aan je grenzen.

### 3.13 Van gedachten veranderen

Elke instelling kan veranderen, in de chat of bij **Instellingen**. Een uitspraak die de spelleider doet zonder het boek, wordt een **precedent**, zodat dezelfde vraag de volgende keer hetzelfde antwoord krijgt.

---

## 4. Het dashboard <!-- icon: party -->

Een pagina op je eigen computer, alleen te openen in de browser van die computer, live zolang de chat open is. Als de chat sluit, staat er *Not connected*. Met de volgende chat komt de pagina vanzelf terug.

- **Groep**: jouw karakterblad en dat van je metgezellen. Klik op een getal om het te gooien; houd de muis erboven om te zien waar het vandaan komt. Ernaast staan de worpen.
- **Scène**: waar je bent, met afbeelding en kaart, wie er zijn en wat er gebeurt. In een gevecht zie je de beurten en de kaart van je personage.
- **Dagboek**: missies, het verhaal, je notities.
- **Wereld**: de wereldkaart zoals je personage die kent.
- **De dobbelbak**: kies dobbelstenen en een modifier, en gooi.
- **Opgeslagen spellen**, **Help**, **Instellingen** en **Over**, als pictogrammen aan het eind van de rij. Instellingen bevat ook de eigen voorkeuren van de pagina: thema, dobbelgeluid, dobbelset.

Als de spelleider je iets vraagt, blijft de banner bovenaan staan, in welk onderdeel je ook bent.

---

## 5. Spelsystemen en huisregels <!-- icon: dice -->

### 5.1 Wat een spelsysteem is

De gegevens van één spel: het karakterblad, de getallen, de wezens, voorwerpen, spreuken en de regeltekst. Elke campagne speelt één systeem. RPG Engine rekent het karakterblad uit en houdt bij wat er wordt uitgegeven en wat terugkomt. Hoe een eigenschap werkt, leest de spelleider in de regels en beslist die, zoals aan een echte speltafel.

### 5.2 Vijfde editie, inbegrepen

De rassen, klassen, subklassen, een achtergrond en een talent uit de SRD 5.1; de 319 spreuken, de wapens, wapenrustingen, magische voorwerpen en monsters; de regelhoofdstukken, die de spelleider op hun exacte tekst leest; het volledige karakterblad, uitgerekend.

Je kunt ook inhoud spelen die in de SRD ontbreekt, uit een boek dat je zelf hebt: de spelleider schrijft die uit als pagina's van je campagne, en RPG Engine behandelt ze als eigen inhoud. RPG Engine levert alleen open inhoud mee; wat jouw spelleider weet, is niet beperkt.

Je eigen handboeken kunnen je bibliotheek zijn. Vertel de spelleider waar ze staan, *[Mijn handboeken staan in D:\Books\5e.]*, of voeg hun map toe bij Packages › Library en zeg één keer ja in het venster dat je computer toont. RPG Engine leest ze op deze computer. Elke campagne gebruikt de mappen die je daar aanzet. De spelleider doorzoekt ze als er een regel moet worden beslist, na de SRD, en noemt daarbij het boek en de pagina. Ze lezen het best als tekst, of als pdf's waarvan je de tekst kunt selecteren. Een gescande pdf wordt gelezen vanaf de afbeeldingen van de pagina's, alleen op Windows, in een paar minuten en met een paar fouten. RPG Engine verandert je handboeken nooit, stuurt hun tekst nergens heen en kopieert die nooit naar een campagne.

### 5.3 Huisregels en je eigen aanvullingen

Vraag het de spelleider: *[Huisregel: bij een natuurlijke 1 op een aanval laat je je wapen vallen.]* De spelleider bewaart die als afspraak van de tafel, of schrijft een pagina of een getal op het karakterblad als dat nodig is. Huisregels die al uitgeschreven zijn, kunnen als tekstbestanden in de map `rules` van de campagne.

### 5.4 Je eigen spelsysteem toevoegen of importeren

Nog niet: nu speelt RPG Engine alleen de vijfde editie ([Komt later](#9-coming-later)).

---

## 6. Extensies <!-- icon: plus -->

Nog niet. Een extensie voegt iets toe aan een campagne, bovenop het spelsysteem: een wereld, een avontuur, een functie zoals het weer, huisregels om te delen.

---

## 7. Waar een campagne vandaan komt, en de taal ervan <!-- icon: world -->

### 7.1 Drie manieren om een wereld te krijgen

- **Al spelend bedacht**: uit jouw uitgangspunt bouwt de spelleider elke plaats, elk personage en elke verhaallijn vlak voordat je ze nodig hebt, en bewaart ze.
- **Aan het begin voorbereid**: hetzelfde, maar de wereld is gebouwd voordat het spel begint.
- **Uit je eigen avontuur of boek**: geef de spelleider het bestand, *[Importeer dit avontuur als onze campagne: D:\Books\adventure.pdf. Vertel me niets van wat erin staat.]* Het leest het best als tekst, een EPUB, een Word-document of een pdf waarvan je de tekst kunt selecteren. Een gescande pdf wordt gelezen aan de hand van afbeeldingen van de pagina's, alleen op Windows, langzaam en met een paar fouten. Codex of Claude Code op je computer leest het buiten de chat, en het dashboard laat zien hoe ver het is. Bij een roman stelt de spelleider voor waar te beginnen. De spelleider schrijft de plaatsen, de personages en de geheimen uit.

Een campagne wordt één keer gespeeld. Wil je hetzelfde avontuur opnieuw spelen, maak dan een nieuwe campagne.

### 7.2 Talen

Eén taal per campagne: die van de spelleider, en het dashboard volgt die. Het dashboard wordt geleverd in 26 talen. Elke andere taal wordt op je computer vertaald door Codex of Claude Code, of, zonder die twee, door de spelleider in de chat. De termen van de vijfde editie in het Italiaans komen uit de officiële Italiaanse SRD. De regeltekst blijft Engels en de spelleider vertelt hem in jouw taal.

---

## 8. Voor wie nieuwsgierig is: de campagnemap <!-- icon: list -->

Je hoeft hem nooit te openen, en hij bevat de geheimen van je campagne. Hij bevat `campaign.yaml` (je instellingen), `state.yaml` (waar het spel staat), `world/` (voor elk personage, elke plaats, elke missie en de rest één markdownpagina), `rules/` (je huisregels), `images/`, `log.jsonl` (elke wijziging), `.saves/`, `.player/` (je notities) en de kleine bestanden die AI-agents vertellen waar RPG Engine staat. De pagina's gebruiken het formaat van Obsidian. Als je een pagina met de hand aanpast, hoort de spelleider dat bij het volgende antwoord.

RPG Engine blijft in deze map: het leest en schrijft het spel alleen hier en raakt je andere bestanden nooit aan. De mappen met je handboeken leest het alleen. Buiten de campagnemap bewaart het alleen eigen gegevensmappen (de vertalingen van het dashboard, de tekst die het uit je handboeken las, en Codex of Claude Code als je toestaat dat het die installeert) en tijdelijke mappen terwijl er een afbeelding wordt getekend. Wil je agent iets anders op je computer doen, dan vraagt die het je eerst.

Elke opdracht die de spelleider gebruikt, kun je ook in de campagnemap uitvoeren: `rpg --help` toont ze allemaal. Veel ervan tonen de geheimen van de campagne.

---

## 9. Komt later <!-- icon: hourglass -->

- **Jij als spelleider**, met de AI als de groep.
- **Auteursmodus**: schrijf een avontuur met de AI, exporteer het en deel het.
- **Meerdere spelers op dezelfde computer**, elk met een eigen personage, om de beurt in dezelfde chat.
- **Extensies**: instellingen, avonturen, functies en huisregels.
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
