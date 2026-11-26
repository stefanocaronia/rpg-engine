<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,dcb833ce,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,a9023962,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: den kompletta guiden

**RPG Engine** låter dig spela ett bordsrollspel med en **AI som spelledare**. Du spelar i **översikten**, ett fönster på din dator med ditt rollformulär, tärningarna, kartorna, din dagbok och **chatten** med spelledaren.

Den här guiden berättar hur du spelar. Sidan förklarar sina egna knappar: håll pekaren över en knapp för att se vad den gör.

## Snabbstart <!-- icon: send -->

1. Installera **Node.js** från [nodejs.org](https://nodejs.org) (LTS-versionen).
2. Öppna en ny terminal och skriv `npm install -g rpg-engine`. Om Windows säger att det är inaktiverat att köra skript, skriv `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, svara ja och försök igen.
3. Skriv `rpg open` och tryck på Enter när du får frågan om ikonen på skrivbordet ([2.2](#22-installing)). Därefter startar du RPG Engine från ikonen.
4. Tryck på **Ny kampanj**, ge den ett namn och tryck på **Skapa** ([2.3](#23-a-new-campaign)).
5. I chatten väljer du din AI-app och dess modell ([2.4](#24-connect-your-ai)): Claude Code kräver ett betalt Claude-abonnemang, Codex ett ChatGPT-konto, gratis eller betalt. Tryck på **Öppna chatten** och sedan på **Börja**.

Det första svaret kan ta ett par minuter. Sedan frågar spelledaren hur du vill spela, och ni skapar din rollperson tillsammans.

## 1. Vad RPG Engine är <!-- icon: about -->

| Vem | Vad de gör |
|---|---|
| **Du** | Du spelar din rollperson: vad hen gör, säger och försöker. |
| **Spelledaren** (AI:n) | Berättar historien, spelar alla andra, avgör vad som händer och ber om slag. |
| **RPG Engine** | Förvarar världen i filer, slår tärningarna, räknar träffpoäng, pengar, tid och avstånd och håller hemligheter tills du upptäcker dem. |

Därför förblir världen densamma från en kväll till nästa, även i en ny chatt, även med en annan AI:

- **Det som har sagts förblir sant.** En död skurk förblir död.
- **Tärningarna är på riktigt.** Spelledaren kan inte ändra dem, utom på den lättaste svårighetsgraden.
- **Hemligheter förblir hemliga.** Spelledaren berättar aldrig vad din rollperson inte vet.
- **Världen rör sig.** Hot närmar sig medan du vilar eller reser.
- **En kampanj är en mapp** på din dator: sluta när du vill och fortsätt senare.

Ett spel kommer som ett spelsystem: just nu är vårt **femte utgåvan**, från det fria System Reference Document 5.1. Utan spelsystem spelar du fritt, en berättelse utan siffror.

---

## 2. Kom igång <!-- icon: path -->

### 2.1 Det här behöver du

- En dator med Windows, macOS eller Linux.
- **Node.js 24** eller nyare, från [nodejs.org](https://nodejs.org).
- En **terminal**, bara för att installera: i Windows Terminal eller PowerShell, i macOS Terminal.
- En **AI-app** till spelledaren, med ditt eget konto ([2.4](#24-connect-your-ai)).

### 2.2 Installera

```text
npm install -g rpg-engine
rpg open
```

Den första raden installerar RPG Engine. Om npm erbjuder sig att uppdatera sig själv kan du strunta i det.

`rpg open` öppnar RPG Engines fönster. Första gången erbjuder det en ikon på skrivbordet och i menyn: tryck Enter för ja, så startar du därefter från ikonen.

Om installationen misslyckas, kontrollera att `node --version` visar 24 eller högre. Om Windows säger att det är inaktiverat att köra skript, skriv `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` och svara ja. I Windows ska du hålla RPG Engine och dina kampanjer borta från sökvägar som innehåller `&`.

### 2.3 Skapa en kampanj

Tryck på **Ny kampanj** och ange ett **Namn**, ett **Språk** och ett **Spelsystem**. Resten skapar du tillsammans med spelledaren. Tryck på **Skapa**: kampanjen öppnas i ett eget fönster.

Spelledaren och översikten talar kampanjens språk. Regeltexten i femte utgåvan förblir på engelska, och spelledaren berättar den på ditt språk.

Kampanjen är en mapp med dess namn, inuti mappen `RPG Engine` i din användarmapp. Nästa gång klickar du på dess kort.

### 2.4 Anslut din AI

Spelledaren körs i en **AI-app** på din dator, med ditt konto. En webbchatt som claude.ai eller ChatGPT räcker inte: spelledaren måste kunna nå kampanjens filer.

- **Claude Code**: ett betalt Claude-abonnemang (Pro eller högre).
- **Codex**: ett ChatGPT-konto, gratis eller betalt.
- **OpenCode**: inget konto; några gratismodeller under en begränsad tid, eller din egen leverantörs modeller, även lokala.
- **Antigravity**: ett Google-konto; den gratis användningen har veckovisa begränsningar.

I chatten väljer du appen, dess **Modell** och **Spelledarens tankar**. Om appen saknas eller om du inte är inloggad finns en knapp som installerar den, loggar in dig eller öppnar appens webbplats. RPG Engine ser aldrig ditt lösenord.

En spelkväll är en lång chatt: med de minsta abonnemangen kan du nå gränsen innan kvällen är slut. Spela med den största modell du har: en liten modell går lättare att prata till rätta så att den avslöjar hemligheter.

Vi spelar och testar RPG Engine mest med **Claude Code**. Antigravity är **på prov**: den kan kliva ut ur spelet, och den sparar dina chattar i ett minne som du inte kan stänga av. Det du skriver där går till Google, som kan låta människor läsa det. RPG Engine är inte en produkt från Google.

### 2.5 Den första chatten

Tryck på **Öppna chatten** och sedan på **Börja**. Det första svaret kan ta ett par minuter. Sedan går en ny kampanj igenom tre steg:

1. **Inställningar**: spelledaren frågar hur du vill spela, några frågor i taget: hur hård världen är, om du kan dö, när du får gå tillbaka till ett sparat spel. Skriv *Du bestämmer* så väljer spelledaren. Allt går att ändra senare.
2. **Session noll**: du skapar din rollperson tillsammans med spelledaren, som vid ett spelbord. RPG Engine gör uträkningarna på rollformuläret. Om du redan har en rollperson klistrar du in dess rollformulär i chatten.
3. **Spel**: spelledaren sätter den första scenen.

### 2.6 Att spela i din AI-app

Du kan också spela i din AI-apps egen chatt, i en terminal eller i dess skrivbordsapp, med översikten bredvid.

1. Öppna en terminal i mappen där du förvarar dina spel: högerklicka på mappen och välj **Öppna i Terminal** (Windows) eller **Tjänster > Ny terminal i mappen** (macOS).
2. Skriv `rpg init "The Salt Isles"`: det skapar mappen `The Salt Isles` med en ny kampanj i.
3. Starta din app i den mappen: `claude`, `codex`, `agy` för Antigravity, eller `opencode`. Svara ja när den frågar om du litar på mappen. Se upp: i Claude Code är det förvalda svaret *No, exit*.
4. Skriv *Hej! Nu börjar vi.* Spelledaren ger dig länken till din översikt: öppna den bredvid chatten.

Bra att veta:

- Öppna inte detaljerna för de verktyg som din app använder (i Claude Code, ctrl+o): de kan visa hemligheter.
- I Codex skrivbordsapp stänger du av minnen för spelets chattar.
- Om spelledaren inte känner till spelet, skriv `rpg init` i kampanjmappen och öppna en ny chatt.
- Om Windows inte hittar `claude`, lägg till mappen som dess installationsprogram angav i PATH och öppna sedan en ny terminal.
- En chatt i taget spelar en kampanj: medan din är öppen väntar översiktens chatt.

---

## 3. Att spela <!-- icon: chat -->

### 3.1 Prata med spelledaren

Skriv vad din rollperson gör eller säger:

> Jag frågar värdshusvärden vem mer som kom förbi ikväll.

Du säger vad du försöker göra. Spelledaren säger vad som händer. Spelledaren bestämmer aldrig något åt din rollperson.

Skriv `[OOC: …]` (out of character) när du pratar utanför berättelsen: *[OOC: Hur fungerar brottning?]* Du kan fråga spelledaren om reglerna, eller om hur översikten fungerar.

När spelledaren frågar dig något svarar du med dess knappar eller med egna ord. Du kan också agera från ditt rollformulär: klicka på ett vapen, en besvärjelse eller en sak och välj vad du gör.

**Stående order**: säg till dina följeslagare något som ska gälla en längre tid, till exempel *Från och med nu lämnar ni alltid en vid liv*. Spelledaren behåller det tills du häver det.

### 3.2 Slag

Spelledaren ber om ett slag bara när utgången är osäker och spelar roll. En banderoll visar slaget: klicka på den så faller tärningarna.

Tärningarna tillhör RPG Engine, inte spelledaren. Du kan alltid fråga *[Var det slaget på riktigt?]*: även för ett hemligt slag kan spelledaren bevisa att det gjordes innan du frågade.

När inställningen **Tärningar** står på fysiska slår du dina egna tärningar och skriver resultatet: *[Jag slog en 14.]* De slag du gör på skoj, från ditt rollformulär eller med **Fritt slag**, räknas aldrig.

### 3.3 Scener, strider och resor

Berättelsen går i **scener**: en strid, ett samtal, en resa, en vila. I slutet av varje scen sparas spelet av sig självt, och scenen hamnar i din dagbok.

I en strid spelar spelledaren varje tur som inte är din, och stannar där du måste bestämma.

Säg vart ni går, *Vi tar vägen norrut mot Rocca*: RPG Engine räknar ut avståndet och dagarna, och stannar om något händer på vägen. Under tiden fortsätter skurkarnas planer, och du ser tecknen på dem.

### 3.4 Sparade spel

RPG Engine sparar kampanjen i slutet av varje scen. Inställningen **Sparade spel** avgör när du får gå tillbaka:

- **Permanent död**: aldrig.
- **Kontrollpunkt**: till det senaste sparade spelet, bara när din rollperson dör.
- **Ledig**: till vilket sparat spel som helst, och du kan spara när du vill.

I alla lägen kan du börja om, i chatten eller i **Sparade spel**.

När du har gått tillbaka ska du öppna en ny chatt, eftersom den gamla kommer ihåg det som ogjorts:

1. Tryck på **Stäng chatten** och sedan på **Ny chatt**. I din AI-apps egen chatt öppnar du en ny konversation (`/clear` i Claude Code).
2. Skriv *fortsätt*.
3. Tryck på **Jag har öppnat en ny chatt** under Sparade spel. Tills dess väntar spelledaren.

### 3.5 Att sluta och komma tillbaka

Sluta när du vill: allt är redan sparat. Stäng översiktens fönster, så stannar spelet strax efter. Inget går förlorat.

För att komma tillbaka öppnar du RPG Engine från ikonen och klickar på din kampanj. Tryck på **Återuppta chatten** och sedan på **Fortsätt berättelsen**: spelledaren berättar var ni var och går vidare. Nästa gång kan du också välja en annan AI-app.

### 3.6 Begränsningar och stopp

**Gränser** förekommer aldrig i spelet. **Slöjor** händer bara utanför bild. Du ställer in dem under **Inställningar**.

Skriv *[stopp]* när som helst: spelledaren släpper det innehållet och lägger till det bland dina gränser.

### 3.7 Bilder

Spelledaren kan låta skapa bilder av platser, uppdrag och personer, så som inställningen **Bilder** säger, och ett porträtt av din rollperson när du ber om det. Din AI-app skapar dem, på ditt abonnemang. Om inga bilder dyker upp visar **Inställningar** om den här datorn kan skapa dem.

Du kan också ge din rollperson, eller en sida i världen, en egen bild, från själva sidan.

---

## 4. Dashboarden <!-- icon: party -->

Fönstret där du ser ditt spel. Det visar bara det din rollperson vet.

- **Rollspel**: chatten med spelledaren, när den inte står bredvid sidan.
- **Grupp**: ditt rollformulär, dina följeslagares och slagen.
- **Scen**: var du är, vilka som är där och kartan; i en strid, turerna.
- **Dagbok**: uppdrag, berättelsen som en bok, dina följeslagares dagböcker och dina anteckningar.
- **Värld**: världskartan, det din rollperson vet, de dokument som hittats och kalendern.
- **Sparade spel**: att gå tillbaka och börja om.
- **Inställningar**: hur du spelar och hur sidan ser ut.
- **Paket**: spelsystemet, tillägg, dina handböcker och uppdateringar: när en ny RPG Engine finns står det här.

Om sidan säger att den inte är ansluten, tryck på **Öppna kampanjen igen**.

För att spela från mobilen, hemma: under **Inställningar**, **Översikt**, slå på **Åtkomst från mobil** och rikta mobilens kamera mot koden, på samma wifi som datorn. Windows kan fråga om Node.js får använda nätverket: tillåt det på privata nätverk och ställ in wifi-nätet som ett privat nätverk. Spelet skickas okrypterat: använd det bara på ett nätverk du litar på, som ditt hem, aldrig på ett offentligt wifi, ett hotells eller ett kontors. Stäng av det när du är klar: spelet avslutas med datorns sista fönster.

Om ett tema gör sidan svår att läsa, lägg till `#/settings/page` i slutet av dess adress och stäng av **Temats egen stil**.

---

## 5. Regler, manualer och tillägg <!-- icon: dice -->

Ett **Spelsystem** är datan för ett spel: rollformuläret, varelser, föremål, besvärjelser och regler. RPG Engine räknar ut rollformuläret. Hur en regel används läser spelledaren och avgör, precis som vid ett spelbord.

**Femte utgåvan** innehåller de fria reglerna i System Reference Document 5.1. Du kan också spela med innehåll från en bok som du äger: spelledaren skriver in det i din kampanj.

**Dina manualer**: tala om för spelledaren var de finns, eller lägg till deras mapp i **Paket**. Spelledaren slår upp regler i dem och anger bok och sida. RPG Engine ändrar dem aldrig och kopierar dem aldrig in i en kampanj.

**Hemmaregler**: be spelledaren, *[House rule: en naturlig 1 på en attack betyder att du tappar ditt vapen.]* Spelledaren behåller regeln. Ett avgörande som spelledaren har gjort en gång gäller också nästa gång.

**Tillägg** lägger till något i spelet, till exempel vädret. Lägg till dem i **Paket**, eller be spelledaren.

---

## 6. Ditt eget äventyr <!-- icon: world -->

Om det inte finns någon skriven värld bygger spelledaren en utifrån din idé och behåller den.

Vill du spela ett äventyr eller en bok som du äger? Ge då spelledaren filen: *[Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* En fil utanför kampanjen läses först när du har sagt ja. Den fungerar bäst som text, EPUB, Word eller en PDF där texten går att markera.

Hela dokumentet skickas till företaget bakom den AI som läser det. En kampanj spelas bara en gång: vill du spela samma äventyr igen, skapa en ny kampanj.

---

## 7. Dina data <!-- icon: lock -->

- En kampanj är en mapp. Den innehåller kampanjens hemligheter, och även dina chattar med spelledaren: du behöver aldrig öppna den.
- RPG Engine läser och skriver bara i den mappen. Dina manualer läser programmet bara. Allt annat utanför kampanjen öppnas först när du har sagt ja, i ett fönster på din dator.
- I dashboardens chatt öppnar spelledaren aldrig några av dina filer på eget bevåg.
- Det du skriver skickas till företaget vars modell spelar spelledaren, enligt villkoren för ditt konto. Med en lokal modell stannar det på din dator.
- Ett spelsystem eller ett tillägg som inte är från oss är kod som körs på din dator: det installeras bara om du säger ja. Säg bara ja till upphovspersoner som du litar på.
- Om kampanjmappen är ett git-förråd kan **Inställningar** checka in den åt dig. Släpp bara in dina chattar om förrådet är privat.
- När **Åtkomst från mobil** är på går spelet okrypterat från datorn till mobilen över ditt hemmanätverk, utan någon extern tjänst: den som är på det nätverket kan läsa det.
