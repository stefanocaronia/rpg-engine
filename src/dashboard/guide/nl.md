<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,dcb833ce,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,a9023962,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: de complete handleiding

**RPG Engine** laat je een tafelrollenspel spelen met een **AI als spelleider**. Je speelt in het **dashboard**, een venster op je computer met je karakterblad, de dobbelstenen, de kaarten, je dagboek en de **chat** met de spelleider.

Deze handleiding vertelt je hoe je speelt. De pagina legt haar eigen knoppen uit: laat de muisaanwijzer op een knop rusten om te zien wat die doet.

## Snelstart <!-- icon: send -->

1. Installeer **Node.js** vanaf [nodejs.org](https://nodejs.org) (de LTS-versie).
2. Open een nieuwe terminal en schrijf `npm install -g rpg-engine`. Als Windows meldt dat het uitvoeren van scripts is uitgeschakeld, schrijf dan `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, antwoord ja en probeer het opnieuw.
3. Schrijf `rpg open` en druk op Enter als het pictogram op je bureaublad wordt aangeboden ([2.2](#22-installing)). Vanaf dan start je RPG Engine met het pictogram.
4. Druk op **Nieuwe campagne**, geef de campagne een naam en druk op **Aanmaken** ([2.3](#23-a-new-campaign)).
5. Kies in de chat je AI-app en het model ([2.4](#24-connect-your-ai)): Claude Code heeft een betaald Claude-abonnement nodig, Codex een ChatGPT-account, gratis of betaald. Druk op **Chat openen** en dan op **Beginnen**.

Het eerste antwoord kan een paar minuten duren. Daarna vraagt de spelleider hoe je wilt spelen, en maken jullie samen je personage.

## 1. Wat RPG Engine is <!-- icon: about -->

| Wie | Wat die doet |
|---|---|
| **Jij** | Jij speelt je personage: wat die doet, zegt en probeert. |
| **De spelleider** (de AI) | Vertelt het verhaal, speelt alle anderen, bepaalt wat er gebeurt en vraagt om worpen. |
| **RPG Engine** | Bewaart de wereld in bestanden, gooit de dobbelstenen, telt hitpoints, geld, tijd en afstanden en houdt geheimen verborgen tot jij ze ontdekt. |

Zo blijft de wereld van de ene avond op de andere hetzelfde, ook in een nieuwe chat, ook met een andere AI:

- **Wat gezegd is, blijft waar.** Een dode schurk blijft dood.
- **De dobbelstenen zijn echt.** De spelleider kan ze niet veranderen, behalve bij de makkelijkste moeilijkheidsgraad.
- **Geheimen blijven geheim.** De spelleider vertelt je nooit wat jouw personage niet weet.
- **De wereld beweegt mee.** Dreigingen rukken op terwijl je rust of reist.
- **Een campagne is een map** op je computer: stop wanneer je wilt en ga later verder.

Een spel komt als spelsysteem: op dit moment is dat van ons de **vijfde editie**, uit de gratis System Reference Document 5.1. Zonder spelsysteem speel je vrij: een verhaal zonder cijfers.

---

## 2. Aan de slag <!-- icon: path -->

### 2.1 Wat je nodig hebt

- Een computer met Windows, macOS of Linux.
- **Node.js 24** of nieuwer, van [nodejs.org](https://nodejs.org).
- Een **terminal**, alleen om te installeren: op Windows Terminal of PowerShell, op macOS Terminal.
- Een **AI-app** voor de spelleider, met je eigen account ([2.4](#24-connect-your-ai)).

### 2.2 Installeren

```text
npm install -g rpg-engine
rpg open
```

De eerste regel installeert RPG Engine. Als npm aanbiedt om zichzelf bij te werken, kun je dat negeren.

`rpg open` opent het venster van RPG Engine. De eerste keer wordt een pictogram op je bureaublad en in je menu aangeboden: druk op Enter voor ja, en vanaf dan start je met het pictogram.

Mislukt de installatie? Controleer dan of `node --version` 24 of hoger zegt. Als Windows meldt dat het uitvoeren van scripts is uitgeschakeld, schrijf dan `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` en antwoord ja. Zet RPG Engine en je campagnes op Windows niet in paden die een `&` bevatten.

### 2.3 Een nieuwe campagne

Druk op **Nieuwe campagne** en geef een **Naam**, een **Taal** en een **Spelsysteem** op. De rest maakt de spelleider samen met je. Druk op **Aanmaken**: de campagne opent in een eigen venster.

De spelleider en het dashboard spreken de taal van de campagne. De regeltekst van de vijfde editie blijft Engels, en de spelleider vertelt die in jouw taal.

De campagne is een map met haar naam, in de map `RPG Engine` van je gebruikersmap. Klik de volgende keer op de kaart van de campagne.

### 2.4 Je AI koppelen

De spelleider draait in een **AI-app** op je computer, met je account. Een webchat zoals claude.ai of ChatGPT is niet genoeg: de spelleider moet bij de bestanden van de campagne kunnen.

- **Claude Code**: een betaald Claude-abonnement (Pro of hoger).
- **Codex**: een ChatGPT-account, gratis of betaald.
- **OpenCode**: geen account; een paar gratis modellen voor een beperkte tijd, of die van je eigen aanbieder, ook lokale.
- **Antigravity**: een Google-account; het gratis gebruik heeft weeklimieten.

Kies in de chat de app, het **Model** en het **Denkwerk van de spelleider**. Ontbreekt de app, of ben je niet ingelogd? Dan installeert een knop de app, logt je in of opent de site ervan. RPG Engine ziet nooit je wachtwoord.

Een speelavond is een lange chat: met de kleinste abonnementen kun je de limiet bereiken voordat de avond voorbij is. Speel met het grootste model dat je hebt: een klein model laat zich sneller overhalen om geheimen te verklappen.

Wij spelen en testen RPG Engine het meest met **Claude Code**. Antigravity is **in proefperiode**: de app kan uit het spel stappen en bewaart je chats in een geheugen dat je niet kunt uitzetten. Wat je daar schrijft, gaat naar Google, dat het door mensen kan laten lezen. RPG Engine is geen product van Google.

### 2.5 De eerste chat

Druk op **Chat openen** en dan op **Beginnen**. Het eerste antwoord kan een paar minuten duren. Daarna doorloopt een nieuwe campagne drie stappen:

1. **Instellingen**: de spelleider vraagt hoe je wilt spelen, een paar vragen tegelijk: hoe zwaar de wereld is, of je kunt doodgaan, wanneer je terug mag naar een opgeslagen spel. Schrijf *Jij beslist* en de spelleider kiest. Alles kan later veranderen.
2. **Sessie nul**: je maakt je personage samen met de spelleider, zoals aan een tafel. RPG Engine doet de sommen van het karakterblad. Heb je al een personage? Plak dan het karakterblad in de chat.
3. **Spelen**: de spelleider zet de eerste scène op.

### 2.6 Spelen in je AI-app

Je kunt ook spelen in de eigen chat van je AI-app, in een terminal of in de desktop-app, met het dashboard ernaast.

1. Open een terminal in de map waar je je spellen bewaart: klik met de rechtermuisknop op de map en kies **Openen in Terminal** (Windows) of **Services > Nieuwe Terminal bij map** (macOS).
2. Schrijf `rpg init "The Salt Isles"`: dat maakt de map `The Salt Isles` met een nieuwe campagne erin.
3. Start je app in die map: `claude`, `codex`, `agy` voor Antigravity, of `opencode`. Zeg ja als wordt gevraagd of je de map vertrouwt: in Claude Code is het antwoord dat al geselecteerd staat *No, exit*.
4. Schrijf *Hoi! Laten we beginnen.* De spelleider geeft je de link naar je dashboard: open die naast de chat.

Goed om te weten:

- Open de details van de tools die je app gebruikt niet (in Claude Code: ctrl+o): ze kunnen geheimen tonen.
- Zet in de desktop-app van Codex het geheugen uit voor de chats van het spel.
- Kent de spelleider het spel niet? Schrijf dan `rpg init` in de campagnemap en open een nieuwe chat.
- Vindt Windows `claude` niet? Voeg dan de map die het installatieprogramma noemde toe aan het PATH en open een nieuwe terminal.
- Een campagne wordt door één chat tegelijk gespeeld: zolang jouw chat open is, wacht de chat van het dashboard.

---

## 3. Spelen <!-- icon: chat -->

### 3.1 Praten met de spelleider

Schrijf wat jouw personage doet of zegt:

> Ik vraag de herbergier wie er vanavond nog meer langskwam.

Jij zegt wat je probeert; de spelleider zegt wat er gebeurt. De spelleider beslist nooit voor jouw personage.

Buiten het verhaal schrijf je `[OOC: …]` (out of character): *[OOC: Hoe werkt grijpen?]* Je kunt de spelleider vragen naar de regels, of naar hoe het dashboard werkt.

Vraagt de spelleider je iets? Antwoord dan met de knoppen of in je eigen woorden. Je kunt ook handelen vanaf je karakterblad: klik op een wapen, een spreuk of een voorwerp en kies wat je ermee doet.

**Vaste orders**: zeg tegen je metgezellen iets wat moet blijven gelden, zoals *Vanaf nu laten we altijd één in leven*. De spelleider houdt het aan tot jij het opheft.

### 3.2 Worpen

De spelleider vraagt alleen om een worp als de uitkomst onzeker is en ertoe doet. Een banner toont de worp: klik erop en de dobbelstenen vallen.

De dobbelstenen zijn van RPG Engine, niet van de spelleider. Je kunt altijd vragen: *[Was die worp echt?]* Ook bij een geheime worp kan de spelleider bewijzen dat die is gedaan voordat je het vroeg.

Staat **Dobbelstenen** op fysiek? Gooi dan je eigen dobbelstenen en schrijf de uitkomst op: *[Ik gooide een 14.]* Worpen die je voor de lol doet, vanaf je karakterblad of met **Vrije worp**, tellen nooit mee.

### 3.3 Scènes, gevechten en reizen

Het verhaal verloopt in **scènes**: een gevecht, een gesprek, een reis, een rust. Aan het einde van elke scène slaat het spel zichzelf op en komt de scène in je dagboek.

In een gevecht speelt de spelleider elke beurt die niet van jou is, en stopt als jij moet beslissen.

Zeg waarheen je gaat, *We nemen de weg naar het noorden, naar Rocca*: RPG Engine rekent de afstand en de dagen uit en stopt als er onderweg iets gebeurt. Intussen gaan de plannen van de schurken door, en jij ziet de tekenen ervan.

### 3.4 Opgeslagen spellen

RPG Engine slaat de campagne op aan het einde van elke scène. De instelling **Opgeslagen spellen** bepaalt wanneer je terug mag:

- **Permanente dood**: nooit.
- **Checkpoint**: naar het laatste opgeslagen spel, alleen als je personage sterft.
- **Vrij**: naar elk opgeslagen spel, en je kunt opslaan wanneer je wilt.

In elke modus kun je opnieuw beginnen, in de chat of bij **Opgeslagen spellen**.

Open na het teruggaan een nieuwe chat, want de oude chat onthoudt wat ongedaan is gemaakt:

1. Druk op **Chat sluiten** en dan op **Nieuwe chat**. Open in de eigen chat van je AI-app een nieuw gesprek (`/clear` in Claude Code).
2. Schrijf *Doorgaan*.
3. Druk bij Opgeslagen spellen op **Ik heb een nieuwe chat geopend**. Tot dan wacht de spelleider.

### 3.5 Stoppen en hervatten

Stop wanneer je wilt: alles is al opgeslagen. Sluit het venster van het dashboard, en kort daarna stopt het spel. Er gaat niets verloren.

Om terug te komen open je RPG Engine met het pictogram en klik je op je campagne. Druk op **Chat hervatten** en dan op **Verhaal hervatten**: de spelleider vertelt je waar je was en gaat verder. De volgende keer kun je ook een andere AI-app kiezen.

### 3.6 Beperkingen en stop

**Grenzen** komen nooit in het spel voor; **sluiers** gebeuren alleen buiten beeld. Je stelt ze in bij **Instellingen**.

Schrijf op elk moment *[stop]*: de spelleider laat die inhoud vallen en voegt hem toe aan je grenzen.

### 3.7 Afbeeldingen

De spelleider kan afbeeldingen laten maken van plaatsen, missies en mensen, zoals de instelling **Afbeeldingen** bepaalt, en een portret van je personage als je erom vraagt. Je AI-app maakt ze, op jouw abonnement. Verschijnt er niets? Dan laat **Instellingen** zien of deze computer ze kan maken.

Je kunt ook je personage, of een pagina van de wereld, een eigen afbeelding geven, vanaf de pagina zelf.

---

## 4. Het dashboard <!-- icon: party -->

Het venster waarin je je spel ziet. Het toont alleen wat jouw personage weet.

- **Rollenspel**: de chat met de spelleider, als die niet naast de pagina staat.
- **Groep**: jouw karakterblad, dat van je metgezellen en de worpen.
- **Scène**: waar je bent, wie er is en de kaart; in een gevecht de beurten.
- **Dagboek**: missies, het verhaal als boek, de dagboeken van je metgezellen en je notities.
- **Wereld**: de wereldkaart, wat jouw personage weet, de gevonden documenten en de kalender.
- **Opgeslagen spellen**: teruggaan en opnieuw beginnen.
- **Instellingen**: hoe je speelt, en hoe de pagina eruitziet.
- **Pakketten**: het spelsysteem, uitbreidingen, je handleidingen en updates: als er een nieuwe RPG Engine is, staat dat hier.

Zegt de pagina dat ze niet verbonden is? Druk dan op **Campagne heropenen**.

Spelen vanaf je telefoon, thuis: zet bij **Instellingen**, **Dashboard**, **Toegang via telefoon** aan en richt de camera van de telefoon op de code, met de telefoon op hetzelfde wifi als de computer. Windows kan vragen of Node.js het netwerk mag gebruiken: sta dat toe op privénetwerken, en stel het wifi in als privénetwerk. Het spel reist onversleuteld: gebruik het alleen op een netwerk dat je vertrouwt, zoals je eigen thuisnetwerk, nooit op een openbaar wifi, van een hotel of van een kantoor. Zet het weer uit als je klaar bent: het spel stopt met het laatste venster van de computer.

Maakt een thema de pagina slecht leesbaar? Voeg dan `#/settings/page` toe aan het einde van het adres en zet **Eigen stijl van het thema** uit.

---

## 5. Regels, handboeken en extensies <!-- icon: dice -->

Een **Spelsysteem** bevat de gegevens van één spel: het karakterblad, wezens, voorwerpen, spreuken en regels. RPG Engine rekent het karakterblad uit. Hoe een regel werkt, leest en bepaalt de spelleider, zoals aan een echte speltafel.

**Fifth edition** bevat de vrije regels van het System Reference Document 5.1. Je kunt ook inhoud spelen uit een boek dat je zelf hebt: de spelleider schrijft die in je campagne.

**Je handboeken**: vertel de spelleider waar ze staan, of voeg hun map toe bij **Pakketten**. De spelleider zoekt regels erin op en noemt het boek en de pagina. RPG Engine verandert ze nooit en kopieert ze nooit naar een campagne.

**Huisregels**: vraag het de spelleider, *[House rule: a natural 1 on an attack means you drop your weapon.]* De spelleider onthoudt de regel. Een uitspraak die de spelleider eenmaal doet, geldt de volgende keer ook.

**Extensies** voegen iets toe aan het spel, zoals het weer. Voeg ze toe bij **Pakketten**, of vraag het de spelleider.

---

## 6. Je eigen avontuur <!-- icon: world -->

Als er geen uitgewerkte wereld is, bouwt de spelleider er een uit jouw uitgangspunt en onthoudt die.

Wil je een avontuur of een boek spelen dat je zelf hebt? Geef de spelleider het bestand: *[Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* Een bestand buiten de campagne wordt pas gelezen na jouw ja. Het leest het best als tekst, EPUB, Word of een pdf waarvan je de tekst kunt selecteren.

Het hele document gaat naar het bedrijf van de AI die het leest. Een campagne speel je één keer: wil je hetzelfde avontuur opnieuw spelen, maak dan een nieuwe campagne.

---

## 7. Jouw gegevens <!-- icon: lock -->

- Een campagne is een map. Daarin staan de geheimen van de campagne, ook je chats met de spelleider. Je hoeft de map nooit te openen.
- RPG Engine leest en schrijft alleen in die map. Je handboeken leest het alleen. Al het andere buiten de campagne pas na jouw ja, in een venster van je computer.
- In de chat van het dashboard opent de spelleider zelf geen enkel bestand van je.
- Wat je schrijft gaat naar het bedrijf wiens model de spelleider speelt, onder de voorwaarden van jouw account. Bij een lokaal model blijft het op je computer.
- Een spelsysteem of een extensie die niet van ons is, is code die op je computer draait. Die komt er alleen met jouw ja. Zeg alleen ja tegen makers die je vertrouwt.
- Als de campagnemap een git-repository is, kan **Instellingen** de map voor je committen. Laat je chats er alleen in als de repository privé is.
- Met **Toegang via telefoon** aan gaat het spel onversleuteld van de computer naar de telefoon, via je thuisnetwerk en zonder externe dienst. Iedereen op dat netwerk kan het meelezen.
