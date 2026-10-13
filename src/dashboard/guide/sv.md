<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 62159f4b 66abc619 781d8fc0 184f88cf 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: den kompletta guiden

**RPG Engine** låter dig spela rollspel vid bordet med en **AI som spelledare**.

Du pratar med spelledaren i en **chatt**: spelledaren berättar historien, spelar alla andra och avgör vad som händer.

RPG Engine arbetar i bakgrunden: det **minns världen**, **slår tärningarna** och **för bok**.

Bredvid chatten har du en sida öppen i webbläsaren, **dashboarden**, med din rollpersons rollformulär, tärningarna, kartorna och din dagbok.

Den här guiden är till för spelare: du behöver inte kunna programmera.

## Snabbstart <!-- icon: send -->

1. Installera **Node.js** från [nodejs.org](https://nodejs.org) (LTS-versionen).
2. Installera **Claude Code** eller **Codex**, AI-appen som spelledaren körs i, och logga in ([2.4](#24-connect-your-ai)).
3. Öppna en terminal och installera RPG Engine: `npm install -g rpg-engine`.
4. Skapa en kampanj i terminalen: `rpg init "The Salt Isles"`.
5. Öppna Claude Code eller Codex i den nya mappen och skriv *Hej! Nu börjar vi.* Spelledaren svarar med länken till din dashboard: öppna den bredvid chatten.

Resten av guiden förklarar varje steg, och sedan hur du spelar.

## 1. Vad RPG Engine är <!-- icon: about -->

### Vem gör vad

| Vem | Vad de gör |
|---|---|
| **Du** | Du spelar din rollperson. Du säger vad rollpersonen gör, säger och försöker. |
| **Spelledaren** (AI:n) | Berättar historien, spelar alla andra rollpersoner, avgör vad som händer, ber om slag. |
| **RPG Engine** | Minns allt i filer, slår tärningarna, räknar träffpoäng, pengar, tid och avstånd, och håller hemligheter tills du upptäcker dem. |

En AI är bra på att berätta historier och dålig på att minnas. Lämnad åt sig själv glömmer den vem som är skyldig dig pengar, hur många pilar du har eller att bron brann ner för två spelkvällar sedan. RPG Engine håller reda på allt detta, så världen förblir densamma från en kväll till nästa, även i en ny chatt, även med en annan AI.

### Hur det känns

Du skriver i chatten, som när du pratar vid ett bord:

> Jag trycker försiktigt upp dörren och tittar in.

Spelledaren svarar med vad du ser och stannar när det är din tur att välja. När något är osäkert och viktigt säger spelledaren vad som står på spel och ber om ett slag. Slagets knappar dyker upp på din dashboard. Du klickar, tärningarna faller på sidan, och spelledaren berättar vad som händer.

### Vad som gör det annorlunda

- **Världen är bestående.** Det som har sagts förblir sant. En död skurk förblir död.
- **Tärningarna är äkta.** Spelledaren kan inte böja dem (utom på den lättaste svårighetsgraden, om du väljer den).
- **Hemligheter förblir hemliga.** Spelledaren berättar aldrig vad din rollperson inte vet, även om du envisas.
- **Världen rör sig utan dig.** Hot går framåt medan du vilar eller reser, och du ser tecknen på dem.
- **Många kvällar, en berättelse.** En kampanj är en mapp på din dator. Du kan sluta när du vill och fortsätta senare.

### Spelet som finns idag

RPG Engine är gjort för alla bordsrollspel. Idag följer ett spelsystem med: **femte utgåvan** (från det fria System Reference Document 5.1). Fler spel kommer; se [Spelsystem](#5-game-systems-and-house-rules) och [Kommer senare](#9-coming-later).

---

## 2. Kom igång <!-- icon: path -->

### 2.1 Det här behöver du

- En dator med Windows, macOS eller Linux.
- **Node.js 22** eller nyare. Hämta det på [nodejs.org](https://nodejs.org): "LTS"-versionen går bra. Det följer med `npm`, som installerar RPG Engine.
- En **terminal**, fönstret där du skriver kommandon: i Windows appen Terminal eller PowerShell, i macOS Terminal. Du använder den för att installera RPG Engine, för att skapa varje kampanj och för att starta Claude Code eller Codex.
- En **AI-värd**, appen som spelledaren körs i: **Claude Code** eller **Codex**, med sin plan och sin inloggning. Se [2.4](#24-connect-your-ai).
- Den **största modellen** som din värd erbjuder. En liten modell låter sig luras: i våra tester avslöjade den hemligheter för en spelare som påstod sig vara den riktiga spelledaren.
- En webbläsare för dashboarden.

Inloggningen du använder för din värd gör mer: RPG Engine använder den, på din dator, för att rita bilder av platser, uppdrag, de du möter och din rollperson, och för att översätta dashboarden till språk som den inte levereras med. Se [Bilder](#311-pictures) och [Språk](#72-languages).

**Öppna en terminal i en mapp.** Många steg säger "i kampanjmappen". I Windows högerklickar du på mappen i Utforskaren och väljer **Öppna i Terminal**. I macOS högerklickar du på mappen i Finder och väljer **Tjänster > Ny terminal i mappen**. Eller så skriver du, i en terminal som redan är öppen, `cd` och mappens sökväg, till exempel `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Installera

Öppna en terminal och skriv:

```text
npm install -g rpg-engine
```

Då får du kommandot `rpg`. Så här kontrollerar du att det fungerade:

```text
rpg --version
```

Du använder `rpg` en gång per kampanj, för att skapa den. Därefter pratar du bara med spelledaren: din AI-värd startar RPG Engine själv, med samma kommando `rpg`.

### 2.3 Skapa en kampanj

En kampanj är en mapp. Öppna en terminal i mappen där du sparar dina spel och skriv:

```text
rpg init "The Salt Isles"
```

Då skapas mappen `The Salt Isles` med en ny kampanj i, och du får veta vad du ska göra härnäst:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

Raderna efter *For the master* är till för spelledaren, som läser dem i chatten. Du behöver inte göra något med dem. Kom ihåg var mappen ligger: du återvänder till den varje gång du spelar. Utan mappnamn gör `rpg init` om mappen du står i till kampanjen.

`init` skapar allt som kampanjen behöver: dess inställningar, dess världsmappar och de små filer som säger åt din AI-värd att använda RPG Engine och att inte spara något eget minne utanför kampanjen.

Du behöver inte välja något nu. Spelledaren frågar dig om resten i chatten, eller så väljer du på dashboarden. Om du redan vet vissa val kan du ange dem här:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Då skapas mappen `salt-isles` med kampanjen *The Salt Isles* i: ett mappnamn utan mellanslag och kampanjens namn som du vill ha det.

| Alternativ | Vad det anger | Värden |
|---|---|---|
| `--name` | Kampanjens namn | valfritt; mappens namn om du utelämnar det |
| `--language` | Spelets språk | en kod, till exempel `en`, `it`, `fr` |
| `--system` | Spelsystemet | `5e`, i dag det enda |
| `--difficulty` | Hur hård världen är | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Vad det betyder att falla i en strid | `narrative`, `epic`, `dice` |

`rpg init --help` listar dem också. En kampanj kan inte ligga i en annan kampanjs mapp.

Du kan inte be spelledaren skapa en kampanj: före `init` finns det inget i mappen som talar om för din AI-värd var RPG Engine finns.

### 2.4 Anslut din AI

RPG Engine fungerar med **Claude Code** och **Codex**. Andra AI-appar som använder MCP-verktyg kan också fungera, men vi garanterar dem inte.

**Installera din värd.** Claude Code och Codex körs i terminalen: de är inte appen Claude eller ChatGPT i din telefon. Var och en kräver sin egen plan och inloggning: Claude Code en betald Claude-plan, Codex en ChatGPT-inloggning. Följ deras egna sidor för att installera dem och logga in: [Claude Code](https://code.claude.com/docs/en/setup) och [Codex](https://learn.chatgpt.com/docs/codex/cli). Du gör det här en gång, för alla dina kampanjer.

**Claude Code.** Öppna en terminal i kampanjmappen och skriv `claude`. Första gången frågar den om du litar på mappen och säger att mappen tillåter spelets verktyg (`mcp__rpg`): välj **Yes, I trust this folder**. Se upp: svaret som redan är markerat är *No, exit*, så om du trycker på Enter direkt stängs Claude Code. Det var allt: kampanjen har redan sagt åt Claude Code att använda RPG Engine och dess verktyg och att hålla minnet avstängt.

**Codex.** Öppna en terminal i kampanjmappen och skriv `codex`. När den frågar om du litar på mappen svarar du ja: kampanjens egna inställningar talar om för Codex var RPG Engine finns, tillåter dess verktyg och håller minnet avstängt, och Codex läser dem bara i en mapp du litar på. I skrivbordsappen kontrollerar du att minnen är avstängda för spelets chattar.

**Varför minnet spelar roll.** Kampanjen lever i sina filer. Om värden också minns saker på egen hand skulle en återgång till ett sparat spel inte vara en riktig återgång: spelledaren skulle fortfarande minnas det som ogjorts.

### 2.5 Den första chatten

Skriv vad som helst, till exempel:

> Hej! Nu kör vi.

Spelledaren läser var spelet står och svarar. I sitt första svar i varje chatt ger spelledaren dig **länken till din dashboard** (ungefär `http://127.0.0.1:4750`). Öppna den i webbläsaren och ha den bredvid chatten under hela spelet. Varje kampanj behåller samma länk från en chatt till nästa, om inte ett annat program har tagit den: då ger spelledaren dig den nya.

Mellan spelledarens meddelanden visar din värd verktygen som spelledaren använder, på korta rader. Öppna inte deras detaljer (i Claude Code, ctrl+o): de kan visa vad spelledaren skriver, hemligheter inräknade.

En ny kampanj går igenom tre steg, som ett spel med en mänsklig spelledare. Dashboarden visar dem högst upp som *1 Inställningar · 2 Session noll · 3 Spel*:

1. **Inställningar**: du väljer hur du vill spela. Utanför berättelsen.
2. **Session noll**: du skapar din rollperson, i spel.
3. **Spel**: berättelsen.

### 2.6 Inställningar: välj hur du spelar

Spelledaren frågar bara efter det som fortfarande saknas, några frågor i taget. Om du skriver "bestäm du" väljer spelledaren och berättar vad som valdes. Med dashboarden öppen visar dess första steg, **Inställningar**, samma frågor som kort: en fråga i taget, varje värde med sin betydelse, det vanliga markerat som **Föreslagen**. Välj där, så frågar spelledaren inte igen i chatten. **Hoppa över** lämnar en fråga till senare. Chatten avgör det som bara ord kan avgöra: utgångspunkten för en ny värld, språket och bilderna, som spelledaren bara frågar om om din dator kan göra dem. Därför ställer sidan färre frågor än tabellen nedan listar.

Du behöver inte plugga tabellen: den finns för att slå upp i. Du kan ändra vilken som helst av dem senare, i chatten eller i dashboardens **Inställningar**. En ändring gäller från spelledarens nästa svar.

| Inställning | Vad den avgör | Värden | Föreslagen |
|---|---|---|---|
| **Mentor** (frågas som "Hur väl kan du det här spelet?") | Hur mycket spelledaren lär dig reglerna, utanför berättelsen | **off** (bara berättelsen; fråga inom parentes när du vill), **hints** (ett kort tips före viktiga val och när en regel slinker förbi), **tutorial** (varje regel förklaras första gången, hela summan för varje slag, en kort genomgång efter strider) | utifrån ditt svar: aldrig spelat → tutorial, lite → hints, jag kan det → off |
| **Svårighetsgrad** | Hur hård världen är: strider, fienders taktik, ledtrådar, skatter, hur snabbt hot rör sig | story, easy, normal, hard, brutal | |
| **Dödlighet** | Vad det betyder att falla i en strid | **narrative** (din rollperson dör aldrig), **epic** (dör bara när det spelar roll för berättelsen), **dice** (tärningarna avgör) | följer svårighetsgraden: story → narrative, easy → epic, normal och uppåt → dice |
| **Sparade spel** | När du får gå tillbaka | **permadeath** (aldrig; bara börja om kampanjen), **checkpoint** (tillbaka till senaste scenslutet, bara om din rollperson dör), **free** (tillbaka till vilket sparat spel som helst, och spara när du ber om det) | checkpoint |
| **Stränghet** | Hur noga mat, ljus, trötthet, bärvikt, trollformelkomponenter och resor följer reglerna | **smooth** (spelledaren går lätt över dem), **rules** (som skrivet: facklor brinner ut, ransoner tar slut), **simulation** (bortom reglerna: slitage, att mat blir dålig, väder) | smooth |
| **Tärningar** | Vem som slår rollpersonens tärningar | **digital** (RPG Engine slår dem, på sidan), **physical** (du slår dina egna och säger vad de visar) | |
| **Måttenheter** | Avstånd och vikter i berättelsen | metric, imperial | |
| **Följeslagare** | Vem som reser med dig | none, made with you in session zero, made by the master, met in play | |
| **Bilder** | Bilder av platser, uppdrag och de du möter, och din rollpersons porträtt när du ber om det | none, on request, new places, quests and those you meet | frågas en gång, bara om din dator kan göra dem |
| **Gränser** | Vad som aldrig förekommer i spelet | en lista, eller inga | |
| **Slöjor** | Vad som får hända, men bara utanför bild | en lista, eller inga | |
| **Språk** | Spelets och dashboardens språk | vilket som helst | tas från hur du skriver, och bekräftas |

Spelsystemet kan lägga till egna inställningar. Femte utgåvan lägger till **advancement**: hur din rollperson går upp i nivå, med **experience points** eller vid berättelsens **milestones**.

**Vad svårighetsgraden betyder i spel.** Story: svaga, naiva fiender, tydliga ledtrådar, gott om allt. Spelledaren får mjuka upp sina egna slag. Easy: enkla fiender, generösa resurser. Normal: förnuftiga fiender, tre ledtrådar till varje slutsats, standardpriser och standardskatter. Hard: smarta fiender, subtila ledtrådar, knappa resurser, hot som rör sig snabbt. Brutal: fiender som lägger bakhåll, drar sig tillbaka och gör slut på de fallna, mycket knappa resurser, de hårdaste vilorna. Strider anpassas alltid efter din grupp som den ser ut nu.

**Utan en nedskriven värld** frågar uppstarten om två saker till:

- **Utgångspunkt**: genren, tonen och några delar av världen, med dina ord. Till exempel: *"Low fantasy, dyster men med hopp. En flodstad, ett hemsökt vadställe, en kult i bergen."*
- **Förberedelse**: **on the fly** (spelledaren bygger varje del av världen precis innan du behöver den; föreslagen) eller **all at the start**.

Spelledaren föreslår sedan ett namn på kampanjen. När inget saknas och du säger att du är redo går spelet vidare till session noll.

**Spelledarens stil** frågas aldrig: ändra den när du vill, i chatten eller i **Inställningar**, där den har en egen grupp. Tonen stannar i utgångspunkten, stilen är hur det berättas.

- **Prosa**: **plain** (korta meningar, en konkret detalj i taget; den vanliga), **literary** (mer utrymme vid höjdpunkterna), **pulp** (spänd, målande, kort, varje meddelande slutar med ett hot eller en krok) eller **wry** (en berättare med ett halvt leende åt världen, aldrig åt din rollperson).
- **Berättelser**, för det spelledaren hittar på, aldrig ett nedskrivet äventyr: **situations** (fraktioner, hot och platser med hemligheter, ingen huvudintrig; den vanliga), **arcs** (ett centralt hot som går framåt i etapper), **episodes** (en berättelse som avslutas varje session) eller **mystery** (varje berättelse en utredning, vars sanning avgörs först).
- **Skriv som**: en författare vars sätt att berätta spelledaren tar upp i stället för prosan: deras rytm och de detaljer de väljer, aldrig deras meningar, namn eller platser, och aldrig mer än vad din rollperson ser.
- **Med egna ord**: allt annat, med några få ord, till exempel *"tredje person, förfluten tid"*. Spelledaren berättar i andra person, presens, om du inte ber om något annat.

### 2.7 Session noll: din rollperson

Session noll är spel: du skapar din rollperson tillsammans med spelledaren, som vid ett bord.

- **Varje val är ditt**, om du inte ber spelledaren göra det. Du kan komma med en hel idé ("en halvalvisk klerik som lämnade sitt tempel"), en vag ("någon som läker, men inte är snäll om det"), eller ingenting ("överraska mig, sedan får jag ändra saker").
- **Förmågepoäng.** Spelledaren berättar metoden och skyddsnätet innan någon tärning slås. I femte utgåvan: standard array, point buy eller 4d6 där den lägsta tas bort. Metoden ni kommer överens om blir kvar bland bordets överenskommelser.
- **Din bakgrundshistoria** är aldrig ett krav. Om du ger en skriver spelledaren den med dina ord, läser upp den för dig en gång och knyter in dess personer och platser i världen. Du kan också skriva den på dashboarden (se [Grupp](#party)).
- **Personlighet** (femte utgåvan): en egenskap, ett ideal, en bindning och en brist, från din bakgrunds tabeller eller dina egna.
- **En bild.** När din rollperson är klar ber spelledaren dig om en bild av den: en fil på din dator, eller ett porträtt som görs på din dator utifrån hur du beskriver rollpersonen (se [din rollpersons bild](#37-your-characters-story-and-picture)).

Rollformulärets siffror räknas ut av RPG Engine utifrån dina val: du gör aldrig själv uträkningarna. När rollpersonerna är klara och du bekräftar börjar berättelsen.

---

## 3. Spela <!-- icon: chat -->

### 3.1 Att prata med spelledaren

Skriv vad din rollperson gör eller säger, med dina egna ord. Kort går bra.

> Jag frågar värdshusvärden vem mer som har kommit förbi i kväll.
>
> "Vi är inte ute efter bråk", säger jag med handen borta från svärdet.
>
> Jag klättrar upp på taket och väntar.

**Utanför berättelsen** skriver du inom hakparentes:

> [Hur fungerar grappling?]
>
> [Kan jag fortfarande använda min reaktion den här rundan?]
>
> [Vi slutar här för i kväll.]

Spelledaren svarar också inom hakparentes och går sedan tillbaka till berättelsen.

**Du säger vad du försöker; spelledaren säger vad som händer.** Något som bryter mot världens logik eller mot fakta som redan är fastställda sker inte: spelledaren säger det, inne i berättelsen, och erbjuder det som är möjligt.

**Spelledaren bestämmer aldrig åt din rollperson.** Spelledaren låter dig inte tala, känna eller välja. Vid tvekan frågar spelledaren.

**Spelledaren pratar aldrig om motorn.** Fråga om spelledaren håller reda på saker, så svarar spelledaren som en spelledare: "Jag håller reda på allt: vi tar upp tråden härifrån nästa gång."

**Du kan fråga spelledaren hur dashboarden används.** Spelledaren kan sidan: "Var ser jag mina trollformler?", "Hur slår jag för hand?"

### 3.2 Slag

**När ett slag sker.** Spelledaren ber om ett slag bara när utgången är osäker och spelar roll. Annars säger spelledaren ja, eller "ja, men". Före ditt slag säger spelledaren vad som står på spel och vilka slag som passar, och stannar sedan. Du slår, eller ändrar dig:

> **Spelledare:** Avsatsen är smal och våt. Om du halkar blir det ett långt fall ner i floden. Ett slag på Smidighet (Akrobatik), eller så kan du gå tillbaka och leta efter trappan.
>
> **Du:** Jag försöker.

**Slå på dashboarden.** När spelledaren ber om det visas en banderoll högst upp på sidan med en knapp för varje slag, till exempel *Akrobatik +4 · med vantaggio*. Klicka på den: tärningarna faller på sidan och spelledaren hör resultatet. Du kan också:

- klicka på motsvarande rad i ditt rollformulär, som lyser i guld;
- kasta rätt tärningar från tärningsbrickan;
- skriva egna ord i banderollen i stället, om du vill göra något annat.

**Slå för hand.** Om du hellre väljer tärningarna själv, slå på **För hand** i banderollens hörn (eller i **Inställningar**). Slagets knapp försvinner och banderollen säger vad du ska slå, som en spelledare skulle göra: *Slå Akrobatik själv, på ditt rollformulär eller med tärningarna.* Klicka på raden i ditt rollformulär som lyser, eller kasta rätt tärningar från tärningsbrickan: RPG Engine slår dem, lägger till din bonus och spelledaren hör resultatet. Ett slag som varken ditt rollformulär eller tärningsbrickan kan göra, till exempel skada där ettor slås om, behåller sin knapp. För hand förblir påslaget i den här webbläsaren tills du stänger av det.

**Fysiska tärningar under hela spelet.** Med inställningen **Tärningar** på fysisk ber spelledaren om dina slag i ord och du skriver vad tärningarna visade:

> [Jag slog 14.]

RPG Engine lägger till dina modifikationer och vägrar en sida som dina tärningar inte kan visa.

**Fria slag.** Klicka på vilket tal som helst i ditt rollformulär, eller öppna tärningsbrickan, för att slå bara för skojs skull. Fria slag räknas aldrig, loggas aldrig och spelledaren ser dem aldrig. En fri 20 blir aldrig en riktig senare.

**Spelledarens slag.** Spelledaren slår för fiender och andra med RPG Engine också. De flesta slag visas i din slagkolumn. När du inte får se ett resultat slår spelledaren i hemlighet. Du kan alltid fråga:

> [Var det slaget på riktigt?]

För ett visat slag ger spelledaren siffrorna och skälet. För ett hemligt ett fingeravtryck som bevisar att slaget gjordes innan du frågade.

**Slag i chatten** visas inom hakparentes, direkt efter stunden de avgör: *[Övertalning 14 + 3 = 17]*. Sedan berättar berättelsen utgången.

### 3.3 Scener och strider

Spelledaren leder berättelsen i **scener**: en strid, ett samtal, utforskande, resa, vila, en utmaning (en jakt, ett lopp, ett pussel). Du behöver inte hantera dem: det är så RPG Engine håller reda på berättelsens kapitel. Vid slutet av varje scen sparas spelet av sig självt, och scenen hamnar i berättelsen i din dagbok.

**I en strid** berättar spelledaren alla turer som inte är dina, en efter en, med varje slag, och **stannar där du kan bestämma**: din tur, en reaktion, ett val. På din tur säger du vad du gör:

> Jag kastar Sacred Flame på den som står vid dörren.

Dashboardens **Strid** visar turordningen, vems tur det är, din grupps träffpoäng och hur sårade fienderna ser ut (oskadd, sårad, blödande, nere: i ord, aldrig i siffror). Om din rollperson faller visas dödsslagen stort på sidan.

**När striden redan är avgjord** kan spelledaren erbjuda sig att berätta resten i ett enda meddelande.

### 3.4 Tid, resor och världen som rör sig

**Tid.** Varje handling tar tid i berättelsen, och RPG Engine håller reda på datumet: dag 3, tidig morgon. Spelledaren berättar tiden som världen mäter den: gryning, tredje klockslaget, nattfall. Mellan sessioner går ingen tid: du tar upp tråden där du slutade.

**Vila.** Säg att du vilar, så tillämpar spelledaren det en vila ger tillbaka, som träffpoäng och trollformelplatser:

> Vi slår läger och tar en lång vila.

**Resor.** Säg dit du vill ta dig:

> Vi tar vägen norrut mot Rocca.

RPG Engine räknar ut vägen, avståndet och dagarna i din takt, och flyttar er dit. En resa stannar när något planerat händer på vägen, vid slutet av varje dags resa och vid ankomsten. Du kan fråga hur långt det är till en plats innan du ger dig av:

> [Hur långt är det till Rocca, och hur lång tid tar det till fots?]

**Världen rör sig utan dig.** Skurkar har planer med tidsfrister och klockor. Varje ny dag flyttar spelledaren fram hoten som tiden har fört framåt, och du ser tecknen: ett rykte, ett spår, en förändring i staden. Du ser aldrig själva klockan, bara det den lämnar efter sig.

**Pengar** räknas i spelets mynt. Betala, sälj, få betalt: RPG Engine ger växel.

### 3.5 Kartor

**Världskartan** (dashboard: **Värld**) visar bara platserna din rollperson känner till, med vägarna mellan dem, stigen ni har gått och dimman över allt annat. Klicka på en plats för att se vad du vet om den och hur långt den är.

**Kartan över en plats** (dashboard: **Scen**, och **Strid** i en strid) visas när spelledaren ritar en för där du befinner dig: väggar, dörrar, marken och vem som står var, som pjäser. I en strid, på din tur, är rutorna du inte kan nå täckta av en slöja, så du ser direkt vart du kan gå. När spelledaren frågar vart din rollperson går öppnar sidan kartan och du trycker på en ruta, eller skriver den, till exempel *E4*.

### 3.6 Uppdrag, dagbok och anteckningar

**Uppdrag.** När din rollperson tar sig an en uppgift blir den ett uppdrag i din **Dagbok**: vem som gav det, var, till när, dess mål som en lista och vad det mäter (en tidsfrist med tid kvar, en klocka, ett antal). Markera ett med dess stjärna för att följa det: det ligger kvar litet högst upp i Scen, med sitt nästa mål. Uppdraget slutar när berättelsen avslutar det, aldrig av sig självt.

**Berättelsen.** Dagbokens flik Berättelse är din kampanj som en tidslinje: varje scen ett kapitel, med sin plats, sitt datum och en kort sammanfattning, den senaste först.

**Dina anteckningar.** I dagbokens flik Anteckningar skriver du egna anteckningar: teorier, namn, planer. De stannar på din dator och spelledaren läser dem inte, om du inte **Delar** en. En delad anteckning når spelledaren vid nästa svar som det du tror, aldrig som ett faktum. Din teori blir inte sann för att du skrev den. En anteckning som ber om att något innehåll ska upphöra eller undvikas räknas som om du hade sagt det vid bordet.

### 3.7 Din rollpersons berättelse och bild

På din rollpersons rollformulär har kortet **Beskrivning** en ruta där du skriver din rollpersons berättelse. Skicka den, så skriver spelledaren in den i rollpersonen med egna ord, efter att du har sagt ja.

För din rollpersons bild ger du spelledaren en bildfil i chatten, med var den finns på din dator (PNG, JPEG, WebP eller SVG, upp till 5 MB):

> [Här är min rollpersons porträtt: C:\Users\me\Pictures\mira.png]

Spelledaren kopierar in den i kampanjen, och den visas på din rollpersons pjäs på dashboarden. Du kan byta den på samma sätt när du vill.

Eller låt porträttet göras, där din dator kan göra bilder (se [Bilder](#311-pictures)): beskriv din rollperson för spelledaren, eller låt spelledaren beskriva den.

> [Gör ett porträtt åt mig: grått hår i en fläta, ett ärr på hakan, trötta ögon.]

Porträttet visar exakt vad din rollperson är i spelet, folkslaget som den här världen har det, en bergsdvärg som en bergsdvärg, med utseendet du beskrev. Det kommer på ungefär en minut, på din rollpersons pjäs. Dina följeslagare kan få sina på samma sätt.

### 3.8 Sparade spel och att gå tillbaka

RPG Engine sparar hela kampanjen **vid slutet av varje scen**, av sig självt. Vad du kan göra med de sparade spelen beror på inställningen **Sparade spel**:

| Sparade spel | Spara när du vill | Gå tillbaka |
|---|---|---|
| **permadöd** | nej | aldrig; du kan bara börja om kampanjen |
| **kontrollpunkt** | nej | till senaste sparade spelet, bara när din rollperson dör |
| **fri** | ja | till vilket sparat spel som helst, när du vill |

I alla lägen kan du **börja om**: från spelets början med samma rollperson, eller från session noll med en ny.

Allt detta kan du göra i chatten ("[Vi går tillbaka till före duellen.]") eller i dashboardens avsnitt **Sparade spel**.

**Efter att ha gått tillbaka, öppna en ny chatt.** Chatten du spelade i minns det som ogjorts. Öppna en ny chatt med spelledaren (`/clear` i Claude Code, `/new` i Codex), skriv *fortsätt*, tryck sedan på **Jag har öppnat en ny chatt** i Sparade spel, eller säg det till spelledaren i den nya chatten. Återuppta aldrig den gamla chatten. Tills du bekräftar går spelledaren inte vidare.

### 3.9 Sessioner: att sluta och komma tillbaka

**Du avslutar sessionen** när du vill:

> [Vi slutar här för i kväll.]

Det finns inget "spara och avsluta": allt ligger redan i filerna.

**För att stänga** chatten skriver du `/exit` i Claude Code, eller `/quit` i Codex. Dashboarden blir tyst till nästa chatt.

**För att komma tillbaka** öppnar du en terminal i kampanjmappen (den som `init` skrev ut), startar din värd där och skriver *fortsätt*. Spelledaren läser var spelet står, ger dig en kort sammanfattning och börjar med att något händer. En ny chatt förlorar ingenting: kampanjen lever i sina filer, inte i chatten.

Spelledaren ställer inga rutinfrågor i slutet. Bara om något inte fungerade frågar spelledaren kort.

### 3.10 Spelledarens sinnesstämning

Högst upp på dashboarden sitter spelledarens avatar, en liten robot. Dess ansikte följer berättelsens ton: orolig när faran växer, förtjust över en djärv idé, förvånad över en vändning. Den reagerar en kort stund på en naturlig 20 eller en naturlig 1. Den visar aldrig det du inte vet ännu: inget flin innan fällan har small igen. Din grupps pjäser visar också sina sinnesstämningar. När chatten är stängd sover roboten.

### 3.11 Bilder

RPG Engine kan låta göra en bild av varje plats du når, varje uppdrag du tar och varje person eller sorts varelse du möter, tecknad som du ser dem, så som inställningen **Bilder** säger, och din rollpersons porträtt när du ber om det. Den använder det som redan finns på din dator:

- **Codex**, med din ChatGPT-inloggning: en målad bild.
- Annars **Claude Code**, med din Claude-inloggning: en teckning.

Bilden använder din egen prenumeration, inte vår. Avsnittet **Inställningar** talar om huruvida bilder kan göras på din dator, och om inte, stegen för att ställa in det. Utan bilder visar sidan i stället märket för varje sorts plats. Du kan också ge spelledaren en egen bild för vilken plats eller rollperson som helst.

### 3.12 Trygghet: gränser, slöjor och stopp

- **Gränser**: vad som aldrig förekommer i spelet.
- **Slöjor**: vad som får hända, men bara utanför scenen.
- **Stopp**: när som helst kan du stoppa ett innehåll, utan att förklara. Skriv det utanför berättelsen:

> [stopp]

Spelledaren släpper det på en gång och lägger till det bland dina gränser, för alla kommande sessioner. Du kan se och ändra dina gränser och slöjor i **Inställningar**.

### 3.13 Att ändra sig

Varje inställning kan ändras under kampanjen: i chatten ("[Gör det svårare.]") eller i **Inställningar**. Spelledaren får veta om en ändring vid nästa svar. Ett avgörande som spelledaren tog utan regelboken blir ett **prejudikat** och sparas, så att samma fråga får samma svar nästa gång.

---

## 4. Dashboarden, avsnitt för avsnitt <!-- icon: party -->

Dashboarden är en sida på din egen dator. Spelledaren ger dig dess länk i början av varje chatt. Den följer spelet direkt: när spelledaren ändrar något ändras sidan också.

Bara webbläsaren på datorn där du spelar kan öppna den: inte en telefon eller surfplatta, inte ens på samma wifi. Sidan passar också ett smalt fönster: då flyttar avsnitten till ett fält längst ner, och ikonerna till en meny.

Sidan lever lika länge som chatten. Stäng chatten, så visar en sida som lämnats öppen *Not connected* med rollformuläret som det var, och spelledarens robot somnar; öppna en chatt i kampanjen igen, och när spelledaren har svarat kommer sidan tillbaka av sig själv.

### Högst upp

- **Spelledarens avatar**, med dess sinnesstämning.
- Kampanjens namn, spelsystemet, **speltiden** och om spelet är **ansluten** (chatten kopplad).
- Avsnitten: **Grupp**, **Scen**, **Strid** (bara under en strid), **Dagbok**, **Värld**; i slutet av raden, som ikoner: **Sparade spel**, **Hjälp**, **Inställningar**, **Om**.
- Det ljusa och mörka temat, i övre högra hörnet.

När spelledaren frågar dig något ligger dess banderoll kvar högst upp på sidan, oavsett vilket avsnitt du är i.

### Grupp

Din rollpersons rollformulär, och dina följeslagares. Varje del av rollformuläret är ett kort som du kan öppna och stänga.

- **Klicka på ett tal** för att slå det på skoj. Peka på ett tal för att se hur det är uppbyggt ("+5: Visdom +3, färdighet +2").
- **Träffpoäng, platser och användningar** visas som staplar och prickar.
- **Tillstånd och effekter** visas med hur länge de varar.
- **Beskrivning** innehåller din rollpersons text, och rutan för att skicka spelledaren din rollpersons historia.
- Vid 0 träffpoäng visas **dödsslagen** stort under namnet.
- Vid sidan av rollformuläret (under det på en smal skärm): **slagen**, de nyaste först, dina och de av spelledarens som du får se. **Rensa** tömmer listan; **Återställ** tar tillbaka den. Fria slag visas streckade och dämpade.

En följeslagare med värdeblock, som en varg, visar sitt värdeblock i stället för ett fullständigt rollformulär.

### Scen

Där din grupp befinner sig: platsens bild och namn, platserna runt omkring, kartan över platsen när det finns en, vilka som är där, och den öppna scenen med vad som händer nu. Uppdraget du följer ligger högst upp.

### Strid

Bara under en strid. Överst: rundan, vem som agerar, vem som kommer härnäst. Nedanför: turordningen, varje stridande med sitt tillstånd, din grupp i siffror och fienderna i ord; vad din rollperson har till hands (Classe Armatura, träffpoäng, attacker); kartan över platsen, med den som agerar inringad. På din tur pulserar länken Strid i guld, var du än är.

### Dagbok

Tre flikar:

- **Uppdrag**: aktiva, avklarade och misslyckade, vart och ett som ett kort med sina mål, sin tidsfrist som en timer och sina klockor. Stjärnan följer ett uppdrag.
- **Berättelse**: kampanjens kapitel, scen för scen, det senaste först.
- **Anteckningar**: dina egna anteckningar, privata tills du delar en.

### Värld

Världskartan som din rollperson känner den, med dimman över resten. Dra för att flytta, använd hjulet eller nyp för att zooma. Klicka på en plats för dess kort. En lista över platserna, de närmaste först, finns bredvid. Med mer än en karta (en stad, en kontinent, ett annat plan) växlar flikar mellan dem.

### Tärningsbrickan

Tärningsknappen öppnar brickan: välj tärningar och en modifikation, och kasta. Med två eller fler tärningar av en sort väljer du vilka som räknas: **Alla**, **Högsta** (bara den högsta) eller **Lägsta** (bara den lägsta). De tärningar du valde ligger kvar tills du trycker på **Rensa**, så samma skadeslag är ett klick varje runda. Medan spelledaren ber om ett slag talar brickan om vilka tärningar som svarar på det.

### Sparade spel

Dina sparade spel, de nyaste först, vart och ett med sin plats, speldatum och när det gjordes. **Spara nu** (med fria sparade spel), **Gå tillbaka hit** och **Börja om**, i rött, i två steg. Se [Sparade spel och att gå tillbaka](#38-saves-and-going-back).

### Inställningar

Dina inställningar, i grupper: spelet, att lära sig spelet (mentorn och reglerna som redan förklarats för dig), tärningar och mått, begränsningar (gränser och slöjor), bilder, språk. Klicka på ett värde för att välja det; under det står vad det betyder. Sedan sidans egna preferenser, som bara sparas i den här webbläsaren: temat, tärningarnas ljud, **tärningsuppsättningen** (harts, metall, trä, sten), rundade eller skarpa kanter, att slå för hand.

Spelledarens egna inställningar, som husregler och prejudikat, finns inte här: de stannar i chatten.

### Hjälp och Om

**Hjälp**: den här guiden. **Om**: vad RPG Engine är, dess länkar, dess licenser och spelsystemets erkännanden.

### Före spelet: Inställningar och session noll

Medan en ny kampanj är i sitt första steg, **Inställningar**, ställer hela sidan sina frågor: en i taget, var och en med vad dess värden betyder och det föreslagna. **Du bestämmer** lämnar en fråga åt spelledaren, utom gränser och slöjor, som alltid är dina; **Hoppa över** lämnar den till senare. I slutet, **Jag är redo**.

### Meddelanden från sidan

Ibland visar sidan ett meddelande över sig själv: ett problem i kampanjens filer (spelledaren åtgärdar det), spelet borta (chatten är stängd), sidan som översätts.

---

## 5. Spelsystem och husregler <!-- icon: dice -->

### 5.1 Vad ett spelsystem är

Ett spelsystem är datan för ett enda spel: dess rollformulär, siffror, varelser, föremål, besvärjelser och regeltext. Varje kampanj spelar ett system.

RPG Engine räknar ut ditt rollformulär och det som förbrukas och kommer tillbaka, till exempel livspoäng och besvärjelseplatser, på samma sätt som ett digitalt rollformulär. Hur en förmåga eller en besvärjelse fungerar läser spelledaren i reglerna och avgör, som vid ett bord.

### 5.2 Femte utgåvan ingår

RPG Engine levereras med **5e**, från System Reference Document 5.1 (reglerna från 2014, fria under Creative Commons). Det ingår:

- raserna, klasserna, subklasserna, en bakgrund och en färdighet (feat) från SRD;
- de 319 besvärjelserna, vapnen, rustningarna och utrustningen, de magiska föremålen och monstren i SRD;
- regelkapitlen, som spelledaren slår upp med deras exakta text;
- det fullständiga rollformuläret, uträknat: förmågemodifikationer, räddningskast, färdigheter, Classe Armatura, attacker, svårighetsgrad för besvärjelseräddning, platser, träffpoängstärningar, förmågor per nivå, erfarenhet och nivåhöjning;
- vila som ger tillbaka det den ska; tillstånd med sin regeltext; påminnelser om koncentration.

**Innehåll utöver SRD.** Du kan spela femte utgåvan med innehåll som SRD saknar, till exempel en klass eller ett monster från en bok du äger. Spelledaren kan spelet, kan läsa dina regelböcker och kan söka på webben. Spelledaren skriver det som behövs som sidor i din kampanj, och RPG Engine fungerar likadant med dem. Det vi levererar begränsas av sin licens. Det din spelledare kan begränsas inte av den.

RPG Engine levereras bara med eget eller öppet licensierat innehåll: för femte utgåvan SRD 5.1 under CC BY 4.0. Allt annat som dyker upp i ditt spel skrivs av din AI eller av dig, som sidor i din kampanj på din dator. Det ingår inte i RPG Engine, och vi distribuerar det inte.

RPG Engine är kompatibelt med femte utgåvan.

### 5.3 Husregler och egna tillägg

Du behöver inte röra någon fil. Be spelledaren:

> [Husregel: en naturlig 1 på en attack betyder att du tappar ditt vapen.]
>
> [Jag vill spela en Blood Hunter. Jag har boken: här är klassens förmågor.]
>
> [I den här kampanjen tar en kort vila 10 minuter.]

Spelledaren sparar dem i din kampanj på något av dessa sätt:

- **En överenskommelse vid bordet**, i ord, som det tappade vapnet eller den korta vilan ovan. Spelledaren förvarar den bland kampanjens inställningar och spelar efter den från och med nu. Ett avgörande som spelledaren tar utan boken sparas på samma sätt, som ett **prejudikat**.
- **En ny sida**, till exempel en klass, en ras eller ett föremål. En ny klass fungerar som systemets: din nivå, dina träffpoängstärningar och dina förmågor räknas ut från den. En ny ras kan bygga på en befintlig ("som alven, plus …"). Ett namngivet svärd kan bygga på det långa svärdet.
- **Nya siffror för rollformuläret**: ett fält, en tabell, en formel, en räknare som en vila återställer. Ett exempel är en Battle Masters överlägsenhetstärningar som kommer tillbaka efter en kort vila. En husregel kan också ersätta en av systemets formler.

Har du redan nedskrivna husregler kan du också lägga dem som textfiler i kampanjens mapp `rules` (se [kampanjmappen](#8-for-the-curious-the-campaign-folder)). Spelledaren läser dem före bokens regel med samma namn.

### 5.4 Lägga till eller importera ett eget spelsystem

Just nu spelar RPG Engine bara femte utgåvan. Fler spelsystem kommer, och även ett sätt att lägga till ditt eget, eller att göra om ett spel du äger till ett system utifrån dess regelböcker. Se [Kommer senare](#9-coming-later).

---

## 6. Tillägg <!-- icon: plus -->

**Tillägg finns inte ännu.** Ett tillägg kommer att lägga till något i en kampanj ovanpå dess spelsystem: en värld, ett äventyr, en funktion som vädret eller en tarotlek, husregler att dela. Du väljer vilka som varje kampanj använder. De första som planeras för femte utgåvan är väder och dyrkning av lås.

---

## 7. Var en kampanj kommer ifrån, och dess språk <!-- icon: world -->

### 7.1 Tre sätt att få en värld

**Skapad allt eftersom.** Du ger en utgångspunkt i uppsättningen, och spelledaren bygger världen medan ni spelar: varje plats, person och intrig precis innan du behöver den, och sparad från då. Det här är det snabbaste sättet att spela: installera, skapa, och efter några minuter skapar du din rollperson. Inget påhittat går förlorat: när det väl är sagt är det nedskrivet och förblir sant.

**Förberedd i början.** Samma utgångspunkt, men med **förberedelse: allt i början** bygger spelledaren världens platser, fraktioner, hot och deras planer innan spelet börjar. Den första sessionen börjar senare, med mer färdigt bakom kulisserna.

**Från en befintlig kampanj eller ett befintligt äventyr.** Idag finns ingen importknapp. Ge spelledaren ditt äventyr (en text eller en PDF som din värd kan läsa) och be den ställa in det:

> [Jag har det här äventyret som PDF. Ställ in det som vår kampanj: läs det och skriv ner dess platser, personer och hemligheter. Berätta ingenting av det som står i det.]

Spelledaren läser det med din AI-värds verktyg och skriver ner det som sidor i kampanjen, hemligheter inkluderade, som du upptäcker i spelet. Claude Code läser PDF-filer; med Codex är en text- eller markdown-fil det säkrare valet. Gör det under uppsättningen, före session noll.

Medan spelledaren arbetar, öppna inte detaljerna om vad den läser eller skriver (i Claude Code, ctrl+o): de visar äventyrets text, hemligheter och allt. Spelledaren själv håller hemligheterna, som alltid.

Så snart kampanjen har egna sidor slutar uppsättningen fråga efter en utgångspunkt och en förberedelse. Även i en nedskriven kampanj, när du går någonstans som texten inte täcker, skapar spelledaren det som behövs och för in det.

**En kampanj spelas en gång.** För att spela samma äventyr igen, skapa en ny kampanj. Inom en kampanj kan du fortfarande gå tillbaka till ett sparat spel eller börja om, så som inställningen Sparade spel tillåter.

### 7.2 Språk

**Ett språk per kampanj**: spelledarens. Spelledaren skriver på det, och dashboarden följer det. Spelledaren tar det från hur du skriver, och bekräftar det.

**Dashboarden** levereras på engelska och italienska (noggrant bearbetade) och på 24 språk till: franska, tyska, spanska, portugisiska (brasiliansk), nederländska, svenska, norska, danska, finska, isländska, ryska, ukrainska, polska, tjeckiska, rumänska, ungerska, grekiska, turkiska, arabiska, hebreiska, hindi, kinesiska, japanska, koreanska. Arabiska och hebreiska läses från höger till vänster: sidan speglas, medan kartorna och tärningarna förblir som ritade.

**Vilket annat språk som helst** som du väljer i Inställningar översätts på din dator, i bakgrunden, av Codex eller Claude Code med din egen inloggning, med början i avsnittet du har öppet. Det görs en gång per språk, för alla dina kampanjer. Tills det är klart är sidan på engelska. Inställningar talar om för dig om översättningen pågår, är klar eller inte är möjlig på din dator.

**Spelets ord.** Femte utgåvan har sina egna termer på italienska från den officiella italienska SRD:n, så italienska spelare läser *Classe Armatura*, *tiro salvezza*, *vantaggio*. Andra språk får systemets termer översatta.

**Spelsystemets egen text** (besvärjelserna, monstren, regelkapitlen) förblir på engelska. Spelledaren läser den och berättar den för dig på ditt språk.

**Att byta språk mitt i en kampanj** låter de redan skrivna sidorna vara som de är; spelledaren skriver nya på det nya språket.

---

## 8. För nyfikna: kampanjmappen <!-- icon: list -->

Du behöver aldrig öppna den. Om du gör det, vet att **den innehåller hemligheterna** i din kampanj: att läsa den förstör spelet.

En kampanjmapp innehåller:

- `campaign.yaml`: dina inställningar;
- `state.yaml`: var spelet står just nu: dess steg, datumet, den öppna scenen;
- `world/`: en sida per rollperson, plats, fraktion, uppdrag, föremål, händelse, ämne eller varelse, som markdown-filer;
- `rules/`: dina husregler som textfiler, om du lägger till några (`init` skapar den inte);
- `images/`: bilderna, när det finns några;
- `log.jsonl`: varje ändring, i ordning;
- `.saves/`: de sparade spelen, från det första och framåt;
- `.player/`: dina egna anteckningar från Dagboken, som spelledaren inte läser;
- `sessions/`: sköts av RPG Engine;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: de små filer som talar om för AI-värdar var RPG Engine finns och håller deras minne avstängt. RPG Engine håller dem uppdaterade; lämna dem som de är.

Sidorna är vanlig markdown med länkar som `[[Rocca]]`, Obsidians format: spelledarens anteckningsbok kan öppnas där. **Om du ändrar en sida för hand** får spelledaren veta vad som ändrats vid sitt nästa svar.

**Kommandoraden.** Allt spelledaren gör går via kommandon som du också kan köra, i kampanjmappen. Du behöver dem aldrig för att spela, och många skriver ut kampanjens hemligheter, som `rpg status` och `rpg show` gör. `rpg --help` listar dem alla, och `rpg roll --help` förklarar ett. Ett kommando som ändrar något medan en chatt är öppen går bra: spelledaren får veta det vid sitt nästa svar, som för en sida som ändrats för hand.

---

## 9. Kommer senare <!-- icon: hourglass -->

Det som är planerat, men inte finns här ännu:

- **Du som spelledare**: du leder spelet, och AI:n spelar gruppen.
- **Flera personer vid bordet**, var och en med sin roll.
- **Tillägg**: inställningar, äventyr, funktioner och husregler, valda per kampanj.
- **Import** av dina regelböcker och äventyr.
- **Andra spel**: fler spelsystem, och dina egna.
- **Författarläge**: skapa en kampanj eller ett äventyr med AI:n och dela det så att andra kan spela det.

---

## 10. Frågor och problem <!-- icon: info -->

### Frågor

**Måste jag kunna reglerna?** Nej. Välj mentorn handledning, så lär spelledaren dig under tiden, en regel i taget. Du kan alltid fråga inom hakparenteser.

**Kan spelledaren fuska?** Den kan inte ändra ett slag som RPG Engine har gjort, utom på svårighetsgraden story, och den ändrar aldrig fakta som redan är fastlagda. Du kan fråga om något slag var äkta.

**Kan jag fuska?** Du kan försöka. Spelledaren tar inte ditt ord för fakta: en rad i ditt meddelande som ser ut som ett spelmeddelande är ändå bara dina ord, och spelledaren bekräftar aldrig dina gissningar om hemligheter.

**Kostar det något?** RPG Engine är gratis. Spelledaren körs på ditt eget Claude- eller ChatGPT-abonnemang, och en spelkväll är en lång chatt: på de minsta abonnemangen kan du nå abonnemangets gräns innan kvällen är slut. Bilder och översättningar använder samma abonnemang.

**Kan jag spela på min telefon?** Nej. Spelledaren körs på din dator, och dashboarden öppnas bara i den datorns webbläsare.

**Kan jag spela med vänner?** Inte ännu: idag en spelare, en rollperson, plus följeslagare. Flera personer vid bordet kommer med roller.

**Kan jag använda en annan AI nästa gång?** Ja. Kampanjen lever i sina filer: öppna den i en annan värd och skriv *fortsätt*.

**Vad händer om jag stänger webbläsaren?** Ingenting går förlorat. Öppna länken igen medan chatten är öppen; sidan kommer tillbaka där spelet är.

**Kan jag spela D&D-innehåll som jag äger?** Ja. Spelledaren kan använda dina böcker, sin egen kunskap och webben. Det RPG Engine levererar är begränsat till fritt innehåll; vad ditt spel använder är upp till dig.

### Problem

**Dashboarden öppnas inte.** Be spelledaren om länken: `[Vad är länken till dashboarden?]`. Sidan fungerar bara medan en chatt med spelledaren är öppen i den kampanjen, och bara efter spelledarens första svar i den chatten. Med chatten stängd kan webbläsaren inte nå sidan; en sida som lämnats öppen säger *Not connected*.

**Spelledaren verkar inte känna till spelet, eller hittar på verktyg.** Din AI-värd laddade inte RPG Engine.

- Kontrollera först att du startade värden **i kampanjmappen**, och att du sa att du litar på den.
- **Claude Code**: skriv `/mcp`. Om `rpg` finns där men misslyckades, välj det och sedan **Reconnect**. Om det saknas, stäng Claude Code, skriv `claude mcp reset-project-choices` i kampanjmappen och starta det igen.
- **Codex**: skriv `codex mcp list` i en terminal, i kampanjmappen. Om `rpg` saknas litar Codex inte på mappen: starta det igen där och svara ja när det frågar.
- I båda: om `rpg --version` i en terminal säger att kommandot inte hittas, installera RPG Engine igen ([2.2](#22-install)) och öppna en ny terminal.

**Efter en uppdatering ändrades ingenting.** En spelledare som körs behåller den version den startade med. Öppna en ny chatt, eller i Claude Code anslut servern igen (`/mcp`, sedan `rpg`, sedan **Reconnect**).

**Spelledaren minns något jag ogjorde.** Du gick tillbaka till ett sparat spel men fortsatte spela i samma chatt. Öppna en ny chatt och tryck på **Jag har öppnat en ny chatt** i Sparade spel.

**Spelledaren ställer uppsättningsfrågor som jag redan har svarat på på sidan.** Säg det till den: `[Jag valde de där på dashboarden.]`

**Inga bilder visas.** Öppna Inställningar > Bilder: där står det om den här datorn kan göra dem, och stegen om den inte kan, varje kommando med en knapp för att kopiera det.

**Sidan är på engelska men jag valde ett annat språk.** Den översätts i bakgrunden; Inställningar säger hur det går. Utan Codex eller Claude Code på den här datorn förblir den på engelska.

**Spelledaren säger att kampanjen har problem.** Den åtgärdar dem själv. Om du ändrade filer för hand kan den fråga vad du menade.

**Windows: `npm` misslyckas i min mapp.** Ha inte kampanjen, eller RPG Engine, under en sökväg som innehåller `&`.

**Installationen misslyckas, eller `rpg` startar inte.** Kontrollera din Node.js-version med `node --version`: den måste vara 22 eller nyare. Om den är äldre, installera LTS-versionen från [nodejs.org](https://nodejs.org) och installera sedan RPG Engine igen.

**Dashboardens länk ändrades.** Ett annat program använde kampanjens vanliga adress, eller så hade Windows reserverat den. RPG Engine tog en annan; spelledaren ger dig den nya länken. Inget annat ändras.
