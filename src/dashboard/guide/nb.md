<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 9f1774ef d90880b0 019e9516 8e136927 7da791ae 8c9f41da 17577253 f699a840 241f6611 59c1a762. Change the English, then run it again. -->
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

| Hvem | Hva gjør de |
|---|---|
| **Du** | Du spiller karakteren din: hva karakteren gjør, sier og prøver. |
| **Spilleder** (AI-en) | Forteller historien, spiller alle andre, bestemmer hva som skjer og ber om kast. |
| **RPG Engine** | Oppbevarer verden i filer, kaster terningene, teller hitpoints, penger, tid og avstander og holder hemmeligheter skjult til du oppdager dem. |

Verden er den samme fra den ene kvelden til den neste, selv i en ny chat, selv med en annen AI:

- **Det som er sagt, forblir sant.** En død skurk forblir død.
- **Terningene er ekte.** Spilleder kan ikke bøye dem, bortsett fra på letteste vanskelighetsgrad, hvis du velger den.
- **Hemmeligheter forblir hemmelige.** Spilleder forteller aldri hva karakteren din ikke vet.
- **Verden beveger seg.** Trusler rykker fram mens du hviler eller reiser, og du ser tegnene på dem.
- **En kampanje er en mappe** på datamaskinen din: stopp når du vil, og ta den opp igjen senere.

Et spill kommer som et spillsystem, en pakke som spilleder installerer for kampanjen din. I dag er vårt **femte utgave**, fra det frie System Reference Document 5.1. Uten spillsystem spiller du fritt, en historie uten tall. Flere kommer ([Kommer senere](#9-coming-later)).

---

## 2. Kom i gang <!-- icon: path -->

### 2.1 Dette trenger du

- En datamaskin med Windows, macOS eller Linux, og en nettleser.
- **Node.js 22** eller nyere, fra [nodejs.org](https://nodejs.org). Det følger med `npm`, som installerer RPG Engine.
- En **terminal**: på Windows Terminal eller PowerShell, på macOS Terminal. For å åpne en terminal i en mappe høyreklikker du mappen og velger **Åpne i Terminal** (Windows) eller **Tjenester > Ny terminal i mappen** (macOS).
- En **AI-agent** til spilleren som skal være spilleder ([2.4](#24-connect-your-ai)), med den **største modellen** den tilbyr: en liten modell lar seg lettere lokke til å avsløre hemmeligheter eller bøye reglene.

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

Dette lager mappen `The Salt Isles` med en ny kampanje i. Gå inn i den med `cd "The Salt Isles"`. Husk hvor den ligger: du kommer tilbake hit hver gang du spiller. Alt annet velger du senere, i chatten eller på dashbordet. `rpg init --help` viser valgene du kan ta med en gang, for eksempel `--language it` eller `--difficulty hard`.

Spilleder kan ikke opprette en kampanje for deg: før `init` er det ingenting som forteller agenten din hvor RPG Engine er.

### 2.4 Koble til AI-en din

Spilleder kjører i en **AI-agent**: en AI-app, i terminalen eller på skrivebordet, som kan arbeide med filene på datamaskinen din, for eksempel Claude Code eller Codex. En vanlig chat som claude.ai eller ChatGPT, eller en app på telefonen, er ikke nok: spilleder må kunne nå kampanjens filer på datamaskinen din. Hver agent trenger sitt eget abonnement og sin egen innlogging: Claude Code et betalt Claude-abonnement, Codex en ChatGPT-innlogging. Du installerer agenten én gang, fra agentens egen side: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: skriv `claude` i kampanjemappen. Når den spør om du stoler på mappen, velger du **Yes, I trust this folder**. Pass på: svaret som er valgt på forhånd, er *No, exit*. Kampanjen har også en liten krok, `rpg --listen`, som spørsmålet ikke viser: den forteller spilleder med en gang når du gjør noe fra dashbordet.
- **Codex**: skriv `codex` i kampanjemappen, og svar ja når den spør om du stoler på mappen. I skrivebordsappen sjekker du i innstillingene at minner er slått av for spillets chatter.
- **En annen agent**: start den i kampanjemappen og gi den MCP-tjeneren `rpg mcp`. RPG Engine er en standard MCP-tjener: alle agenter som støtter MCP kan være spilleder, også lokale.

Vi spiller og tester med **Claude Code**. **Codex** er koblet til og kontrollert, men ingen hel kampanje er spilt med den ennå. Kampanjen slår av agentens eget minne: spillet lever i filene sine, slik at et lagret spill virkelig tar deg tilbake.

### 2.5 Den første chatten

Skriv hva som helst, for eksempel *Hei! La oss begynne.* I det første svaret i hver chat gir spilleder deg **lenken til dashbordet ditt**, noe sånt som `http://127.0.0.1:4750`. Åpne den og ha den ved siden av chatten.

Mellom meldingene fra spilleder viser agenten verktøyene den bruker. Ikke åpne detaljene deres (i Claude Code ctrl+o), for de kan vise hemmeligheter.

En ny kampanje går gjennom tre trinn, vist øverst på dashbordet: **1 Innstillinger** (hvordan du vil spille), **2 Sesjon null** (du lager karakteren din, i spillet), **3 Spill**.

### 2.6 Innstillinger: velg hvordan du vil spille

Spilleder spør bare om det som fortsatt mangler, noen få spørsmål om gangen. Trinnet **Innstillinger** på dashbordet viser de samme spørsmålene som kort. Skriv «du bestemmer», så velger spilleder. Alt kan endres senere, i chatten eller i **Innstillinger**.

| Innstilling | Hva den bestemmer | Verdier |
|---|---|---|
| **Mentor** | Hvor mye spilleder lærer deg om reglene | av, hint, opplæring |
| **Vanskelighetsgrad** | Hvor hard verden er å spille i | historie, lett, normal, hard, brutal |
| **Dødelighet** | Hva det betyr å falle i en kamp | fortellende (aldri dø), episk (bare når det betyr noe), terninger |
| **Lagrede spill** | Når du kan gå tilbake | permadeath, sjekkpunkt, fritt ([3.8](#38-saves-and-going-back)) |
| **Strenghet** | Hvor tett mat, lys og reiser følger reglene | smidig, regler, simulering |
| **Terninger** | Hvem som kaster terningene dine | digitale, fysiske |
| **Måleenheter** | Avstander og vekter | metriske, imperiale |
| **Karakterstemmer** | Hvem som snakker for karakterene du møter, fra spilleder til karakterene: alltid spilleder; i viktige øyeblikk karakteren selv, som bare vet det karakteren vet, slik spilleder velger; eller alltid karakteren, for de viktigste eller for alle, tregere og dyrere, der AI-appen din kan det | spilleder, noen ganger, hovedkarakterer, alle |
| **Følgesvenner** | Hvem som reiser med deg | ingen, laget sammen med deg, laget av spilleder, møtt i spillet |
| **Bilder** | Bilder av steder, oppdrag og de du møter | ingen, på forespørsel, nye steder, oppdrag og de du møter ([3.11](#311-pictures)) |
| **Linjer** og **Slør** | Det som aldri dukker opp, og det som bare skjer utenfor scenen | lister |
| **Språk** | Språket i spillet og på dashbordet | alle |

Femte utgave legger til **avansement**: erfaringspoeng eller milepæler.

Uten en skrevet verden spør spilleder også om en **premiss** (sjanger, tone, noen få elementer, med dine egne ord) og om **forberedelsen**: bygge verden underveis, mens dere spiller, eller alt i starten.

**Spillederens stil** blir aldri spurt om, men du kan endre den i chatten eller i **Innstillinger**: **prosaen** (enkel, litterær, pulp, tørrvittig), **historiene** spilleder finner på (situasjoner, buer, episoder, mysterium), en forfatter å **skrive som**, eller hva som helst annet **med dine egne ord**.

### 2.7 Sesjon null: karakteren din

Du lager karakteren din sammen med spilleder, som ved et bord. Hvert valg er ditt, med mindre du ber spilleder ta det: kom med en full idé, en vag en, eller ingenting. Spilleder forteller deg hvordan egenskapsverdiene lages før noen terning blir kastet. Du trenger aldri å skrive en bakgrunnshistorie. Gir du en, skriver spilleder den med dine ord. Deretter ber spilleder om et bilde av karakteren din ([3.7](#37-your-characters-story-and-picture)). RPG Engine regner ut karakterarket: du slipper å gjøre regnestykkene.

---

## 3. Å spille <!-- icon: chat -->

### 3.1 Å snakke med spillederen

Skriv hva karakteren din gjør eller sier, med dine egne ord:

> Jeg spør vertshusholderen hvem andre som kom innom i kveld.

Utenfor historien skriver du mellom hakeparenteser: *[Hvordan fungerer det å gripe tak i noen?]* Spillederen svarer også i hakeparenteser.

Du sier hva du prøver. Spillederen sier hva som skjer. Spillederen bestemmer aldri for karakteren din, og snakker aldri om motoren. Du kan spørre spillederen hvordan du bruker dashbordet.

**Å handle fra dashbordet**: klikk på et navn på karakterarket, for eksempel et våpen, en trylleformel eller noe du bærer på, og deretter på hvem det gjelder. Du kan også klikke på en person for å snakke med vedkommende. Dashbordet skriver setningen for deg, *Jeg angriper Hooded Bandit 1 med Mace.*, og du kan endre den før du trykker **Si til spilleder**. Spillederen hører den som om den var sagt i chatten, og avgjør den som alt annet du gjør. Hvis AI-appen din ikke kan høre den av seg selv, gjør **Kopier** den klar til å limes inn i chatten.

### 3.2 Kast

Spillederen ber om et kast bare når utfallet er uvisst og har noe å si, og sier først hva som står på spill. Deretter:

- **På dashbordet** viser et banner en knapp for hver prøve, for eksempel *Acrobatics +4 · with advantage*. Klikk på den: terningene faller på siden, og spillederen får høre resultatet. Du kan også klikke på linjen på karakterarket som lyser, kaste terningene fra terningbrettet, eller skrive noe annet i banneret.
- **For hånd**, i hjørnet av banneret eller i **Innstillinger**: banneret forteller deg hva du skal kaste, og du kaster det fra karakterarket eller terningbrettet.
- **Fysiske terninger**, når terninginnstillingen står på fysisk: du skriver tallene du kastet, *[Jeg kastet 14.]*, og RPG Engine legger til modifikatorene dine.

**Frie kast**: klikk på et hvilket som helst tall på karakterarket, eller åpne terningbrettet, for å kaste for moro skyld. De teller aldri, og spillederen ser dem aldri.

**Spillederens kast** vises i kastkolonnen din, bortsett fra de hemmelige. Du kan alltid spørre *[Var det kastet ekte?]*: for et hemmelig kast gir spillederen et fingeravtrykk som beviser at kastet ble gjort før du spurte.

### 3.3 Scener og kamper

Historien går i **scener**: en kamp, en samtale, utforsking, reise, en hvile. Ved slutten av hver scene lagrer spillet seg selv, og scenen havner i dagboken din.

I en kamp forteller spillederen om hver tur som ikke er din, og stopper der du kan bestemme. **Scene** viser øverst hvem sin tur det er og hvem som kommer etterpå, og karakterens kort ved siden av kartet. Turrekkefølgen, gruppens treffpoeng og hvor skadet fiendene ser ut, i ord, står ved siden av siden. Hvis karakteren din faller, vises dødsredningene store på siden.

### 3.4 Tid, reise og verden som beveger seg

RPG Engine holder styr på datoen. Det går ingen tid mellom sesjonene. Si at dere hviler, *Vi tar en lang hvile*, og når spillederen er enig, gir hvilen tilbake det den skal. I en kort hvile kan spillederen spørre på dashbordet hvor mange treffterninger du bruker: kast dem én om gangen, se hvor mye hver av dem leger, og stopp når du vil. Si hvor dere drar, *Vi tar veien nordover til Rocca*, og RPG Engine regner ut veien, avstanden og dagene, og stopper når noe skjer underveis. Penger telles i spillets mynter, vekslepenger inkludert.

Skurker har planer med frister. Hver nye dag flytter spillederen truslene som tiden har fått til å rykke fram, og du ser tegnene på dem, aldri selve klokken.

### 3.5 Kart

**Verden** viser stedene karakteren din kjenner, veiene mellom dem og sporet du har gått, med tåke over resten. **Scene** viser kartet over stedet der du er, når det har et, med hvem som står hvor. I en kamp, på din tur, er rutene du ikke kan nå, tilslørt. Når spillederen spør hvor du flytter, trykk på en rute, eller skriv den, for eksempel *E4*.

**Verden** holder også det karakteren din vet. **Kunnskap** viser menneskene, stedene, fraksjonene, skapningene og historiene karakteren kjenner, hver slik karakteren kjenner dem. Søk i den, eller åpne en for å lese den i sin helhet. Et navn i teksten fører til sin side. **Dokumenter** holder brevene, kunngjøringene og sidene karakteren fant, så du kan lese dem igjen. **Kalender** viser i dag, fristene for oppdragene dine med tiden som er igjen, og dagene i historien: en dag med scener fører til kapitlene sine i dagboken.

### 3.6 Oppdrag, dagbok og notater

En oppgave karakteren din tar på seg, blir et oppdrag i **Dagbok**, med mål, frist og det oppdraget måler. Sett stjerne på det for å ha det i sikte øverst i Scene. Dagboken forteller også **historien** din, scene for scene, og holder **notatene** dine: private, med mindre du **Del**er ett, som spillederen hører som det du tenker, aldri som et faktum. Under **Følgesvenner** leser du dagbøkene til følgesvennene dine: nå og da, ved slutten av en dag eller et oppdrag, skriver de noen linjer om hva de tenker og føler.

### 3.7 Karakterens historie og bilde

På karakterarket har kortet **Beskrivelse** en boks for karakterens historie: spillederen skriver den inn etter at du har sagt ja. For et bilde kan du gi spillederen en fil (PNG, JPEG, WebP eller SVG, opptil 5 MB) sammen med hvor den ligger på datamaskinen din, eller du kan få laget et portrett ([3.11](#311-pictures)): *[Lag et portrett av meg: grått hår i en flette, et arr på haken.]*

### 3.8 Lagrede spill og å gå tilbake

RPG Engine lagrer hele kampanjen ved slutten av hver scene. Innstillingen **lagrede spill** avgjør resten:

| Lagrede spill | Lagre når du vil | Gå tilbake |
|---|---|---|
| **permadeath** | nei | aldri |
| **checkpoint** | nei | til siste lagrede spill, bare når karakteren din dør |
| **ledig** | ja | til et hvilket som helst lagret spill |

I alle modi kan du **begynne på nytt**, fra starten av spillet eller fra sesjon null. Gjør det i chatten eller i **Lagrede spill**.

Etter at du har gått tilbake, **åpne en ny chat**: den gamle husker det som er blitt angret. Skriv *fortsett* i den nye chatten, og trykk deretter på **Jeg har åpnet en ny chat** i Lagrede spill.

### 3.9 Sesjoner: å stoppe og komme tilbake

Stopp når du vil: *[La oss stoppe her for i kveld.]* Alt er allerede lagret i filene. For å komme tilbake starter du agenten din i kampanjemappen og skriver *fortsett*: spillederen gir deg en kort oppsummering og fortsetter.

### 3.10 Spillederens humør

Roboten øverst på dashbordet er spillederen: ansiktet følger tonen i historien, og røper aldri det du ikke vet ennå. Når chatten er lukket, sover den.

### 3.11 Bilder

RPG Engine kan få laget bilder av stedene du kommer til, oppdragene du tar på deg og dem du møter, slik innstillingen **bilder** sier, og karakterens portrett når du ber om det. Den bruker din egen Codex eller Claude Code, med din innlogging, på abonnementet ditt og innenfor grensene det har: **Codex** maler dem, ellers tegner **Claude Code** dem. **Innstillinger** viser om denne datamaskinen kan lage dem, og hvordan du setter det opp hvis ikke. Du kan alltid gi spillederen et eget bilde.

### 3.12 Trygghet: linjer, slør og stopp

**Linjer** vises aldri i spillet. **Slør** skjer bare utenfor scenen. Når som helst kan du skrive *[stopp]*: spillederen dropper det innholdet med en gang og legger det til i linjene dine.

### 3.13 Å ombestemme seg

Alle innstillinger kan endres, i chatten eller i **Innstillinger**. En avgjørelse spillederen tar uten regelboken, blir en **presedens**, slik at det samme spørsmålet får det samme svaret neste gang.

---

## 4. Dashboardet <!-- icon: party -->

En side på din egen datamaskin. Den åpnes bare i nettleseren på den maskinen, og den er i gang så lenge samtalen er åpen. Når samtalen lukkes, viser den *Not connected*. Den kommer tilbake av seg selv med neste samtale.

- **Gruppe**: karakterarket ditt og følgesvennenes. Klikk på et tall for å kaste det. Hold musepekeren over det for å se hvor det kommer fra. Når en pil markerer terningen, ser du også hva som gjør kastet bedre eller verre. Ved siden av ser du kastene.
- **Scene**: hvor du er, bilde og kart, hvem som er der, og hva som skjer. I en kamp ser du turene og kortet til karakteren din.
- **Dagbok**: oppdrag, historien, følgesvennenes dagbøker og notatene dine.
- **Verden**: verdenskartet, det karakteren din vet, dokumentene som er funnet, og kalenderen.
- **Terningbrettet**: velg terninger og en modifikator, og kast. ×2 dobler terningene, aldri modifikatoren, som ved et kritisk treff.
- **Lagrede spill**, **Hjelp**, **Innstillinger** og **Om** ligger som ikoner ytterst i raden. Innstillinger rommer også sidens egne valg: tema, terninglyd og terningsett.

Når spilleder spør deg om noe, blir banneretværende øverst, uansett hvilken del du er i.

---

## 5. Spillsystemer og husregler <!-- icon: dice -->

### 5.1 Hva et spillsystem er

Dataene til ett spill: karakterarket, tallene, skapningene, gjenstandene, trylleformlene og regelteksten. Hver kampanje spiller ett system. RPG Engine regner ut karakterarket og det som brukes opp og kommer tilbake. Hvordan en egenskap virker, leser spilleder i reglene og avgjør, slik det gjøres ved et bord.

### 5.2 Femte utgave

Rasene, klassene, underklassene, en bakgrunn og en egenskap (feat) fra SRD 5.1. Dessuten de 319 trylleformlene, våpnene, rustningene, de magiske gjenstandene og monstrene, og regelkapitlene, som spilleder leser etter nøyaktig ordlyd. Til slutt hele karakterarket, utregnet.

Det er en egen pakke: spilleder tilbyr den når du setter opp en kampanje, og installerer den. En kampanje som spiller den, installerer den av seg selv første gang den åpnes på en datamaskin uten den, og spilleder sier fra til deg.

Du kan også spille innhold som SRD-en mangler, fra en bok du eier: Spilleder skriver det som sider i kampanjen din, og RPG Engine behandler dem som sine egne. RPG Engine leveres bare med åpent innhold. Det spilleder kan, er ikke begrenset.

Dine egne regelbøker kan være biblioteket ditt. Fortell spilleder hvor de er: *[Regelbøkene mine ligger i D:\Books\5e.]* Du kan også legge til mappen deres i Packages › Library og si ja i vinduet datamaskinen viser, én gang. RPG Engine leser dem på denne datamaskinen. Hver kampanje bruker mappene du slår på der, og spilleder søker i dem når en regel skal avgjøres, etter SRD-en, og oppgir bok og side. De leses best som tekst, eller som PDF-er der teksten kan markeres. En skannet PDF leses fra bildene av sidene, bare på Windows, på noen minutter og med noen feil. RPG Engine endrer aldri regelbøkene dine, sender aldri teksten deres noe sted og kopierer den aldri inn i en kampanje.

### 5.3 Husregler og egne tillegg

Spør spilleder: *[Husregel: en naturlig 1 på et angrep betyr at du mister våpenet.]* Spilleder beholder den som en avtale ved bordet, eller skriver en side eller et tall på karakterarket når det trengs. Husregler som allerede er skrevet ut, kan legges som tekstfiler i kampanjens `rules`-mappe.

### 5.4 Legge til eller importere ditt eget spillsystem

Et spillsystem er en pakke: spilleder installerer en fra npm, en mappe eller en fil, og en som ikke er vår, bare med ditt ja, i et vindu på datamaskinen din. Å lage en er arbeid for en utvikler, og er beskrevet i RPG Engines dokumenter på GitHub. Å gjøre en bok du eier om til et spillsystem er ikke på plass ennå ([Kommer senere](#9-coming-later)).

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
