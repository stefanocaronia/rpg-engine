<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb df1364a2 8fd6b933 75985e6d ece214f0 8c9f41da 17577253 f699a840 241f6611 59c1a762. Change the English, then run it again. -->
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
- **Node.js 22** nebo novější z [nodejs.org](https://nodejs.org). Přináší `npm`, kterým se RPG Engine instaluje.
- **Terminál**: ve Windows Terminál nebo PowerShell, v macOS Terminál. Terminál ve složce otevřeš tak, že na složku klikneš pravým tlačítkem a vybereš **Otevřít v Terminálu** (Windows) nebo **Služby > Nový terminál ve složce** (macOS).
- **AI agent** pro Pána jeskyně ([2.4](#24-connect-your-ai)) s **největším modelem**, který nabízí: malý model se dá snáz přemluvit, aby prozradil tajemství nebo ohnul pravidla.

### 2.2 Instalace

```text
npm install -g rpg-engine
```

Příkaz `rpg --version` ověří, že se instalace povedla. Příkaz `rpg` použiješ jednou pro každou kampaň, abys ji vytvořil(a) – přesněji: jen při jejím vytvoření. Potom už RPG Engine spouští tvůj agent sám.

### 2.3 Vytvoření kampaně

Otevři terminál ve složce, kam ukládáš své hry ([2.1](#21-what-you-need) říká jak):

```text
rpg init "The Salt Isles"
```

Vznikne složka `The Salt Isles` s novou kampaní. Přejdi do ní příkazem `cd "The Salt Isles"`. Zapamatuj si, kde leží: budeš se do ní vracet při každé hře. Všechno ostatní si zvolíš později, v chatu nebo na dashboardu. Příkaz `rpg init --help` vypíše volby, kterými si můžeš něco zvolit hned, například `--language it` nebo `--difficulty hard`.

Pán jeskyně ti kampaň vytvořit nemůže: před příkazem `init` agentovi nic neříká, kde RPG Engine je.

### 2.4 Připojení AI

Pán jeskyně běží v **AI agentovi**: AI aplikaci v terminálu nebo na ploše, která umí pracovat se soubory v tvém počítači, například Claude Code nebo Codex. Obyčejný chat jako claude.ai nebo ChatGPT, případně aplikace v telefonu nestačí: Pán jeskyně musí mít přístup k souborům kampaně v tvém počítači. Každý agent potřebuje vlastní tarif a přihlášení: Claude Code placený tarif Claude, Codex přihlášení do ChatGPT. Agenta nainstaluješ jednou, z jeho vlastní stránky: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: ve složce kampaně napiš `claude`. Když se zeptá, zda složce důvěřuješ, zvol **Yes, I trust this folder**. Pozor, předvolená odpověď je *No, exit*. Kampaň má také malý hák, `rpg --listen`, který otázka neukazuje: okamžitě dá Pánu jeskyně vědět, když jednáš z dashboardu.
- **Codex**: ve složce kampaně napiš `codex` a na otázku, zda složce důvěřuješ, odpověz ano. V jeho desktopové aplikaci zkontroluj v nastavení, že jsou paměti pro chaty hry vypnuté.
- **Jiný agent**: spusť ho ve složce kampaně a dej mu server MCP `rpg mcp`. RPG Engine je standardní server MCP: Pánem jeskyně může být každý agent, který MCP podporuje, včetně lokálních.

Hrajeme a testujeme s **Claude Code**. **Codex** je připojený a ověřený, ale celá kampaň se s ním zatím nehrála. Kampaň vypíná vlastní paměť agenta: hra žije v jeho souborech, takže návrat k uložené hře opravdu vrací zpět.

### 2.5 První chat

Napiš cokoli, třeba *Ahoj! Začněme.* V první odpovědi každého chatu ti Pán jeskyně dá **odkaz na tvůj dashboard**, něco jako `http://127.0.0.1:4750`. Otevři ho a měj ho vedle chatu.

Mezi zprávami Pána jeskyně ukazuje agent nástroje, které používá. Neotvírej jejich podrobnosti (v Claude Code ctrl+o), mohou prozradit tajemství.

Nová kampaň prochází třemi fázemi, které vidíš nahoře na dashboardu: **1 Nastavení** (jak chceš hrát), **2 Nulté sezení** (vytvoříš postavu, přímo ve hře), **3 Hra**.

### 2.6 Nastavení: jak chceš hrát

Pán jeskyně se ptá jen na to, co ještě chybí, po několika otázkách najednou. Krok **Nastavení** na dashboardu ukazuje tytéž otázky jako karty. Napiš „rozhodni ty“ a Pán jeskyně zvolí sám. Všechno se dá později změnit, v chatu nebo v **Nastavení**.

| Nastavení | O čem rozhoduje | Hodnoty |
|---|---|---|
| **Mentor** | Jak moc tě Pán jeskyně učí pravidla | off, hints, tutorial |
| **Obtížnost** | Jak tvrdý je svět | story, easy, normal, hard, brutal |
| **Smrtelnost** | Co znamená padnout v boji | narrative (nikdy nezemřeš), epic (jen když na tom záleží), dice |
| **Uložené hry** | Kdy se můžeš vrátit zpět | permadeath, checkpoint, free ([3.8](#38-saves-and-going-back)) |
| **Přísnost** | Jak přísně se řídí jídlo, světlo a cestování pravidly | smooth, rules, simulation |
| **Kostky** | Kdo hází tvými kostkami | digital, physical |
| **Jednotky** | Vzdálenosti a váhy | metric, imperial |
| **Voices** | Kdo mluví za postavy, které potkáš: v klíčových chvílích sama postava, která ví jen to, co ví ona, podle volby Pána jeskyně; vždy Pán jeskyně; nebo vždy postava, u hlavních nebo u všech, pomaleji a dráž, tam, kde to tvá AI aplikace umí | auto, master, important, always |
| **Společníci** | Kdo s tebou cestuje | none, made with you, made by the master, met in play |
| **Obrázky** | Obrázky míst, úkolů a těch, které potkáš | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Hranice** a **Závoje** | Co se ve hře nikdy neobjeví a co se děje jen mimo scénu | seznamy |
| **Jazyk** | Jazyk hry a dashboardu | libovolný |

Pátá edice přidává **postup**: zkušenostní body nebo milníky.

Pokud nemáš napsaný svět, Pán jeskyně se zeptá také na **premisu** (žánr, tón, pár prvků, tvými slovy) a na **přípravu**: tvořit svět za chodu, jak hraješ, nebo celý na začátku.

Na **Styl Pána jeskyně** se Pán jeskyně neptá, ale můžeš ho změnit v chatu nebo v **Nastavení**: **próza** (plain, literary, pulp, wry), **příběhy**, které vymýšlí (situations, arcs, episodes, mystery), autor, podle kterého má **psát**, nebo cokoli jiného **tvými slovy**.

### 2.7 Nulté sezení: tvá postava

Postavu vytváříš s Pánem jeskyně, jako u stolu. Každá volba je tvoje, pokud nepožádáš Pána jeskyně, aby ji udělal za tebe: přijď s hotovou představou, s vágní, nebo s ničím. Pán jeskyně ti řekne, jak se tvoří vlastnosti, ještě než se hodí první kostka. Příběh postavy není povinný. Pokud nějaký dáš, Pán jeskyně ho zapíše tvými slovy. Potom se Pán jeskyně zeptá na obrázek tvé postavy ([3.7](#37-your-characters-story-and-picture)). Deník postavy sestaví RPG Engine: nikdy nic nepočítáš.

---

## 3. Hraní <!-- icon: chat -->

### 3.1 Rozhovor s Pánem jeskyně

Piš, co tvá postava dělá nebo říká, vlastními slovy:

> Ptám se hostinského, kdo jiný tu dnes večer prošel.

Mimo příběh piš do hranatých závorek: *[Jak funguje zápas v zápolení?]* Pán jeskyně odpoví také v závorkách.

Ty říkáš, o co se pokoušíš, Pán jeskyně říká, co se stane. Pán jeskyně nikdy nerozhoduje za tvou postavu a nikdy nemluví o enginu. Můžeš se ho zeptat, jak se dashboard používá.

**Jednání z dashboardu**: klikni na jméno v deníku postavy, například na zbraň, kouzlo nebo předmět, který neseš, a pak na to, koho se to týká. Nebo klikni na osobu, se kterou chceš mluvit. Dashboard napíše tvou větu, *Útočím na Hooded Bandit 1 s Mace.*, kterou můžeš před **Říct Pánu jeskyně** upravit. Pán jeskyně ji slyší, jako by byla řečena v chatu, a posuzuje ji jako každou jinou. Tam, kde ji tvá AI aplikace sama nezachytí, ji **Kopírovat** připraví k vložení do chatu.

### 3.2 Hody

Pán jeskyně žádá hod jen tehdy, když je výsledek nejistý a záleží na něm, a nejdřív řekne, co je v sázce. Pak:

- **Na dashboardu** se v pruhu objeví tlačítko pro každé ověření, například *Akrobacie +4 · s výhodou*. Klikni na ně: kostky padnou na stránce a Pán jeskyně se dozví výsledek. Můžeš také kliknout na zvýrazněný řádek deníku postavy, hodit kostkami z podnosu na kostky nebo do pruhu napsat něco jiného.
- **Ručně**, v rohu pruhu nebo v **Nastavení**: pruh ti řekne, co hodit, a ty to hodíš z deníku postavy nebo z podnosu na kostky.
- **Fyzické kostky**, když je nastavení kostek na physical: napíšeš, co ti padlo, *[Hodil(a) jsem 14.]*, a RPG Engine přičte tvé opravy.

**Volné hody**: klikni na libovolné číslo v deníku postavy nebo otevři podnos na kostky a hoď si pro zábavu. Nikdy se nepočítají a Pán jeskyně je nikdy nevidí.

**Hody Pána jeskyně** se ukazují ve tvém sloupci hodů, kromě tajných. Vždy se můžeš zeptat *[Byl ten hod skutečný?]*: u tajného hodu ti Pán jeskyně dá otisk, který dokazuje, že hod proběhl dřív, než ses zeptal(a).

### 3.3 Scény a boje

Příběh běží ve **scénách**: boj, rozhovor, zkoumání, cestování, odpočinek. Na konci každé scény se hra sama uloží a scéna se zapíše do tvé kroniky.

V boji Pán jeskyně popíše každý tah, který není tvůj, a zastaví se tam, kde se můžeš rozhodnout. **Scéna** nahoře ukazuje, kdo je na tahu a kdo je další, a vedle mapy kartu tvé postavy. Pořadí tahů, životy tvé družiny a to, jak zraněně vypadají nepřátelé, slovy, zůstávají na straně vedle. Pokud tvá postava padne, zobrazí se na stránce velké záchranné hody proti smrti.

### 3.4 Čas, cestování a svět v pohybu

RPG Engine si hlídá datum. Mezi sezeními neplyne žádný čas. Řekni, že odpočíváš, *Dlouze odpočíváme*, a jakmile Pán jeskyně souhlasí, odpočinek vrátí, co má. Při krátkém odpočinku se tě Pán jeskyně může na dashboardu zeptat, kolik kostek životů utratíš: hoď jimi jednu po druhé, podívej se, kolik každá léčí, a přestaň, kdy chceš. Řekni, kam jdeš, *Vydáme se po cestě na sever do Rocca*, a RPG Engine spočítá cestu, vzdálenost a počet dní a zastaví se, když se cestou něco stane. Peníze se počítají v mincích hry, včetně drobných.

Padouši mají plány s termíny. Každý nový den Pán jeskyně posune hrozby, které čas postoupil, a ty vidíš jejich znamení, nikdy ne samotné hodiny.

### 3.5 Mapy

**Svět** ukazuje místa, která tvá postava zná, cesty mezi nimi a stopu, kterou jsi prošel(a), s mlhou nad zbytkem. **Scéna** ukazuje mapu místa, kde jsi, pokud nějakou má, s tím, kdo kde stojí. V boji jsou na tvém tahu políčka, na která nedosáhneš, zakrytá závojem. Když se Pán jeskyně zeptá, kam se přesuneš, dotkni se políčka nebo ho napiš, například *E4*.

### 3.6 Úkoly, kronika a poznámky

Úkol, který tvá postava přijme, se stane úkolem v **Kronice**, s cíli, termínem a tím, co měří. Označ ho hvězdičkou, aby zůstal na očích nahoře ve Scéně. Kronika také vypráví tvůj **příběh**, scénu po scéně, a uchovává tvé **poznámky**: soukromé, dokud některou nepoužiješ ke **Sdílet**. Pán jeskyně ji pak slyší jako to, co si myslíš, nikdy jako fakt.

### 3.7 Příběh a obrázek tvé postavy

V deníku postavy má karta **Popis** pole pro příběh tvé postavy: Pán jeskyně do něj píše, až když řekneš ano. Pro obrázek dej Pánu jeskyně soubor (PNG, JPEG, WebP nebo SVG, do 5 MB) a řekni, kde je v tvém počítači, nebo si nech vytvořit portrét ([3.11](#311-pictures)): *[Udělej mi portrét: šedé vlasy v copu, jizva na bradě.]*

### 3.8 Uložené hry a návrat zpět

RPG Engine ukládá celou kampaň na konci každé scény. Zbytek určuje nastavení **Uložené hry**:

| Uložené hry | Uložit, kdy chceš | Návrat |
|---|---|---|
| **permadeath** | ne | nikdy |
| **checkpoint** | ne | k poslednímu uložení, jen když tvá postava zemře |
| **free** | ano | k jakémukoli uložení |

V každém režimu můžeš **začít znovu**, od začátku hry nebo od nultého sezení. Udělej to v chatu nebo v **Uložené hry**.

Po návratu zpět **otevři nový chat**: starý si pamatuje, co bylo vzato zpět. V novém chatu napiš *pokračuj* a pak v Uložené hry stiskni **Nový chat otevřen**.

### 3.9 Sezení: přerušení a návrat

Přestaň, kdykoli chceš: *[Pro dnešní večer končíme.]* Všechno je už uložené v souborech. Až se budeš chtít vrátit, spusť agenta ve složce kampaně a napiš *pokračuj*: Pán jeskyně ti stručně shrne, co se stalo, a hraje dál.

### 3.10 Nálada Pána jeskyně

Robot nahoře na dashboardu je Pán jeskyně: jeho tvář sleduje tón příběhu a nikdy neprozradí, co ještě nevíš. Když je chat zavřený, spí.

### 3.11 Obrázky

RPG Engine může nechat vytvořit obrázky míst, která navštívíš, úkolů, které přijmeš, a těch, které potkáš, podle nastavení **Obrázky**, a portrét tvé postavy, když o něj požádáš. Používá tvého vlastního Codexe nebo Claude Code, s tvým přihlášením, na tvém tarifu a v jeho mezích: **Codex** je maluje, jinak je kreslí **Claude Code**. **Nastavení** ukazuje, zda je tento počítač umí vytvářet, a jak to případně nastavit. Pánu jeskyně můžeš vždy dát vlastní obrázek.

### 3.12 Bezpečí: hranice, závoje a stop

**Hranice** se ve hře nikdy neobjeví, **závoje** se dějí jen mimo scénu. Kdykoli napiš *[stop]*: Pán jeskyně okamžitě takový obsah opustí a přidá ho k tvým hranicím.

### 3.13 Změna rozhodnutí

Každé nastavení se dá změnit, v chatu nebo v **Nastavení**. Rozhodnutí, které Pán jeskyně učiní bez pravidel v ruce, se stane **precedentem**, takže na stejnou otázku bude příště stejná odpověď.

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

## 5. Herní systémy a domácí pravidla <!-- icon: dice -->

### 5.1 Co je herní systém

Data jedné hry: její deník postavy, čísla, tvorové, předměty, kouzla a text pravidel. Každá kampaň hraje jeden systém. RPG Engine vypočítá deník postavy a to, co se utratí a co se vrátí. Jak funguje nějaká schopnost, si přečte Pán jeskyně v pravidlech a rozhodne, stejně jako u stolu.

### 5.2 Pátá edice v základu

Rasy, povolání, podpovolání, zázemí a vlastnost z SRD 5.1; 319 kouzel, zbraně, zbroje, kouzelné předměty a nestvůry; kapitoly pravidel, které Pán jeskyně čte přesně podle textu; celý deník postavy, vypočítaný.

Můžeš hrát i obsah, který v SRD chybí, z knihy, kterou vlastníš: Pán jeskyně ho zapíše jako stránky tvé kampaně a RPG Engine s nimi zachází jako s vlastními. RPG Engine dodává jen otevřený obsah. To, co Pán jeskyně zná, omezené není.

Vlastní příručky mohou tvořit tvou knihovnu. Řekni Pánu jeskyně, kde jsou: *[Moje příručky jsou v D:\Books\5e.]* Nebo přidej jejich složku v Packages › Library a jednou potvrď souhlas v okně, které ukáže tvůj počítač. RPG Engine je čte na tomto počítači. Každá kampaň používá složky, které tam zapneš. Pán jeskyně v nich hledá, když rozhoduje o pravidle, po SRD, a uvádí knihu a stranu. Nejlépe se čtou jako text nebo jako PDF s vybíratelným textem. Naskenované PDF se čte z obrázků stránek, jen ve Windows, několik minut a s několika chybami. RPG Engine tvé příručky nikdy nemění, nikam neposílá jejich text a nikdy ho nekopíruje do kampaně.

### 5.3 Domácí pravidla a vlastní doplňky

Požádej Pána jeskyně: *[Domácí pravidlo: přirozená 1 při útoku znamená, že upustíš zbraň.]* Pán jeskyně si ho zapamatuje jako dohodu stolu. Nebo napíše stránku či číslo do deníku postavy, když je to potřeba. Už napsaná domácí pravidla můžeš vložit jako textové soubory do složky `rules` v kampani.

### 5.4 Přidání nebo import vlastního herního systému

Zatím ne: dnes RPG Engine hraje jen pátou edici ([Coming later](#9-coming-later)).

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
