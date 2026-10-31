<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 9f1774ef 4c5cd093 019e9516 8e136927 7da791ae 423af5fa 17577253 f699a840 2731ea0e 59c1a762. Change the English, then run it again. -->
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

| Wie | Wat die doet |
|---|---|
| **Jij** | Jij speelt je personage: wat die doet, zegt en probeert. |
| **De spelleider** (de AI) | Vertelt het verhaal, speelt alle anderen, bepaalt wat er gebeurt en vraagt om worpen. |
| **RPG Engine** | Bewaart de wereld in bestanden, gooit de dobbelstenen, telt hitpoints, geld, tijd en afstanden en houdt geheimen verborgen tot jij ze ontdekt. |

De wereld blijft van de ene avond op de andere hetzelfde, ook in een nieuwe chat, ook met een andere AI:

- **Wat gezegd is, blijft waar.** Een dode schurk blijft dood.
- **De dobbelstenen zijn echt.** De spelleider kan ze niet buigen, behalve bij de makkelijkste moeilijkheidsgraad, als je die kiest.
- **Geheimen blijven geheim.** De spelleider vertelt je nooit wat jouw personage niet weet.
- **De wereld beweegt mee.** Dreigingen rukken op terwijl je rust of reist, en je ziet de tekenen ervan.
- **Een campagne is een map** op je computer: stop wanneer je wilt en ga later verder.

Een spel komt als spelsysteem, een pakket dat de spelleider voor je campagne installeert. Op dit moment is dat van ons de **vijfde editie**, uit de gratis System Reference Document 5.1. Zonder spelsysteem speel je vrij: een verhaal zonder cijfers. Er komen er meer ([Binnenkort](#9-coming-later)).

---

## 2. Aan de slag <!-- icon: path -->

### 2.1 Wat je nodig hebt

- Een computer met Windows, macOS of Linux, en een webbrowser.
- **Node.js 22** of nieuwer, van [nodejs.org](https://nodejs.org). Hierbij zit `npm`, waarmee je RPG Engine installeert.
- Een **terminal**: op Windows Terminal of PowerShell, op macOS Terminal. Om er een in een map te openen, klik je met de rechtermuisknop op de map en kies je **Openen in Terminal** (Windows) of **Services > Nieuwe Terminal bij map** (macOS).
- Een **AI-agent** voor de spelleider ([2.4](#24-connect-your-ai)), met het **grootste model** dat de agent biedt. Een klein model laat zich sneller overhalen om geheimen te verklappen of de regels te buigen.

### 2.2 Installeren

```text
npm install -g rpg-engine
```

Met `rpg --version` controleer je of het gelukt is. Je gebruikt `rpg` één keer per campagne, om die te maken. Daarna start je agent RPG Engine zelf.

### 2.3 Een campagne maken

Open een terminal in de map waar je je spellen bewaart ([2.1](#21-what-you-need) legt uit hoe):

```text
rpg init "The Salt Isles"
```

Dit maakt de map `The Salt Isles` met een nieuwe campagne erin. Ga erheen met `cd "The Salt Isles"`. Onthoud waar de map staat: je keert er elke keer naar terug als je speelt. Al het andere kies je later, in de chat of op het dashboard. Met `rpg init --help` zie je de opties om er nu al een paar te kiezen, zoals `--language it` of `--difficulty hard`.

De spelleider kan geen campagne voor je maken: vóór `init` vertelt niets je agent waar RPG Engine staat.

### 2.4 Je AI koppelen

De spelleider draait in een **AI-agent**: een AI-app, in de terminal of op het bureaublad, die met de bestanden op je computer kan werken, zoals Claude Code of Codex. Een gewone chat zoals claude.ai of ChatGPT, of een app op je telefoon, is niet genoeg: de spelleider moet bij de bestanden van de campagne op je computer kunnen. Elke agent heeft een eigen abonnement en een eigen login: Claude Code een betaald Claude-abonnement, Codex een ChatGPT-login. Je installeert de agent één keer, vanaf de eigen pagina: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: typ `claude` in de campagnemap. Als het vraagt of je de map vertrouwt, kies dan **Yes, I trust this folder**. Let op: het antwoord dat al geselecteerd staat is *No, exit*. De campagne heeft ook een klein hook, `rpg --listen`, dat de vraag niet laat zien: het vertelt de spelleider meteen wanneer je iets doet op het dashboard.
- **Codex**: typ `codex` in de campagnemap en zeg ja als het vraagt of je de map vertrouwt. Controleer in de desktop-app bij de instellingen dat het geheugen uit staat voor de chats van het spel.
- **Een andere agent**: start die in de campagnemap en geef hem de MCP-server `rpg mcp`. RPG Engine is een standaard MCP-server: elke agent die MCP ondersteunt kan de spelleider zijn, ook lokale agents.

Wij spelen en testen met **Claude Code**. **Codex** is gekoppeld en gecontroleerd, maar er is nog geen hele campagne mee gespeeld. De campagne zet het eigen geheugen van de agent uit: het spel leeft in de bestanden, zodat terugkeren naar een opgeslagen spel ook echt teruggaat.

### 2.5 De eerste chat

Schrijf iets, bijvoorbeeld *Hoi! Laten we beginnen.* In zijn eerste antwoord van elke chat geeft de spelleider je de **link naar je dashboard**, zoiets als `http://127.0.0.1:4750`. Open die en houd hem naast de chat.

Tussen de berichten van de spelleider door toont je agent de tools die hij gebruikt. Open hun details niet (in Claude Code: ctrl+o), want ze kunnen geheimen tonen.

Een nieuwe campagne doorloopt drie stappen, bovenaan het dashboard te zien: **1 Instellingen** (hoe je wilt spelen), **2 Sessie nul** (je maakt je personage, al spelend), **3 Spelen**.

### 2.6 Instellingen: kiezen hoe je speelt

De spelleider vraagt alleen wat nog ontbreekt, een paar vragen tegelijk. De stap **Instellingen** op het dashboard toont dezelfde vragen als kaarten. Schrijf "jij beslist" en de spelleider kiest. Alles kan later veranderen, in de chat of bij **Instellingen**.

| Instelling | Wat het bepaalt | Waarden |
|---|---|---|
| **Mentor** | Hoeveel de spelleider je over de regels leert | uit, hints, tutorial |
| **Moeilijkheid** | Hoe zwaar de wereld speelt | verhaal, makkelijk, normaal, moeilijk, meedogenloos |
| **Dodelijkheid** | Wat neergaan in een gevecht betekent | verhalend (nooit doodgaan), episch (alleen als het ertoe doet), dobbelstenen |
| **Opgeslagen spellen** | Wanneer je terug mag gaan | permadeath, checkpoint, vrij ([3.8](#38-saves-and-going-back)) |
| **Strengheid** | Hoe strak eten, licht en reizen de regels volgen | soepel, regels, simulatie |
| **Dobbelstenen** | Wie jouw dobbelstenen gooit | digitaal, fysiek |
| **Eenheden** | Afstanden en gewichten | metrisch, imperiaal |
| **Stemmen van personages** | Wie spreekt voor de personages die je ontmoet, van de spelleider tot de personages zelf: altijd de spelleider; op sleutelmomenten het personage zelf, dat alleen weet wat het weet, naar keuze van de spelleider; of altijd het personage, voor de belangrijkste of voor iedereen, trager en duurder, waar je AI-app dat kan | de spelleider, soms, hoofdpersonages, iedereen |
| **Metgezellen** | Wie met je meereist | geen, met jou gemaakt, door de spelleider gemaakt, tijdens het spel ontmoet |
| **Afbeeldingen** | Afbeeldingen van plaatsen, missies en wie je ontmoet | geen, op verzoek, nieuwe plaatsen, missies en wie je ontmoet ([3.11](#311-pictures)) |
| **Grenzen** en **Sluiers** | Wat nooit voorkomt, en wat alleen buiten beeld gebeurt | lijsten |
| **Taal** | De taal van het spel en van het dashboard | elke taal |

De vijfde editie voegt **voortgang** toe: ervaringspunten of mijlpalen.

Als er geen uitgeschreven wereld is, vraagt de spelleider ook om een **uitgangspunt** (genre, toon, een paar elementen en wat je het leukst vindt aan een spel, zoals gevechten, mysteries, praten of verkennen, in je eigen woorden) en om de **voorbereiding**: de wereld al spelend opbouwen, of alles aan het begin.

**De stijl van de spelleider** wordt nooit gevraagd, maar je kunt hem veranderen in de chat of bij **Instellingen**: het **proza** (eenvoudig, literair, pulp, droog), de **verhalen** die de spelleider bedenkt (situaties, bogen, afleveringen, mysterie), een schrijver om **op te lijken**, of iets anders **in je eigen woorden**.

### 2.7 Sessie nul: je personage

Je maakt je personage samen met de spelleider, zoals aan een tafel. Elke keuze is aan jou, tenzij je de spelleider vraagt die te maken. Kom met een uitgewerkt idee, een vaag idee of met niets. De spelleider vertelt je hoe de vaardigheidsscores worden bepaald voordat er een dobbelsteen wordt gegooid. Een verhaal van je personage is nooit verplicht. Geef je er een, dan schrijft de spelleider het in jouw woorden. Daarna vraagt de spelleider om een afbeelding van je personage ([3.7](#37-your-characters-story-and-picture)). RPG Engine rekent het karakterblad uit: jij doet nooit de sommen.

---

## 3. Spelen <!-- icon: chat -->

### 3.1 Praten met de spelleider

Schrijf wat jouw personage doet of zegt, in je eigen woorden:

> Ik vraag de herbergier wie er vanavond nog meer langskwam.

Wil je buiten het verhaal om iets zeggen? Schrijf het dan tussen vierkante haken: *[Hoe werkt grijpen?]* De spelleider antwoordt ook tussen haken.

Jij zegt wat je probeert; de spelleider zegt wat er gebeurt. De spelleider beslist nooit voor jouw personage en praat nooit over de engine. Je kunt de spelleider wel vragen hoe je het dashboard gebruikt.

**Handelen vanaf het dashboard**: klik op een naam op je karakterblad, zoals een wapen, een spreuk of iets wat je bij je hebt, en kies dan voor wie het bedoeld is. Of klik op iemand om met die persoon te praten. Het dashboard schrijft je zin, *Ik val Gemaskerde Bandiet 1 aan met Strijdknots.*, die je kunt aanpassen voordat je op **Zeg het tegen de spelleider** klikt. De spelleider hoort het alsof je het in de chat zei en beoordeelt het zoals al het andere. Kan je AI-app het niet zelf horen? Dan maakt **Kopiëren** de zin klaar om in de chat te plakken.

### 3.2 Worpen

De spelleider vraagt alleen om een worp als de uitkomst onzeker is en ertoe doet. Eerst zegt de spelleider wat er op het spel staat. Daarna:

- **Op het dashboard** toont een banner voor elke proef een knop, zoals *Acrobatiek +4 · met vantaggio*. Klik erop: de dobbelstenen vallen op de pagina en de spelleider hoort de uitkomst. Je kunt ook klikken op de regel van je karakterblad die oplicht, de dobbelstenen uit de dobbelbak gooien, of in de banner iets anders schrijven.
- **Met de hand**, in de hoek van de banner of bij **Instellingen**: de banner vertelt wat je moet gooien, en jij gooit het vanaf je karakterblad of uit de dobbelbak.
- **Echte dobbelstenen**, met de dobbelsteeninstelling op fysiek: je schrijft op wat je gooide, *[Ik gooide een 14.]*, en RPG Engine telt je modifiers erbij op.

**Vrije worpen**: klik op een willekeurig getal op je karakterblad, of open de dobbelbak, om voor de lol te gooien. Ze tellen nooit mee en de spelleider ziet ze niet.

**De worpen van de spelleider** staan in je worpenkolom, behalve de geheime. Je kunt altijd vragen: *[Was die worp echt?]* Bij een geheime worp geeft de spelleider een vingerafdruk. Die bewijst dat de worp is gedaan voordat je het vroeg.

### 3.3 Scènes en gevechten

Het verhaal verloopt in **scènes**: een gevecht, een gesprek, verkennen, reizen of rusten. Aan het einde van elke scène slaat het spel zichzelf op, en de scène komt in je dagboek.

In een gevecht vertelt de spelleider elke beurt die niet van jou is, en stopt waar jij kunt beslissen. De **Scène** toont bovenaan wie er aan de beurt is en wie daarna komt, en de kaart van jouw personage naast de kaart van de plek. De volgorde van de beurten, de hitpoints van je groep en hoe gewond de vijanden eruitzien, in woorden, blijven naast de pagina staan. Valt jouw personage neer, dan verschijnen de tiro salvezza tegen de dood groot op de pagina.

### 3.4 Tijd, reizen en de wereld die verder gaat

RPG Engine houdt de datum bij. Tussen sessies verstrijkt geen tijd. Zeg dat je rust, *We nemen een lange rust*, en zodra de spelleider het goedvindt, geeft de rust terug wat hij hoort terug te geven. Bij een korte rust kan de spelleider op het dashboard vragen hoeveel hitdobbelstenen je uitgeeft: gooi ze een voor een, zie wat elke worp geneest en stop wanneer je wilt. Zeg waarheen je gaat, *We nemen de weg naar het noorden, naar Rocca*, en RPG Engine rekent de route, de afstand en de dagen uit en stopt als er onderweg iets gebeurt. Geld wordt geteld in de munten van het spel, wisselgeld inbegrepen.

Schurken hebben plannen met deadlines. Elke nieuwe dag laat de spelleider de dreigingen opschuiven die de tijd heeft verder gebracht. Jij ziet de tekenen ervan, maar nooit de klok zelf.

### 3.5 Kaarten

**Wereld** toont de plaatsen die jouw personage kent, de wegen ertussen en het pad dat je liep, met mist over de rest. **Scène** toont de kaart van de plek waar je bent, als die er is, met wie waar staat. In een gevecht zijn op jouw beurt de vakjes die je niet kunt bereiken verhuld. Vraagt de spelleider waarheen je gaat? Tik op een vakje, of schrijf het op, zoals *E4*.

**Wereld** bewaart ook wat jouw personage weet. **Kennis** toont de mensen, plaatsen, facties, wezens en verhalen die het personage kent, elk zoals het personage ze kent. Zoek erin, of open er een om het helemaal te lezen. Een naam in de tekst leidt naar de eigen pagina. **Documenten** bewaart de brieven, berichten en bladzijden die het personage vond, om ze nog eens te lezen. **Kalender** toont vandaag, de deadlines van je missies met de tijd die er nog is, en de dagen van het verhaal. Een dag met scènes leidt naar de hoofdstukken in het Dagboek.

### 3.6 Missies, dagboek en notities

Een taak die jouw personage op zich neemt, wordt een missie in het **Dagboek**, met de doelen, de deadline en wat de missie meet. Geef er een ster aan om de missie bovenaan in Scène in beeld te houden. Het Dagboek vertelt ook je **verhaal**, scène voor scène, en bewaart je **notities**: die zijn privé, tenzij je er een **Deelt**. De spelleider hoort die dan als wat jij denkt, nooit als een feit. Onder **Metgezellen** lees je de dagboeken van je metgezellen. Af en toe, aan het einde van een dag of een missie, schrijven ze een paar regels over wat ze denken en voelen.

### 3.7 Het verhaal en het portret van je personage

Op je karakterblad heeft de kaart **Beschrijving** een vak voor het verhaal van je personage: de spelleider schrijft het erin, nadat jij ja hebt gezegd. Voor een plaatje geef je de spelleider een bestand (PNG, JPEG, WebP of SVG, tot 5 MB) met de plek waar het op je computer staat. Je kunt ook een portret laten maken ([3.11](#311-pictures)): *[Maak een portret voor me: grijs haar in een vlecht, een litteken op de kin.]*

### 3.8 Opgeslagen spellen en teruggaan

RPG Engine slaat de hele campagne op aan het einde van elke scène. De instelling **opgeslagen spellen** bepaalt de rest:

| Opgeslagen spellen | Opslaan wanneer je wilt | Teruggaan |
|---|---|---|
| **permadeath** | nee | nooit |
| **checkpoint** | nee | naar het laatste opgeslagen spel, alleen als je personage sterft |
| **vrij** | ja | naar elk opgeslagen spel |

In elke modus kun je **opnieuw beginnen**, vanaf het begin van het spel of vanaf sessie nul. Doe dat in de chat of bij **Opgeslagen spellen**.

Open na het teruggaan **een nieuwe chat**: de oude chat onthoudt wat ongedaan is gemaakt. Schrijf *ga verder* in de nieuwe chat en druk dan bij Opgeslagen spellen op **Ik heb een nieuwe chat geopend**.

### 3.9 Sessies: stoppen en terugkomen

Stop wanneer je wilt: *[Laten we er voor vanavond mee ophouden.]* Alles staat al opgeslagen in de bestanden. Om terug te komen start je je agent in de campagnemap en schrijf je *ga verder*. De spelleider geeft je een korte samenvatting en gaat verder.

### 3.10 De stemming van de spelleider

De robot bovenaan het dashboard is de spelleider. Zijn gezicht volgt de toon van het verhaal en verklapt nooit wat je nog niet weet. Als de chat gesloten is, slaapt hij.

### 3.11 Plaatjes

RPG Engine kan plaatjes laten maken van de plaatsen die je bereikt, de missies die je aanneemt en de mensen die je ontmoet, zoals de instelling **plaatjes** bepaalt, en het portret van je personage als je erom vraagt. Het gebruikt je eigen Codex of Claude Code, met jouw login, op jouw abonnement en binnen de limieten daarvan: **Codex** schildert ze, anders tekent **Claude Code** ze. **Instellingen** laat zien of deze computer ze kan maken, en zo niet, hoe je dat instelt. Je kunt de spelleider altijd een eigen plaatje geven.

### 3.12 Veiligheid: grenzen, sluiers en stop

**Grenzen** komen nooit in het spel voor. **Sluiers** gebeuren alleen buiten beeld. Schrijf op elk moment *[stop]*: de spelleider laat die inhoud meteen vallen en voegt hem toe aan je grenzen.

### 3.13 Van gedachten veranderen

Elke instelling kan veranderen, in de chat of bij **Instellingen**. Een uitspraak die de spelleider doet zonder het regelboek wordt een **precedent**, zodat dezelfde vraag de volgende keer hetzelfde antwoord krijgt.

---

## 4. Het dashboard <!-- icon: party -->

Een pagina op je eigen computer. Je opent hem alleen in de browser van die computer. Hij is live zolang de chat openstaat. Als de chat sluit, zie je *Not connected*. Bij de volgende chat komt de pagina vanzelf terug.

- **Groep**: jouw karakterblad en dat van je metgezellen. Klik op een getal om ermee te gooien. Beweeg je muis erover om te zien waar het getal vandaan komt. Staat er een pijl bij de dobbelsteen, dan zie je ook wat de worp beter of slechter maakt. Ernaast staan de worpen.
- **Scène**: waar je bent, met de afbeelding en de kaart, wie er is en wat er gebeurt. In een gevecht zie je de beurten en de kaart van jouw personage.
- **Dagboek**: missies, het verhaal, de dagboeken van je metgezellen en je notities.
- **Wereld**: de wereldkaart, wat jouw personage weet, de gevonden documenten en de kalender.
- **De dobbelbak**: kies dobbelstenen en een modifier en gooi. ×2 verdubbelt de dobbelstenen, nooit de modifier, zoals bij een kritieke treffer.
- **Opgeslagen spellen**, **Help**, **Instellingen** en **Over**: als pictogrammen aan het eind van de rij. Bij Instellingen vind je ook de voorkeuren van de pagina zelf: thema, dobbelgeluid en dobbelsteenset.

Als de spelleider je iets vraagt, blijft de banner bovenaan staan, in welk onderdeel je ook bent.

---

## 5. Spelsystemen en huisregels <!-- icon: dice -->

### 5.1 Wat een spelsysteem is

De gegevens van één spel: het karakterblad, de cijfers, de wezens, voorwerpen, spreuken en regelteksten. Elke campagne speelt één systeem. RPG Engine berekent het karakterblad en wat er wordt uitgegeven en terugkomt. Hoe een eigenschap werkt, leest de spelleider in de regels en beslist die, zoals aan een echte tafel.

### 5.2 Vijfde editie

De rassen, klassen, subklassen, een achtergrond en een feat van de SRD 5.1; de 319 spreuken, de wapens, wapenrustingen, magische voorwerpen en monsters; de hoofdstukken met regels, die de spelleider op de exacte tekst leest; het volledige karakterblad, uitgerekend.

Het is een pakket op zich: de spelleider biedt het aan als je een campagne opzet en installeert het. Een campagne die dit systeem speelt, installeert het zelf de eerste keer dat de campagne opent op een computer zonder het pakket. De spelleider zegt dat dan tegen je.

Je kunt ook inhoud spelen die de SRD niet heeft, uit een boek dat je bezit: de spelleider schrijft die uit als pagina's van je campagne en RPG Engine behandelt ze als eigen inhoud. RPG Engine levert alleen open inhoud mee; wat jouw spelleider weet, is niet beperkt.

Je eigen handboeken kunnen je bibliotheek zijn. Vertel de spelleider waar ze staan, *[Mijn handboeken staan in D:\Books\5e.]*, of voeg hun map toe via Packages › Library en zeg één keer ja in het venster dat je computer toont. RPG Engine leest ze op deze computer. Elke campagne gebruikt de mappen die je daar aanzet. De spelleider zoekt erin als die een regel beslist, na de SRD, en noemt het boek en de pagina. Ze lezen het best als tekst of als pdf's waarvan je de tekst kunt selecteren. Een gescande pdf wordt gelezen aan de hand van afbeeldingen van de pagina's, alleen op Windows, in een paar minuten en met een paar fouten. RPG Engine verandert je handboeken nooit, stuurt de tekst nergens heen en kopieert die nooit naar een campagne.

### 5.3 Huisregels en je eigen aanvullingen

Vraag het aan de spelleider: *[Huisregel: bij een natuurlijke 1 op een aanval laat je je wapen vallen.]* De spelleider bewaart die als afspraak van de tafel, of schrijft een pagina of een getal van het karakterblad uit als dat nodig is. Huisregels die al uitgeschreven zijn, kunnen als tekstbestanden in de map `rules` van de campagne.

### 5.4 Je eigen spelsysteem toevoegen of importeren

Een spelsysteem is een pakket: de spelleider installeert er een uit npm, een map of een bestand. Eén dat niet van ons is, installeert de spelleider alleen met jouw ja, in een venster van je computer. Een spelsysteem maken is werk voor een ontwikkelaar en staat beschreven in de documenten van RPG Engine op GitHub. Een boek van jezelf omzetten in een spelsysteem kan nog niet ([Binnenkort](#9-coming-later)).

---

## 6. Extensies <!-- icon: plus -->

Een extensie voegt iets toe aan een campagne, bovenop het spelsysteem: een functie zoals het weer, dat bij elke dageraad verandert, of een slot openbreken met dobbelstenen. Voeg een extensie toe via Packages › Add, uit de lijst of met de naam op npm, een map of een bestand. Een extensie van een ander bevat code en komt er alleen met jouw ja, in een venster van je computer. Een extensie die voor een ander spelsysteem is gemaakt, geeft aan voor welk systeem, en wordt niet toegevoegd. Via Packages › Installed werk je een extensie bij of haal je die weg. De spelleider kan ook een extensie toevoegen, als jij erom vraagt.

---

## 7. Waar een campagne vandaan komt, en de taal ervan <!-- icon: world -->

### 7.1 Drie manieren om een wereld te hebben

- **Al spelend gemaakt**: uit jouw uitgangspunt bouwt de spelleider elke plaats, persoon en plot vlak voordat je ze nodig hebt, en onthoudt ze.
- **Aan het begin voorbereid**: hetzelfde, maar met de wereld gebouwd vóór het spel.
- **Uit je eigen avontuur of boek**: geef de spelleider het bestand, *[Importeer dit avontuur als onze campagne: D:\Books\adventure.pdf. Vertel me niets van wat erin staat.]* Het leest het best als tekst, een EPUB, een Word-document of een pdf waarvan de tekst te selecteren is. Een gescande pdf wordt gelezen aan de hand van de afbeeldingen van de pagina's, alleen op Windows, langzaam en met een paar fouten. Je eigen Codex of Claude Code leest het buiten de chat, of anders de spelleider in de chat, binnen jouw abonnement: het hele document gaat naar OpenAI of Anthropic, onder de voorwaarden van je account en de keuze die je daar maakte over training. Het dashboard toont hoe ver het is. Bij een roman stelt de spelleider voor waar je begint. De spelleider schrijft de plaatsen, de personages en de geheimen.

Een campagne speel je één keer. Wil je hetzelfde avontuur opnieuw spelen, maak dan een nieuwe campagne.

### 7.2 Talen

Eén taal per campagne: die van de spelleider, die het dashboard volgt. Het dashboard komt met 26 talen. Elke andere taal wordt op je computer vertaald door Codex of Claude Code, of, zonder die twee, door de spelleider in de chat. De termen van de vijfde editie in het Italiaans komen uit de officiële Italiaanse SRD. De regeltekst blijft in het Engels en de spelleider vertelt hem in jouw taal.

---

## 8. Voor wie nieuwsgierig is: de campagnemap <!-- icon: list -->

Je hoeft hem nooit te openen, en hij bevat de geheimen van je campagne. Hij bevat `campaign.yaml` (je instellingen), `state.yaml` (waar het spel staat), `world/` (voor elk personage, elke plaats, elke missie en de rest één markdownpagina), `rules/` (je huisregels), `images/`, `log.jsonl` (elke wijziging), `.saves/`, `.player/` (je notities) en de kleine bestanden die AI-agents vertellen waar RPG Engine staat. De pagina's gebruiken het formaat van Obsidian. Als je een pagina met de hand aanpast, hoort de spelleider dat bij het volgende antwoord.

RPG Engine blijft in deze map: het leest en schrijft het spel alleen hier en raakt je andere bestanden nooit aan. De mappen met je handboeken leest het alleen. Buiten de campagnemap bewaart het alleen eigen gegevensmappen (de vertalingen van het dashboard, de tekst die het uit je handboeken las, en Codex of Claude Code als je toestaat dat het die installeert) en tijdelijke mappen terwijl er een afbeelding wordt getekend. Wil je agent iets anders op je computer doen, dan vraagt die het je eerst.

Elke opdracht die de spelleider gebruikt, kun je ook in de campagnemap uitvoeren: `rpg --help` toont ze allemaal. Veel ervan tonen de geheimen van de campagne.

---

## 9. Binnenkort <!-- icon: hourglass -->

- **Jij als spelleider**, met de AI die de groep speelt.
- **Auteursmodus**: schrijf een avontuur met de AI, exporteer het en deel het.
- **Meerdere spelers op dezelfde computer**, elk met een eigen personage, die om de beurt in dezelfde chat spelen.
- **Meer extensies**: werelden, functies en huisregels om te delen.
- **Andere spellen**: meer spelsystemen, en je eigen systeem.

---

## 10. Vragen en problemen <!-- icon: info -->

### Vragen

**Moet ik de regels kennen?** Nee. Kies de mentor tutorial en vraag tussen haken wanneer je maar wilt.

**Kan de spelleider valsspelen?** De spelleider kan een worp die RPG Engine deed niet veranderen, behalve bij moeilijkheid verhaal, en ook geen feiten die al vastliggen.

**Kost het iets?** RPG Engine is gratis. De spelleider draait op het abonnement van je agent, of op je eigen computer met een lokaal model. Een speelavond is een lange chat: bij de kleinste abonnementen kun je de limiet van je abonnement bereiken voordat de avond voorbij is. Afbeeldingen, vertalingen en imports gebruiken hetzelfde abonnement. RPG Engine zelf gebruikt nooit een API-sleutel, waarvoor per aanroep wordt betaald: log je agent in met je account, niet met een sleutel.

**Kan ik op mijn telefoon spelen?** Nee: de spelleider draait op je computer en het dashboard opent alleen daar.

**Kan ik met vrienden spelen?** Nog niet: nu is het één speler, één personage, plus metgezellen ([Coming later](#9-coming-later)).

**Kan ik de volgende keer een andere AI gebruiken?** Ja: open de campagne in een andere agent en schrijf *verder*.

### Problemen

**Het dashboard gaat niet open.** Vraag het de spelleider: `[Wat is de link naar het dashboard?]`. Het werkt alleen zolang er een chat open is in die campagne, na het eerste antwoord van de spelleider.

**De spelleider lijkt het spel niet te kennen.** Je agent heeft RPG Engine niet geladen. Controleer of je hem in de campagnemap hebt gestart en de map hebt vertrouwd. Schrijf in Claude Code `/mcp` en verbind `rpg` opnieuw. In Codex moet `codex mcp list` in de campagnemap `rpg` tonen. Wordt `rpg --version` niet gevonden, installeer RPG Engine dan opnieuw ([2.2](#22-install)).

**Bijwerken.** Voer `npm install -g rpg-engine` opnieuw uit en open dan een nieuwe chat: een spelleider die al draait houdt de versie waarmee die begon.

**De spelleider herinnert zich iets wat ik ongedaan heb gemaakt.** Open een nieuwe chat en druk bij Opgeslagen spellen op **Ik heb een nieuwe chat geopend**.

**Er verschijnen geen afbeeldingen.** Instellingen > Afbeeldingen zegt of deze computer ze kan maken, en hoe.

**Installeren mislukt, of `rpg` start niet.** `node --version` moet 22 of nieuwer zeggen. Houd RPG Engine en je campagnes op Windows buiten paden die `&` bevatten.

**De link naar het dashboard is veranderd.** Een ander programma nam het gebruikelijke adres in. De spelleider geeft je de nieuwe link.
