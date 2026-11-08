<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,e51b18d7,be38a186 f2f35057,b493dc90 128c5761,5e6cbafc,48febcc7,f0f71376,b1381f21,cb3f91d5 5faea867,7780116a,afad321d,99406ef2,f831ecd8,d69e75c5,b5544596,5c016bb1,3afa0abc,af2ce7c5,bc923cc3,07c079ea,30f9af2f,60051919,8619db5f,06d7d789,e6f82f9e,6def7d66,f27372ca,d904fdec,8da0dbd5,197704ab,de62cd09,f7bd4d35,56b73d9b,d9fbeec2,b8c831ca,cb3f91d5 09eaf555,63d0c1fb,27c765d2,46692547,e2d161a6,25f9bdf8,d8c01f15,b0846f60,602a5e46,6fee496f,71124663,4bed5644,c2bbeff9,3de0391e,15e36217,cb7d8189,b2a29c8a,056b4e29,2ef22287,d61653a8,e47ab79b,f4c26681,20018bab,6c58220c,5f7b18e6,6a64e757,ad3fa941,57283bd2,e9fa262a,44639926,86179abe,323d8fa3,f8d6b2fd,18bc17d2,3bbb14f4,2b2d7c37,65ff2775,623c2986,0fac97e5,d3afc486,cb3f91d5 ec2eeb06,92e343cc,aa0e26a1,da0fad21,cb3f91d5 5dafa85b,c5ec9f44,2e849e73,35a85f2e,607c7f74,95ffeabc,7687ded0,4ee5ae41,fd2934d1,177ddff0,025009be,c8315e19,cb3f91d5 40941750,f3b2d1f6,cb3f91d5 30c03e82,209b159b,6ea1911c,b8e71497,32482cb4,65c75baa,cb3f91d5 eac34391,4ee44b3b,487e04c0,c6ebe0c0,cb3f91d5 2f86bef9,9402592c,cb3f91d5 519ce5ee,de58bc03,b830ae6c,697b0622,180f77d8,e0f88bdb,1e0ccfed,05fde17f,5070d986,891d9bc7,5b0bb1d2,6b115391,5db3836c,252805d8,df64a3bb,e214ff4a. Change the English, then run it again. -->
# RPG Engine: a teljes útmutató

Az **RPG Engine** lehetővé teszi, hogy asztali szerepjátékot játssz egy **MI mesélővel**. A mesélővel egy **csevegésben** beszélgetsz; az RPG Engine a háttérben dolgozik: **emlékszik a világra**, **dob a kockákkal** és **vezeti a számokat**. A csevegés mellett egy oldalt tartasz nyitva a böngészőben, ez a **vezérlőpult**, rajta a karakterlapoddal, a kockákkal, a térképekkel és a naplóddal.

Az útmutató játékosoknak szól: nem kell tudnod programozni.

## Gyors kezdés <!-- icon: send -->

1. Telepítsd a **Node.js**-t a [nodejs.org](https://nodejs.org) oldalról (az LTS verziót).
2. Telepíts egy **MI-ügynököt**, azt a programot, amelyben a mesélő fut, és jelentkezz be: például Claude Code vagy Codex ([2.4](#24-connect-your-ai)).
3. Egy új terminálban, amelyet a Node.js telepítése után nyitottál, telepítsd az RPG Engine-t: `npm install -g rpg-engine`.
4. Hozz létre egy kampányt: `rpg init "The Salt Isles"`.
5. Lépj be az új mappába: `cd "The Salt Isles"`, és indítsd el ott az ügynöködet: `claude` a Claude Code-hoz, `codex` a Codexhez. Mondj igent, amikor megkérdezi, megbízol-e a mappában ([2.4](#24-connect-your-ai)), aztán írd be: *Szia! Kezdjünk bele.* A mesélő válaszul megadja a vezérlőpulted linkjét.

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
- **Node.js 24** vagy újabb, a [nodejs.org](https://nodejs.org) oldalról. Ezzel jön az `npm`, amely telepíti az RPG Enginet.
- Egy **terminál**: Windowson a Terminal vagy a PowerShell, macOS-en a Terminal. Ha egy mappában akarsz terminált nyitni, kattints a mappára jobb gombbal, és válaszd a **Megnyitás a Terminalban** (Windows) vagy a **Szolgáltatások > Új terminál a mappához** (macOS) lehetőséget. Ha a Windows azt válaszolja, hogy a szkriptek futtatása le van tiltva, írd be egyszer: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, és válaszolj igennel.
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

A mesélő egy **AI-ügynökben** fut. Ez egy AI-alkalmazás a terminálban vagy az asztalon, amely a számítógéped fájljaival is tud dolgozni, például a Claude Code vagy a Codex. Egy sima chat, például a claude.ai vagy a ChatGPT, illetve egy telefonos alkalmazás nem elég: a mesélőnek el kell érnie a kampány fájljait a számítógépeden. Minden ügynökhöz saját csomag és bejelentkezés kell: a Claude Code-hoz fizetős Claude-csomag, a Codexhez ChatGPT-bejelentkezés. Egyszer kell telepítened, a saját oldaláról: [Claude Code](https://code.claude.com/docs/en/setup), [Codex](https://developers.openai.com/codex).

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

Ha nincs megírt világ, a mesélő egy **alaphelyzetet** is kérdez (műfaj, hangulat, néhány elem, és hogy mit élvezel a legjobban egy játékban, például a harcot, a rejtélyeket, a beszélgetést vagy a felfedezést, a saját szavaiddal), valamint az **előkészítést**: menet közben építse a világot, vagy az elején mindet.

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

Az RPG Engine vezeti a dátumot. Az alkalmak között a játékidő megáll, hacsak a **Beállításokban** nem úgy döntesz, hogy teljen, például távolléted minden hetére egy játéknap, vagy nem kéred meg erre a mesélőt. Mondd, hogy pihensz, *Hosszú pihenőt tartunk*, és ha a mesélő beleegyezik, a pihenő visszaadja, amit kell. Rövid pihenőnél a mesélő a vezérlőpulton megkérdezheti, hány életerőkockát költesz el: egyenként dobd őket, nézd meg, mennyit gyógyít mindegyik, és állj meg, amikor akarod. Mondd meg, merre mész, *Észak felé indulunk Roccába*, és az RPG Engine kiszámolja az utat, a távolságot és a napokat, és megáll, ha történik valami az úton. A pénzt a játék érméiben számoljuk, a visszajáróval együtt.

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

## 4. A irányítópult <!-- icon: party -->

Egy oldal a saját számítógépeden, amely csak az adott gép böngészőjében nyílik meg, és amíg a csevegés nyitva van, él. Ha a csevegés bezárul, a *Not connected* felirat jelenik meg. A következő csevegéssel magától visszatér.

- **Csapat**: a te karakterlapod és a társaidé. Kattints egy számra, hogy dobj vele. Ha fölé viszed az egeret, láthatod, honnan jön a szám, és ha egy nyíl jelöli a kockáját, azt is, mi teszi jobbá vagy rosszabbá a dobást. Ha a mesélő választásokat készít elő neked, például új szintlépésnél, a karakterlapon egy értesítés megnyitja őket: akkor választasz, amikor akarsz, elolvasod a lapokat, amelyeket a lehetőségek megneveznek, dobsz, ha egy lehetőség dobást kér, aztán megerősíted. A történet közben megy tovább. Mellette vannak a dobások.
- **Jelenet**: hol vagy, a jelenet képe és térképe, kik vannak ott, mi történik. Harcban a körök és a karakter lapja.
- **Napló**: küldetések, a történet, a társaid naplói, a jegyzeteid.
- **Világ**: a világtérkép, amit a karakter tud, a megtalált iratok és a naptár.
- **A dobótálca**: válassz kockákat és módosítót, aztán dobj. A ×2 megduplázza a kockákat, a módosítót soha, mint egy kritikus találatnál.
- **Mentések**, **Súgó**, **Beállítások** és **Névjegy**: ikonok a sor végén. A Beállítások az oldal saját módosításait is tartalmazza: téma, kockahang, kockakészlet.

Ha a mesélő kérdez tőled valamit, a kérdése szalagként a képernyő tetején marad, bármelyik részben jársz.

---

## 5. Játékrendszerek és házi szabályok <!-- icon: dice -->

### 5.1 Mi az a játékrendszer

Egy játék adatai: a karakterlapja, a számai, a lényei, a tárgyai, a varázslatai és a szabályszövege. Minden kampány egy rendszert játszik. Az RPG Engine kiszámolja a karakterlapot, valamint azt, hogy mi fogy el és mi tér vissza. Azt, hogy egy képesség hogyan működik, a mesélő elolvassa a szabályokban, és eldönti, ahogy egy asztalnál is.

### 5.2 Az ötödik kiadás

Az SRD 5.1 fajai, kasztjai, alkasztjai, egy háttér és egy tulajdonság (feat); a 319 varázslat, a fegyverek, páncélok, varázstárgyak és szörnyek; a szabályfejezetek, amelyeket a mesélő pontos szövegükkel olvas; a teljes, kiszámolt karakterlap.

Ez egy külön csomag: a mesélő felajánlja, amikor kampányt állítasz be, és telepíti is. Az a kampány, amely ezt játssza, magától telepíti a csomagot, amikor először nyílik meg egy olyan számítógépen, ahol még nincs meg. A mesélő szól neked erről.

Olyan tartalommal is játszhatsz, ami az SRD-ben nincs benne, egy saját könyvedből: a mesélő a kampányod oldalaiként megírja, az RPG Engine pedig a sajátjaként kezeli. Az RPG Engine csak nyílt tartalmat szállít; azt viszont, amit a mesélőd ismer, semmi sem korlátozza.

A saját kézikönyveid lehetnek a könyvtárad: told meg a mesélőnek, hol vannak, *[A kézikönyveim itt vannak: D:\Books\5e.]*, vagy add hozzá a mappájukat a Packages › Library részen, és mondj igent a számítógéped ablakában, egyetlen alkalommal. Az RPG Engine ezen a számítógépen olvassa őket. Minden kampány azokat a mappákat használja, amelyeket ott bekapcsolsz. A mesélő az SRD után ezekben keres, amikor szabályról dönt, és megnevezi a könyvet és az oldalt. Szövegként olvashatók a legjobban, vagy olyan PDF-ként, amelyben a szöveg kijelölhető. A beolvasott PDF-et az oldalak képeiből olvassa ki, csak Windowson, néhány perc alatt és néhány hibával. Az RPG Engine soha nem módosítja a kézikönyveidet, soha nem küldi el sehová a szövegüket, és soha nem másolja be őket egy kampányba.

### 5.3 Házi szabályok és saját kiegészítések

Kérdezd meg a mesélőt: *[Házi szabály: a természetes 1-es támadásdobásnál elejted a fegyvered.]* A mesélő az asztal megállapodásaként megjegyzi, vagy ha kell, ír hozzá egy oldalt, vagy módosít egy számot a karakterlapon. A már leírt házi szabályok szöveges fájlként a kampány `rules` mappájába kerülhetnek.

### 5.4 Saját játékrendszer hozzáadása vagy importálása

A játékrendszer egy csomag: a mesélő telepít egyet npm-ből, mappából vagy fájlból. Olyat, amely nem tőlünk való, csak a te igened után telepít, az ügynököd egy űrlapján vagy a számítógéped egy ablakában. Elkészíteni egyet fejlesztői munka, az RPG Engine dokumentumai írják le a GitHubon. Egy könyvedből játékrendszert csinálni még nem lehet ([Hamarosan](#9-coming-later)).

---

## 6. Bővítmények <!-- icon: plus -->

A bővítmény valami újat ad egy kampányhoz a játékrendszer mellé: például az időjárást, amely minden hajnalban változik, vagy a zárfeltörést kockákkal. Bővítményt a Packages › Add menüpontban adhatsz hozzá: a listából, az npm-en a nevével, egy mappából vagy egy fájlból. Ha egy bővítmény nem tőlünk származik, kódot hoz magával, ezért csak a te igened után kerül be, a számítógéped egyik ablakában. Ha egy bővítményt másik játékrendszerhez készítettek, jelzi, melyikhez, és nem lehet hozzáadni. A Packages › Installed menüpontban frissítheted vagy eltávolíthatod a bővítményeket. A mesélő is hozzáadhat egyet, ha kéred.

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

Soha nem kell megnyitnod, és a kampányod titkait őrzi. Ezek vannak benne: `campaign.yaml` (a beállításaid), `state.yaml` (hol tart a játék), `world/` (egy markdown oldal minden karakterhez, helyszínhez, küldetéshez és a többihez), `rules/` (a házi szabályaid), `images/`, `log.jsonl` (minden változás), `.saves/`, `.player/` (a jegyzeteid), valamint a kis fájlok, amelyek megmondják az AI-ügynököknek, hol van az RPG Engine. Az oldalak Obsidian formátumúak. Ha kézzel módosítasz egy oldalt, a mesélő a következő válaszánál értesül róla.

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

**A telepítés nem sikerül, vagy az `rpg` nem indul.** A `node --version` parancsnak 24-et vagy újabbat kell mutatnia. Ha a Windows azt válaszolja, hogy a szkriptek futtatása le van tiltva, lásd a [2.1](#21-what-you-need) részt. Windowson ne tedd az RPG Engine-t és a kampányaidat olyan útvonalra, amelyben `&` van.

**Megváltozott az irányítópult linkje.** Egy másik program elvette a szokásos címet. A mesélő megadja az új linket.
