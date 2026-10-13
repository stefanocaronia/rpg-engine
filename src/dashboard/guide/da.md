<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 8b2b048d 7705224a 781d8fc0 89c84229 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: den komplette guide

**RPG Engine** lader dig spille et bordrollespil med en **AI som spilleder**.

Du taler med spillederen i en **chat**: Spillederen fortæller historien, spiller alle andre og afgør, hvad der sker.

RPG Engine arbejder i baggrunden: Det **husker verdenen**, **slår med terningerne** og **fører regnskabet**.

Ved siden af chatten holder du en side åben i din browser, **dashboardet**, med din karakters karakterark, terningerne, kortene og din dagbog.

Denne guide er til spillere: Du behøver ikke at kunne programmere.

## Hurtig start <!-- icon: send -->

1. Installer **Node.js** fra [nodejs.org](https://nodejs.org) (LTS-versionen).
2. Installer **Claude Code** eller **Codex**, den AI-app som spillederen kører i, og log ind ([2.4](#24-connect-your-ai)).
3. Åbn en terminal og installer RPG Engine: `npm install -g rpg-engine`.
4. Opret en kampagne i terminalen: `rpg init "The Salt Isles"`.
5. Åbn Claude Code eller Codex i den nye mappe og skriv *Hej! Lad os starte.* Spillederen svarer med linket til dit dashboard: Åbn det ved siden af chatten.

Resten af guiden forklarer hvert trin og derefter, hvordan man spiller.

## 1. Hvad RPG Engine er <!-- icon: about -->

### Hvem gør hvad

| Hvem | Hvad de gør |
|---|---|
| **Du** | Du spiller din karakter. Du siger, hvad karakteren gør, siger og prøver. |
| **Spillederen** (AI'en) | Fortæller historien, spiller alle andre karakterer, afgør, hvad der sker, og beder om slag. |
| **RPG Engine** | Husker alt i filer, slår med terningerne, tæller hitpoints, penge, tid og afstande og holder hemmeligheder skjult, indtil du opdager dem. |

En AI er god til at fortælle historier og dårlig til at huske. Overladt til sig selv glemmer den, hvem der skylder dig penge, hvor mange pile du har, eller at broen brændte for to sessioner siden. RPG Engine husker alt det, så verdenen er den samme fra den ene aften til den næste, selv i en ny chat, selv med en anden AI.

### Hvordan det føles

Du skriver i chatten, som du ville tale ved bordet:

> Jeg skubber langsomt døren op og kigger ind.

Spillederen svarer med det, du ser, og stopper, når det er din tur til at vælge. Når noget er usikkert og har betydning, siger spillederen, hvad der står på spil, og beder om et slag. Knapperne til slaget dukker op på dit dashboard. Du klikker, terningerne falder på siden, og spillederen fortæller, hvad der sker.

### Hvad der gør det anderledes

- **Verdenen består.** Det, der er sagt, forbliver sandt. En død skurk forbliver død.
- **Terningerne er ægte.** Spillederen kan ikke bøje dem (undtagen på den letteste sværhedsgrad, hvis du vælger den).
- **Hemmeligheder forbliver hemmelige.** Spillederen afslører aldrig, hvad din karakter ikke ved, selv hvis du insisterer.
- **Verdenen bevæger sig uden dig.** Trusler rykker frem, mens du hviler eller rejser, og du ser tegnene på det.
- **Mange aftener, én historie.** En kampagne er en mappe på din computer. Du kan stoppe, når du vil, og fortsætte senere.

### Det spil, den spiller i dag

RPG Engine er lavet til alle rollespil ved bordet. I dag følger der ét spilsystem med: **femte udgave** (fra det gratis System Reference Document 5.1). Andre spil kommer; se [Spilsystemer](#5-game-systems-and-house-rules) og [Kommer senere](#9-coming-later).

---

## 2. Kom i gang <!-- icon: path -->

### 2.1 Det skal du bruge

- En computer med Windows, macOS eller Linux.
- **Node.js 22** eller nyere. Hent det på [nodejs.org](https://nodejs.org): "LTS"-versionen er fin. Det kommer med `npm`, som installerer RPG Engine.
- En **terminal**, det vindue hvor du skriver kommandoer: på Windows appen Terminal eller PowerShell, på macOS Terminal. Du bruger den til at installere RPG Engine, til at oprette hver kampagne og til at starte Claude Code eller Codex.
- En **AI-vært**, den app som spilleder kører i: **Claude Code** eller **Codex**, med sit abonnement og sit login. Se [2.4](#24-connect-your-ai).
- Den **største model**, som din vært tilbyder. En lille model lader sig snyde: i vores tests afslørede den hemmeligheder for en spiller, der påstod at være den rigtige spilleder.
- En webbrowser til dashboardet.

Det login, du bruger til din vært, kan mere: RPG Engine bruger det på din computer til at tegne billeder af steder, missioner og din karakter, og til at oversætte dashboardet til sprog, det ikke leveres med. Se [Billeder](#311-pictures) og [Sprog](#72-languages).

**Sådan åbner du en terminal i en mappe.** Mange trin siger "i kampagnemappen". På Windows højreklikker du på mappen i Filutforskeren og vælger **Åbn i Terminal**. På macOS højreklikker du på mappen i Finder og vælger **Services > Ny terminal ved mappe**. Eller skriv `cd` og mappens sti i en terminal, der allerede er åben, for eksempel `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Installér

Åbn en terminal og skriv:

```text
npm install -g rpg-engine
```

Det giver dig kommandoen `rpg`. Sådan tjekker du, at det virkede:

```text
rpg --version
```

Du bruger `rpg` én gang pr. kampagne, når du opretter den. Derefter taler du kun med spilleder: din AI-vært starter selv RPG Engine med den samme kommando, `rpg`.

### 2.3 Opret en kampagne

En kampagne er en mappe. Åbn en terminal i den mappe, hvor du gemmer dine spil, og skriv:

```text
rpg init "The Salt Isles"
```

Det laver mappen `The Salt Isles` med en ny kampagne i, og fortæller dig, hvad du skal gøre bagefter:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

Linjerne efter *For the master* er til spilleder, som læser dem i chatten: dem skal du ikke gøre noget ved. Husk, hvor mappen ligger: du vender tilbage til den, hver gang du spiller. Uden et mappenavn gør `rpg init` den mappe, du står i, til kampagnen.

`init` laver alt, hvad kampagnen har brug for: dens indstillinger, dens verdensmapper og de små filer, der fortæller din AI-vært, at den skal bruge RPG Engine og ikke have nogen hukommelse af sig selv uden for kampagnen.

Du behøver ikke vælge noget nu. Spilleder spørger dig om resten i chatten, eller du vælger det på dashboardet. Hvis du allerede kender nogle valg, kan du angive dem her:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Det laver mappen `salt-isles` med kampagnen *The Salt Isles* i: et mappenavn uden mellemrum og kampagnens navn, som du vil have det.

| Valg | Hvad det bestemmer | Værdier |
|---|---|---|
| `--name` | Kampagnens navn | vilkårligt; mappens navn, hvis du udelader det |
| `--language` | Spillets sprog | en kode, for eksempel `en`, `it`, `fr` |
| `--system` | Spilsystemet | `5e`, i dag det eneste |
| `--difficulty` | Hvor hård verden er at spille i | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Hvad det betyder at falde i en kamp | `narrative`, `epic`, `dice` |

`rpg init --help` viser dem også. En kampagne kan ikke ligge inde i en anden kampagnes mappe.

Du kan ikke bede spilleder om at oprette en kampagne: før `init` er der intet i mappen, der fortæller din AI-vært, hvor RPG Engine er.

### 2.4 Forbind din AI

RPG Engine virker med **Claude Code** og **Codex**. Andre AI-apps, der bruger MCP-værktøjer, virker måske også, men det kan vi ikke garantere.

**Installér din vært.** Claude Code og Codex kører i terminalen: de er ikke Claude- eller ChatGPT-appen på din telefon. Hver af dem skal have sit eget abonnement og login: Claude Code et betalt Claude-abonnement, Codex et ChatGPT-login. Følg deres egne sider for at installere dem og logge ind: [Claude Code](https://code.claude.com/docs/en/setup) og [Codex](https://learn.chatgpt.com/docs/codex/cli). Det gør du én gang for alle dine kampagner.

**Claude Code.** Åbn en terminal i kampagnemappen og skriv `claude`. Første gang spørger den, om du stoler på mappen, og siger, at mappen tillader spillets værktøjer (`mcp__rpg`): vælg **Yes, I trust this folder**. Pas på: det svar, der er valgt på forhånd, er *No, exit*, så hvis du bare trykker Enter, lukker Claude Code. Mere er der ikke i det: kampagnen har allerede fortalt Claude Code, at den skal bruge RPG Engine og dens værktøjer, og at hukommelsen skal være slået fra.

**Codex.** Åbn en terminal i kampagnemappen og skriv `codex`. Når den spørger, om du stoler på mappen, så svar ja: kampagnens egne indstillinger fortæller Codex, hvor RPG Engine er, tillader dens værktøjer og slår dens hukommelse fra, og Codex læser dem kun i en mappe, du stoler på. I skrivebordsappen skal du tjekke, at hukommelser er slået fra for spillets chats.

**Hvorfor hukommelse betyder noget.** Kampagnen lever i sine filer. Hvis værten også husker ting på egen hånd, ville det ikke rigtigt være at gå tilbage at vende tilbage til et gemt spil: spilleder ville stadig huske det, der blev fortrudt.

### 2.5 Den første chat

Skriv hvad som helst, for eksempel:

> Hej! Lad os starte.

Spilleder læser, hvor spillet står, og svarer. I sit første svar i hver chat giver spilleder dig **linket til dit dashboard** (noget i retning af `http://127.0.0.1:4750`). Åbn det i din browser og hav det ved siden af chatten hele spillet igennem. Hver kampagne beholder det samme link fra chat til chat, medmindre et andet program har taget det: så giver spilleder dig det nye.

Mellem spillederens beskeder viser din vært de værktøjer, spilleder bruger, i korte linjer. Åbn ikke deres detaljer (i Claude Code ctrl+o): de kan vise, hvad spilleder skriver, hemmeligheder inkluderet.

En ny kampagne går gennem tre trin, som et spil med en menneskelig spilleder. Dashboardet viser dem øverst som *1 Indstillinger · 2 Session nul · 3 Spil*:

1. **Indstillinger**: du vælger, hvordan du vil spille. Uden for historien.
2. **Session nul**: du laver din karakter, i spil.
3. **Spil**: historien.

### 2.6 Indstillinger: vælg, hvordan du spiller

Spilleder spørger kun om det, der stadig mangler, nogle få spørgsmål ad gangen. Hvis du skriver "du bestemmer", vælger spilleder og fortæller dig, hvad der blev valgt. Når dashboardet er åbent, viser dets første trin, **Indstillinger**, de samme spørgsmål som kort: ét spørgsmål ad gangen, hver værdi med sin betydning, og den sædvanlige er markeret **Foreslået**. Vælg dér, så spørger spilleder ikke igen i chatten; **Spring over** gemmer et spørgsmål til senere. Chatten klarer det, kun ord kan klare: præmissen for en ny verden, sproget og billederne, som spilleder kun spørger om, hvis din computer kan lave dem. Derfor stiller siden færre spørgsmål, end tabellen nedenfor viser.

Du behøver ikke studere tabellen: den er her, så du kan slå op. Du kan ændre hvert af disse valg senere, i chatten eller i dashboardets **Indstillinger**. En ændring gælder fra spillerens næste svar.

| Indstilling | Hvad den bestemmer | Værdier | Foreslået |
|---|---|---|---|
| **Mentor** (spurgt som "Hvor godt kender du dette spil?") | Hvor meget spilleder lærer dig reglerne, uden for historien | **fra** (kun historien; spørg i klammer, når du vil), **hints** (et kort tip før valg, der betyder noget, og når en regel slipper forbi), **tutorial** (hver regel forklaret første gang, hele regnestykket for hvert slag, en kort gennemgang efter kampe) | ud fra dit svar: aldrig spillet → tutorial, lidt → hints, jeg kender det → fra |
| **Sværhedsgrad** | Hvor hård verden er at spille i: kampe, fjendernes taktik, spor, skatte, hvor hurtigt trusler rykker | story, easy, normal, hard, brutal | |
| **Dødelighed** | Hvad det betyder at falde i en kamp | **narrative** (din karakter dør aldrig), **epic** (dør kun, når det betyder noget for historien), **dice** (terningerne afgør) | følger sværhedsgraden: story → narrative, easy → epic, normal og op → dice |
| **Gemte spil** | Hvornår du må gå tilbage | **permadeath** (aldrig; kun starte kampagnen forfra), **checkpoint** (tilbage til sidste scenes afslutning, kun hvis din karakter dør), **free** (tilbage til et hvilket som helst gemt spil, og gem når som helst, du beder om det) | checkpoint |
| **Strenghed** | Hvor nøje mad, lys, træthed, bæreevne, besværgelseskomponenter og rejser følger reglerne | **smooth** (spilleder springer let over dem), **rules** (som skrevet: fakler brænder ud, rationer slipper op), **simulation** (ud over reglerne: slid, fordærv, vejr) | smooth |
| **Terninger** | Hvem der slår din karakters terninger | **digital** (RPG Engine slår dem, på siden), **physical** (du slår selv og siger, hvad de viste) | |
| **Enheder** | Afstande og vægt i historien | metric, imperial | |
| **Følgesvende** | Hvem der rejser med dig | ingen, lavet med dig i session nul, lavet af spilleder, mødt i spillet | |
| **Billeder** | Billeder af steder og missioner, og din karakters portræt, når du beder om det | ingen, på forespørgsel, nye steder og missioner | spurgt én gang, kun hvis din computer kan lave dem |
| **Linjer** | Det, der aldrig optræder i spillet | en liste eller ingen | |
| **Slør** | Det, der gerne må ske, men kun uden for scenen | en liste eller ingen | |
| **Sprog** | Spillets og dashboardets sprog | vilkårligt | taget ud fra, hvordan du skriver, og bekræftet |

Spilsystemet kan tilføje sine egne indstillinger. Femte udgave tilføjer **advancement**: hvordan din karakter stiger i niveau, med **erfaringspoint** eller ved historiens **milepæle**.

**Hvad sværhedsgraden betyder i spillet.** Story: svage, naive fjender, åbenlyse spor, rigeligt af alt; spilleder kan gøre sine egne slag mildere. Easy: enkle fjender, gavmilde ressourcer. Normal: fornuftige fjender, tre spor til hver konklusion, almindelige priser og skatte. Hard: kloge fjender, subtile spor, knappe ressourcer, trusler der rykker hurtigt. Brutal: fjender, der lægger baghold, trækker sig tilbage og gør det af med de faldne, meget knappe ressourcer, de hårdeste hvil. Kampe er altid afpasset efter din gruppe, som den er nu.

**Uden en skrevet verden** spørger opsætningen om to ting mere:

- **Præmis**: genren, tonen og nogle få elementer af verden, med dine egne ord. For eksempel: *"Low fantasy, dyster men med håb. En flodby, et hjemsøgt vadested, en kult i bjergene."*
- **Opsætning**: **løbende** (spilleder bygger hver del af verden lige før, du får brug for den; foreslået) eller **alt fra start**.

Spilleder foreslår derefter et navn til kampagnen. Når intet mangler, og du siger, at du er klar, går spillet videre til session nul.

### 2.7 Session nul: din karakter

Session nul er spil: du laver din karakter sammen med spilleder, som du ville gøre ved et bord.

- **Alle valg er dine**, medmindre du beder spilleder om at tage dem. Du kan komme med en fuld idé ("en halvalvisk præst, der forlod sit tempel"), en vag ("en, der heler, men ikke på den rare måde") eller ingenting ("overrask mig, så lad mig ændre ting").
- **Egenskabsværdier.** Spilleder fortæller dig metoden og sikkerhedsnettet, før der slås en eneste terning. I femte udgave: standardrækken, point buy eller 4d6, hvor den laveste droppes. Den metode, I bliver enige om, forbliver i bordets aftaler.
- **Din historie** er aldrig et krav. Hvis du giver en, skriver spilleder den med dine ord, læser den op for dig én gang og væver dens folk og steder ind i verden. Du kan også skrive den på dashboardet (se [Gruppe](#party)).
- **Personlighed** (femte udgave): et personlighedstræk, et ideal, et bånd og en fejl, fra din baggrunds tabeller eller dine egne.
- **Et billede.** Når din karakter er lavet, beder spilleder dig om et billede af karakteren: en fil på din computer eller et portræt lavet på din computer ud fra din beskrivelse (se [din karakters billede](#37-your-characters-story-and-picture)).

Karakterarkets tal bliver regnet ud af RPG Engine ud fra dine valg: du laver aldrig regnestykkerne. Når karaktererne er lavet, og du bekræfter, begynder historien.

---

## 3. Spil <!-- icon: chat -->

### 3.1 Tal med spilleder

Skriv, hvad din karakter gør eller siger, med dine egne ord. Kort er fint.

> Jeg spørger værten, hvem der ellers kom forbi i nat.
>
> "Vi er ikke ude efter ballade," siger jeg og holder hånden væk fra sværdet.
>
> Jeg klatrer op på taget og venter.

**Uden for historien** skriver du i kantede klammer:

> [Hvordan virker det at gribe fat i en modstander?]
>
> [Kan jeg stadig bruge min reaktion i denne runde?]
>
> [Lad os stoppe her for i aften.]

Spilleder svarer også i klammer og går så tilbage til historien.

**Du siger, hvad du prøver; spilleder siger, hvad der sker.** Noget, der bryder verdens logik eller de fakta, der allerede er fastlagt, sker ikke: spilleder fortæller dig det inde i historien og tilbyder det, der er muligt.

**Spilleder bestemmer aldrig for din karakter.** Spilleder lader ikke din karakter tale, føle eller vælge. Er der tvivl, spørger spilleder.

**Spilleder taler aldrig om motoren.** Spørg, om spilleder holder styr på tingene, og svaret kommer som fra en spilleder: "Jeg har det hele: vi tager op herfra næste gang."

**Du kan spørge spilleder, hvordan dashboardet bruges.** Spilleder kender siden: "Hvor ser jeg mine besværgelser?", "Hvordan slår jeg manuelt?"

### 3.2 Slag

**Hvornår et slag sker.** Spilleder beder kun om et slag, når udfaldet er usikkert og betyder noget. Ellers siger spilleder ja eller "ja, men". Før dit slag fortæller spilleder, hvad der står på spil, og hvilke prøver der passer, og stopper så. Du slår eller ombestemmer dig:

> **Spilleder:** Afsatsen er smal og våd. Glider du, er det et langt fald ned i floden. En Dexterity (Acrobatics)-prøve, eller du kan gå tilbage og lede efter trappen.
>
> **Du:** Jeg prøver det.

**Slå på dashboardet.** Når spilleder beder om det, dukker et banner op øverst på siden med en knap til hver prøve, for eksempel *Acrobatics +4 · med fordel*. Klik på den: terningerne falder på siden, og spilleder hører resultatet. Du kan også:

- klikke på den tilsvarende linje på dit karakterark, som lyser guld;
- kaste de rigtige terninger fra terningbakken;
- skrive dine egne ord i banneret i stedet, hvis du vil gøre noget andet.

**Slå manuelt.** Hvis du hellere selv vil vælge terningerne, så slå **Manuelt** til i bannerets hjørne (eller i **Indstillinger**). Prøvens knap forsvinder, og banneret siger, hvad du skal slå, som en spilleder ville gøre: *Slå Acrobatics selv, på dit karakterark eller med terningerne.* Klik på den linje på dit karakterark, der lyser, eller kast de rigtige terninger fra terningbakken: RPG Engine slår dem, lægger dit bonus til, og spilleder hører resultatet. En prøve, som hverken dit karakterark eller terningbakken kan lave, som skade der slår 1'erne om, beholder sin knap. Manuelt forbliver slået til i denne browser, indtil du slår det fra.

**Fysiske terninger hele spillet.** Når indstillingen **Terninger** står på physical, beder spilleder om dine slag med ord, og du skriver de øjne, du slog:

> [Jeg slog 14.]

RPG Engine lægger dine modifikatorer til og afviser et tal, dine terninger ikke kan vise.

**Frie slag.** Klik på et hvilket som helst tal på dit karakterark, eller åbn terningbakken, for at slå for sjov. Frie slag tæller aldrig, bliver aldrig noteret, og spilleder ser dem aldrig. Et frit 20 bliver aldrig et rigtigt senere.

**Spillederens slag.** Spilleder slår også for fjender og andre med RPG Engine. De fleste slag vises i din slagkolonne. Når du ikke må se et resultat, slår spilleder i hemmelighed. Du kan altid spørge:

> [Var det slag ægte?]

For et vist slag giver spilleder tallene og begrundelsen. For et hemmeligt slag et fingeraftryk, der beviser, at slaget blev slået, før du spurgte.

**Slag i chatten** står i klammer, lige efter det øjeblik, de afgør: *[Persuasion 14 + 3 = 17]*. Derefter fortæller historien udfaldet.

### 3.3 Scener og kampe

Spilleder fører historien i **scener**: en kamp, en samtale, udforskning, rejse, et hvil, en udfordring (en jagt, et løb, en gåde). Dem skal du ikke styre: de er den måde, RPG Engine holder styr på historiens kapitler. Ved slutningen af hver scene gemmer spillet selv, og scenen kommer ind i din dagbogs historie.

**I en kamp** fortæller spilleder alle de ture, der ikke er dine, den ene efter den anden, med hvert slag, og **stopper, hvor du kan beslutte**: din tur, en reaktion, et valg. På din tur siger du, hvad du gør:

> Jeg kaster Sacred Flame på den ved døren.

Dashboardets **Kamp**-afsnit viser turrækkefølgen, hvis tur det er, din gruppes hitpoints og hvor såret fjenderne ser ud (uskadt, såret, blodig, nede: med ord, aldrig med tal). Falder din karakter, vises dødsslagene stort på siden.

**Når kampen allerede er afgjort,** kan spilleder tilbyde at fortælle resten i én besked.

### 3.4 Tid, rejser og den verden, der bevæger sig

**Tid.** Hver handling tager tid i historien, og RPG Engine holder datoen: dag 3, tidlig morgen. Spilleder fortæller tiden, som verden måler den: daggry, tredje klokkeslag, nattefald. Mellem sessioner går der ingen tid: du fortsætter, hvor du stoppede.

**Hvil.** Sig, at du hviler, og spilleder anvender det, et hvil giver tilbage, såsom hitpoints og besværgelsespladser:

> Vi slår lejr og tager et langt hvil.

**Rejser.** Sig, hvor du vil hen:

> Vi tager vejen nordpå mod Rocca.

RPG Engine regner vejen, afstanden og dagene ud i dit tempo og flytter dig derhen. En rejse stopper, når noget planlagt sker undervejs, ved slutningen af hver dags rejse og ved ankomsten. Du kan spørge, hvor langt et sted er, før du tager af sted:

> [Hvor langt er der til Rocca, og hvor lang tid tager det til fods?]

**Verden bevæger sig uden dig.** Skurke har planer med frister og ure. Hver ny dag flytter spilleder de trusler, som tiden har rykket frem, og du ser tegnene: et rygte, et spor, en forandring i byen. Du ser aldrig selve uret, kun det, det efterlader.

**Penge** tælles i spillets mønter. Betal, sælg, få betaling: RPG Engine veksler.

### 3.5 Kort

**Verdenskortet** (dashboard: **Verden**) viser kun de steder, din karakter kender, med vejene imellem dem, den sti, du har gået, og tågen over alt andet. Klik på et sted for at se, hvad du ved om det, og hvor langt der er.

**Et steds kort** (dashboard: **Scene**, og **Kamp** i en kamp) dukker op, når spilleder tegner et for det sted, hvor du er: vægge, døre, terrænet og hvem der står hvor, som brikker. I en kamp er de felter, du ikke kan nå, dækket til på din tur, så du ved et blik kan se, hvor du kan gå hen. Når spilleder spørger, hvor din karakter flytter hen, åbner siden kortet, og du rører ved et felt eller skriver det, for eksempel *E4*.

### 3.6 Missioner, dagbog og noter

**Missioner.** Når din karakter tager en opgave på sig, bliver den til en mission i din **Dagbog**: hvem der gav den, hvor, inden hvornår, dens mål som en liste og hvad den måler (en frist med tiden tilbage, et ur, et tal). Markér en med dens stjerne for at følge den: den står lille øverst i Scene med sit næste mål. Missionen slutter, når historien afslutter den, aldrig af sig selv.

**Historien.** Dagbogens fane Historie er din kampagne som en tidslinje: hver scene et kapitel med sted, dato og et kort resumé, den seneste først.

**Dine noter.** I dagbogens fane Noter skriver du dine egne noter: teorier, navne, planer. De bliver på din computer, og spilleder læser dem ikke, medmindre du **Del**er en. En delt note når spilleder ved dennes næste svar som det, du tror, aldrig som et faktum. Din teori bliver ikke sand, fordi du skrev den. En note, der beder om at stoppe eller undgå noget indhold, tæller, som om du havde sagt det ved bordet.

### 3.7 Din karakters historie og billede

På din karakters karakterark har kortet **Beskrivelse** en boks, hvor du kan skrive din karakters historie. Send den, så skriver spilleder den ind i karakteren med sine egne ord, efter du har sagt ja.

Til din karakters billede giver du spilleder en billedfil i chatten sammen med, hvor den ligger på din computer (PNG, JPEG, WebP eller SVG, op til 5 MB):

> [Her er min karakters portræt: C:\Users\me\Pictures\mira.png]

Spilleder kopierer den ind i kampagnen, og den vises på din karakters brik på dashboardet. Du kan ændre den på samme måde, når du vil.

Eller få portrættet lavet, hvis din computer kan lave billeder (se [Billeder](#311-pictures)): beskriv din karakter for spilleder, eller lad spilleder beskrive karakteren.

> [Lav et portræt til mig: gråt hår i en fletning, et ar på hagen, trætte øjne.]

Portrættet viser præcis, hvad din karakter er i spillet, folket som denne verden har det, en bjergdværg som en bjergdværg, med det udseende, du beskrev. Det kommer på omkring et minut, på din karakters brik. Dine følgesvende kan få deres på samme måde.

### 3.8 Gemte spil og at gå tilbage

RPG Engine gemmer hele kampagnen **ved slutningen af hver scene**, af sig selv. Hvad du kan gøre med de gemte spil, afhænger af indstillingen **Gemte spil**:

| Gemte spil | Gem, når du vil | Gå tilbage |
|---|---|---|
| **permadeath** | nej | aldrig; du kan kun starte kampagnen forfra |
| **checkpoint** | nej | til det seneste gemte spil, kun når din karakter dør |
| **free** | ja | til et hvilket som helst gemt spil, når du vil |

I alle tilstande kan du **starte forfra**: fra spillets start med den samme karakter, eller fra session nul med en ny.

Du kan gøre alt dette i chatten ("[Lad os gå tilbage til før duellen.]") eller i dashboardets afsnit **Gemte spil**.

**Når du er gået tilbage, så åbn en ny chat.** Den chat, du spillede i, husker det, der blev fortrudt. Åbn en ny chat med spilleder (`/clear` i Claude Code, `/new` i Codex), skriv *fortsæt*, og tryk derefter på **Jeg har åbnet en ny chat** i Gemte spil, eller fortæl det til spilleder i den nye chat. Genoptag aldrig den gamle chat. Indtil du bekræfter, går spilleder ikke videre.

### 3.9 Sessioner: at stoppe og vende tilbage

**Du afslutter sessionen,** når du vil:

> [Lad os stoppe her for i aften.]

Der er ingen "gem og afslut": alt ligger allerede i filerne.

**For at lukke** chatten skriver du `/exit` i Claude Code eller `/quit` i Codex. Dashboardet bliver stille indtil næste chat.

**For at vende tilbage** åbner du en terminal i kampagnemappen (den, `init` skrev ud), starter din vært dér og skriver *fortsæt*. Spilleder læser, hvor spillet står, giver dig et kort resumé og begynder med, at der sker noget. En ny chat mister intet: kampagnen lever i sine filer, ikke i chatten.

Spilleder stiller ingen rutinespørgsmål til sidst. Kun hvis spilleder har lagt mærke til, at noget ikke virkede, spørger spilleder kort.

### 3.10 Spillederens humør

Øverst på dashboardet sidder spillederens avatar, en lille robot. Dens ansigt følger historiens tone: bekymret når faren vokser, henrykt over en dristig idé, overrasket over en vending. Den reagerer et øjeblik på en naturlig 20 eller en naturlig 1. Den viser aldrig det, du endnu ikke ved: intet grin, før fælden er udløst. Din gruppes brikker viser også deres humør. Når chatten er lukket, sover robotten.

### 3.11 Billeder

RPG Engine kan få lavet et billede til hvert sted, du når, og hver mission, du tager, som indstillingen **Billeder** siger, og din karakters portræt, når du beder om det. Den bruger det, der allerede er på din computer:

- **Codex**, med dit ChatGPT-login: et malet billede.
- Ellers **Claude Code**, med dit Claude-login: en tegning.

Billedet bruger dit eget abonnement, ikke vores. Afsnittet **Indstillinger** fortæller dig, om der kan laves billeder på din computer, og hvis ikke, hvordan du sætter det op. Uden billeder viser siden i stedet mærket for hver slags sted. Du kan også give spilleder et billede af dit eget til et hvilket som helst sted eller en hvilken som helst karakter.

### 3.12 Sikkerhed: linjer, slør og stop

- **Linjer**: det, der aldrig optræder i spillet.
- **Slør**: det, der gerne må ske, men kun uden for scenen.
- **Stop**: du kan til enhver tid stoppe et indhold uden at forklare. Skriv det uden for historien:

> [stop]

Spilleder dropper det med det samme og føjer det til dine linjer, for alle kommende sessioner. Du kan se og ændre dine linjer og slør i **Indstillinger**.

### 3.13 Ombestem dig

Alle indstillinger kan ændres under kampagnen: i chatten ("[Lad os gøre det sværere.]") eller i **Indstillinger**. Spilleder hører om en ændring ved sit næste svar. En afgørelse, som spilleder traf uden bogen, bliver til en **præcedens** og bliver gemt, så det samme spørgsmål får det samme svar næste gang.

---

## 4. Dashboardet, sektion for sektion <!-- icon: party -->

Dashboardet er en side på din egen computer. Spillederen giver dig dens link i starten af hver chat. Siden følger spillet live: Når spillederen ændrer noget, ændrer siden sig også.

Kun browseren på den computer, hvor du spiller, kan åbne den: ikke en telefon eller tablet, selv på samme wifi. Siden passer også i et smalt vindue: Så flytter sektionerne til en bjælke nederst, og ikonerne til en menu.

Siden lever, så længe chatten lever. Lukker du chatten, viser en side, der er blevet åben, *Not connected* med karakterarket, som det var, og spillederens robot falder i søvn; åbn en chat i kampagnen igen, og når spillederen har svaret, kommer siden tilbage af sig selv.

### Øverst

- **Spillederens avatar** med dens humør.
- Kampagnens navn, spilsystemet, **spiltiden** og om spillet er **forbundet** (chatten er tilsluttet).
- Sektionerne: **Gruppe**, **Scene**, **Kamp** (kun under en kamp), **Dagbog**, **Verden**; for enden af rækken, som ikoner: **Gemte spil**, **Hjælp**, **Indstillinger**, **Om**.
- Det lyse og mørke tema, i øverste højre hjørne.

Når spillederen spørger dig om noget, bliver dens banner stående øverst på siden, uanset hvilken sektion du er i.

### Gruppe

Dit karakterark og dine følgesvendes. Hver del af karakterarket er et kort, du kan åbne og lukke.

- **Klik på et tal** for at slå med det for sjov. Peg på et tal for at se, hvordan det er sammensat ("+5: Visdom +3, færdighedsbonus +2").
- **Hitpoints, pladser og brug** vises som bjælker og prikker.
- **Tilstande og effekter** vises med, hvor længe de varer.
- **Beskrivelse** rummer din karakters tekst og boksen til at sende spillederen din karakters historie.
- Ved 0 hitpoints vises **dødsslagene** stort under navnet.
- Ved siden af karakterarket (under det på en smal skærm): **slagene**, de nyeste først, dine og spillederens, som du må se. **Ryd** tømmer listen; **Gendan** henter den tilbage. Frie slag vises stiplede og dæmpede.

En følgesvend med et værdiblad, såsom en ulv, viser sit værdiblad i stedet for et fuldt karakterark.

### Scene

Der, hvor din gruppe er: stedets billede og navn, stederne omkring det, stedets kort, når det har et, hvem der er der, og den åbne scene med det, der sker nu. Den mission, du følger, står øverst.

### Kamp

Kun under en kamp. Øverst: runden, hvem der handler, hvem der er næste. Nedenfor: rækkefølgen af turene, hver kæmper med sin tilstand, din gruppe i tal og fjenderne i ord; det, din karakter har ved hånden (rustningsklasse, hitpoints, angreb); stedets kort, hvor den, der handler, er ringet ind. På din tur pulserer linket Kamp guldfarvet, uanset hvor du er.

### Dagbog

Tre faner:

- **Missioner**: aktive, gennemførte og mislykkede, hver som et kort med sine mål, sin tidsfrist som en nedtælling og sine ure. Stjernen følger en mission.
- **Historie**: kampagnens kapitler, scene for scene, det seneste først.
- **Noter**: dine egne noter, private, indtil du deler en.

### Verden

Verdenskortet, som din karakter kender det, med tågen over resten. Træk for at flytte, brug hjulet eller knib for at zoome. Klik på et sted for dets kort. En liste over stederne, de nærmeste først, står ved siden af. Med mere end ét kort (en by, et kontinent, et andet plan) skifter faner mellem dem.

### Terningbakken

Terningknappen åbner bakken: Vælg terninger og en modifikator, og kast. Med to eller flere terninger af samme slags vælger du, hvilke der tæller: **Alle**, **Højeste** (kun den højeste) eller **Laveste** (kun den laveste). De terninger, du har valgt, bliver stående, indtil du trykker på **Ryd**, så det samme skadeslag er ét klik hver runde. Mens spillederen beder om et slag, fortæller bakken dig, hvilke terninger der svarer på det.

### Gemte spil

Dine gemte spil, de nyeste først, hver med sit sted, spildatoen og hvornår det blev lavet. **Gem nu** (med frie gemte spil), **Gå tilbage hertil** og **Start forfra**, i rødt, i to trin. Se [Gemte spil og at gå tilbage](#38-saves-and-going-back).

### Indstillinger

Dine indstillinger, i grupper: spillet, at lære spillet (mentoren og de regler, der allerede er forklaret for dig), terninger og mål, grænser (linjer og slør), billeder, sprog. Klik på en værdi for at vælge den; under den står, hvad den betyder. Derefter sidens egne præferencer, som kun gemmes i denne browser: temaet, terningernes lyd, **terningsættet** (harpiks, metal, træ, sten), afrundede eller skarpe kanter, manuelle slag.

Spillederens egne indstillinger, såsom husregler og præcedenser, er ikke her: De bliver i chatten.

### Hjælp og Om

**Hjælp**: denne guide. **Om**: hvad RPG Engine er, dets links, dets licenser og spilsystemets krediteringer.

### Før spillet: Indstillinger og session nul

Mens en ny kampagne er i sit første trin, **Indstillinger**, stiller hele siden sine spørgsmål: ét ad gangen, hver med hvad dens værdier betyder og den foreslåede. **Du bestemmer** overlader et spørgsmål til spillederen, undtagen linjer og slør, som altid er dine; **Spring over** gemmer det til senere. Til sidst: **Jeg er klar**.

### Beskeder fra siden

Nogle gange viser siden en meddelelse over sig selv: et problem i kampagnens filer (spillederen ordner det), spillet er væk (chatten er lukket), siden bliver oversat.

---

## 5. Spilsystemer og husregler <!-- icon: dice -->

### 5.1 Hvad et spilsystem er

Et spilsystem er data for ét spil: dets karakterark, dets tal, dets væsner, genstande, besværgelser og regeltekst. Hver kampagne spiller ét system.

RPG Engine regner dit karakterark ud og hvad der bruges og kommer tilbage, såsom hitpoints og besværgelsespladser, som et digitalt karakterark gør. Hvordan en egenskab eller en besværgelse virker, læser spillederen i reglerne og afgør, som ved et bord.

### 5.2 Femte udgave, inkluderet

RPG Engine leveres med **5e**, fra System Reference Document 5.1 (reglerne fra 2014, gratis under Creative Commons). Det omfatter:

- racerne, klasserne, underklasserne, en baggrund og en egenskab fra SRD'en;
- de 319 besværgelser, våben, rustninger og udstyr, magiske genstande og monstre fra SRD'en;
- regelkapitlerne, som spillederen slår op efter deres nøjagtige tekst;
- det fulde karakterark, udregnet: egenskabsmodifikatorer, redningskast, færdigheder, rustningsklasse, angreb, besværgelsernes sværhedsgrad, pladser, hitterninger, egenskaber efter niveau, erfaring og niveaustigning;
- hvil, der giver tilbage, hvad de skal; tilstande med deres regeltekst; påmindelser om koncentration.

**Indhold ud over SRD'en.** Du kan spille femte udgave med indhold, som SRD'en mangler, såsom en klasse eller et monster fra en bog, du ejer. Spillederen kender spillet, kan læse dine bøger og kan søge på nettet. Den skriver det, den har brug for, som sider i din kampagne, og RPG Engine arbejder på samme måde med dem. Det, vi leverer, er begrænset af sin licens; det, din spilleder ved, er ikke.

RPG Engine er kompatibelt med femte udgave.

### 5.3 Husregler og dine egne tilføjelser

Du behøver ikke røre ved nogen fil. Spørg spillederen:

> [Husregel: Et naturligt 1 på et angreb betyder, at du taber dit våben.]
>
> [Jeg vil gerne spille en Blood Hunter. Jeg har bogen: Her er klassens egenskaber.]
>
> [I denne kampagne tager et kort hvil 10 minutter.]

Spillederen noterer dem i din kampagne på en af disse måder:

- **En aftale ved bordet**, i ord, såsom det tabte våben eller det korte hvil ovenfor. Spillederen gemmer den sammen med kampagnens indstillinger og spiller efter den fra da af. En afgørelse, spillederen træffer uden bogen, gemmes på samme måde, som en **præcedens**.
- **En ny side**, såsom en klasse, en race eller en genstand. En ny klasse virker som systemets: Dit niveau, dine hitterninger og dine egenskaber tæller den med. En ny race kan bygge på en eksisterende ("som elveren, plus…"); et navngivet sværd kan bygge på langsværdet.
- **Nye tal til karakterarket**: et felt, en tabel, en formel, en tæller som et hvil giver tilbage. For eksempel en Battle Masters overlegenhedsterninger, der kommer tilbage efter et kort hvil. En husregel kan også erstatte en af systemets formler.

Hvis du allerede har husregler skrevet ned, kan du også lægge dem som tekstfiler i kampagnens mappe `rules` (se [kampagnemappen](#8-for-the-curious-the-campaign-folder)): Spillederen læser dem før bogens regel med samme navn.

### 5.4 Tilføj eller importér dit eget spilsystem

I dag spiller RPG Engine kun femte udgave. Andre spilsystemer kommer, og det gør en måde at tilføje dit eget på eller at gøre et spil, du ejer, til et system ud fra dets bøger. Se [Kommer senere](#9-coming-later).

---

## 6. Udvidelser <!-- icon: plus -->

**Udvidelser er ikke tilgængelige endnu.** En udvidelse vil tilføje noget til en kampagne oven på dens spilsystem: en verden, et eventyr, en funktion såsom vejret eller et tarotspil, husregler der kan deles. Du vil vælge, hvilke hver kampagne bruger. De første planlagte til femte udgave er vejr og dirkning af låse.

---

## 7. Hvor en kampagne kommer fra, og dens sprog <!-- icon: world -->

### 7.1 Tre måder at få en verden på

**Lavet løbende.** Du giver en præmis i opsætningen, og spillederen bygger verdenen, mens I spiller: hvert sted, hver person og hvert plot lige før, du har brug for dem, og gemt fra da af. Det er den hurtigste måde at spille på: installér, opret, og efter få minutter laver du din karakter. Intet, der er opfundet, går tabt: Når det er sagt, er det skrevet ned og forbliver sandt.

**Forberedt fra start.** Samme præmis, men med **opsætning: alt fra start** bygger spillederen verdenens steder, fraktioner, trusler og deres planer, før spillet begynder. Den første session starter senere, med mere klar bag kulisserne.

**Fra en eksisterende kampagne eller et eksisterende eventyr.** I dag er der ingen importknap. Giv spillederen dit eventyr (en tekst eller en PDF, din vært kan læse) og bed den sætte det op:

> [Jeg har dette eventyr som en PDF. Sæt det op som vores kampagne: Læs det, og skriv dets steder, karakterer og hemmeligheder. Fortæl mig ikke noget af det, der står i det.]

Spillederen læser det med din AI-værts værktøjer og skriver det som sider i kampagnen, hemmeligheder inklusive, som du opdager i spillet. Claude Code læser PDF'er; med Codex er en tekst- eller markdown-fil det sikreste valg. Gør det under opsætningen, før session nul.

Mens spillederen arbejder, så åbn ikke detaljerne i det, den læser eller skriver (i Claude Code ctrl+o): De viser eventyrets tekst, hemmeligheder og det hele. Spillederen selv holder hemmelighederne, som altid.

Så snart kampagnen har sine egne sider, holder opsætningen op med at spørge om en præmis og en opsætning. Selv i en skrevet kampagne, når I kommer et sted hen, som teksten ikke dækker, skaber spillederen det, der er brug for, og noterer det.

**En kampagne spilles én gang.** For at spille det samme eventyr igen skal du oprette en ny kampagne. Inden for en kampagne kan du stadig gå tilbage til et gemt spil eller starte forfra, som indstillingen Gemte spil tillader.

### 7.2 Sprog

**Ét sprog pr. kampagne**: spillederens. Spillederen skriver på det, og dashboardet følger det. Spillederen henter det ud fra, hvordan du skriver, og bekræfter det.

**Dashboardet** leveres på engelsk og italiensk (omhyggeligt udarbejdet) og på 24 sprog mere: fransk, tysk, spansk, portugisisk (brasiliansk), hollandsk, svensk, norsk, dansk, finsk, islandsk, russisk, ukrainsk, polsk, tjekkisk, rumænsk, ungarsk, græsk, tyrkisk, arabisk, hebraisk, hindi, kinesisk, japansk, koreansk. Arabisk og hebraisk læses fra højre mod venstre: Siden spejles, mens kortene og terningerne forbliver, som de er tegnet.

**Ethvert andet sprog,** du vælger i Indstillinger, oversættes på din computer i baggrunden af Codex eller Claude Code med dit eget login, begyndende med den sektion, du har åben. Det gøres én gang pr. sprog, for alle dine kampagner. Indtil det er klar, er siden på engelsk. Indstillinger fortæller dig, om oversættelsen er i gang, klar eller ikke mulig på din computer.

**Spillets ord.** Femte udgave har sine egne termer på italiensk fra den officielle italienske SRD, så italienske spillere læser *Classe Armatura*, *tiro salvezza*, *vantaggio*. Andre sprog får systemets termer oversat.

**Spilsystemets egen tekst** (besværgelserne, monstrene, regelkapitlerne) forbliver på engelsk. Spillederen læser den og fortæller dig den på dit sprog.

**Hvis du skifter sprog midt i en kampagne,** bliver de sider, der allerede er skrevet, som de er; spillederen skriver nye på det nye sprog.

---

## 8. For de nysgerrige: kampagnemappen <!-- icon: list -->

Du behøver aldrig åbne den. Hvis du gør, så vid, at **den rummer din kampagnes hemmeligheder**: At læse den ødelægger spillet.

En kampagnemappe rummer:

- `campaign.yaml`: dine indstillinger;
- `state.yaml`: hvor spillet står nu: dets trin, datoen, den åbne scene;
- `world/`: én side pr. karakter, sted, fraktion, mission, genstand, begivenhed, emne eller væsen, som markdown-filer;
- `rules/`: dine husregler som tekstfiler, hvis du tilføjer nogen (`init` laver den ikke);
- `images/`: billederne, når der er nogen;
- `log.jsonl`: hver ændring, i rækkefølge;
- `.saves/`: de gemte spil, fra det første og frem;
- `.player/`: dine egne noter fra Dagbogen, som spillederen ikke læser;
- `sessions/`: holdes af RPG Engine;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: de små filer, der fortæller AI-værter, hvor RPG Engine er, og holder deres hukommelse slået fra. RPG Engine holder dem ajour; lad dem være, som de er.

Siderne er almindelig markdown med links som `[[Rocca]]`, Obsidians format: Spillederens notesbog kan åbnes dér. **Hvis du ændrer en side i hånden,** hører spillederen om det, der er ændret, ved sit næste svar.

**Kommandolinjen.** Alt, spillederen gør, går gennem kommandoer, som du også kan køre i kampagnemappen. Du har aldrig brug for dem for at spille, og mange udskriver kampagnens hemmeligheder, som `rpg status` og `rpg show` gør. `rpg --help` viser dem alle, og `rpg roll --help` forklarer en enkelt. En kommando, der ændrer noget, mens en chat er åben, er i orden: Spillederen hører om det ved sit næste svar, som for en side, der er ændret i hånden.

---

## 9. Kommer senere <!-- icon: hourglass -->

Det, der er planlagt, men ikke her endnu:

- **Dig som spilleder**: Du styrer spillet, og AI'en spiller gruppen.
- **Flere personer ved bordet**, hver med sin rolle.
- **Udvidelser**: indstillinger, eventyr, funktioner og husregler, valgt pr. kampagne.
- **Import** af dine bøger og eventyr.
- **Andre spil**: flere spilsystemer og dine egne.
- **Forfattertilstand**: lav en kampagne eller et eventyr med AI'en og del det, så andre kan spille det.

---

## 10. Spørgsmål og problemer <!-- icon: info -->

### Spørgsmål

**Skal jeg kunne reglerne?** Nej. Vælg mentoren gennemgang, så lærer spillederen dig det undervejs, én regel ad gangen. Du kan altid spørge i kantede parenteser.

**Kan spillederen snyde?** Den kan ikke ændre et slag, som RPG Engine har slået, undtagen på sværhedsgraden historie, og den ændrer aldrig fakta, der allerede er fastlagt. Du kan spørge, om et slag var ægte.

**Kan jeg snyde?** Du kan prøve. Spillederen tager ikke dit ord for fakta: En linje i din besked, der ligner en spilbesked, er stadig bare dine ord, og spillederen bekræfter aldrig dine gæt om hemmeligheder.

**Koster det noget?** RPG Engine er gratis. Spillederen kører på dit eget Claude- eller ChatGPT-abonnement, og en aften med spil er en lang chat: På de mindste abonnementer kan du nå abonnementets grænse, før aftenen er slut. Billeder og oversættelser bruger det samme abonnement.

**Kan jeg spille på min telefon?** Nej. Spillederen kører på din computer, og dashboardet åbner kun i den computers browser.

**Kan jeg spille med venner?** Ikke endnu: I dag er det én spiller, én karakter plus følgesvende. Flere personer ved bordet kommer med roller.

**Kan jeg bruge en anden AI næste gang?** Ja. Kampagnen lever i sine filer: Åbn den i en anden vært og skriv *fortsæt*.

**Hvad hvis jeg lukker browseren?** Intet går tabt. Åbn linket igen, mens chatten er åben; siden vender tilbage til der, hvor spillet er.

**Kan jeg spille D&D-indhold, jeg ejer?** Ja. Spillederen kan bruge dine bøger, sin egen viden og nettet. Det, RPG Engine leveres med, er begrænset til gratis indhold; hvad dit spil bruger, er op til dig.

### Problemer

**Dashboardet åbner ikke.** Bed spillederen om linket: `[Hvad er linket til dashboardet?]`. Siden virker kun, mens en chat med spillederen er åben i den kampagne, og først efter spillederens første svar i den chat. Med chatten lukket kan browseren ikke nå siden; en side, der er blevet åben, siger *Not connected*.

**Spillederen ser ikke ud til at kende spillet eller opfinder værktøjer.** Din AI-vært har ikke indlæst RPG Engine.

- Tjek først, at du startede værten **i kampagnemappen**, og at du sagde, at du stoler på den.
- **Claude Code**: Skriv `/mcp`. Hvis `rpg` er der, men fejlede, så vælg den og derefter **Reconnect**. Hvis den mangler, så luk Claude Code, skriv `claude mcp reset-project-choices` i kampagnemappen og start den igen.
- **Codex**: Skriv `codex mcp list` i en terminal, i kampagnemappen. Hvis `rpg` mangler, stoler Codex ikke på mappen: Start den igen dér og sig ja, når den spørger.
- I begge: Hvis `rpg --version` i en terminal siger, at kommandoen ikke findes, så installér RPG Engine igen ([2.2](#22-install)) og åbn en ny terminal.

**Efter en opdatering ændrede intet sig.** En spilleder, der kører, beholder den version, den startede med. Åbn en ny chat, eller forbind serveren igen i Claude Code (`/mcp`, derefter `rpg`, derefter **Reconnect**).

**Spillederen husker noget, jeg fortrød.** Du gik tilbage til et gemt spil, men blev ved med at spille i den samme chat. Åbn en ny chat og tryk på **Jeg har åbnet en ny chat** under Gemte spil.

**Spillederen stiller opsætningsspørgsmål, jeg allerede har besvaret på siden.** Sig det til den: `[Dem valgte jeg på dashboardet.]`

**Der dukker ingen billeder op.** Åbn Indstillinger > Billeder: Dér står, om denne computer kan lave dem, og trinene, hvis ikke, hver kommando med en knap til at kopiere den.

**Siden er på engelsk, men jeg valgte et andet sprog.** Den bliver oversat i baggrunden; Indstillinger fortæller, hvordan det går. Uden Codex eller Claude Code på denne computer forbliver den på engelsk.

**Spillederen siger, at kampagnen har problemer.** Den ordner dem selv. Hvis du har redigeret filer i hånden, kan den spørge dig, hvad du mente.

**Windows: `npm` fejler i min mappe.** Hav ikke kampagnen eller RPG Engine under en sti, der indeholder `&`.

**Installationen fejler, eller `rpg` vil ikke starte.** Tjek din Node.js-version med `node --version`: Den skal være 22 eller nyere. Hvis den er ældre, så installér LTS-versionen fra [nodejs.org](https://nodejs.org) og installér derefter RPG Engine igen.

**Dashboardets link ændrede sig.** Et andet program brugte kampagnens sædvanlige adresse, eller Windows havde reserveret den. RPG Engine tog en anden; spillederen giver dig det nye link. Intet andet ændrer sig.
