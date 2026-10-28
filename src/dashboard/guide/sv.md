<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb 4c5cd093 019e9516 8e136927 ece214f0 8c9f41da 17577253 f699a840 241f6611 59c1a762. Change the English, then run it again. -->
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

## 2. Kom igång <!-- icon: path -->

### 2.1 Det här behöver du

- En dator med Windows, macOS eller Linux, och en webbläsare.
- **Node.js 22** eller nyare, från [nodejs.org](https://nodejs.org). Där ingår `npm`, som installerar RPG Engine.
- En **terminal**: i Windows Terminal eller PowerShell, i macOS Terminal. Så öppnar du en i en mapp: högerklicka på mappen och välj **Öppna i Terminal** (Windows) eller **Tjänster > Ny terminal i mappen** (macOS).
- En **AI-agent** till spelledaren ([2.4](#24-connect-your-ai)), med den **största modellen** den erbjuder: en liten modell går lättare att prata till rätta, så att den avslöjar hemligheter eller bryter mot reglerna.

### 2.2 Installera

```text
npm install -g rpg-engine
```

Med `rpg --version` kontrollerar du att det gick bra. Du använder `rpg` en gång per kampanj, för att skapa den. Sedan startar din agent RPG Engine själv.

### 2.3 Skapa en kampanj

Öppna en terminal i mappen där du förvarar dina spel ([2.1](#21-what-you-need) visar hur):

```text
rpg init "The Salt Isles"
```

Det skapar mappen `The Salt Isles` med en ny kampanj i. Gå in i den med `cd "The Salt Isles"`. Kom ihåg var den ligger: du återvänder dit varje gång du spelar. Allt annat väljer du senare, i chatten eller på dashboarden. `rpg init --help` listar alternativen om du vill välja något redan nu, till exempel `--language it` eller `--difficulty hard`.

Spelledaren kan inte skapa en kampanj åt dig. Före `init` vet din agent inte var RPG Engine finns.

### 2.4 Anslut din AI

Spelledaren körs i en **AI-agent**: en AI-app, i terminalen eller på skrivbordet, som kan arbeta med filerna på din dator, till exempel Claude Code eller Codex. En vanlig chatt som claude.ai eller ChatGPT, eller en app i mobilen, räcker inte: spelledaren måste kunna nå kampanjens filer på din dator. Varje agent kräver sitt eget abonnemang och sin egen inloggning: Claude Code ett betalt Claude-abonnemang, Codex en ChatGPT-inloggning. Du installerar agenten en gång, från dess egen sida: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: skriv `claude` i kampanjmappen. När den frågar om du litar på mappen väljer du **Yes, I trust this folder**. Se upp: svaret som är förvalt är *No, exit*. Kampanjen har också en liten hook, `rpg --listen`, som frågan inte visar. Den talar direkt om för spelledaren när du gör något på dashboarden.
- **Codex**: skriv `codex` i kampanjmappen och svara ja när den frågar om du litar på mappen. Kontrollera i inställningarna i skrivbordsappen att minnen är avstängda för spelets chattar.
- **En annan agent**: starta den i kampanjmappen och ge den MCP-servern `rpg mcp`. RPG Engine är en standardiserad MCP-server: alla agenter som stöder MCP kan vara spelledare, även lokala.

Vi spelar och testar med **Claude Code**. **Codex** är ansluten och kontrollerad, men ingen hel kampanj har ännu spelats med den. Kampanjen stänger av agentens eget minne: spelet finns i dess filer, så att en återgång till ett sparat spel verkligen tar dig tillbaka.

### 2.5 Den första chatten

Skriv vad som helst, till exempel *Hej! Nu börjar vi.* I sitt första svar i varje chatt ger spelledaren dig **länken till din dashboard**, ungefär `http://127.0.0.1:4750`. Öppna den och ha den bredvid chatten.

Mellan spelledarens meddelanden visar din agent de verktyg den använder. Öppna inte deras detaljer (i Claude Code, ctrl+o): de kan visa hemligheter.

En ny kampanj går igenom tre steg, som visas högst upp på dashboarden: **1 Inställningar** (hur du vill spela), **2 Session noll** (du skapar din rollperson, i spelet), **3 Spela**.

### 2.6 Inställningar: välj hur du spelar

Spelledaren frågar bara efter det som fortfarande saknas, några frågor i taget. Dashboardens steg **Inställningar** visar samma frågor som kort. Skriv "du bestämmer" så väljer spelledaren. Allt går att ändra senare, i chatten eller i **Inställningar**.

| Inställning | Vad den bestämmer | Värden |
|---|---|---|
| **Mentor** | Hur mycket spelledaren lär dig om reglerna | av, tips, handledning |
| **Svårighetsgrad** | Hur hård världen är | berättelse, lätt, normal, svår, brutal |
| **Dödlighet** | Vad det betyder att falla i en strid | berättande (dö aldrig), episk (bara när det spelar roll), tärningar |
| **Sparade spel** | När du får gå tillbaka | permadeath, checkpoint, fritt ([3.8](#38-saves-and-going-back)) |
| **Stränghet** | Hur noga mat, ljus och resor följer reglerna | smidigt, regler, simulering |
| **Tärningar** | Vem som slår dina tärningar | digitala, fysiska |
| **Måttenheter** | Avstånd och vikter | metriska, imperiska |
| **Rollpersonernas röster** | Vem som talar för de rollpersoner du möter, från spelledaren till rollpersonerna: spelledaren alltid; i viktiga ögonblick rollpersonen själv, som bara vet det den vet, när spelledaren väljer det; eller alltid rollpersonen, för de viktigaste eller för alla, långsammare och dyrare, där din AI-app klarar det | spelledaren, ibland, huvudpersoner, alla |
| **Följeslagare** | Vem som reser med dig | inga, skapade med dig, skapade av spelledaren, möts i spelet |
| **Bilder** | Bilder av platser, uppdrag och dem du möter | inga, på begäran, nya platser, uppdrag och dem du möter ([3.11](#311-pictures)) |
| **Gränser** och **Slöjor** | Det som aldrig förekommer, och det som bara sker utanför scen | listor |
| **Språk** | Spelets och dashboardens språk | valfritt |

Femte utgåvan lägger till **utveckling**: erfarenhetspoäng eller milstolpar.

Om det inte finns någon färdig värld frågar spelledaren också efter en **premiss** (genre, ton, några inslag och vad du tycker mest om i ett spel, till exempel strider, mysterier, samtal eller utforskande, med dina egna ord) och efter **förberedelsen**: bygga världen allt eftersom, under spelets gång, eller allt i början.

**Spelledarens stil** efterfrågas aldrig, men du kan ändra den i chatten eller i **Inställningar**: **prosan** (enkel, litterär, pulp, torr), de **berättelser** spelledaren hittar på (situationer, bågar, episoder, mysterium), en författare att **skriva som**, eller något annat **med dina ord**.

### 2.7 Session noll: din rollperson

Du skapar din rollperson tillsammans med spelledaren, som vid ett spelbord. Varje val är ditt, om du inte ber spelledaren göra det: kom med en färdig idé, en vag eller ingen alls. Spelledaren berättar hur förmågepoängen tas fram innan någon tärning slås. Din bakgrundsberättelse är aldrig ett krav. Om du ger en skriver spelledaren den med dina ord. Sedan ber spelledaren om en bild av din rollperson ([3.7](#37-your-characters-story-and-picture)). RPG Engine räknar ut rollformuläret: du behöver aldrig göra uträkningarna.

---

## 3. Att spela <!-- icon: chat -->

### 3.1 Prata med spelledaren

Skriv vad din rollperson gör eller säger, med egna ord:

> Jag frågar värdshusvärden vem mer som kom förbi ikväll.

Skriv inom hakparenteser när du pratar utanför berättelsen: *[Hur fungerar brottning?]* Spelledaren svarar också inom hakparenteser.

Du säger vad du försöker göra. Spelledaren säger vad som händer. Spelledaren bestämmer aldrig något åt din rollperson och pratar aldrig om motorn. Du kan fråga spelledaren hur du använder dashboarden.

**Agera från dashboarden**: klicka på ett namn på ditt rollformulär, till exempel ett vapen, en besvärjelse eller något du bär på. Välj sedan vem det gäller. Du kan också klicka på en person för att prata med den. Dashboarden skriver din mening, *Jag attackerar Hooded Bandit 1 med Mace.*, och du kan ändra den innan du väljer **Säg till spelledaren**. Spelledaren hör den som om den sagts i chatten och dömer den som vilken annan handling som helst. Där din AI-app inte kan höra den själv gör **Kopiera** den klar att klistra in i chatten.

### 3.2 Slag

Spelledaren ber om ett slag bara när utgången är osäker och spelar roll. Först säger spelledaren vad som står på spel. Sedan:

- **På dashboarden** visar en banderoll en knapp för varje slag, till exempel *Acrobatics +4 · with advantage*. Klicka på den: tärningarna faller på sidan och spelledaren hör resultatet. Du kan också klicka på raden på ditt rollformulär som lyser upp, slå tärningarna från tärningsbrickan eller skriva något annat i banderollen.
- **För hand**, i banderollens hörn eller i **Inställningar**: banderollen säger vad du ska slå, och du slår det från ditt rollformulär eller från tärningsbrickan.
- **Fysiska tärningar**, när tärningsinställningen står på fysiska: du skriver vilka sidor du slog, *[Jag slog en 14.]*, och RPG Engine lägger till dina modifikationer.

**Fria slag**: klicka på vilket tal som helst på ditt rollformulär, eller öppna tärningsbrickan, för att slå på skoj. De räknas aldrig, och spelledaren ser dem aldrig.

**Spelledarens slag** syns i din slagkolumn, utom de hemliga. Du kan alltid fråga *[Var det slaget på riktigt?]*: för ett hemligt slag ger spelledaren ett fingeravtryck som bevisar att slaget gjordes innan du frågade.

### 3.3 Scener och strider

Berättelsen går i **scener**: en strid, ett samtal, utforskning, resa eller vila. I slutet av varje scen sparas spelet av sig självt, och scenen hamnar i din dagbok.

I en strid berättar spelledaren varje tur som inte är din, och stannar där du kan bestämma. **Scen** visar högst upp vems tur det är och vem som kommer härnäst, och din rollpersons kort bredvid kartan. Turordningen, gruppens träffpoäng och hur skadade fienderna ser ut, i ord, står kvar bredvid sidan. Om din rollperson faller visas dödsslagen stort på sidan.

### 3.4 Tid, resor och världen som rör sig

RPG Engine håller reda på datumet. Ingen tid går mellan sessionerna. Säg att ni vilar, *Vi tar en lång vila*, så ger vilan tillbaka det den ska när spelledaren går med på den. Vid en kort vila kan spelledaren fråga på dashboarden hur många träffterningar du använder: slå dem en i taget, se hur mycket var och en läker och sluta när du vill. Säg vart ni går, *Vi tar vägen norrut mot Rocca*, så räknar RPG Engine ut vägen, avståndet och dagarna, och stannar när något händer på vägen. Pengar räknas i spelets mynt, med växel.

Skurkar har planer med tidsfrister. Varje ny dag flyttar spelledaren fram de hot som tiden har fört framåt. Du ser tecknen på dem, aldrig själva klockan.

### 3.5 Kartor

**Värld** visar de platser din rollperson känner till, vägarna mellan dem och spåret du har gått, med dimma över resten. **Scen** visar kartan över platsen där du är, när det finns en, och vem som står var. I en strid, på din tur, är de rutor du inte kan nå dolda. När spelledaren frågar vart du går, tryck på en ruta eller skriv den, till exempel *E4*.

**Värld** rymmer också det din rollperson vet. **Kunskap** listar de personer, platser, fraktioner, varelser och berättelser som rollpersonen känner till, var och en så som rollpersonen känner till den. Sök i listan, eller öppna en post för att läsa den helt. Ett namn i texten leder till sin sida. **Dokument** sparar breven, kungörelserna och sidorna som rollpersonen hittade, så att du kan läsa dem igen. **Kalender** visar dagens datum, dina uppdrags tidsfrister med tiden som är kvar, och berättelsens dagar. En dag med scener leder till sina kapitel i dagboken.

### 3.6 Uppdrag, dagbok och anteckningar

En uppgift som din rollperson tar sig an blir ett uppdrag i **Dagbok**, med sina mål, sin tidsfrist och det den mäter. Stjärnmärk det för att ha det i sikte högst upp i Scen. Dagboken berättar också din **berättelse**, scen för scen, och sparar dina **anteckningar**. De är privata, om du inte väljer **Dela** för en av dem. Spelledaren hör den då som något du tänker, aldrig som ett faktum. Under **Följeslagare** läser du dina följeslagares dagböcker. Då och då, i slutet av en dag eller ett uppdrag, skriver de några rader om vad de tänker och känner.

### 3.7 Din rollpersons historia och bild

På ditt rollformulär har kortet **Beskrivning** en ruta för din rollpersons historia. Spelledaren skriver in den, efter att du har sagt ja. För en bild kan du ge spelledaren en fil (PNG, JPEG, WebP eller SVG, upp till 5 MB) tillsammans med var den ligger på din dator, eller be om ett porträtt ([3.11](#311-pictures)): *[Gör ett porträtt åt mig: grått hår i en fläta, ett ärr på hakan.]*

### 3.8 Sparade spel och att gå tillbaka

RPG Engine sparar hela kampanjen i slutet av varje scen. Inställningen **sparade spel** avgör resten:

| Sparade spel | Spara när du vill | Gå tillbaka |
|---|---|---|
| **permadeath** | nej | aldrig |
| **checkpoint** | nej | till senaste sparade spelet, bara när din rollperson dör |
| **ledig** | ja | till vilket sparat spel som helst |

I alla lägen kan du **börja om**, från spelets början eller från session noll. Gör det i chatten eller i **Sparade spel**.

Efter att du har gått tillbaka ska du **öppna en ny chatt**: den gamla kommer ihåg det som ogjorts. Skriv *fortsätt* i den nya chatten och tryck sedan på **Jag har öppnat en ny chatt** i Sparade spel.

### 3.9 Sessioner: att sluta och komma tillbaka

Sluta när du vill: *[Vi slutar här för ikväll.]* Allt är redan sparat i filerna. För att komma tillbaka startar du din agent i kampanjmappen och skriver *fortsätt*. Spelledaren ger dig en kort sammanfattning och spelet går vidare.

### 3.10 Spelledarens sinnesstämning

Roboten högst upp på dashboarden är spelledaren. Dess ansikte följer berättelsens ton och avslöjar aldrig sådant du inte vet än. När chatten är stängd sover den.

### 3.11 Bilder

RPG Engine kan låta skapa bilder av platserna ni når, uppdragen ni tar och dem ni möter, så som inställningen **bilder** säger, och din rollpersons porträtt när du ber om det. Det använder ditt eget Codex eller Claude Code, med din inloggning, på din plan och inom dess gränser: **Codex** målar dem, annars ritar **Claude Code** dem. **Inställningar** visar om den här datorn kan göra dem, och hur du ställer in det om den inte kan. Du kan alltid ge spelledaren en egen bild.

### 3.12 Trygghet: gränser, slöjor och stopp

**Gränser** förekommer aldrig i spelet. **Slöjor** händer bara utanför bild. Skriv *[stopp]* när som helst: spelledaren släpper det innehållet direkt och lägger till det bland dina gränser.

### 3.13 Att ändra sig

Varje inställning kan ändras, i chatten eller i **Inställningar**. Ett avgörande som spelledaren gör utan regelboken blir ett **prejudikat**, så att samma fråga får samma svar nästa gång.

---

## 4. Dashboarden <!-- icon: party -->

En sida på din egen dator. Den öppnas bara i webbläsaren på den datorn och är aktiv medan chatten är öppen. När chatten stängs visar den *Not connected*. Den kommer tillbaka av sig själv med nästa chatt.

- **Grupp**: ditt rollformulär och dina följeslagares. Klicka på ett tal för att slå det. Håll muspekaren över det för att se var det kommer ifrån och, när en pil markerar tärningen, vad som gör slaget bättre eller sämre. Bredvid ser du slagen.
- **Scen**: var du är, dess bild och karta, vem som är där och vad som händer. I en strid visas turerna och din rollpersons kort.
- **Dagbok**: uppdrag, berättelsen, dina följeslagares dagböcker och dina anteckningar.
- **Värld**: världskartan, det din rollperson vet, de dokument som hittats och kalendern.
- **Tärningsbrickan**: välj tärningar och en modifikation, och slå; ×2 fördubblar tärningarna, aldrig modifikationen, som vid en kritisk träff.
- **Sparade spel**, **Hjälp**, **Inställningar** och **Om**, som ikoner i slutet av raden. Inställningar rymmer också sidans egna val: tema, tärningsljud och tärningsset.

När spelledaren frågar dig något ligger dess banderoll kvar högst upp, oavsett vilken del du befinner dig i.

---

## 5. Spelsystem och husregler <!-- icon: dice -->

### 5.1 Vad ett spelsystem är

Allt som hör till ett spel: rollformulär, siffror, varelser, föremål, besvärjelser och regeltext. Varje kampanj spelar ett system. RPG Engine räknar ut rollformuläret och vad som går åt och kommer tillbaka. Hur en förmåga fungerar läser spelledaren i reglerna och avgör, som vid ett bord.

### 5.2 Femte utgåvan ingår

Raser, klasser, subklasser, en bakgrund och en färdighet (feat) ur SRD 5.1. Dessutom de 319 besvärjelserna, vapnen, rustningarna, magiska föremålen och monstren, regelkapitlen som spelledaren läser efter deras exakta text och det fullständiga, uträknade rollformuläret.

Du kan också spela innehåll som SRD saknar, från en bok du äger. Spelledaren skriver det som sidor i din kampanj, och RPG Engine behandlar dem som sina egna. RPG Engine levererar bara öppet innehåll. Vad din spelledare kan är inte begränsat av det.

Dina egna regelböcker kan bli ditt bibliotek. Berätta för spelledaren var de finns, *[Mina regelböcker finns i D:\Books\5e.]*, eller lägg till deras mapp i Packages › Library. Svara sedan ja i fönstret som din dator visar, en enda gång. RPG Engine läser dem på den här datorn. Varje kampanj använder de mappar du slår på där. Spelledaren söker i dem när en regel ska avgöras, efter SRD, och anger bok och sida. De läses bäst som text eller som PDF-filer där texten går att markera. En inskannad PDF läses från bilderna av sidorna, bara på Windows, på några minuter och med några fel. RPG Engine ändrar aldrig dina regelböcker, skickar aldrig deras text någonstans och kopierar den aldrig in i en kampanj.

### 5.3 Husregler och egna tillägg

Fråga spelledaren: *[Husregel: en naturlig 1 på en attack betyder att du tappar ditt vapen.]* Spelledaren behåller den som en överenskommelse vid bordet, eller skriver en sida eller en siffra på rollformuläret när det behövs. Husregler som redan är skrivna kan läggas som textfiler i kampanjens mapp `rules`.

### 5.4 Lägg till eller importera ett eget spelsystem

Inte ännu: i dag spelar RPG Engine bara femte utgåvan ([Kommer senare](#9-coming-later)).

---

## 6. Tillägg <!-- icon: plus -->

Inte än. Ett tillägg kommer att lägga till något i en kampanj ovanpå dess spelsystem: en värld, ett äventyr, en funktion som vädret, husregler att dela.

---

## 7. Varifrån en kampanj kommer, och dess språk <!-- icon: world -->

### 7.1 Tre sätt att få en värld

- **Skapad allteftersom**: utifrån din premiss bygger spelledaren varje plats, person och intrig strax innan du behöver den, och sparar den.
- **Förberedd i början**: samma sak, men med världen byggd före spelet.
- **Från ditt eget äventyr eller din egen bok**: ge spelledaren filen, *[Importera det här äventyret som vår kampanj: D:\Books\adventure.pdf. Berätta inget som står i det.]* Det läses bäst som text, en EPUB, ett Word-dokument eller en PDF vars text går att markera. En inskannad PDF läses från bilderna av sina sidor, bara i Windows, långsamt och med några fel. Ditt eget Codex eller Claude Code läser det utanför chatten, annars spelledaren i chatten, på din plan: hela dokumentet skickas till OpenAI eller Anthropic, enligt villkoren för ditt konto och dess val om träning. Dashboarden visar hur långt det har kommit. Från en roman föreslår spelledaren var du ska börja. Spelledaren skriver platserna, personerna och hemligheterna.

En kampanj spelas en gång: vill du spela samma äventyr igen, skapa en ny kampanj.

### 7.2 Språk

Ett språk per kampanj, spelledarens, som dashboarden följer. Dashboarden levereras med 26 språk. Vilket annat som helst översätts på din dator av Codex eller Claude Code, eller, utan dem, av spelledaren i chatten. Femte utgåvans termer på italienska kommer från den officiella italienska SRD:n. Regeltexten förblir på engelska, och spelledaren berättar den på ditt språk.

---

## 8. För de nyfikna: kampanjmappen <!-- icon: list -->

Du behöver aldrig öppna den, och den innehåller kampanjens hemligheter. Där finns `campaign.yaml` (dina inställningar), `state.yaml` (hur spelet står), `world/` (en markdown-sida för varje rollperson, plats, uppdrag och resten), `rules/` (dina hemregler), `images/`, `log.jsonl` (varje ändring), `.saves/`, `.player/` (dina anteckningar) och de små filer som talar om för AI-agenter var RPG Engine finns. Sidorna använder Obsidians format. Om du ändrar en sida för hand får spelledaren veta det vid sitt nästa svar.

RPG Engine håller sig i den här mappen: det läser och skriver spelet bara här och rör aldrig dina andra filer. Mapparna med dina regelböcker läser det bara. Utanför mappen har det bara egna datamappar (dashboardens översättningar, texten det har läst ur dina regelböcker, och Codex eller Claude Code om du låter det installera dem) och tillfälliga mappar medan en bild ritas. Allt annat som din agent vill göra på din dator frågar den dig om först.

Varje kommando som spelledaren använder kan också köras i kampanjmappen: `rpg --help` listar dem. Många skriver ut kampanjens hemligheter.

---

## 9. Kommer senare <!-- icon: hourglass -->

- **Du som spelledare**, medan AI:n spelar gruppen.
- **Författarläge**: skriv ett äventyr med AI:n, exportera det och dela det.
- **Flera spelare på samma dator**, var och en med sin egen rollperson, som turas om i samma chatt.
- **Tillägg**: inställningar, äventyr, funktioner och hemregler.
- **Andra spel**: fler spelsystem, och dina egna.

---

## 10. Frågor och problem <!-- icon: info -->

### Frågor

**Måste jag kunna reglerna?** Nej. Välj handledning som mentor och fråga inom hakparenteser när du vill.

**Kan spelledaren fuska?** Spelledaren kan inte ändra ett slag som RPG Engine har gjort, utom på svårighetsgraden berättelse, och inte heller fakta som redan är fastslagna.

**Kostar det något?** RPG Engine är gratis. Spelledaren körs på din agents plan, eller på din egen dator med en lokal modell. En spelkväll är en lång chatt: på de minsta planerna kan du nå planens gräns innan kvällen är slut. Bilder, översättningar och importer använder samma plan. RPG Engine använder aldrig själv en API-nyckel, som betalas per anrop: logga in din agent med ditt konto, inte med en nyckel.

**Kan jag spela i telefonen?** Nej: spelledaren körs på din dator, och dashboarden öppnas bara där.

**Kan jag spela med vänner?** Inte ännu: i dag en spelare, en rollperson, plus följeslagare ([Kommer senare](#9-coming-later)).

**Kan jag använda en annan AI nästa gång?** Ja: öppna kampanjen i en annan agent och skriv *fortsätt*.

### Problem

**Dashboarden öppnas inte.** Fråga spelledaren: `[Vad är länken till dashboarden?]`. Den fungerar bara medan en chatt är öppen i den kampanjen, efter spelledarens första svar.

**Spelledaren verkar inte kunna spelet.** Din agent laddade inte RPG Engine. Kontrollera att du startade den i kampanjmappen och att du litade på den. I Claude Code skriver du `/mcp` och återansluter `rpg`. I Codex måste `codex mcp list` i kampanjmappen visa `rpg`. Om `rpg --version` inte hittas, installera RPG Engine igen ([2.2](#22-install)).

**Uppdatera.** Kör `npm install -g rpg-engine` igen och öppna sedan en ny chatt: en spelledare som redan körs behåller den version den startade med.

**Spelledaren minns något jag ångrade.** Öppna en ny chatt och tryck på **Jag har öppnat en ny chatt** i Sparade spel.

**Inga bilder visas.** Inställningar > Bilder visar om den här datorn kan göra dem, och hur.

**Installationen misslyckas, eller `rpg` startar inte.** `node --version` måste visa 22 eller senare. I Windows: håll RPG Engine och dina kampanjer borta från sökvägar som innehåller `&`.

**Dashboardlänken ändrades.** Ett annat program tog den vanliga adressen. Spelledaren ger dig den nya länken.
