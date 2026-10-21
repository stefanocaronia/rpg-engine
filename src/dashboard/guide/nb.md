<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb 63d60934 16d08ee1 75985e6d b8f80c05 8c9f41da 0b4a6ef8 338535a6 728ca4a5 e2839149. Change the English, then run it again. -->
# RPG Engine: den komplette veiledningen

**RPG Engine** lar deg spille et rollespill rundt bordet med en **AI som spilleder**. Du snakker med spillederen i en **chat**. RPG Engine jobber bak kulissene: det **husker verden**, **kaster terningene** og **fører regnskapet**. Ved siden av chatten har du en side åpen i nettleseren, **dashbordet**, med karakterarket, terningene, kartene og dagboken din.

Veiledningen er for spillere: du trenger ikke kunne programmere.

## Hurtigstart <!-- icon: send -->

1. Installer **Node.js** fra [nodejs.org](https://nodejs.org) (LTS-versjonen).
2. Installer en **AI-agent**, programmet spillederen kjører i, og logg inn: for eksempel Claude Code eller Codex ([2.4](#24-connect-your-ai)).
3. Installer RPG Engine i en terminal: `npm install -g rpg-engine`.
4. Opprett en kampanje: `rpg init "The Salt Isles"`.
5. Gå inn i den nye mappen med `cd "The Salt Isles"`, og start agenten din der: `claude` for Claude Code, `codex` for Codex. Si ja når den spør om du stoler på mappen ([2.4](#24-connect-your-ai)), og skriv så *Hei! La oss begynne.* Spillederen svarer med lenken til dashbordet ditt.

## 1. Hva RPG Engine er <!-- icon: about -->

| Hvem | Hva de gjør |
|---|---|
| **Du** | Du spiller karakteren din: hva den gjør, sier og prøver. |
| **Spilleder** (AI-en) | Forteller historien, spiller alle andre, avgjør hva som skjer og ber om kast. |
| **RPG Engine** | Holder verden i filer, kaster terningene, teller hitpoeng, penger, tid og avstander, og holder hemmeligheter skjult til du oppdager dem. |

Verden forblir den samme fra den ene kvelden til den neste, selv i en ny chat, selv med en annen AI:

- **Det som er sagt, forblir sant.** En død skurk forblir død.
- **Terningene er ekte.** Spillederen kan ikke bøye dem, unntatt på letteste vanskelighetsgrad, hvis du velger den.
- **Hemmeligheter forblir hemmelige.** Spillederen forteller deg aldri hva karakteren din ikke vet.
- **Verden beveger seg.** Trusler rykker fram mens dere hviler eller reiser, og du ser tegnene på dem.
- **En kampanje er en mappe** på datamaskinen din: stopp når du vil, ta den opp igjen senere.

I dag spiller RPG Engine ett spillsystem, **femte utgave**, fra det frie System Reference Document 5.1. Flere kommer ([Kommer senere](#9-coming-later)).

---

## 2. Kom i gang <!-- icon: path -->

### 2.1 Dette trenger du

- En datamaskin med Windows, macOS eller Linux, og en nettleser.
- **Node.js 22** eller nyere, fra [nodejs.org](https://nodejs.org). Den følger med `npm`, som installerer RPG Engine.
- En **terminal**: på Windows Terminal eller PowerShell, på macOS Terminal. For å åpne en terminal i en mappe høyreklikker du på mappen og velger **Åpne i Terminal** (Windows) eller **Tjenester > Ny terminal i mappen** (macOS).
- En **AI-agent** til spillederen ([2.4](#24-connect-your-ai)), med den **største modellen** den tilbyr. En liten modell er lettere å snakke til å røpe hemmeligheter eller bøye reglene.

### 2.2 Installer

```text
npm install -g rpg-engine
```

`rpg --version` sjekker at det gikk bra. Du bruker `rpg` én gang per kampanje, for å opprette den. Etter det starter agenten din RPG Engine av seg selv.

### 2.3 Opprett en kampanje

Åpne en terminal i mappen der du har spillene dine ([2.1](#21-what-you-need) forklarer hvordan):

```text
rpg init "The Salt Isles"
```

Dette lager mappen `The Salt Isles` med en ny kampanje i. Gå inn i den med `cd "The Salt Isles"`. Husk hvor den ligger, for du kommer tilbake til den hver gang du spiller. Alt annet velger du senere, i chatten eller på dashbordet. `rpg init --help` viser valgene du kan ta allerede nå, for eksempel `--language it` eller `--difficulty hard`.

Spillederen kan ikke opprette en kampanje for deg. Før `init` er det ingenting som forteller agenten din hvor RPG Engine er.

### 2.4 Koble til AI-en din

Spillederen kjører i en **AI-agent**: en AI-app, i terminalen eller på skrivebordet, som kan arbeide med filene på datamaskinen din, for eksempel Claude Code eller Codex. En vanlig chat som claude.ai eller ChatGPT, eller en app på telefonen, er ikke nok. Spillederen må kunne nå kampanjens filer på datamaskinen din. Hver agent trenger sitt eget abonnement og sin egen pålogging: Claude Code et betalt Claude-abonnement, Codex en ChatGPT-pålogging. Du installerer den én gang, fra agentens egen side: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: skriv `claude` i kampanjemappen. Når den spør om du stoler på mappen, velger du **Yes, I trust this folder**. Pass opp: svaret som er valgt på forhånd, er *No, exit*.
- **Codex**: skriv `codex` i kampanjemappen, og svar ja når den spør om du stoler på mappen. I skrivebordsappen sjekker du i innstillingene at minner er skrudd av for spillets chatter.
- **En annen agent**: start den i kampanjemappen og gi den MCP-serveren `rpg mcp`. RPG Engine er en vanlig MCP-server. Enhver agent som støtter MCP, kan være spilleder, også lokale.

Vi spiller og tester med **Claude Code**. **Codex** er koblet til og kontrollert, men ingen hel kampanje er spilt med den ennå. `init` setter også opp **Gemini CLI**. Kampanjen skrur av agentens eget minne: spillet bor i filene, slik at det å gå tilbake til et lagret spill virkelig går tilbake.

### 2.5 Den første chatten

Skriv hva som helst, for eksempel *Hei! La oss begynne.* I det første svaret i hver chat gir spillederen deg **lenken til dashbordet ditt**, noe sånt som `http://127.0.0.1:4750`. Åpne den og ha den ved siden av chatten.

Mellom spillederens meldinger viser agenten din verktøyene den bruker. Ikke åpne detaljene deres (i Claude Code, ctrl+o), for de kan vise hemmeligheter.

En ny kampanje går gjennom tre trinn, vist øverst på dashbordet: **1 Innstillinger** (hvordan du vil spille), **2 Sesjon null** (du lager karakteren din, i selve spillet), **3 Spill**.

### 2.6 Innstillinger: velg hvordan du vil spille

Spillederen spør bare om det som fortsatt mangler, noen få spørsmål om gangen. Trinnet **Innstillinger** på dashbordet viser de samme spørsmålene som kort. Skriv «du bestemmer», så velger spillederen. Alt kan endres senere, i chatten eller i **Innstillinger**.

| Innstilling | Hva den bestemmer | Verdier |
|---|---|---|
| **Mentor** | Hvor mye spillederen lærer deg om reglene | av, hint, veiledning |
| **Vanskelighetsgrad** | Hvor hard verden er å spille i | historie, lett, normal, vanskelig, brutal |
| **Dødelighet** | Hva det betyr å falle i en kamp | fortellende (aldri død), episk (bare når det teller), terninger |
| **Lagrede spill** | Når du kan gå tilbake | permadød, sjekkpunkt, fritt ([3.8](#38-saves-and-going-back)) |
| **Strenghet** | Hvor nøye mat, lys og reiser følger reglene | smidig, regler, simulering |
| **Terninger** | Hvem som kaster terningene dine | digitale, fysiske |
| **Måleenheter** | Avstander og vekter | metriske, imperiske |
| **Stemmer** | Hvem som snakker for karakterene du møter: i viktige øyeblikk selve karakteren, som bare vet det den vet, slik spillederen velger; alltid spillederen; eller alltid selve karakteren, for de viktigste eller for alle, tregere og dyrere, der AI-appen din kan det | auto, spilleder, viktige, alltid |
| **Følgesvenner** | Hvem som reiser sammen med deg | ingen, laget sammen med deg, laget av spillederen, møtt i spillet |
| **Bilder** | Bilder av steder, oppdrag og de du møter | ingen, på forespørsel, nye steder, oppdrag og de du møter ([3.11](#311-pictures)) |
| **Linjer** og **Slør** | Det som aldri dukker opp, og det som bare skjer utenfor scenen | lister |
| **Språk** | Språket i spillet og på dashbordet | alle |

Femte utgave legger til **utvikling**: erfaringspoeng eller milepæler.

Hvis det ikke finnes en ferdig skrevet verden, spør spillederen også om en **premiss** (sjanger, tone, noen få elementer, med dine ord) og om **forberedelsen**: bygge verden underveis, mens dere spiller, eller alt på forhånd.

**Spillederens stil** blir aldri spurt om, men du kan endre den i chatten eller i **Innstillinger**: **prosaen** (enkel, litterær, pulp, ironisk), **historiene** spillederen finner på (situasjoner, buer, episoder, mysterium), en forfatter å **skrive som**, eller noe helt annet **med dine egne ord**.

### 2.7 Sesjon null: karakteren din

Du lager karakteren sammen med spillederen, som rundt et bord. Hvert valg er ditt, med mindre du ber spillederen ta det: kom med en full idé, en vag en, eller ingenting. Spillederen forteller deg hvordan egenskapspoeng lages før noen terning blir kastet. Du må aldri ha en bakgrunnshistorie. Gir du en, skriver spillederen den med dine ord. Så ber spillederen om et bilde av karakteren din ([3.7](#37-your-characters-story-and-picture)). RPG Engine regner ut karakterarket: du slipper å gjøre noe regnestykke selv.

---

## 3. Spille <!-- icon: chat -->

### 3.1 Å snakke med spilleder

Skriv hva karakteren din gjør eller sier, med dine egne ord:

> Jeg spør vertshusverten hvem andre som kom innom i kveld.

Skal du si noe utenfor historien, skriv det i hakeparenteser: *[Hvordan fungerer grappling?]* Spilleder svarer også i hakeparenteser.

Du sier hva du prøver. Spilleder sier hva som skjer. Spilleder bestemmer aldri for karakteren din, og snakker aldri om selve motoren. Du kan spørre spilleder om hvordan du bruker dashbordet.

### 3.2 Kast

Spilleder ber om et kast bare når utfallet er uvisst og betyr noe, og sier først hva som står på spill. Deretter:

- **På dashbordet** viser et banner en knapp for hver prøve, for eksempel *Acrobatics +4 · with advantage*. Klikk på den: terningene faller på siden, og spilleder får vite resultatet. Du kan også klikke på linjen på karakterarket som lyser, kaste terningene fra terningbrettet eller skrive noe annet i banneret.
- **For hånd**, i hjørnet av banneret eller i **Innstillinger**: banneret forteller hva du skal kaste, og du kaster det fra karakterarket eller terningbrettet.
- **Fysiske terninger**, når terningvalget står på fysiske: du skriver tallet du kastet, *[Jeg kastet 14.]*, og RPG Engine legger til modifikatorene dine.

**Frie kast**: klikk på et hvilket som helst tall på karakterarket, eller åpne terningbrettet, for å kaste for moro skyld. De teller aldri, og spilleder ser dem aldri.

**Spillederens kast** vises i kastkolonnen din, bortsett fra de hemmelige. Du kan alltid spørre *[Var det kastet ekte?]*: for et hemmelig kast gir spilleder et fingeravtrykk som beviser at kastet ble gjort før du spurte.

### 3.3 Scener og kamper

Historien går i **scener**: en kamp, en samtale, utforsking, reise, en hvile. Ved slutten av hver scene lagrer spillet av seg selv, og scenen havner i dagboken din.

I en kamp forteller spilleder om hver tur som ikke er din, og stopper der du kan bestemme. **Scene** viser øverst hvem sin tur det er og hvem som kommer etter, og karakterens kort ved siden av kartet. Turrekkefølgen, hit points for gruppen din og hvor skadet fiendene ser ut, i ord, står ved siden av siden. Hvis karakteren din faller, vises dødsredningskastene store på siden.

### 3.4 Tid, reise og verden som beveger seg

RPG Engine holder styr på datoen. Det går ingen tid mellom sesjoner. Si at dere hviler, *Vi tar en lang hvile*, så gir hvilen tilbake det den skal. Si hvor dere drar, *Vi tar veien nordover til Rocca*, så regner RPG Engine ut veien, avstanden og dagene, og stopper når noe skjer underveis. Penger telles i spillets mynter, med vekslepenger.

Skurker har planer med frister. Hver nye dag flytter spilleder de truslene som tiden har rykket videre, og du ser tegnene på dem, aldri selve klokken.

### 3.5 Kart

**Verden** viser stedene karakteren din kjenner, veiene mellom dem og sporet du har gått, med tåke over resten. **Scene** viser kartet over stedet der du er, når det har et, med hvem som står hvor. I en kamp, på din tur, er rutene du ikke kan nå, tilslørt. Når spilleder spør hvor du flytter deg, trykk på en rute eller skriv den, for eksempel *E4*.

### 3.6 Oppdrag, dagbok og notater

En oppgave karakteren din tar på seg, blir et oppdrag i **Dagbok**, med mål, frist og det den måler. Merk det med stjerne for å ha det i sikte øverst i Scene. Dagboken forteller også **historien** din, scene for scene, og holder på **notatene** dine: de er private, med mindre du **Del**er et. Spilleder oppfatter det som noe du tenker, aldri som et faktum.

### 3.7 Karakterens historie og bilde

På karakterarket har kortet **Beskrivelse** et felt for karakterens historie: spilleder skriver den inn etter at du har sagt ja. For et bilde kan du gi spilleder en fil (PNG, JPEG, WebP eller SVG, opptil 5 MB) sammen med hvor den ligger på datamaskinen din, eller du kan få laget et portrett ([3.11](#311-pictures)): *[Lag et portrett av meg: grått hår i flette, et arr på haken.]*

### 3.8 Lagrede spill og å gå tilbake

RPG Engine lagrer hele kampanjen ved slutten av hver scene. Innstillingen **lagrede spill** avgjør resten:

| Lagrede spill | Lagre når du vil | Gå tilbake |
|---|---|---|
| **permadeath** | nei | aldri |
| **checkpoint** | nei | til siste lagrede spill, bare når karakteren din dør |
| **free** | ja | til et hvilket som helst lagret spill |

I alle moduser kan du **begynne på nytt**, fra starten av spillet eller fra sesjon null. Gjør det i chatten eller i **Lagrede spill**.

Etter at du har gått tilbake, **åpne en ny chat**: den gamle husker det som er angret. Skriv *fortsett* i den nye chatten, og trykk deretter på **Jeg har åpnet en ny chat** i Lagrede spill.

### 3.9 Sesjoner: å stoppe og komme tilbake

Stopp når du vil: *[La oss stoppe her for i kveld.]* Alt er allerede lagret i filene. For å komme tilbake starter du agenten din i kampanjemappen og skriver *fortsett*: spilleder gir deg en kort oppsummering og går videre.

### 3.10 Spillederens humør

Roboten øverst på dashbordet er spilleder: ansiktet følger tonen i historien, og røper aldri det du ikke vet ennå. Når chatten er lukket, sover den.

### 3.11 Bilder

RPG Engine kan lage bilder av stedene du kommer til, oppdragene du tar på deg og dem du møter, slik innstillingen **bilder** sier, og et portrett av karakteren din når du ber om det. Det bruker det som finnes på datamaskinen din, med din egen pålogging: **Codex** maler dem, ellers tegner **Claude Code** dem. **Innstillinger** viser om denne datamaskinen kan lage dem, og hvordan du setter det opp hvis ikke. Du kan alltid gi spilleder et eget bilde.

### 3.12 Trygghet: linjer, slør og stopp

**Linjer** dukker aldri opp i spillet, og **slør** skjer bare utenfor scenen. Skriv *[stopp]* når som helst: spilleder dropper det innholdet med en gang og legger det til i linjene dine.

### 3.13 Å skifte mening

Alle innstillinger kan endres, i chatten eller i **Innstillinger**. En avgjørelse spilleder tar uten regelboken, blir en **presedens**, slik at det samme spørsmålet får det samme svaret neste gang.

---

## 4. Dashbordet <!-- icon: party -->

En side på din egen datamaskin, som bare kan åpnes i nettleseren på den datamaskinen, og som er levende mens chatten er åpen. Når chatten lukkes, viser den *Not connected*. Den kommer tilbake av seg selv med neste chat.

- **Gruppe**: karakterarket ditt og følgesvennenes. Klikk på et tall for å kaste det, og hold over det for å se hvor det kommer fra. Ved siden av står kastene.
- **Scene**: hvor du er, bildet og kartet, hvem som er der, hva som skjer. I en kamp vises turene og karakterens kort.
- **Dagbok**: oppdrag, historien, notatene dine.
- **Verden**: verdenskartet slik karakteren din kjenner det.
- **Terningbrettet**: velg terninger og en modifikator, og kast.
- **Lagrede spill**, **Hjelp**, **Innstillinger** og **Om**, som ikoner ytterst i raden. Innstillinger rommer også sidens egne valg: tema, terningslyd, terningsett.

Når spilleder spør deg om noe, blir banneret stående øverst, uansett hvilken del du er i.

---

## 5. Spillsystemer og husregler <!-- icon: dice -->

### 5.1 Hva et spillsystem er

Dataene til ett spill: karakterarket, tallene, skapningene, gjenstandene, trylleformlene og regelteksten. Hver kampanje spiller ett system. RPG Engine regner ut karakterarket og det som brukes og kommer tilbake. Hvordan en egenskap virker, leser spillederen i reglene og avgjør, som rundt et bord.

### 5.2 Femte utgave, inkludert

Rasene, klassene, underklassene, en bakgrunn og en ferdighet (feat) fra SRD 5.1. De 319 trylleformlene, våpnene, rustningene, magiske gjenstandene og monstrene. Regelkapitlene, som spillederen leser etter deres eksakte tekst. Det fullstendige karakterarket, utregnet.

Du kan også spille innhold som SRD-en mangler, fra en bok du eier: spillederen skriver det som sider i kampanjen din, og RPG Engine behandler dem som sine egne. RPG Engine leveres bare med åpent innhold. Det spillederen kjenner til, er ikke begrenset.

### 5.3 Husregler og egne tillegg

Spør spillederen: *[Husregel: en naturlig 1 på et angrep betyr at du mister våpenet.]* Spillederen beholder den som en avtale ved bordet, eller skriver en side eller et tall på karakterarket når det trengs. Husregler som allerede er skrevet ut, kan legges som tekstfiler i kampanjens `rules`-mappe.

### 5.4 Legge til eller importere ditt eget spillsystem

Ikke ennå: i dag spiller RPG Engine bare femte utgave ([Kommer senere](#9-coming-later)).

---

## 6. Utvidelser <!-- icon: plus -->

Ikke ennå. En utvidelse vil legge til noe i en kampanje oppå spillsystemet: en verden, et eventyr, en funksjon som været, husregler å dele.

---

## 7. Hvor en kampanje kommer fra, og språket <!-- icon: world -->

### 7.1 Tre måter å få en verden på

- **Laget underveis**: ut fra premissen din bygger spillederen hvert sted, hver person og hvert plott rett før du trenger det, og beholder det.
- **Forberedt i starten**: det samme, med verden bygget før spillet.
- **Fra ditt eget eventyr**: gi spillederen en tekst eller en PDF og be om å sette det opp, *[Sett opp dette eventyret som kampanjen vår. Ikke fortell meg noe av det som står i det.]* Spillederen skriver stedene, karakterene og hemmelighetene. Det finnes ingen importknapp ennå.

En kampanje spilles én gang: for å spille det samme eventyret igjen, opprett en ny kampanje.

### 7.2 Språk

Ett språk per kampanje, spillederens, som dashbordet følger. Dashbordet leveres med 26 språk. Alle andre blir oversatt på datamaskinen din av Codex eller Claude Code, eller, uten dem, av spillederen i chatten. Begrepene i femte utgave på italiensk kommer fra den offisielle italienske SRD-en. Regelteksten forblir på engelsk, og spillederen forteller den på ditt språk.

---

## 8. For nysgjerrige: kampanjemappen <!-- icon: list -->

Du trenger aldri å åpne den, og den inneholder hemmelighetene i kampanjen din. Den har `campaign.yaml` (innstillingene dine), `state.yaml` (hvor spillet står), `world/` (én markdown-side for hver karakter, hvert sted, hvert oppdrag og alt det andre), `rules/` (dine egne husregler), `images/`, `log.jsonl` (hver endring), `.saves/`, `.player/` (notatene dine) og de små filene som forteller AI-agenter hvor RPG Engine er. Sidene bruker Obsidians format. Hvis du endrer en side for hånd, får spilleder vite om det i neste svar.

RPG Engine holder seg i denne mappen: Programmet leser og skriver spillet bare her, og rører aldri de andre filene dine. Utenfor mappen har det bare en egen datamappe (oversettelsene til dashbordet, og Codex eller Claude Code hvis du lar det installere dem) og midlertidige mapper mens et bilde blir tegnet. Alt annet agenten din vil gjøre på datamaskinen din, spør den deg om først.

Hver kommando spilleder bruker, kan du også kjøre i kampanjemappen: `rpg --help` viser dem. Mange av dem skriver ut hemmelighetene i kampanjen.

---

## 9. Kommer senere <!-- icon: hourglass -->

- **Du som spilleder**, med AI-en som spiller gruppen.
- **Forfattermodus**: skriv et eventyr med AI-en, eksporter det og del det.
- **Flere spillere på samme datamaskin**, hver med sin egen karakter, som bytter på i samme chat.
- **Utvidelser**: innstillinger, eventyr, funksjoner og husregler.
- **Import** av manualene og eventyrene dine.
- **Andre spill**: flere spillsystemer, og dine egne.

---

## 10. Spørsmål og problemer <!-- icon: info -->

### Spørsmål

**Må jeg kunne reglene?** Nei. Velg mentoren med veiledning, og spør mellom hakeparenteser når du vil.

**Kan spillederen jukse?** Spillederen kan ikke endre et kast RPG Engine har gjort, unntatt på vanskelighetsgraden fortelling, og heller ikke fakta som allerede er fastsatt.

**Koster det noe?** RPG Engine er gratis. Spillederen kjører på agentens abonnement, eller på din egen datamaskin med en lokal modell. En spillkveld er en lang chat: på de minste abonnementene kan du nå grensen for abonnementet før kvelden er over. Bilder og oversettelser bruker det samme abonnementet.

**Kan jeg spille på telefonen?** Nei: spillederen kjører på datamaskinen din, og dashbordet åpnes bare der.

**Kan jeg spille med venner?** Ikke ennå: i dag én spiller, én karakter, pluss følgesvenner ([Kommer senere](#9-coming-later)).

**Kan jeg bruke en annen AI neste gang?** Ja: åpne kampanjen i en annen agent og skriv *fortsett*.

### Problemer

**Dashbordet åpner seg ikke.** Spør spillederen: `[Hva er lenken til dashbordet?]`. Det fungerer bare mens en chat er åpen i den kampanjen, etter spillederens første svar.

**Spillederen ser ikke ut til å kunne spillet.** Agenten din lastet ikke RPG Engine. Sjekk at du startet den i kampanjemappen og stolte på den. I Claude Code, skriv `/mcp` og koble til `rpg` på nytt. I Codex må `codex mcp list` i kampanjemappen vise `rpg`. Hvis `rpg --version` ikke blir funnet, installer RPG Engine på nytt ([2.2](#22-install)).

**Oppdatering.** Kjør `npm install -g rpg-engine` på nytt, og åpne så en ny chat: en spilleder som allerede kjører, beholder versjonen den startet med.

**Spillederen husker noe jeg angret.** Åpne en ny chat og trykk på **Jeg har åpnet en ny chat** i Lagrede spill.

**Ingen bilder vises.** Innstillinger > Bilder viser om denne datamaskinen kan lage dem, og hvordan.

**Installeringen mislykkes, eller `rpg` vil ikke starte.** `node --version` må vise 22 eller nyere. På Windows, hold RPG Engine og kampanjene dine unna stier som inneholder `&`.

**Dashbordlenken endret seg.** Et annet program tok den vanlige adressen. Spillederen gir deg den nye lenken.
