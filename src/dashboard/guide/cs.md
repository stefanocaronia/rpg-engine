<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb f4fdeebb 80a7cfb9 23c5f59b b8f80c05 8c9f41da 0b4a6ef8 4eb17899 728ca4a5 e2839149. Change the English, then run it again. -->
# RPG Engine: kompletní průvodce

**RPG Engine** ti umožní hrát stolní hru na hrdiny s **AI jako Pánem jeskyně**. S Pánem jeskyně si povídáš v **chatu**. RPG Engine pracuje v pozadí: **pamatuje si svět**, **hází kostkami** a **vede účty**. Vedle chatu máš v prohlížeči otevřenou stránku, **dashboard**, s deníkem postavy, kostkami, mapami a kronikou.

Tento průvodce je pro hráče: programovat umět nemusíš.

## Rychlý start <!-- icon: send -->

1. Nainstaluj **Node.js** z [nodejs.org](https://nodejs.org) (verze LTS).
2. Nainstaluj **AI agenta**, program, ve kterém Pán jeskyně běží, a přihlas se: například Claude Code nebo Codex ([2.4](#24-connect-your-ai)).
3. V terminálu nainstaluj RPG Engine: `npm install -g rpg-engine`.
4. Vytvoř kampaň: `rpg init "The Salt Isles"`.
5. Přejdi do nové složky, `cd "The Salt Isles"`, a spusť tam svého agenta: `claude` pro Claude Code, `codex` pro Codex. Když se zeptá, jestli složce důvěřuješ, potvrď ([2.4](#24-connect-your-ai)). Pak napiš *Ahoj! Pojďme začít.* Pán jeskyně odpoví odkazem na tvůj dashboard.

## 1. Co je RPG Engine <!-- icon: about -->

| Kdo | Co dělá |
|---|---|
| **Ty** | Hraješ svou postavu: co dělá, říká a zkouší. |
| **Pán jeskyně** (AI) | Vypráví příběh, hraje všechny ostatní, rozhoduje, co se stane, žádá o hody. |
| **RPG Engine** | Drží svět v souborech, hází kostkami, počítá životy, peníze, čas a vzdálenosti a střeží tajemství, dokud je neobjevíš. |

Svět zůstává stejný z jednoho večera na druhý, i v novém chatu, i s jinou AI:

- **Co bylo řečeno, platí.** Mrtvý padouch zůstane mrtvý.
- **Kostky jsou skutečné.** Pán jeskyně je nemůže ohnout, kromě nejlehčí obtížnosti, pokud si ji vybereš.
- **Tajemství zůstávají tajná.** Pán jeskyně ti nikdy neřekne, co tvá postava neví.
- **Svět se hýbe.** Hrozby postupují, zatímco odpočíváte nebo cestujete, a ty vidíš jejich znamení.
- **Kampaň je složka** na tvém počítači: skonči, kdy chceš, a pokračuj později.

RPG Engine dnes hraje jeden herní systém, **pátou edici**, podle volně dostupného System Reference Document 5.1. Další přijdou ([Připravujeme](#9-coming-later)).

---

## 2. První kroky <!-- icon: path -->

### 2.1 Co potřebuješ

- Počítač s Windows, macOS nebo Linuxem a webový prohlížeč.
- **Node.js 22** nebo novější, z [nodejs.org](https://nodejs.org). Přináší `npm`, kterým se RPG Engine instaluje.
- **Terminál**: ve Windows Terminál nebo PowerShell, v macOS Terminál. Terminál ve složce otevřeš tak, že na složku klikneš pravým tlačítkem a vybereš **Open in Terminal** (Windows) nebo **Services > New Terminal at Folder** (macOS).
- **AI agenta** pro Pána jeskyně ([2.4](#24-connect-your-ai)) s **největším modelem**, který nabízí: malý model se dá snáz přemluvit k vyzrazení tajemství nebo k ohnutí pravidel.

### 2.2 Instalace

```text
npm install -g rpg-engine
```

Příkaz `rpg --version` ověří, že se instalace povedla. Příkaz `rpg` použiješ jednou pro každou kampaň, když ji vytváříš. Potom už RPG Engine spouští tvůj agent sám.

### 2.3 Vytvoření kampaně

Otevři terminál ve složce, kam ukládáš své hry ([2.1](#21-what-you-need) říká, jak na to):

```text
rpg init "The Salt Isles"
```

Vznikne složka `The Salt Isles` s novou kampaní. Přejdi do ní příkazem `cd "The Salt Isles"`. Zapamatuj si, kde leží: vracíš se do ní při každé hře. Vše ostatní si zvolíš později, v chatu nebo na dashboardu. Příkaz `rpg init --help` vypíše možnosti, které můžeš nastavit hned, například `--language it` nebo `--difficulty hard`.

Pán jeskyně kampaň vytvořit nemůže: před příkazem `init` nic neříká tvému agentovi, kde RPG Engine je.

### 2.4 Připojení AI

Pán jeskyně běží v **AI agentovi**: AI aplikaci, v terminálu nebo na ploše, která umí pracovat se soubory na tvém počítači, například Claude Code nebo Codex. Obyčejný chat jako claude.ai nebo ChatGPT, nebo aplikace v telefonu, nestačí: Pán jeskyně potřebuje sáhnout na soubory kampaně na tvém počítači. Každý agent potřebuje vlastní tarif a přihlášení: Claude Code placený tarif Claude, Codex přihlášení do ChatGPT. Instaluješ ho jednou, z jeho stránky: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: ve složce kampaně napiš `claude`. Když se zeptá, jestli složce důvěřuješ, vyber **Yes, I trust this folder**. Pozor, předvybraná odpověď je *No, exit*.
- **Codex**: ve složce kampaně napiš `codex` a na otázku, jestli složce důvěřuješ, odpověz ano. V jeho desktopové aplikaci zkontroluj v nastavení, že paměti jsou pro chaty hry vypnuté.
- **Jiný agent**: spusť ho ve složce kampaně a dej mu MCP server `rpg mcp`. RPG Engine je standardní MCP server: Pánem jeskyně může být každý agent, který podporuje MCP, i lokální.

Hrajeme a testujeme s **Claude Code**. **Codex** je připojený a ověřený, ale zatím se s ním neodehrála celá kampaň. Příkaz `init` nastaví i **Gemini CLI**. Kampaň vypne vlastní paměť agenta: hra žije v jejích souborech, aby návrat k uložené hře opravdu vrátil zpět.

### 2.5 První chat

Napiš cokoli, třeba *Ahoj! Pojďme začít.* V první odpovědi každého chatu ti Pán jeskyně dá **odkaz na tvůj dashboard**, něco jako `http://127.0.0.1:4750`. Otevři ho a nech ho vedle chatu.

Mezi zprávami Pána jeskyně agent ukazuje nástroje, které používá. Jejich podrobnosti neotvírej (v Claude Code ctrl+o), mohou prozradit tajemství.

Nová kampaň prochází třemi fázemi, zobrazenými nahoře na dashboardu: **1 Nastavení** (jak chceš hrát), **2 Nulté sezení** (vytvoříš postavu, přímo ve hře), **3 Hra**.

### 2.6 Nastavení: jak chceš hrát

Pán jeskyně se ptá jen na to, co ještě chybí, po několika otázkách najednou. Krok **Nastavení** na dashboardu ukazuje stejné otázky jako karty. Napiš „rozhodni ty“ a Pán jeskyně vybere. Vše lze později změnit, v chatu nebo v **Nastavení**.

| Nastavení | O čem rozhoduje | Hodnoty |
|---|---|---|
| **Mentor** | Jak moc tě Pán jeskyně učí pravidla | vypnuto, rady, výuka |
| **Obtížnost** | Jak těžce hraje svět | příběh, snadná, běžná, těžká, brutální |
| **Smrtelnost** | Co znamená pád v boji | vyprávěcí (nikdy neumřeš), epická (jen když na tom záleží), kostky |
| **Uložené hry** | Kdy se můžeš vrátit | trvalá smrt, kontrolní bod, volné ([3.8](#38-saves-and-going-back)) |
| **Přísnost** | Jak přesně jídlo, světlo a cestování sledují pravidla | plynulá, pravidla, simulace |
| **Kostky** | Kdo hází tvými kostkami | digitální, fyzické |
| **Jednotky** | Vzdálenosti a váhy | metrické, imperiální |
| **Společníci** | Kdo s tebou cestuje | nikdo, vytvoření s tebou, vytvoření Pánem jeskyně, potkaní ve hře |
| **Obrázky** | Obrázky míst, úkolů a postav, které potkáš | žádné, na požádání, nová místa, úkoly a potkané postavy ([3.11](#311-pictures)) |
| **Hranice** a **Závoje** | Co se neobjeví nikdy a co se děje jen mimo scénu | seznamy |
| **Jazyk** | Jazyk hry a dashboardu | libovolný |

Pátá edice přidává **postup**: zkušenostní body nebo milníky.

Pokud nemáš napsaný svět, Pán jeskyně se zeptá také na **předpoklad** (žánr, tón, pár prvků, tvými slovy) a na **přípravu**: budovat svět za pochodu, během hry, nebo celý na začátku.

Na **Styl Pána jeskyně** se nikdy neptá, ale můžeš ho změnit v chatu nebo v **Nastavení**: **próza** (prostá, literární, brak, ironická), **příběhy**, které vymýšlí (situace, oblouky, epizody, záhada), autor, **podle kterého psát**, nebo cokoli jiného **tvými slovy**.

### 2.7 Nulté sezení: tvá postava

Postavu vytvoříš s Pánem jeskyně jako u stolu. Každá volba je tvoje, pokud nepožádáš Pána jeskyně, aby ji udělal za tebe: přijď s hotovým nápadem, s mlhavým, nebo s ničím. Pán jeskyně ti řekne, jak se tvoří vlastnosti, dřív než se hodí jediná kostka. Příběh postavy není povinný. Pokud ho dáš, Pán jeskyně ho zapíše tvými slovy. Poté Pán jeskyně požádá o obrázek tvé postavy ([3.7](#37-your-characters-story-and-picture)). RPG Engine vypočítá deník postavy: nic nepočítáš sám.

---

## 3. Hra <!-- icon: chat -->

### 3.1 Povídání s Pánem jeskyně

Piš, co tvá postava dělá nebo říká, vlastními slovy:

> Ptám se hostinského, kdo další tu dnes večer prošel.

Mimo příběh piš do hranatých závorek: *[Jak funguje zápas?]* Pán jeskyně odpoví také v závorkách.

Ty říkáš, co zkoušíš, Pán jeskyně říká, co se stane. Pán jeskyně nikdy nerozhoduje za tvou postavu a nikdy nemluví o enginu. Můžeš se ho zeptat, jak dashboard používat.

### 3.2 Hody

Pán jeskyně žádá o hod, jen když je výsledek nejistý a záleží na něm, a nejdřív řekne, o co jde. Potom:

- **Na dashboardu** se v liště zobrazí tlačítko pro každé ověření, například *Akrobacie +4 · s výhodou*. Klikni na něj: kostky dopadnou na stránku a Pán jeskyně uslyší výsledek. Můžeš také kliknout na rozsvícený řádek deníku postavy, hodit kostkami z podnosu na kostky, nebo napsat do lišty něco jiného.
- **Ručně**, v rohu lišty nebo v **Nastavení**: lišta ti řekne, co hodit, a ty hodíš z deníku postavy nebo z podnosu na kostky.
- **Fyzické kostky**, při nastavení kostek na fyzické: napíšeš hozená čísla, *[Hodilo se mi 14.]*, a RPG Engine přičte tvé opravy.

**Volné hody**: klikni na libovolné číslo v deníku postavy nebo otevři podnos na kostky a hoď si pro radost. Nikdy se nepočítají a Pán jeskyně je nevidí.

**Hody Pána jeskyně** se zobrazují ve tvém sloupci hodů, kromě tajných. Vždy se můžeš zeptat *[Byl ten hod skutečný?]*: u tajného hodu ti Pán jeskyně dá otisk, který dokazuje, že byl proveden dřív, než ses zeptal.

### 3.3 Scény a boje

Příběh běží ve **scénách**: boj, rozhovor, zkoumání, cestování, odpočinek. Na konci každé scény se hra sama uloží a scéna se zapíše do tvé kroniky.

V boji Pán jeskyně odvypráví každý tah, který není tvůj, a zastaví se tam, kde se můžeš rozhodnout. Sekce **Boj** ukazuje pořadí tahů, životy tvé družiny a slovy, jak zraněně vypadají nepřátelé. Pokud tvá postava padne, na stránce se velké zobrazí záchranné hody proti smrti.

### 3.4 Čas, cestování a svět, který se hýbe

RPG Engine vede datum. Mezi sezeními žádný čas neplyne. Řekni, že odpočíváte, *Dáme si dlouhý odpočinek*, a odpočinek vrátí, co má. Řekni, kam jdeš, *Vydáme se po silnici na sever do Rocca*, a RPG Engine vypočítá cestu, vzdálenost a dny a zastaví se, když se cestou něco stane. Peníze se počítají v herních mincích, včetně drobných.

Padouši mají plány s termíny. S každým novým dnem Pán jeskyně posune hrozby, které čas pohnul dál, a ty vidíš jejich znamení, nikdy ne samotné hodiny.

### 3.5 Mapy

**Svět** ukazuje místa, která tvá postava zná, cesty mezi nimi a stopu, kterou jsi prošel, se mlhou nad zbytkem. **Scéna** ukazuje mapu místa, kde jsi, pokud nějakou má, a kdo kde stojí. V boji jsou ve tvém tahu políčka, na která nedosáhneš, zastřená. Když se Pán jeskyně zeptá, kam se přesuneš, ťukni na políčko nebo ho napiš, například *E4*.

### 3.6 Úkoly, kronika a poznámky

Úkol, který tvá postava přijme, se stane úkolem v **Kronice**, s cíli, termínem a tím, co měří. Označ ho hvězdičkou, aby zůstal na očích nahoře ve **Scéně**. Kronika také vypráví tvůj **příběh**, scénu po scéně, a uchovává tvé **poznámky**: soukromé, dokud jednu nepoužiješ k **Sdílení**. Pán jeskyně ji pak slyší jako to, co si myslíš, nikdy jako fakt.

### 3.7 Příběh a obrázek tvé postavy

V deníku postavy má karta **Popis** pole pro příběh postavy: Pán jeskyně do něj zapíše, až řekneš ano. Pro obrázek dej Pánu jeskyně soubor (PNG, JPEG, WebP nebo SVG, do 5 MB) s udáním, kde na počítači leží, nebo si nech vytvořit portrét ([3.11](#311-pictures)): *[Udělej mi portrét: šedivé vlasy v copu, jizva na bradě.]*

### 3.8 Uložené hry a návrat

RPG Engine ukládá celou kampaň na konci každé scény. Zbytek určuje nastavení **Uložené hry**:

| Uložené hry | Uložit, kdy chceš | Návrat |
|---|---|---|
| **trvalá smrt** | ne | nikdy |
| **kontrolní bod** | ne | k poslední uložené hře, jen když tvá postava zemře |
| **volné** | ano | k libovolné uložené hře |

V každém režimu můžeš **začít znovu**, od začátku hry nebo od nultého sezení. Udělej to v chatu nebo v **Uložených hrách**.

Po návratu **otevři nový chat**: starý si pamatuje, co bylo vráceno zpět. V novém chatu napiš *pokračuj* a pak v Uložených hrách stiskni **Nový chat otevřen**.

### 3.9 Sezení: přerušení a návrat

Skonči, kdy chceš: *[Pro dnešní večer skončíme.]* Vše je už uloženo v souborech. Až se budeš chtít vrátit, spusť agenta ve složce kampaně a napiš *pokračuj*: Pán jeskyně ti stručně shrne děj a jede dál.

### 3.10 Nálada Pána jeskyně

Robot nahoře na dashboardu je Pán jeskyně: jeho obličej sleduje tón příběhu a nikdy neprozradí, co ještě nevíš. Když je chat zavřený, spí.

### 3.11 Obrázky

RPG Engine může nechat vytvořit obrázky míst, ke kterým dojdeš, úkolů, které přijmeš, a postav, které potkáš, podle nastavení **Obrázky**, a portrét tvé postavy, když o něj požádáš. Využívá to, co je na tvém počítači, s tvým vlastním přihlášením: **Codex** je maluje, jinak je kreslí **Claude Code**. **Nastavení** říká, jestli je tento počítač umí vytvářet, a pokud ne, jak ho připravit. Pánu jeskyně můžeš vždy dát vlastní obrázek.

### 3.12 Bezpečí: hranice, závoje a stop

**Hranice** se ve hře nikdy neobjeví. **Závoje** se dějí jen mimo scénu. Kdykoli napiš *[stop]*: Pán jeskyně ten obsah okamžitě opustí a přidá ho do tvých hranic.

### 3.13 Změna rozhodnutí

Každé nastavení lze změnit, v chatu nebo v **Nastavení**. Rozhodnutí, které Pán jeskyně udělá bez pravidel v ruce, se stane **precedentem**, takže stejná otázka dostane příště stejnou odpověď.

---

## 4. Dashboard <!-- icon: party -->

Stránka na tvém počítači, otevřená jen v prohlížeči toho počítače, živá, dokud je chat otevřený. Když se chat zavře, zobrazí *Not connected*. S dalším chatem se sama vrátí.

- **Družina**: deník tvé postavy a deníky tvých společníků. Klikni na číslo a hoď si; podržením kurzoru nad ním uvidíš, odkud pochází. Vedle jsou hody.
- **Scéna**: kde jsi, její obrázek a mapa, kdo tam je, co se děje.
- **Boj**: jen v boji: tahy, bojovníci, co máš po ruce.
- **Kronika**: úkoly, příběh, tvé poznámky.
- **Svět**: mapa světa, jak ji zná tvá postava.
- **Podnos na kostky**: vyber kostky a opravu a hoď.
- **Uložené hry**, **Nápověda**, **Nastavení** a **O aplikaci**, jako ikony na konci řady. Nastavení obsahuje i vlastní předvolby stránky: motiv, zvuk kostek, sadu kostek.

Když se tě Pán jeskyně na něco zeptá, jeho lišta zůstává nahoře, ať jsi v jakékoli sekci.

---

## 5. Herní systémy a vlastní pravidla <!-- icon: dice -->

### 5.1 Co je herní systém

Data jedné hry: její deník postavy, čísla, tvorové, předměty, kouzla a text pravidel. Každá kampaň hraje jeden systém. RPG Engine vypočítá deník postavy a to, co se utrácí a vrací. Jak funguje nějaká schopnost, čte Pán jeskyně v pravidlech a rozhodne, jako u stolu.

### 5.2 Pátá edice, v ceně

Rasy, povolání, podpovolání, zázemí a vlastnost ze SRD 5.1; 319 kouzel, zbraně, zbroje, magické předměty a příšery; kapitoly pravidel, které Pán jeskyně čte přesně podle textu; úplný deník postavy, vypočítaný.

Můžeš hrát i obsah, který v SRD chybí, z knihy, kterou vlastníš: Pán jeskyně ho zapíše jako stránky tvé kampaně a RPG Engine s nimi nakládá jako se svými. RPG Engine dodává jen otevřený obsah. To, co Pán jeskyně zná, omezené není.

### 5.3 Vlastní pravidla a vlastní doplňky

Požádej Pána jeskyně: *[Vlastní pravidlo: přirozená 1 při útoku znamená, že upustíš zbraň.]* Uloží si ho jako dohodu u stolu, nebo napíše stránku či číslo v deníku postavy, když je potřeba. Už sepsaná vlastní pravidla mohou být jako textové soubory ve složce `rules` kampaně.

### 5.4 Přidání nebo import vlastního herního systému

Zatím ne: RPG Engine dnes hraje jen pátou edici ([Připravujeme](#9-coming-later)).

---

## 6. Rozšíření <!-- icon: plus -->

Zatím ne. Rozšíření přidá ke kampani něco navíc nad její herní systém: svět, dobrodružství, funkci, třeba počasí, nebo vlastní pravidla ke sdílení.

---

## 7. Odkud kampaň pochází a její jazyk <!-- icon: world -->

### 7.1 Tři způsoby, jak mít svět

- **Tvořený za pochodu**: z tvého předpokladu Pán jeskyně buduje každé místo, osobu a zápletku těsně předtím, než je potřebuješ, a uchová je.
- **Připravený na začátku**: totéž, ale svět je postaven před hrou.
- **Z vlastního dobrodružství**: dej Pánu jeskyně text nebo PDF a požádej ho, aby ho připravil, *[Připrav toto dobrodružství jako naši kampaň. Nic z toho, co v něm je, mi neprozrazuj.]* Zapíše místa, postavy a tajemství. Tlačítko pro import zatím neexistuje.

Kampaň se hraje jednou: chceš-li hrát stejné dobrodružství znovu, vytvoř novou kampaň.

### 7.2 Jazyky

Jeden jazyk na kampaň, jazyk Pána jeskyně, který dashboard následuje. Dashboard se dodává ve 26 jazycích. Jakýkoli jiný přeloží na tvém počítači Codex nebo Claude Code, nebo, bez nich, Pán jeskyně v chatu. Pojmy páté edice v italštině pocházejí z oficiálního italského SRD. Text pravidel zůstává v angličtině a Pán jeskyně ho převypráví v tvém jazyce.

---

## 8. Pro zvídavé: složka kampaně <!-- icon: list -->

Nikdy ji nemusíš otevírat a obsahuje tajemství tvé kampaně. Najdeš v ní `campaign.yaml` (tvá nastavení), `state.yaml` (kde hra stojí), `world/` (jedna stránka markdown pro každou postavu, místo, úkol a zbytek), `rules/` (tvá vlastní pravidla), `images/`, `log.jsonl` (každá změna), `.saves/`, `.player/` (tvé poznámky) a malé soubory, které říkají AI agentům, kde RPG Engine je. Stránky používají formát Obsidian. Pokud stránku změníš ručně, Pán jeskyně se to dozví při své další odpovědi.

Každý příkaz, který Pán jeskyně používá, lze spustit i ve složce kampaně: `rpg --help` je vypíše. Mnohé vypisují tajemství kampaně.

---

## 9. Připravujeme <!-- icon: hourglass -->

- **Ty jako Pán jeskyně**, s AI hrající družinu.
- **Režim autora**: napiš dobrodružství s AI, pak ho exportuj a sdílej.
- **Více hráčů na jednom počítači**, každý s vlastní postavou, střídající se ve stejném chatu.
- **Rozšíření**: nastavení, dobrodružství, funkce a vlastní pravidla.
- **Import** tvých příruček a dobrodružství.
- **Další hry**: další herní systémy i tvé vlastní.

---

## 10. Otázky a problémy <!-- icon: info -->

### Otázky

**Musím znát pravidla?** Ne. Vyber mentora ve formě výuky a ptej se v závorkách, kdykoli chceš.

**Může Pán jeskyně podvádět?** Nemůže změnit hod, který RPG Engine provedl, kromě obtížnosti příběh, ani již stanovená fakta.

**Stojí to něco?** RPG Engine je zdarma. Pán jeskyně běží na tarifu tvého agenta, nebo na tvém počítači s lokálním modelem. Večer hry je dlouhý chat: u nejmenších tarifů můžeš narazit na limit tarifu dřív, než večer skončí. Obrázky a překlady využívají stejný tarif.

**Mohu hrát na telefonu?** Ne: Pán jeskyně běží na tvém počítači a dashboard se otevře jen tam.

**Mohu hrát s přáteli?** Zatím ne: dnes jeden hráč, jedna postava a společníci ([Připravujeme](#9-coming-later)).

**Mohu příště použít jinou AI?** Ano: otevři kampaň v jiném agentovi a napiš *pokračuj*.

### Problémy

**Dashboard se neotevře.** Zeptej se Pána jeskyně: `[Jaký je odkaz na dashboard?]`. Funguje jen tehdy, když je v té kampani otevřený chat, po první odpovědi Pána jeskyně.

**Pán jeskyně jako by hru neznal.** Tvůj agent nenačetl RPG Engine. Zkontroluj, že jsi ho spustil ve složce kampaně a že jsi jí důvěřoval. V Claude Code napiš `/mcp` a znovu připoj `rpg`. V Codexu musí `codex mcp list` ve složce kampaně ukázat `rpg`. Pokud se `rpg --version` nenajde, nainstaluj RPG Engine znovu ([2.2](#22-install)).

**Aktualizace.** Spusť znovu `npm install -g rpg-engine`, pak otevři nový chat: běžící Pán jeskyně si drží verzi, se kterou začal.

**Pán jeskyně si pamatuje něco, co jsem vrátil zpět.** Otevři nový chat a v Uložených hrách stiskni **Nový chat otevřen**.

**Nezobrazují se žádné obrázky.** Nastavení > Obrázky říká, jestli je tento počítač umí vytvářet, a jak.

**Instalace selže, nebo se `rpg` nespustí.** Příkaz `node --version` musí ukázat 22 nebo novější. Ve Windows nech RPG Engine a své kampaně mimo cesty, které obsahují `&`.

**Odkaz na dashboard se změnil.** Obvyklou adresu převzal jiný program. Pán jeskyně ti dá nový odkaz.
