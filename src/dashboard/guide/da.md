<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb f4fdeebb 80a7cfb9 23c5f59b b8f80c05 8c9f41da 0b4a6ef8 338535a6 728ca4a5 e2839149. Change the English, then run it again. -->
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
- **Node.js 22** eller nyere, fra [nodejs.org](https://nodejs.org). Den leveres med `npm`, som installerer RPG Engine.
- En **terminal**: på Windows Terminal eller PowerShell, på macOS Terminal. For at åbne en i en mappe skal du højreklikke på mappen og vælge **Åbn i Terminal** (Windows) eller **Tjenester > Ny terminal i mappen** (macOS).
- En **AI-agent** til spillederen ([2.4](#24-connect-your-ai)), med den **største model** den tilbyder: en lille model lader sig lettere overtale til at afsløre hemmeligheder eller bøje reglerne.

### 2.2 Installer

```text
npm install -g rpg-engine
```

`rpg --version` tjekker, at det lykkedes. Du bruger `rpg` én gang pr. kampagne, når du opretter den. Derefter starter din agent selv RPG Engine.

### 2.3 Opret en kampagne

Åbn en terminal i den mappe, hvor du gemmer dine spil ([2.1](#21-what-you-need) forklarer hvordan):

```text
rpg init "The Salt Isles"
```

Det laver mappen `The Salt Isles` med en ny kampagne i. Gå ind i den med `cd "The Salt Isles"`. Husk, hvor den ligger: du vender tilbage til den, hver gang du spiller. Alt andet vælger du senere, i chatten eller på dashboardet. `rpg init --help` viser de valg, du kan træffe nu, for eksempel `--language it` eller `--difficulty hard`.

Spillederen kan ikke oprette en kampagne for dig: før `init` fortæller intet din agent, hvor RPG Engine er.

### 2.4 Forbind din AI

Spillederen kører i en **AI-agent**: en AI-app, i terminalen eller på skrivebordet, som kan arbejde med filerne på din computer, for eksempel Claude Code eller Codex. En almindelig chat som claude.ai eller ChatGPT, eller en app på telefonen, er ikke nok: spillederen skal kunne nå kampagnens filer på din computer. Hver agent kræver sit eget abonnement og sit eget login: Claude Code et betalt Claude-abonnement, Codex et ChatGPT-login. Du installerer den én gang fra dens egen side: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: skriv `claude` i kampagnemappen. Når den spørger, om du stoler på mappen, så vælg **Yes, I trust this folder**. Pas på: det svar, der er valgt på forhånd, er *No, exit*.
- **Codex**: skriv `codex` i kampagnemappen, og svar ja, når den spørger, om du stoler på mappen. I desktop-appen skal du tjekke i indstillingerne, at hukommelser er slået fra for spillets chats.
- **En anden agent**: start den i kampagnemappen, og giv den MCP-serveren `rpg mcp`. RPG Engine er en standard MCP-server: enhver agent, der understøtter MCP, kan være spilleder, også lokale.

Vi spiller og tester med **Claude Code**. **Codex** er forbundet og kontrolleret, men en hel kampagne er endnu ikke spillet med den. `init` gør også **Gemini CLI** klar. Kampagnen slår agentens egen hukommelse fra: spillet bor i sine filer, så et skift tilbage til et gemt spil virkelig går tilbage.

### 2.5 Den første chat

Skriv hvad som helst, for eksempel *Hej! Lad os begynde.* I sit første svar i hver chat giver spillederen dig **linket til dit dashboard**, noget i retning af `http://127.0.0.1:4750`. Åbn det, og hav det ved siden af chatten.

Mellem spillederens beskeder viser din agent de værktøjer, den bruger. Åbn ikke deres detaljer (i Claude Code ctrl+o): de kan vise hemmeligheder.

En ny kampagne går gennem tre trin, som vises øverst på dashboardet: **1 Indstillinger** (hvordan du vil spille), **2 Session nul** (du laver din karakter, i spillet), **3 Spil**.

### 2.6 Indstillinger: vælg, hvordan du spiller

Spillederen spørger kun om det, der stadig mangler, nogle få spørgsmål ad gangen. Trinnet **Indstillinger** på dashboardet viser de samme spørgsmål som kort. Skriv "du bestemmer", så vælger spillederen. Alt kan ændres senere, i chatten eller under **Indstillinger**.

| Indstilling | Hvad den afgør | Værdier |
|---|---|---|
| **Mentor** | Hvor meget spillederen lærer dig om reglerne | fra, tip, tutorial |
| **Sværhedsgrad** | Hvor hård verdenen er | historie, let, normal, svær, brutal |
| **Dødelighed** | Hvad det betyder at falde i en kamp | fortællende (aldrig død), episk (kun når det tæller), terninger |
| **Gemte spil** | Hvornår du må gå tilbage | permadeath, checkpoint, frit ([3.8](#38-saves-and-going-back)) |
| **Strenghed** | Hvor nøje mad, lys og rejser følger reglerne | glat, regler, simulering |
| **Terninger** | Hvem der slår dine terninger | digitale, fysiske |
| **Enheder** | Afstande og vægt | metriske, imperiale |
| **Følgesvende** | Hvem der rejser med dig | ingen, lavet med dig, lavet af spillederen, mødt i spillet |
| **Billeder** | Billeder af steder, missioner og dem, du møder | ingen, på forespørgsel, nye steder, missioner og dem, du møder ([3.11](#311-pictures)) |
| **Linjer** og **Slør** | Hvad der aldrig optræder, og hvad der kun sker uden for scenen | lister |
| **Sprog** | Spillets og dashboardets sprog | alle |

Femte udgave tilføjer **udvikling**: erfaringspoint eller milepæle.

Hvis der ikke er skrevet en verden, spørger spillederen også om en **præmis** (genre, tone, nogle få elementer, med dine egne ord) og om **forberedelsen**: bygge verdenen undervejs, mens du spiller, eller det hele i starten.

**Spillederens stil** bliver aldrig spurgt om, men du kan ændre den i chatten eller under **Indstillinger**: **prosaen** (jævn, litterær, pulp, tør), de **historier** den finder på (situationer, forløb, episoder, mysterium), en forfatter at **skrive som**, eller hvad som helst andet **med dine egne ord**.

### 2.7 Session nul: din karakter

Du laver din karakter sammen med spillederen, som ved et bord. Alle valg er dine, medmindre du beder spillederen om at træffe dem: kom med en fuld idé, en vag eller slet ingen. Spillederen fortæller dig, hvordan egenskabsværdierne laves, før der slås med nogen terning. Du behøver ikke at have en historie. Hvis du giver en, skriver spillederen den med dine ord. Derefter beder spillederen om et billede af din karakter ([3.7](#37-your-characters-story-and-picture)). RPG Engine regner karakterarket ud: du skal aldrig selv regne.

---

## 3. Spil <!-- icon: chat -->

### 3.1 At tale med spillederen

Skriv, hvad din karakter gør eller siger, med dine egne ord:

> Jeg spørger værten, hvem der ellers kom forbi i aften.

Uden for historien skriver du i kantede parenteser: *[Hvordan fungerer det at gribe fat i en modstander?]* Spillederen svarer også i parenteser.

Du siger, hvad du forsøger. Spillederen siger, hvad der sker. Spillederen bestemmer aldrig for din karakter og taler aldrig om motoren. Du kan spørge spillederen, hvordan dashboardet bruges.

### 3.2 Slag

Spillederen beder kun om et slag, når udfaldet er usikkert og har betydning, og siger først, hvad der står på spil. Derefter:

- **På dashboardet** viser et banner en knap for hver prøve, for eksempel *Acrobatics +4 · with advantage*. Klik på den: terningerne falder på siden, og spillederen hører resultatet. Du kan også klikke på den linje på dit karakterark, der lyser op, kaste terningerne fra terningbakken eller skrive noget andet i banneret.
- **Manuelt**, i bannerets hjørne eller under **Indstillinger**: banneret fortæller dig, hvad du skal slå, og du slår det fra dit karakterark eller fra terningbakken.
- **Fysiske terninger**, når terningeindstillingen er sat til fysiske: du skriver de øjne, du slog, *[Jeg slog 14.]*, og RPG Engine lægger dine modifikatorer til.

**Frie slag**: klik på et vilkårligt tal på dit karakterark, eller åbn terningbakken, for at slå for sjov. De tæller aldrig, og spillederen ser dem aldrig.

**Spillederens slag** vises i din slagkolonne, bortset fra de hemmelige. Du kan altid spørge *[Var det slag ægte?]*: for et hemmeligt slag giver spillederen et fingeraftryk, der beviser, at det blev slået, før du spurgte.

### 3.3 Scener og kampe

Historien forløber i **scener**: en kamp, en samtale, udforskning, rejse, en hvile. Ved slutningen af hver scene gemmer spillet af sig selv, og scenen kommer i din dagbog.

I en kamp fortæller spillederen hver tur, der ikke er din, og stopper der, hvor du skal beslutte noget. Afsnittet **Kamp** viser rækkefølgen af turene, din gruppes hitpoint og hvor såret fjenderne ser ud, i ord. Hvis din karakter falder, vises dødsslagene stort på siden.

### 3.4 Tid, rejser og verdenen, der bevæger sig

RPG Engine holder styr på datoen. Der går ingen tid mellem sessioner. Sig, at I hviler, *Vi tager en lang hvile*, og hvilen giver tilbage, hvad den skal. Sig, hvor I tager hen, *Vi følger vejen nordpå mod Rocca*, og RPG Engine regner vejen, afstanden og dagene ud og stopper, når der sker noget undervejs. Penge tælles i spillets mønter, byttepenge med.

Skurke har planer med frister. Hver ny dag rykker spillederen de trusler frem, som tiden har bragt videre, og du ser tegnene på dem, aldrig selve uret.

### 3.5 Kort

**Verden** viser de steder, din karakter kender, vejene imellem dem og den sti, du har gået, med tåge over resten. **Scene** viser kortet over det sted, hvor du er, når det har et, med hvem der står hvor. I en kamp, på din tur, er de felter, du ikke kan nå, skjult. Når spillederen spørger, hvor du bevæger dig hen, så tryk på et felt, eller skriv det, for eksempel *E4*.

### 3.6 Missioner, dagbog og noter

En opgave, din karakter tager på sig, bliver til en mission i **Dagbog** med sine mål, sin frist og det, den måler. Sæt stjerne ved den for at have den i syne øverst i Scene. Dagbogen fortæller også din **historie**, scene for scene, og gemmer dine **noter**: de er private, medmindre du **Del**er en. Spillederen hører den som det, du tænker, aldrig som en kendsgerning.

### 3.7 Din karakters historie og billede

På dit karakterark har kortet **Beskrivelse** et felt til din karakters historie: spillederen skriver i det, efter at du har sagt ja. Til et billede kan du give spillederen en fil (PNG, JPEG, WebP eller SVG, op til 5 MB) sammen med stien til den på din computer, eller du kan få lavet et portræt ([3.11](#311-pictures)): *[Lav et portræt af mig: gråt hår i en fletning, et ar på hagen.]*

### 3.8 Gemte spil og at gå tilbage

RPG Engine gemmer hele kampagnen ved slutningen af hver scene. Indstillingen **Gemte spil** afgør resten:

| Gemte spil | Gem, når du vil | Gå tilbage |
|---|---|---|
| **permadeath** | nej | aldrig |
| **checkpoint** | nej | til det seneste gemte spil, kun når din karakter dør |
| **frit** | ja | til ethvert gemt spil |

I alle tilstande kan du **starte forfra**, fra begyndelsen af spillet eller fra session nul. Gør det i chatten eller under **Gemte spil**.

Når du er gået tilbage, skal du **åbne en ny chat**: den gamle husker, hvad der blev fortrudt. Skriv *fortsæt* i den nye chat, og tryk derefter på **Jeg har åbnet en ny chat** under Gemte spil.

### 3.9 Sessioner: at stoppe og vende tilbage

Hold pause, når du vil: *[Lad os stoppe her for i aften.]* Alt er allerede gemt i filerne. For at vende tilbage skal du starte din agent i kampagnemappen og skrive *fortsæt*: spillederen giver dig et kort resumé og fortsætter.

### 3.10 Spillederens humør

Robotten øverst på dashboardet er spillederen: dens ansigt følger historiens tone og afslører aldrig, hvad du endnu ikke ved. Når chatten er lukket, sover den.

### 3.11 Billeder

RPG Engine kan få lavet billeder af de steder, du når frem til, de missioner, du tager, og dem, du møder, som indstillingen **Billeder** siger, og din karakters portræt, når du beder om det. Det bruger det, der er på din computer, med dit eget login: **Codex** maler dem, ellers tegner **Claude Code** dem. **Indstillinger** viser, om denne computer kan lave dem, og hvordan du gør den klar, hvis ikke. Du kan altid give spillederen et billede, du selv har.

### 3.12 Tryghed: linjer, slør og stop

**Linjer** optræder aldrig i spillet. **Slør** sker kun uden for scenen. Skriv *[stop]* når som helst: spillederen dropper straks det indhold og lægger det til dine linjer.

### 3.13 At skifte mening

Enhver indstilling kan ændres, i chatten eller under **Indstillinger**. En afgørelse, som spillederen træffer uden at slå op i bogen, bliver til en **præcedens**, så det samme spørgsmål får det samme svar næste gang.

---

## 4. Dashboardet <!-- icon: party -->

En side på din egen computer, som kun kan åbnes i den computers browser, og som er levende, mens chatten er åben. Når chatten lukkes, viser den *Not connected*. Den kommer tilbage af sig selv med den næste chat.

- **Gruppe**: dit karakterark og dine følgesvendes. Klik på et tal for at slå det. Hold musen over det for at se, hvor det kommer fra. Ved siden af står slagene.
- **Scene**: hvor du er, dens billede og kort, hvem der er der, hvad der sker.
- **Kamp**: kun i en kamp: turene, deltagerne, hvad du har ved hånden.
- **Dagbog**: missioner, historien, dine noter.
- **Verden**: verdenskortet, som din karakter kender det.
- **Terningbakken**: vælg terninger og en modifikator, og kast.
- **Gemte spil**, **Hjælp**, **Indstillinger** og **Om** som ikoner for enden af rækken. Indstillinger rummer også sidens egne præferencer: tema, terningelyd, terningesæt.

Når spillederen spørger dig om noget, bliver dens banner stående øverst, uanset hvilken sektion du er i.

---

## 5. Spilsystemer og husregler <!-- icon: dice -->

### 5.1 Hvad et spilsystem er

Data for ét spil: dets karakterark, dets tal, dets væsner, genstande, magi og regeltekster. Hver kampagne spiller ét system. RPG Engine regner karakterarket ud og det, der bruges og kommer tilbage. Hvordan en evne virker, læser spillederen i reglerne og afgør, som ved et bord.

### 5.2 Femte udgave, med i pakken

Racerne, klasserne, underklasserne, en baggrund og en evne (feat) fra SRD 5.1, de 319 trylleformularer, våbnene, rustningerne, de magiske genstande og monstrene, regelkapitlerne, som spillederen læser efter deres nøjagtige tekst, og det fulde karakterark, udregnet.

Du kan også spille indhold, som SRD'en mangler, fra en bog du ejer: spillederen skriver det som sider i din kampagne, og RPG Engine behandler dem som sine egne. RPG Engine leveres kun med åbent indhold. Det, din spilleder kender, har ingen grænse.

### 5.3 Husregler og dine egne tilføjelser

Spørg spillederen: *[Husregel: et naturligt 1 på et angreb betyder, at du taber dit våben.]* Spillederen gemmer den som en aftale ved bordet, eller skriver en side eller et tal på karakterarket, når det er nødvendigt. Husregler, der allerede er skrevet ud, kan lægges som tekstfiler i kampagnens mappe `rules`.

### 5.4 At tilføje eller importere dit eget spilsystem

Ikke endnu: i dag spiller RPG Engine kun femte udgave ([Kommer senere](#9-coming-later)).

---

## 6. Udvidelser <!-- icon: plus -->

Ikke endnu. En udvidelse vil tilføje noget til en kampagne ovenpå dens spilsystem: en verden, et eventyr, en funktion som vejret, husregler til at dele.

---

## 7. Hvor en kampagne kommer fra, og dens sprog <!-- icon: world -->

### 7.1 Tre måder at få en verden på

- **Lavet undervejs**: ud fra din præmis bygger spillederen hvert sted, hver person og hvert plot lige før, du får brug for dem, og gemmer det.
- **Forberedt i starten**: det samme, men med verdenen bygget før spillet.
- **Fra dit eget eventyr**: giv spillederen en tekst eller en PDF, og bed om at sætte det op, *[Sæt dette eventyr op som vores kampagne. Fortæl mig ikke noget af det, der står i det.]* Spillederen skriver stederne, karaktererne og hemmelighederne. Der er endnu ingen importknap.

En kampagne spilles én gang: for at spille det samme eventyr igen skal du oprette en ny kampagne.

### 7.2 Sprog

Ét sprog pr. kampagne, spillederens, som dashboardet følger. Dashboardet leveres på 26 sprog. Ethvert andet bliver oversat på din computer af Codex eller Claude Code, eller, uden dem, af spillederen i chatten. Femte udgaves termer på italiensk kommer fra den officielle italienske SRD. Regelteksten forbliver på engelsk, og spillederen fortæller den på dit sprog.

---

## 8. For nysgerrige: kampagnemappen <!-- icon: list -->

Du behøver aldrig at åbne den, og den gemmer på din kampagnes hemmeligheder. Den indeholder `campaign.yaml` (dine indstillinger), `state.yaml` (hvor spillet står), `world/` (én markdown-side til hver karakter, hvert sted, hver mission og resten), `rules/` (dine husregler), `images/`, `log.jsonl` (alle ændringer), `.saves/`, `.player/` (dine noter) og de små filer, der fortæller AI-agenter, hvor RPG Engine er. Siderne bruger Obsidians format. Hvis du ændrer en side i hånden, får spilleder det at vide ved sit næste svar.

RPG Engine bliver i denne mappe: Programmet læser og skriver kun spillet her og rører aldrig dine andre filer. Uden for mappen har det kun sin egen datamappe (dashboardets oversættelser, samt Codex eller Claude Code, hvis du lader det installere dem) og midlertidige mapper, mens et billede bliver tegnet. Alt andet, din agent vil gøre på din computer, spørger den dig om først.

Alle de kommandoer, spilleder bruger, kan også køres i kampagnemappen: `rpg --help` viser dem. Mange af dem udskriver kampagnens hemmeligheder.

---

## 9. Kommer senere <!-- icon: hourglass -->

- **Dig som spilleder**, mens AI'en spiller gruppen.
- **Forfattertilstand**: skriv et eventyr sammen med AI'en, og eksporter og del det bagefter.
- **Flere spillere på samme computer**, hver med sin egen karakter, på skift i den samme chat.
- **Udvidelser**: indstillinger, eventyr, funktioner og husregler.
- **Import** af dine regelbøger og eventyr.
- **Andre spil**: flere spilsystemer og dine egne.

---

## 10. Spørgsmål og problemer <!-- icon: info -->

### Spørgsmål

**Skal jeg kende reglerne?** Nej. Vælg tutorial-mentoren, og spørg i parenteser, når du vil.

**Kan spillederen snyde?** Spillederen kan ikke ændre et slag, som RPG Engine har slået, undtagen på sværhedsgraden historie, og heller ikke fakta, der allerede er fastlagt.

**Koster det noget?** RPG Engine er gratis. Spillederen kører på din agents abonnement eller på din egen computer med en lokal model. En aften med spil er en lang chat: på de mindste abonnementer kan du nå abonnementets grænse, før aftenen er slut. Billeder og oversættelser bruger det samme abonnement.

**Kan jeg spille på min telefon?** Nej: spillederen kører på din computer, og dashboardet åbnes kun dér.

**Kan jeg spille med venner?** Ikke endnu: i dag én spiller, én karakter, plus følgesvende ([Kommer senere](#9-coming-later)).

**Kan jeg bruge en anden AI næste gang?** Ja: åbn kampagnen i en anden agent, og skriv *fortsæt*.

### Problemer

**Dashboardet åbner ikke.** Spørg spillederen: `[Hvad er linket til dashboardet?]`. Det virker kun, mens en chat er åben i den kampagne, efter spillederens første svar.

**Spillederen ser ikke ud til at kende spillet.** Din agent har ikke indlæst RPG Engine. Tjek, at du startede den i kampagnemappen og stolede på den. I Claude Code skal du skrive `/mcp` og forbinde `rpg` igen. I Codex skal `codex mcp list` i kampagnemappen vise `rpg`. Hvis `rpg --version` ikke findes, skal du installere RPG Engine igen ([2.2](#22-install)).

**Opdatering.** Kør `npm install -g rpg-engine` igen, og åbn derefter en ny chat: en spilleder, der allerede kører, beholder den version, den startede med.

**Spillederen husker noget, jeg fortrød.** Åbn en ny chat, og tryk på **Jeg har åbnet en ny chat** under Gemte spil.

**Der kommer ingen billeder.** Indstillinger > Billeder viser, om denne computer kan lave dem, og hvordan.

**Installationen mislykkes, eller `rpg` vil ikke starte.** `node --version` skal vise 22 eller nyere. På Windows skal du holde RPG Engine og dine kampagner ude af stier, der indeholder `&`.

**Dashboardets link har ændret sig.** Et andet program tog den sædvanlige adresse. Spillederen giver dig det nye link.
