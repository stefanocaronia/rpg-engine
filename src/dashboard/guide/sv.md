<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb f4fdeebb 80a7cfb9 23c5f59b b8f80c05 8c9f41da 0b4a6ef8 4eb17899 728ca4a5 e2839149. Change the English, then run it again. -->
# RPG Engine: den kompletta guiden

**RPG Engine** låter dig spela ett bordsrollspel med en **AI som spelledare**. Du pratar med spelledaren i en **chatt**. RPG Engine arbetar i bakgrunden: det **minns världen**, **slår tärningarna** och **för räkenskaperna**. Bredvid chatten har du en sida öppen i webbläsaren, **dashboarden**, med ditt rollformulär, tärningarna, kartorna och din dagbok.

Den här guiden är till för spelare: du behöver inte kunna programmera.

## Snabbstart <!-- icon: send -->

1. Installera **Node.js** från [nodejs.org](https://nodejs.org) (LTS-versionen).
2. Installera en **AI-agent**, programmet som spelledaren körs i, och logga in: till exempel Claude Code eller Codex ([2.4](#24-connect-your-ai)).
3. Installera RPG Engine i en terminal: `npm install -g rpg-engine`.
4. Skapa en kampanj: `rpg init "The Salt Isles"`.
5. Gå in i den nya mappen med `cd "The Salt Isles"` och starta din agent där: `claude` för Claude Code, `codex` för Codex. Svara ja när den frågar om du litar på mappen ([2.4](#24-connect-your-ai)) och skriv sedan *Hej! Nu börjar vi.* Spelledaren svarar med länken till din dashboard.

## 1. Vad RPG Engine är <!-- icon: about -->

| Vem | Vad de gör |
|---|---|
| **Du** | Du spelar din rollperson: vad den gör, säger och försöker. |
| **Spelledaren** (AI:n) | Berättar historien, spelar alla andra, avgör vad som händer och ber om slag. |
| **RPG Engine** | Förvarar världen i filer, slår tärningarna, räknar livspoäng, pengar, tid och avstånd, och håller hemligheter dolda tills du upptäcker dem. |

Världen förblir densamma från en kväll till nästa, även i en ny chatt, även med en annan AI:

- **Det som har sagts förblir sant.** En död skurk förblir död.
- **Tärningarna är äkta.** Spelledaren kan inte vrida på dem, utom på den lättaste svårighetsgraden, om du väljer den.
- **Hemligheter förblir hemliga.** Spelledaren berättar aldrig det som din rollperson inte vet.
- **Världen rör sig.** Hot närmar sig medan du vilar eller reser, och du ser tecknen.
- **En kampanj är en mapp** på din dator: sluta när du vill och fortsätt senare.

I dag spelar RPG Engine ett spelsystem, **femte utgåvan**, från det fria System Reference Document 5.1. Fler kommer ([Kommer senare](#9-coming-later)).

---

## 2. Komma igång <!-- icon: path -->

### 2.1 Det här behöver du

- En dator med Windows, macOS eller Linux, och en webbläsare.
- **Node.js 22** eller nyare, från [nodejs.org](https://nodejs.org). Det följer med `npm`, som installerar RPG Engine.
- En **terminal**: i Windows Terminal eller PowerShell, i macOS Terminal. För att öppna en i en mapp: högerklicka på mappen och välj **Öppna i Terminal** (Windows) eller **Tjänster > Ny terminal i mappen** (macOS).
- En **AI-agent** för spelledaren ([2.4](#24-connect-your-ai)), med den **största modellen** den erbjuder: en liten modell är lättare att övertala att avslöja hemligheter eller böja reglerna.

### 2.2 Installera

```text
npm install -g rpg-engine
```

Med `rpg --version` kontrollerar du att det gick bra. Du använder `rpg` en gång per kampanj, för att skapa den. Därefter startar din agent RPG Engine själv.

### 2.3 Skapa en kampanj

Öppna en terminal i mappen där du förvarar dina spel ([2.1](#21-what-you-need) visar hur):

```text
rpg init "The Salt Isles"
```

Då skapas mappen `The Salt Isles` med en ny kampanj i. Gå in i den med `cd "The Salt Isles"`. Kom ihåg var den ligger: du återvänder dit varje gång du spelar. Allt annat väljer du senare, i chatten eller på dashboarden. `rpg init --help` listar alternativen om du vill välja något redan nu, till exempel `--language it` eller `--difficulty hard`.

Spelledaren kan inte skapa en kampanj åt dig: före `init` finns inget som talar om för din agent var RPG Engine finns.

### 2.4 Koppla in din AI

Spelledaren körs i en **AI-agent**: en AI-app, i terminalen eller på skrivbordet, som kan arbeta med filerna på din dator, till exempel Claude Code eller Codex. En vanlig chatt som claude.ai eller ChatGPT, eller en app i telefonen, räcker inte: spelledaren måste nå kampanjens filer på din dator. Varje agent kräver sin egen plan och sin egen inloggning: Claude Code en betald Claude-plan, Codex en ChatGPT-inloggning. Du installerar den en gång, från dess egen sida: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: skriv `claude` i kampanjmappen. När den frågar om du litar på mappen väljer du **Yes, I trust this folder**. Var försiktig: det förvalda svaret är *No, exit*.
- **Codex**: skriv `codex` i kampanjmappen och svara ja när den frågar om du litar på mappen. I skrivbordsappen kontrollerar du i inställningarna att minnen är avstängda för spelets chattar.
- **En annan agent**: starta den i kampanjmappen och ge den MCP-servern `rpg mcp`. RPG Engine är en vanlig MCP-server: alla agenter som stöder MCP kan vara spelledare, även lokala.

Vi spelar och testar med **Claude Code**. **Codex** är kopplat och kontrollerat, men ingen hel kampanj har spelats med det ännu. `init` ställer också in **Gemini CLI**. Kampanjen stänger av agentens eget minne: spelet finns i dess filer, så att en återgång till ett sparat spel verkligen går tillbaka.

### 2.5 Den första chatten

Skriv vad du vill, till exempel *Hej! Nu börjar vi.* I sitt första svar i varje chatt ger spelledaren dig **länken till din dashboard**, något i stil med `http://127.0.0.1:4750`. Öppna den och ha den bredvid chatten.

Mellan spelledarens meddelanden visar din agent de verktyg den använder. Öppna inte deras detaljer (i Claude Code, ctrl+o), eftersom de kan avslöja hemligheter.

En ny kampanj går igenom tre steg, som visas högst upp på dashboarden: **1 Inställningar** (hur du vill spela), **2 Session noll** (du skapar din rollperson, under spel), **3 Spel**.

### 2.6 Inställningar: välj hur du spelar

Spelledaren frågar bara det som ännu saknas, några frågor i taget. Dashboardens steg **Inställningar** visar samma frågor som kort. Skriv "du bestämmer" så väljer spelledaren. Allt kan ändras senare, i chatten eller i **Inställningar**.

| Inställning | Vad den avgör | Värden |
|---|---|---|
| **Mentor** | Hur mycket spelledaren lär ut reglerna | av, tips, handledning |
| **Svårighetsgrad** | Hur hård världen är | berättelse, lätt, normal, svår, brutal |
| **Dödlighet** | Vad det betyder att falla i strid | berättande (dör aldrig), episk (bara när det spelar roll), tärningar |
| **Sparade spel** | När du får gå tillbaka | permadeath, checkpoint, fritt ([3.8](#38-saves-and-going-back)) |
| **Stränghet** | Hur noga mat, ljus och resor följer reglerna | mjuk, regler, simulering |
| **Tärningar** | Vem som slår dina tärningar | digitala, fysiska |
| **Måttenheter** | Avstånd och vikter | metriska, imperiska |
| **Följeslagare** | Vem som reser med dig | inga, skapade med dig, skapade av spelledaren, möts under spel |
| **Bilder** | Bilder av platser, uppdrag och de du möter | inga, på begäran, nya platser, uppdrag och de du möter ([3.11](#311-pictures)) |
| **Gränser** och **Slöjor** | Det som aldrig förekommer, och det som bara sker utanför scenen | listor |
| **Språk** | Spelets och dashboardens språk | valfritt |

Femte utgåvan lägger till **utveckling**: erfarenhetspoäng eller milstolpar.

Om ingen värld är skriven frågar spelledaren också efter en **premiss** (genre, ton, några inslag, med dina ord) och efter **förberedelsen**: bygga världen allteftersom, under spelets gång, eller allt i början.

**Spelledarens stil** frågas aldrig, men du kan ändra den i chatten eller i **Inställningar**: **prosan** (enkel, litterär, pulp, torr humor), **berättelserna** den hittar på (situationer, bågar, avsnitt, mysterium), en författare att **skriva som**, eller något annat **med dina ord**.

### 2.7 Session noll: din rollperson

Du skapar din rollperson tillsammans med spelledaren, som vid ett bord. Varje val är ditt, om du inte ber spelledaren göra det: kom med en färdig idé, en vag eller ingenting alls. Spelledaren berättar hur förmågepoängen bestäms innan någon tärning slås. Din bakgrundshistoria krävs aldrig. Om du ger en skriver spelledaren in den med dina ord. Sedan ber spelledaren om en bild av din rollperson ([3.7](#37-your-characters-story-and-picture)). RPG Engine räknar ut rollformuläret: du behöver aldrig räkna själv.

---

## 3. Spela <!-- icon: chat -->

### 3.1 Prata med spelledaren

Skriv vad din rollperson gör eller säger, med egna ord:

> Jag frågar värdshusvärden vilka andra som kom förbi i kväll.

Utanför berättelsen skriver du inom hakparenteser: *[Hur fungerar grappling?]* Spelledaren svarar också inom hakparenteser.

Du säger vad du försöker, spelledaren säger vad som händer. Spelledaren bestämmer aldrig åt din rollperson och pratar aldrig om motorn. Du kan fråga hur dashboarden används.

### 3.2 Slag

Spelledaren ber om ett slag bara när utgången är osäker och spelar roll, och säger först vad som står på spel. Sedan:

- **På dashboarden** visar en banderoll en knapp för varje slag, till exempel *Acrobatics +4 · with advantage*. Klicka på den: tärningarna faller på sidan och spelledaren får resultatet. Du kan också klicka på raden i ditt rollformulär som lyser, slänga tärningarna från tärningsbrickan eller skriva något annat i banderollen.
- **För hand**, i banderollens hörn eller i **Inställningar**: banderollen säger vad du ska slå, och du slår det från ditt rollformulär eller tärningsbrickan.
- **Fysiska tärningar**, när tärningsinställningen står på fysiska: du skriver vilka sidor du slog, *[Jag slog 14.]*, och RPG Engine lägger till dina modifikationer.

**Fria slag**: klicka på valfritt tal i ditt rollformulär, eller öppna tärningsbrickan, för att slå på skoj. De räknas aldrig och spelledaren ser dem aldrig.

**Spelledarens slag** visas i din slagkolumn, utom de hemliga. Du kan alltid fråga *[Var det slaget på riktigt?]*: för ett hemligt slag ger spelledaren ett fingeravtryck som bevisar att det gjordes innan du frågade.

### 3.3 Scener och strider

Berättelsen löper i **scener**: en strid, ett samtal, utforskande, resor, en vila. I slutet av varje scen sparas spelet av sig självt, och scenen hamnar i din dagbok.

I en strid berättar spelledaren varje tur som inte är din och stannar där du kan bestämma. Sektionen **Strid** visar turordningen, din grupps livspoäng och hur skadade fienderna ser ut, i ord. Om din rollperson faller visas dödsslagen stort på sidan.

### 3.4 Tid, resor och världen som rör sig

RPG Engine håller reda på datumet. Ingen tid går mellan sessionerna. Säg att ni vilar, *Vi tar en lång vila*, så ger vilan tillbaka det den ska. Säg vart ni går, *Vi tar vägen norrut mot Rocca*, så räknar RPG Engine ut vägen, avståndet och dagarna, och stannar när något händer på vägen. Pengar räknas i spelets mynt, växel inräknad.

Skurkar har planer med tidsgränser. Varje ny dag flyttar spelledaren fram de hot som tiden har fört närmare, och du ser deras tecken, aldrig själva klockan.

### 3.5 Kartor

**Värld** visar de platser din rollperson känner till, vägarna mellan dem och spåret du har gått, med dimma över resten. **Scen** visar kartan över platsen där du befinner dig, när den har en, med vem som står var. I en strid, på din tur, är de rutor du inte kan nå dolda av slöjor. När spelledaren frågar vart du går, tryck på en ruta eller skriv den, till exempel *E4*.

### 3.6 Uppdrag, dagbok och anteckningar

En uppgift som din rollperson tar sig an blir ett uppdrag i **Dagbok**, med sina mål, sin tidsgräns och det den mäter. Markera det med stjärna för att ha det i sikte överst i Scen. Dagboken berättar också din **historia**, scen för scen, och rymmer dina **anteckningar**: privata, om du inte **Delar** en. Spelledaren hör den som vad du tänker, aldrig som ett faktum.

### 3.7 Din rollpersons historia och bild

På ditt rollformulär har kortet **Beskrivning** en ruta för din rollpersons historia: spelledaren skriver in den, efter att du har sagt ja. För en bild ger du spelledaren en fil (PNG, JPEG, WebP eller SVG, upp till 5 MB) med var den finns på din dator, eller låter göra ett porträtt ([3.11](#311-pictures)): *[Gör ett porträtt åt mig: grått hår i fläta, ett ärr på hakan.]*

### 3.8 Sparade spel och att gå tillbaka

RPG Engine sparar hela kampanjen i slutet av varje scen. Inställningen **Sparade spel** avgör resten:

| Sparade spel | Spara när du vill | Gå tillbaka |
|---|---|---|
| **permadeath** | nej | aldrig |
| **checkpoint** | nej | till det senaste sparade spelet, bara när din rollperson dör |
| **fritt** | ja | till vilket sparat spel som helst |

I alla lägen kan du **börja om**, från spelets början eller från session noll. Gör det i chatten eller i **Sparade spel**.

När du har gått tillbaka ska du **öppna en ny chatt**: den gamla minns det som ogjordes. Skriv *fortsätt* i den nya chatten och tryck sedan på **Jag har öppnat en ny chatt** i Sparade spel.

### 3.9 Sessioner: sluta och komma tillbaka

Sluta när du vill: *[Vi slutar här för i kväll.]* Allt är redan sparat i filerna. För att komma tillbaka startar du din agent i kampanjmappen och skriver *fortsätt*: spelledaren ger dig en kort sammanfattning och går vidare.

### 3.10 Spelledarens sinnesstämning

Roboten högst upp på dashboarden är spelledaren: dess ansikte följer berättelsens ton och avslöjar aldrig det du ännu inte vet. När chatten är stängd sover den.

### 3.11 Bilder

RPG Engine kan låta göra bilder av platserna du når, uppdragen du tar och de du möter, så som inställningen **Bilder** säger, och din rollpersons porträtt när du ber om det. Det använder det som finns på din dator, med din egen inloggning: **Codex** målar dem, annars ritar **Claude Code** dem. **Inställningar** visar om den här datorn kan göra dem, och hur du ställer in det om den inte kan. Du kan alltid ge spelledaren en egen bild.

### 3.12 Trygghet: gränser, slöjor och stopp

**Gränser** förekommer aldrig i spelet. **Slöjor** sker bara utanför scenen. När som helst kan du skriva *[stopp]*: spelledaren släpper det innehållet direkt och lägger till det bland dina gränser.

### 3.13 Ångra dig

Varje inställning kan ändras, i chatten eller i **Inställningar**. Ett avgörande som spelledaren gör utan regelboken blir ett **prejudikat**, så att samma fråga får samma svar nästa gång.

---

## 4. Dashboarden <!-- icon: party -->

En sida på din egen dator, som bara öppnas i den datorns webbläsare och är levande medan chatten är öppen. När chatten stängs visar den *Not connected*. Den kommer tillbaka av sig själv med nästa chatt.

- **Grupp**: ditt rollformulär och dina följeslagares. Klicka på ett tal för att slå det. Håll muspekaren över det för att se var det kommer ifrån. Bredvid finns slagen.
- **Scen**: var du är, dess bild och karta, vem som är där, vad som händer.
- **Strid**: bara i en strid: turerna, de som slåss, det du har till hands.
- **Dagbok**: uppdrag, historien, dina anteckningar.
- **Värld**: världskartan så som din rollperson känner den.
- **Tärningsbrickan**: välj tärningar och en modifikation, och slå.
- **Sparade spel**, **Hjälp**, **Inställningar** och **Om**, som ikoner i slutet av raden. Inställningar rymmer också sidans egna val: tema, tärningsljud, tärningsset.

När spelledaren frågar dig något ligger dess banderoll kvar överst, oavsett vilken sektion du är i.

---

## 5. Spelsystem och husregler <!-- icon: dice -->

### 5.1 Vad ett spelsystem är

Data för ett spel: dess rollformulär, dess tal, dess varelser, föremål, besvärjelser och regeltexter. Varje kampanj spelar ett system. RPG Engine räknar ut rollformuläret och vad som förbrukas och kommer tillbaka. Hur en egenskap fungerar läser spelledaren i reglerna och avgör, som vid ett bord.

### 5.2 Femte utgåvan, ingår

Raserna, klasserna, subklasserna, en bakgrund och en färdighet (feat) i SRD 5.1, de 319 besvärjelserna, vapnen, rustningarna, magiska föremålen och monstren, regelkapitlen som spelledaren läser efter exakt text och det fullständiga rollformuläret, uträknat.

Du kan också spela innehåll som saknas i SRD, från en bok du äger: spelledaren skriver det som sidor i din kampanj, och RPG Engine behandlar dem som sina egna. RPG Engine levereras bara med öppet innehåll. Det din spelledare kan är inte begränsat.

### 5.3 Husregler och egna tillägg

Fråga spelledaren: *[Husregel: en naturlig 1 på en attack betyder att du tappar ditt vapen.]* Den behåller det som en överenskommelse vid bordet, eller skriver en sida eller ett tal i rollformuläret när det behövs. Husregler som redan är utskrivna kan läggas som textfiler i kampanjens mapp `rules`.

### 5.4 Lägga till eller importera ditt eget spelsystem

Inte än: i dag spelar RPG Engine bara femte utgåvan ([Kommer senare](#9-coming-later)).

---

## 6. Tillägg <!-- icon: plus -->

Inte än. Ett tillägg kommer att lägga till något i en kampanj ovanpå dess spelsystem: en värld, ett äventyr, en funktion som vädret, husregler att dela.

---

## 7. Var en kampanj kommer ifrån, och dess språk <!-- icon: world -->

### 7.1 Tre sätt att få en värld

- **Skapad allteftersom**: utifrån din premiss bygger spelledaren varje plats, person och intrig strax innan du behöver den, och behåller den.
- **Förberedd i början**: samma sak, men med världen byggd före spelet.
- **Från ditt eget äventyr**: ge spelledaren en text eller en PDF och be den ställa in det, *[Ställ in det här äventyret som vår kampanj. Berätta inget av det som står i det.]* Spelledaren skriver platserna, rollpersonerna och hemligheterna. Det finns ingen importknapp än.

En kampanj spelas en gång: för att spela samma äventyr igen skapar du en ny kampanj.

### 7.2 Språk

Ett språk per kampanj, spelledarens, som dashboarden följer. Dashboarden levereras på 26 språk. Alla andra översätts på din dator av Codex eller Claude Code, eller, utan dem, av spelledaren i chatten. Femte utgåvans termer på italienska kommer från den officiella italienska SRD:n. Regeltexten förblir på engelska, och spelledaren berättar den på ditt språk.

---

## 8. För de nyfikna: kampanjmappen <!-- icon: list -->

Du behöver aldrig öppna den, och den innehåller din kampanjs hemligheter. Den har `campaign.yaml` (dina inställningar), `state.yaml` (var spelet står), `world/` (en markdown-sida för varje rollperson, plats, uppdrag och resten), `rules/` (dina husregler), `images/`, `log.jsonl` (varje ändring), `.saves/`, `.player/` (dina anteckningar) och de små filerna som talar om för AI-agenter var RPG Engine finns. Sidorna använder Obsidians format. Om du ändrar en sida för hand får spelledaren veta det vid sitt nästa svar.

Varje kommando som spelledaren använder kan också köras i kampanjmappen: `rpg --help` listar dem. Många skriver ut kampanjens hemligheter.

---

## 9. Kommer senare <!-- icon: hourglass -->

- **Du som spelledare**, med AI:n som spelar gruppen.
- **Författarläge**: skriv ett äventyr med AI:n, exportera det och dela det.
- **Flera spelare på samma dator**, var och en med sin egen rollperson, som turas om i samma chatt.
- **Tillägg**: inställningar, äventyr, funktioner och husregler.
- **Import** av dina regelböcker och äventyr.
- **Andra spel**: fler spelsystem, och dina egna.

---

## 10. Frågor och problem <!-- icon: info -->

### Frågor

**Måste jag kunna reglerna?** Nej. Välj mentorn handledning och fråga inom hakparenteser när du vill.

**Kan spelledaren fuska?** Den kan inte ändra ett slag som RPG Engine har gjort, utom på svårighetsgraden berättelse, och inte heller fakta som redan är fastställda.

**Kostar det något?** RPG Engine är gratis. Spelledaren körs på din agents plan, eller på din egen dator med en lokal modell. En spelkväll är en lång chatt: på de minsta planerna kan du nå planens gräns innan kvällen är slut. Bilder och översättningar använder samma plan.

**Kan jag spela i telefonen?** Nej: spelledaren körs på din dator, och dashboarden öppnas bara där.

**Kan jag spela med vänner?** Inte än: i dag en spelare, en rollperson, plus följeslagare ([Kommer senare](#9-coming-later)).

**Kan jag använda en annan AI nästa gång?** Ja: öppna kampanjen i en annan agent och skriv *fortsätt*.

### Problem

**Dashboarden öppnas inte.** Fråga spelledaren: `[Vad är länken till dashboarden?]`. Den fungerar bara medan en chatt är öppen i den kampanjen, efter spelledarens första svar.

**Spelledaren verkar inte kunna spelet.** Din agent har inte laddat RPG Engine. Kontrollera att du startade den i kampanjmappen och att du litade på den. I Claude Code skriver du `/mcp` och ansluter `rpg` igen. I Codex måste `codex mcp list` i kampanjmappen visa `rpg`. Om `rpg --version` inte hittas, installera RPG Engine igen ([2.2](#22-install)).

**Uppdatera.** Kör `npm install -g rpg-engine` igen och öppna sedan en ny chatt: en spelledare som redan körs behåller den version den startade med.

**Spelledaren minns något som jag ångrade.** Öppna en ny chatt och tryck på **Jag har öppnat en ny chatt** i Sparade spel.

**Inga bilder visas.** Inställningar > Bilder visar om den här datorn kan göra dem, och hur.

**Installationen misslyckas, eller `rpg` startar inte.** `node --version` måste visa 22 eller nyare. I Windows ska du hålla RPG Engine och dina kampanjer borta från sökvägar som innehåller `&`.

**Dashboardlänken har ändrats.** Ett annat program tog den vanliga adressen. Spelledaren ger dig den nya länken.
