<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb df1364a2 8fd6b933 75985e6d ece214f0 8c9f41da 17577253 f699a840 241f6611 59c1a762. Change the English, then run it again. -->
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
| **Du** | Du spiller din karakter: hvad karakteren gør, siger og forsøger. |
| **Spillederen** (AI'en) | Fortæller historien, spiller alle andre, bestemmer hvad der sker og beder om slag. |
| **RPG Engine** | Gemmer verdenen i filer, slår med terningerne, tæller hitpoint, penge, tid og afstande og holder hemmeligheder skjult, til du opdager dem. |

Verdenen forbliver den samme fra aften til aften, selv i en ny chat, selv med en anden AI:

- **Det, der er sagt, forbliver sandt.** En død skurk forbliver død.
- **Terningerne er ægte.** Spillederen kan ikke bøje dem, undtagen på den letteste sværhedsgrad, hvis du vælger den.
- **Hemmeligheder forbliver hemmelige.** Spillederen fortæller aldrig, hvad din karakter ikke ved.
- **Verdenen bevæger sig.** Trusler rykker frem, mens du hviler eller rejser, og du ser tegnene på det.
- **En kampagne er en mappe** på din computer: hold pause, når du vil, og tag den op igen senere.

I dag spiller RPG Engine ét spilsystem, **femte udgave**, fra det frie System Reference Document 5.1. Flere kommer ([Kommer senere](#9-coming-later)).

---

## 2. Kom i gang <!-- icon: path -->

### 2.1 Det skal du bruge

- En computer med Windows, macOS eller Linux og en webbrowser.
- **Node.js 22** eller nyere, fra [nodejs.org](https://nodejs.org). Den leverer `npm`, som installerer RPG Engine.
- En **terminal**: på Windows Terminal eller PowerShell, på macOS Terminal. Sådan åbner du en i en mappe: Højreklik på mappen og vælg **Åbn i Terminal** (Windows) eller **Tjenester > Ny terminal i mappen** (macOS).
- En **AI-agent** til spillederen ([2.4](#24-connect-your-ai)), med den **største model**, den tilbyder: En lille model lader sig lettere overtale til at afsløre hemmeligheder eller bøje reglerne.

### 2.2 Installér

```text
npm install -g rpg-engine
```

`rpg --version` tjekker, at det lykkedes. Du bruger `rpg` én gang pr. kampagne, når du opretter den. Derefter starter din agent selv RPG Engine.

### 2.3 Opret en kampagne

Åbn en terminal i den mappe, hvor du gemmer dine spil ([2.1](#21-what-you-need) viser, hvordan):

```text
rpg init "The Salt Isles"
```

Det laver mappen `The Salt Isles` med en ny kampagne i. Gå ind i den med `cd "The Salt Isles"`. Husk, hvor den ligger: Du vender tilbage hertil hver gang, du spiller. Alt det andet vælger du senere, i chatten eller på dashboardet. `rpg init --help` viser de valg, du kan træffe nu, f.eks. `--language it` eller `--difficulty hard`.

Spillederen kan ikke oprette en kampagne for dig: Før `init` fortæller intet din agent, hvor RPG Engine er.

### 2.4 Forbind din AI

Spillederen kører i en **AI-agent**: en AI-app, i terminalen eller på skrivebordet, som kan arbejde med filerne på din computer, f.eks. Claude Code eller Codex. En almindelig chat som claude.ai eller ChatGPT eller en app på telefonen er ikke nok: Spillederen skal kunne nå kampagnens filer på din computer. Hver agent kræver sit eget abonnement og login: Claude Code et betalt Claude-abonnement, Codex et ChatGPT-login. Du installerer den én gang fra dens egen side: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: Skriv `claude` i kampagnemappen. Når den spørger, om du stoler på mappen, så vælg **Yes, I trust this folder**. Pas på: Det svar, der er valgt på forhånd, er *No, exit*. Kampagnen har også en lille hook, `rpg --listen`, som spørgsmålet ikke viser: Den fortæller straks spillederen, når du handler fra dashboardet.
- **Codex**: Skriv `codex` i kampagnemappen, og svar ja, når den spørger, om du stoler på mappen. Tjek i dens desktop-app under indstillinger, at hukommelser er slået fra for spillets chats.
- **En anden agent**: Start den i kampagnemappen og giv den MCP-serveren `rpg mcp`. RPG Engine er en standard MCP-server: Enhver agent, der understøtter MCP, kan være spilleder, også lokale.

Vi spiller og tester med **Claude Code**. **Codex** er forbundet og afprøvet, men der er endnu ikke spillet en hel kampagne med den. Kampagnen slår agentens egen hukommelse fra: Spillet bor i dets filer, så et gemt spil virkelig fører dig tilbage.

### 2.5 Den første chat

Skriv hvad som helst, f.eks. *Hej! Lad os starte.* I sit første svar i hver chat giver spillederen dig **linket til dit dashboard**, noget i retning af `http://127.0.0.1:4750`. Åbn det, og hav det ved siden af chatten.

Mellem spillederens beskeder viser din agent de værktøjer, den bruger. Åbn ikke deres detaljer (i Claude Code ctrl+o), for de kan vise hemmeligheder.

En ny kampagne gennemgår tre trin, som vises øverst på dashboardet: **1 Indstillinger** (hvordan du vil spille), **2 Session nul** (du laver din karakter, i spillet), **3 Spil**.

### 2.6 Indstillinger: vælg, hvordan du spiller

Spillederen spørger kun om det, der stadig mangler, få spørgsmål ad gangen. Dashboardets trin **Indstillinger** viser de samme spørgsmål som kort. Skriv "du bestemmer", så vælger spillederen. Alt kan ændres senere, i chatten eller under **Indstillinger**.

| Indstilling | Hvad den bestemmer | Værdier |
|---|---|---|
| **Mentor** | Hvor meget spillederen lærer dig om reglerne | fra, hints, tutorial |
| **Sværhedsgrad** | Hvor hård verden er | historie, let, normal, svær, brutal |
| **Dødelighed** | Hvad det betyder at falde i en kamp | fortællende (dø aldrig), episk (kun når det batter), terninger |
| **Gemte spil** | Hvornår du må gå tilbage | permadeath, checkpoint, fri ([3.8](#38-saves-and-going-back)) |
| **Strenghed** | Hvor nøje mad, lys og rejser følger reglerne | glat, regler, simulation |
| **Terninger** | Hvem der slår dine terninger | digitale, fysiske |
| **Enheder** | Afstande og vægt | metrisk, imperial |
| **Stemmer** | Hvem der taler for de karakterer, du møder: i nøglescener selve karakteren, som kun ved, hvad den ved, som spillederen vælger; altid spillederen; eller altid karakteren, for de vigtigste eller for alle, langsommere og dyrere, hvor din AI-app kan | auto, spilleder, vigtige, altid |
| **Følgesvende** | Hvem der rejser med dig | ingen, lavet sammen med dig, lavet af spillederen, mødt i spillet |
| **Billeder** | Billeder af steder, missioner og dem, du møder | ingen, på forespørgsel, nye steder, missioner og dem, du møder ([3.11](#311-pictures)) |
| **Linjer** og **Slør** | Hvad der aldrig optræder, og hvad der kun sker uden for scenen | lister |
| **Sprog** | Spillets og dashboardets sprog | alle |

Femte udgave tilføjer **udvikling**: erfaringspoint eller milepæle.

Uden en skrevet verden spørger spillederen også om en **præmis** (genre, tone, nogle få elementer, med dine ord) og om **forberedelsen**: Bygger verden løbende, mens I spiller, eller helt fra start.

**Spillederens stil** bliver aldrig spurgt om, men du kan ændre den i chatten eller under **Indstillinger**: **prosaen** (jævn, litterær, pulp, tør), de **historier**, den finder på (situationer, buer, afsnit, mysterium), en forfatter at **skrive som**, eller hvad som helst andet **med dine ord**.

### 2.7 Session nul: din karakter

Du laver din karakter sammen med spillederen, som ved et bord. Alle valg er dine, medmindre du beder spillederen træffe dem: Kom med en fuld idé, en vag eller slet ingen. Spillederen fortæller, hvordan evnepoint bliver lavet, før der slås med en eneste terning. Din historie er aldrig et krav. Giver du en, skriver spillederen den med dine ord. Bagefter beder spillederen om et billede af din karakter ([3.7](#37-your-characters-story-and-picture)). RPG Engine regner karakterarket ud: Du laver aldrig regnestykkerne.

---

## 3. Spil <!-- icon: chat -->

### 3.1 Tal med spillederen

Skriv, hvad din karakter gør eller siger, med dine egne ord:

> Jeg spørger værten, hvem der ellers kom forbi i aften.

Uden for historien skriver du i kantede parenteser: *[Hvordan fungerer det at gribe fat i en modstander?]* Spillederen svarer også i kantede parenteser.

Du siger, hvad du prøver. Spillederen siger, hvad der sker. Spillederen bestemmer aldrig for din karakter og taler aldrig om motoren. Du kan spørge, hvordan dashboardet bruges.

**Handl fra dashboardet**: Klik på et navn på dit karakterark, f.eks. et våben, en besværgelse eller noget, du bærer, og derefter på hvem det gælder. Eller klik på en person for at tale med vedkommende. Dashboardet skriver din sætning, *Jeg angriber Hooded Bandit 1 med Mace.*, som du kan ændre, før du trykker **Sig til spillederen**. Spillederen hører det, som var det sagt i chatten, og afgør det som alt andet. Hvor din AI-app ikke selv kan høre det, gør **Kopiér** det klar til at indsætte i chatten.

### 3.2 Slag

Spillederen beder kun om et slag, når udfaldet er usikkert og har betydning, og siger først, hvad der står på spil. Derefter:

- **På dashboardet** viser et banner en knap for hver prøve, f.eks. *Acrobatics +4 · med vantaggio*. Klik på den: Terningerne falder på siden, og spillederen hører resultatet. Du kan også klikke på den linje på dit karakterark, der lyser op, kaste terningerne fra terningbakken eller skrive noget andet i banneret.
- **Manuelt**, i bannerets hjørne eller under **Indstillinger**: Banneret fortæller dig, hvad du skal slå, og du slår det fra dit karakterark eller terningbakken.
- **Fysiske terninger**, når terningeindstillingen er sat til fysiske: Du skriver de øjne, du slog, *[Jeg slog 14.]*, og RPG Engine lægger dine modifikatorer til.

**Frie slag**: Klik på et hvilket som helst tal på dit karakterark, eller åbn terningbakken, for at slå for sjov. De tæller aldrig, og spillederen ser dem aldrig.

**Spillederens slag** vises i din slagkolonne, undtagen de hemmelige. Du kan altid spørge *[Var det slag ægte?]*: For et hemmeligt slag giver spillederen et fingeraftryk, der beviser, at det blev slået, før du spurgte.

### 3.3 Scener og kampe

Historien forløber i **scener**: en kamp, en samtale, udforskning, rejse, en hvil. Når hver scene slutter, gemmer spillet af sig selv, og scenen kommer i din dagbog.

I en kamp fortæller spillederen hver tur, der ikke er din, og stopper, hvor du kan beslutte noget. **Scene** viser øverst, hvis tur det er, og hvem der kommer derefter, og din karakters kort ved siden af kortet. Turrækkefølgen, din gruppes hitpoint og hvor såret fjenderne ser ud, med ord, bliver stående ved siden af siden. Hvis din karakter falder, vises dødsslagene store på siden.

### 3.4 Tid, rejser og verden, der bevæger sig

RPG Engine holder styr på datoen. Der går ingen tid mellem sessioner. Sig, at I hviler, *Vi tager en lang hvil*, og når spillederen er enig, giver hvilen tilbage, hvad den skal. Ved en kort hvil kan spillederen spørge på dashboardet, hvor mange hit dice du bruger: Slå dem én ad gangen, se hvad hver heler, og stop, når du vil. Sig, hvorhen I går, *Vi tager vejen nordpå mod Rocca*, og RPG Engine regner vejen, afstanden og dagene ud og stopper, når der sker noget undervejs. Penge bliver talt i spillets mønter, byttepenge med.

Skurke har planer med frister. Hver ny dag rykker spillederen de trusler frem, som tiden har fremmet, og du ser deres tegn, aldrig selve uret.

### 3.5 Kort

**Verden** viser de steder, din karakter kender, vejene imellem dem og det spor, du har gået, med tåge over resten. **Scene** viser kortet over det sted, hvor du er, når der er et, med hvem der står hvor. I en kamp er de felter, du ikke kan nå, tilsløret på din tur. Når spillederen spørger, hvorhen du går, så tryk på et felt eller skriv det, f.eks. *E4*.

### 3.6 Missioner, dagbog og noter

En opgave, din karakter tager på sig, bliver til en mission i **Dagbog** med dens mål, dens frist og det, den måler. Sæt stjerne ved den for at holde den i syne øverst i Scene. Dagbogen fortæller også din **historie**, scene for scene, og gemmer dine **noter**: private, medmindre du **Del**er en, som spillederen hører som det, du tænker, aldrig som et faktum.

### 3.7 Din karakters historie og billede

På dit karakterark har kortet **Beskrivelse** en boks til din karakters historie: Spillederen skriver i den, når du har sagt ja. Til et billede kan du give spillederen en fil (PNG, JPEG, WebP eller SVG, op til 5 MB) og sige, hvor den ligger på din computer, eller du kan få lavet et portræt ([3.11](#311-pictures)): *[Lav et portræt af mig: gråt hår i en fletning, et ar på hagen.]*

### 3.8 Gemte spil og at gå tilbage

RPG Engine gemmer hele kampagnen ved slutningen af hver scene. Indstillingen **gemte spil** afgør resten:

| Gemte spil | Gem, når du vil | Gå tilbage |
|---|---|---|
| **permadeath** | nej | aldrig |
| **checkpoint** | nej | til det sidste gemte spil, kun når din karakter dør |
| **fri** | ja | til ethvert gemt spil |

I alle tilstande kan du **starte forfra**, fra spillets start eller fra session nul. Gør det i chatten eller under **Gemte spil**.

Når du er gået tilbage, så **åbn en ny chat**: Den gamle husker det, der blev fortrudt. Skriv *fortsæt* i den nye chat, og tryk derefter på **Jeg har åbnet en ny chat** under Gemte spil.

### 3.9 Sessioner: at stoppe og vende tilbage

Stop, når du vil: *[Lad os stoppe her for i aften.]* Alt er allerede gemt i filerne. For at vende tilbage skal du starte din agent i kampagnemappen og skrive *fortsæt*: Spillederen giver dig en kort opsummering og går videre.

### 3.10 Spillederens humør

Robotten øverst på dashboardet er spillederen: Dens ansigt følger historiens tone og afslører aldrig, hvad du endnu ikke ved. Når chatten er lukket, sover den.

### 3.11 Billeder

RPG Engine kan få lavet billeder af de steder, du når, de missioner, du tager, og dem, du møder, som indstillingen **billeder** siger, og din karakters portræt, når du beder om det. Den bruger din egen Codex eller Claude Code, med dit login, på dit abonnement og dets grænser: **Codex** maler dem, ellers tegner **Claude Code** dem. **Indstillinger** viser, om denne computer kan lave dem, og hvordan du sætter det op, hvis ikke. Du kan altid give spillederen et billede, du selv har.

### 3.12 Tryghed: linjer, slør og stop

**Linjer** optræder aldrig i spillet. **Slør** sker kun uden for scenen. Skriv når som helst *[stop]*: Spillederen dropper straks det indhold og føjer det til dine linjer.

### 3.13 Skift mening

Enhver indstilling kan ændres, i chatten eller under **Indstillinger**. En afgørelse, spillederen træffer uden bogen, bliver til en **præcedens**, så det samme spørgsmål får det samme svar næste gang.

---

## 4. Dashboardet <!-- icon: party -->

En side på din egen computer, som kun kan åbnes i den computers browser, og som er i live, mens chatten er åben. Når chatten lukker, viser den *Not connected*. Den kommer tilbage af sig selv med den næste chat.

- **Gruppe**: dit karakterark og dine følgesvendes. Klik på et tal for at slå med det. Hold musen over det for at se, hvor det kommer fra. Ved siden af står slagene.
- **Scene**: hvor du er, dets billede og kort, hvem der er der, og hvad der sker. I en kamp vises turene og din karakters kort.
- **Dagbog**: missioner, historien, dine noter.
- **Verden**: verdenskortet, som din karakter kender det.
- **Terningbakken**: vælg terninger og en modifikator, og kast.
- **Gemte spil**, **Hjælp**, **Indstillinger** og **Om** som ikoner for enden af rækken. Indstillinger rummer også sidens egne præferencer: tema, terningelyd, terningesæt.

Når spillederen spørger dig om noget, bliver spillederens banner øverst, uanset hvilken sektion du er i.

---

## 5. Spilsystemer og husregler <!-- icon: dice -->

### 5.1 Hvad et spilsystem er

Data for ét spil: dets karakterark, tal, væsner, genstande, besværgelser og regeltekst. Hver kampagne spiller ét system. RPG Engine regner karakterarket ud og holder styr på, hvad der bruges, og hvad der kommer tilbage. Hvordan en evne virker, læser spillederen i reglerne og afgør, som ved et bord.

### 5.2 Femte udgave, inkluderet

Racerne, klasserne, underklasserne, en baggrund og en færdighed (feat) fra SRD 5.1; de 319 besværgelser, våbnene, rustningerne, magiske genstande og monstrene; regelkapitlerne, som spillederen læser i deres præcise ordlyd; det fulde karakterark, udregnet.

Du kan også spille indhold, som SRD'en mangler, fra en bog, du selv ejer: Spillederen skriver det som sider i din kampagne, og RPG Engine behandler dem som sine egne. RPG Engine leveres kun med åbent indhold. Det, din spilleder kender, er ikke begrænset.

Dine egne bøger kan blive dit bibliotek. Fortæl spillederen, hvor de er: *[Mine regelbøger ligger i D:\Books\5e.]* Eller tilføj deres mappe i Packages › Library, og sig ja i det vindue, din computer viser, én gang. RPG Engine læser dem på denne computer. Hver kampagne bruger de mapper, du slår til der. Spillederen søger i dem, når en regel skal afgøres, efter SRD'en, og angiver bog og side. De læses bedst som tekst eller som PDF-filer, hvor teksten kan markeres. En scannet PDF læses ud fra billederne af siderne, kun på Windows, på nogle få minutter og med enkelte fejl. RPG Engine ændrer aldrig dine bøger, sender aldrig deres tekst nogen steder hen og kopierer den aldrig ind i en kampagne.

### 5.3 Husregler og dine egne tilføjelser

Spørg spillederen: *[Husregel: et naturligt 1 på et angreb betyder, at du taber dit våben.]* Spillederen gemmer den som en aftale ved bordet, eller skriver en side eller et tal på karakterarket, når det er nødvendigt. Husregler, der allerede er skrevet ud, kan lægges som tekstfiler i kampagnens mappe `rules`.

### 5.4 Tilføj eller importér dit eget spilsystem

Ikke endnu: I dag spiller RPG Engine kun femte udgave ([Kommer senere](#9-coming-later)).

---

## 6. Udvidelser <!-- icon: plus -->

Ikke endnu. En udvidelse vil tilføje noget til en kampagne ovenpå dens spilsystem: en verden, et eventyr, en funktion som vejret, husregler til at dele.

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
- **Forfattertilstand**: skriv et eventyr sammen med AI'en, eksportér det og del det.
- **Flere spillere på samme computer**, hver med sin egen karakter, som skiftes til at tale i den samme chat.
- **Udvidelser**: indstillinger, eventyr, funktioner og husregler.
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
