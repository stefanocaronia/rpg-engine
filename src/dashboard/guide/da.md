<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,920451e3,be38a186 f2f35057,6ca38325 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,9d44b238,99406ef2,e6bcc348,f79c5b1e,272bd137,b5544596,591cdcfe,9a7d5853,07c079ea,2c297004,869e4581,0d938812,10dc1056,8158c275,0185620d,06d7d789,b4c2c7b3,725e11c3,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,9228c033,8e1adcaa,11800870,a75dc1e4,9886fddc,780281aa,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e8a839a5,14954012,25f9bdf8,bd8adb1c,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,c64bfe05,ab627403,86179abe,21ba08ef,f8d6b2fd,3f5bbaaf,3bbb14f4,15e9f48c,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,5a2d9db1,ba8c72d7,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,b78e7609,b8e71497,32482cb4,d90a5d53,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,ab3874f2,e0f88bdb,1e0ccfed,bb5be5d8,5070d986,2dbad46d,a7d9232d,b21a6994,22436b3a,5db3836c,12a20643,cc12de47,d58492a7,590b2eb2,df64a3bb,e065c96f. Change the English, then run it again. -->
# RPG Engine: den komplette guide

**RPG Engine** lader dig spille et bordrollespil med **en AI som spilleder**. Du spiller i **dashboardet**, et vindue på din computer med dit karakterark, terningerne, kortene, din dagbog og **chatten** med spillederen. RPG Engine arbejder i baggrunden: det **husker verdenen**, **slår med terningerne** og **fører regnskabet**.

Guiden er til spillere: du behøver ikke at kunne programmere.

## Kom hurtigt i gang <!-- icon: send -->

1. Installer **Node.js** fra [nodejs.org](https://nodejs.org) (LTS-versionen).
2. Installer RPG Engine én gang i en ny terminal, åbnet efter at Node.js er installeret: `npm install -g rpg-engine`. Hvis Windows svarer, at det er slået fra at køre scripts, skal du skrive `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` én gang, svare ja og prøve igen.
3. Skriv `rpg open`. Du bliver spurgt, om RPG Engines ikon skal lægges på dit skrivebord og i din menu: tryk på Enter for ja. Fra da af starter du RPG Engine fra dets ikon, uden terminal ([2.2](#22-install)).
4. Et vindue viser dine kampagner. Tryk på **Ny kampagne**, giv den et navn, og tryk på **Opret** ([2.3](#23-create-a-campaign)): kampagnens dashboard åbner i et vindue for sig.
5. I chatten med spillederen vælger du din AI-app og dens model: Claude Code kræver et betalt Claude-abonnement, Codex en ChatGPT-konto, gratis eller betalt ([2.4](#24-connect-your-ai)). Hvis appen mangler, eller du ikke er logget ind, installerer siden den eller logger dig ind. Tryk på **Åbn chatten** og derefter på **Begynd**. Det første svar kan tage et par minutter. Derefter spørger spillederen, hvordan du vil spille, og I laver din karakter sammen.

## 1. Hvad RPG Engine er <!-- icon: about -->

| Hvem | Hvad de gør |
|---|---|
| **Du** | Du spiller din karakter: hvad karakteren gør, siger og prøver. |
| **Spillederen** (AI'en) | Fortæller historien, spiller alle andre, bestemmer, hvad der sker, og beder om slag. |
| **RPG Engine** | Gemmer verdenen i filer, slår terningerne, tæller hitpoint, penge, tid og afstande og holder hemmeligheder skjult, indtil du opdager dem. |

Verdenen er den samme fra aften til aften, selv i en ny chat, selv med en anden AI:

- **Det, der er sagt, forbliver sandt.** En død skurk forbliver død.
- **Terningerne er ægte.** Spillederen kan ikke bøje dem, undtagen på den letteste sværhedsgrad, hvis du vælger den.
- **Hemmeligheder forbliver hemmelige.** Spillederen fortæller dig aldrig, hvad din karakter ikke ved.
- **Verdenen bevæger sig.** Trusler rykker frem, mens I hviler eller rejser, og du ser tegnene på dem.
- **En kampagne er en mappe** på din computer: hold pause, når du vil, og tag den op igen senere.

Et spil kommer som et spilsystem, en pakke som spillederen installerer til din kampagne. I dag er vores **femte udgave**, fra det frie System Reference Document 5.1. Uden et spilsystem spiller du frit, en historie uden tal. Flere kommer ([Kommer senere](#9-coming-later)).

---

## 2. Kom i gang <!-- icon: path -->

### 2.1 Det skal du bruge

- En computer med Windows, macOS eller Linux og en webbrowser.
- **Node.js 24** eller nyere fra [nodejs.org](https://nodejs.org). Det leverer `npm`, som installerer RPG Engine.
- En **terminal**, én gang, til at installere RPG Engine: på Windows Terminal eller PowerShell, på macOS Terminal. Du åbner en terminal i en mappe ved at højreklikke på mappen og vælge **Åbn i Terminal** (Windows) eller **Tjenester > Ny terminal ved mappe** (macOS). Hvis Windows svarer, at det er slået fra at køre scripts, skal du skrive `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` én gang og svare ja.
- En **AI-app** til spillederen, med din egen konto ([2.4](#24-connect-your-ai)): siden kan installere den for dig. Spil med den **største model**, appen tilbyder: en lille model lader sig lettere overtale til at afsløre hemmeligheder eller bøje reglerne.

### 2.2 Installer

```text
npm install -g rpg-engine
rpg open
```

Den første linje installerer RPG Engine. `rpg --version` viser, om det lykkedes. Hvis npm tilbyder at opdatere sig selv, kan du ignorere det.

`rpg open` åbner RPG Engines vindue med dine kampagner. Første gang spørger det i terminalen, om dets ikon skal lægges på dit skrivebord og i din Start-menu (Programmer på en Mac): tryk på Enter for ja. Fra da af dobbeltklikker du på ikonet og behøver ikke længere terminalen. Uden ikonet skal du skrive `rpg open`, hver gang du spiller. `rpg icon` tilføjer ikonet senere, og `rpg icon --remove` fjerner det.

### 2.3 Opret en kampagne

RPG Engines vindue viser dine kampagner som kort, den senest åbnede først. Tryk på **Ny kampagne**, og vælg dens **Navn**, dens **Sprog** og dens **Spilsystem**: resten laver du sammen med spillederen. Kampagnen lægges i en mappe med dens navn inde i mappen `RPG Engine` i din brugermappe (på Windows `C:\Users\<name>`). **Vælg en anden mappe…** lægger den i en tom mappe, du selv vælger. Under **Spillederen** kan du allerede vælge AI-app og model til den første chat ([2.4](#24-connect-your-ai)). Tryk på **Opret**: kampagnens dashboard åbner i et vindue for sig.

Næste gang klikker du på et kort for at åbne dets kampagne. En kampagne, der er åben, viser **Åben nu**. **Åbn en mappe…** tilføjer en kampagne, du allerede har på denne computer. Det lille kryds på et kort fjerner det fra listen: kampagnens filer bliver, hvor de er.

### 2.4 Forbind din AI

Spillederen kører i en **AI-app** på din computer, med din egen konto: Claude Code, Codex, OpenCode eller Antigravity. En almindelig chat som claude.ai eller ChatGPT eller en app på telefonen rækker ikke: spillederen skal kunne nå kampagnens filer på din computer. Hver app kræver sin egen konto: Claude Code et betalt Claude-abonnement (Pro eller højere), Codex en ChatGPT-konto, gratis eller betalt, Antigravity en Google-konto, hvis gratis brug har ugentlige grænser. OpenCode har nogle gratis modeller i en begrænset periode eller bruger din egen udbyders, også lokale.

I dashboardets chat vælger du appen under **Din AI-app** og derefter dens **Model** og **Spillederens tanker**: siden foreslår dem. Flere tanker går langsommere og bruger mere af dit abonnement. En app, der ikke er klar, siger, hvad den mangler, med en knap, der klarer det:

- **Claude Code** og **Codex**: **Installer Claude Code** eller **Installer Codex** henter appen ind i RPG Engines egen mappe på denne computer. **Log ind i Claude Code** eller **Log ind i Codex** åbner appens loginside i din browser. RPG Engine ser aldrig din adgangskode.
- **OpenCode** og **Antigravity**: **Hent OpenCode** eller **Hent Antigravity** åbner appens websted, hvor du installerer den. OpenCode kan spille uden login. Antigravity logger ind fra sin egen app. Kom derefter tilbage, og tryk på **Tjek igen**.

Antigravity er markeret **på prøve**: den kan træde ud af spillet og stille spørgsmål på sin egen måde, så Claude Code, Codex eller OpenCode er bedre at spille med. Antigravity gemmer dine tidligere chats, og dens hukommelse kan ikke slås fra: spillederen er blevet bedt om aldrig at læse dem. Det, du skriver, går til Google, som kan lade mennesker læse det: hold personlige oplysninger ude af spillet. RPG Engine er ikke et Google-produkt. Vi spiller og tester mest RPG Engine med **Claude Code**: der er endnu ikke spillet en hel kampagne med de andre.

I dashboardets chat rører spillederen kun ved din computer gennem RPG Engine: spillederen åbner ingen af dine filer på egen hånd. RPG Engine læser uden for kampagnen kun det, du har valgt, når du har sagt ja i et vindue på din computer.

Du kan også spille i din AI-apps egen chat, i en terminal eller i dens desktop-app ([2.8](#28-the-other-way-your-ai-apps-own-chat)).

### 2.5 Den første chat

Når appen og modellen er valgt, skal du trykke på **Åbn chatten**: appen starter, hvilket kan tage et par sekunder. Tryk derefter på **Begynd**, eller skriv hvad som helst, for eksempel *Hej! Lad os starte.* Det første svar kan tage et par minutter, mens spillederen sætter scenen.

Chatten har sin egen sektion, **Rollespil**, eller står ved siden af siden: de små knapper øverst i den placerer den **I sin egen fane**, **Til venstre** eller **Til højre**, og du kan trække i dens kant for at gøre den bredere.

En ny kampagne gennemgår tre trin, som vises øverst på dashboardet: **1 Indstillinger** (hvordan du vil spille), **2 Session nul** (du laver din karakter, i spillet), **3 Spil**.

### 2.6 Indstillinger: vælg, hvordan du spiller

Spilleder spørger kun om det, der stadig mangler, nogle få spørgsmål ad gangen. Dashboardets trin **Indstillinger** viser de samme spørgsmål som kort. Skriv "du bestemmer", så vælger spilleder. Alt kan ændres senere, i chatten eller under **Indstillinger**.

| Indstilling | Hvad den bestemmer | Værdier |
|---|---|---|
| **Mentor** | Hvor meget spilleder lærer dig reglerne | off, hints, tutorial |
| **Sværhedsgrad** | Hvor hård verden er | story, easy, normal, hard, brutal |
| **Dødelighed** | Hvad det betyder at falde i en kamp | narrative (aldrig død), epic (kun når det batter), dice |
| **Gemte spil** | Hvornår du må gå tilbage | permadeath, checkpoint, free ([3.8](#38-saves-and-going-back)) |
| **Strenghed** | Hvor nøje mad, lys og rejser følger reglerne | smooth, rules, simulation |
| **Terninger** | Hvem der slår dine terninger | digital, physical |
| **Enheder** | Afstande og vægt | metric, imperial |
| **Karakterstemmer** | Hvem der taler for de karakterer, du møder, fra spilleder til karaktererne: altid spilleder; i de afgørende øjeblikke selve karakteren, som kun ved det, den ved, efter spillederens valg; eller altid karakteren, for de vigtigste eller for alle, langsommere og dyrere, hvor din AI-app kan | the master, sometimes, main characters, everyone |
| **Din karakter** | Hvordan din karakter laves i session nul | with the master, by the master, your own ([2.7](#27-session-zero-your-character)) |
| **Følgesvende** | Hvem der rejser med dig | none, made with you, made by the master, met in play |
| **Billeder** | Billeder af steder, missioner og dem, du møder | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Linjer** og **Slør** | Hvad der aldrig optræder, og hvad der kun sker uden for scenen | lister |
| **Sprog** | Spillets og dashboardets sprog | alle |

Femte udgave tilføjer **udvikling**: erfaringspoint eller milepæle.

Uden en skrevet verden spørger spillederen også om en **Præmis** (genre, tone, nogle få elementer og det, du bedst kan lide i et spil, for eksempel kampe, mysterier, samtale eller udforskning, med dine egne ord), om **Opsætning**: skab verden undervejs, mens du spiller, eller alt sammen fra start, og om **Længde**: en aften, nogle få sessioner (tre til fem aftener) eller åben, det ene eventyr efter det andet. Når en historie med en bestemt længde er slut, kan du altid fortsætte.

**Spillederens stil** spørges der aldrig om, men du kan ændre den i chatten eller under **Indstillinger**: **Fortælling** (jævn, litterær, pulp, tør), de **Historier**, spilleder finder på (situationer, forløb, episoder, mysterium), en forfatter at **Skriv som**, eller hvad som helst andet **Med dine egne ord**.

### 2.7 Session nul: din karakter

Du laver din karakter sammen med spillederen, som ved et bord. Alle valg er dine, medmindre du beder spillederen træffe dem: kom med en fuld idé, en vag en eller slet ingenting, eller bed spillederen lave det hele ud fra nogle få ord. I et spil med niveauer spørger spillederen, fra hvilket niveau du starter: det første, medmindre du vil have et andet. Spillederen fortæller dig, hvordan evnepoint bestemmes, før der slås med nogen terning. Din historie er aldrig et krav. Giver du en, skriver spillederen den med dine ord. Derefter beder spillederen om et billede af din karakter ([3.7](#37-your-characters-story-and-picture)). RPG Engine regner karakterarket ud: du laver aldrig regnestykkerne.

Har du allerede en karakter, fra et andet spil eller en anden kampagne? Vælg **Jeg har allerede en** i opsætningen, og giv den til spillederen: indsæt karakterarket i chatten. I din AI-apps egen chat kan du også sige, hvor filen ligger på din computer (en PDF, et billede, en tekst). I dashboardets chat åbner spillederen ingen af dine filer. Spillederen skriver karakteren ned, som den er, på dens niveau, tjekker den mod reglerne og verdenen og aftaler med dig alt, der ikke passer.

### 2.8 Den anden vej: din AI-apps egen chat

Du kan også spille i selve din AI-apps chat, i en terminal eller i dens desktop-app, med dashboardet åbent ved siden af. Så opretter du kampagnen i en terminal, i den mappe, hvor du har dine spil ([2.1](#21-what-you-need) viser hvordan), altid med et navn: `rpg init "The Salt Isles"` opretter mappen `The Salt Isles` med en ny kampagne i. RPG Engine forbereder selv det, hver app har brug for dér.

Start din app i den mappe: `claude` for Claude Code, `codex` for Codex, `agy` for Antigravity, `opencode` for OpenCode, eller åbn mappen i dens desktop-app. Sig ja, når den spørger, om du stoler på mappen: pas på, i Claude Code er det svar, der er valgt på forhånd, *No, exit*. Enhver anden agent, der understøtter MCP, kan også være spilleder: start den i kampagnemappen, og giv den MCP-serveren `rpg mcp`.

Skriv *Hej! Lad os starte.* I sit første svar i hver chat giver spillederen dig **linket til dit dashboard**, noget i stil med `http://127.0.0.1:4750`: åbn det ved siden af chatten.

- Mellem spillederens beskeder viser din app de værktøjer, den bruger: åbn ikke deres detaljer (i Claude Code ctrl+o), for de kan vise hemmeligheder.
- Kampagnen slår appens egen hukommelse fra: spillet bor i dets filer, så et gemt spil virkelig går tilbage i tiden. I Codex' desktop-app skal du under indstillinger tjekke, at hukommelser er slået fra for spillets chats.
- Hvis spillederen siger, at han ikke kan finde RPG Engines værktøjer, så skriv `rpg init` i kampagnemappen, og åbn derefter en ny chat.
- Én chat ad gangen spiller en kampagne: mens din er åben, venter dashboardets chat.

---

## 3. Spil <!-- icon: chat -->

### 3.1 At tale med spillederen

Skriv, hvad din karakter gør eller siger, med dine egne ord:

> Jeg spørger værten, hvem der ellers kom forbi i aften.

Når du taler uden for historien, skriv `[OOC: …]` (out of character): *[OOC: Hvordan fungerer det at gribe fat i en modstander?]* Spillederen svarer på samme måde. I dashboardets chat står spillederens ord uden for spillet for sig og er mærket OOC.

I dashboardets chat skriver du i feltet nederst og trykker på Enter for at sende. Shift+Enter starter en ny linje. Mens spillederen svarer, afbryder **Stop** svaret, og dine ord bliver i feltet. Når spillederen spørger dig om noget, kommer knapperne med spørgsmålet, slag inklusive: klik på en, eller skriv dit svar. Under feltet ser du appen og modellen. Hvor appen tillader det, kan du klikke på modellen for at skifte den, når spillederen har svaret. **Luk chatten** afslutter chatten. Spillet bliver i sine filer.

Du siger, hvad du prøver på. Spillederen siger, hvad der sker. Spillederen bestemmer aldrig noget for din karakter og taler aldrig om motoren. Du kan spørge spillederen, hvordan dashboardet bruges.

**Handl fra dashboardet**: Klik på et navn på dit karakterark, for eksempel et våben, en besværgelse eller noget, du bærer. Dets kort fortæller, hvad det er. En taske åbnes med sin pil, og dens ⓘ viser dens kort. Vælg, hvad du gør med det. Noget, der ikke kræver nogen anden, for eksempel **Udstyr**, beder dig bekræfte på selve knappen, *Bekræft: Jeg udstyrer Shield*. Tryk på den igen, så går den til spillederen. Noget, du gør mod nogen, for eksempel **Angrib**, spørger, hvem det gælder, i listen eller med et klik på kortet. Så siger knappen hele sætningen, *Jeg angriber Hooded Bandit 1 med Mace*, og ét klik sender den. Vil du sige det på din egen måde, så klik på en person for at tale med vedkommende, eller skriv i chatten. Spillederen hører det som sagt i chatten, afgør det som alt andet og spørger dig med knapper om det, du udelod. Hvis din AI-app ikke kan give besked med det samme, læser spillederen det, så snart du næste gang skriver i chatten. Var chatten lukket før, sender **Sig det igen** det en gang til.

### 3.2 Slag

Spillederen beder kun om et slag, når udfaldet er usikkert og har betydning, og siger først, hvad der står på spil. Derefter:

- **På dashboardet** viser et banner en knap for hver prøve, for eksempel *Acrobatics +4 · with advantage*. Klik på den: Terningerne falder på siden, og spillederen hører resultatet. Du kan også klikke på den linje på dit karakterark, der lyser, slå terningerne fra terningbakken eller skrive noget andet i banneret.
- **Manuelt**, i bannerets hjørne eller i **Indstillinger**: Banneret fortæller, hvad du skal slå, og du slår det fra dit karakterark eller fra terningbakken.
- **Fysiske terninger**, når terningindstillingen står på fysisk: Du skriver de øjne, du slog, *[Jeg slog 14.]*, og RPG Engine lægger dine modifikatorer til.

**Frie slag**: Klik på et vilkårligt tal på dit karakterark, eller åbn terningbakken, for at slå for sjov. De tæller aldrig, og spilleren ser dem aldrig.

**Spillederens slag** vises i din slagkolonne, bortset fra de hemmelige. Du kan altid spørge *[Var det slag ægte?]*: For et hemmeligt slag giver spillederen et fingeraftryk, der beviser, at slaget blev lavet, før du spurgte.

### 3.3 Scener og kampe

Historien foregår i **scener**: en kamp, en samtale, en udforskning, en rejse, en hvile. I slutningen af hver scene gemmer spillet automatisk, scenen kommer i din dagbog, og når historien vender, skriver spillederen scenerne siden sidste kapitel som et nyt kapitel i din historiebog.

I en kamp fortæller spillederen om hver tur, der ikke er din, og stopper, når du skal beslutte noget. **Scene** viser øverst, hvis tur det er, og hvem der kommer derefter, og din karakters kort ved siden af kortet. Rækkefølgen af turene, din gruppes hitpoints og hvor såret fjenderne ser ud, i ord, bliver stående ved siden af siden. Hvis din karakter falder, vises dødsslagene store på siden.

**Faste ordrer**: Sig til dine følgesvende noget, der skal gælde fremover, for eksempel *Fra nu af lader I altid én leve*, og spillederen husker det, indtil du ophæver det. Dine følgesvende følger det, så langt deres karakter tillader, og hvis en af dem ikke vil, siger vedkommende det. Du finder dine ordrer i **Indstillinger**, hvor du kan tilføje og fjerne dem.

### 3.4 Tid, rejser og den verden, der bevæger sig

RPG Engine holder styr på datoen. Mellem sessioner standser spiltiden, medmindre du i **Indstillinger** vælger at lade den løbe, for eksempel en dag i spillet for hver uge, du er væk, eller du beder spillederen om det. Sig, at I hviler, *Vi tager en lang hvile*, og når spillederen er enig, giver hvilen tilbage, hvad den skal. Ved en kort hvile kan spillederen spørge på dashboardet, hvor mange hit dice du bruger: Slå dem én ad gangen, se hvad hver af dem heler, og stop, når du vil. Sig, hvor I tager hen, *Vi følger vejen nordpå mod Rocca*, og RPG Engine regner vejen, afstanden og dagene ud og stopper, hvis der sker noget på vejen. Penge tælles i spillets mønter, byttepenge inklusive.

Skurke har planer med tidsfrister. Hver ny dag flytter spillederen de trusler, som tiden har rykket frem, og du ser deres tegn, aldrig selve uret.

### 3.5 Kort

**Verden** viser de steder, din karakter kender, vejene mellem dem og det spor, I har gået, med tåge over resten. **Scene** viser kortet over det sted, hvor du er, når der er et, med hvem der står hvor. I en kamp er de felter, du ikke kan nå, tilsløret på din tur. Når spillederen spørger, hvor du flytter hen, så tryk på et felt eller skriv det, for eksempel *E4*.

**Verden** gemmer også det, din karakter ved. **Viden** viser de personer, steder, fraktioner, væsner og historier, karakteren kender, hver som karakteren kender dem: Søg i dem, eller åbn en for at læse den helt. Et navn i teksten fører til dets side. **Dokumenter** gemmer de breve, opslag og sider, karakteren har fundet, så du kan læse dem igen. **Kalender** viser i dag, dine missioners tidsfrister med den tid, der er tilbage, og historiens dage: En dag med scener fører til dem i dagbogens **Tidslinje**.

### 3.6 Missioner, dagbog og noter

En opgave, din karakter tager på sig, bliver til en mission i **Dagbog** med sine mål, sin tidsfrist og det, den måler. Sæt en stjerne ved den for at holde den synlig øverst i Scene. Under **Historie** fortæller dagbogen din historie som en bog: Spillederen skriver et kapitel i prosa, hver gang historien vender, og fortæller scenerne siden det forrige kapitel, i den stil, du har valgt. Læs den kapitel for kapitel, hvor det sidste er markeret med sit bogmærke, og download den som Markdown eller som en webside, du kan printe eller give videre. Hvis spillet er begyndt før, kan du bede spillederen om at skrive historien indtil nu. **Tidslinje** viser scenerne, nummereret, med det, der skete i hver af dem. Dagbogen gemmer også dine **Noter**: De er private, medmindre du vælger **Del** ved en af dem. Spillederen hører den delte note som det, du tænker, aldrig som et faktum. Under **Følgesvende** kan du læse dine følgesvendes dagbøger: Nu og da, ved slutningen af en dag eller en mission, skriver de nogle linjer om, hvad de tænker og føler.

### 3.7 Din karakters historie og billede

På dit karakterark har kortet **Beskrivelse** et felt til din karakters historie: Spillederen skriver den ind, efter du har sagt ja. Til et billede kan du give spillederen en fil (PNG, JPEG, WebP eller SVG, op til 5 MB) og fortælle, hvor den ligger på din computer, eller du kan få lavet et portræt ([3.11](#311-pictures)): *[Lav et portræt af mig: gråt hår i en fletning, et ar på hagen.]*

### 3.8 Gemte spil og at gå tilbage

RPG Engine gemmer hele kampagnen i slutningen af hver scene. Indstillingen **gemte spil** afgør resten:

| Gemte spil | Gem, når du vil | Gå tilbage |
|---|---|---|
| **permadeath** | nej | aldrig |
| **checkpoint** | nej | til det sidste gemte spil, kun når din karakter dør |
| **fri** | ja | til ethvert gemt spil |

I alle tilstande kan du **starte forfra**, fra spillets start eller fra session nul. Gør det i chatten eller i **Gemte spil**.

Når du er gået tilbage, så **åbn en ny chat**: den gamle husker det, der blev fortrudt. I dashboardets chat trykker du på **Luk chatten** og derefter på **Ny chat**. I din AI-apps egen chat åbner du en ny samtale (`/clear` i Claude Code). Skriv *fortsæt* i den nye chat. Fortæl derefter spillederen, at chatten er ny: tryk på **Jeg har åbnet en ny chat** under Gemte spil, eller sig det i chatten. Indtil da går spillederen ikke videre.

Hvis du ikke ved, hvad git er, kan du springe dette afsnit over. Hvis kampagnens mappe er et git-repositorium, har **Indstillinger** en sektion, **Git**, hvor alt er slået fra, indtil du vælger: en commit ved starten af hver session, ved hvert gemt spil og ved hver scenes afslutning, og en push bagefter, hvis du vil. En commit er et øjebliksbillede af kampagnen på det tidspunkt. En push sender øjebliksbillederne til repositoriet online, for eksempel på GitHub, så en kopi findes uden for denne computer. De gemte spil og dine chats med spillederen holdes uden for repositoriet, medmindre du lukker dem ind. Luk kun chatsene ind, hvis repositoriet er privat.

### 3.9 Sessioner: at stoppe og vende tilbage

Stop, når du vil: *[Lad os stoppe her for i aften.]* Alt er allerede gemt i filerne. For at vende tilbage åbner du RPG Engine fra dets ikon og klikker på din kampagne. Hvis du lod chatten stå åben, kommer den tilbage af sig selv. Hvis du lukkede den, skal du trykke på **Genoptag chatten**. Tryk derefter på **Genoptag historien**: spillederen fortæller dig med få linjer, hvor du var, og fortsætter. Hvis spillet blev lukket, mens spillederen stadig svarede, eller mens et spørgsmål fra spillederen ventede på dig, står der **Fortsæt herfra** på knappen i stedet. **Ny chat** åbner en frisk chat i det samme spil. I din AI-apps egen chat starter du den i kampagnemappen og skriver *fortsæt*.

### 3.10 Spillederens humør

Robotten øverst på dashboardet er spillederen: dens ansigt følger historiens tone og afslører aldrig, hvad du endnu ikke ved. Når dashboardet ikke er forbundet til spillet, sover den.

### 3.11 Billeder

RPG Engine kan få lavet billeder af de steder, du når frem til, de missioner, du tager på dig, og de personer, du møder, som indstillingen **Billeder** angiver, og din karakters portræt, når du beder om det. Din egen AI-app laver dem med sine egne midler, med dit login, på dit abonnement og inden for dets grænser: **Claude** tegner dem som vektorbilleder, **Codex** og **Antigravity** maler dem, **OpenCode** tegner enkle vektorbilleder i chatten. Under **Indstillinger > Kampagne > Billeder** kan du lade Codex eller Antigravity male dem, også når din spilleder er en anden app. Hvor den, du har valgt, ikke kan, laver din chat dem. **Indstillinger** viser, om denne computer kan lave dem, og hvordan du sætter det op, hvis ikke. Du kan altid give et billede, du selv har, til din karakter eller til en hvilken som helst side, du ser: Før markøren hen over et af dens billeder, så vises en lille billedknap i hjørnet (det virker også med tastaturet og er altid synligt på en telefon). I **Verden** har den side, du åbner, også **Skift billedet…**, eller **Tilføj et billede…**, mens den ikke har nogen. Hold markøren over et billede, eller sæt fokus på dets knap, så kan du også indsætte et billede, du har kopieret, med Ctrl+V (⌘V på en Mac). Dit billede træder i stedet for det, siden har. Du kan også lægge filen i kampagnens mappe **inbox** og sige til spillederen, hvilken side den er til.

### 3.12 Sikkerhed: linjer, slør og stop

**Linjer** optræder aldrig i spillet. **Slør** sker kun uden for scenen. Skriv *[stop]* når som helst: Spillederen dropper straks det indhold og føjer det til dine linjer.

### 3.13 At ombestemme sig

Alle indstillinger kan ændres, i chatten eller i **Indstillinger**. En afgørelse, som spillederen træffer uden regelbogen, bliver til en **præcedens**, så det samme spørgsmål får det samme svar næste gang.

---

## 4. Dashboardet <!-- icon: party -->

En side på din egen computer, i et vindue for sig, som kun kan åbnes på den computer. Den er live, mens dens vindue er åbent, med eller uden en chat. Cirka tredive sekunder efter, at du lukker det, stopper spillet, og chatten med det. Intet går tabt: alt ligger i filerne. I din AI-apps egen chat er den live, mens den chat er åben. Når spillet er væk, viser siden *Not connected*: tryk på **Genåbn kampagnen**, eller åbn den næste chat i din egen app. Knappen **Kampagner** med huset fører tilbage til alle dine kampagner.

- **Rollespil**: chatten med spillederen, når den ikke står ved siden af siden ([2.5](#25-the-first-chat)).
- **Gruppe**: dit karakterark og dine følgesvendes. Klik på et tal for at slå med det. Hold musen over det for at se, hvor det kommer fra, og, når en pil markerer dets terning, hvad der gør slaget bedre eller dårligere. Når spillederen gør valg klar til dig, som ved et nyt niveau, åbner en besked på karakterarket dem: vælg, når det passer dig, læs de sider, som valgmulighederne nævner, slå, hvor en valgmulighed kræver et slag, og bekræft derefter. Historien fortsætter imens. Ved siden af ser du slagene.
- **Scene**: hvor du er, med billede og kort, hvem der er der, og hvad der sker. I en kamp ser du turene og din karakters kort.
- **Dagbog**: missioner, historien som en bog, dens tidslinje, dine følgesvendes dagbøger og dine noter.
- **Verden**: verdenskortet, det din karakter ved, de dokumenter, I har fundet, og kalenderen.
- **Terningbakken**: vælg terninger og en modifikator, og slå. ×2 fordobler terningerne, aldrig modifikatoren, som ved et kritisk slag.
- **Gemte spil**, **Hjælp**, **Indstillinger** og **Om** som ikoner for enden af rækken. Under **Dashboard** i Indstillinger finder du også sidens egne valg: tilstand, terningelyd, terningesæt og **Tema**. Det er sidens farver, ansigter og billeder: spilsystemets egne, et tema, du har tilføjet under Packages › Add fra kataloget, med et GitHub-link, en .zip eller en mappe, eller sidens egne. Hvis et temas egen stilark gør siden svær at læse, kan du slå **Temaets egen stil** fra der. Indstillinger vises altid uden den, på sidens adresse med `#/settings/page` til sidst.

Når spillederen spørger dig om noget, bliver spillederens banner øverst, uanset hvilken sektion du er i.

---

## 5. Spilsystemer og husregler <!-- icon: dice -->

### 5.1 Hvad et spilsystem er

Data for ét spil: dets karakterark, tal, væsner, genstande, besværgelser og regeltekst. Hver kampagne spiller ét system. RPG Engine regner karakterarket ud og holder styr på, hvad der bliver brugt, og hvad der kommer tilbage. Hvordan en egenskab virker, læser spillederen i reglerne og afgør, ligesom ved et bord.

### 5.2 Femte udgave

Racerne, klasserne, underklasserne, en baggrund og en særlig evne (feat) fra SRD 5.1; de 319 besværgelser, våbnene, rustningerne, magiske genstande og monstre; regelkapitlerne, som spillederen læser efter deres nøjagtige tekst; det fulde karakterark, udregnet.

Det er en pakke for sig: Spillederen tilbyder den, når du opretter en kampagne, og installerer den. En kampagne, der spiller den, installerer den selv første gang, den åbnes på en computer uden pakken, og spillederen fortæller dig det.

Du kan også spille indhold, som SRD mangler, fra en bog, du ejer: Spillederen skriver det som sider i din kampagne, og RPG Engine behandler dem som sine egne. RPG Engine leveres kun med åbent indhold. Det, din spilleder kender, er ikke begrænset.

Dine egne regelbøger kan være dit bibliotek. Fortæl spillederen, hvor de er: *[Mine regelbøger ligger i D:\Books\5e.]* Eller tilføj deres mappe under Pakker › Bibliotek, og sig ja i det vindue, din computer viser, én gang. RPG Engine læser dem på denne computer. Hver kampagne bruger de mapper, du slår til der. Spillederen søger i dem, når en regel skal afgøres, efter SRD, og angiver bog og side. De læses bedst som tekst eller som PDF-filer, hvor teksten kan markeres. En scannet PDF læses ud fra billederne af siderne, kun på Windows, på nogle få minutter og med et par fejl. RPG Engine ændrer aldrig dine regelbøger, sender aldrig deres tekst nogen steder hen og kopierer den aldrig ind i en kampagne.

### 5.3 Husregler og dine egne tilføjelser

Spørg spillederen: *[Husregel: et naturligt 1 på et angreb betyder, at du taber dit våben.]* Spillederen gemmer den som en aftale ved bordet eller skriver en side eller et tal på karakterarket, når det er nødvendigt. Husregler, der allerede er skrevet ud, kan lægges som tekstfiler i kampagnens mappe `rules`.

Når spillederen ændrer en side i spilsystemet for din kampagne, for eksempel et væsens hitpoints eller en besværgelses rækkevidde, markerer dashboardet det med en lille stjerne efter navnet, overalt hvor det vises. Pakker › Installerede viser, hvad der er ændret, under spilsystemet, ved siden af det, systemet gav. Et væsen, som din karakter ikke kender, står der kun med sit navn. Dér kan du sætte en side tilbage, som systemet skriver den, når den scene, I er i gang med, er slut. Dashboardet kan ikke fortryde ændringen. Kun spillederen kan skrive den igen.

### 5.4 Tilføj eller importér dit eget spilsystem

Et spilsystem er en pakke: Spillederen installerer en fra npm, en mappe eller en fil. En pakke, der ikke er vores, installeres kun med dit ja, i en formular fra din agent eller et vindue på din computer. At lave en pakke er en udviklers arbejde og er beskrevet i RPG Engines dokumenter på GitHub. At gøre en af dine bøger til et spilsystem kan man ikke endnu ([Kommer senere](#9-coming-later)).

---

## 6. Udvidelser <!-- icon: plus -->

En udvidelse tilføjer noget til en kampagne oveni dens spilsystem: en funktion som vejret, der skifter ved hver daggry, eller det at dirke en lås op med terninger. Tilføj en under Pakker › Tilføj, fra listen eller med navnet på npm, en mappe eller en fil. En udvidelse, der ikke er fra os, har kode med sig og kommer kun med dit ja i et vindue på din computer. En udvidelse, der er lavet til et andet spilsystem, siger hvilket og bliver ikke tilføjet. Under Pakker › Installerede opdaterer du en udvidelse eller fjerner den. Spillederen kan også tilføje en, når du beder om det.

---

## 7. Hvor en kampagne kommer fra, og dens sprog <!-- icon: world -->

### 7.1 Tre måder at få en verden på

- **Lavet undervejs**: ud fra din præmis bygger spillederen hvert sted, hver person og hvert plot lige før, du får brug for det, og husker det.
- **Forberedt i starten**: det samme, men med verdenen bygget før spillet.
- **Fra dit eget eventyr eller din egen bog**: giv spillederen filen, *[Importér dette eventyr som vores kampagne: D:\Books\adventure.pdf. Fortæl mig ikke noget af det, der står i det.]* En fil uden for kampagnen læses først, når du har sagt ja i et vindue på din computer. En fil, du lægger i kampagnens mappe **inbox**, læses med det samme. Den læser bedst som tekst, en EPUB, et Word-dokument eller en PDF, hvor teksten kan markeres. En indscannet PDF læses ud fra billederne af siderne, kun på Windows, langsomt og med nogle fejl. Din egen AI-app læser den uden for chatten, ellers spillederen i chatten, på dit abonnement: i Claude Code eller Codex læser en af de to den, i Antigravity din Antigravity, i OpenCode den model, du sidst har valgt i den. Hele dokumentet går til udvikleren af det, der læser det, under vilkårene for din konto og dens valg om træning. Dashboardet viser, hvor langt den er nået. Ud fra en roman foreslår spillederen, hvor I skal starte. Spillederen skriver stederne, karaktererne og hemmelighederne.

En kampagne spilles én gang: for at spille det samme eventyr igen skal du oprette en ny kampagne.

### 7.2 Sprog

Ét sprog per kampagne, spillederens, som dashboardet følger. Dashboardet leveres på 26 sprog. Ethvert andet oversættes på din computer af din egen AI-app uden for chatten (Codex eller Claude Code; i Antigravity og OpenCode deres egne), eller, hvor ingen kan, af spillederen i chatten. Femte udgaves termer på italiensk kommer fra den officielle italienske SRD. Regelteksten forbliver på engelsk, og spillederen fortæller den på dit sprog.

---

## 8. Til de nysgerrige: kampagnemappen <!-- icon: list -->

Du behøver aldrig at åbne den, og den rummer din kampagnes hemmeligheder. Den indeholder `campaign.yaml` (dine indstillinger), `state.yaml` (hvor spillet står), `world/` (én markdown-side for hver karakter, hvert sted, hver mission og resten), `rules/` (dine husregler), `images/`, `log.jsonl` (alle ændringer), `sessions/` (dine chats med spillederen som tekst, fra Claude Code og Codex), `.saves/`, `.player/` (dine noter) og de små filer, der fortæller AI-agenter, hvor RPG Engine er. Siderne bruger Obsidians format. Hvis du ændrer en side i hånden, hører spillederen om det ved sit næste svar.

RPG Engine bliver i denne mappe: Det læser og skriver kun spillet her og rører aldrig dine andre filer. Mapperne med dine regelbøger læser det kun. Uden for kampagnemappen gemmer det kun egne datamapper (dashboardets oversættelser, den tekst, det har læst i dine regelbøger, og Codex eller Claude Code, hvis du lader det installere dem) og midlertidige mapper, mens et billede bliver tegnet. Alt andet, din agent vil gøre på din computer, spørger den dig om først. Et spilsystem eller en udvidelse er kode, som enhver npm-pakke er det: En pakke, der ikke er vores, kører på din computer med dine rettigheder, og RPG Engine installerer den kun med dit ja, i en formular fra din agent eller et vindue på din computer. Sig kun ja til pakker, hvis udviklere du stoler på.

Alle kommandoer, spillederen bruger, kan også køres i kampagnemappen: `rpg --help` viser dem. Mange af dem udskriver kampagnens hemmeligheder.

---

## 9. Kommer senere <!-- icon: hourglass -->

- **Dig som spilleder**, mens AI'en spiller gruppen.
- **Forfattertilstand**: skriv et eventyr sammen med AI'en, og eksportér og del det bagefter.
- **Flere spillere på samme computer**, hver med sin egen karakter, som skiftes til at bruge den samme chat.
- **Flere udvidelser**: verdener, funktioner og husregler, som du kan dele.
- **Andre spil**: flere spilsystemer og dine egne.

---

## 10. Spørgsmål og problemer <!-- icon: info -->

### Spørgsmål

**Skal jeg kende reglerne?** Nej. Vælg tutorial-mentoren, og spørg i `[OOC: …]`, når du vil.

**Kan spillederen snyde?** Spillederen kan ikke ændre et slag, som RPG Engine har lavet, undtagen ved sværhedsgraden story, og heller ikke fakta, der allerede er fastlagt.

**Koster det noget?** RPG Engine er gratis. Spillederen kører på din AI-apps abonnement eller på din egen computer med en lokal model. En aften med spil er en lang chat: på de mindste abonnementer kan du nå abonnementets grænse, før aftenen er slut. Billeder, oversættelser og importer bruger samme abonnement. RPG Engine bruger selv aldrig en API-nøgle, som betales per kald: log din AI-app ind med din konto, ikke med en nøgle.

**Kan jeg spille på min telefon?** Nej: spillederen kører på din computer, og dashboardet åbner kun der.

**Kan jeg spille med venner?** Ikke endnu: i dag én spiller, én karakter og følgesvende ([Kommer senere](#9-coming-later)).

**Kan jeg bruge en anden AI næste gang?** Ja: vælg en anden app i chatten, før du åbner den, eller åbn kampagnen i en anden app, og skriv *fortsæt*.

### Problemer

**En kampagne åbner ikke.** Åbn RPG Engine igen fra dets ikon, eller med `rpg open` i en terminal, og klik på kampagnen. Hvis dens dashboard siger *Not connected*, så tryk på **Genåbn kampagnen**. Et kort, der siger **Mappen blev ikke fundet**, har mistet sin mappe: fjern det fra listen, og tilføj det igen med **Åbn en mappe…**, der hvor mappen ligger nu. I din AI-apps egen chat virker dashboardet kun, mens en chat i den kampagne er åben: spørg spillederen `[OOC: Hvad er linket til dashboardet?]`. I Claude-appen går en chat, der er blevet i baggrunden et stykke tid, i dvale, og siden med den: klik på chatten, så kommer siden tilbage på samme adresse.

**Spillederen ser ikke ud til at kende spillet.** Det sker i din AI-apps egen chat: den har ikke indlæst RPG Engine. Tjek, at du startede den i kampagnemappen og stolede på den. I Claude Code skriver du `/mcp` og forbinder `rpg` igen. I Codex skal `codex mcp list` i kampagnemappen vise `rpg`. Hvis `rpg --version` ikke findes, så installer RPG Engine igen ([2.2](#22-install)).

**Windows finder ikke `claude`.** Det sker, når du selv har installeret Claude Code. Installationsprogrammet siger det i en gul note med den mappe, det blev lagt i: føj den mappe til PATH (Systemegenskaber > Miljøvariabler), og åbn derefter en ny terminal.

**Opdatering.** Når der er en nyere RPG Engine, siger dashboardet det: under Packages › Installed står RPG Engine først, med **Opdater**. Gør derefter, hvad siden siger. Eller kør `npm install -g rpg-engine` igen i en terminal, og åbn derefter en ny chat: en spilleder, der kører, beholder den version, vedkommende startede med.

**Spillederen husker noget, jeg fortrød.** Åbn en ny chat, og tryk på **Jeg har åbnet en ny chat** under Gemte spil.

**En app installeres ikke.** Siden siger hvorfor: tryk på **Prøv igen**. Eller installer den selv fra udviklerens websted, og tryk derefter på **Tjek igen**.

**Loginsiden åbner ikke i browseren.** Mens siden venter på dig, kan du trykke på **Åbn loginsiden igen**, hvor den vises, eller på **Annuller** og prøve en gang til.

**Dashboardets chat siger, at en anden chat spiller.** En chat, du selv har åbnet i din AI-app, spiller denne kampagne: fortsæt dér, eller luk den for at spille i dashboardet.

**Der kommer ingen billeder.** Indstillinger > Kampagne > Billeder viser, om denne computer kan lave dem, og hvordan.

**Installationen fejler, eller `rpg` vil ikke starte.** `node --version` skal vise 24 eller nyere. Hvis Windows svarer, at det er slået fra at køre scripts, så se [2.1](#21-what-you-need). På Windows skal du holde RPG Engine og dine kampagner ude af stier, der indeholder `&`.

**Dashboardets link er ændret.** I din AI-apps egen chat har hver kampagne sin egen adresse, den samme chat efter chat. Den ændres kun, når et andet program allerede bruger den: spillederen giver dig det nye link, og så bliver det ved med at gælde. En anden chat i samme kampagne holder siden på samme adresse og overtager den, når du lukker den første.
