<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,dcb833ce,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,a9023962,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: kompletní průvodce

**RPG Engine** ti umožní hrát stolní hru na hrdiny s **AI jako Pánem jeskyně**. Hraješ v **Přehledu**, v okně na počítači s deníkem postavy, kostkami, mapami, kronikou a **chatem** s Pánem jeskyně.

Tento průvodce ti říká, jak hrát. Stránka vysvětluje svá tlačítka sama: najeď na některé ukazatelem a uvidíš, co dělá.

## Rychlý start <!-- icon: send -->

1. Nainstaluj **Node.js** z [nodejs.org](https://nodejs.org) (verze LTS).
2. Otevři nový terminál a napiš `npm install -g rpg-engine`. Pokud Windows odpoví, že spouštění skriptů je zakázané, napiš `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, odpověz ano a zkus to znovu.
3. Napiš `rpg open` a stiskni Enter, když nabídne ikonu na ploše ([2.2](#22-installing)). Od té chvíle RPG Engine spouštíš z ikony.
4. Stiskni **Nová kampaň**, zadej jméno a stiskni **Vytvořit** ([2.3](#23-a-new-campaign)).
5. V chatu vyber svou AI aplikaci a její model ([2.4](#24-connect-your-ai)): Claude Code potřebuje placený tarif Claude, Codex účet ChatGPT, bezplatný nebo placený. Stiskni **Otevřít chat**, pak **Začít**.

První odpověď může trvat i pár minut. Pak se Pán jeskyně zeptá, jak chceš hrát, a postavu vytvoříte společně.

## 1. O hře RPG Engine <!-- icon: about -->

| Kdo | Co dělá |
|---|---|
| **Ty** | Hraješ svou postavu: co dělá, říká a zkouší. |
| **Pán jeskyně** (AI) | Vypráví příběh, hraje všechny ostatní, rozhoduje, co se stane, a žádá o hody. |
| **RPG Engine** | Drží svět v souborech, háže kostkami, počítá životy, peníze, čas a vzdálenosti a drží tajemství, dokud je neobjevíš. |

Svět tak zůstává stejný z jednoho večera na druhý, i v novém chatu, i s jinou AI:

- **Co bylo řečeno, platí.** Mrtvý padouch zůstane mrtvý.
- **Kostky jsou skutečné.** Pán jeskyně je nemůže změnit, kromě nejlehčí obtížnosti.
- **Tajemství zůstávají tajná.** Pán jeskyně ti nikdy neřekne, co tvá postava neví.
- **Svět se hýbe.** Hrozby postupují, zatímco odpočíváš nebo cestuješ.
- **Kampaň je složka** na tvém počítači: skonči, kdy chceš, a navaž později.

Hra přichází jako herní systém: dnes je náš **pátá edice** z volného dokumentu System Reference Document 5.1. Bez něj hraješ volně, příběh bez čísel.

---

## 2. Začínáme <!-- icon: path -->

### 2.1 Co potřebuješ

- Počítač s Windows, macOS nebo Linuxem.
- **Node.js 24** nebo novější, z [nodejs.org](https://nodejs.org).
- **Terminál**, jen kvůli instalaci: ve Windows Terminál nebo PowerShell, v macOS Terminál.
- **AI aplikace** pro Pána jeskyně, s tvým vlastním účtem ([2.4](#24-connect-your-ai)).

### 2.2 Instalace

```text
npm install -g rpg-engine
rpg open
```

První řádek nainstaluje RPG Engine. Pokud ti npm nabídne, že se aktualizuje, můžeš to ignorovat.

`rpg open` otevře okno RPG Engine. Poprvé nabídne ikonu na ploše a v nabídce: stiskni Enter pro ano. Od té chvíle spouštíš z ikony.

Pokud instalace selže, zkontroluj, že `node --version` ukazuje 24 nebo víc. Pokud Windows odpoví, že spouštění skriptů je zakázané, napiš `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` a odpověz ano. Ve Windows nech RPG Engine i své kampaně mimo cesty, které obsahují `&`.

### 2.3 Nová kampaň

Stiskni **Nová kampaň** a zadej její **Jméno**, **Jazyk** a **Herní systém**. Zbytek s tebou vytvoří Pán jeskyně. Stiskni **Vytvořit**: kampaň se otevře ve vlastním okně.

Pán jeskyně i Přehled mluví jazykem kampaně. Text pravidel páté edice zůstává v angličtině a Pán jeskyně ho převypráví ve tvém jazyce.

Kampaň je složka se stejným názvem uvnitř složky `RPG Engine` ve tvé uživatelské složce. Příště klikni na její kartu.

### 2.4 Připojení AI

Pán jeskyně běží v **AI aplikaci** na tvém počítači, s tvým účtem. Webový chat jako claude.ai nebo ChatGPT nestačí: Pán jeskyně se musí dostat k souborům kampaně.

- **Claude Code**: placený tarif Claude (Pro nebo vyšší).
- **Codex**: účet ChatGPT, bezplatný nebo placený.
- **OpenCode**: bez účtu; několik modelů zdarma na omezenou dobu, nebo modely tvého vlastního poskytovatele, i lokální.
- **Antigravity**: účet Google; jeho bezplatné používání má týdenní limity.

V chatu vyber aplikaci, její **Model** a **Úvahy Pána jeskyně**. Pokud aplikace chybí nebo nejsi přihlášen(a), tlačítko ji nainstaluje, přihlásí tě nebo otevře její web. RPG Engine nikdy nevidí tvoje heslo.

Večer hraní je dlouhý chat: na nejmenších tarifech můžeš narazit na limit dřív, než večer skončí. Hraj s největším modelem, který máš: malý model se dá snáze přemluvit k prozrazení tajemství.

RPG Engine nejvíc hrajeme a testujeme s **Claude Code**. Antigravity je **ve zkušební verzi**: může vystoupit ze hry a uchovává tvoje chaty v paměti, kterou nejde vypnout. Co tam napíšeš, jde do Googlu, kde to mohou číst lidé. RPG Engine není produkt Googlu.

### 2.5 První chat

Stiskni **Otevřít chat**, pak **Začít**. První odpověď může trvat i pár minut. Pak nová kampaň projde třemi kroky:

1. **Nastavení**: Pán jeskyně se zeptá, jak chceš hrát, vždy na několik otázek najednou: jak těžký je svět, jestli můžeš zemřít, kdy se můžeš vrátit k uložené hře. Napiš *Rozhoduješ ty* a Pán jeskyně vybere. Vše se dá později změnit.
2. **Nulté sezení**: postavu vytváříš s Pánem jeskyně, jako u stolu. RPG Engine spočítá deník postavy. Pokud už postavu máš, vlož její deník do chatu.
3. **Hra**: Pán jeskyně připraví první scénu.

### 2.6 Hraní ve své AI aplikaci

Můžeš hrát i v chatu své AI aplikace, v terminálu nebo v její desktopové aplikaci, s Přehledem vedle.

1. Otevři terminál ve složce, kam ukládáš své hry: klikni na složku pravým tlačítkem a zvol **Otevřít v Terminálu** (Windows) nebo **Služby > Nový terminál ve složce** (macOS).
2. Napiš `rpg init "The Salt Isles"`: vytvoří složku `The Salt Isles` s novou kampaní.
3. Spusť svou aplikaci v té složce: `claude`, `codex`, `agy` pro Antigravity, nebo `opencode`. Když se zeptá, jestli složce důvěřuješ, potvrď: v Claude Code je předvolená odpověď *No, exit*.
4. Napiš *Ahoj! Pojďme začít.* Pán jeskyně ti dá odkaz na tvůj Přehled: otevři ho vedle chatu.

Dobré vědět:

- Neotvírej podrobnosti nástrojů, které tvá aplikace používá (v Claude Code ctrl+o): mohou odhalit tajemství.
- V desktopové aplikaci Codex vypni paměti pro chaty hry.
- Pokud Pán jeskyně hru nezná, napiš ve složce kampaně `rpg init` a otevři nový chat.
- Pokud Windows nenajde `claude`, přidej do PATH složku, kterou uvedl jeho instalátor, a otevři nový terminál.
- Kampaň hraje vždy jen jeden chat: dokud je otevřený tvůj, chat v Přehledu čeká.

---

## 3. Hraní <!-- icon: chat -->

### 3.1 Rozhovor s Pánem jeskyně

Napiš, co tvoje postava dělá nebo říká:

> Ptám se hostinského, kdo další tudy dnes večer procházel.

Ty říkáš, o co se pokoušíš, Pán jeskyně říká, co se stane. Nikdy nerozhoduje za tvou postavu.

Mimo příběh napiš `[OOC: …]` (out of character): *[OOC: Jak funguje zápas v držení?]* Pána jeskyně se můžeš ptát na pravidla nebo na to, jak funguje Přehled.

Když se tě Pán jeskyně na něco zeptá, odpověz jeho tlačítky nebo vlastními slovy. Jednat můžeš i z deníku postavy: klikni na zbraň, kouzlo nebo předmět a vyber, co s tím chceš dělat.

**Trvalé rozkazy**: řekni společníkům něco, co má platit dlouhodobě, třeba *Od teď vždycky jednoho nechte naživu*. Pán jeskyně to drží, dokud to nezrušíš.

### 3.2 Hody

Pán jeskyně žádá o hod, jen když je výsledek nejistý a záleží na něm. Nápis ukáže hod: klikni na něj a kostky padnou.

Kostky patří RPG Engine, ne Pánu jeskyně. Vždy se můžeš zeptat *[Byl ten hod skutečný?]*: i u tajného hodu Pán jeskyně dokáže, že proběhl dřív, než ses zeptal(a).

Když je nastavení **Kostky** na fyzické, hoď si vlastními kostkami a napiš výsledek: *[Padlo mi 14.]* Hody, které děláš pro zábavu, z deníku postavy nebo přes **Volný hod**, se nikdy nepočítají.

### 3.3 Scény, boje a cestování

Příběh běží ve **scénách**: boj, rozhovor, cesta, odpočinek. Na konci každé scény se hra sama uloží a scéna přejde do tvé kroniky.

V boji Pán jeskyně odehraje každý tah, který není tvůj, a zastaví se, když se máš rozhodnout.

Řekni, kam jdeš, *Vydáme se po cestě na sever k Rocce*: RPG Engine spočítá vzdálenost i dny a zastaví se, když se cestou něco stane. Mezitím plány padouchů pokračují a ty vidíš jejich znamení.

### 3.4 Uložené hry

RPG Engine ukládá kampaň na konci každé scény. O tom, kdy se můžeš vrátit, rozhoduje nastavení **Uložené hry**:

- **Trvalá smrt**: nikdy.
- **Checkpoint**: k poslední uložené hře, jen když tvá postava zemře.
- **Volné**: k jakékoli uložené hře a ukládat můžeš, kdy chceš.

V každém režimu můžeš začít znovu, v chatu nebo v **Uložené hry**.

Po návratu zpět otevři nový chat, protože starý si pamatuje, co bylo zrušeno:

1. Stiskni **Zavřít chat**, pak **Nový chat**. Ve vlastním chatu své AI aplikace otevři novou konverzaci (`/clear` v Claude Code).
2. Napiš *Pokračovat*.
3. V Uložených hrách stiskni **Nový chat otevřen**. Dokud to neuděláš, Pán jeskyně čeká.

### 3.5 Přestávka a návrat

Přestaň, kdy chceš: všechno je už uloženo. Zavři okno Přehledu a krátce poté se hra zastaví. Nic se neztratí.

Až se budeš chtít vrátit, otevři RPG Engine z jeho ikony a klikni na svou kampaň. Stiskni **Obnovit chat**, pak **Navázat na příběh**: Pán jeskyně ti řekne, kde příběh stojí, a pokračuje. Příště můžeš zvolit i jinou AI aplikaci.

### 3.6 Meze a stop

**Hranice** se ve hře nikdy neobjeví, **závoje** se odehrávají jen mimo scénu. Nastavuješ je v **Nastavení**.

Kdykoli napiš *[stop]*: Pán jeskyně ten obsah opustí a přidá ho do tvých hranic.

### 3.7 Obrázky

Pán jeskyně může nechat vytvořit obrázky míst, úkolů a postav, podle nastavení **Obrázky**, a také portrét tvé postavy, když o něj požádáš. Vytváří je tvoje AI aplikace, na tvém tarifu. Pokud se žádné neobjeví, **Nastavení** ukáže, jestli je tento počítač umí vytvořit.

Své postavě nebo stránce světa můžeš dát i vlastní obrázek, přímo na dané stránce.

---

## 4. Ovládací panel <!-- icon: party -->

Okno, kde vidíš svou hru. Ukazuje jen to, co tvá postava ví.

- **Hraní rolí**: chat s Pánem jeskyně, když není vedle stránky.
- **Družina**: tvůj deník postavy, deníky společníků a hody.
- **Scéna**: kde jsi, kdo tam je a mapa; v boji tahy.
- **Kronika**: úkoly, příběh jako kniha, deníky společníků a tvé poznámky.
- **Svět**: mapa světa, co tvá postava ví, nalezené dokumenty a kalendář.
- **Uložené hry**: návrat zpět a nový začátek.
- **Nastavení**: jak hraješ a jak stránka vypadá.
- **Balíčky**: herní systém, rozšíření, tvé příručky a aktualizace: když vyjde nový RPG Engine, oznámí to tady.

Pokud stránka hlásí, že není připojená, stiskni **Znovu otevřít kampaň**.

Chceš-li hrát z telefonu doma: v **Nastavení** v části **Přehled** zapni **Přístup z telefonu** a nasnímej kód telefonem, který je ve stejné Wi-Fi jako počítač. Windows se může zeptat, jestli Node.js smí používat síť: povol to v soukromých sítích a nastav Wi-Fi jako soukromou. Hra putuje nešifrovaně: používej to jen v síti, které důvěřuješ, třeba domácí, nikdy ve veřejné, hotelové nebo kancelářské Wi-Fi. Až skončíš, vypni to: hra skončí s posledním oknem počítače.

Pokud je stránka kvůli motivu špatně čitelná, připiš na konec její adresy `#/settings/page` a vypni **Vlastní styl motivu**.

---

## 5. Pravidla, příručky a rozšíření <!-- icon: dice -->

**Herní systém** jsou data jedné hry: deník postavy, tvorové, předměty, kouzla a pravidla. RPG Engine počítá deník postavy. Jak se pravidlo použije, čte a rozhoduje Pán jeskyně, stejně jako u stolu.

**Pátá edice** obsahuje volná pravidla ze System Reference Document 5.1. Můžeš hrát i obsah z knihy, kterou vlastníš: Pán jeskyně ho zapíše do tvé kampaně.

**Tvé příručky**: řekni Pánu jeskyně, kde jsou, nebo přidej jejich složku v **Balíčky**. Pán jeskyně v nich vyhledává pravidla a uvádí knihu a stránku. RPG Engine je nikdy nemění a nikdy je nekopíruje do kampaně.

**Domácí pravidla**: požádej Pána jeskyně, *[House rule: a natural 1 on an attack means you drop your weapon.]* Pravidlo si zapamatuje. Rozhodnutí, které jednou udělá, platí i příště.

**Rozšíření** do hry něco přidávají, třeba počasí. Přidej je v **Balíčky**, nebo o ně požádej Pána jeskyně.

---

## 6. Tvé vlastní dobrodružství <!-- icon: world -->

Když nemáš napsaný svět, Pán jeskyně ho postaví z tvé předlohy a zapamatuje si ho.

Chceš-li hrát dobrodružství nebo knihu, kterou vlastníš, dej Pánu jeskyně její soubor: *[Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* Soubor mimo kampaň se přečte až po tvém souhlasu. Nejlépe se čte jako text, EPUB, Word nebo PDF, ve kterém lze vybrat text.

Celý dokument jde společnosti, která provozuje AI, jež ho čte. Kampaň se hraje jen jednou: chceš-li hrát stejné dobrodružství znovu, vytvoř novou kampaň.

---

## 7. Tvá data <!-- icon: lock -->

- Kampaň je složka. Obsahuje tajemství kampaně i tvé rozhovory s Pánem jeskyně: nikdy ji nemusíš otevírat.
- RPG Engine čte a zapisuje jen v této složce. Tvé příručky jen čte. Cokoli jiného mimo kampaň až po tvém souhlasu, v okně tvého počítače.
- V chatu na dashboardu Pán jeskyně sám od sebe neotevírá žádné tvé soubory.
- Co napíšeš, jde společnosti, jejíž model hraje Pána jeskyně, podle podmínek tvého účtu. S lokálním modelem to zůstává na tvém počítači.
- Herní systém nebo rozšíření, které nejsou naše, jsou kód, který běží na tvém počítači: přijde jen s tvým souhlasem. Souhlas dej jen autorům, kterým důvěřuješ.
- Je-li složka kampaně repozitář git, **Nastavení** ho za tebe umí odevzdat (commit). Své chaty tam pusť, jen když je repozitář soukromý.
- Při zapnutém **Přístup z telefonu** jde hra nešifrovaně z počítače do telefonu přes tvou domácí síť, bez jakékoli externí služby: kdokoli v této síti by ji mohl číst.
