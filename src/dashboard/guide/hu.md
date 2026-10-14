<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb f4fdeebb 80a7cfb9 23c5f59b b8f80c05 8c9f41da 0b4a6ef8 338535a6 728ca4a5 e2839149. Change the English, then run it again. -->
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

## 2. Az első lépések <!-- icon: path -->

### 2.1 Mire van szükséged

- Egy számítógépre Windows, macOS vagy Linux rendszerrel, és egy böngészőre.
- **Node.js 22** vagy újabb, a [nodejs.org](https://nodejs.org) oldalról. Ezzel együtt jön az `npm`, amely az RPG Engine-t telepíti.
- Egy **terminálra**: Windowson a Terminal vagy a PowerShell, macOS-en a Terminal. Hogy egy mappában nyiss egyet, kattints jobb gombbal a mappára, és válaszd a **Megnyitás a Terminálban** (Windows) vagy a **Szolgáltatások > Új terminál a mappában** (macOS) menüpontot.
- Egy **MI-ügynökre** a mesélőnek ([2.4](#24-connect-your-ai)), a hozzá elérhető **legnagyobb modellel**: egy kis modellt könnyebb rávenni, hogy titkokat áruljon el, vagy kitérjen a szabályok elől.

### 2.2 Telepítés

```text
npm install -g rpg-engine
```

Az `rpg --version` parancs ellenőrzi, hogy sikerült-e. Az `rpg` parancsot kampányonként egyszer használod, a létrehozáshoz; utána az ügynököd magától elindítja az RPG Engine-t.

### 2.3 Kampány létrehozása

Nyiss egy terminált abban a mappában, ahol a játékaidat tartod (a [2.1](#21-what-you-need) leírja, hogyan):

```text
rpg init "The Salt Isles"
```

Ez létrehozza a `The Salt Isles` mappát egy új kampánnyal; lépj be a `cd "The Salt Isles"` paranccsal. Jegyezd meg, hol van: minden játékkor ide térsz vissza. Minden mást később választasz meg, a csevegésben vagy a vezérlőpulton; az `rpg init --help` felsorolja azokat a beállításokat, amelyeket már most megadhatsz, például `--language it` vagy `--difficulty hard`.

A mesélő nem tud kampányt létrehozni helyetted: az `init` előtt semmi sem mondja meg az ügynöködnek, hol van az RPG Engine.

### 2.4 Az MI összekapcsolása

A mesélő egy **MI-ügynökben** fut: ez egy MI-alkalmazás, a terminálban vagy az asztalon, amely tud dolgozni a számítógéped fájljaival, például a Claude Code vagy a Codex. Egy sima csevegő, mint a claude.ai vagy a ChatGPT, vagy egy telefonos app nem elég: a mesélőnek el kell érnie a kampány fájljait a gépeden. Minden ügynöknek saját előfizetése és bejelentkezése van: a Claude Code-hoz fizetős Claude-csomag kell, a Codexhez ChatGPT-fiók. Egyszer kell telepítened, a saját oldaláról: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: a kampány mappájában írd be: `claude`. Amikor megkérdezi, megbízol-e a mappában, válaszd a **Yes, I trust this folder** lehetőséget; vigyázz, az előre kijelölt válasz a *No, exit*.
- **Codex**: a kampány mappájában írd be: `codex`, és mondj igent, amikor megkérdezi, megbízol-e a mappában. Az asztali appjában ellenőrizd a beállításokban, hogy a játék csevegéseinél ki vannak kapcsolva a memóriák.
- **Másik ügynök**: indítsd el a kampány mappájában, és add meg neki az `rpg mcp` MCP-szervert. Az RPG Engine szabványos MCP-szerver: bármelyik MCP-t támogató ügynök lehet a mesélő, a helyiek is.

**Claude Code-dal** játszunk és tesztelünk; a **Codex** csatlakoztatva és ellenőrizve van, de még egyetlen teljes kampányt sem játszottak végig vele; az `init` a **Gemini CLI**-t is beállítja. A kampány kikapcsolja az ügynök saját memóriáját: a játék a fájlokban él, így a mentéshez való visszatérés tényleg visszavisz.

### 2.5 Az első csevegés

Írj bármit, például: *Szia! Kezdjünk bele.* A mesélő minden csevegés első válaszában megadja a **vezérlőpulted linkjét**, valami ilyesmit: `http://127.0.0.1:4750`. Nyisd meg, és tartsd a csevegés mellett.

A mesélő üzenetei között az ügynököd megmutatja a használt eszközöket: ne nyisd meg a részleteiket (Claude Code-ban ctrl+o), mert titkokat mutathatnak.

Egy új kampány három szakaszon megy át, ezek a vezérlőpult tetején látszanak: **1 Beállítások** (hogyan szeretnél játszani), **2 Nulladik alkalom** (megalkotod a karaktered, játékban), **3 Játék**.

### 2.6 Beállítások: hogyan játszol

A mesélő csak azt kérdezi, ami még hiányzik, egyszerre néhány kérdést; a vezérlőpult **Beállítások** lépése ugyanezeket a kérdéseket kártyákon mutatja. Írd, hogy „döntsd el te", és a mesélő választ. Minden megváltoztatható később, a csevegésben vagy a **Beállításokban**.

| Beállítás | Mit dönt el | Értékek |
|---|---|---|
| **Mentor** | Mennyit tanítja a mesélő a szabályokat | ki, tippek, bemutató |
| **Nehézség** | Milyen kemény a világ | mese, könnyű, normál, nehéz, kegyetlen |
| **Halálosság** | Mit jelent egy harcban elesni | elbeszélő (sosem halsz meg), epikus (csak ha számít), kockák |
| **Mentések** | Mikor mehetsz vissza | végleges halál, ellenőrzőpont, szabad ([3.8](#38-saves-and-going-back)) |
| **Szigor** | Mennyire követik szigorúan a szabályokat az étel, a fény és az utazás | gördülékeny, szabályok, szimuláció |
| **Kockák** | Ki dob a kockáiddal | digitális, fizikai |
| **Mértékegységek** | Távolságok és súlyok | metrikus, birodalmi |
| **Társak** | Ki utazik veled | senki, veled alkotott, a mesélő alkotta, játék közben megismert |
| **Képek** | Képek a helyszínekről, küldetésekről és akikkel találkozol | nincs, kérésre, új helyszínek, küldetések és akikkel találkozol ([3.11](#311-pictures)) |
| **Határok** és **Fátylak** | Ami sosem jelenik meg, és ami csak színfalak mögött történik | listák |
| **Nyelv** | A játék és a vezérlőpult nyelve | bármelyik |

Az ötödik kiadás hozzáteszi a **fejlődést**: tapasztalati pontok vagy mérföldkövek.

Ha nincs megírt világ, a mesélő egy **alaptörténetet** is kérdez (műfaj, hangvétel, néhány elem, a te szavaiddal), és az **előkészítést**: a világot menet közben építse fel, vagy az elején mindet.

**A mesélő stílusát** sosem kérdezi, de megváltoztathatod a csevegésben vagy a **Beállításokban**: a **próza** (egyszerű, irodalmi, ponyva, szarkasztikus), az általa kitalált **történetek** (helyzetek, ívek, epizódok, rejtély), egy szerző, akiként **írjon**, vagy bármi más **a saját szavaiddal**.

### 2.7 Nulladik alkalom: a karaktered

A karaktered a mesélővel együtt alkotod meg, mint az asztalnál. Minden választás a tiéd, hacsak nem kéred meg a mesélőt, hogy döntsön: jöhetsz kész ötlettel, homályossal, vagy semmivel. A mesélő elmondja, hogyan készülnek a képességpontok, mielőtt bármelyik kockát eldobnád. A történeted soha nem kötelező; ha megadsz egyet, a mesélő a te szavaiddal írja le. Ezután a mesélő képet kér a karakteredről ([3.7](#37-your-characters-story-and-picture)). Az RPG Engine kiszámolja a karakterlapot: neked sosem kell számolnod.

---

## 3. Játék <!-- icon: chat -->

### 3.1 Beszélgetés a mesélővel

Írd le, mit tesz vagy mond a karaktered, a saját szavaiddal:

> Megkérdezem a fogadóst, ki járt még itt ma este.

A történeten kívül szögletes zárójelek közé írj: *[Hogyan működik a dulakodás?]* A mesélő is zárójelben válaszol.

Te mondod meg, mit próbálsz meg; a mesélő mondja meg, mi történik. A mesélő sosem dönt a karaktered helyett, és sosem beszél a motorról. Megkérdezheted tőle, hogyan használd a vezérlőpultot.

### 3.2 Dobások

A mesélő csak akkor kér dobást, ha a kimenetel bizonytalan és számít, és előbb elmondja, mi forog kockán. Ezután:

- **A vezérlőpulton** egy szalag minden próbához mutat egy gombot, például *Akrobatika +4 · előnnyel*. Kattints rá: a kockák leesnek az oldalon, és a mesélő hallja az eredményt. Rákattinthatsz a karakterlapod kivilágított sorára is, dobhatsz a dobótálcáról, vagy írhatsz valami mást a szalagba.
- **Kézzel**, a szalag sarkában vagy a **Beállításokban**: a szalag megmondja, mit dobj, te pedig a karakterlapodról vagy a dobótálcáról dobsz.
- **Fizikai kockák**, ha a kockák beállítása fizikai: beírod a dobott számokat, *[14-et dobtam.]*, és az RPG Engine hozzáadja a módosítóidat.

**Szabad dobások**: kattints bármelyik számra a karakterlapodon, vagy nyisd meg a dobótálcát, és dobj kedvedre. Ezek sosem számítanak, és a mesélő sosem látja őket.

**A mesélő dobásai** megjelennek a dobásoszlopodban, a titkosak kivételével. Mindig megkérdezheted: *[Valódi volt az a dobás?]*: titkos dobásnál a mesélő megad egy ujjlenyomatot, amely bizonyítja, hogy a kérdésed előtt történt.

### 3.3 Jelenetek és harcok

A történet **jelenetekben** zajlik: harc, beszélgetés, felfedezés, utazás, pihenő. Minden jelenet végén a játék magától ment, és a jelenet bekerül a naplódba.

Harcban a mesélő elmondja minden olyan kört, ami nem a tiéd, és ott áll meg, ahol dönthetsz. A **Harc** szakasz mutatja a körök sorrendjét, a csapatod életerőpontjait, és hogy az ellenségek mennyire tűnnek sérültnek, szavakkal. Ha a karaktered elesik, a halálmentések nagyban megjelennek az oldalon.

### 3.4 Idő, utazás és a mozgó világ

Az RPG Engine vezeti a dátumot; alkalmak között nem telik az idő. Mondd, hogy pihentek, *Hosszú pihenőt tartunk*, és a pihenő visszahozza, amit kell. Mondd meg, hová mentek, *Észak felé indulunk Rocca irányába*, és az RPG Engine kiszámolja az utat, a távolságot és a napokat, és megáll, ha útközben történik valami. A pénzt a játék érméiben számolja, a visszajáróval együtt.

A gonoszoknak terveik vannak határidővel. Minden új napon a mesélő továbbmozgatja azokat a fenyegetéseket, amelyeket az idő előrevitt, és te látod a jeleiket, az órát magát sosem.

### 3.5 Térképek

A **Világ** megmutatja a karaktered által ismert helyszíneket, a köztük futó utakat és a megtett nyomvonalat, a többi felett köddel. A **Jelenet** megmutatja annak a helynek a térképét, ahol vagy, ha van neki, azzal együtt, hogy ki hol áll; harcban, a te körödben a számodra elérhetetlen mezők el vannak fátyolozva. Amikor a mesélő megkérdezi, hová lépsz, érints meg egy mezőt, vagy írd be, például *E4*.

### 3.6 Küldetések, napló és jegyzetek

Amit a karaktered vállal, az küldetés lesz a **Naplóban**, céljaival, határidejével és azzal, amit mér; jelöld csillaggal, hogy a Jelenet tetején szem előtt maradjon. A Napló elmeséli a **történetedet** is, jelenetről jelenetre, és őrzi a **jegyzeteidet**: ezek privátak, hacsak nem **Megosztasz** egyet, amit a mesélő úgy hall, mint amit gondolsz, sosem mint tényt.

### 3.7 A karaktered története és képe

A karakterlapodon a **Leírás** kártyán van egy mező a karaktered történetének: a mesélő írja bele, miután igent mondtál. Képhez adj a mesélőnek egy fájlt (PNG, JPEG, WebP vagy SVG, legfeljebb 5 MB) azzal, hogy hol van a gépeden, vagy készíttess egy portrét ([3.11](#311-pictures)): *[Készíts egy portrét: ősz haj copfba fonva, heg az állon.]*

### 3.8 Mentések és visszatérés

Az RPG Engine minden jelenet végén elmenti az egész kampányt. A többit a **mentések** beállítás dönti el:

| Mentések | Mentés, amikor akarod | Visszatérés |
|---|---|---|
| **végleges halál** | nem | soha |
| **ellenőrzőpont** | nem | az utolsó mentéshez, csak ha a karaktered meghal |
| **szabad** | igen | bármelyik mentéshez |

Minden módban **újrakezdheted**, a játék elejéről vagy a nulladik alkalomtól. Ezt megteheted a csevegésben vagy a **Mentésekben**.

Visszatérés után **nyiss új csevegést**: a régi emlékszik arra, ami visszacsinálódott. Írd be az új csevegésben: *folytatás*, aztán nyomd meg a **Megnyitottam az új csevegést** gombot a Mentésekben.

### 3.9 Alkalmak: abbahagyás és visszatérés

Hagyd abba, amikor akarod: *[Mára itt abbahagyjuk.]* Minden már el van mentve a fájlokban. A visszatéréshez indítsd el az ügynöködet a kampány mappájában, és írd be: *folytatás*: a mesélő rövid összefoglalót ad, és megy tovább.

### 3.10 A mesélő hangulata

A vezérlőpult tetején lévő robot a mesélő: az arca követi a történet hangulatát, és sosem árulja el, amit még nem tudsz. Amikor a csevegés be van zárva, alszik.

### 3.11 Képek

Az RPG Engine képeket készíttethet azokról a helyekről, ahová eljutsz, a küldetésekről, amiket vállalsz, és azokról, akikkel találkozol, ahogy a **képek** beállítás mondja, és a karaktered portréját, ha kéred. Azt használja, ami a gépeden van, a saját bejelentkezéseddel: a **Codex** fest, egyébként a **Claude Code** rajzol. A **Beállítások** megmondják, hogy ez a gép tud-e képet készíteni, és ha nem, hogyan állítsd be. Mindig adhatsz a mesélőnek saját képet.

### 3.12 Biztonság: határok, fátylak és stop

A **határok** sosem jelennek meg a játékban; a **fátylak** csak színfalak mögött történnek. Bármikor írd be: *[stop]*: a mesélő azonnal elejti azt a tartalmat, és felveszi a határaid közé.

### 3.13 Meggondolod magad

Minden beállítás megváltoztatható, a csevegésben vagy a **Beállításokban**. Ha a mesélő a könyv nélkül hoz döntést, abból **precedens** lesz, hogy ugyanarra a kérdésre legközelebb ugyanaz legyen a válasz.

---

## 4. A vezérlőpult <!-- icon: party -->

Egy oldal a saját gépeden, csak annak a gépnek a böngészőjében nyílik meg, és amíg a csevegés nyitva van, él. Amikor a csevegés bezárul, azt írja: *Nincs kapcsolat*; a következő csevegéssel magától visszatér.

- **Csapat**: a te karakterlapod és a társaidé. Kattints egy számra, hogy dobj vele; vidd rá az egeret, hogy lásd, honnan jön. Mellette a dobások.
- **Jelenet**: hol vagy, a képe és a térképe, ki van ott, mi történik.
- **Harc**: csak harcban: a körök, a harcolók, ami kéznél van.
- **Napló**: küldetések, a történet, a jegyzeteid.
- **Világ**: a világtérkép, ahogy a karaktered ismeri.
- **A dobótálca**: válassz kockákat és módosítót, és dobj.
- **Mentések**, **Súgó**, **Beállítások** és **Névjegy**, ikonokként a sor végén. A Beállítások az oldal saját preferenciáit is tartalmazzák: téma, kockahang, kockakészlet.

Amikor a mesélő kérdez tőled valamit, a szalagja fent marad, bármelyik szakaszban vagy.

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
