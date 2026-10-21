<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb 63d60934 16d08ee1 75985e6d b8f80c05 8c9f41da 0b4a6ef8 338535a6 728ca4a5 e2839149. Change the English, then run it again. -->
# RPG Engine: a teljes útmutató

Az **RPG Engine** lehetővé teszi, hogy asztali szerepjátékot játssz egy **MI mesélővel**. A mesélővel egy **csevegésben** beszélgetsz; az RPG Engine a háttérben dolgozik: **emlékszik a világra**, **dob a kockákkal** és **vezeti a számokat**. A csevegés mellett egy oldalt tartasz nyitva a böngészőben, ez a **vezérlőpult**, rajta a karakterlapoddal, a kockákkal, a térképekkel és a naplóddal.

Az útmutató játékosoknak szól: nem kell tudnod programozni.

## Gyors kezdés <!-- icon: send -->

1. Telepítsd a **Node.js**-t a [nodejs.org](https://nodejs.org) oldalról (az LTS verziót).
2. Telepíts egy **MI-ügynököt**, azt a programot, amelyben a mesélő fut, és jelentkezz be: például Claude Code vagy Codex ([2.4](#24-connect-your-ai)).
3. Egy terminálban telepítsd az RPG Engine-t: `npm install -g rpg-engine`.
4. Hozz létre egy kampányt: `rpg init "The Salt Isles"`.
5. Lépj be az új mappába: `cd "The Salt Isles"`, és indítsd el ott az ügynöködet: `claude` a Claude Code-hoz, `codex` a Codexhez. Mondj igent, amikor megkérdezi, megbízol-e a mappában ([2.4](#24-connect-your-ai)), aztán írd be: *Szia! Kezdjünk bele.* A mesélő válaszul megadja a vezérlőpulted linkjét.

## 1. Mi az RPG Engine <!-- icon: about -->

| Ki | Mit csinál |
|---|---|
| **Te** | A karakteredet játszod: mit tesz, mit mond, mit próbál meg. |
| **A mesélő** (az MI) | Elmeséli a történetet, mindenki mást játszik, eldönti, mi történik, dobást kér. |
| **RPG Engine** | Fájlokban őrzi a világot, dob a kockákkal, számolja az életerőpontokat, a pénzt, az időt és a távolságokat, és titokban tartja a titkokat, amíg fel nem fedezed őket. |

A világ egyik estéről a másikra ugyanaz marad, új csevegésben is, még másik MI-vel is:

- **Ami elhangzott, igaz marad.** Egy halott főgonosz halott marad.
- **A kockák valódiak.** A mesélő nem tudja elhajlítani őket, kivéve a legkönnyebb nehézségen, ha azt választod.
- **A titkok titkok maradnak.** A mesélő sosem árulja el, amit a karaktered nem tud.
- **A világ mozog.** A fenyegetések haladnak, miközben pihentek vagy utaztok, és látod a jeleiket.
- **A kampány egy mappa** a gépeden: abbahagyhatod, amikor akarod, és később folytathatod.

Az RPG Engine ma egyetlen játékrendszert játszik: az **ötödik kiadást**, az ingyenes System Reference Document 5.1 alapján. Mások is jönnek ([Hamarosan](#9-coming-later)).

---

## 2. Első lépések <!-- icon: path -->

### 2.1 Mire lesz szükséged

- Egy számítógép Windows, macOS vagy Linux rendszerrel, és egy webböngésző.
- **Node.js 22** vagy újabb, a [nodejs.org](https://nodejs.org) oldalról. Ezzel települ az `npm`, amely telepíti az RPG Enginet.
- Egy **terminál**: Windowson a Terminal vagy a PowerShell, macOS-en a Terminal. Ha egy mappában akarsz terminált nyitni, kattints a mappára jobb gombbal, és válaszd a **Megnyitás terminálban** (Windows) vagy a **Szolgáltatások > Új terminál a mappánál** (macOS) menüpontot.
- Egy **AI-ügynök** a mesélőnek ([2.4](#24-connect-your-ai)), a hozzá elérhető **legnagyobb modellel**: egy kis modellt könnyebb rávenni a titkok kiadására vagy a szabályok kijátszására.

### 2.2 Telepítés

```text
npm install -g rpg-engine
```

Az `rpg --version` parancs megmutatja, hogy sikerült-e. Az `rpg` parancsot kampányonként egyszer használod, a létrehozáshoz. Utána az ügynököd magától elindítja az RPG Enginet.

### 2.3 Kampány létrehozása

Nyiss egy terminált abban a mappában, ahol a játékaidat tartod (a [2.1](#21-what-you-need) leírja, hogyan):

```text
rpg init "The Salt Isles"
```

Ez létrehozza a `The Salt Isles` mappát egy új kampánnyal. Lépj be a mappába a `cd "The Salt Isles"` paranccsal. Jegyezd meg, hol van: minden játékalkalommal ide térsz vissza. Mindent mást később választasz ki, a chatben vagy a vezérlőpulton. Az `rpg init --help` felsorolja azokat a kapcsolókat, amelyekkel néhány dolgot már most megadhatsz, például `--language it` vagy `--difficulty hard`.

A mesélő nem tud kampányt létrehozni helyetted: az `init` előtt semmi sem mondja meg az ügynöködnek, hol van az RPG Engine.

### 2.4 Az AI csatlakoztatása

A mesélő egy **AI-ügynökben** fut. Ez egy olyan AI-alkalmazás, terminálban vagy asztali gépen, amely dolgozhat a számítógéped fájljaival, például a Claude Code vagy a Codex. Egy sima chat, például a claude.ai vagy a ChatGPT, illetve egy telefonos alkalmazás nem elég: a mesélőnek el kell érnie a kampány fájljait a számítógépeden. Minden ügynökhöz saját előfizetés és bejelentkezés kell: a Claude Code-hoz fizetős Claude-előfizetés, a Codexhez ChatGPT-fiók. Egyszer kell telepítened, a saját oldaláról: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: a kampány mappájában írd be: `claude`. Amikor megkérdezi, megbízol-e a mappában, válaszd a **Yes, I trust this folder** lehetőséget. Figyelem: az előre kijelölt válasz a *No, exit*.
- **Codex**: a kampány mappájában írd be: `codex`, és mondj igent, amikor megkérdezi, megbízol-e a mappában. Az asztali alkalmazásában a beállításoknál ellenőrizd, hogy a játék chatjeihez ki van kapcsolva a memória.
- **Másik ügynök**: indítsd el a kampány mappájában, és add meg neki az `rpg mcp` MCP-szervert. Az RPG Engine szabványos MCP-szerver: bármelyik, MCP-t támogató ügynök lehet a mesélő, a helyi futtatásúak is.

**Claude Code-dal** játszunk és tesztelünk. A **Codex** csatlakoztatva és ellenőrizve van, de még nem játszottunk végig vele teljes kampányt. Az `init` a **Gemini CLI**-t is beállítja. A kampány kikapcsolja az ügynök saját memóriáját: a játék a fájljaiban él, így egy mentéshez való visszatérés tényleg visszavisz.

### 2.5 Az első chat

Írj bármit, például: *Szia! Kezdjük el.* A mesélő minden chat első válaszában megadja a **vezérlőpultod linkjét**, valahogy így: `http://127.0.0.1:4750`. Nyisd meg, és tartsd a chat mellett.

A mesélő üzenetei között az ügynököd megmutatja az általa használt eszközöket. Ne nyisd meg a részleteiket (Claude Code-ban ctrl+o), mert titkokat is mutathatnak.

Az új kampány három szakaszon megy át, ezeket a vezérlőpult tetején látod: **1 Beállítások** (hogyan szeretnél játszani), **2 Nulladik alkalom** (megalkotod a karaktered, játék közben), **3 Játék**.

### 2.6 Beállítások: így játszol majd

A mesélő csak azt kérdezi, ami még hiányzik, egyszerre néhány kérdést. A vezérlőpult **Beállítások** lépése ugyanezeket a kérdéseket kártyákon mutatja. Ha azt írod: „döntsd el te”, a mesélő választ. Minden megváltoztatható később, a chatben vagy a **Beállítások** között.

| Beállítás | Miről dönt | Értékek |
|---|---|---|
| **Mentor** | Mennyire tanítja a mesélő a szabályokat | off, hints, tutorial |
| **Nehézség** | Mennyire kemény a világ | story, easy, normal, hard, brutal |
| **Halálosság** | Mit jelent, ha elesel a harcban | narrative (soha nem halsz meg), epic (csak ha számít), dice |
| **Mentések** | Mikor mehetsz vissza | permadeath, checkpoint, free ([3.8](#38-saves-and-going-back)) |
| **Szigor** | Mennyire követi szigorúan a szabályokat az étel, a fény és az utazás | smooth, rules, simulation |
| **Kockák** | Ki dobja a kockáidat | digital, physical |
| **Mértékegységek** | Távolságok és súlyok | metric, imperial |
| **Hangok** | Ki beszél a megismert szereplők helyett: kulcsfontosságú pillanatokban maga a szereplő, csak azt tudva, amit ő tud, ahogy a mesélő választja; mindig a mesélő; vagy mindig maga a szereplő, a főbbeknél vagy mindenkinél, lassabban és drágábban, ha az AI-alkalmazásod képes rá | auto, master, important, always |
| **Társak** | Ki utazik veled | none, made with you, made by the master, met in play |
| **Képek** | Képek a helyszínekről, a küldetésekről és a megismert szereplőkről | none, on request, new places, quests and those you meet ([3.11](#311-pictures)) |
| **Határok** és **Fátylak** | Ami soha nem jelenik meg, és ami csak színfalak mögött történik | listák |
| **Nyelv** | A játék és a vezérlőpult nyelve | bármelyik |

Az ötödik kiadás kiegészül a **fejlődéssel**: tapasztalati pontokkal vagy mérföldkövekkel.

Ha nincs megírt világ, a mesélő egy **alaptörténetet** is kérdez (műfaj, hangulat, néhány elem, a saját szavaiddal), és a **felkészülést**: a világot menet közben építse fel, vagy az elején, egyben.

**A mesélő stílusát** a mesélő sosem kérdezi, de a chatben vagy a **Beállítások** között megváltoztathatod: a **próza** (egyszerű, irodalmias, pulp, szarkasztikus), a kitalált **történetek** (helyzetek, ívek, epizódok, rejtély), egy szerző, akihez **hasonlóan írjon**, vagy bármi más **a saját szavaiddal**.

### 2.7 Nulladik alkalom: a karaktered

A karaktered a mesélővel együtt alkotod meg, mint az asztalnál. Minden döntés a tiéd, hacsak nem kéred meg a mesélőt, hogy döntsön helyetted: jöhetsz kész ötlettel, homályossal, vagy semmivel. A mesélő még az első dobás előtt elmondja, hogyan születnek a képességpontok. A történeted megírása sosem kötelező. Ha adsz egyet, a mesélő a te szavaiddal írja le. Végül a mesélő képet kér a karakteredről ([3.7](#37-your-characters-story-and-picture)). Az RPG Engine kiszámolja a karakterlapot: neked sosem kell számolnod.

---

## 3. Játék <!-- icon: chat -->

### 3.1 Beszélgetés a mesélővel

Írd le, mit tesz vagy mond a karaktered, saját szavaiddal:

> Megkérdezem a fogadóst, ki járt még itt ma este.

A történeten kívül szögletes zárójelben írj: *[Hogyan működik a dulakodás?]* A mesélő is zárójelben válaszol.

Te azt mondod meg, mit próbálsz meg; a mesélő azt, mi történik. A mesélő sosem dönt a karaktered helyett, és sosem beszél a motorról. Megkérdezheted tőle, hogyan használd a dashboardot.

### 3.2 Dobások

A mesélő csak akkor kér dobást, ha a kimenetel bizonytalan és számít, és előbb elmondja, mi forog kockán. Ezután:

- **A dashboardon** egy sáv jelenik meg minden próbához egy gombbal, például: *Akrobatika +4 · előnnyel*. Kattints rá: a kockák a lapon hullanak le, és a mesélő meghallja az eredményt. Rákattinthatsz a karakterlapod kivilágított sorára is, dobhatsz a dobótálcáról, vagy írhatsz valami mást a sávba.
- **Kézzel**, a sáv sarkában vagy a **Beállítások** között: a sáv megmondja, mit kell dobnod, te pedig a karakterlapodról vagy a dobótálcáról dobod.
- **Fizikai kockákkal**, ha a kockabeállítás fizikaira van állítva: leírod a dobott számokat, *[14-et dobtam.]*, és az RPG Engine hozzáadja a módosítóidat.

**Szabad dobások**: kattints bármelyik számra a karakterlapodon, vagy nyisd meg a dobótálcát, és dobj a móka kedvéért. Ezek sosem számítanak, és a mesélő sosem látja őket.

**A mesélő dobásai** megjelennek a dobásoszlopodban, a titkosak kivételével. Mindig megkérdezheted: *[Valódi volt az a dobás?]* Titkos dobásnál a mesélő ujjlenyomatot ad, ami bizonyítja, hogy a dobás még azelőtt megtörtént, hogy rákérdeztél.

### 3.3 Jelenetek és harcok

A történet **jelenetekben** zajlik: harc, beszélgetés, felfedezés, utazás, pihenő. Minden jelenet végén a játék magától ment, és a jelenet bekerül a naplódba.

Harcban a mesélő elmondja az összes kört, ami nem a tiéd, és ott áll meg, ahol dönthetsz. A **Jelenet** felül mutatja, kinek a köre van és ki jön utána, a karaktered kártyáját pedig a térkép mellett; a körök sorrendje, a csapatod életereje és az ellenfelek sérülésének látszata szavakkal az oldal szélén marad. Ha a karaktered elesik, a halálmentők nagyban megjelennek az oldalon.

### 3.4 Idő, utazás és a mozgó világ

Az RPG Engine vezeti a dátumot; az alkalmak között nem telik az idő. Mondd el, hogy pihentek, *Hosszú pihenőt tartunk*, és a pihenő visszaadja, amit kell. Mondd meg, merre mentek, *Északra indulunk Rocca felé*, és az RPG Engine kiszámolja az utat, a távolságot és a napokat, és megáll, ha útközben történik valami. A pénzt a játék érméiben számoljuk, a visszajáróval együtt.

A gonosztevőknek vannak tervei határidőkkel. Minden új napon a mesélő előremozdítja azokat a fenyegetéseket, amelyeket az idő előrébb vitt, te pedig a jeleiket látod, az órát magát sosem.

### 3.5 Térképek

A **Világ** megmutatja a karaktered által ismert helyszíneket, a köztük futó utakat és a bejárt ösvényt, a többit köd borítja. A **Jelenet** megmutatja annak a helynek a térképét, ahol vagy, ha van neki, és hogy ki hol áll; harcban, a te körödben, az el nem érhető mezők el vannak fátyolozva. Amikor a mesélő megkérdezi, hová lépsz, érints meg egy mezőt, vagy írd le, például *E4*.

### 3.6 Küldetések, napló és jegyzetek

Ha a karaktered vállal egy feladatot, az küldetés lesz a **Naplóban**, céljaival, határidejével és azzal, amit mér; jelöld meg csillaggal, hogy a Jelenet tetején szem előtt maradjon. A Napló jelenetről jelenetre elmeséli a **történetedet** is, és őrzi a **jegyzeteidet**: ezek privátak, hacsak nem **Megosztod** valamelyiket, amit a mesélő úgy hall, mint amit gondolsz, sosem mint tényt.

### 3.7 A karaktered története és képe

A karakterlapodon a **Leírás** kártyán van egy mező a karaktered történetének: a mesélő írja bele, miután igent mondtál. Képhez adj a mesélőnek egy fájlt (PNG, JPEG, WebP vagy SVG, legfeljebb 5 MB), és told meg, hol van a számítógépeden, vagy készíttess portrét ([3.11](#311-pictures)): *[Készíts nekem egy portrét: copfba font ősz haj, heg az állán.]*

### 3.8 Mentések és visszalépés

Az RPG Engine minden jelenet végén menti az egész kampányt. A többit a **mentések** beállítás dönti el:

| Mentések | Mentés, amikor akarod | Visszalépés |
|---|---|---|
| **permadeath** | nem | soha |
| **checkpoint** | nem | az utolsó mentésre, csak ha a karaktered meghal |
| **free** | igen | bármelyik mentésre |

Minden módban **újrakezdheted** a játékot a játék elejéről vagy a nulladik alkalomtól. Tedd ezt a csevegésben vagy a **Mentések** között.

Visszalépés után **nyiss új csevegést**: a régi emlékszik arra, ami visszavonásra került. Írd az új csevegésbe, hogy *folytatjuk*, majd nyomd meg a **Megnyitottam az új csevegést** gombot a Mentések között.

### 3.9 Alkalmak: megállás és visszatérés

Állj meg, amikor akarsz: *[Mára itt abbahagyjuk.]* Minden már el van mentve a fájlokba. A visszatéréshez indítsd el az ügynöködet a kampány mappájában, és írd be: *folytatjuk*. A mesélő rövid összefoglalót ad, és megy tovább.

### 3.10 A mesélő hangulata

A dashboard tetején lévő robot a mesélő: az arca követi a történet hangulatát, és sosem árul el olyat, amit még nem tudhatsz. Amikor a csevegés zárva van, alszik.

### 3.11 Képek

Az RPG Engine képeket készíthet az általad elért helyszínekről, a vállalt küldetésekről és azokról, akikkel találkozol, ahogy a **képek** beállítás előírja, valamint a karaktered portréját, ha kéred. Azt használja, ami a számítógépeden van, a saját bejelentkezéseddel: a **Codex** fest, ha az nincs, a **Claude Code** rajzol. A **Beállítások** megmondja, hogy ez a gép tud-e képet készíteni, és ha nem, hogyan állítsd be. A mesélőnek mindig adhatsz saját képet.

### 3.12 Biztonság: határok, fátylak és stop

A **határok** soha nem jelennek meg a játékban; a **fátylak** csak a színfalak mögött történnek. Bármikor írd be: *[stop]*. A mesélő azonnal elhagyja azt a tartalmat, és felveszi a határaid közé.

### 3.13 Meggondolod magad

Minden beállítás megváltoztatható, a csevegésben vagy a **Beállításokban**. Ha a mesélő a szabálykönyv nélkül hoz döntést, abból **precedens** lesz, így ugyanarra a kérdésre legközelebb ugyanazt a választ kapod.

---

## 4. A dashboard <!-- icon: party -->

Egy oldal a saját számítógépeden, csak az adott gép böngészőjében nyílik meg, és amíg a csevegés nyitva van, él. Amikor a csevegés bezárul, ezt mutatja: *Not connected*; a következő csevegéssel magától visszatér.

- **Csapat**: a te karakterlapod és a társaidé. Kattints egy számra a dobáshoz; vidd fölé az egeret, hogy lásd, honnan jön. Mellette a dobások.
- **Jelenet**: hol vagy, a képe és a térképe, ki van ott, mi történik; harcban a körök és a karaktered kártyája.
- **Napló**: küldetések, a történet, a jegyzeteid.
- **Világ**: a világtérkép úgy, ahogy a karaktered ismeri.
- **A dobótálca**: válassz kockákat és módosítót, és dobj.
- **Mentések**, **Súgó**, **Beállítások** és **Névjegy**, ikonokként a sor végén. A Beállítások tartalmazzák az oldal saját beállításait is: téma, kockahang, kockakészlet.

Amikor a mesélő kérdez tőled valamit, a sávja felül marad, bármelyik részben vagy is.

---

## 5. Játékrendszerek és házszabályok <!-- icon: dice -->

### 5.1 Mi az a játékrendszer

Egy játék adatai: a karakterlapja, a számai, a lényei, tárgyai, varázslatai és a szabályszövege. Minden kampány egy rendszert játszik. Az RPG Engine kiszámolja a karakterlapot, valamint azt, mi fogy el és mi tér vissza; hogy egy képesség hogyan működik, azt a mesélő elolvassa a szabályokban és eldönti, mint az asztalnál.

### 5.2 Ötödik kiadás, mellékelve

Az SRD 5.1 fajai, kasztjai, altípusai, egy háttér és egy képesség; a 319 varázslat, a fegyverek, páncélok, mágikus tárgyak és szörnyek; a szabályfejezetek, amelyeket a mesélő pontos szövegük szerint olvas; a teljes, kiszámolt karakterlap.

Játszhatsz olyan tartalmat is, ami nincs az SRD-ben, egy saját könyvedből: a mesélő a kampányod oldalaiként írja meg, és az RPG Engine a sajátjaként kezeli. Az RPG Engine csak nyílt tartalmat szállít; amit a mesélőd tud, azt semmi sem korlátozza.

### 5.3 Házszabályok és saját kiegészítések

Kérd meg a mesélőt: *[Házszabály: a természetes 1-es támadásnál elejted a fegyvered.]* Az asztal megállapodásaként megőrzi, vagy ha kell, ír hozzá egy oldalt vagy egy számot a karakterlapra. A már kiírt házszabályok szövegfájlként mehetnek a kampány `rules` mappájába.

### 5.4 Saját játékrendszer hozzáadása vagy importálása

Még nem: ma az RPG Engine csak az ötödik kiadást játssza ([Hamarosan](#9-coming-later)).

---

## 6. Bővítmények <!-- icon: plus -->

Még nem. Egy bővítmény a játékrendszeren felül ad hozzá valamit a kampányhoz: egy világot, egy kalandot, egy olyan funkciót, mint az időjárás, megosztható házszabályokat.

---

## 7. Honnan jön a kampány, és a nyelve <!-- icon: world -->

### 7.1 A világ három forrása

- **Menet közben alkotva**: az alaptörténetedből a mesélő minden helyszínt, személyt és cselekményszálat közvetlenül azelőtt épít fel, hogy szükséged lenne rá, és megőrzi.
- **Az elején előkészítve**: ugyanez, de a világ a játék előtt készül el.
- **Saját kalandból**: adj a mesélőnek egy szöveget vagy PDF-et, és kérd meg, hogy állítsa be, *[Állítsd be ezt a kalandot kampánynak. Ne mondj el semmit, ami benne van.]* Megírja a helyszíneket, a szereplőket és a titkokat. Importálás gomb még nincs.

A kampányt egyszer lehet végigjátszani: ha ugyanazt a kalandot újra szeretnéd játszani, hozz létre új kampányt.

### 7.2 Nyelvek

Kampányonként egy nyelv van, a mesélőé, amelyet a vezérlőpult követ. A vezérlőpult 26 nyelven érkezik. Bármelyik másikat a gépeden a Codex vagy a Claude Code fordítja le, vagy ezek nélkül a mesélő a csevegésben. Az ötödik kiadás olasz kifejezései a hivatalos olasz SRD-ből származnak; a szabályszöveg angol marad, és a mesélő a te nyelveden mondja el.

---

## 8. A kíváncsiaknak: a kampánymappa <!-- icon: list -->

Soha nem kell megnyitnod, és a kampányod titkait őrzi. Ezek vannak benne: `campaign.yaml` (a beállításaid), `state.yaml` (hol tart a játék), `world/` (egy markdown oldal minden karakterhez, helyszínhez, küldetéshez és a többihez), `rules/` (a házi szabályaid), `images/`, `log.jsonl` (minden változás), `.saves/`, `.player/` (a jegyzeteid), valamint a kis fájlok, amelyek megmutatják az AI-ügynököknek, hol van az RPG Engine. Az oldalak az Obsidian formátumát használják. Ha kézzel módosítasz egy oldalt, a mesélő a következő válaszánál értesül róla.

Az RPG Engine ebben a mappában marad: a játékot csak itt olvassa és írja, a többi fájlodhoz soha nem nyúl. Rajta kívül csak egy saját adatmappát tart (a dashboard fordításait, valamint a Codexet és a Claude Code-ot, ha engeded, hogy telepítse őket), meg ideiglenes mappákat, amíg egy kép készül. Ha az ügynököd bármi mást akar tenni a számítógépeden, előbb megkérdez.

A mesélő minden parancsa kiadható a kampánymappában is: az `rpg --help` felsorolja őket. Sok közülük kiírja a kampány titkait.

---

## 9. Hamarosan <!-- icon: hourglass -->

- **Te mint mesélő**, az MI pedig a csapatot játssza.
- **Szerzői mód**: írj kalandot az MI-vel, aztán exportáld és oszd meg.
- **Több játékos ugyanazon a gépen**, mindegyik a saját karakterével, felváltva ugyanabban a csevegésben.
- **Bővítmények**: beállítások, kalandok, funkciók és házszabályok.
- **Importálás**: a saját kézikönyveid és kalandjaid.
- **Más játékok**: több játékrendszer, és a saját rendszered.

---

## 10. Kérdések és problémák <!-- icon: info -->

### Kérdések

**Ismernem kell a szabályokat?** Nem. Válaszd a bemutató mentort, és kérdezz zárójelben, amikor csak szeretnél.

**Csalhat a mesélő?** Nem tud megváltoztatni egy dobást, amelyet az RPG Engine végzett, kivéve a mese nehézségen, és a már rögzített tényeket sem.

**Kerül pénzbe?** Az RPG Engine ingyenes. A mesélő az ügynököd csomagján fut, vagy a saját gépeden egy helyi modellel. Egy játékest hosszú csevegés: a legkisebb csomagokon elérheted a csomag korlátját, mielőtt az este véget érne. A képek és a fordítások ugyanazt a csomagot használják.

**Játszhatok a telefonomon?** Nem: a mesélő a számítógépeden fut, és a vezérlőpult csak ott nyílik meg.

**Játszhatok barátokkal?** Még nem: ma egy játékos, egy karakter, plusz társak ([Hamarosan](#9-coming-later)).

**Használhatok legközelebb másik MI-t?** Igen: nyisd meg a kampányt egy másik ügynökben, és írd be: *folytatás*.

### Problémák

**A vezérlőpult nem nyílik meg.** Kérdezd meg a mesélőt: `[Mi a vezérlőpult linkje?]`. Csak akkor működik, amíg abban a kampányban nyitva van egy csevegés, a mesélő első válasza után.

**A mesélő úgy tűnik, nem ismeri a játékot.** Az ügynököd nem töltötte be az RPG Engine-t. Ellenőrizd, hogy a kampány mappájában indítottad-e el, és megbíztál-e benne. Claude Code-ban írd be: `/mcp`, és csatlakoztasd újra az `rpg`-t. Codexben a `codex mcp list` parancsnak a kampány mappájában mutatnia kell az `rpg`-t. Ha az `rpg --version` nem található, telepítsd újra az RPG Engine-t ([2.2](#22-install)).

**Frissítés.** Futtasd újra az `npm install -g rpg-engine` parancsot, aztán nyiss új csevegést: egy már futó mesélő azt a verziót tartja meg, amellyel elindult.

**A mesélő emlékszik valamire, amit visszacsináltam.** Nyiss új csevegést, és nyomd meg a **Megnyitottam az új csevegést** gombot a Mentésekben.

**Nem jelennek meg képek.** A Beállítások > Képek megmondja, hogy ez a gép tud-e képet készíteni, és hogyan.

**A telepítés nem sikerül, vagy az `rpg` nem indul.** A `node --version` parancsnak 22-t vagy újabbat kell mutatnia. Windowson ne tartsd az RPG Engine-t és a kampányaidat olyan útvonalakon, amelyekben `&` van.

**A vezérlőpult linkje megváltozott.** Egy másik program elvette a szokásos címet; a mesélő megadja az új linket.
