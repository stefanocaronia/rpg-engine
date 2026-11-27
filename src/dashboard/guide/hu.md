<!-- Translated from en.md, paragraph by paragraph, by npm run translate: cdcc612c,399391de,b9b941d4 f2f35057,5d444eaa,3661674f 128c5761,5e6cbafc,cd16e5a6,df844d16,54eb7440,cb3f91d5 5faea867,7780116a,257e14ef,8b9540c8,e6bcc348,b21fdaf2,b215d13b,dc851a2f,4e73872a,3321ea83,cc411520,38b42932,07c079ea,1e1ebddd,5776f364,99bad4f2,b3bfa381,d81788dc,06d7d789,95f63083,fcd9d9f2,cc9c5926,da22506b,a0f716e2,2d41ef42,92cd7d18,cb3f91d5 09eaf555,63d0c1fb,5a20c405,46692547,2429eeb8,d53b8017,6e4bdfd4,84538436,b0846f60,d476cb45,5145bf8e,bdf76e0b,ed46bb4c,6b0f127a,dacddf54,f1889524,64f26156,26b982a6,9f64dfc4,d7cd4a76,fa2e4d86,d55cf2ad,32cb68d5,25225259,e99d4a68,b639004d,f8693a91,6a5febbd,8f855240,63cce6bb,67f31729,cb3f91d5 ec2eeb06,d286e13a,48eb825c,9df7b51c,f7a4bf33,449b1e27,cb3f91d5 5c9936b5,4cb1181b,c29efa25,6970b493,25f5a468,e6d01ec3,cb3f91d5 7157db71,74001149,243b9ac3,47fbf52f,cb3f91d5 3cb2d6e9,9ae16b8f. Change the English, then run it again. -->
# RPG Engine: a teljes útmutató

Az **RPG Engine** lehetővé teszi, hogy asztali szerepjátékot játssz egy **AI mesélővel**. Az **irányítópulton** játszol: ez egy ablak a számítógépeden, benne a karakterlapoddal, a kockákkal, a térképekkel, a naplóddal és a mesélővel folytatott **csevegéssel**.

Az útmutató megmutatja, hogyan játssz. Az oldal maga elmagyarázza a gombjait: tartsd az egérmutatót egy gomb fölé, és megtudod, mit csinál.

## Gyors kezdés <!-- icon: send -->

1. Telepítsd a **Node.js**-t a [nodejs.org](https://nodejs.org) oldalról (az LTS verziót).
2. Nyiss egy új terminált, és írd be: `npm install -g rpg-engine`. Ha a Windows azt írja, hogy a szkriptek futtatása le van tiltva, írd be: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, válaszolj igennel, és próbáld újra.
3. Írd be: `rpg open`: ez kirakja az RPG Engine ikonját az asztalodra ([2.2](#22-installing)). Ettől kezdve az RPG Engine-t az ikonról indítod.
4. Nyomd meg az **Új kampány** gombot, adj neki nevet, és nyomd meg a **Létrehozás** gombot ([2.3](#23-a-new-campaign)).
5. A csevegésben válaszd ki az AI-appodat és a modelljét ([2.4](#24-connect-your-ai)): a Claude Code-hoz fizetős Claude-csomag kell, a Codexhez ChatGPT-fiók, ingyenes vagy fizetős. Nyomd meg a **Csevegés megnyitása**, majd a **Kezdés** gombot.

Az első válasz akár pár percig is eltarthat. Utána a mesélő megkérdezi, hogyan szeretnél játszani, és együtt megalkotjátok a karaktered.

## 1. Mi az az RPG Engine <!-- icon: about -->

| Ki | Mit csinál |
|---|---|
| **Te** | A karaktered szerepét játszod: mit tesz, mit mond, mivel próbálkozik. |
| **A mesélő** (az MI) | Elmeséli a történetet, megszemélyesít mindenki mást, eldönti, mi történik, és dobást kér. |
| **RPG Engine** | Fájlokban tárolja a világot, dob a kockákkal, számolja az életerőpontokat, a pénzt, az időt és a távolságokat, és titokban tartja a titkokat, amíg fel nem fedezed őket. |

A világ így egyik estéről a másikra ugyanaz marad, új csevegésben is, más AI-val is:

- **Ami elhangzott, az igaz marad.** Egy halott főgonosz halott marad.
- **A kockák valódiak.** A mesélő nem változtathatja meg őket, kivéve a legkönnyebb nehézségi szinten.
- **A titkok titkok maradnak.** A mesélő sosem árulja el, amit a karaktered nem tud.
- **A világ mozog.** A fenyegetések tovább haladnak, amíg pihentek vagy utaztok.
- **Egy kampány egy mappa** a számítógépeden: abbahagyhatod, amikor akarod, és később folytathatod.

A játék egy játékrendszerrel érkezik: jelenleg a miénk az **ötödik kiadás**, az ingyenes System Reference Document 5.1 alapján. Nélküle szabadon játszol, számok nélküli történetet.

---

## 2. Első lépések <!-- icon: path -->

### 2.1 Amire szükséged van

- Egy számítógép Windows, macOS vagy Linux rendszerrel.
- **Node.js 24** vagy újabb, a [nodejs.org](https://nodejs.org) oldalról.
- Egy **terminál**, csak a telepítéshez: Windowson a Terminal vagy a PowerShell, macOS-en a Terminal.
- Egy **AI-app** a mesélőnek, a saját fiókoddal ([2.4](#24-connect-your-ai)).

### 2.2 Telepítés

```text
npm install -g rpg-engine
rpg open
```

Az első sor telepíti az RPG Engine-t. Ha az npm felajánlja, hogy frissíti magát, nyugodtan figyelmen kívül hagyhatod.

Az `rpg open` megnyitja az RPG Engine ablakát. Első alkalommal az asztalra és a menübe is kirak egy ikont: ettől kezdve az ikonról indítasz. Ha el akarod távolítani, írd be: `rpg icon --remove`.

Ha a telepítés nem sikerül, ellenőrizd, hogy a `node --version` 24-et vagy nagyobbat ír. Ha a Windows azt írja, hogy a szkriptek futtatása le van tiltva, írd be: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, és válaszolj igennel. Windowson az RPG Engine-t és a kampányaidat ne tartsd olyan útvonalon, amelyben `&` van.

### 2.3 Új kampány

Nyomd meg az **Új kampány** gombot, és add meg a **Név**, a **Nyelv** és a **Játékrendszer** mezőt. A többit a mesélő készíti el veled. Nyomd meg a **Létrehozás** gombot: a kampány egy saját ablakban nyílik meg.

A mesélő és az irányítópult a kampány nyelvén beszél. Az ötödik kiadás szabályszövege angol marad, a mesélő pedig a te nyelveden mondja el.

A kampány a nevével megegyező mappa a felhasználói mappádon belüli `RPG Engine` mappában. Legközelebb kattints a kártyájára.

### 2.4 Az AI csatlakoztatása

A mesélő egy **AI-appban** fut a számítógépeden, a saját fiókoddal. Egy webes csevegés, például a claude.ai vagy a ChatGPT nem elég: a mesélőnek el kell érnie a kampány fájljait.

- **Claude Code**: fizetős Claude-csomag (Pro vagy magasabb).
- **Codex**: ChatGPT-fiók, ingyenes vagy fizetős.
- **OpenCode**: nem kell fiók; néhány ingyenes modell korlátozott ideig, vagy a saját szolgáltatód modelljei, a helyiek is.
- **Antigravity**: Google-fiók; az ingyenes használatának heti korlátai vannak.

A csevegésben válaszd ki az appot, majd a **Modell** és **A mesélő gondolatai** értékét. Ha az app hiányzik, vagy nem vagy bejelentkezve, egy gomb telepíti, bejelentkeztet, vagy megnyitja az oldalát. Az RPG Engine sosem látja a jelszavad.

Egy játékest hosszú csevegés: a legkisebb csomagoknál elérheted a korlátot, mielőtt az este véget érne. A legnagyobb modellel játssz, amid van: egy kis modellt könnyebb rávenni, hogy elárulja a titkokat.

Az RPG Engine-nel a legtöbbet a **Claude Code-dal** játszunk és tesztelünk. Az Antigravity **kipróbálás alatt** van: kiléphet a játékból, és a csevegéseidet egy memóriában őrzi, amelyet nem kapcsolhatsz ki. Amit ott írsz, a Google-hoz kerül, ahol emberek is elolvashatják. Az RPG Engine nem a Google terméke.

### 2.5 Az első chat

Nyomd meg a **Csevegés megnyitása**, majd a **Kezdés** gombot. Az első válasz akár pár percig is eltarthat. Utána egy új kampány három lépésen megy végig:

1. **Beállítások**: a mesélő megkérdezi, hogyan szeretnél játszani, egyszerre néhány kérdéssel: milyen kemény a világ, meghalhatsz-e, mikor léphetsz vissza egy mentésre. Írd be: *Te döntesz*, és a mesélő választ. Minden megváltoztatható később.
2. **Nulladik alkalom**: a karaktered a mesélővel együtt alkotod meg, mint az asztalnál. Az RPG Engine elvégzi a karakterlap számításait. Ha már van karaktered, illeszd be a karakterlapját a csevegésbe.
3. **Játék**: a mesélő felállítja az első jelenetet.

### 2.6 Játék az AI-appodban

Játszhatsz az AI-appod saját csevegésében is, terminálban vagy az asztali appjában, az irányítópulttal mellette.

1. Nyiss egy terminált abban a mappában, ahol a játékaidat tartod: kattints a mappára jobb gombbal, és válaszd a **Megnyitás a Terminálban** (Windows) vagy a **Szolgáltatások > Új terminál a mappához** (macOS) lehetőséget.
2. Írd be: `rpg init "The Salt Isles"`: létrehozza a `The Salt Isles` mappát egy új kampánnyal.
3. Indítsd el az appodat abban a mappában: `claude`, `codex`, `agy` az Antigravityhez, vagy `opencode`. Mondj igent, amikor megkérdezi, megbízol-e a mappában: a Claude Code-ban az előre kijelölt válasz a *No, exit*.
4. Írd be: *Szia! Kezdjünk bele.* A mesélő megadja az irányítópultod linkjét: nyisd meg a csevegés mellett.

Jó tudni:

- Ne nyisd meg az appod által használt eszközök részleteit (Claude Code-ban ctrl+o): titkokat mutathatnak.
- A Codex asztali appjában kapcsold ki a memóriákat a játék csevegéseinél.
- Ha a mesélő nem ismeri a játékot, írd be az `rpg init` parancsot a kampány mappájában, és nyiss új csevegést.
- Ha a Windows nem találja a `claude` parancsot, add hozzá a telepítője által megnevezett mappát a PATH-hoz, aztán nyiss új terminált.
- Egy kampányt egyszerre egy csevegés játszik: amíg a tiéd nyitva van, az irányítópult csevegése vár.

---

## 3. Játék <!-- icon: chat -->

### 3.1 Beszélgetés a mesélővel

Írd le, mit tesz vagy mond a karaktered:

> Megkérdezem a fogadóst, ki járt még erre ma este.

Te azt mondod meg, mit próbálsz tenni; a mesélő azt, mi történik. A mesélő sosem dönt a karaktered helyett.

A történeten kívül írd így: `[OOC: …]` (out of character): *[OOC: Hogyan működik a dulakodás?]* Megkérdezheted a mesélőt a szabályokról, vagy arról, hogyan működik az irányítópult.

Amikor a mesélő kérdez tőled valamit, válaszolj a gombjaival vagy a saját szavaiddal. A karakterlapodról is cselekedhetsz: kattints egy fegyverre, varázslatra vagy tárgyra, és válaszd ki, mit teszel.

**Állandó parancsok**: mondj a társaidnak valamit, aminek tartósan érvényesnek kell lennie, például: *Mostantól mindig hagyjatok életben egyet*. A mesélő addig megtartja, amíg vissza nem vonod.

### 3.2 Dobások

A mesélő csak akkor kér dobást, ha a kimenetel bizonytalan és számít. Egy sáv mutatja a dobást: kattints rá, és a kockák hullanak.

A kockák az RPG Engine-éi, nem a mesélőéi. Mindig megkérdezheted: *[Valódi volt az a dobás?]* Titkos dobásnál is bizonyítani tudja a mesélő, hogy a dobás azelőtt történt, hogy rákérdeztél.

Ha a **Kockák** beállítás fizikai, dobj a saját kockáiddal, és írd le az eredményt: *[14-et dobtam.]* A szórakozásból dobott dobások, a karakterlapról vagy a **Szabad dobás** gombbal, sosem számítanak.

### 3.3 Jelenetek, harcok és utazás

A történet **jelenetekben** zajlik: harc, beszélgetés, utazás, pihenés. Minden jelenet végén a játék magától ment, és a jelenet bekerül a naplódba.

Harcban a mesélő elmondja az összes kört, amely nem a tiéd, és megáll, amikor neked kell döntened.

Mondd meg, hová mész, *Az északi úton megyünk Roccába*: az RPG Engine kiszámolja a távolságot és a napokat, és megáll, ha történik valami az úton. Közben a gonoszok tervei haladnak tovább, és te látod a jeleiket.

### 3.4 Mentések

Az RPG Engine minden jelenet végén menti a kampányt. A **Mentések** beállítás dönti el, mikor léphetsz vissza:

- **Végleges halál**: soha.
- **Ellenőrzőpont**: az utolsó mentésre, csak ha a karaktered meghal.
- **szabad**: bármelyik mentésre, és mentesz, amikor akarsz.

Minden módban újrakezdheted a játékot, a csevegésben vagy a **Mentések** között.

Visszalépés után nyiss új csevegést, mert a régi emlékszik arra, ami visszacsinálódott:

1. Nyomd meg a **Csevegés bezárása**, majd az **Új csevegés** gombot. Az AI-appod saját csevegésében nyiss új beszélgetést (`/clear` a Claude Code-ban).
2. Írd be: *Tovább*.
3. Nyomd meg a **Megnyitottam az új csevegést** gombot a **Mentések** között. Addig a mesélő vár.

### 3.5 Abbahagyás és folytatás

Hagyd abba, amikor akarod: minden már el van mentve. Zárd be az irányítópult ablakát, és nem sokkal később a játék leáll. Semmi sem vész el.

A visszatéréshez nyisd meg az RPG Engine-t az ikonjáról, és kattints a kampányodra. Nyomd meg a **Csevegés folytatása**, majd a **Folytatás** gombot: a mesélő elmondja, hol tartottatok, és megy tovább. Legközelebb másik AI-appot is választhatsz.

### 3.6 Korlátok és leállítás

A **határok** sosem jelennek meg a játékban; a **fátylak** csak a színfalak mögött történnek. A **Beállítások** között állíthatod be őket.

Bármikor írd be: *[stop]*: a mesélő elejti azt a tartalmat, és felveszi a határaid közé.

### 3.7 Képek

A mesélő képeket készíttethet helyszínekről, küldetésekről és szereplőkről, ahogy a **Képek** beállítás előírja, és a karaktered portréját is, ha kéred. Az AI-appod készíti őket, a te csomagodon. Ha nem jelenik meg egy sem, a **Beállítások** megmondja, hogy ez a számítógép tudja-e készíteni őket.

A karakterednek vagy a világ egy oldalának saját képet is adhatsz, magán az oldalon.

---

## 4. A irányítópult <!-- icon: party -->

Az ablak, ahol a játékodat látod. Csak azt mutatja, amit a karaktered tud.

- **Szerepjáték**: a csevegés a mesélővel, amikor nem az oldal mellett áll.
- **Csapat**: a te karakterlapod, a társaidé és a dobások.
- **Jelenet**: hol vagy, ki van ott, és a térkép; harcban a körök.
- **Napló**: küldetések, a történet könyvként, a társaid naplói és a jegyzeteid.
- **Világ**: a világtérkép, amit a karaktered tud, a megtalált dokumentumok és a naptár.
- **Mentések**: visszalépés és újrakezdés.
- **Beállítások**: hogyan játszol, és hogyan néz ki az oldal.
- **Csomagok**: a játékrendszer, a bővítmények, a kézikönyveid és a frissítések: ha új RPG Engine jelenik meg, itt szól róla.

Ha az oldal azt írja, hogy nincs kapcsolat, nyomd meg a **Kampány újranyitása** gombot.

Ha otthon a telefonodról akarsz játszani: a **Beállítások** között az **Irányítópult** részben kapcsold be a **Telefonos hozzáférés** lehetőséget, és olvasd be a kódot a telefonnal, ugyanazon a Wi-Fi-n, mint a számítógép. A Windows megkérdezheti, hogy a Node.js használhatja-e a hálózatot: engedélyezd a magánhálózatokon, és állítsd a Wi-Fit magánhálózatnak. A játék titkosítatlanul utazik: csak megbízható hálózaton használd, például otthon; soha ne nyilvános, szállodai vagy irodai Wi-Fi-n. Ha végeztél, kapcsold ki: a játék a számítógép utolsó ablakával véget ér.

Ha egy téma nehezen olvashatóvá teszi az oldalt, írd az oldal címének végére: `#/settings/page`, és kapcsold ki **A téma saját stílusa** lehetőséget.

---

## 5. Szabályok, kézikönyvek és bővítmények <!-- icon: dice -->

A **Játékrendszer** egy játék adatait jelenti: a karakterlapot, a lényeket, a tárgyakat, a varázslatokat és a szabályokat. Az RPG Engine kiszámolja a karakterlapot. Azt, hogy egy szabály hogyan érvényesül, a mesélő olvassa el és dönti el, ahogy az asztalnál is szokás.

Az **ötödik kiadás** a System Reference Document 5.1 szabad szabályait tartalmazza. Egy saját könyv tartalmával is játszhatsz: a mesélő beleírja a kampányodba.

**Saját kézikönyveid**: told meg a mesélőnek, hol vannak, vagy add hozzá a mappájukat a **Csomagok** részben. A mesélő ezekben keresi meg a szabályokat, és megadja a könyv címét és az oldalszámot. Az RPG Engine soha nem módosítja őket, és nem másolja be őket a kampányba.

**Házi szabályok**: kérd meg a mesélőt, például így: *[House rule: a natural 1 on an attack means you drop your weapon.]* A mesélő megjegyzi a szabályt. Ha egyszer döntést hoz egy kérdésben, az legközelebb is érvényes marad.

A **Bővítmények** valamivel gazdagítják a játékot, például az időjárással. Add hozzá őket a **Csomagok** részben, vagy kérd meg a mesélőt.

---

## 6. Saját kalandod <!-- icon: world -->

Ha nincs megírt világ, a mesélő az alapötletedből épít egyet, és meg is őrzi.

Ha egy kalandot vagy egy saját könyvet szeretnél lejátszani, add oda a mesélőnek a fájlját: *[OOC: Import this adventure as our campaign: D:\Books\adventure.pdf. Don't tell me anything that's in it.]* A kampányon kívüli fájlt a mesélő csak akkor olvassa el, ha igent mondasz. Szövegként, EPUB-ként, Word-fájlként vagy olyan PDF-ként olvasható a legjobban, amelyben a szöveg kijelölhető.

A teljes dokumentum eljut az MI-t működtető céghez. Egy kampányt csak egyszer lehet végigjátszani: ha újra szeretnéd játszani ugyanazt a kalandot, hozz létre új kampányt.

---

## 7. Az adataid <!-- icon: lock -->

- A kampány egy mappa. Ebben vannak a kampány titkai, és a mesélővel folytatott beszélgetéseid is. Soha nem kell megnyitnod.
- Az RPG Engine csak ebben a mappában olvas és ír. A kézikönyveidet csak olvassa. Bármi mást a kampányon kívül csak akkor, ha igent mondasz a számítógéped egyik ablakában.
- A vezérlőpult csevegésében a mesélő magától egyetlen fájlodat sem nyitja meg.
- Amit írsz, ahhoz a céghez kerül, amelynek a modellje a mesélőt játssza, a fiókodra vonatkozó feltételek szerint. Helyi modellnél az adat a számítógépeden marad.
- Az olyan játékrendszer vagy bővítmény, amely nem tőlünk származik, a számítógépeden futó kód: csak az engedélyeddel települ. Csak olyan szerzőknek mondj igent, akikben megbízol.
- Ha a kampány mappája git-tároló, a **Beállítások** el tudja végezni helyetted a commitolást. A csevegéseidet csak akkor engedd bele, ha a tároló privát.
- Ha a **Telefonos hozzáférés** be van kapcsolva, a játék titkosítatlanul jut el a számítógépről a telefonra az otthoni hálózaton, külső szolgáltatás nélkül: aki ugyanazon a hálózaton van, elolvashatja.
