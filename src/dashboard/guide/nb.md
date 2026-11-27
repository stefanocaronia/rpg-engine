<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,5d444eaa,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,b215d13b,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: den komplette veiledningen

**RPG Engine** lar deg spille et bordrollespill med en **KI som spilleder**. Du spiller i **dashbordet**, et vindu på datamaskinen din med karakterarket, terningene, kartene, dagboken og **chatten** med spillederen.

Denne veiledningen forteller deg hvordan du spiller. Siden forklarer knappene sine selv: hold pekeren over en knapp for å se hva den gjør.

## Hurtigstart <!-- icon: send -->

1. Installer **Node.js** fra [nodejs.org](https://nodejs.org) (LTS-versjonen).
2. Åpne en ny terminal og skriv `npm install -g rpg-engine`. Hvis Windows sier at det er slått av å kjøre skript, skriver du `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, svarer ja og prøver igjen.
3. Skriv `rpg open`: da legges ikonet til RPG Engine på skrivebordet ([2.2](#22-installing)). Fra da av starter du RPG Engine fra ikonet.
4. Trykk **Ny kampanje**, gi den et navn og trykk **Opprett** ([2.3](#23-a-new-campaign)).
5. I chatten velger du KI-appen din og modellen ([2.4](#24-connect-your-ai)): Claude Code krever et betalt Claude-abonnement, Codex en ChatGPT-konto, gratis eller betalt. Trykk **Åpne chatten**, og deretter **Begynn**.

Det første svaret kan ta et par minutter. Så spør spillederen hvordan du vil spille, og dere lager karakteren din sammen.

## 1. Hva RPG Engine er <!-- icon: about -->

| Hvem | Hva gjør de |
|---|---|
| **Du** | Du spiller karakteren din: hva karakteren gjør, sier og prøver. |
| **Spilleder** (AI-en) | Forteller historien, spiller alle andre, bestemmer hva som skjer og ber om kast. |
| **RPG Engine** | Oppbevarer verden i filer, kaster terningene, teller hitpoints, penger, tid og avstander og holder hemmeligheter skjult til du oppdager dem. |

Verden er den samme fra den ene kvelden til den neste, selv i en ny chat, selv med en annen KI:

- **Det som er sagt, forblir sant.** En død skurk forblir død.
- **Terningene er ekte.** Spillederen kan ikke endre dem, bortsett fra på letteste vanskelighetsgrad.
- **Hemmeligheter forblir hemmelige.** Spillederen forteller aldri hva karakteren din ikke vet.
- **Verden beveger seg.** Trusler rykker fram mens du hviler eller reiser.
- **En kampanje er en mappe** på datamaskinen din: stopp når du vil, og fortsett senere.

Et spill kommer som et spillsystem: i dag er vårt **femte utgave**, fra det frie System Reference Document 5.1. Uten spillsystem spiller du fritt, en historie uten tall.

---

## 2. Kom i gang <!-- icon: path -->

### 2.1 Dette trenger du

- En datamaskin med Windows, macOS eller Linux.
- **Node.js 24** eller nyere, fra [nodejs.org](https://nodejs.org).
- En **terminal**, bare for å installere: på Windows Terminal eller PowerShell, på macOS Terminal.
- En **KI-app** til spillederen, med din egen konto ([2.4](#24-connect-your-ai)).

### 2.2 Installere

```text
npm install -g rpg-engine
rpg open
```

Den første linjen installerer RPG Engine. Hvis npm tilbyr å oppdatere seg selv, kan du ignorere det.

`rpg open` åpner vinduet til RPG Engine. Første gang legger den også et ikon på skrivebordet og i menyen din: fra da av starter du fra ikonet. Hvis du vil fjerne det, skriver du `rpg icon --remove`.

Hvis installeringen mislykkes, sjekk at `node --version` viser 24 eller høyere. Hvis Windows sier at det er slått av å kjøre skript, skriver du `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` og svarer ja. På Windows må du holde RPG Engine og kampanjene dine unna stier som inneholder `&`.

### 2.3 En ny kampanje

Trykk **Ny kampanje** og gi den et **Navn**, et **Språk** og et **Spillsystem**. Resten lager spillederen sammen med deg. Trykk **Opprett**: kampanjen åpnes i et eget vindu.

Spillederen og dashbordet snakker kampanjens språk. Regelteksten i femte utgave er på engelsk, og spillederen forteller den på ditt språk.

Kampanjen er en mappe med samme navn, inne i mappen `RPG Engine` i brukermappen din. Neste gang klikker du på kortet.

### 2.4 Koble til AI-en din

Spillederen kjører i en **KI-app** på datamaskinen din, med din egen konto. En nettchat som claude.ai eller ChatGPT er ikke nok: spillederen må kunne nå filene til kampanjen.

- **Claude Code**: et betalt Claude-abonnement (Pro eller høyere).
- **Codex**: en ChatGPT-konto, gratis eller betalt.
- **OpenCode**: ingen konto; noen gratis modeller i en begrenset tid, eller modellene fra din egen leverandør, også lokale.
- **Antigravity**: en Google-konto; gratisbruken har ukentlige grenser.

I chatten velger du appen, **Modell** og **Spillederens tenkning**. Hvis appen mangler, eller du ikke er logget inn, installerer en knapp den, logger deg inn eller åpner nettstedet. RPG Engine ser aldri passordet ditt.

En spillkveld er en lang chat: med de minste abonnementene kan du nå grensen før kvelden er over. Spill med den største modellen du har: en liten modell lar seg lettere lokke til å avsløre hemmeligheter.

Vi spiller og tester mest med **Claude Code**. Antigravity er **på prøve**: den kan gå ut av spillet, og den beholder chattene dine i et minne du ikke kan slå av. Det du skriver der, går til Google, som kan la folk lese det. RPG Engine er ikke et Google-produkt.

### 2.5 Den første chatten

Trykk **Åpne chatten**, og deretter **Begynn**. Det første svaret kan ta et par minutter. Så går en ny kampanje gjennom tre trinn:

1. **Innstillinger**: spillederen spør hvordan du vil spille, noen få spørsmål om gangen: hvor hard verden er, om du kan dø, når du kan gå tilbake til et lagret spill. Skriv *du bestemmer* for å la spillederen velge. Alt kan endres senere.
2. **Sesjon null**: du lager karakteren din sammen med spillederen, som ved et bord. RPG Engine gjør regnestykkene på karakterarket. Hvis du allerede har en karakter, limer du inn karakterarket i chatten.
3. **Spill**: spillederen setter den første scenen.

### 2.6 Å spille i KI-appen din

Du kan også spille i KI-appens egen chat, i en terminal eller i skrivebordsappen, med dashbordet ved siden av.

1. Åpne en terminal i mappen der du har spillene dine: høyreklikk mappen og velg **Åpne i Terminal** (Windows) eller **Tjenester > Ny terminal i mappen** (macOS).
2. Skriv `rpg init "The Salt Isles"`: den lager mappen `The Salt Isles` med en ny kampanje i.
3. Start appen din i den mappen: `claude`, `codex`, `agy` for Antigravity, eller `opencode`. Svar ja når den spør om du stoler på mappen: i Claude Code er svaret som er valgt på forhånd, *No, exit*.
4. Skriv *Hei! La oss begynne.* Spillederen gir deg lenken til dashbordet ditt: åpne den ved siden av chatten.

Greit å vite:

- Ikke åpne detaljene om verktøyene appen din bruker (i Claude Code ctrl+o): de kan vise hemmeligheter.
- I skrivebordsappen til Codex slår du av minner for chattene til spillet.
- Hvis spillederen ikke kjenner spillet, skriver du `rpg init` i kampanjemappen og åpner en ny chat.
- Hvis Windows ikke finner `claude`, legger du til mappen installasjonsprogrammet nevnte i PATH, og åpner deretter en ny terminal.
- Bare én chat om gangen spiller en kampanje: mens din er åpen, venter chatten på dashbordet.

---

## 3. Å spille <!-- icon: chat -->

### 3.1 Å snakke med spillederen

Skriv hva karakteren din gjør eller sier:

> Jeg spør vertshusholderen hvem andre som kom innom i kveld.

Du sier hva du prøver, og spillederen sier hva som skjer. Spillederen bestemmer aldri for karakteren din.

Utenfor historien skriver du `[OOC: …]` (out of character, utenfor rollen): *[OOC: Hvordan fungerer det å gripe tak i noen?]* Du kan spørre spillederen om reglene, eller om hvordan dashbordet fungerer.

Når spillederen spør deg om noe, svarer du med knappene eller med dine egne ord. Du kan også handle fra karakterarket: klikk på et våpen, en trylleformel eller en gjenstand, og velg hva du gjør.

**Faste ordrer**: si til følgesvennene dine noe som skal gjelde over tid, for eksempel *Fra nå av lar dere alltid én leve*. Spillederen holder fast ved det til du opphever det.

### 3.2 Kast

Spillederen ber om et kast bare når utfallet er uvisst og har noe å si. Et banner viser kastet: klikk på det, så faller terningene.

Terningene tilhører RPG Engine, ikke spillederen. Du kan alltid spørre *[Var det kastet ekte?]*: selv for et hemmelig kast kan spillederen bevise at det ble gjort før du spurte.

Når innstillingen **Terninger** står på fysiske, kaster du dine egne terninger og skriver resultatet: *[Jeg kastet 14.]* Kastene du gjør for moro skyld, fra karakterarket eller med **Fritt kast**, teller aldri.

### 3.3 Scener, kamper og reiser

Historien går i **scener**: en kamp, en samtale, en reise, en hvile. Ved slutten av hver scene lagrer spillet seg selv, og scenen havner i dagboken din.

I en kamp spiller spillederen hver tur som ikke er din, og stopper når du må bestemme.

Si hvor dere drar, *Vi tar veien nordover til Rocca*: RPG Engine regner ut avstanden og dagene, og stopper hvis noe skjer underveis. I mellomtiden går skurkenes planer videre, og du ser tegnene på dem.

### 3.4 Lagrede spill

RPG Engine lagrer kampanjen ved slutten av hver scene. Innstillingen **Lagrede spill** avgjør når du kan gå tilbake:

- **Permanent død**: aldri.
- **Sjekkpunkt**: til siste lagrede spill, bare når karakteren din dør.
- **Ledig**: til et hvilket som helst lagret spill, og du kan lagre når du vil.

I alle modi kan du begynne på nytt, i chatten eller i **Lagrede spill**.

Etter at du har gått tilbake, åpner du en ny chat, for den gamle husker det som er blitt angret:

1. Trykk **Lukk chatten**, og deretter **Ny chat**. I KI-appens egen chat åpner du en ny samtale (`/clear` i Claude Code).
2. Skriv *fortsett*.
3. Trykk **Jeg har åpnet en ny chat** i Lagrede spill. Før det venter spillederen.

### 3.5 Å stoppe og gjenoppta

Stopp når du vil: alt er allerede lagret. Lukk vinduet til dashbordet, så stopper spillet kort tid etter. Ingenting går tapt.

For å komme tilbake åpner du RPG Engine fra ikonet og klikker på kampanjen din. Trykk **Gjenoppta chatten**, og deretter **Fortsett historien**: spillederen forteller deg hvor dere var, og fortsetter. Neste gang kan du også velge en annen KI-app.

### 3.6 Grenser og stopp

**Linjer** vises aldri i spillet. **Slør** skjer bare utenfor scenen. Du setter dem i **Innstillinger**.

Når som helst kan du skrive *[stopp]*: spillederen dropper det innholdet og legger det til i linjene dine.

### 3.7 Bilder

Spillederen kan få laget bilder av steder, oppdrag og personer, slik innstillingen **Bilder** sier, og et portrett av karakteren din når du ber om det. KI-appen din lager dem, på abonnementet ditt. Hvis ingen dukker opp, sier **Innstillinger** om denne datamaskinen kan lage dem.

Du kan også gi karakteren din, eller en side i verden, et eget bilde, fra siden selv.

---

## 4. Dashboardet <!-- icon: party -->

Vinduet der du ser spillet ditt. Det viser bare det karakteren din vet.

- **Rollespill**: chatten med spillederen, når den ikke står ved siden av siden.
- **Gruppe**: karakterarket ditt, følgesvennenes og kastene.
- **Scene**: hvor du er, hvem som er der og kartet; i en kamp, turene.
- **Dagbok**: oppdrag, historien som en bok, dagbøkene til følgesvennene dine og notatene dine.
- **Verden**: verdenskartet, det karakteren din vet, dokumentene som er funnet og kalenderen.
- **Lagrede spill**: å gå tilbake og begynne på nytt.
- **Innstillinger**: hvordan du spiller, og hvordan siden ser ut.
- **Pakker**: spillsystemet, utvidelser, dine egne manualer og oppdateringer: når en ny RPG Engine er ute, står det her.

Hvis siden sier at den ikke er koblet til, trykk **Åpne kampanjen igjen**.

For å spille fra telefonen, hjemme: slå på **Mobiltilgang** under **Innstillinger**, **Dashbord**, og rett kameraet på telefonen mot koden, på samme Wi-Fi som datamaskinen. Windows kan spørre om Node.js får bruke nettverket: tillat det på private nettverk, og sett Wi-Fi-et som privat nettverk. Spillet sendes ukryptert: bruk det bare på et nettverk du stoler på, som hjemmenettet ditt, aldri på et offentlig Wi-Fi eller et Wi-Fi på hotell eller kontor. Slå det av når du er ferdig: spillet avsluttes med det siste vinduet på datamaskinen.

Hvis et tema gjør siden vanskelig å lese, legger du til `#/settings/page` på slutten av adressen og slår av **Temaets egen stil**.

---

## 5. Regler, håndbøker og utvidelser <!-- icon: dice -->

Et **spillsystem** er dataene til ett spill: karakterarket, skapninger, gjenstander, trollformler og regler. RPG Engine regner ut karakterarket. Hvordan en regel gjelder, leser og avgjør spilleder, slik det gjøres rundt et bord.

**Femte utgave** har de frie reglene fra System Reference Document 5.1. Du kan også spille innhold fra en bok du eier: spilleder skriver det inn i kampanjen din.

**Dine håndbøker**: si til spilleder hvor de er, eller legg til mappen deres under **Pakker**. Spilleder slår opp regler i dem og oppgir bok og side. RPG Engine endrer dem aldri og kopierer dem aldri inn i en kampanje.

**Husregler**: be spilleder, *[House rule: a natural 1 on an attack means you drop your weapon.]* Spilleder husker regelen. En avgjørelse som er tatt én gang, gjelder også neste gang.

**Utvidelser** legger til noe i spillet, for eksempel været. Legg dem til under **Pakker**, eller spør spilleder.

---

## 6. Ditt eget eventyr <!-- icon: world -->

Uten en skrevet verden bygger spilleder en ut fra premisset ditt, og husker den.

Vil du spille et eventyr eller en bok du eier, gir du filen til spilleder: *[Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* En fil utenfor kampanjen leses først etter at du har sagt ja. Den leses best som tekst, EPUB, Word eller en PDF der teksten kan markeres.

Hele dokumentet går til selskapet bak AI-en som leser det. En kampanje spilles bare én gang: vil du spille det samme eventyret igjen, oppretter du en ny kampanje.

---

## 7. Dataene dine <!-- icon: lock -->

- En kampanje er en mappe. Den inneholder kampanjens hemmeligheter, og også samtalene dine med spilleder: du trenger aldri å åpne den.
- RPG Engine leser og skriver bare i den mappen. Håndbøkene dine leser det bare. Alt annet utenfor kampanjen leser det først etter at du har sagt ja, i et vindu på datamaskinen din.
- I chatten i dashbordet åpner spilleder ingen av filene dine på egen hånd.
- Det du skriver, går til selskapet hvis modell spiller spilleder, under vilkårene for kontoen din. Med en lokal modell blir det på datamaskinen din.
- Et spillsystem eller en utvidelse som ikke er fra oss, er kode som kjører på datamaskinen din: den kommer bare med ditt ja. Si bare ja til utviklere du stoler på.
- Hvis kampanjemappen er et git-repositorium, kan **Innstillinger** committe den for deg. Slipp chattene dine inn bare hvis repositoriet er privat.
- Når **Mobiltilgang** er på, går spillet ukryptert fra datamaskinen til telefonen over hjemmenettverket ditt, uten noen ekstern tjeneste: den som er på det nettverket, kan lese det.
