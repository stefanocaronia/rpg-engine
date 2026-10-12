<!-- Translated from en.md, part by part, by npm run translate: a548216f e7ad3e89 0512df89 b69f95b1 5738adad 781d8fc0 89c84229 6ce15994 2933c94c ff563f86 069e4295 f9d75ec9. Change the English, then run it again. -->
# RPG Engine: kompletní průvodce

**RPG Engine** ti umožní hrát stolní hru na hrdiny s **umělou inteligencí v roli Pána jeskyně**.

S Pánem jeskyně si povídáš v **chatu**: Pán jeskyně vypráví příběh, hraje všechny ostatní postavy a rozhoduje o tom, co se stane.

RPG Engine pracuje v pozadí: **pamatuje si svět**, **hází kostkami** a **vede účetnictví**.

Vedle chatu máš v prohlížeči otevřenou stránku, **dashboard**, s deníkem tvé postavy, kostkami, mapami a kronikou.

Tento průvodce je určený hráčům: programovat umět nemusíš.

## Rychlý start <!-- icon: send -->

1. Nainstaluj **Node.js** z [nodejs.org](https://nodejs.org) (verze LTS).
2. Nainstaluj **Claude Code** nebo **Codex**, AI aplikaci, ve které Pán jeskyně běží, a přihlas se ([2.4](#24-connect-your-ai)).
3. Otevři terminál a nainstaluj RPG Engine: `npm install -g rpg-engine`.
4. V terminálu vytvoř kampaň: `rpg init "The Salt Isles"`.
5. Otevři Claude Code nebo Codex v nové složce a napiš *Ahoj! Pojďme začít.* Pán jeskyně odpoví odkazem na tvůj dashboard: otevři ho vedle chatu.

Zbytek průvodce vysvětluje každý krok a pak i samotnou hru.

## 1. Co je RPG Engine <!-- icon: about -->

### Kdo co dělá

| Kdo | Co dělá |
|---|---|
| **Ty** | Hraješ svou postavu. Říkáš, co postava dělá, říká a zkouší. |
| **Pán jeskyně** (AI) | Vypráví příběh, hraje všechny ostatní postavy, rozhoduje, co se stane, žádá o hody. |
| **RPG Engine** | Všechno si pamatuje v souborech, hází kostkami, počítá životy, peníze, čas a vzdálenosti a drží tajemství, dokud je neobjevíš. |

AI umí skvěle vyprávět, ale špatně si pamatuje. Samotná by zapomněla, kdo ti dluží peníze, kolik máš šípů nebo že most před dvěma sezeními shořel. RPG Engine to všechno drží, takže svět zůstává stejný z večera na večer, i v novém chatu, i s jinou AI.

### Jaké to je

Píšeš do chatu tak, jako bys mluvil(a) u stolu:

> Pomalu otevřu dveře a nahlédnu dovnitř.

Pán jeskyně odpoví tím, co vidíš, a zastaví se tam, kde je řada na tobě. Když je něco nejisté a důležité, Pán jeskyně řekne, o co jde, a požádá o hod. Tlačítka pro hod se objeví na tvém dashboardu. Klikneš, kostky dopadnou na stránku a Pán jeskyně ti řekne, co se stalo.

### Čím je jiný

- **Svět je trvalý.** Co bylo řečeno, platí. Mrtvý padouch zůstane mrtvý.
- **Kostky jsou skutečné.** Pán jeskyně je nemůže ohnout (kromě nejlehčí obtížnosti, pokud ji zvolíš).
- **Tajemství zůstávají tajná.** Pán jeskyně ti nikdy neprozradí to, co tvoje postava neví, ani když budeš naléhat.
- **Svět se hýbe i beze tebe.** Hrozby postupují, zatímco odpočíváš nebo cestuješ, a ty vidíš jejich stopy.
- **Mnoho večerů, jeden příběh.** Kampaň je složka na tvém počítači. Můžeš přestat, kdy chceš, a pokračovat později.

### Hra, kterou dnes hraje

RPG Engine je určený pro jakoukoli stolní hru na hrdiny. Dnes obsahuje jeden herní systém: **pátou edici** (z volného System Reference Document 5.1). Další hry přijdou; viz [Herní systémy](#5-game-systems-and-house-rules) a [Co přijde později](#9-coming-later).

---

## 2. První kroky <!-- icon: path -->

### 2.1 Co potřebuješ

- Počítač s Windows, macOS nebo Linuxem.
- **Node.js 22** nebo novější. Stáhni ho z [nodejs.org](https://nodejs.org): verze „LTS" stačí. Součástí je `npm`, kterým se RPG Engine instaluje.
- **Terminál**, okno, do kterého píšeš příkazy: ve Windows aplikace Terminál nebo PowerShell, v macOS Terminál. Použiješ ho k instalaci RPG Engine, k vytvoření každé kampaně a ke spuštění Claude Code nebo Codexu.
- **AI hostitele**, aplikaci, ve které Pán jeskyně běží: **Claude Code** nebo **Codex**, s jejich tarifem a přihlášením. Viz [2.4](#24-connect-your-ai).
- **Největší model**, který tvůj hostitel nabízí. Malý model se nechá napálit: v našich testech prozradil tajemství hráči, který tvrdil, že je skutečný Pán jeskyně.
- Webový prohlížeč pro dashboard.

Přihlášení k hostiteli slouží i k dalšímu: RPG Engine ho na tvém počítači používá ke kreslení obrázků míst a k překladu dashboardu do jazyků, které nemá v balíčku. Viz [Obrázky](#311-pictures) a [Jazyky](#72-languages).

**Jak otevřít terminál ve složce.** Mnoho kroků říká „ve složce kampaně". Ve Windows klikni ve Správci souborů na složku pravým tlačítkem a zvol **Otevřít v Terminálu**. V macOS klikni pravým tlačítkem na složku ve Finderu a zvol **Služby > Nový terminál ve složce**. Nebo v už otevřeném terminálu napiš `cd` a cestu ke složce, třeba `cd "C:\Users\me\Games\The Salt Isles"`.

### 2.2 Instalace

Otevři terminál a napiš:

```text
npm install -g rpg-engine
```

Tím získáš příkaz `rpg`. Ověření, že to fungovalo:

```text
rpg --version
```

Příkaz `rpg` použiješ jednou na kampaň, k jejímu vytvoření. Potom už jen mluvíš s Pánem jeskyně: tvůj AI hostitel spouští RPG Engine sám, stejným příkazem `rpg`.

### 2.3 Vytvoření kampaně

Kampaň je složka. Otevři terminál ve složce, kde si uchováváš hry, a napiš:

```text
rpg init "The Salt Isles"
```

Vznikne složka `The Salt Isles` s novou kampaní a řekne ti, co dělat dál:

```text
Created the campaign "The Salt Isles" in C:\Users\me\Games\The Salt Isles.
To play, open Claude Code or Codex in this folder and say hello: the master asks you the rest.

For the master: Still to agree with the player: ...
```

Řádky za *For the master* jsou určené Pánu jeskyně, který je přečte v chatu: s nimi nemáš nic společného. Zapamatuj si, kde složka je: budeš se do ní vracet při každé hře. Bez názvu složky `rpg init` změní složku, ve které jsi, na kampaň.

`init` vytvoří všechno, co kampaň potřebuje: její nastavení, složky světa a malé soubory, které říkají tvému AI hostiteli, aby používal RPG Engine a nechoval si žádnou vlastní paměť mimo kampaň.

Teď nemusíš nic vybírat. Pán jeskyně se na zbytek zeptá v chatu, nebo si to vybereš na dashboardu. Pokud už něco víš, můžeš to zadat rovnou:

```text
rpg init salt-isles --name "The Salt Isles" --language en --system 5e --difficulty normal --lethality dice
```

Vznikne složka `salt-isles` s kampaní *The Salt Isles*: název složky bez mezer a název kampaně, jaký chceš.

| Volba | Co nastavuje | Hodnoty |
|---|---|---|
| `--name` | Název kampaně | libovolný; když chybí, použije se název složky |
| `--language` | Jazyk hry | kód, například `en`, `it`, `fr` |
| `--system` | Herní systém | `5e`, dnes jediný |
| `--difficulty` | Jak těžce hra hraje | `story`, `easy`, `normal`, `hard`, `brutal` |
| `--lethality` | Co znamená pád v boji | `narrative`, `epic`, `dice` |

`rpg init --help` je také vypíše. Kampaň nemůže být uvnitř složky jiné kampaně.

Pána jeskyně nemůžeš požádat, aby kampaň vytvořil: před `init` ve složce nic neříká tvému AI hostiteli, kde RPG Engine najde.

### 2.4 Připojení AI

RPG Engine funguje s **Claude Code** a **Codexem**. Jiné AI aplikace, které používají nástroje MCP, mohou fungovat také, ale nezaručujeme to.

**Instalace hostitele.** Claude Code a Codex běží v terminálu: nejsou to aplikace Claude ani ChatGPT v telefonu. Každý potřebuje vlastní tarif a přihlášení: Claude Code placený tarif Claude, Codex přihlášení do ChatGPT. Pro instalaci a přihlášení se řiď jejich stránkami: [Claude Code](https://code.claude.com/docs/en/setup) a [Codex](https://learn.chatgpt.com/docs/codex/cli). Uděláš to jednou pro všechny kampaně.

**Claude Code.** Otevři terminál ve složce kampaně a napiš `claude`. Poprvé se zeptá, jestli složce věříš, a řekne, že složka povoluje nástroje hry (`mcp__rpg`): zvol **Yes, I trust this folder**. Pozor: předvolená odpověď je *No, exit*, takže když hned stiskneš Enter, Claude Code se zavře. To je vše: kampaň už Claude Code řekla, aby používal RPG Engine a jeho nástroje a aby měl vypnutou paměť.

**Codex.** Otevři terminál ve složce kampaně a napiš `codex`. Když se zeptá, jestli složce věříš, odpověz ano: nastavení kampaně říká Codexu, kde RPG Engine najde, povoluje jeho nástroje a vypíná paměť, a Codex je čte jen ve složce, které důvěřuje. V desktopové aplikaci zkontroluj, že paměti jsou pro chaty hry vypnuté.

**Proč na paměti záleží.** Kampaň žije ve svých souborech. Kdyby si hostitel navíc pamatoval věci po svém, návrat k uložené hře by nebyl skutečný návrat: Pán jeskyně by si stále pamatoval, co bylo vráceno zpět.

### 2.5 První chat

Napiš cokoli, například:

> Ahoj! Pojďme začít.

Pán jeskyně přečte, v jakém stavu hra je, a odpoví. V první odpovědi každého chatu ti dá **odkaz na tvůj dashboard** (něco jako `http://127.0.0.1:4750`). Otevři ho v prohlížeči a nech ho vedle chatu po celou hru. Každá kampaň si drží stejný odkaz z chatu do chatu, pokud ho nezabral jiný program: pak ti Pán jeskyně dá nový.

Mezi zprávami Pána jeskyně ukazuje tvůj hostitel nástroje, které používá, v krátkých řádcích. Jejich podrobnosti neotevírej (v Claude Code ctrl+o): mohou ukázat, co Pán jeskyně píše, včetně tajemství.

Nová kampaň prochází třemi fázemi, jako hra s lidským Pánem jeskyně. Dashboard je ukazuje nahoře jako *1 Nastavení · 2 Nulté sezení · 3 Hra*:

1. **Nastavení**: vybereš si, jak chceš hrát. Mimo příběh.
2. **Nulté sezení**: vytvoříš si postavu, ve hře.
3. **Hra**: příběh.

### 2.6 Nastavení: jak chceš hrát

Pán jeskyně se ptá jen na to, co ještě chybí, po několika otázkách najednou. Když napíšeš „rozhoduj ty", Pán jeskyně vybere sám a řekne ti, co vybral. S otevřeným dashboardem ukazuje první krok, **Nastavení**, stejné otázky jako karty: jednu otázku po druhé, každá hodnota s vysvětlením, obvyklá označená jako **Doporučeno**. Vyber tam a Pán jeskyně se už v chatu ptát nebude; **Přeskočit** nechá otázku na později. Chat řeší to, co zvládnou jen slova: námět nového světa, jazyk a obrázky, na které se Pán jeskyně ptá, jen pokud je tvůj počítač umí vytvořit. Proto se stránka ptá na méně věcí, než vypisuje tabulka níže.

Tabulku nemusíš studovat: je tu na vyhledávání. Každou z těchto hodnot můžeš později změnit, v chatu nebo v **Nastavení** na dashboardu. Změna platí od další odpovědi Pána jeskyně.

| Nastavení | O čem rozhoduje | Hodnoty | Doporučeno |
|---|---|---|---|
| **Mentor** (ptá se „Jak dobře znáš tuto hru?") | Kolik tě Pán jeskyně učí pravidla, mimo příběh | **off** (jen příběh; ptáš se v hranatých závorkách, kdy chceš), **hints** (krátká rada před důležitými volbami a když pravidlo unikne), **tutorial** (každé pravidlo vysvětlené poprvé, celý součet každého hodu, krátké zhodnocení po bojích) | podle tvé odpovědi: nikdy jsem nehrál(a) → tutorial, trochu → hints, znám to → off |
| **Obtížnost** | Jak těžce svět hraje: boje, taktika nepřátel, stopy, poklady, jak rychle postupují hrozby | story, easy, normal, hard, brutal | |
| **Smrtelnost** | Co znamená pád v boji | **narrative** (tvoje postava nikdy nezemře), **epic** (zemře, jen když to příběhu záleží), **dice** (rozhodnou kostky) | podle obtížnosti: story → narrative, easy → epic, normal a výš → dice |
| **Uložené hry** | Kdy se můžeš vrátit | **permadeath** (nikdy; kampaň jen začneš znovu), **checkpoint** (zpět na poslední konec scény, jen když tvoje postava zemře), **free** (zpět na jakoukoli uloženou hru a ukládání kdykoli o to požádáš) | checkpoint |
| **Přísnost** | Jak přesně se dodržují jídlo, světlo, únava, nosnost, složky kouzel a cestování | **smooth** (Pán jeskyně je přejde), **rules** (podle pravidel: pochodně dohoří, zásoby dojdou), **simulation** (nad rámec pravidel: opotřebení, kažení, počasí) | smooth |
| **Kostky** | Kdo hází kostkami tvé postavy | **digital** (hází RPG Engine, na stránce), **physical** (hodíš si sám/sama a řekneš výsledky) | |
| **Jednotky** | Vzdálenosti a váhy v příběhu | metric, imperial | |
| **Společníci** | Kdo s tebou cestuje | none, vytvoření s tebou na nultém sezení, vytvoření Pánem jeskyně, potkání ve hře | |
| **Obrázky** | Obrázky míst a úkolů | none, na požádání, nová místa a úkoly | zeptá se jednou, jen pokud je tvůj počítač umí vytvořit |
| **Hranice** | Co se ve hře nikdy neobjeví | seznam, nebo nic | |
| **Závoje** | Co se může stát, ale jen mimo scénu | seznam, nebo nic | |
| **Jazyk** | Jazyk hry a dashboardu | libovolný | podle toho, jak píšeš, a potvrzený |

Herní systém může přidat vlastní nastavení. Pátá edice přidává **postup**: jak tvoje postava získává úrovně, buď s **zkušenostními body**, nebo v **milnících** příběhu.

**Co obtížnost znamená ve hře.** Story: slabí, naivní nepřátelé, zřejmé stopy, všeho dost; Pán jeskyně může zmírnit své vlastní hody. Easy: jednoduší nepřátelé, štědré zdroje. Normal: rozumní nepřátelé, tři stopy ke každému závěru, běžné ceny a poklady. Hard: chytří nepřátelé, nenápadné stopy, vzácné zdroje, hrozby, které postupují rychle. Brutal: nepřátelé, kteří přepadají, ustupují a dorážejí padlé, velmi vzácné zdroje, nejtvrdší odpočinky. Boje se vždy přizpůsobují tvé družině, jaká je právě teď.

**Bez napsaného světa** se nastavení ptá ještě na dvě věci:

- **Námět**: žánr, tón a několik prvků světa, tvými slovy. Například: *„Low fantasy, ponuré, ale s nadějí. Městečko u řeky, strašidelný brod, kult v kopcích."*
- **Příprava**: **za pochodu** (Pán jeskyně staví každou část světa těsně předtím, než ji potřebuješ; doporučeno) nebo **všechno na začátku**.

Pán jeskyně pak navrhne název kampaně. Když nic nechybí a řekneš, že jsi připraven(a), hra přejde na nulté sezení.

### 2.7 Nulté sezení: tvoje postava

Nulté sezení je hra: postavu vytváříš s Pánem jeskyně tak, jako u stolu.

- **Každá volba je tvoje**, pokud nepožádáš Pána jeskyně, aby ji udělal za tebe. Můžeš přijít s hotovou představou („půlelfská klerička, která opustila svůj chrám"), s mlhavou („někdo, kdo léčí, ale není u toho milý") nebo s ničím („překvap mě, pak mi nech něco změnit").
- **Vlastnosti.** Pán jeskyně ti řekne postup a pojistku, ještě než se hodí jediná kostka. V páté edici: standardní řada, nákup bodů, nebo 4d6 s odhozením nejnižší. Postup, na kterém se domluvíte, zůstane v dohodách stolu.
- **Tvůj příběh** není nikdy povinný. Pokud ho dáš, Pán jeskyně ho sepíše tvými slovy, jednou ti ho přečte zpět a propojí jeho lidi a místa se světem. Můžeš ho také napsat na dashboardu (viz [Družina](#party)).
- **Osobnost** (pátá edice): vlastnost, ideál, pouto a chyba, z tabulek tvého zázemí nebo vlastní.
- **Obrázek.** Až bude postava hotová, Pán jeskyně tě požádá o její obrázek: soubor na tvém počítači. Pokud tvůj AI hostitel umí kreslit obrázky sám, Pán jeskyně může nabídnout, že nějaký vytvoří.

Čísla v deníku postavy počítá RPG Engine z tvých voleb: nikdy nepočítáš ty. Když jsou postavy hotové a ty to potvrdíš, příběh začne.

---

## 3. Hraní <!-- icon: chat -->

### 3.1 Povídání s Pánem jeskyně

Piš, co tvoje postava dělá nebo říká, vlastními slovy. Stačí krátce.

> Ptám se hostinského, kdo další tudy dnes v noci prošel.
>
> „Nechceme žádné potíže," říkám a držím ruku daleko od meče.
>
> Vyšplhám na střechu a čekám.

**Mimo příběh** piš do hranatých závorek:

> [Jak funguje zápas?]
>
> [Mohu v tomto kole ještě použít reakci?]
>
> [Na dnešek tady skončíme.]

Pán jeskyně odpoví také v závorkách a pak se vrátí k příběhu.

**Ty říkáš, o co se pokoušíš; Pán jeskyně říká, co se stane.** Co porušuje logiku světa nebo už stanovená fakta, se nestane: Pán jeskyně ti to řekne uvnitř příběhu a nabídne, co možné je.

**Pán jeskyně nikdy nerozhoduje za tvou postavu.** Nenutí ji mluvit, cítit ani volit. Když si není jistý, zeptá se.

**Pán jeskyně nikdy nemluví o enginu.** Zeptej se ho, jestli si věci eviduje, a odpoví jako Pán jeskyně: „Mám to všechno: příště navážeme tady."

**Pána jeskyně se můžeš zeptat, jak používat dashboard.** Stránku zná: „Kde najdu svá kouzla?", „Jak hodím ručně?"

### 3.2 Hody

**Kdy se hází.** Pán jeskyně žádá o hod, jen když je výsledek nejistý a důležitý. Jinak řekne ano, nebo „ano, ale". Před tvým hodem Pán jeskyně řekne, o co jde a které ověření připadají v úvahu, a zastaví se. Ty hodíš, nebo si to rozmyslíš:

> **Pán jeskyně:** Římsa je úzká a mokrá. Pokud uklouzneš, čeká tě dlouhý pád do řeky. Ověření Obratnosti (Akrobacie), nebo se můžeš vrátit a hledat schody.
>
> **Ty:** Zkusím to.

**Hod na dashboardu.** Když Pán jeskyně požádá, nahoře na stránce se objeví pruh s tlačítkem pro každé ověření, například *Akrobacie +4 · s výhodou*. Klikni na něj: kostky dopadnou na stránku a Pán jeskyně uslyší výsledek. Můžeš také:

- kliknout na odpovídající řádek v deníku postavy, který se rozsvítí zlatě;
- hodit správnými kostkami z podnosu na kostky;
- napsat do pruhu vlastní slova, pokud chceš udělat něco jiného.

**Hod ručně.** Pokud raději vybíráš kostky sám/sama, zapni **Ručně** v rohu pruhu (nebo v **Nastavení**). Tlačítko ověření zmizí a pruh řekne, co hodit, jako by to řekl Pán jeskyně: *Hoď Akrobacii sám/sama, v deníku postavy nebo kostkami.* Klikni na řádek v deníku postavy, který se rozsvítí, nebo hoď správnými kostkami z podnosu na kostky: RPG Engine je hodí, přičte tvůj bonus a Pán jeskyně uslyší výsledek. Ověření, které nezvládne ani deník postavy, ani podnos, například zranění, které opakuje jedničky, si tlačítko ponechá. Ručně zůstane v tomto prohlížeči zapnuto, dokud ho nevypneš.

**Fyzické kostky pro celou hru.** S nastavením **Kostky** na physical Pán jeskyně žádá o hody slovy a ty napíšeš hozená čísla:

> [Hodil(a) jsem 14.]

RPG Engine přičte tvoje opravy a odmítne číslo, které tvoje kostky nemohou ukázat.

**Volné hody.** Klikni na libovolné číslo v deníku postavy nebo otevři podnos na kostky a hoď jen tak pro radost. Volné hody se nikdy nepočítají, nikdy se nezapisují a Pán jeskyně je nikdy nevidí. Volná dvacítka se nikdy později nestane skutečnou.

**Hody Pána jeskyně.** Pán jeskyně hází za nepřátele a ostatní také přes RPG Engine. Většina hodů se ukazuje ve sloupci hodů. Když nesmíš výsledek vidět, Pán jeskyně hází tajně. Vždy se můžeš zeptat:

> [Byl ten hod skutečný?]

U zobrazeného hodu Pán jeskyně uvede čísla a důvod. U tajného otisk, který dokazuje, že hod byl učiněn dřív, než ses zeptal(a).

**Hody v chatu** se objevují v závorkách, hned po okamžiku, o kterém rozhodují: *[Přesvědčování 14 + 3 = 17]*. Pak příběh řekne výsledek.

### 3.3 Scény a boje

Pán jeskyně vede příběh po **scénách**: boj, rozhovor, zkoumání, cestování, odpočinek, výzva (honička, závod, hádanka). Nemusíš je spravovat: takto RPG Engine drží kapitoly příběhu. Na konci každé scény se hra sama uloží a scéna přejde do příběhu v tvé kronice.

**V boji** Pán jeskyně odvypráví všechny tahy, které nejsou tvoje, jeden za druhým, se všemi hody, a **zastaví se tam, kde můžeš rozhodnout**: tvůj tah, reakce, volba. Ve svém tahu řekni, co děláš:

> Sešlu Sacred Flame na toho u dveří.

Sekce **Boj** na dashboardu ukazuje pořadí tahů, kdo je na tahu, životy tvé družiny a jak raněně vypadají nepřátelé (nezranění, zranění, krvácející, poražení: slovy, nikdy čísly). Pokud tvoje postava padne, na stránce se velké objeví záchrany proti smrti.

**Když je boj už rozhodnutý**, Pán jeskyně může nabídnout, že zbytek odvypráví v jedné zprávě.

### 3.4 Čas, cestování a svět, který se hýbe

**Čas.** Každá akce v příběhu zabere čas a RPG Engine vede datum: den 3, časné ráno. Pán jeskyně vypráví čas tak, jak ho měří svět: svítání, třetí zvon, soumrak. Mezi sezeními žádný čas neplyne: navážeš tam, kde jsi skončil(a).

**Odpočinek.** Řekni, že odpočíváš, a Pán jeskyně použije to, co odpočinek vrací, například životy a sloty kouzel:

> Utáboříme se a dlouze si odpočineme.

**Cestování.** Řekni, kam chceš jít:

> Vydáme se cestou na sever do Rocca.

RPG Engine spočítá cestu, vzdálenost a dny podle tvého tempa a přesune tě tam. Cesta se zastaví, když se po cestě stane něco naplánovaného, na konci každého dne cesty a při příchodu. Před odchodem se můžeš zeptat, jak je místo daleko:

> [Jak daleko je Rocca a jak dlouho by to trvalo pěšky?]

**Svět se hýbe i beze tebe.** Padouši mají plány s termíny a hodinami. S každým novým dnem Pán jeskyně posune hrozby, které čas pokročil, a ty vidíš jejich stopy: zvěst, otisk, změnu ve městě. Hodiny samotné nikdy nevidíš, jen to, co po sobě zanechají.

**Peníze** se počítají v mincích hry. Plať, prodávej, dostávej zaplaceno: RPG Engine vrací drobné.

### 3.5 Mapy

**Mapa světa** (dashboard: **Svět**) ukazuje jen místa, která tvoje postava zná, s cestami mezi nimi, stezkou, kterou jsi prošel(a), a mlhou nad vším ostatním. Klikni na místo a uvidíš, co o něm víš a jak je daleko.

**Mapa místa** (dashboard: **Scéna** a **Boj** v boji) se objeví, když Pán jeskyně nakreslí mapu místa, kde jsi: zdi, dveře, terén a kdo kde stojí, jako žetony. V boji jsou ve tvém tahu políčka, na která nedosáhneš, zakryta závojem, takže na první pohled vidíš, kam můžeš jít. Když se Pán jeskyně zeptá, kam se tvoje postava přesune, stránka otevře mapu a ty se dotkneš políčka, nebo ho napíšeš, například *E4*.

### 3.6 Úkoly, kronika a poznámky

**Úkoly.** Když tvoje postava přijme úkol, objeví se jako úkol ve tvé **Kronice**: kdo ho zadal, kde, do kdy, jeho cíle jako seznam a co se měří (termín se zbývajícím časem, hodiny, počet). Označ ho hvězdičkou, abys ho sledoval(a): zůstane malý nahoře ve Scéně, s dalším cílem. Úkol skončí, když ho ukončí příběh, nikdy sám od sebe.

**Příběh.** Karta Příběh v Kronice je tvoje kampaň jako časová osa: každá scéna je kapitola s místem, datem a krátkým shrnutím, poslední první.

**Tvé poznámky.** Na kartě Poznámky v Kronice píšeš vlastní poznámky: teorie, jména, plány. Zůstávají na tvém počítači a Pán jeskyně je nečte, dokud některou nepoužiješ jako **Sdílet**. Sdílená poznámka dorazí k Pánu jeskyně při jeho další odpovědi jako to, co si myslíš, nikdy jako fakt. Tvoje teorie se nestane pravdou tím, že jsi ji napsal(a). Poznámka, která žádá o zastavení nebo vynechání nějakého obsahu, platí, jako bys to řekl(a) u stolu.

### 3.7 Příběh a obrázek tvé postavy

V deníku postavy má karta **Popis** políčko pro příběh tvé postavy. Odešli ho a Pán jeskyně ho zapíše do postavy vlastními slovy, až řekneš ano.

Pro obrázek postavy dej Pánu jeskyně v chatu soubor s obrázkem a uveď, kde je na tvém počítači (PNG, JPEG, WebP nebo SVG, do 5 MB):

> [Tady je portrét mé postavy: C:\Users\me\Pictures\mira.png]

Pán jeskyně ho zkopíruje do kampaně a objeví se na žetonu tvé postavy na dashboardu. Můžeš ho takto změnit, kdykoli chceš. RPG Engine sám kreslí jen místa a úkoly (viz [Obrázky](#311-pictures)).

### 3.8 Uložené hry a návrat

RPG Engine ukládá celou kampaň **na konci každé scény**, samo. Co s těmito uloženými hrami můžeš dělat, závisí na nastavení **Uložené hry**:

| Uložené hry | Uložit, kdy chceš | Vrátit se |
|---|---|---|
| **permadeath** | ne | nikdy; kampaň můžeš jen začít znovu |
| **checkpoint** | ne | na poslední uloženou hru, jen když tvoje postava zemře |
| **free** | ano | na jakoukoli uloženou hru, kdykoli chceš |

V každém režimu můžeš **začít znovu**: od začátku hry se stejnou postavou, nebo od nultého sezení s novou.

To všechno můžeš udělat v chatu („[Vraťme se před souboj.]") nebo v sekci **Uložené hry** na dashboardu.

**Po návratu otevři nový chat.** Chat, ve kterém jsi hrál(a), si pamatuje, co bylo vráceno. Otevři s Pánem jeskyně nový chat (`/clear` v Claude Code, `/new` v Codexu), napiš *pokračuj*, pak v Uložených hrách stiskni **Nový chat otevřen**, nebo to řekni Pánu jeskyně v novém chatu. Nikdy neobnovuj starý chat. Dokud to nepotvrdíš, Pán jeskyně nebude pokračovat.

### 3.9 Sezení: ukončení a návrat

**Sezení ukončíš**, kdy chceš:

> [Na dnešek tady skončíme.]

Žádné „uložit a skončit" neexistuje: všechno už je v souborech.

**Chat zavřeš** příkazem `/exit` v Claude Code, nebo `/quit` v Codexu. Dashboard ztichne až do dalšího chatu.

**Návrat:** otevři terminál ve složce kampaně (té, kterou vypsal `init`), spusť tam svého hostitele a napiš *pokračuj*. Pán jeskyně přečte, v jakém stavu hra je, krátce shrne předchozí děj a začne něčím, co se děje. Nový chat nic neztratí: kampaň žije v souborech, ne v chatu.

Pán jeskyně se na konci neptá na běžné věci. Jen když si všiml, že něco nefungovalo, krátce se zeptá.

### 3.10 Nálada Pána jeskyně

Nahoře na dashboardu sedí avatar Pána jeskyně, malý robot. Jeho tvář sleduje tón příběhu: znepokojený, když roste nebezpečí, nadšený z odvážného nápadu, překvapený zvratem. Na přirozenou 20 nebo přirozenou 1 na chvíli zareaguje. Nikdy neukáže to, co ještě nevíš: žádný úsměv, než past sklapne. Žetony tvé družiny ukazují také své nálady. Když je chat zavřený, robot spí.

### 3.11 Obrázky

RPG Engine může nechat vytvořit obrázek pro každé místo, kam dojdeš, a každý úkol, který přijmeš, podle nastavení **Obrázky**. Používá to, co už je na tvém počítači:

- **Codex**, s přihlášením do ChatGPT: malovaný obrázek.
- Jinak **Claude Code**, s přihlášením do Claude: kresba.

Obrázek využívá tvůj vlastní tarif, ne náš. Sekce **Nastavení** ti řekne, jestli se na tvém počítači dají obrázky vytvářet, a pokud ne, jaké kroky to nastaví. Bez obrázků stránka místo nich ukazuje značku každého druhu místa. Pánu jeskyně můžeš také dát vlastní obrázek k libovolnému místu nebo postavě.

### 3.12 Bezpečí: hranice, závoje a stop

- **Hranice**: co se ve hře nikdy neobjeví.
- **Závoje**: co se může stát, ale jen mimo scénu.
- **Stop**: kdykoli můžeš zastavit nějaký obsah, bez vysvětlování. Napiš to mimo příběh:

> [stop]

Pán jeskyně to okamžitě opustí a přidá to k tvým hranicím, pro všechna další sezení. Své hranice a závoje můžeš vidět a měnit v **Nastavení**.

### 3.13 Změna názoru

Každé nastavení se může během kampaně změnit: v chatu („[Ať je to těžší.]") nebo v **Nastavení**. Pán jeskyně se o změně dozví při další odpovědi. Rozhodnutí, které Pán jeskyně udělal bez pravidel, se stane **precedentem** a uchová se, takže stejná otázka dostane příště stejnou odpověď.

---

## 4. Dashboard, sekci po sekci <!-- icon: party -->

Dashboard je stránka na tvém vlastním počítači. Odkaz na ni ti Pán jeskyně dává na začátku každého chatu. Sleduje hru živě: když Pán jeskyně něco změní, změní se i stránka.

Otevřít ji může jen prohlížeč počítače, na kterém hraješ: ne telefon ani tablet, ani na stejné Wi-Fi. Stránka se vejde i do úzkého okna: sekce se pak přesunou do lišty dole a ikony do nabídky.

Stránka žije, dokud žije chat. Zavři chat a ponechaná otevřená stránka ukáže *Not connected* s deníkem postavy, jaký byl, a robot Pána jeskyně usne; otevři v kampani znovu chat a jakmile Pán jeskyně odpoví, stránka se vrátí sama.

### Nahoře

- **Avatar Pána jeskyně** s jeho náladou.
- Název kampaně, herní systém, **herní čas** a zda je hra **připojeno** (chat připojen).
- Sekce: **Družina**, **Scéna**, **Boj** (jen během boje), **Kronika**, **Svět**; na konci řady jako ikony: **Uložené hry**, **Nápověda**, **Nastavení**, **O aplikaci**.
- Světlé a tmavé téma, v pravém horním rohu.

Když se tě Pán jeskyně na něco zeptá, jeho pruh zůstává nahoře na stránce, ať jsi v jakékoli sekci.

### Družina

Deník tvé postavy a deníky tvých společníků. Každá část deníku postavy je karta, kterou můžeš otevřít a zavřít.

- **Klikni na číslo**, abys ho hodil(a) jen tak. Najeď na číslo a uvidíš, jak vzniklo („+5: Moudrost +3, zdatnost +2").
- **Životy, sloty a použití** se zobrazují jako lišty a puntíky.
- **Stavy a účinky** se zobrazují s tím, jak dlouho trvají.
- **Popis** obsahuje text tvé postavy a políčko pro odeslání jejího příběhu Pánu jeskyně.
- Při 0 životech se pod jménem velké objeví **záchrany proti smrti**.
- Vedle deníku postavy (pod ním na úzké obrazovce): **hody**, nejnovější první, tvoje a hody Pána jeskyně, které smíš vidět. **Odebrat** seznam vyprázdní; **Restore** ho vrátí. Volné hody se zobrazují čárkovaně a ztlumeně.

Společník s kartou příšery, například vlk, ukazuje místo celého deníku postavy svou kartu příšery.

### Scéna

Kde je tvoje družina: obrázek a název místa, místa kolem, mapa místa, pokud ji má, kdo tam je, a otevřená scéna s tím, co se děje právě teď. Úkol, který sleduješ, je nahoře.

### Boj

Jen během boje. Nahoře: kolo, kdo jedná, kdo je další. Pod tím: pořadí tahů, každý bojovník se svým stavem, tvoje družina v číslech a nepřátelé slovy; co má tvoje postava po ruce (Classe Armatura, životy, útoky); mapa místa, s tím, kdo jedná, zakroužkovaným. Ve tvém tahu odkaz na Boj pulzuje zlatě, ať jsi kdekoli.

### Kronika

Tři karty:

- **Úkoly**: aktivní, splněné a neúspěšné, každý jako karta s cíli, termínem jako časovačem a hodinami. Hvězdička úkol sleduje.
- **Příběh**: kapitoly kampaně, scénu po scéně, poslední první.
- **Poznámky**: tvé vlastní poznámky, soukromé, dokud některou nesdílíš.

### Svět

Mapa světa, jak ji tvoje postava zná, s mlhou nad zbytkem. Tažením posouváš, kolečkem nebo štípnutím přibližuješ. Klikni na místo pro jeho kartu. Vedle je seznam míst, nejbližší první. Při více než jedné mapě (město, kontinent, jiná rovina) mezi nimi přepínají karty.

### Podnos na kostky

Tlačítko kostek otevře podnos: vyber kostky a opravu a hoď. Při dvou nebo více kostkách jednoho druhu vyber, které se počítají: **Všechny**, **Nejvyšší** (jen nejvyšší) nebo **Nejnižší** (jen nejnižší). Vybrané kostky zůstanou, dokud nestiskneš **Odebrat**, takže stejný hod zranění je každé kolo jedno kliknutí. Dokud Pán jeskyně žádá o hod, podnos ti ukazuje, které kostky odpovídají.

### Uložené hry

Tvoje uložené hry, nejnovější první, každá s místem, herním datem a časem vytvoření. **Uložit teď** (při volném ukládání), **Vrátit se sem** a **Začít znovu**, červeně, ve dvou krocích. Viz [Uložené hry a návrat](#38-saves-and-going-back).

### Nastavení

Tvoje nastavení, ve skupinách: hra, učení hry (mentor a pravidla, která ti už byla vysvětlena), kostky a míry, meze (hranice a závoje), obrázky, jazyk. Klikni na hodnotu, abys ji vybral(a); pod ní je, co znamená. Pak vlastní předvolby stránky, uložené jen v tomto prohlížeči: téma, zvuk kostek, **sada kostek** (pryskyřice, kov, dřevo, kámen), zaoblené nebo ostré hrany, hod ručně.

Vlastní nastavení Pána jeskyně, jako domácí pravidla a precedenty, tu nejsou: zůstávají v chatu.

### Nápověda a O aplikaci

**Nápověda**: tento průvodce. **O aplikaci**: co je RPG Engine, jeho odkazy, licence a poděkování herního systému.

### Před hrou: Nastavení a nulté sezení

Dokud je nová kampaň v prvním kroku, **Nastavení**, celá stránka klade své otázky: jednu po druhé, každou s tím, co její hodnoty znamenají, a s doporučenou. **Rozhoduješ ty** nechá otázku na Pánu jeskyně, kromě hranic a závojů, které jsou vždy tvoje; **Přeskočit** ji nechá na později. Nakonec **Můžeme začít**.

### Zprávy ze stránky

Někdy stránka zobrazí oznámení přes sebe: problém v souborech kampaně (Pán jeskyně ho opraví), hra je pryč (chat je zavřený), stránka se překládá.

---

## 5. Herní systémy a domácí pravidla <!-- icon: dice -->

### 5.1 Co je herní systém

Herní systém jsou data jedné hry: její deník postavy, čísla, tvorové, předměty, kouzla a text pravidel. Každá kampaň hraje jeden systém.

RPG Engine počítá deník tvé postavy a to, co se utrácí a vrací, například životy a sloty kouzel, jako digitální deník postavy. Jak funguje schopnost nebo kouzlo, přečte Pán jeskyně v pravidlech a rozhodne, jako u stolu.

### 5.2 Pátá edice, v balíčku

RPG Engine obsahuje **5e**, ze System Reference Document 5.1 (pravidla z roku 2014, zdarma pod Creative Commons). Obsahuje:

- rasy, povolání, podpovolání, jedno zázemí a jednu výhodu ze SRD;
- 319 kouzel, zbraně, zbroje a vybavení, kouzelné předměty a příšery ze SRD;
- kapitoly pravidel, které Pán jeskyně vyhledává podle jejich přesného znění;
- celý deník postavy, vypočítaný: opravy vlastností, záchrany, dovednosti, Classe Armatura, útoky, obtížnost záchrany proti kouzlům, sloty, kostky životů, schopnosti podle úrovně, zkušenosti a postup na vyšší úroveň;
- odpočinky, které vracejí, co mají; stavy s textem pravidla; připomínky soustředění.

**Obsah nad rámec SRD.** Pátou edici můžeš hrát s obsahem, který SRD nemá, například s povoláním nebo příšerou z knihy, kterou vlastníš. Pán jeskyně hru zná, umí číst tvé příručky a umí hledat na webu. Co potřebuje, zapíše jako stránky tvé kampaně a RPG Engine s nimi pracuje stejně. To, co dodáváme, omezuje licence; to, co ví tvůj Pán jeskyně, ne.

RPG Engine je kompatibilní s pátou edicí.

### 5.3 Domácí pravidla a vlastní doplňky

Nemusíš sahat na žádný soubor. Požádej Pána jeskyně:

> [Domácí pravidlo: přirozená 1 při útoku znamená, že upustíš zbraň.]
>
> [Chtěl(a) bych hrát Blood Huntera. Mám knihu: tady jsou schopnosti povolání.]
>
> [V této kampani trvá krátký odpočinek 10 minut.]

Pán jeskyně je zapíše do tvé kampaně jedním z těchto způsobů:

- **Dohoda stolu**, slovy, například upuštěná zbraň nebo krátký odpočinek výše. Pán jeskyně ji uchová s nastavením kampaně a od té chvíle podle ní hraje. Rozhodnutí, které Pán jeskyně udělá bez pravidel, se uchová stejně, jako **precedent**.
- **Nová stránka**, například povolání, rasa nebo předmět. Nové povolání funguje jako povolání systému: počítá ho tvoje úroveň, kostky životů a schopnosti. Nová rasa může stavět na existující („jako Elf, plus…"); pojmenovaný meč může stavět na Dlouhém meči.
- **Nová čísla pro deník postavy**: pole, tabulka, vzorec, počítadlo, které odpočinek vrací. Například kostky převahy Battle Mastera, které se vracejí po krátkém odpočinku. Domácí pravidlo může také nahradit jeden ze vzorců systému.

Pokud už máš domácí pravidla sepsaná, můžeš je dát také jako textové soubory do složky `rules` v kampani (viz [složka kampaně](#8-for-the-curious-the-campaign-folder)): Pán jeskyně je přečte před pravidlem knihy stejného jména.

### 5.4 Přidání nebo import vlastního herního systému

Dnes RPG Engine hraje jen pátou edici. Další herní systémy přijdou a přijde i způsob, jak přidat vlastní nebo jak z příruček hry, kterou vlastníš, udělat systém. Viz [Co přijde později](#9-coming-later).

---

## 6. Rozšíření <!-- icon: plus -->

**Rozšíření zatím nejsou k dispozici.** Rozšíření přidá do kampaně něco navíc k jejímu herního systému: svět, dobrodružství, funkci jako počasí nebo tarotový balíček, domácí pravidla ke sdílení. Pro každou kampaň si vybereš, která použije. První plánovaná pro pátou edici jsou počasí a páčení zámků.

---

## 7. Odkud kampaň pochází a její jazyk <!-- icon: world -->

### 7.1 Tři způsoby, jak mít svět

**Vytvářený za pochodu.** V nastavení dáš námět a Pán jeskyně staví svět, jak hra postupuje: každé místo, osobu a zápletku těsně předtím, než je potřebuješ, a od té chvíle se uchovají. Je to nejrychlejší způsob hraní: nainstaluješ, vytvoříš a za pár minut vytváříš postavu. Nic vymyšleného se neztratí: co bylo jednou řečeno, je zapsáno a platí.

**Připravený na začátku.** Stejný námět, ale s **přípravou: všechno na začátku** Pán jeskyně postaví místa, frakce, hrozby a jejich plány světa, než hra začne. První sezení začne později, s více připraveným v pozadí.

**Z existující kampaně nebo dobrodružství.** Dnes tlačítko pro import neexistuje. Dej Pánu jeskyně své dobrodružství (text nebo PDF, které tvůj hostitel přečte) a požádej ho, aby ho připravil:

> [Mám toto dobrodružství jako PDF. Připrav z něj naši kampaň: přečti ho a zapiš jeho místa, postavy a tajemství. Nic z toho, co v něm je, mi neříkej.]

Pán jeskyně ho přečte nástroji tvého AI hostitele a zapíše ho jako stránky kampaně, včetně tajemství, která objevíš ve hře. Claude Code čte PDF; s Codexem je bezpečnější textový soubor nebo markdown. Udělej to během nastavení, před nultým sezením.

Zatímco Pán jeskyně pracuje, neotevírej podrobnosti toho, co čte nebo píše (v Claude Code ctrl+o): ukazují text dobrodružství, i s tajemstvími. Pán jeskyně sám tajemství drží, jako vždy.

Jakmile má kampaň vlastní stránky, nastavení se přestane ptát na námět a přípravu. I v napsané kampani, když jdeš někam, co text nepokrývá, Pán jeskyně vytvoří, co je potřeba, a zapíše to.

**Kampaň se hraje jednou.** Chceš-li hrát stejné dobrodružství znovu, vytvoř novou kampaň. V rámci kampaně se můžeš stále vrátit k uložené hře nebo začít znovu, jak to nastavení uložených her dovoluje.

### 7.2 Jazyky

**Jeden jazyk na kampaň**: jazyk Pána jeskyně. Pán jeskyně v něm píše a dashboard ho následuje. Pán jeskyně ho vezme z toho, jak píšeš, a potvrdí ho.

**Dashboard** je v balíčku v angličtině a italštině (ručně připravené) a v dalších 24 jazycích: francouzština, němčina, španělština, portugalština (brazilská), nizozemština, švédština, norština, dánština, finština, islandština, ruština, ukrajinština, polština, čeština, rumunština, maďarština, řečtina, turečtina, arabština, hebrejština, hindština, čínština, japonština, korejština. Arabština a hebrejština se čtou zprava doleva: stránka se zrcadlí, mapy a kostky zůstávají tak, jak jsou nakresleny.

**Jakýkoli jiný jazyk**, který vybereš v Nastavení, se překládá na tvém počítači, v pozadí, Codexem nebo Claude Code s tvým vlastním přihlášením, počínaje sekcí, kterou máš otevřenou. Dělá se to jednou pro jazyk, pro všechny tvé kampaně. Dokud není hotovo, je stránka v angličtině. Nastavení ti řekne, jestli překlad probíhá, je hotový, nebo na tvém počítači není možný.

**Slova hry.** Pátá edice přináší vlastní termíny v italštině z oficiálního italského SRD, takže italští hráči čtou *Classe Armatura*, *tiro salvezza*, *vantaggio*. Ostatní jazyky dostanou termíny systému přeložené.

**Vlastní text herního systému** (kouzla, příšery, kapitoly pravidel) zůstává v angličtině. Pán jeskyně ho čte a říká ti ho ve tvém jazyce.

**Změna jazyka uprostřed kampaně** nechá už napsané stránky tak, jak jsou; Pán jeskyně píše nové v novém jazyce.

---

## 8. Pro zvědavé: složka kampaně <!-- icon: list -->

Nikdy ji nemusíš otevírat. Pokud ano, věz, že **obsahuje tajemství** tvé kampaně: když ji čteš, kazíš si hru.

Složka kampaně obsahuje:

- `campaign.yaml`: tvoje nastavení;
- `state.yaml`: v jakém stavu hra právě je: její fáze, datum, otevřená scéna;
- `world/`: jedna stránka na postavu, místo, frakci, úkol, předmět, událost, téma nebo tvora, jako soubory markdown;
- `rules/`: tvoje domácí pravidla jako textové soubory, pokud nějaká přidáš (`init` ji nevytváří);
- `images/`: obrázky, až nějaké budou;
- `log.jsonl`: každá změna, popořadě;
- `.saves/`: uložené hry, od první;
- `.player/`: tvoje vlastní poznámky z Kroniky, které Pán jeskyně nečte;
- `sessions/`: spravuje RPG Engine;
- `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.claude/`, `.codex/`, `.gemini/`: malé soubory, které říkají AI hostitelům, kde RPG Engine najdou, a vypínají jejich paměť. RPG Engine je udržuje aktuální; nech je být.

Stránky jsou prostý markdown s odkazy jako `[[Rocca]]`, ve formátu Obsidianu: zápisník Pána jeskyně lze otevřít tam. **Pokud stránku změníš ručně**, Pán jeskyně se při další odpovědi dozví, co se změnilo.

**Příkazový řádek.** Všechno, co Pán jeskyně dělá, prochází příkazy, které můžeš spustit i ty, ve složce kampaně. Ke hraní je nikdy nepotřebuješ a mnohé vypisují tajemství kampaně, jako `rpg status` a `rpg show`. `rpg --help` je vypíše všechny a `rpg roll --help` vysvětlí jeden. Příkaz, který něco změní, zatímco je chat otevřený, je v pořádku: Pán jeskyně se o něm dozví při další odpovědi, jako o ručně změněné stránce.

---

## 9. Co přijde později <!-- icon: hourglass -->

Co je plánováno, ale ještě tu není:

- **Ty jako Pán jeskyně**: ty vedeš hru a AI hraje družinu.
- **Více lidí u stolu**, každý se svou rolí.
- **Rozšíření**: nastavení, dobrodružství, funkce a domácí pravidla, vybíraná pro každou kampaň.
- **Import** tvých příruček a dobrodružství.
- **Další hry**: více herních systémů a tvé vlastní.
- **Autorský režim**: vytvoř kampaň nebo dobrodružství s AI a sdílej ho, aby ho mohli hrát ostatní.

---

## 10. Otázky a problémy <!-- icon: info -->

### Otázky

**Musím znát pravidla?** Ne. Zvol mentora tutorial a Pán jeskyně tě bude učit průběžně, pravidlo po pravidle. Vždy se můžeš zeptat v hranatých závorkách.

**Může Pán jeskyně podvádět?** Nemůže změnit hod, který udělal RPG Engine, kromě obtížnosti story, a nikdy nemění už stanovená fakta. Můžeš se zeptat, jestli byl nějaký hod skutečný.

**Mohu podvádět já?** Můžeš to zkusit. Pán jeskyně nebere tvé slovo jako fakt: řádek ve tvé zprávě, který vypadá jako herní zpráva, jsou stále jen tvoje slova, a Pán jeskyně nikdy nepotvrzuje tvé dohady o tajemstvích.

**Stojí to něco?** RPG Engine je zdarma. Pán jeskyně běží na tvém vlastním tarifu Claude nebo ChatGPT a večer hraní je dlouhý chat: u nejmenších tarifů můžeš narazit na limit tarifu dřív, než večer skončí. Obrázky a překlady používají stejný tarif.

**Mohu hrát na telefonu?** Ne. Pán jeskyně běží na tvém počítači a dashboard se otevře jen v prohlížeči toho počítače.

**Mohu hrát s přáteli?** Zatím ne: dnes jeden hráč, jedna postava a společníci. Více lidí u stolu přijde s rolemi.

**Mohu příště použít jinou AI?** Ano. Kampaň žije ve svých souborech: otevři ji v jiném hostiteli a napiš *pokračuj*.

**Co když zavřu prohlížeč?** Nic se neztratí. Znovu otevři odkaz, dokud je chat otevřený; stránka se vrátí tam, kde hra je.

**Mohu hrát obsah D&D, který vlastním?** Ano. Pán jeskyně může použít tvé knihy, své vlastní znalosti a web. To, co RPG Engine dodává, je omezeno na volný obsah; co používá tvoje hra, je na tobě.

### Problémy

**Dashboard se neotevře.** Požádej Pána jeskyně o odkaz: `[Jaký je odkaz na dashboard?]`. Stránka funguje, jen když je v té kampani otevřený chat s Pánem jeskyně, a až po první odpovědi Pána jeskyně v tom chatu. Se zavřeným chatem se prohlížeč ke stránce nedostane; ponechaná otevřená stránka říká *Not connected*.

**Pán jeskyně jako by hru neznal nebo vymýšlí nástroje.** Tvůj AI hostitel nenačetl RPG Engine.

- Nejdřív zkontroluj, že jsi hostitele spustil **ve složce kampaně** a že jsi řekl(a), že jí důvěřuješ.
- **Claude Code**: napiš `/mcp`. Pokud je tam `rpg`, ale selhal, vyber ho a pak **Reconnect**. Pokud chybí, zavři Claude Code, ve složce kampaně napiš `claude mcp reset-project-choices` a spusť ho znovu.
- **Codex**: napiš `codex mcp list` v terminálu, ve složce kampaně. Pokud `rpg` chybí, Codex složce nevěří: spusť ho tam znovu a řekni ano, když se zeptá.
- V obou případech: pokud `rpg --version` v terminálu říká, že příkaz nebyl nalezen, nainstaluj RPG Engine znovu ([2.2](#22-install)) a otevři nový terminál.

**Po aktualizaci se nic nezměnilo.** Běžící Pán jeskyně drží verzi, se kterou začal. Otevři nový chat, nebo v Claude Code znovu připoj server (`/mcp`, pak `rpg`, pak **Reconnect**).

**Pán jeskyně si pamatuje něco, co jsem vrátil(a) zpět.** Vrátil(a) ses k uložené hře, ale hrál(a) jsi dál ve stejném chatu. Otevři nový chat a v Uložených hrách stiskni **Nový chat otevřen**.

**Pán jeskyně se ptá na otázky nastavení, na které jsem už odpověděl(a) na stránce.** Řekni mu: `[Tohle jsem vybral(a) na dashboardu.]`

**Neobjevují se žádné obrázky.** Otevři Nastavení > Obrázky: řekne, jestli je tento počítač umí vytvořit, a pokud ne, jaké jsou kroky, každý příkaz s tlačítkem pro zkopírování.

**Stránka je v angličtině, ale vybral(a) jsem jiný jazyk.** Překládá se v pozadí; Nastavení říká, jak to jde. Bez Codexu nebo Claude Code na tomto počítači zůstane v angličtině.

**Pán jeskyně říká, že kampaň má problémy.** Opraví je sám. Pokud jsi upravoval(a) soubory ručně, může se zeptat, co jsi myslel(a).

**Windows: `npm` ve mé složce selhává.** Neukládej kampaň ani RPG Engine do cesty, která obsahuje `&`.

**Instalace selže nebo se `rpg` nespustí.** Zkontroluj verzi Node.js příkazem `node --version`: musí být 22 nebo novější. Pokud je starší, nainstaluj verzi LTS z [nodejs.org](https://nodejs.org) a pak RPG Engine nainstaluj znovu.

**Odkaz na dashboard se změnil.** Obvyklou adresu kampaně používal jiný program, nebo ji Windows rezervovaly. RPG Engine vzal jinou; Pán jeskyně ti dá nový odkaz. Nic jiného se nemění.
