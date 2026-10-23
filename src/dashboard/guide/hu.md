<!-- Translated from en.md, part by part, by npm run translate: c38df721 53ff5eaa 2020efdb d90880b0 019e9516 d1fb7563 ece214f0 8c9f41da 17577253 f699a840 241f6611 59c1a762. Change the English, then run it again. -->
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

### 2.1 Amire szükséged van

- Egy számítógép Windows, macOS vagy Linux rendszerrel, és egy webböngésző.
- **Node.js 22** vagy újabb, a [nodejs.org](https://nodejs.org) oldalról. Ezzel jön az `npm`, amely telepíti az RPG Enginet.
- Egy **terminál**: Windowson a Terminal vagy a PowerShell, macOS-en a Terminal. Ha egy mappában akarsz terminált nyitni, kattints a mappára jobb gombbal, és válaszd a **Megnyitás a Terminalban** (Windows) vagy a **Szolgáltatások > Új terminál a mappához** (macOS) lehetőséget.
- Egy **AI-ügynök** a mesélőnek ([2.4](#24-connect-your-ai)), a hozzá elérhető **legnagyobb modellel**: egy kis modellt könnyebb rávenni a titkok kiadására vagy a szabályok kijátszására.

### 2.2 Telepítés

```text
npm install -g rpg-engine
```

Az `rpg --version` parancs megmutatja, hogy sikerült-e. Az `rpg` parancsot kampányonként egyszer használod, a létrehozáshoz. Ezután az ügynököd magától elindítja az RPG Enginet.

### 2.3 Kampány létrehozása

Nyiss egy terminált abban a mappában, ahol a játékaidat tartod (a [2.1](#21-what-you-need) leírja, hogyan):

```text
rpg init "The Salt Isles"
```

Ez létrehozza a `The Salt Isles` mappát egy új kampánnyal. Lépj be a `cd "The Salt Isles"` paranccsal. Jegyezd meg, hol van: minden játékalkalommal ide térsz vissza. Mindent másról később döntesz, a chaten vagy a vezérlőpulton. Az `rpg init --help` felsorolja a lehetőségeket, amelyeket már most megadhatsz, például `--language it` vagy `--difficulty hard`.

A mesélő nem tud kampányt létrehozni neked: az `init` előtt semmi sem mondja meg az ügynöködnek, hol van az RPG Engine.

### 2.4 Az AI csatlakoztatása

A mesélő egy **AI-ügynökben** fut. Ez egy AI-alkalmazás a terminálban vagy az asztalon, amely a számítógéped fájljaival is tud dolgozni, például a Claude Code vagy a Codex. Egy sima chat, például a claude.ai vagy a ChatGPT, illetve egy telefonos alkalmazás nem elég: a mesélőnek el kell érnie a kampány fájljait a számítógépeden. Minden ügynökhöz saját csomag és bejelentkezés kell: a Claude Code-hoz fizetős Claude-csomag, a Codexhez ChatGPT-bejelentkezés. Egyszer kell telepítened, a saját oldaláról: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://learn.chatgpt.com/docs/codex/cli).

- **Claude Code**: a kampány mappájában írd be: `claude`. Amikor megkérdezi, megbízol-e a mappában, válaszd a **Yes, I trust this folder** lehetőséget. Vigyázz, az előre kijelölt válasz a *No, exit*. A kampányban van egy kis hook is, az `rpg --listen`, amelyet a kérdés nem mutat: azonnal szól a mesélőnek, ha a vezérlőpulton cselekszel.
- **Codex**: a kampány mappájában írd be: `codex`, és mondj igent, amikor megkérdezi, megbízol-e a mappában. Az asztali alkalmazásában ellenőrizd a beállításokban, hogy a memóriák ki vannak kapcsolva a játék chatjeinél.
- **Másik ügynök**: indítsd el a kampány mappájában, és add meg neki az `rpg mcp` MCP-szervert. Az RPG Engine szabványos MCP-szerver: bármelyik MCP-t támogató ügynök lehet a mesélő, a helyiek is.

**Claude Code-dal** játszunk és tesztelünk. A **Codex** csatlakoztatva és ellenőrizve van, de még nem játszottunk vele végig egy kampányt. A kampány kikapcsolja az ügynök saját memóriáját: a játék a fájljaiban él, így egy mentéshez való visszatérés tényleg visszavisz.

### 2.5 Az első chat

Írj bármit, például: *Szia! Kezdjünk bele.* A mesélő minden chat első válaszában megadja a **vezérlőpultod linkjét**, valami ilyesmit: `http://127.0.0.1:4750`. Nyisd meg, és tartsd a chat mellett.

A mesélő üzenetei között az ügynököd megmutatja az általa használt eszközöket. Ne nyisd meg a részleteiket (Claude Code-ban ctrl+o), mert titkokat mutathatnak.

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
| **Karakterhangok** | Ki beszél a megismert karakterek helyett: a mesélő a karakterekről; mindig a mesélő; kulcspillanatokban maga a karakter, csak azt tudva, amit ő tud, ahogy a mesélő választja; vagy mindig a karakter, a fontosaknál vagy mindenkinél, lassabban és drágábban, ahol az AI-alkalmazásod tudja | a mesélő, néha, fontos karakterek, mindenki |
| **Társak** | Ki utazik veled | senki, veled közösen alkotott, a mesélő alkotta, játékban megismert |
| **Képek** | Képek a helyszínekről, küldetésekről és a megismert karakterekről | nincs, kérésre, új helyszínek, küldetések és megismert karakterek ([3.11](#311-pictures)) |
| **Határok** és **Fátylak** | Ami soha nem jelenik meg, és ami csak a színfalak mögött történik | listák |
| **Nyelv** | A játék és a vezérlőpult nyelve | bármelyik |

Az ötödik kiadás hozzáadja a **fejlődést**: tapasztalati pontokat vagy mérföldköveket.

Ha nincs megírt világ, a mesélő egy **alaphelyzetet** is kérdez (műfaj, hangvétel, néhány elem, a te szavaiddal), és a **felkészülést**: a világot menet közben építi fel, ahogy haladtok, vagy az egészet az elején.

**A mesélő stílusát** sosem kérdezi, de megváltoztathatod a chaten vagy a **Beállítások** között: a **próza** (egyszerű, irodalmi, pulp, szárazon szellemes), az általa kitalált **történetek** (helyzetek, ívek, epizódok, rejtély), egy szerző, akihez hasonlóan **írjon**, vagy bármi más, **a te szavaiddal**.

### 2.7 Nulladik alkalom: a karaktered

A karaktered a mesélővel együtt alkotod meg, mint az asztalnál. Minden döntés a tiéd, hacsak nem kéred meg a mesélőt, hogy döntsön helyetted: jöhetsz kész ötlettel, homályossal vagy semmivel. A mesélő elmondja, hogyan készülnek a képességpontok, még mielőtt bármelyik kockát eldobnád. A karaktered története sosem kötelező. Ha adsz egyet, a mesélő a te szavaiddal írja le. Ezután a mesélő képet kér a karakteredről ([3.7](#37-your-characters-story-and-picture)). Az RPG Engine kiszámolja a karakterlapot: te sosem számolsz.

---

## 3. Játék <!-- icon: chat -->

### 3.1 Beszélgetés a mesélővel

Írd le, mit tesz vagy mond a karaktered, a saját szavaiddal:

> Megkérdezem a fogadóst, ki járt még erre ma este.

A történeten kívül szögletes zárójelben írj: *[Hogyan működik a dulakodás?]* A mesélő is zárójelben válaszol.

Te azt mondod meg, mit próbálsz tenni; a mesélő azt, mi történik. A mesélő sosem dönt a karaktered helyett, és sosem beszél a motorról. Megkérdezheted tőle, hogyan használd a vezérlőpultot.

**Cselekvés a vezérlőpultról**: kattints egy névre a karakterlapodon, például egy fegyverre, egy varázslatra vagy egy nálad lévő tárgyra, majd arra, akire irányul; vagy kattints valakire, akivel beszélnél. A vezérlőpult megírja a mondatodat, például: *Megtámadom az 1. csuklyás banditát a buzogánnyal.* Ezt módosíthatod, mielőtt a **Mondd el a mesélőnek** gombra kattintasz. A mesélő úgy hallja, mintha a csevegésben mondtad volna, és úgy is bírálja el, mint bármi mást. Ha az AI-appod nem tudja magától meghallani, a **Másolás** előkészíti a mondatot, hogy beilleszd a csevegésbe.

### 3.2 Dobások

A mesélő csak akkor kér dobást, ha a kimenetel bizonytalan és számít, és előbb elmondja, mi forog kockán. Ezután:

- **A vezérlőpulton** egy sáv jelenik meg minden próbához egy gombbal, például: *Akrobatika +4 · előnnyel*. Kattints rá: a kockák a lapon hullanak le, és a mesélő hallja az eredményt. Kattinthatsz a karakterlapod kivilágosodó sorára is, dobhatsz a dobótálcáról, vagy írhatsz mást a sávba.
- **Kézzel**, a sáv sarkában vagy a **Beállítások** között: a sáv megmondja, mit kell dobnod, te pedig a karakterlapodról vagy a dobótálcáról dobsz.
- **Fizikai kockák**, ha a kockabeállítás fizikai: leírod a dobott számot, *[14-et dobtam.]*, és az RPG Engine hozzáadja a módosítóidat.

**Szabad dobások**: kattints bármelyik számra a karakterlapodon, vagy nyisd meg a dobótálcát, és dobj kedvedre. Ezek soha nem számítanak, és a mesélő sosem látja őket.

**A mesélő dobásai** megjelennek a dobásoszlopodban, a titkosak kivételével. Mindig megkérdezheted: *[Valódi volt az a dobás?]* Titkos dobásnál a mesélő ujjlenyomatot ad, amely bizonyítja, hogy a dobás azelőtt történt, hogy rákérdeztél.

### 3.3 Jelenetek és harcok

A történet jelenetekben zajlik: harc, beszélgetés, felfedezés, utazás, pihenés. Minden jelenet végén a játék magától ment, és a jelenet bekerül a naplódba.

Harcban a mesélő elmondja az összes kört, amely nem a tiéd, és ott áll meg, ahol te döntesz. A **Jelenet** felül mutatja, ki következik és ki jön utána, a karaktered kártyáját pedig a térkép mellett; a körök sorrendje, a csapatod életereje és az ellenfelek sérülése szavakkal leírva az oldal mellett marad. Ha a karaktered elesik, a halálmentők nagyban megjelennek a lapon.

### 3.4 Idő, utazás és a mozgó világ

Az RPG Engine vezeti a dátumot; az alkalmak között nem telik az idő. Mondd, hogy pihensz, *Hosszú pihenőt tartunk*, és ha a mesélő beleegyezik, a pihenő visszaadja, amit kell. Rövid pihenőnél a mesélő a vezérlőpulton megkérdezheti, hány életerőkockát költesz el: egyenként dobd őket, nézd meg, mennyit gyógyít mindegyik, és állj meg, amikor akarsz. Mondd meg, merre mész, *Észak felé indulunk Roccába*, és az RPG Engine kiszámolja az utat, a távolságot és a napokat, és megáll, ha történik valami az úton. A pénzt a játék érméiben számoljuk, a visszajáróval együtt.

A gonoszoknak határidős terveik vannak. Minden új napon a mesélő előrébb mozdítja azokat a fenyegetéseket, amelyeket az idő előrevitt, te pedig a jeleiket látod, az órát sosem.

### 3.5 Térképek

A **Világ** megmutatja a karaktered által ismert helyszíneket, a köztük lévő utakat és a bejárt ösvényt, a többi felett köddel. A **Jelenet** annak a helynek a térképét mutatja, ahol vagy, ha van neki, azzal, hogy ki hol áll; harcban, a te körödben, az el nem érhető mezők fátyollal vannak borítva. Amikor a mesélő megkérdezi, hová lépsz, érints meg egy mezőt, vagy írd le, például *E4*.

A **Világ** azt is őrzi, amit a karaktered tud. Az **Ismeretek** felsorolja az embereket, helyeket, frakciókat, lényeket és történeteket, amelyeket ismer, mindegyiket úgy, ahogy ő ismeri: keress benne, vagy nyiss meg egyet, hogy egészében olvasd; a szövegben egy névre kattintva annak az oldalára jutsz. A **Dokumentumok** megőrzik a talált leveleket, hirdetményeket és lapokat, hogy újra elolvashasd őket. A **Naptár** megmutatja a mai napot, a küldetéseid határidejét a hátralévő idővel, és a történet napjait: egy jelenetekkel teli nap a Napló fejezeteihez vezet.

### 3.6 Küldetések, napló és jegyzetek

Amit a karaktered vállal, az küldetés lesz a **Naplóban**, céljaival, határidejével és azzal, amit mér; csillagozd meg, hogy a Jelenet tetején szem előtt maradjon. A Napló elmeséli a **történetedet** is, jelenetről jelenetre, és őrzi a **jegyzeteidet**: ezek privátak, hacsak nem **Megosztasz** egyet, amit a mesélő úgy hall, mint amit gondolsz, sosem mint tényt. A **Társak** alatt elolvashatod a társaid naplóját: időnként, egy nap vagy egy küldetés végén írnak néhány sort arról, mit gondolnak és éreznek.

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

Visszalépés után **nyiss új csevegést**: a régi emlékszik arra, ami visszacsinálódott. Írd az új csevegésbe, hogy *folytatjuk*, majd nyomd meg a **Megnyitottam az új csevegést** gombot a Mentésekben.

### 3.9 Alkalmak: abbahagyás és visszatérés

Hagyd abba, amikor akarod: *[Mára álljunk meg itt.]* Minden már el van mentve a fájlokban. A visszatéréshez indítsd el az ügynöködet a kampány mappájában, és írd: *folytatjuk*; a mesélő rövid összefoglalót ad, és megy tovább.

### 3.10 A mesélő hangulata

A vezérlőpult tetején lévő robot a mesélő: az arca követi a történet hangulatát, és sosem árulja el, amit még nem tudsz. Ha a csevegés zárva van, alszik.

### 3.11 Képek

Az RPG Engine képeket készíthet az általad elért helyszínekről, a vállalt küldetésekről és azokról, akikkel találkozol, ahogy a **képek** beállítás mondja, és a karaktered portréját is, ha kéred. A saját Codexedet vagy Claude Cododat használja, a te belépéseddel, a te csomagodon és annak korlátai szerint: a **Codex** festi őket, egyébként a **Claude Code** rajzolja. A **Beállítások** megmondja, hogy ez a számítógép tudja-e készíteni őket, és ha nem, hogyan állítsd be. A mesélőnek mindig adhatsz saját képet.

### 3.12 Biztonság: határok, fátylak és leállítás

A **határok** sosem jelennek meg a játékban; a **fátylak** csak színfalak mögött történnek. Bármikor írd: *[stop]*: a mesélő azonnal elejti azt a tartalmat, és felveszi a határaid közé.

### 3.13 Meggondolod magad

Minden beállítás megváltoztatható, a csevegésben vagy a **Beállításokban**. A szabálykönyv nélkül hozott mesélői döntésből **precedens** lesz, így ugyanarra a kérdésre legközelebb ugyanaz a válasz jön.

---

## 4. A vezérlőpult <!-- icon: party -->

Egy oldal a saját számítógépeden, csak annak a gépnek a böngészőjében nyílik meg, és amíg a csevegés nyitva van, él. Amikor a csevegés bezárul, a *Nincs kapcsolat* felirat látszik; a következő csevegéssel magától visszatér.

- **Csapat**: a te karakterlapod és a társaidé. Kattints egy számra a dobáshoz; vidd fölé az egeret, hogy lásd, honnan jön. Mellette a dobások.
- **Jelenet**: hol vagy, a képe és a térképe, ki van ott, mi történik; harcban a körök és a karaktered kártyája.
- **Napló**: küldetések, a történet, a társaid naplói, a jegyzeteid.
- **Világ**: a világtérkép, amit a karaktered tud, a talált dokumentumok és a naptár.
- **A dobótálca**: válassz kockákat és módosítót, és dobj.
- **Mentések**, **Súgó**, **Beállítások** és **Névjegy**, ikonként a sor végén. A Beállítások az oldal saját beállításait is tartalmazza: téma, kockahang, kockakészlet.

Amikor a mesélő kérdez tőled valamit, a sávja felül marad, bármelyik szakaszban vagy.

---

## 5. Játékrendszerek és házi szabályok <!-- icon: dice -->

### 5.1 Mi az a játékrendszer?

Egy játék adatai: a karakterlapja, a számai, a lényei, a tárgyai, a varázslatai és a szabályszövegei. Minden kampány egy rendszert játszik. Az RPG Engine kiszámolja a karakterlapot, valamint azt, hogy mi fogy el és mi tér vissza. Azt, hogyan működik egy képesség, a mesélő a szabályokból olvassa ki, és ő dönt róla, ahogy az asztalnál is.

### 5.2 Az ötödik kiadás, beépítve

Az SRD 5.1 fajai, kasztjai, alkasztjai, egy háttere és egy kitüntetése (feat); a 319 varázslat, a fegyverek, páncélok, mágikus tárgyak és szörnyek; a szabályfejezetek, amelyeket a mesélő pontos szövegük szerint olvas; a teljes, kiszámolt karakterlap.

Olyan tartalommal is játszhatsz, amely nincs benne az SRD-ben, ha megvan hozzá a könyv: a mesélő a kampányod lapjaiként megírja, az RPG Engine pedig sajátjaként kezeli őket. Az RPG Engine csak nyílt tartalmat szállít, de abban, amit a mesélő ismer, nincs korlát.

A saját kézikönyveid lehetnek a könyvtárad: told meg a mesélőnek, hol vannak, *[A kézikönyveim a D:\Books\5e mappában vannak.]*, vagy add hozzá a mappájukat a Packages › Library részben, majd egyszer mondj igent a számítógéped ablakában. Az RPG Engine ezen a számítógépen olvassa őket. Minden kampány azokat a mappákat használja, amelyeket ott bekapcsolsz. A mesélő az SRD után ezekben keres, amikor szabályról dönt, és megnevezi a könyvet és az oldalt. Szövegként olvashatók a legjobban, vagy olyan PDF-ként, amelyben kijelölhető a szöveg. A beolvasott PDF-et az oldalak képeiből olvassa ki, csak Windowson, pár perc alatt és néhány hibával. Az RPG Engine soha nem módosítja a kézikönyveidet, a szövegüket sehová nem küldi el, és nem másolja be egy kampányba sem.

### 5.3 Házi szabályok és saját kiegészítések

Kérdezd meg a mesélőt: *[Házi szabály: ha természetes 1-est dobsz egy támadásnál, elejted a fegyvered.]* Ő az asztal megállapodásaként megjegyzi, vagy ha kell, megír hozzá egy lapot, illetve módosít egy számot a karakterlapon. A már leírt házi szabályokat szöveges fájlként is odateheted a kampány `rules` mappájába.

### 5.4 Saját játékrendszer hozzáadása vagy importálása

Még nem: ma az RPG Engine csak az ötödik kiadást játssza ([Később jön](#9-coming-later)).

---

## 6. Bővítmények <!-- icon: plus -->

Még nem. Egy bővítmény a játékrendszeren felül ad hozzá valamit a kampányhoz: egy világot, egy kalandot, egy olyan funkciót, mint az időjárás, megosztható házszabályokat.

---

## 7. Honnan jön egy kampány, és a nyelve <!-- icon: world -->

### 7.1 Három mód világra szert tenni

- **Menet közben készített**: az alapötletedből a mesélő minden helyszínt, szereplőt és cselekményszálat közvetlenül azelőtt épít fel, hogy szükséged lenne rá, és megőrzi.
- **Az elején előkészített**: ugyanez, de a világ a játék előtt készül el.
- **A saját kalandodból vagy könyvedből**: add át a mesélőnek a fájlját, *[Importáld ezt a kalandot kampányunknak: D:\Books\adventure.pdf. Ne áruld el nekem, mi van benne.]* A legjobban szövegként olvasható, EPUB-ként, Word-dokumentumként vagy olyan PDF-ként, amelynek a szövege kijelölhető. A beolvasott PDF-et az oldalak képeiből olvassa, csak Windowson, lassan és néhány hibával. A saját Codexed vagy Claude Code-od olvassa a csevegésen kívül, vagy ha nem, a csevegésben a mesélő, az előfizetésed terhére: a teljes dokumentum az OpenAI-hoz vagy az Anthropichoz kerül, a fiókod feltételei és a tanításra vonatkozó választásod szerint. Az irányítópult mutatja, meddig jutott. Regényből a mesélő javaslatot tesz, hol kezdjétek. Megírja a helyszíneket, a szereplőket és a titkokat.

Egy kampányt egyszer játszol végig: ha ugyanazt a kalandot újra szeretnéd játszani, hozz létre új kampányt.

### 7.2 Nyelvek

Kampányonként egy nyelv van, a mesélőé, és az irányítópult ezt követi. Az irányítópult 26 nyelven érkezik. Bármelyik másikat a Codex vagy a Claude Code fordítja le a számítógépeden, vagy nélkülük a mesélő a csevegésben. Az ötödik kiadás olasz kifejezései a hivatalos olasz SRD-ből származnak. A szabályszöveg angol marad, a mesélő pedig a te nyelveden meséli el.

---

## 8. Kíváncsiaknak: a kampánymappa <!-- icon: list -->

Soha nem kell megnyitnod, és a kampányod titkait őrzi. Ebben van a `campaign.yaml` (a beállításaid), a `state.yaml` (hol tart a játék), a `world/` (minden karakterhez, helyszínhez, küldetéshez és a többihez egy markdown oldal), a `rules/` (a házi szabályaid), az `images/`, a `log.jsonl` (minden változás), a `.saves/`, a `.player/` (a jegyzeteid), valamint a kis fájlok, amelyek megmondják az MI-ügynököknek, hol van az RPG Engine. Az oldalak az Obsidian formátumát használják. Ha kézzel módosítasz egy oldalt, a mesélő a következő válaszánál értesül róla.

Az RPG Engine ebben a mappában marad: a játékot csak itt olvassa és írja, a többi fájlodhoz pedig soha nem nyúl. A kézikönyveid mappáit csak olvassa. Rajta kívül csak saját adatmappákat tart (a vezérlőpult fordításait, a kézikönyveidből beolvasott szöveget, valamint a Codexet és a ClaudeOde-ot, ha engeded telepíteni), és ideiglenes mappákat, amíg egy kép készül. Bármi mást akar az ügynököd a számítógépeden csinálni, azt előbb megkérdezi tőled.

A mesélő minden parancsa futtatható a kampánymappában is: az `rpg --help` felsorolja őket. Sok közülük kiírja a kampány titkait.

---

## 9. Hamarosan <!-- icon: hourglass -->

- **Te mint mesélő**, az MI pedig a csapatot játssza.
- **Szerzői mód**: írj kalandot az MI-vel, aztán exportáld és oszd meg.
- **Több játékos ugyanazon a számítógépen**, mindenki a saját karakterével, felváltva ugyanabban a csevegésben.
- **Bővítmények**: beállítások, kalandok, funkciók és házi szabályok.
- **Más játékok**: további játékrendszerek, és a saját tiéd.

---

## 10. Kérdések és problémák <!-- icon: info -->

### Kérdések

**Ismernem kell a szabályokat?** Nem. Válaszd a bemutató mentort, és kérdezz zárójelben, amikor csak akarsz.

**Csalhat a mesélő?** Nem változtathat meg egy dobást, amelyet az RPG Engine végzett, kivéve a történet nehézségen, és nem változtathat meg már rögzített tényeket sem.

**Kerül valamibe?** Az RPG Engine ingyenes. A mesélő az ügynököd előfizetésén fut, vagy a saját számítógépeden egy helyi modellel. Egy este játék egy hosszú csevegés: a legkisebb előfizetéseknél elérheted az előfizetés korlátját, mielőtt az este véget érne. A képek, a fordítások és az importálások ugyanazt az előfizetést használják. Maga az RPG Engine sosem használ API-kulcsot, amelyért hívásonként kell fizetni: az ügynöködbe a fiókoddal jelentkezz be, ne kulccsal.

**Játszhatok telefonon?** Nem: a mesélő a számítógépeden fut, és az irányítópult csak ott nyílik meg.

**Játszhatok barátokkal?** Egyelőre nem: ma egy játékos, egy karakter és társak vannak ([Hamarosan](#9-coming-later)).

**Használhatok legközelebb másik AI-t?** Igen: nyisd meg a kampányt egy másik ügynökben, és írd be: *folytassuk*.

### Problémák

**Az irányítópult nem nyílik meg.** Kérdezd meg a mesélőt: `[Mi az irányítópult linkje?]`. Csak akkor működik, amíg abban a kampányban nyitva van egy csevegés, a mesélő első válasza után.

**A mesélő nem ismeri a játékot.** Az ügynököd nem töltötte be az RPG Engine-t. Ellenőrizd, hogy a kampány mappájában indítottad el, és megbíztál benne. Claude Code-ban írd be: `/mcp`, és csatlakoztasd újra az `rpg`-t. Codexben a `codex mcp list` parancsnak a kampány mappájában mutatnia kell az `rpg`-t. Ha az `rpg --version` nem található, telepítsd újra az RPG Engine-t ([2.2](#22-install)).

**Frissítés.** Futtasd újra az `npm install -g rpg-engine` parancsot, aztán nyiss új csevegést: a már futó mesélő azt a verziót tartja, amellyel elindult.

**A mesélő emlékszik valamire, amit visszacsináltam.** Nyiss új csevegést, és nyomd meg a **Megnyitottam az új csevegést** gombot a Mentések között.

**Nem jelennek meg képek.** A Beállítások > Képek megmutatja, hogy ez a számítógép tudja-e készíteni őket, és hogyan.

**A telepítés nem sikerül, vagy az `rpg` nem indul.** A `node --version` parancsnak 22-t vagy újabbat kell mutatnia. Windowson ne tedd az RPG Engine-t és a kampányaidat olyan útvonalra, amelyben `&` van.

**Megváltozott az irányítópult linkje.** Egy másik program elvette a szokásos címet. A mesélő megadja az új linket.
