<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 b69f95b1 5738adad 781d8fc0 89c84229 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: den komplette guiden

**RPG Engine** lar deg spille et pen-and-paper-rollespill med en **KI som spilleder**.

Du snakker med spilleder i en **chat**: spilleder forteller historien, spiller alle andre og avgjør hva som skjer.

RPG Engine jobber i bakgrunnen: det **husker verden**, **kaster terningene** og **fører regnskapet**.

Ved siden av chatten har du en side åpen i nettleseren, **dashbordet**, med karakterarket, terningene, kartene og dagboken din.

Denne guiden er for spillere: du trenger ikke kunne programmere.

## Hurtigstart <!-- icon: send -->

1. Installer **Node.js** fra [nodejs.org](https://nodejs.org) (LTS-versjonen).
2. Installer **Claude Code** eller **Codex**, KI-appen spilleder kjører i, og logg inn ([2.4](#24-connect-your-ai)).
3. Åpne en terminal og installer RPG Engine: `npm install -g rpg-engine`.
4. Lag en kampanje i terminalen: `rpg init "The Salt Isles"`.
5. Åpne Claude Code eller Codex i den nye mappen og skriv *Hei! La oss begynne.* Spilleder svarer med lenken til dashbordet ditt. Åpne den ved siden av chatten.

Resten av guiden forklarer hvert steg, og deretter hvordan du spiller.

## 1. Hva RPG Engine er <!-- icon: about -->

### Hvem gjør hva

| Hvem | Hva de gjør |
|---|---|
| **Du** | Du spiller karakteren din. Du sier hva karakteren gjør, sier og prøver. |
| **Spilleder** (KI-en) | Forteller historien, spiller alle andre karakterer, avgjør hva som skjer og ber om kast. |
| **RPG Engine** | Husker alt i filer, kaster terningene, teller treffpoeng, penger, tid og avstander, og holder hemmeligheter skjult til du oppdager dem. |

En KI er flink til å fortelle historier og dårlig til å huske. Overlatt til seg selv glemmer den hvem som skylder deg penger, hvor mange piler du har, eller at broen brant ned for to sesjoner siden. RPG Engine holder styr på alt dette, så verden er den samme fra én kveld til den neste, selv i en ny chat, selv med en annen KI.

### Hvordan det føles

Du skriver i chatten, som om du snakket rundt et bord:

> Jeg dytter døra sakte opp og kikker inn.

Spilleder svarer med det du ser, og stopper når det er din tur til å velge. Når noe er usikkert og viktig, sier spilleder hva som står på spill og ber om et kast. Knappene for kastet vises på dashbordet. Du klikker, terningene faller på siden, og spilleder forteller hva som skjer.

### Hva som gjør det annerledes

- **Verden er varig.** Det som er sagt, forblir sant. En død skurk forblir død.
- **Terningene er ekte.** Spilleder kan ikke bøye dem (unntatt på letteste vanskelighetsgrad, hvis du velger den).
- **Hemmeligheter forblir hemmelige.** Spilleder forteller aldri hva karakteren din ikke vet, selv om du maser.
- **Verden beveger seg uten deg.** Trusler rykker fram mens du hviler eller reiser, og du ser tegnene.
- **Mange kvelder, én historie.** En kampanje er en mappe på datamaskinen din. Du kan stoppe når du vil og ta opp tråden senere.

### Spillet det spiller i dag

RPG Engine er laget for alle pen-and-paper-rollespill. I dag følger det med ett spillsystem: **femte utgave** (fra det frie System Reference Document 5.1). Flere spill kommer. Se [Spillsystemer](#5-game-systems-and-house-rules) og [Kommer senere](#9-coming-later).

---

## 2. Komme i gang <!-- icon: path -->

### 2.1 Hva du trenger

- En datamaskin med Windows, macOS eller Linux.
- **Node.js 22** eller nyere. Last den ned fra [nodejs.org](https://nodejs.org). «LTS»-versjonen er fin. Den kommer med `npm`, som installerer RPG Engine.
- En **terminal**, vinduet der du skriver kommandoer: på Windows Terminal-appen eller PowerShell, på macOS Terminal. Du bruker den til å installere RPG Engine, til å lage hver kampanje og til å starte Claude Code eller Codex.
- En **KI-vert**, appen spilleder kjører i: **Claude Code** eller **Codex**, med abonnement og innlogging. Se [2.4](#24-connect-your-ai).
- Den **største modellen** verten din tilbyr. En liten modell lar seg lure: i testene våre røpet den hemmeligheter til en spiller som påstod å være den ekte spilleder.
- En nettleser, til dashbordet.

Innloggingen du bruker for verten, gjør mer: RPG Engine bruker den, på din egen datamaskin, til å tegne bilder av steder og til å oversette dashbordet til språk det ikke leveres med. Se [Bilder](#311-pictures) og [Språk](#72-languages).

**Åpne en terminal i en mappe.** Mange steg sier «i kampanjemappen». På Windows høyreklikker du mappen i Filutforsker og velger **Åpne i Terminal**. På macOS høyreklikker du mappen i Finder og velger **Tjenester > Ny Terminal i mappen**. Eller skriv `cd` og mappens sti i en terminal som allerede er åpen, for eksempel `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Installer

Åpne en terminal og skriv:

```text
npm install -g rpg-engine
```

Da får du kommandoen `rpg`. For å sjekke at det virket:

```text
rpg --version
```

Du bruker `rpg` én gang per kampanje, for å lage den. Etter det snakker du bare med spilleder: KI-verten starter RPG Engine av seg selv, med den samme `rpg`-kommandoen.

### 2.3 Lag en kampanje

En kampanje er en mappe. Åpne en terminal i mappen der du har spillene dine, og skriv:

```text
rpg init "The Salt Isles"
```

Dette lager mappen `The Salt Isles` med en ny kampanje i, og forteller hva du skal gjøre videre:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

Linjene etter *For the master* er til spilleder, som leser dem i chatten. Du trenger ikke gjøre noe med dem. Husk hvor mappen ligger: du kommer tilbake til den hver gang du spiller. Uten mappenavn gjør `rpg init` mappen du står i om til kampanjen.

`init` lager alt kampanjen trenger: innstillingene, verdensmappene og de små filene som ber KI-verten bruke RPG Engine og ikke ha noe eget minne utenfor kampanjen.

Du trenger ikke velge noe nå. Spilleder spør om resten i chatten, eller du velger det på dashbordet. Hvis du allerede vet noen valg, kan du oppgi dem her:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Dette lager mappen `salt-isles` med kampanjen *The Salt Isles* i: et mappenavn uten mellomrom, og kampanjenavnet slik du vil ha det.

| Valg | Hva det setter | Verdier |
|---|---|---|
| `--name` | Kampanjens navn | hva som helst; mappens navn hvis du utelater det |
| `--language` | Spillets språk | en kode, for eksempel `en`, `it`, `fr` |
| `--system` | Spillsystemet | `5e`, i dag det eneste |
| `--difficulty` | Hvor hardt verden spiller | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Hva det betyr å falle i en kamp | `narrative`, `epic`, `dice` |

`rpg init --help` viser dem også. En kampanje kan ikke ligge inni mappen til en annen kampanje.

Du kan ikke be spilleder om å lage en kampanje: før `init` har mappen ingenting som forteller KI-verten hvor RPG Engine er.

### 2.4 Koble til KI-en din

RPG Engine fungerer med **Claude Code** og **Codex**. Andre KI-apper som bruker MCP-verktøy kan kanskje fungere, men det garanterer vi ikke.

**Installere verten.** Claude Code og Codex kjører i terminalen: de er ikke Claude- eller ChatGPT-appen på telefonen. Hver trenger sitt eget abonnement og sin egen innlogging: Claude Code et betalt Claude-abonnement, Codex en ChatGPT-innlogging. Følg deres egne sider for å installere dem og logge inn: [Claude Code](https://code.claude.com/docs/en/setup) og [Codex](https://learn.chatgpt.com/docs/codex/cli). Dette gjør du én gang, for alle kampanjene dine.

**Claude Code.** Åpne en terminal i kampanjemappen og skriv `claude`. Første gang spør den om du stoler på mappen, og sier at mappen tillater spillets verktøy (`mcp__rpg`): velg **Yes, I trust this folder**. Pass opp: svaret som er forhåndsvalgt, er *No, exit*, så hvis du trykker Enter med en gang, lukkes Claude Code. Det er alt: kampanjen har allerede bedt Claude Code bruke RPG Engine og verktøyene, og holde minnet sitt av.

**Codex.** Åpne en terminal i kampanjemappen og skriv `codex`. Når den spør om du stoler på mappen, svar ja: kampanjens egne innstillinger forteller Codex hvor RPG Engine er, tillater verktøyene og holder minnet av, og Codex leser dem bare i en mappe du stoler på. I skrivebordsappen: sjekk at minner er slått av for spillets chatter.

**Hvorfor minnet er viktig.** Kampanjen lever i filene sine. Hvis verten også husker ting på egen hånd, ville det ikke være en ekte tilbakegang å gå tilbake til et lagret spill: spilleder ville fortsatt huske det som er angret.

### 2.5 Den første chatten

Skriv hva som helst, for eksempel:

> Hei! La oss begynne.

Spilleder leser hvor spillet står og svarer. I det første svaret i hver chat gir spilleder deg **lenken til dashbordet** (noe sånt som `http://127.0.0.1:4750`). Åpne den i nettleseren og ha den ved siden av chatten gjennom hele spillet. Hver kampanje beholder den samme lenken fra én chat til den neste, med mindre et annet program har tatt den: da gir spilleder deg den nye.

Mellom spillederens meldinger viser verten verktøyene spilleder bruker, i korte linjer. Ikke åpne detaljene deres (i Claude Code, ctrl+o): de kan vise hva spilleder skriver, hemmeligheter inkludert.

En ny kampanje går gjennom tre trinn, som et spill med en menneskelig spilleder. Dashbordet viser dem øverst som *1 Innstillinger · 2 Sesjon null · 3 Spill*:

1. **Innstillinger**: du velger hvordan du vil spille. Utenfor historien.
2. **Sesjon null**: du lager karakteren din, i spillet.
3. **Spill**: historien.

### 2.6 Innstillinger: velg hvordan du spiller

Spilleder spør bare om det som fortsatt mangler, noen få spørsmål om gangen. Hvis du skriver «du bestemmer», velger spilleder og forteller hva som ble valgt. Med dashbordet åpent viser det første trinnet, **Innstillinger**, de samme spørsmålene som kort: ett spørsmål om gangen, hver verdi med hva den betyr, og den vanlige er merket **Foreslått**. Velg der, så spør ikke spilleder igjen i chatten. **Hopp over** lar et spørsmål ligge til senere. Chatten tar det bare ord kan avgjøre: premisset for en ny verden, språket, og bildene, som spilleder bare spør om hvis datamaskinen din kan lage dem. Derfor stiller siden færre spørsmål enn tabellen under lister opp.

Du trenger ikke studere tabellen: den er her for oppslag. Du kan endre hver av disse senere, i chatten eller i dashbordets **Innstillinger**. En endring gjelder fra spillederens neste svar.

| Innstilling | Hva den avgjør | Verdier | Foreslått |
|---|---|---|---|
| **Mentor** (spørres som «Hvor godt kjenner du dette spillet?») | Hvor mye spilleder lærer deg reglene, utenfor historien | **av** (bare historien; spør i hakeparentes når du vil), **hint** (et kort tips før viktige valg og når en regel glipper forbi), **veiledning** (hver regel forklares første gang, hele regnestykket for hvert kast, en kort oppsummering etter kamper) | ut fra svaret ditt: aldri spilt → veiledning, litt → hint, jeg kan det → av |
| **Vanskelighetsgrad** | Hvor hardt verden spiller: kamper, fiendenes taktikk, spor, skatter, hvor fort trusler rykker fram | historie, lett, normal, vanskelig, brutal | |
| **Dødelighet** | Hva det betyr å falle i en kamp | **fortellende** (karakteren din dør aldri), **episk** (dør bare når det betyr noe for historien), **terninger** (terningene avgjør) | følger vanskelighetsgraden: historie → fortellende, lett → episk, normal og oppover → terninger |
| **Lagrede spill** | Når du kan gå tilbake | **permadød** (aldri; bare start kampanjen på nytt), **sjekkpunkt** (tilbake til siste slutt på en scene, bare hvis karakteren din dør), **fri** (tilbake til et hvilket som helst lagret spill, og lagre når du ber om det) | sjekkpunkt |
| **Strenghet** | Hvor nøye mat, lys, utmattelse, bæreevne, trylleformelkomponenter og reiser følger reglene | **glatt** (spilleder hopper over dem), **regler** (som skrevet: fakler brenner ut, rasjoner tar slutt), **simulering** (utover reglene: slitasje, bedervelse, vær) | glatt |
| **Terninger** | Hvem som kaster karakterens terninger | **digitale** (RPG Engine kaster dem, på siden), **fysiske** (du kaster dine egne og sier hva de viste) | |
| **Måleenheter** | Avstander og vekter i historien | metriske, imperiale | |
| **Følgesvenner** | Hvem som reiser med deg | ingen, laget sammen med deg i sesjon null, laget av spilleder, møtt i spillet | |
| **Bilder** | Bilder av steder og oppdrag | ingen, på forespørsel, nye steder og oppdrag | spørres én gang, bare hvis datamaskinen din kan lage dem |
| **Linjer** | Det som aldri dukker opp i spillet | en liste, eller ingen | |
| **Slør** | Det som kan skje, men bare utenfor scenen | en liste, eller ingen | |
| **Språk** | Språket for spillet og dashbordet | hvilket som helst | hentet fra hvordan du skriver, og bekreftet |

Spillsystemet kan legge til egne innstillinger. Femte utgave legger til **avansement**: hvordan karakteren din går opp i nivå, med **erfaringspoeng** eller ved **milepæler** i historien.

**Hva vanskelighetsgraden betyr i spillet.** Historie: svake, naive fiender, åpenbare spor, rikelig av alt; spilleder kan mildne sine egne kast. Lett: enkle fiender, raushet med ressurser. Normal: fornuftige fiender, tre spor til hver slutning, vanlige priser og skatter. Vanskelig: smarte fiender, subtile spor, knappe ressurser, trusler som rykker raskt fram. Brutal: fiender som lager bakhold, trekker seg tilbake og gjør ende på de falne, svært knappe ressurser, de hardeste hvilene. Kamper tilpasses alltid gruppen din slik den er nå.

**Uten en skrevet verden** spør oppsettet om to ting til:

- **Premiss**: sjangeren, tonen og noen få elementer av verden, med dine ord. For eksempel: *«Lavfantasy, dyster, men med håp. En elveby, et hjemsøkt vadested, en kult i åsene.»*
- **Forberedelse**: **underveis** (spilleder bygger hver del av verden like før du trenger den; foreslått) eller **alt i starten**.

Spilleder foreslår deretter et navn på kampanjen. Når ingenting mangler og du sier at du er klar, går spillet over til sesjon null.

### 2.7 Sesjon null: karakteren din

Sesjon null er spill: du lager karakteren din sammen med spilleder, som rundt et bord.

- **Hvert valg er ditt**, med mindre du ber spilleder ta det. Du kan komme med en full idé («en halvalv-prest som forlot tempelet sitt»), en vag en («en som helbreder, men ikke er hyggelig om det») eller ingenting («overrask meg, så lar du meg endre ting»).
- **Egenskapspoeng.** Spilleder forteller deg metoden og sikkerhetsnettet før noen terning kastes. I femte utgave: standardrekken, poengkjøp eller 4d6 der den laveste strykes. Metoden dere blir enige om, står i bordets avtaler.
- **Historien din** er aldri påkrevd. Hvis du gir en, skriver spilleder den med dine ord, leser den opp for deg én gang og knytter menneskene og stedene i den til verden. Du kan også skrive den på dashbordet (se [Gruppe](#party)).
- **Personlighet** (femte utgave): et trekk, et ideal, et bånd og en feil, fra bakgrunnens tabeller eller dine egne.
- **Et bilde.** Når karakteren er laget, ber spilleder deg om et bilde av den: en fil på datamaskinen din. Hvis KI-verten din kan tegne bilder selv, kan spilleder tilby å lage et.

Tallene på arket regnes ut av RPG Engine ut fra valgene dine: du gjør aldri regnestykkene. Når karakterene er laget og du bekrefter, begynner historien.

---

## 3. Spille <!-- icon: chat -->

### 3.1 Snakke med spilleder

Skriv hva karakteren din gjør eller sier, med dine egne ord. Kort er fint.

> Jeg spør vertshusverten hvem andre som kom innom i kveld.
>
> «Vi er ikke ute etter bråk,» sier jeg, med hånden unna sverdet.
>
> Jeg klatrer opp på taket og venter.

**Utenfor historien** skriver du i hakeparentes:

> [Hvordan fungerer grappling?]
>
> [Kan jeg fortsatt bruke reaksjonen min denne runden?]
>
> [La oss stoppe her for i kveld.]

Spilleder svarer også i hakeparentes, og går så tilbake til historien.

**Du sier hva du prøver, og spilleder sier hva som skjer.** Noe som bryter verdens logikk eller fakta som allerede er fastsatt, skjer ikke: spilleder sier fra, inne i historien, og tilbyr det som er mulig.

**Spilleder bestemmer aldri for karakteren din.** Spilleder lar deg ikke snakke, føle eller velge på noens vegne. Ved tvil spør spilleder.

**Spilleder snakker aldri om motoren.** Spør om spilleder holder styr på ting, og svaret kommer som fra en spilleder: «Jeg husker alt: vi tar opp tråden herfra neste gang.»

**Du kan spørre spilleder hvordan dashbordet brukes.** Spilleder kjenner siden: «Hvor ser jeg trylleformlene mine?», «Hvordan kaster jeg for hånd?»

### 3.2 Kast

**Når et kast skjer.** Spilleder ber om et kast bare når utfallet er usikkert og viktig. Ellers sier spilleder ja, eller «ja, men». Før kastet sier spilleder hva som står på spill og hvilke prøver som passer, og stopper. Du kaster, eller ombestemmer deg:

> **Spilleder:** Avsatsen er smal og våt. Glipper du, er det et langt fall ned i elven. En prøve i Behendighet (Akrobatikk), eller du kan gå tilbake og lete etter trappa.
>
> **Du:** Jeg prøver.

**Kaste på dashbordet.** Når spilleder ber om det, dukker det opp et banner øverst på siden med en knapp for hver prøve, for eksempel *Akrobatikk +4 · med vantage*. Klikk på den: terningene faller på siden, og spilleder hører resultatet. Du kan også:

- klikke på den tilsvarende linjen på arket ditt, som lyser gult;
- kaste de riktige terningene fra terningbrettet;
- skrive dine egne ord i banneret i stedet, hvis du vil gjøre noe annet.

**Kaste for hånd.** Hvis du heller vil velge terningene selv, slå på **For hånd** i hjørnet av banneret (eller i **Innstillinger**). Knappen for prøven forsvinner, og banneret sier hva du skal kaste, slik en spilleder ville gjort: *Kast Akrobatikk selv, på arket ditt eller med terningene.* Klikk på linjen på arket som lyser, eller kast de riktige terningene fra terningbrettet: RPG Engine kaster dem, legger til bonusen din, og spilleder hører resultatet. En prøve som verken arket eller terningbrettet kan gjøre, for eksempel skade som kaster om enere, beholder knappen sin. For hånd forblir på i denne nettleseren til du slår det av.

**Fysiske terninger gjennom hele spillet.** Når innstillingen **Terninger** er satt til fysiske, ber spilleder om kastene dine med ord, og du skriver hva terningene viste:

> [Jeg kastet 14.]

RPG Engine legger til modifikatorene dine og avviser et tall terningene dine ikke kan vise.

**Fritt kast.** Klikk på et hvilket som helst tall på arket, eller åpne terningbrettet, for å kaste bare for moro skyld. Frie kast teller aldri, blir aldri registrert, og spilleder ser dem aldri. En fri 20 blir aldri en ekte senere.

**Spillederens kast.** Spilleder kaster for fiender og andre med RPG Engine også. De fleste kast vises i kastkolonnen din. Når du ikke skal se et resultat, kaster spilleder i hemmelighet. Du kan alltid spørre:

> [Var det kastet ekte?]

For et kast du får se, oppgir spilleder tallene og begrunnelsen. For et hemmelig kast får du et fingeravtrykk som beviser at kastet ble gjort før du spurte.

**Kast i chatten** vises i hakeparentes, rett etter øyeblikket de avgjør: *[Overtalelse 14 + 3 = 17]*. Deretter forteller historien utfallet.

### 3.3 Scener og kamper

Spilleder driver historien i **scener**: en kamp, en samtale, utforsking, reise, en hvile, en utfordring (en jakt, et kappløp, en gåte). Du trenger ikke styre dem: de er måten RPG Engine holder styr på historiens kapitler. Ved slutten av hver scene lagres spillet av seg selv, og scenen går inn i historien i dagboken din.

**I en kamp** forteller spilleder alle turene som ikke er dine, etter hverandre, med hvert kast, og **stopper der du kan bestemme**: din tur, en reaksjon, et valg. På din tur sier du hva du gjør:

> Jeg kaster Hellig flamme på den ved døra.

Dashbordets **Kamp**-seksjon viser rekkefølgen på turene, hvem som har tur, gruppens treffpoeng og hvor skadet fiendene ser ut (uskadd, skadd, blødende, nede: i ord, aldri i tall). Hvis karakteren din faller, vises dødsredningene stort på siden.

**Når kampen allerede er avgjort**, kan spilleder tilby å fortelle resten i én melding.

### 3.4 Tid, reiser og verden som beveger seg

**Tid.** Hver handling tar tid i historien, og RPG Engine holder datoen: dag 3, tidlig morgen. Spilleder forteller tiden slik verden måler den: daggry, den tredje klokkeslagen, nattfall. Mellom sesjoner går det ingen tid: du fortsetter der du stoppet.

**Hvile.** Si at dere hviler, så bruker spilleder det en hvile gir tilbake, som treffpoeng og trylleformelplasser:

> Vi slår leir og tar en lang hvile.

**Reise.** Si hvor du vil dra:

> Vi tar veien nordover mot Rocca.

RPG Engine regner ut veien, avstanden og dagene i ditt tempo, og flytter dere dit. En reise stopper når noe planlagt skjer underveis, ved slutten av hver dags reise og ved ankomst. Du kan spørre hvor langt et sted er før du drar:

> [Hvor langt er det til Rocca, og hvor lang tid tar det til fots?]

**Verden beveger seg uten deg.** Skurker har planer med tidsfrister og klokker. Hver ny dag flytter spilleder truslene som tiden har fått til å rykke fram, og du ser tegnene: et rykte, et spor, en forandring i byen. Du ser aldri selve klokken, bare det den etterlater seg.

**Penger** telles i spillets mynter. Betal, selg, få betalt: RPG Engine gir vekslepengene.

### 3.5 Kart

**Verdenskartet** (dashbord: **Verden**) viser bare stedene karakteren din kjenner, med veiene mellom dem, sporet du har gått, og tåken over alt annet. Klikk på et sted for å se hva du vet om det og hvor langt det er.

**Kartet over et sted** (dashbord: **Scene**, og **Kamp** i en kamp) dukker opp når spilleder tegner et for der du er: vegger, dører, underlaget og hvem som står hvor, som brikker. I en kamp, på din tur, er rutene du ikke kan nå, tilslørt, så du ser med et blikk hvor du kan gå. Når spilleder spør hvor karakteren din flytter seg, åpner siden kartet, og du trykker på en rute eller skriver den, for eksempel *E4*.

### 3.6 Oppdrag, dagbok og notater

**Oppdrag.** Når karakteren din tar på seg en oppgave, blir den et oppdrag i **Dagbok**: hvem som ga det, hvor, innen når, målene som en liste, og hva det måler (en frist med tid igjen, en klokke, en telling). Merk et med stjernen for å følge det: det blir liggende lite øverst i Scene, med neste mål. Oppdraget slutter når historien avslutter det, aldri av seg selv.

**Historien.** Fanen Historie i dagboken er kampanjen din som en tidslinje: hver scene et kapittel, med sted, dato og et kort sammendrag, det siste først.

**Notatene dine.** I fanen Notater i dagboken skriver du dine egne notater: teorier, navn, planer. De blir på datamaskinen din, og spilleder leser dem ikke, med mindre du **Del**er ett. Et delt notat når spilleder ved neste svar som det du tror, aldri som et faktum. Teorien din blir ikke sann fordi du skrev den ned. Et notat som ber om å stoppe eller unngå noe innhold, teller som om du hadde sagt det ved bordet.

### 3.7 Karakterens historie og bilde

På karakterarket har kortet **Beskrivelse** en boks der du kan skrive karakterens historie. Send den, så skriver spilleder den inn i karakteren med egne ord, etter at du har sagt ja.

For karakterens bilde gir du spilleder en bildefil i chatten, med hvor den ligger på datamaskinen din (PNG, JPEG, WebP eller SVG, opptil 5 MB):

> [Her er portrettet av karakteren min: C:\Users\me\Pictures\mira.png]

Spilleder kopierer det inn i kampanjen, og det vises på karakterens brikke på dashbordet. Du kan bytte det på samme måte når du vil. RPG Engine selv tegner bare steder og oppdrag (se [Bilder](#311-pictures)).

### 3.8 Lagrede spill og gå tilbake

RPG Engine lagrer hele kampanjen **ved slutten av hver scene**, av seg selv. Hva du kan gjøre med disse lagrede spillene, avhenger av innstillingen **Lagrede spill**:

| Lagrede spill | Lagre når du vil | Gå tilbake |
|---|---|---|
| **permadød** | nei | aldri; du kan bare starte kampanjen på nytt |
| **sjekkpunkt** | nei | til det siste lagrede spillet, bare når karakteren din dør |
| **fri** | ja | til et hvilket som helst lagret spill, når du vil |

I alle modi kan du **starte på nytt**: fra starten av spillet med samme karakter, eller fra sesjon null med en ny.

Du kan gjøre alt dette i chatten («[La oss gå tilbake til før duellen.]») eller i dashbordets **Lagrede spill**-seksjon.

**Etter å ha gått tilbake, åpne en ny chat.** Chatten du spilte i, husker det som er angret. Åpne en ny chat med spilleder (`/clear` i Claude Code, `/new` i Codex), skriv *fortsett*, og trykk så **Jeg har åpnet en ny chat** i Lagrede spill, eller si det til spilleder i den nye chatten. Gjenoppta aldri den gamle chatten. Før du bekrefter, går ikke spilleder videre.

### 3.9 Sesjoner: stoppe og komme tilbake

**Du avslutter sesjonen** når du vil:

> [La oss stoppe her for i kveld.]

Det finnes ingen «lagre og avslutt»: alt ligger allerede i filene.

**For å lukke** chatten skriver du `/exit` i Claude Code, eller `/quit` i Codex. Dashbordet blir stille til neste chat.

**For å komme tilbake** åpner du en terminal i kampanjemappen (den `init` skrev ut), starter verten der og skriver *fortsett*. Spilleder leser hvor spillet står, gir deg en kort oppsummering og begynner med at noe skjer. En ny chat mister ingenting: kampanjen lever i filene sine, ikke i chatten.

Spilleder stiller ikke rutinespørsmål på slutten. Bare hvis spilleder la merke til at noe ikke fungerte, spør spilleder kort.

### 3.10 Spillederens humør

Øverst på dashbordet sitter spillederens avatar, en liten robot. Ansiktet følger historiens tone: bekymret når faren vokser, henrykt over en dristig idé, overrasket over en vending. Den reagerer et øyeblikk på en naturlig 20 eller en naturlig 1. Den viser aldri det du ikke vet ennå: ikke noe glis før fella er utløst. Gruppens brikker viser også humørene sine. Når chatten er lukket, sover roboten.

### 3.11 Bilder

RPG Engine kan få laget et bilde for hvert sted du kommer til og hvert oppdrag du tar, slik innstillingen **Bilder** sier. Det bruker det som allerede finnes på datamaskinen din:

- **Codex**, med ChatGPT-innloggingen din: et malt bilde.
- Ellers **Claude Code**, med Claude-innloggingen din: en tegning.

Bildet bruker ditt eget abonnement, ikke vårt. **Innstillinger**-seksjonen forteller om bilder kan lages på datamaskinen din, og hvis ikke, hvilke steg som trengs for å sette det opp. Uten bilder viser siden merket for hver type sted i stedet. Du kan også gi spilleder et eget bilde av et hvilket som helst sted eller en hvilken som helst karakter.

### 3.12 Trygghet: linjer, slør og stopp

- **Linjer**: det som aldri dukker opp i spillet.
- **Slør**: det som kan skje, men bare utenfor scenen.
- **Stopp**: når som helst kan du stoppe et innhold, uten å forklare. Skriv det utenfor historien:

> [stopp]

Spilleder dropper det med en gang og legger det til i linjene dine, for alle sesjoner framover. Du kan se og endre linjene og sløret dine i **Innstillinger**.

### 3.13 Ombestemme deg

Hver innstilling kan endres underveis i kampanjen: i chatten («[La oss gjøre det vanskeligere.]») eller i **Innstillinger**. Spilleder hører om en endring ved neste svar. En avgjørelse spilleder tok uten regelboka, blir en **presedens** og beholdes, så det samme spørsmålet får det samme svaret neste gang.

---

## 4. Dashbordet, seksjon for seksjon <!-- icon: party -->

Dashbordet er en side på din egen datamaskin. Spilleder gir deg lenken i starten av hver chat. Siden følger spillet direkte: når spilleder endrer noe, endrer siden seg også.

Bare nettleseren på datamaskinen der du spiller, kan åpne den: ikke en telefon eller et nettbrett, selv på samme Wi-Fi. Siden passer også i et smalt vindu: da flyttes seksjonene til en linje nederst, og ikonene til en meny.

Siden lever like lenge som chatten. Lukk chatten, og en side som står åpen, viser *Ikke tilkoblet* med arket slik det var, og spillederens robot sovner. Åpne en chat i kampanjen igjen, og når spilleder har svart, kommer siden tilbake av seg selv.

### Øverst

- **Spillederens avatar**, med humøret.
- Kampanjens navn, spillsystemet, **spilltiden** og om spillet er **tilkoblet** (chatten er koblet til).
- Seksjonene: **Gruppe**, **Scene**, **Kamp** (bare under en kamp), **Dagbok**, **Verden**. Til slutt i raden, som ikoner: **Lagrede spill**, **Hjelp**, **Innstillinger**, **Om**.
- Lyst og mørkt tema, i øvre høyre hjørne.

Når spilleder spør deg om noe, blir banneret liggende øverst på siden, uansett hvilken seksjon du er i.

### Gruppe

Arket til karakteren din, og arkene til følgesvennene dine. Hver del av arket er et kort du kan åpne og lukke.

- **Klikk på et tall** for å kaste det for moro skyld. Hold musepekeren over et tall for å se hvordan det er satt sammen («+5: Visdom +3, ferdighet +2»).
- **Treffpoeng, plasser og bruk** vises som streker og prikker.
- **Tilstander og effekter** vises med hvor lenge de varer.
- **Beskrivelse** rommer teksten om karakteren din, og boksen for å sende spilleder karakterens historie.
- Ved 0 treffpoeng vises **dødsredningene** stort under navnet.
- Ved siden av arket (under det på en smal skjerm): **kastene**, de nyeste først, dine og de av spillederens du kan få se. **Fjern** tømmer listen, **Gjenopprett** henter den tilbake. Frie kast vises stiplet og dempet.

En følgesvenn med en statblokk, som en ulv, viser statblokken sin i stedet for et fullt ark.

### Scene

Der gruppen din er: stedets bilde og navn, stedene rundt, kartet over stedet når det har ett, hvem som er der, og den åpne scenen med det som skjer nå. Oppdraget du følger, ligger øverst.

### Kamp

Bare under en kamp. Øverst: runden, hvem som handler, hvem som kommer etter. Under: rekkefølgen på turene, hver kriger med sin tilstand, gruppen din i tall og fiendene i ord. Det karakteren din har for hånden (Classe Armatura, treffpoeng, angrep). Kartet over stedet, med den som handler, ringet inn. På din tur pulserer Kamp-lenken i gult, uansett hvor du er.

### Dagbok

Tre faner:

- **Oppdrag**: aktive, fullførte og mislykkede, hver som et kort med målene sine, fristen som en tidtaker og klokkene. Stjernen følger et oppdrag.
- **Historie**: kampanjens kapitler, scene for scene, det siste først.
- **Notater**: dine egne notater, private til du deler ett.

### Verden

Verdenskartet slik karakteren din kjenner det, med tåke over resten. Dra for å flytte, bruk hjulet eller knip for å zoome. Klikk på et sted for kortet. En liste over stedene, de nærmeste først, ligger ved siden av. Med mer enn ett kart (en by, et kontinent, et annet plan) bytter faner mellom dem.

### Terningbrettet

Terningknappen åpner brettet: velg terninger og en modifikator, og kast. Med to eller flere terninger av samme slag velger du hvilke som teller: **Alle**, **Høyeste** (bare den høyeste) eller **Laveste** (bare den laveste). Terningene du valgte, blir liggende til du trykker **Fjern**, så det samme skadekastet er ett klikk hver runde. Mens spilleder ber om et kast, forteller brettet deg hvilke terninger som svarer på det.

### Lagrede spill

De lagrede spillene dine, de nyeste først, hvert med sted, spilldato og når det ble laget. **Lagre nå** (med frie lagrede spill), **Gå tilbake hit** og **Start på nytt**, i rødt, i to steg. Se [Lagrede spill og gå tilbake](#38-saves-and-going-back).

### Innstillinger

Innstillingene dine, i grupper: spillet, å lære spillet (mentoren og reglene du allerede har fått forklart), terninger og mål, grenser (linjer og slør), bilder, språk. Klikk på en verdi for å velge den, og under den står hva den betyr. Så kommer sidens egne preferanser, som bare huskes i denne nettleseren: temaet, lyden fra terningene, **terningsettet** (harpiks, metall, tre, stein), runde eller skarpe kanter, kasting for hånd.

Spillederens egne innstillinger, som husregler og presedenser, er ikke her: de blir i chatten.

### Hjelp og Om

**Hjelp**: denne guiden. **Om**: hva RPG Engine er, lenkene, lisensene og krediteringene for spillsystemet.

### Før spillet: Innstillinger og sesjon null

Mens en ny kampanje er i det første trinnet, **Innstillinger**, stiller hele siden spørsmålene sine: ett om gangen, hvert med hva verdiene betyr og den foreslåtte. **Du bestemmer** overlater et spørsmål til spilleder, bortsett fra linjer og slør, som alltid er dine. **Hopp over** lar det ligge til senere. Til slutt: **Jeg er klar**.

### Meldinger fra siden

Noen ganger viser siden et varsel over seg selv: et problem i kampanjens filer (spilleder fikser det), spillet er borte (chatten er lukket), siden blir oversatt.

---

## 5. Spillsystemer og husregler <!-- icon: dice -->

### 5.1 Hva et spillsystem er

Et spillsystem er dataene til ett spill: arket, tallene, skapningene, gjenstandene, trylleformlene og regelteksten. Hver kampanje spiller ett system.

RPG Engine regner ut karakterarket ditt og hva som brukes og kommer tilbake, som treffpoeng og trylleformelplasser, slik et digitalt karakterark gjør. Hvordan en egenskap eller en trylleformel virker, leser spilleder i reglene og avgjør, som ved et bord.

### 5.2 Femte utgave, inkludert

RPG Engine leveres med **5e**, fra System Reference Document 5.1 (reglene fra 2014, frie under Creative Commons). Det inneholder:

- rasene, klassene, underklassene, en bakgrunn og en egenskap (feat) fra SRD-en;
- de 319 trylleformlene, våpnene, rustningene og utstyret, de magiske gjenstandene og monstrene fra SRD-en;
- regelkapitlene, som spilleder slår opp etter nøyaktig ordlyd;
- det fulle karakterarket, utregnet: egenskapsmodifikatorer, redninger, ferdigheter, Classe Armatura, angrep, trylleformelens redningsvanskelighet, plasser, treffterninger, egenskaper etter nivå, erfaring og nivåoppgang;
- hviler som gir tilbake det de skal, tilstander med regelteksten sin og påminnelser om konsentrasjon.

**Innhold utover SRD-en.** Du kan spille femte utgave med innhold SRD-en mangler, som en klasse eller et monster fra en bok du eier. Spilleder kjenner spillet, kan lese håndbøkene dine og kan søke på nettet. Spilleder skriver det som trengs som sider i kampanjen din, og RPG Engine arbeider på samme måte med dem. Det vi leverer, er begrenset av lisensen sin. Det spilleder kan, er ikke det.

RPG Engine er kompatibelt med femte utgave.

### 5.3 Husregler og egne tillegg

Du trenger ikke røre noen fil. Spør spilleder:

> [Husregel: en naturlig 1 på et angrep betyr at du mister våpenet.]
>
> [Jeg vil gjerne spille en Blood Hunter. Jeg har boka: her er klasseegenskapene.]
>
> [I denne kampanjen tar en kort hvile 10 minutter.]

Spilleder registrerer dem i kampanjen din, på en av disse måtene:

- **En avtale ved bordet**, i ord, som våpenet som mistes eller den korte hvilen over. Spilleder beholder den sammen med kampanjens innstillinger og spiller etter den fra da av. En avgjørelse spilleder tar uten regelboka, beholdes på samme måte, som en **presedens**.
- **En ny side**, for eksempel en klasse, en rase eller en gjenstand. En ny klasse virker som systemets egne: nivået ditt, treffterningene og egenskapene regnes inn. En ny rase kan bygge på en eksisterende («som alven, pluss …»). Et navngitt sverd kan bygge på langsverdet.
- **Nye tall på arket**: et felt, en tabell, en formel, en teller som en hvile fyller opp igjen. For eksempel overlegenhetsterningene til en Battle Master, som kommer tilbake på en kort hvile. En husregel kan også erstatte en av systemets formler.

Hvis du allerede har husregler skrevet ut, kan du også legge dem som tekstfiler i kampanjens `rules`-mappe (se [kampanjemappen](#8-for-the-curious-the-campaign-folder)): spilleder leser dem før bokas regel med samme navn.

### 5.4 Legge til eller importere ditt eget spillsystem

I dag spiller RPG Engine bare femte utgave. Flere spillsystemer kommer, og det gjør også en måte å legge til ditt eget, eller å gjøre et spill du eier om til et system ut fra håndbøkene. Se [Kommer senere](#9-coming-later).

---

## 6. Utvidelser <!-- icon: plus -->

**Utvidelser er ikke tilgjengelige ennå.** En utvidelse vil legge noe til en kampanje oppå spillsystemet: en verden, et eventyr, en funksjon som været eller en tarotkortstokk, husregler å dele. Du vil velge hvilke hver kampanje bruker. De første som er planlagt for femte utgave, er vær og låsdirking.

---

## 7. Hvor en kampanje kommer fra, og språket <!-- icon: world -->

### 7.1 Tre måter å få en verden på

**Laget underveis.** Du gir et premiss i oppsettet, og spilleder bygger verden mens dere spiller: hvert sted, hver person og hvert plott like før du trenger det, og beholdt fra da av. Dette er den raskeste måten å spille på: installer, lag, og etter noen minutter lager du karakteren din. Ingenting som er funnet på, går tapt: når det er sagt, er det skrevet ned og forblir sant.

**Forberedt i starten.** Samme premiss, men med **forberedelse: alt i starten** bygger spilleder verdens steder, fraksjoner, trusler og planene deres før spillet begynner. Den første sesjonen starter senere, med mer klart bak kulissene.

**Fra en eksisterende kampanje eller et eventyr.** I dag finnes det ingen importknapp. Gi spilleder eventyret ditt (en tekst eller en PDF verten din kan lese) og be om å sette det opp:

> [Jeg har dette eventyret som PDF. Sett det opp som kampanjen vår: les det, og skriv ned stedene, karakterene og hemmelighetene. Ikke fortell meg noe av det som står i det.]

Spilleder leser det med KI-vertens verktøy og skriver det som sider i kampanjen, hemmeligheter inkludert, som du skal oppdage i spillet. Claude Code leser PDF-er. Med Codex er en tekst- eller markdown-fil det tryggeste valget. Gjør det under oppsettet, før sesjon null.

Mens spilleder jobber, ikke åpne detaljene om det som leses eller skrives (i Claude Code, ctrl+o): de viser eventyrets tekst, hemmeligheter og alt. Spilleder selv holder hemmelighetene, som alltid.

Så snart kampanjen har egne sider, slutter oppsettet å spørre om premiss og forberedelse. Selv i en skrevet kampanje, når du drar et sted teksten ikke dekker, lager spilleder det som trengs og registrerer det.

**En kampanje spilles én gang.** For å spille det samme eventyret igjen lager du en ny kampanje. Innenfor en kampanje kan du fortsatt gå tilbake til et lagret spill eller starte på nytt, slik innstillingen Lagrede spill tillater.

### 7.2 Språk

**Ett språk per kampanje**: spillederens. Spilleder skriver på det, og dashbordet følger det. Spilleder henter det fra hvordan du skriver, og bekrefter det.

**Dashbordet** leveres på engelsk og italiensk (kuratert) og på 24 språk til: fransk, tysk, spansk, portugisisk (brasiliansk), nederlandsk, svensk, norsk, dansk, finsk, islandsk, russisk, ukrainsk, polsk, tsjekkisk, rumensk, ungarsk, gresk, tyrkisk, arabisk, hebraisk, hindi, kinesisk, japansk, koreansk. Arabisk og hebraisk leses fra høyre mot venstre: siden speiles, mens kartene og terningene blir som de er tegnet.

**Et hvilket som helst annet språk** du velger i Innstillinger, oversettes på datamaskinen din, i bakgrunnen, av Codex eller Claude Code med din egen innlogging, fra og med seksjonen du har åpen. Det gjøres én gang per språk, for alle kampanjene dine. Til det er klart, er siden på engelsk. Innstillinger forteller om oversettelsen pågår, er klar eller ikke er mulig på datamaskinen din.

**Spillets ord.** Femte utgave har sine egne termer på italiensk fra den offisielle italienske SRD-en, så italienske spillere leser *Classe Armatura*, *tiro salvezza*, *vantaggio*. Andre språk får systemets termer oversatt.

**Spillsystemets egen tekst** (trylleformlene, monstrene, regelkapitlene) blir på engelsk. Spilleder leser den og forteller den til deg på ditt språk.

**Bytte språk midt i kampanjen** lar sidene som allerede er skrevet, bli som de er. Spilleder skriver nye på det nye språket.

---

## 8. For de nysgjerrige: kampanjemappen <!-- icon: list -->

Du trenger aldri å åpne den. Hvis du gjør det, vit at **den inneholder hemmelighetene** i kampanjen din: å lese den ødelegger spillet.

En kampanjemappe inneholder:

- `campaign.yaml`: innstillingene dine;
- `state.yaml`: hvor spillet står nå: trinnet, datoen, den åpne scenen;
- `world/`: én side per karakter, sted, fraksjon, oppdrag, gjenstand, hendelse, tema eller skapning, som markdown-filer;
- `rules/`: husreglene dine som tekstfiler, hvis du legger til noen (`init` lager den ikke);
- `images/`: bildene, når det finnes noen;
- `log.jsonl`: hver endring, i rekkefølge;
- `.saves/`: de lagrede spillene, fra det første og utover;
- `.player/`: dine egne notater fra dagboken, som spilleder ikke leser;
- `sessions/`: holdes av RPG Engine;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: de små filene som forteller KI-vertene hvor RPG Engine er og holder minnet deres av. RPG Engine holder dem oppdatert; la dem være som de er.

Sidene er vanlig markdown med lenker som `[[Rocca]]`, formatet til Obsidian: spillederens notatbok kan åpnes der. **Hvis du endrer en side for hånd**, hører spilleder hva som er endret ved neste svar.

**Kommandolinjen.** Alt spilleder gjør, går gjennom kommandoer du også kan kjøre, i kampanjemappen. Du trenger dem aldri for å spille, og mange skriver ut kampanjens hemmeligheter, slik `rpg status` og `rpg show` gjør. `rpg --help` lister dem alle, og `rpg roll --help` forklarer én. En kommando som endrer noe mens en chat er åpen, er helt i orden: spilleder hører om den ved neste svar, som for en side endret for hånd.

---

## 9. Kommer senere <!-- icon: hourglass -->

Det som er planlagt, men ikke her ennå:

- **Du som spilleder**: du styrer spillet, og KI-en spiller gruppen.
- **Flere personer ved bordet**, hver med sin rolle.
- **Utvidelser**: innstillinger, eventyr, funksjoner og husregler, valgt per kampanje.
- **Importere** håndbøkene og eventyrene dine.
- **Andre spill**: flere spillsystemer, og dine egne.
- **Forfattermodus**: lag en kampanje eller et eventyr med KI-en, og del det så andre kan spille det.

---

## 10. Spørsmål og problemer <!-- icon: info -->

### Spørsmål

**Må jeg kunne reglene?** Nei. Velg mentor med veiledning, så lærer spilleder deg underveis, én regel om gangen. Du kan alltid spørre i hakeparentes.

**Kan spilleder jukse?** Spilleder kan ikke endre et kast RPG Engine har gjort, unntatt på vanskelighetsgrad historie, og endrer aldri fakta som allerede er fastsatt. Du kan spørre om et kast var ekte.

**Kan jeg jukse?** Du kan prøve. Spilleder tar ikke ordet ditt for fakta: en linje i meldingen din som ligner en spillmelding, er fortsatt bare dine ord, og spilleder bekrefter aldri gjetningene dine om hemmeligheter.

**Koster det noe?** RPG Engine er gratis. Spilleder kjører på ditt eget Claude- eller ChatGPT-abonnement, og en spillkveld er en lang chat: på de minste abonnementene kan du nå grensen før kvelden er over. Bilder og oversettelser bruker det samme abonnementet.

**Kan jeg spille på telefonen?** Nei. Spilleder kjører på datamaskinen din, og dashbordet åpnes bare i nettleseren på den datamaskinen.

**Kan jeg spille med venner?** Ikke ennå: i dag én spiller, én karakter, pluss følgesvenner. Flere personer ved bordet kommer med roller.

**Kan jeg bruke en annen KI neste gang?** Ja. Kampanjen lever i filene sine: åpne den i en annen vert og skriv *fortsett*.

**Hva om jeg lukker nettleseren?** Ingenting går tapt. Åpne lenken igjen mens chatten er åpen, så kommer siden tilbake der spillet er.

**Kan jeg spille D&D-innhold jeg eier?** Ja. Spilleder kan bruke bøkene dine, sin egen kunnskap og nettet. Det RPG Engine leveres med, er begrenset til fritt innhold. Hva spillet ditt bruker, er opp til deg.

### Problemer

**Dashbordet åpnes ikke.** Be spilleder om lenken: `[Hva er lenken til dashbordet?]`. Siden fungerer bare mens en chat med spilleder er åpen i den kampanjen, og bare etter spillederens første svar i den chatten. Med chatten lukket når ikke nettleseren siden. En side som står åpen, sier *Ikke tilkoblet*.

**Spilleder ser ikke ut til å kjenne spillet, eller finner på verktøy.** KI-verten din lastet ikke RPG Engine.

- Sjekk først at du startet verten **i kampanjemappen**, og at du sa at du stoler på den.
- **Claude Code**: skriv `/mcp`. Hvis `rpg` er der, men feilet, velg den, og så **Reconnect**. Hvis den mangler, lukk Claude Code, skriv `claude mcp reset-project-choices` i kampanjemappen og start den på nytt.
- **Codex**: skriv `codex mcp list` i en terminal, i kampanjemappen. Hvis `rpg` mangler, stoler ikke Codex på mappen: start den på nytt der og si ja når den spør.
- I begge: hvis `rpg --version` i en terminal sier at kommandoen ikke finnes, installer RPG Engine på nytt ([2.2](#22-install)) og åpne en ny terminal.

**Etter en oppdatering var ingenting endret.** En spilleder som kjører, beholder versjonen den startet med. Åpne en ny chat, eller koble til serveren på nytt i Claude Code (`/mcp`, så `rpg`, så **Reconnect**).

**Spilleder husker noe jeg har angret.** Du gikk tilbake til et lagret spill, men fortsatte å spille i samme chat. Åpne en ny chat og trykk **Jeg har åpnet en ny chat** i Lagrede spill.

**Spilleder stiller oppsettsspørsmål jeg allerede har svart på på siden.** Si det: `[Jeg valgte dem på dashbordet.]`

**Ingen bilder vises.** Åpne Innstillinger > Bilder: der står det om denne datamaskinen kan lage dem, og stegene hvis ikke, hver kommando med en knapp for å kopiere den.

**Siden er på engelsk, men jeg valgte et annet språk.** Den oversettes i bakgrunnen. Innstillinger sier hvordan det går. Uten Codex eller Claude Code på denne datamaskinen blir den på engelsk.

**Spilleder sier at kampanjen har problemer.** Spilleder fikser dem selv. Hvis du har redigert filer for hånd, kan spilleder spørre hva du mente.

**Windows: `npm` feiler i mappen min.** Ikke ha kampanjen, eller RPG Engine, under en sti som inneholder `&`.

**Installasjonen feiler, eller `rpg` vil ikke starte.** Sjekk Node.js-versjonen din med `node --version`: den må være 22 eller nyere. Hvis den er eldre, installer LTS-versjonen fra [nodejs.org](https://nodejs.org), og installer så RPG Engine på nytt.

**Dashbordlenken endret seg.** Et annet program brukte kampanjens vanlige adresse, eller Windows hadde reservert den. RPG Engine tok en annen, og spilleder gir deg den nye lenken. Ingenting annet endres.
