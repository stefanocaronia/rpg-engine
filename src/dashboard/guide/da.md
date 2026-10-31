<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 9f1774ef 4c5cd093 019e9516 8e136927 7da791ae 423af5fa 17577253 f699a840 2731ea0e 59c1a762. Change the English, then run it again. -->
# RPG Engine: den komplette guide

**RPG Engine** lader dig spille et bordrollespil med **en AI som spilleder**. Du taler med spillederen i en **chat**. RPG Engine arbejder i baggrunden: det **husker verdenen**, **slår med terningerne** og **fører regnskabet**. Ved siden af chatten har du en side åben i din browser, **dashboardet**, med dit karakterark, terningerne, kortene og din dagbog.

Guiden er til spillere: du behøver ikke at kunne programmere.

## Kom hurtigt i gang <!-- icon: send -->

1. Installer **Node.js** fra [nodejs.org](https://nodejs.org) (LTS-versionen).
2. Installer en **AI-agent**, det program som spillederen kører i, og log ind: for eksempel Claude Code eller Codex ([2.4](#24-connect-your-ai)).
3. Installer RPG Engine i en terminal: `npm install -g rpg-engine`.
4. Opret en kampagne: `rpg init "The Salt Isles"`.
5. Gå ind i den nye mappe med `cd "The Salt Isles"`, og start din agent dér: `claude` for Claude Code, `codex` for Codex. Svar ja, når den spørger, om du stoler på mappen ([2.4](#24-connect-your-ai)), og skriv så *Hej! Lad os begynde.* Spillederen svarer med linket til dit dashboard.

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
- **Node.js 22** eller nyere fra [nodejs.org](https://nodejs.org). Den leverer `npm`, som installerer RPG Engine.
- En **terminal**: på Windows Terminal eller PowerShell, på macOS Terminal. Du åbner en terminal i en mappe ved at højreklikke på mappen og vælge **Åbn i Terminal** (Windows) eller **Tjenester > Ny terminal ved mappe** (macOS).
- En **AI-agent** til spilleder ([2.4](#24-connect-your-ai)) med den **største model**, den tilbyder: en lille model lader sig lettere overtale til at afsløre hemmeligheder eller bøje reglerne.

### 2.2 Installer

```text
npm install -g rpg-engine
```

`rpg --version` viser, om det lykkedes. Du bruger `rpg` én gang pr. kampagne for at oprette den. Derefter starter din agent selv RPG Engine.

### 2.3 Opret en kampagne

Åbn en terminal i den mappe, hvor du har dine spil ([2.1](#21-what-you-need) viser hvordan):

```text
rpg init "The Salt Isles"
```

Det opretter mappen `The Salt Isles` med en ny kampagne i. Gå ind i den med `cd "The Salt Isles"`. Husk, hvor den ligger: du vender tilbage hhertil, hver gang du spiller. Alt det andet vælger du senere, i chatten eller på dashboardet. `rpg init --help` viser de muligheder, du kan vælge allerede nu, for eksempel `--language it` eller `--difficulty hard`.

Spilleder kan ikke oprette en kampagne for dig: før `init` fortæller intet din agent, hvor RPG Engine er.

### 2.4 Forbind din AI

Spilleder kører i en **AI-agent**: en AI-app i terminalen eller på skrivebordet, som kan arbejde med filerne på din computer, for eksempel Claude Code eller Codex. En almindelig chat som claude.ai eller ChatGPT eller en app på telefonen rækker ikke: spilleder skal kunne nå kampagnens filer på din computer. Hver agent kræver sit eget abonnement og login: Claude Code et betalt Claude-abonnement, Codex et ChatGPT-login. Du installerer den én gang fra dens egen side: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: skriv `claude` i kampagnemappen. Når den spørger, om du stoler på mappen, så vælg **Yes, I trust this folder**. Pas på: det svar, der er valgt på forhånd, er *No, exit*. Kampagnen har også en lille hook, `rpg --listen`, som spørgsmålet ikke viser: den fortæller straks spilleder, når du handler fra dashboardet.
- **Codex**: skriv `codex` i kampagnemappen, og sig ja, når den spørger, om du stoler på mappen. I dens desktop-app skal du under indstillinger tjekke, at hukommelser er slået fra for spillets chats.
- **En anden agent**: start den i kampagnemappen, og giv den MCP-serveren `rpg mcp`. RPG Engine er en standard MCP-server: enhver agent, der understøtter MCP, kan være spilleder, også lokale.

Vi spiller og tester med **Claude Code**. **Codex** er forbundet og kontrolleret, men der er endnu ikke spillet en hel kampagne med den. Kampagnen slår agentens egen hukommelse fra: spillet bor i dets filer, så et gemt spil virkelig går tilbage i tiden.

### 2.5 Den første chat

Skriv hvad som helst, for eksempel *Hej! Lad os starte.* I sit første svar i hver chat giver spilleder dig **linket til dit dashboard**, noget i stil med `http://127.0.0.1:4750`: åbn det, og hav det ved siden af chatten.

Mellem spillederens beskeder viser din agent de værktøjer, den bruger. Åbn ikke deres detaljer (i Claude Code ctrl+o), for de kan vise hemmeligheder.

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
| **Følgesvende** | Hvem der rejser med dig | none, made with you, made by the master, met in play |
| **Billeder** | Billeder af steder, missioner og dem, du møder | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Linjer** og **Slør** | Hvad der aldrig optræder, og hvad der kun sker uden for scenen | lister |
| **Sprog** | Spillets og dashboardets sprog | alle |

Femte udgave tilføjer **udvikling**: erfaringspoint eller milepæle.

Uden en skrevet verden spørger spillederen også om en **præmis** (genre, tone, nogle få elementer og det, du bedst kan lide i et spil, for eksempel kampe, mysterier, samtale eller udforskning, med dine egne ord) og om **forberedelsen**: skab verden undervejs, mens du spiller, eller alt sammen fra start.

**Spillederens stil** spørges der aldrig om, men du kan ændre den i chatten eller under **Indstillinger**: **prosaen** (jævn, litterær, pulp, tør), de **historier**, den finder på (situationer, forløb, episoder, mysterium), en forfatter at **skrive som**, eller hvad som helst andet **med dine ord**.

### 2.7 Session nul: din karakter

Du laver din karakter sammen med spilleder, som ved et bord. Alle valg er dine, medmindre du beder spilleder træffe dem: kom med en fuld idé, en vag en eller slet ingenting. Spilleder fortæller dig, hvordan evnepoint bestemmes, før der slås med nogen terning. Din historie er aldrig et krav. Giver du en, skriver spilleder den med dine ord. Derefter beder spilleder om et billede af din karakter ([3.7](#37-your-characters-story-and-picture)). RPG Engine regner karakterarket ud: du laver aldrig regnestykkerne.

---

## 3. Spil <!-- icon: chat -->

### 3.1 At tale med spillederen

Skriv, hvad din karakter gør eller siger, med dine egne ord:

> Jeg spørger værten, hvem der ellers kom forbi i aften.

Når du taler uden for historien, skriv i kantede parenteser: *[Hvordan fungerer det at gribe fat i en modstander?]* Spillederen svarer også i parenteser.

Du siger, hvad du prøver på. Spillederen siger, hvad der sker. Spillederen bestemmer aldrig noget for din karakter og taler aldrig om motoren. Du kan spørge spillederen, hvordan dashboardet bruges.

**Handl fra dashboardet**: Klik på et navn på dit karakterark, for eksempel et våben, en besværgelse eller noget, du bærer. Vælg derefter, hvem det gælder. Du kan også klikke på en person for at tale med dem. Dashboardet skriver din sætning, *Jeg angriber Hooded Bandit 1 med Mace.*, og du kan ændre den, før du trykker på **Sig til spillederen**. Spillederen hører den som sagt i chatten og afgør den som alt andet. Hvis din AI-app ikke selv kan høre den, gør **Kopiér** den klar til at sætte ind i chatten.

### 3.2 Slag

Spillederen beder kun om et slag, når udfaldet er usikkert og har betydning, og siger først, hvad der står på spil. Derefter:

- **På dashboardet** viser et banner en knap for hver prøve, for eksempel *Acrobatics +4 · with advantage*. Klik på den: Terningerne falder på siden, og spillederen hører resultatet. Du kan også klikke på den linje på dit karakterark, der lyser, slå terningerne fra terningbakken eller skrive noget andet i banneret.
- **Manuelt**, i bannerets hjørne eller i **Indstillinger**: Banneret fortæller, hvad du skal slå, og du slår det fra dit karakterark eller fra terningbakken.
- **Fysiske terninger**, når terningindstillingen står på fysisk: Du skriver de øjne, du slog, *[Jeg slog 14.]*, og RPG Engine lægger dine modifikatorer til.

**Frie slag**: Klik på et vilkårligt tal på dit karakterark, eller åbn terningbakken, for at slå for sjov. De tæller aldrig, og spilleren ser dem aldrig.

**Spillederens slag** vises i din slagkolonne, bortset fra de hemmelige. Du kan altid spørge *[Var det slag ægte?]*: For et hemmeligt slag giver spillederen et fingeraftryk, der beviser, at slaget blev lavet, før du spurgte.

### 3.3 Scener og kampe

Historien foregår i **scener**: en kamp, en samtale, en udforskning, en rejse, en hvile. I slutningen af hver scene gemmer spillet automatisk, og scenen kommer i din dagbog.

I en kamp fortæller spillederen om hver tur, der ikke er din, og stopper, når du skal beslutte noget. **Scene** viser øverst, hvis tur det er, og hvem der kommer derefter, og din karakters kort ved siden af kortet. Rækkefølgen af turene, din gruppes hitpoints og hvor såret fjenderne ser ud, i ord, bliver stående ved siden af siden. Hvis din karakter falder, vises dødsslagene store på siden.

### 3.4 Tid, rejser og den verden, der bevæger sig

RPG Engine holder styr på datoen. Der går ingen tid mellem sessioner. Sig, at I hviler, *Vi tager en lang hvile*, og når spillederen er enig, giver hvilen tilbage, hvad den skal. Ved en kort hvile kan spillederen spørge på dashboardet, hvor mange hit dice du bruger: Slå dem én ad gangen, se hvad hver af dem heler, og stop, når du vil. Sig, hvor I tager hen, *Vi følger vejen nordpå mod Rocca*, og RPG Engine regner vejen, afstanden og dagene ud og stopper, hvis der sker noget på vejen. Penge tælles i spillets mønter, byttepenge inklusive.

Skurke har planer med tidsfrister. Hver ny dag flytter spillederen de trusler, som tiden har rykket frem, og du ser deres tegn, aldrig selve uret.

### 3.5 Kort

**Verden** viser de steder, din karakter kender, vejene mellem dem og det spor, I har gået, med tåge over resten. **Scene** viser kortet over det sted, hvor du er, når der er et, med hvem der står hvor. I en kamp er de felter, du ikke kan nå, tilsløret på din tur. Når spillederen spørger, hvor du flytter hen, så tryk på et felt eller skriv det, for eksempel *E4*.

**Verden** gemmer også det, din karakter ved. **Viden** viser de personer, steder, fraktioner, væsner og historier, karakteren kender, hver som karakteren kender dem: Søg i dem, eller åbn en for at læse den helt. Et navn i teksten fører til dets side. **Dokumenter** gemmer de breve, opslag og sider, karakteren har fundet, så du kan læse dem igen. **Kalender** viser i dag, dine missioners tidsfrister med den tid, der er tilbage, og historiens dage: En dag med scener fører til dens kapitler i dagbogen.

### 3.6 Missioner, dagbog og noter

En opgave, din karakter tager på sig, bliver til en mission i **Dagbog** med sine mål, sin tidsfrist og det, den måler. Sæt en stjerne ved den for at holde den synlig øverst i Scene. Dagbogen fortæller også din **historie**, scene for scene, og gemmer dine **noter**: De er private, medmindre du **Del**er en, som spillederen hører som det, du mener, aldrig som et faktum. Under **Følgesvende** kan du læse dine følgesvendes dagbøger: Nu og da, ved slutningen af en dag eller en mission, skriver de nogle linjer om, hvad de tænker og føler.

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

Når du er gået tilbage, så **åbn en ny chat**: Den gamle husker det, der blev fortrudt. Skriv *fortsæt* i den nye chat, og tryk derefter på **Jeg har åbnet en ny chat** i Gemte spil.

### 3.9 Sessioner: at stoppe og vende tilbage

Stop, når du vil: *[Lad os stoppe her for i aften.]* Alt er allerede gemt i filerne. For at vende tilbage skal du starte din agent i kampagnemappen og skrive *fortsæt*: Spillederen giver dig en kort opsummering og fortsætter.

### 3.10 Spillederens humør

Robotten øverst på dashboardet er spillederen. Dens ansigt følger historiens tone og afslører aldrig, hvad du endnu ikke ved. Når chatten er lukket, sover den.

### 3.11 Billeder

RPG Engine kan få lavet billeder af de steder, du når frem til, de missioner, du tager på dig, og dem, du møder, som indstillingen **billeder** siger, og din karakters portræt, når du beder om det. Det bruger din egen Codex eller Claude Code, med dit login, på dit abonnement og dets grænser: **Codex** maler dem, ellers tegner **Claude Code** dem. **Indstillinger** viser, om denne computer kan lave dem, og hvordan du sætter det op, hvis ikke. Du kan altid give spillederen et billede, du selv har.

### 3.12 Sikkerhed: linjer, slør og stop

**Linjer** optræder aldrig i spillet. **Slør** sker kun uden for scenen. Skriv *[stop]* når som helst: Spillederen dropper straks det indhold og føjer det til dine linjer.

### 3.13 At ombestemme sig

Alle indstillinger kan ændres, i chatten eller i **Indstillinger**. En afgørelse, som spillederen træffer uden regelbogen, bliver til en **præcedens**, så det samme spørgsmål får det samme svar næste gang.

---

## 4. Dashboardet <!-- icon: party -->

En side på din egen computer, som kun kan åbnes i den computers browser, og som er live, mens chatten er åben. Når chatten lukkes, viser den *Not connected*. Den kommer tilbage af sig selv med næste chat.

- **Gruppe**: dit karakterark og dine følgesvendes. Klik på et tal for at slå med det. Hold musen over det for at se, hvor det kommer fra, og hvad der gør slaget bedre eller dårligere, når en pil markerer dets terning. Ved siden af ser du slagene.
- **Scene**: hvor du er, med billede og kort, hvem der er der, og hvad der sker. I en kamp ser du turene og din karakters kort.
- **Dagbog**: missioner, historien, dine følgesvendes dagbøger og dine noter.
- **Verden**: verdenskortet, det din karakter ved, de dokumenter, I har fundet, og kalenderen.
- **Terningbakken**: vælg terninger og en modifikator, og slå. ×2 fordobler terningerne, aldrig modifikatoren, som ved et kritisk slag.
- **Gemte spil**, **Hjælp**, **Indstillinger** og **Om** som ikoner for enden af rækken. Indstillinger rummer også sidens egne valg: tema, terningelyd og terningesæt.

Når spillederen spørger dig om noget, bliver spillederens banner øverst, uanset hvilken sektion du er i.

---

## 5. Spilsystemer og husregler <!-- icon: dice -->

### 5.1 Hvad et spilsystem er

Data til ét spil: karakterark, tal, væsener, genstande, trylleformularer og regeltekster. Hver kampagne spiller ét system. RPG Engine regner karakterarket ud og holder styr på, hvad der bliver brugt, og hvad der kommer tilbage. Hvordan en egenskab virker, læser spillederen i reglerne og afgør, som ved et bord.

### 5.2 Femte udgave

Racerne, klasserne, underklasserne, en baggrund og en færdighed fra SRD 5.1. Dertil de 319 trylleformularer, våbnene, rustningerne, de magiske genstande og monstrene. Også regelkapitlerne, som spillederen læser i deres præcise ordlyd, og det fulde karakterark, udregnet.

Det er en pakke for sig: Spillederen tilbyder den, når du sætter en kampagne op, og installerer den. En kampagne, der spiller den, installerer den selv, første gang den åbnes på en computer uden den, og spillederen fortæller dig det.

Du kan også spille indhold, som SRD'et mangler, fra en bog, du ejer: Spillederen skriver det som sider i din kampagne, og RPG Engine behandler dem som sine egne. RPG Engine leveres kun med åbent indhold. Det, din spilleder kender, er ikke begrænset.

Dine egne regelbøger kan være dit bibliotek. Fortæl spillederen, hvor de er: *[Mine regelbøger ligger i D:\Books\5e.]* Eller tilføj deres mappe under Packages › Library, og sig ja i det vindue, din computer viser, én gang. RPG Engine læser dem på denne computer. Hver kampagne bruger de mapper, du slår til der. Spillederen søger i dem, når en regel skal afgøres, efter SRD'et, og angiver bog og side. De læses bedst som tekst eller som PDF'er, hvor teksten kan markeres. En scannet PDF læses ud fra billederne af siderne, kun på Windows, på nogle få minutter og med enkelte fejl. RPG Engine ændrer aldrig dine regelbøger, sender aldrig deres tekst nogen steder hen og kopierer den aldrig ind i en kampagne.

### 5.3 Husregler og dine egne tilføjelser

Spørg spillederen: *[Husregel: Et naturligt 1 på et angreb betyder, at du taber dit våben.]* Spillederen gemmer den som en aftale ved bordet eller skriver en side eller et tal på karakterarket, når det er nødvendigt. Husregler, der allerede er skrevet ned, kan lægges som tekstfiler i kampagnens mappe `rules`.

### 5.4 Tilføj eller importér dit eget spilsystem

Et spilsystem er en pakke: Spillederen installerer et fra npm, en mappe eller en fil, og et system, der ikke er vores, kun med dit ja i et vindue på din computer. At lave et er en udviklers arbejde og er beskrevet i RPG Engines dokumenter på GitHub. At gøre en bog, du ejer, til et spilsystem er der ikke endnu ([Kommer senere](#9-coming-later)).

---

## 6. Udvidelser <!-- icon: plus -->

En udvidelse tilføjer noget til en kampagne oveni dens spilsystem: en funktion som vejret, der skifter ved hver daggry, eller det at dirke en lås op med terninger. Tilføj en under Packages › Add, fra listen eller med navnet på npm, en mappe eller en fil. En udvidelse, der ikke er fra os, har kode med sig og kommer kun med dit ja i et vindue på din computer. En udvidelse, der er lavet til et andet spilsystem, siger hvilket og bliver ikke tilføjet. Under Packages › Installed opdaterer du en udvidelse eller fjerner den. Spillederen kan også tilføje en, når du beder om det.

---

## 7. Hvor en kampagne kommer fra, og dens sprog <!-- icon: world -->

### 7.1 Tre måder at få en verden på

- **Lavet undervejs**: ud fra din præmis bygger spillederen hvert sted, hver person og hvert plot lige før, du får brug for det, og husker det.
- **Forberedt i starten**: det samme, men med verdenen bygget før spillet.
- **Fra dit eget eventyr eller din egen bog**: giv spillederen filen, *[Importér dette eventyr som vores kampagne: D:\Books\adventure.pdf. Fortæl mig ikke noget af det, der står i det.]* Den læser bedst som tekst, en EPUB, et Word-dokument eller en PDF, hvor teksten kan markeres. En indscannet PDF læses ud fra billederne af siderne, kun på Windows, langsomt og med nogle fejl. Din egen Codex eller Claude Code læser den uden for chatten, ellers spillederen i chatten, på dit abonnement: hele dokumentet går til OpenAI eller Anthropic, under vilkårene for din konto og dens valg om træning. Dashboardet viser, hvor langt den er nået. Ud fra en roman foreslår spillederen, hvor I skal starte. Den skriver stederne, karaktererne og hemmelighederne.

En kampagne spilles én gang: for at spille det samme eventyr igen skal du oprette en ny kampagne.

### 7.2 Sprog

Ét sprog per kampagne, spillederens, som dashboardet følger. Dashboardet leveres på 26 sprog. Ethvert andet oversættes på din computer af Codex eller Claude Code, eller, uden dem, af spillederen i chatten. Femte udgaves termer på italiensk kommer fra den officielle italienske SRD. Regelteksten forbliver på engelsk, og spillederen fortæller den på dit sprog.

---

## 8. For de nysgerrige: kampagnemappen <!-- icon: list -->

Du behøver aldrig åbne den, og den indeholder din kampagnes hemmeligheder. Den har `campaign.yaml` (dine indstillinger), `state.yaml` (hvor spillet står), `world/` (én markdown-side til hver karakter, hvert sted, hver mission og resten), `rules/` (dine husregler), `images/`, `log.jsonl` (hver ændring), `.saves/`, `.player/` (dine noter) og de små filer, der fortæller AI-agenter, hvor RPG Engine er. Siderne bruger Obsidians format. Hvis du ændrer en side i hånden, hører spilleder om det ved sit næste svar.

RPG Engine bliver i denne mappe: Det læser og skriver kun spillet her og rører aldrig dine andre filer. De mapper, hvor dine regelbøger ligger, læser det kun. Uden for mappen har det kun egne datamapper (dashboardets oversættelser, den tekst, det har læst fra dine regelbøger, og Codex eller Claude Code, hvis du lader det installere dem) og midlertidige mapper, mens et billede tegnes. Alt andet, din agent vil gøre på din computer, spørger den dig om først.

Hver kommando, spilleder bruger, kan også køres i kampagnemappen: `rpg --help` viser dem. Mange af dem udskriver kampagnens hemmeligheder.

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

**Skal jeg kende reglerne?** Nej. Vælg tutorial-mentoren, og spørg i kantede parenteser, når du vil.

**Kan spillederen snyde?** Spillederen kan ikke ændre et slag, som RPG Engine har lavet, undtagen ved sværhedsgraden story, og heller ikke fakta, der allerede er fastlagt.

**Koster det noget?** RPG Engine er gratis. Spillederen kører på din agents abonnement eller på din egen computer med en lokal model. En aften med spil er en lang chat: på de mindste abonnementer kan du nå abonnementets grænse, før aftenen er slut. Billeder, oversættelser og importer bruger samme abonnement. RPG Engine bruger selv aldrig en API-nøgle, som betales per kald: log din agent ind med din konto, ikke med en nøgle.

**Kan jeg spille på min telefon?** Nej: spillederen kører på din computer, og dashboardet åbner kun der.

**Kan jeg spille med venner?** Ikke endnu: i dag én spiller, én karakter og følgesvende ([Kommer senere](#9-coming-later)).

**Kan jeg bruge en anden AI næste gang?** Ja: åbn kampagnen i en anden agent, og skriv *fortsæt*.

### Problemer

**Dashboardet åbner ikke.** Spørg spillederen: `[Hvad er linket til dashboardet?]`. Det virker kun, mens en chat er åben i den kampagne, efter spillederens første svar.

**Spillederen ser ikke ud til at kende spillet.** Din agent har ikke indlæst RPG Engine. Tjek, at du startede den i kampagnemappen og stolede på den. I Claude Code skriver du `/mcp` og forbinder `rpg` igen. I Codex skal `codex mcp list` i kampagnemappen vise `rpg`. Hvis `rpg --version` ikke findes, så installer RPG Engine igen ([2.2](#22-install)).

**Opdatering.** Kør `npm install -g rpg-engine` igen, og åbn derefter en ny chat: en spilleder, der kører, beholder den version, den startede med.

**Spillederen husker noget, jeg fortrød.** Åbn en ny chat, og tryk på **Jeg har åbnet en ny chat** under Gemte spil.

**Der kommer ingen billeder.** Indstillinger > Billeder viser, om denne computer kan lave dem, og hvordan.

**Installationen fejler, eller `rpg` vil ikke starte.** `node --version` skal vise 22 eller nyere. På Windows skal du holde RPG Engine og dine kampagner ude af stier, der indeholder `&`.

**Dashboardets link er ændret.** Et andet program tog den sædvanlige adresse. Spillederen giver dig det nye link.
