<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb df1364a2 8fd6b933 75985e6d ece214f0 8c9f41da 17577253 f699a840 241f6611 59c1a762. Change the English, then run it again. -->
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
- **Node.js 22** eller nyere, fra [nodejs.org](https://nodejs.org). Den kommer med `npm`, som installerer RPG Engine.
- En **terminal**: på Windows Terminal eller PowerShell, på macOS Terminal. For å åpne en terminal i en mappe høyreklikker du på mappen og velger **Åpne i Terminal** (Windows) eller **Tjenester > Ny terminal i mappen** (macOS).
- En **AI-agent** til spilleder ([2.4](#24-connect-your-ai)), med den **største modellen** den tilbyr. En liten modell er lettere å lure til å avsløre hemmeligheter eller bøye reglene.

### 2.2 Installer

```text
npm install -g rpg-engine
```

`rpg --version` sjekker at det gikk bra. Du bruker `rpg` én gang per kampanje, for å lage den. Etter det starter agenten din RPG Engine av seg selv.

### 2.3 Lag en kampanje

Åpne en terminal i mappen der du har spillene dine ([2.1](#21-what-you-need) forklarer hvordan):

```text
rpg init "The Salt Isles"
```

Dette lager mappen `The Salt Isles` med en ny kampanje i. Gå inn i den med `cd "The Salt Isles"`. Husk hvor den ligger: du kommer tilbake hit hver gang du spiller. Alt annet velger du senere, i chatten eller på dashbordet. `rpg init --help` viser valgene du kan ta med en gang, for eksempel `--language it` eller `--difficulty hard`.

Spilleder kan ikke lage en kampanje for deg: før `init` er det ingenting som forteller agenten din hvor RPG Engine er.

### 2.4 Koble til AI-en din

Spilleder kjører i en **AI-agent**: en AI-app, i terminalen eller på skrivebordet, som kan arbeide med filene på datamaskinen din, for eksempel Claude Code eller Codex. En vanlig chat som claude.ai eller ChatGPT, eller en mobilapp, er ikke nok: spilleder må komme til kampanjens filer på datamaskinen din. Hver agent trenger sitt eget abonnement og sin egen innlogging: Claude Code et betalt Claude-abonnement, Codex en ChatGPT-innlogging. Du installerer agenten én gang, fra dens egen side: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: skriv `claude` i kampanjemappen. Når den spør om du stoler på mappen, velger du **Yes, I trust this folder**. Pass på: svaret som er valgt på forhånd, er *No, exit*. Kampanjen har også en liten hook, `rpg --listen`, som spørsmålet ikke viser: den forteller spilleder med en gang når du gjør noe fra dashbordet.
- **Codex**: skriv `codex` i kampanjemappen, og si ja når den spør om du stoler på mappen. I skrivebordsappen sjekker du i innstillingene at minner er av for spillets chatter.
- **En annen agent**: start den i kampanjemappen og gi den MCP-serveren `rpg mcp`. RPG Engine er en standard MCP-server: enhver agent som støtter MCP, kan være spilleder, også lokale.

Vi spiller og tester med **Claude Code**. **Codex** er koblet til og kontrollert, men ingen hel kampanje er spilt med den ennå. Kampanjen slår av agentens eget minne: spillet bor i filene, slik at et lagret spill virkelig tar deg tilbake.

### 2.5 Den første chatten

Skriv hva som helst, for eksempel *Hei! La oss starte.* I det første svaret i hver chat gir spilleder deg **lenken til dashbordet ditt**, noe slikt som `http://127.0.0.1:4750`. Åpne den og ha den ved siden av chatten.

Mellom spillederens meldinger viser agenten verktøyene den bruker. Ikke åpne detaljene deres (i Claude Code, ctrl+o), for de kan vise hemmeligheter.

En ny kampanje går gjennom tre trinn, vist øverst på dashbordet: **1 Innstillinger** (hvordan du vil spille), **2 Sesjon null** (du lager karakteren din, i spillet), **3 Spill**.

### 2.6 Innstillinger: velg hvordan du spiller

Spilleder spør bare om det som fortsatt mangler, noen få spørsmål om gangen. Trinnet **Innstillinger** på dashbordet viser de samme spørsmålene som kort. Skriv «du bestemmer», så velger spilleder. Alt kan endres senere, i chatten eller i **Innstillinger**.

| Innstilling | Hva den bestemmer | Verdier |
|---|---|---|
| **Mentor** | Hvor mye spilleder lærer deg om reglene | av, hint, veiledning |
| **Vanskelighetsgrad** | Hvor hard verdenen er å spille i | historie, lett, normal, vanskelig, brutal |
| **Dødelighet** | Hva det betyr å falle i en kamp | fortellende (aldri død), episk (bare når det teller), terninger |
| **Lagrede spill** | Når du kan gå tilbake | permadød, sjekkpunkt, ledig ([3.8](#38-saves-and-going-back)) |
| **Strenghet** | Hvor nøye mat, lys og reiser følger reglene | smidig, regler, simulering |
| **Terninger** | Hvem som kaster terningene dine | digitale, fysiske |
| **Måleenheter** | Avstander og vekter | metriske, imperiale |
| **Stemmer** | Hvem som snakker for karakterene du møter: i sentrale øyeblikk karakteren selv, som bare vet det karakteren vet, slik spilleder velger; alltid spilleder; eller alltid karakteren, for de viktigste eller for alle, tregere og dyrere, der AI-appen din kan det | auto, spilleder, viktige, alltid |
| **Følgesvenner** | Hvem som reiser med deg | ingen, laget sammen med deg, laget av spilleder, møtt i spillet |
| **Bilder** | Bilder av steder, oppdrag og de du møter | ingen, på forespørsel, nye steder, oppdrag og de du møter ([3.11](#311-pictures)) |
| **Linjer** og **Slør** | Det som aldri dukker opp, og det som bare skjer utenfor scenen | lister |
| **Språk** | Språket i spillet og på dashbordet | hvilket som helst |

Femte utgave legger til **utvikling**: erfaringspoeng eller milepæler.

Hvis det ikke finnes en skrevet verden, spør spilleder også om en **premiss** (sjanger, tone, noen få elementer, med dine egne ord) og om **forberedelsen**: bygge verdenen underveis, mens dere spiller, eller alt i starten.

**Spillederens stil** blir aldri spurt om, men du kan endre den i chatten eller i **Innstillinger**: **prosaen** (enkel, litterær, pulp, tørr), **historiene** spilleder finner på (situasjoner, buer, episoder, mysterium), en forfatter å **skrive som**, eller hva som helst annet **med dine ord**.

### 2.7 Sesjon null: karakteren din

Du lager karakteren din sammen med spilleder, som ved et bord. Alle valg er dine, med mindre du ber spilleder ta dem: kom med en full idé, en vag idé eller ingenting. Spilleder forteller hvordan egenskapspoengene lages før noen terning kastes. Historien til karakteren er aldri påkrevd. Hvis du gir en, skriver spilleder den med dine ord. Deretter ber spilleder om et bilde av karakteren din ([3.7](#37-your-characters-story-and-picture)). RPG Engine regner ut karakterarket: du slipper å gjøre noe regnestykke.

---

## 3. Å spille <!-- icon: chat -->

### 3.1 Å snakke med spilleder

Skriv hva karakteren din gjør eller sier, med dine egne ord:

> Jeg spør vertshusverten hvem andre som kom innom i kveld.

Utenfor historien skriver du mellom hakeparenteser: *[Hvordan fungerer det å gripe tak i noen?]* Spilleder svarer også i hakeparenteser.

Du sier hva du prøver. Spilleder sier hva som skjer. Spilleder bestemmer aldri for karakteren din, og snakker aldri om motoren. Du kan spørre spilleder hvordan dashbordet brukes.

**Å handle fra dashbordet**: klikk på et navn på karakterarket, for eksempel et våpen, en trylleformel eller noe du bærer, og deretter på hvem det gjelder. Du kan også klikke på en person for å snakke med vedkommende. Dashbordet skriver setningen din, *Jeg angriper Hettekledd banditt 1 med køllen.*, og du kan endre den før **Si til spilleder**. Spilleder hører den som om den var sagt i chatten, og avgjør den som alt annet. Der AI-appen din ikke kan høre den selv, gjør **Kopier** den klar til å limes inn i chatten.

### 3.2 Kast

Spilleder ber om et kast bare når utfallet er usikkert og har betydning, og sier først hva som står på spill. Så:

- **På dashbordet** viser et banner en knapp for hver prøve, for eksempel *Akrobatikk +4 · med vantage*. Klikk på den: terningene faller på siden, og spilleder hører resultatet. Du kan også klikke på linjen på karakterarket som lyser, kaste terningene fra terningbrettet, eller skrive noe annet i banneret.
- **For hånd**, i hjørnet av banneret eller i **Innstillinger**: banneret forteller hva du skal kaste, og du kaster det fra karakterarket eller terningbrettet.
- **Fysiske terninger**, når innstillingen Terninger står på fysiske: du skriver tallene du kastet, *[Jeg kastet 14.]*, og RPG Engine legger til modifikatorene dine.

**Frie kast**: klikk på et hvilket som helst tall på karakterarket, eller åpne terningbrettet, for å kaste for moro skyld. De teller aldri, og spilleder ser dem aldri.

**Spillederens kast** vises i kastkolonnen din, bortsett fra de hemmelige. Du kan alltid spørre *[Var det kastet ekte?]*: for et hemmelig kast gir spilleder et fingeravtrykk som beviser at det ble gjort før du spurte.

### 3.3 Scener og kamper

Historien går i **scener**: en kamp, en samtale, utforsking, reise, en hvile. Ved slutten av hver scene lagres spillet av seg selv, og scenen havner i dagboken din.

I en kamp forteller spilleder om hver tur som ikke er din, og stopper der du kan bestemme. **Scene** viser øverst hvem sin tur det er og hvem som kommer etterpå, og karakterens kort ved siden av kartet. Turrekkefølgen, gruppens treffpoeng og hvor skadet fiendene ser ut, i ord, står ved siden av siden. Hvis karakteren din faller, vises redningskastene mot døden store på siden.

### 3.4 Tid, reiser og verdenen som beveger seg

RPG Engine holder styr på datoen. Det går ingen tid mellom sesjonene. Si at dere hviler, *Vi tar en lang hvile*, og når spilleder går med på det, gir hvilen tilbake det den skal. I en kort hvile kan spilleder spørre på dashbordet hvor mange treffterninger du bruker: kast dem én og én, se hva hver av dem helbreder, og stopp når du vil. Si hvor dere drar, *Vi tar veien nordover til Rocca*, så regner RPG Engine ut veien, avstanden og dagene, og stopper når noe skjer underveis. Penger telles i spillets mynter, med vekslepenger.

Skurker har planer med frister. Hver nye dag flytter spilleder truslene som tiden har rykket fram, og du ser tegnene på dem, aldri selve klokken.

### 3.5 Kart

**Verden** viser stedene karakteren din kjenner, veiene mellom dem og sporet du har gått, med tåke over resten. **Scene** viser kartet over stedet der du er, når det har et, med hvem som står hvor. I en kamp, på din tur, er rutene du ikke kan nå, tilslørt. Når spilleder spør hvor du flytter deg, trykker du på en rute, eller skriver den, for eksempel *E4*.

### 3.6 Oppdrag, dagbok og notater

En oppgave karakteren din tar på seg, blir et oppdrag i **Dagbok**, med mål, frist og det den måler. Sett stjerne på det for å ha det i sikte øverst i Scene. Dagboken forteller også **historien** din, scene for scene, og rommer **notatene** dine: private, med mindre du **Del**er ett, som spilleder hører som det du tenker, aldri som et faktum.

### 3.7 Karakterens historie og bilde

På karakterarket har kortet **Beskrivelse** et felt for karakterens historie: spilleder skriver den inn, etter at du har sagt ja. For et bilde gir du spilleder en fil (PNG, JPEG, WebP eller SVG, opptil 5 MB) med stedet den ligger på datamaskinen din, eller du kan få laget et portrett ([3.11](#311-pictures)): *[Lag et portrett av meg: grått hår i en flette, et arr på haken.]*

### 3.8 Lagrede spill og å gå tilbake

RPG Engine lagrer hele kampanjen ved slutten av hver scene. Innstillingen **Lagrede spill** bestemmer resten:

| Lagrede spill | Lagre når du vil | Gå tilbake |
|---|---|---|
| **permadød** | nei | aldri |
| **sjekkpunkt** | nei | til det siste lagrede spillet, bare når karakteren din dør |
| **ledig** | ja | til et hvilket som helst lagret spill |

I alle moduser kan du **begynne på nytt**, fra starten av spillet eller fra sesjon null. Gjør det i chatten eller i **Lagrede spill**.

Etter at du har gått tilbake, **åpne en ny chat**: den gamle husker det som ble angret. Skriv *fortsett* i den nye chatten, og trykk deretter på **Jeg har åpnet en ny chat** i Lagrede spill.

### 3.9 Sesjoner: å stoppe og komme tilbake

Stopp når du vil: *[La oss stoppe her for i kveld.]* Alt er allerede lagret i filene. For å komme tilbake starter du agenten din i kampanjemappen og skriver *fortsett*. Spilleder gir deg en kort oppsummering og går videre.

### 3.10 Spillederens humør

Roboten øverst på dashbordet er spilleder: ansiktet følger tonen i historien, og avslører aldri det du ikke vet ennå. Når chatten er lukket, sover den.

### 3.11 Bilder

RPG Engine kan få laget bilder av stedene du kommer til, oppdragene du tar og de du møter, slik innstillingen **Bilder** sier, og et portrett av karakteren din når du ber om det. Den bruker din egen Codex eller Claude Code, med din innlogging, på ditt abonnement og dets grenser: **Codex** maler dem, ellers tegner **Claude Code** dem. **Innstillinger** sier om denne datamaskinen kan lage dem, og hvordan du setter det opp hvis ikke. Du kan alltid gi spilleder et bilde du har selv.

### 3.12 Trygghet: linjer, slør og stopp

**Linjer** dukker aldri opp i spillet. **Slør** skjer bare utenfor scenen. Skriv *[stopp]* når som helst: spilleder dropper det innholdet med en gang og legger det til i linjene dine.

### 3.13 Å ombestemme seg

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

Dataene til ett spill: karakterarket, tallene, skapningene, gjenstandene, trolldommene og regelteksten. Hver kampanje spiller ett system. RPG Engine regner ut karakterarket og hva som brukes og kommer tilbake. Hvordan en egenskap virker, leser spilleder i reglene og avgjør, som ved et bord.

### 5.2 Femte utgave, inkludert

Rasene, klassene, subklassene, en bakgrunn og en egenskap (feat) fra SRD 5.1. Dessuten de 319 trolldommene, våpnene, rustningene, de magiske gjenstandene og monstrene, regelkapitlene, som spilleder leser ordrett, og det fullstendige karakterarket, utregnet.

Du kan også spille innhold som SRD-en ikke har, fra en bok du eier. Spilleder skriver det som sider i kampanjen din, og RPG Engine behandler dem som sine egne. RPG Engine leveres bare med åpent innhold. Det spilleder kjenner til, er ikke begrenset.

Dine egne håndbøker kan bli biblioteket ditt. Fortell spilleder hvor de er, *[Håndbøkene mine ligger i D:\Books\5e.]*, eller legg til mappen deres i Packages › Library, og si ja i vinduet datamaskinen viser, én gang. RPG Engine leser dem på denne datamaskinen. Hver kampanje bruker mappene du slår på der, og spilleder søker i dem når en regel skal avgjøres, etter SRD-en, og oppgir boken og siden. De leses best som tekst eller som PDF-er der teksten kan markeres. En skannet PDF leses fra bildene av sidene, bare på Windows, på noen minutter og med noen feil. RPG Engine endrer aldri håndbøkene dine, sender aldri teksten deres noe sted og kopierer den aldri inn i en kampanje.

### 5.3 Husregler og egne tillegg

Spør spilleder: *[Husregel: en naturlig 1 på et angrep betyr at du mister våpenet.]* Spilleder tar vare på den som en avtale ved bordet, eller skriver en side eller et tall på karakterarket når det trengs. Husregler som allerede er skrevet ut, kan legges som tekstfiler i kampanjens `rules`-mappe.

### 5.4 Legge til eller importere ditt eget spillsystem

Ikke ennå: i dag spiller RPG Engine bare femte utgave ([Kommer senere](#9-coming-later)).

---

## 6. Utvidelser <!-- icon: plus -->

Ikke ennå. En utvidelse vil legge til noe i en kampanje oppå spillsystemet: en verden, et eventyr, en funksjon som været, husregler å dele.

---

## 7. Hvor en kampanje kommer fra, og språket <!-- icon: world -->

### 7.1 Tre måter å få en verden på

- **Laget underveis**: ut fra premissen din bygger spillederen hvert sted, hver person og hvert plott rett før du trenger det, og husker det.
- **Forberedt i starten**: det samme, men med verden bygget før spillet.
- **Fra ditt eget eventyr eller din egen bok**: gi spillederen filen, *[Importer dette eventyret som kampanjen vår: D:\Books\adventure.pdf. Ikke fortell meg noe av det som står i det.]* Det leses best som tekst, en EPUB, et Word-dokument eller en PDF der teksten kan markeres. En skannet PDF leses fra bildene av sidene, bare på Windows, sakte og med noen feil. Din egen Codex eller Claude Code leser den utenfor chatten, ellers spilleder i chatten, på abonnementet ditt: hele dokumentet går til OpenAI eller Anthropic, under vilkårene for kontoen din og dens valg om trening. Dashbordet viser hvor langt det har kommet. Fra en roman foreslår spillederen hvor dere kan begynne. Spillederen skriver stedene, karakterene og hemmelighetene.

En kampanje spilles én gang: for å spille det samme eventyret igjen, opprett en ny kampanje.

### 7.2 Språk

Ett språk per kampanje, spillederens, som dashbordet følger. Dashbordet leveres med 26 språk. Alle andre oversettes på datamaskinen din av Codex eller Claude Code, eller, uten dem, av spillederen i chatten. Termene fra femte utgave på italiensk kommer fra den offisielle italienske SRD-en. Regelteksten forblir på engelsk, og spillederen forteller den på ditt språk.

---

## 8. For de nysgjerrige: kampanjemappen <!-- icon: list -->

Du trenger aldri å åpne den, og den inneholder hemmelighetene i kampanjen din. Den har `campaign.yaml` (innstillingene dine), `state.yaml` (hvor spillet står), `world/` (én markdown-side for hver karakter, hvert sted, hvert oppdrag og alt annet), `rules/` (husreglene dine), `images/`, `log.jsonl` (hver endring), `.saves/`, `.player/` (notatene dine) og de små filene som forteller AI-agenter hvor RPG Engine er. Sidene bruker Obsidians format. Hvis du endrer en side for hånd, får spilleder vite det ved neste svar.

RPG Engine holder seg i denne mappen: det leser og skriver spillet bare her, og rører aldri de andre filene dine. Mappene med regelbøkene dine leser det bare. Utenfor mappen har det bare egne datamapper (dashbordets oversettelser, teksten det har lest fra regelbøkene dine, og Codex eller Claude Code hvis du lar det installere dem) og midlertidige mapper mens et bilde tegnes. Alt annet agenten din vil gjøre på datamaskinen din, spør den deg om først.

Hver kommando spilleder bruker, kan også kjøres i kampanjemappen: `rpg --help` lister dem. Mange skriver ut hemmelighetene i kampanjen.

---

## 9. Kommer senere <!-- icon: hourglass -->

- **Du som spilleder**, mens AI-en spiller gruppen.
- **Forfattermodus**: skriv et eventyr sammen med AI-en, og eksporter og del det.
- **Flere spillere på samme datamaskin**, hver med sin egen karakter, som bytter på i den samme chatten.
- **Utvidelser**: innstillinger, eventyr, funksjoner og husregler.
- **Andre spill**: flere spillsystemer, og dine egne.

---

## 10. Spørsmål og problemer <!-- icon: info -->

### Spørsmål

**Må jeg kunne reglene?** Nei. Velg mentor med opplæring, og spør mellom hakeparenteser når du vil.

**Kan spillederen jukse?** Spillederen kan ikke endre et kast RPG Engine har gjort, unntatt på vanskelighetsgrad historie, og heller ikke fakta som allerede er fastsatt.

**Koster det noe?** RPG Engine er gratis. Spillederen kjører på agentens abonnement, eller på din egen datamaskin med en lokal modell. En spillkveld er en lang chat: på de minste abonnementene kan du nå abonnementets grense før kvelden er slutt. Bilder, oversettelser og importer bruker det samme abonnementet. RPG Engine selv bruker aldri en API-nøkkel, som betales per kall: logg agenten din inn med kontoen din, ikke med en nøkkel.

**Kan jeg spille på telefonen?** Nei: spillederen kjører på datamaskinen din, og dashbordet åpnes bare der.

**Kan jeg spille med venner?** Ikke ennå: i dag én spiller, én karakter, pluss følgesvenner ([Kommer senere](#9-coming-later)).

**Kan jeg bruke en annen AI neste gang?** Ja: åpne kampanjen i en annen agent og skriv *fortsett*.

### Problemer

**Dashbordet åpnes ikke.** Spør spillederen: `[Hva er lenken til dashbordet?]`. Det fungerer bare mens en chat er åpen i den kampanjen, etter spillederens første svar.

**Spillederen ser ikke ut til å kunne spillet.** Agenten din lastet ikke RPG Engine. Sjekk at du startet den i kampanjemappen og stolte på den. I Claude Code, skriv `/mcp` og koble til `rpg` på nytt. I Codex må `codex mcp list` i kampanjemappen vise `rpg`. Hvis `rpg --version` ikke blir funnet, installer RPG Engine på nytt ([2.2](#22-install)).

**Oppdatering.** Kjør `npm install -g rpg-engine` på nytt, og åpne deretter en ny chat: en spilleder som kjører, beholder versjonen den startet med.

**Spillederen husker noe jeg angret.** Åpne en ny chat og trykk på **Jeg har åpnet en ny chat** i Lagrede spill.

**Ingen bilder vises.** Innstillinger > Bilder viser om denne datamaskinen kan lage dem, og hvordan.

**Installasjonen mislykkes, eller `rpg` vil ikke starte.** `node --version` må vise 22 eller nyere. På Windows, hold RPG Engine og kampanjene dine unna stier som inneholder `&`.

**Lenken til dashbordet endret seg.** Et annet program tok den vanlige adressen. Spillederen gir deg den nye lenken.
