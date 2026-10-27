<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 9f1774ef d90880b0 019e9516 8e136927 7da791ae 8c9f41da 17577253 f699a840 241f6611 59c1a762. Change the English, then run it again. -->
# RPG Engine: kompletní průvodce

**RPG Engine** ti umožní hrát stolní hru na hrdiny s **AI jako Pánem jeskyně**. S Pánem jeskyně si povídáš v **chatu**. RPG Engine pracuje v pozadí: **pamatuje si svět**, **hází kostkami** a **vede účty**. Vedle chatu máš v prohlížeči otevřenou stránku, **dashboard**, s deníkem postavy, kostkami, mapami a kronikou.

Tento průvodce je pro hráče: programovat umět nemusíš.

## Rychlý start <!-- icon: send -->

1. Nainstaluj **Node.js** z [nodejs.org](https://nodejs.org) (verze LTS).
2. Nainstaluj **AI agenta**, program, ve kterém Pán jeskyně běží, a přihlas se: například Claude Code nebo Codex ([2.4](#24-connect-your-ai)).
3. V terminálu nainstaluj RPG Engine: `npm install -g rpg-engine`.
4. Vytvoř kampaň: `rpg init "The Salt Isles"`.
5. Přejdi do nové složky, `cd "The Salt Isles"`, a spusť tam svého agenta: `claude` pro Claude Code, `codex` pro Codex. Když se zeptá, jestli složce důvěřuješ, potvrď ([2.4](#24-connect-your-ai)). Pak napiš *Ahoj! Pojďme začít.* Pán jeskyně odpoví odkazem na tvůj dashboard.

## 1. O hře RPG Engine <!-- icon: about -->

| Kdo | Co dělá |
|---|---|
| **Ty** | Hraješ svou postavu: co dělá, říká a zkouší. |
| **Pán jeskyně** (AI) | Vypráví příběh, hraje všechny ostatní, rozhoduje, co se stane, a žádá o hody. |
| **RPG Engine** | Drží svět v souborech, háže kostkami, počítá životy, peníze, čas a vzdálenosti a drží tajemství, dokud je neobjevíš. |

Svět zůstává stejný z jednoho večera na druhý, i v novém chatu, i s jinou AI:

- **Co bylo řečeno, platí.** Mrtvý padouch zůstane mrtvý.
- **Kostky jsou skutečné.** Pán jeskyně je nemůže ohnout, kromě nejlehčí obtížnosti, pokud ji zvolíš.
- **Tajemství zůstávají tajná.** Pán jeskyně ti nikdy neřekne, co tvá postava neví.
- **Svět se hýbe.** Hrozby postupují, zatímco odpočíváš nebo cestuješ, a ty vidíš jejich znamení.
- **Kampaň je složka** na tvém počítači: skonči, kdy chceš, a navaž později.

Hra přichází jako herní systém, balíček, který Pán jeskyně nainstaluje pro tvou kampaň. Dnes je náš systém **pátá edice** z volného dokumentu System Reference Document 5.1. Bez něj hraješ zdarma, příběh bez čísel. Další přijdou ([Připravujeme](#9-coming-later)).

---

## 2. Začínáme <!-- icon: path -->

### 2.1 Co potřebuješ

- Počítač s Windows, macOS nebo Linuxem a webový prohlížeč.
- **Node.js 22** nebo novější, z [nodejs.org](https://nodejs.org). Přináší `npm`, kterým se instaluje RPG Engine.
- **Terminál**: ve Windows Terminál nebo PowerShell, v macOS Terminál. Terminál ve složce otevřeš tak, že na složku klikneš pravým tlačítkem a zvolíš **Otevřít v Terminálu** (Windows) nebo **Služby > Nový terminál ve složce** (macOS).
- **AI agent** pro Pána jeskyně ([2.4](#24-connect-your-ai)) s **největším modelem**, který nabízí: malý model se snáze nechá přemluvit k prozrazení tajemství nebo k ohnutí pravidel.

### 2.2 Instalace

```text
npm install -g rpg-engine
```

Příkaz `rpg --version` ověří, že instalace proběhla. Příkaz `rpg` použiješ jednou pro každou kampaň, když ji vytváříš. Potom už RPG Engine spouští tvůj agent sám.

### 2.3 Vytvoření kampaně

Otevři terminál ve složce, kam ukládáš své hry ([2.1](#21-what-you-need) říká, jak na to):

```text
rpg init "The Salt Isles"
```

Tím vznikne složka `The Salt Isles` s novou kampaní. Přejdi do ní příkazem `cd "The Salt Isles"`. Zapamatuj si, kde leží: vracíš se do ní při každé hře. Vše ostatní zvolíš později, v chatu nebo na dashboardu. Příkaz `rpg init --help` vypíše volby, kterými můžeš některé věci určit hned, například `--language it` nebo `--difficulty hard`.

Pán jeskyně kampaň za tebe vytvořit nemůže: před příkazem `init` nic neříká tvému agentovi, kde RPG Engine najde.

### 2.4 Připojení AI

Pán jeskyně běží v **AI agentovi**: je to AI aplikace, v terminálu nebo na ploše, která umí pracovat se soubory v tvém počítači, například Claude Code nebo Codex. Obyčejný chat jako claude.ai nebo ChatGPT, případně aplikace v telefonu, nestačí: Pán jeskyně se musí dostat k souborům kampaně v tvém počítači. Každý agent potřebuje vlastní tarif a přihlášení: Claude Code placený tarif Claude, Codex přihlášení do ChatGPT. Nainstaluješ ho jednou, z jeho vlastní stránky: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: ve složce kampaně napiš `claude`. Když se zeptá, jestli složce důvěřuješ, zvol **Yes, I trust this folder**. Pozor, předvolená odpověď je *No, exit*. Kampaň má také malý hook, `rpg --listen`, který otázka neukazuje: okamžitě sdělí Pánu jeskyně, když něco uděláš na dashboardu.
- **Codex**: ve složce kampaně napiš `codex` a na otázku, jestli složce důvěřuješ, odpověz ano. V jeho desktopové aplikaci zkontroluj v nastavení, že jsou paměti pro chaty hry vypnuté.
- **Jiný agent**: spusť ho ve složce kampaně a připoj k němu server MCP `rpg mcp`. RPG Engine je standardní server MCP: Pánem jeskyně může být každý agent, který MCP podporuje, i lokální.

Hrajeme a testujeme s **Claude Code**. **Codex** je připojený a ověřený, ale zatím se s ním neodehrála celá kampaň. Kampaň vypíná vlastní paměť agenta: hra žije v jeho souborech, aby návrat k uložené hře opravdu vrátil zpět.

### 2.5 První chat

Napiš cokoli, třeba *Ahoj! Pojďme začít.* Ve své první odpovědi v každém chatu ti Pán jeskyně dá **odkaz na tvůj dashboard**, něco jako `http://127.0.0.1:4750`. Otevři ho a měj ho vedle chatu.

Mezi zprávami Pána jeskyně ukazuje tvůj agent nástroje, které používá. Neotvírej jejich podrobnosti (v Claude Code ctrl+o), mohou odhalit tajemství.

Nová kampaň prochází třemi fázemi, které jsou vidět nahoře na dashboardu: **1 Nastavení** (jak chceš hrát), **2 Nulté sezení** (vytváříš postavu, přímo ve hře), **3 Hra**.

### 2.6 Nastavení: jak chceš hrát

Pán jeskyně se ptá jen na to, co ještě chybí, vždy na několik otázek najednou. Krok **Nastavení** na dashboardu ukazuje stejné otázky jako karty. Napiš „rozhodni ty“ a Pán jeskyně vybere. Vše se dá později změnit, v chatu nebo v **Nastavení**.

| Nastavení | O čem rozhoduje | Hodnoty |
|---|---|---|
| **Mentor** | Jak moc tě Pán jeskyně učí pravidla | vypnuto, rady, výuka |
| **Obtížnost** | Jak těžký je svět | příběh, snadná, normální, těžká, brutální |
| **Smrtelnost** | Co znamená pád v boji | vyprávěcí (nikdy nezemřeš), epická (jen když na tom záleží), kostky |
| **Uložené hry** | Kdy se můžeš vrátit | trvalá smrt, kontrolní bod, volně ([3.8](#38-saves-and-going-back)) |
| **Přísnost** | Jak přesně se dodržují pravidla pro jídlo, světlo a cestování | plynulá, pravidla, simulace |
| **Kostky** | Kdo hází tvými kostkami | digitální, fyzické |
| **Jednotky** | Vzdálenosti a váhy | metrické, imperiální |
| **Hlasy postav** | Kdo mluví za postavy, které potkáš, od Pána jeskyně po samotné postavy: vždy Pán jeskyně; v klíčových chvílích sama postava, která ví jen to, co ví ona, podle volby Pána jeskyně; nebo vždy postava, u hlavních nebo u všech, pomaleji a dráž, pokud to tvoje AI aplikace umí | Pán jeskyně, občas, hlavní postavy, všechny |
| **Společníci** | Kdo s tebou cestuje | nikdo, vytvoření s tebou, vytvoření Pánem jeskyně, potkání ve hře |
| **Obrázky** | Obrázky míst, úkolů a postav, které potkáš | žádné, na požádání, nová místa, úkoly a postavy, které potkáš ([3.11](#311-pictures)) |
| **Hranice** a **Závoje** | Co se nikdy neobjeví a co se děje jen mimo scénu | seznamy |
| **Jazyk** | Jazyk hry a dashboardu | libovolný |

Pátá edice přidává **postup**: zkušenostní body nebo milníky.

Pokud nemáš napsaný svět, Pán jeskyně se zeptá také na **předpoklad** (žánr, tón, několik prvků, tvými slovy) a na **přípravu**: vytvářet svět za pochodu, jak hra postupuje, nebo celý na začátku.

Na **Styl Pána jeskyně** se Pán jeskyně nikdy neptá, ale můžeš ho změnit v chatu nebo v **Nastavení**: **próza** (prostá, literární, pulp, ironická), **příběhy**, které vymýšlí (situace, oblouky, epizody, záhada), autor, **podle něhož psát**, nebo cokoli jiného **tvými slovy**.

### 2.7 Nulté sezení: tvoje postava

Postavu vytváříš s Pánem jeskyně, jako u stolu. Každá volba je tvoje, pokud Pána jeskyně nepožádáš, aby ji udělal on: přijď s hotovou představou, s mlhavou, nebo s ničím. Pán jeskyně ti řekne, jak se tvoří hodnoty vlastností, ještě než se hodí první kostkou. Příběh postavy není nutný. Pokud nějaký dáš, Pán jeskyně ho napíše tvými slovy. Potom Pán jeskyně požádá o obrázek tvé postavy ([3.7](#37-your-characters-story-and-picture)). RPG Engine spočítá deník postavy: žádné výpočty nedělᬠsám.

---

## 3. Hraní <!-- icon: chat -->

### 3.1 Rozhovor s Pánem jeskyně

Napiš, co tvoje postava dělá nebo říká, vlastními slovy:

> Ptám se hostinského, kdo další tudy dnes večer procházel.

Když chceš mluvit mimo příběh, piš do hranatých závorek: *[Jak funguje zápas v držení?]* Pán jeskyně odpoví také v závorkách.

Ty říkáš, o co se pokoušíš. Pán jeskyně říká, co se stane. Pán jeskyně nikdy nerozhoduje za tvou postavu a nikdy nemluví o enginu. Můžeš se ho zeptat, jak se používá dashboard.

**Jednání z dashboardu**: klikni na jméno v deníku postavy, třeba na zbraň, kouzlo nebo něco, co nosíš. Potom vyber, na koho to míří. Nebo klikni na osobu, se kterou chceš mluvit. Dashboard napíše tvou větu, *Útočím na Zakuklený bandita 1 palcátem.*, kterou můžeš před **Říct Pánu jeskyně** upravit. Pán jeskyně ji slyší, jako by byla řečena v chatu, a rozhodne o ní jako o každé jiné. Když ji tvoje AI aplikace nezachytí sama, tlačítko **Kopírovat** ji připraví k vložení do chatu.

### 3.2 Hody

Pán jeskyně žádá o hod, jen když je výsledek nejistý a záleží na něm. Nejdřív řekne, o co jde. Pak:

- **Na dashboardu** se v panelu zobrazí tlačítko pro každé ověření, například *Akrobacie +4 · s výhodou*. Klikni na něj: kostky padnou na stránce a Pán jeskyně uslyší výsledek. Můžeš také kliknout na řádek v deníku postavy, který se rozsvítí, hodit kostky z podnosu na kostky, nebo do panelu napsat něco jiného.
- **Ručně**, v rohu panelu nebo v **Nastavení**: panel ti řekne, co hodit, a ty hodíš z deníku postavy nebo z podnosu na kostky.
- **Fyzické kostky**, když je nastavení kostek na fyzické: napíšeš, co ti padlo, *[Hodil/a jsem 14.]*, a RPG Engine přičte tvé opravy.

**Volné hody**: klikni na libovolné číslo v deníku postavy nebo otevři podnos na kostky a hoď si pro zábavu. Nikdy se nepočítají a Pán jeskyně je nevidí.

**Hody Pána jeskyně** se zobrazují ve sloupci hodů, kromě tajných. Vždy se můžeš zeptat *[Byl ten hod skutečný?]*: u tajného hodu Pán jeskyně dá otisk, který dokazuje, že hod proběhl dřív, než ses zeptal/a.

### 3.3 Scény a boje

Příběh běží ve **scénách**: boj, rozhovor, zkoumání, cestování, odpočinek. Na konci každé scény se hra sama uloží a scéna přejde do tvé kroniky.

V boji Pán jeskyně vypráví každý tah, který není tvůj, a zastaví se tam, kde se můžeš rozhodnout. **Scéna** nahoře ukazuje, kdo je na tahu a kdo bude další, a vedle mapy kartu tvé postavy. Pořadí tahů, životy tvé družiny a slovní popis toho, jak jsou nepřátelé raněni, zůstávají na straně stránky. Pokud tvá postava padne, na stránce se velké zobrazí záchrany před smrtí.

### 3.4 Čas, cestování a svět, který se hýbe

RPG Engine hlídá datum. Mezi sezeními neběží čas. Řekni, že odpočíváš, *Dopřejeme si dlouhý odpočinek*, a jakmile Pán jeskyně souhlasí, odpočinek vrátí, co má. Při krátkém odpočinku se tě Pán jeskyně může na dashboardu zeptat, kolik kostek životů utratíš: hoď je po jedné, uvidíš, kolik každá vyléčí, a přestaň, kdy chceš. Řekni, kam jdeš, *Vydáme se po cestě na sever k Rocce*, a RPG Engine spočítá cestu, vzdálenost i dny. Zastaví se, když se cestou něco stane. Peníze se počítají v herních mincích, včetně drobných.

Padouši mají plány s termíny. Každý nový den Pán jeskyně posune hrozby, které čas pokročil, a ty vidíš jejich znamení, nikdy ne samotné hodiny.

### 3.5 Mapy

**Svět** ukazuje místa, která tvá postava zná, cesty mezi nimi a stopu, kterou jsi prošel/prošla. Zbytek zakrývá mlha. **Scéna** ukazuje mapu místa, kde jsi, pokud nějakou má, a kdo kde stojí. V boji jsou na tvém tahu políčka, na která nedosáhneš, zastřená. Když se Pán jeskyně zeptá, kam se přesuneš, ťukni na políčko nebo ho napiš, třeba *E4*.

**Svět** také uchovává, co tvá postava ví. **Znalosti** uvádějí lidi, místa, frakce, tvory a příběhy, které postava zná, každé tak, jak je zná: můžeš v nich hledat, nebo otevřít položku a přečíst si ji celou. Jméno v textu vede na svou stránku. **Dokumenty** uchovávají dopisy, oznámení a stránky, které postava našla, k opětovnému přečtení. **Kalendář** ukazuje dnešek, termíny tvých úkolů se zbývajícím časem a dny příběhu: den se scénami vede k jeho kapitolám v Kronice.

### 3.6 Úkoly, kronika a poznámky

Úkol, který tvá postava přijme, se objeví v **Kronice** i s cíli, termínem a tím, co měří. Označ ho hvězdičkou, aby zůstal na očích nahoře ve Scéně. Kronika také vypráví tvůj **příběh**, scénu po scéně, a uchovává tvé **poznámky**: jsou soukromé, dokud některou nepoužiješ ke **Sdílet**. Pán jeskyně ji pak slyší jako to, co si myslíš, nikdy jako fakt. V části **Společníci** čteš deníky svých společníků: čas od času, na konci dne nebo úkolu, napíšou pár řádků o tom, co si myslí a cítí.

### 3.7 Příběh a podoba tvé postavy

Na deníku postavy má karta **Popis** pole pro příběh tvé postavy: Pán jeskyně ho tam zapíše, až řekneš ano. Pro obrázek dej Pánu jeskyně soubor (PNG, JPEG, WebP nebo SVG, do 5 MB) a řekni, kde na počítači leží. Nebo si nech vytvořit portrét ([3.11](#311-pictures)): *[Udělej mi portrét: šedé vlasy spletené do copu, jizva na bradě.]*

### 3.8 Uložené hry a návrat zpět

RPG Engine ukládá celou kampaň na konci každé scény. O zbytku rozhoduje nastavení **uložených her**:

| Uložené hry | Uložit, kdy chceš | Vrátit se |
|---|---|---|
| **permadeath** | ne | nikdy |
| **checkpoint** | ne | k poslední uložené hře, jen když tvá postava zemře |
| **volné** | ano | k jakékoli uložené hře |

V každém režimu můžeš **začít znovu**, od začátku hry nebo od nultého sezení. Udělej to v chatu nebo v **Uložené hry**.

Po návratu zpět **otevři nový chat**: starý si pamatuje, co bylo zrušeno. V novém chatu napiš *pokračuj*, potom v Uložené hry stiskni **Nový chat otevřen**.

### 3.9 Sezení: přestávka a návrat

Přestaň, kdy chceš: *[Pro dnešek skončeme.]* Všechno je už uloženo v souborech. Až se budeš chtít vrátit, spusť svého agenta ve složce kampaně a napiš *pokračuj*: Pán jeskyně ti krátce shrne děj a jde se dál.

### 3.10 Nálada Pána jeskyně

Robot nahoře na dashboardu je Pán jeskyně. Jeho tvář sleduje tón příběhu a nikdy neprozradí, co ještě nevíš. Když je chat zavřený, spí.

### 3.11 Obrázky

RPG Engine může nechat vytvořit obrázky míst, kam dojdeš, úkolů, které přijmeš, a těch, které potkáš, podle nastavení **obrázků**, a také portrét tvé postavy, když o něj požádáš. Používá tvůj vlastní Codex nebo Claude Code, s tvým přihlášením, na tvém tarifu a v jeho mezích: **Codex** je maluje, jinak je kreslí **Claude Code**. **Nastavení** ukazuje, zda je tento počítač umí vytvářet, a jak to případně nastavit. Pánu jeskyně můžeš vždy dát vlastní obrázek.

### 3.12 Bezpečí: hranice, závoje a stop

**Hranice** se ve hře nikdy neobjeví. **Závoje** se odehrávají jen mimo scénu. Kdykoli napiš *[stop]*: Pán jeskyně ten obsah okamžitě opustí a přidá ho do tvých hranic.

### 3.13 Změna rozhodnutí

Každé nastavení lze změnit, v chatu nebo v **Nastavení**. Rozhodnutí, které Pán jeskyně udělá bez pravidel, se stane **precedentem**, takže stejná otázka dostane příště stejnou odpověď.

---

## 4. Ovládací panel <!-- icon: party -->

Stránka na tvém počítači, kterou otevřeš jen v prohlížeči na tomto počítači. Funguje, dokud je chat otevřený. Když se chat zavře, zobrazí *Not connected*. S dalším chatem se vrátí sama.

- **Družina**: tvůj deník postavy a deníky tvých společníků. Kliknutím na číslo si hodíš. Když na něj najedeš myší, uvidíš, odkud se bere, a pokud šipka u kostky něco označuje, také co hod zlepšuje nebo zhoršuje. Vedle jsou hody.
- **Scéna**: kde jsi, obrázek a mapa místa, kdo tam je a co se děje. V boji tu najdeš tahy a kartu své postavy.
- **Kronika**: úkoly, příběh, deníky tvých společníků a tvé poznámky.
- **Svět**: mapa světa, co tvá postava ví, nalezené dokumenty a kalendář.
- **Podnos na kostky**: vyber kostky a opravu a hoď. ×2 zdvojnásobí kostky, nikdy ne opravu, jako při kritickém zásahu.
- **Uložené hry**, **Nápověda**, **Nastavení** a **O aplikaci**: ikony na konci řady. V Nastavení najdeš také vlastní předvolby stránky: motiv, zvuk kostek a sadu kostek.

Když se tě Pán jeskyně na něco zeptá, jeho nápis zůstane nahoře, ať jsi v jakékoli části.

---

## 5. Herní systémy a domácí pravidla <!-- icon: dice -->

### 5.1 Co je herní systém

Data jedné hry: její deník postavy, čísla, tvorové, předměty, kouzla a text pravidel. Každá kampaň hraje jeden systém. RPG Engine spočítá deník postavy i to, co se utratí a vrací; jak funguje schopnost, přečte Pán jeskyně v pravidlech a rozhodne, jako u stolu.

### 5.2 Pátá edice

Rasy, povolání, podpovolání, zázemí a vlastnost z SRD 5.1; 319 kouzel, zbraně, zbroje, magické předměty a příšery; kapitoly pravidel, které Pán jeskyně čte podle přesného znění; úplný deník postavy, spočítaný.

Je to samostatný balíček: Pán jeskyně ho nabídne při zakládání kampaně a nainstaluje ho. Kampaň, která ho hraje, si ho nainstaluje sama, když se poprvé otevře na počítači bez něj, a Pán jeskyně ti to oznámí.

Můžeš hrát i obsah, který SRD nemá, z knihy, kterou vlastníš: Pán jeskyně ho zapíše jako stránky tvé kampaně a RPG Engine s ním zachází jako s vlastním. RPG Engine dodává jen otevřený obsah; co zná Pán jeskyně, omezené není.

Tvé vlastní příručky mohou být tvou knihovnou: řekni Pánu jeskyně, kde jsou, *[Mé příručky jsou v D:\Books\5e.]*, nebo přidej jejich složku v Packages › Library a jednou řekni ano v okně, které ukáže počítač. RPG Engine je čte na tomto počítači; každá kampaň používá složky, které tam zapneš, a Pán jeskyně v nich hledá, když rozhoduje pravidlo, po SRD, s uvedením knihy a stránky. Nejlépe se čtou jako text nebo jako PDF s vybratelným textem; skenované PDF se čte z obrázků stránek, jen ve Windows, několik minut a s drobnými chybami. RPG Engine tvé příručky nikdy nemění, nikdy nikam neposílá jejich text a nikdy ho nekopíruje do kampaně.

### 5.3 Domácí pravidla a vlastní doplňky

Zeptej se Pána jeskyně: *[Domácí pravidlo: přirozená 1 při útoku znamená, že upustíš zbraň.]* Pán jeskyně si ji zapamatuje jako dohodu stolu, nebo napíše stránku či číslo deníku postavy, když je potřeba. Již sepsaná domácí pravidla mohou být jako textové soubory ve složce `rules` kampaně.

### 5.4 Přidání nebo import vlastního herního systému

Herní systém je balíček: Pán jeskyně nainstaluje jeden z npm, ze složky nebo ze souboru, a ten, který není náš, jen s tvým ano v okně tvého počítače. Vytvořit ho je práce pro vývojáře, popsaná v dokumentech RPG Engine na GitHubu. Proměnit tvou knihu v herní systém tu zatím není ([Připravujeme](#9-coming-later)).

---

## 6. Rozšíření <!-- icon: plus -->

Zatím ne. Rozšíření přidá ke kampani něco navíc nad její herní systém: svět, dobrodružství, funkci, třeba počasí, nebo vlastní pravidla ke sdílení.

---

## 7. Odkud kampaň pochází a její jazyk <!-- icon: world -->

### 7.1 Tři cesty ke světu

- **Vytvářený za pochodu**: z tvé premisy Pán jeskyně buduje každé místo, osobu i zápletku těsně předtím, než je potřebuješ, a uchovává je.
- **Připravený na začátku**: totéž, ale svět se postaví před hrou.
- **Z tvého vlastního dobrodružství nebo knihy**: dej Pánu jeskyně její soubor, *[Naimportuj toto dobrodružství jako naši kampaň: D:\Books\adventure.pdf. Neříkej mi nic z toho, co v něm je.]* Nejlépe se čte jako text, EPUB, dokument Word nebo PDF s textem, který lze označit. Naskenované PDF se čte z obrázků stránek, jen ve Windows, pomalu a s několika chybami. Tvůj vlastní Codex nebo Claude Code ho přečte mimo chat, jinak Pán jeskyně v chatu, v rámci tvého tarifu: celý dokument jde do OpenAI nebo Anthropic, podle podmínek tvého účtu a jeho nastavení ohledně trénování. Dashboard ukazuje, jak daleko to je. U románu Pán jeskyně navrhne, kde začít. Napíše místa, postavy a tajemství.

Kampaň se hraje jednou: chceš-li hrát totéž dobrodružství znovu, vytvoř novou kampaň.

### 7.2 Jazyky

Jeden jazyk na kampaň, ten Pána jeskyně, kterým se řídí i dashboard. Dashboard se dodává ve 26 jazycích. Jakýkoli jiný přeloží na tvém počítači Codex nebo Claude Code, nebo bez nich Pán jeskyně v chatu. Italské názvy pojmů páté edice pocházejí z oficiálního italského SRD, text pravidel zůstává anglicky a Pán jeskyně ho převypráví ve tvém jazyce.

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

**Musím znát pravidla?** Ne. Vyber mentora s výukou a ptej se v závorkách, kdykoli chceš.

**Může Pán jeskyně podvádět?** Nemůže změnit hod, který udělal RPG Engine, kromě obtížnosti příběh, ani už stanovená fakta.

**Stojí to něco?** RPG Engine je zdarma. Pán jeskyně běží na tarifu tvého agenta, nebo na tvém počítači s místním modelem. Večer hraní je dlouhý chat: na nejmenších tarifech můžeš narazit na limit tarifu dřív, než večer skončí. Obrázky, překlady a importy používají stejný tarif. RPG Engine sám nikdy nepoužívá klíč API, který se platí za každé volání: přihlas agenta svým účtem, ne klíčem.

**Můžu hrát na telefonu?** Ne: Pán jeskyně běží na tvém počítači a dashboard se otevře jen tam.

**Můžu hrát s kamarády?** Zatím ne: dnes jeden hráč, jedna postava a k tomu společníci ([Coming later](#9-coming-later)).

**Můžu příště použít jinou AI?** Ano: otevři kampaň v jiném agentovi a napiš *pokračuj*.

### Problémy

**Dashboard se neotevře.** Zeptej se Pána jeskyně: `[Jaký je odkaz na dashboard?]`. Funguje jen tehdy, když je v té kampani otevřený chat, po první odpovědi Pána jeskyně.

**Pán jeskyně jako by hru neznal.** Tvůj agent nenačetl RPG Engine. Zkontroluj, že jsi ho spustil(a) ve složce kampaně a že jsi jí důvěřoval(a). V Claude Code napiš `/mcp` a znovu připoj `rpg`. V Codexu musí `codex mcp list` ve složce kampaně ukázat `rpg`. Pokud se `rpg --version` nenajde, nainstaluj RPG Engine znovu ([2.2](#22-install)).

**Aktualizace.** Spusť znovu `npm install -g rpg-engine` a potom otevři nový chat: běžící Pán jeskyně si drží verzi, se kterou začal.

**Pán jeskyně si pamatuje něco, co jsem vrátil(a) zpět.** Otevři nový chat a v Uložených hrách stiskni **Nový chat otevřen**.

**Neobjevují se žádné obrázky.** Nastavení > Obrázky říká, jestli je tento počítač umí vytvářet, a jak.

**Instalace selže, nebo `rpg` nechce začít.** `node --version` musí hlásit 22 nebo novější. Ve Windows nech RPG Engine a své kampaně mimo cesty, které obsahují `&`.

**Odkaz na dashboard se změnil.** Obvyklou adresu zabral jiný program. Nový odkaz ti dá Pán jeskyně.
