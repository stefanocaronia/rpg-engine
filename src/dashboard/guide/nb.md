<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,e51b18d7,be38a186 f2f35057,51f49a5b 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,afad321d,99406ef2,f831ecd8,b6a6bfff,b5544596,5c016bb1,3afa0abc,ef6b72c1,bc923cc3,07c079ea,8b6ac2d5,7b760ca8,086f7b8c,db332866,06d7d789,e6f82f9e,6def7d66,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,a2da9de6,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,1c335942,25f9bdf8,bd8adb1c,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,44639926,6cb75000,86179abe,323d8fa3,f8d6b2fd,18bc17d2,3bbb14f4,15e9f48c,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,92e343cc,83c19e53,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,3f155eae,b8e71497,32482cb4,d90a5d53,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,180f77d8,e0f88bdb,1e0ccfed,05fde17f,5070d986,f83c9d82,5b0bb1d2,600db53a,6b115391,5db3836c,590b2eb2,df64a3bb,e9a3f2a9. Change the English, then run it again. -->
# RPG Engine: den komplette veiledningen

**RPG Engine** lar deg spille et rollespill rundt bordet med en **AI som spilleder**. Du snakker med spillederen i en **chat**. RPG Engine jobber bak kulissene: det **husker verden**, **kaster terningene** og **fører regnskapet**. Ved siden av chatten har du en side åpen i nettleseren, **dashbordet**, med karakterarket, terningene, kartene og dagboken din.

Veiledningen er for spillere: du trenger ikke kunne programmere.

## Hurtigstart <!-- icon: send -->

1. Installer **Node.js** fra [nodejs.org](https://nodejs.org) (LTS-versjonen).
2. Installer en **AI-agent**, programmet spillederen kjører i, og logg inn: for eksempel Claude Code eller Codex ([2.4](#24-connect-your-ai)).
3. Installer RPG Engine i en ny terminal, åpnet etter at Node.js er installert: `npm install -g rpg-engine`. Hvis Windows svarer at det er slått av å kjøre skript, skriver du én gang `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, svarer ja og prøver igjen.
4. Åpne terminalen i mappen der du har spillene dine (høyreklikk mappen, **Åpne i Terminal**) og opprett en kampanje, alltid med navn: `rpg init "The Salt Isles"`. RPG Engine svarer med to linjer på engelsk: alt er i orden.
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
- **Node.js 24** eller nyere, fra [nodejs.org](https://nodejs.org). Det følger med `npm`, som installerer RPG Engine.
- En **terminal**: på Windows Terminal eller PowerShell, på macOS Terminal. For å åpne en terminal i en mappe høyreklikker du mappen og velger **Åpne i Terminal** (Windows) eller **Tjenester > Ny terminal i mappen** (macOS). Hvis Windows svarer at det er slått av å kjøre skript, skriver du én gang `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` og svarer ja.
- En **AI-agent** til spillederen ([2.4](#24-connect-your-ai)), med den **største modellen** den tilbyr: en liten modell lar seg lettere lokke til å avsløre hemmeligheter eller bøye reglene.

### 2.2 Installer

```text
npm install -g rpg-engine
```

`rpg --version` sjekker at det gikk bra. Hvis npm tilbyr å oppdatere seg selv, kan du ignorere det. Du bruker `rpg` én gang per kampanje, for å opprette den. Etter det starter agenten din RPG Engine av seg selv. `rpg` alene åpner ingenting: spillederen gir deg dashbordet.

### 2.3 Opprett en kampanje

Åpne en terminal i mappen der du har spillene dine ([2.1](#21-what-you-need) forklarer hvordan):

```text
rpg init "The Salt Isles"
```

Dette lager mappen `The Salt Isles` med en ny kampanje i. Gå inn i den med `cd "The Salt Isles"`. Skriv alltid navnet: uten navn blir mappen du står i selv til kampanjen, ved siden av alt den allerede inneholder. Husk hvor den ligger: du kommer tilbake hit hver gang du spiller. Alt annet velger du senere, i chatten eller på dashbordet.

Spilleder kan ikke opprette en kampanje for deg: før `init` er det ingenting som forteller agenten din hvor RPG Engine er.

### 2.4 Koble til AI-en din

Spillederen kjører i en **AI-agent**: en AI-app, i terminalen eller på skrivebordet, som kan arbeide med filene på datamaskinen din, for eksempel Claude Code, Codex, Antigravity eller OpenCode. En vanlig chat som claude.ai eller ChatGPT, eller en app på telefonen, er ikke nok: spillederen må kunne nå kampanjens filer på datamaskinen din. Hver agent trenger sitt eget abonnement og sin egen innlogging: Claude Code et betalt Claude-abonnement, Codex en ChatGPT-innlogging, Antigravity en Google-konto, der gratisabonnementet har en liten ukentlig kvote. OpenCode fungerer med modellene du gir den, også lokale. Du installerer agenten én gang, fra agentens egen side: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://developers.openai.com/codex), [Antigravity](https://antigravity.google), [OpenCode](https://opencode.ai).

- **Claude Code**: skriv `claude` i kampanjemappen. Når den spør om du stoler på mappen, velger du **Yes, I trust this folder**. Pass på: svaret som er valgt på forhånd, er *No, exit*. Kampanjen har også en liten krok, `rpg --listen`, som spørsmålet ikke viser: den forteller spillederen med en gang når du gjør noe fra dashbordet.
- **Codex**: skriv `codex` i kampanjemappen, og svar ja når den spør om du stoler på mappen. I viktige øyeblikk snakker karakteren gjennom en egen agent, `.codex/agents/rpg-character.toml`, som bare vet det karakteren vet. I skrivebordsappen sjekker du i innstillingene at minner er slått av for spillets chatter.
- **Antigravity**: skriv `agy` i kampanjemappen, og svar ja hvis den spør om du stoler på mappen. Eller åpne kampanjemappen i appen. For appen legger RPG Engine seg også inn i Antigravitys egne innstillinger, `.gemini/config/mcp_config.json` i hjemmemappen din. De gjelder for hver mappe du åpner, ikke bare kampanjens: utenfor en kampanje gjør RPG Engine ingenting. Kampanjen har to små kroker: `rpg --approve` lar spillederen bruke verktøyene til RPG Engine uten å spørre deg hver gang, og `rpg --listen` forteller spillederen med en gang når du gjør noe fra dashbordet. Spillederen maler bildene i chatten selv, med et betalt Google-abonnement. Med gratisabonnementet svikter bildeverktøyet, og spillederen tegner enkle vektorbilder, slik Claude gjør. I viktige øyeblikk snakker karakteren gjennom en egen agent, `.agents/agents/rpg-character.md`: spillederen skriver en replikk i historien, og svaret fra karakteren kommer et øyeblikk senere. Antigravity din oversetter også dashbordet og spillets regler og leser dokumentene du importerer, utenfor chatten, på kvoten til Google-kontoen din: RPG Engine starter den atskilt fra dine egne chatter, så den etterlater ingenting blant dem. Antigravity beholder de tidligere chattene dine, og minnet kan ikke slås av: spillederen er instruert om aldri å lese dem. Det du skriver, går til Google, som kan la folk lese det: hold personopplysninger utenfor spillet. RPG Engine er ikke et Google-produkt.
- **OpenCode**: skriv `opencode` i kampanjemappen. Kampanjen har en liten plugin, `.opencode/plugins/rpg.js`, som forteller spillederen med en gang når du gjør noe fra dashbordet. I kampanjen skriver spillederen filer bare gjennom RPG Engine: OpenCodes egen skriving og redigering av filer er slått av der, og den spør deg før den kjører en kommando. Spillederen tegner bildene selv, som enkle vektorbilder, slik Claude gjør. I viktige øyeblikk snakker karakteren gjennom en egen agent, `.opencode/agents/rpg-character.md`: spillederen skriver en replikk i historien, og svaret fra karakteren kommer et øyeblikk senere. En liten lokal modell kaller den kanskje ikke opp. OpenCode-en din, med modellen du valgte sist i den, oversetter også dashbordet og spillets regler og leser dokumentene du importerer, utenfor chatten. Har den ingen modell den kan bruke, gjør Codex eller Claude Code det hvis du har dem.
- **En annen agent**: start den i kampanjemappen og gi den MCP-tjeneren `rpg mcp`. RPG Engine er en standard MCP-tjener: alle agenter som støtter MCP kan være spilleder, også lokale.

Hvis spillederen ikke finner verktøyene til RPG Engine, skriver du `rpg init` i kampanjemappen: i en mappe som allerede er en kampanje, oppdaterer det bare disse filene. Åpne deretter en ny chat.

Vi spiller og tester med **Claude Code**. **Codex**, **Antigravity** og **OpenCode** er koblet til og kontrollert, men ingen hel kampanje er spilt med dem ennå. Kampanjen slår av agentens eget minne: spillet lever i filene sine, slik at det å gå tilbake til et lagret spill virkelig tar deg tilbake.

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
| **Karakteren din** | Hvordan karakteren din lages i sesjon null | sammen med spilleder, av spilleder, din egen ([2.7](#27-session-zero-your-character)) |
| **Følgesvenner** | Hvem som reiser med deg | ingen, laget sammen med deg, laget av spilleder, møtt i spillet |
| **Bilder** | Bilder av steder, oppdrag og de du møter | ingen, på forespørsel, nye steder, oppdrag og de du møter ([3.11](#311-pictures)) |
| **Linjer** og **Slør** | Det som aldri dukker opp, og det som bare skjer utenfor scenen | lister |
| **Språk** | Språket i spillet og på dashbordet | alle |

Femte utgave legger til **avansement**: erfaringspoeng eller milepæler.

Uten en skrevet verden spør spilleder også om en **premiss** (sjanger, tone, noen elementer og hva du liker best i et spill, for eksempel kamper, mysterier, samtaler eller utforsking, med dine egne ord), om **forberedelsen**: å bygge verdenen underveis, mens du spiller, eller alt i starten, og om **lengden**: én kveld, noen få sesjoner (tre til fem kvelder), eller åpen, det ene eventyret etter det andre. Når en historie med en bestemt lengde er slutt, kan du alltid fortsette.

**Spillederens stil** blir aldri spurt om, men du kan endre den i chatten eller i **Innstillinger**: **Prosa** (enkel, litterær, pulp, tørrvittig), **Historier** spilleder finner på (situasjoner, buer, episoder, mysterium), en forfatter å skrive som under **Skriv som**, eller hva som helst annet under **Med dine ord**.

### 2.7 Sesjon null: karakteren din

Du lager karakteren din sammen med spilleder, som ved et bord. Hvert valg er ditt, med mindre du ber spilleder ta det: kom med en full idé, en vag en, eller ingenting. Du kan også be spilleder lage alt ut fra noen få ord. I et spill med nivåer spør spilleder hvilket nivå du vil starte på: det første, med mindre du vil ha et annet. Spilleder forteller deg hvordan egenskapsverdiene lages før noen terning blir kastet. Du trenger aldri å skrive en bakgrunnshistorie. Gir du en, skriver spilleder den med dine ord. Deretter ber spilleder om et bilde av karakteren din ([3.7](#37-your-characters-story-and-picture)). RPG Engine regner ut karakterarket: du slipper å gjøre regnestykkene.

Har du allerede en karakter, fra et annet spill eller en annen kampanje? Velg **Jeg har allerede en** i oppsettet og gi karakteren til spilleder: lim inn karakterarket i chatten, eller si hvor filen ligger på datamaskinen din (en PDF, et bilde, en tekst). Spilleder skriver karakteren inn som den er, på sitt nivå, sjekker den mot reglene og verdenen, og blir enig med deg om alt som ikke passer.

---

## 3. Å spille <!-- icon: chat -->

### 3.1 Å snakke med spillederen

Skriv hva karakteren din gjør eller sier, med dine egne ord:

> Jeg spør vertshusholderen hvem andre som kom innom i kveld.

Utenfor historien skriver du `[OOC: …]` (out of character, utenfor rollen): *[OOC: Hvordan fungerer det å gripe tak i noen?]* Spillederen svarer på samme måte.

Du sier hva du prøver. Spillederen sier hva som skjer. Spillederen bestemmer aldri for karakteren din, og snakker aldri om motoren. Du kan spørre spillederen hvordan du bruker dashbordet.

**Å handle fra dashbordet**: klikk på et navn på karakterarket, for eksempel et våpen, en trylleformel eller noe du bærer på: kortet forteller hva det er. En sekk åpnes med pilen sin, og ⓘ viser kortet. Velg hva du gjør med det. Noe som ikke trenger noen, for eksempel **Utstyr**, ber deg bekrefte på den samme knappen, *Bekreft: Jeg utstyrer Shield*: trykk på den igjen, så går det til spillederen. Noe som gjøres mot noen, for eksempel **Angrip**, spør hvem, i listen eller med et klikk på kartet. Da sier knappen hele setningen, *Jeg angriper Hooded Bandit 1 med Mace*, og ett klikk sender den. Vil du si det på din egen måte, klikker du på en person for å snakke med vedkommende, eller skriver i chatten. Spillederen hører det som om det var sagt i chatten, avgjør det som alt annet du gjør, og spør deg med knapper om det du lot være usagt. Har AI-appen din ingen dørklokke, leser spillederen det så snart du neste gang skriver i chatten. Hvis chatten var lukket før, sender **Si det igjen** det én gang til.

### 3.2 Kast

Spillederen ber om et kast bare når utfallet er uvisst og har noe å si, og sier først hva som står på spill. Deretter:

- **På dashbordet** viser et banner en knapp for hver prøve, for eksempel *Acrobatics +4 · with advantage*. Klikk på den: terningene faller på siden, og spillederen får høre resultatet. Du kan også klikke på linjen på karakterarket som lyser, kaste terningene fra terningbrettet, eller skrive noe annet i banneret.
- **For hånd**, i hjørnet av banneret eller i **Innstillinger**: banneret forteller deg hva du skal kaste, og du kaster det fra karakterarket eller terningbrettet.
- **Fysiske terninger**, når terninginnstillingen står på fysisk: du skriver tallene du kastet, *[Jeg kastet 14.]*, og RPG Engine legger til modifikatorene dine.

**Frie kast**: klikk på et hvilket som helst tall på karakterarket, eller åpne terningbrettet, for å kaste for moro skyld. De teller aldri, og spillederen ser dem aldri.

**Spillederens kast** vises i kastkolonnen din, bortsett fra de hemmelige. Du kan alltid spørre *[Var det kastet ekte?]*: for et hemmelig kast gir spillederen et fingeravtrykk som beviser at kastet ble gjort før du spurte.

### 3.3 Scener og kamper

Historien går i **scener**: en kamp, en samtale, utforsking, reise, en hvile. Ved slutten av hver scene lagrer spillet seg selv, scenen havner i dagboken din, og når historien vender, skriver spillederen scenene siden forrige kapittel som et nytt kapittel i boken om historien din.

I en kamp forteller spillederen om hver tur som ikke er din, og stopper der du kan bestemme. **Scene** viser øverst hvem sin tur det er og hvem som kommer etterpå, og karakterens kort ved siden av kartet. Turrekkefølgen, gruppens treffpoeng og hvor skadet fiendene ser ut, i ord, står ved siden av siden. Hvis karakteren din faller, vises dødsredningene store på siden.

**Faste ordrer**: si til følgesvennene dine noe som skal gjelde over tid, for eksempel *Fra nå av lar dere alltid én leve*, og spilleder holder fast ved det til du opphever det. Følgesvennene dine følger det så langt karakteren deres tillater, og hvis en ikke vil, sier de fra. Du finner ordrene dine i **Innstillinger**, der du kan legge dem til og fjerne dem.

### 3.4 Tid, reise og verden som beveger seg

RPG Engine holder styr på datoen. Mellom sesjonene står spilltiden stille, med mindre du velger i **Innstillinger** å la den gå, for eksempel én dag i spillet for hver uke dere er borte, eller ber spillederen om det. Si at dere hviler, *Vi tar en lang hvile*, og når spillederen er enig, gir hvilen tilbake det den skal. I en kort hvile kan spillederen spørre på dashbordet hvor mange treffterninger du bruker: kast dem én om gangen, se hvor mye hver av dem leger, og stopp når du vil. Si hvor dere drar, *Vi tar veien nordover til Rocca*, og RPG Engine regner ut veien, avstanden og dagene, og stopper når noe skjer underveis. Penger telles i spillets mynter, vekslepenger inkludert.

Skurker har planer med frister. Hver nye dag flytter spillederen truslene som tiden har fått til å rykke fram, og du ser tegnene på dem, aldri selve klokken.

### 3.5 Kart

**Verden** viser stedene karakteren din kjenner, veiene mellom dem og sporet du har gått, med tåke over resten. **Scene** viser kartet over stedet der du er, når det har et, med hvem som står hvor. I en kamp, på din tur, er rutene du ikke kan nå, tilslørt. Når spillederen spør hvor du flytter, trykk på en rute, eller skriv den, for eksempel *E4*.

**Verden** holder også det karakteren din vet. **Kunnskap** viser menneskene, stedene, fraksjonene, skapningene og historiene karakteren kjenner, hver slik karakteren kjenner dem. Søk i den, eller åpne en for å lese den i sin helhet. Et navn i teksten fører til sin side. **Dokumenter** holder brevene, kunngjøringene og sidene karakteren fant, så du kan lese dem igjen. **Kalender** viser i dag, fristene for oppdragene dine med tiden som er igjen, og dagene i historien: en dag med scener fører til dem i tidslinjen i dagboken.

### 3.6 Oppdrag, dagbok og notater

En oppgave karakteren din tar på seg, blir et oppdrag i **Dagbok**, med mål, frist og det oppdraget måler. Sett stjerne på det for å ha det i sikte øverst i Scene. Under **Historie** forteller Dagbok historien din som en bok: spillederen skriver et prosakapittel hver gang historien vender, som forteller scenene siden forrige kapittel, i stilen du har valgt. Les kapittel for kapittel, der det siste er merket med bokmerket sitt, og last ned historien som Markdown eller som en nettside du kan skrive ut eller gi videre. I et spill som ble påbegynt før, kan du be spillederen skrive historien så langt. **Tidslinje** viser scenene, nummerert, med det som skjedde i hver av dem. Dagbok holder også **Notater** du skriver selv: private, med mindre du trykker **Del** på ett. Da hører spillederen det som det du tenker, aldri som et faktum. Under **Følgesvenner** leser du dagbøkene til følgesvennene dine: nå og da, ved slutten av en dag eller et oppdrag, skriver de noen linjer om hva de tenker og føler.

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

Hvis kampanjemappen er et git-arkiv, har **Innstillinger** en **Git**-del, alt avslått til du velger selv: en commit ved starten av hver sesjon, ved hvert lagrede spill og ved slutten av hver scene, og en push etter den hvis du vil. En commit er et øyeblikksbilde av kampanjen på det tidspunktet. En push sender øyeblikksbildene til arkivet på nettet, for eksempel på GitHub, slik at en kopi finnes utenfor denne datamaskinen. De lagrede spillene og chattene dine med spillederen holdes utenfor arkivet, med mindre du slipper dem inn. Slipp bare chattene inn hvis arkivet er privat.

### 3.9 Sesjoner: å stoppe og komme tilbake

Stopp når du vil: *[La oss stoppe her for i kveld.]* Alt er allerede lagret i filene. For å komme tilbake starter du agenten din i kampanjemappen og skriver *fortsett*: spillederen gir deg en kort oppsummering og fortsetter.

### 3.10 Spillederens humør

Roboten øverst på dashbordet er spillederen: ansiktet følger tonen i historien, og røper aldri det du ikke vet ennå. Når chatten er lukket, sover den.

### 3.11 Bilder

RPG Engine kan få laget bilder av stedene du kommer til, oppdragene du tar på deg og dem du møter, slik innstillingen **Bilder** sier, og karakterens portrett når du ber om det. Din egen AI-app lager dem med sine egne midler, med din innlogging, på abonnementet ditt og innenfor grensene det har: **Claude** tegner dem som vektorbilder, **Codex** og **Antigravity** maler dem, og **OpenCode** tegner enkle vektorbilder i chatten. Under **Innstillinger > Kampanje > Bilder** kan du la Codex eller Antigravity male dem også når spillederen din er en annen app: der den du valgte ikke kan, lager chatten din dem. **Innstillinger** viser om denne datamaskinen kan lage dem, og hvordan du setter det opp hvis ikke. Du kan alltid gi et eget bilde, til karakteren din eller til en hvilken som helst side du ser: hold pekeren over et av bildene på siden, så vises en liten bildeknapp i hjørnet (også med tastaturet, og alltid på telefon). I **Verden** har siden du åpner også **Bytt bilde …**, eller **Legg til bilde …** så lenge den ikke har noe. Du kan også lime inn et bilde du har kopiert, med Ctrl+V (⌘V på en Mac), når pekeren står over et bilde eller knappen er i fokus. Ditt bilde tar plassen til det som er der. Eller legg filen i mappen **inbox** i kampanjen og si til spillederen hvilken side den er til.

### 3.12 Trygghet: linjer, slør og stopp

**Linjer** vises aldri i spillet. **Slør** skjer bare utenfor scenen. Når som helst kan du skrive *[stopp]*: spillederen dropper det innholdet med en gang og legger det til i linjene dine.

### 3.13 Å ombestemme seg

Alle innstillinger kan endres, i chatten eller i **Innstillinger**. En avgjørelse spillederen tar uten regelboken, blir en **presedens**, slik at det samme spørsmålet får det samme svaret neste gang.

---

## 4. Dashboardet <!-- icon: party -->

En side på din egen datamaskin. Den åpnes bare i nettleseren på den maskinen, og den er i gang så lenge samtalen er åpen. Når samtalen lukkes, viser den *Not connected*. Den kommer tilbake av seg selv med neste samtale.

- **Gruppe**: karakterarket ditt og følgesvennenes. Klikk på et tall for å kaste det. Hold musepekeren over det for å se hvor det kommer fra og, når en pil markerer terningen, hva som gjør kastet bedre eller verre. Når spilleder forbereder valg til deg, for eksempel ved et nytt nivå, åpner et varsel på karakterarket dem. Velg når du vil, les sidene som alternativene nevner, kast der et alternativ krever det, og bekreft. Historien går videre i mellomtiden. Ved siden av ser du kastene.
- **Scene**: hvor du er, bilde og kart, hvem som er der, og hva som skjer. I en kamp ser du turene og kortet til karakteren din.
- **Dagbok**: oppdrag, historien som en bok, tidslinjen, følgesvennenes dagbøker og notatene dine.
- **Verden**: verdenskartet, det karakteren din vet, dokumentene som er funnet, og kalenderen.
- **Terningbrettet**: velg terninger og en modifikator, og kast. ×2 dobler terningene, aldri modifikatoren, som ved et kritisk treff.
- **Lagrede spill**, **Hjelp**, **Innstillinger** og **Om** ligger som ikoner ytterst i raden. **Innstillinger** rommer også sidens egne valg under **Dashbord**: modus, terninglyd, terningsett og **Tema**, altså fargene, ansiktene og bildene på siden. Du kan velge spillsystemets eget tema, et tema du har lagt til under Packages › Add (fra katalogen, med en GitHub-lenke, en .zip eller en mappe), eller sidens eget. Hvis stilarket i et tema gjør siden vanskelig å lese, slå av **Temaets egen stil** der. Innstillinger vises alltid uten den, på sidens adresse med `#/settings/page` til slutt.

Når spilleder spør deg om noe, blir banneretværende øverst, uansett hvilken del du er i.

---

## 5. Spillsystemer og husregler <!-- icon: dice -->

### 5.1 Hva et spillsystem er

Dataene til ett spill: karakterarket, tallene, skapningene, gjenstandene, trylleformlene og regelteksten. Hvert oppdrag i en kampanje bruker ett system. Nei, la oss si det riktig: Hver kampanje spiller ett system. RPG Engine regner ut karakterarket og det som brukes opp og kommer tilbake. Hvordan en egenskap virker, leser spilleder i reglene og avgjør, som ved et bord.

### 5.2 Femte utgave

Rasene, klassene, underklassene, en bakgrunn og en egenskap (feat) fra SRD 5.1. Dessuten de 319 trylleformlene, våpnene, rustningene, magiske gjenstandene og monstrene, og regelkapitlene, som spilleder leser etter den nøyaktige teksten. Hele karakterarket, utregnet.

Det er en egen pakke: spilleder tilbyr den når du setter opp en kampanje, og installerer den. En kampanje som spiller den, installerer den av seg selv første gang den åpnes på en datamaskin uten pakken, og spilleder sier fra til deg.

Du kan også spille innhold som SRD-en mangler, fra en bok du eier: spilleder skriver det som sider i kampanjen din, og RPG Engine behandler dem som sine egne. RPG Engine leveres bare med åpent innhold. Det spilleder kan, er ikke begrenset.

Dine egne regelbøker kan bli biblioteket ditt. Fortell spilleder hvor de er: *[Regelbøkene mine ligger i D:\Books\5e.]* Du kan også legge til mappen i Pakker › Bibliotek og si ja i vinduet som datamaskinen din viser, én gang. RPG Engine leser dem på denne datamaskinen. Hver kampanje bruker mappene du slår på der, og spilleder søker i dem når en regel skal avgjøres, etter SRD-en, og oppgir boken og siden. De leses best som tekst, eller som PDF-er der teksten kan markeres. En skannet PDF leses fra bildene av sidene, bare på Windows, på noen minutter og med noen feil. RPG Engine endrer aldri regelbøkene dine, sender aldri teksten deres noe sted og kopierer den aldri inn i en kampanje.

### 5.3 Husregler og dine egne tillegg

Spør spilleder: *[Husregel: en naturlig 1 på et angrep betyr at du mister våpenet.]* Spilleder tar vare på den som en avtale ved bordet, eller skriver en side eller et tall på karakterarket når det trengs. Husregler som allerede er skrevet ut, kan legges som tekstfiler i kampanjens `rules`-mappe.

Når spilleder endrer en side i spillsystemet for kampanjen din, for eksempel hitpoengene til en skapning eller rekkevidden til en trylleformel, markerer dashbordet det med en liten stjerne (*) etter navnet, overalt der siden vises. Pakker › Installert viser hva som er endret, under spillsystemet, ved siden av det systemet ga. En skapning karakteren din ikke kjenner, står der bare med navnet. Der kan du sette en side tilbake slik systemet skriver den, når scenen som spilles, er over. Dashbordet kan ikke angre endringen. Bare spilleder kan skrive den på nytt.

### 5.4 Legge til eller importere ditt eget spillsystem

Et spillsystem er en pakke: spilleder installerer en fra npm, en mappe eller en fil. En pakke som ikke er vår, installeres bare med ditt ja, i et skjema fra agenten din eller i et vindu på datamaskinen din. Å lage en pakke er arbeid for en utvikler, og er beskrevet i RPG Engines dokumenter på GitHub. Å gjøre en bok du eier om til et spillsystem finnes ikke ennå ([Kommer senere](#9-coming-later)).

---

## 6. Utvidelser <!-- icon: plus -->

En utvidelse legger til noe i en kampanje, oppå spillsystemet: en funksjon som været, som endrer seg hver daggry, eller å dirke opp en lås med terninger. Du legger til en under Pakker › Legg til, fra listen eller med navnet på npm, en mappe eller en fil. En utvidelse som ikke er vår, har med kode, og kommer bare med ditt ja, i et vindu på datamaskinen din. En utvidelse laget for et annet spillsystem sier hvilket, og blir ikke lagt til. Under Pakker › Installert oppdaterer du en utvidelse eller fjerner den. Spilleder kan også legge til en, når du ber om det.

---

## 7. Hvor en kampanje kommer fra, og språket <!-- icon: world -->

### 7.1 Tre måter å få en verden på

- **Laget underveis**: ut fra premissen din bygger spillederen hvert sted, hver person og hvert plott rett før du trenger det, og husker det.
- **Forberedt i starten**: det samme, men med verden bygget før spillet.
- **Fra ditt eget eventyr eller din egen bok**: gi spillederen filen, *[Importer dette eventyret som kampanjen vår: D:\Books\adventure.pdf. Ikke fortell meg noe av det som står i det.]* Det leses best som tekst, en EPUB, et Word-dokument eller en PDF der teksten kan markeres. En skannet PDF leses fra bildene av sidene, bare på Windows, sakte og med noen feil. Din egen AI-app leser den utenfor chatten, ellers spillederen i chatten, på abonnementet ditt: i Claude Code eller Codex leser en av de to den, i Antigravity din Antigravity, i OpenCode modellen du valgte sist i den. Hele dokumentet går til produsenten av den som leser det, under vilkårene for kontoen din og dens valg om trening. Dashbordet viser hvor langt det har kommet. Fra en roman foreslår spillederen hvor dere kan begynne. Spillederen skriver stedene, karakterene og hemmelighetene.

En kampanje spilles én gang: for å spille det samme eventyret igjen, opprett en ny kampanje.

### 7.2 Språk

Ett språk per kampanje, spillederens, som dashbordet følger. Dashbordet leveres med 26 språk. Alle andre oversettes på datamaskinen din av din egen AI-app utenfor chatten (Codex eller Claude Code; i Antigravity og OpenCode deres egne), eller, der ingen av dem kan, av spillederen i chatten. Termene fra femte utgave på italiensk kommer fra den offisielle italienske SRD-en. Regelteksten forblir på engelsk, og spillederen forteller den på ditt språk.

---

## 8. For de nysgjerrige: kampanjemappen <!-- icon: list -->

Du trenger aldri å åpne den, og den inneholder hemmelighetene i kampanjen din. Den har `campaign.yaml` (innstillingene dine), `state.yaml` (hvor spillet står), `world/` (én markdown-side for hver karakter, hvert sted, hvert oppdrag og resten), `rules/` (husreglene dine), `images/`, `log.jsonl` (hver endring), `sessions/` (chattene dine med spillederen som tekst, fra Claude Code og Codex), `.saves/`, `.player/` (notatene dine) og de små filene som forteller AI-agenter hvor RPG Engine er. Sidene bruker Obsidians format. Hvis du endrer en side for hånd, får spillederen vite det ved neste svar.

RPG Engine holder seg i denne mappen: det leser og skriver spillet bare her, og rører aldri de andre filene dine. Mappene med regelbøkene dine leser det bare. Utenfor mappen har det bare egne datamapper (oversettelsene til dashbordet, teksten det har lest fra regelbøkene dine, og Codex eller Claude Code hvis du lar det installere dem) og midlertidige mapper mens et bilde tegnes. Alt annet agenten din vil gjøre på datamaskinen din, spør den deg om først. Et spillsystem eller en utvidelse er kode, slik enhver npm-pakke er det: en pakke som ikke er vår, kjører på datamaskinen din med dine tillatelser, og RPG Engine installerer den bare med ditt ja, i et skjema fra agenten din eller i et vindu på datamaskinen din. Si bare ja til pakker der du stoler på utviklerne.

Hver kommando spilleder bruker, kan også kjøres i kampanjemappen: `rpg --help` viser dem. Mange skriver ut hemmelighetene i kampanjen.

---

## 9. Kommer senere <!-- icon: hourglass -->

- **Du som spilleder**, med AI-en som spiller gruppen.
- **Forfattermodus**: skriv et eventyr sammen med AI-en, eksporter det og del det.
- **Flere spillere på samme datamaskin**, hver med sin egen karakter, som bytter på å skrive i den samme chatten.
- **Flere utvidelser**: verdener, funksjoner og husregler å dele.
- **Andre spill**: flere spillsystemer, og dine egne.

---

## 10. Spørsmål og problemer <!-- icon: info -->

### Spørsmål

**Må jeg kunne reglene?** Nei. Velg mentor med opplæring, og spør med `[OOC: …]` når du vil.

**Kan spillederen jukse?** Spillederen kan ikke endre et kast RPG Engine har gjort, unntatt på vanskelighetsgrad historie, og heller ikke fakta som allerede er fastsatt.

**Koster det noe?** RPG Engine er gratis. Spillederen kjører på agentens abonnement, eller på din egen datamaskin med en lokal modell. En spillkveld er en lang chat: på de minste abonnementene kan du nå abonnementets grense før kvelden er slutt. Bilder, oversettelser og importer bruker det samme abonnementet. RPG Engine selv bruker aldri en API-nøkkel, som betales per kall: logg agenten din inn med kontoen din, ikke med en nøkkel.

**Kan jeg spille på telefonen?** Nei: spillederen kjører på datamaskinen din, og dashbordet åpnes bare der.

**Kan jeg spille med venner?** Ikke ennå: i dag én spiller, én karakter, pluss følgesvenner ([Kommer senere](#9-coming-later)).

**Kan jeg bruke en annen AI neste gang?** Ja: åpne kampanjen i en annen agent og skriv *fortsett*.

### Problemer

**Dashbordet åpnes ikke.** Spør spillederen: `[OOC: Hva er lenken til dashbordet?]`. Det fungerer bare mens en chat i den kampanjen er åpen: i Claude Code og Codex starter det når chatten åpnes, i Antigravity med den første meldingen din. I Claude-appen går en chat som har ligget en stund i bakgrunnen, i dvale, og siden med den: klikk på chatten, så kommer siden tilbake på samme adresse.

**Spillederen ser ikke ut til å kunne spillet.** Agenten din lastet ikke RPG Engine. Sjekk at du startet den i kampanjemappen og stolte på den. I Claude Code, skriv `/mcp` og koble til `rpg` på nytt. I Codex må `codex mcp list` i kampanjemappen vise `rpg`. Hvis `rpg --version` ikke blir funnet, installer RPG Engine på nytt ([2.2](#22-install)).

**Windows finner ikke `claude`.** Installasjonsprogrammet sier fra om det i et gult notat, med mappen det havnet i: legg den mappen til i PATH (Systemegenskaper > Miljøvariabler), og åpne deretter en ny terminal.

**Oppdatering.** Kjør `npm install -g rpg-engine` på nytt, og åpne deretter en ny chat: en spilleder som kjører, beholder versjonen den startet med.

**Spillederen husker noe jeg angret.** Åpne en ny chat og trykk på **Jeg har åpnet en ny chat** i Lagrede spill.

**Ingen bilder vises.** Innstillinger > Campaign > Pictures viser om denne datamaskinen kan lage dem, og hvordan.

**Installasjonen mislykkes, eller `rpg` vil ikke starte.** `node --version` må vise 24 eller nyere. Hvis Windows svarer at det er slått av å kjøre skript, se [2.1](#21-what-you-need). På Windows, hold RPG Engine og kampanjene dine unna stier som inneholder `&`.

**Lenken til dashbordet endret seg.** Hver kampanje har sin egen adresse, den samme chat etter chat. Den endres bare når et annet program allerede bruker den: spillederen gir deg den nye lenken, og fra da av beholder kampanjen den. En andre chat i samme kampanje beholder siden på samme adresse, og tar den over når du lukker den første.
