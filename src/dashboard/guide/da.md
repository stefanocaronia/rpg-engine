<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,5d444eaa,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,b215d13b,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: den komplette guide

**RPG Engine** lader dig spille et bordrollespil med **en AI som spilleder**. Du spiller i **dashboardet**, et vindue på din computer med dit karakterark, terningerne, kortene, din dagbog og **chatten** med spillederen.

Denne guide fortæller, hvordan du spiller. Siden forklarer selv sine knapper: hold musen over en knap for at se, hvad den gør.

## Kom hurtigt i gang <!-- icon: send -->

1. Installer **Node.js** fra [nodejs.org](https://nodejs.org) (LTS-versionen).
2. Åbn en ny terminal, og skriv `npm install -g rpg-engine`. Hvis Windows siger, at det er slået fra at køre scripts, skal du skrive `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, svare ja og prøve igen.
3. Skriv `rpg open`: det lægger RPG Engines ikon på dit skrivebord ([2.2](#22-installing)). Fra da af starter du RPG Engine fra ikonet.
4. Tryk på **Ny kampagne**, giv den et navn, og tryk på **Opret** ([2.3](#23-a-new-campaign)).
5. I chatten vælger du din AI-app og dens model ([2.4](#24-connect-your-ai)): Claude Code kræver et betalt Claude-abonnement, Codex en ChatGPT-konto, gratis eller betalt. Tryk på **Åbn chatten** og derefter på **Begynd**.

Det første svar kan tage et par minutter. Derefter spørger spillederen, hvordan du vil spille, og I laver din karakter sammen.

## 1. Hvad RPG Engine er <!-- icon: about -->

| Hvem | Hvad de gør |
|---|---|
| **Du** | Du spiller din karakter: hvad karakteren gør, siger og prøver. |
| **Spillederen** (AI'en) | Fortæller historien, spiller alle andre, bestemmer, hvad der sker, og beder om slag. |
| **RPG Engine** | Gemmer verdenen i filer, slår terningerne, tæller hitpoint, penge, tid og afstande og holder hemmeligheder skjult, indtil du opdager dem. |

Verdenen er den samme fra aften til aften, selv i en ny chat, selv med en anden AI:

- **Det, der er sagt, forbliver sandt.** En død skurk forbliver død.
- **Terningerne er ægte.** Spillederen kan ikke ændre dem, undtagen på den letteste sværhedsgrad.
- **Hemmeligheder forbliver hemmelige.** Spillederen fortæller dig aldrig, hvad din karakter ikke ved.
- **Verdenen bevæger sig.** Trusler rykker frem, mens I hviler eller rejser.
- **En kampagne er en mappe** på din computer: hold pause, når du vil, og fortsæt senere.

Et spil kommer som et spilsystem: i dag er vores **femte udgave**, fra det frie System Reference Document 5.1. Uden et spilsystem spiller du frit, en historie uden tal.

---

## 2. Kom i gang <!-- icon: path -->

### 2.1 Det skal du bruge

- En computer med Windows, macOS eller Linux.
- **Node.js 24** eller nyere fra [nodejs.org](https://nodejs.org).
- En **terminal**, kun til at installere: på Windows Terminal eller PowerShell, på macOS Terminal.
- En **AI-app** til spillederen, med din egen konto ([2.4](#24-connect-your-ai)).

### 2.2 Installation

```text
npm install -g rpg-engine
rpg open
```

Den første linje installerer RPG Engine. Hvis npm tilbyder at opdatere sig selv, kan du ignorere det.

`rpg open` åbner RPG Engines vindue. Første gang lægger det også et ikon på dit skrivebord og i din menu: fra da af starter du fra ikonet. Hvis du vil fjerne det, skal du skrive `rpg icon --remove`.

Hvis installationen mislykkes, så tjek, at `node --version` viser 24 eller mere. Hvis Windows siger, at det er slået fra at køre scripts, skal du skrive `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` og svare ja. På Windows skal du holde RPG Engine og dine kampagner ude af stier, der indeholder `&`.

### 2.3 En ny kampagne

Tryk på **Ny kampagne**, og giv den et **Navn**, et **Sprog** og et **Spilsystem**. Resten laver du sammen med spillederen. Tryk på **Opret**: kampagnen åbner i et vindue for sig.

Spillederen og dashboardet taler kampagnens sprog. Regelteksten i femte udgave forbliver på engelsk, og spillederen fortæller den på dit sprog.

Kampagnen er en mappe med dens navn inde i mappen `RPG Engine` i din brugermappe. Næste gang klikker du på dens kort.

### 2.4 Forbind din AI

Spillederen kører i en **AI-app** på din computer, med din konto. En webchat som claude.ai eller ChatGPT rækker ikke: spillederen skal kunne nå kampagnens filer.

- **Claude Code**: et betalt Claude-abonnement (Pro eller højere).
- **Codex**: en ChatGPT-konto, gratis eller betalt.
- **OpenCode**: ingen konto; nogle gratis modeller i en begrænset periode, eller din egen udbyders, også lokale.
- **Antigravity**: en Google-konto; dens gratis brug har ugentlige grænser.

I chatten vælger du appen, dens **Model** og **Spillederens tanker**. Hvis appen mangler, eller du ikke er logget ind, installerer en knap den, logger dig ind eller åbner dens websted. RPG Engine ser aldrig din adgangskode.

En aften med spil er en lang chat: på de mindste abonnementer kan du nå grænsen, før aftenen er slut. Spil med den største model, du har: en lille model lader sig lettere overtale til at afsløre hemmeligheder.

Vi spiller og tester mest RPG Engine med **Claude Code**. Antigravity er **på prøve**: den kan træde ud af spillet, og den gemmer dine chats i en hukommelse, du ikke kan slå fra. Det, du skriver dér, går til Google, som kan lade mennesker læse det. RPG Engine er ikke et Google-produkt.

### 2.5 Den første chat

Tryk på **Åbn chatten** og derefter på **Begynd**. Det første svar kan tage et par minutter. Derefter gennemgår en ny kampagne tre trin:

1. **Indstillinger**: spillederen spørger, hvordan du vil spille, nogle få spørgsmål ad gangen: hvor hård verden er, om du kan dø, og hvornår du kan gå tilbage til et gemt spil. Skriv *Du bestemmer*, så vælger spillederen. Alt kan ændres senere.
2. **Session nul**: du laver din karakter sammen med spillederen, som ved et bord. RPG Engine regner karakterarkets tal ud. Hvis du allerede har en karakter, så indsæt dens karakterark i chatten.
3. **Spil**: spillederen sætter den første scene.

### 2.6 Spil i din AI-app

Du kan også spille i din AI-apps egen chat, i en terminal eller i dens desktop-app, med dashboardet ved siden af.

1. Åbn en terminal i den mappe, hvor du har dine spil: højreklik på mappen, og vælg **Åbn i Terminal** (Windows) eller **Tjenester > Ny terminal ved mappe** (macOS).
2. Skriv `rpg init "The Salt Isles"`: det opretter mappen `The Salt Isles` med en ny kampagne i.
3. Start din app i den mappe: `claude`, `codex`, `agy` for Antigravity eller `opencode`. Sig ja, når den spørger, om du stoler på mappen: i Claude Code er det svar, der er valgt på forhånd, *No, exit*.
4. Skriv *Hej! Lad os starte.* Spillederen giver dig linket til dit dashboard: åbn det ved siden af chatten.

Godt at vide:

- Åbn ikke detaljerne om de værktøjer, din app bruger (i Claude Code ctrl+o): de kan vise hemmeligheder.
- I Codex' desktop-app skal du slå hukommelser fra for spillets chats.
- Hvis spillederen ikke kender spillet, så skriv `rpg init` i kampagnemappen, og åbn en ny chat.
- Hvis Windows ikke finder `claude`, så føj den mappe, som dens installationsprogram nævnte, til PATH, og åbn derefter en ny terminal.
- Én chat ad gangen spiller en kampagne: mens din er åben, venter dashboardets chat.

---

## 3. Spil <!-- icon: chat -->

### 3.1 At tale med spillederen

Skriv, hvad din karakter gør eller siger:

> Jeg spørger værten, hvem der ellers kom forbi i aften.

Du siger, hvad du prøver på. Spillederen siger, hvad der sker. Spillederen bestemmer aldrig noget for din karakter.

Uden for historien skriver du `[OOC: …]` (out of character): *[OOC: Hvordan fungerer det at gribe fat i en modstander?]* Du kan spørge spillederen om reglerne eller om, hvordan dashboardet virker.

Når spillederen spørger dig om noget, kan du svare med knapperne eller med dine egne ord. Du kan også handle fra dit karakterark: klik på et våben, en besværgelse eller en genstand, og vælg, hvad du gør.

**Faste ordrer**: sig til dine følgesvende noget, der skal gælde fremover, for eksempel *Fra nu af lader I altid én leve*. Spillederen husker det, indtil du ophæver det.

### 3.2 Slag

Spillederen beder kun om et slag, når udfaldet er usikkert og har betydning. Et banner viser slaget: klik på det, og terningerne falder.

Terningerne er RPG Engines, ikke spillederens. Du kan altid spørge *[Var det slag ægte?]*: selv for et hemmeligt slag kan spillederen bevise, at det blev lavet, før du spurgte.

Når indstillingen **Terninger** står på fysisk, slår du med dine egne terninger og skriver resultatet: *[Jeg slog 14.]* De slag, du laver for sjov, fra dit karakterark eller med **Frit slag**, tæller aldrig.

### 3.3 Scener, kampe og rejser

Historien foregår i **scener**: en kamp, en samtale, en rejse, en hvile. I slutningen af hver scene gemmer spillet automatisk, og scenen kommer i din dagbog.

I en kamp spiller spillederen hver tur, der ikke er din, og stopper, når du skal beslutte noget.

Sig, hvor du tager hen, *Vi følger vejen nordpå mod Rocca*: RPG Engine regner afstanden og dagene ud og stopper, hvis der sker noget på vejen. Imens fortsætter skurkenes planer, og du ser deres tegn.

### 3.4 Gemte spil

RPG Engine gemmer kampagnen i slutningen af hver scene. Indstillingen **Gemte spil** afgør, hvornår du kan gå tilbage:

- **Permanent død**: aldrig.
- **Checkpoint**: til det sidste gemte spil, kun når din karakter dør.
- **Fri**: til ethvert gemt spil, og du kan gemme, når du vil.

I alle tilstande kan du starte forfra, i chatten eller i **Gemte spil**.

Når du er gået tilbage, så åbn en ny chat, for den gamle husker det, der blev fortrudt:

1. Tryk på **Luk chatten** og derefter på **Ny chat**. I din AI-apps egen chat åbner du en ny samtale (`/clear` i Claude Code).
2. Skriv *fortsæt*.
3. Tryk på **Jeg har åbnet en ny chat** under Gemte spil. Indtil da venter spillederen.

### 3.5 At stoppe og vende tilbage

Stop, når du vil: alt er allerede gemt. Luk dashboardets vindue, og kort efter stopper spillet. Intet går tabt.

For at vende tilbage åbner du RPG Engine fra dets ikon og klikker på din kampagne. Tryk på **Genoptag chatten** og derefter på **Genoptag historien**: spillederen fortæller dig, hvor du var, og fortsætter. Næste gang kan du også vælge en anden AI-app.

### 3.6 Grænser og stop

**Linjer** optræder aldrig i spillet. **Slør** sker kun uden for scenen. Du bestemmer dem under **Indstillinger**.

Skriv *[stop]* når som helst: spillederen dropper det indhold og føjer det til dine linjer.

### 3.7 Billeder

Spillederen kan få lavet billeder af steder, missioner og personer, som indstillingen **Billeder** angiver, og et portræt af din karakter, når du beder om det. Din AI-app laver dem, på dit abonnement. Hvis der ikke kommer nogen, viser **Indstillinger**, om denne computer kan lave dem.

Du kan også give din karakter eller en side i verden et billede, du selv har, fra selve siden.

---

## 4. Dashboardet <!-- icon: party -->

Vinduet, hvor du ser dit spil. Det viser kun det, din karakter ved.

- **Rollespil**: chatten med spillederen, når den ikke står ved siden af siden.
- **Gruppe**: dit karakterark, dine følgesvendes og slagene.
- **Scene**: hvor du er, hvem der er der, og kortet; i en kamp turene.
- **Dagbog**: missioner, historien som en bog, dine følgesvendes dagbøger og dine noter.
- **Verden**: verdenskortet, det din karakter ved, de dokumenter, I har fundet, og kalenderen.
- **Gemte spil**: at gå tilbage og starte forfra.
- **Indstillinger**: hvordan du spiller, og hvordan siden ser ud.
- **Pakker**: spilsystemet, udvidelser, dine manualer og opdateringer: når en ny RPG Engine er udkommet, står det her.

Hvis siden siger, at den ikke er forbundet, så tryk på **Genåbn kampagnen**.

Sådan spiller du fra din telefon, derhjemme: Gå til **Indstillinger** og **Dashboard**, slå **Adgang fra telefon** til, og sigt på koden med telefonen, som skal være på samme wifi som computeren. Windows kan spørge, om Node.js må bruge netværket: tillad det på private netværk, og sæt wifi'en som privat netværk. Spillet sendes ukrypteret: Brug det kun på et netværk, du stoler på, som dit eget hjem, aldrig på et offentligt wifi, et hotels eller en arbejdsplads'. Slå det fra, når du er færdig: Spillet slutter, når computerens sidste vindue lukkes.

Hvis et tema gør siden svær at læse, så tilføj `#/settings/page` til sidst i dens adresse, og slå **Temaets egen stil** fra.

---

## 5. Regler, manualer og udvidelser <!-- icon: dice -->

Et **Spilsystem** er data om ét spil: karakterarket, væsner, genstande, trylleformularer og regler. RPG Engine regner karakterarket ud. Hvordan en regel gælder, læser og afgør spilleder, som ved et bord.

**Femte udgave** rummer de frie regler fra System Reference Document 5.1. Du kan også spille indhold fra en bog, du ejer: Spilleder skriver det ind i din kampagne.

**Dine manualer**: Fortæl spilleder, hvor de er, eller tilføj deres mappe under **Pakker**. Spilleder slår regler op i dem og henviser til bogen og siden. RPG Engine ændrer dem aldrig og kopierer dem aldrig ind i en kampagne.

**Husregler**: Bed spilleder om det, *[House rule: a natural 1 on an attack means you drop your weapon.]* Spilleder husker reglen. En afgørelse, spilleder træffer én gang, gælder også næste gang.

**Udvidelser** tilføjer noget til spillet, for eksempel vejret. Tilføj dem under **Pakker**, eller bed spilleder om det.

---

## 6. Dit eget eventyr <!-- icon: world -->

Uden en skrevet verden bygger spilleder en ud fra din præmis og husker den.

Vil du spille et eventyr eller en bog, du ejer, så giv spilleder filen: *[OOC: Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* En fil uden for kampagnen læses først, når du har sagt ja. Den læses bedst som tekst, EPUB, Word eller en PDF, hvor teksten kan markeres.

Hele dokumentet går til det AI-selskab, der læser det. En kampagne spilles kun én gang: Vil du spille det samme eventyr igen, så opret en ny kampagne.

---

## 7. Dine data <!-- icon: lock -->

- En kampagne er en mappe. Den rummer kampagnens hemmeligheder og dine samtaler med spilleder: Du behøver aldrig at åbne den.
- RPG Engine læser og skriver kun i den mappe. Dine manualer læser det kun. Alt andet uden for kampagnen røres først, når du har sagt ja, i et vindue på din computer.
- I dashboardets chat åbner spilleder ingen af dine filer af sig selv.
- Det, du skriver, går til det selskab, hvis model spiller spilleder, under vilkårene for din konto. Med en lokal model bliver det på din computer.
- Et spilsystem eller en udvidelse, der ikke er vores, er kode, som kører på din computer. Den kommer kun med dit ja. Sig kun ja til forfattere, du stoler på.
- Hvis kampagnemappen er et git-lager, kan **Indstillinger** committe den for dig. Lad kun dine samtaler komme med, hvis lageret er privat.
- Når **Adgang fra telefon** er slået til, sendes spillet ukrypteret fra computeren til telefonen over dit hjemmenetværk, uden nogen ekstern tjeneste: Alle på det netværk kan læse med.
