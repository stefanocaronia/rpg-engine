<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,920451e3,be38a186 f2f35057,6ca38325 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,9d44b238,99406ef2,e6bcc348,f79c5b1e,272bd137,b5544596,591cdcfe,9a7d5853,07c079ea,2c297004,869e4581,0d938812,10dc1056,8158c275,0185620d,06d7d789,b4c2c7b3,725e11c3,f27372ca,d904fdec,8da0dbd5,1c13fe15,de62cd09,1aa7894f,56b73d9b,d9fbeec2,74dc52f1,9228c033,8e1adcaa,11800870,a75dc1e4,9886fddc,780281aa,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e8a839a5,14954012,25f9bdf8,bd8adb1c,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,12a7bf4b,15e36217,4b57013e,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,9d7e522f,f4c26681,c6b050c9,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,c64bfe05,ab627403,86179abe,21ba08ef,f8d6b2fd,3f5bbaaf,3bbb14f4,15e9f48c,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,5a2d9db1,ba8c72d7,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,a78e1054,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,b78e7609,b8e71497,32482cb4,d90a5d53,cb3f91d5 eac34391,4497f74b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,fd906c57,697b0622,ab3874f2,e0f88bdb,1e0ccfed,bb5be5d8,5070d986,2dbad46d,a7d9232d,b21a6994,22436b3a,5db3836c,12a20643,cc12de47,d58492a7,590b2eb2,df64a3bb,e065c96f. Change the English, then run it again. -->
# RPG Engine: a teljes útmutató

Az **RPG Engine** lehetővé teszi, hogy asztali szerepjátékot játssz egy **AI mesélővel**. Az **irányítópulton** játszol: ez egy ablak a számítógépeden, benne a karakterlapoddal, a kockákkal, a térképekkel, a naplóddal és a mesélővel folytatott **csevegéssel**. Az RPG Engine a háttérben dolgozik: **emlékszik a világra**, **dob a kockákkal** és **vezeti a számokat**.

Az útmutató játékosoknak szól: nem kell tudnod programozni.

## Gyors kezdés <!-- icon: send -->

1. Telepítsd a **Node.js**-t a [nodejs.org](https://nodejs.org) oldalról (az LTS verziót).
2. Egyszer, a Node.js telepítése után megnyitott új terminálban telepítsd az RPG Engine-t: `npm install -g rpg-engine`. Ha a Windows azt válaszolja, hogy a szkriptek futtatása le van tiltva, írd be egyszer: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, válaszolj igennel, és próbáld újra.
3. Írd be: `rpg open`. Megkérdezi, tegye-e az RPG Engine ikonját az asztalra és a menübe: az igenhez nyomj Entert. Ettől kezdve az RPG Engine-t az ikonjáról indítod, terminál nélkül ([2.2](#22-install)).
4. Egy ablak mutatja a kampányaidat. Nyomd meg az **Új kampány** gombot, adj neki nevet, és nyomd meg a **Létrehozás** gombot ([2.3](#23-create-a-campaign)): az irányítópultja egy saját ablakban nyílik meg.
5. A mesélővel folytatott csevegésben válaszd ki az AI-appodat és a modelljét: a Claude Code-hoz fizetős Claude-csomag kell, a Codexhez ChatGPT-fiók, ingyenes vagy fizetős ([2.4](#24-connect-your-ai)). Ha az app hiányzik, vagy nem vagy bejelentkezve, az oldal telepíti, illetve bejelentkeztet. Nyomd meg a **Csevegés megnyitása**, majd a **Kezdés** gombot. Az első válasz akár pár percig is eltarthat; utána a mesélő megkérdezi, hogyan szeretnél játszani, és közösen megalkotjátok a karaktered.

## 1. Mi az az RPG Engine <!-- icon: about -->

| Ki | Mit csinál |
|---|---|
| **Te** | A karaktered szerepét játszod: mit tesz, mit mond, mivel próbálkozik. |
| **A mesélő** (az MI) | Elmeséli a történetet, megszemélyesít mindenki mást, eldönti, mi történik, és dobást kér. |
| **RPG Engine** | Fájlokban tárolja a világot, dob a kockákkal, számolja az életerőpontokat, a pénzt, az időt és a távolságokat, és titokban tartja a titkokat, amíg fel nem fedezed őket. |

A világ egyik estéről a másikra ugyanaz marad, új csevegésben is, más MI-vel is:

- **Ami elhangzott, az igaz marad.** Egy halott főgonosz halott marad.
- **A kockák valódiak.** A mesélő nem tudja befolyásolni őket, kivéve a legkönnyebb nehézségi szinten, ha ezt választod.
- **A titkok titkok maradnak.** A mesélő sosem árulja el, amit a karaktered nem tud.
- **A világ mozog.** A fenyegetések tovább haladnak, amíg pihentek vagy utaztok, és látod a jeleiket.
- **Egy kampány egy mappa** a számítógépeden: abbahagyhatod, amikor akarod, és később folytathatod.

A játék egy játékrendszerrel érkezik, egy csomaggal, amelyet a mesélő telepít a kampányodhoz: jelenleg a miénk az **ötödik kiadás**, az ingyenes System Reference Document 5.1 alapján. Nélküle szabadon játszol, számok nélküli történetet. Majd jönnek más rendszerek is ([Hamarosan](#9-coming-later)).

---

## 2. Első lépések <!-- icon: path -->

### 2.1 Amire szükséged van

- Egy számítógép Windows, macOS vagy Linux rendszerrel, és egy webböngésző.
- **Node.js 24** vagy újabb, a [nodejs.org](https://nodejs.org) oldalról. Ezzel jön az `npm`, amely telepíti az RPG Engine-t.
- Egy **terminál**, egyszer, az RPG Engine telepítéséhez: Windowson a Terminal vagy a PowerShell, macOS-en a Terminal. Ha egy mappában akarsz terminált nyitni, kattints a mappára jobb gombbal, és válaszd a **Megnyitás a Terminalban** (Windows) vagy a **Szolgáltatások > Új terminál a mappához** (macOS) lehetőséget. Ha a Windows azt válaszolja, hogy a szkriptek futtatása le van tiltva, írd be egyszer: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, és válaszolj igennel.
- Egy **AI-app** a mesélőnek, a saját fiókoddal ([2.4](#24-connect-your-ai)): az oldal telepíteni tudja neked. Az általa kínált **legnagyobb modellel** játssz: egy kis modellt könnyebb rávenni, hogy elárulja a titkokat, vagy kijátssza a szabályokat.

### 2.2 Telepítés

```text
npm install -g rpg-engine
rpg open
```

Az első sor telepíti az RPG Engine-t; az `rpg --version` ellenőrzi, hogy sikerült-e. Ha az npm felajánlja, hogy frissíti magát, nyugodtan figyelmen kívül hagyhatod.

Az `rpg open` megnyitja az RPG Engine ablakát a kampányaiddal. Az első alkalommal a terminálban megkérdezi, felkerüljön-e az ikonja az asztalodra és a Start menübe (Macen az Alkalmazások közé): az igenhez nyomj Entert. Ettől kezdve az ikonra kattintasz duplán, és nincs többé szükséged a terminálra. Ikon nélkül minden játékalkalommal írd be: `rpg open`; az `rpg icon` később hozzáadja az ikont, az `rpg icon --remove` pedig eltávolítja.

### 2.3 Kampány létrehozása

Az RPG Engine ablaka kártyákon mutatja a kampányaidat, legelöl a legutóbb megnyitottat. Nyomd meg az **Új kampány** gombot, és add meg a **Név**, a **Nyelv** és a **Játékrendszer** mezőt: a többit a mesélő készíti el veled. A kampány a nevével megegyező mappába kerül, a felhasználói mappádon belüli `RPG Engine` mappában (Windowson `C:\Users\<name>`); a **Másik mappa választása…** egy általad választott üres mappába teszi. **A mesélő** alatt már kiválaszthatod az AI-appot és a modellt az első csevegéshez ([2.4](#24-connect-your-ai)). Nyomd meg a **Létrehozás** gombot: a kampány irányítópultja egy saját ablakban nyílik meg.

Legközelebb kattints egy kártyára a kampány megnyitásához; a megnyitott kampány kártyáján ez áll: **Jelenleg nyitva**. A **Mappa megnyitása…** egy olyan kampányt ad hozzá, amely már megvan ezen a számítógépen. A kártyán lévő kis kereszt leveszi a kampányt a listáról: a fájljai ott maradnak, ahol voltak.

### 2.4 Az AI csatlakoztatása

A mesélő egy **AI-appban** fut a számítógépeden, a saját fiókoddal: Claude Code, Codex, OpenCode vagy Antigravity. Egy sima csevegés, például a claude.ai vagy a ChatGPT, illetve egy telefonos app nem elég: a mesélőnek el kell érnie a kampány fájljait a számítógépeden. Minden apphoz saját fiók kell: a Claude Code-hoz fizetős Claude-csomag (Pro vagy magasabb); a Codexhez ChatGPT-fiók, ingyenes vagy fizetős; az Antigravityhez Google-fiók, amelynek ingyenes használatában heti korlátok vannak; az OpenCode-nak van néhány ingyenes modellje korlátozott ideig, vagy a saját szolgáltatód modelljeit használja, a helyieket is.

Az irányítópult csevegésében az **Az AI-appod** résznél válaszd ki az appot, aztán a **Modell** és **A mesélő gondolatai** értékét: az oldal javasol egyet-egyet. Több gondolkodás lassabb, és jobban fogyasztja a csomagodat. Az az app, amely még nem áll készen, megmondja, mi kell hozzá, és ad egy gombot, amely elintézi:

- **Claude Code** és **Codex**: a **Claude Code telepítése** vagy a **Codex telepítése** letölti az appot az RPG Engine saját mappájába ezen a számítógépen; a **Bejelentkezés a Claude Code-ba** vagy a **Bejelentkezés a Codexbe** megnyitja a bejelentkezési oldalát a böngészőben. Az RPG Engine sosem látja a jelszavad.
- **OpenCode** és **Antigravity**: az **OpenCode letöltése** vagy az **Antigravity letöltése** megnyitja az oldalát, ahol telepítheted. Az OpenCode bejelentkezés nélkül is játszik; az Antigravityben a saját appjából jelentkezel be. Utána gyere vissza, és nyomd meg az **Ellenőrzés újra** gombot.

Az Antigravity **kipróbálás alatt** jelölést kapott: kiléphet a játékból, és a maga módján kérdezhet, ezért játékra jobb a Claude Code, a Codex vagy az OpenCode. Az Antigravity megőrzi a korábbi csevegéseidet, és a memóriája nem kapcsolható ki: a mesélő azt az utasítást kapja, hogy soha ne olvassa el őket. Amit írsz, a Google-hoz kerül, ahol emberek is elolvashatják: ne vigyél személyes adatot a játékba. Az RPG Engine nem a Google terméke. Az RPG Engine-nel a legtöbbet a **Claude Code-dal** játszunk és tesztelünk: a többivel még nem játszottunk végig egész kampányt.

Az irányítópult csevegésében a mesélő csak az RPG Engine-en keresztül nyúl a számítógépedhez: magától egyetlen fájlodat sem nyitja meg. Az RPG Engine a kampányon kívül csak azt olvassa, amit te választottál, miután igent mondtál a számítógéped egyik ablakában.

Játszhatsz az AI-appod saját csevegésében is, terminálban vagy az asztali appjában ([2.8](#28-the-other-way-your-ai-apps-own-chat)).

### 2.5 Az első chat

Miután kiválasztottad az appot és a modellt, nyomd meg a **Csevegés megnyitása** gombot: az app elindul, ami pár másodpercig is eltarthat. Aztán nyomd meg a **Kezdés** gombot, vagy írj bármit, például: *Szia! Kezdjünk bele.* Az első válasz akár pár percig is eltarthat, amíg a mesélő felállítja a jelenetet.

A csevegésnek saját szekciója van, a **Szerepjáték**, vagy az oldal mellett áll: a tetején lévő kis gombok három helyre teszik: **A saját fülén**, **Balra** vagy **Jobbra**, a szélét húzva pedig szélesebbé teheted.

Egy új kampány három szakaszon megy végig, ezek a vezérlőpult tetején látszanak: **1 Beállítások** (hogyan akarsz játszani), **2 Nulladik alkalom** (megalkotod a karaktered, játékban), **3 Játék**.

### 2.6 Beállítások: hogyan játszol

A mesélő csak azt kérdezi, ami még hiányzik, egyszerre néhány kérdést. A vezérlőpult **Beállítások** lépése ugyanezeket a kérdéseket kártyákon mutatja. Írd be, hogy „döntsd el te", és a mesélő választ. Minden megváltoztatható később, a chaten vagy a **Beállítások** között.

| Beállítás | Mit dönt el | Értékek |
|---|---|---|
| **Mentor** | Mennyire tanítja a mesélő a szabályokat | ki, tippek, bemutató |
| **Nehézség** | Milyen kemény a világ | mese, könnyű, normál, nehéz, brutális |
| **Halálosság** | Mit jelent a harcban elesni | elbeszélő (soha nem halsz meg), epikus (csak ha számít), kockák |
| **Mentések** | Mikor mehetsz vissza | permahalál, ellenőrzőpont, szabad ([3.8](#38-saves-and-going-back)) |
| **Szigor** | Mennyire követik szigorúan a szabályokat az étel, a fény és az utazás | gördülékeny, szabályok, szimuláció |
| **Kockák** | Ki dobja a kockáidat | digitális, fizikai |
| **Mértékegységek** | Távolságok és súlyok | metrikus, birodalmi |
| **Karakterhangok** | Ki beszél a megismert karakterek helyett, a mesélőtől a karakterekig: mindig a mesélő; kulcspillanatokban maga a karakter, csak azt tudva, amit ő tud, ahogy a mesélő választja; vagy mindig a karakter, a fontosaknál vagy mindenkinél, lassabban és drágábban, ahol az AI-alkalmazásod tudja | a mesélő, néha, fontos karakterek, mindenki |
| **A karaktered** | Hogyan készül a karaktered a nulladik alkalmon | a mesélővel, a mesélő által, saját ([2.7](#27-session-zero-your-character)) |
| **Társak** | Ki utazik veled | senki, veled közösen alkotott, a mesélő alkotta, játékban megismert |
| **Képek** | Képek a helyszínekről, küldetésekről és a megismert karakterekről | nincs, kérésre, új helyszínek, küldetések és megismert karakterek ([3.11](#311-pictures)) |
| **Határok** és **Fátylak** | Ami soha nem jelenik meg, és ami csak a színfalak mögött történik | listák |
| **Nyelv** | A játék és a vezérlőpult nyelve | bármelyik |

Az ötödik kiadás hozzáadja a **fejlődést**: tapasztalati pontokat vagy mérföldköveket.

Ha nincs megírt világ, a mesélő egy **alaphelyzetet** is kérdez (műfaj, hangulat, néhány elem, és hogy mit élvezel a legjobban egy játékban, például a harcot, a rejtélyeket, a beszélgetést vagy a felfedezést, a saját szavaiddal), az **előkészítést**: menet közben építse a világot, vagy az elején mindet; és a **hosszt**: egy este, néhány alkalom (három-öt este), vagy nyitott, egyik kaland a másik után. Egy meghatározott hosszúságú történet végén mindig folytathatod.

**A mesélő stílusa** nem szerepel a kérdések között, de a chaten vagy a **Beállítások** között bármikor megváltoztathatod: ilyen a **Próza** (egyszerű, irodalmi, pulp, szárazon szellemes), a mesélő által kitalált **Történetek** (helyzetek, ívek, epizódok, rejtély), egy szerző, akihez az **Írj úgy, mint** beállítással igazodhat, vagy bármi más a **Saját szavaiddal** beállításban.

### 2.7 Nulladik alkalom: a karaktered

A karaktered a mesélővel együtt alkotod meg, mint az asztalnál. Minden döntés a tiéd, hacsak nem kéred meg a mesélőt, hogy döntsön helyetted: jöhetsz kész ötlettel, homályossal vagy semmivel; vagy kérheted a mesélőt, hogy néhány szóból készítse el az egészet. Szintekkel játszott játékban a mesélő megkérdezi, melyik szinttől indulsz: az elsőtől, hacsak nem akarsz másikat. A mesélő még azelőtt elmondja, hogyan készülnek a képességpontok, hogy bármelyik kockát eldobnád. A történeted sosem kötelező; ha adsz egyet, a mesélő a te szavaiddal írja le. Ezután a mesélő képet kér a karakteredről ([3.7](#37-your-characters-story-and-picture)). Az RPG Engine kiszámolja a karakterlapot: te sosem számolsz.

Van már karaktered, egy másik játékból vagy egy másik kampányból? Válaszd a beállításnál a **Már van egy** lehetőséget, és add oda a mesélőnek: illeszd be a karakterlapot a csevegésbe. Az AI-appod saját csevegésében azt is megmondhatod, hol van a fájlja a számítógépeden (PDF, kép, szöveg); az irányítópult csevegésében a mesélő nem nyitja meg a fájljaidat. A mesélő úgy írja le a karaktert, ahogy van, a saját szintjén, összeveti a szabályokkal és a világgal, és megbeszéli veled, ami nem illik bele.

### 2.8 A másik mód: az AI-appod saját csevegése

Játszhatsz magában az AI-appod csevegésében is, terminálban vagy az asztali appjában, az irányítópulttal megnyitva mellette. Ilyenkor a kampányt egy terminálban hozod létre, abban a mappában, ahol a játékaidat tartod (a [2.1](#21-what-you-need) leírja, hogyan), mindig a nevével: az `rpg init "The Salt Isles"` létrehozza a `The Salt Isles` mappát egy új kampánnyal. Az RPG Engine magától előkészíti ott mindazt, amire az egyes appoknak szükségük van.

Indítsd el az appodat abban a mappában: `claude` a Claude Code-hoz, `codex` a Codexhez, `agy` az Antigravityhez, `opencode` az OpenCode-hoz; vagy nyisd meg a mappát az asztali appjában. Mondj igent, amikor megkérdezi, megbízol-e a mappában: vigyázz, a Claude Code-ban az előre kijelölt válasz a *No, exit*. Bármelyik másik, MCP-t támogató ügynök is lehet a mesélő: indítsd el a kampány mappájában, és add meg neki az `rpg mcp` MCP-szervert.

Írd be: *Szia! Kezdjünk bele.* A mesélő minden csevegés első válaszában megadja az **irányítópultod linkjét**, valami ilyesmit: `http://127.0.0.1:4750`. Nyisd meg a csevegés mellett.

- A mesélő üzenetei között az appod megmutatja az általa használt eszközöket: ne nyisd meg a részleteiket (Claude Code-ban ctrl+o), mert titkokat mutathatnak.
- A kampány kikapcsolja az app saját memóriáját: a játék a fájljaiban él, így egy mentéshez való visszatérés tényleg visszavisz. A Codex asztali appjában ellenőrizd a beállításokban, hogy a memóriák ki vannak kapcsolva a játék csevegéseinél.
- Ha a mesélő azt mondja, hogy nem találja az RPG Engine eszközeit, írd be az `rpg init` parancsot a kampány mappájában, aztán nyiss új csevegést.
- Egy kampányt egyszerre egy csevegés játszik: amíg a tiéd nyitva van, az irányítópult csevegése vár.

---

## 3. Játék <!-- icon: chat -->

### 3.1 Beszélgetés a mesélővel

Írd le, mit tesz vagy mond a karaktered, a saját szavaiddal:

> Megkérdezem a fogadóst, ki járt még erre ma este.

A történeten kívül írd így: `[OOC: …]` (out of character): *[OOC: Hogyan működik a dulakodás?]* A mesélő is így válaszol; az irányítópult csevegésében a játékon kívüli szavai külön állnak, OOC jelöléssel.

Az irányítópult csevegésében írj az alul lévő mezőbe, és az Entert megnyomva küldd el; a Shift+Enter új sort kezd. Amíg a mesélő válaszol, a **Leállítás** megállítja, a szavaid pedig a mezőben várnak. Amikor a mesélő kérdez tőled valamit, a gombjai a kérdéssel együtt jönnek, a dobásokat is beleértve: kattints egyre, vagy írd le a válaszod. A mező alatt látod az appot és a modellt; ahol az app engedi, kattints a modellre, hogy megváltoztasd, miután a mesélő válaszolt. A **Csevegés bezárása** befejezi a csevegést; a játék a fájljaiban marad.

Te azt mondod meg, mit próbálsz tenni; a mesélő azt, mi történik. A mesélő sosem dönt a karaktered helyett, és sosem beszél a motorról. Megkérdezheted tőle, hogyan használd a vezérlőpultot.

**Cselekvés a vezérlőpultról**: kattints egy névre a karakterlapodon, például egy fegyverre, egy varázslatra vagy egy nálad lévő tárgyra: a kártyája megmondja, micsoda. A táska a nyilával nyílik ki, az ⓘ pedig a kártyáját mutatja. Válaszd ki, mit teszel vele. Ami senkit sem érint, például a **Felszerelés**, ugyanazon a gombon kéri a megerősítést: *Megerősítés: felszerelem a Pajzsot*. Nyomd meg újra, és elmegy a mesélőnek. Ami valakin történik, például a **Támadás**, megkérdezi, kin: a listában vagy a térképre kattintva. Ekkor a gomb a teljes mondatot kiírja: *Megtámadom az 1. csuklyás banditát a buzogánnyal*, és egy kattintás elküldi. Ha a magad módján akarod mondani, kattints valakire, akivel beszélnél, vagy írj a chatbe. A mesélő úgy hallja, mintha a chatben mondtad volna, úgy bírálja el, mint bármi mást, és gombokkal megkérdezi, amit kihagytál. Ha az AI-appod nem tud azonnal szólni a mesélőnek, a mesélő akkor olvassa el, amikor legközelebb írsz a chatbe; ha a chatet közben bezárták, a **Mondd újra** még egyszer elküldi.

### 3.2 Dobások

A mesélő csak akkor kér dobást, ha a kimenetel bizonytalan és számít, és előbb elmondja, mi forog kockán. Ezután:

- **A vezérlőpulton** egy sáv jelenik meg minden próbához egy gombbal, például: *Akrobatika +4 · előnnyel*. Kattints rá: a kockák a lapon hullanak le, és a mesélő hallja az eredményt. Kattinthatsz a karakterlapod kivilágosodó sorára is, dobhatsz a dobótálcáról, vagy írhatsz mást a sávba.
- **Kézzel**, a sáv sarkában vagy a **Beállítások** között: a sáv megmondja, mit kell dobnod, te pedig a karakterlapodról vagy a dobótálcáról dobsz.
- **Fizikai kockák**, ha a kockabeállítás fizikai: leírod a dobott számot, *[14-et dobtam.]*, és az RPG Engine hozzáadja a módosítóidat.

**Szabad dobások**: kattints bármelyik számra a karakterlapodon, vagy nyisd meg a dobótálcát, és dobj kedvedre. Ezek soha nem számítanak, és a mesélő sosem látja őket.

**A mesélő dobásai** megjelennek a dobásoszlopodban, a titkosak kivételével. Mindig megkérdezheted: *[Valódi volt az a dobás?]* Titkos dobásnál a mesélő ujjlenyomatot ad, amely bizonyítja, hogy a dobás azelőtt történt, hogy rákérdeztél.

### 3.3 Jelenetek és harcok

A történet **jelenetekben** zajlik: harc, beszélgetés, felfedezés, utazás, pihenés. Minden jelenet végén a játék magától ment, a jelenet bekerül a naplódba, és amikor a történet fordulatot vesz, a mesélő az előző fejezet óta játszott jeleneteket új fejezetként megírja a történeted könyvébe.

Harcban a mesélő elmondja az összes kört, amely nem a tiéd, és ott áll meg, ahol te döntesz. A **Jelenet** felül mutatja, ki következik és ki jön utána, a karaktered kártyáját pedig a térkép mellett; a körök sorrendje, a csapatod életereje és az ellenfelek sérülése szavakkal leírva az oldal mellett marad. Ha a karaktered elesik, a halálmentők nagyban megjelennek a lapon.

**Állandó parancsok**: mondj a társaidnak valamit, aminek tartósan érvényesnek kell lennie, például: *Mostantól mindig hagyjatok életben egyet*, és a mesélő addig megtartja, amíg vissza nem vonod. A társaid úgy követik, ahogy a karakterük engedi, és ha valamelyikük nem tenné, ezt elmondja. Az parancsaidat a **Beállítások** között találod, ahol hozzáadhatsz és törölhetsz is.

### 3.4 Idő, utazás és a mozgó világ

Az RPG Engine vezeti a dátumot. Az alkalmak között a játékidő megáll, hacsak a **Beállításokban** nem úgy döntesz, hogy teljen, például távolléted minden hetére egy játéknap, vagy nem kéred meg erre a mesélőt. Mondd, hogy pihensz, *Hosszú pihenőt tartunk*, és ha a mesélő beleegyezik, a pihenő visszaadja, amit kell. Rövid pihenőnél a mesélő a vezérlőpulton megkérdezheti, hány életerőkockát költesz el: egyenként dobd őket, nézd meg, mennyit gyógyít mindegyik, és állj meg, amikor akarod. Mondd meg, merre mész, *Észak felé indulunk Roccába*, és az RPG Engine kiszámolja az utat, a távolságot és a napokat, és megáll, ha történik valami az úton. A pénzt a játék érméiben számoljuk, a visszajáróval együtt.

A gonoszoknak határidős terveik vannak. Minden új napon a mesélő előrébb mozdítja azokat a fenyegetéseket, amelyeket az idő előrevitt, te pedig a jeleiket látod, az órát sosem.

### 3.5 Térképek

A **Világ** megmutatja a karaktered által ismert helyszíneket, a köztük lévő utakat és a bejárt ösvényt, a többi felett köddel. A **Jelenet** annak a helynek a térképét mutatja, ahol vagy, ha van neki, azzal, hogy ki hol áll; harcban, a te körödben, az el nem érhető mezők fátyollal vannak borítva. Amikor a mesélő megkérdezi, hová lépsz, érints meg egy mezőt, vagy írd le, például *E4*.

A **Világ** azt is őrzi, amit a karaktered tud. Az **Ismeretek** felsorolja az embereket, helyeket, frakciókat, lényeket és történeteket, amelyeket ismer, mindegyiket úgy, ahogy ő ismeri: keress benne, vagy nyiss meg egyet, hogy egészében olvasd; a szövegben egy névre kattintva annak az oldalára jutsz. A **Dokumentumok** megőrzik a talált leveleket, hirdetményeket és lapokat, hogy újra elolvashasd őket. A **Naptár** megmutatja a mai napot, a küldetéseid határidejét a hátralévő idővel, és a történet napjait: egy jelenetekkel teli nap a Napló Idővonalán a jelenetekhez vezet.

### 3.6 Küldetések, napló és jegyzetek

Amit a karaktered vállal, az küldetés lesz a **Naplóban**, céljaival, határidejével és azzal, amit mér; csillagozd meg, hogy a **Jelenet** tetején szem előtt maradjon. A **Történet** alatt a Napló könyvként meséli el a történetedet: a mesélő minden alkalommal ír egy prózai fejezetet, amikor a történet fordulatot vesz, az előző fejezet óta történt jelenetekről, az általad választott stílusban; olvasd fejezetenként, az utolsót a könyvjelzője jelöli, és töltsd le Markdownként vagy weboldalként, hogy kinyomtasd vagy továbbadd. Egy korábban elkezdett játékban kérd meg a mesélőt, hogy írja meg az eddigi történetet. Az **Idővonal** felsorolja a jeleneteket, számozva, mindegyikben azzal, ami történt. A Naplóban találod a **Jegyzeteket** is: ezek privátak, hacsak nem a **Megosztás** gombbal osztasz meg egyet; azt a mesélő úgy hallja, mint amit gondolsz, sosem mint tényt. A **Társak** alatt elolvashatod a társaid naplóját: időnként, egy nap vagy egy küldetés végén írnak néhány sort arról, mit gondolnak és éreznek.

### 3.7 A karaktered története és képe

A karakterlapodon a **Leírás** kártyán van egy mező a karaktered történetének: a mesélő írja bele, miután igent mondasz. Képhez adj a mesélőnek egy fájlt (PNG, JPEG, WebP vagy SVG, legfeljebb 5 MB) a számítógépeden lévő helyével együtt, vagy készíttess portrét ([3.11](#311-pictures)): *[Készíts nekem egy portrét: copfba font ősz haj, egy heg az állon.]*

### 3.8 Mentések és visszalépés

Az RPG Engine minden jelenet végén menti az egész kampányt. A többit a **mentések** beállítás dönti el:

| Mentések | Mentés, amikor akarod | Visszalépés |
|---|---|---|
| **permadeath** | nem | soha |
| **checkpoint** | nem | az utolsó mentésre, csak ha a karaktered meghal |
| **szabad** | igen | bármelyik mentésre |

Minden módban **újrakezdheted** a játékot a játék elejéről vagy a nulladik alkalomtól. Megteheted a csevegésben vagy a **Mentésekben**.

Visszalépés után **nyiss új csevegést**: a régi emlékszik arra, ami visszacsinálódott. Az irányítópult csevegésében nyomd meg a **Csevegés bezárása**, majd az **Új csevegés** gombot; az AI-appod saját csevegésében nyiss új beszélgetést (`/clear` a Claude Code-ban). Írd az új csevegésbe: *Tovább*. Aztán told meg a mesélőnek, hogy a csevegés új: nyomd meg a **Megnyitottam az új csevegést** gombot a Mentések között, vagy mondd el a csevegésben. Addig a mesélő nem megy tovább.

Ha nem tudod, mi az a git, ugord át ezt a bekezdést. Ha a kampány mappája git-tároló, a **Beállítások** között van egy **Git** szakasz, amelyben minden kikapcsolt, amíg nem döntesz: egy commit minden alkalom kezdetén, minden mentésnél és minden jelenet végén, és ha szeretnéd, utána egy push is. A commit a kampány pillanatnyi állapotának pillanatképe; a push elküldi a pillanatképeket az online tárolóba, például a GitHubra, így egy másolat ezen a számítógépen kívül is megvan. A mentések és a mesélővel folytatott csevegéseid kívül maradnak a tárolón, hacsak nem engeded be őket; a csevegéseket csak akkor engedd be, ha a tároló privát.

### 3.9 Alkalmak: abbahagyás és visszatérés

Hagyd abba, amikor akarod: *[Mára álljunk meg itt.]* Minden már el van mentve a fájlokban. A visszatéréshez nyisd meg az RPG Engine-t az ikonjáról, és kattints a kampányodra. Ha nyitva hagytad a csevegést, magától visszatér. Ha bezártad, nyomd meg a **Csevegés folytatása** gombot. Aztán nyomd meg a **Folytatás** gombot: a mesélő pár sorban elmondja, hol tartottatok, és megy tovább. Ha a játék bezárult, miközben a mesélő még válaszolt, vagy miközben egy kérdése várt rád, ezen a gombon helyette **Folytatás innen** áll. Az **Új csevegés** friss csevegést nyit ugyanarra a játékra. Az AI-appod saját csevegésében indítsd el a kampány mappájában, és írd be: *Tovább*.

### 3.10 A mesélő hangulata

Az irányítópult tetején lévő robot a mesélő: az arca követi a történet hangulatát, és sosem árulja el, amit még nem tudsz. Ha az irányítópult nincs összekötve a játékkal, alszik.

### 3.11 Képek

Az RPG Engine képeket készíthet az általad elért helyszínekről, a vállalt küldetésekről és azokról, akikkel találkozol, ahogy a **Képek** beállítás előírja, és a karaktered portréját is, ha kéred. A saját AI-appod készíti őket a saját eszközeivel, a te bejelentkezéseddel, a te csomagodon és annak korlátai szerint: a **Claude** vektorképként rajzolja őket, a **Codex** és az **Antigravity** festi őket, az **OpenCode** egyszerű vektorképeket rajzol a chatben. A **Beállítások > Kampány > Képek** helyen elérheted, hogy a Codex vagy az Antigravity akkor is megfesse őket, ha a mesélő másik app: ahol a kiválasztott nem tudja, a chated készíti el őket. A **Beállítások** megmondja, hogy ez a számítógép tudja-e készíteni őket, és ha nem, hogyan állítsd be. Bármikor adhatsz saját képet a karakterednek vagy bármelyik oldalnak, amelyet látsz: húzd az egérmutatót az egyik képe fölé, és a sarkában megjelenik egy kis képgomb (billentyűzettel is, telefonon pedig mindig); a **Világban** a megnyitott oldalon is van **Kép cseréje…**, vagy **Kép hozzáadása…**, amíg még nincs képe. Ha az egérmutató egy kép fölött van, vagy a gombja ki van választva, a kimásolt képet be is illesztheted a Ctrl+V billentyűkkel (Macen ⌘V). A te képed a meglévő helyére kerül. Vagy tedd a fájlt a kampány **inbox** mappájába, és told meg a mesélőnek, melyik oldalhoz való.

### 3.12 Biztonság: határok, fátylak és leállítás

A **határok** sosem jelennek meg a játékban; a **fátylak** csak színfalak mögött történnek. Bármikor írd: *[stop]*: a mesélő azonnal elejti azt a tartalmat, és felveszi a határaid közé.

### 3.13 Meggondolod magad

Minden beállítás megváltoztatható, a csevegésben vagy a **Beállításokban**. A szabálykönyv nélkül hozott mesélői döntésből **precedens** lesz, így ugyanarra a kérdésre legközelebb ugyanaz a válasz jön.

---

## 4. A irányítópult <!-- icon: party -->

Egy oldal a saját számítógépeden, egy saját ablakban, amely csak azon a számítógépen nyílik meg. Amíg az ablaka nyitva van, él, csevegéssel vagy anélkül; miután bezártad, nagyjából harminc másodperc múlva a játék leáll, és vele a csevegés is. Semmi sem vész el: minden a fájlokban van. Az AI-appod saját csevegésében addig él, amíg az a csevegés nyitva van. Ha a játék nincs jelen, az oldal ezt írja: *Not connected*: nyomd meg a **Kampány újranyitása** gombot, vagy a saját appodban nyisd meg a következő csevegést. A házzal jelölt **Kampányok** gomb visszavisz az összes kampányodhoz.

- **Szerepjáték**: a csevegés a mesélővel, amikor nem az oldal mellett áll ([2.5](#25-the-first-chat)).
- **Csapat**: a te karakterlapod és a társaidé. Kattints egy számra, hogy dobj vele; vidd fölé az egeret, hogy lásd, honnan jön, és ha egy nyíl jelöli a kockáját, azt is, mi teszi jobbá vagy rosszabbá a dobást. Ha a mesélő választásokat készít elő neked, például új szintlépésnél, a karakterlapon egy értesítés megnyitja őket: akkor választasz, amikor akarsz, elolvasod a lapokat, amelyeket a lehetőségek megneveznek, dobsz, ha egy lehetőség dobást kér, aztán megerősíted; a történet közben megy tovább. Mellette vannak a dobások.
- **Jelenet**: hol vagy, a jelenet képe és térképe, kik vannak ott, mi történik; harcban a körök és a karaktered kártyája.
- **Napló**: küldetések, a történet könyvként, az idővonala, a társaid naplói, a jegyzeteid.
- **Világ**: a világtérkép, amit a karaktered tud, a megtalált dokumentumok és a naptár.
- **A dobótálca**: válassz kockákat és módosítót, aztán dobj; a ×2 megduplázza a kockákat, a módosítót soha, mint kritikus találatnál.
- **Mentések**, **Súgó**, **Beállítások** és **Névjegy**: ikonok a sor végén. A Beállítások az **Irányítópult** alatt az oldal saját beállításait is tartalmazza: mód, kockahang, kockakészlet és a **Téma**, vagyis az oldal színei, arcai és képei: a játékrendszeré, egy téma, amelyet a Packages › Add alatt adtál hozzá a katalógusból, GitHub-linkkel, .zip fájlból vagy mappából, vagy az oldal saját témája. Ha egy téma saját stíluslapja nehezen olvashatóvá teszi az oldalt, kapcsold ki ott a következőt: **A téma saját stílusa**. A Beállítások mindig enélkül jelennek meg, az oldal címével, amelynek a végén `#/settings/page` áll.

Ha a mesélő kérdez tőled valamit, a kérdése szalagként a képernyő tetején marad, bármelyik részben jársz.

---

## 5. Játékrendszerek és házi szabályok <!-- icon: dice -->

### 5.1 Mi az a játékrendszer

Egy játék adatai: a karakterlapja, a számai, a lényei, a tárgyai, a varázslatai és a szabályszövege. Minden kampány egy rendszert játszik. Az RPG Engine kiszámolja a karakterlapot, valamint azt, hogy mi fogy el és mi tér vissza. Azt, hogy egy képesség hogyan működik, a mesélő elolvassa a szabályokban, és eldönti, ahogy egy asztalnál is.

### 5.2 Az ötödik kiadás

Az SRD 5.1 fajai, kasztjai, alkasztjai, egy háttér és egy tulajdonság (feat); a 319 varázslat, a fegyverek, páncélok, varázstárgyak és szörnyek; a szabályfejezetek, amelyeket a mesélő pontos szövegükkel olvas; a teljes, kiszámolt karakterlap.

Ez egy külön csomag: a mesélő felajánlja, amikor kampányt állítasz be, és telepíti is. Az a kampány, amely ezt játssza, magától telepíti a csomagot, amikor először nyílik meg egy olyan számítógépen, ahol még nincs meg. A mesélő szól neked erről.

Olyan tartalommal is játszhatsz, ami az SRD-ben nincs benne, egy saját könyvedből: a mesélő a kampányod oldalaiként megírja, az RPG Engine pedig a sajátjaként kezeli. Az RPG Engine csak nyílt tartalmat szállít; azt viszont, amit a mesélőd ismer, semmi sem korlátozza.

A saját kézikönyveid lehetnek a könyvtárad: told meg a mesélőnek, hol vannak, *[A kézikönyveim itt vannak: D:\Books\5e.]*, vagy add hozzá a mappájukat a Csomagok › Könyvtár részen, és mondj igent a számítógéped ablakában, egyetlen alkalommal. Az RPG Engine ezen a számítógépen olvassa őket. Minden kampány azokat a mappákat használja, amelyeket ott bekapcsolsz. A mesélő az SRD után ezekben keres, amikor szabályról dönt, és megnevezi a könyvet és az oldalt. Szövegként olvashatók a legjobban, vagy olyan PDF-ként, amelyben a szöveg kijelölhető. A beolvasott PDF-et az oldalak képeiből olvassa ki, csak Windowson, néhány perc alatt és néhány hibával. Az RPG Engine soha nem módosítja a kézikönyveidet, soha nem küldi el sehová a szövegüket, és soha nem másolja be őket egy kampányba.

### 5.3 Házi szabályok és saját kiegészítések

Kérdezd meg a mesélőt: *[Házi szabály: a természetes 1-es támadásdobásnál elejted a fegyvered.]* A mesélő az asztal megállapodásaként megjegyzi, vagy ha kell, ír hozzá egy oldalt, vagy módosít egy számot a karakterlapon. A már leírt házi szabályok szöveges fájlként a kampány `rules` mappájába kerülhetnek.

Amikor a mesélő módosít egy oldalt a játékrendszerből a kampányodhoz, például egy lény életerőpontjait vagy egy varázslat hatótávját, a dashboard egy kis csillaggal jelöli a neve után, bárhol is jelenik meg. A Csomagok › Telepítve felsorolja, mi változott, a játékrendszer alatt, a rendszer eredeti adatai mellett; az a lény, amelyet a karaktered nem ismer, csak a nevével szerepel ott. Itt visszaállíthatsz egy oldalt úgy, ahogy a rendszer írja, miután a jelenleg játszott jelenet véget ért; a dashboard nem tudja visszavonni, a változtatást csak a mesélő tudja újra megírni.

### 5.4 Saját játékrendszer hozzáadása vagy importálása

A játékrendszer egy csomag: a mesélő telepít egyet npm-ből, mappából vagy fájlból. Olyat, amely nem tőlünk való, csak a te igened után telepít, az ügynököd egy űrlapján vagy a számítógéped egy ablakában. Elkészíteni egyet fejlesztői munka, az RPG Engine dokumentumai írják le a GitHubon. Egy könyvedből játékrendszert csinálni még nem lehet ([Hamarosan](#9-coming-later)).

---

## 6. Bővítmények <!-- icon: plus -->

A bővítmény valami újat ad egy kampányhoz a játékrendszer mellé: például az időjárást, amely minden hajnalban változik, vagy a zárfeltörést kockákkal. Bővítményt a Csomagok › Hozzáadás menüpontban adhatsz hozzá: a listából, az npm-en a nevével, egy mappából vagy egy fájlból. Ha egy bővítmény nem tőlünk származik, kódot hoz magával, ezért csak a te igened után kerül be, a számítógéped egyik ablakában. Ha egy bővítményt másik játékrendszerhez készítettek, jelzi, melyikhez, és nem lehet hozzáadni. A Csomagok › Telepítve menüpontban frissítheted vagy eltávolíthatod a bővítményeket. A mesélő is hozzáadhat egyet, ha kéred.

---

## 7. Honnan jön egy kampány, és a nyelve <!-- icon: world -->

### 7.1 Három mód világra szert tenni

- **Menet közben készített**: az alapötletedből a mesélő minden helyszínt, szereplőt és cselekményszálat közvetlenül azelőtt épít fel, hogy szükséged lenne rá, és megőrzi.
- **Az elején előkészített**: ugyanez, de a világ a játék előtt készül el.
- **A saját kalandodból vagy könyvedből**: add át a mesélőnek a fájlját, *[Importáld ezt a kalandot kampányunknak: D:\Books\adventure.pdf. Ne áruld el nekem, mi van benne.]* A kampányon kívüli fájlt csak azután olvassa el, hogy igent mondtál a számítógéped egyik ablakában; a kampány **inbox** mappájába tett fájlt azonnal. A legjobban szövegként olvasható, EPUB-ként, Word-dokumentumként vagy olyan PDF-ként, amelynek a szövege kijelölhető; a beszkennelt PDF-et az oldalak képeiből olvassa, csak Windowson, lassan és néhány hibával. A saját AI-appod olvassa el a csevegésen kívül, vagy ha az nem tudja, a mesélő a csevegésben, a te csomagod terhére: Claude Code-ban vagy Codexben a kettő közül az egyik, Antigravityben az Antigravity, OpenCode-ban a benne legutóbb választott modell. A teljes dokumentum annak készítőjéhez kerül, aki olvassa, a fiókod feltételei és a tanításra vonatkozó választásod szerint. Az irányítópult mutatja, meddig jutott. Regényből a mesélő javaslatot tesz, hol kezdjétek. Megírja a helyszíneket, a szereplőket és a titkokat.

Egy kampányt egyszer játszol végig: ha ugyanazt a kalandot újra szeretnéd játszani, hozz létre új kampányt.

### 7.2 Nyelvek

Kampányonként egy nyelv van, a mesélőé, és a vezérlőpult ezt követi. A vezérlőpult 26 nyelven érkezik. Bármelyik másikat a saját AI-appod fordítja le a számítógépeden a chaten kívül (a Codex vagy a Claude Code; Antigravityben és OpenCode-ban a sajátjuk), vagy ha egyik sem tudja, a mesélő a chatben. Az ötödik kiadás olasz kifejezései a hivatalos olasz SRD-ből származnak. A szabályszöveg angol marad, a mesélő pedig a te nyelveden meséli el.

---

## 8. Kíváncsiaknak: a kampánymappa <!-- icon: list -->

Soha nem kell megnyitnod, és a kampányod titkait őrzi. Ezek vannak benne: `campaign.yaml` (a beállításaid), `state.yaml` (hol tart a játék), `world/` (egy markdown oldal minden karakterhez, helyszínhez, küldetéshez és a többihez), `rules/` (a házi szabályaid), `images/`, `log.jsonl` (minden változás), `sessions/` (a mesélővel folytatott csevegéseid szövegként, a Claude Code-ból és a Codexből), `.saves/`, `.player/` (a jegyzeteid), valamint a kis fájlok, amelyek megmondják az AI-ügynököknek, hol van az RPG Engine. Az oldalak Obsidian formátumúak. Ha kézzel módosítasz egy oldalt, a mesélő a következő válaszánál értesül róla.

Az RPG Engine ebben a mappában marad: a játékot csak itt olvassa és írja, és soha nem nyúl a többi fájlodhoz; a kézikönyveid mappáit csak olvassa. Rajta kívül csak saját adatmappákat tart (a dashboard fordításait, a kézikönyveidből beolvasott szöveget, valamint a Codexet és a Claude Code-ot, ha engeded telepíteni), továbbá ideiglenes mappákat, amíg egy kép készül. Bármi mást akar az ügynököd tenni a számítógépeden, előbb megkérdez. A játékrendszer vagy a bővítmény kód, mint minden npm-csomag: amelyik nem tőlünk való, az a te jogosultságaiddal fut a számítógépeden, és az RPG Engine csak a te igened után telepíti, az ügynököd egy űrlapján vagy a számítógéped egy ablakában. Csak olyan csomagokra mondj igent, amelyek szerzőiben megbízol.

A mesélő által használt minden parancs a kampánymappában is futtatható: az `rpg --help` felsorolja őket. Sok közülük kiírja a kampány titkait.

---

## 9. Később érkezik <!-- icon: hourglass -->

- **Te lehetsz a mesélő**, az MI pedig a csapatot játssza.
- **Szerzői mód**: írj kalandot az MI-vel, majd exportáld és told meg másokkal.
- **Több játékos ugyanazon a számítógépen**, mindenki a saját karakterével, felváltva ugyanabban a csevegésben.
- **További bővítmények**: megosztható világok, funkciók és házszabályok.
- **Más játékok**: további játékrendszerek, és a saját játékod.

---

## 10. Kérdések és problémák <!-- icon: info -->

### Kérdések

**Ismernem kell a szabályokat?** Nem. Válaszd a bemutató mentort, és kérdezz `[OOC: …]` formában, amikor csak akarsz.

**Csalhat a mesélő?** Nem változtathat meg egy dobást, amelyet az RPG Engine végzett, kivéve a történet nehézségen, és nem változtathat meg már rögzített tényeket sem.

**Kerül valamibe?** Az RPG Engine ingyenes. A mesélő az AI-appod csomagján fut, vagy a saját számítógépeden egy helyi modellel. Egy este játék egy hosszú csevegés: a legkisebb csomagoknál elérheted a csomag korlátját, mielőtt az este véget érne. A képek, a fordítások és az importálások ugyanazt a csomagot használják. Maga az RPG Engine sosem használ API-kulcsot, amelyért hívásonként kell fizetni: az AI-appodba a fiókoddal jelentkezz be, ne kulccsal.

**Játszhatok telefonon?** Nem: a mesélő a számítógépeden fut, és az irányítópult csak ott nyílik meg.

**Játszhatok barátokkal?** Egyelőre nem: ma egy játékos, egy karakter és társak vannak ([Hamarosan](#9-coming-later)).

**Használhatok legközelebb másik AI-t?** Igen: a csevegésben válassz másik appot, mielőtt megnyitod, vagy nyisd meg a kampányt egy másik appban, és írd be: *Tovább*.

### Problémák

**Egy kampány nem nyílik meg.** Nyisd meg újra az RPG Engine-t az ikonjáról, vagy terminálban az `rpg open` paranccsal, és kattints a kampányra. Ha az irányítópultja azt írja: *Not connected*, nyomd meg a **Kampány újranyitása** gombot. Az a kártya, amelyen **A mappa nem található** áll, elvesztette a mappáját: vedd le a listáról, és add hozzá újra a **Mappa megnyitása…** gombbal, ott, ahol most van. Az AI-appod saját csevegésében az irányítópult csak addig működik, amíg a kampány egy csevegése nyitva van: kérdezd meg a mesélőt: `[OOC: Mi az irányítópult linkje?]`. A Claude appban a háttérben egy ideje hagyott csevegés elalszik, és vele az oldal is: kattints a csevegésre, és az oldal ugyanazon a címen visszajön.

**A mesélő nem ismeri a játékot.** Ez az AI-appod saját csevegésében fordul elő: nem töltötte be az RPG Engine-t. Ellenőrizd, hogy a kampány mappájában indítottad el, és megbíztál benne. Claude Code-ban írd be: `/mcp`, és csatlakoztasd újra az `rpg`-t. Codexben a `codex mcp list` parancsnak a kampány mappájában mutatnia kell az `rpg`-t. Ha az `rpg --version` nem található, telepítsd újra az RPG Engine-t ([2.2](#22-install)).

**A Windows nem találja a `claude`-ot.** Ez akkor történik, ha a Claude Code-ot te telepítetted. A telepítője ezt egy sárga megjegyzésben jelzi, és megadja a mappát is, ahová települt: add hozzá ezt a mappát a PATH-hoz (Rendszertulajdonságok > Környezeti változók), aztán nyiss egy új terminált.

**Frissítés.** Ha megjelent egy újabb RPG Engine, az irányítópult szól: a Packages › Installed alatt az RPG Engine áll legelöl, mellette a **Frissítés** gombbal; aztán tedd, amit az oldal mond. Vagy futtasd újra az `npm install -g rpg-engine` parancsot egy terminálban, aztán nyiss új csevegést: a már futó mesélő azt a verziót tartja, amellyel elindult.

**A mesélő emlékszik valamire, amit visszacsináltam.** Nyiss új csevegést, és nyomd meg a **Megnyitottam az új csevegést** gombot a Mentések között.

**Egy app nem települ.** Az oldal megmondja, miért: nyomd meg a **Próbáld újra** gombot. Vagy telepítsd magad a készítője oldaláról, aztán nyomd meg az **Ellenőrzés újra** gombot.

**A bejelentkezési oldal nem nyílik meg a böngészőben.** Amíg az oldal rád vár, nyomd meg ott, ahol megjelenik, a **Nyisd meg újra a bejelentkezési oldalt** gombot, vagy a **Mégse** gombbal szakítsd meg, és próbáld meg újra.

**Az irányítópult csevegése azt írja, hogy egy másik csevegés játszik.** Egy csevegés, amelyet te magad nyitottál meg az AI-appodban, játssza ezt a kampányt: folytasd ott, vagy zárd be, hogy az irányítópulton játssz.

**Nem jelennek meg képek.** A Beállítások > Kampány > Képek megmutatja, hogy ez a számítógép tudja-e készíteni őket, és hogyan.

**A telepítés nem sikerül, vagy az `rpg` nem indul.** A `node --version` parancsnak 24-et vagy újabbat kell mutatnia. Ha a Windows azt válaszolja, hogy a szkriptek futtatása le van tiltva, lásd a [2.1](#21-what-you-need) részt. Windowson ne tedd az RPG Engine-t és a kampányaidat olyan útvonalra, amelyben `&` van.

**Megváltozott az irányítópult linkje.** Az AI-appod saját csevegésében minden kampánynak saját címe van, csevegésről csevegésre ugyanaz. Csak akkor változik meg, ha egy másik program már használja: a mesélő megadja az új linket, és attól kezdve az marad. Ugyanannak a kampánynak egy második csevegése ugyanazon a címen tartja az oldalt, és átveszi, amint bezárod az elsőt.
