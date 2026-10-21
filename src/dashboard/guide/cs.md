<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb 63d60934 16d08ee1 75985e6d 4775a5e9 8c9f41da 90f04271 f699a840 241f6611 e2839149. Change the English, then run it again. -->
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

## 2. Začínáme <!-- icon: path -->

### 2.1 Co potřebuješ

- Počítač s Windows, macOS nebo Linuxem a webový prohlížeč.
- **Node.js 22** nebo novější, z [nodejs.org](https://nodejs.org). Přináší `npm`, který instaluje RPG Engine.
- **Terminál**: ve Windows Terminál nebo PowerShell, v macOS Terminál. Terminál ve složce otevřeš tak, že na složku klikneš pravým tlačítkem a vybereš **Otevřít v Terminálu** (Windows) nebo **Služby > Nový terminál ve složce** (macOS).
- **AI agenta** pro Pána jeskyně ([2.4](#24-connect-your-ai)) s **největším modelem**, který nabízí: malý model se snáze nechá přemluvit k prozrazení tajemství nebo k ohnutí pravidel.

### 2.2 Instalace

```text
npm install -g rpg-engine
```

Příkaz `rpg --version` ověří, že se instalace povedla. Příkaz `rpg` použiješ jednou pro každou kampaň, když ji vytváříš. Potom už RPG Engine spouští tvůj agent sám.

### 2.3 Vytvoření kampaně

Otevři terminál ve složce, kam ukládáš své hry ([2.1](#21-what-you-need) říká jak):

```text
rpg init "The Salt Isles"
```

Vznikne složka `The Salt Isles` s novou kampaní. Přejdi do ní příkazem `cd "The Salt Isles"`. Zapamatuj si, kde leží: vracíš se do ní pokaždé, když hraješ. Vše ostatní zvolíš později, v chatu nebo na dashboardu. Příkaz `rpg init --help` vypíše možnosti, jak některé věci zvolit hned, například `--language it` nebo `--difficulty hard`.

Pán jeskyně kampaň vytvořit nedokáže: před příkazem `init` nic neříká tvému agentovi, kde RPG Engine najde.

### 2.4 Připojení AI

Pán jeskyně běží v **AI agentovi**: je to AI aplikace, v terminálu nebo na ploše, která umí pracovat se soubory v tvém počítači, například Claude Code nebo Codex. Obyčejný chat jako claude.ai nebo ChatGPT, ani aplikace v telefonu nestačí: Pán jeskyně se musí dostat k souborům kampaně v tvém počítači. Každý agent potřebuje vlastní tarif a přihlášení: Claude Code placený tarif Claude, Codex přihlášení do ChatGPT. Nainstaluješ ho jednou, z jeho vlastní stránky: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: ve složce kampaně napiš `claude`. Když se zeptá, zda složce důvěřuješ, zvol **Yes, I trust this folder**. Pozor, předvybraná odpověď je *No, exit*.
- **Codex**: ve složce kampaně napiš `codex` a na otázku, zda složce důvěřuješ, odpověz ano. V jeho desktopové aplikaci zkontroluj v nastavení, že jsou pro chaty hry vypnuté paměti.
- **Jiný agent**: spusť ho ve složce kampaně a dej mu MCP server `rpg mcp`. RPG Engine je standardní MCP server: Pánem jeskyně může být každý agent, který podporuje MCP, i lokální.

Hrajeme a testujeme s **Claude Code**. **Codex** je připojený a ověřený, ale zatím se s ním neodehrála celá kampaň. Příkaz `init` také nastaví **Gemini CLI**. Kampaň vypíná vlastní paměť agenta: hra žije v jeho souborech, aby návrat k uložené hře opravdu vrátil zpět.

### 2.5 První chat

Napiš cokoli, třeba *Ahoj! Pojďme začít.* V první odpovědi každého chatu ti Pán jeskyně dá **odkaz na tvůj dashboard**, něco jako `http://127.0.0.1:4750`. Otevři ho a nech ho vedle chatu.

Mezi zprávami Pána jeskyně ukazuje tvůj agent nástroje, které používá. Jejich podrobnosti neotvírej (v Claude Code ctrl+o), mohou odhalit tajemství.

Nová kampaň prochází třemi fázemi, které vidíš nahoře na dashboardu: **1 Nastavení** (jak chceš hrát), **2 Nulté sezení** (vytvoříš postavu, přímo ve hře), **3 Hra**.

### 2.6 Nastavení: jak chceš hrát

Pán jeskyně se ptá jen na to, co ještě chybí, vždy na pár otázek najednou. Krok **Nastavení** na dashboardu ukazuje tytéž otázky jako karty. Napiš „rozhodni ty" a Pán jeskyně zvolí. Vše lze později změnit, v chatu nebo v **Nastavení**.

| Nastavení | O čem rozhoduje | Hodnoty |
|---|---|---|
| **Mentor** | Jak moc tě Pán jeskyně učí pravidla | off, hints, tutorial |
| **Obtížnost** | Jak těžký je svět | story, easy, normal, hard, brutal |
| **Smrtelnost** | Co znamená pád v boji | narrative (nikdo neumírá), epic (jen když na tom záleží), dice |
| **Uložené hry** | Kdy se smíš vrátit zpět | permadeath, checkpoint, free ([3.8](#38-saves-and-going-back)) |
| **Přísnost** | Jak přesně se podle pravidel řídí jídlo, světlo a cestování | smooth, rules, simulation |
| **Kostky** | Kdo hází tvými kostkami | digital, physical |
| **Jednotky** | Vzdálenosti a váhy | metric, imperial |
| **Voices** | Kdo mluví za postavy, které potkáš: ve zlomových chvílích sama postava, která ví jen to, co ví ona, podle volby Pána jeskyně; vždy Pán jeskyně; nebo vždy postava, u hlavních nebo u všech, pomaleji a dráž, tam, kde to tvoje AI aplikace umí | auto, master, important, always |
| **Společníci** | Kdo s tebou cestuje | none, made with you, made by the master, met in play |
| **Obrázky** | Obrázky míst, úkolů a postav, které potkáš | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Hranice** a **Závoje** | Co se nikdy neobjeví a co se děje jen mimo scénu | seznamy |
| **Jazyk** | Jazyk hry a dashboardu | libovolný |

Pátá edice přidává **postup postavy**: zkušenostní body nebo milníky.

Pokud nemáš napsaný svět, Pán jeskyně se zeptá také na **premisu** (žánr, tón, pár prvků, tvými slovy) a na **přípravu**: svět buď vytvářet za pochodu, nebo celý na začátku.

Na **Styl Pána jeskyně** se Pán jeskyně neptá, ale můžeš ho změnit v chatu nebo v **Nastavení**: **próza** (plain, literary, pulp, wry), **příběhy**, které vymýšlí (situations, arcs, episodes, mystery), autor, podle kterého má **psát**, nebo cokoli jiného **tvými slovy**.

### 2.7 Nulté sezení: tvoje postava

Postavu vytváříš společně s Pánem jeskyně, jako u stolu. Každá volba je tvoje, pokud nepožádáš Pána jeskyně, aby ji udělal on. Přijď s hotovým nápadem, s mlhavým, nebo s ničím. Pán jeskyně ti řekne, jak se tvoří vlastnosti, ještě než se hodí jakákoli kostka. Příběh postavy není nikdy povinný. Pokud ho dáš, Pán jeskyně ho napíše tvými slovy. Potom se tě Pán jeskyně zeptá na obrázek postavy ([3.7](#37-your-characters-story-and-picture)). RPG Engine spočítá deník postavy: žádné sčítání za tebe nikdo dělat nemusí.

---

## 3. Hraní <!-- icon: chat -->

### 3.1 Rozhovor s Pánem jeskyně

Piš, co tvá postava dělá nebo říká, vlastními slovy:

> Ptám se hostinského, kdo další tudy dnes večer procházel.

Když chceš mluvit mimo příběh, piš do hranatých závorek: *[Jak funguje zápasení?]* Pán jeskyně odpoví také v závorkách.

Ty říkáš, o co se pokoušíš. Pán jeskyně říká, co se stane. Nikdy nerozhoduje za tvou postavu a nikdy nemluví o enginu. Můžeš se ho zeptat, jak se ovládá dashboard.

### 3.2 Hody

Pán jeskyně žádá o hod jen tehdy, když je výsledek nejistý a záleží na něm. Nejdřív řekne, o co jde. Pak:

- **Na dashboardu** se v pruhu nahoře objeví tlačítko pro každé ověření, například *Akrobacie +4 · s výhodou*. Klikni na něj: kostky se rozkutálejí po stránce a Pán jeskyně se dozví výsledek. Můžeš také kliknout na rozsvícený řádek ve svém deníku postavy, hodit kostkami z podnosu na kostky, nebo napsat do pruhu něco jiného.
- **Ručně**, v rohu pruhu nebo v **Nastavení**: pruh ti řekne, co máš hodit, a ty hodíš ze svého deníku postavy nebo z podnosu na kostky.
- **Fyzické kostky**, když je nastavení kostek na fyzické: napíšeš, co padlo, *[Padlo mi 14.]*, a RPG Engine přičte tvé opravy.

**Volné hody**: klikni na libovolné číslo v deníku postavy nebo otevři podnos na kostky a hoď si pro zábavu. Nikdy se nepočítají a Pán jeskyně je nevidí.

**Hody Pána jeskyně** se zobrazují ve sloupci hodů, kromě tajných. Můžeš se vždy zeptat *[Byl ten hod skutečný?]*: u tajného hodu ti Pán jeskyně dá otisk, který dokazuje, že hod proběhl dřív, než ses zeptal(a).

### 3.3 Scény a boje

Příběh se odehrává ve **scénách**: boj, rozhovor, zkoumání, cestování, odpočinek. Na konci každé scény se hra sama uloží a scéna se zapíše do tvé kroniky.

V boji Pán jeskyně odvypráví každý tah, který není tvůj, a zastaví se tam, kde se můžeš rozhodnout. **Scéna** nahoře ukazuje, kdo je na tahu a kdo bude další, a vedle mapy kartu tvé postavy. Pořadí tahů, životy družiny a slovní popis toho, jak jsou na tom nepřátelé, zůstávají na straně stránky. Pokud tvá postava padne, hody proti smrti se objeví velké uprostřed stránky.

### 3.4 Čas, cestování a svět, který se hýbe

RPG Engine hlídá datum; mezi sezeními žádný čas neplyne. Řekni, že odpočíváš, *Dopřejeme si dlouhý odpočinek*, a odpočinek obnoví, co má. Řekni, kam jdeš, *Vydáme se po cestě na sever do Rocca*, a RPG Engine spočítá cestu, vzdálenost i dny a zastaví se, když se cestou něco stane. Peníze se počítají v mincích hry, včetně drobných.

Padouši mají plány s termíny. S každým novým dnem Pán jeskyně posune hrozby, které čas pohnul dál. Ty vidíš jejich znamení, nikdy ne samotné hodiny.

### 3.5 Mapy

**Svět** ukazuje místa, která tvá postava zná, cesty mezi nimi a stopu, kterou urazila, a zbytek zakrývá mlha. **Scéna** ukazuje mapu místa, kde jsi, pokud nějakou má, a kdo kde stojí. V boji jsou na tvém tahu políčka, kam nedosáhneš, zastřená. Když se Pán jeskyně zeptá, kam se přesuneš, klepni na políčko, nebo ho napiš, například *E4*.

### 3.6 Úkoly, kronika a poznámky

Úkol, který tvá postava přijme, se zapíše do **Kroniky** i s cíli, termínem a tím, co se měří. Označ ho hvězdičkou a zůstane na očích nahoře ve Scéně. Kronika také vypráví tvůj **příběh**, scénu po scéně, a uchovává tvé **poznámky**. Ty jsou soukromé, dokud některou nepoužiješ ve **Sdílet**. Pán jeskyně ji pak slyší jako to, co si myslíš, nikdy jako fakt.

### 3.7 Příběh a obrázek tvé postavy

V deníku postavy má karta **Popis** políčko pro příběh tvé postavy: Pán jeskyně ho do něj zapíše poté, co řekneš ano. Pro obrázek dej Pánu jeskyně soubor (PNG, JPEG, WebP nebo SVG, do 5 MB) a řekni, kde na počítači leží, nebo si nech vytvořit portrét ([3.11](#311-pictures)): *[Udělej mi portrét: šedivé vlasy spletené do copu, jizva na bradě.]*

### 3.8 Uložené hry a návrat

RPG Engine ukládá celou kampaň na konci každé scény. O zbytku rozhoduje nastavení **uložených her**:

| Uložené hry | Uložit, kdy chceš | Návrat |
|---|---|---|
| **permadeath** | ne | nikdy |
| **checkpoint** | ne | k poslednímu uložení, jen když tvá postava zemře |
| **free** | ano | k libovolnému uložení |

V každém režimu můžeš **začít znovu**, od začátku hry nebo od nultého sezení. Udělej to v chatu nebo v **Uložených hrách**.

Po návratu **otevři nový chat**: starý si pamatuje, co bylo vráceno. Do nového chatu napiš *pokračuj*, a pak v Uložených hrách stiskni **Nový chat otevřen**.

### 3.9 Sezení: přerušení a návrat

Skonči, kdy chceš: *[Na dnešní večer toho nechme.]* Všechno je už uloženo v souborech. Až se budeš chtít vrátit, spusť svého agenta ve složce kampaně a napiš *pokračuj*: Pán jeskyně ti krátce shrne, co se dělo, a hraje se dál.

### 3.10 Nálada Pána jeskyně

Robot nahoře na dashboardu je Pán jeskyně: jeho tvář sleduje tón příběhu a nikdy neprozradí, co ještě nevíš. Když je chat zavřený, spí.

### 3.11 Obrázky

RPG Engine může nechat vytvořit obrázky míst, kam dojdeš, úkolů, které přijmeš, a těch, které potkáš, podle nastavení **obrázků**, a také portrét tvé postavy, když o něj požádáš. Používá to, co je na tvém počítači, s tvým vlastním přihlášením: **Codex** je maluje, jinak je kreslí **Claude Code**. **Nastavení** říká, zda je tento počítač umí vytvořit, a jak to případně nastavit. Pánu jeskyně můžeš vždy dát vlastní obrázek.

### 3.12 Bezpečí: hranice, závoje a stop

**Hranice** se ve hře nikdy neobjeví. **Závoje** se odehrávají jen mimo scénu. Kdykoli napiš *[stop]*: Pán jeskyně okamžitě takový obsah opustí a přidá ho do tvých hranic.

### 3.13 Změna rozhodnutí

Každé nastavení lze změnit, v chatu nebo v **Nastavení**. Rozhodnutí, které Pán jeskyně udělá bez pravidel, se stane **precedentem**, takže na stejnou otázku bude příště stejná odpověď.

---

## 4. Dashboard <!-- icon: party -->

Stránka na tvém vlastním počítači, otevřená jen v prohlížeči toho počítače a živá, dokud je chat otevřený. Když se chat zavře, ukáže *Nepřipojeno*. S dalším chatem se sama vrátí.

- **Družina**: tvůj deník postavy a deníky tvých společníků. Kliknutím na číslo si hodíš, najetím myší uvidíš, odkud pochází. Vedle jsou hody.
- **Scéna**: kde jsi, její obrázek a mapa, kdo tam je, co se děje. V boji tahy a karta tvé postavy.
- **Kronika**: úkoly, příběh, tvé poznámky.
- **Svět**: mapa světa tak, jak ho tvá postava zná.
- **Podnos na kostky**: vyber kostky a opravu a hoď.
- **Uložené hry**, **Nápověda**, **Nastavení** a **O aplikaci** jako ikony na konci řady. Nastavení obsahuje také vlastní předvolby stránky: motiv, zvuk kostek, sadu kostek.

Když se tě Pán jeskyně na něco zeptá, jeho pruh zůstává nahoře, ať jsi v jakékoli sekci.

---

## 5. Hry a pravidla <!-- icon: dice -->

### 5.1 Co je herní systém

Data jedné hry: její deník postavy, čísla, tvorové, předměty, kouzla a text pravidel. Každá kampaň se hraje v jednom systému. RPG Engine počítá deník postavy i to, co se utratí a co se vrátí. Jak funguje určitá vlastnost, přečte si Pán jeskyně v pravidlech a rozhodne, stejně jako u stolu.

### 5.2 Pátá edice v balení

Rasy, povolání, podpovolání, zázemí a vlastnost z SRD 5.1; 319 kouzel, zbraně, zbroje, magické předměty a příšery; kapitoly pravidel, které Pán jeskyně čte podle jejich přesného znění; úplný deník postavy, vše spočítané.

Můžeš hrát i obsah, který v SRD chybí, z knihy, kterou vlastníš: Pán jeskyně ho zapíše jako stránky tvé kampaně a RPG Engine s ním zachází jako s vlastním. RPG Engine obsahuje jen otevřený obsah. To, co zná Pán jeskyně, omezené není.

Tvé vlastní příručky mohou být knihovnou kampaně. Řekni Pánu jeskyně, kde jsou: *[Moje příručky jsou v D:\Books\5e.]* a v okně, které počítač zobrazí, potvrď souhlas. RPG Engine je přečte jednou, na tomto počítači. Pán jeskyně v nich pak při rozhodování o pravidle hledá, až po SRD, a uvede knihu i stránku. Nejlépe se čtou jako text nebo jako PDF s textem, který lze označit. Naskenované PDF se čte z obrázků stránek, jen ve Windows, několik minut a s drobnými chybami. RPG Engine tvé příručky nikdy nemění, nikam neposílá jejich text a nikdy ho nekopíruje do kampaně.

### 5.3 Vlastní pravidla a úpravy

Zeptej se Pána jeskyně: *[Vlastní pravidlo: přirozená 1 při útoku znamená, že upustíš zbraň.]* Pán jeskyně si ji zapamatuje jako dohodu u stolu, nebo napíše stránku či číslo do deníku postavy, když je to potřeba. Už sepsaná vlastní pravidla můžeš vložit jako textové soubory do složky `rules` v kampani.

### 5.4 Přidání nebo import vlastního herního systému

Zatím ne: dnes RPG Engine hraje jen pátou edici ([Připravujeme](#9-coming-later)).

---

## 6. Rozšíření <!-- icon: plus -->

Zatím ne. Rozšíření přidá ke kampani něco navíc nad její herní systém: svět, dobrodružství, funkci, třeba počasí, nebo vlastní pravidla ke sdílení.

---

## 7. Odkud se bere kampaň a její jazyk <!-- icon: world -->

### 7.1 Tři způsoby, jak získat svět

- **Tvořený za pochodu**: z tvé předlohy staví Pán jeskyně každé místo, postavu i zápletku těsně předtím, než je potřebuješ, a uchová je.
- **Připravený na začátku**: totéž, jen svět vznikne před hrou.
- **Z vlastního dobrodružství nebo knihy**: dej Pánu jeskyně její soubor: *[Importuj toto dobrodružství jako naši kampaň: D:\Books\adventure.pdf. Neprozrazuj mi nic z toho, co v něm je.]* Nejlépe se čte jako text, EPUB, dokument Word nebo PDF s textem, který lze označit. Naskenované PDF se čte z obrázků stránek, jen ve Windows, pomalu a s drobnými chybami. Codex nebo Claude Code na tvém počítači ho přečte mimo chat a dashboard ukazuje, jak daleko je. U románu navrhne Pán jeskyně, kde začít. Zapíše místa, postavy i tajemství.

Kampaň se hraje jednou: chceš-li zahrát stejné dobrodružství znovu, vytvoř novou kampaň.

### 7.2 Jazyky

Jeden jazyk na kampaň, jazyk Pána jeskyně, kterým se řídí i dashboard. Dashboard je k dispozici ve 26 jazycích. Jakýkoli jiný přeloží na tvém počítači Codex nebo Claude Code, a když nejsou, Pán jeskyně v chatu. Výrazy páté edice v italštině pocházejí z oficiálního italského SRD. Text pravidel zůstává v angličtině a Pán jeskyně ho převypráví tvým jazykem.

---

## 8. Pro zvědavé: složka kampaně <!-- icon: list -->

Nikdy ji nemusíš otevírat a jsou v ní tajemství tvé kampaně. Obsahuje `campaign.yaml` (tvá nastavení), `state.yaml` (stav hry), `world/` (jedna stránka markdown pro každou postavu, místo, úkol a další), `rules/` (tvá vlastní pravidla), `images/`, `log.jsonl` (každá změna), `.saves/`, `.player/` (tvé poznámky) a drobné soubory, které AI agentům říkají, kde RPG Engine najdou. Stránky používají formát Obsidianu. Když stránku upravíš ručně, Pán jeskyně se to dozví při své další odpovědi.

RPG Engine zůstává v této složce: hru čte a zapisuje jen tady a nikdy se nedotkne tvých dalších souborů. Složky s tvými příručkami jen čte. Mimo ni si ukládá jen vlastní datové složky (překlady dashboardu, text přečtený z tvých příruček a Codex nebo Claude Code, pokud mu dovolíš je nainstalovat) a dočasné složky, zatímco se kreslí obrázek. Cokoli dalšího chce tvůj agent na počítači udělat, nejdřív se zeptá.

Každý příkaz, který Pán jeskyně používá, lze spustit i ve složce kampaně: `rpg --help` je vypíše. Mnohé z nich vypisují tajemství kampaně.

---

## 9. Připravujeme <!-- icon: hourglass -->

- **Ty jako Pán jeskyně**, zatímco AI hraje družinu.
- **Režim autora**: napiš dobrodružství s AI, pak ho exportuj a sdílej.
- **Více hráčů na jednom počítači**, každý s vlastní postavou, střídající se ve stejném chatu.
- **Rozšíření**: nastavení, dobrodružství, vlastnosti a vlastní pravidla.
- **Jiné hry**: další herní systémy i tvé vlastní.

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
