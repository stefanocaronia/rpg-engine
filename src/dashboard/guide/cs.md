<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,920451e3,be38a186 f2f35057,6ca38325 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,9d44b238,99406ef2,e6bcc348,f79c5b1e,272bd137,b5544596,591cdcfe,9a7d5853,07c079ea,2c297004,869e4581,0d938812,10dc1056,8158c275,0185620d,06d7d789,b4c2c7b3,725e11c3,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,9228c033,8e1adcaa,11800870,a75dc1e4,9886fddc,780281aa,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e8a839a5,14954012,25f9bdf8,bd8adb1c,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,c64bfe05,ab627403,86179abe,21ba08ef,f8d6b2fd,3f5bbaaf,3bbb14f4,15e9f48c,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,5a2d9db1,ba8c72d7,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,b78e7609,b8e71497,32482cb4,d90a5d53,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,ab3874f2,e0f88bdb,1e0ccfed,bb5be5d8,5070d986,2dbad46d,a7d9232d,b21a6994,22436b3a,5db3836c,12a20643,cc12de47,d58492a7,590b2eb2,df64a3bb,e065c96f. Change the English, then run it again. -->
# RPG Engine: kompletní průvodce

**RPG Engine** ti umožní hrát stolní hru na hrdiny s **AI jako Pánem jeskyně**. Hraješ v **Přehledu**, v okně na počítači s deníkem postavy, kostkami, mapami, kronikou a **chatem** s Pánem jeskyně. RPG Engine pracuje v pozadí: **pamatuje si svět**, **hází kostkami** a **vede účty**.

Tento průvodce je pro hráče: programovat umět nemusíš.

## Rychlý start <!-- icon: send -->

1. Nainstaluj **Node.js** z [nodejs.org](https://nodejs.org) (verze LTS).
2. Jednou, v novém terminálu otevřeném až po instalaci Node.js, nainstaluj RPG Engine: `npm install -g rpg-engine`. Pokud Windows odpoví, že spouštění skriptů je zakázané, napiš jednou `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, odpověz ano a zkus to znovu.
3. Napiš `rpg open`. Zeptá se, jestli má dát ikonu RPG Engine na plochu a do nabídky: stiskni Enter pro ano. Od té chvíle RPG Engine spouštíš z jeho ikony, bez terminálu ([2.2](#22-install)).
4. Okno ukáže tvoje kampaně. Stiskni **Nová kampaň**, zadej jméno a stiskni **Vytvořit** ([2.3](#23-create-a-campaign)): její Přehled se otevře ve vlastním okně.
5. V chatu s Pánem jeskyně vyber svou AI aplikaci a její model: Claude Code potřebuje placený tarif Claude, Codex účet ChatGPT, bezplatný nebo placený ([2.4](#24-connect-your-ai)). Pokud aplikace chybí nebo chybí přihlášení, stránka ji nainstaluje, případně tě přihlásí. Stiskni **Otevřít chat**, pak **Začít**. První odpověď může trvat i pár minut. Pak se Pán jeskyně zeptá, jak chceš hrát, a postavu vytvoříte společně.

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
- **Node.js 24** nebo novější, z [nodejs.org](https://nodejs.org). Přináší `npm`, kterým se instaluje RPG Engine.
- **Terminál**, jednou, kvůli instalaci RPG Engine: ve Windows Terminál nebo PowerShell, v macOS Terminál. Terminál ve složce otevřeš tak, že na složku klikneš pravým tlačítkem a zvolíš **Otevřít v Terminálu** (Windows) nebo **Služby > Nový terminál ve složce** (macOS). Pokud Windows odpoví, že spouštění skriptů je zakázané, napiš jednou `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` a odpověz ano.
- **AI aplikace** pro Pána jeskyně, s tvým vlastním účtem ([2.4](#24-connect-your-ai)): stránka ti ji umí nainstalovat. Hraj s **největším modelem**, který nabízí: malý model se dá snáze přemluvit k prozrazení tajemství nebo k ohnutí pravidel.

### 2.2 Instalace

```text
npm install -g rpg-engine
rpg open
```

První řádek nainstaluje RPG Engine; `rpg --version` ověří, že se to povedlo. Pokud ti npm nabídne, že se aktualizuje, můžeš to ignorovat.

`rpg open` otevře okno RPG Engine s tvými kampaněmi. Poprvé se v terminálu zeptá, jestli má přidat jeho ikonu na plochu a do nabídky Start (na Macu do složky Aplikace): stiskni Enter pro ano. Od té chvíle na ikonu dvakrát klikneš a terminál už nepotřebuješ. Bez ikony piš `rpg open` při každé hře; `rpg icon` přidá ikonu později a `rpg icon --remove` ji odebere.

### 2.3 Vytvoření kampaně

Okno RPG Engine ukazuje tvoje kampaně jako karty, naposledy otevřená je první. Stiskni **Nová kampaň** a zadej její **Jméno**, **Jazyk** a **Herní systém**: zbytek s tebou vytvoří Pán jeskyně. Kampaň se uloží do složky se stejným názvem uvnitř složky `RPG Engine` ve tvé uživatelské složce (ve Windows `C:\Users\<name>`); **Vybrat jinou složku…** ji uloží do prázdné složky, kterou vybereš. V části **Pán jeskyně** už můžeš zvolit AI aplikaci a model pro její první chat ([2.4](#24-connect-your-ai)). Stiskni **Vytvořit**: Přehled kampaně se otevře ve vlastním okně.

Příště kampaň otevřeš kliknutím na její kartu; ta, která je otevřená, má nápis **Právě otevřená**. **Otevřít složku…** přidá kampaň, kterou už na tomto počítači máš. Malý křížek na kartě ji odebere ze seznamu: soubory zůstanou, kde jsou.

### 2.4 Připojení AI

Pán jeskyně běží v **AI aplikaci** na tvém počítači, s tvým vlastním účtem: Claude Code, Codex, OpenCode nebo Antigravity. Obyčejný chat jako claude.ai nebo ChatGPT, případně aplikace v telefonu, nestačí: Pán jeskyně se musí dostat k souborům kampaně v tvém počítači. Každá aplikace potřebuje vlastní účet: Claude Code placený tarif Claude (Pro nebo vyšší); Codex účet ChatGPT, bezplatný nebo placený; Antigravity účet Google, jehož bezplatné používání má týdenní limity; OpenCode má na omezenou dobu některé modely zdarma, nebo použije modely tvého vlastního poskytovatele, včetně lokálních.

V chatu v Přehledu vyber aplikaci v části **Tvoje AI aplikace**, pak její **Model** a **Úvahy Pána jeskyně**: stránka je navrhne. Více úvah je pomalejší a spotřebuje víc tvého tarifu. Aplikace, která není připravená, řekne, co potřebuje, a nabídne tlačítko, které to udělá:

- **Claude Code** a **Codex**: **Nainstalovat Claude Code** nebo **Nainstalovat Codex** ji stáhne do složky RPG Engine na tomto počítači; **Přihlásit se do Claude Code** nebo **Přihlásit se do Codex** otevře její přihlašovací stránku ve tvém prohlížeči. RPG Engine nikdy nevidí tvoje heslo.
- **OpenCode** a **Antigravity**: **Získat OpenCode** nebo **Získat Antigravity** otevře její web, kde ji nainstaluješ. OpenCode se hraje bez přihlášení; Antigravity se přihlašuje ve své vlastní aplikaci. Pak se vrať a stiskni **Zkontrolovat znovu**.

Antigravity je označený **ve zkušební verzi**: může vystoupit ze hry a ptát se po svém, takže ke hraní jsou lepší Claude Code, Codex nebo OpenCode. Antigravity uchovává tvoje dřívější chaty a jeho paměť nejde vypnout: Pán jeskyně má pokyn, aby je nikdy nečetl. Co napíšeš, jde do Googlu, kde to mohou číst lidé: nevkládej do hry osobní údaje. RPG Engine není produkt Googlu. RPG Engine nejvíc hrajeme a testujeme s **Claude Code**: s ostatními zatím nebyla odehrána celá kampaň.

V chatu v Přehledu se Pán jeskyně dotýká tvého počítače jen přes RPG Engine: žádný z tvých souborů sám neotevírá. RPG Engine čte mimo kampaň jen to, co zvolíš, až v okně svého počítače potvrdíš.

Můžeš hrát i ve vlastním chatu své AI aplikace, v terminálu nebo v její desktopové aplikaci ([2.8](#28-the-other-way-your-ai-apps-own-chat)).

### 2.5 První chat

Když máš zvolenou aplikaci a model, stiskni **Otevřít chat**: aplikace se spustí, což může trvat několik sekund. Pak stiskni **Začít**, nebo napiš cokoli, třeba *Ahoj! Pojďme začít.* První odpověď může trvat i několik minut, než Pán jeskyně připraví scénu.

Chat má vlastní sekci **Hraní rolí**, nebo stojí vedle stránky: malá tlačítka nahoře ho umístí **Na vlastní kartě**, **Vlevo** nebo **Vpravo** a tažením za okraj ho zvětšíš.

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
| **Tvoje postava** | Jak se tvoje postava vytváří v nultém sezení | s Pánem jeskyně, Pánem jeskyně, vlastní ([2.7](#27-session-zero-your-character)) |
| **Společníci** | Kdo s tebou cestuje | nikdo, vytvoření s tebou, vytvoření Pánem jeskyně, potkání ve hře |
| **Obrázky** | Obrázky míst, úkolů a postav, které potkáš | žádné, na požádání, nová místa, úkoly a postavy, které potkáš ([3.11](#311-pictures)) |
| **Hranice** a **Závoje** | Co se nikdy neobjeví a co se děje jen mimo scénu | seznamy |
| **Jazyk** | Jazyk hry a dashboardu | libovolný |

Pátá edice přidává **postup**: zkušenostní body nebo milníky.

Pokud nemáš napsaný svět, Pán jeskyně se zeptá také na **námět** (žánr, tón, několik prvků a to, co tě ve hře baví nejvíc, třeba boje, záhady, rozhovory nebo objevování, tvými slovy), na **přípravu**: vytvářet svět za pochodu, jak hra postupuje, nebo celý na začátku, a na **délku**: jeden večer, několik sezení (tři až pět večerů), nebo otevřená, jedno dobrodružství za druhým. Po skončení příběhu s danou délkou můžeš vždy pokračovat dál.

Na **Styl Pána jeskyně** se Pán jeskyně nikdy neptá, ale můžeš ho změnit v chatu nebo v **Nastavení**: **Próza** (prostá, literární, pulp, ironická), **Příběhy**, které vymýšlí (situace, oblouky, epizody, záhada), autor, **Psát jako**, nebo cokoli jiného **Tvými slovy**.

### 2.7 Nulté sezení: tvoje postava

Postavu vytváříš s Pánem jeskyně, jako u stolu. Každá volba je tvoje, pokud Pána jeskyně nepožádáš, aby ji udělal on: přijď s hotovou představou, s mlhavou, nebo s ničím. Anebo Pána jeskyně požádej, ať postavu vytvoří celou z pár slov. Ve hře s úrovněmi se Pán jeskyně zeptá, od které úrovně začínáš: od první, pokud nechceš jinou. Pán jeskyně ti řekne, jak se tvoří hodnoty vlastností, ještě než se hodí první kostkou. Příběh postavy není nikdy povinný. Pokud nějaký dáš, Pán jeskyně ho napíše tvými slovy. Potom Pán jeskyně požádá o obrázek tvé postavy ([3.7](#37-your-characters-story-and-picture)). RPG Engine spočítá deník postavy: žádné výpočty nikdy nedělᬠsám.

Máš už postavu z jiné hry nebo z jiné kampaně? Zvol při přípravě **Už ho mám** a předej postavu Pánu jeskyně: vlož deník postavy do chatu. Ve vlastním chatu své AI aplikace můžeš také říct, kde je její soubor ve tvém počítači (PDF, obrázek, text); v chatu v Přehledu Pán jeskyně žádný tvůj soubor neotevře. Pán jeskyně postavu zapíše tak, jak je, na její úrovni, ověří ji podle pravidel a světa a s tebou se domluví na všem, co se do nich nehodí.

### 2.8 Druhá cesta: vlastní chat tvé AI aplikace

Můžeš hrát i přímo v chatu své AI aplikace, v terminálu nebo v její desktopové aplikaci, s Přehledem otevřeným vedle. Kampaň pak vytvoříš v terminálu, ve složce, kam ukládáš své hry ([2.1](#21-what-you-need) říká, jak na to), vždy s jejím názvem: `rpg init "The Salt Isles"` vytvoří složku `The Salt Isles` s novou kampaní. RPG Engine tam samo připraví, co každá aplikace potřebuje.

Aplikaci spusť v té složce: `claude` pro Claude Code, `codex` pro Codex, `agy` pro Antigravity, `opencode` pro OpenCode; nebo složku otevři v její desktopové aplikaci. Když se zeptá, jestli složce důvěřuješ, potvrď: pozor, v Claude Code je předvolená odpověď *No, exit*. Pánem jeskyně může být i jakýkoli jiný agent, který podporuje MCP: spusť ho ve složce kampaně a připoj k němu server MCP `rpg mcp`.

Napiš *Ahoj! Pojďme začít.* Ve své první odpovědi v každém chatu ti Pán jeskyně dá **odkaz na tvůj Přehled**, něco jako `http://127.0.0.1:4750`: otevři ho vedle chatu.

- Mezi zprávami Pána jeskyně ukazuje aplikace nástroje, které používá: neotvírej jejich podrobnosti (v Claude Code ctrl+o), mohou odhalit tajemství.
- Kampaň vypíná vlastní paměť aplikace: hra žije v jejích souborech, aby návrat k uložené hře opravdu vrátil zpět. V desktopové aplikaci Codex zkontroluj v nastavení, že jsou paměti pro chaty hry vypnuté.
- Pokud Pán jeskyně řekne, že nemůže najít nástroje RPG Engine, napiš ve složce kampaně `rpg init` a pak otevři nový chat.
- Kampaň hraje vždy jen jeden chat: dokud je otevřený tvůj, chat v Přehledu čeká.

---

## 3. Hraní <!-- icon: chat -->

### 3.1 Rozhovor s Pánem jeskyně

Napiš, co tvoje postava dělá nebo říká, vlastními slovy:

> Ptám se hostinského, kdo další tudy dnes večer procházel.

Mimo příběh napiš `[OOC: …]` (out of character): *[OOC: Jak funguje zápas v držení?]* Pán jeskyně odpoví stejně; v chatu v Přehledu jsou jeho slova mimo hru oddělená a označená OOC.

V chatu v Přehledu piš do pole dole a odešli klávesou Enter; Shift+Enter začne nový řádek. Když Pán jeskyně odpovídá, **Zastavit** ho zastaví a tvoje slova zůstanou v poli. Když se tě Pán jeskyně na něco zeptá, tlačítka přijdou spolu s otázkou, včetně hodů: klikni na jedno, nebo napiš odpověď. Pod polem vidíš aplikaci a model; kde to aplikace dovoluje, můžeš model změnit kliknutím, až Pán jeskyně dopoví. **Zavřít chat** chat ukončí; hra zůstane v souborech.

Ty říkáš, o co se pokoušíš. Pán jeskyně říká, co se stane. Pán jeskyně nikdy nerozhoduje za tvou postavu a nikdy nemluví o enginu. Můžeš se ho zeptat, jak se používá dashboard.

**Jednání z dashboardu**: klikni na jméno v deníku postavy, třeba na zbraň, kouzlo nebo předmět, který neseš: karta řekne, co to je. Brašna se otevře šipkou a její ⓘ ukáže její kartu. Vyber, co s tím chceš dělat. Věc, která nikoho nepotřebuje, třeba **Vybavit**, chce potvrzení na stejném tlačítku, *Potvrdit: Vybavím Štít*: stiskni ho znovu a jde to Pánu jeskyně. Věc, která se dělá někomu, třeba **Zaútočit**, se zeptá na koho, v seznamu nebo kliknutím na mapě. Pak tlačítko řekne celou větu, *Zaútočím palcátem na Zakuklený bandita 1*, a jedno kliknutí ji odešle. Chceš-li to říct po svém, klikni na osobu, se kterou chceš mluvit, nebo piš do chatu. Pán jeskyně to slyší, jako by to bylo řečeno v chatu, rozhodne o tom jako o každé jiné věci a tlačítky se zeptá na to, co jsi vynechal(a). Pokud tvoje AI aplikace nemá zvonek, Pán jeskyně si to přečte, jakmile příště napíšeš do chatu. Pokud byl chat předtím zavřený, **Říct znovu** to pošle ještě jednou.

### 3.2 Hody

Pán jeskyně žádá o hod, jen když je výsledek nejistý a záleží na něm. Nejdřív řekne, o co jde. Pak:

- **Na dashboardu** se v panelu zobrazí tlačítko pro každé ověření, například *Akrobacie +4 · s výhodou*. Klikni na něj: kostky padnou na stránce a Pán jeskyně uslyší výsledek. Můžeš také kliknout na řádek v deníku postavy, který se rozsvítí, hodit kostky z podnosu na kostky, nebo do panelu napsat něco jiného.
- **Ručně**, v rohu panelu nebo v **Nastavení**: panel ti řekne, co hodit, a ty hodíš z deníku postavy nebo z podnosu na kostky.
- **Fyzické kostky**, když je nastavení kostek na fyzické: napíšeš, co ti padlo, *[Hodil/a jsem 14.]*, a RPG Engine přičte tvé opravy.

**Volné hody**: klikni na libovolné číslo v deníku postavy nebo otevři podnos na kostky a hoď si pro zábavu. Nikdy se nepočítají a Pán jeskyně je nevidí.

**Hody Pána jeskyně** se zobrazují ve sloupci hodů, kromě tajných. Vždy se můžeš zeptat *[Byl ten hod skutečný?]*: u tajného hodu Pán jeskyně dá otisk, který dokazuje, že hod proběhl dřív, než ses zeptal/a.

### 3.3 Scény a boje

Příběh běží ve **scénách**: boj, rozhovor, zkoumání, cestování, odpočinek. Na konci každé scény se hra sama uloží, scéna přejde do tvé kroniky a když se příběh obrátí, Pán jeskyně napíše scény od poslední kapitoly jako novou kapitolu knihy tvého příběhu.

V boji Pán jeskyně vypráví každý tah, který není tvůj, a zastaví se tam, kde se můžeš rozhodnout. **Scéna** nahoře ukazuje, kdo je na tahu a kdo bude další, a vedle mapy kartu tvé postavy. Pořadí tahů, životy tvé družiny a slovní popis toho, jak jsou nepřátelé raněni, zůstávají na straně stránky. Pokud tvá postava padne, na stránce se velké zobrazí záchrany před smrtí.

**Trvalé rozkazy**: řekni společníkům něco, co má platit dlouhodobě, třeba *Od teď vždycky jednoho nechte naživu*, a Pán jeskyně to drží, dokud to nezrušíš. Společníci se tím řídí, pokud jim to jejich povaha dovolí, a když se tak některý nezachová, řeknou to. Své rozkazy najdeš v **Nastavení**, kde je můžeš přidávat i odebírat.

### 3.4 Čas, cestování a svět, který se hýbe

RPG Engine hlídá datum. Mezi sezeními herní čas stojí, pokud v **Nastavení** nezvolíš, že má běžet, například den ve hře za každý týden pryč, nebo o to nepožádáš Pána jeskyně. Řekni, že odpočíváš, *Dopřejeme si dlouhý odpočinek*, a jakmile Pán jeskyně souhlasí, odpočinek vrátí, co má. Při krátkém odpočinku se tě Pán jeskyně může na dashboardu zeptat, kolik kostek životů utratíš: hoď je po jedné, uvidíš, kolik každá vyléčí, a přestaň, kdy chceš. Řekni, kam jdeš, *Vydáme se po cestě na sever k Rocce*, a RPG Engine spočítá cestu, vzdálenost i dny. Zastaví se, když se cestou něco stane. Peníze se počítají v herních mincích, včetně drobných.

Padouši mají plány s termíny. Každý nový den Pán jeskyně posune hrozby, které čas pokročil, a ty vidíš jejich znamení, nikdy ne samotné hodiny.

### 3.5 Mapy

**Svět** ukazuje místa, která tvá postava zná, cesty mezi nimi a stopu, kterou jsi prošel/prošla. Zbytek zakrývá mlha. **Scéna** ukazuje mapu místa, kde jsi, pokud nějakou má, a kdo kde stojí. V boji jsou na tvém tahu políčka, na která nedosáhneš, zastřená. Když se Pán jeskyně zeptá, kam se přesuneš, ťukni na políčko nebo ho napiš, třeba *E4*.

**Svět** také uchovává, co tvá postava ví. **Znalosti** uvádějí lidi, místa, frakce, tvory a příběhy, které postava zná, každé tak, jak je zná: můžeš v nich hledat, nebo otevřít položku a přečíst si ji celou. Jméno v textu vede na svou stránku. **Dokumenty** uchovávají dopisy, oznámení a stránky, které postava našla, k opětovnému přečtení. **Kalendář** ukazuje dnešek, termíny tvých úkolů se zbývajícím časem a dny příběhu: den se scénami vede k nim na **Časové ose** v Kronice.

### 3.6 Úkoly, kronika a poznámky

Úkol, který tvá postava přijme, se objeví v **Kronice** i s cíli, termínem a tím, co se měří. Označ ho hvězdičkou, aby zůstal na očích nahoře ve Scéně. V části **Příběh** Kronika vypráví tvůj příběh jako knihu: Pán jeskyně napíše kapitolu prózou pokaždé, když se příběh obrátí, a převypráví v ní scény od té poslední, ve zvoleném stylu. Čti ji kapitolu po kapitole, poslední přečtenou označí záložka. Stáhnout ji můžeš jako Markdown nebo jako webovou stránku k vytištění či předání dál. Ve hře, která začala dřív, požádej Pána jeskyně, aby napsal dosavadní příběh. **Časová osa** uvádí očíslované scény s tím, co se v každé stalo. Kronika také uchovává tvé **Poznámky**: jsou soukromé, dokud některou nezvolíš **Sdílet**. Pán jeskyně ji pak slyší jako to, co si myslíš, nikdy jako fakt. V části **Společníci** čteš deníky svých společníků: čas od času, na konci dne nebo úkolu, napíšou pár řádků o tom, co si myslí a cítí.

### 3.7 Příběh a podoba tvé postavy

Na deníku postavy má karta **Popis** pole pro příběh tvé postavy: Pán jeskyně ho tam zapíše, až řekneš ano. Pro obrázek dej Pánu jeskyně soubor (PNG, JPEG, WebP nebo SVG, do 5 MB) a řekni, kde na počítači leží. Nebo si nech vytvořit portrét ([3.11](#311-pictures)): *[Udělej mi portrét: šedé vlasy spletené do copu, jizva na bradě.]*

### 3.8 Uložené hry a návrat zpět

RPG Engine ukládá celou kampaň na konci každé scény. O zbytku rozhoduje nastavení **Uložené hry**:

| Uložené hry | Uložit, kdy chceš | Vrátit se |
|---|---|---|
| **permadeath** | ne | nikdy |
| **checkpoint** | ne | k poslední uložené hře, jen když tvá postava zemře |
| **volné** | ano | k jakékoli uložené hře |

V každém režimu můžeš **začít znovu**, od začátku hry nebo od nultého sezení. Udělej to v chatu nebo v **Uložené hry**.

Po návratu zpět **otevři nový chat**: starý si pamatuje, co bylo zrušeno. V chatu v Přehledu stiskni **Zavřít chat**, pak **Nový chat**; ve vlastním chatu své AI aplikace otevři novou konverzaci (`/clear` v Claude Code). V novém chatu napiš *Pokračovat*. Potom Pánu jeskyně řekni, že chat je nový: stiskni **Nový chat otevřen** v Uložených hrách, nebo to řekni v chatu. Dokud to neuděláš, Pán jeskyně nepokračuje.

Pokud nevíš, co je git, tento odstavec přeskoč. Pokud je složka kampaně repozitář gitu, **Nastavení** obsahuje sekci **Git**, kde je vše vypnuté, dokud nezvolíš jinak: commit na začátku každého sezení, při každém uložení hry a na konci každé scény, a po něm případně push. Commit je snímek kampaně v dané chvíli; push pošle snímky do online repozitáře, třeba na GitHub, aby kopie existovala i mimo tento počítač. Uložené hry a tvoje chaty s Pánem jeskyně zůstávají mimo repozitář, dokud je do něj nepustíš; chaty tam pusť, jen když je repozitář soukromý.

### 3.9 Sezení: přestávka a návrat

Přestaň, kdy chceš: *[Pro dnešek tady skončeme.]* Všechno je už uloženo v souborech. Až se budeš chtít vrátit, otevři RPG Engine z jeho ikony a klikni na svou kampaň. Pokud chat zůstal otevřený, vrátí se sám. Pokud byl zavřený, stiskni **Obnovit chat**. Pak stiskni **Navázat na příběh**: Pán jeskyně ti v pár řádcích řekne, kde příběh stojí, a pokračuje. Pokud byla hra zavřena, když Pán jeskyně ještě odpovídal, nebo když na tebe čekala jeho otázka, tlačítko místo toho říká **Pokračovat odtud**. **Nový chat** otevře čerstvý chat na stejné hře. Ve vlastním chatu své AI aplikace ji spusť ve složce kampaně a napiš *Pokračovat*.

### 3.10 Nálada Pána jeskyně

Robot nahoře v Přehledu je Pán jeskyně: jeho tvář sleduje tón příběhu a nikdy neprozradí, co ještě nevíš. Když Přehled není spojený s hrou, spí.

### 3.11 Obrázky

RPG Engine může nechat vytvořit obrázky míst, kam dojdeš, úkolů, které přijmeš, i postav, které potkáš, podle nastavení **Obrázky**, a také portrét tvé postavy, když o něj požádáš. Tvoje vlastní AI aplikace je vytváří svými prostředky, s tvým přihlášením, na tvém tarifu a v jeho limitech: **Claude** je kreslí jako vektorové obrázky, **Codex** a **Antigravity** je malují, **OpenCode** kreslí v chatu jednoduché vektorové obrázky. V **Nastavení > Kampaň > Obrázky** můžeš nechat Codex nebo Antigravity malovat obrázky i tehdy, když je Pánem jeskyně jiná aplikace: tam, kde zvolená aplikace nemůže, je vytvoří tvůj chat. **Nastavení** ukazuje, zda je tento počítač umí vytvářet, a jak to případně nastavit. Vlastní obrázek můžeš dát vždy, své postavě i kterékoli stránce, kterou vidíš: najeď ukazatelem na některý z jejích obrázků a v rohu se ukáže malé tlačítko s obrázkem (jde to i klávesnicí a na telefonu je vidět vždy). Ve **Světě** má otevřená stránka také **Změnit obrázek…**, nebo **Přidat obrázek…**, dokud žádný nemá. Když držíš ukazatel nad obrázkem nebo je zaostřené jeho tlačítko, můžeš také vložit zkopírovaný obrázek pomocí Ctrl+V (⌘V na Macu). Tvůj obrázek nahradí ten, který stránka má. Nebo soubor vlož do složky **inbox** v kampani a řekni Pánu jeskyně, pro kterou stránku je.

### 3.12 Bezpečí: hranice, závoje a stop

**Hranice** se ve hře nikdy neobjeví. **Závoje** se odehrávají jen mimo scénu. Kdykoli napiš *[stop]*: Pán jeskyně ten obsah okamžitě opustí a přidá ho do tvých hranic.

### 3.13 Změna rozhodnutí

Každé nastavení lze změnit, v chatu nebo v **Nastavení**. Rozhodnutí, které Pán jeskyně udělá bez pravidel, se stane **precedentem**, takže stejná otázka dostane příště stejnou odpověď.

---

## 4. Ovládací panel <!-- icon: party -->

Stránka na tvém vlastním počítači, ve vlastním okně, otevřená jen na tomto počítači. Zůstává živá, dokud je její okno otevřené, s chatem i bez něj; asi třicet sekund po jeho zavření se hra zastaví, a s ní i chat. Nic se neztratí: vše je v souborech. Ve vlastním chatu tvé AI aplikace je živá, dokud je ten chat otevřený. Když hra není k dispozici, stránka ukáže *Not connected*: stiskni **Znovu otevřít kampaň**, nebo ve své aplikaci otevři další chat. Tlačítko **Kampaně** s domečkem vede zpět ke všem tvým kampaním.

- **Hraní rolí**: chat s Pánem jeskyně, když není vedle stránky ([2.5](#25-the-first-chat)).
- **Družina**: tvůj deník postavy a deníky tvých společníků. Kliknutím na číslo si hodíš; když na něj najedeš myší, uvidíš, odkud se bere, a pokud šipka u kostky něco označuje, také co hod zlepšuje nebo zhoršuje. Když pro tebe Pán jeskyně připraví volby, například při novém levelu, otevřeš je oznámením v deníku postavy: vyber, kdy chceš, přečti si stránky, které možnosti uvádějí, hoď, kde to možnost vyžaduje, a pak potvrď; příběh mezitím pokračuje. Vedle jsou hody.
- **Scéna**: kde jsi, obrázek a mapa místa, kdo tam je a co se děje; v boji tahy a karta tvé postavy.
- **Kronika**: úkoly, příběh jako kniha, jeho časová osa, deníky tvých společníků, tvé poznámky.
- **Svět**: mapa světa, co tvá postava ví, nalezené dokumenty a kalendář.
- **Podnos na kostky**: vyber kostky a opravu a hoď; ×2 zdvojnásobí kostky, nikdy ne opravu, jako při kritickém zásahu.
- **Uložené hry**, **Nápověda**, **Nastavení** a **O aplikaci**: ikony na konci řady. Nastavení také obsahuje pod **Přehled** vlastní předvolby stránky: režim, zvuk kostek, sadu kostek a **Motiv**, tedy barvy, podoby a obrázky stránky: motiv herního systému, motiv přidaný v Packages › Add z katalogu, z odkazu na GitHub, ze souboru .zip nebo ze složky, nebo vlastní motiv stránky. Pokud kvůli vlastnímu stylu motivu není stránka dobře čitelná, vypni tam **Vlastní styl motivu**: Nastavení se vždy zobrazí bez něj, na adrese stránky s `#/settings/page` na konci.

Když se tě Pán jeskyně na něco zeptá, jeho nápis zůstane nahoře, ať jsi v jakékoli části.

---

## 5. Herní systémy a domácí pravidla <!-- icon: dice -->

### 5.1 Co je herní systém

Data jedné hry: její deník postavy, čísla, tvorové, předměty, kouzla a text pravidel. Každá kampaň hraje jeden systém. RPG Engine počítá deník postavy i to, co se utratí a co se vrátí. Jak funguje nějaká schopnost, to Pán jeskyně přečte v pravidlech a rozhodne, stejně jako u stolu.

### 5.2 Pátá edice

Rasy, povolání, podpovolání, zázemí a vlastnost (feat) ze SRD 5.1; 319 kouzel, zbraně, zbroje, magické předměty a příšery; kapitoly pravidel, které Pán jeskyně čte přesně podle textu; úplný deník postavy, vypočtený.

Je to samostatný balíček: Pán jeskyně ho nabídne, když nastavuješ kampaň, a nainstaluje ho. Kampaň, která ho hraje, si ho nainstaluje sama při prvním otevření na počítači, kde ještě není. Pán jeskyně ti to řekne.

Můžeš hrát i obsah, který v SRD chybí, z knihy, kterou vlastníš: Pán jeskyně ho zapíše jako stránky tvé kampaně a RPG Engine s nimi zachází jako s vlastními. RPG Engine obsahuje jen otevřený obsah; znalosti Pána jeskyně nejsou omezené.

Tvé vlastní příručky mohou tvořit tvou knihovnu: řekni Pánu jeskyně, kde jsou, *[Moje příručky jsou v D:\Books\5e.]*, nebo přidej jejich složku v Balíčky › Knihovna a jednou potvrď ano v okně, které ukáže počítač. RPG Engine je čte na tomto počítači. Každá kampaň používá složky, které tam zapneš. Pán jeskyně v nich hledá, když rozhoduje o pravidlu, až po SRD, a uvádí knihu i stranu. Nejlépe se čtou jako text nebo jako PDF s textem, který jde označit. Naskenované PDF se čte z obrázků stránek, jen na Windows, několik minut a s několika chybami. RPG Engine tvé příručky nikdy nemění, jejich text nikam neposílá a nikdy ho nekopíruje do kampaně.

### 5.3 Domácí pravidla a vlastní doplňky

Požádej Pána jeskyně: *[Domácí pravidlo: přirozená 1 při útoku znamená, že upustíš zbraň.]* Zapíše si ho jako dohodu stolu, nebo napíše stránku či číslo do deníku postavy, když je třeba. Už napsaná domácí pravidla můžeš vložit jako textové soubory do složky `rules` v kampani.

Když Pán jeskyně změní pro tvou kampaň stránku herního systému, například životy tvora nebo dosah kouzla, dashboard ji všude, kde se zobrazí, označí malou hvězdičkou za názvem. Balíčky › Nainstalované uvádí, co se změnilo, pod herním systémem, vedle toho, co systém dal. Tvor, kterého tvá postava nezná, je tam uveden jen jménem. Tam můžeš stránku vrátit do podoby, jak ji píše systém, až skončí právě hraná scéna. Dashboard změnu vrátit nemůže, jen Pán jeskyně ji může zapsat znovu.

### 5.4 Přidání nebo import vlastního herního systému

Herní systém je balíček: Pán jeskyně ho nainstaluje z npm, ze složky nebo ze souboru. Balíček, který není od nás, nainstaluje jen s tvým ano, ve formuláři svého agenta nebo v okně počítače. Vytvořit ho je práce pro vývojáře, popsaná v dokumentech RPG Engine na GitHubu. Proměnit tvou knihu v herní systém tu zatím nejde ([Připravujeme](#9-coming-later)).

---

## 6. Rozšíření <!-- icon: plus -->

Rozšíření přidá do kampaně něco navíc k jejímu hernímu systému: například počasí, které se mění každý úsvit, nebo páčení zámků kostkami. Přidáš ho v Balíčky › Přidat, buď ze seznamu, nebo podle názvu na npm, ze složky či ze souboru. Rozšíření, které nepochází od nás, obsahuje kód. Přidá se proto až s tvým souhlasem v okně tvého počítače. Rozšíření vytvořené pro jiný herní systém to oznámí a nepřidá se. V Balíčky › Nainstalované rozšíření aktualizuješ nebo odebereš. Pán jeskyně může rozšíření přidat také, když o to požádáš.

---

## 7. Odkud kampaň pochází a její jazyk <!-- icon: world -->

### 7.1 Tři cesty ke světu

- **Vytvářený za pochodu**: z tvého námětu Pán jeskyně buduje každé místo, osobu i zápletku těsně předtím, než je budeš potřebovat, a uchovává je.
- **Připravený na začátku**: totéž, ale svět se postaví před hrou.
- **Z tvého vlastního dobrodružství nebo knihy**: dej Pánu jeskyně její soubor, *[Naimportuj toto dobrodružství jako naši kampaň: D:\Books\adventure.pdf. Neříkej mi nic z toho, co v něm je.]* Soubor mimo kampaň se přečte až poté, co v okně svého počítače potvrdíš; soubor ve složce **inbox** kampaně se přečte hned. Nejlépe se čte jako text, EPUB, dokument Word nebo PDF s textem, který lze označit; naskenované PDF se čte z obrázků stránek, jen ve Windows, pomalu a s několika chybami. Čte ho tvoje vlastní AI aplikace mimo chat, jinak Pán jeskyně v chatu, v rámci tvého tarifu: v Claude Code nebo Codex ho čte jeden z těchto dvou, v Antigravity tvůj Antigravity, v OpenCode model, který je v něm naposledy zvolený. Celý dokument jde tvůrci toho, kdo ho čte, podle podmínek tvého účtu a jeho nastavení ohledně trénování. Přehled ukazuje, jak daleko čtení je; u románu Pán jeskyně navrhne, kde začít. Napíše místa, postavy a tajemství.

Kampaň se hraje jednou: chceš-li hrát totéž dobrodružství znovu, vytvoř novou kampaň.

### 7.2 Jazyky

Jeden jazyk na kampaň, ten Pána jeskyně, kterým se řídí i dashboard. Dashboard se dodává ve 26 jazycích. Jakýkoli jiný přeloží na tvém počítači tvoje vlastní AI aplikace mimo chat (Codex nebo Claude Code; v Antigravity a OpenCode jejich vlastní), nebo, pokud to žádná neumí, Pán jeskyně v chatu. Italské názvy pojmů páté edice pocházejí z oficiálního italského SRD, text pravidel zůstává anglicky a Pán jeskyně ho převypráví ve tvém jazyce.

---

## 8. Pro zvědavé: složka kampaně <!-- icon: list -->

Nikdy ji nemusíš otevírat. Obsahuje tajemství tvé kampaně. Najdeš v ní `campaign.yaml` (tvá nastavení), `state.yaml` (jak hra stojí), `world/` (jedna stránka markdown pro každou postavu, místo, úkol a další), `rules/` (tvá domácí pravidla), `images/`, `log.jsonl` (každá změna), `sessions/` (tvé rozhovory s Pánem jeskyně jako text, z Claude Code a Codexu), `.saves/`, `.player/` (tvé poznámky) a malé soubory, které AI agentům říkají, kde RPG Engine je. Stránky používají formát Obsidianu. Když stránku změníš ručně, Pán jeskyně se to dozví při své další odpovědi.

RPG Engine zůstává v této složce: hru čte a zapisuje jen tady a nikdy nesahá na tvé další soubory. Složky s tvými příručkami jen čte. Mimo ni si uchovává jen vlastní datové složky (překlady dashboardu, text přečtený z tvých příruček a Codex či Claude Code, pokud mu dovolíš je nainstalovat) a dočasné složky, dokud se kreslí obrázek. Cokoli jiného chce tvůj agent na počítači udělat, nejdřív se zeptá tebe. Herní systém nebo rozšíření je kód, stejně jako každý balíček npm: ten, který není od nás, běží na tvém počítači s tvými oprávněními a RPG Engine ho nainstaluje jen s tvým ano, ve formuláři tvého agenta nebo v okně počítače. Souhlas dávej jen balíčkům, jejichž autorům věříš.

Každý příkaz, který Pán jeskyně používá, jde spustit i ve složce kampaně: `rpg --help` je vypíše. Mnohé vypisují tajemství kampaně.

---

## 9. Co přijde později <!-- icon: hourglass -->

- **Ty jako Pán jeskyně**, zatímco družinu bude hrát AI.
- **Režim autora**: napiš s AI dobrodružství, pak ho exportuj a sdílej.
- **Více hráčů na jednom počítači**, každý s vlastní postavou, střídající se ve stejném chatu.
- **Další rozšíření**: světy, funkce a domácí pravidla ke sdílení.
- **Další hry**: více herních systémů i tvoje vlastní.

---

## 10. Otázky a problémy <!-- icon: info -->

### Otázky

**Musím znát pravidla?** Ne. Vyber mentora s výukou a ptej se přes `[OOC: …]`, kdykoli chceš.

**Může Pán jeskyně podvádět?** Nemůže změnit hod, který udělal RPG Engine, kromě obtížnosti příběh, ani už stanovená fakta.

**Stojí to něco?** RPG Engine je zdarma. Pán jeskyně běží na tarifu tvé AI aplikace, nebo na tvém počítači s lokálním modelem. Večer hraní je dlouhý chat: na nejmenších tarifech můžeš narazit na limit tarifu dřív, než večer skončí. Obrázky, překlady a importy používají stejný tarif. RPG Engine sám nikdy nepoužívá klíč API, který se platí za každé volání: přihlas svou AI aplikaci účtem, ne klíčem.

**Můžu hrát na telefonu?** Ne: Pán jeskyně běží na tvém počítači a dashboard se otevře jen tam.

**Můžu hrát s kamarády?** Zatím ne: dnes jeden hráč, jedna postava a k tomu společníci ([Coming later](#9-coming-later)).

**Můžu příště použít jinou AI?** Ano: před otevřením chatu vyber jinou aplikaci, nebo kampaň otevři v jiné aplikaci a napiš *Pokračovat*.

### Problémy

**Kampaň se neotevře.** Otevři RPG Engine znovu z jeho ikony, nebo příkazem `rpg open` v terminálu, a klikni na kampaň. Pokud její Přehled hlásí *Not connected*, stiskni **Znovu otevřít kampaň**. Karta s nápisem **Složka nenalezena** přišla o svou složku: odeber ji ze seznamu a přidej ji znovu přes **Otevřít složku…** tam, kde je teď. Ve vlastním chatu tvé AI aplikace Přehled funguje, jen dokud je otevřený chat té kampaně: zeptej se Pána jeskyně `[OOC: Jaký je odkaz na Přehled?]`. V aplikaci Claude chat, který chvíli zůstane na pozadí, usne a stránka s ním: klikni na chat a stránka se vrátí na stejné adrese.

**Pán jeskyně jako by hru neznal.** Stává se to ve vlastním chatu tvé AI aplikace: nenačetla RPG Engine. Zkontroluj, že aplikace běží ve složce kampaně a že důvěra ve složku byla potvrzena. V Claude Code napiš `/mcp` a znovu připoj `rpg`. V Codex musí `codex mcp list` ve složce kampaně ukázat `rpg`. Pokud se `rpg --version` nenajde, nainstaluj RPG Engine znovu ([2.2](#22-install)).

**Windows nenajde `claude`.** Stává se to, když Claude Code instaluješ sám. Jeho instalátor to oznámí ve žluté poznámce a uvede složku, do které se nainstaloval: přidej tu složku do PATH (Vlastnosti systému > Proměnné prostředí) a pak otevři nový terminál.

**Aktualizace.** Když vyjde novější RPG Engine, Přehled to oznámí: v Packages › Installed je RPG Engine první, s tlačítkem **Aktualizovat**; pak udělej, co ti stránka řekne. Nebo v terminálu znovu spusť `npm install -g rpg-engine` a pak otevři nový chat: běžící Pán jeskyně si drží verzi, se kterou začal.

**Pán jeskyně si pamatuje něco, co jsem vrátil(a) zpět.** Otevři nový chat a v Uložených hrách stiskni **Nový chat otevřen**.

**Aplikace se nenainstaluje.** Stránka řekne proč: stiskni **Zkusit znovu**. Nebo ji nainstaluj ze stránek jejího výrobce a pak stiskni **Zkontrolovat znovu**.

**Přihlašovací stránka se v prohlížeči neotevře.** Dokud stránka na tebe čeká, stiskni tam, kde se ukáže, **Znovu otevřít přihlašovací stránku**, nebo **Zrušit** a zkus to znovu.

**Chat v Přehledu hlásí, že hraje jiný chat.** Tuto kampaň hraje chat otevřený ve tvé AI aplikaci: pokračuj tam, nebo ho zavři a hraj v Přehledu.

**Neobjevují se žádné obrázky.** Nastavení > Kampaň > Obrázky říká, jestli je tento počítač umí vytvářet, a jak.

**Instalace selže, nebo `rpg` nechce začít.** `node --version` musí hlásit 24 nebo novější. Pokud Windows odpoví, že spouštění skriptů je zakázané, viz [2.1](#21-what-you-need). Ve Windows nech RPG Engine a své kampaně mimo cesty, které obsahují `&`.

**Odkaz na Přehled se změnil.** Ve vlastním chatu tvé AI aplikace má každá kampaň vlastní adresu, chat za chatem stejnou. Změní se, jen když ji už používá jiný program: Pán jeskyně ti dá nový odkaz a od té chvíle zůstane. Druhý chat stejné kampaně drží stránku na stejné adrese a převezme ji, jakmile zavřeš první.
